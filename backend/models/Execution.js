const mongoose = require('mongoose');

const executionSchema = new mongoose.Schema(
  {
    executionId: {
      type: String,
      required: [true, 'executionId is required'],
      unique: true,
      index: true
    },
    traceId: {
      type: String,
      required: [true, 'traceId is required'],
      index: true
    },
    agentId: {
      type: String,
      required: [true, 'agentId is required'],
      index: true
    },
    parentExecutionId: {
      type: String,
      default: null,
      index: true
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'running', 'timed_out'],
      default: 'running',
      index: true
    },
    startTime: {
      type: Date,
      default: Date.now,
      index: true
    },
    endTime: {
      type: Date,
      default: null
    },
    duration: {
      type: Number,
      default: 0
    },
    tokens: {
      prompt: { type: Number, default: 0 },
      completion: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    cost: {
      type: Number,
      default: 0
    },
    rootSpanId: {
      type: String,
      default: null
    },
    errorMessage: {
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

executionSchema.index({ agentId: 1, startTime: -1 });

module.exports = mongoose.model('Execution', executionSchema);
