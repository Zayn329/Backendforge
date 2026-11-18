import { FptLessonContent, RecipeLessonContent } from '../types';

export const LESSON_9_1: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Up to now, every endpoint we built followed a neat single loop: client sends HTTP request → backend executes everything synchronously → backend returns `200 OK`. That feels simple right up until a customer clicks **"Export 50,000-row CSV"**, **"Process Uploaded 4K Video"**, or **"Send Welcome Email + Sync CRM"**—and your HTTP handler sits there waiting for 45 seconds!',
      'In this unit, we’ll derive **why synchronous request-response breaks** for slow work: **request-response execution**, **long-running operations**, **request timeouts**, **why blocking users is problematic**, **asynchronous execution**, and **task delegation**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Knowing what belongs inside an HTTP request (< 200ms) versus what must be handed off to background processing prevents browser timeouts, server worker exhaustion, and brittle user flows.',
    prerequisites: [
      {
        subBlockId: '3.2',
        label: 'HTTP Request Lifecycle (3.2)',
        detail: 'Knowing how HTTP servers hold open TCP sockets and connection resources per active request.',
      },
      {
        subBlockId: '5.5',
        label: 'Async Side Effects & Outbox Reliability (5.5)',
        detail: 'Having seen why external HTTP/SMTP calls shouldn’t sit inside database transactions.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-9.1.1',
      topicId: '9.1.1',
      coveredTopicIds: ['9.1.2', '9.1.3', '9.1.4'],
      title: 'Request-response limits: long-running operations, timeouts, and why blocking users breaks systems',
      problemAndRequirementsMarkdown: [
        '### First principles: What happens when a 30-second job runs inside `POST /reports`?',
        'Imagine 200 users click **“Generate Annual PDF”** at 9:00 AM, and each PDF takes 25 seconds of CPU + database work right inside the HTTP request handler:',
        '1. **Request Timeouts**: Browsers, Cloudflare, Nginx, and AWS Load Balancers enforce strict idle timeouts (often **30s or 60s**). At second 30, the load balancer cuts the connection and sends `504 Gateway Timeout`—**even though your backend is still burning CPU finishing the PDF!** Worse, the user clicks “Retry” three times, starting 4 identical heavy PDF builds!',
        '2. **Why Blocking Users Is Problematic**: Holding open HTTP connections pins server RAM, file descriptors, and database pool slots for tens of seconds, starving fast `GET /login` or `GET /orders` requests trying to share the same backend!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Deriving the boundary between inline work and background work',
        'Notice the pattern of **Request-Response Execution**: HTTP works best when a request finishes quickly (typically `< 300 ms`) and returns a clear immediate answer.',
        'Any **Long-Running Operation**—sending emails, resizing images, transcoding video, generating big CSV/PDF reports, calling slow third-party webhooks, or syncing thousands of records—has two fatal mismatches with synchronous HTTP:',
        '- Its completion time exceeds proxy/client patience and timeout limits.',
        '- Failure mid-way leaves the caller staring at an error screen with no automatic retry!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Synchronous request-response HTTP hits hard proxy timeouts, wastes server concurrency/DB connections, and ruins UX whenever slow I/O or heavy processing runs inline.',
      codeExamples: [],
    },
    {
      id: 'topic-9.1.5',
      topicId: '9.1.5',
      coveredTopicIds: ['9.1.6'],
      title: 'Asynchronous execution and task delegation (`202 Accepted`)',
      problemAndRequirementsMarkdown: [
        '### First principles: How do you tell a user "We got it—we’re on it!" safely?',
        'Notice what the user *actually* needs immediately when clicking “Export Annual Report”: they don’t need the 50 MB file inside the HTTP response 20 milliseconds later. They just need **instant confirmation** that their job was accepted safely, plus a way to get the result when it’s done!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Task Delegation: Decoupling acceptance from execution',
        '1. **Asynchronous Execution & Task Delegation**: Instead of doing the 25-second work inside the API request, your API controller **delegates the task** in ~5 milliseconds:',
        '   - Create a durable job record (`jobId: "job_841", status: "queued"`).',
        '   - Push `{ jobId: "job_841", reportId }` onto a durable queue (`9.2`).',
        '   - Return **`202 Accepted`** immediately with `{ jobId: "job_841", statusUrl: "/jobs/job_841" }`!',
        '2. **What happens next?**: Separate background worker processes pick up `job_841` asynchronously without any HTTP timeout clock ticking—and update `status` to `"completed"` (with a download URL) or `"failed"` when finished. Meanwhile, your HTTP API stays snappy at `< 20 ms` even under spikes!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Delegate slow or unreliable work off the HTTP path: enqueue a durable task, reply immediately with `202 Accepted` + job handle, and let decoupled background workers execute asynchronously.',
      codeExamples: [
        {
          snippet: {
            id: '9.1-202-delegation',
            title: 'Delegating a slow report export instead of blocking HTTP',
            language: 'typescript',
            code: `// BEFORE (Blocks HTTP for 25s -> 504 Gateway Timeout!)
app.post("/exports", async (req, res) => {
  const csvBuffer = await build50kRowReport(req.user.orgId);
  res.send(csvBuffer);
});

// AFTER (Fast 5ms Task Delegation -> 202 Accepted!)
app.post("/exports", async (req, res) => {
  const job = await exportJobs.createAndEnqueue({
    orgId: req.user.orgId,
    requestedBy: req.user.id,
  });
  res.status(202).json({
    jobId: job.id,
    status: "queued",
    pollUrl: \`/exports/\${job.id}\`,
  });
});`,
          },
          lineByLineMarkdown:
            '- `202 Accepted` tells the client truthfully: *“Request accepted for processing, not yet completed.”*\n- Your HTTP thread and DB pool free up in milliseconds while the worker processes the heavy export reliably.',
        },
      ],
    },
  ],
  conceptConnection: {
    title: 'Choosing Sync vs. Async Delegation at the HTTP boundary',
    narrativeMarkdown: [
      'Whenever designing a new endpoint, run one quick diagnostic question across `9.1`:',
      '- Does the client **need the computed output right now** and can we reliably finish in **< 300ms**? → Run synchronously (`200` / `201`).',
      '- Does it talk to slow external APIs, crunch large files, or fan out to many items? → **Delegate asynchronously** (`202 Accepted`) to background workers so timeouts and traffic spikes never bring down your API!',
    ].join('\n\n'),
    integratedExample: {
      id: '9.1-integrated-example',
      title: 'Synchronous Blocking vs. Asynchronous Task Delegation',
      language: 'text',
      code: `Synchronous (Fragile for slow work):
  [Client] ──POST /export──▶ [API Server] ──(25s CPU + DB lock)──X [LB 504 Timeout!]

Asynchronous Task Delegation:
  [Client] ──POST /export──▶ [API Server] ──enqueue──▶ [Job Queue]
           ◀──202 {jobId}──                              │
                                                         ▼
                                                 [Background Worker] (No HTTP timeout!)`,
    },
    walkthroughMarkdown:
      'In `9.2`, we’ll look inside that `[Job Queue]` and `[Background Worker]` to understand Producers, Consumers, and Worker lifecycles.',
  },
  questions: [
    {
      id: '9.1-kc-1',
      focusArea: 'Sync Limitations & Timeouts',
      prompt:
        'Suppose your `POST /invoices/monthly-pdf` handler generates 500 PDFs inline and takes 45 seconds. Beyond making the user stare at a spinner, what **two system failures** occur when a load balancer times out at 30 seconds?',
      hints: [
        'Does the backend process stop automatically when the load balancer sends `504` to the browser? And what does the frustrated user usually do?',
        'Think also about what happens to your server’s limited memory/DB pool slots if 100 users trigger 45-second handlers together.',
        'The backend keeps burning CPU/RAM after the 504 (while retries multiply duplicate work), and long-held requests exhaust connection pools/workers, starving unrelated fast endpoints.',
      ],
      explanation:
        'First, a proxy **request timeout (`504`)** cuts the client socket *without* stopping the work already running on your server—and users hitting refresh/retry spawn duplicate heavy jobs. Second, holding slow **long-running operations** on the request path ties up HTTP workers, RAM, and DB connections, starving fast endpoints across the whole backend.',
      evaluationCriteria: [
        'Identifies orphaned/duplicate work caused by proxy timeouts and user retries',
        'Explains resource/connection starvation of fast endpoints due to blocked HTTP workers',
      ],
      topicIds: ['9.1.1', '9.1.2', '9.1.3', '9.1.4'],
    },
    {
      id: '9.1-kc-2',
      focusArea: 'Task Delegation & Async Execution',
      prompt:
        'How does **task delegation** fix the PDF export endpoint—and why is HTTP **`202 Accepted`** more accurate than `200 OK` or `201 Created` here?',
      hints: [
        'What does the HTTP handler save/enqueue in ~5ms, and what HTTP status code means "accepted for later processing"?',
        'How does the client eventually learn the PDF is ready?',
        'The API persists a queued job record, pushes a message onto a queue, and returns `202 Accepted` with a `jobId`/status URL (`202` means accepted, not finished), freeing the HTTP path while workers process asynchronously.',
      ],
      explanation:
        'With **task delegation**, the API records the job, enqueues a task, and responds within milliseconds using **`202 Accepted`** plus a `jobId` / polling URL (or later WebSocket/SSE notification). `202` accurately communicates that processing has started asynchronously rather than already completing (`200`), letting workers run outside HTTP timeout limits.',
      evaluationCriteria: [
        'Describes persisting/enqueuing the job and offloading execution to workers',
        'Explains why 202 Accepted accurately models asynchronous acceptance',
      ],
      topicIds: ['9.1.5', '9.1.6'],
    },
  ],
};

export const LESSON_9_2: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'In `9.1`, we decided to kick slow tasks off the HTTP thread and return `202 Accepted`. Wait—*how* does that work actually reach a background process safely? If you just call `sendWelcomeEmail(user)` without `await` inside your API server (fire-and-forget), what happens if the server crashes 10 milliseconds later, or 5,000 users sign up at once and overwhelm your single API container’s RAM?',
      'In this unit, we’ll examine **Producer-Consumer Architecture** from first principles: **Producers**, **Consumers**, **Messages**, **Queues**, the **Queue lifecycle**, **Worker architecture**, **scaling multiple workers**, and **job state management**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'A queue acts as a durable shock absorber between bursty user requests and steady background workers—preventing data loss on crashes and letting you scale workers independently from your web API.',
    prerequisites: [
      {
        subBlockId: '9.1',
        label: 'Task delegation & async execution (9.1)',
        detail: 'Knowing why background tasks are decoupled from HTTP request lifecycles.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-9.2.1',
      topicId: '9.2.1',
      coveredTopicIds: ['9.2.2', '9.2.3', '9.2.4', '9.2.5'],
      title: 'Producers, Consumers, Messages, Queues, and the Queue Lifecycle',
      problemAndRequirementsMarkdown: [
        '### First principles: Why fire-and-forget inside Node.js (`void sendEmail()`) loses work',
        'Suppose 1,000 users import large CSVs at 9:01 AM, and you run `processCsv()` unawaited in memory inside Express. Three disasters strike immediately:',
        '1. All 1,000 jobs fight for the *same* API CPU/RAM, crashing your API with Out-Of-Memory—**and every in-flight unawaited promise vanishes forever!**',
        '2. If downstream SendGrid is down for 2 minutes, an in-memory promise has nowhere durable to wait and retry.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The four building blocks and how a Queue flows',
        '1. **Producer**: Any service (usually your HTTP API or cron scheduler) that creates and enqueues work requests—without running the heavy work itself.',
        '2. **Message (Job Payload)**: A small, serializable JSON description of *what* needs doing (e.g., `{ "type": "export.csv", "jobId": "j_91", "orgId": "o_7" }`). **Tip**: Pass IDs, not massive 10 MB blobs, inside messages!',
        '3. **Queue**: A durable **FIFO / prioritized buffer** (backed by Redis like BullMQ, RabbitMQ, AWS SQS, or Postgres) sitting *between* Producer and Consumer. It absorbs traffic spikes so 10,000 sudden requests sit safely queued instead of melting workers.',
        '4. **Consumer (Worker)**: A separate background process pulling messages from the queue, executing the task, and reporting completion.',
        '5. **Queue Lifecycle** *(critical so crashes don’t lose jobs!)*:',
        '   - **Enqueue**: Producer pushes message → stored durably as `waiting`.',
        '   - **Lease / Visibility Timeout (`active`)**: Worker pulls message. **Crucial rule**: The queue does NOT delete the message yet! It hides/leases it to that worker for e.g. 60 seconds.',
        '   - **Ack (`completed`) or Nack/Timeout (`re-queued`)**: Only when the worker finishes successfully and sends an **ACK** does the queue remove the job. If the worker crashes mid-job, the lease expires and the queue automatically makes the job visible again for another worker!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Producers enqueue lightweight JSON Messages onto a durable Queue acting as a buffer, and Consumers hold temporary leases until sending an explicit ACK after finishing.',
      codeExamples: [],
    },
    {
      id: 'topic-9.2.6',
      topicId: '9.2.6',
      coveredTopicIds: ['9.2.7', '9.2.8'],
      title: 'Worker architecture, scaling multiple workers, and job state management',
      problemAndRequirementsMarkdown: [
        '### First principles: One queue, 10,000 waiting jobs—how do we scale and tell users progress?',
        'When your queue backs up during peak hours, you want to launch **5 or 20 worker processes** pulling from the same queue concurrently without two workers accidentally grabbing the *same* job. Meanwhile, your frontend is polling `GET /jobs/j_91` asking *“Is it queued, 60% done, completed, or failed?”*',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Scaling workers & tracking job state cleanly',
        '1. **Worker Architecture & Competing Consumers**: Run workers as **separate OS processes/containers** from your HTTP API (`node dist/worker.js`) so heavy CPU/memory jobs never lag HTTP responses. Each worker configures explicit **concurrency** (e.g., process up to `5` I/O jobs concurrently, or `1` heavy video job at a time).',
        '2. **Multiple Workers (Horizontal Scaling)**: Because the queue grants **atomic exclusive leases** (competing consumers pattern), spinning up 10 worker containers immediately multiplies throughput 10x—each worker pulls distinct waiting messages without stepping on siblings.',
        '3. **Job State Management**: Maintain explicit states (`waiting` → `active` → `completed` | `failed` | `delayed`)—plus optional `progress` percentage (`0..100`) and `resultUrl` / `errorReason` in Redis or a `jobs` PostgreSQL table so `GET /jobs/:id` gives callers crisp status visibility.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Run isolated worker processes competing atomically on one shared queue for effortless horizontal scaling, while tracking clear job states (`waiting`, `active`, `completed`, `failed`) for caller visibility.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Producer-Consumer shock absorber in action',
    narrativeMarkdown: [
      'Watch how `9.2` separates burst absorption from steady processing:',
      '- **Spike**: 5,000 users click Export in 10 seconds → API **Producers** push lightweight **Messages** (`{ jobId }`) into the **Queue** (`waiting`). API latency stays `< 20ms`.',
      '- **Steady Processing**: 4 independent **Worker** containers lease jobs atomically (`active`), update progress, ACK on completion (`completed`), and let a fifth worker spin up cleanly if queue depth climbs.',
    ].join('\n\n'),
    integratedExample: {
      id: '9.2-integrated-example',
      title: 'Competing-Consumers Queue Lifecycle & State Transitions',
      language: 'text',
      code: `[API Producer] ──enqueue {jobId}──▶ [Durable Queue: waiting]
                                           │
              ┌────────────────────────────┴────────────────────────────┐
              ▼ (atomic lease, 60s visibility timeout)                  ▼
        [Worker #1 (active)]                                     [Worker #2 (active)]
          ├─► Success? -> ACK -> state: "completed"                └─► Crash mid-job?
          └─► Error?   -> NACK / Retry                                 Lease expires -> back to "waiting"!`,
    },
    walkthroughMarkdown:
      'In `9.3`, we’ll handle the messy real world inside those workers: retries with exponential backoff, duplicate deliveries, idempotency, dead-letter queues, and graceful worker shutdown.',
  },
  questions: [
    {
      id: '9.2-kc-1',
      focusArea: 'Queue Lifecycle & Durability',
      prompt:
        'Why shouldn’t a queue delete a message the instant a **Consumer (worker)** pops it off the queue—and how do **leases (visibility timeouts)** + **ACKs** protect against worker crashes?',
      hints: [
        'Suppose Worker #1 pops `{ jobId: 42 }`, the queue deletes it immediately, and 2 seconds later Worker #1’s container runs out of memory.',
        'How does the queue know Worker #1 actually *finished* job 42?',
        'If deleted on pop, a worker crash loses the job forever; instead, the queue places an invisible lease/visibility timeout until the worker explicitly ACKs completion—returning the job to `waiting` if the worker dies.',
      ],
      explanation:
        'If a queue deleted messages upon delivery, any worker crash, OOM kill, or deployment restart mid-job would permanently lose that work. Using a **lease / visibility timeout**, the queue hides the message only temporarily (`active`) while the worker processes it and deletes it **only upon explicit `ACK`**. If the worker crashes, the lease expires and another worker re-claims the message.',
      evaluationCriteria: [
        'Explains job loss if removed before processing completes',
        'Explains lease/visibility timeout + explicit ACK recovery on worker crash',
      ],
      topicIds: ['9.2.1', '9.2.2', '9.2.3', '9.2.4', '9.2.5'],
    },
    {
      id: '9.2-kc-2',
      focusArea: 'Workers, Scaling & Job State',
      prompt:
        'Why should **workers** run in separate processes from your HTTP API—and why do queue messages normally carry compact IDs (`{ jobId, orderId }`) rather than large 5 MB payloads while storing **job state** separately?',
      hints: [
        'Think about CPU/memory spikes in heavy jobs affecting HTTP event-loop latency (`3.2` / `9.1`).',
        'Think about Redis/queue memory limits and letting multiple workers scale cleanly.',
        'Isolating workers keeps heavy jobs from freezing HTTP APIs and lets workers scale horizontally; keeping messages small prevents blowing queue RAM while a `jobs` store tracks state/progress cleanly.',
      ],
      explanation:
        'Running **workers** in separate containers protects HTTP API latency from heavy CPU/RAM spikes and lets you scale worker replicas independently via competing consumers. Passing compact IDs inside **Messages** avoids exhausting Redis/broker memory (while avoiding stale snapshots), and tracking explicit **job states** (`waiting` → `active` → `completed` / `failed`) gives clients reliable progress queries.',
      evaluationCriteria: [
        'Explains process isolation and independent horizontal scaling of multiple workers',
        'Explains lightweight messages + explicit job state management',
      ],
      topicIds: ['9.2.6', '9.2.7', '9.2.8'],
    },
  ],
};

export const LESSON_9_3_FPT: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'A naive queue worker works cleanly until Tuesday afternoon when Stripe blips for 4 seconds, one malformed payload throws `TypeError` forever in an infinite retry loop, and a worker gets restarted mid-email so the customer receives **three** welcome emails!',
      'In this unit, we’ll examine **Job Reliability** from first principles: **job retries & exponential backoff**, **duplicate execution & idempotency**, **dead-letter queues**, **prioritization**, **delayed & scheduled jobs**, **failed job recovery**, and **graceful worker shutdown**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Distributed queues almost always guarantee *at-least-once* delivery—meaning duplicates and transient errors are normal, not edge cases. Reliability engineering turns those messy failures into predictable self-healing pipelines.',
    prerequisites: [
      {
        subBlockId: '9.2',
        label: 'Producer-Consumer Queue Lifecycle (9.2)',
        detail: 'Understanding worker leases, ACKs, and re-queueing on crash.',
      },
      {
        subBlockId: '5.4',
        label: 'Idempotency fundamentals (5.4)',
        detail: 'Making repeated operations safe using unique keys and atomic state checks.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-9.3.1',
      topicId: '9.3.1',
      coveredTopicIds: ['9.3.2', '9.3.3', '9.3.4'],
      title: 'Retries, exponential backoff, duplicate execution, and idempotency',
      problemAndRequirementsMarkdown: [
        '### First principles: Why naive immediate retries cause self-inflicted outages—and why jobs WILL run twice',
        'Two hard truths hit every queue worker:',
        '1. **Immediate retry storms**: Suppose SendGrid slows down and fails 2,000 email jobs. If every worker immediately retries failed jobs every 0ms, you just launched a **2,000 req/sec DDoS attack** on an already struggling SendGrid—preventing it from ever recovering!',
        '2. **Duplicate Execution**: Remember `9.2`’s lease timeout? Suppose Worker A takes 65 seconds to charge a card (lease was 60s), finishes charging, and crashes *one millisecond before sending ACK*! The queue thinks Worker A died and hands the exact same job to Worker B—**who runs it a second time!**',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Taming retries and duplicates safely',
        '1. **Job Retries & Exponential Backoff (+ Jitter)**: Retry transient failures up to a bounded `maxAttempts` (e.g., 5 tries) while doubling wait time between attempts (`2s → 4s → 8s → 16s → 32s`) plus small **random jitter**. Backoff gives downstream services breathing room, and jitter prevents 2,000 jobs from waking up at the exact same millisecond!',
        '2. **Duplicate Execution & Worker Idempotency**: Because queues deliver **at-least-once**, design every job handler to be **idempotent** (`5.4`):',
        '   - Check an atomic state transition or unique `processed_jobs(job_id)` / `idempotency_key` inside Postgres *before* executing side effects, AND pass the same `idempotencyKey` to Stripe/APIs.',
        '   - If Worker B receives a duplicate delivery, it sees `"already completed"` and ACKs cleanly without double-charging or double-emailing!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Space out bounded retries with exponential backoff + jitter to prevent retry storms, and make every job handler idempotent because at-least-once queues inevitably deliver duplicates.',
      codeExamples: [],
    },
    {
      id: 'topic-9.3.5',
      topicId: '9.3.5',
      coveredTopicIds: ['9.3.6', '9.3.7', '9.3.8'],
      title: 'Dead-letter queues, prioritization, delayed jobs, and scheduled jobs',
      problemAndRequirementsMarkdown: [
        '### First principles: Poison pills, VIP traffic, and future time',
        '- **Poison Pill**: One job has corrupt JSON or references a deleted customer. No matter how many times you retry it—5 times or 50,000 times—it will fail forever, clogging workers if kept in the main queue!',
        '- **Head-of-line blocking**: 50,000 bulk nightly analytics emails sit in the queue right ahead of 1 urgent `"Reset Your Password"` email!',
        '- **Future work**: Wait 3 days after signup to send a trial-ending reminder, or aggregate invoices every night at `02:00 UTC`.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Four queue controls for real production workloads',
        '1. **Dead-Letter Queues (DLQ)**: Once a job exhausts `maxAttempts` (or hits a permanent non-retryable validation error), move it out of the main queue into a **Dead-Letter Queue** with its full error stack and payload. Your main queue keeps flowing cleanly while engineers inspect the DLQ!',
        '2. **Job Prioritization**: Separate critical low-latency traffic (`critical`: password resets, OTPs) from bulk work (`low`: nightly reports) via **separate priority queues** or weighted priority lanes so bulk spikes never delay password resets.',
        '3. **Delayed Jobs**: Enqueue a one-off job with a `delay` (*“Run trial-reminder check 72 hours from now”*).',
        '4. **Scheduled (Cron / Repeatable) Jobs**: Run recurring jobs on a cron schedule (*“Every night at `02:00 UTC`, sweep expired sessions”*)—always storing a single deduplicated schedule key so running 5 worker replicas doesn’t trigger the cron 5 times!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Route permanently failing poison-pill jobs to a Dead-Letter Queue, isolate latency-sensitive work with priority queues, and use delayed/scheduled queues for time-based jobs.',
      codeExamples: [],
    },
    {
      id: 'topic-9.3.9',
      topicId: '9.3.9',
      coveredTopicIds: ['9.3.10'],
      title: 'Failed job recovery and graceful worker shutdown',
      problemAndRequirementsMarkdown: [
        '### First principles: Fixing the bug and safely deploying new worker code',
        'Two operational moments test every background system:',
        '1. A deploy had a bug that sent 400 valid jobs into the Dead-Letter Queue before you reverted it. Now those 400 customers still need their invoices emailed!',
        '2. You deploy `worker:v2` while `worker:v1` is halfway through processing a 12-second video thumbnail job.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Recovering DLQ jobs & shutting down workers cleanly',
        '1. **Failed Job Recovery (DLQ Replay)**: After fixing the root bug (or corrupt payload), inspect DLQ items and **replay/re-enqueue** them back into the main queue safely—which works seamlessly *because* handlers are idempotent!',
        '2. **Graceful Worker Shutdown (`SIGTERM`)**: Just like HTTP servers (`8.5`), when `SIGTERM` arrives, a worker must:',
        '   - Immediately **stop fetching new jobs** from the queue (`worker.pause()` / `worker.close()`).',
        '   - **Wait for currently running jobs to finish** and ACK them cleanly (so you don’t waste 10 seconds of work or wait for slow visibility timeouts!).',
        '   - Close Redis & Postgres connections before exiting `0`!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Enable safe DLQ inspection and replay after root-cause fixes, and handle worker `SIGTERM` by pausing new pulls while letting active jobs complete and ACK cleanly.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Lifecycle of a resilient background job from enqueue to recovery',
    narrativeMarkdown: [
      'Every piece of `9.3` guards one phase of job execution:',
      '- **Scheduling & Lanes**: **Prioritization** keeps OTPs fast; **delayed/scheduled** queues trigger future/cron work.',
      '- **Execution**: **Idempotency** defends against **duplicate execution**; **exponential backoff + jitter** handles transient failures.',
      '- **Faults & Deploys**: **DLQs** isolate poison pills for **failed job recovery** replay; **graceful shutdown** finishes in-flight jobs cleanly during deploys.',
    ].join('\n\n'),
    integratedExample: {
      id: '9.3-integrated-example',
      title: 'Job Reliability State Machine',
      language: 'text',
      code: `[Queue (Priority / Delayed / Cron)]
        │
        ▼ (Worker picks job -> Checks Idempotency Key!)
   [Execute Handler]
     ├── Success -----------------> ACK -> Completed!
     ├── Transient Failure -------> Attempt < 5? -> Retry w/ Exponential Backoff + Jitter
     └── Exhausted / Poison Pill -> Move to [Dead-Letter Queue (DLQ)]
                                               └── (Fix bug) -> Replay back to Queue!`,
    },
    walkthroughMarkdown:
      'Switch to the **Recipe** tab to implement a complete BullMQ + Redis worker featuring exponential backoff, idempotent execution, Dead-Letter capture, delayed/scheduled jobs, and graceful `SIGTERM` shutdown.',
  },
  questions: [
    {
      id: '9.3-kc-1',
      focusArea: 'Backoff, Duplicates & Idempotency',
      prompt:
        'Why do background workers combine **exponential backoff with jitter** on retries—and why must handlers remain **idempotent** even when you never click "retry" manually?',
      hints: [
        'What happens if 1,000 jobs fail at 10:00:00 and all schedule retry at 10:00:05 sharp?',
        'Think about what happens if a worker succeeds right before its queue lease expires or before sending ACK.',
        'Backoff + jitter spreads retries out so recovering downstream APIs aren’t hammered synchronously; at-least-once queues can re-deliver jobs after lease expiry/crashes, requiring idempotency to prevent duplicate side effects.',
      ],
      explanation:
        'Immediate or synchronized retries create **thundering-herd retry storms** against struggling dependencies; **exponential backoff + random jitter** spreads load over widening intervals. Even without manual retries, at-least-once queues re-deliver jobs whenever a worker crashes pre-ACK or exceeds its visibility lease, so **idempotency** ensures duplicate runs never double-charge or double-send.',
      evaluationCriteria: [
        'Explains retry storm prevention via exponential backoff + jitter',
        'Connects at-least-once lease re-delivery to mandatory handler idempotency',
      ],
      topicIds: ['9.3.1', '9.3.2', '9.3.3', '9.3.4'],
    },
    {
      id: '9.3-kc-2',
      focusArea: 'DLQ, Prioritization & Graceful Shutdown',
      prompt:
        'How does a **Dead-Letter Queue (DLQ)** protect main queue throughput, why use separate queues for **job prioritization**, and what steps run inside **graceful worker shutdown**?',
      hints: [
        'What happens if one permanently malformed "poison pill" job stays in the active queue retrying forever?',
        'Compare a password-reset job stuck behind 50,000 newsletter jobs vs. separate lanes; then trace `SIGTERM` on an active worker.',
        'DLQs quarantine exhausted/permanent failures for inspection and replay; separate priority lanes stop bulk jobs from starving urgent ones; graceful shutdown stops pulling new jobs, lets active jobs finish & ACK, then closes Redis/DB.',
      ],
      explanation:
        'Moving poison-pill jobs to a **DLQ** after `maxAttempts` prevents endless retries from wasting worker capacity while preserving payloads for post-fix **failed job recovery**. Separate **priority queues** prevent massive bulk batches from delaying urgent OTP/auth jobs. On `SIGTERM`, **graceful worker shutdown** stops claiming new jobs, waits for active jobs to finish and ACK, and cleanly closes Redis/DB clients.',
      evaluationCriteria: [
        'Explains DLQ quarantine + safe post-fix replay',
        'Explains priority lanes and zero-loss graceful shutdown sequence',
      ],
      topicIds: ['9.3.5', '9.3.6', '9.3.7', '9.3.8', '9.3.9', '9.3.10'],
    },
  ],
};

export const LESSON_9_3_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Implement resilient Redis-backed background job queues with **BullMQ**: bounded retries with **exponential backoff**, **idempotent job processing**, **Dead-Letter retention & replay**, **prioritization**, **delayed & scheduled jobs**, and **graceful worker shutdown**.',
  whenToUseMarkdown:
    'Use this pattern whenever running reliable asynchronous jobs (emails, webhooks, billing sync, media processing) in Node.js.',
  setupCommands: [
    {
      id: '9.3-setup-1',
      label: 'Install BullMQ and ioredis',
      command: 'npm install bullmq ioredis',
      notes: 'BullMQ requires Redis `maxmemory-policy noeviction` so Redis never silently drops queued job keys.',
    },
  ],
  coreApisMarkdown: [
    '- **`new Queue(name, { connection, defaultJobOptions })`**: Enqueues jobs with `attempts` + `backoff: { type: "exponential", delay: 2000 }` and `removeOnFail: false` (retaining failed jobs as DLQ).',
    '- **`queue.add(name, data, { jobId, priority, delay })`**: Enforces producer-side deduplication (`jobId`), priority ranking, or future delay (`9.3.6`, `9.3.7`).',
    '- **`queue.upsertJobScheduler(...)`**: Registers deduplicated cron-scheduled jobs across multiple workers (`9.3.8`).',
    '- **`await worker.close()`**: Pauses new pickups and waits for currently executing jobs to finish before closing Redis (`9.3.10`).',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Configure Queue defaults with Exponential Backoff and Failed-Job Retention (DLQ)',
      detailMarkdown:
        'Keep `removeOnFail: false` (or move exhausted jobs to an explicit `dlq` queue) so permanent failures stay inspectable and replayable (`9.3.1`, `9.3.2`, `9.3.5`).',
      code: {
        id: '9.3-step-1',
        title: 'src/jobs/queues.ts — Queues, Backoff, Priority, Delayed & Cron Setup',
        language: 'typescript',
        code: `import { Queue } from "bullmq";
import Redis from "ioredis";

export const redisConn = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

export const emailQueue = new Queue("emails", {
  connection: redisConn,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 2000 }, // 2s, 4s, 8s, 16s, 32s (9.3.2)
    removeOnComplete: { count: 1000 },
    removeOnFail: false, // Retain exhausted jobs in Failed/DLQ state for inspection (9.3.5)
  },
});

// High-priority password reset (9.3.6) + deduplicated jobId
export async function enqueueResetEmail(userId: string, requestId: string) {
  await emailQueue.add("password_reset", { userId, requestId }, {
    priority: 1,
    jobId: \`reset:\${requestId}\`,
  });
}

// Delayed job: run 72 hours later (9.3.7)
export async function scheduleTrialReminder(userId: string) {
  await emailQueue.add("trial_reminder", { userId }, {
    delay: 72 * 60 * 60 * 1000,
    jobId: \`trial_reminder:\${userId}\`,
  });
}

// Scheduled recurring cron job deduplicated safely across all replicas (9.3.8)
export async function registerNightlySweep() {
  await emailQueue.upsertJobScheduler("nightly-digest", { pattern: "0 2 * * *" }, {
    name: "send_daily_digest",
    data: {},
  });
}`,
      },
    },
    {
      stepNumber: 2,
      title: 'Build an Idempotent Worker + DLQ routing + Graceful Shutdown',
      detailMarkdown:
        'Check idempotency before running side effects (`9.3.4`), distinguish permanent vs. retryable errors (`UnrecoverableError`), and drain cleanly on `SIGTERM` (`9.3.10`).',
      code: {
        id: '9.3-step-2',
        title: 'src/jobs/emailWorker.ts — Idempotent worker + DLQ + graceful SIGTERM',
        language: 'typescript',
        code: `import { Worker, UnrecoverableError, Queue } from "bullmq";
import { redisConn } from "./queues";

const deadLetterQueue = new Queue("emails-dlq", { connection: redisConn });

export const emailWorker = new Worker(
  "emails",
  async (job) => {
    // 1. Validate payload; permanent bad payloads skip pointless retries -> DLQ!
    if (!job.data.userId) {
      throw new UnrecoverableError("Missing userId in payload");
    }

    // 2. Idempotency check (9.3.3, 9.3.4): skip if already processed in DB/Redis
    const claimed = await redisConn.set(\`done:\${job.id}\`, "1", "EX", 86400, "NX");
    if (!claimed) return { skippedDuplicate: true };

    await sendActualEmail(job.data);
  },
  { connection: redisConn, concurrency: 10 }
);

// Route exhausted jobs into an explicit Dead-Letter Queue (9.3.5)
emailWorker.on("failed", async (job, err) => {
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    await deadLetterQueue.add("dead-email", {
      originalJobId: job.id,
      name: job.name,
      data: job.data,
      reason: err.message,
    });
  }
});

// Graceful Worker Shutdown (9.3.10): stop taking new jobs, finish active ones
async function shutdownWorker() {
  await emailWorker.close(); // Waits for in-flight jobs to finish cleanly!
  await redisConn.quit();
  process.exit(0);
}
process.on("SIGTERM", shutdownWorker);
process.on("SIGINT", shutdownWorker);`,
      },
    },
    {
      stepNumber: 3,
      title: 'Implement Failed Job Recovery (DLQ Replay)',
      detailMarkdown:
        'After fixing the bug or restoring an outage, drain and replay jobs from `emails-dlq` (or failed set `job.retry()`) safely back into `emails` (`9.3.9`).',
    },
  ],
  workingExamples: [
    {
      id: '9.3-ex-replay',
      title: 'Replaying failed jobs safely back into main queue (9.3.9)',
      language: 'typescript',
      code: `export async function replayFailedJobs(queue: Queue, limit = 100) {
  const failed = await queue.getFailed(0, limit - 1);
  for (const job of failed) {
    await job.retry(); // Moves failed job back into waiting state for fresh execution
  }
  return failed.length;
}`,
      explanation:
        'Because job handlers validate payloads and enforce idempotency, calling `job.retry()` on fixed failures replays cleanly without duplicating completed work.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Leaving Redis with `maxmemory-policy allkeys-lru` on a job queue instance.',
      fix: 'Always configure Redis queues with `noeviction`—otherwise memory pressure silently evicts active job metadata and stalls workers.',
    },
    {
      mistake: 'Setting `attempts: 5` on invalid-input errors (`400 Bad Request` / missing user).',
      fix: 'Throw `UnrecoverableError` for permanent non-retryable bugs so bad payloads move straight to the DLQ instead of burning 5 backoff cycles.',
    },
    {
      mistake: 'Running `node-cron` inside every API container instead of a deduplicated queue scheduler.',
      fix: 'Running in-process cron on 4 replicas triggers the job 4 times! Use BullMQ `upsertJobScheduler` (or a single scheduler lock).',
    },
  ],
  exercise: {
    id: '9.3-ex',
    title: 'Implement a Fault-Tolerant Worker With Backoff, Idempotency & DLQ',
    instructionsMarkdown:
      'Build a BullMQ queue + worker module for webhook/email delivery that:\n1. Uses exponential backoff (`attempts: 5`, initial delay `2s`).\n2. Enforces idempotency so duplicate deliveries do not repeat the external send.\n3. Routes exhausted or `UnrecoverableError` jobs to a DLQ + provides a `replayFailedJobs` helper.\n4. Registers both a delayed job (`delay`) and a deduplicated cron schedule, plus handles `SIGTERM` via `worker.close()`.',
    acceptanceChecklist: [
      'Configures bounded retries with exponential backoff and failed-job retention / DLQ routing',
      'Guards job handler with atomic idempotency check',
      'Distinguishes priority/delayed/scheduled job options cleanly',
      'Implements DLQ replay helper and graceful SIGTERM worker draining via worker.close()',
    ],
  },
};
