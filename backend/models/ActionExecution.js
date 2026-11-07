const mongoose = require('mongoose');

const actionExecutionSchema = new mongoose.Schema(
  {
    actionExecutionId: {
      type: String,
      required: [true, 'actionExecutionId is required'],
      unique: true,
      index: true
    },
    approvalRequestId: {
      type: String,
      required: [true, 'approvalRequestId is required'],
      index: true
    },
    agentId: {
      type: String,
      required: [true, 'agentId is required'],
      index: true
    },
    actionType: {
      type: String,
      required: [true, 'actionType is required'],
      enum: ['token_throttle', 'circuit_breaker', 'model_reroute', 'human_inspection']
    },
    status: {
      type: String,
      enum: ['not_executed', 'simulated', 'executed'],
      default: 'simulated', // Strictly simulated unless genuine physical external connector verified
      index: true
    },
    outputSummary: {
      type: String,
      default: ''
    },
    executedAt: {
      type: Date,
      default: Date.now
    },
    source: {
      type: String,
      enum: ['live', 'simulated'],
      default: 'simulated',
      index: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('ActionExecution', actionExecutionSchema);
