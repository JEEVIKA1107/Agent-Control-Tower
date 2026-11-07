const {
  runScenarioA,
  runScenarioB,
  runScenarioC,
  runScenarioD,
  runScenarioE
} = require('../services/demoScenarioService');
const resetDemo = require('../seed/resetDemo');
const Telemetry = require('../models/Telemetry');
const Agent = require('../models/Agent');
const Anomaly = require('../models/Anomaly');
const ApprovalRequest = require('../models/ApprovalRequest');
const ActionExecution = require('../models/ActionExecution');
const AuditLog = require('../models/AuditLog');

// @desc    Run Scenario A: Normal Agent Execution
// @route   POST /api/demo/scenario-a
// @access  Private (Admin & Operator)
exports.executeScenarioA = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const result = await runScenarioA(io);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Run Scenario B: Repeated Execution Anomaly
// @route   POST /api/demo/scenario-b
// @access  Private (Admin & Operator)
exports.executeScenarioB = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const result = await runScenarioB(io);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Run Scenario C: Token Surge Anomaly
// @route   POST /api/demo/scenario-c
// @access  Private (Admin & Operator)
exports.executeScenarioC = async (req, res, next) => {
  try {
    const io = req.app.get('io');
    const result = await runScenarioC(io);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Run Scenario D: Human Approval Workflow
// @route   POST /api/demo/scenario-d
// @access  Private (Admin & Operator)
exports.executeScenarioD = async (req, res, next) => {
  try {
    const result = await runScenarioD(req.user);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Run Scenario E: Cryptographic Audit Verification
// @route   POST /api/demo/scenario-e
// @access  Private (Admin only)
exports.executeScenarioE = async (req, res, next) => {
  try {
    const result = await runScenarioE();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Safe Demo State Reset (Strictly deletes simulated records, preserves live data)
// @route   POST /api/demo/reset
// @access  Private (Admin only)
exports.resetDemoData = async (req, res, next) => {
  try {
    await resetDemo();
    res.status(200).json({
      success: true,
      message: 'Demo state successfully reset to genesis baseline. Live data was preserved.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get system data breakdown (Simulated vs Live counts)
// @route   GET /api/demo/status
// @access  Private
exports.getSystemStatus = async (req, res, next) => {
  try {
    const [
      liveAgents, simAgents,
      liveTelemetry, simTelemetry,
      liveAnomalies, simAnomalies,
      liveAudit, simAudit
    ] = await Promise.all([
      Agent.countDocuments({ source: 'live' }),
      Agent.countDocuments({ source: 'simulated' }),
      Telemetry.countDocuments({ source: 'live' }),
      Telemetry.countDocuments({ source: 'simulated' }),
      Anomaly.countDocuments({ source: 'live' }),
      Anomaly.countDocuments({ source: 'simulated' }),
      AuditLog.countDocuments({ source: 'live' }),
      AuditLog.countDocuments({ source: 'simulated' })
    ]);

    res.status(200).json({
      success: true,
      data: {
        agents: { live: liveAgents, simulated: simAgents },
        telemetry: { live: liveTelemetry, simulated: simTelemetry },
        anomalies: { live: liveAnomalies, simulated: simAnomalies },
        auditLogs: { live: liveAudit, simulated: simAudit }
      }
    });
  } catch (error) {
    next(error);
  }
};
