# Provabook Hosting, Backend & Database Infrastructure Guide

> This document describes how the **current Django backend** (`backend_django`), **PostgreSQL database**, and **Next.js frontend** fit together, how the database connection works, what the main data structures are, what the current data volume looks like, and what that implies for **hosting and server requirements**.

---

## 1. High-Level Architecture

### 1.1 Components

- **Frontend**
  - Next.js 14+/15 App Router (see `frontend/package.json`)
  - TypeScript, Tailwind CSS, Shadcn/UI, React Query, Zustand
  - Talks to the Django API via Axios (`frontend/src/lib/api.ts`)

- **Backend (current)**
  - Django 5.0.1 + Django REST Framework
  - JWT auth via `djangorestframework-simplejwt`
  - Custom apps under `backend_django/apps/*`:
    - `authentication`, `orders`, `samples`, `financials`, `production`, `shipments`, `core`, etc.

- **Database**
  - PostgreSQL 14+ (as per `backend_django/requirements.txt` and docs)
  - Accessed via Django ORM through `psycopg2-binary`

- **File Storage**
  - Django `MEDIA_ROOT` local filesystem by default
  - Environment variables prepared for Google Cloud Storage (GCS), but no Python-side GCS storage backend is wired in yet (no `google.cloud.storage` usage in code at this time).

### 1.2 Request Flow

1. Browser hits **Next.js frontend** (e.g. `https://app.your-domain.com`).
2. Frontend code uses Axios instance from `src/lib/api.ts`:
   - Base URL: `API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'`
   - Requests go to `${API_URL}/api/v1/...`.
3. Axios request interceptor:
   - Adds a trailing slash where needed (to keep Django REST Framework happy).
   - Attaches `Authorization: Bearer <access_token>` from `localStorage`.
4. Django backend at `backend_django` receives HTTP request on `/api/v1/...`:
   - Auth handled by SimpleJWT.
   - Views use Django ORM to read/write PostgreSQL.
   - Any file uploads are stored under `MEDIA_ROOT` (local disk) using the configured upload paths.

---

## 2. Django Backend & Database Connection

### 2.1 Settings and Environment

**File:** `backend_django/config/settings.py`

Key configuration:

```python
BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, False)
)

environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

DATABASES = {
    'default': env.db(
        'DATABASE_URL',
        default='postgresql://postgres:password@localhost:5432/provabook_django'
    )
}

AUTH_USER_MODEL = 'authentication.User'
```

**File:** `backend_django/.env.example`

```env
# Database Configuration
# Format: postgresql://USER:PASSWORD@HOST:PORT/DBNAME
DATABASE_URL=postgresql://postgres:password@localhost:5432/provabook_django
```

**How the connection works**

- `django-environ` is used to parse `DATABASE_URL` from `.env`.
- `DATABASE_URL` embeds all connection details (user, password, host, port, db name).
- Django uses `psycopg2-binary` to open the PostgreSQL connection.
- All ORM calls (e.g. `User.objects.all()`) translate into SQL against this `default` database.

### 2.2 Installed Apps & Middleware

From `settings.py`:

- **Installed apps** (relevant to data):
  - `apps.authentication` – custom user model
  - `apps.orders` – orders and related approval history
  - `apps.samples` – lab dips / strike-offs / etc.
  - `apps.financials` – Proforma Invoices and Letters of Credit
  - `apps.production` – daily production metrics
  - `apps.shipments` – shipment tracking
  - `apps.core` – base models and notifications

- **Middlewares** relevant to hosting:
  - `SecurityMiddleware`
  - `WhiteNoiseMiddleware` – for serving static files in production
  - `CorsMiddleware` – controls which frontend origins can call the API

### 2.3 API Layer & Auth

- **DRF**: Configured in `REST_FRAMEWORK` with pagination, filtering, renderers, and a custom exception handler.
- **JWT**: `SIMPLE_JWT` settings use Django `SECRET_KEY` as signing key and control token lifetimes.
- **CORS**: `CORS_ALLOWED_ORIGINS` is read from env (`CORS_ALLOWED_ORIGINS=http://localhost:3001,...`). You must keep this in sync with your frontend URL in production.

Hosting implication:

- Backend instances must:
  - Have access to the `.env` file with correct `DATABASE_URL`, CORS, JWT lifetimes, and GCS settings (if used later).
  - Persist `logs/` directory for `django.log`.

---

## 3. Data Model Overview & Relationships

This section summarizes the **logical schema** in the Django backend. All of these are stored as relational tables in PostgreSQL via Django ORM.

### 3.1 Shared Base Model: `TimestampedModel`

**File:** `apps/core/models.py`

```python
class TimestampedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']
```

- All major domain entities inherit from this.
- Primary keys are **UUIDs**, not integers.
- Every row has `created_at` and `updated_at` timestamps.

### 3.2 Users (`apps.authentication.models.User`)

- Table: `user_profiles`
- Inherits from `AbstractBaseUser` + `PermissionsMixin`.
- Primary key: `id` (UUID).
- Key fields:
  - `email` (unique, username field)
  - `full_name`
  - `role` (`admin`, `manager`, `merchandiser`)
  - `phone`, `department`
  - `is_active`, `is_staff`, `is_superuser`
  - `metadata` – JSON field for arbitrary user-specific metadata
- Relationships:
  - Linked to orders (as `merchandiser`), financial records (`created_by`), etc.

### 3.3 Orders (`apps.orders.models.Order`)

- Table: `orders`
- Inherits from `TimestampedModel` (UUID PK + timestamps).
- Core fields:
  - `uid` – internal UUID (non-PK) used as unique identifier with index.
  - `order_number` – PO number (duplicates allowed), indexed.
  - `customer_name`, `buyer_name`.
  - Fabric fields: `fabric_type`, `fabric_specifications`, `fabric_composition`, `gsm`, `finish_type`, `construction`.
  - Pricing: `mill_name`, `mill_price`, `prova_price`, `currency`.
  - Quantity: `quantity` (Decimal), `unit` (e.g. meters).
  - JSON fields:
    - `color_quantity_breakdown` (list-like JSON)
    - `colorways` (list-like JSON)
    - `approval_status` (dict-like JSON)
    - `metadata` (dict-like JSON)
  - Dates: `etd`, `eta`, `order_date`, `expected_delivery_date`, `actual_delivery_date`.
  - Status / category: `status` (e.g. upcoming/running/completed), `category` (upcoming/running/archived).
  - Workflow: `current_stage` string (e.g. `Design`, `Delivered`).

- Relationships:
  - `merchandiser` → `User` (nullable FK, `related_name='orders'`).
  - Reverse relations (from other apps):
    - `samples` (from `Sample`)
    - `proforma_invoices` (from `ProformaInvoice`)
    - `letters_of_credit` (from `LetterOfCredit`)
    - `production_metrics` (from `ProductionMetric`)
    - `shipments` (from `Shipment`)

- Computed properties:
  - `total_value`, `total_delivered_quantity`, `shortage_excess_quantity`, `potential_profit`, `realized_profit`, `realized_value`.

- Indexes for performance:
  - On `uid`, `order_number`, `status`, `category`, `created_at`, and `merchandiser`.

### 3.4 Approval History (`apps.orders.models.ApprovalHistory`)

- Table: `approval_history`
- Links either to an `Order` or optionally to a line-level entity `OrderLine`.
- Tracks:
  - `approval_type` (lab dip, strike-off, PP sample, etc.).
  - `status` (submission, resubmission, approved, rejected).
  - `changed_by` user.
  - `notes` text.
- Indexed on `order`, `order_line`, and `created_at`.

### 3.5 Samples (`apps.samples.models.Sample`)

- Table: `samples`
- Inherits from `TimestampedModel`.
- FKs:
  - `order` → `Order` (required, `related_name='samples'`).
- Fields:
  - `type` (lab_dip, strike_off, bulk_swatch, pp_sample, hand_loom, presentation).
  - `version` integer.
  - `status` (pending, submitted, approved, rejected).
  - `submission_date`.
  - Logistics: `recipient`, `courier_name`, `awb_number`.
  - `attachment` file (uploads to `samples/attachments/`).
  - `notes`.

### 3.6 Financials (`apps.financials.models`)

#### Proforma Invoices

- Table: `proforma_invoices`
- Inherits from `TimestampedModel`.
- FKs:
  - `order` → `Order`.
  - `created_by` → `User`.
- Fields:
  - `pi_number` (unique string, versioned with `version`).
  - `status` (draft, sent, confirmed, cancelled).
  - `amount` (Decimal), `currency`.
  - `issue_date`.
  - `pdf_file` – `FileField` that uploads into `financials/proforma_invoices/<order_id>/...`.

#### Letters of Credit

- Table: `letters_of_credit`
- Inherits from `TimestampedModel`.
- FKs:
  - `order` → `Order`.
  - `created_by` → `User`.
- Fields:
  - `lc_number` (unique).
  - `status` (pending, issued, confirmed, expired).
  - `amount`, `currency`.
  - `issue_date`, `expiry_date`.
  - `issuing_bank`.

### 3.7 Production Metrics (`apps.production.models.ProductionMetric`)

- Table: `production_metrics`
- Inherits from `TimestampedModel`.
- FKs:
  - `order` → `Order` (`related_name='production_metrics'`).
- Fields:
  - `date` (per-day metrics).
  - `knitted_quantity`, `dyed_quantity`, `finished_quantity` (Decimals).
  - `notes`.

### 3.8 Shipments (`apps.shipments.models.Shipment`)

- Table: `shipments`
- Inherits from `TimestampedModel`.
- FKs:
  - `order` → `Order` (`related_name='shipments'`).
- Fields:
  - `carrier_name`.
  - `awb_number`.
  - `shipping_date`.
  - `status` (pending, in_transit, delivered, returned).
  - `documents` (file, uploads to `shipments/docs/`).
  - `notes`.

### 3.9 Notifications (`apps.core.models.Notification`)

- Table: `notifications`
- Inherits from `TimestampedModel`.
- FKs:
  - `user` → `User`.
- Fields:
  - `title`, `message`.
  - `notification_type`.
  - `related_id`, `related_type` (for linking to arbitrary business objects).
  - `is_read` flag.
  - `severity` (info, warning, critical).

---

## 4. Current Data Volume & Situation

> This snapshot was taken using `python manage.py shell` against your **current** `DATABASE_URL`.

Approximate row counts in key tables:

- **Users (`user_profiles`)**: 7
- **Orders (`orders`)**: 53
- **Samples (`samples`)**: 212
- **Proforma Invoices (`proforma_invoices`)**: 54
- **Letters of Credit (`letters_of_credit`)**: 53
- **Production Metrics (`production_metrics`)**: 3
- **Shipments (`shipments`)**: 20
- **Notifications (`notifications`)**: 0

Interpretation:

- Data volume is currently **small** (hundreds of rows), consistent with a development / early staging database or a partially migrated production.
- Storage and performance requirements are modest.
- Indexing is already in place for high-cardinality fields such as `order_number`, `status`, `category`, and timestamps.
- Most heavy-weight growth in size will come from:
  - Accumulation of orders over time.
  - File uploads (sample attachments, PIs, shipment documents).

Hosting impact:

- Even a small managed PostgreSQL instance (e.g. with 1–2 vCPUs, 10–20 GB storage) is sufficient for current and near-term usage.
- Disk usage is likely in the tens of MB range today (exact numbers not visible here, but can be checked from the DB provider).

---

## 5. File Storage & Google Cloud Storage

### 5.1 Current Behavior

From the models:

- `Sample.attachment` → `FileField(upload_to='samples/attachments/')`
- `ProformaInvoice.pdf_file` → `FileField(upload_to=pi_upload_path)` under `financials/proforma_invoices/<order_id>/...`
- `Shipment.documents` → `FileField(upload_to='shipments/docs/')`

And from `settings.py`:

```python
MEDIA_URL = 'media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
```

- Currently, Django is configured to store uploaded files under the local `media/` folder in the backend project directory.
- There is no custom storage backend class pointing to GCS in the code right now.

### 5.2 Prepared GCS Configuration

`settings.py` and `.env.example` define GCS-related settings:

```python
GCS_CREDENTIALS_PATH = env('GOOGLE_APPLICATION_CREDENTIALS', default='')
GCS_BUCKET_NAME = env('GCS_BUCKET_NAME', default='provabook-documents')
GCS_PROJECT_ID = env('GCS_PROJECT_ID', default='')
```

```env
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-gcs-credentials.json
GCS_BUCKET_NAME=provabook-documents
GCS_PROJECT_ID=your-gcp-project-id
```

This means:

- The app is **ready** to use GCS, but code that explicitly uses `google-cloud-storage` has not been wired in yet.
- For production, you can either:
  - Continue using **local disk** on the backend server for `MEDIA_ROOT`, making sure disk is large and backed up, **or**
  - Implement/enable a **GCS-backed storage class** and point Django file storage to your bucket.

Hosting implication:

- If staying on local disk:
  - Ensure `media/` is on fast, durable storage.
  - Plan for growth (file uploads can dominate storage usage).
  - Set up file backups or snapshots.

- If moving to GCS:
  - Backend instances can be ephemeral; they only need temporary disk.
  - Bucket storage and lifecycle policies should be configured in GCP instead.

---

## 6. Frontend–Backend Integration & Environment

### 6.1 Axios API Client

**File:** `frontend/src/lib/api.ts`

```ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

- `NEXT_PUBLIC_API_URL` should be set to the **backend base URL without `/api/v1`** for this code (e.g. `https://api.your-domain.com`).
- The client automatically appends `/api/v1`.

Request interceptor for trailing slashes:

- Ensures that URLs like `/orders` become `/orders/`, which is friendly to Django REST Framework.

Auth interceptor:

- Reads `localStorage.getItem('access_token')` and sets `Authorization: Bearer <token>`.
- On `401`, clears tokens and redirects to `/login`.

### 6.2 CORS & Domains

- Backend CORS config (`CORS_ALLOWED_ORIGINS`) must match the frontend origin, e.g.:
  - `https://app.your-domain.com`
- In production:
  - Frontend: e.g. `https://app.provabook.com`
  - Backend: e.g. `https://api.provabook.com`

Hosting implication:

- When deploying, you must:
  - Set `NEXT_PUBLIC_API_URL` in the Next.js environment to the API origin.
  - Set `CORS_ALLOWED_ORIGINS` on Django to the frontend origin.
  - Ensure HTTPS on both.

---

## 7. Hosting & Server Requirements

### 7.1 Backend (Django + DRF)

**Runtime & dependencies**

- Python 3.11+
- Django 5.0.1, DRF 3.14, SimpleJWT, Gunicorn, WhiteNoise.
- PostgreSQL 14+ client libraries (`psycopg2-binary`).

**Recommended deployment pattern**

- One or more application servers running:

  ```bash
  gunicorn config.wsgi:application --bind 127.0.0.1:8000 --workers 3-4
  ```

- Reverse proxy (e.g. Nginx) terminating TLS and proxying `/api/` to Gunicorn (see examples in `backend_django/README.md` and `SETUP_AND_MIGRATION_GUIDE.md`).

**Resource sizing (initial)**

Given current data volume and expected early-stage usage:

- **Small production instance (baseline):**
  - 2 vCPUs
  - 2–4 GB RAM
  - 20–40 GB disk (if also storing `media/` locally)

- **Scaling strategy:**
  - If CPU is the bottleneck, increase Gunicorn workers and/or horizontally scale app instances behind a load balancer.
  - If memory is the bottleneck (many concurrent requests, large querysets), scale RAM.

**Environment & files**

- Persist or mount:
  - `.env` (or use environment variables via the hosting platform).
  - `logs/` directory for `django.log` (or send logs to centralized logging).
  - `media/` directory (if using local storage).

**Operational tasks**

- Apply migrations before or during deployment:

  ```bash
  python manage.py migrate
  ```

- Run health checks:

  ```bash
  python manage.py check
  ```

- Monitor:
  - 5xx error rate
  - Database connection errors
  - Response times on key endpoints (orders list/detail, samples, financials).

### 7.2 Database (PostgreSQL)

**Requirements**

- PostgreSQL 14+.
- Network reachable from your Django backend.
- Credentials stored securely in `DATABASE_URL`.

**Sizing (based on current data)**

- With a few hundred rows across main tables, disk usage is low.
- Reasonable starting point for a managed DB instance:
  - 1–2 vCPUs
  - 2–4 GB RAM
  - 10–20 GB storage (auto-expand enabled if possible).

**Management & operations**

- **Backups**
  - Automated daily backups.
  - Optional point-in-time recovery (PITR) if supported by your provider.
  - Test restores periodically.

- **Security**
  - Strong DB password, non-superuser role for the app.
  - Restrict inbound DB access to backend servers/VPC.
  - TLS for DB connections if offered.

- **Maintenance**
  - Regular vacuum/analyze (usually handled automatically by managed providers).
  - Monitor slow queries; add indexes if new query patterns emerge.

### 7.3 File Storage

**Option A – Local disk on backend server**

- Keep `MEDIA_ROOT` on an attached disk.
- Plan according to expected file growth:
  - Samples, PIs, shipments: likely PDFs and images → tens to hundreds of MB per year depending on usage.
- Ensure:
  - Regular backups (snapshots or rsync to another storage).
  - Sufficient IOPS for concurrent access.

**Option B – Google Cloud Storage**

- Move to using a custom `FileSystemStorage` or 3rd-party package that uses `google-cloud-storage`.
- Benefits:
  - Infinite horizontal scaling of storage.
  - CDN and signed URLs available.
  - Backend instances become stateless regarding uploaded files.

Hosting implication:

- If using GCS, backend servers only need temporary disk for logs and staticfiles; large long-term storage is offloaded to GCS.

### 7.4 Frontend (Next.js)

**Runtime**

- Node.js 18+ (per `frontend/README.md`).

**Deployment options**

- **Vercel (recommended)**:
  - Automatically handles builds and SSR/ISR.
  - Set `NEXT_PUBLIC_API_URL` in project settings to your backend URL (without `/api/v1`).

- **Custom Node host / VPS**:
  - Build step:

    ```bash
    npm install
    npm run build
    ```

  - Start:

    ```bash
    npm run start -- -p 3001 -H 0.0.0.0
    ```

  - Reverse proxy from Nginx/Load Balancer to port 3001.

**Resource sizing**

- For small-to-moderate traffic:
  - 1–2 vCPUs
  - 1–2 GB RAM
- Many pages can be statically rendered; heavier SSR or high concurrency may require more CPU.

---

## 8. Server & Database Management Guidelines

### 8.1 Environments

Recommended environments:

- **Development** – local Django + local PostgreSQL + local Next.js.
- **Staging** – mirrors production stack with smaller resources; used for testing migrations and new features.
- **Production** – full stack with proper scaling, monitoring, and backups.

### 8.2 Deployment Checklist (Backend)

Before each production deployment:

1. Pull new code and install Python dependencies.
2. Apply migrations: `python manage.py migrate`.
3. Collect static files (if serving via WhiteNoise):
   - `python manage.py collectstatic --noinput`
4. Run checks:
   - `python manage.py check`
5. Reload Gunicorn / restart the backend service.

### 8.3 Deployment Checklist (Frontend)

1. Build Next.js app (`npm run build`).
2. Update environment variable `NEXT_PUBLIC_API_URL` to correct backend URL.
3. Deploy to Vercel or restart Node-based frontend service.

### 8.4 Monitoring & Logging

- **Backend**
  - Use `logs/django.log` for local inspection.
  - In production, forward logs to a centralized logging solution (e.g. Cloud Logging, ELK, Loki).
  - Watch for:
    - Database connection errors
    - 5xx HTTP status codes
    - Performance of high-volume endpoints (orders list, samples, financials).

- **Database**
  - Monitor CPU, memory, storage, I/O, and connections.
  - Create alerts for high error rates or nearing storage limits.

- **Frontend**
  - Track client-side errors and performance via a tool like Sentry or similar.

### 8.5 Security & Compliance

- Ensure:
  - `DEBUG=False` in production.
  - `SECRET_KEY` is unique and secret.
  - HTTPS is enabled for both frontend and backend.
  - CORS is restricted to trusted domains.
  - Authentication tokens (JWTs) are stored securely on the client side and rotated periodically.

---

## 9. Summary

- Backend is a **Django 5 + DRF** service connected to **PostgreSQL** via a single `DATABASE_URL` environment variable, using a clean app-based domain model (authentication, orders, samples, financials, production, shipments, notifications).
- Data currently consists of **hundreds of rows**, so a modest Postgres instance and small app servers are sufficient.
- File storage currently uses **local `media/`**, with configuration hooks ready for **Google Cloud Storage** if you choose to offload files.
- Frontend is a **Next.js** app that talks to the Django API using Axios, with JWT-based auth and automatic trailing-slash handling.
- Hosting can be split as:
  - Frontend on Vercel or a Node host.
  - Backend on a Python-friendly server/VPS with Gunicorn + Nginx.
  - Database on a managed PostgreSQL service.
  - Optional: file storage on GCS.

This guide can serve as a baseline for planning infrastructure, scaling decisions, and future migration from local file storage to cloud-based storage if/when needed.
