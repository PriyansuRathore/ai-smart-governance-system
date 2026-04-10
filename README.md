# 🏛️ AI Smart Governance System

A full-stack production-ready citizen complaint management system with ML-powered classification, real-time updates, role-based access, and analytics.

## Features
- 📝 Citizen complaint submission with image upload
- 🤖 ML text classification (scikit-learn TF-IDF + Logistic Regression)
- 🧠 ML priority detection based on complaint meaning
- 🖼️ Image analysis via HuggingFace BART zero-shot classification
- 🏢 Auto department assignment + routing
- 👥 Role-based access: Citizen / Admin / Department
- 📊 Admin dashboard with charts, pagination, CSV export
- 🔍 Complaint tracking page for citizens
- ⚡ Real-time updates via WebSocket
- 🌙 Dark mode
- 📧 Email notifications on status change
- 🔒 JWT auth, rate limiting, helmet security headers, input validation

## Tech Stack
| Layer | Tech |
|---|---|
| Frontend | React + Vite, React Router, Recharts, Axios |
| Backend | Node.js, Express, WebSocket (ws), Nodemailer |
| Database | PostgreSQL (Neon) + Sequelize ORM |
| AI Service | Python FastAPI, scikit-learn, HuggingFace |
| Security | Helmet, express-rate-limit, express-validator, JWT |

## Setup

### 1. Clone & Install
```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install

# AI Service
cd ai-service && pip install -r requirements.txt && python train.py
```

### 2. Backend `.env`
```env
PORT=5000
DB_HOST=your_neon_host
DB_PORT=5432
DB_NAME=neondb
DB_USER=neondb_owner
DB_PASSWORD=your_password
JWT_SECRET=your_64_char_random_secret
JWT_EXPIRES_IN_SECONDS=86400
AI_SERVICE_URL=http://127.0.0.1:8000
HF_API_KEY=your_huggingface_key
ALLOWED_ORIGINS=http://localhost:5173
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
```

### 3. Email Setup (Gmail)
1. Enable 2FA on Gmail
2. Go to Google Account → Security → App Passwords
3. Generate password for "Mail"
4. Paste in `EMAIL_PASS`

### 4. Run All Services
```bash
# Terminal 1 — Backend
cd backend && npm start

# Terminal 2 — AI Service
cd ai-service && python -m uvicorn app.main:app --port 8000 --reload

# Terminal 3 — Frontend
cd frontend && npm run dev
```

## URLs
| URL | Description |
|---|---|
| http://localhost:5173 | Home page |
| http://localhost:5173/submit | Submit complaint (login required) |
| http://localhost:5173/track | Track complaint by email |
| http://localhost:5173/admin | Admin dashboard (admin only) |
| http://localhost:5173/department | Department queue (dept only) |
| http://localhost:8000/docs | AI service Swagger UI |

## API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| POST | /auth/register | Register user |
| POST | /auth/login | Login |
| GET | /auth/me | Get current user |
| POST | /api/complaints | Submit complaint |
| GET | /api/complaints | Get all complaints |
| GET | /api/complaints/stats | Dashboard stats |
| GET | /api/complaints/my-department | Department complaints |
| PATCH | /api/complaints/:id/status | Update status |

## Roles
| Role | Access |
|---|---|
| citizen | Submit complaints, track status |
| admin | Full dashboard, all complaints, charts, CSV export |
| department | Only their department's complaints |

## Security
- Rate limiting: 20 auth requests / 15min, 10 complaints / 1min
- Helmet security headers
- Input validation on all endpoints
- JWT with 24h expiry
- CORS restricted to frontend origin
- Passwords hashed with scrypt
