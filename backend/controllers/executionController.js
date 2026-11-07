const Execution = require('../models/Execution');
const Telemetry = require('../models/Telemetry');
const Agent = require('../models/Agent');

// @desc    Get all executions with filtering
// @route   GET /api/executions
// @access  Private
exports.getExecutions = async (req, res, next) => {
  try {
    const { agentId, status, source, limit = 50, page = 1 } = req.query;

    const filter = {};
    if (agentId && agentId !== 'all') filter.agentId = agentId;
    if (status && status !== 'all') filter.status = status;
    if (source && source !== 'all') filter.source = source;

    const skip = (Number(page) - 1) * Number(limit);

    const [total, records] = await Promise.all([
      Execution.countDocuments(filter),
      Execution.find(filter)
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(Number(limit))
    ]);

    res.status(200).json({
      success: true,
      total,
      data: records
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get execution details by ID
// @route   GET /api/executions/:id
// @access  Private
exports.getExecutionById = async (req, res, next) => {
  try {
    const execution = await Execution.findById(req.params.id);
    if (!execution) {
      return res.status(404).json({
        success: false,
        message: 'Execution not found'
      });
    }

    // Find all linked telemetry spans
    const spans = await Telemetry.find({ traceId: execution.traceId }).sort({ timestamp: 1 });

    res.status(200).json({
      success: true,
      data: {
        execution,
        spans
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get distinct traces with summary metrics for trace selector
// @route   GET /api/executions/traces
// @access  Private
exports.getTraces = async (req, res, next) => {
  try {
    const { source } = req.query;
    const match = {};
    if (source && source !== 'all') match.source = source;

    const traces = await Telemetry.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$traceId',
          traceId: { $first: '$traceId' },
          startTime: { $min: '$timestamp' },
          endTime: { $max: '$timestamp' },
          totalDuration: { $sum: '$duration' },
          totalTokens: { $sum: '$tokenUsage.totalTokens' },
          spanCount: { $sum: 1 },
          agents: { $addToSet: '$agentId' },
          hasErrors: {
            $max: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] }
          },
          source: { $first: '$source' }
        }
      },
      { $sort: { startTime: -1 } },
      { $limit: 30 }
    ]);

    res.status(200).json({
      success: true,
      data: traces
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get lineage graph data (React Flow nodes and edges) for a given traceId
// @route   GET /api/executions/lineage/:traceId
// @access  Private
exports.getLineageByTraceId = async (req, res, next) => {
  try {
    const { traceId } = req.params;

    // Fetch all spans for this trace in chronological order
    const spans = await Telemetry.find({ traceId }).sort({ timestamp: 1 });

    if (!spans || spans.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No telemetry spans found for trace: ${traceId}`
      });
    }

    // Fetch agent metadata for enrichments
    const agentIds = [...new Set(spans.map(s => s.agentId))];
    const agents = await Agent.find({ agentId: { $in: agentIds } });
    const agentMap = {};
    agents.forEach(a => { agentMap[a.agentId] = a; });

    // Build hierarchy for coordinate layout
    // Level calculation (BFS from root spans)
    const levelMap = {};
    const parentToChildren = {};
    spans.forEach(s => {
      const parent = s.parentSpanId || 'ROOT';
      if (!parentToChildren[parent]) parentToChildren[parent] = [];
      parentToChildren[parent].push(s.spanId);
    });

    const assignLevel = (spanId, currentLevel) => {
      levelMap[spanId] = currentLevel;
      if (parentToChildren[spanId]) {
        parentToChildren[spanId].forEach(childId => assignLevel(childId, currentLevel + 1));
      }
    };

    // Find roots
    const roots = spans.filter(s => !s.parentSpanId || !spans.some(p => p.spanId === s.parentSpanId));
    roots.forEach(r => assignLevel(r.spanId, 0));

    // Count nodes per level to center them horizontally
    const nodesPerLevel = {};
    spans.forEach(s => {
      const lvl = levelMap[s.spanId] || 0;
      nodesPerLevel[lvl] = (nodesPerLevel[lvl] || 0) + 1;
    });

    const levelTrackers = {};

    // Transform into React Flow nodes
    const nodes = spans.map((span) => {
      const lvl = levelMap[span.spanId] || 0;
      const countAtLevel = nodesPerLevel[lvl] || 1;
      const indexAtLevel = levelTrackers[lvl] || 0;
      levelTrackers[lvl] = indexAtLevel + 1;

      // Coordinate placement (horizontal branch tree)
      const x = lvl * 280 + 50;
      const spacingY = 160;
      const startY = 120 - ((countAtLevel - 1) * spacingY) / 2;
      const y = startY + indexAtLevel * spacingY;

      const agent = agentMap[span.agentId];

      return {
        id: span.spanId,
        type: 'agentNode', // Custom React Flow node type
        position: { x, y: Math.max(y, 40) },
        data: {
          spanId: span.spanId,
          traceId: span.traceId,
          parentSpanId: span.parentSpanId,
          agentId: span.agentId,
          agentName: agent ? agent.name : span.agentId,
          agentType: agent ? agent.type : 'Agent',
          eventType: span.eventType,
          status: span.status,
          duration: span.duration,
          tokens: span.tokenUsage,
          timestamp: span.timestamp,
          errorInfo: span.errorInfo,
          inputMetadata: span.inputMetadata,
          outputMetadata: span.outputMetadata,
          stateDelta: span.stateDelta,
          source: span.source
        }
      };
    });

    // Transform parent-child relationships into React Flow edges
    const edges = [];
    spans.forEach(span => {
      if (span.parentSpanId && spans.some(s => s.spanId === span.parentSpanId)) {
        const isErrorPath = span.status === 'error';
        edges.push({
          id: `edge-${span.parentSpanId}-${span.spanId}`,
          source: span.parentSpanId,
          target: span.spanId,
          animated: span.status === 'running',
          style: {
            stroke: isErrorPath ? '#ef4444' : '#38bdf8',
            strokeWidth: isErrorPath ? 2.5 : 1.8
          }
        });
      }
    });

    res.status(200).json({
      success: true,
      traceId,
      nodes,
      edges,
      summary: {
        totalSpans: spans.length,
        totalTokens: spans.reduce((acc, s) => acc + (s.tokenUsage?.totalTokens || 0), 0),
        duration: spans.reduce((acc, s) => acc + (s.duration || 0), 0),
        status: spans.some(s => s.status === 'error') ? 'failed' : 'success'
      }
    });
  } catch (error) {
    next(error);
  }
};
