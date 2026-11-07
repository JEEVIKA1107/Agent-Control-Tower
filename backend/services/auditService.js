const crypto = require('crypto');
const AuditLog = require('../models/AuditLog');
const canonicalJson = require('../utils/canonicalJson');

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Computes canonical SHA-256 hash for an audit record
 */
const computeRecordHash = (sequenceNumber, recordContent, previousHash) => {
  const serialized = canonicalJson(recordContent);
  const hashPayload = `${sequenceNumber}:${serialized}:${previousHash}`;
  return crypto.createHash('sha256').update(hashPayload).digest('hex');
};

/**
 * Appends a new tamper-evident audit record to the sequential hash chain.
 * Enforces strictly sequential ordering and cryptographic chaining.
 */
const appendAuditLog = async ({
  userId = 'system',
  actorName = 'System Operator',
  eventType,
  relatedAgent = null,
  relatedExecution = null,
  actionDetails,
  source = 'live'
}) => {
  // Find latest record to retrieve sequenceNumber and predecessor hash
  const latestRecord = await AuditLog.findOne().sort({ sequenceNumber: -1 });

  const sequenceNumber = latestRecord ? latestRecord.sequenceNumber + 1 : 1;
  const previousHash = latestRecord ? latestRecord.currentHash : GENESIS_HASH;
  const eventId = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = new Date();

  const recordContent = {
    eventId,
    userId,
    actorName,
    eventType,
    relatedAgent,
    relatedExecution,
    timestamp: timestamp.toISOString(),
    actionDetails
  };

  const currentHash = computeRecordHash(sequenceNumber, recordContent, previousHash);

  const auditLog = await AuditLog.create({
    sequenceNumber,
    eventId,
    userId,
    actorName,
    eventType,
    relatedAgent,
    relatedExecution,
    timestamp,
    actionDetails,
    previousHash,
    currentHash,
    source
  });

  return auditLog;
};

/**
 * Recomputes the entire audit ledger from sequence 1 through N.
 * Identifies the exact sequence number where the chain breaks if tampering occurred.
 */
const verifyAuditChain = async () => {
  const records = await AuditLog.find().sort({ sequenceNumber: 1 });

  if (records.length === 0) {
    return {
      valid: true,
      totalRecords: 0,
      message: 'Audit chain is empty. Genesis record pending.'
    };
  }

  let expectedPreviousHash = GENESIS_HASH;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const expectedSequence = i + 1;

    // Check sequence continuity (detect missing, duplicate or out-of-order records)
    if (record.sequenceNumber !== expectedSequence) {
      return {
        valid: false,
        brokenSequenceNumber: record.sequenceNumber,
        expectedSequence,
        eventId: record.eventId,
        reason: `Out-of-order or missing sequence. Expected #${expectedSequence}, found #${record.sequenceNumber}.`,
        verifiedCount: i
      };
    }

    // Check previousHash linkage
    if (record.previousHash !== expectedPreviousHash) {
      return {
        valid: false,
        brokenSequenceNumber: record.sequenceNumber,
        eventId: record.eventId,
        reason: 'Broken cryptographic linkage: previousHash does not match predecessor hash.',
        expectedHash: expectedPreviousHash,
        actualHash: record.previousHash,
        verifiedCount: i
      };
    }

    // Recompute record content hash
    const recordContent = {
      eventId: record.eventId,
      userId: record.userId,
      actorName: record.actorName,
      eventType: record.eventType,
      relatedAgent: record.relatedAgent,
      relatedExecution: record.relatedExecution,
      timestamp: new Date(record.timestamp).toISOString(),
      actionDetails: record.actionDetails
    };

    const recalculatedHash = computeRecordHash(
      record.sequenceNumber,
      recordContent,
      record.previousHash
    );

    if (recalculatedHash !== record.currentHash) {
      return {
        valid: false,
        brokenSequenceNumber: record.sequenceNumber,
        eventId: record.eventId,
        reason: 'Data integrity violation: Record content was modified after hash creation (tamper detected).',
        expectedHash: recalculatedHash,
        actualHash: record.currentHash,
        verifiedCount: i,
        tamperedFieldPreview: record.actionDetails
      };
    }

    expectedPreviousHash = record.currentHash;
  }

  return {
    valid: true,
    totalRecords: records.length,
    latestHash: expectedPreviousHash,
    message: `Audit chain integrity verified across all ${records.length} sequential records.`
  };
};

/**
 * DEMO ONLY: Modifies a seeded simulated record without recomputing currentHash
 * to demonstrate detection of unauthorized historical changes.
 * Restricted strictly to demo records.
 */
const simulateDemoTamper = async (targetSequence = null) => {
  const query = { source: 'simulated' };
  if (targetSequence) query.sequenceNumber = targetSequence;

  // Pick a simulated record to alter
  const recordToTamper = await AuditLog.findOne(query).sort({ sequenceNumber: 1 });
  if (!recordToTamper) {
    throw new Error('No simulated demo audit record available to tamper.');
  }

  // Backup original text in metadata
  const originalDetails = JSON.parse(JSON.stringify(recordToTamper.actionDetails));
  recordToTamper.actionDetails = {
    _originalDetails: originalDetails,
    _tamperedComment: 'UNAUTHORIZED_MODIFICATION: Attacker injected forged authorization payload',
    status: 'FORGED_BYPASS_APPROVAL'
  };
  recordToTamper.isTamperedDemo = true;
  recordToTamper.markModified('actionDetails');

  // Save WITHOUT re-hashing currentHash
  await recordToTamper.save();

  return {
    message: `Demonstration: Simulated audit record #${recordToTamper.sequenceNumber} has been altered without updating hash.`,
    tamperedSequenceNumber: recordToTamper.sequenceNumber,
    tamperedRecordId: recordToTamper.eventId
  };
};

/**
 * DEMO ONLY: Restores the valid cryptographic chain by recalculating hashes
 */
const restoreDemoChain = async () => {
  const records = await AuditLog.find().sort({ sequenceNumber: 1 });
  if (records.length === 0) return { message: 'No records to restore' };

  let prevHash = GENESIS_HASH;
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    r.sequenceNumber = i + 1;
    r.previousHash = prevHash;

    // Clean tamper tags and restore original payload
    if (r.isTamperedDemo) {
      if (r.actionDetails && r.actionDetails._originalDetails) {
        r.actionDetails = r.actionDetails._originalDetails;
      } else if (r.actionDetails) {
        delete r.actionDetails._tamperedComment;
        delete r.actionDetails.status;
      }
      r.isTamperedDemo = false;
      r.markModified('actionDetails');
    }

    const content = {
      eventId: r.eventId,
      userId: r.userId,
      actorName: r.actorName,
      eventType: r.eventType,
      relatedAgent: r.relatedAgent,
      relatedExecution: r.relatedExecution,
      timestamp: new Date(r.timestamp).toISOString(),
      actionDetails: r.actionDetails
    };

    r.currentHash = computeRecordHash(r.sequenceNumber, content, prevHash);
    await r.save();
    prevHash = r.currentHash;
  }

  return {
    message: 'Audit chain successfully restored and re-hashed.',
    totalRestored: records.length
  };
};

module.exports = {
  GENESIS_HASH,
  computeRecordHash,
  appendAuditLog,
  verifyAuditChain,
  simulateDemoTamper,
  restoreDemoChain
};
