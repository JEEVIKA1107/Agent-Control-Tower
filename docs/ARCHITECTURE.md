# System Architecture & Technical Specifications

**Agent Control Tower** is an enterprise observability, orchestration, and governance platform designed specifically for multi-agent autonomous AI systems.

---

## 1. High-Level Architectural Layers

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                            │
│   React 18 (Vite)  •  React Flow (DAG Canvas)  •  Recharts Dashboard   │
│   Auth Context (RBAC) • Socket.IO Client  •  Enterprise Dark UI System │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / WebSocket (Socket.IO)
┌───────────────────────────────────▼────────────────────────────────────┐
│                           API GATEWAY LAYER                            │
│   Express.js  •  JWT Auth Middleware  •  RBAC Authorization (3 Roles)  │
│   CORS Policy  •  Input Validation  •  Central Error Handler           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       ┌────────────────────────────┼───────────────────────────┐
       ▼                            ▼                           ▼
┌──────────────┐          ┌──────────────────┐        ┌──────────────────┐
│ INGESTION    │          │ ANOMALY ENGINE   │        │ GOVERNANCE HITL  │
│ /telemetry   │          │ 5 Rule Detectors │        │ 3-Tier Lifecycle │
│ OTel Adapter │          │ TF Cosine Drift  │        │ Policies & Gates │
└──────┬───────┘          └─────────┬────────┘        └─────────┬────────┘
       │                            │                           │
       └────────────────────────────┼───────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                   CRYPTOGRAPHIC AUDIT & STORAGE LAYER                  │
│   SHA-256 Hash Chain  •  Canonical JSON Serialization                 │
│   MongoDB Collections (Mongoose)  •  Strict Source Partitioning        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Subsystems

### A. Telemetry Ingestion Pipeline
- **HTTP Endpoint**: `POST /api/telemetry/ingest`
- **Normalization**: Translates raw spans into common schema:
  - `traceId`, `spanId`, `parentSpanId`
  - `agentId`, `eventType` (`llm_call`, `tool_execution`, `agent_handoff`, `error`, `heartbeat`, `workflow_step`)
  - `tokenUsage`: `{ promptTokens, completionTokens, totalTokens }`
  - `duration`, `status` (`success`, `error`, `timeout`, `running`)
- **OpenTelemetry Compatibility**: The OTel adapter maps standard W3C trace headers and semantic attributes (`llm.usage.prompt_tokens`, `service.name`, `status.code`).

### B. Execution Lineage Graph (DAG Engine)
- **Engine**: React Flow (`@xyflow/react`)
- **BFS Layout Generator**:
  - Traverses spans starting from the root span (`parentSpanId === null`).
  - Assigns hierarchical grid coordinates $(X, Y)$ with column offsets per depth level.
  - Automatically identifies failed spans and marks downstream edges as critical error paths (`#ef4444`).

### C. Rule-Based Anomaly Detection Engine
Evaluates telemetry against active `GovernancePolicy` thresholds without relying on unvalidated ML predictions:
1. **Repeated Execution Loop**: Detects duplicate call signatures within the same trace:
   $$\text{repeatCount}(\text{callSignature}, \text{traceId}) \ge \text{maxRepeatedCalls}$$
2. **Token Surge**: Flags spans where $\text{totalTokens} > \text{maxTokenBudget}$.
3. **High Latency**: Flags spans where $\text{durationMs} > \text{maxExecutionDurationMs}$.
4. **Silent Failure / Timeout**: Identifies unresponsive workers and missing agent heartbeats:
   $$\text{now} - \text{lastActive} > \text{heartbeatTimeoutMs}$$
5. **Prompt Drift**: Measures lexical Term Frequency (TF) cosine text similarity against the agent's baseline prompt template:
   $$\text{CosineSimilarity}(A, B) = \frac{A \cdot B}{\|A\| \|B\|} < \text{promptDriftThreshold}$$

### D. Governance & Human-in-the-Loop (HITL) Lifecycle
Enforces strict 3-tier architectural decoupling:

```
[ Anomaly Detected ] ──► [ Governance Recommendation ]
                                    │
                                    ▼
                         [ Approval Request (Pending) ]
                                    │
                       Human Review (Admin/Operator)
                                    │
                   ┌────────────────┴────────────────┐
                   ▼                                 ▼
           [ Status: Approved ]             [ Status: Rejected ]
                   │                                 │
                   ▼                                 ▼
         [ ActionExecution ]               [ ActionExecution ]
          status: "simulated"             status: "not_executed"
```

- **Safety Principle**: A recommendation is **never** assumed executed.
- External actions are explicitly recorded as `simulated` until a verified physical connector is connected.

---

## 3. Cryptographic Audit Chain Specification

### Mathematical Hash Chaining Formula
Every audit record binds its monotonic sequence number, canonical JSON payload, and predecessor block hash:

$$H_n = \text{SHA256}\Big(n \;\parallel\; \text{canonicalJson}(\text{payload}_n) \;\parallel\; H_{n-1}\Big)$$

Where:
- $n \in \mathbb{N}^+$: Strictly monotonic sequence number ($1, 2, \dots, N$).
- $H_0 = \text{"0000000000000000000000000000000000000000000000000000000000000000"}$ (Genesis hash).
- $\text{canonicalJson}(\cdot)$: Recursive lexicographical key-sorting serializer avoiding formatting discrepancies.

### Verification Algorithm
Traverses the ledger from $i = 1 \dots N$:
1. **Sequence Continuity Check**: Verifies $r_i.\text{sequenceNumber} == i$. Detects dropped, missing, or duplicated sequence gaps.
2. **Linkage Check**: Verifies $r_i.\text{previousHash} == r_{i-1}.\text{currentHash}$. Detects spliced or reordered blocks.
3. **Content Integrity Check**: Recomputes $\text{SHA256}(i \parallel \text{canonicalJson}(r_i.\text{content}) \parallel r_i.\text{previousHash})$. Detects historical record tampering.

---

## 4. Database Models & Schema Relationships

| Model | Collection | Primary Keys & Indexes | Key Attributes |
| :--- | :--- | :--- | :--- |
| **User** | `users` | `email` (unique) | `password` (bcrypt), `role` (`Admin`, `Operator`, `Viewer`) |
| **Agent** | `agents` | `agentId` (unique) | `type`, `framework`, `status`, `totalTokens`, `lastActive` |
| **Telemetry** | `telemetries` | `spanId` (unique), `traceId` | `eventType`, `tokenUsage`, `duration`, `status`, `source` |
| **Execution** | `executions` | `executionId` (unique), `traceId` | `startTime`, `endTime`, `duration`, `tokens`, `cost`, `status` |
| **Anomaly** | `anomalies` | `anomalyId` (unique), `agentId` | `type`, `severity`, `evidence`, `status`, `source` |
| **GovernancePolicy** | `governancepolicies` | `policyId` (unique) | `maxTokenBudget`, `maxRepeatedCalls`, `promptDriftThreshold` |
| **GovernanceRecommendation** | `governancerecommendations` | `recommendationId` (unique) | `anomalyId`, `actionType`, `parameters`, `status` |
| **ApprovalRequest** | `approvalrequests` | `requestId` (unique) | `recommendationId`, `agentId`, `status`, `reviewerComment` |
| **ActionExecution** | `actionexecutions` | `actionExecutionId` (unique) | `approvalRequestId`, `actionType`, `status`, `outputSummary` |
| **AuditLog** | `auditlogs` | `sequenceNumber` (unique), `eventId` | `actionDetails`, `previousHash`, `currentHash`, `source` |
| **Integration** | `integrations` | `integrationId` (unique) | `name`, `type`, `status`, `dataSourceType`, `source` |
