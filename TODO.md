# Farm Management App - Development Progress

## Project Overview
Multi-tenant SaaS platform for farm management with:
- Interactive 2D farm visualization (Konva.js)
- Inventory & product management
- Employee scheduling & time tracking
- Financial projections & budgeting
- SOPs & internal wiki (TipTap)
- Seasonal farm planning

**Tech Stack:** React + Vite + Tailwind | Fastify + Prisma | PostgreSQL | Clerk Auth

---

## Completed

### Phase 0: Foundation
- [x] Monorepo setup (pnpm + Turborepo)
- [x] Shared package with Zod validation schemas (`packages/shared/`)
- [x] Backend scaffold (Fastify + TypeScript)
- [x] Prisma schema with all 25+ models
- [x] Frontend scaffold (React + Vite + Tailwind)
- [x] Basic farms API routes (`apps/api/src/modules/farms/`)
- [x] Auth plugin (Clerk integration skeleton)
- [x] Tenant middleware (multi-tenancy isolation)
- [x] Git + GitHub repository

---

## In Progress / Next Steps

### Phase 1: Core UI & Auth (Priority: HIGH)

#### 1.1 Install shadcn/ui Components
```bash
cd apps/web
npx shadcn@latest init
npx shadcn@latest add button card input label select textarea dialog dropdown-menu avatar badge separator tabs toast
```

#### 1.2 Create App Shell Layout
Files to create:
- `apps/web/src/components/layout/AppShell.tsx` - Main layout wrapper
- `apps/web/src/components/layout/Sidebar.tsx` - Navigation sidebar
- `apps/web/src/components/layout/Header.tsx` - Top header with user menu
- `apps/web/src/components/layout/FarmSwitcher.tsx` - Dropdown to switch farms

#### 1.3 Set Up Clerk Authentication
1. Create Clerk account at https://clerk.com
2. Get API keys and add to `.env`:
   - `VITE_CLERK_PUBLISHABLE_KEY` (frontend)
   - `CLERK_SECRET_KEY` (backend)
3. Wrap app with `<ClerkProvider>`
4. Add `<SignIn>` and `<SignUp>` pages
5. Implement user sync webhook in backend

#### 1.4 Create Core Pages
- `apps/web/src/pages/SignIn.tsx`
- `apps/web/src/pages/SignUp.tsx`
- `apps/web/src/pages/farms/FarmList.tsx`
- `apps/web/src/pages/farms/FarmSettings.tsx`
- `apps/web/src/pages/farms/FarmLayout.tsx` (canvas page)

---

### Phase 2: Farm Visualization Canvas (Priority: HIGH)

#### 2.1 Konva Canvas Setup
Files to create:
- `apps/web/src/components/farm-canvas/FarmCanvas.tsx` - Main canvas component
- `apps/web/src/components/farm-canvas/CanvasToolbar.tsx` - Tool selection
- `apps/web/src/components/farm-canvas/ZoneShape.tsx` - Zone rendering
- `apps/web/src/components/farm-canvas/MachineIcon.tsx` - Machine icons
- `apps/web/src/components/farm-canvas/PropertiesPanel.tsx` - Edit selected item
- `apps/web/src/stores/canvas-store.ts` - Zustand store for canvas state

#### 2.2 Canvas Features to Implement
- [ ] Pan and zoom controls
- [ ] Grid overlay with snap-to-grid
- [ ] Draw rectangle zones
- [ ] Drag and resize zones
- [ ] Zone color picker
- [ ] Add machine icons to zones
- [ ] Save/load canvas state to API
- [ ] Undo/redo functionality

---

### Phase 3: Inventory Management (Priority: MEDIUM)

#### 3.1 API Endpoints
Add to `apps/api/src/modules/`:
- `inventory/inventory.routes.ts`
- `products/products.routes.ts`

Endpoints needed:
- `GET/POST /farms/:farmId/products`
- `GET/PATCH/DELETE /farms/:farmId/products/:id`
- `GET/POST /farms/:farmId/inventory`
- `POST /farms/:farmId/inventory/:id/transactions`

#### 3.2 Frontend Pages
- `apps/web/src/pages/inventory/ProductList.tsx`
- `apps/web/src/pages/inventory/ProductForm.tsx`
- `apps/web/src/pages/inventory/StockLevels.tsx`
- `apps/web/src/pages/inventory/TransactionHistory.tsx`

---

### Phase 4: Employee Management (Priority: MEDIUM)

#### 4.1 API Endpoints
- `GET/POST /farms/:farmId/employees`
- `GET/PATCH/DELETE /farms/:farmId/employees/:id`
- `GET/POST /farms/:farmId/employees/:id/shifts`
- `POST /farms/:farmId/employees/:id/clock-in`
- `POST /farms/:farmId/employees/:id/clock-out`

#### 4.2 Frontend Pages
- `apps/web/src/pages/employees/EmployeeList.tsx`
- `apps/web/src/pages/employees/EmployeeForm.tsx`
- `apps/web/src/pages/employees/Schedule.tsx` (use @fullcalendar/react)
- `apps/web/src/pages/employees/TimeTracking.tsx`

---

### Phase 5: Wiki/SOPs (Priority: MEDIUM)

#### 5.1 API Endpoints
- `GET/POST /farms/:farmId/wiki/spaces`
- `GET/POST /farms/:farmId/wiki/spaces/:spaceId/pages`
- `GET/PATCH /farms/:farmId/wiki/pages/:pageId`
- `GET /farms/:farmId/wiki/search?q=`

#### 5.2 Frontend Pages
- `apps/web/src/pages/wiki/WikiHome.tsx`
- `apps/web/src/pages/wiki/WikiPage.tsx`
- `apps/web/src/pages/wiki/WikiEditor.tsx` (use TipTap)

Install TipTap:
```bash
cd apps/web
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder
```

---

### Phase 6: Financial Projections (Priority: LOW)

#### 6.1 API Endpoints
- `GET/POST /farms/:farmId/accounts`
- `GET/POST /farms/:farmId/transactions`
- `GET/POST /farms/:farmId/budgets`
- `GET /farms/:farmId/reports/profit-loss`
- `GET /farms/:farmId/reports/cash-flow`

#### 6.2 Frontend Pages
- `apps/web/src/pages/financials/Dashboard.tsx`
- `apps/web/src/pages/financials/Transactions.tsx`
- `apps/web/src/pages/financials/Budgets.tsx`
- `apps/web/src/pages/financials/Reports.tsx` (use Recharts)

---

### Phase 7: Farm Planning (Priority: LOW)

#### 7.1 API Endpoints
- `GET/POST /farms/:farmId/seasons`
- `GET/POST /farms/:farmId/seasons/:seasonId/crop-plans`
- `GET/POST /farms/:farmId/tasks`
- `GET /farms/:farmId/calendar`

#### 7.2 Frontend Pages
- `apps/web/src/pages/planning/Seasons.tsx`
- `apps/web/src/pages/planning/CropPlans.tsx`
- `apps/web/src/pages/planning/Tasks.tsx`
- `apps/web/src/pages/planning/Calendar.tsx` (use @fullcalendar/react)

---

## File Structure Reference

```
apps/
├── api/
│   ├── prisma/schema.prisma     # Database schema (DONE)
│   └── src/
│       ├── server.ts            # Entry point (DONE)
│       ├── lib/
│       │   ├── prisma.ts        # DB client (DONE)
│       │   └── errors.ts        # Error handling (DONE)
│       ├── plugins/
│       │   ├── auth.ts          # Clerk auth (DONE)
│       │   ├── prisma.ts        # Prisma plugin (DONE)
│       │   └── tenant.ts        # Multi-tenancy (DONE)
│       └── modules/
│           ├── farms/           # Farm routes (DONE)
│           ├── zones/           # TODO
│           ├── inventory/       # TODO
│           ├── employees/       # TODO
│           ├── financials/      # TODO
│           ├── wiki/            # TODO
│           └── planning/        # TODO
│
├── web/
│   └── src/
│       ├── main.tsx             # Entry point (DONE)
│       ├── App.tsx              # Router (DONE)
│       ├── index.css            # Tailwind (DONE)
│       ├── components/
│       │   ├── ui/              # shadcn components (TODO)
│       │   ├── layout/          # App shell (TODO)
│       │   └── farm-canvas/     # Konva canvas (TODO)
│       ├── pages/
│       │   └── Dashboard.tsx    # Placeholder (DONE)
│       ├── stores/              # Zustand stores (TODO)
│       ├── hooks/               # Custom hooks (TODO)
│       └── lib/
│           └── api-client.ts    # TanStack Query hooks (TODO)
│
└── packages/shared/             # Zod schemas (DONE)
```

---

## Quick Commands

```bash
# Install all dependencies
pnpm install

# Start development (frontend + backend)
pnpm dev

# Database commands
pnpm db:generate    # Generate Prisma client
pnpm db:push        # Push schema to database
pnpm db:migrate     # Create migration
pnpm db:studio      # Open Prisma Studio

# Build for production
pnpm build
```

---

## Environment Variables

### Backend (`apps/api/.env`)
```env
DATABASE_URL="postgresql://..."
CLERK_SECRET_KEY="sk_test_..."
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

### Frontend (`apps/web/.env`)
```env
VITE_CLERK_PUBLISHABLE_KEY="pk_test_..."
VITE_API_URL=http://localhost:3000
```

---

## Notes for Next Developer

1. **Multi-tenancy is critical** - Every query must be scoped to `farmId`. The tenant plugin handles this automatically for routes with `:farmId` param.

2. **Shared schemas** - Always use schemas from `@farm/shared` for validation on both frontend and backend.

3. **Canvas state** - Farm layout is stored as JSON in `FarmLayout.canvasData`. Zones have their own DB records with position data.

4. **Role-based access** - Use `requireRole('MANAGER')` etc. in route preHandlers. Roles: OWNER > MANAGER > EMPLOYEE > VIEWER.

5. **API client pattern** - Use TanStack Query hooks in `apps/web/src/lib/api-client.ts` for all API calls.
