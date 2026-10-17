# Production Deployment Guide: CodeComment AI

This guide walks you through deploying **CodeComment AI** with:
- **Backend on Render** (Node.js Express API with Tree-Sitter & AI integration)
- **Frontend on Vercel** (Vite + React Single-Page Application)

---

## Architecture Overview

```
                      HTTPS Request
  User Browser ──────────────────────────► Vercel (Frontend SPA)
       │                                     │
       │                                     │ Calls API via VITE_API_URL
       ▼                                     ▼
  Direct API ────────────────────────────► Render (Backend Web Service)
                                             │
                                             ├─► Health Check (/health)
                                             ├─► AST Engine (Tree-sitter)
                                             └─► OpenAI / Atria LLM API
```

---

## Part 1: Deploy Backend to Render

### Option A: 1-Click Blueprint Deploy (Recommended)

1. Push your repository to GitHub or GitLab.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** and select **Blueprint**.
4. Connect your `CodeCommAi` repository.
5. Render reads [render.yaml](file:///s:/ALL/projects/CodeCommAi/render.yaml) automatically:
   - **Service Name:** `codecomment-backend`
   - **Runtime:** `Node`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
6. In the environment variables prompt, enter your `OPENAI_API_KEY` (e.g. `atr_...` or `sk-...`).
7. Click **Apply**. Render will build and deploy the web service.
8. Once live, copy your Render service URL (e.g., `https://codecomment-backend.onrender.com`).

---

### Option B: Manual Web Service Setup

If you prefer configuring manually in Render:

1. In Render Dashboard, click **New +** ➔ **Web Service**.
2. Connect your Git repository.
3. Configure the settings:
   | Setting | Value |
   |---|---|
   | **Name** | `codecomment-backend` |
   | **Language** | `Node` |
   | **Root Directory** | `backend` |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |
   | **Health Check Path** | `/health` |
   | **Auto-Deploy** | `Yes` |

4. Under **Environment Variables**, add:
   | Key | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production optimizations |
   | `PORT` | `10000` | Port listened by Render |
   | `CORS_ORIGIN` | `*` *(or your Vercel URL)* | Allowed frontend origin(s) |
   | `OPENAI_API_KEY` | `your_api_key_here` | Your OpenAI / Atria API key |
   | `OPENAI_BASE_URL` | `https://api.atria-asi.ai/v1` | Optional API base URL |
   | `OPENAI_MODEL` | `Atria-Dawn-Preview` | Model identifier |
   | `RATE_LIMIT_MAX` | `100` | Max requests per IP window |
   | `RATE_LIMIT_WINDOW_MINUTES` | `15` | Window duration in minutes |

5. Click **Create Web Service**.

---

## Part 2: Deploy Frontend to Vercel

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** ➔ **Project**.
3. Import your `CodeCommAi` Git repository.
4. In the **Configure Project** screen:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click `Edit` and select `frontend`
   - **Build Command:** `npm run build` (detected automatically)
   - **Output Directory:** `dist` (detected automatically)
5. Expand **Environment Variables** and add:
   | Key | Value | Example |
   |---|---|---|
   | `VITE_API_URL` | Your Render backend URL | `https://codecomment-backend.onrender.com` |

   *(Note: Do not include a trailing slash)*

6. Click **Deploy**. Vercel will build the frontend and provide your production URL (e.g., `https://codecomment-ai.vercel.app`).

---

## Part 3: Finalize CORS Configuration

To lock down CORS security in production:

1. Copy your live Vercel domain (e.g. `https://codecomment-ai.vercel.app`).
2. Go to **Render Dashboard** ➔ Select your `codecomment-backend` service ➔ **Environment**.
3. Update `CORS_ORIGIN` to:
   ```
   https://codecomment-ai.vercel.app
   ```
   *(You can also provide a comma-separated list to support local testing: `https://codecomment-ai.vercel.app,http://localhost:5173`)*
4. Render will automatically redeploy with the updated CORS policy.

---

## Part 4: Verification & Smoke Test

### 1. Test Backend Health Check
Run in terminal or browser:
```bash
curl https://codecomment-backend.onrender.com/health
```
Expected response:
```json
{
  "status": "ok",
  "service": "CodeComment AI Backend",
  "uptime": 12,
  "timestamp": "2026-10-18T...",
  "env": "production"
}
```

### 2. Test Frontend
1. Open your Vercel URL in your browser.
2. Load one of the sample code files (e.g. `JavaScript` or `Python`).
3. Click **Document Code** (or press `Ctrl+Enter`).
4. Verify the side-by-side diff appears with generated JSDoc / docstrings and logic preservation badges.
5. Click **Settings** in the top navigation bar to confirm you can switch between **Auto** and **Safe AST Engine (Offline)**.

---

## Important Tips for Render Free Tier

- **Cold Starts (Spindown):** On Render's free tier, backend instances go to sleep after 15 minutes of inactivity. When a new request arrives, it takes ~30–50 seconds to spin up.
- **Graceful Diagnostics:** If the backend is asleep when a user documents code, CodeComment AI automatically displays a clear wake-up message and gives the user a 1-click option to immediately document code using the local **Safe AST Engine** without waiting for the server.
- **Preventing Sleep (Optional):** To keep the free tier awake, you can set up a free uptime monitor (e.g. [UptimeRobot](https://uptimerobot.com) or [Cron-job.org](https://cron-job.org)) to ping `https://codecomment-backend.onrender.com/health` every 10 minutes.
