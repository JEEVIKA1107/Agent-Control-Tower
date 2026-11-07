const mongoose = require('mongoose');

const governanceRecommendationSchema = new mongoose.Schema(
  {
    recommendationId: {
      type: String,
      required: [true, 'recommendationId is required'],
      unique: true,
      index: true
    },
    anomalyId: {
      type: String,
      required: [true, 'anomalyId is required'],
      index: true
    },
    agentId: {
      type: String,
      required: [true, 'agentId is required'],
      index: true
    },
    traceId: {
      type: String,
      default: null,
      index: true
    },
    actionType: {
      type: String,
      required: [true, 'actionType is required'],
      enum: ['token_throttle', 'circuit_breaker', 'model_reroute', 'human_inspection'],
      index: true
    },
    reason: {
      type: String,
      required: [true, 'Reason is required']
    },
    parameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    status: {
      type: String,
      enum: ['active', 'approved', 'rejected', 'superseded'],
      default: 'active',
      index: true
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

module.exports = mongoose.model('GovernanceRecommendation', governanceRecommendationSchema);
