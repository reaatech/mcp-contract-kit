/**
 * Simple tracing support
 * Provides span creation and context propagation for test execution tracing
 */

export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

export interface Span {
  name: string;
  context: SpanContext;
  startTime: string;
  endTime?: string;
  attributes: Record<string, string | number | boolean>;
  status: 'ok' | 'error' | 'unset';
  errorMessage?: string;
}

/** Generate a random hex string for trace/span IDs */
function generateId(length: number = 16): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length / 2));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** In-memory span storage */
const spans: Span[] = [];

/** Current active span context (thread-local simulation) */
let activeContext: SpanContext | null = null;

/**
 * Create a new span
 */
export function startSpan(
  name: string,
  attributes: Record<string, string | number | boolean> = {},
): Span {
  const traceId = activeContext?.traceId ?? generateId(32);
  const parentSpanId = activeContext?.spanId;
  const spanId = generateId(16);

  const span: Span = {
    name,
    context: { traceId, spanId, parentSpanId },
    startTime: new Date().toISOString(),
    attributes,
    status: 'unset',
  };

  spans.push(span);
  activeContext = span.context;

  return span;
}

/**
 * End a span with optional status
 */
export function endSpan(span: Span, status: 'ok' | 'error' = 'ok', errorMessage?: string): void {
  span.endTime = new Date().toISOString();
  span.status = status;
  if (errorMessage) {
    span.errorMessage = errorMessage;
  }
}

/**
 * Get the current active span context
 */
export function getCurrentContext(): SpanContext | null {
  return activeContext;
}

/**
 * Set the active span context (for propagation)
 */
export function setCurrentContext(context: SpanContext | null): void {
  activeContext = context;
}

/**
 * Get all recorded spans (for export)
 */
export function getSpans(): Span[] {
  return spans;
}

/**
 * Clear all spans (for testing)
 */
export function clearSpans(): void {
  spans.splice(0);
  activeContext = null;
}

/**
 * Execute a function within a span
 */
export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
  attributes: Record<string, string | number | boolean> = {},
): Promise<T> {
  const span = startSpan(name, attributes);
  try {
    const result = await fn();
    endSpan(span, 'ok');
    return result;
  } catch (error) {
    endSpan(span, 'error', (error as Error).message);
    throw error;
  }
}

/**
 * Create traceparent header value for W3C trace context propagation
 */
export function toTraceParent(context: SpanContext): string {
  return `00-${context.traceId}-${context.spanId}-01`;
}

/**
 * Parse traceparent header value
 */
export function fromTraceParent(header: string): SpanContext | null {
  const parts = header.split('-');
  if (parts.length !== 4 || parts[0] !== '00') return null;
  const traceId = parts[1];
  const spanId = parts[2];
  if (!traceId || !spanId) return null;
  return {
    traceId,
    spanId,
  };
}
