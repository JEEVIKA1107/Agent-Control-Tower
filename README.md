# Agent Control Tower

> **Multi-Agent Orchestration, Observability and Governance Platform**  
> An enterprise MERN web application giving operators a unified control plane to monitor, trace, govern, and audit multi-agent AI systems.

---

## 1. Overview & Architectural Principles

Modern AI applications leverage autonomous, multi-agent frameworks (LangGraph, AutoGen, CrewAI) executing asynchronous, recursive tool calls. Without centralized oversight, these systems risk silent hangs, infinite call loops, unexpected token surges, and non-deterministic behavior.

**Agent Control Tower** solves this observability gap with:
1. **OpenTelemetry-Compliant Ingestion**: Live HTTP ingestion pipeline normalizing multi-agent spans into a unified trace schema.
2. **Interactive Execution Lineage**: Dynamic, directed acyclic graph (DAG) canvas powered by React Flow with BFS layout generation and error path highlights.
3. **5 Rule-Based Anomaly Detectors**: Real-time detection of repeated execution loops, token budget surges, high execution latencies, silent heartbeat failures, and TF cosine prompt drift.
4. **Human-in-the-Loop (HITL) Governance Center**: Strict 3-tier architectural decoupling (`Recommendation` $\rightarrow$ `ApprovalRequest` $\rightarrow$ `ActionExecution`), ensuring recommendations are never assumed executed.
5. **Cryptographic SHA-256 Audit Ledger**: Sequential hash-chained event ledger with end-to-end chain verification and tamper detection.
6. **Honest Architectural Labelling**: Clear indicators for `Live`, `Simulated Demo`, and `Planned` features across all screens.

---

## 2. Technology Stack

- **Frontend**: React (Vite), React Router DOM, Recharts, React Flow (@xyflow/react), Lucide React, Axios, Socket.IO Client. Modular component-scoped CSS.
- **Backend**: Node.js, Express, MongoDB with Mongoose ODM, JWT Authentication, bcrypt, Socket.IO.
- **Testing**: Jest, Supertest.

---

## 3. Quick Start & Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: v6.0 or higher running locally on `127.0.0.1:27017`

### Installation
```bash
# Clone the repository
git clone <repo-url>
cd AiMonitor

# Install dependencies across root, backend, and frontend
npm install
npm install --prefix backend
npm install --prefix frontend
```

### Environment Configuration
The project is pre-configured with `.env.example` templates.
Ensure `backend/.env` exists:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/agent_control_tower
JWT_SECRET=supersecretjwtkey_control_tower_2026_secure
JWT_EXPIRE=24h
CLIENT_URL=http://localhost:5173
DEFAULT_TOKEN_BUDGET=50000
DEFAULT_MAX_DURATION_MS=30000
DEFAULT_REPEAT_CALL_THRESHOLD=3
DEFAULT_COST_PER_1K_TOKENS=0.002
```

### Seed Baseline Database
```bash
# Seed initial demo users, agents, execution traces, governance policies, audit logs, and integrations
npm run seed
```

### Start Development Server
```bash
# Starts backend (port 5000) and frontend (port 5173) concurrently
npm run dev
```
Open your browser at: **`http://localhost:5173`**

---

## 4. Default Seeded Accounts (RBAC)

| Role | Email Address | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@controltower.io` | `Admin123!` | Full read/write, policy editing, agent deletion, demo tampering & reset |
| **Operator** | `operator@controltower.io` | `Operator123!` | Read/write, acknowledge anomalies, decide approvals, trigger scenarios |
| **Viewer** | `viewer@controltower.io` | `Viewer123!` | Read-only access across all dashboards; mutation actions forbidden (403) |

*Quick login buttons are available directly on the login page for one-click access.*

---

## 5. Automated Testing & Verification

The test harness runs in-band against an isolated MongoDB test database (`agent_control_tower_test`):

```bash
# Execute full backend test suite (10 test suites, 70 tests)
npm test

# Build frontend production bundle
npm run build --prefix frontend

# Run Phase 4 & 5 comprehensive standalone verification script
node backend/scripts/verifyPhase4.js
```

### Test Suite Structure
- `tests/auth.test.js`: User registration, login, JWT validation, and RBAC route gates.
- `tests/agents.test.js`: Agent registry CRUD, status toggle, search/filters, and deletion safeguards.
- `tests/telemetry.test.js`: OTel ingestion, schema normalization, and payload validation.
- `tests/lineage.test.js`: Trace summaries, DAG node construction, and error highlights.
- `tests/dashboard.test.js`: MongoDB aggregations, token calculations, and estimated cost metrics.
- `tests/anomalyRules.test.js`: All 5 rule-based anomaly detectors with normal and abnormal test cases.
- `tests/governanceApproval.test.js`: Recommendation generation, operator approval/rejection decisions, and action execution status.
- `tests/auditChain.test.js`: SHA-256 hash chaining, verification, tampering detection, and demo restore.
- `tests/integrations.test.js`: Integration listing, data source types, and honest labelling verification.
- `tests/e2eScenarios.test.js`: End-to-end execution of Scenarios A through E and safe demo reset.

---

## 6. End-to-End Evaluation Scenarios

The platform includes an **Interactive Demo Scenarios Launcher** accessible from the topbar button in the UI or via API:

1. **Scenario A: Normal Agent Execution** (`POST /api/demo/scenario-a`)
   - Ingests a healthy 3-span execution trace for customer triage.
   - Updates agent token totals and estimated costs without triggering alerts.
2. **Scenario B: Repeated Execution Anomaly** (`POST /api/demo/scenario-b`)
   - Emits 4 recursive call loops exceeding the threshold of 3.
   - Detects `repeated_execution` anomaly and generates a `circuit_breaker` recommendation.
3. **Scenario C: Token Surge Violation** (`POST /api/demo/scenario-c`)
   - Consumes 78,500 tokens in a single execution (exceeding 50k ceiling).
   - Detects `token_surge` anomaly and generates a `token_throttle` recommendation.
4. **Scenario D: Human Approval Decision** (`POST /api/demo/scenario-d`)
   - Approves Request 1 (creating `ActionExecution` with status `simulated`).
   - Rejects Request 2 (creating `ActionExecution` with status `not_executed`).
   - Records cryptographic audit trail for both decisions.
5. **Scenario E: Cryptographic Audit Tampering & Verification** (`POST /api/demo/scenario-e`)
   - Verifies untouched chain (`valid: true`).
   - Alters a simulated demo record's payload without recalculating hash.
   - Verifies broken sequence is detected immediately (`valid: false`, identifies sequence number).
   - Restores and re-hashes chain (`valid: true`).

For detailed demonstration instructions, see [docs/DEMO_GUIDE.md](docs/DEMO_GUIDE.md).

---

## 7. Documentation Index

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): Production deployment manual for Render, Railway, Vercel, Netlify, and MongoDB Atlas.
- [docs/DEMO_GUIDE.md](docs/DEMO_GUIDE.md): Step-by-step evaluator walkthrough for all 5 scenarios.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): Architectural layers, data models, and cryptographic formulas.
- [docs/LIMITATIONS.md](docs/LIMITATIONS.md): Implemented vs simulated vs planned boundaries.
- [docs/TEST_RESULTS.md](docs/TEST_RESULTS.md): Full test results matrix across all 70 automated tests.
- [docs/MANUAL_CHECKS.md](docs/MANUAL_CHECKS.md): Manual verification procedures and edge case tests. 
