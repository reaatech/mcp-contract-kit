/**
 * Simple in-memory metrics collection
 * Tracks test duration, pass/fail counts, and error rates
 */

export interface MetricPoint {
  timestamp: string;
  value: number;
  labels?: Record<string, string>;
}

export interface DurationHistogram {
  buckets: { upperBound: number; count: number }[];
  sum: number;
  count: number;
}

class MetricsCollector {
  private counters: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /** Increment a counter */
  inc(name: string, value = 1, labels?: Record<string, string>): void {
    const key = this.makeKey(name, labels);
    const current = this.counters.get(key) ?? 0;
    this.counters.set(key, current + value);
  }

  /** Get counter value */
  getCounter(name: string, labels?: Record<string, string>): number {
    const key = this.makeKey(name, labels);
    return this.counters.get(key) ?? 0;
  }

  /** Record a duration in milliseconds */
  recordDuration(name: string, durationMs: number, labels?: Record<string, string>): void {
    const key = this.makeKey(name, labels);
    if (!this.histograms.has(key)) {
      this.histograms.set(key, []);
    }
    this.histograms.get(key)?.push(durationMs);
  }

  /** Get histogram data for a metric */
  getHistogram(name: string, labels?: Record<string, string>): DurationHistogram {
    const key = this.makeKey(name, labels);
    const values = this.histograms.get(key) ?? [];
    const buckets = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

    return {
      buckets: buckets.map((upperBound) => ({
        upperBound,
        count: values.filter((v) => v <= upperBound).length,
      })),
      sum: values.reduce((a, b) => a + b, 0),
      count: values.length,
    };
  }

  /** Get all metrics as a summary object */
  getSummary(): {
    uptime: number;
    counters: Record<string, number>;
    histograms: Record<
      string,
      { count: number; sum: number; min: number; max: number; mean: number }
    >;
  } {
    return {
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      counters: Object.fromEntries(this.counters),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([key, values]) => [
          key,
          {
            count: values.length,
            sum: values.reduce((a, b) => a + b, 0),
            min: values.length > 0 ? Math.min(...values) : 0,
            max: values.length > 0 ? Math.max(...values) : 0,
            mean: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
          },
        ]),
      ),
    };
  }

  /** Reset all metrics */
  reset(): void {
    this.counters.clear();
    this.histograms.clear();
    this.startTime = Date.now();
  }

  private makeKey(name: string, labels?: Record<string, string>): string {
    if (!labels) return name;
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelStr}}`;
  }
}

/** Singleton metrics collector */
export const metrics = new MetricsCollector();

/** Metric names */
export const MetricNames = {
  TESTS_TOTAL: 'contract_kit_tests_total',
  TESTS_PASSED: 'contract_kit_tests_passed',
  TESTS_FAILED: 'contract_kit_tests_failed',
  TESTS_WARNING: 'contract_kit_tests_warning',
  VALIDATOR_DURATION: 'contract_kit_validator_duration_ms',
  RUN_DURATION: 'contract_kit_run_duration_ms',
  ERRORS_TOTAL: 'contract_kit_errors_total',
} as const;
