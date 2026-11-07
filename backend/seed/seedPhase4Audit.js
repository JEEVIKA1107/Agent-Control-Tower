const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const AuditLog = require('../models/AuditLog');
const Integration = require('../models/Integration');
const { appendAuditLog } = require('../services/auditService');

const seedPhase4Audit = async () => {
  try {
    await connectDB();
    console.log('[Seed Phase 4] Seeding cryptographic audit log chain and integrations...');

    // 1. Reset simulated audit logs and integrations
    await AuditLog.deleteMany({ source: 'simulated' });
    await Integration.deleteMany({});

    // 2. Seed sequential cryptographic audit logs using appendAuditLog
    await appendAuditLog({
      userId: 'usr-admin-seed',
      actorName: 'Security Admin',
      eventType: 'DEMO_SEED',
      relatedAgent: null,
      relatedExecution: null,
      actionDetails: {
        action: 'INITIALIZE_CONTROL_TOWER',
        description: 'Initialized multi-agent governance control tower with genesis security baseline.',
        environment: 'demonstration'
      },
      source: 'simulated'
    });

    await appendAuditLog({
      userId: 'usr-admin-seed',
      actorName: 'Security Admin',
      eventType: 'AGENT_REGISTERED',
      relatedAgent: 'agent-customer-support-01',
      relatedExecution: null,
      actionDetails: {
        agentId: 'agent-customer-support-01',
        name: 'Customer Support Dispatcher',
        framework: 'LangGraph',
        role: 'Triage incoming customer tickets and route to sub-agents'
      },
      source: 'simulated'
    });

    await appendAuditLog({
      userId: 'usr-admin-seed',
      actorName: 'Security Admin',
      eventType: 'AGENT_REGISTERED',
      relatedAgent: 'agent-sql-generator-03',
      relatedExecution: null,
      actionDetails: {
        agentId: 'agent-sql-generator-03',
        name: 'Database Query Synthesizer',
        framework: 'AutoGen',
        role: 'Generate read-only SQL queries from natural language requests'
      },
      source: 'simulated'
    });

    await appendAuditLog({
      userId: 'usr-admin-seed',
      actorName: 'Security Admin',
      eventType: 'POLICY_UPDATED',
      relatedAgent: null,
      relatedExecution: null,
      actionDetails: {
        policyId: 'pol-default-governance',
        maxTokenBudget: 50000,
        maxExecutionDurationMs: 30000,
        maxRepeatedCalls: 3,
        promptDriftThreshold: 0.65,
        heartbeatTimeoutMs: 60000
      },
      source: 'simulated'
    });

    await appendAuditLog({
      userId: 'usr-operator-seed',
      actorName: 'Operations Lead',
      eventType: 'ANOMALY_ACKNOWLEDGED',
      relatedAgent: 'agent-anomaly-sentinel-02',
      relatedExecution: 'exec-trace-demo-loop-01',
      actionDetails: {
        anomalyId: 'anom-loop-01',
        type: 'repeated_execution',
        severity: 'Critical',
        note: 'Operator verified recursive loop condition in candidate query evaluation.'
      },
      source: 'simulated'
    });

    await appendAuditLog({
      userId: 'usr-admin-seed',
      actorName: 'Security Admin',
      eventType: 'APPROVAL_DECISION',
      relatedAgent: 'agent-anomaly-sentinel-02',
      relatedExecution: 'exec-trace-demo-loop-01',
      actionDetails: {
        requestId: 'appr-req-01',
        decision: 'approved',
        proposedAction: 'circuit_breaker',
        reviewerComments: 'Approved circuit breaker activation to prevent token exhaustion.'
      },
      source: 'simulated'
    });

    await appendAuditLog({
      userId: 'system',
      actorName: 'Governance Daemon',
      eventType: 'ACTION_EXECUTED',
      relatedAgent: 'agent-anomaly-sentinel-02',
      relatedExecution: 'exec-trace-demo-loop-01',
      actionDetails: {
        actionExecutionId: 'act-exec-01',
        actionType: 'circuit_breaker',
        status: 'simulated',
        result: 'Simulated dispatch signal emitted to agent controller. External runtime isolated.'
      },
      source: 'simulated'
    });

    await appendAuditLog({
      userId: 'usr-admin-seed',
      actorName: 'Security Admin',
      eventType: 'INTEGRATION_CONFIGURED',
      relatedAgent: null,
      relatedExecution: null,
      actionDetails: {
        integrationId: 'otel',
        name: 'OpenTelemetry (OTel)',
        endpoint: '/api/telemetry/ingest',
        status: 'Connected'
      },
      source: 'simulated'
    });

    // 3. Seed Integrations table
    const integrationsData = [
      {
        integrationId: 'otel',
        name: 'OpenTelemetry (OTel)',
        type: 'Telemetry Protocol',
        status: 'Connected',
        dataSourceType: 'Direct HTTP Ingestion (/api/telemetry/ingest)',
        configurationStatus: 'Active & Ingesting',
        description: 'Generic OpenTelemetry-compliant JSON ingestion adapter running on /api/telemetry/ingest.',
        lastReceivedEvent: new Date(),
        source: 'live'
      },
      {
        integrationId: 'langgraph',
        name: 'LangGraph',
        type: 'Multi-Agent Framework',
        status: 'Simulated Demo',
        dataSourceType: 'Simulated StateGraph Trace Normalizer',
        configurationStatus: 'Simulated Adapter Active',
        description: 'Synthetic trace ingestion adapter converting state graph spans into common telemetry schema.',
        lastReceivedEvent: new Date(Date.now() - 1000 * 60 * 12),
        source: 'simulated'
      },
      {
        integrationId: 'autogen',
        name: 'AutoGen',
        type: 'Multi-Agent Framework',
        status: 'Simulated Demo',
        dataSourceType: 'Simulated Conversation Message Turns',
        configurationStatus: 'Simulated Adapter Active',
        description: 'Simulated conversational agent message turns normalized for token and latency tracking.',
        lastReceivedEvent: new Date(Date.now() - 1000 * 60 * 35),
        source: 'simulated'
      },
      {
        integrationId: 'crewai',
        name: 'CrewAI',
        type: 'Multi-Agent Framework',
        status: 'Planned',
        dataSourceType: 'Hierarchical Task Execution Hooks (Unconnected)',
        configurationStatus: 'Planned Enhancement',
        description: 'Sequential and hierarchical crew task execution listener (scheduled for future release).',
        lastReceivedEvent: null,
        source: 'simulated'
      },
      {
        integrationId: 'mcp',
        name: 'Model Context Protocol (MCP)',
        type: 'Tool Protocol',
        status: 'Planned',
        dataSourceType: 'JSON-RPC Tool Server Discovery',
        configurationStatus: 'Planned Specification',
        description: 'Standardized tool server protocol monitoring agent-to-tool capabilities and security boundaries.',
        lastReceivedEvent: null,
        source: 'simulated'
      },
      {
        integrationId: 'a2a',
        name: 'Agent-to-Agent (A2A)',
        type: 'Inter-Agent Protocol',
        status: 'Planned',
        dataSourceType: 'Decentralized Peer Envelope',
        configurationStatus: 'Planned Specification',
        description: 'Direct inter-agent handshake and message envelope validation protocol.',
        lastReceivedEvent: null,
        source: 'simulated'
      }
    ];

    await Integration.insertMany(integrationsData);

    console.log('[Seed Phase 4] Successfully seeded 8 hash-chained audit logs and 6 integration entries.');
    if (process.env.NODE_ENV !== 'test' && require.main === module) {
      process.exit(0);
    }
  } catch (err) {
    console.error('[Seed Phase 4 Error]:', err);
    if (process.env.NODE_ENV !== 'test' && require.main === module) {
      process.exit(1);
    }
  }
};

if (require.main === module) {
  seedPhase4Audit();
}

module.exports = seedPhase4Audit;
