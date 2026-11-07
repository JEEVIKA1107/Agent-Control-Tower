const Integration = require('../models/Integration');

const defaultIntegrations = [
  {
    integrationId: 'integ-otel',
    name: 'OpenTelemetry (OTel)',
    type: 'Telemetry Protocol',
    status: 'Connected', // Working real adapter tested on /api/telemetry/ingest
    dataSourceType: 'OpenTelemetry OTLP JSON Spans',
    lastReceivedEvent: new Date(),
    configurationStatus: 'Active - Endpoint /api/telemetry/ingest verified',
    description: 'Generic OpenTelemetry-compliant JSON span adapter normalizing GenAI semantic conventions.',
    source: 'live'
  },
  {
    integrationId: 'integ-langgraph',
    name: 'LangGraph',
    type: 'Multi-Agent Framework',
    status: 'Simulated Demo',
    dataSourceType: 'LangGraph State Graph Spans',
    lastReceivedEvent: new Date(),
    configurationStatus: 'Simulated Adapter Running',
    description: 'Synthetic trace ingestion adapter converting state graph spans into common telemetry schema.',
    source: 'simulated'
  },
  {
    integrationId: 'integ-autogen',
    name: 'AutoGen',
    type: 'Multi-Agent Framework',
    status: 'Simulated Demo',
    dataSourceType: 'AutoGen Conversational Turns',
    lastReceivedEvent: new Date(),
    configurationStatus: 'Simulated Adapter Running',
    description: 'Simulated conversational agent message turns normalized for token and latency tracking.',
    source: 'simulated'
  },
  {
    integrationId: 'integ-crewai',
    name: 'CrewAI',
    type: 'Multi-Agent Framework',
    status: 'Planned',
    dataSourceType: 'Hierarchical Crew Task Events',
    lastReceivedEvent: null,
    configurationStatus: 'Pending Future Connector',
    description: 'Sequential and hierarchical crew task execution listener (scheduled for future release).',
    source: 'simulated'
  },
  {
    integrationId: 'integ-mcp',
    name: 'Model Context Protocol (MCP)',
    type: 'Tool Protocol',
    status: 'Planned',
    dataSourceType: 'MCP Tool Context RPC Packets',
    lastReceivedEvent: null,
    configurationStatus: 'Protocol Design Stage',
    description: 'Standardized tool server protocol monitoring agent-to-tool capabilities and security boundaries.',
    source: 'simulated'
  },
  {
    integrationId: 'integ-a2a',
    name: 'Agent-to-Agent (A2A)',
    type: 'Inter-Agent Protocol',
    status: 'Planned',
    dataSourceType: 'Direct Peer-to-Peer Envelopes',
    lastReceivedEvent: null,
    configurationStatus: 'Protocol Design Stage',
    description: 'Direct inter-agent handshake and message envelope validation protocol.',
    source: 'simulated'
  }
];

// @desc    Get all integrations with status
// @route   GET /api/integrations
// @access  Private
exports.getIntegrations = async (req, res, next) => {
  try {
    let list = await Integration.find().sort({ createdAt: 1 });

    if (list.length === 0) {
      await Integration.insertMany(defaultIntegrations);
      list = await Integration.find().sort({ createdAt: 1 });
    }

    res.status(200).json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update integration status (Admin only)
// @route   PUT /api/integrations/:id
// @access  Private (Admin only)
exports.updateIntegration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, configurationStatus, description } = req.body;

    const integ = await Integration.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { integrationId: id }]
    });

    if (!integ) {
      return res.status(404).json({
        success: false,
        message: 'Integration not found'
      });
    }

    if (status) integ.status = status;
    if (configurationStatus) integ.configurationStatus = configurationStatus;
    if (description) integ.description = description;

    await integ.save();

    res.status(200).json({
      success: true,
      data: integ
    });
  } catch (error) {
    next(error);
  }
};
