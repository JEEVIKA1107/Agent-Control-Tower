# Automated Test Results – Agent Control Tower

| Phase | Test Suite / Name | Expected Result | Actual Result | Status | Notes / Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Phase 1** | Auth: User Registration | Register user, hash password, return user & token | Status 201, valid JWT returned, password excluded | **PASS** | `backend/tests/auth.test.js` |
| **Phase 1** | Auth: Duplicate Email | Reject duplicate email with 400 | Status 400: "An account with this email address already exists" | **PASS** | `backend/tests/auth.test.js` |
| **Phase 1** | Auth: Missing Fields | Reject incomplete registration payload with 400 | Status 400: "Please provide name, email and password" | **PASS** | `backend/tests/auth.test.js` |
| **Phase 1** | Auth: User Login | Validate bcrypt password, return JWT | Status 200, JWT and user profile returned | **PASS** | `backend/tests/auth.test.js` |
| **Phase 1** | Auth: Bad Password Login | Reject invalid credentials with 401 | Status 401: "Invalid email or password" | **PASS** | `backend/tests/auth.test.js` |
| **Phase 1** | Auth: Unknown Email Login | Reject unknown email with 401 | Status 401: "Invalid email or password" | **PASS** | `backend/tests/auth.test.js` |
| **Phase 1** | Auth: Protected /me Profile | Authenticate valid Bearer token | Status 200, returns user profile | **PASS** | `backend/tests/auth.test.js` |
| **Phase 1** | Auth: Missing Bearer Token | Reject unauthenticated request with 401 | Status 401: "Unauthorized: No authentication token provided" | **PASS** | `backend/tests/auth.test.js` |
| **Phase 1** | RBAC: Viewer Access Control | Viewer blocked from Admin-only endpoint | Status 403: "Forbidden: Role 'Viewer' is not authorized..." | **PASS** | `backend/tests/auth.test.js` |
| **Phase 1** | RBAC: Admin Access Control | Admin allowed on Admin-only endpoint | Status 200: "Welcome Admin: access granted..." | **PASS** | `backend/tests/auth.test.js` |
| **Phase 2** | Agents: Registration (Admin) | Admin can register new agent | Status 201, Agent created in Active state | **PASS** | `backend/tests/agents.test.js` |
| **Phase 2** | Agents: RBAC Restriction | Viewer blocked from registering agent | Status 403 Forbidden | **PASS** | `backend/tests/agents.test.js` |
| **Phase 2** | Agents: Duplicate ID Check | Reject duplicate agentId with 400 | Status 400: "Agent with ID ... already exists" | **PASS** | `backend/tests/agents.test.js` |
| **Phase 2** | Agents: Missing Fields | Reject payload missing required fields | Status 400: "Please provide agentId, name and agent type" | **PASS** | `backend/tests/agents.test.js` |
| **Phase 2** | Agents: Filter & Search | Filter by status and search by text | Status 200, returns filtered agent array | **PASS** | `backend/tests/agents.test.js` |
| **Phase 2** | Agents: Status Toggle | Toggle Active <-> Disabled status | Status 200, flips status correctly | **PASS** | `backend/tests/agents.test.js` |
| **Phase 2** | Agents: Deletion (Admin) | Admin deletes agent record | Status 200, record removed from MongoDB | **PASS** | `backend/tests/agents.test.js` |
| **Phase 2** | Agents: Deletion RBAC | Viewer blocked from deleting agent | Status 403 Forbidden | **PASS** | `backend/tests/agents.test.js` |
| **Phase 2** | Telemetry: Ingestion & Normalization | Ingest valid common schema event | Status 201, agent totalTokens & count updated | **PASS** | `backend/tests/telemetry.test.js` |
| **Phase 2** | Telemetry: Payload Validation | Reject payload missing traceId/spanId/agentId | Status 400: "Validation failed: ..." | **PASS** | `backend/tests/telemetry.test.js` |
| **Phase 2** | Telemetry: OpenTelemetry Adapter | Ingest OTel JSON span and normalize schema | Status 201, correctly mapped semantic conventions | **PASS** | `backend/tests/telemetry.test.js` |
| **Phase 2** | Telemetry: Source Filtering | Query records filtered by source (simulated/live) | Status 200, strict source isolation verified | **PASS** | `backend/tests/telemetry.test.js` |
| **Phase 2** | Lineage: Trace Summaries | Aggregate distinct traces for trace picker | Status 200, returns traceId, span count, error status | **PASS** | `backend/tests/lineage.test.js` |
| **Phase 2** | Lineage: Graph Construction | Generate React Flow nodes & hierarchical edges | Status 200, error edges highlighted (#ef4444) | **PASS** | `backend/tests/lineage.test.js` |
| **Phase 2** | Lineage: Non-existent Trace | Return 404 for unknown trace identifier | Status 404: "No telemetry spans found for trace" | **PASS** | `backend/tests/lineage.test.js` |
| **Phase 2** | Dashboard: Metric Aggregations | Calculate metrics directly from MongoDB collections | Status 200, exact counts, token sums & costs | **PASS** | `backend/tests/dashboard.test.js` |
| **Phase 2** | Dashboard: Charts & Distribution | Generate hourly time-series and agent cost share | Status 200, timeSeries, costByAgent, statusBreakdown | **PASS** | `backend/tests/dashboard.test.js` |
| **Phase 3** | Anomaly: Repeated Loop Rule | Detect call signature repeated >= threshold | Status 201, triggers `repeated_execution` anomaly (Critical) | **PASS** | `backend/tests/anomalyRules.test.js` |
| **Phase 3** | Anomaly: Normal Loop Case | Do NOT alert when calls under threshold | 0 anomalies created | **PASS** | `backend/tests/anomalyRules.test.js` |
| **Phase 3** | Anomaly: Token Surge Rule | Detect token consumption > policy budget | Status 201, triggers `token_surge` anomaly (High) | **PASS** | `backend/tests/anomalyRules.test.js` |
| **Phase 3** | Anomaly: Normal Token Case | Do NOT alert when tokens within budget | 0 anomalies created | **PASS** | `backend/tests/anomalyRules.test.js` |
| **Phase 3** | Anomaly: High Latency Rule | Detect duration > policy maxDurationMs | Status 201, triggers `high_latency` anomaly with excess duration evidence | **PASS** | `backend/tests/anomalyRules.test.js` |
| **Phase 3** | Anomaly: Silent Failure Rule | Detect timeout and silent hung worker status | Status 201, triggers `silent_failure` anomaly (Critical) | **PASS** | `backend/tests/anomalyRules.test.js` |
| **Phase 3** | Anomaly: Prompt Drift Rule | Cosine similarity < threshold flags drift | Status 201, triggers `prompt_drift` anomaly with similarity evidence | **PASS** | `backend/tests/anomalyRules.test.js` |
| **Phase 3** | Anomaly: Normal Prompt Case | High cosine similarity does NOT flag drift | 0 anomalies created | **PASS** | `backend/tests/anomalyRules.test.js` |
| **Phase 3** | Anomaly: Acknowledgment | Operator acknowledges anomaly | Status 200, status updated to `Acknowledged` with reviewer ID | **PASS** | `backend/tests/anomalyRules.test.js` |
| **Phase 3** | Governance: Policy Thresholds | Admin updates policy limits in MongoDB | Status 200, policy thresholds updated in DB | **PASS** | `backend/tests/governanceApproval.test.js` |
| **Phase 3** | Governance: Policy RBAC | Viewer blocked from modifying policy | Status 403 Forbidden | **PASS** | `backend/tests/governanceApproval.test.js` |
| **Phase 3** | Approval: Approval to Simulated Action | Operator approves request -> creates ActionExecution (simulated) | Status 200, request Approved, ActionExecution created as `simulated` | **PASS** | `backend/tests/governanceApproval.test.js` |
| **Phase 3** | Approval: Rejection to Not-Executed Action | Admin rejects request -> ActionExecution status `not_executed` | Status 200, request Rejected, ActionExecution recorded as `not_executed` | **PASS** | `backend/tests/governanceApproval.test.js` |
| **Phase 3** | Approval: Viewer RBAC Restriction | Viewer blocked from approving or rejecting | Status 403 Forbidden | **PASS** | `backend/tests/governanceApproval.test.js` |
| **Phase 4** | Audit: SHA-256 Hash Digest | Deterministic 64-character SHA-256 hash | Matches SHA-256 specification, deterministic output | **PASS** | `backend/tests/auditChain.test.js` |
| **Phase 4** | Audit: Canonical JSON Serialization | Object key sorting invariance during hash calculation | Identical hashes regardless of key insertion order | **PASS** | `backend/tests/auditChain.test.js` |
| **Phase 4** | Audit: Sequential Hash Chaining | Append records with incrementing sequence & predecessor hash | Sequence #1..N, H_n linked to H_{n-1}, genesis = 0000... | **PASS** | `backend/tests/auditChain.test.js` |
| **Phase 4** | Audit: Verification (Valid Chain) | Entire chain recomputed & validated | Status 200, valid: true across all records | **PASS** | `backend/tests/auditChain.test.js` |
| **Phase 4** | Audit: Tampering Detection (Content Alteration) | Detect unauthorized historical payload mutation | valid: false, identifies broken sequence # and event ID | **PASS** | `backend/tests/auditChain.test.js` |
| **Phase 4** | Audit: Broken Cryptographic Linkage | Detect mismatched previousHash | valid: false, broken linkage detected | **PASS** | `backend/tests/auditChain.test.js` |
| **Phase 4** | Audit: Sequence Gap / Missing Record | Detect missing or out-of-order sequence number | valid: false, identifies missing sequence gap | **PASS** | `backend/tests/auditChain.test.js` |
| **Phase 4** | Audit: Admin Demo Tamper & Restore | Admin simulates tamper, verifies breakage, restores chain | Breaks at sequence #, restored chain verifies valid: true | **PASS** | `backend/tests/auditChain.test.js` |
| **Phase 4** | Audit: Demo Tamper RBAC | Viewer forbidden from triggering tampering demo | Status 403 Forbidden | **PASS** | `backend/tests/auditChain.test.js` |
| **Phase 4** | Integrations: Framework & Protocol Status | List 6 integrations with type, status & data source | Status 200, OTel, LangGraph, AutoGen, CrewAI, MCP, A2A | **PASS** | `backend/tests/integrations.test.js` |
| **Phase 4** | Integrations: Honest Source Labelling | OTel=live; LangGraph/AutoGen=simulated; MCP/A2A/CrewAI=planned | Verified: No fake connections; planned protocols unconnected | **PASS** | `backend/tests/integrations.test.js` |
| **Phase 4** | Integrations: Authentication Gate | Reject unauthenticated query with 401 | Status 401 Unauthorized | **PASS** | `backend/tests/integrations.test.js` |
| **Phase 4** | Verification: Deterministic Canonical JSON | Object key sorting invariance | Identical SHA-256 digests on arbitrary key orders | **PASS** | `backend/scripts/verifyPhase4.js` |
| **Phase 4** | Verification: Predecessor Hash Linkage | Records 1..N link to predecessor hash | Predecessor continuity verified from genesis hash | **PASS** | `backend/scripts/verifyPhase4.js` |
| **Phase 4** | Verification: End-to-End Chain Traversal | Traverse and recompute full ledger | 100% verified valid across active database | **PASS** | `backend/scripts/verifyPhase4.js` |
| **Phase 4** | Verification: Audit Event Coverage | Verify event type representation | Covers Agent, Policy, Anomaly, Approval, Action, Integration | **PASS** | `backend/scripts/verifyPhase4.js` |
| **Phase 4** | Verification: Demo Tampering Isolation | Tamper detected and pinned to sequence #7 | Detected immediately with broken sequence identifier | **PASS** | `backend/scripts/verifyPhase4.js` |
| **Phase 4** | Verification: Demo Chain Restoration | Re-hash and restore chain without evidence loss | Restores valid status across entire database | **PASS** | `backend/scripts/verifyPhase4.js` |
| **Phase 4** | Verification: Integration Honest Labelling | OTel=live; LangGraph/AutoGen=simulated; MCP/A2A/CrewAI=planned | Verified: No fake connections; planned protocols unconnected | **PASS** | `backend/scripts/verifyPhase4.js` |
| **Phase 4** | Build: Production Frontend Bundle | Vite production build compile | Exit code 0, 2147 modules transformed | **PASS** | `npm run build --prefix frontend` |
| **Phase 5** | Scenario A: Normal Execution | Ingest 3-span trace, update tokens and estimated costs | Status 200, Execution completed, agent totals updated | **PASS** | `backend/tests/e2eScenarios.test.js` |
| **Phase 5** | Scenario B: Repeated Loop Anomaly | Emits 4 loops, flags anomaly, creates circuit breaker rec | Status 200, repeated_execution detected, approval created | **PASS** | `backend/tests/e2eScenarios.test.js` |
| **Phase 5** | Scenario C: Token Surge Anomaly | Ingest 78.5k tokens, flags surge, creates throttle rec | Status 200, token_surge detected, token_throttle created | **PASS** | `backend/tests/e2eScenarios.test.js` |
| **Phase 5** | Scenario D: Human Approval Decisions | Approve Req 1 (simulated) & Reject Req 2 (not_executed) | Status 200, ActionExecution statuses recorded properly | **PASS** | `backend/tests/e2eScenarios.test.js` |
| **Phase 5** | Scenario E: Audit Verification Loop | Verify valid -> demo tamper -> catch breakage -> restore | Status 200, broken sequence caught, valid chain restored | **PASS** | `backend/tests/e2eScenarios.test.js` |
| **Phase 5** | Scenario E: RBAC Protection | Operator and Viewer blocked from tampering scenario | Status 403 Forbidden | **PASS** | `backend/tests/e2eScenarios.test.js` |
| **Phase 5** | RBAC: Unauthenticated Requests | Reject unauthenticated scenario trigger with 401 | Status 401 Unauthorized | **PASS** | `backend/tests/e2eScenarios.test.js` |
| **Phase 5** | RBAC: Viewer Execution Gate | Viewer blocked from triggering any scenario | Status 403 Forbidden | **PASS** | `backend/tests/e2eScenarios.test.js` |
| **Phase 5** | Data Integrity: Safe Demo Reset | Delete simulated data while preserving live records | Status 200, live records verified in MongoDB | **PASS** | `backend/tests/e2eScenarios.test.js` |
| **Phase 5** | Data Integrity: Demo Reset RBAC | Operator and Viewer blocked from demo reset | Status 403 Forbidden | **PASS** | `backend/tests/e2eScenarios.test.js` |
| **Phase 5** | Build: Production Frontend Bundle (Vite) | Vite compile with all 11 modules & scenario modal | Exit code 0, 2151 modules transformed in 20.28s | **PASS** | `npm run build --prefix frontend` |
