const Agent = require('../models/Agent');
const Execution = require('../models/Execution');
const Telemetry = require('../models/Telemetry');

/**
 * Calculate start date based on timeRange string
 */
const getStartDateFromRange = (timeRange) => {
  const now = new Date();
  switch (timeRange) {
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000);
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
};

// @desc    Get aggregated dashboard metrics
// @route   GET /api/dashboard/metrics
// @access  Private
exports.getDashboardMetrics = async (req, res, next) => {
  try {
    const { source = 'all', timeRange = '24h' } = req.query;
    const startDate = getStartDateFromRange(timeRange);

    // Build filter objects
    const agentFilter = {};
    const executionFilter = { startTime: { $gte: startDate } };
    const telemetryFilter = { timestamp: { $gte: startDate } };

    if (source !== 'all') {
      agentFilter.source = source;
      executionFilter.source = source;
      telemetryFilter.source = source;
    }

    // 1. Agent counts
    const [totalAgents, activeAgents, failedAgents] = await Promise.all([
      Agent.countDocuments(agentFilter),
      Agent.countDocuments({ ...agentFilter, status: 'Active' }),
      Agent.countDocuments({ ...agentFilter, status: 'Failed' })
    ]);

    // 2. Execution counts
    const totalExecutions = await Execution.countDocuments(executionFilter);

    // 3. Telemetry aggregations (tokens, latency)
    const telemetryStats = await Telemetry.aggregate([
      { $match: telemetryFilter },
      {
        $group: {
          _id: null,
          totalTokens: { $sum: '$tokenUsage.totalTokens' },
          avgLatency: { $avg: '$duration' },
          eventCount: { $sum: 1 }
        }
      }
    ]);

    const totalTokens = telemetryStats.length > 0 ? telemetryStats[0].totalTokens : 0;
    const averageLatency = telemetryStats.length > 0 ? Math.round(telemetryStats[0].avgLatency) : 0;

    // Configurable rate (default $0.002 per 1K tokens)
    const costPer1k = Number(process.env.DEFAULT_COST_PER_1K_TOKENS || 0.002);
    const estimatedCost = Number(((totalTokens / 1000) * costPer1k).toFixed(4));

    // Active anomalies count
    let activeAnomalies = 0;
    try {
      // Dynamic require so Anomaly model isn't required before Phase 3
      const Anomaly = require('../models/Anomaly');
      const anomalyFilter = { status: 'New' };
      if (source !== 'all') anomalyFilter.source = source;
      activeAnomalies = await Anomaly.countDocuments(anomalyFilter);
    } catch {
      activeAnomalies = 0;
    }

    res.status(200).json({
      success: true,
      data: {
        totalAgents,
        activeAgents,
        failedAgents,
        totalExecutions,
        averageLatency,
        totalTokenUsage: totalTokens,
        estimatedCost,
        costRatePer1k: costPer1k,
        activeAnomalies,
        timeRange,
        source
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get chart time-series & distribution data
// @route   GET /api/dashboard/charts
// @access  Private
exports.getDashboardCharts = async (req, res, next) => {
  try {
    const { source = 'all', timeRange = '24h' } = req.query;
    const startDate = getStartDateFromRange(timeRange);

    const match = { timestamp: { $gte: startDate } };
    if (source !== 'all') match.source = source;

    // 1. Time-series data (executions, tokens, latency grouped by hour)
    const timeSeries = await Telemetry.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' }
          },
          executions: { $sum: 1 },
          tokens: { $sum: '$tokenUsage.totalTokens' },
          avgLatency: { $avg: '$duration' },
          errors: {
            $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id': 1 } },
      {
        $project: {
          time: '$_id',
          executions: 1,
          tokens: 1,
          avgLatency: { $round: ['$avgLatency', 0] },
          errors: 1,
          _id: 0
        }
      }
    ]);

    // 2. Cost by Agent (top agents by token usage)
    const costPer1k = Number(process.env.DEFAULT_COST_PER_1K_TOKENS || 0.002);
    const costByAgent = await Telemetry.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$agentId',
          totalTokens: { $sum: '$tokenUsage.totalTokens' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalTokens: -1 } },
      { $limit: 6 },
      {
        $project: {
          agentId: '$_id',
          tokens: '$totalTokens',
          cost: {
            $round: [{ $multiply: [{ $divide: ['$totalTokens', 1000] }, costPer1k] }, 4]
          },
          _id: 0
        }
      }
    ]);

    // 3. Status breakdown (success vs error vs timeout)
    const statusBreakdown = await Telemetry.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        timeSeries,
        costByAgent,
        statusBreakdown
      }
    });
  } catch (error) {
    next(error);
  }
};
