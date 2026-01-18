# Provabook – Textile Operations Control Center

An end-to-end platform for mills and sourcing teams to move fabric programs from inquiry to shipment without spreadsheets, inbox clutter, or missed milestones.

---

## 📌 At a Glance

- **Frontline visibility:** Order health, production KPIs, incidents, and shipments updated in real time.
- **Role-aware workflows:** Admin, manager, merchandiser, QA/logistics, and on-floor roles get tailored dashboards and permissions.
- **Document-first:** Tech packs, approvals, PI/LC packets, and incident dossiers live alongside every order.

---

## 🧭 Table of Contents

1. [Why teams pick Provabook](#-why-teams-pick-provabook)
2. [Screens & Visuals](#-screens--visuals)
3. [Feature Map](#-feature-map)
4. [Recently Shipped Improvements](#-recently-shipped-improvements)
5. [Architecture & Tech](#-architecture--tech)
6. [Project Structure](#-project-structure)
7. [Quick Start](#-quick-start)
8. [Demo Accounts](#-demo-accounts)
9. [API & Docs](#-api--docs)
10. [Testing](#-testing)
11. [Deployment Notes](#-deployment-notes)
12. [Documentation Map](#-documentation-map)
13. [Support](#-support)

---

## 💡 Why teams pick Provabook

| Need | How Provabook solves it |
| --- | --- |
| **Unified source of truth** | Orders, samples, production, incidents, and shipments share one PostgreSQL-backed data model with audit trails. |
| **Live production cockpit** | Daily local-order metrics feed dashboards and notes overlays so managers can coach lines without chasing WhatsApp updates. |
| **Sampling discipline** | Structured workflows for Lab Dip → PP samples with rejection reasons, resubmission plans, and document snapshots. |
| **Financial compliance** | Versioned PIs, LC milestone clocks, and document vaults reduce banking surprises. |
| **Instant visibility** | Notifications service, unread counters, and role-appropriate landing pages surface risk before it hits the floor. |

---

## 🖼️ Screens & Visuals

| Dashboard & Navigation | Sample Orders | Notifications |
| --- | --- | --- |
| ![Dashboard](images/Screenshot%202025-12-20%20214058.jpg) | ![Sample Orders](images/Screenshot%202025-12-20%20214151.jpg) | ![Notifications](images/Screenshot%202025-12-20%20214210.jpg) |

---

## 🗺️ Feature Map

### Core Modules

1. **Foreign Order Management**
   - Order + style hierarchy with fabric specs, buyer info, and colorways.
   - Document stack (POs, CADs, lab approvals) with Google Cloud Storage-backed presigned URLs.
   - Categorization pipelines (Upcoming, Running, Archived) and approval history timelines.

2. **Development & Sampling**
   - Lab Dip, Hand Loom, Strike-Off, Presentation, and PP sample tracking.
   - Versioned submissions, courier/receipt logging, and mandatory resubmission plans.
   - Photo viewer dialog for merchandisers to review latest strikes without page reloads.

3. **Financials**
   - Multi-version Proforma Invoices (Draft/Sent/Revised/Confirmed).
   - Letter of Credit tracker with expiry alerts, discrepancy notes, and document attachments.

4. **Local Production & Daily Metrics**
   - Floor-level tracker for local orders with throughput, cuts, finishing, and delivery status.
   - Inline order/line notes surfaced inside the production board for instant coaching.
   - KPI widgets and gradient cards on the landing/dashboard screens.

5. **Incidents & Blockers**
   - Capture rejections, machine breakdowns, delays, and action plans with owners + due dates.
   - Status transitions and evidence uploads to keep escalation trails auditable.

6. **Shipments & Logistics**
   - Packing list, invoice, and AWB uploads per shipment.
   - ETD/ETA tracking with delivery confirmation workflow.

7. **Notifications & Activity**
   - Real-time unread counter in the navbar, polling every 30 seconds.
   - Role-based subscription model for incidents, approvals, and LC milestones.

### System Capabilities

- JWT Authentication powered by Django + SimpleJWT.
- Role-based permissions (`admin`, `manager`, `merchandiser`, specialist roles) enforced server-side through custom DRF permissions.
- Secure file storage via Google Cloud Storage w/ presigned access.
- Audit logging + notification feeds for every critical mutation.
- Next.js App Router frontend with Zustand state, React Query data hooks, Tailwind + shadcn UI kit.

---

## 🔄 Recently Shipped Improvements

_Dec 2025 sprint highlights:_

- **Production cockpit refresh** – Order and line notes now appear directly inside the Local Orders table so teams never miss operator context.
- **Visual polish** – Header aligns with the sidebar palette and expanded table height improves data density on large screens.
- **Sampling photo viewer fix** – Dialog now lives outside conditional render blocks, preventing remount flicker when merchandisers open multiple photos.
- **Environment hardening** – Default local `.env` now points to the managed DigitalOcean PostgreSQL replica used in staging for parity.

---

## 🏗️ Architecture & Tech

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + React Query + Zustand + Axios (auto appends trailing slashes to API calls).
- **Backend (current):** Django 5 + DRF + PostgreSQL + SimpleJWT auth + django-filter + drf-spectacular for Swagger docs.
- **Storage:** Google Cloud Storage buckets for large documents and sample imagery.
- **Notifications & Background jobs:** Django signals + Celery-ready architecture (see `backend_django/apps/core`).
- **Legacy backend (optional):** NestJS + TypeORM codebase retained for reference inside `/backend`.

---

## 📁 Project Structure

```
provabook/
├── backend/             # Legacy NestJS REST API (reference only)
├── backend_django/      # Current Django REST API
├── frontend/            # Next.js application
├── images/              # Marketing/product screenshots used in this README
└── README.md            # You are here
```

---

## 🚀 Quick Start

### 1. Django Backend

```powershell
cd backend_django
python -m venv venv
.\venv\Scripts\activate        # Use source venv/bin/activate on macOS/Linux
pip install -r requirements.txt
copy .env.example .env         # Fill DATABASE_URL, SECRET_KEY, storage creds, etc.
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```

- Swagger / OpenAPI UI: `http://localhost:8000/api/docs/`
- Admin panel: `http://localhost:8000/admin/`

### 2. Next.js Frontend

```powershell
cd frontend
npm install
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
npm run dev -- --port 3001
```

Access the UI at `http://localhost:3001`.

### 3. Legacy NestJS backend (optional)

Only required for historical comparison. Instructions live in `backend/README.md`.

---

## 👤 Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@provabook.com` | `Admin@123` |
| Manager | `manager@provabook.com` | `Manager@123` |
| Merchandiser | `merchandiser@provabook.com` | `Merchandiser@123` |

---

## 📚 API & Docs

- Django Swagger UI: `http://localhost:8000/api/docs/`
- `backend_django/README.md` – module status, settings, and extended commands.
- `backend_django/SETUP_AND_MIGRATION_GUIDE.md` – environment bootstrap + migration strategy from the NestJS data model.

---

## 🧪 Testing

### Backend (NestJS legacy suite)

```powershell
cd backend
npm run test        # Unit tests
npm run test:e2e    # End-to-end tests
npm run test:cov    # Coverage report
```

### Frontend

```powershell
cd frontend
npm run test        # Jest / React Testing Library
npm run test:e2e    # Playwright smoke tests
```

_Django tests are configured but currently lean on manual QA for domain flows._

---

## ☁️ Deployment Notes

### Backend
1. Push to GitHub.
2. Deploy to your preferred host (DigitalOcean App Platform, Render, Railway, etc.).
3. Configure environment variables (`DATABASE_URL`, `R2_*` storage keys, `SECRET_KEY`, CORS/ALLOWED_HOSTS).
4. Run migrations and create service accounts.

### Frontend
1. Deploy via Vercel (recommended) or any Next.js-compatible host.
2. Mirror `.env.local` values (especially `NEXT_PUBLIC_API_URL`).
3. Clean `.next` cache after every pull / deploy to avoid module corruption (see `frontend/clean-restart.ps1`).

### Database
- Managed PostgreSQL (DigitalOcean) for staging + production; enable SSL and automated backups.

---

## 🗺️ Documentation Map

- `OFFICE_SETUP_GUIDE.md` – hardware/software prep for new teammates.
- `IMPLEMENTATION_GUIDE.md` – domain workflows and acceptance criteria.
- `POST_PULL_GUIDE.md` – routines after syncing branches.
- `TRAILING_SLASH_SOLUTION.md` – how frontend/backend auto-handle API slashes.
- Frontend specific notes: `frontend/README.md`.


---

**Built with ❤️ for resilient, insight-driven textile operations.**
