const express = require('express');
const { predictComplaint } = require('../aiService');

const router = express.Router();

router.post('/', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }

  const prediction = await predictComplaint(text);
  res.json(prediction);
});

module.exports = router;
