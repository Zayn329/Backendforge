import { FptLessonContent, RecipeLessonContent } from '../types';

export const LESSON_12_4_FPT: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Imagine your pager fires at 2:14 AM: *“Checkout failed for 8% of requests!”* You open your logs and find `console.log("Payment error")` printed 40 times across 6 microservices—with no request ID, no user/order context, no idea *when* latency crept up, and no clue *which* service (`API Gateway`, `Orders`, `Billing`, or `Postgres`) actually stalled!',
      'In this unit, we’ll build **Observability** (the **Three Pillars**: Logs, Metrics, Traces) from first principles: **why logs alone fail**, **structured logging & correlation IDs**, **application & infrastructure metrics**, **distributed traces, spans & context propagation**, **sampling**, and **OpenTelemetry**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Observability isn’t adding more `console.log` lines—it’s designing telemetry so you can ask brand-new questions about weird failures in production without deploying debugging patches first.',
    prerequisites: [
      {
        subBlockId: '12.1',
        label: 'Percentiles & Saturation (12.1)',
        detail: 'Understanding why aggregated metrics (`p99`, RPS, saturation) matter alongside individual errors.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-12.4.1',
      topicId: '12.4.1',
      coveredTopicIds: ['12.4.2', '12.4.3'],
      title: 'Why logs alone are insufficient — Structured Logging and Correlation IDs',
      problemAndRequirementsMarkdown: [
        '### First principles: Why `console.log("User checked out")` breaks at 500 requests/sec',
        '1. **Unstructured Text**: Searching grep logs across 10,000 interleaved lines per minute (`"Failed for user 42"`) can’t filter cleanly by `orgId`, `statusCode`, or `durationMs > 500`.',
        '2. **Logs alone can’t tell you overall health or trends**: Reading 10 million individual log lines won’t cheaply tell you *“What is our `p99` checkout latency over the past 24 hours?”* or *“Did error rate jump from 0.1% to 2% right after deploy `v42`?”*',
        '3. **Disconnected Stories**: One user click hits `Gateway` → `Orders` → `Queue Worker` → `Billing`. Without a shared identifier tying those log lines together, reconstructing that user’s journey is detective guesswork!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Structured Logs + Correlation IDs',
        '- **Structured Logging**: Emit **JSON log objects** with consistent queryable keys (`{ level, timestamp, msg, reqId, userId, orgId, route, status, durationMs }`) so log aggregators index fields cleanly for instant filtering (always scrubbing secrets/PII!).',
        '- **Correlation IDs**: Generate or propagate a unique **`X-Request-Id` / `correlationId`** at the edge API gateway, attach it to an async-local logger (`AsyncLocalStorage` in Node.js!), and forward it inside every downstream HTTP header and background job payload so one query pulls every log entry across services for that single user action!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Emit queryable JSON structured logs linked by propagated Correlation IDs for individual event forensics, recognizing you still need Metrics and Traces for trends and cross-service timing.',
      codeExamples: [],
    },
    {
      id: 'topic-12.4.4',
      topicId: '12.4.4',
      coveredTopicIds: ['12.4.5'],
      title: 'Metrics: Application Metrics vs. Infrastructure Metrics',
      problemAndRequirementsMarkdown: [
        '### First principles: Cheap mathematical summaries over time',
        'Logs store heavy text *per event*; **Metrics** store tiny numeric measurements aggregated over time windows (Counters, Gauges, Histograms)—cheap enough to power real-time dashboards and automated alerts 24/7!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The two metric layers you need',
        '1. **Application Metrics** *(What is your code experiencing? — RED method)*:',
        '   - **Rate**: Requests per second (`http_requests_total`), jobs processed/sec.',
        '   - **Errors**: Failed requests (`5xx` rate, failed payment retries, DLQ count).',
        '   - **Duration**: Latency histograms (`p50`, `p95`, `p99` per route or DB query).',
        '2. **Infrastructure Metrics** *(What is the underlying machine/runtime doing? — USE method)*:',
        '   - CPU %, RAM/heap usage, Event-loop lag, DB connection pool active/waiting counts, disk IOPS, network errors, and container restarts.',
        '   - *(Watch out for High Cardinality!)* Never put unbounded values like `userId` or `orderId` inside metric labels (`http_requests{userId="..."}`)—that creates millions of unique time-series and crashes Prometheus/metrics DBs! Keep `userId` in Logs & Traces, and low-cardinality labels (`route`, `status`, `method`) in Metrics.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Pair Application RED metrics (Rate, Errors, Duration) with Infrastructure health metrics using low-cardinality labels to drive real-time dashboards and alerts.',
      codeExamples: [],
    },
    {
      id: 'topic-12.4.6',
      topicId: '12.4.6',
      coveredTopicIds: ['12.4.7', '12.4.8', '12.4.9', '12.4.10'],
      title: 'Distributed Traces, Spans, Context Propagation, Sampling, and OpenTelemetry',
      problemAndRequirementsMarkdown: [
        '### First principles: Seeing the waterfall timeline of ONE slow request across multiple boundaries',
        'Metrics tell you *“Checkout `p99` jumped to 1.8s.”* Logs show errors—but on a slow request that *succeeded* in `1,850 ms`, where did those `1,850 ms` go across Express middleware, Redis, Postgres, and the Payment HTTP call?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Tracing mechanics & industry standardization',
        '1. **Distributed Traces & Trace/Span Relationships**: A **Trace** represents the **entire end-to-end journey** of one request (`traceId`). Inside a Trace sits a tree of **Spans**—each timed unit of work (`parentSpanId`, `spanId`, `startTime`, `duration`, tags like `db.statement` or `http.status_code`), forming a visual waterfall showing parent/child overlaps and sequential bottlenecks!',
        '2. **Context Propagation**: When Service A calls Service B over HTTP (or pushes a Kafka/BullMQ message), it injects W3C **`traceparent`** headers (`traceId` + current `spanId`) so Service B creates child spans linked cleanly into the **exact same Trace tree**!',
        '3. **Sampling**: Storing 100% of full spans at 10,000 RPS costs a fortune in network and storage! **Sampling** captures a representative subset—either **Head-based** (decide randomly upfront, e.g., keep 5% of normal traces) or **Tail-based** (buffer briefly at collector and keep **100% of slow `> 1s` or errored `5xx` traces** while sampling 1% of fast `200`s!).',
        '4. **OpenTelemetry (OTel)**: The vendor-neutral open standard SDK + Collector specification for generating **Traces, Metrics, and Logs** once in your code and exporting seamlessly to Jaeger, Grafana Tempo, Datadog, Honeycomb, or Prometheus without vendor lock-in.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Distributed Traces connect parent/child Spans across service boundaries via W3C Context Propagation (`traceparent`), using Sampling to stay cost-effective and OpenTelemetry to stay vendor-neutral.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'How the Three Pillars of Observability work together during an outage',
    narrativeMarkdown: [
      'Watch how an engineer debugs a spike cleanly using all three pillars of `12.4`:',
      '1. **Metrics** alert first: *“`POST /checkout` `p99` crossed 2s and `502` rate hit 4%.”*',
      '2. **Distributed Trace (OTel)** shows the exact waterfall span: `POST /checkout` (2,100ms) → `Postgres INSERT` (4ms) → **`FraudHTTPClient` Span (2,080ms!)**.',
      '3. **Structured Logs** filtered by that `traceId` / **`correlationId`** print the exact partner error body (`rate_limited`) without guessing!',
    ].join('\n\n'),
    integratedExample: {
      id: '12.4-integrated-example',
      title: 'Three Pillars Linked by Trace & Correlation IDs',
      language: 'text',
      code: `Metrics (Aggregate Alerts):   checkout_duration_ms{p99} = 2,100ms  (Alert fires!)
                                 │ (click exemplar / timeframe)
                                 ▼
Trace Waterfall (traceId=ab12): [HTTP POST /checkout ──────────────────────── 2,100ms]
                                   ├── [SQL SELECT user ── 4ms]
                                   └── [HTTP FraudCheck ─────────────────── 2,080ms!]
                                         │ (filter logs by traceId=ab12)
                                         ▼
Structured Logs (JSON):        {"level":"warn","traceId":"ab12","msg":"Fraud API timeout"}`,
    },
    walkthroughMarkdown:
      'Switch to the **Recipe** tab to wire `AsyncLocalStorage` correlation logging, Prometheus/OTel metrics, and OpenTelemetry HTTP/Postgres auto-instrumentation in TypeScript.',
  },
  questions: [
    {
      id: '12.4-kc-1',
      focusArea: 'Logs vs Metrics & Cardinality',
      prompt:
        'Why can’t **structured logging** with **correlation IDs** replace **application & infrastructure metrics**—and why should you put `userId` inside structured **logs** while keeping `userId` *out* of **metric** labels?',
      hints: [
        'Compare computing a 24-hour `p99` dashboard from 50 million JSON log lines vs. pre-aggregated numeric histograms.',
        'Think about "label cardinality" in time-series metric databases if 1,000,000 users each generate their own metric series.',
        'Logs are expensive to aggregate into live `p99` alerts (Metrics handle numeric time-series cheaply); putting high-cardinality `userId` in metric labels explodes time-series storage, whereas Logs/Traces handle per-user debugging cleanly.',
      ],
      explanation:
        '**Structured logs** + **correlation IDs** excel at debugging *specific individual requests*, whereas **metrics** efficiently store pre-aggregated numeric counters and latency histograms (`Rate, Errors, Duration` + CPU/pool saturation) for real-time dashboards and paging alerts. Never attach high-cardinality fields like `userId` or `requestId` as metric labels—that explodes the number of active time-series—keep those in Logs and Traces instead.',
      evaluationCriteria: [
        'Explains complementary roles of individual structured logs vs aggregated time-series metrics',
        'Identifies high-cardinality label explosion as why userId belongs in logs/traces, not metric labels',
      ],
      topicIds: ['12.4.1', '12.4.2', '12.4.3', '12.4.4', '12.4.5'],
    },
    {
      id: '12.4-kc-2',
      focusArea: 'Traces, Spans, Context Propagation & Sampling',
      prompt:
        'In **OpenTelemetry**, how do **Traces**, **Spans**, and **Context Propagation (`traceparent`)** link work across Express → Postgres → Billing Microservice—and why do high-traffic backends combine **tail-based sampling** with head sampling?',
      hints: [
        'Which object represents the whole request, which represents each timed step (`SQL`, `HTTP call`), and what header crosses the network between services?',
        'If you keep 1% of traces randomly at the edge (head sampling), could you miss rare `500` errors?',
        'A Trace groups hierarchical child Spans linked across network hops via `traceparent` header propagation; Tail sampling keeps 100% of errored/slow traces while downsampling fast healthy ones to control storage costs.',
      ],
      explanation:
        'A **Trace** captures a full request journey as a tree of parent-child **Spans** (Express route → DB query → outbound HTTP call). **Context Propagation** injects W3C `traceparent` headers into outbound HTTP requests and queue metadata so downstream services attach child spans to the same trace. Because storing every span at high RPS is costly, **Sampling** drops routine fast traces—with **tail-based sampling** keeping 100% of slow (`p99`) or errored traces while keeping only a small fraction of normal `200` traffic.',
      evaluationCriteria: [
        'Accurately defines Trace, parent-child Spans, and W3C context propagation',
        'Explains cost-vs-signal trade-off of head vs tail sampling',
      ],
      topicIds: ['12.4.6', '12.4.7', '12.4.8', '12.4.9', '12.4.10'],
    },
  ],
};

export const LESSON_12_4_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Wire the complete **Three Pillars of Observability** in TypeScript using **`pino`** + **`AsyncLocalStorage`** correlation logging, **OpenTelemetry (`@opentelemetry/sdk-node`)** distributed tracing with W3C context propagation & sampling, and **Application/Infra Metrics**.',
  whenToUseMarkdown:
    'Bootstrap this observability layer at the very top of process startup (`import "./telemetry"`) before Express or `pg` loads so auto-instrumentation patches all HTTP/DB calls cleanly.',
  setupCommands: [
    {
      id: '12.4-setup-1',
      label: 'Install OpenTelemetry Node SDK, auto-instrumentations, and Pino',
      command: 'npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http pino',
      notes: 'Requires loading OTel initialization before importing Express/pg (`node -r ./dist/telemetry.js` or top import).',
    },
  ],
  coreApisMarkdown: [
    '- **`NodeSDK` + `getNodeAutoInstrumentations()`**: Auto-creates parent/child Spans for Express, `fetch`/`http`, `pg`, and `ioredis` and propagates `traceparent` headers automatically (`12.4.6`–`12.4.10`).',
    '- **`TraceIdRatioBasedSampler(0.1)`**: Head-samples 10% of traces cleanly at the SDK (or route all to an OTel Collector for tail-sampling `12.4.9`).',
    '- **`AsyncLocalStorage` + `pino` mixin**: Injects `correlationId` AND active OTel `traceId` automatically into every structured JSON log line (`12.4.2`, `12.4.3`).',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Initialize OpenTelemetry SDK with OTLP Export & Sampling BEFORE app modules',
      detailMarkdown:
        'Starting `NodeSDK` first (`12.4.10`) patches `http`, Express, and `pg` drivers so every downstream query and HTTP call automatically becomes a **Span** with W3C **context propagation** (`12.4.7`, `12.4.8`).',
      code: {
        id: '12.4-step-1',
        title: 'src/telemetry.ts — OpenTelemetry Tracing & Sampling setup',
        language: 'typescript',
        code: `import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { TraceIdRatioBasedSampler, ParentBasedSampler } from "@opentelemetry/sdk-trace-base";

export const otelSdk = new NodeSDK({
  serviceName: "orders-api",
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_TRACES_URL ?? "http://localhost:4318/v1/traces",
  }),
  // Respect incoming upstream sampling decision; otherwise sample 10% (12.4.9)
  sampler: new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(0.1),
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

otelSdk.start();`,
      },
    },
    {
      stepNumber: 2,
      title: 'Link Structured Pino Logs automatically with Correlation IDs and active Trace IDs',
      detailMarkdown:
        'Using `AsyncLocalStorage` + OTel `trace.getActiveSpan()`, every log line anywhere inside your service layer automatically prints `{ correlationId, traceId, spanId }` without passing `req` into services (`12.4.2`, `12.4.3`).',
      code: {
        id: '12.4-step-2',
        title: 'src/observability/logger.ts — Correlation + OTel Trace-linked Pino logger',
        language: 'typescript',
        code: `import { AsyncLocalStorage } from "node:async_hooks";
import crypto from "node:crypto";
import pino from "pino";
import { trace } from "@opentelemetry/api";

export const reqContext = new AsyncLocalStorage<{ correlationId: string }>();

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: ["req.headers.authorization", "password", "token"], // Never log secrets!
  mixin() {
    const store = reqContext.getStore();
    const spanCtx = trace.getActiveSpan()?.spanContext();
    return {
      ...(store ? { correlationId: store.correlationId } : {}),
      ...(spanCtx ? { traceId: spanCtx.traceId, spanId: spanCtx.spanId } : {}),
    };
  },
});

export function correlationMiddleware(req: any, res: any, next: any) {
  const correlationId = String(req.headers["x-request-id"] ?? crypto.randomUUID());
  res.setHeader("x-request-id", correlationId);
  reqContext.run({ correlationId }, next);
}`,
      },
    },
    {
      stepNumber: 3,
      title: 'Record Custom Application Metrics (Low-Cardinality RED counters & histograms)',
      detailMarkdown:
        'Use `metrics.getMeter("orders-api")` from `@opentelemetry/api` to record `orders_created_total` and `checkout_duration_ms` with bounded labels (`status`, `paymentProvider`)—never `userId` (`12.4.4`)—alongside Node CPU/Event-Loop/Pool metrics (`12.4.5`).',
      code: {
        id: '12.4-step-3',
        title: 'Custom OpenTelemetry Application Histogram & Counter',
        language: 'typescript',
        code: `import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("orders-api");
const checkoutCounter = meter.createCounter("checkout_requests_total");
const checkoutDuration = meter.createHistogram("checkout_duration_ms");

export function recordCheckoutMetric(status: "ok" | "failed", durationMs: number) {
  checkoutCounter.add(1, { status }); // Low cardinality!
  checkoutDuration.record(durationMs, { status });
}`,
      },
    },
  ],
  workingExamples: [
    {
      id: '12.4-ex-custom-span',
      title: 'Creating a manual child Span around critical domain work',
      language: 'typescript',
      code: `import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer("orders-api");

export async function runFraudScoring(orderId: string) {
  return tracer.startActiveSpan("orders.fraud_score", async (span) => {
    try {
      span.setAttribute("order.id", orderId);
      const score = await computeRisk(orderId);
      return score;
    } finally {
      span.end(); // Always end spans in finally so leaky open spans never drop!
    }
  });
}`,
      explanation:
        'Wrapping key business steps in `startActiveSpan` nests them cleanly inside the automatic HTTP/SQL trace waterfall.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Importing `express` or `pg` *before* calling `otelSdk.start()`.',
      fix: 'OpenTelemetry monkey-patches HTTP and DB modules on import; `telemetry.ts` MUST be the very first import in `server.ts` (or preloaded via `node -r`).',
    },
    {
      mistake: 'Attaching `userId` or `orderId` as an OpenTelemetry/Prometheus metric attribute.',
      fix: 'High-cardinality metric labels blow up memory and billing! Put `userId`/`orderId` on Trace Span attributes and Structured Logs only.',
    },
    {
      mistake: 'Propagating `correlationId` across HTTP calls without forwarding it into BullMQ / Kafka job payloads.',
      fix: 'Include `{ correlationId, traceparent }` inside background message metadata so async worker logs and spans connect back to the originating HTTP request.',
    },
  ],
  exercise: {
    id: '12.4-ex',
    title: 'Wire OTel Tracing, Correlation Logs & Low-Cardinality Metrics',
    instructionsMarkdown:
      'Set up an observability module with:\n1. `telemetry.ts` initializing `NodeSDK`, `OTLPTraceExporter`, and `ParentBasedSampler` before app startup.\n2. `correlationMiddleware` using `AsyncLocalStorage` + `pino` mixin injecting `correlationId`, `traceId`, and `spanId` with auth redaction.\n3. A low-cardinality `checkout_duration_ms` histogram and a `startActiveSpan` wrapper.',
    acceptanceChecklist: [
      'Initializes OTel NodeSDK before importing HTTP/DB libraries with sampler config',
      'Uses AsyncLocalStorage + Pino mixin to attach correlationId and OTel traceId automatically',
      'Redacts sensitive auth headers/tokens from structured logs',
      'Uses strictly low-cardinality labels on Application Metrics while putting IDs on spans/logs',
    ],
  },
};

export const LESSON_12_5: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Up to now we’ve mostly asked: *“How do we make our service fast when everything works?”* In production, external dependencies **always fail eventually**: Stripe slows down to 25 seconds per request, a Redis shard drops packets, or a sudden marketing email blasts 10x normal traffic at your login endpoint. Without explicit defensive boundaries, **one slow downstream partner freezes and crashes your entire healthy backend** (a **cascading failure**)!',
      'In this unit, we’ll learn the classic **Reliability & Resilience** patterns from first principles: **timeouts**, **retry strategies**, **circuit breakers**, **bulkheads**, **backpressure**, **load shedding**, **graceful degradation**, **health & readiness checks**, and **graceful shutdown**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Resilient systems don’t prevent external failures—they **contain blast radiuses** so a 10-second hiccup in a secondary feature (like recommendations or analytics) never brings down core checkout.',
    prerequisites: [
      {
        subBlockId: '12.1',
        label: 'Little’s Law & Saturation (12.1)',
        detail: 'Understanding how hanging external calls multiply in-flight concurrency until pools exhaust.',
      },
      {
        subBlockId: '8.5',
        label: 'Health checks & Graceful Shutdown (8.5)',
        detail: 'Knowing how `/healthz`, `/readyz`, and `SIGTERM` protect traffic during deploys.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-12.5.1',
      topicId: '12.5.1',
      coveredTopicIds: ['12.5.2', '12.5.3'],
      title: 'Stopping cascading hangs: Timeouts, Retry Strategies, and Circuit Breakers',
      problemAndRequirementsMarkdown: [
        '### First principles: Why a slow dependency is FAR deadlier than a fast-failing dependency',
        'Suppose your `Orders` API calls a third-party `ShippingQuote` API before checkout. If `ShippingQuote` crashes cleanly in 5ms (`ECONNREFUSED`), your server recovers immediately. Now suppose instead `ShippingQuote` **hangs silently for 90 seconds** without closing sockets! And worse, you had **no timeout** and **3 naive retries**! Soon all 500 of your Node connections sit stuck waiting on `ShippingQuote`—freezing every unrelated route in your whole company!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Three layered defenses around every outbound dependency',
        '1. **Timeouts** *(Rule #1: NEVER make an outbound call without a timeout!)*: Always enforce both connect and overall request timeouts (`AbortSignal.timeout(2000)` on `fetch`, `statement_timeout` on SQL). Better to fail cleanly in 2 seconds than hold server concurrency hostage for 90 seconds!',
        '2. **Retry Strategies**: Retry **ONLY transient errors** (`502/503`, network reset, `429`) on **idempotent** operations (`GET` or idempotent `POST` with `Idempotency-Key` `5.4`)—NEVER retry `400 Bad Request` or `401`! Always cap attempts (e.g., max 2–3 inline) with **exponential backoff + jitter** and a **total retry budget** so retries don’t multiply traffic during an outage (`9.3`).',
        '3. **Circuit Breakers** *(Stop calling an obviously dead dependency!)*: Track recent failure rates on an outbound dependency:',
        '   - **Closed** *(Normal)*: Requests pass through normally.',
        '   - **Open** *(Tripped!)*: Once failures cross a threshold (e.g. >50% of last 20 calls fail/timeout), trip **Open** for e.g. 30 seconds—**immediately failing fast in `< 1ms` locally** instead of wasting 2 seconds per request waiting for timeouts AND giving the broken partner breathing room to recover!',
        '   - **Half-Open**: After 30s, allow **1–2 probe requests** through; if they succeed, close the circuit; if they fail, re-open!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Bound every outbound call with strict timeouts, retry only safe idempotent failures with jittered backoff, and use Circuit Breakers to fail fast when a dependency is visibly down.',
      codeExamples: [],
    },
    {
      id: 'topic-12.5.4',
      topicId: '12.5.4',
      coveredTopicIds: ['12.5.5', '12.5.6', '12.5.7'],
      title: 'Bulkheads, Backpressure, Load Shedding, and Graceful Degradation',
      problemAndRequirementsMarkdown: [
        '### First principles: What happens when load exceeds capacity—or a secondary service fails?',
        'Ships divide hulls into **watertight compartments** so one iceberg hole floods 1 room instead of sinking the entire ship. In backends, if `ReportExport` shares one giant Postgres pool and thread pool with `Login` and `Checkout`, an export flood sinks `Login` too! And if incoming traffic hits 3x your absolute capacity, trying to serve everyone makes **100% of requests time out** instead of serving 70% cleanly!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Four structural overload & isolation patterns',
        '1. **Bulkheads**: Partition resources per workload/dependency—e.g., separate DB pools (`checkoutPool: 15`, `analyticsPool: 5`) or bounded semaphore concurrency caps (`max 20 concurrent calls to Partner A`) so Partner A slowing down can never starve Partner B or `/login`!',
        '2. **Backpressure**: When a consumer/downstream slows down, **signal upstream producers to slow down** rather than buffering infinite items in RAM until OOM (like Node `stream.write() === false`, bounded queue depths, or HTTP `429`!).',
        '3. **Load Shedding**: When CPU/event-loop lag (`> 100ms`) or queue age proves your server is overloaded, **intentionally reject excess low-priority requests immediately with `503 Service Unavailable`** right at the edge! Rejecting 30% cleanly keeps the other 70% fast and healthy instead of crashing the whole fleet for 100% of users!',
        '4. **Graceful Degradation**: When a non-critical subsystem fails (`Recommendations` or `UserAvatarService`), **return a useful fallback instead of failing the whole page!** Serve cached/default `"Top Picks"` or omit avatars so users can still browse and complete purchases cleanly.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Isolate failures with Bulkheads, propagate Backpressure instead of unbounded buffering, Shed excess overload early (`503`) to save core throughput, and Degrade non-critical features gracefully to fallbacks.',
      codeExamples: [],
    },
    {
      id: 'topic-12.5.8',
      topicId: '12.5.8',
      coveredTopicIds: ['12.5.9'],
      title: 'Health & readiness checks and Graceful Shutdown as runtime resilience',
      problemAndRequirementsMarkdown: [
        '### First principles: Connecting `8.5` probes to overload and failover reliability',
        'Notice how **Health/Readiness checks** and **Graceful Shutdown** act as live reliability switches inside your cluster too: if a container’s event loop freezes, memory corrupts, or Postgres disconnects, load balancers must stop sending new users there automatically—and deploys/scale-downs must drain active requests cleanly without turning routine autoscaling into `502` bursts!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Operational hooks keeping fleets self-healing',
        '- **Health (`/healthz`) & Readiness (`/readyz`)**: Let orchestrators route around unready/overloaded pods cleanly (`503` pulls a pod out of rotation immediately without killing active connections) and restart genuinely deadlocked pods.',
        '- **Graceful Shutdown (`SIGTERM`)**: Flip `/readyz` → `503`, drain in-flight HTTP/worker calls (`server.close()` / `worker.close()`), and release DB/broker leases cleanly so autoscaling down during quiet hours causes **zero failed requests**.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Combine liveness/readiness probes with clean SIGTERM draining so autoscaling, pod failures, and rolling deploys happen with zero dropped user requests.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Defense in depth against cascading outages',
    narrativeMarkdown: [
      'Trace how all nine patterns of `12.5` protect an e-commerce backend during a partner outage + traffic spike:',
      '1. **Bulkhead** caps `RecommendationsClient` concurrency; **Timeout** cuts hangs at `400ms`; **Circuit Breaker** trips Open after failures; **Graceful Degradation** falls back to cached popular items.',
      '2. Under sudden surge, **Backpressure** and **Load Shedding** drop non-essential requests fast (`503`), while **Retries (jitter + idempotent)** recover rare transient blips.',
      '3. **Readiness checks + Graceful Shutdown** keep healthy replicas serving through autoscaling and rollouts.',
    ].join('\n\n'),
    integratedExample: {
      id: '12.5-integrated-example',
      title: 'Resilience Layers Around Outbound Calls & Incoming Overload',
      language: 'text',
      code: `Incoming Surge ─▶ [Load Shedding (eventLoopLag > 100ms? -> 503 fast!)]
                        │
                        ▼ (Healthy core requests)
                  [Bulkhead] (Separate pools: Core Checkout vs Analytics)
                        │
                        ▼
             Outbound Dependency Call:
               [Circuit Breaker (Open? Fail <1ms!)]
                 └─► [Timeout (2s)] + [Safe Idempotent Retry w/ Jitter]
                        │ (Still down?)
                        ▼
               [Graceful Degradation] -> Return cached/default fallback!`,
    },
    walkthroughMarkdown:
      'In our final Block 12 unit (`12.6`), we’ll learn how teams **measure** these reliability goals objectively (SLIs, SLOs, SLAs, Error Budgets) and improve after real incidents.',
  },
  questions: [
    {
      id: '12.5-kc-1',
      focusArea: 'Timeouts, Retries & Circuit Breakers',
      prompt:
        'Why can adding **3 automatic retries** *without* a **timeout** or **circuit breaker** turn a minor slowdown at an external Shipping API into a total outage of your entire backend?',
      hints: [
        'If Shipping hangs for 60s per attempt and you retry 3 times, how long does 1 user request pin your resources?',
        'What does a Circuit Breaker do differently once failures pass a threshold?',
        'Without timeouts + circuit breaking, 3 retries multiply hanging connections 4x against an already struggling dependency, exhausting local pools; strict timeouts bound waits and Circuit Breakers trip Open to fail fast (<1ms) until Half-Open probes succeed.',
      ],
      explanation:
        'Blindly retrying a hanging or overloaded dependency multiplies load by 4x (retry storm) and ties up local threads, sockets, and DB pools for minutes per request if **timeouts** are missing. Enforce short **timeouts** on every outbound call, use **jittered backoff retries** *only* on idempotent transient failures, and wrap flaky dependencies in a **Circuit Breaker** that trips **Open** to fail fast locally and let the downstream recover before testing with **Half-Open** probes.',
      evaluationCriteria: [
        'Explains retry amplification + connection exhaustion without timeouts',
        'Explains Closed -> Open -> Half-Open Circuit Breaker fast-failure protection',
      ],
      topicIds: ['12.5.1', '12.5.2', '12.5.3'],
    },
    {
      id: '12.5-kc-2',
      focusArea: 'Bulkheads, Backpressure, Load Shedding & Degradation',
      prompt:
        'Differentiate **Bulkheads**, **Load Shedding**, and **Graceful Degradation** using a real backend example where a non-critical recommendation engine slows down during a 3x flash sale.',
      hints: [
        'Which one separates resource pools so recommendations can’t starve checkout? Which one rejects excess low-priority requests early? Which one returns a safe fallback when recommendations fail?',
        'Connect all three so checkout stays fast and available.',
        'Bulkheads cap Recommendations concurrency/pools separately from Checkout; Graceful Degradation returns cached bestsellers when Recommendations trips; Load Shedding drops excess low-priority traffic (`503`) if core saturation spikes.',
      ],
      explanation:
        '**Bulkheads** isolate resource pools (e.g. capping Recommendations to 10 concurrent slots so its slowness cannot exhaust Checkout’s workers/DB pool). **Graceful Degradation** catches Recommendations failure/circuit-open and serves static or cached popular items so users still finish checking out. If core flash-sale traffic still exceeds total capacity, **Load Shedding** intentionally drops excess/low-priority requests early (`503`) so core checkout stays fast rather than collapsing completely.',
      evaluationCriteria: [
        'Accurately distinguishes Bulkheads (pool isolation), Load Shedding (excess traffic rejection), and Graceful Degradation (fallback UX)',
      ],
      topicIds: ['12.5.4', '12.5.5', '12.5.6', '12.5.7', '12.5.8', '12.5.9'],
    },
  ],
};

export const LESSON_12_6: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Suppose a founder asks: *“Should we aim for 100.000% uptime—zero bugs, zero slow requests, zero downtime forever?”* Sounds inspiring—until you realize 100% reliability means **you can never deploy new features** (most outages happen during changes!) and costs astronomical multi-region infrastructure for a hobby budget!',
      'In this unit, we’ll examine **Reliability Measurement & Incident Engineering** from first principles: **SLIs, SLOs, and SLAs**, **Error Budgets**, **incident response, Root Cause Analysis & blameless postmortems**, and **backup/recovery with RPO and RTO**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'SRE metrics turn emotional arguments (*“Stop shipping features!”* vs. *“Ship faster!”*) into clear shared math—and turn painful outages into durable systemic improvements instead of finger-pointing.',
    prerequisites: [
      {
        subBlockId: '12.4',
        label: 'Application RED metrics & percentiles (12.4)',
        detail: 'Knowing how success rates and `p95`/`p99` latency are measured continuously.',
      },
      {
        subBlockId: '8.5',
        label: 'Database backups & deployment hygiene (8.5)',
        detail: 'Understanding automated snapshots and WAL recovery.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-12.6.1',
      topicId: '12.6.1',
      coveredTopicIds: ['12.6.2', '12.6.3', '12.6.4'],
      title: 'SLIs, SLOs, SLAs, and Error Budgets',
      problemAndRequirementsMarkdown: [
        '### First principles: Measuring user happiness mathematically—and balancing stability vs. speed',
        'Saying *“The site should feel reliable”* means something totally different to an infrastructure engineer vs. a product manager. We need precise definitions linking **actual measurements**, **internal engineering goals**, **external legal promises**, and **how much risk we can afford when shipping code**!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The four SRE pillars clearly distinguished',
        '1. **SLI (Service Level Indicator)** *(The exact measurement!)*: A quantitative ratio of good outcomes over valid total events—e.g.:',
        '   - *Availability SLI*: `good_responses (non-5xx) / total_valid_requests` (`99.94%`).',
        '   - *Latency SLI*: `requests faster than 300ms / total_requests` (`99.2%`).',
        '2. **SLO (Service Level Objective)** *(Your internal reliability target!)*: E.g., *“Over any rolling 30 days, Checkout Availability SLI ≥ **99.9%** (`3 nines`) and `99%` of requests finish < 300ms.”*',
        '3. **SLA (Service Level Agreement)** *(The external contract with consequences!)*: A binding promise made to paying customers—usually **looser than your internal SLO** (e.g., SLO = `99.9%`, SLA = `99.5%`)—stating financial credits/penalties if breached, giving your team early warning before legal breach!',
        '4. **Error Budget (`100% - SLO`)**: Look at the flip side of a `99.9%` 30-day SLO: **you explicitly allow `0.1%` unreliability (~43 minutes of downtime or ~0.1% failed requests/month)!**',
        '   - While Error Budget remains → ship new features, run experiments, upgrade DBs confidently!',
        '   - If a bad release burns 100% of this month’s Error Budget → **freeze risky feature launches** and spend engineering sprints purely on reliability, tests, and observability until the budget recovers!',
      ].join('\n\n'),
      centralIdeaSummary:
        'SLIs measure user experience, SLOs set tighter internal targets, SLAs codify customer guarantees, and Error Budgets (`100% - SLO`) objectively govern when to ship features versus focus on reliability.',
      codeExamples: [],
    },
    {
      id: 'topic-12.6.5',
      topicId: '12.6.5',
      coveredTopicIds: ['12.6.6', '12.6.7'],
      title: 'Incident response, Root Cause Analysis (RCA), and Blameless Postmortems',
      problemAndRequirementsMarkdown: [
        '### First principles: Fix the bleeding FIRST, blame systems—never humans—SECOND',
        'At 3 AM when checkout is broken, two behaviors destroy teams: **(1)** Spending 40 minutes debating *why* a bug happened instead of rolling back to restore users right away, and **(2)** Blaming *"Bob typed the wrong migration"* so nobody fixes the missing CI migration guard—guaranteeing Sarah makes the *exact same mistake* six months later!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Responding cleanly and learning permanently',
        '1. **Incident Response**: Prioritize **Mitigation First** (rollback `v42` → `v41`, toggle feature flag off, scale up/failover) to stop customer impact immediately—assigning clear roles (Incident Commander + Comms/Status updates) rather than everyone editing production simultaneously.',
        '2. **Root Cause Analysis (RCA)**: Ask **“5 Whys”** past surface human error: *Why did prod go down? → Missing index locked table → Why wasn’t it caught? → CI didn’t lint migrations for non-concurrent `CREATE INDEX`!* Usually incidents stem from **multiple contributing systemic gaps**, not one lone villain.',
        '3. **Blameless Postmortems**: Write a concise shared document covering: Timeline (detection → mitigation → resolution), User Impact & Error Budget consumed, Root systemic causes, What went well / poorly, and **concrete Action Items with owners & deadlines** (e.g., *“Add CI check blocking non-concurrent indexes”*). Blameless culture makes engineers report near-misses openly instead of hiding them!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Mitigate customer impact first during incidents via rollbacks/flags, then run Root Cause Analysis and Blameless Postmortems that turn human mistakes into automated guardrails.',
      codeExamples: [],
    },
    {
      id: 'topic-12.6.8',
      topicId: '12.6.8',
      coveredTopicIds: ['12.6.9'],
      title: 'Disaster Backup & Recovery: RPO vs. RTO',
      problemAndRequirementsMarkdown: [
        '### First principles: Two exact numbers every business must decide before a disaster hits',
        'Suppose a rogue script wipes your primary database at `14:05 UTC` (or an entire cloud region goes dark). Your CEO asks two crystal-clear questions:',
        '1. *“How many minutes of recently saved customer orders might we permanently lose?”*',
        '2. *“How long will our service stay down before we’re back serving users?”*',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### RPO and RTO drive your entire backup & failover architecture',
        '- **RPO (Recovery Point Objective)** *(Maximum tolerable **data loss** measured backward in time)*:',
        '  - Daily midnight snapshots → **RPO = 24 hours** (up to 24h of writes lost!).',
        '  - Continuous WAL streaming / Point-in-Time Recovery (`PITR`) or synchronous standby replica → **RPO = seconds to near-zero!**',
        '- **RTO (Recovery Time Objective)** *(Maximum tolerable **downtime** to restore service)*:',
        '  - Restoring a 2 TB dump into a cold database by hand → **RTO = hours**.',
        '  - Automated hot standby failover (Multi-AZ RDS) → **RTO = ~60 seconds!**',
        '- **Golden Rule of Backup & Recovery**: Match backup frequency, WAL archiving, Multi-AZ standbys, and **automated restore drills** directly to your declared RPO and RTO—an untested restore never guarantees RTO!',
      ].join('\n\n'),
      centralIdeaSummary:
        'RPO bounds maximum acceptable data loss (driving snapshot vs. continuous WAL frequency), while RTO bounds maximum recovery downtime (driving manual restores vs. automated standby failover).',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'The continuous reliability feedback loop',
    narrativeMarkdown: [
      'Notice how every part of `12.6` closes the loop on engineering velocity and trust:',
      '- **Measure (`SLI`)** against **`SLO`** (kept tighter than external **`SLA`**) to track remaining **`Error Budget`**.',
      '- When an outage hits, **Mitigate first** (protecting **RTO/RPO** with PITR backups/rollbacks), then run systemic **RCA** + **Blameless Postmortems** to harden CI/guardrails for next time.',
    ].join('\n\n'),
    integratedExample: {
      id: '12.6-integrated-example',
      title: 'SLI / SLO / SLA / Error Budget & RPO / RTO Reference Summary',
      language: 'text',
      code: `Reliability Targets (Day-to-Day Ops):
  SLI (Actual Metric):   99.95% successful non-5xx responses
  SLO (Internal Target): >= 99.9% over 30d  --> Error Budget = 0.1% (~43m/month)
  SLA (Customer Promise): >= 99.5% (credits if breached; looser than SLO!)

Disaster Recovery (Worst-Case Timeline):
  ◄── RPO (Max Data Loss) ──┤[DISASTER @ 14:05]├── RTO (Max Downtime) ──►
  Driven by: Snapshot + WAL/PITR frequency       Driven by: Automation & Hot Standby`,
    },
    walkthroughMarkdown:
      'You now have both the runtime tools (`12.1`–`12.5`) and the engineering governance (`12.6`) to run production backends confidently.',
  },
  questions: [
    {
      id: '12.6-kc-1',
      focusArea: 'SLI, SLO, SLA & Error Budgets',
      prompt:
        'Explain **SLI**, **SLO**, **SLA**, and **Error Budget** with concrete numbers—why should your internal **SLO** (`99.9%`) be *stricter* than your customer **SLA** (`99.5%`), and why is an Error Budget better than aiming for `100%` uptime?',
      hints: [
        'Which one is the raw measured ratio, which is the internal goal, and which is the legal contract?',
        'What happens to deployment velocity if you demand 100.00% perfection—and what does an Error Budget tell a team when it runs out?',
        'SLI = measured ratio, SLO = internal target, SLA = external contract (kept looser so teams catch degradation before paying penalties). Error Budget (`100% - SLO`) balances feature velocity against reliability freezes rather than paralyzing releases for an impossible 100%.',
      ],
      explanation:
        'An **SLI** is the measured metric (e.g., `99.95%` non-5xx requests); an **SLO** is the internal target (`99.9%` over 30 days); an **SLA** is the external contract (`99.5%` before customer credits). Setting the SLO stricter than the SLA gives engineering an early buffer to fix issues before breaching contracts. Aiming for `100%` freezes all deployments; **Error Budgets (`100% - SLO`)** allocate an explicit margin for safe releases and trigger reliability-only work when depleted.',
      evaluationCriteria: [
        'Correctly distinguishes SLI, SLO, SLA, and Error Budget',
        'Explains why SLO > SLA (early warning buffer) and why 100% uptime stalls velocity',
      ],
      topicIds: ['12.6.1', '12.6.2', '12.6.3', '12.6.4'],
    },
    {
      id: '12.6-kc-2',
      focusArea: 'Incident Response, Postmortems & RPO/RTO',
      prompt:
        'During a live database outage caused by a bad deploy, what comes first in **incident response** vs. **postmortem RCA** (and why **blameless**)? Then differentiate **RPO** vs. **RTO** if a company takes nightly backups only at `00:00 UTC` and takes 3 hours to restore.',
      hints: [
        'First stop customer pain (rollback/failover); investigate systemic causes *after* recovery.',
        'If the DB crashes at `18:00 UTC` with only midnight snapshots and a 3-hour manual restore, how much data is lost (RPO) vs. how long is the site down (RTO)?',
        'Mitigate first (rollback/failover) before blameless systemic RCA; with midnight-only snapshots and 3h restore, worst-case RPO is 24h data loss (18h lost at 18:00) and RTO is 3h downtime.',
      ],
      explanation:
        'In **incident response**, **mitigate impact first** (rollback, feature flag, failover) before deep **Root Cause Analysis**. A **blameless postmortem** fixes systemic gaps (like missing CI checks or automated guardrails) rather than blaming individuals so teams share truth openly. For **Backup & Recovery**, **RPO** is maximum tolerable data loss (nightly midnight snapshots allow up to `24h` RPO—losing 18h of writes if failing at `18:00`), whereas **RTO** is maximum recovery downtime (`3 hours` to restore and serve traffic again).',
      evaluationCriteria: [
        'Prioritizes mitigation before systemic blameless postmortem RCA',
        'Accurately differentiates RPO (max data loss window) from RTO (max restoration downtime)',
      ],
      topicIds: ['12.6.5', '12.6.6', '12.6.7', '12.6.8', '12.6.9'],
    },
  ],
};
