const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const Agent = require('../models/Agent');
const Execution = require('../models/Execution');
const Telemetry = require('../models/Telemetry');

const sampleAgents = [
  {
    agentId: 'agent-token-optimizer-01',
    name: 'Token Rate Optimizer',
    type: 'Token Management',
    framework: 'LangGraph',
    description: 'Monitors prompt context windows and compresses token consumption dynamically.',
    status: 'Active',
    source: 'simulated'
  },
  {
    agentId: 'agent-anomaly-sentinel-02',
    name: 'Loop & Sentinel Detector',
    type: 'Failure Detection',
    framework: 'Custom',
    description: 'Tracks call signatures and detects repeated execution patterns or recursion loops.',
    status: 'Active',
    source: 'simulated'
  },
  {
    agentId: 'agent-governance-guard-03',
    name: 'Policy Compliance Guard',
    type: 'Governance',
    framework: 'Custom',
    description: 'Evaluates agent action requests against enterprise governance and rate ceiling policies.',
    status: 'Active',
    source: 'simulated'
  },
  {
    agentId: 'agent-router-nexus-04',
    name: 'Model Routing Coordinator',
    type: 'Model Routing',
    framework: 'AutoGen',
    description: 'Dispatches task intents between reasoning models and fast inference endpoints.',
    status: 'Active',
    source: 'simulated'
  },
  {
    agentId: 'agent-workflow-lead-05',
    name: 'Master Workflow Orchestrator',
    type: 'Orchestration',
    framework: 'LangGraph',
    description: 'Coordinates multi-agent workflows, state handoffs, and parallel task executions.',
    status: 'Active',
    source: 'simulated'
  },
  {
    agentId: 'agent-telemetry-monitor-06',
    name: 'Latency & Heartbeat Monitor',
    type: 'Monitoring',
    framework: 'Custom',
    description: 'Monitors agent heartbeats, p99 latencies, and silent degradation across spans.',
    status: 'Idle',
    source: 'simulated'
  },
  {
    agentId: 'agent-failed-worker-07',
    name: 'Legacy Parser Agent',
    type: 'Monitoring',
    framework: 'CrewAI',
    description: 'Extracts legacy tabular data with timeout risk under heavy loads.',
    status: 'Failed',
    source: 'simulated'
  }
];

const seedAgentsAndTraces = async () => {
  try {
    await connectDB();
    console.log('[Seed] Seeding sample agents...');

    // Upsert agents
    for (const a of sampleAgents) {
      await Agent.findOneAndUpdate(
        { agentId: a.agentId },
        { $set: a },
        { upsert: true, new: true }
      );
    }
    console.log(`[Seed] Seeded ${sampleAgents.length} agents`);

    // Clean old simulated traces
    await Telemetry.deleteMany({ source: 'simulated' });
    await Execution.deleteMany({ source: 'simulated' });

    console.log('[Seed] Generating parent-child execution traces...');

    // Trace 1: Multi-agent successful pipeline
    const trace1Id = 'trace-demo-pipeline-01';
    const span1_1 = 'span-orchestrator-root';
    const span1_2 = 'span-token-check';
    const span1_3 = 'span-routing-model';
    const span1_4 = 'span-governance-eval';

    const baseTime1 = new Date(Date.now() - 4 * 60 * 60 * 1000);

    const spansTrace1 = [
      {
        traceId: trace1Id,
        spanId: span1_1,
        parentSpanId: null,
        agentId: 'agent-workflow-lead-05',
        eventType: 'workflow_step',
        status: 'success',
        duration: 240,
        tokenUsage: { promptTokens: 350, completionTokens: 120, totalTokens: 470 },
        inputMetadata: { task: 'Analyze quarterly portfolio risk', priority: 'high' },
        outputMetadata: { status: 'plan_generated', steps: 3 },
        stateDelta: {
          previousStateRef: null,
          currentStateRef: 'state_snap_init_01',
          changedFields: ['plan', 'status'],
          timestamp: baseTime1,
          executionId: trace1Id
        },
        source: 'simulated',
        timestamp: baseTime1
      },
      {
        traceId: trace1Id,
        spanId: span1_2,
        parentSpanId: span1_1,
        agentId: 'agent-token-optimizer-01',
        eventType: 'llm_call',
        status: 'success',
        duration: 380,
        tokenUsage: { promptTokens: 1200, completionTokens: 340, totalTokens: 1540 },
        inputMetadata: { contextLength: 4200, targetCompression: 0.4 },
        outputMetadata: { compressedLength: 1680, savingsPercentage: 60 },
        stateDelta: {
          previousStateRef: 'state_snap_init_01',
          currentStateRef: 'state_snap_comp_02',
          changedFields: ['compressedPrompt', 'tokenEstimate'],
          timestamp: new Date(baseTime1.getTime() + 300),
          executionId: trace1Id
        },
        source: 'simulated',
        timestamp: new Date(baseTime1.getTime() + 300)
      },
      {
        traceId: trace1Id,
        spanId: span1_3,
        parentSpanId: span1_2,
        agentId: 'agent-router-nexus-04',
        eventType: 'agent_handoff',
        status: 'success',
        duration: 520,
        tokenUsage: { promptTokens: 600, completionTokens: 480, totalTokens: 1080 },
        inputMetadata: { promptType: 'financial_reasoning', preferredModel: 'gemini-1.5-pro' },
        outputMetadata: { routedEndpoint: 'asia-south1-vertex', costTier: 'standard' },
        stateDelta: {
          previousStateRef: 'state_snap_comp_02',
          currentStateRef: 'state_snap_route_03',
          changedFields: ['modelEndpoint', 'routeDecision'],
          timestamp: new Date(baseTime1.getTime() + 700),
          executionId: trace1Id
        },
        source: 'simulated',
        timestamp: new Date(baseTime1.getTime() + 700)
      },
      {
        traceId: trace1Id,
        spanId: span1_4,
        parentSpanId: span1_3,
        agentId: 'agent-governance-guard-03',
        eventType: 'workflow_step',
        status: 'success',
        duration: 180,
        tokenUsage: { promptTokens: 240, completionTokens: 80, totalTokens: 320 },
        inputMetadata: { action: 'execute_trade_simulation', riskScore: 0.12 },
        outputMetadata: { complianceResult: 'PASSED', policyRule: 'POL-AUTO-01' },
        stateDelta: {
          previousStateRef: 'state_snap_route_03',
          currentStateRef: 'state_snap_gov_04',
          changedFields: ['complianceStatus', 'auditId'],
          timestamp: new Date(baseTime1.getTime() + 1300),
          executionId: trace1Id
        },
        source: 'simulated',
        timestamp: new Date(baseTime1.getTime() + 1300)
      }
    ];

    // Trace 2: Error Cascade Lineage
    const trace2Id = 'trace-demo-error-cascade-02';
    const span2_1 = 'span-orchestrator-root-02';
    const span2_2 = 'span-parser-failed';

    const baseTime2 = new Date(Date.now() - 1 * 60 * 60 * 1000);

    const spansTrace2 = [
      {
        traceId: trace2Id,
        spanId: span2_1,
        parentSpanId: null,
        agentId: 'agent-workflow-lead-05',
        eventType: 'workflow_step',
        status: 'success',
        duration: 310,
        tokenUsage: { promptTokens: 400, completionTokens: 150, totalTokens: 550 },
        inputMetadata: { task: 'Ingest legacy balance sheets' },
        outputMetadata: { delegateTo: 'agent-failed-worker-07' },
        source: 'simulated',
        timestamp: baseTime2
      },
      {
        traceId: trace2Id,
        spanId: span2_2,
        parentSpanId: span2_1,
        agentId: 'agent-failed-worker-07',
        eventType: 'tool_execution',
        status: 'error',
        duration: 4850,
        tokenUsage: { promptTokens: 3100, completionTokens: 0, totalTokens: 3100 },
        errorInfo: {
          code: 'OCR_TIMEOUT_EXCEEDED',
          message: 'Document parsing exceeded 30000ms threshold; memory pressure detected.',
          stack: 'TimeoutError: OCR Worker PID 8892 unresponsive\n    at TableParser.processDocument (/workers/ocr.js:142)'
        },
        inputMetadata: { documentUrl: 's3://ledger/2026/q1.pdf', sizeBytes: 15420000 },
        outputMetadata: { error: 'Incomplete document stream' },
        stateDelta: {
          previousStateRef: 'state_snap_p_01',
          currentStateRef: 'state_snap_p_err',
          changedFields: ['status', 'errorPayload'],
          timestamp: new Date(baseTime2.getTime() + 4850),
          executionId: trace2Id
        },
        source: 'simulated',
        timestamp: new Date(baseTime2.getTime() + 350)
      }
    ];

    await Telemetry.insertMany([...spansTrace1, ...spansTrace2]);

    // Create corresponding executions
    const costPer1k = Number(process.env.DEFAULT_COST_PER_1K_TOKENS || 0.002);

    await Execution.create([
      {
        executionId: `exec-${trace1Id}`,
        traceId: trace1Id,
        agentId: 'agent-workflow-lead-05',
        parentExecutionId: null,
        status: 'success',
        startTime: baseTime1,
        endTime: new Date(baseTime1.getTime() + 1500),
        duration: 1500,
        tokens: { prompt: 2390, completion: 1020, total: 3410 },
        cost: (3410 / 1000) * costPer1k,
        rootSpanId: span1_1,
        source: 'simulated'
      },
      {
        executionId: `exec-${trace2Id}`,
        traceId: trace2Id,
        agentId: 'agent-failed-worker-07',
        parentExecutionId: span2_1,
        status: 'failed',
        startTime: baseTime2,
        endTime: new Date(baseTime2.getTime() + 5200),
        duration: 5200,
        tokens: { prompt: 3500, completion: 150, total: 3650 },
        cost: (3650 / 1000) * costPer1k,
        rootSpanId: span2_1,
        errorMessage: 'Document parsing exceeded 30000ms threshold; memory pressure detected.',
        source: 'simulated'
      }
    ]);

    // Update agent totals
    await Agent.findOneAndUpdate(
      { agentId: 'agent-workflow-lead-05' },
      { $inc: { executionCount: 2, totalTokens: 1020 }, $set: { lastActive: baseTime2 } }
    );
    await Agent.findOneAndUpdate(
      { agentId: 'agent-failed-worker-07' },
      { $inc: { executionCount: 1, totalTokens: 3100 }, $set: { status: 'Failed', lastActive: baseTime2 } }
    );
    await Agent.findOneAndUpdate(
      { agentId: 'agent-token-optimizer-01' },
      { $inc: { executionCount: 1, totalTokens: 1540 }, $set: { lastActive: baseTime1 } }
    );

    console.log('[Seed] Trace seeding complete!');
  } catch (error) {
    console.error('[Seed Error]:', error);
    throw error;
  }
};

if (require.main === module) {
  seedAgentsAndTraces().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = seedAgentsAndTraces;
