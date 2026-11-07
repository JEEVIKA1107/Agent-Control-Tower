# System Scope, Honesty Boundaries & Known Limitations

To maintain absolute architectural honesty and transparent operational guarantees, this document specifies what is **Implemented (Production Ready)**, what is **Simulated (Demo Mode)**, and what is **Planned (Future Specification)** in **Agent Control Tower**.

---

## 1. Capability Classification Matrix

| Subsystem / Feature | Classification | Description & Operational Boundary |
| :--- | :--- | :--- |
| **Authentication & RBAC** | **Implemented** | Working JWT authentication with bcrypt hashing. Role gates for `Admin`, `Operator`, and `Viewer` enforced across API routes. |
| **Agent Registry & CRUD** | **Implemented** | Working MongoDB persistence for agent metadata, status toggling, filtering, and deletion confirmation safeguards. |
| **OpenTelemetry Telemetry Ingestion** | **Implemented** | Real HTTP ingestion pipeline (`POST /api/telemetry/ingest`) accepting W3C trace headers and standard OTel JSON spans. |
| **Execution Lineage Canvas** | **Implemented** | Interactive BFS DAG layout powered by React Flow, mapping parent-child spans and highlighting error paths. |
| **Rule-Based Anomaly Detection** | **Implemented** | 5 deterministic rule engines: repeated execution loops, token surge ceilings, duration limits, heartbeat expiration, and TF cosine prompt drift. |
| **HITL Governance & Approvals** | **Implemented** | Decoupled 3-tier lifecycle (`Recommendation` $\rightarrow$ `ApprovalRequest` $\rightarrow$ `ActionExecution`) with human operator review comments. |
| **Cryptographic Audit Ledger** | **Implemented** | Sequential SHA-256 hash chaining with deterministic canonical JSON serialization and full verification algorithm (`GET /api/audit/verify`). |
| **Controlled Tamper Simulator** | **Implemented (Demo)** | Admin-only demonstration modifying seeded demo records without updating hashes to demonstrate verification detection. |
| **LangGraph / AutoGen Adapters** | **Simulated Demo** | Synthetic trace normalization adapters converting simulated agent turns into standard telemetry schema for presentation. |
| **Action Execution Outcomes** | **Simulated Demo** | Approving a governance action creates an `ActionExecution` with status `simulated`. No external physical systems are dispatched. |
| **Orchestration Conflict Log** | **Simulated Demo** | Multi-agent state machine coordination and lock contention logs are currently populated with simulated historical records. |
| **Machine Learning Forecasting** | **Planned** | ML-based anomaly forecasting and predictive token exhaustion are strictly categorized as **Planned Enhancements – Not Yet Validated**. |
| **CrewAI Task Runner** | **Planned** | Hierarchical crew execution listener is a planned specification; not displayed as connected. |
| **Model Context Protocol (MCP)** | **Planned** | JSON-RPC tool server protocol monitoring agent-to-tool capabilities is a planned architectural integration. |
| **Agent-to-Agent (A2A) Mesh** | **Planned** | Decentralized inter-agent peer envelope validation is a planned future specification. |

---

## 2. Critical Architectural Boundaries

### A. Cryptographic Hash Chaining vs Database Superuser Tampering
- **What is Guaranteed**: The cryptographic hash chain ensures **tamper-evident integrity**. Any unauthorized historical mutation, deletion, or record reordering breaks downstream SHA-256 digests ($H_n$) and is immediately pinned by sequence number during verification.
- **What is NOT Claimed**: The database is **not claimed to be tamper-proof**. An administrator with direct root access to the MongoDB daemon could theoretically rewrite the entire database collection and recompute the downstream chain unless anchored to external write-once-read-many (WORM) storage or an external RFC 6962 transparency log.

### B. Action Execution Decoupling
- **What is Guaranteed**: An approval decision never triggers unverified external execution.
- **What is NOT Claimed**: Approving a circuit-breaker recommendation sets `ActionExecution.status = "simulated"`. The platform does not claim to physically sever external network sockets or terminate third-party processes until native runtime sidecars are connected.

### C. Rule-Based vs Machine Learning Detection
- **What is Guaranteed**: All 5 anomaly detection conditions are evaluated deterministically using configurable arithmetic and lexical thresholds.
- **What is NOT Claimed**: The platform does not claim predictive neural network inference or machine learning forecasting. The prompt drift detector evaluates lexical Term Frequency (TF) cosine similarity, not transformer embedding vector similarity.

---

## 3. Storage Source Partitioning
To prevent simulated demonstration data from contaminating genuine production telemetry:
- Every document in MongoDB enforces a `source: "live" | "simulated"` tag.
- The UI displays explicit **SIMULATED** badges and topbar warning banners whenever simulated demo data is active.
- Safe demo state resets (`POST /api/demo/reset`) strictly delete documents where `source === "simulated"`, preserving genuine live telemetry and custom registered agents.
