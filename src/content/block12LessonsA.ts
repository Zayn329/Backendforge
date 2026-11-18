import { FptLessonContent, RecipeLessonContent } from '../types';

export const LESSON_12_1: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'A manager walks up and says: *“Our dashboard feels slow—someone said average response time is 45ms, so why are customers complaining it takes 4 seconds?”* If you only look at averages and raw CPU percentages, performance mysteries feel like black magic.',
      'In this unit, we’ll establish **Performance Fundamentals** mathematically and practically: **latency vs. throughput**, **concurrency & requests per second (Little’s Law)**, **resource utilization & saturation**, **p50, p95, and p99 tail latency**, and **systematic bottleneck identification**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Optimizing random code before measuring wastes days on things that don’t matter. Understanding percentiles, saturation curves, and bottlenecks tells you *where* every millisecond actually disappears.',
    prerequisites: [
      {
        subBlockId: '3.2',
        label: 'HTTP Request Lifecycle & Connection Pools (3.2)',
        detail: 'Knowing how requests move through Node.js, network I/O, and Postgres pools.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-12.1.1',
      topicId: '12.1.1',
      coveredTopicIds: ['12.1.2', '12.1.3'],
      title: 'Latency vs. Throughput, Concurrency, and Requests Per Second (RPS)',
      problemAndRequirementsMarkdown: [
        '### First principles: Why “faster” means two completely different things',
        'Picture a highway toll booth vs. a sports car:',
        '- **Latency**: How long **one single request** takes from sending the first byte to receiving the answer (e.g., `40 ms`).',
        '- **Throughput (Requests Per Second / RPS)**: How many requests **the whole system finishes per second** (e.g., `2,500 RPS`).',
        '- **Concurrency**: How many requests are **currently in-flight at the same instant** (`Concurrency = Throughput × Average Latency`, known as **Little’s Law**!).',
        '',
        'Wait—notice what Little’s Law predicts! Suppose your backend handles `500 RPS` at `20 ms` (`0.02s`) → only **`10` concurrent requests** are active at once! Now suppose a slow query slows average latency to `2,000 ms` (`2s`) at the same `500 RPS` → suddenly **`1,000` concurrent requests** pile up simultaneously, exhausting memory and DB pools!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### How Latency, Concurrency, and RPS interact',
        '- Adding **batching** or asynchronous queues often **increases throughput (RPS)** while slightly **increasing individual latency** (waiting 10ms to fill a batch).',
        '- Conversely, running 1 request fast (`10 ms`) doesn’t guarantee high throughput if a global mutex or 5-connection DB pool serializes requests one by one!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Latency measures single-request duration, Throughput (RPS) measures aggregate completion rate, and Concurrency (= RPS × Latency) spikes explosively whenever latency degrades.',
      codeExamples: [],
    },
    {
      id: 'topic-12.1.4',
      topicId: '12.1.4',
      coveredTopicIds: ['12.1.5'],
      title: 'Resource utilization and Saturation (why 100% full = infinite queues)',
      problemAndRequirementsMarkdown: [
        '### First principles: Why 75% CPU feels fine, and 95% CPU falls off a cliff',
        'Think of a grocery checkout lane: if shoppers arrive randomly and the cashier is busy **50% of the time**, almost nobody waits in line. What happens when the cashier is busy **95% of the time**? Because customers arrive in unpredictable clumps (Poisson bursts), tiny variations cause queues to stretch out the door—latency doesn’t double, it **shoots up exponentially toward infinity**!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Utilization vs. Saturation',
        '- **Utilization**: Percentage of capacity currently busy (e.g., CPU at `70%`, DB connection pool `14/20` connections active, disk IOPS at `60%`).',
        '- **Saturation**: The point where demand exceeds capacity and **work starts queueing behind waiting bottlenecks** (run-queue latency, `pool.waitingCount > 0`, event-loop lag). Keep critical resources comfortably below saturation (~60–75% peak target) so burst traffic doesn’t send latency off a cliff!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Utilization measures how busy a resource is; Saturation begins when excess work queues up, causing latency to explode non-linearly near 100% utilization.',
      codeExamples: [],
    },
    {
      id: 'topic-12.1.6',
      topicId: '12.1.6',
      coveredTopicIds: ['12.1.7'],
      title: 'Tail latency (p50, p95, p99) and systematic bottleneck identification',
      problemAndRequirementsMarkdown: [
        '### First principles: Why “average latency = 40ms” hides angry users',
        'Suppose 99 requests take `10 ms` and 1 request hits a cold query or GC pause taking `3,010 ms`. The **average** is `(990 + 3010)/100 = 40 ms`! Looks amazing on a dashboard—yet 1 out of every 100 API calls freezes for 3 full seconds (and if a page makes 10 API calls, ~10% of page loads feel slow!).',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Percentiles & Finding the Real Bottleneck',
        '1. **Percentiles (`p50`, `p95`, `p99`)**: Sort all response times from fastest to slowest:',
        '   - **`p50` (Median)**: Typical fast user experience (50% faster, 50% slower).',
        '   - **`p95` / `p99` (Tail Latency)**: The slowest 5% and 1% of requests—where GC pauses, lock contention, cache misses, and unindexed table scans live!',
        '2. **Bottleneck Identification**: Every system’s throughput is bounded by **one single tightest constraint right now** (CPU, RAM/GC, Postgres locks/disk, external HTTP API, or connection pool). Break down an end-to-end `p99` trace into segments (HTTP parse vs. Node JS CPU vs. SQL wait vs. External API). **Only optimize the slowest segment**—speeding up a 1ms JSON mapper when Postgres takes 800ms moves total latency by 0.1%!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Measure p50, p95, and p99 percentiles instead of misleading averages, and break request timelines down to isolate and optimize only the dominant bottleneck.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Reading a service’s vital signs together',
    narrativeMarkdown: [
      'Put all seven metrics of `12.1` on one diagnostic sheet:',
      '- Rising **`p99` latency** at constant **RPS** boosts **Concurrency** (`RPS × Latency`).',
      '- Rising Concurrency hits **Saturation** on the tightest resource (e.g., `DB pool` waiting queue or Node event loop).',
      '- Segmenting that **`p99`** trace pinpoints the exact **Bottleneck** (`12.2` Node vs. `12.3` Database).',
    ].join('\n\n'),
    integratedExample: {
      id: '12.1-integrated-example',
      title: 'Diagnostic Flow From p99 Spike to Bottleneck',
      language: 'text',
      code: `Symptom: p50 = 18ms (fine!), p99 = 2,400ms (broken!) at 400 RPS
  │
  ▼ Little's Law: Concurrency climbing fast -> Check Saturation!
  ├── Node CPU 98% / Event-loop lag 900ms? -> Profile Node.js (12.2)
  ├── Postgres Pool waitingCount = 85?     -> Profile Slow SQL / Locks (12.3)
  └── External Stripe span = 2,100ms?      -> Timeout / Async Offload (9.1, 12.5)`,
    },
    walkthroughMarkdown:
      'Next in `12.2` and `12.3`, we’ll profile the two most common backend bottlenecks directly: **Node.js runtime** and **PostgreSQL**.',
  },
  questions: [
    {
      id: '12.1-kc-1',
      focusArea: 'Latency, Throughput, Concurrency & Saturation',
      prompt:
        'Using **Little’s Law (`Concurrency = RPS × Latency`)** and the concept of **saturation**, explain why a slow database query increasing average latency from `50ms` to `1,000ms` can suddenly exhaust server RAM and connection pools even though incoming **RPS** didn’t increase.',
      hints: [
        'Plug `200 RPS × 0.05s` vs. `200 RPS × 1.0s` into Little’s Law.',
        'What happens to waiting queues when active concurrency exceeds your connection pool or worker limit?',
        'Concurrency jumps 20x (from 10 to 200 in-flight requests), saturating pools/RAM and creating queueing spirals that push latency exponentially higher.',
      ],
      explanation:
        'By Little’s Law, at `200 RPS`, jumping from `50ms` (`0.05s`) to `1,000ms` (`1s`) pushes active **concurrency** from **10** in-flight requests to **200**! Once concurrency passes a pool’s or CPU’s capacity, the resource enters **saturation**—requests queue up, memory swells with held buffers/closures, and latency climbs exponentially.',
      evaluationCriteria: [
        'Applies Little’s Law accurately to show concurrency surging with latency',
        'Explains queueing explosion once resource saturation is reached',
      ],
      topicIds: ['12.1.1', '12.1.2', '12.1.3', '12.1.4', '12.1.5'],
    },
    {
      id: '12.1-kc-2',
      focusArea: 'Tail Latency & Bottleneck Identification',
      prompt:
        'Why do senior engineers track **`p50`, `p95`, and `p99`** instead of `avg` latency—and if a `p99` request takes `1,200ms` (`15ms` JSON validation + `1,170ms` SQL query + `15ms` serialization), where should your optimization effort go?',
      hints: [
        'Can a 40ms average hide 3-second pauses experienced by 1 in 100 requests?',
        'How much can optimizing JSON validation save out of 1,200ms?',
        'Averages mask severe tail outliers; p95/p99 reveal GC pauses, lock contention, or cache misses. Always target the dominant bottleneck (the 1,170ms SQL query), since shrinking 15ms validation to 1ms barely changes total latency.',
      ],
      explanation:
        'Averages bury painful slow outliers (`p95`/`p99`) caused by cache misses, GC pauses, or lock waits behind fast hits (`p50`). Tracking **tail latency (`p95`/`p99`)** exposes real user pain. To identify bottlenecks, break down where time is spent: optimizing the `15ms` validation saves at most 1%, whereas indexing or fixing the `1,170ms` SQL query cuts nearly 98% of the tail latency.',
      evaluationCriteria: [
        'Explains why averages hide tail outliers captured by p95/p99',
        'Prioritizes the dominant bottleneck (1,170ms SQL) over micro-optimizing negligible steps',
      ],
      topicIds: ['12.1.6', '12.1.7'],
    },
  ],
};

export const LESSON_12_2_FPT: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Your database looks completely idle—yet your Node.js API takes 3 seconds to answer `GET /healthz`, RAM climbs steadily from 200 MB to 1.8 GB until Kubernetes OOM-kills the pod every 4 hours, and latency stutters every few seconds!',
      'In this unit, we’ll learn how to diagnose inside the Node.js / V8 runtime: **CPU profiling**, **heap profiling**, **garbage collection (GC) pauses**, **event-loop lag**, **memory leaks**, **Worker Thread performance**, and **stream & buffer performance**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Remember Node runs your JavaScript on a single main Event Loop thread! One accidental `JSON.parse` on a 40 MB payload, blocking regex, or retained global cache array can freeze *every* user on that process simultaneously.',
    prerequisites: [
      {
        subBlockId: '12.1',
        label: 'Tail latency & saturation (12.1)',
        detail: 'Knowing how runtime bottlenecks drive `p99` latency spikes.',
      },
      {
        subBlockId: '3.2',
        label: 'Node.js Event Loop model (3.2)',
        detail: 'Understanding why synchronous CPU tasks stall concurrent requests.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-12.2.1',
      topicId: '12.2.1',
      coveredTopicIds: ['12.2.4', '12.2.6'],
      title: 'CPU profiling, Event-Loop Lag, and Worker Threads',
      problemAndRequirementsMarkdown: [
        '### First principles: Why one synchronous calculation freezes 500 other users in Node.js',
        'Suppose Endpoint A converts a 15 MB report CSV or runs `bcrypt` / heavy regex matching synchronously for `400 ms` on the main JS thread. During those `400 ms`, **no timers fire, no HTTP sockets flush, and no Promise callbacks resume!** Every unrelated `/healthz` or `/login` request waits behind it!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Diagnosing & fixing CPU blocks',
        '1. **Event-Loop Lag**: Measures how long a `setTimeout(..., 10)` or `monitorEventLoopDelay()` tick arrives *late*. Healthy Node APIs stay around `1–10 ms`. Seeing `eventLoopLag > 100ms` proves synchronous JS code is monopolizing the main thread!',
        '2. **CPU Profiling**: Captures a **Flamegraph** (`node --cpu-prof` or `0x` / Chrome DevTools) showing *which exact functions* spent the most CPU milliseconds on the call stack (e.g., spotting catastrophic regex backtracking or repeated deep clones inside a loop).',
        '3. **Worker Thread Performance**: When you genuinely need heavy synchronous CPU work (image hashing, PDF rendering, cryptography, compression) inside Node.js, offload it from the main Event Loop to a bounded pool of **`worker_threads`** (or dedicated background workers `9.2`). *Note*: Pass `ArrayBuffer`s cleanly or avoid cloning massive JSON objects between threads since serialization overhead also costs CPU!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Monitor Event-Loop Lag to spot main-thread blocking immediately, capture CPU Flamegraphs to find hot functions, and offload true CPU work to Worker Threads or background jobs.',
      codeExamples: [],
    },
    {
      id: 'topic-12.2.2',
      topicId: '12.2.2',
      coveredTopicIds: ['12.2.3', '12.2.5', '12.2.7'],
      title: 'Heap profiling, Garbage Collection pauses, Memory Leaks, and Streams/Buffers',
      problemAndRequirementsMarkdown: [
        '### First principles: Why memory keeps growing—and why V8 freezes briefly while cleaning up',
        'Look at two memory mysteries:',
        '1. **Memory Leak**: Every request pushes `{ reqId, user }` into an unbounded module-level `const cache = new Map()` or leaves event listeners attached forever. V8 cannot free reachable objects → heap climbs steadily until crash (`JavaScript heap out of memory`)!',
        '2. **Garbage Collection (GC) Pauses & Buffer Bloat**: Even *without* a leak, reading a 100 MB file with `fs.readFile` or allocating millions of temporary objects per second forces V8’s Mark-Sweep-Compact **Stop-The-World GC** to pause JS execution for tens or hundreds of milliseconds—spiking your **`p99` tail latency**!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Memory tooling and zero-bloat I/O',
        '1. **Heap Profiling (`--heap-prof` / Heap Snapshots)**: Take two heap snapshots (`t = 5 min` and `t = 15 min`) and diff **“Objects allocated between Snapshot 1 and Snapshot 2”** to expose the exact retained arrays, closures, or listener maps leaking RAM.',
        '2. **Garbage Collection (GC) Pauses**: Watch `perf_hooks` GC metrics (`major` mark-sweep vs. fast `minor` scavenge). Reduce allocation churn by avoiding huge transient arrays and keeping caches strictly bounded (LRU `maxSize`).',
        '3. **Stream and Buffer Performance**: Never load large files or HTTP payloads into a single huge `Buffer` (`fs.readFile` / `res.json` on 100k rows). Use **Streams (`pipeline`, cursors)** so Node processes tiny 64 KB chunks continuously with flat memory and minimal GC pressure—and remember Buffer `allocUnsafe` / `subarray` behaviors when handling binary slices.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Diff Heap Snapshots to catch unbounded retention leaks, keep allocation rates lean to minimize Stop-The-World GC pauses, and stream large payloads instead of buffering megabytes into RAM.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Node.js runtime diagnostic playbook',
    narrativeMarkdown: [
      'Pair symptom directly to profiler tool (`12.2`):',
      '- **Spiking `eventLoopLag` + slow `/healthz`** → Run **`--cpu-prof`** flamegraph → fix hot loop/regex or move CPU work to **`worker_threads`**.',
      '- **Climbing RSS/Heap + `p99` stutters** → Diff **Heap Snapshots (`--heap-prof`)** + check **GC major pauses** + convert giant `Buffer` reads into **Streams**.',
    ].join('\n\n'),
    integratedExample: {
      id: '12.2-integrated-example',
      title: 'Node.js Symptom -> Profiling Tool -> Structural Fix',
      language: 'text',
      code: `Runtime Symptom                  Diagnostic Signal               Fix
──────────────────────────────────────────────────────────────────────────────────────────
Requests freeze, CPU 100%        Event-loop lag + --cpu-prof     Remove sync I/O / regex; use Worker Thread
Sawtooth RAM climbing to OOM     Heap Snapshot Diff              Bound caches (LRU), remove leaked listeners
Periodic 200ms p99 hiccups       GC Major Pause + Buffer spike   Stream large payloads (pipeline), cut churn`,
    },
    walkthroughMarkdown:
      'Switch to the **Recipe** tab to wire `perf_hooks` event-loop lag + GC monitoring, capture CPU/Heap profiles, offload heavy CPU to `worker_threads`, and stream large exports cleanly.',
  },
  questions: [
    {
      id: '12.2-kc-1',
      focusArea: 'Event-Loop Lag, CPU Profiling & Worker Threads',
      prompt:
        'Your Node.js API shows `eventLoopLag = 350ms` and slow `/healthz` responses even though Postgres queries take only `4ms`. How do you pinpoint the cause using **CPU profiling**—and why does offloading CPU work to **Worker Threads** fix `/healthz` while `async/await` on CPU math would NOT?',
      hints: [
        'Does marking a synchronous `for`-loop hashing function `async` automatically run it on another CPU core?',
        'What does `--cpu-prof` reveal, and what does `worker_threads` actually change?',
        '`async` without `await` still executes synchronously on the single Event Loop thread; `--cpu-prof` flamegraphs pinpoint which function hogs the thread, and `worker_threads` runs heavy JS CPU work on an isolated OS thread.',
      ],
      explanation:
        'Simply adding `async` to a CPU-heavy function does not move work off Node’s single JavaScript thread—any synchronous loop still blocks the Event Loop for every request. Capturing a **CPU profile (`--cpu-prof`)** produces a flamegraph highlighting the exact hot call stack causing **event-loop lag**, and moving that CPU work into a bounded **`worker_threads`** pool frees the main Event Loop to answer `/healthz` and I/O immediately.',
      evaluationCriteria: [
        'Clarifies that async/Promise does not parallelize CPU-bound loops off the Event Loop',
        'Uses CPU profiling flamegraph to locate hot code and Worker Threads to isolate CPU work',
      ],
      topicIds: ['12.2.1', '12.2.4', '12.2.6'],
    },
    {
      id: '12.2-kc-2',
      focusArea: 'Heap Profiling, GC Pauses, Leaks & Streams',
      prompt:
        'A Node container’s heap grows by 50 MB every hour until crashing (`OOM`), and `p99` shows periodic 150ms stalls right before crashes. How do **heap snapshot diffs** locate **memory leaks**, why do giant allocations trigger **GC pauses**, and how do **Streams** eliminate buffer spikes on large downloads?',
      hints: [
        'Why compare two Heap Snapshots taken 10 minutes apart instead of inspecting just one?',
        'Compare buffering a 200 MB CSV export in a string/Buffer vs. streaming 64 KB chunks.',
        'Diffing snapshots exposes objects retained across requests (leaks); huge allocations force V8 Major Stop-The-World GC pauses; Streams pass small bounded chunks cleanly so memory stays flat.',
      ],
      explanation:
        'Taking two **Heap Snapshots** separated by load (`t1` vs `t2`) highlights objects still alive and growing (unbounded `Map`s, unremoved event listeners) as the **memory leak**. Massive transient buffers or retained objects push V8 into frequent **major Garbage Collection pauses**, stalling all JS execution (`p99` spikes). Replacing full-payload buffering with Node **Streams (`pipeline`)** processes data chunk-by-chunk with constant minimal heap churn.',
      evaluationCriteria: [
        'Explains two-snapshot heap diffing for retained leak detection',
        'Links large allocations to GC pauses and explains flat-memory Stream chunking',
      ],
      topicIds: ['12.2.2', '12.2.3', '12.2.5', '12.2.7'],
    },
  ],
};

export const LESSON_12_2_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Instrument a Node.js backend to measure **event-loop lag** and **GC pauses** in real time, capture **CPU & Heap profiles**, offload heavy synchronous CPU work to **`worker_threads`**, and stream large responses without RAM bloat.',
  whenToUseMarkdown:
    'Use `monitorEventLoopDelay` continuously in production metrics, use `--cpu-prof`/`--heap-prof` during load tests or incident diagnosis, and use Streams + Worker Threads wherever large payloads or CPU crunching appear.',
  setupCommands: [
    {
      id: '12.2-setup-1',
      label: 'Capture CPU profile & Heap profile on demand via Node flags',
      command: 'node --cpu-prof --heap-prof dist/server.js',
      notes: 'Writes `.cpuprofile` and `.heapprofile` files on exit (or trigger via `node:inspector` / `v8.writeHeapSnapshot()`). Open in Chrome DevTools Performance/Memory tabs.',
    },
  ],
  coreApisMarkdown: [
    '- **`perf_hooks.monitorEventLoopDelay()`**: Samples real-time Event Loop lag percentiles (`p50`, `p99`, `max`) (`12.2.4`).',
    '- **`PerformanceObserver({ entryTypes: ["gc"] })`**: Tracks major vs. minor GC pause durations (`12.2.3`).',
    '- **`node:worker_threads` (`new Worker(...)`)**: Offloads CPU-bound tasks off the main HTTP loop (`12.2.6`).',
    '- **`stream.pipeline(...)` + `Readable`**: Streams large CSV/file data in bounded chunks (`12.2.7`).',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Monitor Event-Loop Lag and GC Pauses continuously via `node:perf_hooks`',
      detailMarkdown:
        'Expose p99 event-loop lag (`12.2.4`) and major GC duration (`12.2.3`) as metrics so runtime saturation never catches you blind.',
      code: {
        id: '12.2-step-1',
        title: 'src/profiling/runtimeMetrics.ts — Event-loop delay & GC pause observer',
        language: 'typescript',
        code: `import { monitorEventLoopDelay, PerformanceObserver } from "node:perf_hooks";

const loopMonitor = monitorEventLoopDelay({ resolution: 20 });
loopMonitor.enable();

const gcObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    // entry.duration in ms; flag spikes > 50ms
    if (entry.duration > 50) {
      console.warn({ type: "gc_pause", durationMs: Math.round(entry.duration) });
    }
  }
});
gcObserver.observe({ entryTypes: ["gc"] });

export function getEventLoopStats() {
  return {
    p50Ms: Number((loopMonitor.percentile(50) / 1e6).toFixed(2)),
    p99Ms: Number((loopMonitor.percentile(99) / 1e6).toFixed(2)),
    maxMs: Number((loopMonitor.max / 1e6).toFixed(2)),
  };
}`,
      },
    },
    {
      stepNumber: 2,
      title: 'Offload CPU-heavy work to a Worker Thread & Stream large responses',
      detailMarkdown:
        'Run heavy CPU tasks on a Worker Thread (`12.2.6`) and pipe large exports via Node Streams (`12.2.7`) so memory stays flat.',
      code: {
        id: '12.2-step-2',
        title: 'Worker Thread CPU offload + Backpressure-safe Stream export',
        language: 'typescript',
        code: `import { Worker } from "node:worker_threads";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

// 1. CPU offload helper (12.2.6): keeps main Event Loop snappy!
export function runCpuTask<T>(workerFile: string, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const w = new Worker(workerFile, { workerData: payload });
    w.once("message", resolve);
    w.once("error", reject);
  });
}

// 2. Streaming CSV export (12.2.7): zero giant Buffer allocation in RAM!
export async function streamCsvExport(rowsAsyncIter: AsyncIterable<string[]>, res: any) {
  res.setHeader("Content-Type", "text/csv");
  const readable = Readable.from(async function* () {
    yield "id,email,total_cents\\n";
    for await (const row of rowsAsyncIter) {
      yield row.join(",") + "\\n";
    }
  }());
  await pipeline(readable, res); // Automatically handles backpressure & cleanup!
}`,
      },
    },
    {
      stepNumber: 3,
      title: 'Take two Heap Snapshots during load to isolate Memory Leaks',
      detailMarkdown:
        'Call `v8.writeHeapSnapshot()` cleanly on a diagnostic signal (`SIGUSR2` or admin-only internal trigger) at `t=0` and `t=10m`, then load both in Chrome DevTools → Memory → Comparison view (`12.2.2`, `12.2.5`) to inspect growing `# Delta` constructors.',
    },
  ],
  workingExamples: [
    {
      id: '12.2-ex-inspector-cpu',
      title: 'Programmatic 10-second CPU profile capture in staging/prod',
      language: 'typescript',
      code: `import { Session } from "node:inspector/promises";
import fs from "node:fs/promises";

export async function captureCpuProfile(ms = 10_000, outPath = "/tmp/api.cpuprofile") {
  const session = new Session();
  session.connect();
  await session.post("Profiler.enable");
  await session.post("Profiler.start");
  await new Promise((r) => setTimeout(r, ms));
  const { profile } = await session.post("Profiler.stop");
  await fs.writeFile(outPath, JSON.stringify(profile));
  session.disconnect();
}`,
      explanation:
        'Capturing a bounded 10-second CPU profile via `node:inspector/promises` gives an exact Flamegraph of hot functions without even restarting the Node process.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Creating `new Worker()` per incoming HTTP request (`1,000 req/s` = spawning 1,000 V8 isolates/sec!).',
      fix: 'Spawning a Worker Thread costs ~10–30ms and several MBs; reuse a small fixed-size Worker Pool (e.g. `piscina`, sized to CPU cores) or queue to background workers.',
    },
    {
      mistake: 'Leaving `heapSnapshot` admin endpoints public or running heap snapshots under OOM traffic.',
      fix: 'Writing a heap snapshot momentarily pauses V8 and uses extra disk/RAM; restrict diagnostics behind internal auth and capture on a single canary instance.',
    },
    {
      mistake: 'Accumulating SQL rows with `await db.query("SELECT * FROM huge_table")` before calling `res.send(toCsv(rows))`.',
      fix: 'Use PostgreSQL cursors (`pg-query-stream`) piped into `stream.pipeline(..., res)` so memory stays `< 10 MB` even on a 500 MB CSV export.',
    },
  ],
  exercise: {
    id: '12.2-ex',
    title: 'Profile & Fix Event-Loop Blocking and Buffer Bloat',
    instructionsMarkdown:
      'Build a diagnostic & refactor snippet that:\n1. Instruments `monitorEventLoopDelay()` + GC `PerformanceObserver` (`p99` lag & major GC logs).\n2. Captures a 5s CPU profile via `node:inspector/promises`.\n3. Refactors a `rows.map(...).join()` full-array JSON/CSV export into a backpressure-safe `Readable` + `stream.pipeline` stream.',
    acceptanceChecklist: [
      'Measures Event-Loop lag p99 and GC pause durations cleanly via node:perf_hooks',
      'Demonstrates on-demand CPU or Heap profiling capture cleanly',
      'Replaces full-in-memory buffering with stream.pipeline chunk streaming',
      'Explains pooling Worker Threads instead of spawning per HTTP request',
    ],
  },
};

export const LESSON_12_3_FPT: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'In most web backends, **80%+ of `p99` latency lives inside the database layer**—either one unindexed `Seq Scan` chewing through 5 million rows, an `N+1` loop firing 200 tiny round-trips per HTTP call, two endpoints fighting over the exact same row lock, or an oversized connection pool thrashing Postgres CPU!',
      'In this unit, we’ll learn **Database Profiling** systematically from first principles: **slow query identification**, **reading query plans (`EXPLAIN ANALYZE`)**, **index optimization**, **lock contention**, **connection pool tuning**, **N+1 query elimination**, and **query batching**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Throwing bigger database hardware at unindexed queries, N+1 loops, or lock contention just burns money temporarily. Reading execution plans and fixing query patterns cuts load by 10x–100x instantly.',
    prerequisites: [
      {
        subBlockId: '4.4',
        label: 'B-Tree Indexes & Query Execution (4.4)',
        detail: 'Understanding sequential scans, index scans, and composite column order.',
      },
      {
        subBlockId: '5.3',
        label: 'Row locks & lock contention (5.3)',
        detail: 'Understanding transaction lock waits across concurrent writers.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-12.3.1',
      topicId: '12.3.1',
      coveredTopicIds: ['12.3.2', '12.3.3'],
      title: 'Slow query identification, reading Query Plans (`EXPLAIN ANALYZE`), and index optimization',
      problemAndRequirementsMarkdown: [
        '### First principles: Stop guessing which query is slow—measure total DB time!',
        'Imagine 1,000 endpoints calling Postgres. One query runs once an hour for 900ms; another query runs 4,000 times/minute for 25ms (`100,000 ms` per minute of total DB CPU!). Which one is killing your database? Both matter—so you need aggregate query stats (`pg_stat_statements` `5.7`) AND actual execution plans!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Finding & dissecting slow queries cleanly',
        '1. **Slow Query Identification**: Enable Postgres **`pg_stat_statements`** (rank queries by **`total_exec_time`**, `mean_exec_time`, and `calls`) and set `log_min_duration_statement = 200` (logs individual queries exceeding 200ms).',
        '2. **Reading Query Plans (`EXPLAIN (ANALYZE, BUFFERS)`)**: `EXPLAIN` alone only guesses costs! `EXPLAIN ANALYZE` *runs the query* and prints real row counts, execution time per node, and `BUFFERS` (pages read from RAM vs. disk!):',
        '   - Watch for **`Seq Scan` with huge `Rows Removed by Filter`** → missing index!',
        '   - Watch for **estimated `rows=1` vs. `actual rows=450000`** → stale table statistics (`ANALYZE`) causing Postgres to pick the wrong join algorithm!',
        '   - Watch for **`Sort Method: external merge Disk`** → `work_mem` too small or missing index order!',
        '3. **Index Optimization**: Add targeted **composite `(org_id, created_at DESC)`**, **partial (`WHERE deleted_at IS NULL`)**, or **covering (`INCLUDE (status)`)** indexes matching your exact `WHERE` + `ORDER BY` predicates (`4.4`)—and verify `BUFFERS` shared hits drop dramatically afterward!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Rank queries by total DB time via `pg_stat_statements`, inspect actual execution with `EXPLAIN (ANALYZE, BUFFERS)`, and match composite/partial/covering indexes to eliminate wasteful sequential scans.',
      codeExamples: [],
    },
    {
      id: 'topic-12.3.4',
      topicId: '12.3.4',
      coveredTopicIds: ['12.3.5'],
      title: 'Lock contention and connection pool tuning',
      problemAndRequirementsMarkdown: [
        '### First principles: Why queries with `0` index scans can STILL hang for 5 seconds—and why `pool: 500` makes Postgres slower!',
        '1. **Lock Contention**: Two hundred checkout workers all update the **same hot merchant row** (`UPDATE merchants SET balance = balance + $1 WHERE id = 1`) inside long 500ms transactions. Even with a primary-key index, query #2 through #200 **queue behind row lock #1** (`pg_locks` / `wait_event = Lock`)!',
        '2. **Oversized Connection Pools**: Thinking “bigger pool = faster,” an engineer sets `max: 100` connections per pod across 10 Node pods = **1,000 connections** hitting an 8-core Postgres server! Each Postgres connection forks an OS backend process fighting over 8 CPU cores via context switching and blowing RAM (`work_mem × 1000`)!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Tuning locks and pools properly',
        '1. **Eliminating Lock Contention**: Keep transactions **short and crisp** (zero external HTTP calls inside `BEGIN...COMMIT`!), lock rows in deterministic order (`5.3`), update hot counters asynchronously/batched, and always index foreign keys so child updates/deletes don’t lock parent tables longer than needed.',
        '2. **Connection Pool Tuning**: PostgreSQL runs fastest with a **surprisingly small number of active concurrent connections** (often ~`2 × CPU_cores + disk_spindles`, e.g., `15–40` total across your fleet, via app pool limits + **PgBouncer** transaction pooling in front of Postgres!). Monitor `pool.waitingCount` + `connectionTimeoutMillis` + `idleTimeoutMillis`!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Reduce lock contention by keeping transactions short and avoiding single-row hotspots, and size connection pools modestly (paired with PgBouncer) so Postgres doesn’t thrash across hundreds of idle/competing connections.',
      codeExamples: [],
    },
    {
      id: 'topic-12.3.6',
      topicId: '12.3.6',
      coveredTopicIds: ['12.3.7'],
      title: 'Eliminating N+1 queries and Query Batching',
      problemAndRequirementsMarkdown: [
        '### First principles: How 1 page load quietly triggers 101 SQL queries',
        'Look at innocent ORM/repo code loading 50 orders and their items:',
        '1. Query 1: `SELECT * FROM orders LIMIT 50` (takes `3 ms`).',
        '2. Loop `for (const o of orders)`: `await db.query("SELECT * FROM items WHERE order_id = $1", [o.id])` → **50 separate network round-trips!** Even if each fast indexed query takes `2 ms` over the VPC, `50 × 2ms = 100ms` wasted on pure network ping-pong—and for 500 orders, **1,001 queries = >1 second**!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Turning N+1 storms into 1–2 queries + Batching writes',
        '1. **Fixing N+1 Queries**: Replace the loop with either a single **`JOIN`** or **two clean bulk queries using `WHERE order_id = ANY($1::uuid[])`** (or DataLoader batching in GraphQL/services), then group items by `order_id` in memory in `< 0.1 ms`!',
        '2. **Query Batching (Reads & Bulk Writes)**: Instead of running 500 individual `INSERT INTO audit_logs VALUES (...)` round-trips inside a loop, batch them into **one multi-row `INSERT` or PostgreSQL `UNNEST($1::text[], $2::int[])`** statement—cutting 500 network round-trips down to **1**!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Eliminate N+1 round-trip loops using SQL `JOIN`s or `WHERE id = ANY($1)` bulk lookups, and batch repeated writes into single multi-row / `UNNEST` queries.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Systematic database profiling checklist',
    narrativeMarkdown: [
      'When Postgres latency climbs, inspect in this exact order from `12.3`:',
      '1. **Query Volume (`N+1` & Batching)**: Are endpoints issuing 100 tiny round-trips instead of 1–2 bulk `ANY($1)` / `UNNEST` queries?',
      '2. **Slowest Queries (`pg_stat_statements` + `EXPLAIN ANALYZE BUFFERS`)**: Fix `Seq Scan` and bad plans with targeted indexes.',
      '3. **Wait States & Concurrency (`pg_locks` + Pool Tuning)**: Shorten transactions blocking hot rows and keep total DB connections compact via PgBouncer/pool sizing.',
    ].join('\n\n'),
    integratedExample: {
      id: '12.3-integrated-example',
      title: 'DB Profiling Triage Order (Round-Trips -> Execution Plan -> Locks & Pool)',
      language: 'text',
      code: `1. Count Queries/Req  -> 101 queries for 1 page? -> Fix N+1 with JOIN / ANY($1) & batch writes!
2. Inspect Top SQL    -> pg_stat_statements + EXPLAIN (ANALYZE, BUFFERS) -> Add composite/partial index!
3. Check Waits & Pool -> pg_stat_activity wait_event='Lock' or pool.waitingCount high?
                         -> Shrink transactions & cap total DB connections (PgBouncer)!`,
    },
    walkthroughMarkdown:
      'Switch to the **Recipe** tab to inspect exact SQL diagnostics (`pg_stat_statements`, `EXPLAIN (ANALYZE, BUFFERS)`, lock waiter query), pool tuning, and `ANY($1)` / `UNNEST` batching code.',
  },
  questions: [
    {
      id: '12.3-kc-1',
      focusArea: 'Query Plans, Index Optimization & N+1',
      prompt:
        'What extra runtime proof does `EXPLAIN (ANALYZE, BUFFERS)` provide over plain `EXPLAIN`—and how do **N+1 query optimization** (`WHERE id = ANY($1)`) and **query batching (`UNNEST`)** speed up endpoints even when every individual SQL query is already indexed?',
      hints: [
        'Does `EXPLAIN` without `ANALYZE` actually execute the SQL or detect stale planner estimates and buffer disk reads?',
        'Think about network round-trip latency when running 200 tiny indexed queries inside a `for` loop.',
        '`EXPLAIN (ANALYZE, BUFFERS)` runs the query to reveal actual row counts vs estimates, real timing, and disk/buffer page hits; `ANY($1)` and `UNNEST` collapse hundreds of VPC network round-trips into 1–2 bulk SQL calls.',
      ],
      explanation:
        'Plain `EXPLAIN` only displays planner *guesses*; **`EXPLAIN (ANALYZE, BUFFERS)`** actually runs the query to expose real time per node, misestimated row counts (stale stats), and exact shared memory/disk buffer reads to guide **index optimization**. Meanwhile, eliminating **N+1 loops** with `ANY($1)` / `JOIN` and **batching writes** via `UNNEST` removes hundreds of sequential VPC network round-trips even when single queries are indexed.',
      evaluationCriteria: [
        'Contrasts estimated EXPLAIN vs actual runtime + buffer metrics in EXPLAIN (ANALYZE, BUFFERS)',
        'Explains eliminating network round-trips via N+1 bulk fetch and batched UNNEST writes',
      ],
      topicIds: ['12.3.1', '12.3.2', '12.3.3', '12.3.6', '12.3.7'],
    },
    {
      id: '12.3-kc-2',
      focusArea: 'Lock Contention & Connection Pool Tuning',
      prompt:
        'Why does increasing every Node container’s Postgres pool from `max: 10` to `max: 200` (across 10 pods = 2,000 connections) typically *hurt* Postgres performance—and how do you diagnose and reduce **lock contention**?',
      hints: [
        'What does Postgres allocate per active connection, and what happens when 1,000 backend processes fight for 8 CPU cores?',
        'Where do queries hang when 50 workers update the same row inside long transactions?',
        'Too many direct Postgres connections waste RAM and cause severe CPU context-switching thrashing (keep pools small + use PgBouncer); inspect `pg_stat_activity` / `pg_locks` and fix lock contention by keeping transactions tiny and removing row hotspots.',
      ],
      explanation:
        'Each PostgreSQL connection spawns a separate OS backend process consuming RAM and competing for CPU cores; thousands of active connections degrade throughput via CPU context switching and memory exhaustion. Keep application pools modest and sit **PgBouncer** (transaction pooling) in front of Postgres. For **lock contention**, inspect `pg_stat_activity` / `pg_locks` for blocking PIDs, keep transactions strictly short (no HTTP calls inside `BEGIN...COMMIT`), and eliminate shared hot-row updates.',
      evaluationCriteria: [
        'Explains Postgres per-connection process/RAM/context-switch thrashing and modest pool + PgBouncer sizing',
        'Explains inspecting blocked locks and shortening transactions / removing hot-row contention',
      ],
      topicIds: ['12.3.4', '12.3.5'],
    },
  ],
};

export const LESSON_12_3_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Identify and eliminate database bottlenecks in PostgreSQL + Node.js (`pg`): find top slow queries, inspect **`EXPLAIN (ANALYZE, BUFFERS)`**, detect **lock contention**, tune **`Pool` sizing**, fix **N+1 loops** with `ANY($1)`, and batch inserts with **`UNNEST`**.',
  whenToUseMarkdown:
    'Run these diagnostics whenever DB CPU climbs, `p99` SQL latency spikes, or endpoints fire excessive sequential queries.',
  setupCommands: [
    {
      id: '12.3-setup-1',
      label: 'Enable pg_stat_statements extension in PostgreSQL',
      command: 'psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"',
      notes: 'Tracks cumulative total execution time, call count, and buffer hits across all normalized SQL queries.',
    },
  ],
  coreApisMarkdown: [
    '- **`pg_stat_statements`**: Ranks queries by `total_exec_time` to target highest overall load (`12.3.1`).',
    '- **`EXPLAIN (ANALYZE, BUFFERS)`**: Reveals real node timings, `Seq Scan` vs `Index Scan`, and disk reads (`12.3.2`, `12.3.3`).',
    '- **`pg_stat_activity` + `pg_blocking_pids(pid)`**: Pinpoints exact transaction causing lock contention (`12.3.4`).',
    '- **`WHERE id = ANY($1)` & `INSERT ... SELECT * FROM UNNEST(...)`**: Fixes N+1 reads and batches writes (`12.3.6`, `12.3.7`).',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Inspect Slow Queries, Execution Plans, and Lock Waiters in SQL',
      detailMarkdown:
        'Run these three diagnostic SQL queries first (`12.3.1`, `12.3.2`, `12.3.4`) before guessing at optimizations.',
      code: {
        id: '12.3-step-1',
        title: 'PostgreSQL Slow Query, EXPLAIN ANALYZE, and Lock Contention diagnostics',
        language: 'sql',
        code: `-- 1. Top 10 heaviest queries by cumulative DB time (12.3.1)
SELECT round(total_exec_time::numeric, 1) AS total_ms,
       calls,
       round(mean_exec_time::numeric, 2) AS avg_ms,
       left(query, 100) AS sql_snippet
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- 2. Inspect actual plan, timing & buffer hits vs reads (12.3.2, 12.3.3)
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, total_cents FROM orders WHERE org_id = 'org_7' ORDER BY created_at DESC LIMIT 20;

-- 3. Detect live lock contention & who is blocking whom (12.3.4)
SELECT blocked.pid AS blocked_pid,
       pg_blocking_pids(blocked.pid) AS blocking_pids,
       now() - blocked.query_start AS wait_duration,
       blocked.query
FROM pg_stat_activity AS blocked
WHERE cardinality(pg_blocking_pids(blocked.pid)) > 0;`,
      },
    },
    {
      stepNumber: 2,
      title: 'Eliminate N+1 queries with `ANY($1)` and batch writes with `UNNEST`',
      detailMarkdown:
        'Collapse 50 loop queries into 1 bulk lookup (`12.3.6`) and insert arrays of rows in 1 parameterized round-trip (`12.3.7`).',
      code: {
        id: '12.3-step-2',
        title: 'src/db/batching.ts — N+1 elimination & UNNEST bulk insert',
        language: 'typescript',
        code: `import { Pool } from "pg";

// Fix N+1 (12.3.6): 2 queries total for 100 orders instead of 101 queries!
export async function listOrdersWithItems(pool: Pool, orgId: string) {
  const { rows: orders } = await pool.query(
    "SELECT id, status, total_cents FROM orders WHERE org_id = $1 ORDER BY created_at DESC LIMIT 50",
    [orgId]
  );
  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const { rows: items } = await pool.query(
    "SELECT order_id, sku, qty FROM order_items WHERE order_id = ANY($1::text[])",
    [orderIds]
  );

  const byOrder = new Map<string, any[]>();
  for (const item of items) {
    const list = byOrder.get(item.order_id) ?? [];
    list.push(item);
    byOrder.set(item.order_id, list);
  }
  return orders.map((o) => ({ ...o, items: byOrder.get(o.id) ?? [] }));
}

// Query Batching (12.3.7): Insert 500 items in 1 parameterized SQL round-trip!
export async function bulkInsertAuditLogs(
  pool: Pool,
  entries: Array<{ actorId: string; action: string }>
) {
  const actorIds = entries.map((e) => e.actorId);
  const actions = entries.map((e) => e.action);
  await pool.query(
    \`INSERT INTO audit_logs (actor_id, action)
     SELECT * FROM UNNEST($1::text[], $2::text[])\`,
    [actorIds, actions]
  );
}`,
      },
    },
    {
      stepNumber: 3,
      title: 'Tune Connection Pool bounds and statement timeouts safely',
      detailMarkdown:
        'Keep `max` compact per API container (`12.3.5`) so `pods × max` fits Postgres core capacity (or route through PgBouncer), and fail fast instead of hanging indefinitely.',
      code: {
        id: '12.3-step-3',
        title: 'Tuned pg.Pool configuration',
        language: 'typescript',
        code: `export const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 15,                        // Compact per-pod pool (avoid 1,000-conn thrashing!)
  idleTimeoutMillis: 30_000,      // Recycle idle connections cleanly
  connectionTimeoutMillis: 3_000, // Fail fast if pool saturates instead of hanging forever
  statement_timeout: 5_000,       // Abort runaway 60s queries automatically!
});`,
      },
    },
  ],
  workingExamples: [
    {
      id: '12.3-ex-index',
      title: 'Online zero-lock composite index creation matching query order (12.3.3)',
      language: 'sql',
      code: `-- Fixes Seq Scan + external Sort for: WHERE org_id = $1 ORDER BY created_at DESC LIMIT 20
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_org_created_desc
ON orders (org_id, created_at DESC);`,
      explanation:
        '`CONCURRENTLY` builds the index without blocking live `INSERT`/`UPDATE` writes, and `(org_id, created_at DESC)` lets Postgres satisfy both the filter and `LIMIT 20` sort in one index scan.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Running `EXPLAIN` without `ANALYZE` or inspecting slow queries only in an empty 10-row local database.',
      fix: 'On a 10-row table, Postgres always picks `Seq Scan`! Always run `EXPLAIN (ANALYZE, BUFFERS)` against production-sized data.',
    },
    {
      mistake: 'Creating indexes with `CREATE INDEX` (without `CONCURRENTLY`) on busy production tables.',
      fix: 'Standard `CREATE INDEX` acquires a `SHARE` lock blocking all table writes until finished; always add `CONCURRENTLY` in production.',
    },
    {
      mistake: 'Setting `pool.max: 100` on 10 Node pods (`1,000` DB connections).',
      fix: 'Keep per-pod pools small (`10–20`) and use PgBouncer in transaction pooling mode when scaling horizontally.',
    },
  ],
  exercise: {
    id: '12.3-ex',
    title: 'Diagnose & Optimize an N+1 Endpoint and Slow Query Plan',
    instructionsMarkdown:
      'Given an endpoint looping `SELECT * FROM invoices WHERE customer_id = $1` across 100 customers and an unindexed `WHERE status = $1 ORDER BY updated_at DESC` query:\n1. Refactor the N+1 loop using `WHERE customer_id = ANY($1)`.\n2. Write the `CREATE INDEX CONCURRENTLY` statement to eliminate the `Seq Scan` + Sort.\n3. Add a `pg.Pool` config with tuned `max`, `connectionTimeoutMillis`, and `statement_timeout`, plus a bulk `UNNEST` insert helper.',
    acceptanceChecklist: [
      'Replaces N+1 loop with bulk ANY($1) query + in-memory Map grouping',
      'Uses EXPLAIN (ANALYZE, BUFFERS) reasoning and CREATE INDEX CONCURRENTLY',
      'Configures compact pg.Pool bounds + timeouts and UNNEST batch inserts',
      'Documents pg_stat_statements and pg_blocking_pids lock inspection',
    ],
  },
};
