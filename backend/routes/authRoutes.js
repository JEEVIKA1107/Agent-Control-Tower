const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

// Demo test endpoint to verify RBAC protection
router.get('/admin-only', protect, authorize('Admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome Admin: access granted to privileged resource',
    user: req.user.email
  });
});

module.exports = router;
