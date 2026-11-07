const mongoose = require('mongoose');

const governancePolicySchema = new mongoose.Schema(
  {
    policyId: {
      type: String,
      required: [true, 'policyId is required'],
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Policy name is required'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    maxTokenBudget: {
      type: Number,
      default: 50000,
      min: 100
    },
    maxExecutionDurationMs: {
      type: Number,
      default: 30000,
      min: 500
    },
    maxRepeatedCalls: {
      type: Number,
      default: 3,
      min: 2
    },
    promptDriftThreshold: {
      type: Number,
      default: 0.65,
      min: 0,
      max: 1
    },
    heartbeatTimeoutMs: {
      type: Number,
      default: 60000,
      min: 1000
    },
    costPer1kTokens: {
      type: Number,
      default: 0.002,
      min: 0.0001
    },
    requireHumanApproval: {
      type: Boolean,
      default: true
    },
    alertSeverity: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'High'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    source: {
      type: String,
      enum: ['live', 'simulated'],
      default: 'live'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('GovernancePolicy', governancePolicySchema);
