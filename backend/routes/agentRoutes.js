const express = require('express');
const router = express.Router();
const {
  getAgents,
  getAgentById,
  createAgent,
  updateAgent,
  toggleAgentStatus,
  deleteAgent
} = require('../controllers/agentController');
const { protect, authorize } = require('../middleware/auth');

// All agent routes require authentication
router.use(protect);

router
  .route('/')
  .get(getAgents)
  .post(authorize('Admin', 'Operator'), createAgent);

router
  .route('/:id')
  .get(getAgentById)
  .put(authorize('Admin', 'Operator'), updateAgent)
  .delete(authorize('Admin', 'Operator'), deleteAgent);

router
  .route('/:id/toggle-status')
  .put(authorize('Admin', 'Operator'), toggleAgentStatus);

module.exports = router;
