const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const crypto = require('crypto');

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const AuditLog = require('../models/AuditLog');
const Integration = require('../models/Integration');
const canonicalJson = require('../utils/canonicalJson');
const {
  GENESIS_HASH,
  computeRecordHash,
  appendAuditLog,
  verifyAuditChain,
  simulateDemoTamper,
  restoreDemoChain
} = require('../services/auditService');

const runVerification = async () => {
  try {
    await connectDB();
    console.log('=== PHASE 4 COMPREHENSIVE VERIFICATION SCRIPT ===\n');

    // 1. Verify Canonical JSON Determinism
    console.log('[Check 1] Verifying Canonical JSON Deterministic Hashing:');
    const obj1 = { z: 100, a: 'apple', nested: { beta: true, alpha: 42 } };
    const obj2 = { nested: { alpha: 42, beta: true }, a: 'apple', z: 100 };
    const json1 = canonicalJson(obj1);
    const json2 = canonicalJson(obj2);
    const hash1 = crypto.createHash('sha256').update(json1).digest('hex');
    const hash2 = crypto.createHash('sha256').update(json2).digest('hex');

    if (json1 === json2 && hash1 === hash2) {
      console.log('  PASS: Key-order invariance verified. Canonical digests match exactly.');
      console.log(`        Digest: ${hash1}`);
    } else {
      throw new Error('FAIL: Canonical JSON serialization failed to produce identical hashes.');
    }

    // 2. Verify Hash Chain Continuity on Current DB
    console.log('\n[Check 2] Verifying Cryptographic Audit Chain in MongoDB:');
    const records = await AuditLog.find().sort({ sequenceNumber: 1 });
    console.log(`  Total records currently in ledger: ${records.length}`);

    if (records.length === 0) {
      throw new Error('FAIL: No audit records found in database. Run resetDemo.js first.');
    }

    let chainValid = true;
    let expectedPrev = GENESIS_HASH;
    for (const r of records) {
      if (r.previousHash !== expectedPrev) {
        console.error(`  FAIL: Record #${r.sequenceNumber} broken previousHash linkage.`);
        chainValid = false;
        break;
      }
      expectedPrev = r.currentHash;
    }

    if (chainValid) {
      console.log('  PASS: Every record correctly references predecessor hash from genesis (000000...).');
    }

    // 3. Verify Entire Audit Ledger via verifyAuditChain()
    console.log('\n[Check 3] Running Full verifyAuditChain() on Database:');
    const initialVerify = await verifyAuditChain();
    console.log(`  Verification Result: valid=${initialVerify.valid}`);
    console.log(`  Total Valid Records: ${initialVerify.totalRecords}`);
    console.log(`  Tip Hash: ${initialVerify.latestHash}`);
    if (!initialVerify.valid) {
      throw new Error(`FAIL: Initial audit ledger failed verification: ${initialVerify.reason}`);
    }
    console.log('  PASS: Initial audit ledger 100% verified.');

    // 4. Verify Event Type Coverage
    console.log('\n[Check 4] Checking Event Type Coverage in Ledger:');
    const distinctEvents = await AuditLog.distinct('eventType');
    console.log('  Distinct event types present:', distinctEvents);
    const requiredEvents = [
      'AGENT_REGISTERED',
      'POLICY_UPDATED',
      'ANOMALY_ACKNOWLEDGED',
      'APPROVAL_DECISION',
      'ACTION_EXECUTED',
      'INTEGRATION_CONFIGURED'
    ];
    const missingEvents = requiredEvents.filter((ev) => !distinctEvents.includes(ev));
    if (missingEvents.length > 0) {
      console.warn('  WARN: Missing expected event types:', missingEvents);
    } else {
      console.log('  PASS: All required domain audit events covered (Agent, Policy, Anomaly, Approval, Action, Integration).');
    }

    // 5. Verify Tamper Detection on Demo Record
    console.log('\n[Check 5] Testing Controlled Demo Tamper Detection:');
    const firstSimulated = await AuditLog.findOne({ source: 'simulated' }).sort({ sequenceNumber: 1 });
    if (!firstSimulated) {
      throw new Error('FAIL: No simulated audit records found.');
    }
    const targetSeq = firstSimulated.sequenceNumber;
    console.log(`  Targeting simulated demo record #${targetSeq} (${firstSimulated.eventType})...`);
    const tamperResult = await simulateDemoTamper(targetSeq);
    console.log(`  Tamper simulated on sequence #${tamperResult.tamperedSequenceNumber}`);
    const tamperedVerify = await verifyAuditChain();
    console.log(`  Verification during tampering: valid=${tamperedVerify.valid}`);
    console.log(`  Broken Sequence Detected: #${tamperedVerify.brokenSequenceNumber}`);
    console.log(`  Reason: ${tamperedVerify.reason}`);

    if (!tamperedVerify.valid && tamperedVerify.brokenSequenceNumber === targetSeq) {
      console.log(`  PASS: Tampering instantly detected and isolated to sequence #${targetSeq}.`);
    } else {
      throw new Error(`FAIL: Tamper was not detected at sequence #${targetSeq} as expected.`);
    }

    // 6. Verify Demo Chain Restoration
    console.log('\n[Check 6] Restoring Cryptographic Chain & Verifying:');
    const restoreResult = await restoreDemoChain();
    console.log(`  Restoration outcome: ${restoreResult.message} (${restoreResult.totalRestored} records restored)`);
    const restoredVerify = await verifyAuditChain();
    console.log(`  Verification after restoration: valid=${restoredVerify.valid}`);
    if (restoredVerify.valid) {
      console.log('  PASS: Cryptographic chain fully restored and verified valid.');
    } else {
      throw new Error(`FAIL: Restored chain failed verification: ${restoredVerify.reason}`);
    }

    // 7. Verify Integrations Metadata & Separation
    console.log('\n[Check 7] Verifying Integrations Classification & Honest Labelling:');
    const integrations = await Integration.find().sort({ integrationId: 1 });
    console.log(`  Found ${integrations.length} integrations in database:`);
    for (const item of integrations) {
      console.log(`  - [${item.status}] ${item.name} (${item.type}) | Data Source: ${item.dataSourceType} | Source: ${item.source}`);
    }

    const otel = integrations.find((i) => i.integrationId === 'otel');
    const langgraph = integrations.find((i) => i.integrationId === 'langgraph');
    const crewai = integrations.find((i) => i.integrationId === 'crewai');
    const mcp = integrations.find((i) => i.integrationId === 'mcp');

    if (otel && otel.status === 'Connected' && otel.source === 'live') {
      console.log('  PASS: OpenTelemetry correctly labelled as Connected live HTTP ingestion.');
    } else {
      throw new Error('FAIL: OpenTelemetry not correctly labelled as Connected / live.');
    }

    if (langgraph && langgraph.status === 'Simulated Demo' && langgraph.source === 'simulated') {
      console.log('  PASS: LangGraph correctly labelled as Simulated Demo adapter.');
    } else {
      throw new Error('FAIL: LangGraph not correctly labelled as Simulated Demo.');
    }

    if (crewai && crewai.status === 'Planned' && mcp && mcp.status === 'Planned') {
      console.log('  PASS: CrewAI & MCP correctly marked as Planned and NOT falsely connected.');
    } else {
      throw new Error('FAIL: Planned protocols incorrectly marked.');
    }

    console.log('\n=== ALL PHASE 4 CHECKS PASSED SUCCESSFULLY ===\n');
    process.exit(0);
  } catch (err) {
    console.error('\n[VERIFICATION ERROR]:', err);
    process.exit(1);
  }
};

runVerification();
