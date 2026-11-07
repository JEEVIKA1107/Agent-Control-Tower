const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const Anomaly = require('../models/Anomaly');
const Telemetry = require('../models/Telemetry');
const GovernancePolicy = require('../models/GovernancePolicy');
const User = require('../models/User');
const { calculateCosineSimilarity } = require('../services/textSimilarity');

const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agent_control_tower_test';

let authToken;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }

  await User.deleteMany({ email: /@test-anom\.io$/ });
  const userRes = await request(app).post('/api/auth/register').send({
    name: 'Anomaly Test Operator',
    email: 'operator@test-anom.io',
    password: 'Password123!',
    role: 'Operator'
  });
  authToken = userRes.body.token;

  // Set explicit test policy thresholds
  await GovernancePolicy.deleteMany({});
  await GovernancePolicy.create({
    policyId: 'test-policy-thresholds',
    name: 'Strict Test Policy',
    maxTokenBudget: 5000,
    maxExecutionDurationMs: 4000,
    maxRepeatedCalls: 3,
    promptDriftThreshold: 0.70,
    heartbeatTimeoutMs: 10000,
    isActive: true,
    source: 'simulated'
  });
});

beforeEach(async () => {
  await Anomaly.deleteMany({});
  await Telemetry.deleteMany({ traceId: /^anom-test-trace-/ });
});

afterAll(async () => {
  await User.deleteMany({ email: /@test-anom\.io$/ });
  await Anomaly.deleteMany({});
  await Telemetry.deleteMany({ traceId: /^anom-test-trace-/ });
  await GovernancePolicy.deleteMany({});
  await mongoose.connection.close();
});

describe('Module 5: Rule-Based Anomaly Detection Engine', () => {
  // Test Text Similarity unit
  describe('Cosine Text Similarity (Prompt Drift)', () => {
    it('should return 1.0 for identical text passages', () => {
      const text = 'Evaluate the total investment risk based on current interest rates';
      const score = calculateCosineSimilarity(text, text);
      expect(score).toBe(1.0);
    });

    it('should return low score for drifted / divergent outputs', () => {
      const baseline = 'Evaluate the total investment risk based on current interest rates';
      const drifted = 'The recipe for chocolate chip cookies requires butter and sugar';
      const score = calculateCosineSimilarity(baseline, drifted);
      expect(score).toBeLessThan(0.3);
    });
  });

  // Rule 1: Repeated execution / loop
  describe('Rule 1: Repeated Execution / Infinite Loop Detection', () => {
    it('should trigger repeated_execution anomaly when callSignature repeats >= threshold (3 times)', async () => {
      const traceId = 'anom-test-trace-loop';
      const callSignature = 'agent-loop:compute_hash:abcd1234ef56';

      // Ingest 3 identical call signatures in same trace
      for (let i = 1; i <= 3; i++) {
        await request(app)
          .post('/api/telemetry/ingest')
          .send({
            traceId,
            spanId: `span-loop-0${i}`,
            agentId: 'agent-loop',
            eventType: 'llm_call',
            duration: 100,
            tokenUsage: { promptTokens: 50, completionTokens: 50, totalTokens: 100 },
            inputMetadata: { action: 'compute_hash', target: 'same_input' },
            source: 'simulated'
          });
      }

      const anomalies = await Anomaly.find({ traceId, type: 'repeated_execution' });
      expect(anomalies.length).toBe(1);
      expect(anomalies[0].severity).toBe('Critical');
      expect(anomalies[0].recommendedAction).toBe('circuit_breaker');
      expect(anomalies[0].evidence.repeatCount).toBeGreaterThanOrEqual(3);
    });

    it('should NOT trigger repeated_execution anomaly when under threshold', async () => {
      const traceId = 'anom-test-trace-loop-safe';

      // Ingest only 1 event
      await request(app)
        .post('/api/telemetry/ingest')
        .send({
          traceId,
          spanId: 'span-loop-safe-01',
          agentId: 'agent-safe',
          eventType: 'llm_call',
          duration: 100,
          tokenUsage: { promptTokens: 50, completionTokens: 50, totalTokens: 100 },
          inputMetadata: { action: 'compute_hash', target: 'unique_input' },
          source: 'simulated'
        });

      const anomalies = await Anomaly.find({ traceId, type: 'repeated_execution' });
      expect(anomalies.length).toBe(0);
    });
  });

  // Rule 2: Token surge
  describe('Rule 2: Token Surge Detection', () => {
    it('should trigger token_surge anomaly when tokens exceed configured budget (5,000)', async () => {
      const traceId = 'anom-test-trace-surge';

      await request(app)
        .post('/api/telemetry/ingest')
        .send({
          traceId,
          spanId: 'span-surge-01',
          agentId: 'agent-surge',
          eventType: 'llm_call',
          duration: 800,
          tokenUsage: { promptTokens: 4000, completionTokens: 3000, totalTokens: 7000 }, // > 5,000
          source: 'simulated'
        });

      const anomalies = await Anomaly.find({ traceId, type: 'token_surge' });
      expect(anomalies.length).toBe(1);
      expect(anomalies[0].severity).toBe('High');
      expect(anomalies[0].recommendedAction).toBe('token_throttle');
      expect(anomalies[0].evidence.totalTokens).toBe(7000);
      expect(anomalies[0].evidence.excessTokens).toBe(2000);
    });

    it('should NOT trigger token_surge anomaly when tokens are within budget', async () => {
      const traceId = 'anom-test-trace-token-safe';

      await request(app)
        .post('/api/telemetry/ingest')
        .send({
          traceId,
          spanId: 'span-token-safe-01',
          agentId: 'agent-surge',
          eventType: 'llm_call',
          duration: 400,
          tokenUsage: { promptTokens: 500, completionTokens: 200, totalTokens: 700 }, // < 5,000
          source: 'simulated'
        });

      const anomalies = await Anomaly.find({ traceId, type: 'token_surge' });
      expect(anomalies.length).toBe(0);
    });
  });

  // Rule 3: High latency
  describe('Rule 3: High Latency Detection', () => {
    it('should trigger high_latency anomaly when duration exceeds threshold (4,000ms)', async () => {
      const traceId = 'anom-test-trace-latency';

      await request(app)
        .post('/api/telemetry/ingest')
        .send({
          traceId,
          spanId: 'span-latency-01',
          agentId: 'agent-slow',
          eventType: 'tool_execution',
          duration: 6500, // > 4,000 ms
          tokenUsage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
          source: 'simulated'
        });

      const anomalies = await Anomaly.find({ traceId, type: 'high_latency' });
      expect(anomalies.length).toBe(1);
      expect(anomalies[0].evidence.durationMs).toBe(6500);
      expect(anomalies[0].recommendedAction).toBe('model_reroute');
    });
  });

  // Rule 4: Silent failure / Timeout
  describe('Rule 4: Silent Failure Detection', () => {
    it('should trigger silent_failure anomaly when status is timeout or OCR failure', async () => {
      const traceId = 'anom-test-trace-silent';

      await request(app)
        .post('/api/telemetry/ingest')
        .send({
          traceId,
          spanId: 'span-silent-01',
          agentId: 'agent-hung-worker',
          eventType: 'tool_execution',
          status: 'timeout',
          duration: 10500,
          tokenUsage: { promptTokens: 100, completionTokens: 0, totalTokens: 100 },
          source: 'simulated'
        });

      const anomalies = await Anomaly.find({ traceId, type: 'silent_failure' });
      expect(anomalies.length).toBe(1);
      expect(anomalies[0].severity).toBe('Critical');
      expect(anomalies[0].recommendedAction).toBe('circuit_breaker');
    });
  });

  // Rule 5: Prompt drift
  describe('Rule 5: Prompt Drift Detection', () => {
    it('should trigger prompt_drift anomaly when similarity < threshold (0.70)', async () => {
      const traceId = 'anom-test-trace-drift';

      await request(app)
        .post('/api/telemetry/ingest')
        .send({
          traceId,
          spanId: 'span-drift-01',
          agentId: 'agent-writer',
          eventType: 'llm_call',
          duration: 1200,
          tokenUsage: { promptTokens: 300, completionTokens: 200, totalTokens: 500 },
          inputMetadata: {
            baselinePrompt: 'Generate a quarterly executive financial summary for board members'
          },
          outputMetadata: {
            response: 'Today weather forecast indicates rainy skies and high humidity in western regions'
          },
          source: 'simulated'
        });

      const anomalies = await Anomaly.find({ traceId, type: 'prompt_drift' });
      expect(anomalies.length).toBe(1);
      expect(anomalies[0].type).toBe('prompt_drift');
      expect(anomalies[0].evidence.similarityScore).toBeLessThan(0.70);
    });

    it('should NOT trigger prompt_drift anomaly when output aligns with baseline', async () => {
      const traceId = 'anom-test-trace-nodrift';

      await request(app)
        .post('/api/telemetry/ingest')
        .send({
          traceId,
          spanId: 'span-nodrift-01',
          agentId: 'agent-writer',
          eventType: 'llm_call',
          duration: 1200,
          tokenUsage: { promptTokens: 300, completionTokens: 200, totalTokens: 500 },
          inputMetadata: {
            baselinePrompt: 'Generate a quarterly executive financial summary for board members'
          },
          outputMetadata: {
            response: 'Generate a quarterly executive financial summary for board members of the company'
          },
          source: 'simulated'
        });

      const anomalies = await Anomaly.find({ traceId, type: 'prompt_drift' });
      expect(anomalies.length).toBe(0);
    });
  });

  // Acknowledgment API
  describe('PUT /api/anomalies/:id/acknowledge', () => {
    it('should allow Operator to acknowledge an anomaly', async () => {
      const anom = await Anomaly.create({
        anomalyId: 'anom-ack-test',
        agentId: 'agent-ack',
        traceId: 'trace-ack',
        type: 'high_latency',
        severity: 'Medium',
        description: 'Test ack',
        source: 'simulated'
      });

      const res = await request(app)
        .put(`/api/anomalies/${anom.anomalyId}/acknowledge`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('Acknowledged');
      expect(res.body.data.acknowledgedBy).toBe('operator@test-anom.io');
    });
  });
});
