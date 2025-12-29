# FarmOS - Farm Management Application

A comprehensive multi-tenant farm management platform with interactive 2D visualization, inventory tracking, employee management, and more.

## Features

- **Interactive Farm Layout** - 2D canvas with drag-and-drop zone management (Konva.js)
- **Zone Management** - Create and manage farm zones (fields, greenhouses, storage, etc.)
- **Inventory Tracking** - Products, stock levels, and seed weights
- **Employee Management** - Staff records, scheduling, and time tracking
- **Planning & Tasks** - Seasonal crop planning and task management
- **Financial Projections** - Budgets, transactions, and P&L reports
- **Wiki/SOPs** - Internal documentation with rich text editor

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Fastify + TypeScript + Prisma
- **Database**: SQLite (development) / PostgreSQL (production)
- **State Management**: TanStack Query + Zustand
- **Canvas**: Konva.js (react-konva)
- **Validation**: Zod (shared schemas)
- **Monorepo**: pnpm workspaces + Turborepo

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [pnpm](https://pnpm.io/) v8 or higher

```bash
# Install pnpm globally if you don't have it
npm install -g pnpm
```

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/farm-management-app.git
   cd farm-management-app
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up the database**
   ```bash
   cd apps/api
   pnpm prisma generate
   pnpm prisma db push
   ```

4. **Seed the database with demo data**
   ```bash
   pnpm prisma db seed
   ```

5. **Return to root directory**
   ```bash
   cd ../..
   ```

## Running the Application

### Development Mode

Start both the API and web servers:

```bash
# From the root directory
pnpm dev
```

Or run them separately:

```bash
# Terminal 1 - API server (with auth disabled for development)
cd apps/api
SKIP_AUTH=true pnpm dev
# API runs at http://localhost:3000

# Terminal 2 - Web frontend
cd apps/web
pnpm dev
# Frontend runs at http://localhost:5173
```

### Windows Users

On Windows, set the environment variable differently:

```bash
# PowerShell
$env:SKIP_AUTH="true"; pnpm dev

# Command Prompt
set SKIP_AUTH=true && pnpm dev

# Git Bash
SKIP_AUTH=true pnpm dev
```

## Project Structure

```
farm-management-app/
├── apps/
│   ├── api/                 # Fastify backend
│   │   ├── prisma/          # Database schema & migrations
│   │   └── src/
│   │       ├── modules/     # Route handlers
│   │       ├── plugins/     # Fastify plugins
│   │       └── lib/         # Utilities
│   └── web/                 # React frontend
│       └── src/
│           ├── components/  # UI components
│           ├── pages/       # Route pages
│           ├── stores/      # Zustand stores
│           └── lib/         # API client & utilities
├── packages/
│   └── shared/              # Shared Zod schemas & types
├── package.json             # Root package.json
├── pnpm-workspace.yaml      # Workspace configuration
└── turbo.json               # Turborepo configuration
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/farms` | List user's farms |
| POST | `/api/v1/farms` | Create a new farm |
| GET | `/api/v1/farms/:farmId` | Get farm details |
| PATCH | `/api/v1/farms/:farmId` | Update farm |
| DELETE | `/api/v1/farms/:farmId` | Delete farm |
| GET | `/api/v1/farms/:farmId/layout` | Get farm layout |
| PUT | `/api/v1/farms/:farmId/layout` | Update farm layout |
| GET | `/api/v1/farms/:farmId/zones` | List farm zones |

## Demo Data

The seed script creates:
- **Green Valley Farm** - A demo farm
- **5 Zones** - North Field, Greenhouse A, Equipment Shed, Storage Barn, Processing Area
- **Sample Products** - Tomato Seeds, Fertilizer, Irrigation Hose
- **Sample Employees** - John Smith, Sarah Johnson

## Development Notes

### Authentication

Authentication is handled by Clerk in production. For local development, set `SKIP_AUTH=true` to bypass authentication and use a demo user.

### Database

- Development uses SQLite (`apps/api/prisma/dev.db`)
- For production, update `DATABASE_URL` in `.env` to use PostgreSQL

### Adding New Features

1. Add Zod schemas to `packages/shared/src/schemas/`
2. Export from `packages/shared/src/index.ts`
3. Create API routes in `apps/api/src/modules/`
4. Add TanStack Query hooks in `apps/web/src/lib/api-client.ts`
5. Create UI components in `apps/web/src/components/`

## Scripts

```bash
# Development
pnpm dev          # Start all apps in development mode
pnpm build        # Build all apps
pnpm lint         # Lint all packages

# Database (from apps/api)
pnpm prisma studio    # Open Prisma Studio GUI
pnpm prisma generate  # Generate Prisma client
pnpm prisma db push   # Push schema to database
pnpm prisma db seed   # Seed database with demo data
```

## Contributing

See `TODO.md` for the list of features that need to be implemented.

## License

MIT
