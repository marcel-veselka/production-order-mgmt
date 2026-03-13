# Factory MES — Production Order Management

A full-stack demo web application for managing production orders in a manufacturing environment. Built as a test target for AI-powered testing agents.

## Tech Stack

- **Frontend:** React 18 + Vite, Recharts, React Router
- **Backend:** Express.js, in-memory data store
- **Deployment:** Docker (single container, port 3333)
- **Auth:** Bearer token (base64-encoded user ID), 3 roles: Admin, Supervisor, Operator

## Quick Start

```bash
docker compose up -d
# App available at http://localhost:3333
```

Use the demo login buttons on the login page (Admin / Supervisor / Operator).

## Features

- **Dashboard** — KPI cards, bar chart (Daily Production Output), recent orders, activity feed
- **Orders** — CRUD with 3-step creation wizard, search, filter, sort, pagination, bulk select, CSV export
- **Workflows** — Kanban board with drag-and-drop, role-based state machine (Draft → Submitted → Approved → In Production → Quality Check → Completed, with Quality Hold branch)
- **Settings** — Admin-only CRUD for Users, Production Lines, Products
- **Role-Based Access** — Admin (full), Supervisor (approve/reject), Operator (submit/complete production)

## Seed Data

- 5 users, 6 products, 4 production lines, 15 orders across various statuses

## Test Suite

250 functional test cases in [`openspec/test-plan.md`](openspec/test-plan.md) covering:

| Feature Area | TC Range | Count |
|---|---|---|
| Auth | TC001–TC030 | 30 |
| Dashboard | TC031–TC055 | 25 |
| Orders | TC056–TC125 | 70 |
| Workflows (Kanban) | TC126–TC190 | 65 |
| Settings | TC191–TC230 | 40 |
| Cross-cutting / Nav | TC231–TC250 | 20 |

Test results from automated runs are in [`test-results/`](test-results/).

## Project Structure

```
├── backend/src/          # Express API (routes, middleware, seed data)
├── frontend/src/         # React app (pages, components, context)
├── openspec/             # Specifications and test plan
│   ├── specs/            # Feature specs (auth, dashboard, orders, etc.)
│   ├── changes/          # Change log
│   └── test-plan.md      # 250 test cases with status and duration
├── test-results/         # JSON results from automated test runs
├── Dockerfile            # Multi-stage build (frontend + backend)
└── docker-compose.yml    # Docker Compose (port 3333)
```

## License

MIT
