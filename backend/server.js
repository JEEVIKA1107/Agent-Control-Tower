const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const initSocketIO = require('./sockets/socketHandler');

// Initialize express app
const app = express();
const server = http.createServer(app);

// Parse allowed origins for CORS
const getAllowedOrigins = () => {
  const envUrl = process.env.CLIENT_URL;
  if (!envUrl) return ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];
  if (envUrl === '*') return '*';
  return envUrl.split(',').map((s) => s.trim().replace(/\/$/, ''));
};

const allowedOrigins = getAllowedOrigins();

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins === '*' || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Attach io instance to express app so controllers can emit events
app.set('io', io);
initSocketIO(io);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins === '*' || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'Agent Control Tower Backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Mount Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/agents', require('./routes/agentRoutes'));
app.use('/api/telemetry', require('./routes/telemetryRoutes'));
app.use('/api/executions', require('./routes/executionRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/anomalies', require('./routes/anomalyRoutes'));
app.use('/api/governance', require('./routes/governanceRoutes'));
app.use('/api/approvals', require('./routes/approvalRoutes'));
app.use('/api/audit', require('./routes/auditRoutes'));
app.use('/api/integrations', require('./routes/integrationRoutes'));
app.use('/api/demo', require('./routes/demoRoutes'));

// Serve frontend static build in production if available
if (process.env.NODE_ENV === 'production' && !process.env.API_ONLY) {
  const distPath = path.join(__dirname, '../frontend/dist');
  if (require('fs').existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }
}

// 404 handler for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: `API endpoint not found: ${req.method} ${req.originalUrl}` });
});

// Centralized error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Export app and server for testing with Supertest
if (process.env.NODE_ENV !== 'test') {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'supersecretjwtkey_control_tower_2026_secure') {
      console.warn('[Security Warning] JWT_SECRET is unset or using the default dev key in production. Please set a strong, random secret!');
    }
  }

  connectDB().then(async () => {
    // Auto-seed baseline demo data if database is empty (e.g. initial cloud deployment)
    if (process.env.NODE_ENV === 'production' || process.env.AUTO_SEED === 'true') {
      try {
        const User = require('./models/User');
        const count = await User.countDocuments();
        if (count === 0) {
          console.log('[Auto-Seed] Empty database detected. Seeding initial baseline data...');
          const resetDemo = require('./seed/resetDemo');
          await resetDemo();
          console.log('[Auto-Seed] Baseline seeding complete.');
        }
      } catch (seedErr) {
        console.warn('[Auto-Seed Warning]:', seedErr.message);
      }
    }

    server.listen(PORT, () => {
      console.log(`[Server] Agent Control Tower backend running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    });
  });
}

module.exports = { app, server, io };
