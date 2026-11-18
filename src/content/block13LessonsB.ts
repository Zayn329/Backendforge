import { FptLessonContent } from '../types';

export const LESSON_13_4: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Inside a single Postgres database, `BEGIN; UPDATE accounts...; INSERT INTO orders...; COMMIT;` feels magical: either both rows save together, or neither saves. Nothing can leave an order paid without updating inventory.',
      'Now split those tables into **Orders Service**, **Payment Service**, and **Inventory Service**, each with its own database (`13.5`). Suddenly your single SQL `BEGIN/COMMIT` is gone! In this unit, we’ll examine **why local transactions fail across services**, **two-phase commit (2PC)**, the **Saga pattern** and **compensating transactions**, the **transactional outbox**, **eventual consistency across services**, and **idempotency across distributed operations**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Every e-commerce checkout, money transfer, and booking flow spans multiple services or external APIs—getting this wrong creates phantom charges, negative inventory, or silently lost events.',
    prerequisites: [
      {
        subBlockId: '9.4',
        label: 'Transactional Messaging & Outbox (9.4)',
        detail: 'Solving the dual-write problem between local DB commits and event brokers.',
      },
      {
        subBlockId: '13.1',
        label: 'Partial Failures (13.1)',
        detail: 'Why any participant can crash or stall mid-workflow.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-13.4.1',
      topicId: '13.4.1',
      coveredTopicIds: ['13.4.2'],
      title: 'Why local transactions aren’t sufficient across services & Two-Phase Commit (2PC)',
      problemAndRequirementsMarkdown: [
        '### First principles: Why one ACID transaction can’t span three APIs',
        'Suppose `POST /checkout` runs on Orders Service, calls `POST /payments/charge` (Stripe/Payment DB), then calls `POST /inventory/decrement` (Inventory DB). Suppose charging succeeds—and then the Inventory call crashes! A `ROLLBACK` on Orders Service’s database cannot un-charge the customer’s credit card or roll back Inventory’s database.',
        '',
        '### Early attempt: Two-Phase Commit (2PC)',
        'Computer scientists first tried extending ACID across machines with a coordinator using **Two-Phase Commit (2PC)**:',
        '1. **Phase 1 (Prepare)**: Coordinator asks Payment DB and Inventory DB: *“Lock your rows, write to WAL, and promise whether you can commit.”* Both reply `YES (Prepared)`.',
        '2. **Phase 2 (Commit/Abort)**: If every participant said `YES`, coordinator tells everyone `COMMIT`. If anyone said `NO`, coordinator tells everyone `ABORT`.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Why modern microservices mostly avoid 2PC',
        'On paper 2PC looks clean, yet in distributed services it causes two severe headaches:',
        '- **Blocking & lock contention**: Every participant holds exclusive row locks across *network round-trips* while waiting for the slowest node—crushing throughput.',
        '- **Coordinator single point of failure**: If the coordinator crashes right after participants vote `YES` in Phase 1, participants sit **stuck holding locks** unable to safely commit or abort until the coordinator recovers!',
        '- **Heterogeneous systems**: External APIs like Stripe or SendGrid don’t implement a `PREPARE` protocol at all.',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        '2PC is mainly useful *inside* tightly coupled homogeneous clusters (e.g., distributed SQL engines like CockroachDB/Spanner inside one cluster), not across independent microservices or third-party REST APIs.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Availability collapses under 2PC**: Because 2PC requires *all* participants to respond in Phase 1, if 1 of 5 services is down, the entire transaction blocks or fails (strong CP behavior).',
      ].join('\n\n'),
      centralIdeaSummary:
        'Local ACID transactions cannot span separate service databases, and while Two-Phase Commit enforces atomic cross-node commits, its long-held locks and blocking failure modes make it unsuitable across independent microservices.',
    },
    {
      id: 'topic-13.4.3',
      topicId: '13.4.3',
      coveredTopicIds: ['13.4.4', '13.4.6'],
      title: 'The Saga pattern, compensating transactions, and eventual consistency across services',
      problemAndRequirementsMarkdown: [
        '### First principles: Undoing forward instead of locking backward',
        'Think about booking a vacation: you book a **Flight**, then a **Hotel**, then a **Rental Car**. The airline won’t let you hold a seat in a global lock while you check Hertz’s database! Instead, you commit the flight immediately. If the car fails, what do you do? You don’t "roll back time"—you execute a **new action (`Cancel Flight`)** that semantically reverses it!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### How a Saga works',
        'A **Saga** breaks one distributed business workflow into a sequence of **local ACID transactions** across services (`T1 → T2 → T3`), each committing immediately and releasing its locks:',
        '- If every step succeeds, the distributed workflow reaches **eventual consistency across services**.',
        '- If step `T3` fails, the Saga runs **compensating transactions** in reverse order (`C2` to undo `T2`, then `C1` to undo `T1`—e.g., `refundPayment()`, `releaseInventory()`).',
        '',
        '### Crucial difference from ACID rollback: No Isolation!',
        'Because `T1` committed right away, **other users can see `T1`’s intermediate state** before `T3` fails (e.g., `Order = PENDING` briefly before changing to `CANCELLED`). Design your UI and domain statuses (`PENDING_CONFIRMATION` → `CONFIRMED` / `FAILED`) around that visibility—this is **eventual consistency across services**.',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '13.4.3-ex-1',
            title: 'Saga workflow with compensating transactions',
            language: 'typescript',
            code: `async function runCheckoutSaga(orderId: string, userId: string, amount: number) {
  await inventoryService.reserve(orderId);
  try {
    await paymentService.charge(orderId, userId, amount);
  } catch (err) {
    // T2 failed after T1 already committed -> run compensating transaction C1
    await inventoryService.releaseReservation(orderId);
    await orderService.markFailed(orderId, 'PAYMENT_FAILED');
    throw err;
  }
  await orderService.markConfirmed(orderId);
}`,
          },
          lineByLineMarkdown: [
            '- **Line 2 (`T1`)**: Reserves inventory and commits immediately (no distributed lock held).',
            '- **Lines 6–9 (`C1`)**: When payment (`T2`) fails, `releaseReservation` runs as a forward compensating transaction—not an SQL rollback—restoring stock cleanly.',
          ].join('\n'),
        },
      ],
      backendApplicationsMarkdown:
        'Order fulfillment, flight/hotel bookings, and subscription provisioning all rely on Sagas (`PENDING` → `CONFIRMED` or `COMPENSATING` → `CANCELLED`).',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Compensating transactions themselves can fail**: `releaseReservation()` or `refundPayment()` must be **retried safely** (and made idempotent!), often backed by a durable workflow engine or outbox queue rather than a plain `catch` block in RAM that vanishes if the process crashes.',
        '- **Pivot transaction**: The irrevocable point of no return (e.g., sending money over wire or shipping a physical box)—order your Saga so reversible checks happen *before* the pivot and guaranteed forward-only steps (email receipt) happen *after* it.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Sagas coordinate multi-service workflows as sequential local transactions paired with compensating transactions for rollback, trading ACID isolation for high availability and eventual consistency.',
    },
    {
      id: 'topic-13.4.5',
      topicId: '13.4.5',
      coveredTopicIds: ['13.4.7'],
      title: 'Transactional outbox and idempotency across distributed operations',
      problemAndRequirementsMarkdown: [
        '### First principles: Dual-write crashes & duplicate retries',
        'Suppose your Saga step commits `INSERT INTO orders` in Postgres and then calls `kafka.publish("OrderCreated")`. What if the container crashes *between* those two lines? Now the order exists in Postgres, **yet Payment Service never hears about it—forever!** Conversely, if you publish to Kafka *first* and Postgres fails to commit, Payment Service charges a customer for an order that doesn’t exist.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Pairing Transactional Outbox with Distributed Idempotency',
        '1. **Transactional Outbox (`9.4`)**: Never dual-write across DB + broker! Inside the **exact same local SQL transaction**, insert your business row (`orders`) AND an event row into an `outbox` table. Either both save or neither saves. A background relay polls/tails `outbox` and publishes to Kafka/SQS with *at-least-once* delivery.',
        '2. **Idempotency across distributed operations**: Because outbox relays, Sagas, and HTTP clients *must* retry after network timeouts (`13.1`), receivers **will receive the same message or request multiple times**! Every distributed step and compensating transaction must attach a stable **`idempotencyKey` / `eventId`**, recording processed IDs atomically inside the receiver’s local transaction (`processed_events` / `idempotency_keys`) so executing it twice has the exact same effect as executing it once.',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'Every Stripe webhook consumer, Saga step handler, and Kafka event processor needs deduplication (`INSERT INTO processed_events ... ON CONFLICT DO NOTHING`) inside the same local transaction as its state update.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Outbox table bloat**: Delete or archive published rows (`published_at IS NOT NULL`) regularly so the `outbox` table stays tiny and fast.',
      ].join('\n\n'),
      centralIdeaSummary:
        'The transactional outbox guarantees atomic database writes plus event emission without dual-write bugs, while distributed idempotency ensures retries from relays or Sagas never double-apply side effects.',
    },
  ],
  conceptConnection: {
    title: 'Putting Reliable Distributed Transactions Together',
    narrativeMarkdown: [
      'Notice how every single mechanism in `13.4` covers one gap left by the others:',
      '- **No global SQL lock** → **Saga** steps commit locally and use **compensating transactions** (`13.4.3`, `13.4.4`).',
      '- **No dual-write drift between steps** → **Transactional Outbox** commits business state + next Saga event atomically (`13.4.5`).',
      '- **Retries after network crashes** → **Idempotency keys** guarantee replays are harmless (`13.4.7`).',
    ].join('\n\n'),
    integratedExample: {
      id: '13.4-integrated-example',
      title: 'Durable Outbox-Backed Saga Flow',
      language: 'text',
      code: `[Orders DB Tx: INSERT order (PENDING) + INSERT outbox('ReserveStock')]
        │ (relay retries at-least-once)
        ▼
[Inventory Service: idempotency_key check ─▶ reserve stock + outbox('StockReserved')]
        │
        ├─ Payment OK    ─▶ Order CONFIRMED (Eventually Consistent)
        └─ Payment Fails ─▶ Outbox('ReleaseStock') ─▶ Compensating Tx C1`,
    },
    walkthroughMarkdown:
      'Combine those three pieces—Sagas, Transactional Outbox, and Idempotency—and your multi-service workflows survive process crashes at any line without losing orders or double-charging cards.',
  },
  questions: [
    {
      id: '13.4-kc-1',
      focusArea: '2PC vs Sagas & Compensations',
      prompt:
        'Why do microservices typically replace **Two-Phase Commit (2PC)** with the **Saga pattern**, and why must applications account for missing isolation while a Saga is in flight?',
      hints: [
        'Compare what happens to database row locks and availability during 2PC vs. during a Saga.',
        'If Step 1 of a Saga commits immediately before Step 2 fails, what can concurrent readers see in between?',
        '2PC holds locks across slow network calls and blocks if the coordinator crashes; Sagas commit each local step immediately and reverse failures via compensating transactions. Because each step commits right away, intermediate states (like `PENDING`) are visible to other requests until the Saga finishes or compensates.',
      ],
      explanation:
        '2PC holds row locks across network round-trips and stalls completely if the coordinator fails mid-prepare, hurting availability and throughput—and external APIs don’t support 2PC anyway. **Sagas** execute sequential local transactions and undo failures with **compensating transactions**. Because each step commits immediately, there is no cross-service isolation: applications must handle visible intermediate states (`PENDING` → `CONFIRMED`/`CANCELLED`).',
      evaluationCriteria: [
        'Explains 2PC locking/blocking issues and Saga local-commit + compensating-tx approach',
        'Explains lack of isolation / visible intermediate state under eventual consistency',
      ],
      topicIds: ['13.4.1', '13.4.2', '13.4.3', '13.4.4', '13.4.6'],
    },
    {
      id: '13.4-kc-2',
      focusArea: 'Transactional Outbox & Distributed Idempotency',
      prompt:
        'A Saga step saves a reservation in Postgres and then crashes right before publishing `InventoryReserved` to Kafka. How does the **transactional outbox** prevent this lost message—and why does adding an outbox make **idempotency** mandatory on every consumer?',
      hints: [
        'How can you guarantee the DB write and the event record either both commit or neither commits?',
        'What happens if the outbox relay publishes a message to Kafka and crashes right before marking the outbox row as published?',
        'Writing to the `outbox` table inside the same SQL transaction as the reservation makes DB + event atomic. Because the relay provides at-least-once delivery (crashing before marking published causes a re-send), consumers receive duplicates and need idempotency keys.',
      ],
      explanation:
        'Inserting the `InventoryReserved` record into an `outbox` table inside the **same local SQL transaction** as the reservation eliminates the dual-write gap. A relay reads unpublished outbox rows and pushes them to the broker. Because a relay can crash *after* publishing to Kafka and *before* marking the outbox row sent, it delivers **at-least-once**, making **idempotency** (`eventId`/`idempotencyKey` deduplication) mandatory on every consumer.',
      evaluationCriteria: [
        'Explains atomic single-DB commit of domain change + outbox row',
        'Connects at-least-once relay retries to mandatory consumer idempotency',
      ],
      topicIds: ['13.4.5', '13.4.7'],
    },
  ],
};

export const LESSON_13_5: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Splitting a codebase into separate services sounds glamorous until every single feature requires editing 4 repositories, deploying them in an exact sequence, and guessing which of 12 services swallowed a user’s request.',
      'In this unit, we’ll cover the structural principles that make multi-service backends manageable instead of chaotic: **service boundaries**, **service ownership**, **service discovery**, **API gateways**, **synchronous vs. asynchronous communication**, **database-per-service**, **independent deployment**, **distributed tracing**, and **failure isolation**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Bad service boundaries create a “distributed monolith” that combines the worst of both worlds: all the network latency and operational complexity of microservices with none of the independence.',
    prerequisites: [
      {
        subBlockId: '12.4',
        label: 'Distributed Tracing & Context Propagation (12.4)',
        detail: 'Following `traceparent` spans across network hops.',
      },
      {
        subBlockId: '13.4',
        label: 'Distributed Transactions (13.4)',
        detail: 'How splitting databases forces Sagas and outbox events.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-13.5.1',
      topicId: '13.5.1',
      coveredTopicIds: ['13.5.2', '13.5.7', '13.5.8'],
      title: 'Service boundaries, ownership, database-per-service, and independent deployment',
      problemAndRequirementsMarkdown: [
        '### First principles: Why sharing one database across “separate” services backfires',
        'Imagine Team A builds **Orders Service** and Team B builds **Billing Service**, and to keep things easy, both services run SQL queries directly against the same `orders` and `invoices` tables. Two weeks later, Team A renames a column in `orders`—**and Billing Service explodes in production!** Neither team can refactor tables without begging the other team, and both must coordinate releases together.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Enforcing real decoupling',
        '1. **Service boundaries (cohesion over technical layers)**: Carve services around **business capabilities / bounded contexts** (Billing, Identity, Fulfillment) that change together, *not* tiny entity silos (don’t put `User` and `UserProfile` in separate networked services if every call joins them).',
        '2. **Service ownership**: One team owns a service’s code, SLA, alerts, and data model end-to-end.',
        '3. **Database-per-service**: Each service keeps its tables private—other services must call its API or subscribe to its domain events, never reach into its database tables directly.',
        '4. **Independent deployment**: Because internal schemas are hidden behind versioned APIs and backward-compatible event contracts, Team A can ship 10 times a day without waiting for Team B’s release window.',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'Start new products as a **modular monolith** (clear module folders and private schemas inside one deployable); extract separate services with private databases only where scaling profiles, compliance (PCI/HIPAA), or independent team velocity justify the network boundary.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **No foreign keys across services**: Splitting tables means losing cross-table SQL `JOIN`s and foreign-key cascades; you replace them with API lookups, denormalized local read caches, or event streams.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Services must align with cohesive business boundaries, enforce clear team ownership and database-per-service encapsulation, and communicate solely through versioned contracts so each can deploy independently.',
    },
    {
      id: 'topic-13.5.3',
      topicId: '13.5.3',
      coveredTopicIds: ['13.5.4', '13.5.5', '13.5.6'],
      title: 'Service discovery, API gateways, and synchronous vs. asynchronous communication',
      problemAndRequirementsMarkdown: [
        '### First principles: Finding moving containers & deciding how services talk',
        'In autoscaled cloud environments (`13.3`), container IP addresses change every minute as pods start and stop. How does the Orders container find a healthy Payments container—and how does a mobile client avoid juggling 15 internal service URLs?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Routing & Communication Modes',
        '1. **Service discovery**: Replaces hardcoded IPs with dynamic lookup—via internal DNS + load balancer (Kubernetes `Service` DNS `payments.prod.svc.cluster.local`), or a registry (`Consul`, `Cloud Map`) updated by health checks.',
        '2. **API gateway**: The single public front door for external clients. It terminates TLS, verifies JWT auth, applies rate limits, and routes `/orders/*` → Orders Service and `/billing/*` → Billing Service (keeping internal service topology private).',
        '3. **Synchronous vs. Asynchronous communication**:',
        '   - **Synchronous (HTTP/REST, gRPC)**: Caller waits for an answer right now. Simple mental model, best for immediate queries (`GET /inventory/12`). Downside: **temporal coupling**—if Service B is down or slow, Service A stalls too, and latency adds up across chains (`A → B → C`).',
        '   - **Asynchronous (Queues / Event brokers)**: Caller emits `OrderPlaced` and returns immediately. Services stay **decoupled in time** (Orders works even while Email Service restarts), at the cost of eventual consistency and broker operations.',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'Keep synchronous call chains shallow (1–2 hops max for user-facing reads); push cross-service side effects (emails, analytics, webhook dispatch, invoice PDFs) onto asynchronous queues/events.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Multiplying availability failures**: If `Checkout` synchronously requires 5 downstream services (`99.9%` uptime each) to all be up at the same instant, combined availability drops (`0.999^5 = 99.5%`, ~3.6 hours/month downtime!).',
      ].join('\n\n'),
      centralIdeaSummary:
        'Service discovery tracks ephemeral instances, API gateways unify client ingress and cross-cutting auth/rate limits, and preferring asynchronous events over deep synchronous call chains prevents cascading stalls.',
    },
    {
      id: 'topic-13.5.9',
      topicId: '13.5.9',
      coveredTopicIds: ['13.5.10'],
      title: 'Distributed tracing and failure isolation',
      problemAndRequirementsMarkdown: [
        '### First principles: Debugging across 6 hops & preventing one bug from taking down the whole platform',
        'When a single `POST /checkout` touches API Gateway → Auth → Orders → Inventory → Payments, grepping logs on one box tells you nothing (`12.4`). And if the **Recommendations** widget hangs for 30 seconds because a third-party ML model stalled, why should that slow down **Checkout**?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### End-to-End Visibility & Blast-Radius Containment',
        '1. **Distributed tracing (`12.4`)**: Every ingress request gets a unique **`traceId`** propagated via `traceparent` HTTP headers and queue message attributes across every service hop. A trace waterfall immediately shows whether 1,800ms vanished inside Gateway, Orders, or a slow Inventory SQL query.',
        '2. **Failure isolation (containing blast radius)**:',
        '   - **Timeouts & Circuit Breakers (`12.5`)**: Fail fast when a dependency stops answering instead of piling up blocked sockets.',
        '   - **Bulkheads**: Give critical paths (Checkout) separate worker pools, HTTP client pools, and DB pools from noisy non-critical paths (Reports/Recommendations).',
        '   - **Graceful degradation**: If Recommendations fails, return the product page with an empty shelf instead of a `500 Internal Server Error`.',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '13.5.10-ex-1',
            title: 'Isolating non-critical recommendations from breaking product pages',
            language: 'typescript',
            code: `async function getProductPage(productId: string, traceId: string) {
  const product = await catalogClient.getById(productId, { traceId, timeoutMs: 500 });

  // Non-critical dependency gets a tight timeout + fallback instead of failing the page
  const recommendations = await recommendationsClient
    .forProduct(productId, { traceId, timeoutMs: 150 })
    .catch(() => []);

  return { product, recommendations };
}`,
          },
          lineByLineMarkdown: [
            '- **Lines 2 & 6**: Propagates `traceId` across both downstream calls with explicit timeouts.',
            '- **Lines 5–7**: Isolates the non-critical dependency—if Recommendations stalls past `150ms` or errors out, the user still buys the product smoothly.',
          ].join('\n'),
        },
      ],
      backendApplicationsMarkdown:
        'Separate compute deployments and resource limits per critical service, pass `traceparent` everywhere, and classify every dependency as *hard-required* vs. *degrade-gracefully*.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Retry storms amplify outages**: If 4 layers in a synchronous chain each retry 3 times (`3 × 3 × 3 × 3 = 81x` traffic!), a sluggish service gets crushed—only retry at the edge or with strict retry budgets + circuit breakers.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Distributed tracing connects multi-service request spans under one trace ID, while timeouts, bulkheads, circuit breakers, and fallbacks provide failure isolation so one broken dependency cannot cascade across the system.',
    },
  ],
  conceptConnection: {
    title: 'Anatomy of a Healthy Multi-Service Platform',
    narrativeMarkdown: [
      'When all 10 practices of `13.5` click together:',
      '- External clients hit the **API Gateway** once; internal routing uses **Service Discovery**.',
      '- Teams hold clear **Service Ownership** over cohesive **Service Boundaries** with private **Database-per-Service** storage and **Independent Deployment**.',
      '- Shallow **Synchronous** reads + decoupled **Asynchronous** events keep latency low, while **Distributed Tracing** + **Failure Isolation** turn outages into small, debuggable hiccups.',
    ].join('\n\n'),
    integratedExample: {
      id: '13.5-integrated-example',
      title: 'Decoupled Service Architecture Blueprint',
      language: 'text',
      code: `Client ─▶ API Gateway (TLS, JWT, Rate Limit, starts traceparent)
             ├──(sync)──▶ Orders Service ──▶ [Orders DB]
             │               │ (async event via Broker)
             │               ▼
             │            Fulfillment Service ──▶ [Fulfillment DB]
             └──(sync, isolated w/ 150ms fallback)──▶ Recommendations Service`,
    },
    walkthroughMarkdown:
      'Next in `13.6`, we wrap up Block 13 by examining named system patterns (**Microservices**, **CQRS**, **Event Sourcing**, **EDA**, **Orchestration vs. Choreography**) and when each earns its complexity.',
  },
  questions: [
    {
      id: '13.5-kc-1',
      focusArea: 'Service Boundaries, Database-per-Service & Independent Deployment',
      prompt:
        'Two teams split an app into Orders Service and Billing Service, yet both connect directly to the same PostgreSQL tables to save time. Why does this defeat **independent deployment**, and how does **database-per-service** fix it?',
      hints: [
        'What happens when Orders wants to rename a column or change an enum that Billing queries directly?',
        'How should Billing read order details if Orders owns that table exclusively?',
        'Shared tables couple both services at the schema level so neither team can migrate safely alone. Database-per-service hides internal tables behind versioned APIs or events, restoring independent schema evolution and deployment.',
      ],
      explanation:
        'Sharing database tables creates tight coupling: Orders cannot alter or normalize its schema without breaking Billing’s SQL queries, destroying **independent deployment** and **service ownership**. Giving each service its own **database-per-service** forces all interaction through stable, versioned APIs or domain events so internal schemas can evolve freely.',
      evaluationCriteria: [
        'Identifies schema-level coupling preventing safe independent changes/deployments',
        'Prescribes database-per-service accessed only via stable APIs or events',
      ],
      topicIds: ['13.5.1', '13.5.2', '13.5.7', '13.5.8'],
    },
    {
      id: '13.5-kc-2',
      focusArea: 'Sync vs Async, Discovery, Tracing & Isolation',
      prompt:
        'A checkout endpoint synchronously calls Auth, Inventory, FraudCheck, ShippingEstimate, and LoyaltyPoints in sequence. Explain two reliability risks of this chain and how **asynchronous communication**, **API gateways**, **distributed tracing**, and **failure isolation** make it resilient.',
      hints: [
        'What happens to total checkout latency and uptime if LoyaltyPoints hangs for 10 seconds?',
        'Which steps truly block checkout, which can run asynchronously later, and how do you find out which hop slowed down?',
        'Deep synchronous chains multiply failure probability and tail latency. Move auth to the API gateway, offload non-blocking LoyaltyPoints to an async queue, wrap optional calls in tight timeouts/fallbacks (failure isolation), and propagate trace IDs to pinpoint bottlenecks.',
      ],
      explanation:
        'Long synchronous chains compound tail latency and multiply failure risk (`p99` and downtime across all 5 hops). Resolving it: offload edge auth/rate-limiting to the **API gateway**, move non-critical work like LoyaltyPoints to **asynchronous events**, enforce **failure isolation** (timeouts, circuit breakers, fallbacks on non-critical steps), use **service discovery** for healthy targets, and propagate **distributed tracing** IDs across every hop.',
      evaluationCriteria: [
        'Identifies compounded tail latency and cascading failure risk in deep sync chains',
        'Applies gateway, async decoupling, failure isolation, and distributed tracing accurately',
      ],
      topicIds: ['13.5.3', '13.5.4', '13.5.5', '13.5.6', '13.5.9', '13.5.10'],
    },
  ],
};

export const LESSON_13_6: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'System design interviews and architecture blog posts love buzzwords—**Microservices**, **CQRS**, **Event Sourcing**, **Event-Driven Architecture**, **Saga Orchestration vs. Choreography**. Used blindly, these patterns triple your codebase size and debugging pain. Used for the right bottleneck, they unlock tremendous scale and auditability.',
      'In this closing unit of Block 13, we’ll unpack *the actual engineering problem* behind **microservices**, **CQRS**, **event sourcing**, **event-driven architecture**, the **API gateway pattern**, **saga orchestration vs. choreography**, and **read replicas with dedicated read models**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Knowing *when NOT to use* Event Sourcing or Microservices is just as valuable as knowing how to build them when requirements truly demand it.',
    prerequisites: [
      {
        subBlockId: '13.4',
        label: 'Sagas & Transactional Outbox (13.4)',
        detail: 'Understanding multi-step workflows and local transactions.',
      },
      {
        subBlockId: '13.5',
        label: 'Service Architecture (13.5)',
        detail: 'Service boundaries, API gateways, and async messaging.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-13.6.1',
      topicId: '13.6.1',
      coveredTopicIds: ['13.6.4', '13.6.5'],
      title: 'Microservices, Event-Driven Architecture, and the API Gateway pattern',
      problemAndRequirementsMarkdown: [
        '### First principles: Why companies move from monoliths—and when they regret it',
        'A single well-structured monolith is fast, easy to debug, and lets you run one SQL transaction across modules. As organizations grow to dozens of engineers or wildly uneven workloads (say, video transcoding needs 100 GPUs while billing needs 2 CPUs), putting everything in one deploy unit causes merge conflicts, shared-DB contention, and wasted compute.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Choosing & connecting distributed building blocks',
        '- **Microservices**: Decomposing a system into independently deployable services organized by business domain (`13.5`). **Trade-off**: You trade in-process function calls for network latency, operational deployment complexity, and distributed failure modes. Great for scaling *organizations* and uneven workloads; terrible for a 3-person early startup.',
        '- **Event-Driven Architecture (EDA)**: Producers emit domain facts (`OrderPaid`, `ShipmentDispatched`) to a broker (`Kafka`/`EventBridge`) without knowing or caring which downstream services react. Adding a new Fraud Analytics consumer requires zero edits to Checkout. **Trade-off**: Control flow becomes implicit—you need tracing and schema governance so event chains don’t turn into unreadable spaghetti.',
        '- **API Gateway Pattern**: Centralizes client-facing cross-cutting concerns (routing, auth, SSL, rate limiting, response aggregation/BFF) at the perimeter so individual services stay focused on domain logic.',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'Start with a clean modular monolith behind an API gateway; extract high-scale or distinct-team boundaries as microservices, connected by explicit domain events where multiple unrelated consumers need to react.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Distributed pinball trap**: In pure EDA, if `Event A` triggers `B` which triggers `C` which updates `A`, debugging what happened during an incident without correlation/trace IDs is a nightmare.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Microservices decouple team deployments and scaling at high operational cost, Event-Driven Architecture decouples producers from consumers via domain events, and the API Gateway pattern centralizes perimeter routing and security.',
    },
    {
      id: 'topic-13.6.2',
      topicId: '13.6.2',
      coveredTopicIds: ['13.6.3', '13.6.7'],
      title: 'CQRS, Event Sourcing, and dedicated read models',
      problemAndRequirementsMarkdown: [
        '### First principles: When the shape you WRITE is awful for the shape you READ',
        'In a classic CRUD app, one Postgres `orders` table handles both writes and reads. Now imagine an analytics-heavy product where **writes** must validate strict normalized business rules (`ledger_entries`, `splits`, `refunds`), while **reads** need an instant full-text dashboard joining 7 entities with facet counts across 10M rows!',
        '',
        'Optimizing one table for strict transactional writes *and* blazing multi-filter reads creates conflicting index needs and lock contention.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Separating Write & Read Models—and Storing Events Instead of Overwriting',
        '1. **CQRS (Command Query Responsibility Segregation)**: Separate the **Command (Write) side** from the **Query (Read) side**. Writes validate rules and persist to a normalized transactional DB; a projector/worker updates **read replicas and dedicated read models** (e.g., an Elasticsearch index, denormalized Postgres summary table, or Redis cache) tuned specifically for fast queries. Cost: read models are usually *eventually consistent*.',
        '2. **Event Sourcing**: Instead of overwriting a single `balance = 150` row in place (`UPDATE`), you store an **append-only log of every immutable event** (`AccountOpened(100)`, `Deposited(50)`, `Withdrew(20)`). Current state is computed by folding/replaying those events (with periodic **snapshots** so you don’t replay 10 million events on every load).',
        '3. **Why Event Sourcing & CQRS often pair up**: An append-only event stream is terrible for `WHERE email = ?` queries—so Event Sourcing nearly *always* uses CQRS projections to build queryable read tables from the event log!',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '13.6.3-ex-1',
            title: 'Event Sourcing: deriving current state from immutable domain events',
            language: 'typescript',
            code: `type AccountEvent =
  | { type: 'AccountOpened'; initialBalance: number }
  | { type: 'MoneyDeposited'; amount: number }
  | { type: 'MoneyWithdrawn'; amount: number };

// Current state is a pure fold over the append-only event log
function rebuildBalance(events: AccountEvent[]): number {
  return events.reduce((balance, event) => {
    switch (event.type) {
      case 'AccountOpened':
        return event.initialBalance;
      case 'MoneyDeposited':
        return balance + event.amount;
      case 'MoneyWithdrawn':
        return balance - event.amount;
    }
  }, 0);
}`,
          },
          lineByLineMarkdown: [
            '- **Lines 1–4**: Events record immutable historical facts—you never `UPDATE` or `DELETE` past events.',
            '- **Lines 7–18**: Any state—today’s balance or the exact balance at midnight last Tuesday—can be reconstructed deterministically by replaying events (while CQRS projects a fast `account_balances` read table for lookups).',
          ].join('\n'),
        },
      ],
      backendApplicationsMarkdown:
        'Use **CQRS + dedicated read models** whenever search/reporting queries heavily differ from normalized write tables (e.g., Postgres writes → Elasticsearch/denormalized views). Save full **Event Sourcing** for domains where audit history, time-travel replay, or accounting ledgers are core requirements—never as a default for ordinary CRUD.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Event schema evolution**: Because historical events live forever in Event Sourcing, renaming or changing payload fields requires upcasters/versioning so old events from 3 years ago still replay cleanly.',
        '- **You don’t need Event Sourcing to use CQRS**: Plain SQL writes + outbox projecting to Elasticsearch or read replicas gives 90% of CQRS’s benefit with a fraction of the complexity.',
      ].join('\n\n'),
      centralIdeaSummary:
        'CQRS separates write models from dedicated read models (like search indexes or denormalized tables), while Event Sourcing stores an immutable append-only log of state-changing events instead of overwriting rows in place.',
    },
    {
      id: 'topic-13.6.6',
      topicId: '13.6.6',
      coveredTopicIds: [],
      title: 'Saga orchestration vs. choreography',
      problemAndRequirementsMarkdown: [
        '### First principles: Who steers a 6-step Saga?',
        'In `13.4`, you learned that Sagas run local steps `T1 → T2 → T3` with compensations if something fails. There are two very different ways to wire those services together—should services simply react to each other’s events blindly, or should one central coordinator direct the sequence?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Choreography vs. Orchestration',
        '1. **Choreography (No central conductor)**: Each service listens for events and emits its own next event—like dancers who each know their step:',
        '   - Checkout emits `OrderCreated` → Inventory listens, reserves stock, emits `StockReserved` → Payment listens, charges card, emits `PaymentCharged`.',
        '   - **Pros**: No single coordinator service to build; simple for 2–3 steps.',
        '   - **Cons**: Once workflows grow to 6+ steps with branching or compensations, **nobody owns the whole picture**. You have to read 5 repositories just to understand the flow, and circular dependencies sneak in easily.',
        '2. **Orchestration (Central workflow conductor)**: A dedicated Saga Orchestrator (e.g., an Orders workflow state machine or Temporal) explicitly tells each service what command to run next and tracks step status, retries, and compensations in one place:',
        '   - **Pros**: Entire workflow, timeouts, and compensation order are visible in one file; easy to monitor stuck orders.',
        '   - **Cons**: Adds an orchestrator component—must stay thin (coordinate flow only, never steal domain business rules from participant services).',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'Use **choreography** for simple 2-step fan-out reactions (order placed → send email + update analytics); switch to **orchestration** as soon as a multi-step business process requires retries, timeouts, branching, and compensating rollbacks.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Avoid a “God Orchestrator”**: Keep domain logic inside Inventory and Payments; the orchestrator only sequences commands (`reserve`, `charge`, `release`), tracks state, and triggers compensations.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Saga choreography avoids a central coordinator for simple 2–3 step event flows, whereas Saga orchestration centralizes state, retries, and compensating rollbacks cleanly for complex multi-step workflows.',
    },
  ],
  conceptConnection: {
    title: 'Architectural Patterns Selection Matrix',
    narrativeMarkdown: [
      'Every pattern in `13.6` solves a *specific* pressure—never adopt one without naming the pressure first:',
      '- **Pressure**: Independent teams / disparate scaling → **Microservices** + **API Gateway**.',
      '- **Pressure**: Decoupled side-effect subscribers → **Event-Driven Architecture**.',
      '- **Pressure**: Conflicting write vs. complex search/read shapes → **CQRS** + **Read replicas / dedicated read models**.',
      '- **Pressure**: Complete audit ledger & historical replay → **Event Sourcing**.',
      '- **Pressure**: Multi-step distributed rollback visibility → **Saga Orchestration** (over Choreography).',
    ].join('\n\n'),
    integratedExample: {
      id: '13.6-integrated-example',
      title: 'CQRS + Event-Driven Read Projection Flow',
      language: 'text',
      code: `Command (Write): POST /orders ─▶ Order Service ─▶ [Normalized Orders DB + Outbox]
                                                         │
                                            (Domain Event: OrderCreated)
                                                         │
Query (Read):    GET /orders/search ◀─ [Elasticsearch / Denormalized Read Model]`,
    },
    walkthroughMarkdown:
      'You now have the full distributed-systems toolkit from physical failure modes (`13.1`) through consistency (`13.2`), scaling (`13.3`), distributed transactions (`13.4`), service boundaries (`13.5`), and architectural patterns (`13.6`).',
  },
  questions: [
    {
      id: '13.6-kc-1',
      focusArea: 'CQRS, Event Sourcing & Read Models',
      prompt:
        'Why do teams sometimes adopt **CQRS** with dedicated read models *without* adopting **Event Sourcing**, and when does Event Sourcing actually earn its extra complexity?',
      hints: [
        'What problem does CQRS solve regarding SQL writes vs. search/analytics queries?',
        'What additional history guarantee does an append-only event log give beyond a fast read table?',
        'CQRS solves read/write model mismatch and lock contention using normal DB writes projected to search/read stores. Event Sourcing adds full immutable history, auditability, and time-travel replay—worth the schema-versioning cost mainly for ledgers or audit-critical domains.',
      ],
      explanation:
        '**CQRS** only requires separating the write model from **dedicated read models** (e.g., Postgres writes projected asynchronously into Elasticsearch or denormalized tables) to resolve conflicting indexing/query needs. **Event Sourcing** replaces mutable row state with an append-only log of events; it brings schema-evolution and snapshot complexity, so reserve it for financial ledgers, compliance audit logs, or systems needing exact historical state replay.',
      evaluationCriteria: [
        'Distinguishes CQRS (read/write separation) from Event Sourcing (append-only state storage)',
        'Identifies legitimate use cases and trade-offs (audit/replay vs schema evolution complexity)',
      ],
      topicIds: ['13.6.2', '13.6.3', '13.6.7'],
    },
    {
      id: '13.6-kc-2',
      focusArea: 'Microservices, EDA & Saga Orchestration vs Choreography',
      prompt:
        'A 5-step loan underwriting workflow keeps getting stuck in half-completed states across services, and nobody knows which service failed to trigger the next event. Should they keep **Saga choreography** or switch to **Saga orchestration**—and why?',
      hints: [
        'In pure choreography, where does the end-to-end state of a single loan application live?',
        'How does an orchestrator improve visibility and compensating rollback handling?',
        'Switch to Saga orchestration: centralizing the workflow state machine in one orchestrator makes step progress, timeouts, retries, and exact compensation ordering explicit instead of scattered across 5 services’ event handlers.',
      ],
      explanation:
        'Switch to **Saga orchestration**. While **choreography** works for 2–3 loosely coupled **event-driven** reactions, complex 5-step workflows scatter control flow across multiple **microservices**, making stuck states and multi-step compensations hard to trace. An orchestrator tracks the state machine explicitly, handles timeouts/retries centrally, and dispatches compensating commands cleanly.',
      evaluationCriteria: [
        'Recommends Saga orchestration over choreography for complex multi-step workflows',
        'Explains centralized state visibility, timeout control, and clean compensation ordering',
      ],
      topicIds: ['13.6.1', '13.6.4', '13.6.5', '13.6.6'],
    },
  ],
};
