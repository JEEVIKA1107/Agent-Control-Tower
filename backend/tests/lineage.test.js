const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const Telemetry = require('../models/Telemetry');
const Agent = require('../models/Agent');
const User = require('../models/User');

const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agent_control_tower_test';

let authToken;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }

  await User.deleteMany({ email: /@test-lineage\.io$/ });
  const userRes = await request(app).post('/api/auth/register').send({
    name: 'Lineage Tester',
    email: 'user@test-lineage.io',
    password: 'Password123!',
    role: 'Viewer'
  });
  authToken = userRes.body.token;

  await Agent.deleteMany({ agentId: /^lineage-agent-/ });
  await Agent.create([
    { agentId: 'lineage-agent-root', name: 'Root Agent', type: 'Orchestration', status: 'Active', source: 'simulated' },
    { agentId: 'lineage-agent-child', name: 'Child Agent', type: 'Token Management', status: 'Active', source: 'simulated' }
  ]);

  await Telemetry.deleteMany({ traceId: 'test-trace-lineage-01' });
  await Telemetry.create([
    {
      traceId: 'test-trace-lineage-01',
      spanId: 'span-root-01',
      parentSpanId: null,
      agentId: 'lineage-agent-root',
      eventType: 'workflow_step',
      status: 'success',
      duration: 300,
      tokenUsage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
      source: 'simulated',
      timestamp: new Date()
    },
    {
      traceId: 'test-trace-lineage-01',
      spanId: 'span-child-01',
      parentSpanId: 'span-root-01',
      agentId: 'lineage-agent-child',
      eventType: 'llm_call',
      status: 'error',
      duration: 1200,
      tokenUsage: { promptTokens: 500, completionTokens: 0, totalTokens: 500 },
      errorInfo: { code: 'TOKEN_LIMIT', message: 'Exceeded budget', stack: null },
      source: 'simulated',
      timestamp: new Date()
    }
  ]);
});

afterAll(async () => {
  await User.deleteMany({ email: /@test-lineage\.io$/ });
  await Agent.deleteMany({ agentId: /^lineage-agent-/ });
  await Telemetry.deleteMany({ traceId: 'test-trace-lineage-01' });
  await mongoose.connection.close();
});

describe('Execution Lineage Graph API', () => {
  it('GET /api/executions/traces should return distinct trace summaries', async () => {
    const res = await request(app)
      .get('/api/executions/traces')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.some(t => t.traceId === 'test-trace-lineage-01')).toBe(true);
  });

  it('GET /api/executions/lineage/:traceId should construct React Flow nodes and edges', async () => {
    const res = await request(app)
      .get('/api/executions/lineage/test-trace-lineage-01')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.nodes.length).toBe(2);
    expect(res.body.edges.length).toBe(1);

    // Edge connects root to child
    const edge = res.body.edges[0];
    expect(edge.source).toBe('span-root-01');
    expect(edge.target).toBe('span-child-01');
    expect(edge.style.stroke).toBe('#ef4444'); // Highlighted error stroke
  });

  it('should return 404 for non-existent traceId', async () => {
    const res = await request(app)
      .get('/api/executions/lineage/non-existent-trace-id')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
