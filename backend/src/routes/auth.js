const express = require('express');
const User = require('../models/User');
const { hashPassword, verifyPassword, createToken } = require('../utils/auth');
const { authenticateToken } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validation');

const router = express.Router();

const VALID_DEPARTMENTS = [
  'Public Works Department',
  'Water Supply Department',
  'Electricity Department',
  'Sanitation Department',
  'Emergency & Medical Services',
  'Fire Department',
  'Civil Engineering Department',
  'Parks & Horticulture Department',
  'Animal Control Department',
  'Municipal Corporation',
  'Environment Department',
  'General Administration',
];

// Disposable email domains blocklist
const DISPOSABLE_DOMAINS = [
  'mailinator.com','guerrillamail.com','tempmail.com','throwaway.email',
  'yopmail.com','sharklasers.com','guerrillamailblock.com','grr.la',
  'guerrillamail.info','spam4.me','trashmail.com','maildrop.cc',
  '10minutemail.com','dispostable.com','fakeinbox.com','mailnull.com',
  'spamgourmet.com','trashmail.me','discard.email','spamfree24.org',
];

function isDisposableEmail(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return DISPOSABLE_DOMAINS.includes(domain);
}

function userPayload(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department || null };
}

router.post('/register', validateRegister, async (req, res) => {
  try {
    const { name, email, password, role = 'citizen', department } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'name, email and password are required' });

    if (role === 'department' && !department)
      return res.status(400).json({ error: 'department is required for department role' });

    if (department && !VALID_DEPARTMENTS.includes(department))
      return res.status(400).json({ error: 'Invalid department name' });

    if (isDisposableEmail(email))
      return res.status(400).json({ error: 'Disposable email addresses are not allowed. Please use a real email.' });

    const existing = await User.findOne({ where: { email } });
    if (existing)
      return res.status(409).json({ error: 'User already exists' });

    const user = await User.create({
      name, email,
      password: hashPassword(password),
      role,
      department: role === 'department' ? department : null,
    });

    res.status(201).json({
      message: 'User registered successfully',
      user:    userPayload(user),
      token:   createToken(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'email and password are required' });

    const user = await User.findOne({ where: { email } });
    if (!user || !verifyPassword(password, user.password))
      return res.status(401).json({ error: 'Invalid credentials' });

    res.json({
      message: 'Login successful',
      user:    userPayload(user),
      token:   createToken(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

router.get('/departments', (_, res) => {
  res.json(VALID_DEPARTMENTS);
});

module.exports = router;
