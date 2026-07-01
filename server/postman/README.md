# TileVision API — Postman

## Files

| File | Purpose |
|------|---------|
| `TileVision-API.postman_collection.json` | Manual testing — all endpoints |
| `TileVision-E2E.postman_collection.json` | Automated tests (run with `npm run api:test`) |
| `TileVision-Local.postman_environment.json` | Local + LAN variables |
| `../openapi.yaml` | OpenAPI spec — import to Postman for docs/sync |

## Quick start

### 1. Start the API

```bash
cd TileVision-Mobile
npm run api:dev
```

### 2. Import to Postman

1. Open Postman → **Import**
2. Import all files in this folder + `server/openapi.yaml`
3. Select environment **TileVision Local** (top-right)

### 3. Manual test

1. **Health → Health Check**
2. **Auth → Login (Warehouse)** — saves `accessToken` automatically
3. **Inspections → List Inspections**

### 4. Automated tests (terminal)

```bash
npm run api:test
```

Runs the full E2E flow: health → login → list → create → QA approve.

## Postman plugin in Cursor

After `/setup` (connect Postman account), you can use:

| Command | What it does |
|---------|----------------|
| `/sync` | Push `openapi.yaml` or collections to Postman cloud |
| `/test` | Run collection tests and diagnose failures |
| `/docs` | Generate or improve API documentation |
| `/mock` | Create a mock server for frontend dev |
| `/security` | OWASP API security audit |

## Phone / LAN

Set `baseUrl` in environment to your PC IP:

```
http://192.168.8.124:3000
```

Same value in `.env`:

```
EXPO_PUBLIC_API_URL=http://192.168.8.124:3000
```

## Demo accounts

| Email | Password | Role |
|-------|----------|------|
| rafael.benavidez@tilevision.com | password123 | Warehouse |
| qa@tilevision.com | password123 | QA Officer |
