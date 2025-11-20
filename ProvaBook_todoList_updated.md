# ProvaBook – Updated Implementation Todo (Django + Next.js)

## 1. Foundational Context Prompt (Global Context)

Use the following prompt to initialize your AI coding agent at the start of each work session.

```markdown
You are an expert full-stack developer assigned to complete an ERP application named "Provabook." Your task is to generate code based on precise instructions.

Here is the project's technical stack and architecture:
- **Backend:** Django 5.x with Django REST Framework (DRF).
- **Database:** PostgreSQL.
- **Authentication:** JWT using `djangorestframework-simplejwt`.
- **Frontend:** Next.js 14 with TypeScript and Tailwind CSS for styling.
- **UI:** The project uses pre-installed Shadcn/UI components for the entire UI library.
- **Charting:** The Recharts library is installed and used for all data visualizations.
- **State Management:** Zustand is used for global state management on the frontend.
- **API Convention:** The backend API follows REST principles. DRF serializers must convert snake_case field names from Django models to camelCase for all frontend-facing responses.
```

---

## 2. MVP Parallel Work Plan (Two Developer Tracks)

These are the remaining tasks required to reach the MVP described in the original 14‑day plan. They are split into two independent tracks so that **Hozaifa** and **Fariha** can work simultaneously on separate branches with minimal overlap.

At a glance:

- **Track A – Hozaifa:** Orders domain (filters, alerts, timeline, exports).
- **Track B – Fariha:** Samples, Financials, Production, Shipments, Dashboard analytics.

Each task below is assigned to exactly one developer and is designed to be implementable on its own branch. Where both tracks touch a shared file (e.g., `dashboard/page.tsx`), integration points are called out explicitly.

---

### 2.1. Track A – Hozaifa: Orders, Alerts, Timeline & Exports (MVP)

> **Branch suggestion:** `feature/mvp-track-a-hozaifa-orders`

All tasks in this subsection are owned by **Hozaifa**. Focus on the Orders domain and dashboard widgets. Avoid changing Samples, Financials, Production, or Shipments modules except where specifically mentioned.

#### 2.1.1. Orders Advanced Filtering (Backend + Frontend)

- **Assigned Developer:** Hozaifa
- **Current Status & Contradictions:**
  - Backend `OrderViewSet` already uses `DjangoFilterBackend`, `SearchFilter`, and `OrderingFilter` with a rich `OrderFilter` class.
  - Frontend `/orders` page currently has **no filter UI**, and calls `GET /orders` without query parameters.
  - Original plan required a multi-faceted filter component plus URL-synced search parameters.

- **Objective:** **Deliver a powerful, URL-synced filter UI for the Orders page and ensure the backend filter contract matches those query parameters.**
- **Priority:** P1 (High)
- **Key Files to Create/Modify:**
  - `frontend/src/components/orders/order-filters.tsx` (new)
  - `frontend/src/app/orders/page.tsx`
  - `apps/orders/views.py`
  - `apps/orders/filters.py`

- **AI Agent Prompt:**

> "Implement an advanced Orders filtering experience and align it with the existing Django filters.
>
> Frontend:
> - Create a reusable `OrderFilters` component rendered above the Orders table.
> - Support at least: `status`, `category`, text search (customer/order/style), and date ranges for `orderDate`, `etd`, and/or `expectedDeliveryDate`.
> - Sync filter state into the URL (e.g., `?status=running&search=cotton&orderDateFrom=2024-01-01`).
> - When filters change, re-fetch `/orders` using the shared Axios client, passing query params derived from the URL/search state.
>
> Backend:
> - Ensure `OrderFilter` exposes matching fields for the query params used by the frontend (e.g., `status`, `category`, `search`, and clearly named date range params).
> - If necessary, add custom filter fields (e.g., `order_date_from`, `order_date_to`) and document which ones the frontend should use.
> - Add defensive validation so malformed dates return a clean 400 with helpful error messages instead of 500s.
>
> Keep network calls unpaginated for now (to match current expectations) unless the data size becomes an issue; if pagination is added later, design the API and UI together."

- **Verification Steps:**
  1. On `/orders`, filter by `status=running` using the new UI and confirm:
     - The URL updates (e.g., `?status=running`).
     - Only running orders are shown.
  2. Apply a text search (e.g., customer name) and a date range together. Confirm only matching rows remain.
  3. Refresh the page with the query params in the URL and verify the filters and results are restored correctly.
  4. Manually hit the API with an invalid date and confirm a well-structured 400 response instead of a crash.

---

#### 2.1.2. Operational Alerts & Dashboard Widgets

- **Assigned Developer:** Hozaifa
- **Current Status & Contradictions:**
  - Backend `dashboard_view` in `apps/core/views.py` exposes aggregated ETD/ETA windows and basic counts but no dedicated "alerts" endpoints.
  - Frontend `/dashboard` shows KPI cards and an activity feed but **no dedicated alerts widget** or approval queue.
  - Original Week 1 plan specified alert-focused endpoints plus `alerts-widget.tsx` and `approval-queue.tsx` components.

- **Objective:** **Surface at-risk orders (upcoming ETD/ETA, stuck approvals) via dedicated API endpoints and dashboard widgets.**
- **Priority:** P1 (High)
- **Key Files to Create/Modify:**
  - `apps/orders/views.py` (new alert endpoints or services)
  - `apps/orders/services.py` (optional, for business logic)
  - `frontend/src/components/dashboard/alerts-widget.tsx` (new)
  - `frontend/src/components/dashboard/approval-queue.tsx` (new)
  - `frontend/src/app/dashboard/page.tsx` (integrate widgets into layout)

- **AI Agent Prompt:**

> "Implement an operational alerts layer for orders and visualize it on the dashboard.
>
> Backend:
> - Add one or more read-only endpoints under `/api/v1/orders` (e.g., `/alerts/upcoming-etd`, `/alerts/stuck-approvals`) that return lists of lightweight order summaries needed for widgets.
> - `upcoming-etd` should return orders whose ETD or ETA is within the next N days (configurable, default 7) and not yet archived.
> - `stuck-approvals` should return orders where approval gates have been in `pending` longer than a threshold and/or where PP Sample is not approved.
>
> Frontend:
> - Create an `AlertsWidget` component that:
>   - Shows counts of upcoming ETD/ETA risks and lists the top few items with color-coded severity.
>   - Links each row to the relevant order detail page.
> - Create an `ApprovalQueue` component that lists orders with incomplete approval gates, again linking to `/orders/[id]`.
> - Integrate both into `/dashboard` below the existing KPI cards, maintaining responsive design.
>
> Use lightweight payloads and query parameters (e.g., `daysAhead`) to keep the endpoints fast and flexible."

- **Verification Steps:**
  1. Create test orders with ETD/ETA in the next 2–3 days and others far in the future. Confirm only the near-term ones appear in the alerts widget.
  2. Create an order with multiple approval gates stuck in `pending` and confirm it appears in the Approval Queue.
  3. Click an item in each widget and verify navigation to the correct order detail page.

---

#### 2.1.3. Order Timeline Visualization

- **Assigned Developer:** Hozaifa
- **Objective:** **Provide a visual history of an order's lifecycle from creation to delivery.**
- **Priority:** P2 (Medium, still part of MVP 14‑day plan)
- **Key Files:**
  - `frontend/src/components/orders/order-timeline.tsx`
  - `frontend/src/app/orders/[id]/page.tsx`
  - `apps/orders/serializers.py` (extend if additional event data is needed)

- **AI Agent Prompt:**

> "Create an `OrderTimeline` component for the Order Detail page.
>
> - Visualize milestones such as: Order Created → Approvals Completed → Production Started → Shipment Dispatched → Delivered.
> - Use existing fields (`created_at`, `current_stage`, `approval_status`, ETD/ETA, shipment records) to infer events; if necessary, add a lightweight history structure serialized for the frontend.
> - Render as a vertical timeline styled similarly to a package tracking history.
>
> Integrate the component into `/orders/[id]` under an appropriate tab/section without disrupting existing approval and documents tabs."

- **Verification Steps:**
  1. Open an order that has progressed through several stages.
  2. Verify events are ordered correctly and labeled clearly.
  3. Confirm future/unreached steps are visually distinct (e.g., grayed out) from completed ones.

---

#### 2.1.4. Excel & PDF Export for Orders

- **Assigned Developer:** Hozaifa
- **Objective:** **Allow users to export order data to Excel and generate a PDF Purchase Order for individual orders.**
- **Priority:** P2 (Medium, still part of MVP 14‑day plan)
- **Key Files:**
  - `apps/orders/utils/export.py` (new)
  - `apps/orders/views.py` (new export endpoints)
  - `frontend/src/app/orders/page.tsx`
  - `frontend/src/app/orders/[id]/page.tsx`

- **AI Agent Prompt:**

> "Implement data export functionality for Orders.
>
> Backend:
> - Add an endpoint `/api/v1/orders/export` that returns an `.xlsx` file containing the current filtered set of orders. Use `openpyxl` or a similar library, applying the same filters used by the list endpoint.
> - Add an endpoint `/api/v1/orders/{id}/purchase-order` that generates a PDF Purchase Order using ReportLab or WeasyPrint, including key order metadata and quantities.
>
> Frontend:
> - On `/orders`, add an 'Export to Excel' button that hits the export endpoint with the current filters and downloads the file.
> - On `/orders/[id]`, add a 'Download PO' button that triggers PDF generation and download.
>
> Ensure proper auth and that large exports stream efficiently where possible."

- **Verification Steps:**
  1. Apply filters on `/orders` (e.g., `status=running`) and click 'Export to Excel'. Confirm only the filtered rows are present in the downloaded file.
  2. On an order detail page, click 'Download PO' and verify the PDF contains accurate data and renders correctly.

---

### 2.2. Track B – Fariha: Samples, Financials, Production, Shipments & Analytics (MVP)

> **Branch suggestion:** `feature/mvp-track-b-fariha-modules-analytics`

All tasks in this subsection are owned by **Fariha**. Focus on Samples, Financials, new modules (Production, Shipments), and dashboard analytics. Avoid modifying Orders filters/exports or alerts widgets owned by Track A, beyond necessary wiring.

#### 2.2.1. Samples Module Completion (Types, File Upload, Delete)

- **Assigned Developer:** Fariha
- **Current Status & Contradictions:**
  - Backend `apps/samples` app exists with `Sample` model, serializer, viewset, and URLs.
  - Frontend `/samples` page lists and creates samples against orders using `/api/v1/samples`.
  - **Type mismatch:** Backend `Sample.TYPE_CHOICES` = `lab_dip`, `strike_off`, `bulk_swatch`, `pp_sample`, but the frontend uses values like `hand_loom`, `presentation`, `pp`. This will cause 400s or inconsistent data.
  - **Missing uploads:** The original roadmap called for photo/file upload per sample. Backend model has no file/image field, and the frontend has unused `file` state without any upload UI or API integration.
  - **Missing management UI:** There is no edit/delete UI for samples, despite the viewset supporting full CRUD.

- **Objective:** **Align the Samples module end-to-end (types, file upload, management UI) so merchandisers can reliably track and manage sample submissions.**
- **Priority:** P0 (Critical)
- **Key Files to Modify/Create:**
  - `apps/samples/models.py`
  - `apps/samples/serializers.py`
  - `apps/samples/views.py`
  - `frontend/src/app/samples/page.tsx`

- **AI Agent Prompt:**

> "Bring the Samples module to parity with the original Week 1 plan. First, reconcile `Sample.TYPE_CHOICES` with the frontend dropdown so they share a single, consistent set of values (e.g., `lab_dip`, `strike_off`, `bulk_swatch`, `pp_sample`) and update seed/migration data if needed.
>
> Next, add an optional file/image field to the `Sample` model (e.g., `document` or `photo`) and expose it via the serializer. Extend the `SampleViewSet` to support file uploads (multipart/form-data) while keeping JWT auth and role checks intact.
>
> On the frontend, update the `/samples` page to:
> - Include a file input in the 'New Sample' dialog.
> - Send multipart requests to the API.
> - Display an icon/link in the samples table when a file exists, allowing users to open/download it.
>
> Finally, add simple 'Delete' (and optional 'Edit') actions per row that call the existing DRF endpoints and refresh the list using the shared Axios client in `lib/api.ts`. Keep the UI style consistent with existing Shadcn components."

- **Verification Steps:**
  1. Open `/samples` and create a new sample using only backend-supported `type` values. Confirm the request succeeds (no 400 on `type`).
  2. Attach a small image/PDF when creating a sample. Confirm:
     - The file is stored (visible via Django Admin or the API response).
     - The frontend shows an icon/link, and clicking it opens/downloads the file.
  3. Use the new Delete action to remove a sample and verify it disappears from the table and from the backend.

---

#### 2.2.2. Financials UX & Workflow Completion

- **Assigned Developer:** Fariha
- **Current Status & Contradictions:**
  - Backend `apps/financials` is implemented with `ProformaInvoice` and `LetterOfCredit` models, serializers, and viewsets. PI/LC numbers are auto-generated.
  - Frontend `/financials` page lists PIs and LCs and allows creating them via dialogs.
  - **Missing features vs. original plan:** No edit/status-change UI, no pagination, and limited visibility of status workflows.

- **Objective:** **Expose the full lifecycle of PIs and LCs to users, including status updates, basic editing, and clearer list-level information.**
- **Priority:** P0 (Critical)
- **Key Files to Modify:**
  - `frontend/src/app/financials/page.tsx`
  - (Optional small adjustments) `apps/financials/views.py`, `apps/financials/serializers.py`

- **AI Agent Prompt:**

> "Enhance the Financials page so merchandisers can manage the full lifecycle of Proforma Invoices (PI) and Letters of Credit (LC).
>
> On the frontend, extend `/financials` to:
> - Add inline or dialog-based controls to change PI/LC status (e.g., Draft → Sent → Confirmed, Pending → Issued → Confirmed/Expired) using PATCH/PUT requests.
> - Allow editing key non-identifier fields (e.g., amount, dates, issuing_bank) with proper validation and optimistic UI where reasonable.
> - Optionally add client-side pagination or simple 'Load more' if the list grows large.
>
> On the backend, ensure the viewsets accept partial updates for the fields exposed by the UI while preserving:
> - Auto-generated identifiers (`pi_number`, `lc_number`).
> - Role-based queryset filtering already in place.
>
> Keep the UX consistent with existing button and dialog styles, and surface all API success/errors using the shared toast system."

- **Verification Steps:**
  1. From `/financials`, update a PI status from `draft` to `sent` and confirm the change persists after reload.
  2. Edit an LC's `issuingBank` and verify the updated value is visible in the list and via the API.
  3. Confirm that invalid updates (e.g., negative amount) show a clear error toast and do not corrupt data.

---

#### 2.2.3. Production Tracking Module (Backend + Frontend)

- **Assigned Developer:** Fariha
- **Objective:** **Enable granular tracking of daily production metrics (knitted, dyed, finished) against order targets.**
- **Priority:** P0 (Critical)
- **Key Files:**
  - `apps/production/models.py`, `views.py`, `serializers.py`, `urls.py`
  - `frontend/src/app/production/page.tsx`

- **AI Agent Prompt:**

> "Build the complete Production module.
>
> Backend (Django + DRF):
> - Create a `ProductionMetric` model linked to `Order` with fields like `date`, `knitted_meters`, `dyed_meters`, `finished_meters` and timestamps.
> - Expose CRUD endpoints via a viewset with role-based access (similar to orders).
> - Add an aggregate endpoint that, for a given order, returns daily data plus totals and percentage progress vs. the order quantity.
>
> Frontend (Next.js):
> - Implement a `/production` page where users can:
>   - Select an order.
>   - Enter daily production figures via a simple grid or table.
>   - View progress bars for Knitting/Dyeing/Finishing using Shadcn/UI components.
> - Use the shared Axios client and Zustand (if needed) to manage state.
>
> Keep the design visually consistent with existing cards and tables and ensure all numbers are formatted clearly."

- **Verification Steps:**
  1. Create an order with quantity `1000` units.
  2. Add production entries totaling `200` knitted, `150` dyed.
  3. Verify the aggregate endpoint reports correct totals and percentage completion.
  4. Confirm the UI progress bars reflect the same percentages.

---

#### 2.2.4. Shipments & Logistics Module

- **Assigned Developer:** Fariha
- **Objective:** **Manage outbound logistics, courier tracking, and shipping documentation linked to orders.**
- **Priority:** P0 (Critical)
- **Key Files:**
  - `apps/shipments/models.py`, `views.py`, `serializers.py`, `urls.py`
  - `frontend/src/app/shipments/page.tsx`

- **AI Agent Prompt:**

> "Implement the Shipments module.
>
> Backend:
> - Create a `Shipment` model linked to `Order` with fields such as `carrier_name`, `awb_number`, `shipping_date`, `status` (e.g., Pending, In Transit, Delivered), and optional notes.
> - Support uploading shipping documents (e.g., Packing List, BL) via a FileField and DRF endpoints.
>
> Frontend:
> - Add a `/shipments` page listing active and recent shipments with status badges and key fields.
> - Provide a 'New Shipment' dialog to create shipments for an order and attach documents.
> - Include a 'Track / View' action that opens a detail dialog showing shipment info and links to documents.
>
> Reuse patterns from the Orders and Financials UIs where possible."

- **Verification Steps:**
  1. Create a shipment for an existing order with a dummy AWB number.
  2. Upload a PDF packing list and ensure it can be downloaded/viewed.
  3. Update the shipment status from Pending → In Transit → Delivered and verify the changes persist and are reflected in the list.

---

#### 2.2.5. Dashboard Visualizations with Recharts

- **Assigned Developer:** Fariha
- **Objective:** **Replace static dashboard KPIs with interactive charts powered by Recharts.**
- **Priority:** P1 (High)
- **Key Files:**
  - `frontend/src/components/dashboard/charts/` (new directory with chart components)
  - `frontend/src/app/dashboard/page.tsx`
  - (If needed) extensions to `apps/core/views.dashboard_view` or a dedicated stats endpoint.

- **AI Agent Prompt:**

> "Transform the Dashboard into a visual command center using Recharts.
>
> Implement reusable chart components:
> 1. **Orders by Stage (PieChart):** Uses backend `byStage` data.
> 2. **Merchandiser Workload (BarChart):** Orders per merchandiser (extend backend to expose this if not already available).
> 3. **Monthly Trends (LineChart):** Order creation volume over the last 6 months.
>
> Wire these components into `/dashboard`, consuming either the existing dashboard endpoint or a new stats endpoint. Ensure charts are responsive, themed consistently with the app, and handle empty states gracefully."

- **Verification Steps:**
  1. Seed the database with orders in different stages and merchandisers.
  2. Load `/dashboard` and confirm each chart reflects the underlying data accurately.
  3. Hover over chart segments/points and verify tooltips show correct labels and counts.

---

#### 2.2.6. Financial Analytics & Dashboard Polish

- **Assigned Developer:** Fariha
- **Objective:** **Provide financial insights (pipeline vs. secured value) and polish core dashboard UX.**
- **Priority:** P1 (High)
- **Key Files:**
  - `frontend/src/components/dashboard/financial-charts.tsx`
  - `apps/financials/views.py` (analytics endpoint)
  - `frontend/src/app/dashboard/page.tsx`

- **AI Agent Prompt:**

> "Implement financial analytics and dashboard polish.
>
> Backend:
> - Add an analytics endpoint that computes revenue pipeline metrics based on orders and financial documents (e.g., potential value from upcoming orders vs. secured value from running/completed orders and confirmed LCs).
>
> Frontend:
> - Build a FinancialCharts component visualizing this pipeline (e.g., stacked bar or area chart) and integrate it into `/dashboard`.
> - Add a 'Pending LCs' widget or section fed by the financials API.
> - Perform a UX polish pass on loading states, error handling, and mobile responsiveness for dashboard and main tables.
>
> Keep all visualizations consistent with the existing color palette and typography."

- **Verification Steps:**
  1. Seed test data with upcoming, running, and completed orders plus PIs/LCs.
  2. Confirm the financial chart values match backend-calculated totals (e.g., `prova_price * quantity`).
  3. Check the dashboard on a narrow viewport and ensure components remain usable (no layout breakage).

---

## 5. Post-MVP Foundations (Notifications & Audit)

These are future-facing but important for long-term robustness.

### 5.1. Real-time Notifications

- **Objective:** **Alert users to critical events without manual refreshes (post-MVP).**
- **Priority:** P2 (Future)
- **Key Files:**
  - `apps/notifications/` (new app)
  - `frontend/src/components/notifications-bell.tsx`

- **AI Agent Prompt:**

> "Implement an application-level notification system.
>
> Backend:
> - Create a `Notification` model and a small service abstraction to emit notifications on key events (e.g., order status change, approval rejected, shipment delivered).
> - Provide a read-only API for fetching unread notifications for the current user.
>
> Frontend:
> - Add a Notifications Bell component to the main layout.
> - When clicked, show a dropdown of recent/unread notifications with clear visual emphasis on new items.
> - Poll periodically (e.g., every 60 seconds) or integrate WebSockets if infrastructure permits.
>
> Design with extensibility in mind so more event types can be added without breaking the API contract."

- **Verification Steps:**
  1. Trigger a test event (e.g., change an order stage or reject an approval).
  2. Confirm a new notification appears via the API and in the bell dropdown.
  3. Mark it as read and ensure it disappears or is visually downgraded.

---

### 5.2. Audit Logging

- **Objective:** **Maintain a secure audit trail of state-changing actions for compliance.**
- **Priority:** P2 (Future)
- **Key Files:**
  - `apps/audit/models.py`
  - `apps/audit/middleware.py` or DRF hooks

- **AI Agent Prompt:**

> "Build a minimal but robust audit logging system.
>
> Backend:
> - Create an `AuditLog` model capturing `user_id`, `action`, `endpoint`, `timestamp`, and a sanitized payload for POST/PUT/PATCH/DELETE requests.
> - Implement middleware or DRF signals to automatically record entries on state-changing requests, excluding or masking sensitive fields.
> - Add an admin-only API or Django Admin view to browse logs with filters.
>
> Ensure the logging overhead is small and failures in logging do not break the main request flow."

- **Verification Steps:**
  1. Perform a state-changing action (e.g., update an order) as a normal user.
  2. As an admin, inspect the audit log and confirm an entry was created with the right user, endpoint, and timestamp.
  3. Verify sensitive data (e.g., passwords, tokens) is not stored in raw form.
