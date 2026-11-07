# Manual Verification Checklist & Presentation Screenshot Guide

This document lists the mandatory screens and visual verifications to validate and capture for demonstrations.

## Phase 1 Checks: Foundation & Auth
- [ ] **Login Screen**: Professional enterprise login page with dark navy theme, brand logo, and quick-fill buttons for demo credentials (Admin, Operator, Viewer).
- [ ] **Role Badge in Header**: User avatar, full name, and distinct role badge (`Admin`, `Operator`, or `Viewer`).
- [ ] **Navigation Sidebar**: All 11 navigation links rendered with active indicator and responsive collapsing.
- [ ] **Simulated Data Indicator**: SIMULATED demo banner visible at the top when displaying simulated telemetry.
- [ ] **Dashboard Shell**: Metric cards skeleton, chart containers, and responsive grid layout.

## Phase 2 Checks: Monitoring & Lineage
- [ ] **Overview Dashboard**: Active agents, failed agents, token count, latency metrics, and interactive charts.
- [ ] **Agent Management**: Filterable list, status badges, registration modal, and execution history.
- [ ] **Execution Lineage**: Interactive React Flow graph with zoom/pan and node inspection.
- [ ] **Telemetry Explorer**: Ingested events table with status filter and detail drawer.

## Phase 3 Checks: Anomaly Detection & Governance
- [ ] **Anomaly Detection**: Rule-triggered anomalies with severity tags and acknowledgment buttons.
- [ ] **Planned ML Panel**: Distinctly framed panel for unvalidated future models.
- [ ] **Governance Centre**: Configurable policy thresholds and system recommendations.
- [ ] **Approval Centre**: Review dialog with Approve/Reject actions and reviewer comment field.

## Phase 4 Checks: Audit & Verification
- [ ] **Audit Logs**: Cryptographic hash chain table showing sequence and SHA-256 hashes.
- [ ] **Chain Verification**: "Verify Hash Chain" button displaying a green verified state.
- [ ] **Tamper Demo**: Simulated tampering trigger proving detection of tampered records.
- [ ] **Integrations Page**: Status badges for AutoGen, LangGraph, CrewAI, MCP, and A2A.

## Phase 5 Checks: Demo Scenarios
- [ ] **Scenario 1 Run**: Token surge demo trigger and full approval-to-action flow.
- [ ] **Scenario 2 Run**: Repeated execution detection and circuit breaker recommendation.
- [ ] **Scenario 3 Run**: Agent timeout detection and audit trail confirmation.
