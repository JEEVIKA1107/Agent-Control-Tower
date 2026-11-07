const AuditLog = require('../models/AuditLog');
const {
  verifyAuditChain,
  simulateDemoTamper,
  restoreDemoChain
} = require('../services/auditService');

// @desc    Get all audit log records with filtering
// @route   GET /api/audit
// @access  Private
exports.getAuditLogs = async (req, res, next) => {
  try {
    const { eventType, source, limit = 50, page = 1 } = req.query;

    const filter = {};
    if (eventType && eventType !== 'all') filter.eventType = eventType;
    if (source && source !== 'all') filter.source = source;

    const skip = (Number(page) - 1) * Number(limit);

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter)
        .sort({ sequenceNumber: -1 })
        .skip(skip)
        .limit(Number(limit))
    ]);

    res.status(200).json({
      success: true,
      total,
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify cryptographic SHA-256 hash chain integrity
// @route   GET /api/audit/verify
// @access  Private
exports.verifyChain = async (req, res, next) => {
  try {
    const verificationResult = await verifyAuditChain();

    res.status(200).json({
      success: true,
      data: verificationResult,
      tamperEvidentDisclosure: 'Cryptographic hash chaining detects any post-hoc modification to recorded history. It does not prevent an administrator with full DB access from recomputing the chain.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Simulate tampering on a demo audit record (DEMO ONLY)
// @route   POST /api/audit/demo/tamper
// @access  Private (Admin only)
exports.simulateTamper = async (req, res, next) => {
  try {
    const { sequenceNumber } = req.body;
    const result = await simulateDemoTamper(sequenceNumber);

    res.status(200).json({
      success: true,
      demoSimulation: true,
      notice: 'Simulated security demonstration: Operates strictly on demo records.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Restore audit chain after demo tampering (DEMO ONLY)
// @route   POST /api/audit/demo/restore
// @access  Private (Admin only)
exports.restoreChain = async (req, res, next) => {
  try {
    const result = await restoreDemoChain();

    res.status(200).json({
      success: true,
      demoSimulation: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};
