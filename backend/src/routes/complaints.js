const router    = require('express').Router();
const { Op }    = require('sequelize');
const Complaint = require('../models/Complaint');
const Comment   = require('../models/Comment');
const AuditLog  = require('../models/AuditLog');
const { predictComplaint }                    = require('../aiService');
const { authenticateToken, authorizeRoles }   = require('../middleware/auth');
const { validateComplaint }                   = require('../middleware/validation');
const { sendStatusEmail, sendOfficialReplyEmail } = require('../emailService');

// ── helpers ──────────────────────────────────────────────
function parseUpvotedBy(raw) {
  try { return JSON.parse(raw || '[]'); } catch { return []; }
}

// Simple text similarity — Jaccard on word sets
function similarity(a, b) {
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = [...setA].filter((w) => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

// POST /api/complaints
router.post('/', validateComplaint, async (req, res) => {
  try {
    const { citizenName, email, description, imageUrl, location } = req.body;
    if (!citizenName || !email || !description)
      return res.status(400).json({ error: 'citizenName, email and description are required' });

    // ── Duplicate detection ──────────────────────────────
    const recent = await Complaint.findAll({
      where: { createdAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      attributes: ['id', 'description', 'category', 'department', 'upvotes', 'status', 'location'],
      order: [['upvotes', 'DESC']],
      limit: 100,
    });

    const duplicates = recent
      .map((c) => ({ ...c.toJSON(), score: similarity(description, c.description) }))
      .filter((c) => c.score >= 0.45)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (duplicates.length > 0) {
      return res.status(200).json({
        duplicate: true,
        message:   'Similar complaints already exist. Consider upvoting them instead.',
        similar:   duplicates,
      });
    }

    // ── Create complaint ─────────────────────────────────
    const { category, department, priority, reasoning, signals, source } = await predictComplaint(description, location || '');
    const complaint = await Complaint.create({
      citizenName, email, description,
      imageUrl: imageUrl || null,
      location: location || null,
      category, department, priority,
    });

    req.app.locals.broadcast({ type: 'NEW_COMPLAINT', complaint });
    sendStatusEmail(complaint);
    res.status(201).json({ message: 'Complaint submitted successfully', complaint, aiSource: source, reasoning, signals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/complaints/force — submit even if duplicate
router.post('/force', validateComplaint, async (req, res) => {
  try {
    const { citizenName, email, description, imageUrl, location } = req.body;
    const { category, department, priority, source } = await predictComplaint(description, location || '');
    const complaint = await Complaint.create({
      citizenName, email, description,
      imageUrl: imageUrl || null,
      location: location || null,
      category, department, priority,
    });
    req.app.locals.broadcast({ type: 'NEW_COMPLAINT', complaint });
    sendStatusEmail(complaint);
    res.status(201).json({ message: 'Complaint submitted successfully', complaint, aiSource: source });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/complaints/public
router.get('/public', async (req, res) => {
  try {
    const { category, page = 1 } = req.query;
    const where = {};
    if (category) where.category = category;
    const limit  = 20;
    const offset = (Math.max(1, parseInt(page)) - 1) * limit;
    const { count, rows } = await Complaint.findAndCountAll({
      where,
      order:  [['upvotes', 'DESC'], ['createdAt', 'DESC']],
      limit, offset,
      attributes: ['id', 'description', 'category', 'department', 'priority', 'status', 'location', 'upvotes', 'upvotedBy', 'createdAt'],
    });
    const complaints = rows.map((r) => ({ ...r.toJSON(), upvotedBy: parseUpvotedBy(r.getDataValue('upvotedBy')) }));
    res.json({ complaints, total: count, pages: Math.ceil(count / limit), page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/complaints/track
router.get('/track', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'email is required' });
    const complaints = await Complaint.findAll({
      where:      { email: email.toLowerCase().trim() },
      order:      [['createdAt', 'DESC']],
      attributes: ['id', 'description', 'category', 'department', 'priority', 'status', 'location', 'upvotes', 'createdAt'],
    });
    res.json({ complaints });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/complaints/analytics — admin only
router.get('/analytics', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const all = await Complaint.findAll({
      attributes: ['id', 'category', 'department', 'priority', 'status', 'location', 'createdAt', 'dueDate'],
      order: [['createdAt', 'DESC']],
    });

    // By category
    const byCategory = {};
    // By department
    const byDepartment = {};
    // By priority
    const byPriority = { high: 0, medium: 0, low: 0 };
    // By status
    const byStatus = { pending: 0, in_progress: 0, resolved: 0 };
    // By day (last 30 days)
    const byDay = {};
    // By location
    const byLocation = {};
    // Overdue count
    let overdue = 0;
    // Avg resolution time (ms)
    let totalResolutionMs = 0, resolvedCount = 0;

    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    all.forEach((c) => {
      byCategory[c.category]   = (byCategory[c.category]   || 0) + 1;
      byDepartment[c.department] = (byDepartment[c.department] || 0) + 1;
      byPriority[c.priority]   = (byPriority[c.priority]   || 0) + 1;
      byStatus[c.status]       = (byStatus[c.status]       || 0) + 1;

      if (c.dueDate && c.status !== 'resolved' && new Date(c.dueDate) < now) overdue++;

      if (c.status === 'resolved') {
        resolvedCount++;
        totalResolutionMs += new Date(c.updatedAt) - new Date(c.createdAt);
      }

      const day = new Date(c.createdAt).toISOString().slice(0, 10);
      if (new Date(c.createdAt) >= thirtyDaysAgo)
        byDay[day] = (byDay[day] || 0) + 1;

      if (c.location) {
        const loc = c.location.trim().toLowerCase();
        byLocation[loc] = (byLocation[loc] || 0) + 1;
      }
    });

    const avgResolutionHours = resolvedCount > 0
      ? Math.round(totalResolutionMs / resolvedCount / 3600000)
      : null;

    // Top 10 locations
    const topLocations = Object.entries(byLocation)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([location, count]) => ({ location, count }));

    // Daily trend sorted
    const dailyTrend = Object.entries(byDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));

    res.json({
      total: all.length, overdue, avgResolutionHours,
      byCategory: Object.entries(byCategory).map(([name, value]) => ({ name, value })),
      byDepartment: Object.entries(byDepartment).sort((a,b) => b[1]-a[1]).map(([name, value]) => ({ name, value })),
      byPriority: Object.entries(byPriority).map(([name, value]) => ({ name, value })),
      byStatus:   Object.entries(byStatus).map(([name, value]) => ({ name, value })),
      topLocations, dailyTrend,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/complaints/stats
router.get('/stats', async (req, res) => {
  try {
    const total       = await Complaint.count();
    const pending     = await Complaint.count({ where: { status: 'pending' } });
    const in_progress = await Complaint.count({ where: { status: 'in_progress' } });
    const resolved    = await Complaint.count({ where: { status: 'resolved' } });
    res.json({ total, pending, in_progress, resolved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/complaints/my-department
router.get('/my-department', authenticateToken, authorizeRoles('department', 'admin'), async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (req.user.role === 'department' && req.user.department) where.department = req.user.department;
    if (status) where.status = status;
    const complaints  = await Complaint.findAll({ where, order: [['createdAt', 'DESC']] });
    const total       = complaints.length;
    const pending     = complaints.filter((c) => c.status === 'pending').length;
    const in_progress = complaints.filter((c) => c.status === 'in_progress').length;
    const resolved    = complaints.filter((c) => c.status === 'resolved').length;
    res.json({ complaints, stats: { total, pending, in_progress, resolved } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/complaints
router.get('/', async (req, res) => {
  try {
    const { status, category, page, limit } = req.query;
    const where = {};
    if (status)   where.status   = status;
    if (category) where.category = category;
    const pageNum  = Math.max(1, parseInt(page)  || 1);
    const limitNum = Math.min(100, parseInt(limit) || 1000);
    const offset   = (pageNum - 1) * limitNum;
    const { count, rows } = await Complaint.findAndCountAll({
      where, order: [['createdAt', 'DESC']], limit: limitNum, offset,
    });
    res.json({ complaints: rows, total: count, page: pageNum, pages: Math.ceil(count / limitNum) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/complaints/:id
router.get('/:id', async (req, res) => {
  try {
    const complaint = await Complaint.findByPk(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    const data = { ...complaint.toJSON(), upvotedBy: parseUpvotedBy(complaint.getDataValue('upvotedBy')) };
    res.json({ complaint: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/complaints/:id/audit
router.get('/:id/audit', authenticateToken, authorizeRoles('admin', 'department'), async (req, res) => {
  try {
    const logs = await AuditLog.findAll({
      where: { complaintId: req.params.id },
      order: [['createdAt', 'ASC']],
    });
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/complaints/:id/upvote
router.post('/:id/upvote', async (req, res) => {
  try {
    const { voterEmail } = req.body;
    if (!voterEmail) return res.status(400).json({ error: 'voterEmail is required' });
    const complaint = await Complaint.findByPk(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    const upvotedBy = complaint.upvotedBy || [];
    if (upvotedBy.includes(voterEmail)) return res.status(409).json({ error: 'Already upvoted' });
    upvotedBy.push(voterEmail);
    const newCount = complaint.upvotes + 1;
    await complaint.update({ upvotes: newCount, upvotedBy });
    req.app.locals.broadcast({ type: 'UPVOTE', complaintId: complaint.id, upvotes: newCount });
    res.json({ upvotes: newCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/complaints/:id/comments
router.get('/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.findAll({
      where: { complaintId: req.params.id },
      order: [['createdAt', 'ASC']],
    });
    res.json({ comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/complaints/:id/comments
router.post('/:id/comments', async (req, res) => {
  try {
    const { authorName, authorEmail, text, role } = req.body;
    if (!authorName || !authorEmail || !text)
      return res.status(400).json({ error: 'authorName, authorEmail and text are required' });
    if (text.length > 1000) return res.status(400).json({ error: 'Comment too long (max 1000 chars)' });
    const complaint = await Complaint.findByPk(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    const isOfficial = role === 'admin' || role === 'department';
    const comment = await Comment.create({
      complaintId: req.params.id, authorName, authorEmail,
      role: role || 'citizen', text: text.trim(), isOfficial,
    });

    // Send email to citizen when admin/dept replies officially
    if (isOfficial) sendOfficialReplyEmail(complaint, comment);

    req.app.locals.broadcast({ type: 'NEW_COMMENT', complaintId: parseInt(req.params.id), comment });
    res.status(201).json({ comment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/complaints/:id/status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const complaint = await Complaint.findByPk(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    const oldStatus = complaint.status;
    await complaint.update({ status });

    // Audit log
    await AuditLog.create({
      complaintId:   complaint.id,
      action:        'status_change',
      fromValue:     oldStatus,
      toValue:       status,
      changedBy:     req.user.name,
      changedByRole: req.user.role,
    });

    req.app.locals.broadcast({ type: 'STATUS_UPDATE', complaint });
    sendStatusEmail(complaint);
    res.json({ message: 'Status updated', complaint });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/complaints/:id/reassign — admin only
router.patch('/:id/reassign', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { department, category } = req.body;
    if (!department) return res.status(400).json({ error: 'department is required' });

    const complaint = await Complaint.findByPk(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    const oldDept = complaint.department;
    const oldCat  = complaint.category;
    await complaint.update({ department, category: category || complaint.category });

    // Audit log
    await AuditLog.create({
      complaintId:   complaint.id,
      action:        'reassign',
      fromValue:     `${oldCat} → ${oldDept}`,
      toValue:       `${category || oldCat} → ${department}`,
      changedBy:     req.user.name,
      changedByRole: req.user.role,
    });

    req.app.locals.broadcast({ type: 'REASSIGN', complaint });
    res.json({ message: 'Complaint reassigned', complaint });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
