# Document Upload Troubleshooting Guide 🔧

## Common Issues and Solutions

### **Issue: "Upload failed" Error**

---

## ✅ Step-by-Step Debug Checklist

### **1. Check Backend Logs**

Start the backend and watch for errors:
```bash
cd g:\provabook-3\backend
npm run start:dev
```

**Look for**:
- Supabase connection errors
- File validation errors
- Database errors

---

### **2. Verify Database Migration Ran**

```bash
cd g:\provabook-3\backend
npm run migration:run
```

**Expected output**: Migration `EnhanceDocumentEntity` should run successfully

---

### **3. Check Supabase Configuration**

**File**: `backend/.env`

Ensure these are set:
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**How to get them**:
1. Go to Supabase Dashboard
2. Select your project
3. Go to Settings → API
4. Copy `URL` and `service_role` key (NOT anon key!)

---

### **4. Verify Supabase Bucket Exists**

**In Supabase Dashboard**:
1. Go to Storage
2. Check if `order-documents` bucket exists
3. If not, create it (make it **private**, not public)

---

### **5. Check Storage Policies**

**In Supabase Dashboard → Storage → order-documents → Policies**

You should have **3 policies**:

#### **Policy 1: INSERT (Upload)**
```sql
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'order-documents');
```

#### **Policy 2: SELECT (View)**
```sql
CREATE POLICY "Allow authenticated users to view"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'order-documents');
```

#### **Policy 3: DELETE (Remove)**
```sql
CREATE POLICY "Allow authenticated users to delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'order-documents');
```

---

### **6. Test Supabase Connection**

**Create a test file**: `backend/test-supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    // Test bucket access
    const { data, error } = await supabase.storage
      .from('order-documents')
      .list();
    
    if (error) {
      console.error('❌ Supabase Error:', error);
    } else {
      console.log('✅ Supabase connection successful!');
      console.log('Files:', data);
    }
  } catch (err) {
    console.error('❌ Connection failed:', err);
  }
}

test();
```

**Run**: `npx ts-node backend/test-supabase.ts`

---

### **7. Check Frontend API URL**

**File**: `frontend/.env.local` or `frontend/.env`

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

**Verify**: This matches your backend URL

---

### **8. Check Browser Console for Detailed Error**

With the updated `file-upload.tsx`, you should now see:
```
Upload failed: {actual error message}
```

**Common errors**:

| Error Message | Solution |
|--------------|----------|
| `Failed to upload file: Bucket not found` | Create `order-documents` bucket in Supabase |
| `Failed to upload file: new row violates row-level security policy` | Fix storage policies (see step 5) |
| `Failed to upload file: Invalid API key` | Check `SUPABASE_SERVICE_ROLE_KEY` in `.env` |
| `Order with ID ... not found` | The order doesn't exist (use valid order ID) |
| `Cannot read properties of undefined (reading 'id')` | User auth issue - check token |

---

### **9. Test with Small File First**

1. Try uploading a small image (< 100KB)
2. Select "Sample Photo" → "Lab Dip"
3. Click Upload
4. Check backend logs immediately

---

### **10. Verify File Permissions**

**Windows PowerShell**:
```powershell
# Check if backend can write (test)
cd g:\provabook-3\backend
New-Item -ItemType File -Path "test.txt"
```

If this fails, you might have permission issues.

---

## 🐛 Specific Error Solutions

### **Error: "Request Entity Too Large"**

**Cause**: File size limit reached

**Solution**: File must be < 10MB

---

### **Error: "CORS policy blocked"**

**Cause**: Frontend can't access backend

**Solution**: In `backend/src/main.ts`, verify:
```typescript
app.enableCors({
  origin: 'http://localhost:3001',
  credentials: true,
});
```

---

### **Error: "Unauthorized" or "401"**

**Cause**: Auth token expired or invalid

**Solution**:
1. Logout and login again
2. Check localStorage for token:
   - Browser DevTools → Application → Local Storage
   - Should have `token` key

---

### **Error: "Invalid file type"**

**Cause**: File extension not allowed

**Solution**: Only these extensions work:
- Images: `.jpg`, `.jpeg`, `.png`, `.gif`
- Documents: `.pdf`, `.xlsx`, `.xls`, `.docx`, `.doc`

---

### **Error: Database column error**

**Cause**: Migration not run

**Solution**:
```bash
cd g:\provabook-3\backend
npm run migration:run
```

---

## 🧪 Manual API Test with Postman/Insomnia

### **Test Upload Endpoint Directly**

**Request**:
```
POST http://localhost:3000/api/v1/orders/{ORDER_ID}/documents/upload
```

**Headers**:
```
Authorization: Bearer {YOUR_TOKEN}
```

**Body** (form-data):
```
file: [Select a file]
category: sample
subcategory: lab_dip
description: Test upload
```

**Expected Response** (200):
```json
{
  "id": "uuid",
  "fileName": "image.jpg",
  "fileUrl": "https://...supabase.co/storage/v1/...",
  "category": "sample",
  ...
}
```

---

## 📋 Quick Checklist

Before asking for help, verify:

- [ ] Backend is running (`npm run start:dev`)
- [ ] Frontend is running (`npm run dev`)
- [ ] Database migration ran successfully
- [ ] Supabase bucket `order-documents` exists
- [ ] Supabase policies are created (3 policies)
- [ ] `.env` has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- [ ] File is < 10MB
- [ ] File type is allowed (jpg, png, pdf, etc.)
- [ ] Category is selected in upload form
- [ ] Order ID is valid (exists in database)
- [ ] User is logged in (token exists)

---

## 🆘 Still Not Working?

### **Get Detailed Logs**

**Backend** - Check terminal output when you click Upload

**Frontend** - Check browser console (F12)

**Share These**:
1. Backend error message (from terminal)
2. Frontend error (from console)
3. Network tab → Failed request → Preview/Response
4. Supabase bucket screenshot

---

## ✅ Success Indicators

**Backend logs should show**:
```
[Nest] ... LOG [OrdersService] Uploading document for order: ...
```

**No errors in Supabase dashboard Storage logs**

**Document appears in**:
- Order Detail page → Documents tab
- Database `documents` table
- Supabase Storage bucket

---

## 🎯 Most Common Issue

**90% of upload errors are due to**:
1. ❌ Storage policies not created
2. ❌ Service role key (not anon key)
3. ❌ Bucket doesn't exist

**Double-check step 3, 4, and 5 above!**
