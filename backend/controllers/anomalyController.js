const Anomaly = require('../models/Anomaly');
const { runBatchDetection } = require('../services/anomalyDetector');
const { generateRecommendationForAnomaly } = require('../services/governanceEngine');
const { appendAuditLog } = require('../services/auditService');

// @desc    Get all anomalies with filtering
// @route   GET /api/anomalies
// @access  Private
exports.getAnomalies = async (req, res, next) => {
  try {
    const { type, severity, status, source, agentId, limit = 50, page = 1 } = req.query;

    const filter = {};
    if (type && type !== 'all') filter.type = type;
    if (severity && severity !== 'all') filter.severity = severity;
    if (status && status !== 'all') filter.status = status;
    if (source && source !== 'all') filter.source = source;
    if (agentId && agentId !== 'all') filter.agentId = agentId;

    const skip = (Number(page) - 1) * Number(limit);

    const [total, anomalies] = await Promise.all([
      Anomaly.countDocuments(filter),
      Anomaly.find(filter)
        .sort({ detectionTime: -1 })
        .skip(skip)
        .limit(Number(limit))
    ]);

    res.status(200).json({
      success: true,
      total,
      data: anomalies
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single anomaly by ID
// @route   GET /api/anomalies/:id
// @access  Private
exports.getAnomalyById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const anomaly = await Anomaly.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { anomalyId: id }]
    });

    if (!anomaly) {
      return res.status(404).json({
        success: false,
        message: 'Anomaly not found'
      });
    }

    res.status(200).json({
      success: true,
      data: anomaly
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Manually run rule-based anomaly detection scan
// @route   POST /api/anomalies/detect
// @access  Private (Admin & Operator)
exports.detectAnomalies = async (req, res, next) => {
  try {
    const newlyDetected = await runBatchDetection();

    // Auto-generate recommendations for any detected anomaly
    for (const anom of newlyDetected) {
      await generateRecommendationForAnomaly(anom);
    }

    // Socket notification
    const io = req.app.get('io');
    if (io && newlyDetected.length > 0) {
      io.emit('anomaly:detected', { count: newlyDetected.length, anomalies: newlyDetected });
    }

    res.status(200).json({
      success: true,
      detectedCount: newlyDetected.length,
      data: newlyDetected,
      message: newlyDetected.length > 0
        ? `Detection completed: ${newlyDetected.length} rule-based anomaly violations identified.`
        : 'Detection completed: All telemetry spans within configured governance thresholds.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Acknowledge an anomaly
// @route   PUT /api/anomalies/:id/acknowledge
// @access  Private (Admin & Operator)
exports.acknowledgeAnomaly = async (req, res, next) => {
  try {
    const { id } = req.params;
    const anomaly = await Anomaly.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { anomalyId: id }]
    });

    if (!anomaly) {
      return res.status(404).json({
        success: false,
        message: 'Anomaly not found'
      });
    }

    anomaly.status = 'Acknowledged';
    anomaly.acknowledgedBy = req.user.email;
    anomaly.acknowledgedAt = new Date();
    await anomaly.save();

    // Append cryptographic audit log
    try {
      await appendAuditLog({
        userId: req.user.email,
        actorName: req.user.name || req.user.email,
        eventType: 'ANOMALY_ACKNOWLEDGED',
        relatedAgent: anomaly.agentId,
        relatedExecution: anomaly.traceId,
        actionDetails: {
          anomalyId: anomaly.anomalyId,
          type: anomaly.type,
          severity: anomaly.severity,
          description: anomaly.description
        },
        source: anomaly.source || 'live'
      });
    } catch (auditErr) {
      console.warn('[Audit Warning]:', auditErr.message);
    }

    res.status(200).json({
      success: true,
      data: anomaly,
      message: `Anomaly ${anomaly.anomalyId} acknowledged by ${req.user.email}`
    });
  } catch (error) {
    next(error);
  }
};
