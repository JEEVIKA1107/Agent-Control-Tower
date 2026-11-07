const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect middleware: validates JWT from Authorization header and attaches user to req
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: No authentication token provided'
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'supersecretjwtkey_control_tower_2026_secure'
    );

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User account belonging to this token no longer exists'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: User account has been deactivated'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or expired authentication token',
      error: err.message
    });
  }
};

/**
 * Role-based authorization middleware
 * @param  {...string} roles Permitted roles, e.g. 'Admin', 'Operator'
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Authentication required'
      });
    }

    const permitted = roles.map((r) => r.toLowerCase());
    const userRole = (req.user.role || '').toLowerCase();

    if (!permitted.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user.role}' is not authorized to access this resource. Required roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

module.exports = {
  protect,
  authorize
};
