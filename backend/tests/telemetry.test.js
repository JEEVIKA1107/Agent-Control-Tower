const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const Agent = require('../models/Agent');
const Telemetry = require('../models/Telemetry');
const User = require('../models/User');

const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agent_control_tower_test';

let authToken;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }

  await User.deleteMany({ email: /@test-telem\.io$/ });
  const userRes = await request(app).post('/api/auth/register').send({
    name: 'Telem Tester',
    email: 'user@test-telem.io',
    password: 'Password123!',
    role: 'Operator'
  });
  authToken = userRes.body.token;

  // Create an agent to receive telemetry
  await Agent.deleteMany({ agentId: /^telem-agent-/ });
  await Agent.create({
    agentId: 'telem-agent-01',
    name: 'Telemetry Ingest Tester',
    type: 'Monitoring',
    framework: 'Custom',
    status: 'Active',
    executionCount: 0,
    totalTokens: 0,
    source: 'live'
  });
});

beforeEach(async () => {
  await Telemetry.deleteMany({ traceId: /^test-trace-/ });
});

afterAll(async () => {
  await User.deleteMany({ email: /@test-telem\.io$/ });
  await Agent.deleteMany({ agentId: /^telem-agent-/ });
  await Telemetry.deleteMany({ traceId: /^test-trace-/ });
  await mongoose.connection.close();
});

describe('Telemetry Ingestion & Explorer API', () => {
  describe('POST /api/telemetry/ingest', () => {
    it('should ingest and normalize a common schema telemetry event', async () => {
      const payload = {
        traceId: 'test-trace-101',
        spanId: 'test-span-101',
        agentId: 'telem-agent-01',
        eventType: 'llm_call',
        status: 'success',
        duration: 420,
        tokenUsage: { promptTokens: 300, completionTokens: 150, totalTokens: 450 },
        inputMetadata: { prompt: 'Calculate optimal risk margin' },
        outputMetadata: { response: '0.14' },
        stateDelta: {
          previousStateRef: null,
          currentStateRef: 'state_hash_01',
          changedFields: ['margin'],
          timestamp: new Date(),
          executionId: 'test-trace-101'
        },
        source: 'live'
      };

      const res = await request(app)
        .post('/api/telemetry/ingest')
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.ingestedCount).toBe(1);

      // Verify agent was updated
      const agent = await Agent.findOne({ agentId: 'telem-agent-01' });
      expect(agent.executionCount).toBeGreaterThanOrEqual(1);
      expect(agent.totalTokens).toBeGreaterThanOrEqual(450);
    });

    it('should reject ingestion when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/telemetry/ingest')
        .send({ traceId: 'test-trace-incomplete' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Validation failed/i);
    });

    it('should ingest OpenTelemetry span format and normalize into common schema', async () => {
      const otelSpan = {
        trace_id: 'test-trace-otel-02',
        span_id: 'test-span-otel-02',
        name: 'gen_ai.chat',
        attributes: {
          'agent.id': 'telem-agent-01',
          'gen_ai.usage.prompt_tokens': 500,
          'gen_ai.usage.completion_tokens': 200,
          'gen_ai.usage.total_tokens': 700
        },
        duration: 350,
        status: { code: 1 }
      };

      const res = await request(app)
        .post('/api/telemetry/ingest')
        .send(otelSpan);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);

      const saved = await Telemetry.findOne({ spanId: 'test-span-otel-02' });
      expect(saved).toBeDefined();
      expect(saved.agentId).toBe('telem-agent-01');
      expect(saved.tokenUsage.totalTokens).toBe(700);
    });
  });

  describe('GET /api/telemetry', () => {
    beforeEach(async () => {
      await Telemetry.create([
        {
          traceId: 'test-trace-q1',
          spanId: 'test-span-q1',
          agentId: 'telem-agent-01',
          eventType: 'llm_call',
          status: 'success',
          duration: 200,
          tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
          source: 'live'
        },
        {
          traceId: 'test-trace-q2',
          spanId: 'test-span-q2',
          agentId: 'telem-agent-01',
          eventType: 'error',
          status: 'error',
          duration: 3000,
          tokenUsage: { promptTokens: 400, completionTokens: 0, totalTokens: 400 },
          source: 'simulated'
        }
      ]);
    });

    it('should retrieve telemetry records and filter by source', async () => {
      const res = await request(app)
        .get('/api/telemetry?source=simulated')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.every(d => d.source === 'simulated')).toBe(true);
    });

    it('should filter telemetry by status', async () => {
      const res = await request(app)
        .get('/api/telemetry?status=error')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.every(d => d.status === 'error')).toBe(true);
    });
  });
});
