const ApprovalRequest = require('../models/ApprovalRequest');
const ActionExecution = require('../models/ActionExecution');
const { processApprovalDecision } = require('../services/governanceEngine');

// @desc    Get all human approval requests
// @route   GET /api/approvals
// @access  Private
exports.getApprovals = async (req, res, next) => {
  try {
    const { status, severity, source, limit = 50, page = 1 } = req.query;

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (severity && severity !== 'all') filter.severity = severity;
    if (source && source !== 'all') filter.source = source;

    const skip = (Number(page) - 1) * Number(limit);

    const [total, requests] = await Promise.all([
      ApprovalRequest.countDocuments(filter),
      ApprovalRequest.find(filter)
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
    ]);

    res.status(200).json({
      success: true,
      total,
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single approval request
// @route   GET /api/approvals/:id
// @access  Private
exports.getApprovalById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await ApprovalRequest.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { requestId: id }]
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Approval request not found'
      });
    }

    // Find corresponding ActionExecution if decided
    const actionExecution = await ActionExecution.findOne({ approvalRequestId: request.requestId });

    res.status(200).json({
      success: true,
      data: {
        request,
        actionExecution
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit operator approval or rejection decision
// @route   PUT /api/approvals/:id/decision
// @access  Private (Admin & Operator only)
exports.decideApproval = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, comment } = req.body;

    if (!decision || !['Approved', 'Rejected'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: "Decision must be either 'Approved' or 'Rejected'"
      });
    }

    const request = await ApprovalRequest.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { requestId: id }]
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Approval request not found'
      });
    }

    // Process decision with strict 3-tier separation
    const result = await processApprovalDecision(
      request.requestId,
      decision,
      req.user,
      comment
    );

    // Socket notification
    const io = req.app.get('io');
    if (io) {
      io.emit('approval:decided', {
        requestId: request.requestId,
        decision,
        decidedBy: req.user.email,
        actionStatus: result.actionExecution.status
      });
    }

    res.status(200).json({
      success: true,
      message: `Approval request ${request.requestId} marked as ${decision}. Action execution recorded as '${result.actionExecution.status}'.`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all action execution records
// @route   GET /api/approvals/actions
// @access  Private
exports.getActionExecutions = async (req, res, next) => {
  try {
    const { status, source } = req.query;

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (source && source !== 'all') filter.source = source;

    const actions = await ActionExecution.find(filter)
      .sort({ executedAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: actions.length,
      data: actions
    });
  } catch (error) {
    next(error);
  }
};
