# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (run from `backend/`)
```bash
npm run dev           # Start backend in dev mode (nodemon, port 3001)
npm run db:migrate    # Run Prisma migrations
npm run db:generate   # Regenerate Prisma client after schema changes
npm run db:seed       # Insert seed data
npm run db:studio     # Open Prisma Studio GUI
```

### Frontend (run from `frontend/`)
```bash
npm run dev           # Start Vite dev server (port 5173, proxies /api to :3001)
npm run build         # Production build
```

### Database
```bash
docker compose up -d  # Start PostgreSQL on port 5432 (db: dietas_db, user/pass: postgres)
```

## Architecture

```
projeto-dietas/
├── backend/
│   ├── prisma/schema.prisma     # Database schema (single source of truth)
│   ├── prisma/seed.js           # Seed data for development
│   └── src/
│       ├── app.js               # Express entry point
│       ├── lib/prisma.js        # Prisma client singleton
│       ├── routes/index.js      # Registers all route files
│       ├── routes/              # One file per entity: grupos, alimentos, preparos, clientes, pedidos, aprovacoes, ordens
│       ├── controllers/         # HTTP request/response logic
│       ├── services/
│       │   ├── cardapio.service.js       # Dish generation algorithm (gerarCardapio)
│       │   └── ordemProducao.service.js  # Production order consolidation (gerarOrdem)
│       └── middlewares/errorHandler.js
└── frontend/
    └── src/
        ├── App.jsx              # React Router config + Layout wrapper
        ├── services/api.js      # Axios instance (base: /api)
        ├── styles/global.css    # All styles (CSS variables, green theme)
        ├── components/
        │   ├── Layout.jsx       # Sidebar navigation shell
        │   └── StatusBadge.jsx  # Colored badge by status string
        └── pages/               # One folder per domain (clientes, base, pedidos)
```

## Business Flow

`Cliente → Base Alimentar → Pedido → Gerar Cardápio → Aprovação → Ordem de Produção`

1. **Base Alimentar**: Factory configures `GrupoAlimentar` → `AlimentoBase` → `PreparoAlimento`
2. **PedidoDieta** links a cliente with `totalPratos`, `maxRepeticoes`, `gruposPermitidos` (with gramagem), `alimentosProibidos`
3. **`POST /api/pedidos/:id/gerar`** triggers `cardapio.service.js` which generates `PratoPedido` records, each with one `ItemPrato` per group, respecting `maxRepeticoes` and `alimentosProibidos`
4. **AprovacaoCliente** is created when pedido moves to `AGUARDANDO_APROVACAO`; approval moves it to `APROVADO`
5. **`POST /api/ordens-producao/:pedidoId`** consolidates all preparos across all dishes into `OrdemProducao.itensConsolidados` (JSON)

## Key Business Rules (cardapio.service.js)

- For each of N pratos, pick one `PreparoAlimento` from each allowed `GrupoAlimentar`
- Selection sorts by least-used first, respecting `maxRepeticoes` per preparo
- `alimentosProibidos` filters out entire `AlimentoBase` from the pool
- Gramagem comes from `GrupoPedido.gramagem` and is applied uniformly per group per dish

## Database Schema Notes

- All IDs use `cuid()` (strings)
- `GrupoPedido` and `AlimentoProibidoPedido` have compound unique constraints
- `AprovacaoCliente` and `OrdemProducao` are `@unique` on `pedidoId` (one per pedido)
- Cascade deletes: PedidoDieta → GrupoPedido, AlimentoProibidoPedido, PratoPedido → ItemPrato, Aprovacao, OrdemProducao; AlimentoBase → PreparoAlimento
- After any schema change: run `npm run db:migrate` then `npm run db:generate`

## Status Enums

**StatusPedido**: `PENDENTE → GERADO → AGUARDANDO_APROVACAO → APROVADO/REPROVADO → EM_PRODUCAO → CONCLUIDO`

**StatusAprovacao**: `PENDENTE → APROVADO / REPROVADO`

**StatusOrdem**: `PENDENTE → EM_ANDAMENTO → CONCLUIDA / CANCELADA`
