const crypto = require('crypto');
const Anomaly = require('../models/Anomaly');
const Telemetry = require('../models/Telemetry');
const Agent = require('../models/Agent');
const GovernancePolicy = require('../models/GovernancePolicy');
const { calculateCosineSimilarity } = require('./textSimilarity');

/**
 * Fetch active governance policy or return default policy settings
 */
const getActivePolicy = async () => {
  const policy = await GovernancePolicy.findOne({ isActive: true });
  if (policy) return policy;

  return {
    maxTokenBudget: Number(process.env.DEFAULT_TOKEN_BUDGET || 50000),
    maxExecutionDurationMs: Number(process.env.DEFAULT_MAX_DURATION_MS || 30000),
    maxRepeatedCalls: Number(process.env.DEFAULT_REPEAT_CALL_THRESHOLD || 3),
    promptDriftThreshold: 0.65,
    heartbeatTimeoutMs: 60000,
    costPer1kTokens: Number(process.env.DEFAULT_COST_PER_1K_TOKENS || 0.002),
    alertSeverity: 'High'
  };
};

/**
 * Evaluates a single telemetry record or trace against the 5 deterministic detection rules.
 * Prevents duplicate anomaly creation for the same trigger condition.
 * @param {object} record Telemetry document
 * @returns {Promise<Array>} List of detected anomalies created
 */
const evaluateTelemetryForAnomalies = async (record) => {
  if (!record) return [];

  const policy = await getActivePolicy();
  const createdAnomalies = [];

  // Helper to prevent duplicate anomaly creation for the same span and type
  const createAnomalyIfNotExists = async (anomalyData) => {
    const existing = await Anomaly.findOne({
      traceId: anomalyData.traceId,
      type: anomalyData.type,
      ...(anomalyData.spanId ? { spanId: anomalyData.spanId } : {})
    });

    if (existing) {
      return null; // Suppress duplicate alert
    }

    const newAnomaly = await Anomaly.create({
      anomalyId: `anom-${anomalyData.type.slice(0, 4)}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...anomalyData
    });
    return newAnomaly;
  };

  // -------------------------------------------------------------
  // Rule 1: Repeated execution / Infinite loop
  // -------------------------------------------------------------
  if (record.callSignature) {
    const repeatCount = await Telemetry.countDocuments({
      traceId: record.traceId,
      callSignature: record.callSignature
    });

    if (repeatCount >= policy.maxRepeatedCalls) {
      const anom = await createAnomalyIfNotExists({
        agentId: record.agentId,
        traceId: record.traceId,
        spanId: record.spanId,
        type: 'repeated_execution',
        severity: 'Critical',
        description: `Repeated execution loop detected: Signature '${record.callSignature}' executed ${repeatCount} times exceeding threshold of ${policy.maxRepeatedCalls}.`,
        evidence: {
          callSignature: record.callSignature,
          repeatCount,
          threshold: policy.maxRepeatedCalls,
          eventType: record.eventType,
          traceId: record.traceId
        },
        recommendedAction: 'circuit_breaker',
        source: record.source || 'live'
      });
      if (anom) createdAnomalies.push(anom);
    }
  }

  // -------------------------------------------------------------
  // Rule 2: Token surge
  // -------------------------------------------------------------
  const spanTokens = record.tokenUsage?.totalTokens || 0;
  if (spanTokens > policy.maxTokenBudget) {
    const anom = await createAnomalyIfNotExists({
      agentId: record.agentId,
      traceId: record.traceId,
      spanId: record.spanId,
      type: 'token_surge',
      severity: 'High',
      description: `Token surge detected: Execution consumed ${spanTokens.toLocaleString()} tokens exceeding ceiling budget of ${policy.maxTokenBudget.toLocaleString()}.`,
      evidence: {
        totalTokens: spanTokens,
        promptTokens: record.tokenUsage?.promptTokens || 0,
        completionTokens: record.tokenUsage?.completionTokens || 0,
        budgetCeiling: policy.maxTokenBudget,
        excessTokens: spanTokens - policy.maxTokenBudget
      },
      recommendedAction: 'token_throttle',
      source: record.source || 'live'
    });
    if (anom) createdAnomalies.push(anom);
  }

  // -------------------------------------------------------------
  // Rule 3: High latency
  // -------------------------------------------------------------
  const duration = record.duration || 0;
  if (duration > policy.maxExecutionDurationMs) {
    const severity = duration > policy.maxExecutionDurationMs * 2 ? 'Critical' : 'High';
    const anom = await createAnomalyIfNotExists({
      agentId: record.agentId,
      traceId: record.traceId,
      spanId: record.spanId,
      type: 'high_latency',
      severity,
      description: `High latency detected: Span execution duration of ${duration}ms exceeded limit of ${policy.maxExecutionDurationMs}ms.`,
      evidence: {
        durationMs: duration,
        thresholdMs: policy.maxExecutionDurationMs,
        excessMs: duration - policy.maxExecutionDurationMs,
        eventType: record.eventType
      },
      recommendedAction: 'model_reroute',
      source: record.source || 'live'
    });
    if (anom) createdAnomalies.push(anom);
  }

  // -------------------------------------------------------------
  // Rule 4: Silent failure / Timeout
  // -------------------------------------------------------------
  if (record.status === 'timeout' || (record.errorInfo && record.errorInfo.code === 'OCR_TIMEOUT_EXCEEDED')) {
    const anom = await createAnomalyIfNotExists({
      agentId: record.agentId,
      traceId: record.traceId,
      spanId: record.spanId,
      type: 'silent_failure',
      severity: 'Critical',
      description: `Silent failure detected: Agent '${record.agentId}' timed out without producing response or completing execution span.`,
      evidence: {
        status: record.status,
        errorInfo: record.errorInfo,
        timeoutThresholdMs: policy.heartbeatTimeoutMs,
        agentId: record.agentId
      },
      recommendedAction: 'circuit_breaker',
      source: record.source || 'live'
    });
    if (anom) createdAnomalies.push(anom);
  }

  // -------------------------------------------------------------
  // Rule 5: Prompt drift (Meaningful baseline text comparison)
  // -------------------------------------------------------------
  const baseline = record.inputMetadata?.baselineText || record.inputMetadata?.baselinePrompt;
  const candidate = record.outputMetadata?.response || record.outputMetadata?.completion || record.inputMetadata?.prompt;

  if (baseline && candidate) {
    const similarityScore = calculateCosineSimilarity(baseline, candidate);

    if (similarityScore < policy.promptDriftThreshold) {
      const anom = await createAnomalyIfNotExists({
        agentId: record.agentId,
        traceId: record.traceId,
        spanId: record.spanId,
        type: 'prompt_drift',
        severity: 'Medium',
        description: `Prompt drift detected: TF cosine text similarity score of ${similarityScore} fell below configured threshold of ${policy.promptDriftThreshold}.`,
        evidence: {
          similarityScore,
          threshold: policy.promptDriftThreshold,
          method: 'Term Frequency (TF) Cosine Similarity (Non-ML)',
          baselinePreview: typeof baseline === 'string' ? baseline.slice(0, 100) : '',
          candidatePreview: typeof candidate === 'string' ? candidate.slice(0, 100) : ''
        },
        recommendedAction: 'model_reroute',
        source: record.source || 'live'
      });
      if (anom) createdAnomalies.push(anom);
    }
  }

  return createdAnomalies;
};

/**
 * Scan all recent telemetry for anomaly conditions (Batch detection scan)
 */
const runBatchDetection = async () => {
  const policy = await getActivePolicy();
  const recentTelemetry = await Telemetry.find()
    .sort({ timestamp: -1 })
    .limit(100);

  const allDetected = [];
  for (const item of recentTelemetry) {
    const detected = await evaluateTelemetryForAnomalies(item);
    if (detected.length > 0) {
      allDetected.push(...detected);
    }
  }

  // Heartbeat timeout check across registered agents
  const activeAgents = await Agent.find({ status: 'Active' });
  const now = Date.now();

  for (const agent of activeAgents) {
    if (agent.lastActive) {
      const elapsedMs = now - new Date(agent.lastActive).getTime();
      if (elapsedMs > policy.heartbeatTimeoutMs) {
        const existing = await Anomaly.findOne({
          agentId: agent.agentId,
          type: 'silent_failure',
          status: 'New'
        });

        if (!existing) {
          const silentAnom = await Anomaly.create({
            anomalyId: `anom-slt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            agentId: agent.agentId,
            traceId: `trace-heartbeat-${agent.agentId}`,
            type: 'silent_failure',
            severity: 'Critical',
            description: `Silent failure detected: Agent '${agent.agentId}' missed heartbeat window (${Math.round(elapsedMs / 1000)}s elapsed vs ${Math.round(policy.heartbeatTimeoutMs / 1000)}s threshold).`,
            evidence: {
              lastActive: agent.lastActive,
              elapsedMs,
              heartbeatTimeoutMs: policy.heartbeatTimeoutMs,
              agentStatus: agent.status
            },
            recommendedAction: 'circuit_breaker',
            source: agent.source || 'live'
          });
          allDetected.push(silentAnom);
        }
      }
    }
  }

  return allDetected;
};

module.exports = {
  getActivePolicy,
  evaluateTelemetryForAnomalies,
  runBatchDetection
};
