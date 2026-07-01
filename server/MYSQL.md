# MySQL Setup (no Docker)

## 1. Install MySQL Server

1. Download **MySQL Community Server**: https://dev.mysql.com/downloads/mysql/
2. Run installer → choose **Developer Default** or **Server only**
3. Set root password (remember this!)
4. Keep port **3306**

## 2. Install MySQL Workbench

Download: https://dev.mysql.com/downloads/workbench/

## 3. Connect in Workbench

| Field | Value |
|-------|-------|
| Host | `127.0.0.1` |
| Port | `3306` |
| User | `root` |
| Password | your MySQL root password |

Click **Test Connection** → **OK**

## 4. Create database (optional)

The API auto-creates `tilevision` on startup. Or run manually in Workbench:

Open `server/src/db/schema.sql` → execute all (⚡ lightning button).

## 5. Configure `.env`

In `TileVision-Mobile/.env`:

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password_here
MYSQL_DATABASE=tilevision
```

## 6. Start API

```bash
npm run api:dev
```

## 7. View data in Workbench

1. Connect to local instance
2. Schemas → `tilevision` → Tables
3. Right-click `users` or `inspections` → **Select Rows**

## Demo accounts

| Email | Password |
|-------|----------|
| rafael.benavidez@tilevision.com | password123 |
| qa@tilevision.com | password123 |
