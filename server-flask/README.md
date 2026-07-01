# TileVision Flask API

Python/Flask backend — same endpoints as the mobile app expects.

## Stack

- **Flask** — HTTP API
- **PyJWT** — JWT auth
- **bcrypt** — passwords
- **PyMySQL** — MySQL (same `tilevision` database)
- **python-dotenv** — reads `../.env`

## Run

```bash
# Install deps (once)
npm run api:install

# Start API
npm run api:dev
```

## Structure

```
server-flask/
├── app.py              # Entry point
├── config.py           # .env settings
├── database.py         # MySQL connection + schema
├── jwt_utils.py        # Sign / verify tokens
├── permissions.py      # RBAC
├── repositories.py     # DB queries
├── auth_middleware.py  # @authenticate, @require_permission
└── routes/
    ├── auth.py
    └── inspections.py
```

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | No |
| POST | `/api/auth/login` | No |
| GET | `/api/auth/me` | JWT |
| GET | `/api/inspections` | JWT |
| POST | `/api/inspections` | JWT + submit_inspection |
| PATCH | `/api/inspections/:id/qa` | JWT + QA permissions |

## Old Node server

Still available as fallback:

```bash
npm run api:dev:node
```
