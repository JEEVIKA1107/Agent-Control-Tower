const mongoose = require('mongoose');

const anomalySchema = new mongoose.Schema(
  {
    anomalyId: {
      type: String,
      required: [true, 'anomalyId is required'],
      unique: true,
      index: true
    },
    agentId: {
      type: String,
      required: [true, 'agentId is required'],
      index: true
    },
    traceId: {
      type: String,
      required: [true, 'traceId is required'],
      index: true
    },
    spanId: {
      type: String,
      default: null,
      index: true
    },
    type: {
      type: String,
      required: [true, 'Anomaly type is required'],
      enum: [
        'repeated_execution',
        'token_surge',
        'high_latency',
        'silent_failure',
        'prompt_drift'
      ],
      index: true
    },
    severity: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
      index: true
    },
    description: {
      type: String,
      required: [true, 'Anomaly description is required']
    },
    evidence: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    status: {
      type: String,
      enum: ['New', 'Acknowledged', 'Resolved'],
      default: 'New',
      index: true
    },
    recommendedAction: {
      type: String,
      enum: ['circuit_breaker', 'token_throttle', 'model_reroute', 'human_inspection'],
      default: 'human_inspection'
    },
    detectionTime: {
      type: Date,
      default: Date.now,
      index: true
    },
    acknowledgedBy: {
      type: String,
      default: null
    },
    acknowledgedAt: {
      type: Date,
      default: null
    },
    source: {
      type: String,
      enum: ['live', 'simulated'],
      default: 'live',
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Prevent exact duplicate anomaly on same span/trigger
anomalySchema.index({ traceId: 1, type: 1, spanId: 1 }, { unique: false });

module.exports = mongoose.model('Anomaly', anomalySchema);
