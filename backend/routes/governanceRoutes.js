const express = require('express');
const router = express.Router();
const {
  getPolicies,
  createPolicy,
  updatePolicy,
  getRecommendations
} = require('../controllers/governanceController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/policies', getPolicies);
router.post('/policies', authorize('Admin'), createPolicy);
router.put('/policies/:id', authorize('Admin'), updatePolicy);
router.get('/recommendations', getRecommendations);

module.exports = router;
