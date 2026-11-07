/**
 * OpenTelemetry Adapter
 * Normalizes OpenTelemetry-compliant JSON span records into the common Agent Control Tower schema.
 */
const normalizeOTelSpan = (otelSpan) => {
  if (!otelSpan) {
    throw new Error('OTel span payload is required');
  }

  const attributes = otelSpan.attributes || {};

  // Extract identifiers
  const traceId = otelSpan.trace_id || otelSpan.traceId || attributes['ai.trace.id'] || attributes['trace.id'];
  const spanId = otelSpan.span_id || otelSpan.spanId || attributes['ai.span.id'] || attributes['span.id'];
  const parentSpanId = otelSpan.parent_span_id || otelSpan.parentSpanId || attributes['ai.parent_span.id'] || null;
  const agentId = attributes['agent.id'] || attributes['gen_ai.agent.id'] || otelSpan.agentId || 'unknown-agent';

  // Duration in milliseconds (convert nanoseconds if provided)
  let duration = 0;
  if (otelSpan.start_time_unix_nano && otelSpan.end_time_unix_nano) {
    const diffNano = BigInt(otelSpan.end_time_unix_nano) - BigInt(otelSpan.start_time_unix_nano);
    duration = Number(diffNano / 1000000n);
  } else if (otelSpan.duration) {
    duration = Number(otelSpan.duration);
  }

  // Token usage extraction from GenAI semantic conventions
  const promptTokens = Number(attributes['gen_ai.usage.prompt_tokens'] || attributes['llm.usage.prompt_tokens'] || 0);
  const completionTokens = Number(attributes['gen_ai.usage.completion_tokens'] || attributes['llm.usage.completion_tokens'] || 0);
  const totalTokens = Number(attributes['gen_ai.usage.total_tokens'] || attributes['llm.usage.total_tokens'] || (promptTokens + completionTokens));

  // Determine event type
  let eventType = 'llm_call';
  const name = (otelSpan.name || attributes['operation.name'] || '').toLowerCase();
  if (name.includes('tool') || attributes['gen_ai.tool.name']) {
    eventType = 'tool_execution';
  } else if (name.includes('handoff')) {
    eventType = 'agent_handoff';
  } else if (name.includes('state')) {
    eventType = 'state_change';
  } else if (name.includes('heartbeat')) {
    eventType = 'heartbeat';
  }

  // Status mapping
  let status = 'success';
  const statusCode = otelSpan.status?.code;
  const statusStr = typeof otelSpan.status === 'string' ? otelSpan.status : (otelSpan.status?.name || '');
  if (statusCode === 2 || statusStr.toUpperCase() === 'ERROR') {
    status = 'error';
  }

  return {
    traceId: String(traceId),
    spanId: String(spanId),
    parentSpanId: parentSpanId ? String(parentSpanId) : null,
    agentId: String(agentId),
    eventType,
    timestamp: otelSpan.timestamp ? new Date(otelSpan.timestamp) : new Date(),
    status,
    duration,
    tokenUsage: {
      promptTokens,
      completionTokens,
      totalTokens
    },
    errorInfo: status === 'error' ? {
      code: attributes['error.type'] || 'OTEL_ERROR',
      message: otelSpan.status?.message || attributes['error.message'] || 'Span error',
      stack: attributes['error.stack'] || null
    } : { code: null, message: null, stack: null },
    inputMetadata: attributes['gen_ai.prompt'] ? { prompt: attributes['gen_ai.prompt'] } : (otelSpan.input || {}),
    outputMetadata: attributes['gen_ai.completion'] ? { completion: attributes['gen_ai.completion'] } : (otelSpan.output || {}),
    stateDelta: otelSpan.stateDelta || {
      previousStateRef: null,
      currentStateRef: null,
      changedFields: [],
      timestamp: new Date(),
      executionId: traceId
    },
    source: otelSpan.source || 'live'
  };
};

module.exports = {
  normalizeOTelSpan
};
