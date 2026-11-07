const GovernancePolicy = require('../models/GovernancePolicy');
const GovernanceRecommendation = require('../models/GovernanceRecommendation');
const { appendAuditLog } = require('../services/auditService');

// @desc    Get all governance policies
// @route   GET /api/governance/policies
// @access  Private
exports.getPolicies = async (req, res, next) => {
  try {
    let policies = await GovernancePolicy.find().sort({ createdAt: -1 });

    // Seed default policy if none exists yet
    if (policies.length === 0) {
      const defaultPolicy = await GovernancePolicy.create({
        policyId: 'pol-default-governance',
        name: 'Enterprise Multi-Agent Default Policy',
        description: 'Global threshold ceiling for tokens, duration, recursion limits and approval gates.',
        maxTokenBudget: Number(process.env.DEFAULT_TOKEN_BUDGET || 50000),
        maxExecutionDurationMs: Number(process.env.DEFAULT_MAX_DURATION_MS || 30000),
        maxRepeatedCalls: Number(process.env.DEFAULT_REPEAT_CALL_THRESHOLD || 3),
        promptDriftThreshold: 0.65,
        heartbeatTimeoutMs: 60000,
        costPer1kTokens: Number(process.env.DEFAULT_COST_PER_1K_TOKENS || 0.002),
        requireHumanApproval: true,
        alertSeverity: 'High',
        isActive: true,
        source: 'simulated'
      });
      policies = [defaultPolicy];
    }

    res.status(200).json({
      success: true,
      data: policies
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new governance policy
// @route   POST /api/governance/policies
// @access  Private (Admin only)
exports.createPolicy = async (req, res, next) => {
  try {
    const {
      policyId,
      name,
      description,
      maxTokenBudget,
      maxExecutionDurationMs,
      maxRepeatedCalls,
      promptDriftThreshold,
      costPer1kTokens,
      requireHumanApproval,
      alertSeverity,
      source
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Policy name is required'
      });
    }

    const policy = await GovernancePolicy.create({
      policyId: policyId || `pol-${Date.now()}`,
      name,
      description: description || '',
      maxTokenBudget: maxTokenBudget || 50000,
      maxExecutionDurationMs: maxExecutionDurationMs || 30000,
      maxRepeatedCalls: maxRepeatedCalls || 3,
      promptDriftThreshold: promptDriftThreshold !== undefined ? promptDriftThreshold : 0.65,
      costPer1kTokens: costPer1kTokens || 0.002,
      requireHumanApproval: requireHumanApproval !== undefined ? requireHumanApproval : true,
      alertSeverity: alertSeverity || 'High',
      isActive: true,
      source: source || 'live'
    });

    res.status(201).json({
      success: true,
      data: policy
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a governance policy
// @route   PUT /api/governance/policies/:id
// @access  Private (Admin only)
exports.updatePolicy = async (req, res, next) => {
  try {
    const { id } = req.params;

    const policy = await GovernancePolicy.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { policyId: id }]
    });

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: `Policy not found with id: ${id}`
      });
    }

    const fields = [
      'name',
      'description',
      'maxTokenBudget',
      'maxExecutionDurationMs',
      'maxRepeatedCalls',
      'promptDriftThreshold',
      'heartbeatTimeoutMs',
      'costPer1kTokens',
      'requireHumanApproval',
      'alertSeverity',
      'isActive'
    ];

    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        policy[f] = req.body[f];
      }
    });

    await policy.save();

    // Append audit log
    try {
      await appendAuditLog({
        userId: req.user?.email || 'admin',
        actorName: req.user?.name || 'Administrator',
        eventType: 'POLICY_UPDATED',
        actionDetails: {
          policyId: policy.policyId,
          maxTokenBudget: policy.maxTokenBudget,
          maxExecutionDurationMs: policy.maxExecutionDurationMs,
          maxRepeatedCalls: policy.maxRepeatedCalls
        },
        source: policy.source
      });
    } catch (e) {
      console.warn('[Audit Warning]:', e.message);
    }

    res.status(200).json({
      success: true,
      data: policy
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all governance recommendations
// @route   GET /api/governance/recommendations
// @access  Private
exports.getRecommendations = async (req, res, next) => {
  try {
    const { status, actionType, source } = req.query;

    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (actionType && actionType !== 'all') filter.actionType = actionType;
    if (source && source !== 'all') filter.source = source;

    const recommendations = await GovernanceRecommendation.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: recommendations.length,
      data: recommendations
    });
  } catch (error) {
    next(error);
  }
};
