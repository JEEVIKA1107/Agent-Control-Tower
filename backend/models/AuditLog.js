const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    sequenceNumber: {
      type: Number,
      required: [true, 'Sequence number is required'],
      unique: true,
      index: true
    },
    eventId: {
      type: String,
      required: [true, 'Event ID is required'],
      unique: true,
      index: true
    },
    userId: {
      type: String,
      default: 'system',
      index: true
    },
    actorName: {
      type: String,
      default: 'System Daemon'
    },
    eventType: {
      type: String,
      required: [true, 'Event type is required'],
      enum: [
        'AGENT_REGISTERED',
        'AGENT_UPDATED',
        'AGENT_STATUS_TOGGLED',
        'AGENT_DELETED',
        'POLICY_UPDATED',
        'ANOMALY_ACKNOWLEDGED',
        'APPROVAL_DECISION',
        'ACTION_EXECUTED',
        'INTEGRATION_CONFIGURED',
        'DEMO_SEED'
      ],
      index: true
    },
    relatedAgent: {
      type: String,
      default: null,
      index: true
    },
    relatedExecution: {
      type: String,
      default: null
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    actionDetails: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Action details payload is required']
    },
    previousHash: {
      type: String,
      required: [true, 'Previous record hash is required']
    },
    currentHash: {
      type: String,
      required: [true, 'Current record SHA-256 hash is required'],
      index: true
    },
    source: {
      type: String,
      enum: ['live', 'simulated'],
      default: 'live',
      index: true
    },
    isTamperedDemo: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

auditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
