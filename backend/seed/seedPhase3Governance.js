const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const Anomaly = require('../models/Anomaly');
const GovernancePolicy = require('../models/GovernancePolicy');
const GovernanceRecommendation = require('../models/GovernanceRecommendation');
const ApprovalRequest = require('../models/ApprovalRequest');
const ActionExecution = require('../models/ActionExecution');

const seedPhase3Governance = async () => {
  try {
    await connectDB();
    console.log('[Seed Phase 3] Seeding governance policies, anomalies, recommendations and approvals...');

    // 1. Ensure Policy exists
    await GovernancePolicy.findOneAndUpdate(
      { policyId: 'pol-default-governance' },
      {
        $set: {
          policyId: 'pol-default-governance',
          name: 'Enterprise Multi-Agent Default Policy',
          description: 'Global threshold ceiling for tokens, duration, recursion limits and approval gates.',
          maxTokenBudget: 50000,
          maxExecutionDurationMs: 30000,
          maxRepeatedCalls: 3,
          promptDriftThreshold: 0.65,
          heartbeatTimeoutMs: 60000,
          costPer1kTokens: 0.002,
          requireHumanApproval: true,
          alertSeverity: 'High',
          isActive: true,
          source: 'simulated'
        }
      },
      { upsert: true, new: true }
    );

    // 2. Clear old simulated anomalies, recommendations, approvals
    await Anomaly.deleteMany({ source: 'simulated' });
    await GovernanceRecommendation.deleteMany({ source: 'simulated' });
    await ApprovalRequest.deleteMany({ source: 'simulated' });
    await ActionExecution.deleteMany({ source: 'simulated' });

    // 3. Create Sample Anomalies
    const anom1 = await Anomaly.create({
      anomalyId: 'anom-loop-01',
      agentId: 'agent-anomaly-sentinel-02',
      traceId: 'trace-demo-loop-01',
      spanId: 'span-loop-rec-03',
      type: 'repeated_execution',
      severity: 'Critical',
      description: 'Repeated execution loop detected: Signature agent-anomaly-sentinel-02:eval_state:3a8f executed 4 times exceeding recursion ceiling of 3.',
      evidence: {
        callSignature: 'agent-anomaly-sentinel-02:eval_state:3a8f',
        repeatCount: 4,
        threshold: 3,
        traceId: 'trace-demo-loop-01'
      },
      recommendedAction: 'circuit_breaker',
      status: 'New',
      source: 'simulated'
    });

    const anom2 = await Anomaly.create({
      anomalyId: 'anom-surge-02',
      agentId: 'agent-token-optimizer-01',
      traceId: 'trace-demo-surge-02',
      spanId: 'span-surge-52k',
      type: 'token_surge',
      severity: 'High',
      description: 'Token surge detected: Execution consumed 54,200 tokens exceeding ceiling budget of 50,000.',
      evidence: {
        totalTokens: 54200,
        budgetCeiling: 50000,
        excessTokens: 4200
      },
      recommendedAction: 'token_throttle',
      status: 'New',
      source: 'simulated'
    });

    const anom3 = await Anomaly.create({
      anomalyId: 'anom-silent-03',
      agentId: 'agent-failed-worker-07',
      traceId: 'trace-demo-error-cascade-02',
      spanId: 'span-parser-failed',
      type: 'silent_failure',
      severity: 'Critical',
      description: 'Silent failure detected: Agent agent-failed-worker-07 stopped responding due to document parsing timeout.',
      evidence: {
        status: 'timeout',
        errorInfo: { code: 'OCR_TIMEOUT_EXCEEDED' }
      },
      recommendedAction: 'circuit_breaker',
      status: 'Acknowledged',
      acknowledgedBy: 'operator@controltower.io',
      acknowledgedAt: new Date(Date.now() - 30 * 60 * 1000),
      source: 'simulated'
    });

    // 4. Create Recommendations & Approval Requests
    // Recommendation & Approval for Loop -> Pending
    const rec1 = await GovernanceRecommendation.create({
      recommendationId: 'rec-cb-01',
      anomalyId: anom1.anomalyId,
      agentId: anom1.agentId,
      traceId: anom1.traceId,
      actionType: 'circuit_breaker',
      reason: 'Critical execution failure or infinite recursion loop detected on agent agent-anomaly-sentinel-02. Recommend immediate circuit-breaker activation.',
      parameters: { tripDurationMinutes: 15, failFast: true },
      status: 'active',
      source: 'simulated'
    });

    await ApprovalRequest.create({
      requestId: 'appr-req-01',
      recommendationId: rec1.recommendationId,
      agentId: anom1.agentId,
      anomalyId: anom1.anomalyId,
      actionType: 'circuit_breaker',
      reason: rec1.reason,
      severity: 'Critical',
      status: 'Pending',
      source: 'simulated'
    });

    // Recommendation & Approval for Token Surge -> Approved with ActionExecution (simulated)
    const rec2 = await GovernanceRecommendation.create({
      recommendationId: 'rec-th-02',
      anomalyId: anom2.anomalyId,
      agentId: anom2.agentId,
      traceId: anom2.traceId,
      actionType: 'token_throttle',
      reason: 'Excessive token consumption detected on agent agent-token-optimizer-01. Recommend throttling context window to 2,048 tokens.',
      parameters: { throttleTokens: 2048, budgetCeiling: 50000 },
      status: 'approved',
      source: 'simulated'
    });

    const app2 = await ApprovalRequest.create({
      requestId: 'appr-req-02',
      recommendationId: rec2.recommendationId,
      agentId: anom2.agentId,
      anomalyId: anom2.anomalyId,
      actionType: 'token_throttle',
      reason: rec2.reason,
      severity: 'High',
      status: 'Approved',
      decidedBy: 'operator@controltower.io',
      decidedAt: new Date(Date.now() - 15 * 60 * 1000),
      reviewerComment: 'Context window throttled to protect budget allocation.',
      source: 'simulated'
    });

    // ActionExecution record (Strictly simulated)
    await ActionExecution.create({
      actionExecutionId: 'act-exec-sample-01',
      approvalRequestId: app2.requestId,
      agentId: app2.agentId,
      actionType: app2.actionType,
      status: 'simulated',
      outputSummary: 'Simulated execution of token_throttle for agent agent-token-optimizer-01. Policy action applied in simulated mode.',
      executedAt: new Date(Date.now() - 15 * 60 * 1000),
      source: 'simulated'
    });

    console.log('[Seed Phase 3] Seeded governance anomalies, recommendations, approvals, and simulated action executions!');
  } catch (error) {
    console.error('[Seed Phase 3 Error]:', error);
    throw error;
  }
};

if (require.main === module) {
  seedPhase3Governance().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = seedPhase3Governance;
