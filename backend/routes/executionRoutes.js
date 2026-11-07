const express = require('express');
const router = express.Router();
const {
  getExecutions,
  getExecutionById,
  getTraces,
  getLineageByTraceId
} = require('../controllers/executionController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getExecutions);
router.get('/traces', getTraces);
router.get('/lineage/:traceId', getLineageByTraceId);
router.get('/:id', getExecutionById);

module.exports = router;
