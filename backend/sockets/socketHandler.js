const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Socket.IO architecture initializer
 * Sets up authentication middleware and event listeners
 */
const initSocketIO = (io) => {
  // Socket.IO authentication middleware with JWT
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        // Allow unauthenticated connection in dev or mark guest
        socket.user = null;
        return next();
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'supersecretjwtkey_control_tower_2026_secure'
      );
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        socket.user = user;
      }
      next();
    } catch (err) {
      // Don't crash socket handshake on auth error; assign null user
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    const userRole = socket.user ? socket.user.role : 'Guest';
    const userEmail = socket.user ? socket.user.email : 'Anonymous';

    if (process.env.NODE_ENV !== 'test') {
      console.log(`[Socket.IO] Client connected: ${socket.id} (${userEmail} [${userRole}])`);
    }

    // Join room based on role for scoped broadcasts
    if (socket.user) {
      socket.join(`role:${socket.user.role}`);
      socket.join(`user:${socket.user._id}`);
    }

    socket.on('disconnect', () => {
      if (process.env.NODE_ENV !== 'test') {
        console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
      }
    });
  });

  return io;
};

module.exports = initSocketIO;
