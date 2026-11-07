const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const Agent = require('../models/Agent');
const Execution = require('../models/Execution');
const Telemetry = require('../models/Telemetry');
const User = require('../models/User');

const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agent_control_tower_test';

let authToken;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }

  await User.deleteMany({ email: /@test-dash\.io$/ });
  const userRes = await request(app).post('/api/auth/register').send({
    name: 'Dashboard Tester',
    email: 'user@test-dash.io',
    password: 'Password123!',
    role: 'Viewer'
  });
  authToken = userRes.body.token;

  // Insert mock data for dashboard calculation
  await Agent.deleteMany({ agentId: /^dash-agent-/ });
  await Agent.create([
    { agentId: 'dash-agent-01', name: 'Agent 1', type: 'Monitoring', status: 'Active', source: 'simulated' },
    { agentId: 'dash-agent-02', name: 'Agent 2', type: 'Governance', status: 'Failed', source: 'simulated' }
  ]);

  await Telemetry.deleteMany({ traceId: /^dash-trace-/ });
  await Telemetry.create([
    {
      traceId: 'dash-trace-01',
      spanId: 'dash-span-01',
      agentId: 'dash-agent-01',
      eventType: 'llm_call',
      status: 'success',
      duration: 500,
      tokenUsage: { promptTokens: 1000, completionTokens: 500, totalTokens: 1500 },
      source: 'simulated',
      timestamp: new Date()
    }
  ]);
});

afterAll(async () => {
  await User.deleteMany({ email: /@test-dash\.io$/ });
  await Agent.deleteMany({ agentId: /^dash-agent-/ });
  await Telemetry.deleteMany({ traceId: /^dash-trace-/ });
  await mongoose.connection.close();
});

describe('Dashboard Metrics & Charts API', () => {
  it('GET /api/dashboard/metrics should compute metrics directly from DB records', async () => {
    const res = await request(app)
      .get('/api/dashboard/metrics?source=all&timeRange=24h')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalAgents).toBeGreaterThanOrEqual(2);
    expect(res.body.data.activeAgents).toBeGreaterThanOrEqual(1);
    expect(res.body.data.failedAgents).toBeGreaterThanOrEqual(1);
    expect(res.body.data.totalTokenUsage).toBeGreaterThanOrEqual(1500);
    expect(res.body.data.estimatedCost).toBeGreaterThan(0);
  });

  it('GET /api/dashboard/charts should return aggregated time series and agent cost breakdown', async () => {
    const res = await request(app)
      .get('/api/dashboard/charts?source=simulated&timeRange=24h')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.timeSeries)).toBe(true);
    expect(Array.isArray(res.body.data.costByAgent)).toBe(true);
    expect(Array.isArray(res.body.data.statusBreakdown)).toBe(true);
  });
});
