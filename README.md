# 🏛️ AI Smart Governance System

A full-stack production-ready citizen complaint management system with ML-powered classification, Hindi/Hinglish NLP, real-time updates, role-based access, duplicate detection, SLA tracking, and community features.

---

## ✨ Features

### 🤖 AI & Classification
- ML text classification (TF-IDF word + character n-grams + Logistic Regression)
- **Hindi & Hinglish support** — "nali toot gayi" → water, "bijli nahi hai" → electricity
- Typo normalization — "electricty", "garbge", "watr" all classified correctly
- ML priority detection (high/medium/low) based on complaint meaning
- CLIP zero-shot image analysis via HuggingFace
- **11 categories** — road, water, electricity, garbage, emergency, fire, building, tree, animal, public_property, pollution
- Auto department routing to 11 departments

### 👥 Roles & Auth
- JWT authentication with 24h expiry
- Roles: **Citizen / Admin / Department**
- Disposable email domain blocking (mailinator, tempmail, etc.)
- Auto-fill name/email from logged-in account on complaint form

### 📝 Complaint Management
- Submit with image upload + AI image analysis
- Location field (area, landmark, ward)
- **Duplicate detection** — warns if similar complaint exists in last 7 days, shows % match
- Force submit option if issue is in a different location
- **SLA / Due dates** — auto-set based on priority (high=24h, medium=3d, low=7d)
- Overdue badges in admin dashboard and citizen profile
- **Complaint reassignment** — admin can reassign to different department/category
- **Audit log** — every status change and reassignment tracked with timestamp + who did it

### 📊 Admin Dashboard
- Live stats (total, pending, in-progress, resolved) — always in sync
- Charts: complaints by category, status breakdown, priority distribution
- Table with location, SLA due date, overdue indicator
- Search by name, email, location, department
- Filter by status and category
- CSV export with all fields including location
- Reassign complaints with audit trail
- Real-time WebSocket updates

### 🏢 Department Dashboard
- Only sees complaints assigned to their department
- Resolution rate progress bar
- Status filter
- Real-time updates

### 🌐 Public Feed
- All complaints visible to everyone (no login needed)
- Upvote complaints (one per email, prevents duplicates)
- **"Report in my area"** button pre-fills submit form
- Category filter, pagination
- Real-time upvote counts

### 🎫 Ticket Page (Jira-style)
- Full complaint details with status timeline
- **Discussion thread** with real-time comments
- **Official Response** badge when admin/dept replies (citizen gets email)
- Upvote button
- Admin/dept status update buttons
- "Report This in My Area" button

### 💬 Floating Community Board
- Fixed FAB button (bottom-right) visible on all pages
- Opens a popup with live complaint feed + detail panel
- Unread badge when new complaints arrive
- Two-column layout: list + detail

### 👤 Citizen Profile Page
- All your complaints in one place
- Stats: total, pending, in-progress, resolved, overdue
- Resolution rate bar
- Filter by status
- SLA countdown on each complaint
- Overdue indicators

### 🔍 Track Complaint
- Track by email (server-side, secure)
- Status stepper visualization

### 📧 Email Notifications
- Confirmation email on submission
- Status change notifications
- **Official reply notification** when admin/dept responds

### 🔒 Security
- Rate limiting: 20 auth / 15min, 10 complaints / 1min
- Helmet security headers
- Input validation on all endpoints
- CORS restricted to frontend origin
- Passwords hashed with scrypt
- Disposable email blocking

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite, React Router, Recharts, Axios |
| Backend | Node.js, Express, WebSocket (ws), Nodemailer |
| Database | PostgreSQL (Neon) + Sequelize ORM |
| AI Service | Python FastAPI, scikit-learn, HuggingFace CLIP |
| NLP | TF-IDF (word + char n-grams), Hindi/Hinglish preprocessor |
| Security | Helmet, express-rate-limit, express-validator, JWT |

---

## 🚀 Setup

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

### 3. Run All Services
```bash
# Terminal 1 — Backend
cd backend && npm start

# Terminal 2 — AI Service
cd ai-service && python -m uvicorn app.main:app --port 8000 --reload

# Terminal 3 — Frontend
cd frontend && npm run dev
```

---

## 🌐 URLs

| URL | Description |
|---|---|
| http://localhost:5173 | Home page |
| http://localhost:5173/submit | Submit complaint |
| http://localhost:5173/feed | Public complaints feed |
| http://localhost:5173/ticket/:id | Ticket detail + discussion |
| http://localhost:5173/track | Track complaint by email |
| http://localhost:5173/profile | Citizen profile (login required) |
| http://localhost:5173/admin | Admin dashboard (admin only) |
| http://localhost:5173/department | Department queue (dept only) |
| http://localhost:8000/docs | AI service Swagger UI |

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | /auth/register | Register user |
| POST | /auth/login | Login |
| GET | /auth/me | Get current user |
| POST | /api/complaints | Submit complaint (duplicate check) |
| POST | /api/complaints/force | Submit bypassing duplicate check |
| GET | /api/complaints | Get all complaints |
| GET | /api/complaints/public | Public feed (no auth) |
| GET | /api/complaints/track?email= | Track by email |
| GET | /api/complaints/stats | Dashboard stats |
| GET | /api/complaints/my-department | Department complaints |
| GET | /api/complaints/:id | Single complaint |
| GET | /api/complaints/:id/audit | Audit log (admin/dept) |
| PATCH | /api/complaints/:id/status | Update status |
| PATCH | /api/complaints/:id/reassign | Reassign (admin only) |
| POST | /api/complaints/:id/upvote | Upvote complaint |
| GET | /api/complaints/:id/comments | Get comments |
| POST | /api/complaints/:id/comments | Post comment |

---

## 🏷️ Categories & Departments

| Category | Department |
|---|---|
| 🛣️ Road | Public Works Department |
| 💧 Water | Water Supply Department |
| ⚡ Electricity | Electricity Department |
| 🗑️ Garbage | Sanitation Department |
| 🚨 Emergency | Emergency & Medical Services |
| 🔥 Fire | Fire Department |
| 🏗️ Building | Civil Engineering Department |
| 🌳 Tree | Parks & Horticulture Department |
| 🐾 Animal | Animal Control Department |
| 🏛️ Public Property | Municipal Corporation |
| 🌫️ Pollution | Environment Department |

---

## 🌍 Hindi/Hinglish Support

The AI classifier understands complaints in Hindi transliteration:

| Input | Detected |
|---|---|
| "nali toot gayi" | 💧 Water |
| "bijli nahi hai" | ⚡ Electricity |
| "sadak mein gaddha hai" | 🛣️ Road |
| "kachra pada hai" | 🗑️ Garbage |
| "aag lag gayi" | 🔥 Fire |
| "awara kutte attack" | 🐾 Animal |
| "factory se dhuaan" | 🌫️ Pollution |

---

## 👥 Roles

| Role | Access |
|---|---|
| citizen | Submit, track, profile, public feed, upvote, comment |
| admin | Full dashboard, reassign, audit log, all complaints |
| department | Only their department's complaints, status updates |
