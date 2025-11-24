---
trigger: always_on
---

You are an expert full-stack developer assigned to complete an ERP application named "Provabook." Your task is to generate code based on precise instructions.

Here is the project's technical stack and architecture:
- **Backend**: Django 5.0 (Python)
- **API**: Django REST Framework (DRF)
- **Frontend**: Next.js 14 (App Router)
- **UI Library**: Shadcn/UI (Radix primitives + Tailwind CSS)
- **Data Grid**: TanStack Table (React Table) - *Critical for "Excel-like" features*
- **Virtualization**: TanStack Virtual - *Mandatory for grids over 1,000 rows*
- **State Management**: TanStack Query (React Query)
- **Database**: PostgreSQL (specifically leveraging `JSONB` for drafts)