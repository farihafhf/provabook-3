# Dashboard Running Orders Count - FIXED ✅

## 🐛 Problem Identified

**Symptom**: Dashboard showed 1 running order, but Orders page showed 2 running orders.

**Root Cause**: Role-based filtering mismatch between dashboard and orders page.

### What Was Happening:

1. **Dashboard Service** (`dashboard.service.ts`):
   - ✅ Correctly filtered by `merchandiser_id` for merchandisers
   - ✅ Showed only YOUR orders (1 running order)

2. **Orders Controller** (`orders.controller.ts`):
   - ❌ Did NOT filter by user role
   - ❌ Showed ALL company orders regardless of role (2 running orders)

This was actually a **security issue** - merchandisers could see orders assigned to other merchandisers!

---

## ✅ Solution Applied

### File: `backend/src/modules/orders/orders.controller.ts`

**Before:**
```typescript
@Get()
async findAll(
  @Query('status') status?: OrderStatus,
  @Query('category') category?: OrderCategory,
  @Query('merchandiserId') merchandiserId?: string,
) {
  return this.ordersService.findAll({ status, category, merchandiserId });
}
```

**After:**
```typescript
@Get()
async findAll(
  @Query('status') status?: OrderStatus,
  @Query('category') category?: OrderCategory,
  @Query('merchandiserId') merchandiserId?: string,
  @CurrentUser() user?: any,
) {
  // If user is a merchandiser, only show their orders
  const effectiveMerchandiserId = 
    user?.role === UserRole.MERCHANDISER 
      ? user.id 
      : merchandiserId;
  
  return this.ordersService.findAll({ status, category, merchandiserId: effectiveMerchandiserId });
}
```

---

## 🎯 How It Works Now

### For Merchandisers:
- ✅ Dashboard: Shows only YOUR orders
- ✅ Orders Page: Shows only YOUR orders
- ✅ Counts match perfectly!

### For Managers/Admins:
- ✅ Dashboard: Shows ALL company orders
- ✅ Orders Page: Shows ALL company orders
- ✅ Can still filter by specific merchandiser if needed

---

## 🔒 Security Benefit

**Before**: Merchandisers could see other merchandisers' orders (security leak)  
**After**: Merchandisers can only see their own orders (secure)

---

## 🚀 Testing Steps

1. Restart backend:
   ```bash
   cd g:\provabook-3\backend
   npm run start:dev
   ```

2. Test as Merchandiser:
   - Go to Dashboard → Note the running count
   - Go to Orders page → Count should match
   - ✅ Should only see YOUR orders

3. Test as Manager:
   - Go to Dashboard → See all company orders
   - Go to Orders page → See all company orders
   - ✅ Counts should match

---

## 📊 Summary

- **Issue Type**: Role-based filtering inconsistency + security issue
- **Impact**: High (data visibility + count mismatch)
- **Complexity**: Low (simple role check)
- **Status**: ✅ FIXED
- **Files Changed**: 1 file (`orders.controller.ts`)
