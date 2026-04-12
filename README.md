# AI Smart Governance System

A full-stack citizen complaint management system with ML-powered classification, Hindi/Hinglish NLP, real-time updates, role-based access, duplicate detection, SLA tracking, and community features.

---

## Screenshots

### Home Page
![Home Page](screenshots/home.png)

### Submit Complaint
![Submit Complaint](screenshots/submit.png)

### Admin Dashboard
![Admin Dashboard](screenshots/admin.png)

### Ticket Page
![Ticket Page](screenshots/ticket.png)

### Public Feed
![Public Feed](screenshots/feed.png)

### Analytics Dashboard
![Analytics](screenshots/analytics.png)

---

## Features

### AI and Classification
- ML text classification with TF-IDF word and character n-grams plus Logistic Regression
- Hindi and Hinglish support such as `nali toot gayi -> water` and `bijli nahi hai -> electricity`
- Typo normalization such as `electricty`, `garbge`, and `watr`
- ML priority detection with `high`, `medium`, and `low`
- CLIP zero-shot image analysis through Hugging Face
- 11 civic issue categories
- Auto department routing

### Roles and Auth
- JWT authentication with 24-hour expiry
- Roles: `citizen`, `admin`, `department`
- Disposable email domain blocking
- Auto-fill name and email from the logged-in account on complaint submission

### Complaint Management
- Complaint submission with optional image upload
- Location field support
- Duplicate detection for recent similar complaints
- Force submit option for location-specific duplicates
- SLA due dates based on priority
- Overdue indicators
- Complaint reassignment
- Audit log tracking for status changes and reassignment

### Dashboards and Community
- Live admin dashboard with charts, filters, search, export, and audit trail
- Department dashboard scoped to assigned complaints
- Public feed with upvotes and report-in-my-area flow
- Ticket page with timeline, comments, and official responses
- Citizen profile page with complaint history and SLA indicators
- Track complaint by email
- Floating community board and live WebSocket updates

### Security
- Rate limiting
- Helmet security headers
- Input validation
- CORS restriction by frontend origin
- Password hashing with `scrypt`

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React, Vite, React Router, Recharts, Axios, React Leaflet |
| Backend | Node.js, Express, WebSocket (`ws`), Nodemailer |
| Database | PostgreSQL (Neon), Sequelize ORM |
| AI Service | Python, FastAPI, scikit-learn, Hugging Face |
| NLP | TF-IDF, Hindi/Hinglish preprocessing |
| Security | Helmet, express-rate-limit, express-validator, JWT |

---

## System Architecture

```text
                    +----------------------+
                    |      Citizen /       |
                    | Admin / Department   |
                    |       Browser        |
                    +----------+-----------+
                               |
                               | HTTPS / WSS
                               v
                  +------------------------------+
                  |   Frontend (React + Vite)    |
                  |   Vercel                     |
                  |                              |
                  | Home, Feed, Submit, Ticket,  |
                  | Admin, Department, Map       |
                  +------+-----------------------+
                         |
                         | REST API
                         v
            +--------------------------------------+
            |     Backend (Node.js + Express)      |
            |     Render                           |
            |                                      |
            | Auth, Complaints, Comments,          |
            | Upvotes, Analytics, Audit Logs,      |
            | WebSocket broadcasting, Email        |
            +---------+---------------+------------+
                      |               |
                      | HTTP          | PostgreSQL
                      v               v
      +---------------------------+   +----------------------+
      |   AI Service (FastAPI)    |   |   Neon Postgres      |
      |   Render                  |   |                      |
      |                           |   | users               |
      | Text classification       |   | complaints          |
      | Priority prediction       |   | comments            |
      | Image analysis            |   | audit_logs          |
      +---------------------------+   +----------------------+
                      |
                      | HF inference
                      v
             +------------------------+
             | Hugging Face Services  |
             | CLIP / zero-shot NLP   |
             +------------------------+

Additional external services:
- Gmail / SMTP for complaint and official reply emails
- OpenStreetMap / Nominatim for map geocoding
```

### Data Flow

```text
User -> Frontend -> Backend -> Database
                    |
                    +-> AI Service -> Hugging Face
                    |
                    +-> Email Service
                    |
                    +-> WebSocket updates back to Frontend
```

---

## Setup

### 1. Clone and Install

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
DATABASE_URL=postgres://username:password@host:5432/dbname
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN_SECONDS=86400
AI_SERVICE_URL=http://127.0.0.1:8000
AI_DEFAULT_POPULATION=medium
ALLOWED_ORIGINS=http://localhost:5173
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
HF_API_KEY=your_huggingface_key
```

### 3. Frontend `.env`

```env
VITE_API_URL=http://localhost:5000/api
VITE_AI_SERVICE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:5000
```

### 4. AI Service `.env`

```env
HF_API_KEY=your_huggingface_key
ALLOWED_ORIGINS=http://localhost:5173
```

### 5. Run All Services

```bash
# Terminal 1 - Backend
cd backend && npm start

# Terminal 2 - AI Service
cd ai-service && python -m uvicorn app.main:app --port 8000 --reload

# Terminal 3 - Frontend
cd frontend && npm run dev
```

---

## Deployed URLs

| URL | Description |
|---|---|
| https://ai-smart-governance-system.vercel.app | Live frontend |
| https://ai-smart-governance-system-1.onrender.com/health | Live backend health check |
| https://ai-smart-governance-system-1.onrender.com/api/complaints/public?page=1 | Live backend sample public feed endpoint |
| https://ai-smart-governance-system.onrender.com | Live AI service |

---

## Local URLs

| URL | Description |
|---|---|
| http://localhost:5173 | Home page |
| http://localhost:5173/submit | Submit complaint |
| http://localhost:5173/feed | Public complaints feed |
| http://localhost:5173/ticket/:id | Ticket detail and discussion |
| http://localhost:5173/track | Track complaint by email |
| http://localhost:5173/profile | Citizen profile |
| http://localhost:5173/admin | Admin dashboard |
| http://localhost:5173/department | Department queue |
| http://localhost:5173/analytics | Analytics dashboard |
| http://localhost:5173/map | Complaint map |
| http://localhost:5000/health | Backend health |
| http://localhost:5000/api/complaints/public?page=1 | Backend sample public feed endpoint |
| http://localhost:8000/docs | AI service Swagger UI |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | /auth/register | Register user |
| POST | /auth/login | Login |
| GET | /auth/me | Get current user |
| GET | /auth/departments | Get valid departments |
| POST | /api/complaints | Submit complaint with duplicate check |
| POST | /api/complaints/force | Submit complaint bypassing duplicate check |
| GET | /api/complaints/public | Public feed |
| GET | /api/complaints/track?email= | Track complaints by email |
| GET | /api/complaints/stats | Dashboard stats |
| GET | /api/complaints/analytics | Admin analytics |
| GET | /api/complaints/my-department | Department complaints |
| GET | /api/complaints/:id | Single complaint |
| GET | /api/complaints/:id/audit | Audit log |
| PATCH | /api/complaints/:id/status | Update status |
| PATCH | /api/complaints/:id/reassign | Reassign complaint |
| POST | /api/complaints/:id/upvote | Upvote complaint |
| GET | /api/complaints/:id/comments | Get comments |
| POST | /api/complaints/:id/comments | Post comment |

---

## Categories and Departments

| Category | Department |
|---|---|
| road | Public Works Department |
| water | Water Supply Department |
| electricity | Electricity Department |
| garbage | Sanitation Department |
| emergency | Emergency & Medical Services |
| fire | Fire Department |
| building | Civil Engineering Department |
| tree | Parks & Horticulture Department |
| animal | Animal Control Department |
| public_property | Municipal Corporation |
| pollution | Environment Department |

---

## Hindi and Hinglish Support

The AI classifier understands complaints in Hindi transliteration:

| Input | Detected |
|---|---|
| `nali toot gayi` | water |
| `bijli nahi hai` | electricity |
| `sadak mein gaddha hai` | road |
| `kachra pada hai` | garbage |
| `aag lag gayi` | fire |
| `awara kutte attack` | animal |
| `factory se dhuaan` | pollution |

---

## Roles

| Role | Access |
|---|---|
| citizen | Submit, track, profile, public feed, upvote, comment |
| admin | Full dashboard, reassign, audit log, all complaints |
| department | Only department complaints and status updates |
