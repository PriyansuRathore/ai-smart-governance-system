const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const http       = require('http');
const { WebSocketServer } = require('ws');
require('dotenv').config();

const sequelize       = require('./database');
const complaintRoutes = require('./routes/complaints');
const authRoutes      = require('./routes/auth');
const predictRoutes   = require('./routes/predict');
require('./models/User');
require('./models/Complaint');
require('./models/Comment');
require('./models/AuditLog');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

// ── Security headers
app.use(helmet());

// ── CORS — only allow frontend origin
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://ai-smart-governance-system.vercel.app',
];

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : DEFAULT_ALLOWED_ORIGINS
).map((origin) => origin.trim().replace(/\/$/, ''));
app.use(cors({
  origin: (origin, cb) => {
    const normalizedOrigin = origin?.replace(/\/$/, '');
    if (!normalizedOrigin || ALLOWED_ORIGINS.includes(normalizedOrigin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// ── Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const complaintLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 10,
  message: { error: 'Too many submissions, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── WebSocket
const clients = new Set();
wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});
app.locals.broadcast = (data) => {
  const msg = JSON.stringify(data);
  clients.forEach((c) => { if (c.readyState === 1) c.send(msg); });
};

// ── Routes
app.use('/auth',           authLimiter,      authRoutes);
app.use('/api/predict',    complaintLimiter, predictRoutes);
app.use('/api/complaints', complaintLimiter, complaintRoutes);
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── 404 handler
app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }));

// ── Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
sequelize.sync({ alter: true }).then(() => {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch((err) => console.error('DB connection failed:', err));
