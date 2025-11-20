# Provabook Django Backend

🚀 **Django REST Framework backend for Provabook Textile Operations Management Platform**

---

## 📋 Table of Contents
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Features](#-features)
- [API Documentation](#-api-documentation)
- [Development](#-development)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Documentation](#-documentation)

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL 14+
- Google Cloud SDK (for storage)

### Installation

```bash
# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env with your settings

# Setup database
createdb provabook_django
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver 0.0.0.0:8000
```

### Test API
```bash
# Visit Swagger docs
http://localhost:8000/api/docs/

# Test authentication
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"your_password"}'
```

---

## 📁 Project Structure

```
backend_django/
├── config/                    # Django project settings
│   ├── settings.py           # Main configuration
│   ├── urls.py               # URL routing
│   └── wsgi.py               # WSGI application
│
├── apps/                     # Django applications
│   ├── core/                 # Shared utilities
│   ├── authentication/       # User auth & management ✅
│   ├── orders/               # Order management ⏳
│   ├── samples/              # Sample tracking ⏳
│   ├── financials/           # PI & LC management ⏳
│   ├── production/           # Production metrics ⏳
│   ├── incidents/            # Incident management ⏳
│   ├── shipments/            # Shipment tracking ⏳
│   ├── notifications/        # Notifications ⏳
│   ├── documents/            # Document management ⏳
│   └── dashboard/            # Dashboard stats ⏳
│
├── scripts/                  # Utility scripts
│   └── generate_app_scaffolding.py
│
├── logs/                     # Application logs
├── staticfiles/              # Collected static files
├── media/                    # User uploaded files
├── requirements.txt          # Python dependencies
└── manage.py                 # Django CLI
```

---

## ✨ Features

### Completed ✅
- ✅ Django 5.0 with REST Framework
- ✅ JWT Authentication (djangorestframework-simplejwt)
- ✅ Custom User model (email-based auth)
- ✅ Role-based permissions (Admin, Manager, Merchandiser)
- ✅ Google Cloud Storage integration
- ✅ Swagger/OpenAPI documentation
- ✅ CORS configuration
- ✅ PostgreSQL database
- ✅ Custom exception handling
- ✅ Logging configuration
- ✅ File upload utilities
- ✅ Production-ready settings
- ✅ Orders module v1 (core CRUD, role-based access, filters, and API docs)

### In Progress ⏳
- ⏳ Samples module
- ⏳ Financials module
- ⏳ Remaining domain modules (production, incidents, shipments, notifications, documents, dashboard)

---

## 📚 API Documentation

### Base URL
```
Development: http://localhost:8000/api/v1
Production: https://api.your-domain.com/api/v1
```

### Authentication Endpoints
```
POST   /api/v1/auth/register          Register new user
POST   /api/v1/auth/login             Login (returns JWT tokens)
POST   /api/v1/auth/logout            Logout
POST   /api/v1/auth/refresh           Refresh access token
GET    /api/v1/auth/profile           Get current user profile
PATCH  /api/v1/auth/profile/update    Update profile
POST   /api/v1/auth/change-password   Change password
GET    /api/v1/auth/users             List users (role-based)
```

### Interactive Documentation
- **Swagger UI**: http://localhost:8000/api/docs/
- **ReDoc**: http://localhost:8000/api/redoc/

---

## 🛠️ Development

### Create New App
```bash
# Use the scaffolding script
python scripts/generate_app_scaffolding.py <app_name>

# Example
python scripts/generate_app_scaffolding.py orders
```

### Database Migrations
```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# View SQL
python manage.py sqlmigrate <app> <migration_number>

# Reset migrations (careful!)
python manage.py migrate <app> zero
```

### Django Shell
```bash
# Interactive Python shell with Django context
python manage.py shell

# Example usage
from apps.authentication.models import User
users = User.objects.all()
```

### Admin Panel
```bash
# Create superuser
python manage.py createsuperuser

# Access admin
http://localhost:8000/admin/
```

---

## 🧪 Testing

### Run Tests
```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test apps.authentication

# Run with coverage
pip install coverage
coverage run --source='.' manage.py test
coverage report
coverage html  # Generate HTML report
```

### Manual API Testing
```bash
# Use curl
curl -X GET http://localhost:8000/api/v1/auth/profile \
  -H "Authorization: Bearer <access_token>"

# Use httpie (install: pip install httpie)
http GET http://localhost:8000/api/v1/auth/profile \
  Authorization:"Bearer <access_token>"
```

---

## 🚀 Deployment

### Collect Static Files
```bash
python manage.py collectstatic --noinput
```

### Run with Gunicorn
```bash
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

### Environment Variables (Production)
```env
DEBUG=False
SECRET_KEY=<generate-new-key>
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
DATABASE_URL=postgresql://user:pass@host:5432/dbname
CORS_ALLOWED_ORIGINS=https://your-frontend.com
```

### Systemd Service
```bash
# Create service file
sudo nano /etc/systemd/system/provabook.service

# Start service
sudo systemctl start provabook
sudo systemctl enable provabook
sudo systemctl status provabook
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name api.your-domain.com;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 📖 Documentation

### Available Docs
- **SETUP_AND_MIGRATION_GUIDE.md** - Full Django setup and migration walkthrough.
- **../README.md** - Root project overview (legacy stack + Django migration).
- **../OFFICE_SETUP_GUIDE.md** - Beginner-friendly environment setup and Git workflow.
- **requirements.txt** - Python dependencies
- **.env.example** - Environment variables template

### Code Documentation
All code includes:
- Docstrings for classes and functions
- Inline comments for complex logic
- Type hints where applicable

---

## 🔐 Security

### Best Practices Implemented
- ✅ HTTPS only in production
- ✅ Secret key from environment variable
- ✅ JWT token authentication
- ✅ Password hashing (PBKDF2)
- ✅ CORS properly configured
- ✅ SQL injection protection (Django ORM)
- ✅ XSS protection
- ✅ CSRF protection
- ✅ Rate limiting (add if needed)

### Security Checklist
- [ ] Change default SECRET_KEY
- [ ] Set DEBUG=False in production
- [ ] Use HTTPS
- [ ] Rotate JWT secrets regularly
- [ ] Enable database backups
- [ ] Set up monitoring
- [ ] Configure firewall
- [ ] Regular security updates

---

## 🤝 Contributing

### Code Style
- Follow PEP 8
- Use Black for formatting
- Use type hints
- Write docstrings
- Add tests for new features

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "Add your feature"

# Push to remote
git push origin feature/your-feature
```

---

## 📞 Support

### Getting Help
1. Check logs: `logs/django.log`
2. Review documentation
3. Check API docs: http://localhost:8000/api/docs/
4. Search Django docs: https://docs.djangoproject.com/

### Common Issues

**Issue: Module not found**
```bash
# Ensure virtual environment is activated
venv\Scripts\activate

# Reinstall dependencies
pip install -r requirements.txt
```

**Issue: Database connection error**
```bash
# Check PostgreSQL is running
# Verify DATABASE_URL in .env
createdb provabook_django
```

**Issue: CORS error**
```python
# Verify CORS_ALLOWED_ORIGINS in settings.py
CORS_ALLOWED_ORIGINS = ['http://localhost:3001']
```

---

## 📊 Status

**Current Status:** Foundation Complete ✅  
**Next Phase:** Implement Remaining Apps ⏳  
**Completion:** ~20%

---

## 📝 License

Proprietary - Provabook 2025

---

## 🎯 Roadmap

- [x] Project setup
- [x] Authentication system
- [x] Core utilities
- [ ] Orders module
- [ ] Samples module
- [ ] Financials module
- [ ] Production module
- [ ] Incidents module
- [ ] Shipments module
- [ ] Notifications module
- [ ] Documents module
- [ ] Dashboard module
- [ ] Data migration
- [ ] Tests
- [ ] Production deployment

---

**Happy Coding! 🚀**
