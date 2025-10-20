# Provabook Complete Setup Guide

This guide will walk you through setting up the complete Provabook application from scratch. Follow each step carefully to get the system running on your local machine.

## 📋 Prerequisites

Before you begin, make sure you have:

- **Node.js 18 or higher** installed ([Download here](https://nodejs.org/))
- **npm** or **yarn** package manager
- A **Supabase account** (free tier is fine) - [Sign up here](https://supabase.com)
- **Git** (optional, but recommended)
- A code editor like **VS Code**

## 🔧 Step 1: Supabase Setup

### 1.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in the details:
   - **Name**: `provabook`
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to you
4. Click **"Create new project"**
5. Wait 2-3 minutes for the project to be provisioned

### 1.2 Get Your Supabase Credentials

After your project is ready:

1. Go to **Settings** (gear icon in sidebar)
2. Click **API** in the settings menu
3. Copy these values (you'll need them later):
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - **Keep this secret!**

4. Go to **Settings** → **Database**
5. Scroll to **Connection string** section
6. Copy the **URI** format connection string
   - It looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`
   - **Important**: Replace `[YOUR-PASSWORD]` with your actual database password from step 1.1

### 1.3 Enable Storage

1. In Supabase dashboard, click **Storage** in the sidebar
2. Click **"Create a new bucket"**
3. Name it: `documents`
4. **Make it PRIVATE** (not public)
5. Click **"Create bucket"**

### 1.4 Configure Storage Policies

1. Click on the `documents` bucket
2. Go to **Policies** tab
3. Click **"New Policy"**
4. Select **"For full customization"**
5. Add this policy for uploads:

```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');
```

6. Add another policy for downloads:

```sql
CREATE POLICY "Allow authenticated downloads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');
```

## 🔨 Step 2: Backend Setup

### 2.1 Navigate to Backend Folder

Open your terminal/command prompt and navigate to the backend folder:

```bash
cd "d:\provabook 3\backend"
```

### 2.2 Install Dependencies

```bash
npm install
```

This will take a few minutes to download all required packages.

### 2.3 Configure Environment Variables

1. Copy the example environment file:

```bash
copy .env.example .env
```

2. Open the `.env` file in your code editor
3. Fill in your Supabase credentials:

```env
# Application
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1

# Database - Use the connection string from Supabase
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres

# Supabase - From Supabase Dashboard > Settings > API
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT Secret - Generate a random string or use this one
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# CORS
FRONTEND_URL=http://localhost:3001

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx
```

**Important**: Make sure to replace:
- `YOUR_PASSWORD` with your actual database password
- `xxxxx` with your actual Supabase project ID
- The actual keys from your Supabase dashboard

### 2.4 Run Database Migrations

This will create all the necessary tables in your database:

```bash
npm run migration:run
```

You should see output like:
```
query: SELECT * FROM current_schema()
query: SELECT * FROM "information_schema"."tables"...
Migration InitialSchema1700000000000 has been executed successfully.
```

### 2.5 Seed Demo Data

This will create demo users you can login with:

```bash
npm run seed
```

You should see:
```
✅ Created Supabase Auth user: admin@provabook.com
✅ Created user profile: admin@provabook.com
...
🎉 Seed completed successfully!
```

### 2.6 Start the Backend Server

```bash
npm run start:dev
```

You should see:
```
🚀 Provabook Backend is running on: http://localhost:3000
📚 API Documentation: http://localhost:3000/api/docs
```

**Leave this terminal window open!** The backend needs to keep running.

## 🎨 Step 3: Frontend Setup

Open a **NEW** terminal window (keep the backend running in the first one).

### 3.1 Navigate to Frontend Folder

```bash
cd "d:\provabook 3\frontend"
```

### 3.2 Install Dependencies

```bash
npm install
```

This will take a few minutes.

### 3.3 Configure Environment Variables

1. Copy the example environment file:

```bash
copy .env.example .env.local
```

2. Open `.env.local` in your code editor
3. Fill in your Supabase credentials:

```env
# Supabase - Same values from backend
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 3.4 Start the Frontend Server

```bash
npm run dev
```

You should see:
```
ready - started server on 0.0.0.0:3001, url: http://localhost:3001
```

## ✅ Step 4: Test the Application

### 4.1 Open Your Browser

Go to: `http://localhost:3001`

You should be automatically redirected to the login page.

### 4.2 Login with Demo Credentials

Use one of these accounts:

**Administrator Account:**
- Email: `admin@provabook.com`
- Password: `Admin@123`

**Merchandiser Account:**
- Email: `merchandiser@provabook.com`
- Password: `Merchandiser@123`

**Manager Account:**
- Email: `manager@provabook.com`
- Password: `Manager@123`

### 4.3 Explore the Dashboard

After logging in, you should see:
- Dashboard with statistics cards
- Sidebar navigation with all modules
- Functional pages for Orders, Samples, Financials, etc.

## 🎯 Step 5: Verify Everything Works

### 5.1 Check API Documentation

Open: `http://localhost:3000/api/docs`

You should see the Swagger API documentation with all endpoints.

### 5.2 Test Creating an Order

1. In the frontend, click **"Orders"** in the sidebar
2. Click **"New Order"** button
3. The page structure should load (full CRUD will work when you fill in forms)

## 🐛 Troubleshooting

### Backend won't start

**Error: "DATABASE_URL is not defined"**
- Solution: Make sure you copied `.env.example` to `.env` and filled in all values

**Error: "Connection refused"**
- Solution: Check your database password is correct in `DATABASE_URL`
- Make sure your Supabase project is active (not paused)

**Error: "Port 3000 already in use"**
- Solution: Close any other applications using port 3000, or change `PORT=3000` to `PORT=3001` in backend `.env`

### Frontend won't start

**Error: "Failed to fetch"**
- Solution: Make sure the backend is running on `http://localhost:3000`
- Check `NEXT_PUBLIC_API_URL` in frontend `.env.local`

**Error: "Invalid Supabase credentials"**
- Solution: Double-check your Supabase URL and anon key in `.env.local`

### Cannot login

**Error: "Invalid credentials"**
- Solution: Make sure you ran `npm run seed` in the backend
- Check the seed output to confirm users were created
- Try the exact credentials: `admin@provabook.com` / `Admin@123`

**Error: "User not found"**
- Solution: The seed might have failed. Try running it again:
  ```bash
  cd backend
  npm run seed
  ```

### Database migration errors

**Error: "relation already exists"**
- Solution: Your database already has tables. You can:
  1. Create a fresh Supabase project, OR
  2. Revert migrations: `npm run migration:revert` then `npm run migration:run`

## 📚 Next Steps

### Add Your Own Data

1. **Create Orders**: Use the API or frontend to add real orders
2. **Upload Documents**: Test file uploads through the Documents module
3. **Track Samples**: Add sample records and track their status

### Explore the Features

- **Dashboard**: View real-time statistics
- **Orders**: Full CRUD operations
- **Samples**: Version tracking with resubmission workflows
- **Financials**: PI and LC management with date tracking
- **Production**: Daily production metrics
- **Incidents**: Issue tracking and resolution
- **Shipments**: Logistics and delivery management
- **Notifications**: System alerts and reminders

### Customize for Your Needs

- Modify order fields in `backend/src/database/entities/order.entity.ts`
- Add new pages in `frontend/src/app/`
- Customize UI colors in `frontend/tailwind.config.ts`

## 🚀 Deployment

When ready for production:

### Backend Deployment (Railway/Render/Heroku)

1. Create account on your chosen platform
2. Create new project
3. Connect your Git repository
4. Set environment variables
5. Deploy!

### Frontend Deployment (Vercel)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Set environment variables
5. Deploy automatically!

## 📞 Support

If you run into issues:

1. Check the troubleshooting section above
2. Review the `README.md` files in backend and frontend folders
3. Check Supabase dashboard logs
4. Verify all environment variables are set correctly

---

**Congratulations! 🎉** 

You now have a fully functional Provabook textile operations management platform running locally. The system is ready for demo, testing, and further development.

**Key URLs:**
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/api/docs
- Supabase Dashboard: https://app.supabase.com

**Demo Credentials:**
- Admin: admin@provabook.com / Admin@123
- Merchandiser: merchandiser@provabook.com / Merchandiser@123
