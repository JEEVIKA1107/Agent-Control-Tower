const request = require('supertest');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const { app } = require('../server');
const User = require('../models/User');
const Agent = require('../models/Agent');
const Telemetry = require('../models/Telemetry');
const Execution = require('../models/Execution');
const Anomaly = require('../models/Anomaly');
const GovernancePolicy = require('../models/GovernancePolicy');
const GovernanceRecommendation = require('../models/GovernanceRecommendation');
const ApprovalRequest = require('../models/ApprovalRequest');
const ActionExecution = require('../models/ActionExecution');
const AuditLog = require('../models/AuditLog');
const connectDB = require('../config/db');

describe('End-to-End Demo Scenarios & RBAC Verification (Phase 5)', () => {
  let adminToken;
  let operatorToken;
  let viewerToken;

  beforeAll(async () => {
    process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/agent_control_tower_test';
    await connectDB();

    // Clean test database
    await Promise.all([
      User.deleteMany({}),
      Agent.deleteMany({}),
      Telemetry.deleteMany({}),
      Execution.deleteMany({}),
      Anomaly.deleteMany({}),
      GovernancePolicy.deleteMany({}),
      GovernanceRecommendation.deleteMany({}),
      ApprovalRequest.deleteMany({}),
      ActionExecution.deleteMany({}),
      AuditLog.deleteMany({})
    ]);

    // Create policy
    await GovernancePolicy.create({
      policyId: 'pol-default-governance',
      name: 'Default Policy',
      maxTokenBudget: 50000,
      maxExecutionDurationMs: 30000,
      maxRepeatedCalls: 3,
      promptDriftThreshold: 0.65,
      costPer1kTokens: 0.002,
      isActive: true,
      source: 'simulated'
    });

    // Seed initial simulated audit log for Scenario E
    const { appendAuditLog } = require('../services/auditService');
    await appendAuditLog({
      userId: 'usr-admin-e2e',
      actorName: 'Security Admin',
      eventType: 'DEMO_SEED',
      actionDetails: { init: true, environment: 'e2e_testing' },
      source: 'simulated'
    });

    // Create 3 RBAC users
    const adminUser = await User.create({
      name: 'E2E Admin',
      email: 'admin_e2e@controltower.io',
      password: 'Password123!',
      role: 'Admin'
    });
    const operatorUser = await User.create({
      name: 'E2E Operator',
      email: 'operator_e2e@controltower.io',
      password: 'Password123!',
      role: 'Operator'
    });
    const viewerUser = await User.create({
      name: 'E2E Viewer',
      email: 'viewer_e2e@controltower.io',
      password: 'Password123!',
      role: 'Viewer'
    });

    // Obtain tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin_e2e@controltower.io', password: 'Password123!' });
    adminToken = adminLogin.body.token;

    const opLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'operator_e2e@controltower.io', password: 'Password123!' });
    operatorToken = opLogin.body.token;

    const viewLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'viewer_e2e@controltower.io', password: 'Password123!' });
    viewerToken = viewLogin.body.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  // Scenario A
  describe('Scenario A: Normal Agent Execution', () => {
    it('should ingest multi-span trace, update execution record and agent tokens', async () => {
      const res = await request(app)
        .post('/api/demo/scenario-a')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.spansIngested).toBe(3);
      expect(res.body.data.totalTokens).toBeGreaterThan(0);
      expect(res.body.data.estimatedCost).toBeGreaterThan(0);

      // Verify in DB
      const execution = await Execution.findOne({ traceId: res.body.data.traceId });
      expect(execution).not.toBeNull();
      expect(execution.status).toBe('success');

      const agent = await Agent.findOne({ agentId: res.body.data.agentId });
      expect(agent.totalTokens).toBeGreaterThanOrEqual(res.body.data.totalTokens);
    });
  });

  // Scenario B
  describe('Scenario B: Repeated Execution Anomaly', () => {
    it('should detect recursion loop >= threshold and generate circuit breaker recommendation', async () => {
      const res = await request(app)
        .post('/api/demo/scenario-b')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.anomaly).not.toBeNull();
      expect(res.body.data.anomaly.type).toBe('repeated_execution');
      expect(res.body.data.recommendation).not.toBeNull();
      expect(res.body.data.recommendation.actionType).toBe('circuit_breaker');
      expect(res.body.data.approvalRequest).not.toBeNull();
      expect(res.body.data.approvalRequest.status).toBe('Pending');
    });
  });

  // Scenario C
  describe('Scenario C: Token Surge Anomaly', () => {
    it('should detect token consumption exceeding 50k budget and create throttling recommendation', async () => {
      const res = await request(app)
        .post('/api/demo/scenario-c')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.anomaly).not.toBeNull();
      expect(res.body.data.anomaly.type).toBe('token_surge');
      expect(res.body.data.recommendation.actionType).toBe('token_throttle');
      expect(res.body.data.approvalRequest).not.toBeNull();
      expect(res.body.data.approvalRequest.status).toBe('Pending');
    });
  });

  // Scenario D
  describe('Scenario D: Human Approval Workflow', () => {
    it('should approve one request (simulated) and reject another (not_executed)', async () => {
      const res = await request(app)
        .post('/api/demo/scenario-d')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.approvedWorkflow.decision).toBe('Approved');
      expect(res.body.data.approvedWorkflow.actionExecutionStatus).toBe('simulated');
      expect(res.body.data.rejectedWorkflow.decision).toBe('Rejected');
      expect(res.body.data.rejectedWorkflow.actionExecutionStatus).toBe('not_executed');

      // Verify audit logs were created
      const auditDecision = await AuditLog.findOne({
        eventType: 'APPROVAL_DECISION',
        'actionDetails.requestId': res.body.data.approvedWorkflow.requestId
      });
      expect(auditDecision).not.toBeNull();
    });
  });

  // Scenario E
  describe('Scenario E: Cryptographic Audit Verification', () => {
    it('should verify chain, detect demo tampering, and restore cryptographic validity', async () => {
      const res = await request(app)
        .post('/api/demo/scenario-e')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.beforeVerification.valid).toBe(true);
      expect(res.body.data.tamperDetectedVerification.valid).toBe(false);
      expect(res.body.data.finalVerification.valid).toBe(true);
    });

    it('should FORBID Operator and Viewer from running Scenario E tampering demo', async () => {
      const opRes = await request(app)
        .post('/api/demo/scenario-e')
        .set('Authorization', `Bearer ${operatorToken}`);
      expect(opRes.statusCode).toBe(403);

      const viewRes = await request(app)
        .post('/api/demo/scenario-e')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(viewRes.statusCode).toBe(403);
    });
  });

  // RBAC Gating on All Scenarios
  describe('Role-Based Access Control (RBAC) on Scenarios', () => {
    it('should reject unauthenticated requests on all scenarios (401)', async () => {
      const res = await request(app).post('/api/demo/scenario-a');
      expect(res.statusCode).toBe(401);
    });

    it('should FORBID Viewer from triggering any scenario (403)', async () => {
      const resA = await request(app)
        .post('/api/demo/scenario-a')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(resA.statusCode).toBe(403);

      const resB = await request(app)
        .post('/api/demo/scenario-b')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(resB.statusCode).toBe(403);

      const resC = await request(app)
        .post('/api/demo/scenario-c')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(resC.statusCode).toBe(403);

      const resD = await request(app)
        .post('/api/demo/scenario-d')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(resD.statusCode).toBe(403);
    });
  });

  // Data Integrity: Safe Demo Reset
  describe('Data Integrity & Safe Demo Reset', () => {
    it('should preserve live data while resetting simulated demo data', async () => {
      // Create a genuine live telemetry record
      const liveTelemetry = await Telemetry.create({
        traceId: 'trace-live-production-01',
        spanId: 'span-live-01',
        agentId: 'agent-live-01',
        eventType: 'llm_call',
        status: 'success',
        duration: 500,
        tokenUsage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
        callSignature: 'agent-live-01:live_user_query',
        timestamp: new Date(),
        source: 'live'
      });

      // Admin executes reset
      const resetRes = await request(app)
        .post('/api/demo/reset')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resetRes.statusCode).toBe(200);

      // Verify that live telemetry is still in MongoDB
      const foundLive = await Telemetry.findOne({ traceId: 'trace-live-production-01' });
      expect(foundLive).not.toBeNull();
      expect(foundLive.source).toBe('live');
    });

    it('should FORBID non-admin from executing demo reset (403)', async () => {
      const res = await request(app)
        .post('/api/demo/reset')
        .set('Authorization', `Bearer ${operatorToken}`);
      expect(res.statusCode).toBe(403);
    });
  });
});
