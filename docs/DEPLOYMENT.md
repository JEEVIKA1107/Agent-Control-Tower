# Production Deployment Guide – Agent Control Tower

This guide provides end-to-end instructions for deploying the **Agent Control Tower** platform to cloud environments.

---

## 1. Deployment Architecture Options

Agent Control Tower can be deployed in two battle-tested production configurations:

### Option A: Decoupled Multi-Cloud (Recommended for Scalability)
- **Frontend SPA**: Hosted on **Vercel** or **Netlify** with global CDN edge caching.
- **Backend API & WebSockets**: Hosted on **Render**, **Railway**, or **AWS ECS/App Runner** (Node.js runtime with HTTP and WebSocket support).
- **Database**: **MongoDB Atlas** (Managed M0/M10+ cluster with automated backups and replica sets).

### Option B: Unified Single-Service (Easiest & Most Cost-Effective)
- **Backend**: Runs on **Render Web Service** or **Railway**.
- **Frontend**: Pre-compiled with `npm run build --prefix frontend`. The production backend automatically serves `frontend/dist` static assets and handles SPA client-side routing fallbacks for all non-API paths.
- **Database**: **MongoDB Atlas**.

---

## 2. Prerequisites

1. **MongoDB Atlas Account**: Free M0 tier or dedicated cluster.
2. **Git Repository**: GitHub/GitLab repository connected to your hosting providers.
3. **Node.js**: v18.0.0+ (for local builds and automated CI pipelines).

---

## 3. Database Setup (MongoDB Atlas)

1. Create a free or dedicated cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a database user with read and write permissions (e.g. `act_admin`).
3. Under **Network Access**, add an IP access rule:
   - For Render/Vercel dynamic egress IPs, add `0.0.0.0/0` (allow access from anywhere) and secure via strict database authentication credentials.
4. Obtain your connection URI in standard format:
   ```
   mongodb+srv://<username>:<password>@<cluster-address>.mongodb.net/agent_control_tower?retryWrites=true&w=majority
   ```
5. Seed the initial production baseline using:
   ```bash
   MONGO_URI="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/agent_control_tower?retryWrites=true&w=majority" npm run seed
   ```

---

## 4. Backend Deployment (Render / Railway)

### Using Render Blueprint (`render.yaml`)
A `render.yaml` specification is included at the repository root. When creating a **New Blueprint Instance** in Render:

1. Connect your GitHub repository.
2. Render detects `render.yaml` automatically.
3. Supply the required environment variables:
   - `MONGO_URI`: Your MongoDB Atlas URI.
   - `CLIENT_URL`: The URL of your deployed frontend (e.g. `https://agent-control-tower.vercel.app` or `*` during initial testing).
   - `JWT_SECRET`: Generate a random 64-character hex string (Render will auto-generate if selected).

### Manual Configuration on Render / Railway
If configuring manually as a Web Service:

- **Environment**: Node
- **Root Directory**: `backend` (or run commands with `--prefix backend`)
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check Path**: `/api/health`

### Backend Environment Variables Reference

| Variable | Description | Production Example | Required |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Environment identifier | `production` | **Yes** |
| `PORT` | Listening port (assigned by provider) | `5000` or `10000` | Optional |
| `MONGO_URI` / `MONGODB_URI` | MongoDB connection string | `mongodb+srv://...` | **Yes** |
| `JWT_SECRET` | 64+ char random secret key | *(generated random string)* | **Yes** |
| `JWT_EXPIRES_IN` | Token expiration period | `7d` or `24h` | Optional (default: `7d`) |
| `CLIENT_URL` | Allowed frontend origins (comma-separated) | `https://act.vercel.app` | **Yes** |
| `DEFAULT_TOKEN_BUDGET` | Baseline anomaly token limit | `50000` | Optional (default: `50000`) |
| `DEFAULT_MAX_DURATION_MS` | Baseline execution latency limit | `30000` | Optional (default: `30000`) |
| `DEFAULT_REPEAT_CALL_THRESHOLD` | Loop detection call limit | `3` | Optional (default: `3`) |
| `DEFAULT_COST_PER_1K_TOKENS` | Token pricing estimate | `0.002` | Optional (default: `0.002`) |

> [!IMPORTANT]
> **Generating a Secure JWT Secret**:
> Never use the development fallback secret in production. Generate a cryptographically secure 256-bit random key by executing:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

## 5. Frontend Deployment (Vercel / Netlify)

### Deploying on Vercel
1. Import the Git repository on [Vercel](https://vercel.com).
2. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variables:
   - `VITE_API_URL`: Your deployed backend API URL, including `/api` (e.g. `https://act-backend.onrender.com/api`).
   - `VITE_SOCKET_URL`: Your deployed backend root domain (e.g. `https://act-backend.onrender.com`).
4. Click **Deploy**. Vercel will process SPA client-side routing using the included `vercel.json` rewrites.

### Deploying on Netlify
1. Connect Git repository to [Netlify](https://netlify.com).
2. Build Settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
3. Environment Variables:
   - Set `VITE_API_URL` and `VITE_SOCKET_URL`.
4. The included `frontend/public/_redirects` will be copied to `dist/_redirects`, providing seamless SPA routing (`/* /index.html 200`).

---

## 6. Monolithic Unified Deployment (Single Service)

To host both frontend and backend on a single server without cross-origin complexity:

1. Build the frontend during deployment:
   - **Build Command**: `npm install && npm run build --prefix frontend && npm install --prefix backend`
   - **Start Command**: `node backend/server.js`
2. Environment Variables:
   - Set `NODE_ENV=production`.
   - Set `MONGO_URI`.
   - Set `JWT_SECRET`.
3. In this mode:
   - `/api/*` endpoints are handled by Express.
   - All other routes serve `frontend/dist/index.html`.
   - `VITE_API_URL` defaults to `/api` and WebSockets connect to the same origin (`window.location.origin`).

---

## 7. Security Hardening Checklist

- [x] **Database Isolation**: Network access restricted and password protected via TLS.
- [x] **Cryptographic Secret Rotation**: Production `JWT_SECRET` configured with a 64-character random hex string.
- [x] **CORS Origin Whitelisting**: Strict `CLIENT_URL` mapping to frontend domains; credentials enabled for secure cookie/bearer tokens.
- [x] **Error Leaks Suppressed**: Production `errorHandler` middleware masks 500 error stack traces and internal messages.
- [x] **Role-Based Access Control**:
  - `Admin`: Full access, policy modifications, agent deletions, and controlled demo tampering.
  - `Operator`: Anomaly acknowledgments, human approval decisions, demo scenarios.
  - `Viewer`: Read-only access with server-enforced HTTP 403 Forbidden on all mutation endpoints.
- [x] **Audit Trail Tamper-Evidence**: Deterministic SHA-256 hash chaining with canonical JSON serialization. Notice clearly indicates cryptographic integrity is tamper-evident, not tamper-proof against raw DB superusers.

---

## 8. Post-Deployment Smoke Test & Verification

Once deployed, run these verification steps to confirm operational readiness:

### 1. Health Probe
```bash
curl -s https://<your-backend-domain>/api/health
```
**Expected Response**:
```json
{
  "status": "online",
  "system": "Agent Control Tower Backend",
  "database": "connected"
}
```

### 2. Authenticated Audit Trail Verification
```bash
# 1. Login
TOKEN=$(curl -s -X POST https://<your-backend-domain>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@controltower.io","password":"<your-admin-password>"}' | jq -r '.token')

# 2. Check Chain Integrity
curl -s https://<your-backend-domain>/api/audit/verify \
  -H "Authorization: Bearer $TOKEN"
```
**Expected Response**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "totalRecords": 11,
    "message": "Audit chain integrity verified across all 11 sequential records."
  }
}
```

### 3. Open Web UI
Navigate to your deployed frontend domain, log in with seeded credentials, verify dashboard metrics, execution lineage DAG canvas, real-time alerts, and the Cryptographic Audit page.
