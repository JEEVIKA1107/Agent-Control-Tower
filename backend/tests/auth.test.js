const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const User = require('../models/User');

const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agent_control_tower_test';

beforeAll(async () => {
  // Connect to test database
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }
});

beforeEach(async () => {
  // Clean up users collection before each test
  await User.deleteMany({ email: { $regex: /@test\.io$/ } });
});

afterAll(async () => {
  // Clean up and disconnect
  await User.deleteMany({ email: { $regex: /@test\.io$/ } });
  await mongoose.connection.close();
});

describe('Authentication & RBAC API Endpoints', () => {
  const testUser = {
    name: 'Test Viewer',
    email: 'viewer_test@test.io',
    password: 'ViewerPassword123!',
    role: 'Viewer'
  };

  const adminUser = {
    name: 'Test Admin',
    email: 'admin_test@test.io',
    password: 'AdminPassword123!',
    role: 'Admin'
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully and return JWT token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.user.role).toBe('Viewer');
      expect(res.body.user.password).toBeUndefined(); // Password must never be exposed
    });

    it('should reject registration if email is already registered', async () => {
      // First registration
      await request(app).post('/api/auth/register').send(testUser);

      // Duplicate registration attempt
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should reject registration when missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'incomplete@test.io' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(testUser);
    });

    it('should authenticate user with valid credentials and return JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    });

    it('should reject login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid/i);
    });

    it('should reject login for non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unknown_user@test.io',
          password: 'SomePassword123'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    let token;

    beforeEach(async () => {
      const reg = await request(app).post('/api/auth/register').send(testUser);
      token = reg.body.token;
    });

    it('should return user profile when authenticated with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.user.role).toBe('Viewer');
    });

    it('should reject request without token with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    let viewerToken;
    let adminToken;

    beforeEach(async () => {
      const viewerRes = await request(app).post('/api/auth/register').send(testUser);
      viewerToken = viewerRes.body.token;

      const adminRes = await request(app).post('/api/auth/register').send(adminUser);
      adminToken = adminRes.body.token;
    });

    it('should FORBID Viewer from accessing Admin-only endpoint (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/auth/admin-only')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('should ALLOW Admin to access Admin-only endpoint (200 OK)', async () => {
      const res = await request(app)
        .get('/api/auth/admin-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/Welcome Admin/i);
    });
  });
});
