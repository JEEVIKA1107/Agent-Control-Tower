/**
 * Centralized API error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error in non-test environments
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[API Error] ${req.method} ${req.originalUrl}:`, err);
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    const message = `Resource not found with id: ${err.value}`;
    return res.status(404).json({ success: false, message });
  }

  // Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `A record with this ${field} already exists`;
    return res.status(400).json({ success: false, message, field });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    return res.status(400).json({ success: false, message });
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  // Default server error
  const statusCode = error.statusCode || res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode >= 400 ? statusCode : 500).json({
    success: false,
    message: error.message || 'Internal Server Error'
  });
};

module.exports = errorHandler;
