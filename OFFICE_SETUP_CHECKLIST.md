# ✅ Office Computer Setup Checklist

**Project:** Provabook Django Backend  
**Purpose:** Quick reference for setting up your office computer

---

## 📦 Software Installation Checklist

### Before You Start
- [ ] Have administrator access on office computer
- [ ] Have internet connection
- [ ] Have USB drive or network access to transfer project (if not using Git yet)
- [ ] Know your home database password (for reference)

---

## 1️⃣ Install Software (30 minutes)

### Python
- [ ] Download Python 3.11+ from python.org
- [ ] Run installer
- [ ] ✅ **CHECK**: "Add Python to PATH"
- [ ] Verify: Open PowerShell → Type `python --version`
- [ ] Should show: Python 3.11.x or higher

### PostgreSQL
- [ ] Download PostgreSQL 15+ from postgresql.org
- [ ] Run installer
- [ ] Set password for `postgres` user: _________________
- [ ] Port: 5432 (default)
- [ ] ✅ **WRITE DOWN PASSWORD** - You'll need it!
- [ ] Verify: Open PowerShell → Type `psql --version`

### Git
- [ ] Download Git from git-scm.com
- [ ] Run installer with default settings
- [ ] Verify: Open PowerShell → Type `git --version`
- [ ] Configure Git:
  ```powershell
  git config --global user.name "Your Name"
  git config --global user.email "your@email.com"
  ```

### VS Code (Optional but Recommended)
- [ ] Download from code.visualstudio.com
- [ ] Install these extensions:
  - [ ] Python
  - [ ] Django
  - [ ] PostgreSQL

---

## 2️⃣ Setup Project (15 minutes)

### Get Project Files
Option A: Using Git (Recommended)
- [ ] Clone repository: `git clone <your-repo-url>`

Option B: Manual Copy
- [ ] Copy entire project folder from USB/network drive
- [ ] Place in: `f:\provabook django\provabook-3\`

### Navigate to Project
```powershell
cd "f:\provabook django\provabook-3\backend_django"
```

---

## 3️⃣ Setup Database (10 minutes)

### Create Database
```powershell
# Open PowerShell as Administrator
psql -U postgres

# In psql:
CREATE DATABASE provabook_django;
\q
```

✅ Checklist:
- [ ] Database created successfully
- [ ] No errors shown
- [ ] You can reconnect: `psql -U postgres -d provabook_django`

---

## 4️⃣ Setup Python Environment (10 minutes)

### Create Virtual Environment
```powershell
cd "f:\provabook django\provabook-3\backend_django"
python -m venv venv
```

### Activate Virtual Environment
```powershell
.\venv\Scripts\Activate
```
- [ ] You see `(venv)` in your command prompt

### Install Dependencies
```powershell
pip install --upgrade pip
pip install -r requirements.txt
```
- [ ] No errors during installation
- [ ] All packages installed successfully

---

## 5️⃣ Configure Environment Variables (5 minutes)

### Create .env File
```powershell
copy .env.example .env
notepad .env
```

### Edit These Values
```env
# CHANGE THIS - Generate with:
# python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
SECRET_KEY=your-secret-key-here

# CHANGE THIS - Use your PostgreSQL password
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/provabook_django

# These are usually OK as-is
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
CORS_ALLOWED_ORIGINS=http://localhost:3001,http://127.0.0.1:3001
```

✅ Checklist:
- [ ] SECRET_KEY generated and set
- [ ] DATABASE_URL has correct password
- [ ] File saved

---

## 6️⃣ Initialize Database (5 minutes)

### Run Migrations
```powershell
python manage.py migrate
```
- [ ] Migrations completed without errors
- [ ] See "Applying..." messages for each migration

### Create Admin User
```powershell
python manage.py createsuperuser
```
- [ ] Email: `admin@provabook.com`
- [ ] Password: `Admin@123`
- [ ] Superuser created successfully

---

## 7️⃣ Start Server (2 minutes)

### Start Django Server
```powershell
python manage.py runserver 0.0.0.0:8000
```

✅ Checklist:
- [ ] Server starts without errors
- [ ] See "Starting development server at http://0.0.0.0:8000/"
- [ ] No red error messages

---

## 8️⃣ Test Everything (10 minutes)

### Test 1: API Documentation
- [ ] Open browser: http://localhost:8000/api/docs/
- [ ] Should see Swagger UI with API endpoints
- [ ] See authentication and orders endpoints

### Test 2: Admin Panel
- [ ] Open browser: http://localhost:8000/admin/
- [ ] Login with: admin@provabook.com / Admin@123
- [ ] Should see Django admin dashboard

### Test 3: API Endpoint
- [ ] Open browser: http://localhost:8000/api/v1/
- [ ] Should see API root with available endpoints

### Test 4: Database Connection
```powershell
# In another PowerShell window:
cd "f:\provabook django\provabook-3\backend_django"
.\venv\Scripts\Activate
python manage.py dbshell
# Type: \dt
# Should show list of database tables
# Type: \q to quit
```

✅ All Tests Passed:
- [ ] API docs load
- [ ] Admin panel works
- [ ] Can login to admin
- [ ] Database connection works

---

## 9️⃣ Setup Frontend (Optional - 10 minutes)

### Navigate to Frontend
```powershell
# Open NEW PowerShell window
cd "f:\provabook django\provabook-3\frontend"
```

### Install Dependencies
```powershell
npm install
```

### Configure Environment
```powershell
copy .env.example .env.local
notepad .env.local
```

Edit:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### Start Frontend
```powershell
npm run dev
```

✅ Checklist:
- [ ] Frontend starts on http://localhost:3001
- [ ] Can access login page
- [ ] No errors in console

---

## 🔄 Daily Workflow Checklist

### Starting Work (Morning)
- [ ] Pull latest changes: `git pull origin main`
- [ ] Navigate to backend: `cd backend_django`
- [ ] Activate venv: `.\venv\Scripts\Activate`
- [ ] Check for new dependencies: `pip install -r requirements.txt`
- [ ] Run migrations: `python manage.py migrate`
- [ ] Start server: `python manage.py runserver`
- [ ] (Optional) Start frontend in another terminal

### Ending Work (Evening)
- [ ] Stop servers (Ctrl+C)
- [ ] Check changes: `git status`
- [ ] Add files: `git add .`
- [ ] Commit: `git commit -m "Your descriptive message"`
- [ ] Push: `git push origin main`
- [ ] Deactivate venv: `deactivate`

---

## 🐛 Quick Troubleshooting

### Problem: "python is not recognized"
**Solution:** Reinstall Python and check "Add to PATH"

### Problem: "psycopg2 error"
**Solution:** 
```powershell
pip uninstall psycopg2 psycopg2-binary
pip install psycopg2-binary
```

### Problem: "Port 8000 in use"
**Solution:** 
```powershell
python manage.py runserver 8001
```

### Problem: "Database connection failed"
**Solution:** Check .env file DATABASE_URL has correct password

### Problem: "Migration error"
**Solution:** 
```powershell
python manage.py migrate --fake
python manage.py migrate
```

### Problem: Virtual environment issues
**Solution:** 
```powershell
Remove-Item -Recurse -Force venv
python -m venv venv
.\venv\Scripts\Activate
pip install -r requirements.txt
```

---

## 📝 Important Notes

### Passwords to Remember
- PostgreSQL postgres user password: _________________
- Django admin password: Admin@123 (change in production)

### Important Commands
```powershell
# Activate venv
.\venv\Scripts\Activate

# Run server
python manage.py runserver

# Run migrations
python manage.py migrate

# Create migrations
python manage.py makemigrations

# Create superuser
python manage.py createsuperuser

# Database shell
python manage.py dbshell

# Python shell with Django
python manage.py shell
```

### Git Commands
```powershell
# Check status
git status

# Pull latest
git pull

# Add all changes
git add .

# Commit
git commit -m "Message"

# Push
git push origin main
```

---

## ✅ Setup Complete!

If all checkboxes are checked, your office computer is ready for development! 🎉

### What You Can Do Now:
- Develop Django backend features
- Test API endpoints
- Create new apps/modules
- Run the frontend locally
- Sync changes between home and office via Git

### Next Steps:
1. Read OFFICE_SETUP_GUIDE.md for detailed explanations
2. Review DJANGO_MIGRATION_COMPLETE_SUMMARY.md for project status
3. Check ORDERS_APP_COMPLETE.md to understand the existing code
4. Start developing new features!

---

**Happy Coding! 🚀**

**Last Updated:** January 2025
