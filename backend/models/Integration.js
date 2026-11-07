const mongoose = require('mongoose');

const integrationSchema = new mongoose.Schema(
  {
    integrationId: {
      type: String,
      required: [true, 'integrationId is required'],
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Integration name is required'],
      trim: true
    },
    type: {
      type: String,
      required: [true, 'Type is required'],
      enum: [
        'Telemetry Protocol',
        'Multi-Agent Framework',
        'Tool Protocol',
        'Inter-Agent Protocol'
      ],
      index: true
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: ['Connected', 'Simulated Demo', 'Planned', 'Disconnected'],
      index: true
    },
    dataSourceType: {
      type: String,
      default: ''
    },
    lastReceivedEvent: {
      type: Date,
      default: null
    },
    configurationStatus: {
      type: String,
      default: 'Configured'
    },
    description: {
      type: String,
      default: ''
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

module.exports = mongoose.model('Integration', integrationSchema);
