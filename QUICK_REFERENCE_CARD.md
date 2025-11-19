# ⚡ Provabook - Quick Reference Card

**Print this page and keep it at your desk!**

---

## 🚀 Daily Commands

### Starting Work
```powershell
# 1. Navigate to project
cd "f:\provabook django\provabook-3\backend_django"

# 2. Pull latest changes
git pull origin main

# 3. Activate virtual environment
.\venv\Scripts\Activate

# 4. Install any new dependencies
pip install -r requirements.txt

# 5. Run migrations
python manage.py migrate

# 6. Start Django server
python manage.py runserver
```

### Ending Work
```powershell
# 1. Stop server (Ctrl+C)

# 2. Check what changed
git status

# 3. Add all changes
git add .

# 4. Commit with message
git commit -m "Your descriptive message"

# 5. Push to repository
git push origin main
```

---

## 🔧 Common Commands

### Django Management
```powershell
# Run server
python manage.py runserver

# Run on different port
python manage.py runserver 8001

# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Django shell
python manage.py shell

# Database shell
python manage.py dbshell

# Check for issues
python manage.py check

# Collect static files (production)
python manage.py collectstatic
```

### Virtual Environment
```powershell
# Create venv
python -m venv venv

# Activate (Windows)
.\venv\Scripts\Activate

# Deactivate
deactivate

# Install requirements
pip install -r requirements.txt

# Save current packages
pip freeze > requirements.txt

# List installed packages
pip list

# Update pip
pip install --upgrade pip
```

### Git Commands
```powershell
# Check status
git status

# Pull latest
git pull origin main

# Add all files
git add .

# Add specific file
git add path/to/file

# Commit
git commit -m "Message"

# Push
git push origin main

# View log
git log --oneline

# Create branch
git checkout -b feature-name

# Switch branch
git checkout main

# Merge branch
git merge feature-name

# Discard changes
git checkout -- path/to/file

# See differences
git diff
```

### PostgreSQL
```powershell
# Connect to database
psql -U postgres

# Connect to specific database
psql -U postgres -d provabook_django

# List databases
\l

# List tables
\dt

# Describe table
\d table_name

# Quit
\q

# Create database
createdb provabook_django

# Drop database
dropdb provabook_django

# Backup database
pg_dump -U postgres -d provabook_django > backup.sql

# Restore database
psql -U postgres -d provabook_django < backup.sql
```

---

## 📂 Important Paths

### Project Directories
```
Project Root:
f:\provabook django\provabook-3\

Django Backend:
f:\provabook django\provabook-3\backend_django\

Frontend:
f:\provabook django\provabook-3\frontend\

Virtual Environment:
f:\provabook django\provabook-3\backend_django\venv\
```

### Important Files
```
# Environment configuration
backend_django/.env

# Python dependencies
backend_django/requirements.txt

# Django settings
backend_django/config/settings.py

# Main URL routing
backend_django/config/urls.py

# Django management
backend_django/manage.py
```

---

## 🌐 URLs to Bookmark

### Development URLs
```
Django Backend:
http://localhost:8000

API Documentation (Swagger):
http://localhost:8000/api/docs/

Django Admin Panel:
http://localhost:8000/admin/

API Root:
http://localhost:8000/api/v1/

Frontend (Next.js):
http://localhost:3001
```

### External Resources
```
Django Docs:
https://docs.djangoproject.com/

Django REST Framework:
https://www.django-rest-framework.org/

PostgreSQL Docs:
https://www.postgresql.org/docs/

Git Cheat Sheet:
https://education.github.com/git-cheat-sheet-education.pdf
```

---

## 🔐 Default Credentials

### Django Admin
```
Email: admin@provabook.com
Password: Admin@123
```

### PostgreSQL
```
User: postgres
Password: [Your password from installation]
Host: localhost
Port: 5432
Database: provabook_django
```

---

## 📝 Environment Variables Template

```env
# .env file structure
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

DATABASE_URL=postgresql://postgres:password@localhost:5432/provabook_django

ACCESS_TOKEN_LIFETIME_MINUTES=60
REFRESH_TOKEN_LIFETIME_MINUTES=1440

CORS_ALLOWED_ORIGINS=http://localhost:3001,http://127.0.0.1:3001

MAX_UPLOAD_SIZE=10485760
ALLOWED_FILE_EXTENSIONS=.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx
```

---

## 🐛 Quick Troubleshooting

### "python is not recognized"
```powershell
# Reinstall Python with "Add to PATH" checked
```

### "Port 8000 is already in use"
```powershell
# Use different port
python manage.py runserver 8001

# OR find and kill process
netstat -ano | findstr :8000
taskkill /PID <process_id> /F
```

### "Database connection failed"
```powershell
# Check PostgreSQL is running
# Services → postgresql-x64-15 → Start

# Check .env DATABASE_URL is correct
```

### "Module not found"
```powershell
# Make sure venv is activated
.\venv\Scripts\Activate

# Reinstall requirements
pip install -r requirements.txt
```

### "Migration error"
```powershell
# Show migrations
python manage.py showmigrations

# Fake migration (if needed)
python manage.py migrate --fake app_name

# Revert migration
python manage.py migrate app_name migration_name
```

### Git merge conflicts
```powershell
# See conflicted files
git status

# Edit files and remove conflict markers
# Then:
git add .
git commit -m "Resolved conflicts"
```

---

## 📊 Project Status Quick View

### ✅ Complete (35%)
- Django foundation
- Authentication (8 endpoints)
- Orders module (8 endpoints)
- Core utilities
- Documentation

### ⏳ In Progress (0%)
- Nothing currently in progress

### 🔜 Next Up (65%)
- Samples module
- Financials (PI & LC)
- Production metrics
- Incidents tracking
- Shipments
- Notifications
- Documents
- Dashboard
- Data migration
- Frontend integration
- Testing
- Deployment

---

## 🎯 Work Session Checklist

### Start of Session
- [ ] Pull latest code: `git pull`
- [ ] Activate venv: `.\venv\Scripts\Activate`
- [ ] Update dependencies: `pip install -r requirements.txt`
- [ ] Run migrations: `python manage.py migrate`
- [ ] Start server: `python manage.py runserver`

### During Session
- [ ] Test changes frequently
- [ ] Commit small, logical chunks
- [ ] Write clear commit messages
- [ ] Keep API docs updated

### End of Session
- [ ] Test everything works
- [ ] Commit all changes: `git commit -am "Message"`
- [ ] Push to remote: `git push origin main`
- [ ] Document any issues
- [ ] Stop all servers (Ctrl+C)

---

## 📞 Emergency Commands

### Something Broke - Reset Everything
```powershell
# 1. Stop all servers (Ctrl+C)

# 2. Discard all changes (WARNING: Loses uncommitted work)
git checkout -- .
git clean -fd

# 3. Pull fresh code
git pull origin main

# 4. Recreate virtual environment
Remove-Item -Recurse -Force venv
python -m venv venv
.\venv\Scripts\Activate
pip install -r requirements.txt

# 5. Reset database (WARNING: Loses all data)
# In psql:
DROP DATABASE provabook_django;
CREATE DATABASE provabook_django;

# 6. Remigrate
python manage.py migrate

# 7. Create superuser
python manage.py createsuperuser

# 8. Start fresh
python manage.py runserver
```

### Database Is Corrupted
```powershell
# Drop and recreate
psql -U postgres
DROP DATABASE provabook_django;
CREATE DATABASE provabook_django;
\q

python manage.py migrate
python manage.py createsuperuser
```

### Git Is Confused
```powershell
# Reset to last commit (loses changes)
git reset --hard HEAD

# Reset to remote state
git fetch origin
git reset --hard origin/main
```

---

## 📁 Files You'll Edit Most

### Backend Development
```
apps/orders/models.py           # Order model definition
apps/orders/serializers.py      # Data validation
apps/orders/views.py            # API logic
apps/orders/urls.py             # URL routing

config/settings.py              # Django settings
config/urls.py                  # Main URL config
```

### Frontend Development
```
frontend/src/app/orders/page.tsx       # Orders page
frontend/src/lib/api.ts               # API client
frontend/src/components/ui/           # UI components
frontend/.env.local                   # Frontend config
```

---

## 💡 Pro Tips

### Django
- Use `python manage.py shell` to test queries interactively
- Check API docs at `/api/docs/` before coding
- Always activate venv before working
- Commit migration files to Git

### Git
- Pull before starting work
- Commit often with clear messages
- Push at end of every session
- Use branches for big features

### PostgreSQL
- Keep regular backups
- Don't delete migration files
- Use Django ORM instead of raw SQL
- Monitor database size

### Development
- Test in browser + Postman/curl
- Check Django logs for errors
- Keep documentation updated
- Comment complex code

---

## 🔢 Key Statistics

**Project:** Provabook Textile Operations  
**Backend:** Django 5.0 + PostgreSQL  
**Frontend:** Next.js 14  
**Progress:** 35% Complete  
**Modules:** 2/10 Complete  
**API Endpoints:** 16/50+ Complete  
**Documentation:** 30,000+ words

---

## 📅 Work Schedule Reminder

### Before Leaving Home
1. Commit & push all changes
2. Note what you were working on
3. Update any documentation

### At Office
1. Pull latest changes
2. Review notes from home
3. Continue where you left off

### Before Leaving Office
1. Commit & push all changes
2. Note progress for next session
3. Update any documentation

---

**Print this page and keep it handy! 🖨️**

**Last Updated:** January 2025
