const express = require('express');
const router = express.Router();
const {
  getIntegrations,
  updateIntegration
} = require('../controllers/integrationController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getIntegrations);
router.put('/:id', authorize('Admin'), updateIntegration);

module.exports = router;
