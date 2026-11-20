# ReachInbox — Full-Stack Email Job Scheduler & Dashboard

A production-grade email scheduler service and analytics dashboard built for **ReachInbox (Outbox Labs)**. Designed to reliably schedule and send cold emails at scale using **BullMQ + Redis delayed jobs (strictly no cron jobs)**, **PostgreSQL (via Prisma ORM)**, **fake SMTP via Ethereal Email**, **Elasticsearch full-text search indexing**, **configurable worker concurrency & throttling**, **sliding-window hourly rate limiting**, and **live Slack alerts on rate-limit hits via Slack OAuth**.

Matches the Figma design (`node-id=59-4050`) with pixel-level fidelity.

---

## 🏗️ Architecture Overview

```mermaid
flowchart TD
    subgraph Frontend["Frontend (React 18 + Vite + Tailwind CSS)"]
        UI["Dashboard & Figma Emerald UI"]
        Compose["Compose Modal & CSV Lead Uploader"]
        SendLater["Send Later Date/Time Picker"]
        SlackModal["Slack Integration & Test Alerts"]
        OAuth["Google OAuth Login"]
    end

    subgraph Backend["Backend (Express + TypeScript)"]
        API["REST API Router (/api)"]
        BullBoard["BullMQ Live Dashboard (/admin/queues)"]
        Reconcile["Restart Job Reconciler"]
    end

    subgraph Storage["Storage & Infrastructure"]
        Postgres[(PostgreSQL / SQLite via Prisma)]
        Redis[(Redis Key-Value & Sorted Sets)]
        ES[(Elasticsearch Cluster)]
    end

    subgraph QueueWorker["BullMQ Worker Engine"]
        Queue["BullMQ Delayed Queue (No Cron)"]
        Worker["Concurrent Workers (N = 5)"]
        Throttler["Inter-Email Delay (e.g. 2s)"]
        RateLimiter["Hourly Rate Limiter (Redis INCR)"]
    end

    subgraph External["External Integrations"]
        SMTP["Ethereal SMTP Server (Fake Email)"]
        SlackAPI["Slack Incoming Webhook / OAuth"]
    end

    UI -->|HTTP / JSON| API
    Compose -->|Multipart / CSV| API
    API -->|Persist Email| Postgres
    API -->|Index Email| ES
    API -->|Add Delayed Job| Queue
    Queue -->|Persist Jobs across Restarts| Redis
    Worker -->|Fetch Job| Queue
    Worker -->|Atomic Rate-Limit Check| Redis
    Worker -->|Throttling Delay Check| Redis
    Worker -->|If Rate Limit Exceeded| Queue
    Worker -->|Send Rate Limit Alert| SlackAPI
    Worker -->|Send Mail & Capture Preview URL| SMTP
    Worker -->|Update Status to SENT| Postgres
    Worker -->|Update Status to SENT| ES
    BullBoard -->|Live Queue Visibility| Redis
```

---

## ✨ Feature Matrix

| Feature | Backend Implementation | Frontend UI / Figma Component |
| :--- | :--- | :--- |
| **Persistent Scheduler (No Cron)** | BullMQ delayed jobs (`{ delay: target - now, jobId: email-${id} }`). Survives server restarts. | `Scheduled` tab showing orange clock badge (`Tue 9:15:12 AM`) with live countdown. |
| **Server Restart Resilience** | Jobs persist in Redis sorted sets. Missed jobs are automatically reconciled on server boot without duplicate sends. | Verified in demo: stop backend, start again, jobs resume seamlessly. |
| **Worker Concurrency** | Configurable BullMQ worker concurrency (`WORKER_CONCURRENCY=5`). | Handled concurrently under load without race conditions. |
| **Inter-Email Delay / Throttling** | Enforces minimum delay between sends per sender via Redis (`lastsend:sender:${email}`). | Configurable input field: `Delay between 2 emails: 02 sec`. |
| **Hourly Rate Limiting** | Redis atomic sliding window (`ratelimit:sender:${email}:${hourWindow}`). Defers jobs to the next hour without dropping. | Configurable input field: `Hourly Limit: 200`. Shows alert status. |
| **Slack Alert on Rate Limit** | Real Slack OAuth authorization flow + webhook fallback. Dispatches formatted Slack Block Kit alert the moment a sender reaches their hourly limit. | Profile dropdown -> Slack Alert status toggle, connection modal, and live test alert trigger. |
| **Fake SMTP with Preview** | Nodemailer with Ethereal SMTP test account. Generates live web preview URLs (`nodemailer.getTestMessageUrl`). | `Sent` list features direct **"Ethereal View"** links to open delivered emails in the browser. |
| **Elasticsearch Search** | Automatic indexing on create and update (`@elastic/elasticsearch`). Full-text multi-match with fuzziness. | Top header search pill with instantaneous Elasticsearch search filter across subjects and bodies. |
| **BullMQ Live Queue Monitor** | `@bull-board/express` mounted at `/admin/queues`. | Accessible via sidebar user profile menu. Inspects Active, Waiting, Delayed, and Completed queues in real-time. |
| **Bulk Lead Upload (CSV / TXT)** | Multer + RFC regex lead extraction engine. Deduplicates and bulk schedules staggered emails. | `↑ Upload List` button in Compose modal with automatic email count badge detection. |
| **Google OAuth Login** | Google Identity Services (`@react-oauth/google`) with backend user creation and avatar support. | Figma Login screen with centered card, Google "G" multicolored button, and email login. |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18+ (tested on Node v20/v24)
- **npm** or **pnpm**
- **Docker & Docker Compose** (for Redis, Postgres, Elasticsearch) *— OR standalone Redis/Postgres*

---

### Step 1: Start Infrastructure (Docker)

Run the included `docker-compose.yml` to launch PostgreSQL, Redis, and Elasticsearch:

```bash
docker compose up -d
```

This starts:
- **PostgreSQL**: `localhost:5432` (`reachinbox:reachinbox_password`)
- **Redis**: `localhost:6379`
- **Elasticsearch**: `localhost:9200`

---

### Step 2: Backend Setup

1. Open a terminal in `backend/`:
   ```bash
   cd backend
   npm install
   ```

2. Review `.env` configuration (pre-configured in `.env.example`):
   ```env
   PORT=5000
   NODE_ENV=development
   DATABASE_URL=postgresql://reachinbox:reachinbox_password@localhost:5432/reachinbox_scheduler?schema=public
   REDIS_HOST=localhost
   REDIS_PORT=6379
   WORKER_CONCURRENCY=5
   MIN_SEND_DELAY_SECONDS=2
   DEFAULT_HOURLY_LIMIT=200
   ELASTICSEARCH_NODE=http://localhost:9200
   SLACK_CLIENT_ID=your_slack_client_id
   SLACK_CLIENT_SECRET=your_slack_client_secret
   SLACK_REDIRECT_URI=http://localhost:5000/api/slack/oauth/callback
   ```

   *(Note: If testing without PostgreSQL, you can effortlessly switch to SQLite by running `node scripts/switch-db.js sqlite`)*.

3. Push database schema:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. Start the backend:
   ```bash
   npm run dev
   ```

   - **API Server**: `http://localhost:5000/api`
   - **BullMQ Live Dashboard**: `http://localhost:5000/admin/queues`

---

### Step 3: Frontend Setup

1. Open a second terminal in `frontend/`:
   ```bash
   cd frontend
   npm install
   ```

2. Start Vite development server:
   ```bash
   npm run dev
   ```

3. Open your browser at **`http://localhost:3000`**.

---

## 📨 Ethereal Email Setup

No manual Ethereal sign-up is required!
On boot, `backend/src/services/mailer.service.ts` auto-generates ephemeral credentials via `nodemailer.createTestAccount()`.
Every email sent through the queue generates a unique `etherealPreviewUrl` (e.g. `https://ethereal.email/message/...`). In the **Sent Emails** tab, click **"Ethereal View"** on any email to open and inspect the rendered message in the Ethereal web viewer.

---

## ⚡ Handling Restarts, Concurrency & Rate Limiting

### 1. Persistence on Server Restarts (Strictly No Cron)
- BullMQ stores delayed jobs directly in Redis sorted sets (`zset`) with execution timestamps as scores.
- Even if the Node.js server or worker process is killed, Redis preserves all pending delayed jobs.
- Upon server reboot, BullMQ automatically resumes listening to the queue. Additionally, `reconcileMissedJobsOnStartup()` scans the database for any scheduled emails and re-enqueues them using their idempotent job IDs (`email-${email.id}`), preventing duplicate sends.

### 2. Delay Between Emails (Inter-email Throttling)
- Provider throttling is enforced via Redis key `lastsend:sender:${senderEmail}`.
- Before firing an email send, the worker computes elapsed time since the previous email from that sender. If elapsed time is less than `delayBetweenEmails` (or `MIN_SEND_DELAY_SECONDS`), the worker throttles execution.

### 3. Hourly Rate Limiting
- Keyed atomically in Redis: `ratelimit:sender:${senderEmail}:${hourWindow}` with a 2-hour TTL.
- When an email is picked up:
  - Worker performs atomic `INCR`.
  - If `count > hourlyLimit`:
    - The job is **NEVER dropped**.
    - It is automatically rescheduled to the start of the next hour window (`nextHour = Date.now() + remainingMillisInHour`).
    - An atomic key `slack_alert:${senderEmail}:${hourWindow}` is checked via `SET NX`. If not yet sent this hour, a live notification is dispatched to Slack.

---

## 🔔 Slack Notification Integration

1. In the dashboard, click the user profile pill (`Oliver Brown`) -> select **"Slack Alert"**.
2. **OAuth Method**: Click **"Connect with Slack OAuth"** to authorize your Slack workspace.
3. **Webhook Method (Instant Testing)**: Paste any Slack Incoming Webhook URL and click **"Save Webhook"**.
4. Click **"Send Live Test Rate-Limit Alert"** to immediately verify live Slack delivery.

---

## 🎬 5-Minute Demo Walkthrough Guide

Follow these steps for the video submission:

1. **Overview & Login**:
   - Open `http://localhost:3000`.
   - Show Google OAuth login or instant login with Oliver Brown persona.
2. **Compose & Bulk Lead Scheduling**:
   - Click **Compose**.
   - Click **"Upload List"** and select `sample-leads.csv`.
   - Observe automatic lead extraction (`+10` leads).
   - Set inter-email delay (e.g. `2` seconds) and hourly limit.
   - Click the **Clock icon**, choose quick preset **"⚡ In 10 Seconds (Live Demo)"**, and click **Send Later**.
3. **Queue Inspection & Live BullMQ Board**:
   - Switch to `http://localhost:5000/admin/queues` to show the Delayed Queue with the exact jobs waiting.
   - Wait 10 seconds. Observe the jobs move from `Delayed` → `Active` → `Completed`.
4. **Sent Emails & Ethereal SMTP Inspection**:
   - Return to dashboard, switch to **Sent** tab.
   - Click **"Ethereal View"** on any delivered email to show the authentic rendered email in the Ethereal web client.
5. **Server Restart Demonstration**:
   - Schedule an email for 1 minute in the future.
   - Stop the backend server in the terminal (`Ctrl+C`).
   - Show in the dashboard that the email is scheduled.
   - Restart the backend server (`npm run dev`).
   - Observe that when the 1 minute expires, the email is sent without being lost or duplicated.
6. **Rate Limiting & Live Slack Alert**:
   - Open Slack modal and trigger test alert or set hourly limit to 2 to show the live Slack Block Kit notification.

---

## 👥 Repository Access

Grant private GitHub repository access to:
- `Mitrajit`
- `Yadav036`

---

## 📄 License
MIT © ReachInbox.ai / Outbox Labs Hiring Assignment.
