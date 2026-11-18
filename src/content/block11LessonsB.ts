import { FptLessonContent, RecipeLessonContent } from '../types';

export const LESSON_11_3: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'When your backend was just one service, calling `billing.charge()` directly worked cleanly. Now imagine `Orders`, `Billing`, `Warehouse`, `Email`, and `Analytics` all running asynchronously. If `Orders` has to make direct HTTP calls to *four* other services every time a user checks out, checkout slows down by 4x—and if `Analytics` goes down for maintenance, `Orders` crashes too!',
      'In this unit, we’ll derive **Messaging Architecture** from first principles: **direct service communication**, **publisher-subscriber (Pub/Sub)**, **event-driven architecture**, **message brokers**, **message ordering**, **delivery semantics**, **consumer groups**, and **dead-letter processing**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Decoupling services through event brokers eliminates fragile synchronous chains, lets independent teams react to business events without touching upstream producers, and isolates partial outages.',
    prerequisites: [
      {
        subBlockId: '9.2',
        label: 'Producer-Consumer Queues (9.2, 9.4)',
        detail: 'Understanding work queues, durable messages, and at-least-once delivery.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-11.3.1',
      topicId: '11.3.1',
      coveredTopicIds: ['11.3.2', '11.3.3', '11.3.4'],
      title: 'Direct communication vs. Pub/Sub, Event-Driven Architecture, and Message Brokers',
      problemAndRequirementsMarkdown: [
        '### First principles: Why tight point-to-point chains collapse as systems grow',
        'In **Direct Service Communication** (`Orders -> HTTP POST -> Billing -> HTTP POST -> Email -> HTTP POST -> Analytics`), every single link is tightly coupled in **time** (all must be online right now) and **knowledge** (`Orders` must know every downstream subscriber’s URL and retry rules). Adding a fifth service (`LoyaltyPoints`) forces you to edit `Orders` code!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Switching from point-to-point commands to Pub/Sub Events',
        '1. **Publisher-Subscriber (Pub/Sub) Architecture**: A **Publisher** announces a fact *once* to a named **Topic / Channel** (`"orders.placed"`), with zero knowledge of who is listening. Zero, one, or ten independent **Subscribers** receive a copy independently!',
        '2. **Event-Driven Architecture (EDA)**: Services communicate by emitting immutable **facts about things that already happened** (`OrderPlaced`, `InvoicePaid`) rather than bossing other services around synchronously. Adding `LoyaltyPoints` means deploying a new subscriber—`Orders` doesn’t change a single line!',
        '3. **Message Brokers** (RabbitMQ, Apache Kafka, AWS SNS+SQS, NATS): Dedicated durable middleware sitting between publishers and subscribers—routing messages, persisting them safely to disk if a subscriber goes offline for 10 minutes, and scaling delivery.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Pub/Sub and Event-Driven Architecture replace fragile synchronous service chains by having producers publish immutable events to a durable Message Broker while independent consumers subscribe asynchronously.',
      codeExamples: [],
    },
    {
      id: 'topic-11.3.5',
      topicId: '11.3.5',
      coveredTopicIds: ['11.3.6', '11.3.7', '11.3.8'],
      title: 'Message ordering, delivery semantics, consumer groups, and dead-letter processing',
      problemAndRequirementsMarkdown: [
        '### First principles: When you scale to 5 consumer replicas—and events arrive out of order!',
        'Suppose `Order #42` emits two events 10ms apart: first `OrderCreated`, then `OrderCanceled`. Now you run 3 replicas of `WarehouseService` to keep up with traffic. Two subtle dangers immediately appear:',
        '1. **Competing vs. Broadcasting**: Should *all* 3 replicas of `WarehouseService` ship `Order #42` (3 boxes!), or should **only ONE replica** of `WarehouseService` process it while `AnalyticsService` *also* gets its own copy?',
        '2. **Out-of-Order Execution**: Replica A grabs `OrderCreated` and pauses for 100ms; Replica B grabs `OrderCanceled` and finishes first! Suddenly `OrderCanceled` tries to cancel an order that hasn’t been created yet!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Four core broker mechanisms',
        '1. **Consumer Groups** *(Combines Pub/Sub fan-out + Queue load-balancing!)*: Every independent service forms a **Consumer Group** (`warehouse-group`, `analytics-group`). The broker delivers a copy of every event **once per group** (broadcast across services), and load-balances messages **across workers inside the same group** (only ONE replica of `Warehouse` handles `Order #42`)!',
        '2. **Message Ordering (Partitioning by Key)**: Global strict ordering across 50 workers kills parallelism. Instead, brokers preserve order **per entity key** (e.g., hash `orderId = "42"` to one dedicated queue/partition) so `OrderCreated` always executes before `OrderCanceled` for `Order #42`, while `Order #43` runs concurrently elsewhere!',
        '3. **Delivery Semantics**: Brokers routinely deliver **At-Least-Once** (safe against drops; requires idempotent consumers `9.4`), contrasted with *At-Most-Once* (can lose events) and expensive *Effectively-Once* patterns (At-Least-Once + Idempotent Inbox).',
        '4. **Dead-Letter Processing**: Just like job queues (`9.3`), permanently unprocessable messages inside a consumer group get routed to a **Dead-Letter Queue/Topic** with headers recording failure reason and retry count—preventing one poison-pill message from stalling an ordered partition forever!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Use Consumer Groups to broadcast across services while load-balancing within each service, partition by entity key for per-entity ordering, enforce idempotency for at-least-once delivery, and isolate poison pills via Dead-Letter processing.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Fan-out across Consumer Groups with ordered keys and DLQ safety',
    narrativeMarkdown: [
      'See how all eight concepts of `11.3` unite in one order-event topology:',
      '- **`Orders`** emits `OrderPlaced` (partitioned by `orderId`) into the **Message Broker**.',
      '- **`warehouse-group`** (3 instances) and **`analytics-group`** (2 instances) each receive **one** logical copy per group.',
      '- Inside `warehouse-group`, events for `orderId = 42` run in order, check idempotency (`at-least-once`), and move poison pills to a **Dead-Letter** channel.',
    ].join('\n\n'),
    integratedExample: {
      id: '11.3-integrated-example',
      title: 'Pub/Sub + Consumer Groups + Ordered Keys + DLQ',
      language: 'text',
      code: `[Orders Producer] ──OrderPlaced(key=order_42)──▶ [Message Broker Topic]
                                                         │
                         ┌───────────────────────────────┴───────────────────────────────┐
                         ▼ (Copy 1 -> Warehouse Group)                                   ▼ (Copy 2 -> Analytics Group)
              [Replica 1]  [Replica 2]                                                [Replica A]  [Replica B]
              (only ONE handles order_42 in order!)                                   (only ONE updates stats!)
                   │
                   └── Permanent error after retries? -> [Dead-Letter Topic/Queue]`,
    },
    walkthroughMarkdown:
      'Next in `11.4`, we’ll compare how the two industry-defining brokers—**RabbitMQ** and **Apache Kafka**—implement these exact ideas very differently inside!',
  },
  questions: [
    {
      id: '11.3-kc-1',
      focusArea: 'Direct Calls vs Pub/Sub & Event-Driven Architecture',
      prompt:
        'Contrast **direct synchronous HTTP service communication** against **Pub/Sub Event-Driven Architecture** using a **Message Broker** when 4 downstream services react to an `OrderPlaced` event.',
      hints: [
        'What happens in direct HTTP chains if `Analytics` goes down for 2 minutes, or when you add a 5th downstream consumer?',
        'Think about temporal coupling (online at the exact same instant) and code coupling.',
        'Direct HTTP couples availability and forces edits to `Orders` for every new consumer; Pub/Sub via a broker lets `Orders` emit once while independent consumers buffer and process asynchronously even across downtime.',
      ],
      explanation:
        'In **direct communication**, `Orders` slows down by the sum of all 4 HTTP calls, fails if any downstream consumer is temporarily offline, and requires modifying `Orders` every time a new consumer wants `OrderPlaced` notifications. With **Pub/Sub + a Message Broker**, `Orders` emits an immutable event once; the broker buffers messages durably so decoupled subscribers consume independently at their own pace.',
      evaluationCriteria: [
        'Identifies availability coupling, latency accumulation, and code coupling in direct chains',
        'Explains decoupled one-to-many fan-out and durable buffering via a broker',
      ],
      topicIds: ['11.3.1', '11.3.2', '11.3.3', '11.3.4'],
    },
    {
      id: '11.3-kc-2',
      focusArea: 'Consumer Groups, Ordering & Delivery Semantics',
      prompt:
        'How do **Consumer Groups** solve scaling multiple instances of a subscriber without double-processing events—and how do **message ordering (by key)**, **at-least-once semantics**, and **dead-letter processing** keep pipelines safe?',
      hints: [
        'If 3 instances of `Billing` subscribe to `orders.placed`, how do we ensure all 3 don’t charge the same order?',
        'Can you guarantee global ordering across 10 workers, or do you order per entity key (like `orderId`)? And what happens when a poison message breaks an ordered stream?',
        'Consumer Groups deliver 1 copy per service group (shared among its workers); ordering by key keeps `Created->Canceled` sequential per `orderId`; at-least-once requires idempotency; DLQ prevents poison pills from blocking streams forever.',
      ],
      explanation:
        'A **Consumer Group** ensures each logical service (`billing-group`, `email-group`) gets its own copy of an event while dividing messages across worker replicas inside that group (so only one replica processes each event). Routing messages by entity key (`orderId`) preserves per-entity **message ordering** without blocking parallel entities. Because brokers typically provide **at-least-once** delivery, consumers must be idempotent, and **dead-letter processing** quarantines permanently failing poison messages.',
      evaluationCriteria: [
        'Explains broadcast across groups + load-balancing within a group',
        'Explains per-key ordering, idempotency under at-least-once, and DLQ quarantine',
      ],
      topicIds: ['11.3.5', '11.3.6', '11.3.7', '11.3.8'],
    },
  ],
};

export const LESSON_11_4_FPT: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'People talk about **RabbitMQ** and **Apache Kafka** as if they’re interchangeable—*“They’re both message brokers, right?”* Not quite! Under the hood, they use **fundamentally different mental models**: one behaves like an intelligent **smart post-office router** that deletes letters once delivered, while the other behaves like an **immutable append-only event log** where readers keep bookmarks and can even rewind time!',
      'In this unit, we’ll compare **Message Broker Internals** from first principles: **RabbitMQ (Queues, Exchanges, Routing, Acknowledgements)** versus **Kafka (Topics, Partitions, Offsets, Consumer Groups, Retained Logs)**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Choosing RabbitMQ when you need replayable high-throughput event streams—or choosing Kafka when you just need priority job routing and per-message TTLs—creates massive operational headaches. Understanding their internals makes the choice obvious.',
    prerequisites: [
      {
        subBlockId: '11.3',
        label: 'Messaging & Consumer Groups (11.3)',
        detail: 'Understanding Pub/Sub, ordering, consumer groups, and at-least-once ACKs.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-11.4.1',
      topicId: '11.4.1',
      coveredTopicIds: ['11.4.2', '11.4.3', '11.4.4'],
      title: 'RabbitMQ Internals: Exchanges, Routing, Queues, and Acknowledgements',
      problemAndRequirementsMarkdown: [
        '### First principles: The "Smart Broker, Push-and-Delete" model',
        'In RabbitMQ, producers **never publish straight to a Queue!** Why? Suppose `Orders` wants `"order.paid"` to go to *both* `billing_queue` and `email_queue`, while `"order.fraud"` goes *only* to `security_queue`. Hardcoding queue names inside `Orders` would defeat Pub/Sub!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### How RabbitMQ routes and deletes messages',
        '1. **Exchanges (`Direct`, `Fanout`, `Topic`, `Headers`)**: Producers publish messages with a **`routing key`** (like `"order.us.paid"`) to an **Exchange** (the smart post-office sorting desk).',
        '2. **Routing & Bindings**: Queues subscribe to Exchanges using **Binding patterns**:',
        '   - **Fanout Exchange**: Ignores routing keys and copies every message to *all* bound queues.',
        '   - **Direct Exchange**: Exact match (`"invoice.pdf"` → `pdf_queue`).',
        '   - **Topic Exchange**: Wildcard pattern routing (`"order.*.paid"` or `"order.#"` → `analytics_queue`).',
        '3. **Queues**: Buffers storing routed messages in FIFO order and **pushing** them to connected workers (`basic.consume`, bounded by `prefetch` so fast workers don’t hoard 10,000 messages!).',
        '4. **Acknowledgements (`ACK` / `NACK`)**: When a worker finishes processing, it sends `basicAck`—and **RabbitMQ permanently removes that message from the queue!** If the worker crashes or calls `NACK(requeue=false)`, RabbitMQ either re-queues it or routes it to a Dead-Letter Exchange (`DLX`).',
      ].join('\n\n'),
      centralIdeaSummary:
        'RabbitMQ acts as a smart router: Producers send to Exchanges that route by bindings into Queues, pushing messages to workers and deleting each message once explicitly ACKed.',
      codeExamples: [],
    },
    {
      id: 'topic-11.4.5',
      topicId: '11.4.5',
      coveredTopicIds: ['11.4.6', '11.4.7', '11.4.8', '11.4.9'],
      title: 'Kafka Internals: Topics, Partitions, Retained Logs, Offsets, and Consumer Groups',
      problemAndRequirementsMarkdown: [
        '### First principles: What if a brand-new Analytics service launches *today* and needs to replay last week’s events?',
        'Notice what RabbitMQ can’t do easily: once `billing` and `email` ACKed Tuesday’s `"order.paid"` messages, **they are gone!** And what if you need **millions of ordered telemetry/clickstream events per second** without per-message broker routing overhead?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### How Kafka turns messaging into an append-only distributed log',
        '1. **Topics & Retained Logs**: In Kafka, a **Topic** (e.g., `orders-events`) is NOT deleted when read! It is a **durable, append-only log stored on disk for a retention window** (e.g., 7 days, 30 days, or forever!). Multiple completely independent services can read the same historical log at different speeds—even **rewinding and replaying** past days!',
        '2. **Partitions**: A single Topic is split into `N` ordered **Partitions** (`Partition 0`, `Partition 1`, `Partition 2`) distributed across Kafka broker servers for massive horizontal throughput. Every message with the **same partition key** (e.g. `key = orderId`) always hashes to the **exact same partition**, guaranteeing strict sequential ordering for that entity!',
        '3. **Offsets**: Every message inside a partition receives a permanent monotonically increasing integer **`offset` (`0, 1, 2, 3...`)**. Consumers **pull** batches of messages starting from their last committed `offset`—remembering where they stopped like a bookmark in a book!',
        '4. **Consumer Groups (1 Partition → 1 Consumer rule)**: Inside a Consumer Group (`billing-group`), Kafka assigns each Partition to **at most ONE consumer instance** at a time! If a Topic has **6 Partitions**, up to **6 consumers** in `billing-group` run in parallel (adding a 7th leaves it idle—so partition count sets max per-group parallelism!).',
      ].join('\n\n'),
      centralIdeaSummary:
        'Kafka models Topics as partitioned, append-only Retained Logs where Consumer Groups track progress by Offset bookmarks—enabling extreme throughput, per-key ordering, and historical replay.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'RabbitMQ vs. Kafka: Picking the right architecture internally',
    narrativeMarkdown: [
      'Compare both models side by side from `11.4`:',
      '- **Use RabbitMQ** when you want **complex per-message routing** (`Topic`/`Direct` exchanges), **per-message priority/TTL/delays**, and classic work-queue push semantics where tasks vanish once ACKed.',
      '- **Use Kafka** when you want **high-throughput ordered event streams**, **independent slow/fast consumers**, and **durable log retention + offset replay**.',
    ].join('\n\n'),
    integratedExample: {
      id: '11.4-integrated-example',
      title: 'RabbitMQ (Smart Exchange Router) vs. Kafka (Retained Partitioned Log)',
      language: 'text',
      code: `RabbitMQ (Push & Delete on ACK):
  Producer ──("order.us.paid")──▶ [Topic Exchange] ──binding "order.*.paid"──▶ [Billing Queue] ──push──▶ Worker (ACK deletes!)
                                                   └──binding "order.#"─────▶ [Audit Queue]

Kafka (Pull by Offset from Retained Log):
  Producer(key="ord_42") ──hash(key)──▶ Topic "orders": Partition 0 [0][1][2][3][4]... (Retained 7 days!)
                                                        Partition 1 [0][1][2]...
                                           ▲ Pull from committed Offset=2!
                                           └─ Consumer Group "billing" (1 partition -> 1 consumer)`,
    },
    walkthroughMarkdown:
      'Switch to the **Recipe** tab to inspect and practice concrete RabbitMQ (`amqplib` Exchange/Binding/Prefetch/ACK) and Kafka (`kafkajs` Partitioned Producer + Consumer Group Offset) code.',
  },
  questions: [
    {
      id: '11.4-kc-1',
      focusArea: 'RabbitMQ Exchanges, Routing & Acknowledgements',
      prompt:
        'In **RabbitMQ**, why do producers publish to an **Exchange** with a routing key instead of directly to a **Queue**—and what happens inside RabbitMQ when a consumer sends `ack` vs. `nack`?',
      hints: [
        'How can one producer’s `"order.us.paid"` message reach two queues (`billing` and `analytics`) without modifying producer code?',
        'Remember what happens to a message in RabbitMQ once `basicAck` arrives.',
        'Exchanges decouple producers from queues via routing bindings (`Direct`, `Fanout`, `Topic`); `ack` permanently removes the message from the queue, while `nack` re-queues or sends it to a Dead-Letter Exchange.',
      ],
      explanation:
        'Publishing to an **Exchange** lets producers broadcast events once using routing keys while downstream consumers bind their own **Queues** with **Direct, Fanout, or Topic** patterns without changing the producer. Once a consumer finishes and sends an **Acknowledgement (`ack`)**, RabbitMQ deletes the message from the queue; on crash or **`nack`**, RabbitMQ re-delivers or routes it to a Dead-Letter Exchange.',
      evaluationCriteria: [
        'Explains Exchange + Binding routing decoupling (Direct/Fanout/Topic)',
        'Explains message deletion on ACK vs requeue/DLX on NACK',
      ],
      topicIds: ['11.4.1', '11.4.2', '11.4.3', '11.4.4'],
    },
    {
      id: '11.4-kc-2',
      focusArea: 'Kafka Topics, Partitions, Offsets & Retained Logs',
      prompt:
        'Why can a brand-new service spin up today and **replay 3 days of old events** from **Kafka** (but not from a standard RabbitMQ queue), and if a Kafka Topic has **4 Partitions**, what happens if you run **6 workers** inside one **Consumer Group**?',
      hints: [
        'Does Kafka delete a record when a consumer reads and commits its offset?',
        'Think about Kafka’s 1-partition-per-consumer rule inside a Consumer Group.',
        'Kafka keeps messages in disk-retained append-only logs across retention windows tracked by consumer Offsets (enabling replay); because each partition maps to only 1 consumer in a group, 2 of the 6 workers sit idle.',
      ],
      explanation:
        'Kafka stores messages in **Retained Logs** across configurable retention periods rather than deleting on read; each **Consumer Group** simply tracks its bookmark via an integer **Offset** per partition, so a new group can start from offset `0` and replay days of history. Because Kafka assigns each **Partition** to at most one consumer inside a group (to preserve partition order), **4 Partitions** can keep at most **4 consumers** active per group—workers 5 and 6 remain idle standbys.',
      evaluationCriteria: [
        'Explains retained append-only log + independent consumer Offsets enabling replay',
        'Correctly identifies 4-partition max parallelism leaving 2 of 6 consumers idle',
      ],
      topicIds: ['11.4.5', '11.4.6', '11.4.7', '11.4.8', '11.4.9'],
    },
  ],
};

export const LESSON_11_4_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Implement both major broker models side-by-side in TypeScript: **RabbitMQ (`amqplib`)** using Topic Exchanges, Routing Bindings, `prefetch`, and manual `ack`/`nack`; and **Apache Kafka (`kafkajs`)** using Partition-Keyed Topics, Consumer Groups, and explicit Offset commits.',
  whenToUseMarkdown:
    'Use the RabbitMQ recipe for flexible task routing and per-message TTL/DLX queues; use the Kafka recipe for ordered high-volume event streams and replayable consumer groups.',
  setupCommands: [
    {
      id: '11.4-setup-1',
      label: 'Install amqplib (RabbitMQ) and kafkajs (Kafka)',
      command: 'npm install amqplib kafkajs && npm install -D @types/amqplib',
      notes: 'Both RabbitMQ and Kafka run cleanly locally inside Docker Compose during testing.',
    },
  ],
  coreApisMarkdown: [
    '- **RabbitMQ (`amqplib`)**: `assertExchange("orders", "topic")` → `bindQueue(q, "orders", "order.*.paid")` → `channel.prefetch(10)` → `channel.ack(msg)` / `channel.nack(msg, false, false)`.',
    '- **Kafka (`kafkajs`)**: `producer.send({ topic, messages: [{ key, value }] })` + `consumer.subscribe({ topic, fromBeginning: false })` + `consumer.run({ eachMessage })`.',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'RabbitMQ: Declare Topic Exchange, Bound Queue, Prefetch & Manual ACK/NACK',
      detailMarkdown:
        'Set `channel.prefetch(10)` so a single worker doesn’t hoard thousands of unacked jobs (`11.4.1`), route via wildcard patterns (`11.4.2`, `11.4.3`), and `ack`/`nack` explicitly (`11.4.4`).',
      code: {
        id: '11.4-step-1',
        title: 'src/brokers/rabbitWorker.ts — Exchange routing + Queue + Manual ACK',
        language: 'typescript',
        code: `import amqp from "amqplib";

export async function startRabbitOrderConsumer() {
  const conn = await amqp.connect(process.env.RABBITMQ_URL!);
  const ch = await conn.createChannel();

  // 1. Exchange & DLX setup (11.4.2, 11.4.3)
  await ch.assertExchange("orders.topic", "topic", { durable: true });
  await ch.assertQueue("billing.charge.q", {
    durable: true,
    deadLetterExchange: "orders.dlx", // NACK(requeue=false) goes cleanly to DLQ!
  });
  await ch.bindQueue("billing.charge.q", "orders.topic", "order.*.paid");

  // 2. Limit unacked in-flight messages per worker (11.4.1)
  await ch.prefetch(10);

  ch.consume("billing.charge.q", async (msg) => {
    if (!msg) return;
    try {
      const event = JSON.parse(msg.content.toString());
      await processBillingCharge(event);
      ch.ack(msg); // Broker deletes message only after success! (11.4.4)
    } catch (err) {
      // Permanent error -> send to DLX without requeue loop
      ch.nack(msg, false, false);
    }
  });
}`,
      },
    },
    {
      stepNumber: 2,
      title: 'Kafka: Produce with Entity Partition Keys & Consume via Consumer Group Offsets',
      detailMarkdown:
        'Pass `key: orderId` so all events for one order land in the **same Partition** in strict sequence (`11.4.6`), while **Consumer Groups** commit **Offsets** automatically/manually on completion (`11.4.7`, `11.4.8`, `11.4.9`).',
      code: {
        id: '11.4-step-2',
        title: 'src/brokers/kafkaStream.ts — Keyed Producer + Consumer Group',
        language: 'typescript',
        code: `import { Kafka } from "kafkajs";

const kafka = new Kafka({ clientId: "orders-app", brokers: [process.env.KAFKA_BROKER!] });

export async function publishOrderEvent(orderId: string, payload: object) {
  const producer = kafka.producer();
  await producer.connect();
  await producer.send({
    topic: "orders-events", // Topic (11.4.5)
    messages: [
      {
        key: orderId, // Partition key guarantees per-order sequence! (11.4.6)
        value: JSON.stringify(payload),
      },
    ],
  });
  await producer.disconnect();
}

export async function startKafkaAnalyticsConsumer() {
  const consumer = kafka.consumer({ groupId: "analytics-group" }); // Consumer Group (11.4.8)
  await consumer.connect();
  // Retained log lets new groups replay fromBeginning: true if needed! (11.4.9)
  await consumer.subscribe({ topic: "orders-events", fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ partition, message }) => {
      // message.offset marks exact log position inside this partition (11.4.7)
      const data = JSON.parse(message.value!.toString());
      await recordAnalytics(data, partition, message.offset);
    },
  });
}`,
      },
    },
    {
      stepNumber: 3,
      title: 'Ensure Idempotency and Graceful Shutdown on Both Brokers',
      detailMarkdown:
        'Both RabbitMQ (`ack`) and Kafka (`offset commit`) guarantee **at-least-once** delivery—check an idempotency key (`9.4`) and close channels/consumers on `SIGTERM`.',
    },
  ],
  workingExamples: [
    {
      id: '11.4-ex-rabbit-pub',
      title: 'Publishing to a RabbitMQ Topic Exchange',
      language: 'typescript',
      code: `ch.publish(
  "orders.topic",
  "order.us.paid", // Matched by "order.*.paid" and "order.#" bindings!
  Buffer.from(JSON.stringify({ orderId: "ord_42", amountCents: 2500 })),
  { persistent: true } // Survives broker restart when routed to durable queue
);`,
      explanation:
        'Setting `{ persistent: true }` on messages routed to `durable: true` queues ensures RabbitMQ writes messages to disk instead of losing them on broker reboot.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Consuming RabbitMQ without `ch.prefetch(N)`.',
      fix: 'Without `prefetch`, RabbitMQ blasts every queued message to the first connected worker immediately, blowing RAM and starving newly scaled workers.',
    },
    {
      mistake: 'Setting `ch.nack(msg, false, true)` (requeue forever) when JSON parsing fails.',
      fix: 'Malformed messages spin at 100% CPU forever! Route permanent failures via `nack(msg, false, false)` to a Dead-Letter Exchange after bounded retries.',
    },
    {
      mistake: 'Omitting `key` in Kafka `producer.send()` when events for an entity (`Created` -> `Canceled`) depend on order.',
      fix: 'Without a partition `key`, Kafka round-robins messages across partitions so two events for the same order can run out of order!',
    },
  ],
  exercise: {
    id: '11.4-ex',
    title: 'Implement Both RabbitMQ Topic Consumer & Kafka Keyed Stream',
    instructionsMarkdown:
      'Build two small modules:\n1. A RabbitMQ producer + consumer binding `"order.*.paid"` on a durable Topic Exchange with `prefetch(10)`, manual `ack`, and `nack(msg, false, false)` DLX routing.\n2. A Kafka producer sending events keyed by `orderId` to `"orders-events"` plus a Consumer Group (`groupId: "billing-group"`) logging `partition` and `offset`.',
    acceptanceChecklist: [
      'RabbitMQ uses durable Exchange/Queue with wildcard binding, prefetch cap, and manual ack/nack',
      'Kafka producer specifies entity `key` so events for one entity stay ordered in the same partition',
      'Kafka consumer uses explicit `groupId` and respects offset bookmarks & retained-log replayability',
      'Both paths protect against infinite poison-pill loops and handle at-least-once duplicates',
    ],
  },
};
