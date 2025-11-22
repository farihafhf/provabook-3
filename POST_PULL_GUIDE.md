# Post-Pull Guide

## ⚠️ IMPORTANT: After Every `git pull`

If you see errors like:
- `Cannot find module './XXX.js'`
- `Module not found: Can't resolve '@/components/...'`
- Any webpack/Next.js runtime errors

**Run this command:**

```powershell
cd frontend
.\clean-restart.ps1
```

Or manually:
```powershell
# Kill dev server (Ctrl+C or kill the process)
# Then:
Remove-Item -Recurse -Force .next
npm run dev
```

---

## Why This Happens

- **Git doesn't track** `.next/` (it's in `.gitignore`) ✅
- **The problem:** When you pull code changes, Next.js sometimes fails to detect that its compiled cache (`.next/`) is stale
- **The solution:** Clean the cache to force a fresh rebuild

---

## Best Practice Workflow

```bash
# 1. Pull latest changes
git pull

# 2. If frontend dev server is running, clean restart
cd frontend
.\clean-restart.ps1

# 3. If backend dependencies changed, reinstall
cd ../backend_django
pip install -r requirements.txt
```

---

## When You DON'T Need to Clean

- Pulling changes that only affect backend
- Pulling changes to documentation/markdown files
- Pulling changes to non-code files

## When You MUST Clean

- After pulling changes to `frontend/package.json`
- After pulling changes to frontend components/pages
- When you see "Cannot find module" errors
- After any merge conflicts in frontend code
