const express = require('express');
const { predictComplaint, predictImage } = require('../aiService');

const router = express.Router();

router.post('/', async (req, res) => {
  const { text, location } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }

  try {
    const prediction = await predictComplaint(text, location || '');
    res.json(prediction);
  } catch (err) {
    res.status(502).json({ error: err.message || 'Prediction failed' });
  }
});

router.post('/image', async (req, res) => {
  const { image, filename, description } = req.body;
  if (!image && !filename) {
    return res.status(400).json({ error: 'image or filename is required' });
  }

  try {
    const prediction = await predictImage(image || '', filename || '', description || '');
    res.json(prediction);
  } catch (err) {
    res.status(502).json({ error: err.message || 'Image prediction failed' });
  }
});

module.exports = router;
