const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const Agent = require('../models/Agent');
const User = require('../models/User');

const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agent_control_tower_test';

let adminToken;
let viewerToken;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }

  // Create admin user for tests
  await User.deleteMany({ email: /@test-agent\.io$/ });
  const adminRes = await request(app).post('/api/auth/register').send({
    name: 'Admin Agent Tester',
    email: 'admin@test-agent.io',
    password: 'Password123!',
    role: 'Admin'
  });
  adminToken = adminRes.body.token;

  const viewerRes = await request(app).post('/api/auth/register').send({
    name: 'Viewer Agent Tester',
    email: 'viewer@test-agent.io',
    password: 'Password123!',
    role: 'Viewer'
  });
  viewerToken = viewerRes.body.token;
});

beforeEach(async () => {
  await Agent.deleteMany({ agentId: /^test-agent-/ });
});

afterAll(async () => {
  await User.deleteMany({ email: /@test-agent\.io$/ });
  await Agent.deleteMany({ agentId: /^test-agent-/ });
  await mongoose.connection.close();
});

describe('Agent Management API Endpoints', () => {
  const newAgent = {
    agentId: 'test-agent-optimizer',
    name: 'Test Token Optimizer',
    type: 'Token Management',
    framework: 'LangGraph',
    description: 'Compresses prompt tokens for testing',
    source: 'live'
  };

  describe('POST /api/agents', () => {
    it('should allow Admin to register a new agent', async () => {
      const res = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newAgent);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.agentId).toBe(newAgent.agentId);
      expect(res.body.data.status).toBe('Active');
    });

    it('should FORBID Viewer from registering a new agent (403)', async () => {
      const res = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(newAgent);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration when agentId already exists (400)', async () => {
      await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newAgent);

      const duplicate = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newAgent);

      expect(duplicate.statusCode).toBe(400);
      expect(duplicate.body.success).toBe(false);
      expect(duplicate.body.message).toMatch(/already exists/i);
    });

    it('should reject agent with missing required fields', async () => {
      const res = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Incomplete Agent' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/agents', () => {
    beforeEach(async () => {
      await Agent.create([
        { ...newAgent, agentId: 'test-agent-1', status: 'Active', type: 'Monitoring' },
        { ...newAgent, agentId: 'test-agent-2', status: 'Disabled', type: 'Governance' }
      ]);
    });

    it('should list agents and filter by status', async () => {
      const res = await request(app)
        .get('/api/agents?status=Active')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.every(a => a.status === 'Active')).toBe(true);
    });

    it('should filter agents by search keyword', async () => {
      const res = await request(app)
        .get('/api/agents?search=Optimizer')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/agents/:id and /toggle-status', () => {
    let createdId;

    beforeEach(async () => {
      const agent = await Agent.create({ ...newAgent, agentId: 'test-agent-toggle' });
      createdId = agent.agentId;
    });

    it('should toggle agent status between Active and Disabled', async () => {
      const toggleRes = await request(app)
        .put(`/api/agents/${createdId}/toggle-status`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(toggleRes.statusCode).toBe(200);
      expect(toggleRes.body.data.status).toBe('Disabled');

      // Toggle back
      const toggleBack = await request(app)
        .put(`/api/agents/${createdId}/toggle-status`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(toggleBack.body.data.status).toBe('Active');
    });

    it('should update agent metadata', async () => {
      const updateRes = await request(app)
        .put(`/api/agents/${createdId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Updated agent description' });

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body.data.description).toBe('Updated agent description');
    });
  });

  describe('DELETE /api/agents/:id', () => {
    it('should allow Admin to delete an agent', async () => {
      await Agent.create({ ...newAgent, agentId: 'test-agent-del' });

      const delRes = await request(app)
        .delete('/api/agents/test-agent-del')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(delRes.statusCode).toBe(200);
      expect(delRes.body.success).toBe(true);

      const findRes = await Agent.findOne({ agentId: 'test-agent-del' });
      expect(findRes).toBeNull();
    });

    it('should FORBID Viewer from deleting an agent', async () => {
      await Agent.create({ ...newAgent, agentId: 'test-agent-del2' });

      const delRes = await request(app)
        .delete('/api/agents/test-agent-del2')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(delRes.statusCode).toBe(403);
    });
  });
});
