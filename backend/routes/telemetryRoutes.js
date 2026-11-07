const express = require('express');
const router = express.Router();
const {
  ingestTelemetry,
  getTelemetry,
  getTelemetryById
} = require('../controllers/telemetryController');
const { protect } = require('../middleware/auth');

// Public ingestion endpoint for pipeline collectors & agents
router.post('/ingest', ingestTelemetry);

// Query endpoints are protected
router.get('/', protect, getTelemetry);
router.get('/:id', protect, getTelemetryById);

module.exports = router;
