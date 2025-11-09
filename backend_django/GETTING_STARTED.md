# 🚀 Getting Started - Quick Checklist

**Follow this checklist to get your Django backend running in 30 minutes!**

---

## ☑️ Pre-flight Checklist

### System Requirements
- [ ] Windows 10/11 (or Linux/Mac)
- [ ] Python 3.11+ installed
- [ ] PostgreSQL 14+ installed
- [ ] Git installed
- [ ] Code editor (VS Code recommended)

### Accounts Needed
- [ ] Google Cloud Platform account (for GCS)
- [ ] PostgreSQL database (local or hosted)

---

## 📝 Step-by-Step Setup

### Step 1: Environment Setup (5 minutes)

```bash
# Navigate to backend directory
cd E:\provabook-3\backend_django

# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

**Checkpoint**: Run `pip list` - you should see Django, DRF, and other packages

---

### Step 2: Environment Configuration (5 minutes)

```bash
# Copy example environment file
copy .env.example .env  # Windows
# cp .env.example .env  # Linux/Mac

# Open .env in your editor
notepad .env  # Windows
# nano .env  # Linux
```

**Edit these critical variables:**
```env
SECRET_KEY=<generate-a-long-random-string>
DEBUG=True
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/provabook_django
CORS_ALLOWED_ORIGINS=http://localhost:3001
```

**Generate SECRET_KEY:**
```python
# Run in Python shell
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

**Checkpoint**: Your .env file should have SECRET_KEY and DATABASE_URL set

---

### Step 3: Database Setup (5 minutes)

```bash
# Create PostgreSQL database
createdb provabook_django

# Or using psql:
psql -U postgres
CREATE DATABASE provabook_django;
\q
```

**Run migrations:**
```bash
python manage.py makemigrations
python manage.py migrate
```

**Create admin user:**
```bash
python manage.py createsuperuser
# Enter email: admin@provabook.com
# Enter full name: Admin User
# Enter password: (your secure password)
```

**Checkpoint**: Run `python manage.py dbshell` - you should connect to the database

---

### Step 4: Verify Setup (2 minutes)

```bash
# Run verification script
python scripts/verify_setup.py
```

**All checks should pass!** If not, follow the suggestions.

---

### Step 5: Start Development Server (1 minute)

```bash
# Run the server
python manage.py runserver 0.0.0.0:8000
```

**You should see:**
```
Django version 5.0.1, using settings 'config.settings'
Starting development server at http://0.0.0.0:8000/
Quit the server with CTRL-BREAK.
```

**Checkpoint**: Server running without errors

---

### Step 6: Test API (5 minutes)

**Open your browser and visit:**

1. **Swagger API Docs**
   ```
   http://localhost:8000/api/docs/
   ```
   You should see interactive API documentation

2. **Django Admin**
   ```
   http://localhost:8000/admin/
   ```
   Login with superuser credentials

3. **Test Authentication Endpoint**
   ```bash
   # Using curl (Windows CMD)
   curl -X POST http://localhost:8000/api/v1/auth/login ^
     -H "Content-Type: application/json" ^
     -d "{\"email\":\"admin@provabook.com\",\"password\":\"your_password\"}"
   
   # Using curl (PowerShell)
   curl -X POST http://localhost:8000/api/v1/auth/login `
     -H "Content-Type: application/json" `
     -d '{\"email\":\"admin@provabook.com\",\"password\":\"your_password\"}'
   ```

**You should receive:**
```json
{
  "user": {
    "id": "...",
    "email": "admin@provabook.com",
    "full_name": "Admin User",
    "role": "admin"
  },
  "tokens": {
    "refresh": "...",
    "access": "..."
  },
  "message": "Login successful"
}
```

**Checkpoint**: Authentication working!

---

### Step 7: Google Cloud Storage Setup (Optional - 10 minutes)

**Only needed if you want file uploads:**

1. **Create GCS Bucket**
   ```bash
   # Using gcloud CLI
   gcloud storage buckets create gs://provabook-documents --location=us-central1
   ```

2. **Download Service Account Key**
   - Go to Google Cloud Console
   - IAM & Admin > Service Accounts
   - Create or select service account
   - Keys > Add Key > Create New Key (JSON)
   - Save JSON file

3. **Update .env**
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\your-credentials.json
   GCS_BUCKET_NAME=provabook-documents
   GCS_PROJECT_ID=your-project-id
   ```

**Checkpoint**: File upload utilities ready (test later)

---

## ✅ Success Checklist

Verify everything works:

- [ ] Virtual environment activated
- [ ] Dependencies installed (`pip list` shows Django, DRF, etc.)
- [ ] `.env` file configured
- [ ] Database created and connected
- [ ] Migrations applied (`python manage.py showmigrations`)
- [ ] Superuser created
- [ ] Server runs without errors
- [ ] Can access http://localhost:8000/api/docs/
- [ ] Can login via API
- [ ] JWT tokens received
- [ ] Admin panel accessible

---

## 🔧 Troubleshooting Common Issues

### Issue: "Module not found"
**Fix:**
```bash
# Ensure virtual environment is activated
venv\Scripts\activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Issue: "Database does not exist"
**Fix:**
```bash
createdb provabook_django
python manage.py migrate
```

### Issue: "django.core.exceptions.ImproperlyConfigured"
**Fix:**
- Check `.env` file exists
- Verify `SECRET_KEY` is set
- Verify `DATABASE_URL` is correct

### Issue: "CORS error" (when testing with frontend)
**Fix:**
- Update `CORS_ALLOWED_ORIGINS` in `.env`
- Include your frontend URL: `http://localhost:3001`

### Issue: "Permission denied" (PostgreSQL)
**Fix:**
```bash
# Check PostgreSQL is running
# Windows: services.msc > PostgreSQL
# Linux: sudo systemctl status postgresql

# Verify credentials in .env
DATABASE_URL=postgresql://postgres:correct_password@localhost:5432/provabook_django
```

---

## 🎯 What's Next?

### Option 1: Test with Frontend (Recommended)
```bash
# Update frontend API URL
# File: frontend/src/lib/api.ts
const API_BASE_URL = 'http://localhost:8000/api/v1';

# Start frontend
cd ..\frontend
npm run dev

# Test:
# 1. Login at http://localhost:3001
# 2. Check dashboard loads
# 3. Authentication works!
```

### Option 2: Implement Remaining Apps
```bash
# Generate app structure
python scripts/generate_app_scaffolding.py orders

# Follow the TODO comments in generated files
# Implement models, serializers, views
# Test endpoints
```

### Option 3: Migrate Data from Supabase
```bash
# Export from Supabase
pg_dump -h db.xxxxx.supabase.co -U postgres ...

# Import to Django
# Create custom migration command
# Follow: SETUP_AND_MIGRATION_GUIDE.md
```

---

## 📚 Documentation Reference

When you need more details:

1. **BACKEND_MIGRATION_SUMMARY.md** - Executive overview
2. **SETUP_AND_MIGRATION_GUIDE.md** - Detailed instructions
3. **MIGRATION_LOG.md** - What's done and what's left
4. **DJANGO_MIGRATION_PLAN.md** - Complete migration strategy
5. **README.md** - Quick reference

---

## 🎉 Congratulations!

**If you made it here, your Django backend is up and running!**

You now have:
✅ Working authentication system  
✅ JWT tokens  
✅ API documentation  
✅ Admin panel  
✅ Production-ready foundation  

---

## 📞 Need Help?

### Check These First
1. Verify all checkboxes above are completed
2. Run `python scripts/verify_setup.py`
3. Check logs: `logs/django.log`
4. Review error messages carefully

### Common Solutions
- Missing package? → `pip install <package>`
- Database error? → Check `DATABASE_URL` in `.env`
- Import error? → Ensure virtual environment activated
- CORS error? → Check `CORS_ALLOWED_ORIGINS`

### Documentation
- Django: https://docs.djangoproject.com/
- DRF: https://www.django-rest-framework.org/
- JWT: https://django-rest-framework-simplejwt.readthedocs.io/

---

**Time to complete this checklist: ~30 minutes**  
**Difficulty: Beginner-friendly**  

**Happy coding! 🚀**
