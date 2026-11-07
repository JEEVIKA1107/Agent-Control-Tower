const express = require('express');
const router = express.Router();
const {
  getAnomalies,
  getAnomalyById,
  detectAnomalies,
  acknowledgeAnomaly
} = require('../controllers/anomalyController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getAnomalies);
router.post('/detect', authorize('Admin', 'Operator'), detectAnomalies);
router.get('/:id', getAnomalyById);
router.put('/:id/acknowledge', authorize('Admin', 'Operator'), acknowledgeAnomaly);

module.exports = router;
