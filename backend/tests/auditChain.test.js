const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const {
  GENESIS_HASH,
  computeRecordHash,
  appendAuditLog,
  verifyAuditChain,
  simulateDemoTamper,
  restoreDemoChain
} = require('../services/auditService');

const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agent_control_tower_test';

let adminToken;
let viewerToken;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }

  await User.deleteMany({ email: /@test-audit\.io$/ });

  const adminRes = await request(app).post('/api/auth/register').send({
    name: 'Audit Admin',
    email: 'admin@test-audit.io',
    password: 'Password123!',
    role: 'Admin'
  });
  adminToken = adminRes.body.token;

  const viewerRes = await request(app).post('/api/auth/register').send({
    name: 'Audit Viewer',
    email: 'viewer@test-audit.io',
    password: 'Password123!',
    role: 'Viewer'
  });
  viewerToken = viewerRes.body.token;
});

beforeEach(async () => {
  await AuditLog.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({ email: /@test-audit\.io$/ });
  await AuditLog.deleteMany({});
  await mongoose.connection.close();
});

describe('Module 9: Cryptographic Hash Chain Audit Trail', () => {
  describe('Hash Chain Creation and Linkage', () => {
    it('should use fixed genesis hash for the very first sequence #1 record', async () => {
      const first = await appendAuditLog({
        userId: 'admin@test-audit.io',
        actorName: 'Audit Admin',
        eventType: 'AGENT_REGISTERED',
        relatedAgent: 'agent-sentinel',
        actionDetails: { name: 'Sentinel Observer' },
        source: 'simulated'
      });

      expect(first.sequenceNumber).toBe(1);
      expect(first.previousHash).toBe(GENESIS_HASH);
      expect(first.currentHash).toHaveLength(64); // Valid SHA-256 hex string
    });

    it('should link sequence #2 record to sequence #1 currentHash', async () => {
      const rec1 = await appendAuditLog({
        userId: 'admin@test-audit.io',
        eventType: 'AGENT_REGISTERED',
        actionDetails: { step: 1 },
        source: 'simulated'
      });

      const rec2 = await appendAuditLog({
        userId: 'admin@test-audit.io',
        eventType: 'POLICY_UPDATED',
        actionDetails: { step: 2 },
        source: 'simulated'
      });

      expect(rec2.sequenceNumber).toBe(2);
      expect(rec2.previousHash).toBe(rec1.currentHash);
    });
  });

  describe('GET /api/audit/verify', () => {
    beforeEach(async () => {
      // Build a 3-record chain
      for (let i = 1; i <= 3; i++) {
        await appendAuditLog({
          userId: 'admin@test-audit.io',
          eventType: 'AGENT_REGISTERED',
          actionDetails: { payload: `valid-step-${i}` },
          source: 'simulated'
        });
      }
    });

    it('should verify an unmolested hash chain as valid: true', async () => {
      const res = await request(app)
        .get('/api/audit/verify')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.valid).toBe(true);
      expect(res.body.data.totalRecords).toBe(3);
    });

    it('should detect altered content and identify the first invalid record sequence', async () => {
      // Simulate tampering by altering record #2 without recalculating hash
      const targetRecord = await AuditLog.findOne({ sequenceNumber: 2 });
      targetRecord.actionDetails = { payload: 'FORGED_ATTACK_PAYLOAD' };
      await targetRecord.save();

      const res = await request(app)
        .get('/api/audit/verify')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.valid).toBe(false);
      expect(res.body.data.brokenSequenceNumber).toBe(2);
      expect(res.body.data.reason).toMatch(/tamper detected/i);
    });

    it('should detect missing or out-of-order records (sequence gap)', async () => {
      // Delete record #2 to create a gap: sequence 1 followed by sequence 3
      await AuditLog.deleteOne({ sequenceNumber: 2 });

      const res = await request(app)
        .get('/api/audit/verify')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.valid).toBe(false);
      expect(res.body.data.reason).toMatch(/missing sequence/i);
    });
  });

  describe('Admin Tampering Demonstration & Restoration Endpoints', () => {
    beforeEach(async () => {
      for (let i = 1; i <= 3; i++) {
        await appendAuditLog({
          userId: 'admin@test-audit.io',
          eventType: 'APPROVAL_DECISION',
          actionDetails: { index: i },
          source: 'simulated'
        });
      }
    });

    it('should allow Admin to simulate demo tampering and then restore chain', async () => {
      // 1. Verify before: chain is valid
      const beforeRes = await request(app)
        .get('/api/audit/verify')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(beforeRes.body.data.valid).toBe(true);

      // 2. Admin triggers demo tamper on record #2
      const tamperRes = await request(app)
        .post('/api/audit/demo/tamper')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sequenceNumber: 2 });
      expect(tamperRes.statusCode).toBe(200);
      expect(tamperRes.body.data.tamperedSequenceNumber).toBe(2);

      // 3. Verify during: chain breaks at #2
      const duringRes = await request(app)
        .get('/api/audit/verify')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(duringRes.body.data.valid).toBe(false);
      expect(duringRes.body.data.brokenSequenceNumber).toBe(2);

      // 4. Admin restores chain
      const restoreRes = await request(app)
        .post('/api/audit/demo/restore')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(restoreRes.statusCode).toBe(200);

      // 5. Verify after: chain is valid again
      const afterRes = await request(app)
        .get('/api/audit/verify')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(afterRes.body.data.valid).toBe(true);
    });

    it('should FORBID Viewer from triggering tampering demonstration (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/audit/demo/tamper')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ sequenceNumber: 1 });

      expect(res.statusCode).toBe(403);
    });
  });
});
