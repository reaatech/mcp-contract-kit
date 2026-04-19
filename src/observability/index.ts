/**
 * Observability module — barrel export
 */

export { logger, createLogger } from './logger.js';
export { metrics, MetricNames } from './metrics.js';
export {
  startSpan,
  endSpan,
  getCurrentContext,
  setCurrentContext,
  getSpans,
  clearSpans,
  withSpan,
  toTraceParent,
  fromTraceParent,
} from './tracing.js';
export type { Span, SpanContext } from './tracing.js';
