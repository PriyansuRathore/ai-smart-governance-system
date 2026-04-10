const router    = require('express').Router();
const { Op }    = require('sequelize');
const Complaint = require('../models/Complaint');
const Comment   = require('../models/Comment');
const { predictComplaint }                    = require('../aiService');
const { authenticateToken, authorizeRoles }   = require('../middleware/auth');
const { validateComplaint }                   = require('../middleware/validation');
const { sendStatusEmail }                     = require('../emailService');

// POST /api/complaints
router.post('/', validateComplaint, async (req, res) => {
  try {
    const { citizenName, email, description, imageUrl, location } = req.body;
    if (!citizenName || !email || !description)
      return res.status(400).json({ error: 'citizenName, email and description are required' });

    const { category, department, priority, source } = await predictComplaint(description);
    const complaint = await Complaint.create({
      citizenName, email, description,
      imageUrl: imageUrl || null,
      location:  location  || null,
      category, department, priority,
    });

    req.app.locals.broadcast({ type: 'NEW_COMPLAINT', complaint });
    sendStatusEmail(complaint);
    res.status(201).json({ message: 'Complaint submitted successfully', complaint, aiSource: source });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/complaints/public — public feed, no auth, limited fields
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
    // parse upvotedBy JSON string for each row
    const complaints = rows.map((r) => ({
      ...r.toJSON(),
      upvotedBy: (() => { try { return JSON.parse(r.getDataValue('upvotedBy') || '[]'); } catch { return []; } })()
    }));
    res.json({ complaints, total: count, pages: Math.ceil(count / limit), page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/complaints/track?email=
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

// GET /api/complaints/:id — single complaint for ticket view
router.get('/:id', async (req, res) => {
  try {
    const complaint = await Complaint.findByPk(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    const data = {
      ...complaint.toJSON(),
      upvotedBy: (() => { try { return JSON.parse(complaint.getDataValue('upvotedBy') || '[]'); } catch { return []; } })()
    };
    res.json({ complaint: data });
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
    if (upvotedBy.includes(voterEmail))
      return res.status(409).json({ error: 'Already upvoted' });
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
    if (text.length > 1000)
      return res.status(400).json({ error: 'Comment too long (max 1000 chars)' });
    const complaint = await Complaint.findByPk(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    const comment = await Comment.create({
      complaintId: req.params.id, authorName, authorEmail,
      role: role || 'citizen', text: text.trim(),
    });
    req.app.locals.broadcast({ type: 'NEW_COMMENT', complaintId: parseInt(req.params.id), comment });
    res.status(201).json({ comment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/complaints/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const complaint = await Complaint.findByPk(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    await complaint.update({ status });
    req.app.locals.broadcast({ type: 'STATUS_UPDATE', complaint });
    sendStatusEmail(complaint);
    res.json({ message: 'Status updated', complaint });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
