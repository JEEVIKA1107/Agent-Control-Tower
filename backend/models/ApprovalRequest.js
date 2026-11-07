const mongoose = require('mongoose');

const approvalRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: [true, 'requestId is required'],
      unique: true,
      index: true
    },
    recommendationId: {
      type: String,
      required: [true, 'recommendationId is required'],
      index: true
    },
    agentId: {
      type: String,
      required: [true, 'agentId is required'],
      index: true
    },
    anomalyId: {
      type: String,
      default: null,
      index: true
    },
    actionType: {
      type: String,
      required: [true, 'actionType is required'],
      enum: ['token_throttle', 'circuit_breaker', 'model_reroute', 'human_inspection']
    },
    reason: {
      type: String,
      required: [true, 'reason is required']
    },
    severity: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
      index: true
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
      index: true
    },
    requestedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    decidedBy: {
      type: String,
      default: null
    },
    decidedAt: {
      type: Date,
      default: null
    },
    reviewerComment: {
      type: String,
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

module.exports = mongoose.model('ApprovalRequest', approvalRequestSchema);
