# Provabook - Textile Company Operations Platform

A comprehensive full-stack web application for managing textile fabric orders from inquiry to delivery.

## 🎯 Overview

Provabook is a centralized operations platform designed to replace scattered emails and spreadsheets in textile manufacturing. It manages the complete lifecycle of fabric orders with workflow enforcement, document management, and role-based access control.

## 🏗️ Architecture

### Tech Stack
- **Backend (current)**: Django 5 + Django REST Framework + PostgreSQL
- **Backend (legacy, optional)**: NestJS + TypeORM + PostgreSQL (legacy backend, not used by default)
- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Database**: PostgreSQL
- **Authentication**: Django JWT auth (SimpleJWT)
- **Storage**: Google Cloud Storage (documents)
- **UI Framework**: Tailwind CSS + Shadcn/UI
- **Hosting**: Vercel (Frontend), custom server or VPS for Django backend

### Project Structure
```
provabook/
├── backend/          # Legacy NestJS REST API (optional)
├── backend_django/   # Django REST API (current backend)
├── frontend/         # Next.js application
└── README.md         # This file
```

## 🚀 Quick Start

### Recommended: Django backend + Next.js frontend

**Backend (Django):**

```bash
cd backend_django

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env with your PostgreSQL DATABASE_URL and other settings

# Run database migrations
python manage.py migrate

# Create superuser (for admin panel)
python manage.py createsuperuser

# Start development server
python manage.py runserver 0.0.0.0:8000
```

Django API docs: `http://localhost:8000/api/docs/`

**Frontend (Next.js):**

```bash
cd frontend

# Install dependencies
npm install

# Create env file
cp .env.example .env.local

# Edit .env.local:
# NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# Start development server
npm run dev
```

Frontend: `http://localhost:3001`

### Legacy NestJS backend (optional)

If you ever need to run or inspect the **old NestJS backend**, see `backend/README.md`.
Most people can ignore it and use only the Django backend.

### 4. First Login

After running the seed script, you can login with:

**Administrator:**
- Email: `admin@provabook.com`
- Password: `Admin@123`

**Manager:**
- Email: `manager@provabook.com`
- Password: `Manager@123`

**Merchandiser:**
- Email: `merchandiser@provabook.com`
- Password: `Merchandiser@123`

## 📋 Features

### Core Modules

1. **Order Management**
   - Track orders with fabric specs, quantities, colorways
   - Upload and associate documents (POs, CADs, tech packs)
   - Categorize: Upcoming, Running, Archived

2. **Development & Sampling**
   - Track sample types: Lab Dip, Hand Loom, Strike-Off, Presentation, PP
   - Version control with submission/receipt tracking
   - Mandatory resubmission plans for rejections
   - Automated reminders

3. **Pricing & Financials**
   - Multiple PI versions (Draft, Sent, Revised, Confirmed)
   - LC tracking with critical dates
   - Business rule enforcement

4. **Production Readiness**
   - Pre-production checklist
   - Mobile-friendly daily metrics logging
   - Workflow gates

5. **Incidents & Blockers**
   - Quality rejections, delays, breakdowns
   - Action plans with responsible persons
   - Resolution tracking

6. **Shipment & Delivery**
   - Upload packing lists, AWB, invoices
   - ETD/ETA tracking
   - Delivery confirmation

### System Features
- Role-based access control (Admin, Manager, Merchandiser, QA/Logistics/Field Staff)
- Dashboard with KPIs and visual timelines
- Automated notifications and reminders
- Complete audit logging
- Secure file storage with pre-signed URLs
- Real-time status updates

## 🔐 User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Administrator** | Full CRUD access, user management, system configuration |
| **Manager** | View all orders, generate reports, receive alerts |
| **Merchandiser** | Full CRUD on assigned orders, update statuses, upload documents |
| **QA/Logistics/Field Staff** | Limited access for quality checks and production metrics |

## 🗄️ Database Schema

The application uses PostgreSQL with the following main entities:
- Users (managed by Django auth + custom profiles)
- Orders
- Samples
- Proforma Invoices (PI)
- Letters of Credit (LC)
- Production Metrics
- Incidents
- Shipments
- Documents
- Notifications
- Audit Logs

See `backend/src/database/migrations/` for complete schema.

## 📱 API Documentation

Once the Django backend is running, API documentation is available at:
- Swagger UI: `http://localhost:8000/api/docs/`

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm run test          # Unit tests
npm run test:e2e      # E2E tests
npm run test:cov      # Coverage report
```

### Frontend Tests
```bash
cd frontend
npm run test          # Jest tests
npm run test:e2e      # Playwright E2E tests
```

## 🚀 Production Deployment

### Backend Deployment (Render/Railway/Heroku)
1. Push code to GitHub
2. Connect repository to hosting platform
3. Set environment variables from `.env`
4. Deploy!

### Frontend Deployment (Vercel)
1. Push code to GitHub
2. Import project in Vercel
3. Set environment variables from `.env.local`
4. Deploy automatically on every push to main

### Database
Your PostgreSQL database (used by the Django backend) should be configured securely:
- Strong database password
- Appropriate roles and permissions configured
- Regular backups scheduled

## 🧭 Current Architecture & Migration

Provabook currently has:
- A **legacy implementation** using a NestJS backend (documented below and in `backend/README.md`).
- A **new Django backend** in progress (`backend_django/`), which is the long-term direction.

### Legacy (NestJS backend)
- Still contains the full original backend implementation.
- Use this only if you specifically want to run or compare the old stack.
- Quick start details live in `backend/README.md`.

### New Backend (Django + PostgreSQL + GCS)
- Django 5 + Django REST Framework.
- PostgreSQL database (local or remote).
- JWT authentication (`djangorestframework-simplejwt`).
- Google Cloud Storage for document uploads.
- Orders & Authentication modules already implemented.

To work with the Django backend:
- See `backend_django/README.md` for structure, commands, and API overview.
- See `backend_django/SETUP_AND_MIGRATION_GUIDE.md` for full setup and optional data migration from the old backend.

## 📚 Documentation Map

Start here if you are new:
- **Root overview (this file)** – big picture of the project and legacy setup.
- **Office setup guide** – `OFFICE_SETUP_GUIDE.md` (step-by-step, beginner-friendly PC setup).

When working on the new Django backend:
- `backend_django/README.md` – features, project structure, commands, and API docs.
- `backend_django/SETUP_AND_MIGRATION_GUIDE.md` – detailed backend setup + optional data migration from the old backend.

When you need the legacy NestJS backend:
- `backend/README.md` – how to run the original NestJS-based legacy API.

Frontend:
- `frontend/README.md` – Next.js app quick start and structure.

## 🐛 Troubleshooting

### Backend won't start
- Verify DATABASE_URL is correct and database is accessible
- Check if port 3000 is already in use
- Ensure migrations have run successfully: `npm run migration:run`

### Frontend can't connect to backend
- Verify NEXT_PUBLIC_API_URL in `.env.local`
- Ensure the Django backend is running on port 8000
- Check browser console for CORS errors

### Authentication issues
- Verify your Django authentication settings and environment variables
- Check backend logs for authentication errors
- Ensure JWT/secret settings in `.env` match what the frontend expects

### Database migration errors
- Ensure DATABASE_URL is correct
- Check PostgreSQL version (should be 12+)
- Try: `npm run migration:revert` then `npm run migration:run`

## 🤝 Contributing

This is an internal application. For bugs or feature requests, contact the development team.

## 📄 License

Proprietary - Internal Use Only

## 📞 Support

For technical support, contact the IT department or email dev-team@company.com

---

**Built with ❤️ for efficient textile operations management**
