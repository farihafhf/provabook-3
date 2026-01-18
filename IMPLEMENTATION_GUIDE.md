# OrderLine Refactoring Implementation Guide

## Overview

This guide documents the major refactoring to move all order-level features (approvals, dates, quantities, prices) to the row level (style + optional color + optional CAD combinations).

## Backend Changes Completed ✅

### 1. New OrderLine Model
**File**: `backend_django/apps/orders/models_order_line.py`

- Represents style+color+CAD combinations
- Each line has its own:
  - Quantity, unit
  - Prices (mill, prova, commission, currency)
  - ETD, ETA, submission/approval dates
  - Approval statuses for all gates
  - Notes

**Valid combinations**:
- (Style, Color, CAD)
- (Style, Color, no CAD)
- (Style, no Color, CAD)
- (Style, no Color, no CAD) - style-only line

### 2. Updated ApprovalHistory Model
**File**: `backend_django/apps/orders/models.py`

- Added `order_line` FK (nullable for backwards compatibility)
- Added more approval types: 'aop', 'qualityTest', 'bulkSwatch'
- Links approvals to specific order lines

### 3. Serializers
**Files**: 
- `backend_django/apps/orders/serializers_order_line.py` (new)
- `backend_django/apps/orders/serializers_style_color.py` (updated)
- `backend_django/apps/orders/serializers.py` (updated)

**Changes**:
- `OrderLineSerializer`: Handles line data with camelCase conversion
- `OrderStyleSerializer`: Now includes `lines` field
- `OrderStyleCreateUpdateSerializer`: Accepts nested `lines` instead of `colors`
- `ApprovalUpdateSerializer`: Accepts `orderLineId` for line-level approvals
- `ApprovalHistorySerializer`: Includes line details (styleNumber, colorCode, cadCode, lineLabel)

### 4. Views
**File**: `backend_django/apps/orders/views.py`

**Updated `update_approval` endpoint**:
- Accepts optional `orderLineId` in request
- If `orderLineId` provided: updates OrderLine.approval_status
- If not provided: updates order.approval_status (backwards compatible)
- Aggregates line approvals to order level via `_aggregate_line_approvals_to_order()`
- Auto-advance logic remains unchanged (uses aggregated order.approval_status)

### 5. Migrations
**File**: `backend_django/apps/orders/migrations/0012_*.py`

- Created `order_lines` table with all fields
- Added `order_line` FK to `approval_history` table
- Created indexes for performance
- Created unique constraint on (style, color_code, cad_code)

### 6. Admin
**File**: `backend_django/apps/orders/admin.py`

- Added `OrderLineAdmin` for managing lines in Django admin

## Frontend Changes Required 🔄

### 1. TypeScript Interfaces ✅
**File**: `frontend/src/types/order-line.ts` (created)

Interfaces:
- `OrderLine`
- `OrderLineFormData`
- `StyleFormData` (updated to use `lines` instead of `colors`)

### 2. Order Info Page
**File**: `frontend/src/app/orders/[id]/page.tsx`

**Required Changes**:

a. **Update Order interface**:
```typescript
interface Order {
  // ... existing fields ...
  styles?: OrderStyle[];  // Each style now has lines
}

interface OrderStyle {
  // ... existing fields ...
  lines: OrderLine[];  // NEW: replaces or supplements colors
}
```

b. **Update approval history interface**:
```typescript
interface ApprovalHistoryItem {
  id: string;
  approvalType: string;
  status: string;
  orderLineId?: string;  // NEW
  lineLabel?: string;    // NEW
  styleNumber?: string;  // NEW
  colorCode?: string;    // NEW
  cadCode?: string;      // NEW
  changedByName?: string;
  createdAt: string;
}
```

c. **Revamp Styles & Lines display**:
```tsx
{order.styles?.map((style) => (
  <Card key={style.id}>
    <CardHeader>
      <CardTitle>{style.styleNumber}</CardTitle>
    </CardHeader>
    <CardContent>
      {/* Lines Table */}
      <table className="w-full">
        <thead>
          <tr>
            <th>Color</th>
            <th>CAD</th>
            <th>Quantity</th>
            <th>Prices</th>
            <th>ETD/ETA</th>
            <th>Approvals</th>
          </tr>
        </thead>
        <tbody>
          {style.lines?.map((line) => (
            <tr key={line.id}>
              <td>{line.colorCode || '–'}</td>
              <td>{line.cadCode || '–'}</td>
              <td>{line.quantity} {line.unit}</td>
              <td>
                {line.millPrice && `Mill: ${line.millPrice}`}<br/>
                {line.provaPrice && `Prova: ${line.provaPrice}`}
              </td>
              <td>
                ETD: {line.etd || '–'}<br/>
                ETA: {line.eta || '–'}
              </td>
              <td>
                <Button 
                  onClick={() => {
                    setActiveTab('approval');
                    // Filter to this specific line
                  }}
                >
                  View Approvals
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </CardContent>
  </Card>
))}
```

d. **Update Approval Gate tab**:
```tsx
<TabsContent value="approval">
  {/* Order-level summary (read-only) */}
  <Card>
    <CardHeader>
      <CardTitle>Overall Approval Progress</CardTitle>
    </CardHeader>
    <CardContent>
      <p>Aggregated from all lines below</p>
      {/* Show order.approvalStatus */}
    </CardContent>
  </Card>

  {/* Filter controls */}
  <div className="flex gap-4 my-4">
    <Select value={selectedStyleId} onValueChange={setSelectedStyleId}>
      <SelectTrigger>
        <SelectValue placeholder="Filter by style" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Styles</SelectItem>
        {order.styles?.map(s => (
          <SelectItem key={s.id} value={s.id}>{s.styleNumber}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  {/* Line-level approval grid */}
  {filteredLines.map((line) => (
    <Card key={line.id} className="mb-4">
      <CardHeader>
        <CardTitle className="text-base">
          {line.styleNumber} | {line.lineLabel}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* For each approval type */}
          {['labDip', 'strikeOff', 'handloom', 'ppSample'].map(type => (
            <div key={type}>
              <Label>{formatApprovalName(type)}</Label>
              <Select
                value={line.approvalStatus?.[type] || 'submission'}
                onValueChange={(value) => handleLineApprovalChange(type, value, line.id)}
                disabled={updating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="submission">Submission</SelectItem>
                  <SelectItem value="resubmission">Re-submission</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ))}
</TabsContent>
```

e. **Update handleApprovalChange function**:
```typescript
const handleLineApprovalChange = async (
  approvalType: string, 
  newStatus: string, 
  lineId: string
) => {
  setUpdating(true);
  try {
    await api.patch(`/orders/${order.id}/approvals/`, {
      approvalType,
      status: newStatus,
      orderLineId: lineId,  // NEW: line-specific approval
    });

    toast({
      title: 'Success',
      description: `Approval updated for line`,
    });

    await fetchOrder();
  } catch (error: any) {
    toast({
      title: 'Error',
      description: error.response?.data?.message || 'Failed to update approval',
      variant: 'destructive',
    });
  } finally {
    setUpdating(false);
  }
};
```

### 3. Order Edit Page
**File**: `frontend/src/app/orders/[id]/edit/page.tsx`

**Required Changes**:

a. **Update StyleFormData** (use from `order-line.ts`)

b. **Revamp per-style editing UI**:
```tsx
{styles.map((style, styleIdx) => (
  <Card key={styleIdx}>
    <CardHeader>
      <CardTitle>Style {styleIdx + 1}</CardTitle>
    </CardHeader>
    <CardContent>
      {/* Style-level fields */}
      <div className="grid grid-cols-2 gap-4">
        {/* fabricType, fabricComposition, etc. */}
      </div>

      {/* Lines Table */}
      <div className="mt-4">
        <Label>Lines (Color+CAD combinations)</Label>
        <table className="w-full border">
          <thead>
            <tr>
              <th>Color Code</th>
              <th>CAD Code</th>
              <th>Quantity</th>
              <th>Mill Price</th>
              <th>Prova Price</th>
              <th>ETD</th>
              <th>ETA</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {style.lines.map((line, lineIdx) => (
              <tr key={lineIdx}>
                <td>
                  <Input
                    value={line.colorCode || ''}
                    onChange={(e) => updateLine(styleIdx, lineIdx, 'colorCode', e.target.value)}
                    placeholder="Optional"
                  />
                </td>
                <td>
                  <Input
                    value={line.cadCode || ''}
                    onChange={(e) => updateLine(styleIdx, lineIdx, 'cadCode', e.target.value)}
                    placeholder="Optional"
                  />
                </td>
                <td>
                  <Input
                    type="number"
                    value={line.quantity}
                    onChange={(e) => updateLine(styleIdx, lineIdx, 'quantity', e.target.value)}
                    required
                  />
                </td>
                <td>
                  <Input
                    type="number"
                    value={line.millPrice || ''}
                    onChange={(e) => updateLine(styleIdx, lineIdx, 'millPrice', e.target.value)}
                  />
                </td>
                <td>
                  <Input
                    type="number"
                    value={line.provaPrice || ''}
                    onChange={(e) => updateLine(styleIdx, lineIdx, 'provaPrice', e.target.value)}
                  />
                </td>
                <td>
                  <Input
                    type="date"
                    value={line.etd || ''}
                    onChange={(e) => updateLine(styleIdx, lineIdx, 'etd', e.target.value)}
                  />
                </td>
                <td>
                  <Input
                    type="date"
                    value={line.eta || ''}
                    onChange={(e) => updateLine(styleIdx, lineIdx, 'eta', e.target.value)}
                  />
                </td>
                <td>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLine(styleIdx, lineIdx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => addLine(styleIdx)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Line
        </Button>
      </div>
    </CardContent>
  </Card>
))}
```

c. **Helper functions**:
```typescript
const addLine = (styleIdx: number) => {
  const updatedStyles = [...styles];
  updatedStyles[styleIdx].lines.push({
    colorCode: '',
    cadCode: '',
    quantity: '',
    unit: 'meters',
    currency: 'USD',
  });
  setStyles(updatedStyles);
};

const removeLine = (styleIdx: number, lineIdx: number) => {
  const updatedStyles = [...styles];
  updatedStyles[styleIdx].lines.splice(lineIdx, 1);
  setStyles(updatedStyles);
};

const updateLine = (
  styleIdx: number, 
  lineIdx: number, 
  field: string, 
  value: any
) => {
  const updatedStyles = [...styles];
  updatedStyles[styleIdx].lines[lineIdx][field] = value;
  setStyles(updatedStyles);
};
```

d. **Update handleSubmit payload**:
```typescript
const orderData = {
  // ... existing order fields ...
  styles: styles.map((style) => ({
    id: style.id,
    description: style.description || undefined,
    fabricType: style.fabricType || formData.fabricType,
    // ... other style fields ...
    lines: style.lines.map((line) => ({
      id: line.id,
      colorCode: line.colorCode || undefined,
      colorName: line.colorName || undefined,
      cadCode: line.cadCode || undefined,
      cadName: line.cadName || undefined,
      quantity: parseFloat(line.quantity),
      unit: line.unit,
      millName: line.millName || undefined,
      millPrice: line.millPrice ? parseFloat(line.millPrice) : undefined,
      provaPrice: line.provaPrice ? parseFloat(line.provaPrice) : undefined,
      commission: line.commission ? parseFloat(line.commission) : undefined,
      currency: line.currency,
      etd: line.etd || undefined,
      eta: line.eta || undefined,
      submissionDate: line.submissionDate || undefined,
      notes: line.notes || undefined,
    })),
  })),
};
```

## Testing Checklist

### Backend
- [x] Django check passes
- [x] Migrations applied successfully
- [ ] Test order create with lines via Django admin
- [ ] Test approval update with orderLineId via API
- [ ] Test aggregation logic (all lines approved → order approved)

### Frontend
- [ ] Order info page displays lines correctly
- [ ] Approval gate tab shows line-level approvals
- [ ] Approval changes update specific lines
- [ ] Order edit page allows adding/removing/editing lines
- [ ] Form submission sends correct nested lines data
- [ ] Line combinations validated (unique within style)

## API Endpoints Reference

### Get Order
`GET /orders/{id}`
Returns order with nested `styles`, each containing `lines[]`

### Update Approval (Line-Level)
`PATCH /orders/{id}/approvals/`
```json
{
  "approvalType": "labDip",
  "status": "approved",
  "orderLineId": "uuid-of-line"
}
```

### Update Approval (Order-Level, backwards compatible)
`PATCH /orders/{id}/approvals/`
```json
{
  "approvalType": "labDip",
  "status": "approved"
}
```

### Update Order (with lines)
`PATCH /orders/{id}`
```json
{
  "styles": [
    {
      "id": "...",
      "lines": [
        {
          "id": "...",
          "colorCode": "C1",
          "cadCode": "D1",
          "quantity": 100,
          "unit": "meters",
          "millPrice": 10.5,
          "provaPrice": 12.0,
          "etd": "2025-01-15",
          "eta": "2025-02-01"
        }
      ]
    }
  ]
}
```

## Migration Path

### For Existing Orders
Old orders with `OrderColor` data:
- Can coexist with new `OrderLine` data
- Frontend should handle both structures
- Consider data migration script to convert OrderColor → OrderLine

### Recommended Approach
1. Complete frontend changes
2. Test with new orders (lines-based)
3. Optionally create migration script for existing data
4. Deprecate OrderColor model once fully migrated

## Notes
- Line combinations are validated for uniqueness within a style
- At least one line is required per style
- Color and CAD are both optional (allows style-only, color-only, CAD-only, or combined lines)
- Approval aggregation uses priority: all approved > any rejected > any resubmission > any submission
