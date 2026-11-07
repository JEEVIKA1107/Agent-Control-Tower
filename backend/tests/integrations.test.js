const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const Integration = require('../models/Integration');
const User = require('../models/User');

const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agent_control_tower_test';

let adminToken;
let viewerToken;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }

  await User.deleteMany({ email: /@test-integ\.io$/ });

  const adminRes = await request(app).post('/api/auth/register').send({
    name: 'Integ Admin',
    email: 'admin@test-integ.io',
    password: 'Password123!',
    role: 'Admin'
  });
  adminToken = adminRes.body.token;

  const viewerRes = await request(app).post('/api/auth/register').send({
    name: 'Integ Viewer',
    email: 'viewer@test-integ.io',
    password: 'Password123!',
    role: 'Viewer'
  });
  viewerToken = viewerRes.body.token;
});

beforeEach(async () => {
  await Integration.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({ email: /@test-integ\.io$/ });
  await Integration.deleteMany({});
  await mongoose.connection.close();
});

describe('Module 10: Integrations Status API', () => {
  it('GET /api/integrations should return frameworks with accurate honest statuses', async () => {
    const res = await request(app)
      .get('/api/integrations')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(6);

    const otel = res.body.data.find(i => i.integrationId === 'integ-otel');
    expect(otel.status).toBe('Connected'); // Verified real working adapter

    const langgraph = res.body.data.find(i => i.integrationId === 'integ-langgraph');
    expect(langgraph.status).toBe('Simulated Demo');

    const autogen = res.body.data.find(i => i.integrationId === 'integ-autogen');
    expect(autogen.status).toBe('Simulated Demo');

    const crewai = res.body.data.find(i => i.integrationId === 'integ-crewai');
    expect(crewai.status).toBe('Planned');

    const mcp = res.body.data.find(i => i.integrationId === 'integ-mcp');
    expect(mcp.status).toBe('Planned');

    const a2a = res.body.data.find(i => i.integrationId === 'integ-a2a');
    expect(a2a.status).toBe('Planned');
  });

  it('PUT /api/integrations/:id should allow Admin to update status and description', async () => {
    // Trigger initialization
    const getRes = await request(app)
      .get('/api/integrations')
      .set('Authorization', `Bearer ${adminToken}`);

    const otelId = getRes.body.data[0].integrationId;

    const res = await request(app)
      .put(`/api/integrations/${otelId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ configurationStatus: 'Production OTLP Stream Active' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.configurationStatus).toBe('Production OTLP Stream Active');
  });

  it('PUT /api/integrations/:id should FORBID Viewer from modifying integration status (403)', async () => {
    const res = await request(app)
      .put('/api/integrations/integ-otel')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ status: 'Disconnected' });

    expect(res.statusCode).toBe(403);
  });
});
