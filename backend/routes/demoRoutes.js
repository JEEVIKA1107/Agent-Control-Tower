const express = require('express');
const router = express.Router();
const {
  executeScenarioA,
  executeScenarioB,
  executeScenarioC,
  executeScenarioD,
  executeScenarioE,
  resetDemoData,
  getSystemStatus
} = require('../controllers/demoController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/status', getSystemStatus);

router.post('/scenario-a', authorize('admin', 'operator'), executeScenarioA);
router.post('/scenario-b', authorize('admin', 'operator'), executeScenarioB);
router.post('/scenario-c', authorize('admin', 'operator'), executeScenarioC);
router.post('/scenario-d', authorize('admin', 'operator'), executeScenarioD);
router.post('/scenario-e', authorize('admin'), executeScenarioE);

router.post('/reset', authorize('admin'), resetDemoData);

module.exports = router;
