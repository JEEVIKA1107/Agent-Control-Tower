const GovernancePolicy = require('../models/GovernancePolicy');
const GovernanceRecommendation = require('../models/GovernanceRecommendation');
const ApprovalRequest = require('../models/ApprovalRequest');
const ActionExecution = require('../models/ActionExecution');
const { getActivePolicy } = require('./anomalyDetector');

/**
 * Evaluates an anomaly and generates a Governance Recommendation and linked pending ApprovalRequest.
 * Enforces the strict separation: Recommendation -> ApprovalRequest -> ActionExecution.
 * @param {object} anomaly Anomaly document
 * @returns {Promise<object>} Created recommendation and approval request
 */
const generateRecommendationForAnomaly = async (anomaly) => {
  if (!anomaly) return null;

  // Check if active recommendation already exists for this anomaly
  const existing = await GovernanceRecommendation.findOne({
    anomalyId: anomaly.anomalyId,
    status: 'active'
  });
  if (existing) return existing;

  const policy = await getActivePolicy();

  let actionType = 'human_inspection';
  let reason = '';
  let parameters = {};

  switch (anomaly.type) {
    case 'token_surge':
      actionType = 'token_throttle';
      reason = `Excessive token consumption detected on agent ${anomaly.agentId}. Recommend throttling prompt context to 2,048 tokens and enforcing completion ceilings.`;
      parameters = {
        throttleTokens: Math.min(2048, Math.round(policy.maxTokenBudget / 2)),
        budgetCeiling: policy.maxTokenBudget
      };
      break;

    case 'repeated_execution':
    case 'silent_failure':
      actionType = 'circuit_breaker';
      reason = `Critical execution failure or infinite recursion loop detected on agent ${anomaly.agentId}. Recommend immediate circuit-breaker activation to halt further downstream calls.`;
      parameters = {
        targetAgentId: anomaly.agentId,
        tripDurationMinutes: 15,
        failFast: true
      };
      break;

    case 'high_latency':
    case 'prompt_drift':
      actionType = 'model_reroute';
      reason = `Latency degradation or semantic prompt drift detected on agent ${anomaly.agentId}. Recommend routing task traffic to fallback inference endpoint (e.g. gemini-1.5-flash fast lane).`;
      parameters = {
        currentRoute: 'standard-reasoning',
        suggestedFallbackRoute: 'gemini-1.5-flash-fast-lane',
        expectedLatencyReductionPct: 45
      };
      break;

    default:
      actionType = 'human_inspection';
      reason = `Operator inspection required for anomaly on agent ${anomaly.agentId}.`;
      break;
  }

  // 1. Create Recommendation Record
  const recId = `rec-${actionType.slice(0, 4)}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const recommendation = await GovernanceRecommendation.create({
    recommendationId: recId,
    anomalyId: anomaly.anomalyId,
    agentId: anomaly.agentId,
    traceId: anomaly.traceId,
    actionType,
    reason,
    parameters,
    status: 'active',
    source: anomaly.source || 'live'
  });

  // 2. Create Linked Pending ApprovalRequest Record
  const reqId = `appr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const approvalRequest = await ApprovalRequest.create({
    requestId: reqId,
    recommendationId: recommendation.recommendationId,
    agentId: anomaly.agentId,
    anomalyId: anomaly.anomalyId,
    actionType,
    reason,
    severity: anomaly.severity || 'Medium',
    status: 'Pending',
    requestedAt: new Date(),
    source: anomaly.source || 'live'
  });

  return {
    recommendation,
    approvalRequest
  };
};

/**
 * Process a human approval decision (Approve or Reject)
 * Only Admin or Operator permitted.
 * @param {string} requestId ApprovalRequest identifier
 * @param {string} decision 'Approved' | 'Rejected'
 * @param {object} reviewer User object { email, role, name }
 * @param {string} reviewerComment Human operator commentary
 */
const processApprovalDecision = async (requestId, decision, reviewer, reviewerComment = '') => {
  const approval = await ApprovalRequest.findOne({ requestId });
  if (!approval) {
    throw new Error(`Approval request not found with ID: ${requestId}`);
  }

  if (approval.status !== 'Pending') {
    throw new Error(`Approval request has already been resolved with status: ${approval.status}`);
  }

  const isApproved = decision === 'Approved';

  // 1. Update ApprovalRequest
  approval.status = isApproved ? 'Approved' : 'Rejected';
  approval.decidedBy = reviewer.email || reviewer.name;
  approval.decidedAt = new Date();
  approval.reviewerComment = reviewerComment || (isApproved ? 'Approved by operator' : 'Rejected by operator');
  await approval.save();

  // 2. Update GovernanceRecommendation
  await GovernanceRecommendation.findOneAndUpdate(
    { recommendationId: approval.recommendationId },
    { $set: { status: isApproved ? 'approved' : 'rejected' } }
  );

  // 3. Create ActionExecution Record
  // Critical directive: Status is STRICTLY "simulated" unless a genuine external system is hooked up.
  // Recommendation is NEVER treated as an executed physical action.
  const actionExecution = await ActionExecution.create({
    actionExecutionId: `act-exec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    approvalRequestId: approval.requestId,
    agentId: approval.agentId,
    actionType: approval.actionType,
    status: isApproved ? 'simulated' : 'not_executed',
    outputSummary: isApproved
      ? `Simulated execution of ${approval.actionType} for agent ${approval.agentId}. Policy action applied in simulated mode.`
      : `Action ${approval.actionType} was rejected by ${approval.decidedBy}. No execution dispatched.`,
    executedAt: new Date(),
    source: approval.source || 'simulated'
  });

  // 4. Append Cryptographic Audit Trail
  try {
    const { appendAuditLog } = require('./auditService');
    await appendAuditLog({
      userId: reviewer.email || reviewer.name,
      actorName: reviewer.name || reviewer.email,
      eventType: 'APPROVAL_DECISION',
      relatedAgent: approval.agentId,
      actionDetails: {
        requestId: approval.requestId,
        decision,
        actionType: approval.actionType,
        comment: reviewerComment
      },
      source: approval.source || 'simulated'
    });

    await appendAuditLog({
      userId: 'system',
      actorName: 'Governance Dispatcher',
      eventType: 'ACTION_EXECUTED',
      relatedAgent: approval.agentId,
      actionDetails: {
        actionExecutionId: actionExecution.actionExecutionId,
        actionType: actionExecution.actionType,
        status: actionExecution.status,
        summary: actionExecution.outputSummary
      },
      source: actionExecution.source || 'simulated'
    });
  } catch (auditErr) {
    console.warn('[Audit Warning]:', auditErr.message);
  }

  return {
    approval,
    actionExecution
  };
};

module.exports = {
  generateRecommendationForAnomaly,
  processApprovalDecision
};
