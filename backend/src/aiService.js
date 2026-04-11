const http  = require('http');
const https = require('https');
const { classifyComplaint } = require('./classifier');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

// Population density hint from env (low | medium | high | very_high)
const DEFAULT_POPULATION = process.env.AI_DEFAULT_POPULATION || 'medium';

function postJson(pathname, payload) {
  return new Promise((resolve, reject) => {
    const url  = new URL(pathname, AI_SERVICE_URL);
    const body = JSON.stringify(payload);
    const client = url.protocol === 'https:' ? https : http;

    const req = client.request(url, {
      method: 'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          const parsed = raw ? JSON.parse(raw) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) return resolve(parsed);
          reject(new Error(parsed.detail || parsed.error || `AI service ${res.statusCode}`));
        } catch (e) {
          reject(new Error(`Invalid AI response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function predictComplaint(text, location = '') {
  const fallback = classifyComplaint(text);

  try {
    // Step 1 — ML text classification
    const textResult = await postJson('/predict-text', { text });
    const category   = textResult.category  || fallback.category;
    const department = textResult.department || fallback.department;

    // Step 2 — Smart priority: text + category + location + population
    const priorityResult = await postJson('/predict-priority', {
      text,
      category,
      location:   location || '',
      population: DEFAULT_POPULATION,
    });

    const priority  = priorityResult.priority  || fallback.priority;
    const reasoning = priorityResult.reasoning || [];
    const signals   = priorityResult.signals   || {};

    return { category, department, priority, reasoning, signals, source: 'ml' };
  } catch {
    return { ...fallback, reasoning: [], signals: {}, source: 'keyword-fallback' };
  }
}

module.exports = { predictComplaint };
