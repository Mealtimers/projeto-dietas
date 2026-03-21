# Sistema de Dietas Personalizadas

Web system for managing personalized diets, generating daily meal plans, and controlling production orders.

## Stack

- **Backend**: Node.js + Express + Prisma ORM
- **Frontend**: React 18 + Vite + React Router
- **Database**: PostgreSQL 16

## Quick Start

### 1. Start the database

```bash
docker compose up -d
```

### 2. Backend setup

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
node prisma/seed.js
npm run dev
```

Backend runs on http://localhost:3001

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173

## Workflow

1. **Clientes** — Register clients with personal data and goals
2. **Dietas** — Create diets per client with meal models, food restrictions and ingredient substitutions
3. **Pedidos** — Create diet orders specifying the date range
4. **Gerar Cardápio** — System auto-generates daily meal plan respecting `totalRefeicoesDia` and `maxRepeticoesSemana`
5. **Aprovação** — Send generated plan to client for approval/rejection
6. **Ordem de Produção** — After approval, generate production order with consolidated ingredient list
7. **Produção** — Track production order status through to completion

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | /api/clientes | List / create clients |
| GET/PUT/DELETE | /api/clientes/:id | Get / update / delete client |
| GET/POST | /api/dietas | List / create diets |
| GET/PUT/DELETE | /api/dietas/:id | Get / update / delete diet |
| POST | /api/dietas/:id/restricoes | Add food restriction |
| POST | /api/dietas/:id/substituicoes | Add ingredient substitution |
| POST | /api/dietas/:id/refeicoes | Create meal model with ingredients |
| GET/POST | /api/pedidos | List / create orders |
| POST | /api/pedidos/:id/gerar | Generate meal plan |
| GET | /api/pedidos/:id/cardapio | Get plan organized by day |
| POST | /api/aprovacoes/:pedidoId | Approve or reject an order |
| POST | /api/ordens-producao/:pedidoId | Generate production order |
| PUT | /api/ordens-producao/:id/status | Update production status |

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and adjust if needed:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dietas_db"
PORT=3001
```

## Database Commands

```bash
cd backend
npm run db:migrate      # Run migrations
npm run db:generate     # Regenerate Prisma client
npm run db:seed         # Insert seed data
npm run db:studio       # Open Prisma Studio (GUI)
```
