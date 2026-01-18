# 🏢 Provabook - Office Computer Setup Guide

**Last Updated:** January 2025  
**Project:** Textile Operations Management Platform  
**Backend:** Django + PostgreSQL  
**Status:** Ready for Multi-Location Development

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Database Strategy](#database-strategy)
4. [Step-by-Step Setup](#step-by-step-setup)
5. [Git Configuration](#git-configuration)
6. [Development Workflow](#development-workflow)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## 🎯 Overview

### What You Have
- ✅ Django backend (35% complete with Auth + Orders)
- ✅ Local PostgreSQL database on home computer
- ✅ Frontend (Next.js)
- ✅ Project in Git repository

### What You Need
Set up the same development environment on your office computer so you can:
- Continue development seamlessly
- Test features locally
- Sync changes via Git
- Eventually deploy to a production server

---

## 📦 Prerequisites

### Software to Install on Office Computer

#### 1. Python 3.11+
- Download: https://www.python.org/downloads/
- **IMPORTANT:** Check "Add Python to PATH" during installation
- Verify: `python --version`

#### 2. PostgreSQL 15+
- Download: https://www.postgresql.org/download/windows/
- **IMPORTANT:** Remember the password you set for `postgres` user
- Default port: 5432
- Verify: `psql --version`

#### 3. Git
- Download: https://git-scm.com/download/win
- Use default settings during installation
- Verify: `git --version`

#### 4. VS Code (Recommended)
- Download: https://code.visualstudio.com/
- Extensions to install:
  - Python
  - Django
  - PostgreSQL

---

## 🗄️ Database Strategy

You have **3 options** for database setup:

### Option 1: Independent Local Database (RECOMMENDED)
**Best for:** Active development on both computers

**Setup:**
- Home computer: PostgreSQL with local database
- Office computer: PostgreSQL with separate local database
- Each database is independent
- Use Git to sync code changes only

**Pros:**
- ✅ No conflicts
- ✅ Work offline
- ✅ Fast local development
- ✅ Can test different database states

**Cons:**
- ❌ Data not synced between locations
- ❌ Need to recreate test data on each computer

**When to use:** You're still developing features and don't need the same data everywhere.

---

### Option 2: Remote PostgreSQL Database (For Later)
**Best for:** Production-like environment

**Setup:**
- Buy cheap VPS (DigitalOcean, Linode, AWS)
- Install PostgreSQL on VPS
- Both computers connect to same database

**Pros:**
- ✅ Single source of truth
- ✅ Same data everywhere
- ✅ Prepares you for production

**Cons:**
- ❌ Requires internet connection
- ❌ Costs money (~$5-10/month)
- ❌ Slower than local database

**When to use:** When you start deploying to staging/production.

---

### Option 3: Export/Import Data (Hybrid)
**Best for:** Need specific test data on office computer

**Setup:**
- Use local databases on both computers
- Export data from home computer when needed
- Import to office computer

**Pros:**
- ✅ Local development speed
- ✅ Can sync specific data when needed
- ✅ No monthly costs

**Cons:**
- ❌ Manual export/import process
- ❌ Data can get out of sync

**When to use:** When you need to test with real data but don't want a remote database yet.

---

## 🚀 Step-by-Step Setup (Option 1: Local Database)

### Step 1: Clone Project from Git

```powershell
# Navigate to where you want the project
cd f:\

# Clone the repository (if using Git hosting)
git clone <your-repository-url> "provabook django"

# OR copy the folder from USB/network drive
```

**If you haven't pushed to Git yet:**
```powershell
# On home computer, initialize Git and push
cd "f:\provabook django\provabook-3"
git init
git add .
git commit -m "Initial commit - Django migration started"

# Push to GitHub/GitLab/Bitbucket
git remote add origin <your-repo-url>
git push -u origin main
```

---

### Step 2: Install PostgreSQL

1. **Install PostgreSQL:**
   - Run the installer
   - Set password for `postgres` user (e.g., `admin123`)
   - Port: `5432` (default)
   - Locale: Default

2. **Verify Installation:**
   ```powershell
   # Open PowerShell as Administrator
   psql --version
   ```

3. **Create Database:**
   ```powershell
   # Connect to PostgreSQL
   psql -U postgres
   
   # In psql shell, create database
   CREATE DATABASE provabook_django;
   
   # Create user (optional, or use postgres user)
   CREATE USER provabook_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE provabook_django TO provabook_user;
   
   # Exit
   \q
   ```

---

### Step 3: Setup Python Virtual Environment

```powershell
# Navigate to Django backend folder
cd "f:\provabook django\provabook-3\backend_django"

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate

# You should see (venv) in your prompt
```

**Important:** Always activate the virtual environment before working!

---

### Step 4: Install Python Dependencies

```powershell
# Make sure venv is activated
pip install --upgrade pip

# Install all requirements
pip install -r requirements.txt

# This will install:
# - Django 5.0.1
# - Django REST Framework
# - PostgreSQL driver (psycopg2)
# - JWT authentication
# - Google Cloud Storage client
# - And more...
```

---

### Step 5: Configure Environment Variables

```powershell
# Copy example env file
copy .env.example .env

# Open .env in notepad or VS Code
notepad .env
```

**Edit .env with your settings:**

```env
# Django Configuration
SECRET_KEY=your-unique-secret-key-here-change-this-123456789
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# Database Configuration (UPDATE THIS)
# Use the postgres user and password you set during installation
DATABASE_URL=postgresql://postgres:admin123@localhost:5432/provabook_django

# JWT Configuration
ACCESS_TOKEN_LIFETIME_MINUTES=60
REFRESH_TOKEN_LIFETIME_MINUTES=1440

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3001,http://127.0.0.1:3001

# Google Cloud Storage (Leave as-is for now, optional)
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-gcs-credentials.json
# GCS_BUCKET_NAME=provabook-documents
# GCS_PROJECT_ID=your-gcp-project-id

# File Upload Settings
MAX_UPLOAD_SIZE=10485760
ALLOWED_FILE_EXTENSIONS=.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx

# API Settings
API_VERSION=v1
API_PREFIX=api
```

**Generate a SECRET_KEY:**
```powershell
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

---

### Step 6: Run Database Migrations

```powershell
# Make sure you're in backend_django folder with venv activated

# Apply all migrations
python manage.py migrate

# You should see:
# Running migrations:
#   Applying contenttypes.0001_initial... OK
#   Applying authentication.0001_initial... OK
#   Applying orders.0001_initial... OK
#   ... etc
```

---

### Step 7: Create Superuser

```powershell
# Create admin account for Django admin panel
python manage.py createsuperuser

# Enter:
# Email: admin@provabook.com
# Password: Admin@123
# Password (again): Admin@123
```

---

### Step 8: Start Django Server

```powershell
# Start development server
python manage.py runserver 0.0.0.0:8000

# You should see:
# Django version 5.0.1, using settings 'config.settings'
# Starting development server at http://0.0.0.0:8000/
# Quit the server with CTRL-BREAK.
```

**Test the server:**
- API Docs: http://localhost:8000/api/docs/
- Admin Panel: http://localhost:8000/admin/
- API Endpoint: http://localhost:8000/api/v1/auth/login

---

### Step 9: Setup Frontend (if needed)

```powershell
# Open a NEW PowerShell window
cd "f:\provabook django\provabook-3\frontend"

# Install dependencies
npm install

# Copy environment file
copy .env.example .env.local

# Edit .env.local
notepad .env.local
```

**Update .env.local:**
```env
# Point to your local Django backend
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

**Start frontend:**
```powershell
npm run dev

# Frontend will run on http://localhost:3001
```

---

## 🔄 Git Configuration

### First Time Git Setup on Office Computer

```powershell
# Configure Git with your name and email
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Verify configuration
git config --list
```

---

### Daily Workflow Between Home and Office

#### **Before Leaving Home:**
```powershell
cd "f:\provabook django\provabook-3"

# Check what files changed
git status

# Stage all changes
git add .

# Commit changes
git commit -m "Added new feature X"

# Push to remote repository
git push origin main
```

#### **Arriving at Office:**
```powershell
cd "f:\provabook django\provabook-3"

# Get latest changes from home
git pull origin main

# Activate virtual environment
cd backend_django
.\venv\Scripts\Activate

# Install any new dependencies
pip install -r requirements.txt

# Run any new migrations
python manage.py migrate

# Start working!
python manage.py runserver
```

#### **Before Leaving Office:**
```powershell
# Same process - commit and push
git add .
git commit -m "Completed feature X tests"
git push origin main
```

---

## 📊 Data Management Between Computers

### Option A: Create Sample Data Script

**Create a Django management command:**

```python
# File: backend_django/apps/core/management/commands/create_sample_data.py

from django.core.management.base import BaseCommand
from apps.authentication.models import User
from apps.orders.models import Order

class Command(BaseCommand):
    help = 'Creates sample data for testing'

    def handle(self, *args, **options):
        # Create test users
        if not User.objects.filter(email='test@provabook.com').exists():
            User.objects.create_user(
                email='test@provabook.com',
                password='Test@123',
                full_name='Test User',
                role='merchandiser'
            )
        
        # Create test orders
        # Add your test data here
        
        self.stdout.write(self.style.SUCCESS('Sample data created!'))
```

**Run on any computer:**
```powershell
python manage.py create_sample_data
```

---

### Option B: Export/Import Database

**On Home Computer (Export):**
```powershell
# Export full database
pg_dump -U postgres -h localhost -d provabook_django -F c -f provabook_backup.dump

# OR export data only (no structure)
pg_dump -U postgres -h localhost -d provabook_django --data-only --column-inserts -f data.sql
```

**On Office Computer (Import):**
```powershell
# Import full database
pg_restore -U postgres -h localhost -d provabook_django -c provabook_backup.dump

# OR import data only
psql -U postgres -h localhost -d provabook_django -f data.sql
```

**Add to .gitignore:**
```
# Database dumps
*.dump
*.sql
backups/
```

---

## 🔧 Troubleshooting

### Issue 1: "psycopg2 install failed"

**Solution:**
```powershell
pip install psycopg2-binary==2.9.9
```

---

### Issue 2: "Port 8000 is already in use"

**Solution:**
```powershell
# Find and kill process using port 8000
netstat -ano | findstr :8000
taskkill /PID <process_id> /F

# OR use a different port
python manage.py runserver 0.0.0.0:8001
```

---

### Issue 3: "Connection to database failed"

**Check:**
1. PostgreSQL service is running:
   ```powershell
   # Open Services (services.msc)
   # Look for "postgresql-x64-15" and ensure it's running
   ```

2. Database exists:
   ```powershell
   psql -U postgres -l  # List all databases
   ```

3. Database URL in .env is correct:
   ```env
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/provabook_django
   ```

---

### Issue 4: "Module not found"

**Solution:**
```powershell
# Make sure virtual environment is activated
.\venv\Scripts\Activate

# Reinstall requirements
pip install -r requirements.txt
```

---

### Issue 5: Git Conflicts

**If you get merge conflicts:**
```powershell
# See conflicted files
git status

# Option 1: Keep your version
git checkout --ours path/to/file

# Option 2: Keep remote version
git checkout --theirs path/to/file

# Option 3: Manually resolve
# Edit the file, remove conflict markers (<<<<<<, ======, >>>>>>)
# Then:
git add path/to/file
git commit -m "Resolved merge conflict"
```

---

## 💡 Best Practices

### 1. Virtual Environment
✅ **ALWAYS** activate virtual environment before working:
```powershell
cd backend_django
.\venv\Scripts\Activate
```

### 2. Git Commits
✅ Commit frequently with clear messages:
```powershell
# Good commits:
git commit -m "Add order approval workflow"
git commit -m "Fix date filter in orders API"
git commit -m "Update order serializer with new fields"

# Bad commits:
git commit -m "changes"
git commit -m "fixed stuff"
```

### 3. Database Migrations
✅ Always run migrations after pulling code:
```powershell
git pull
python manage.py migrate
```

✅ Create migrations when you change models:
```powershell
python manage.py makemigrations
python manage.py migrate
git add apps/*/migrations/
git commit -m "Add migrations for X"
```

### 4. Environment Variables
✅ Never commit .env file:
```powershell
# It's already in .gitignore
```

✅ Update .env.example when adding new variables:
```powershell
# Edit .env.example, then commit it
git add .env.example
git commit -m "Add new environment variable X"
```

### 5. Testing Before Pushing
✅ Always test before pushing:
```powershell
# Run server and test
python manage.py runserver

# Check for errors
python manage.py check

# Run tests (when you have them)
python manage.py test
```

---

## 📋 Quick Reference Checklist

### Daily Startup (Office)
- [ ] Open PowerShell/Terminal
- [ ] Navigate to project folder
- [ ] Pull latest changes: `git pull`
- [ ] Activate virtual environment: `.\venv\Scripts\Activate`
- [ ] Install dependencies: `pip install -r requirements.txt`
- [ ] Run migrations: `python manage.py migrate`
- [ ] Start server: `python manage.py runserver`
- [ ] Start frontend (if needed): `npm run dev`

### Daily Shutdown (Before Leaving)
- [ ] Stop all servers (Ctrl+C)
- [ ] Check changes: `git status`
- [ ] Stage changes: `git add .`
- [ ] Commit: `git commit -m "Your message"`
- [ ] Push: `git push origin main`
- [ ] Deactivate venv: `deactivate`

### Weekly Maintenance
- [ ] Update dependencies: `pip list --outdated`
- [ ] Clean up database: Remove test data
- [ ] Review git log: `git log --oneline`
- [ ] Backup database: Create weekly dumps

---

## 🚀 Next Steps

### Immediate (Today)
1. ✅ Follow steps 1-8 to setup office computer
2. ✅ Test that server runs successfully
3. ✅ Login to admin panel (http://localhost:8000/admin/)
4. ✅ Test API endpoints (http://localhost:8000/api/docs/)

### This Week
1. ✅ Setup Git repository (GitHub/GitLab)
2. ✅ Complete at least one round of home→office→home sync
3. ✅ Create sample data script for testing
4. ✅ Document any custom setup steps specific to your workflow

### Future (When Ready for Production)
1. ⏳ Buy VPS server (DigitalOcean, Linode, AWS)
2. ⏳ Setup remote PostgreSQL database
3. ⏳ Deploy Django backend to server
4. ⏳ Deploy Next.js frontend to Vercel
5. ⏳ Setup domain and SSL certificates
6. ⏳ Configure production environment variables

---

## 📞 Getting Help

### Documentation Files
1. **README.md** - High-level project overview (Django backend as the current stack, legacy backend optional).
2. **backend_django/README.md** - Django backend structure, features, and commands.
3. **backend_django/SETUP_AND_MIGRATION_GUIDE.md** - Full Django setup and optional migration from the old backend/database.
4. **backend/README.md** - Legacy NestJS backend quick start (for reference).
5. **frontend/README.md** - Next.js frontend quick start.
6. **This file** - Office/home computer setup and workflow.

### Useful Commands
```powershell
# Check Django version
python -m django --version

# Check installed packages
pip list

# Check database connections
python manage.py dbshell

# Create new app
python manage.py startapp appname

# Run Django shell
python manage.py shell

# Collect static files (for production)
python manage.py collectstatic
```

---

## ✅ Setup Verification

After completing setup, verify everything works:

### Test 1: Database Connection
```powershell
python manage.py dbshell
# Should connect to PostgreSQL
\dt  # List tables
\q   # Quit
```

### Test 2: API Endpoints
```powershell
# Start server
python manage.py runserver

# Open browser:
# 1. http://localhost:8000/api/docs/  ← Should show Swagger UI
# 2. http://localhost:8000/admin/     ← Should show Django admin
```

### Test 3: Authentication
```powershell
# Using curl or Postman, test login:
# POST http://localhost:8000/api/v1/auth/login
# Body: {"email": "admin@provabook.com", "password": "Admin@123"}
# Should return JWT tokens
```

### Test 4: Git Sync
```powershell
# Make a small change
echo "# Test" >> test.txt

# Commit and push
git add test.txt
git commit -m "Test commit from office"
git push origin main

# Should push successfully
```

---

**🎉 You're All Set!**

You now have a complete development environment on your office computer that mirrors your home setup. You can seamlessly switch between locations using Git, and continue building your Django backend.

**Happy Coding! 🚀**

---

**Need Help?** 
- Check the documentation files
- Review Django docs: https://docs.djangoproject.com/
- Check DRF docs: https://www.django-rest-framework.org/

**Last Updated:** January 2025  
**Maintained by:** Provabook Development Team
