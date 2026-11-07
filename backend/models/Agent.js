const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema(
  {
    agentId: {
      type: String,
      required: [true, 'Unique agentId is required'],
      unique: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Agent name is required'],
      trim: true,
      maxlength: [120, 'Name cannot exceed 120 characters']
    },
    type: {
      type: String,
      required: [true, 'Agent type is required'],
      enum: [
        'Monitoring',
        'Token Management',
        'Failure Detection',
        'Governance',
        'Model Routing',
        'Orchestration'
      ],
      index: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    framework: {
      type: String,
      default: 'Custom',
      enum: ['LangGraph', 'AutoGen', 'CrewAI', 'Custom', 'OpenAI Swarm', 'Semantic Kernel'],
      trim: true
    },
    status: {
      type: String,
      enum: ['Active', 'Idle', 'Failed', 'Disabled'],
      default: 'Active',
      index: true
    },
    executionCount: {
      type: Number,
      default: 0,
      min: 0
    },
    totalTokens: {
      type: Number,
      default: 0,
      min: 0
    },
    lastActive: {
      type: Date,
      default: Date.now
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

agentSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Agent', agentSchema);
