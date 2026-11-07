const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const GovernancePolicy = require('../models/GovernancePolicy');
const GovernanceRecommendation = require('../models/GovernanceRecommendation');
const ApprovalRequest = require('../models/ApprovalRequest');
const ActionExecution = require('../models/ActionExecution');
const User = require('../models/User');

const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agent_control_tower_test';

let adminToken;
let operatorToken;
let viewerToken;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }

  await User.deleteMany({ email: /@test-gov\.io$/ });

  const adminRes = await request(app).post('/api/auth/register').send({
    name: 'Gov Admin',
    email: 'admin@test-gov.io',
    password: 'Password123!',
    role: 'Admin'
  });
  adminToken = adminRes.body.token;

  const operatorRes = await request(app).post('/api/auth/register').send({
    name: 'Gov Operator',
    email: 'operator@test-gov.io',
    password: 'Password123!',
    role: 'Operator'
  });
  operatorToken = operatorRes.body.token;

  const viewerRes = await request(app).post('/api/auth/register').send({
    name: 'Gov Viewer',
    email: 'viewer@test-gov.io',
    password: 'Password123!',
    role: 'Viewer'
  });
  viewerToken = viewerRes.body.token;
});

beforeEach(async () => {
  await GovernanceRecommendation.deleteMany({});
  await ApprovalRequest.deleteMany({});
  await ActionExecution.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({ email: /@test-gov\.io$/ });
  await GovernanceRecommendation.deleteMany({});
  await ApprovalRequest.deleteMany({});
  await ActionExecution.deleteMany({});
  await mongoose.connection.close();
});

describe('Module 6 & 8: Governance Policy & Human Approval Centre', () => {
  describe('Governance Policy Management (Admin Restricted)', () => {
    it('should allow Admin to update policy thresholds', async () => {
      const getRes = await request(app)
        .get('/api/governance/policies')
        .set('Authorization', `Bearer ${adminToken}`);

      const policyId = getRes.body.data[0].policyId;

      const updateRes = await request(app)
        .put(`/api/governance/policies/${policyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          maxTokenBudget: 75000,
          maxExecutionDurationMs: 45000
        });

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body.data.maxTokenBudget).toBe(75000);
      expect(updateRes.body.data.maxExecutionDurationMs).toBe(45000);
    });

    it('should FORBID Viewer from modifying governance policy (403)', async () => {
      const updateRes = await request(app)
        .put('/api/governance/policies/pol-default-governance')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ maxTokenBudget: 10000 });

      expect(updateRes.statusCode).toBe(403);
    });
  });

  describe('Strict 3-Tier Human Approval Workflow', () => {
    let testRequestId;

    beforeEach(async () => {
      // Create Recommendation
      const rec = await GovernanceRecommendation.create({
        recommendationId: 'rec-test-surge-01',
        anomalyId: 'anom-surge-01',
        agentId: 'agent-token-optimizer',
        actionType: 'token_throttle',
        reason: 'Token budget violation',
        status: 'active',
        source: 'simulated'
      });

      // Create linked ApprovalRequest
      const reqDoc = await ApprovalRequest.create({
        requestId: 'appr-req-surge-01',
        recommendationId: rec.recommendationId,
        agentId: rec.agentId,
        anomalyId: rec.anomalyId,
        actionType: rec.actionType,
        reason: rec.reason,
        status: 'Pending',
        source: 'simulated'
      });

      testRequestId = reqDoc.requestId;
    });

    it('should allow Operator to APPROVE request and create ActionExecution with status "simulated"', async () => {
      const res = await request(app)
        .put(`/api/approvals/${testRequestId}/decision`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          decision: 'Approved',
          comment: 'Approved context throttle to prevent credit overrun'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify ApprovalRequest updated
      const approval = await ApprovalRequest.findOne({ requestId: testRequestId });
      expect(approval.status).toBe('Approved');
      expect(approval.decidedBy).toBe('operator@test-gov.io');
      expect(approval.reviewerComment).toMatch(/Approved context throttle/i);

      // Verify GovernanceRecommendation status updated
      const rec = await GovernanceRecommendation.findOne({ recommendationId: approval.recommendationId });
      expect(rec.status).toBe('approved');

      // CRITICAL DIRECTIVE: ActionExecution must exist and have status "simulated"
      const actionExec = await ActionExecution.findOne({ approvalRequestId: testRequestId });
      expect(actionExec).toBeDefined();
      expect(actionExec.status).toBe('simulated');
      expect(actionExec.outputSummary).toMatch(/Simulated execution of token_throttle/i);
    });

    it('should allow Admin to REJECT request and create ActionExecution with status "not_executed"', async () => {
      const res = await request(app)
        .put(`/api/approvals/${testRequestId}/decision`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          decision: 'Rejected',
          comment: 'Threshold violation is acceptable for high-priority evaluation run'
        });

      expect(res.statusCode).toBe(200);

      const approval = await ApprovalRequest.findOne({ requestId: testRequestId });
      expect(approval.status).toBe('Rejected');

      const actionExec = await ActionExecution.findOne({ approvalRequestId: testRequestId });
      expect(actionExec).toBeDefined();
      expect(actionExec.status).toBe('not_executed');
    });

    it('should FORBID Viewer from deciding approval requests (403 Forbidden)', async () => {
      const res = await request(app)
        .put(`/api/approvals/${testRequestId}/decision`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          decision: 'Approved'
        });

      expect(res.statusCode).toBe(403);
    });
  });
});
