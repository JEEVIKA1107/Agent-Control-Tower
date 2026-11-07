const mongoose = require('mongoose');

const telemetrySchema = new mongoose.Schema(
  {
    traceId: {
      type: String,
      required: [true, 'traceId is required'],
      index: true
    },
    spanId: {
      type: String,
      required: [true, 'spanId is required'],
      unique: true,
      index: true
    },
    parentSpanId: {
      type: String,
      default: null,
      index: true
    },
    agentId: {
      type: String,
      required: [true, 'agentId is required'],
      index: true
    },
    eventType: {
      type: String,
      required: [true, 'eventType is required'],
      enum: [
        'llm_call',
        'tool_execution',
        'agent_handoff',
        'error',
        'heartbeat',
        'state_change',
        'workflow_step'
      ],
      index: true
    },
    status: {
      type: String,
      enum: ['success', 'error', 'running', 'timeout'],
      default: 'success',
      index: true
    },
    duration: {
      type: Number,
      default: 0,
      min: 0 // Duration in milliseconds
    },
    tokenUsage: {
      promptTokens: { type: Number, default: 0 },
      completionTokens: { type: Number, default: 0 },
      totalTokens: { type: Number, default: 0 }
    },
    errorInfo: {
      code: { type: String, default: null },
      message: { type: String, default: null },
      stack: { type: String, default: null }
    },
    inputMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    outputMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    stateDelta: {
      previousStateRef: { type: String, default: null },
      currentStateRef: { type: String, default: null },
      changedFields: { type: mongoose.Schema.Types.Mixed, default: [] },
      timestamp: { type: Date, default: Date.now },
      executionId: { type: String, default: null }
    },
    callSignature: {
      type: String,
      default: null,
      index: true
    },
    source: {
      type: String,
      enum: ['live', 'simulated'],
      default: 'live',
      index: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for queries filtering by agent & timestamp
telemetrySchema.index({ agentId: 1, timestamp: -1 });
telemetrySchema.index({ traceId: 1, timestamp: 1 });

module.exports = mongoose.model('Telemetry', telemetrySchema);
