# Provabook - Textile Company Operations Platform

A comprehensive full-stack web application for managing textile fabric orders from inquiry to delivery.

## 🎯 Overview

Provabook is a centralized operations platform designed to replace scattered emails and spreadsheets in textile manufacturing. It manages the complete lifecycle of fabric orders with workflow enforcement, document management, and role-based access control.

## 🏗️ Architecture

### Tech Stack
- **Backend**: NestJS + TypeORM + PostgreSQL
- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **UI Framework**: Tailwind CSS + Shadcn/UI
- **Hosting**: Vercel (Frontend), Supabase (Backend & DB)

### Project Structure
```
provabook/
├── backend/          # NestJS REST API
├── frontend/         # Next.js application
└── README.md         # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm
- A Supabase account (free tier works)
- Git

### 1. Supabase Setup

#### Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Name it "provabook" and set a strong database password
4. Wait for the project to be provisioned (~2 minutes)

#### Get Your Credentials
After your project is ready:
1. Go to **Project Settings** → **API**
2. Copy these values (you'll need them in step 3):
   - `Project URL` (e.g., `https://xxxxx.supabase.co`)
   - `anon/public key` (starts with `eyJ...`)
   - `service_role key` (starts with `eyJ...`, keep this secret!)
3. Go to **Project Settings** → **Database**
4. Copy the connection string under "Connection string" → "URI"
   - It looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`
   - Replace `[YOUR-PASSWORD]` with your actual database password

#### Enable Storage
1. In Supabase dashboard, go to **Storage**
2. Create a new bucket named `documents`
3. Set it to **Private** (not public)
4. Add storage policies (see backend README for SQL)

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your Supabase credentials:
# - DATABASE_URL from Supabase (connection string)
# - SUPABASE_URL (project URL)
# - SUPABASE_ANON_KEY (anon key)
# - SUPABASE_SERVICE_ROLE_KEY (service role key)
# - JWT_SECRET (generate a strong random string)

# Run database migrations
npm run migration:run

# Seed demo data (optional but recommended)
npm run seed

# Start development server
npm run start:dev
```

Backend will be available at `http://localhost:3000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file
cp .env.example .env.local

# Edit .env.local with your Supabase credentials:
# - NEXT_PUBLIC_SUPABASE_URL (same as backend SUPABASE_URL)
# - NEXT_PUBLIC_SUPABASE_ANON_KEY (same as backend SUPABASE_ANON_KEY)
# - NEXT_PUBLIC_API_URL (http://localhost:3000 for development)

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:3001`

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
- Users (managed by Supabase Auth + custom profiles)
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

Once the backend is running, API documentation is available at:
- Swagger UI: `http://localhost:3000/api/docs`

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
Your Supabase database is already production-ready. Just ensure:
- Strong database password
- Row Level Security (RLS) policies enabled
- Regular backups configured

## 📚 Additional Documentation

- [Backend Documentation](./backend/README.md)
- [Frontend Documentation](./frontend/README.md)
- [API Reference](http://localhost:3000/api/docs)
- [Architecture Decisions](./docs/architecture.md)

## 🐛 Troubleshooting

### Backend won't start
- Verify DATABASE_URL is correct and database is accessible
- Check if port 3000 is already in use
- Ensure migrations have run successfully: `npm run migration:run`

### Frontend can't connect to backend
- Verify NEXT_PUBLIC_API_URL in `.env.local`
- Ensure backend is running on port 3000
- Check browser console for CORS errors

### Authentication issues
- Verify Supabase credentials in both frontend and backend
- Check Supabase dashboard for auth errors
- Ensure JWT_SECRET matches in backend .env

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
