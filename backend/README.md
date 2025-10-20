# Provabook Backend

NestJS REST API for Provabook textile operations management platform.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

```bash
npm install
cp .env.example .env
```

Edit `.env` with your Supabase credentials.

### Database Setup

```bash
npm run migration:run
npm run seed
```

### Running

```bash
npm run start:dev
```

API: `http://localhost:3000`
Docs: `http://localhost:3000/api/docs`

## Demo Credentials

- Admin: admin@provabook.com / Admin@123
- Manager: manager@provabook.com / Manager@123
- Merchandiser: merchandiser@provabook.com / Merchandiser@123
