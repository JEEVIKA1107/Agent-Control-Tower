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

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Attach io instance to express app so controllers can emit events
app.set('io', io);
initSocketIO(io);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
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

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Export app and server for testing with Supertest
if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    server.listen(PORT, () => {
      console.log(`[Server] Agent Control Tower backend running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    });
  });
}

module.exports = { app, server, io };
