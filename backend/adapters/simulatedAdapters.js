const crypto = require('crypto');

/**
 * Creates state-delta evidence without repeating full heavy payloads
 */
const createStateDeltaEvidence = (prevObj, currentObj, executionId) => {
  const prevRef = prevObj ? 'state_snap_' + crypto.createHash('md5').update(JSON.stringify(prevObj)).digest('hex').slice(0, 8) : null;
  const currRef = 'state_snap_' + crypto.createHash('md5').update(JSON.stringify(currentObj)).digest('hex').slice(0, 8);

  const changedFields = [];
  if (prevObj && currentObj) {
    for (const key of Object.keys(currentObj)) {
      if (JSON.stringify(prevObj[key]) !== JSON.stringify(currentObj[key])) {
        changedFields.push(key);
      }
    }
  } else if (currentObj) {
    changedFields.push(...Object.keys(currentObj));
  }

  return {
    previousStateRef: prevRef,
    currentStateRef: currRef,
    changedFields,
    timestamp: new Date(),
    executionId
  };
};

/**
 * Adapter for simulated LangGraph node execution events
 * Strictly labels source: "simulated"
 */
const fromLangGraphEvent = (rawEvent) => {
  const traceId = rawEvent.traceId || rawEvent.run_id || `trace-lg-${Date.now()}`;
  const spanId = rawEvent.spanId || rawEvent.step_id || `span-lg-${Math.random().toString(36).substring(2, 9)}`;
  const parentSpanId = rawEvent.parentSpanId || null;
  const agentId = rawEvent.node_name || rawEvent.agentId || 'langgraph-coordinator';

  const promptTokens = rawEvent.token_usage?.prompt_tokens || Math.floor(Math.random() * 800) + 200;
  const completionTokens = rawEvent.token_usage?.completion_tokens || Math.floor(Math.random() * 400) + 100;
  const totalTokens = promptTokens + completionTokens;

  return {
    traceId,
    spanId,
    parentSpanId,
    agentId,
    eventType: rawEvent.event_type || 'state_change',
    timestamp: rawEvent.timestamp ? new Date(rawEvent.timestamp) : new Date(),
    status: rawEvent.status || 'success',
    duration: rawEvent.duration || Math.floor(Math.random() * 1200) + 300,
    tokenUsage: {
      promptTokens,
      completionTokens,
      totalTokens
    },
    errorInfo: rawEvent.error ? {
      code: 'LANGGRAPH_EXECUTION_ERROR',
      message: rawEvent.error.message || String(rawEvent.error),
      stack: rawEvent.error.stack || null
    } : { code: null, message: null, stack: null },
    inputMetadata: { node: rawEvent.node_name, state_keys: rawEvent.state_keys || [] },
    outputMetadata: { next_node: rawEvent.next_node || '__end__' },
    stateDelta: createStateDeltaEvidence(rawEvent.prevState, rawEvent.nextState || { status: 'processed' }, traceId),
    source: 'simulated' // Guaranteed simulated flag
  };
};

/**
 * Adapter for simulated AutoGen multi-agent conversational turns
 * Strictly labels source: "simulated"
 */
const fromAutoGenEvent = (rawEvent) => {
  const traceId = rawEvent.conversation_id || rawEvent.traceId || `trace-ag-${Date.now()}`;
  const spanId = rawEvent.message_id || rawEvent.spanId || `span-ag-${Math.random().toString(36).substring(2, 9)}`;
  const parentSpanId = rawEvent.reply_to || rawEvent.parentSpanId || null;
  const agentId = rawEvent.sender || rawEvent.agentId || 'autogen-assistant';

  const promptTokens = rawEvent.usage?.prompt_tokens || Math.floor(Math.random() * 600) + 150;
  const completionTokens = rawEvent.usage?.completion_tokens || Math.floor(Math.random() * 350) + 80;
  const totalTokens = promptTokens + completionTokens;

  return {
    traceId,
    spanId,
    parentSpanId,
    agentId,
    eventType: 'llm_call',
    timestamp: rawEvent.timestamp ? new Date(rawEvent.timestamp) : new Date(),
    status: rawEvent.status || 'success',
    duration: rawEvent.duration || Math.floor(Math.random() * 1500) + 400,
    tokenUsage: {
      promptTokens,
      completionTokens,
      totalTokens
    },
    errorInfo: rawEvent.error ? {
      code: 'AUTOGEN_TURN_FAILED',
      message: rawEvent.error.message || String(rawEvent.error),
      stack: null
    } : { code: null, message: null, stack: null },
    inputMetadata: { sender: rawEvent.sender, recipient: rawEvent.recipient },
    outputMetadata: { response_preview: rawEvent.content ? rawEvent.content.slice(0, 100) : '' },
    stateDelta: createStateDeltaEvidence(null, { turn: rawEvent.turn_number, sender: rawEvent.sender }, traceId),
    source: 'simulated' // Guaranteed simulated flag
  };
};

module.exports = {
  createStateDeltaEvidence,
  fromLangGraphEvent,
  fromAutoGenEvent
};
