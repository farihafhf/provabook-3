# 🔄 NestJS to Django Backend Migration Plan

## Migration Overview
**Project:** Provabook - Textile Operations Management Platform  
**From:** NestJS + TypeORM + Supabase (PostgreSQL + Auth)  
**To:** Django REST Framework + PostgreSQL + JWT Auth + Google Cloud Storage

---

## 📊 Backend Structure Analysis

### Current NestJS Modules
1. **Auth** - Supabase authentication
2. **Users** - User profile management
3. **Orders** - Core order management
4. **Samples** - Sample tracking
5. **Financials** - PI and LC management
6. **Production** - Production metrics
7. **Incidents** - Incident tracking
8. **Shipments** - Shipment management
9. **Notifications** - Notification system
10. **Documents** - Document management
11. **Dashboard** - Dashboard statistics
12. **Activity Log** - Activity logging
13. **Audit Logs** - Audit trail

### Database Entities (11 tables)
1. `user_profiles` - User information
2. `orders` - Core orders table
3. `samples` - Sample records
4. `proforma_invoices` - PI records
5. `letters_of_credit` - LC records
6. `incidents` - Incident tracking
7. `shipments` - Shipment tracking
8. `documents` - File metadata
9. `production_metrics` - Production data
10. `notifications` - User notifications
11. `audit_logs` - Audit trail

### API Endpoints Summary
**Base URL:** `http://localhost:3000/api/v1`

#### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /auth/profile` - Get current user profile

#### Orders
- `GET /orders` - List orders (with filters)
- `POST /orders` - Create order
- `GET /orders/:id` - Get order details
- `PATCH /orders/:id` - Update order
- `DELETE /orders/:id` - Delete order
- `GET /orders/stats` - Get order statistics
- `PATCH /orders/:id/approvals` - Update approval status
- `POST /orders/:id/change-stage` - Change order stage
- `POST /orders/:id/documents` - Upload document
- `GET /orders/:id/documents` - Get order documents

#### Samples
- `GET /samples` - List samples
- `POST /samples` - Create sample
- `GET /samples/:id` - Get sample details
- `PATCH /samples/:id` - Update sample
- `DELETE /samples/:id` - Delete sample

#### Financials
- `GET /financials/proforma-invoices` - List PIs
- `POST /financials/proforma-invoices` - Create PI
- `GET /financials/proforma-invoices/:id` - Get PI details
- `PATCH /financials/proforma-invoices/:id` - Update PI
- `DELETE /financials/proforma-invoices/:id` - Delete PI
- `GET /financials/letters-of-credit` - List LCs
- `POST /financials/letters-of-credit` - Create LC
- `GET /financials/letters-of-credit/:id` - Get LC details
- `PATCH /financials/letters-of-credit/:id` - Update LC
- `DELETE /financials/letters-of-credit/:id` - Delete LC

#### Production
- Similar CRUD operations

#### Incidents, Shipments, Notifications
- Similar CRUD operations

---

## 🎯 Django Project Structure

```
backend_django/
├── manage.py
├── requirements.txt
├── .env.example
├── .env
├── config/                    # Project settings
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
├── apps/
│   ├── __init__.py
│   ├── authentication/        # Auth & User management
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── permissions.py
│   ├── orders/                # Orders module
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── filters.py
│   ├── samples/               # Samples module
│   ├── financials/            # PI & LC module
│   ├── production/            # Production metrics
│   ├── incidents/             # Incident management
│   ├── shipments/             # Shipment tracking
│   ├── notifications/         # Notification system
│   ├── documents/             # Document management
│   ├── dashboard/             # Dashboard stats
│   └── core/                  # Shared utilities
│       ├── models.py          # Base models
│       ├── permissions.py     # Custom permissions
│       ├── pagination.py      # Custom pagination
│       └── utils.py           # Utility functions
└── scripts/
    ├── migrate_data.py        # Data migration script
    └── test_endpoints.py      # API testing script
```

---

## 🔐 Authentication Strategy

### From Supabase Auth → Django JWT

**NestJS/Supabase:**
- Uses Supabase Auth for user management
- JWT tokens issued by Supabase
- User profiles stored separately in `user_profiles` table

**Django Implementation:**
- Use `djangorestframework-simplejwt` for JWT
- Custom User model extending `AbstractBaseUser`
- Fields: email, full_name, role, phone, department
- Roles: ADMIN, MANAGER, MERCHANDISER

**Endpoints:**
- `POST /api/v1/auth/register` → User registration
- `POST /api/v1/auth/login` → Returns access + refresh tokens
- `POST /api/v1/auth/refresh` → Refresh access token
- `GET /api/v1/auth/profile` → Get user profile (authenticated)
- `PATCH /api/v1/auth/profile` → Update profile

---

## 📦 Key Django Packages

```
Django==5.0
djangorestframework==3.14.0
djangorestframework-simplejwt==5.3.1
psycopg2-binary==2.9.9
django-cors-headers==4.3.1
django-environ==0.11.2
google-cloud-storage==2.14.0
Pillow==10.2.0
django-filter==23.5
drf-yasg==1.21.7  # Swagger documentation
gunicorn==21.2.0  # Production server
whitenoise==6.6.0  # Static files
```

---

## 🗄️ Database Migration Plan

### Step 1: Export Data from Supabase
```bash
pg_dump -h db.xxxxx.supabase.co -U postgres -d postgres -t user_profiles -t orders -t samples -t proforma_invoices -t letters_of_credit -t incidents -t shipments -t documents -t production_metrics -t notifications -t audit_logs > provabook_data.sql
```

### Step 2: Create Local PostgreSQL Database
```bash
createdb provabook_django
```

### Step 3: Run Django Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### Step 4: Import Data
- Custom migration script to handle:
  - User password hashing (bcrypt → Django's PBKDF2)
  - UUID format conversion
  - Enum type mapping
  - Timestamp format adjustments

---

## ☁️ Google Cloud Storage Integration

### File Upload Flow

**NestJS (Supabase Storage):**
```typescript
const { data, error } = await supabase.storage
  .from('documents')
  .upload(filePath, file);
```

**Django (GCS):**
```python
from google.cloud import storage

def upload_to_gcs(file, bucket_name, destination_blob_name):
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(destination_blob_name)
    blob.upload_from_file(file)
    return blob.public_url
```

### Configuration
- Set `GOOGLE_APPLICATION_CREDENTIALS` in `.env`
- Create GCS bucket: `provabook-documents`
- Enable public read access for specific files (if needed)

---

## 🔄 API Compatibility Mapping

| NestJS Pattern | Django Equivalent |
|----------------|-------------------|
| `@Controller('orders')` | `router.register('orders', OrderViewSet)` |
| `@Get()` | `@action(methods=['get'])` |
| `@Post()` | `create()` method |
| `@Patch(':id')` | `partial_update()` |
| `@Delete(':id')` | `destroy()` |
| `@UseGuards(AuthGuard('jwt'))` | `permission_classes = [IsAuthenticated]` |
| `@Roles(UserRole.ADMIN)` | Custom `IsAdmin` permission |
| `@CurrentUser()` | `request.user` |

---

## ⚙️ Environment Variables

### `.env` Structure
```env
# Django
SECRET_KEY=django-insecure-your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/provabook_django

# JWT
ACCESS_TOKEN_LIFETIME=60  # minutes
REFRESH_TOKEN_LIFETIME=1440  # minutes (24 hours)

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3001,http://127.0.0.1:3001

# Google Cloud Storage
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
GCS_BUCKET_NAME=provabook-documents

# File Upload
MAX_UPLOAD_SIZE=10485760  # 10MB
ALLOWED_EXTENSIONS=.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx
```

---

## ✅ Testing Strategy

### Unit Tests
- Model validation tests
- Serializer tests
- View permission tests

### Integration Tests
- API endpoint tests
- Authentication flow tests
- File upload tests

### Migration Validation
```bash
python scripts/test_endpoints.py
```

Tests all endpoints with sample data to ensure:
- Same request/response format
- Proper authentication
- Correct filtering
- Pagination works
- File uploads work

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Data migration completed
- [ ] Environment variables set
- [ ] Static files collected
- [ ] Database migrations run

### Production Server Setup
```bash
# Install dependencies
pip install -r requirements.txt

# Collect static files
python manage.py collectstatic --noinput

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run with Gunicorn
gunicorn config.wsgi:application --bind 0.0.0.0:8000
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /static/ {
        alias /path/to/backend_django/staticfiles/;
    }

    location /media/ {
        alias /path/to/backend_django/media/;
    }
}
```

---

## 📝 Migration Timeline

**Phase 1:** Project Setup (2 hours)
- Create Django project structure
- Install dependencies
- Configure settings

**Phase 2:** Models & Migrations (3 hours)
- Create all Django models
- Run migrations
- Verify database schema

**Phase 3:** Authentication (2 hours)
- Implement JWT auth
- Create user endpoints
- Test login/register

**Phase 4:** API Endpoints (6 hours)
- Implement all ViewSets
- Create serializers
- Add permissions

**Phase 5:** File Storage (2 hours)
- Google Cloud Storage integration
- File upload endpoints

**Phase 6:** Data Migration (2 hours)
- Export from Supabase
- Transform data
- Import to Django

**Phase 7:** Testing (3 hours)
- Write tests
- Validate all endpoints
- Frontend integration testing

**Total Estimated Time:** 20 hours

---

## 🎯 Success Criteria

✅ All existing API endpoints work identically  
✅ Frontend requires ZERO changes (except base URL)  
✅ Authentication flow works with JWT  
✅ All data migrated successfully  
✅ File uploads work with GCS  
✅ Tests pass  
✅ API documentation (Swagger) available  
✅ Ready for production deployment
