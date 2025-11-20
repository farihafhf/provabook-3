---
trigger: always_on
---

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