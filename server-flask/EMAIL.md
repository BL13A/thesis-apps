# Password Reset Email Setup

## Flow

1. User taps **Forgot password?** → enters email
2. Email sent with **Reset Password** button (link)
3. Link opens **reset page** → user sets new password
4. Or opens **TileVision app** via deep link: `tilevision://reset-password?token=...`

## Gmail `.env`

```env
SMTP_USER=noreply.tilevision@gmail.com
SMTP_PASSWORD=your_gmail_app_password
SMTP_FROM_EMAIL=noreply.tilevision@gmail.com
RESET_PASSWORD_URL=http://localhost:3000/reset-password
```

For phone testing on LAN, use your PC IP:
```env
RESET_PASSWORD_URL=http://192.168.8.124:3000/reset-password
```

## Test

```bash
npm run smtp:test
npm run api:dev
```

Then use Forgot password in the app.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/forgot-password` | Send reset email |
| GET | `/reset-password?token=...` | Web reset page |
| GET | `/api/auth/validate-reset-token` | Check token (app) |
| POST | `/api/auth/reset-password` | `{ token, newPassword }` |
