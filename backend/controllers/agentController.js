const Agent = require('../models/Agent');
const Execution = require('../models/Execution');
const Telemetry = require('../models/Telemetry');
const { appendAuditLog } = require('../services/auditService');

// @desc    Get all registered agents with filtering & search
// @route   GET /api/agents
// @access  Private
exports.getAgents = async (req, res, next) => {
  try {
    const { status, type, source, search } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    }
    if (type && type !== 'all') {
      filter.type = type;
    }
    if (source && source !== 'all') {
      filter.source = source;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { agentId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const agents = await Agent.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: agents.length,
      data: agents
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single agent by ID or agentId
// @route   GET /api/agents/:id
// @access  Private
exports.getAgentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const agent = await Agent.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { agentId: id }]
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: `Agent not found with identifier: ${id}`
      });
    }

    // Fetch recent executions for this agent
    const recentExecutions = await Execution.find({ agentId: agent.agentId })
      .sort({ startTime: -1 })
      .limit(10);

    // Fetch recent telemetry events
    const recentTelemetry = await Telemetry.find({ agentId: agent.agentId })
      .sort({ timestamp: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        agent,
        recentExecutions,
        recentTelemetry
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register a new agent
// @route   POST /api/agents
// @access  Private (Admin & Operator)
exports.createAgent = async (req, res, next) => {
  try {
    const { agentId, name, type, description, framework, source } = req.body;

    if (!agentId || !name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Please provide agentId, name and agent type'
      });
    }

    const existing = await Agent.findOne({ agentId: agentId.trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Agent with ID '${agentId}' already exists`
      });
    }

    const agent = await Agent.create({
      agentId: agentId.trim(),
      name: name.trim(),
      type,
      description: description || '',
      framework: framework || 'Custom',
      status: 'Active',
      source: source || 'live'
    });

    // Write audit log
    try {
      await appendAuditLog({
        userId: req.user?.email || 'admin',
        actorName: req.user?.name || 'Administrator',
        eventType: 'AGENT_REGISTERED',
        relatedAgent: agent.agentId,
        actionDetails: { name: agent.name, type: agent.type, framework: agent.framework },
        source: agent.source
      });
    } catch (e) {
      console.warn('[Audit Warning]:', e.message);
    }

    res.status(201).json({
      success: true,
      data: agent
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update agent details
// @route   PUT /api/agents/:id
// @access  Private (Admin & Operator)
exports.updateAgent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, framework, status, type } = req.body;

    const agent = await Agent.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { agentId: id }]
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: `Agent not found with identifier: ${id}`
      });
    }

    if (name) agent.name = name.trim();
    if (description !== undefined) agent.description = description.trim();
    if (framework) agent.framework = framework;
    if (status) agent.status = status;
    if (type) agent.type = type;

    await agent.save();

    // Write audit log
    try {
      await appendAuditLog({
        userId: req.user?.email || 'admin',
        actorName: req.user?.name || 'Administrator',
        eventType: 'AGENT_UPDATED',
        relatedAgent: agent.agentId,
        actionDetails: {
          name: agent.name,
          framework: agent.framework,
          type: agent.type,
          status: agent.status
        },
        source: agent.source
      });
    } catch (e) {
      console.warn('[Audit Warning]:', e.message);
    }

    res.status(200).json({
      success: true,
      data: agent
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle agent status (Active <-> Disabled)
// @route   PUT /api/agents/:id/toggle-status
// @access  Private (Admin & Operator)
exports.toggleAgentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const agent = await Agent.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { agentId: id }]
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: `Agent not found with identifier: ${id}`
      });
    }

    agent.status = agent.status === 'Active' ? 'Disabled' : 'Active';
    await agent.save();

    // Write audit log
    try {
      await appendAuditLog({
        userId: req.user?.email || 'admin',
        actorName: req.user?.name || 'Operator',
        eventType: 'AGENT_STATUS_TOGGLED',
        relatedAgent: agent.agentId,
        actionDetails: { newStatus: agent.status },
        source: agent.source
      });
    } catch (e) {
      console.warn('[Audit Warning]:', e.message);
    }

    res.status(200).json({
      success: true,
      message: `Agent status updated to ${agent.status}`,
      data: agent
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an agent
// @route   DELETE /api/agents/:id
// @access  Private (Admin & Operator)
exports.deleteAgent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const agent = await Agent.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { agentId: id }]
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: `Agent not found with identifier: ${id}`
      });
    }

    await Agent.deleteOne({ _id: agent._id });

    // Write audit log
    try {
      await appendAuditLog({
        userId: req.user?.email || 'admin',
        actorName: req.user?.name || 'Administrator',
        eventType: 'AGENT_DELETED',
        relatedAgent: agent.agentId,
        actionDetails: { name: agent.name },
        source: agent.source
      });
    } catch (e) {
      console.warn('[Audit Warning]:', e.message);
    }

    res.status(200).json({
      success: true,
      message: `Agent ${agent.agentId} successfully removed`
    });
  } catch (error) {
    next(error);
  }
};
