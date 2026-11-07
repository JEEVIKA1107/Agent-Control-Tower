const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const {
  runScenarioA,
  runScenarioB,
  runScenarioC,
  runScenarioD,
  runScenarioE
} = require('../services/demoScenarioService');
const resetDemo = require('../seed/resetDemo');
const Telemetry = require('../models/Telemetry');
const Execution = require('../models/Execution');
const Agent = require('../models/Agent');
const Anomaly = require('../models/Anomaly');
const ApprovalRequest = require('../models/ApprovalRequest');
const ActionExecution = require('../models/ActionExecution');
const AuditLog = require('../models/AuditLog');
const { verifyAuditChain } = require('../services/auditService');

const verifyAllWorkflows = async () => {
  try {
    await connectDB();
    console.log('=== END-TO-END DEMO WORKFLOW & DATA INTEGRITY VERIFICATION ===\n');

    // 0. Create a Genuine Live Record to prove it survives demo resets
    console.log('[Setup] Seeding a genuine LIVE production telemetry record...');
    const liveTraceId = `trace-live-verify-${Date.now()}`;
    await Telemetry.create({
      traceId: liveTraceId,
      spanId: `span-live-verify-${Date.now()}`,
      parentSpanId: null,
      agentId: 'agent-production-live',
      eventType: 'llm_call',
      callSignature: 'agent-production-live:live_query',
      duration: 350,
      tokenUsage: { promptTokens: 150, completionTokens: 50, totalTokens: 200 },
      status: 'success',
      timestamp: new Date(),
      source: 'live'
    });
    console.log(`  Live record created with traceId: ${liveTraceId} (source: "live")`);

    // 1. Verify Scenario A: Normal Agent Execution
    console.log('\n[Workflow 1] Testing Scenario A: Normal Agent Execution:');
    const resA = await runScenarioA();
    console.log(`  Trace ID: ${resA.traceId}`);
    console.log(`  Spans Ingested: ${resA.spansIngested}`);
    console.log(`  Total Tokens: ${resA.totalTokens} | Estimated Cost: $${resA.estimatedCost}`);
    const execA = await Execution.findOne({ traceId: resA.traceId });
    if (execA && execA.status === 'success') {
      console.log('  PASS: Scenario A execution record verified in MongoDB with status "success".');
    } else {
      throw new Error('FAIL: Scenario A execution record not found or status invalid.');
    }

    // 2. Verify Scenario B: Repeated Execution Anomaly
    console.log('\n[Workflow 2] Testing Scenario B: Repeated Execution Anomaly:');
    const resB = await runScenarioB();
    console.log(`  Trace ID: ${resB.traceId}`);
    console.log(`  Anomaly Type: ${resB.anomaly?.type} | Severity: ${resB.anomaly?.severity}`);
    console.log(`  Governance Action: ${resB.recommendation?.actionType}`);
    console.log(`  Approval Request Status: ${resB.approvalRequest?.status}`);
    if (resB.anomaly && resB.recommendation && resB.approvalRequest) {
      console.log('  PASS: Scenario B detected recursive loop and generated circuit_breaker approval.');
    } else {
      throw new Error('FAIL: Scenario B failed to detect anomaly or create recommendation.');
    }

    // 3. Verify Scenario C: Token Surge Violation
    console.log('\n[Workflow 3] Testing Scenario C: Token Surge Violation:');
    const resC = await runScenarioC();
    console.log(`  Trace ID: ${resC.traceId}`);
    console.log(`  Tokens Consumed: ${resC.tokensUsed} (Policy budget: ${resC.policyBudget})`);
    console.log(`  Anomaly Type: ${resC.anomaly?.type} | Severity: ${resC.anomaly?.severity}`);
    console.log(`  Governance Action: ${resC.recommendation?.actionType}`);
    if (resC.anomaly && resC.recommendation?.actionType === 'token_throttle') {
      console.log('  PASS: Scenario C detected surge and created token_throttle recommendation.');
    } else {
      throw new Error('FAIL: Scenario C failed to create token_throttle recommendation.');
    }

    // 4. Verify Scenario D: Human Approval Decision (HITL)
    console.log('\n[Workflow 4] Testing Scenario D: Human Approval Workflow:');
    const resD = await runScenarioD({ email: 'operator@controltower.io', name: 'Lead Operator' });
    console.log(`  Approved Request #${resD.approvedWorkflow.requestId} -> ActionExecution status: "${resD.approvedWorkflow.actionExecutionStatus}"`);
    console.log(`  Rejected Request #${resD.rejectedWorkflow.requestId} -> ActionExecution status: "${resD.rejectedWorkflow.actionExecutionStatus}"`);
    if (
      resD.approvedWorkflow.actionExecutionStatus === 'simulated' &&
      resD.rejectedWorkflow.actionExecutionStatus === 'not_executed'
    ) {
      console.log('  PASS: Scenario D strictly maintained decoupled simulated vs not_executed statuses.');
    } else {
      throw new Error('FAIL: Scenario D action statuses were not correctly recorded.');
    }

    // 5. Verify Scenario E: Cryptographic Audit Trail & Tamper Verification
    console.log('\n[Workflow 5] Testing Scenario E: Cryptographic Audit Tamper Verification:');
    const resE = await runScenarioE();
    console.log(`  Before verification: valid=${resE.beforeVerification.valid}`);
    console.log(`  During tampering: valid=${resE.tamperDetectedVerification.valid} (Broken sequence #${resE.tamperDetectedVerification.brokenSequenceNumber})`);
    console.log(`  Restoration outcome: ${resE.restoration.message}`);
    console.log(`  Final verification: valid=${resE.finalVerification.valid}`);
    if (
      resE.beforeVerification.valid &&
      !resE.tamperDetectedVerification.valid &&
      resE.finalVerification.valid
    ) {
      console.log('  PASS: Scenario E proved tamper-evident detection and clean restoration.');
    } else {
      throw new Error('FAIL: Scenario E cryptographic chain verification failed.');
    }

    // 6. Verify Safe Demo Reset & Live Data Preservation
    console.log('\n[Workflow 6] Testing Safe Demo Reset (Preserving Live Telemetry):');
    await resetDemo();
    const liveRecordAfterReset = await Telemetry.findOne({ traceId: liveTraceId });
    if (liveRecordAfterReset && liveRecordAfterReset.source === 'live') {
      console.log(`  PASS: Genuine live telemetry (${liveTraceId}) survived reset intact.`);
    } else {
      throw new Error('FAIL: Live telemetry record was unintentionally deleted during demo reset!');
    }

    // Clean up temporary live test record
    await Telemetry.deleteOne({ traceId: liveTraceId });

    console.log('\n=== ALL 5 DEMO WORKFLOWS & DATA INTEGRITY CHECKS VERIFIED ===\n');
    process.exit(0);
  } catch (err) {
    console.error('\n[VERIFICATION ERROR]:', err);
    process.exit(1);
  }
};

verifyAllWorkflows();
