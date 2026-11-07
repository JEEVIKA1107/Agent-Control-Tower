const express = require('express');
const router = express.Router();
const {
  getApprovals,
  getApprovalById,
  decideApproval,
  getActionExecutions
} = require('../controllers/approvalController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getApprovals);
router.get('/actions', getActionExecutions);
router.get('/:id', getApprovalById);
router.put('/:id/decision', authorize('Admin', 'Operator'), decideApproval);

module.exports = router;
