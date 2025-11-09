# 🚀 Django Backend Setup & Migration Guide

## Overview
This guide will walk you through setting up the Django backend and migrating from NestJS/Supabase to Django/PostgreSQL/GCS.

---

## 📋 Prerequisites

### Required Software
- Python 3.11 or higher
- PostgreSQL 14 or higher
- Google Cloud SDK (for GCS)
- Git

### Required Accounts
- Google Cloud Platform account with Cloud Storage enabled
- PostgreSQL database (local or hosted)

---

## 🔧 Step 1: Initial Setup

### 1.1 Create Virtual Environment
```bash
cd E:\provabook-3\backend_django
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate
```

### 1.2 Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 1.3 Configure Environment Variables
```bash
# Copy example env file
copy .env.example .env

# Edit .env file with your settings
notepad .env
```

**Required Environment Variables:**
```env
SECRET_KEY=your-generated-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DATABASE_URL=postgresql://postgres:password@localhost:5432/provabook_django

CORS_ALLOWED_ORIGINS=http://localhost:3001

GOOGLE_APPLICATION_CREDENTIALS=path/to/your-gcs-credentials.json
GCS_BUCKET_NAME=provabook-documents
GCS_PROJECT_ID=your-gcp-project-id
```

### 1.4 Generate Secret Key
```python
# Run this in Python shell
from django.core.management.utils import get_random_secret_key
print(get_random_secret_key())
```

---

## 🗄️ Step 2: Database Setup

### 2.1 Create PostgreSQL Database
```bash
# Using psql
psql -U postgres
CREATE DATABASE provabook_django;
\q
```

### 2.2 Run Django Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 2.3 Create Superuser
```bash
python manage.py createsuperuser
# Follow prompts to create admin user
```

---

## ☁️ Step 3: Google Cloud Storage Setup

### 3.1 Create GCS Bucket
```bash
# Using gcloud CLI
gcloud storage buckets create gs://provabook-documents --location=us-central1

# Set bucket permissions (if needed for public access)
gcloud storage buckets add-iam-policy-binding gs://provabook-documents \
  --member=allUsers --role=roles/storage.objectViewer
```

### 3.2 Download Service Account Key
1. Go to Google Cloud Console
2. Navigate to IAM & Admin > Service Accounts
3. Create or select a service account
4. Click "Keys" > "Add Key" > "Create New Key"
5. Choose JSON format
6. Save the JSON file to a secure location
7. Update `GOOGLE_APPLICATION_CREDENTIALS` in `.env`

---

## 📦 Step 4: Data Migration from Supabase

### 4.1 Export Data from Supabase

**Option A: Using pg_dump (Recommended)**
```bash
pg_dump -h db.xxxxx.supabase.co -U postgres -d postgres \
  -t user_profiles \
  -t orders \
  -t samples \
  -t proforma_invoices \
  -t letters_of_credit \
  -t incidents \
  -t shipments \
  -t documents \
  -t production_metrics \
  -t notifications \
  -t audit_logs \
  --data-only --column-inserts > supabase_data.sql
```

**Option B: Using Supabase Dashboard**
1. Go to Supabase Dashboard
2. Navigate to Table Editor
3. Export each table as CSV
4. Use Django management command to import CSVs

### 4.2 Transform and Import Data

**Important Considerations:**
- User passwords from Supabase Auth need to be reset or migrated
- UUIDs should remain the same for foreign key relationships
- Timestamps need to be in ISO format

**Create Migration Script:**
```bash
# Create a custom management command
python manage.py create_migration_command
```

Example migration script (create in `apps/core/management/commands/migrate_data.py`):

```python
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import csv
import uuid

User = get_user_model()

class Command(BaseCommand):
    help = 'Migrate data from Supabase export'

    def handle(self, *args, **options):
        # Migrate users
        with open('supabase_users.csv', 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                User.objects.create(
                    id=uuid.UUID(row['id']),
                    email=row['email'],
                    full_name=row['full_name'],
                    role=row['role'],
                    phone=row.get('phone'),
                    department=row.get('department'),
                    is_active=row.get('is_active', True),
                    created_at=row['created_at'],
                    updated_at=row['updated_at'],
                )
        
        self.stdout.write(self.style.SUCCESS('Successfully migrated users'))
        
        # Add similar logic for other tables
```

### 4.3 Reset User Passwords
```bash
# Users will need to reset passwords after migration
python manage.py send_password_reset_emails
```

---

## 🧪 Step 5: Testing the Backend

### 5.1 Run Development Server
```bash
python manage.py runserver 0.0.0.0:8000
```

### 5.2 Test API Endpoints

**Test Authentication:**
```bash
# Register
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","password_confirm":"testpass123","full_name":"Test User"}'

# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'

# Get Profile (use access token from login)
curl -X GET http://localhost:8000/api/v1/auth/profile \
  -H "Authorization: Bearer <access_token>"
```

### 5.3 Access API Documentation
Open your browser and navigate to:
- Swagger UI: http://localhost:8000/api/docs/
- ReDoc: http://localhost:8000/api/redoc/

---

## 🔄 Step 6: Frontend Integration

### 6.1 Update Frontend API Base URL

**File: `frontend/src/lib/api.ts` (or similar)**
```typescript
// Change from
const API_BASE_URL = 'http://localhost:3000/api/v1';

// To
const API_BASE_URL = 'http://localhost:8000/api/v1';
```

### 6.2 Update Authentication Flow

**Before (NestJS/Supabase):**
```typescript
// Login returns Supabase session
const { data, error } = await supabase.auth.signInWithPassword({
  email, password
});
```

**After (Django/JWT):**
```typescript
// Login returns JWT tokens
const response = await api.post('/auth/login', { email, password });
const { tokens, user } = response.data;

// Store tokens
localStorage.setItem('access_token', tokens.access);
localStorage.setItem('refresh_token', tokens.refresh);

// Use in requests
axios.defaults.headers.common['Authorization'] = `Bearer ${tokens.access}`;
```

### 6.3 Test Frontend Connectivity
```bash
cd ..\frontend
npm run dev
```

Visit http://localhost:3001 and test:
- ✅ Login
- ✅ Registration
- ✅ Dashboard loads
- ✅ Orders CRUD operations
- ✅ File uploads

---

## 🚀 Step 7: Production Deployment

### 7.1 Prepare for Production

**Update `.env` for production:**
```env
DEBUG=False
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
SECRET_KEY=<generate-new-production-key>
DATABASE_URL=<production-database-url>
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com
```

**Collect Static Files:**
```bash
python manage.py collectstatic --noinput
```

### 7.2 Run with Gunicorn
```bash
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

### 7.3 Set Up Nginx (Recommended)

**Create nginx configuration (`/etc/nginx/sites-available/provabook`):**
```nginx
server {
    listen 80;
    server_name api.your-domain.com;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        alias /path/to/backend_django/staticfiles/;
    }

    location /media/ {
        alias /path/to/backend_django/media/;
    }
}
```

Enable and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/provabook /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7.4 Set Up Systemd Service

**Create service file (`/etc/systemd/system/provabook.service`):**
```ini
[Unit]
Description=Provabook Django Backend
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/path/to/backend_django
Environment="PATH=/path/to/backend_django/venv/bin"
ExecStart=/path/to/backend_django/venv/bin/gunicorn config.wsgi:application --bind 127.0.0.1:8000 --workers 4

[Install]
WantedBy=multi-user.target
```

Enable and start service:
```bash
sudo systemctl enable provabook
sudo systemctl start provabook
sudo systemctl status provabook
```

---

## 📊 Step 8: Verification Checklist

### Backend Verification
- [ ] Django server runs without errors
- [ ] Database migrations applied successfully
- [ ] Admin panel accessible at `/admin/`
- [ ] API documentation accessible at `/api/docs/`
- [ ] JWT authentication works
- [ ] All API endpoints respond correctly
- [ ] File uploads work with GCS
- [ ] CORS configured correctly

### Frontend Verification
- [ ] Frontend connects to Django backend
- [ ] Login/Logout works
- [ ] User registration works
- [ ] Dashboard data loads
- [ ] Orders CRUD operations work
- [ ] Financials (PI/LC) work
- [ ] Samples tracking works
- [ ] File uploads work
- [ ] No console errors

### Data Integrity
- [ ] All users migrated
- [ ] All orders preserved
- [ ] Related data (samples, PIs, LCs) intact
- [ ] File references correct
- [ ] Timestamps preserved

---

## 🐛 Troubleshooting

### Common Issues

**Issue: "ModuleNotFoundError: No module named 'apps'"**
```bash
# Ensure you're in the correct directory
cd E:\provabook-3\backend_django
python manage.py runserver
```

**Issue: "FATAL: database 'provabook_django' does not exist"**
```bash
createdb provabook_django
python manage.py migrate
```

**Issue: "google.auth.exceptions.DefaultCredentialsError"**
```bash
# Set environment variable
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/credentials.json"

# Or in .env file
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

**Issue: "CORS policy: No 'Access-Control-Allow-Origin' header"**
```python
# In settings.py, ensure:
CORS_ALLOWED_ORIGINS = ['http://localhost:3001']
CORS_ALLOW_CREDENTIALS = True
```

**Issue: "Forbidden (CSRF token missing)"**
```python
# For API-only backend, disable CSRF for API endpoints
# Or ensure frontend sends CSRF token in requests
```

---

## 📈 Performance Optimization

### Database Optimization
```python
# Use select_related and prefetch_related
Order.objects.select_related('merchandiser').prefetch_related('samples')

# Add database indexes
class Order(models.Model):
    class Meta:
        indexes = [
            models.Index(fields=['order_number']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]
```

### Caching
```python
# Install Redis
pip install django-redis

# In settings.py
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    }
}

# Use caching
from django.core.cache import cache
cache.set('key', 'value', 300)  # 5 minutes
```

---

## 📝 Next Steps

1. ✅ Complete remaining Django apps (Orders, Samples, Financials, etc.)
2. ✅ Implement file upload endpoints with GCS
3. ✅ Write comprehensive tests
4. ✅ Set up CI/CD pipeline
5. ✅ Configure monitoring and logging
6. ✅ Performance testing
7. ✅ Security audit
8. ✅ Deploy to production

---

## 📞 Support

If you encounter issues:
1. Check Django logs: `backend_django/logs/django.log`
2. Check database logs
3. Review API documentation: http://localhost:8000/api/docs/
4. Test endpoints with Postman or curl
5. Review Django debug toolbar (in DEBUG mode)

---

## ✅ Success Criteria

- Frontend works identically with no code changes (except API URL)
- All existing features functional
- Better performance than NestJS version
- Clean, maintainable Django code
- Comprehensive API documentation
- Production-ready deployment

**Congratulations! Your Django backend is now set up and ready for migration! 🎉**
