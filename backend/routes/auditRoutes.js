const express = require('express');
const router = express.Router();
const {
  getAuditLogs,
  verifyChain,
  simulateTamper,
  restoreChain
} = require('../controllers/auditController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getAuditLogs);
router.get('/verify', verifyChain);
router.post('/demo/tamper', authorize('Admin'), simulateTamper);
router.post('/demo/restore', authorize('Admin'), restoreChain);

module.exports = router;
