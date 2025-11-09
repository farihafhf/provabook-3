# ⚡ Django Backend - Quick Reference Card

**Quick commands and essential info for daily development**

---

## 🚀 Common Commands

### Start Development
```bash
cd E:\provabook-3\backend_django
venv\Scripts\activate
python manage.py runserver 0.0.0.0:8000
```

### Database Operations
```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Reset specific app
python manage.py migrate app_name zero
python manage.py migrate app_name

# Show migrations
python manage.py showmigrations

# SQL preview
python manage.py sqlmigrate app_name migration_number
```

### User Management
```bash
# Create superuser
python manage.py createsuperuser

# Change password
python manage.py changepassword username
```

### Shell Access
```bash
# Django shell
python manage.py shell

# Example usage
from apps.orders.models import Order
from apps.authentication.models import User
orders = Order.objects.all()
```

### Generate New App
```bash
python scripts/generate_app_scaffolding.py app_name
```

### Verify Setup
```bash
python scripts/verify_setup.py
```

---

## 📡 API Endpoints

### Base URL
```
http://localhost:8000/api/v1
```

### Authentication
```
POST   /auth/register          - Register user
POST   /auth/login             - Login (get tokens)
POST   /auth/logout            - Logout
POST   /auth/refresh           - Refresh token
GET    /auth/profile           - Get profile
PATCH  /auth/profile/update    - Update profile
POST   /auth/change-password   - Change password
GET    /auth/users             - List users
```

### Orders
```
GET    /orders/                - List orders
POST   /orders/                - Create order
GET    /orders/{id}/           - Get order
PATCH  /orders/{id}/           - Update order
DELETE /orders/{id}/           - Delete order
GET    /orders/stats/          - Get statistics
PATCH  /orders/{id}/approvals/ - Update approval
POST   /orders/{id}/change-stage/ - Change stage
```

### Documentation
```
GET    /api/docs/              - Swagger UI
GET    /api/redoc/             - ReDoc
GET    /admin/                 - Django Admin
```

---

## 🔐 Authentication

### Get Access Token
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Use Token
```bash
curl -X GET http://localhost:8000/api/v1/orders/ \
  -H "Authorization: Bearer <access_token>"
```

### Token Lifespan
- Access Token: 60 minutes
- Refresh Token: 24 hours

---

## 🗄️ Database

### Connection String Format
```
postgresql://USER:PASSWORD@HOST:PORT/DBNAME
```

### Example .env
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/provabook_django
```

### Common PostgreSQL Commands
```bash
# List databases
psql -U postgres -l

# Connect to database
psql -U postgres provabook_django

# Common psql commands
\dt              # List tables
\d table_name    # Describe table
\q               # Quit
```

---

## 📁 Project Structure

```
backend_django/
├── config/          # Settings
├── apps/
│   ├── authentication/  ✅ Auth
│   ├── orders/          ✅ Orders
│   └── [others]/        ⏳ Pending
├── manage.py        # Django CLI
├── requirements.txt # Dependencies
└── .env            # Environment
```

---

## 🔧 Common Tasks

### Add New Field to Model
```python
# 1. Edit models.py
new_field = models.CharField(max_length=100, blank=True)

# 2. Create migration
python manage.py makemigrations

# 3. Apply migration
python manage.py migrate
```

### Create Custom Management Command
```bash
# Create directory
mkdir -p apps/orders/management/commands

# Create command file
# apps/orders/management/commands/import_orders.py
```

### Testing Single Endpoint
```bash
# Using httpie (install: pip install httpie)
http POST http://localhost:8000/api/v1/auth/login \
  email=admin@test.com password=test123

# Using curl
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"test123"}'
```

---

## 🐛 Troubleshooting

### ModuleNotFoundError
```bash
# Ensure venv is activated
venv\Scripts\activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Database Connection Error
```bash
# Check PostgreSQL running
# Verify .env DATABASE_URL
# Test connection:
psql -U postgres
```

### Migration Conflicts
```bash
# Show migrations
python manage.py showmigrations

# Fake migration if needed
python manage.py migrate --fake app_name migration_number
```

### CORS Error
```python
# In settings.py, update:
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3001',
    # Add your frontend URL
]
```

### Import Errors
```python
# Always use absolute imports
from apps.orders.models import Order  # ✅ Good
from .models import Order              # ⚠️ Use in same app only
```

---

## 📝 Code Snippets

### Create Order via Shell
```python
from apps.orders.models import Order
from apps.authentication.models import User

user = User.objects.first()
Order.objects.create(
    customer_name="Test Customer",
    fabric_type="Cotton",
    quantity=1000,
    unit="meters",
    merchandiser=user
)
```

### Query Orders
```python
from apps.orders.models import Order

# All orders
Order.objects.all()

# Filter by status
Order.objects.filter(status='running')

# With merchandiser
Order.objects.select_related('merchandiser').all()

# Count by status
Order.objects.filter(status='completed').count()
```

### Create User
```python
from apps.authentication.models import User

User.objects.create_user(
    email='test@example.com',
    password='password123',
    full_name='Test User',
    role='merchandiser'
)
```

---

## 🌐 Environment Variables

### Required
```env
SECRET_KEY=<generate-random-key>
DATABASE_URL=postgresql://...
```

### Optional
```env
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3001
GOOGLE_APPLICATION_CREDENTIALS=/path/to/creds.json
GCS_BUCKET_NAME=provabook-documents
```

### Generate Secret Key
```python
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

---

## 🎨 Role Permissions

| Role | Can See | Can Do |
|------|---------|--------|
| **Merchandiser** | Own orders only | Create, Update, Delete own |
| **Manager** | All orders | Full access |
| **Admin** | All orders | Full access + User management |

---

## 📊 Quick Stats

```python
from apps.orders.models import Order
from django.db.models import Count, Sum

# Count by status
Order.objects.values('status').annotate(count=Count('id'))

# Total value
Order.objects.aggregate(total=Sum('prova_price'))

# Orders by merchandiser
Order.objects.values('merchandiser__full_name').annotate(count=Count('id'))
```

---

## 🔄 Git Workflow

```bash
# Check status
git status

# Add files
git add .

# Commit
git commit -m "Add orders module"

# Push
git push origin main
```

---

## 📚 Documentation Links

| Document | Purpose |
|----------|---------|
| GETTING_STARTED.md | 30-min setup guide |
| README.md | Project overview |
| ORDERS_APP_COMPLETE.md | Orders reference |
| DJANGO_MIGRATION_COMPLETE_SUMMARY.md | Complete summary |

---

## ⚙️ Settings Quick Reference

### Add New App
```python
# config/settings.py
INSTALLED_APPS = [
    # ...
    'apps.your_new_app',
]
```

### Add URLs
```python
# config/urls.py
urlpatterns = [
    # ...
    path('api/v1/your-app/', include('apps.your_app.urls')),
]
```

### Debug Mode
```python
# Development
DEBUG = True

# Production
DEBUG = False
```

---

## 🎯 Essential Files

| File | Location | Purpose |
|------|----------|---------|
| Settings | `config/settings.py` | Configuration |
| URLs | `config/urls.py` | Routing |
| Models | `apps/*/models.py` | Database |
| Views | `apps/*/views.py` | API logic |
| .env | `.env` | Environment |

---

## 💾 Backup & Restore

### Backup Database
```bash
pg_dump -U postgres provabook_django > backup.sql
```

### Restore Database
```bash
psql -U postgres provabook_django < backup.sql
```

---

## 🔍 Useful Django Commands

```bash
# Check for problems
python manage.py check

# List all commands
python manage.py help

# Create static files
python manage.py collectstatic

# Clear sessions
python manage.py clearsessions

# Test
python manage.py test

# Coverage
coverage run --source='.' manage.py test
coverage report
```

---

**Keep this card handy for quick reference! 📌**
