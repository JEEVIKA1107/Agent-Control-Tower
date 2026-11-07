const crypto = require('crypto');
const Telemetry = require('../models/Telemetry');
const Agent = require('../models/Agent');
const Execution = require('../models/Execution');
const { normalizeOTelSpan } = require('../adapters/otelAdapter');

/**
 * Generate call signature for deterministic repeat loop detection:
 * agentId + ":" + action + ":" + sha256(input)
 */
const generateCallSignature = (agentId, action, inputMetadata) => {
  const serializedInput = inputMetadata ? JSON.stringify(inputMetadata) : '';
  const hash = crypto.createHash('sha256').update(serializedInput).digest('hex').slice(0, 12);
  return `${agentId}:${action || 'default'}:${hash}`;
};

// @desc    Ingest raw telemetry event (common schema or OTel format)
// @route   POST /api/telemetry/ingest
// @access  Public / Service-to-Service (or Private)
exports.ingestTelemetry = async (req, res, next) => {
  try {
    const rawPayload = req.body;

    if (!rawPayload) {
      return res.status(400).json({
        success: false,
        message: 'Telemetry payload cannot be empty'
      });
    }

    // Support batch ingestion or single event
    const events = Array.isArray(rawPayload) ? rawPayload : [rawPayload];
    const normalizedEvents = [];

    for (const raw of events) {
      // Check if OTel span format
      let normalized;
      if (raw.attributes || raw.start_time_unix_nano || raw.trace_id) {
        normalized = normalizeOTelSpan(raw);
      } else {
        // Validate required fields in common schema
        if (!raw.traceId || !raw.spanId || !raw.agentId || !raw.eventType) {
          return res.status(400).json({
            success: false,
            message: 'Validation failed: traceId, spanId, agentId, and eventType are mandatory'
          });
        }

        const promptTokens = raw.tokenUsage?.promptTokens || 0;
        const completionTokens = raw.tokenUsage?.completionTokens || 0;
        const totalTokens = raw.tokenUsage?.totalTokens || (promptTokens + completionTokens);

        normalized = {
          traceId: String(raw.traceId),
          spanId: String(raw.spanId),
          parentSpanId: raw.parentSpanId ? String(raw.parentSpanId) : null,
          agentId: String(raw.agentId),
          eventType: raw.eventType,
          status: raw.status || 'success',
          duration: Number(raw.duration || 0),
          tokenUsage: {
            promptTokens,
            completionTokens,
            totalTokens
          },
          errorInfo: raw.errorInfo || { code: null, message: null, stack: null },
          inputMetadata: raw.inputMetadata || {},
          outputMetadata: raw.outputMetadata || {},
          stateDelta: raw.stateDelta || {
            previousStateRef: null,
            currentStateRef: null,
            changedFields: [],
            timestamp: new Date(),
            executionId: raw.traceId
          },
          source: raw.source === 'simulated' ? 'simulated' : 'live',
          timestamp: raw.timestamp ? new Date(raw.timestamp) : new Date()
        };
      }

      // Generate call signature
      normalized.callSignature = generateCallSignature(
        normalized.agentId,
        normalized.eventType,
        normalized.inputMetadata
      );

      normalizedEvents.push(normalized);
    }

    // Save events to MongoDB with duplicate prevention
    const savedRecords = [];
    let duplicatesIgnored = 0;

    for (const item of normalizedEvents) {
      try {
        const existing = await Telemetry.findOne({ spanId: item.spanId });
        if (existing) {
          duplicatesIgnored++;
          savedRecords.push(existing);
          continue;
        }
        const created = await Telemetry.create(item);
        savedRecords.push(created);
      } catch (err) {
        if (err.code === 11000) {
          duplicatesIgnored++;
          const existing = await Telemetry.findOne({ spanId: item.spanId });
          if (existing) savedRecords.push(existing);
          continue;
        }
        throw err;
      }
    }

    // Update Agent aggregates and Execution records
    for (const item of normalizedEvents) {
      // 1. Update or auto-register unknown Agent safely
      const existingAgent = await Agent.findOne({ agentId: item.agentId });
      if (!existingAgent) {
        await Agent.create({
          agentId: item.agentId,
          name: `Auto-Discovered: ${item.agentId}`,
          type: 'Monitoring',
          framework: 'Custom',
          status: item.status === 'error' ? 'Failed' : 'Active',
          executionCount: 1,
          totalTokens: item.tokenUsage.totalTokens,
          lastActive: item.timestamp,
          source: item.source
        });
      } else {
        await Agent.findOneAndUpdate(
          { agentId: item.agentId },
          {
            $inc: {
              executionCount: 1,
              totalTokens: item.tokenUsage.totalTokens
            },
            $set: {
              lastActive: item.timestamp,
              ...(item.status === 'error' ? { status: 'Failed' } : {})
            }
          }
        );
      }

      // 2. Upsert or update Execution record
      const costPer1k = Number(process.env.DEFAULT_COST_PER_1K_TOKENS || 0.002);
      const estCost = (item.tokenUsage.totalTokens / 1000) * costPer1k;

      await Execution.findOneAndUpdate(
        { traceId: item.traceId, agentId: item.agentId },
        {
          $setOnInsert: {
            executionId: `exec-${item.traceId}-${item.agentId}`,
            traceId: item.traceId,
            agentId: item.agentId,
            parentExecutionId: item.parentSpanId,
            startTime: item.timestamp,
            rootSpanId: item.spanId,
            source: item.source
          },
          $set: {
            endTime: new Date(new Date(item.timestamp).getTime() + item.duration),
            status: item.status === 'error' ? 'failed' : 'success',
            errorMessage: item.errorInfo?.message || null
          },
          $inc: {
            duration: item.duration,
            'tokens.prompt': item.tokenUsage.promptTokens,
            'tokens.completion': item.tokenUsage.completionTokens,
            'tokens.total': item.tokenUsage.totalTokens,
            cost: estCost
          }
        },
        { upsert: true, new: true }
      );

      // 3. Evaluate for rule-based anomalies & generate governance recommendations
      try {
        const { evaluateTelemetryForAnomalies } = require('../services/anomalyDetector');
        const { generateRecommendationForAnomaly } = require('../services/governanceEngine');

        const detectedAnomalies = await evaluateTelemetryForAnomalies(item);
        for (const anom of detectedAnomalies) {
          await generateRecommendationForAnomaly(anom);
        }
      } catch (anomErr) {
        if (process.env.NODE_ENV !== 'test') {
          console.error('[Anomaly Detector Warning]:', anomErr.message);
        }
      }
    }

    // Real-time notification via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('telemetry:ingested', { count: savedRecords.length, sample: savedRecords[0] });
    }

    res.status(201).json({
      success: true,
      ingestedCount: savedRecords.length,
      duplicatesIgnored,
      data: savedRecords
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get telemetry events with pagination & filtering
// @route   GET /api/telemetry
// @access  Private
exports.getTelemetry = async (req, res, next) => {
  try {
    const { agentId, eventType, status, traceId, source, limit = 50, page = 1 } = req.query;

    const filter = {};
    if (agentId && agentId !== 'all') filter.agentId = agentId;
    if (eventType && eventType !== 'all') filter.eventType = eventType;
    if (status && status !== 'all') filter.status = status;
    if (traceId) filter.traceId = traceId;
    if (source && source !== 'all') filter.source = source;

    const skip = (Number(page) - 1) * Number(limit);

    const [total, records] = await Promise.all([
      Telemetry.countDocuments(filter),
      Telemetry.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit))
    ]);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      count: records.length,
      data: records
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single telemetry record by ID
// @route   GET /api/telemetry/:id
// @access  Private
exports.getTelemetryById = async (req, res, next) => {
  try {
    const record = await Telemetry.findById(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Telemetry record not found'
      });
    }

    res.status(200).json({
      success: true,
      data: record
    });
  } catch (error) {
    next(error);
  }
};
