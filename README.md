# corridasderua

Sistema web MVP para gerenciamento de corridas de rua com duas áreas:
- **Área da Empresa/Organizador**: gestão de eventos, categorias, inscrições, check-in, bibs, painel ao vivo e relatórios.
- **Área do Corredor**: inscrição e painel pessoal com colocação geral/categoria, tempo bruto, tempo líquido e splits por km.

## Stack

- **Backend**: Node.js 20, Express, TypeScript, Prisma, PostgreSQL, JWT, Zod, Socket.IO, Stripe, PDFKit, Jest/Supertest
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, React Router, Axios, Socket.IO Client, React Hook Form + Zod
- **Infra**: Docker + Docker Compose, Redis, PostgreSQL 16

## Como rodar localmente

```bash
cp .env.example .env
docker-compose up --build
```

## URLs

- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## Credenciais do seed

- Admin: `admin@corridasderua.com` / `admin123`
- Corredor: `corredor@teste.com` / `123456`

## Endpoints principais (exemplos)

### Auth

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Novo Corredor","email":"novo@teste.com","password":"123456","birthDate":"1990-01-01"}'

curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@corridasderua.com","password":"admin123"}'
```

### Events/Categories

```bash
curl http://localhost:3000/events
curl http://localhost:3000/events/<eventId>
curl http://localhost:3000/events/<eventId>/categories
```

### Registration

```bash
curl -X POST http://localhost:3000/events/<eventId>/register \
  -H "Authorization: Bearer <token_corredor>" \
  -H "Content-Type: application/json" \
  -d '{"categoryId":"<categoryId>"}'
```

### Results

```bash
curl http://localhost:3000/events/<eventId>/results
curl http://localhost:3000/results/<registrationId>
curl http://localhost:3000/results/<registrationId>/certificate
```

## Como simular webhook de timing

```bash
curl -X POST http://localhost:3000/timing/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "chip_id":"chip-001",
    "bib_number":1,
    "timestamp":"2026-01-01T07:04:30Z",
    "checkpoint_id":"<checkpointId>"
  }'
```

## Como simular webhook de pagamento (Stripe)

```bash
stripe listen --forward-to localhost:3000/payments/webhook
```

Ou em desenvolvimento (mock):

```bash
curl -X POST http://localhost:3000/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{"registrationId":"<registrationId>","transactionId":"mock_tx_123"}'
```

## Testes

```bash
cd backend
npm test
```

## Estrutura de pastas

```text
/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   ├── middlewares/
│   │   ├── utils/
│   │   ├── prisma/
│   │   └── server.ts
│   ├── prisma/schema.prisma
│   ├── tests/
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/public/
│   │   ├── pages/runner/
│   │   ├── pages/admin/
│   │   ├── components/
│   │   ├── services/
│   │   └── contexts/
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```
