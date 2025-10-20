# Provabook Frontend

Next.js 14 application for Provabook textile operations management platform.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
cp .env.example .env.local
```

### Configuration

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Running

```bash
npm run dev
```

Frontend: `http://localhost:3001`

## Demo Login

- **Admin**: admin@provabook.com / Admin@123
- **Merchandiser**: merchandiser@provabook.com / Merchandiser@123

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Shadcn/UI
- React Query
- Zustand
- Axios

## Features

- Dashboard with KPIs
- Order management
- Sample tracking
- Financial management (PI/LC)
- Production metrics
- Incident reporting
- Shipment tracking
- Notifications

## Project Structure

```
src/
├── app/              # Pages (App Router)
├── components/       # React components
│   ├── layout/      # Layout components
│   └── ui/          # Shadcn UI components
├── lib/             # Utilities
└── store/           # State management
```
