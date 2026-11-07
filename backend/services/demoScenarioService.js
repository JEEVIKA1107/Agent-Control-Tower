const crypto = require('crypto');
const Telemetry = require('../models/Telemetry');
const Execution = require('../models/Execution');
const Agent = require('../models/Agent');
const Anomaly = require('../models/Anomaly');
const GovernancePolicy = require('../models/GovernancePolicy');
const GovernanceRecommendation = require('../models/GovernanceRecommendation');
const ApprovalRequest = require('../models/ApprovalRequest');
const ActionExecution = require('../models/ActionExecution');
const { runBatchDetection } = require('./anomalyDetector');
const { generateRecommendationForAnomaly, processApprovalDecision } = require('./governanceEngine');
const { verifyAuditChain, simulateDemoTamper, restoreDemoChain, appendAuditLog } = require('./auditService');
const resetDemo = require('../seed/resetDemo');

/**
 * Scenario A: Normal Agent Execution
 * Ingests a healthy multi-span trace for customer support triage.
 * Updates agent total tokens and telemetry history.
 */
const runScenarioA = async (io = null) => {
  const agentId = 'agent-customer-support-01';
  let agent = await Agent.findOne({ agentId });
  if (!agent) {
    agent = await Agent.create({
      agentId,
      name: 'Customer Support Dispatcher',
      type: 'Monitoring',
      framework: 'LangGraph',
      status: 'Active',
      source: 'simulated'
    });
  }

  const traceId = `trace-scenario-a-${Date.now()}`;
  const now = new Date();

  // Root span
  const rootSpanId = `span-root-${Math.random().toString(36).substring(2, 7)}`;
  const rootSpan = await Telemetry.create({
    traceId,
    spanId: rootSpanId,
    parentSpanId: null,
    agentId,
    eventType: 'workflow_step',
    status: 'success',
    duration: 450,
    tokenUsage: {
      promptTokens: 280,
      completionTokens: 140,
      totalTokens: 420
    },
    callSignature: `${agentId}:triage_inquiry:normal`,
    timestamp: now,
    source: 'simulated',
    payload: { query: 'How do I configure webhook notifications?' }
  });

  // Child span 1: Knowledge retrieval
  const childSpan1Id = `span-child1-${Math.random().toString(36).substring(2, 7)}`;
  const childSpan1 = await Telemetry.create({
    traceId,
    spanId: childSpan1Id,
    parentSpanId: rootSpanId,
    agentId,
    eventType: 'tool_execution',
    status: 'success',
    duration: 320,
    tokenUsage: {
      promptTokens: 500,
      completionTokens: 150,
      totalTokens: 650
    },
    callSignature: `${agentId}:fetch_kb_context:normal`,
    timestamp: new Date(now.getTime() + 100),
    source: 'simulated',
    payload: { searchKeywords: ['webhook', 'notifications', 'headers'] }
  });

  // Child span 2: Response formulation
  const childSpan2Id = `span-child2-${Math.random().toString(36).substring(2, 7)}`;
  const childSpan2 = await Telemetry.create({
    traceId,
    spanId: childSpan2Id,
    parentSpanId: rootSpanId,
    agentId,
    eventType: 'llm_call',
    status: 'success',
    duration: 820,
    tokenUsage: {
      promptTokens: 600,
      completionTokens: 380,
      totalTokens: 980
    },
    callSignature: `${agentId}:synthesize_response:normal`,
    timestamp: new Date(now.getTime() + 250),
    source: 'simulated',
    payload: { answerLength: 145 }
  });

  // Update Execution record
  const totalTokens = 420 + 650 + 980;
  const totalCost = Number(((totalTokens / 1000) * 0.002).toFixed(6));
  await Execution.create({
    executionId: `exec-${traceId}`,
    traceId,
    rootSpanId,
    agentId,
    startTime: now,
    endTime: new Date(now.getTime() + 1070),
    duration: 1070,
    tokens: {
      prompt: 1380,
      completion: 670,
      total: totalTokens
    },
    cost: totalCost,
    status: 'success',
    source: 'simulated'
  });

  // Update Agent totals
  await Agent.findOneAndUpdate(
    { agentId },
    {
      $inc: {
        executionCount: 1,
        totalTokens: totalTokens
      },
      $set: { lastActive: new Date() }
    }
  );

  if (io) {
    io.emit('telemetry:ingested', { traceId, agentId, totalTokens, status: 'OK' });
  }

  return {
    scenario: 'Scenario A: Normal Agent Execution',
    traceId,
    agentId,
    spansIngested: 3,
    totalTokens,
    estimatedCost: totalCost,
    status: 'Completed (All spans within threshold)',
    message: 'Healthy multi-span execution ingested, dashboard metrics updated, lineage graph constructed.'
  };
};

/**
 * Scenario B: Repeated Execution Anomaly (Infinite Recursion Loop)
 * Emits 4 identical call signatures exceeding the policy threshold of 3.
 * Triggers anomaly detection and automatic circuit breaker recommendation.
 */
const runScenarioB = async (io = null) => {
  const agentId = 'agent-sql-generator-03';
  let agent = await Agent.findOne({ agentId });
  if (!agent) {
    agent = await Agent.create({
      agentId,
      name: 'Database Query Synthesizer',
      type: 'Monitoring',
      framework: 'AutoGen',
      status: 'Active',
      source: 'simulated'
    });
  }
  const traceId = `trace-scenario-b-loop-${Date.now()}`;
  const callSignature = `${agentId}:retry_query_schema:loop`;
  const now = new Date();

  // Create 4 repeated spans in the trace
  for (let i = 1; i <= 4; i++) {
    await Telemetry.create({
      traceId,
      spanId: `span-loop-${i}-${Math.random().toString(36).substring(2, 6)}`,
      parentSpanId: i === 1 ? null : `span-loop-1`,
      agentId,
      eventType: 'llm_call',
      callSignature,
      duration: 400 + i * 50,
      tokenUsage: {
        promptTokens: 800,
        completionTokens: 400,
        totalTokens: 1200
      },
      status: 'success',
      timestamp: new Date(now.getTime() + i * 150),
      source: 'simulated'
    });
  }

  // Run anomaly detection scan
  const detected = await runBatchDetection();
  const loopAnomaly = detected.find(
    (a) => a.type === 'repeated_execution' && a.traceId === traceId
  ) || await Anomaly.findOne({ traceId, type: 'repeated_execution' });

  // Generate governance recommendation and approval request
  let recommendation = null;
  let approvalRequest = null;
  if (loopAnomaly) {
    const govResult = await generateRecommendationForAnomaly(loopAnomaly);
    recommendation = govResult.recommendation;
    approvalRequest = govResult.approvalRequest;
  }

  if (io && loopAnomaly) {
    io.emit('anomaly:detected', { count: 1, anomalies: [loopAnomaly] });
  }

  return {
    scenario: 'Scenario B: Repeated Execution Anomaly',
    traceId,
    agentId,
    callSignature,
    anomaly: loopAnomaly,
    recommendation,
    approvalRequest,
    message: 'Repeated call recursion detected. Circuit-breaker governance recommendation generated.'
  };
};

/**
 * Scenario C: Token Surge Anomaly
 * Emits telemetry using 75,000 tokens, exceeding the policy limit of 50,000 tokens.
 * Triggers token surge anomaly and token throttling recommendation.
 */
const runScenarioC = async (io = null) => {
  const agentId = 'agent-market-researcher-04';
  let agent = await Agent.findOne({ agentId });
  if (!agent) {
    agent = await Agent.create({
      agentId,
      name: 'Market Research Synthesizer',
      type: 'Monitoring',
      framework: 'CrewAI',
      status: 'Active',
      source: 'simulated'
    });
  }
  const traceId = `trace-scenario-c-surge-${Date.now()}`;
  const spanId = `span-surge-${Date.now()}`;
  const tokensUsed = 78500;
  const now = new Date();

  await Telemetry.create({
    traceId,
    spanId,
    parentSpanId: null,
    agentId,
    eventType: 'llm_call',
    callSignature: `${agentId}:unbounded_corpus_scan:surge`,
    duration: 4200,
    tokenUsage: {
      promptTokens: 60000,
      completionTokens: 18500,
      totalTokens: tokensUsed
    },
    status: 'success',
    timestamp: now,
    source: 'simulated'
  });

  // Run anomaly detection scan
  const detected = await runBatchDetection();
  const surgeAnomaly = detected.find(
    (a) => a.type === 'token_surge' && a.traceId === traceId
  ) || await Anomaly.findOne({ traceId, type: 'token_surge' });

  let recommendation = null;
  let approvalRequest = null;
  if (surgeAnomaly) {
    const govResult = await generateRecommendationForAnomaly(surgeAnomaly);
    recommendation = govResult.recommendation;
    approvalRequest = govResult.approvalRequest;
  }

  if (io && surgeAnomaly) {
    io.emit('anomaly:detected', { count: 1, anomalies: [surgeAnomaly] });
  }

  return {
    scenario: 'Scenario C: Token Surge Anomaly',
    traceId,
    agentId,
    tokensUsed,
    policyBudget: 50000,
    anomaly: surgeAnomaly,
    recommendation,
    approvalRequest,
    message: 'Token surge detected (> 50k tokens). Token throttling recommendation and approval request created.'
  };
};

/**
 * Scenario D: Human Approval Workflow
 * Processes two approval requests:
 * 1. Approves Request 1 -> creates ActionExecution with status 'simulated'
 * 2. Rejects Request 2 -> creates ActionExecution with status 'not_executed'
 * Both decisions append tamper-evident SHA-256 audit records.
 */
const runScenarioD = async (operatorUser = { email: 'operator@controltower.io', name: 'Lead Operator' }) => {
  // Ensure at least two pending approval requests exist
  let pendingRequests = await ApprovalRequest.find({ status: 'Pending' }).limit(2);

  if (pendingRequests.length < 2) {
    // Generate two fresh pending approval requests
    const anom1 = await Anomaly.create({
      anomalyId: `anom-scen-d1-${Date.now()}`,
      agentId: 'agent-sql-generator-03',
      traceId: `trace-demo-d1-${Date.now()}`,
      type: 'repeated_execution',
      severity: 'High',
      description: 'Candidate query repeat violation requiring circuit breaker.',
      evidence: { repeatCount: 4, threshold: 3 },
      recommendedAction: 'circuit_breaker',
      source: 'simulated'
    });
    const gov1 = await generateRecommendationForAnomaly(anom1);

    const anom2 = await Anomaly.create({
      anomalyId: `anom-scen-d2-${Date.now()}`,
      agentId: 'agent-market-researcher-04',
      traceId: `trace-demo-d2-${Date.now()}`,
      type: 'token_surge',
      severity: 'Medium',
      description: 'Exceeded dynamic quota by 22,000 tokens.',
      evidence: { tokensUsed: 72000, maxBudget: 50000 },
      recommendedAction: 'token_throttle',
      source: 'simulated'
    });
    const gov2 = await generateRecommendationForAnomaly(anom2);

    pendingRequests = [gov1.approvalRequest, gov2.approvalRequest];
  }

  // 1. Approve first request
  const approvedResult = await processApprovalDecision(
    pendingRequests[0].requestId,
    'Approved',
    operatorUser,
    'Approved circuit-breaker isolation. Action executed in simulated mode.'
  );

  // 2. Reject second request
  const rejectedResult = await processApprovalDecision(
    pendingRequests[1].requestId,
    'Rejected',
    operatorUser,
    'Rejected token throttling: temporary batch load accepted by operator.'
  );

  return {
    scenario: 'Scenario D: Human Approval Workflow',
    approvedWorkflow: {
      requestId: pendingRequests[0].requestId,
      decision: 'Approved',
      actionExecutionStatus: approvedResult.actionExecution.status, // 'simulated'
      actionSummary: approvedResult.actionExecution.outputSummary
    },
    rejectedWorkflow: {
      requestId: pendingRequests[1].requestId,
      decision: 'Rejected',
      actionExecutionStatus: rejectedResult.actionExecution.status, // 'not_executed'
      actionSummary: rejectedResult.actionExecution.outputSummary
    },
    message: 'Human approval decisions processed. ActionExecutions correctly recorded as simulated and not_executed.'
  };
};

/**
 * Scenario E: Cryptographic Audit Trail Verification
 * Traverses ledger (valid: true) -> Simulates controlled tamper -> Detects broken sequence -> Restores chain (valid: true).
 */
const runScenarioE = async () => {
  // 1. Initial verification
  const beforeVerify = await verifyAuditChain();

  // 2. Simulate controlled tamper on a simulated demo record
  const tamperResult = await simulateDemoTamper();

  // 3. Verify during tamper (demonstrates detection)
  const duringVerify = await verifyAuditChain();

  // 4. Restore demo cryptographic chain
  const restoreResult = await restoreDemoChain();

  // 5. Verify after restoration
  const afterVerify = await verifyAuditChain();

  return {
    scenario: 'Scenario E: Cryptographic Audit Verification',
    beforeVerification: beforeVerify,
    tamperedRecord: {
      sequenceNumber: tamperResult.tamperedSequenceNumber,
      message: tamperResult.message
    },
    tamperDetectedVerification: duringVerify,
    restoration: restoreResult,
    finalVerification: afterVerify,
    message: 'Tampering demonstration completed: detected broken sequence immediately and restored cryptographic integrity.'
  };
};

module.exports = {
  runScenarioA,
  runScenarioB,
  runScenarioC,
  runScenarioD,
  runScenarioE
};
