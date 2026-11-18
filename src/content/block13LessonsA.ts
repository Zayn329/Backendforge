import { FptLessonContent } from '../types';

export const LESSON_13_1: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Up to this point, almost everything feels comforting because it runs on one machine—or at least one app server talking to one database. If a function call returns an error, you catch it. If time moves forward, `Date.now()` moves forward.',
      'The moment your system grows across **multiple independent machines**, every comforting assumption breaks. In this unit, we’ll examine **why we distribute systems**, how **independent machines** and **network communication** create **partial failures**, **network partitions**, **latency variability**, and **clock skew**, and how engineers build **fault tolerance** and **failure detection** on top of unreliable parts.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Distributed systems bugs rarely show up on your laptop. They appear at 3 AM when one Availability Zone drops packets for 12 seconds and two servers both believe they are the leader.',
    prerequisites: [
      {
        subBlockId: '12.5',
        label: 'Reliability patterns (12.5)',
        detail: 'Timeouts, retries, and circuit breakers exist because networks fail.',
      },
      {
        subBlockId: '1.3',
        label: 'HTTP & TCP fundamentals (1.3)',
        detail: 'Understanding packets, connections, and transport latency.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-13.1.1',
      topicId: '13.1.1',
      coveredTopicIds: ['13.1.2', '13.1.3'],
      title: 'Why distribute a system? Independent machines & network communication',
      problemAndRequirementsMarkdown: [
        '### First principles: Why leave the simplicity of one machine?',
        'One machine is wonderful: shared RAM, one clock, function calls in nanoseconds, and atomic local crashes (either the whole process runs or the whole process dies). So why would anyone accept the pain of distributing software across multiple computers?',
        '',
        'Three physical limits force our hand:',
        '1. **Capacity**: Traffic or data outgrows what one CPU, RAM, or disk can hold.',
        '2. **Availability**: If your single server’s power supply dies or kernel panics, 100% of users go offline.',
        '3. **Geography**: Users in Tokyo talking to a server in Virginia wait ~200ms per round-trip just for light in fiber-optic cables.',
        '',
        '### Deriving what changes immediately',
        'Once you split work across **independent machines**, there is **no shared memory** and **no shared hardware clock**. Machine A can only influence Machine B by sending bytes across **network communication**—cables, switches, routers, and NIC queues that drop, reorder, or delay packets.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Local calls vs. Network calls',
        'In a single process, calling `reserveInventory()` either succeeds, throws, or crashes the whole process. Over a network, sending `POST /inventory/reserve` enters an uncertain middle ground:',
        '- Your request packet might be lost **on the way there** (the receiver never heard you).',
        '- The receiver might process it and **crash before replying**.',
        '- Your request might succeed, and the **reply packet** gets dropped on the way back!',
        '',
        'Crucially, **from Machine A’s perspective, all three look identical: silence.**',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '13.1.1-ex-1',
            title: 'Why network silence creates ambiguity',
            language: 'text',
            code: `Case 1 (Lost Request):   Client ──X         Server (never ran charge)
Case 2 (Server Crash):   Client ───────▶ Server (ran charge, crashed!)
Case 3 (Lost Response):  Client ◀──X─────── Server (ran charge, reply lost)

To the Client, all 3 cases produce the exact same timeout error!`,
          },
          lineByLineMarkdown: [
            '- **Lines 1–3**: Three opposite real-world outcomes—charge never ran vs. charge succeeded—leave the caller staring at the exact same network timeout.',
            '- **Why it matters**: Without idempotency keys (`9.3`, `13.4`), blindly retrying Case 3 charges the customer twice!',
          ].join('\n'),
        },
      ],
      backendApplicationsMarkdown:
        'Every microservice HTTP call, Postgres query across a VPC, and Redis command faces this exact ambiguity—which is why network timeouts must always be paired with idempotent operations or state checks before retrying.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Distributed monolith trap**: Splitting one fast codebase into 12 networked services without needing scale or isolation buys *all* the network ambiguity for zero benefit.',
      ].join('\n\n'),
      centralIdeaSummary:
        'We distribute systems for scale, availability, and locality, trading fast shared-memory calls for independent machines communicating over an unreliable network.',
    },
    {
      id: 'topic-13.1.4',
      topicId: '13.1.4',
      coveredTopicIds: ['13.1.5', '13.1.6'],
      title: 'Partial failures, network partitions, and latency variability',
      problemAndRequirementsMarkdown: [
        '### First principles: Why “all up or all down” disappears',
        'On one computer, if RAM corrupts or the OS panics, the entire app stops cleanly together. Across 20 machines, Machine #7’s disk controller can hang for 4 seconds while Machines #1–#6 and #8–#20 keep serving requests. That is **partial failure**—parts of your system are healthy while other parts are broken or merely slow.',
        '',
        'Even worse, what if the network switch between two racks drops traffic between Node A and Node B, while users can still reach *both* Node A and Node B? Now you have a **network partition** (split-brain risk): neither node is dead, yet they cannot coordinate with each other!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Latency variability (the silent trap)',
        'People assume a network call is either fast (`2ms`) or dead (`error`). In reality, networks have huge **latency variability**:',
        '- A switch queue fills during a traffic burst (`2ms` → `450ms`).',
        '- A JVM/Node garbage collection pause freezes one receiver for `1,800ms`—it isn’t dead, just paused, and resumes right after callers already timed out and declared it dead!',
        '',
        'In an **asynchronous network**, there is no guaranteed upper bound on packet delivery time. That means you can *never* instantly distinguish “crashed permanently” from “very slow right now.”',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'During a payment checkout flow, a partial failure where Order Service saves the order while Notification Service stalls should degrade gracefully (queue the email later) rather than failing the whole checkout.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Aggressive timeouts vs. false alarms**: Tight timeouts (e.g., `100ms`) catch slow nodes fast, but trigger false failovers during tiny GC or network blips. Loose timeouts (`30s`) avoid false alarms, but stall threads and exhaust pools while waiting.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Distributed systems experience partial failures, network partitions, and unbounded latency variability, making it impossible to distinguish a dead node from a slow one with certainty.',
    },
    {
      id: 'topic-13.1.7',
      topicId: '13.1.7',
      coveredTopicIds: ['13.1.8', '13.1.9'],
      title: 'Clock synchronization, fault tolerance, and failure detection',
      problemAndRequirementsMarkdown: [
        '### First principles: Why you can’t trust `Date.now()` to order events',
        'Suppose User X edits a document at `12:00:00.100` on Server A, and 20ms later edits it again on Server B. Seems simple—pick the newer timestamp! Wait: what if Server B’s quartz crystal clock drifted **150ms behind** Server A’s clock? Server B stamps the *newer* edit with `11:59:59.970`, so “last write wins” silently overwrites the newer edit with the older one!',
        '',
        'Even with **NTP (Network Time Protocol)** syncing clocks over the internet, network jitter leaves clocks off by tens of milliseconds—and NTP can even step clocks *backward*!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Handling time, faults, and failure detection',
        '1. **Clock synchronization limits**: Use **monotonic clocks** (`process.hrtime()` / `performance.now()`) to measure *elapsed durations* on one machine, never wall clocks (`Date.now()`). Across machines, use **logical clocks** (Lamport counters, version numbers, or database sequences) when causal ordering matters—unless you have specialized hardware like Google Spanner’s TrueTime GPS/atomic clocks.',
        '2. **Failure detection**: Since nodes don’t announce their own sudden power loss, peers send periodic **heartbeats** (pings) or use lease expirations. When N consecutive heartbeats miss within a timeout window (or an adaptive threshold like a **phi-accrual failure detector**), peers mark the node *suspected* and route around it.',
        '3. **Fault tolerance**: Designing the system so *individual* node/network faults do not cause total system failure—via redundancy (multiple replicas across Availability Zones), timeouts, bounded retries, health checks, and graceful degradation.',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '13.1.7-ex-1',
            title: 'Optimistic version numbers beat wall-clock timestamps',
            language: 'typescript',
            code: `// Fragile across servers: relies on synced wall clocks
// await db.query('UPDATE docs SET body = $1, updated_at = $2 WHERE id = $3 AND updated_at < $2', ...)

// Reliable: monotonic version counter owned by the authoritative row
const result = await db.query(
  \`UPDATE docs
   SET body = $1, version = version + 1
   WHERE id = $2 AND version = $3
   RETURNING version\`,
  [newBody, docId, expectedVersion]
);
if (result.rowCount === 0) {
  throw new ConflictError('Document was updated by another request');
}`,
          },
          lineByLineMarkdown: [
            '- **Lines 1–2**: Wall-clock comparisons silently drop updates whenever two app servers disagree by 50ms.',
            '- **Lines 5–11**: Ordering updates via an explicit monotonic `version` guarantees linearizable conflict detection regardless of server clock skew.',
          ].join('\n'),
        },
      ],
      backendApplicationsMarkdown:
        'Redis distributed locks (`Redlock`/leases), database optimistic locking, and Kubernetes liveness probes all rely on monotonic durations, leases, and heartbeat-based failure detection rather than trusting synced wall clocks.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Clock jumps & timeouts**: Computing `const elapsed = Date.now() - start` can yield negative numbers if NTP steps the clock backward; always use monotonic timers for timeouts and latency measurements.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Physical clocks drift across machines so version numbers or logical clocks must order events, while fault tolerance uses heartbeats, timeouts, and redundancy to survive partial failures.',
    },
  ],
  conceptConnection: {
    title: 'How distributed failure realities dictate system design',
    narrativeMarkdown: [
      'Every advanced distributed pattern in the rest of Block 13 exists because of the physical constraints you just saw:',
      '- **Independent machines + network ambiguity** → forces idempotency and outbox patterns (`13.4`).',
      '- **Network partitions + latency variability** → forces consistency vs. availability trade-offs (`13.2`).',
      '- **Partial failure + skewed clocks** → forces leases, version numbers, and failure detectors (`13.3`, `13.5`).',
    ].join('\n\n'),
    integratedExample: {
      id: '13.1-integrated-example',
      title: 'The Fallacies vs. Reality Checklist',
      language: 'text',
      code: `Assumption on 1 machine          Reality across N machines
─────────────────────────        ──────────────────────────────────
1. Calls succeed or throw   ──▶  Partial failure / ambiguous timeout
2. Latency is ~0 and steady ──▶  Variability (2ms -> 2,000ms spikes)
3. Shared global clock      ──▶  Clock skew & NTP backward jumps
4. Crash stops all actors   ──▶  Network partitions split healthy nodes`,
    },
    walkthroughMarkdown:
      'Keep this translation table in mind whenever someone proposes “just make an HTTP call and compare timestamps.” Next in `13.2`, we see what happens to replicated data when that partition hits.',
  },
  questions: [
    {
      id: '13.1-kc-1',
      focusArea: 'Partial Failures & Network Ambiguity',
      prompt:
        'A Payment Service calls a Bank Gateway over HTTP and hits a `5s` timeout. List the three distinct states the Bank Gateway could actually be in, and explain why this ambiguity makes blind retries dangerous.',
      hints: [
        'Trace the request packet going out, the bank processing it, and the response packet coming back.',
        'If the bank charged the card and only the reply got dropped, what happens when you retry?',
        'The request may never have arrived, the bank may have crashed mid-charge, or the charge succeeded and only the response was lost. Since all three look like a timeout, blindly retrying without an idempotency key risks double-charging.',
      ],
      explanation:
        'A timeout could mean: (1) the request packet was dropped before reaching the bank, (2) the bank crashed while or after processing it, or (3) the charge succeeded and only the HTTP response was lost or delayed. Because all three look identical to the caller, blindly retrying non-idempotent requests risks duplicate side effects.',
      evaluationCriteria: [
        'Identifies lost request, server crash, and lost/delayed response as indistinguishable at timeout',
        'Connects timeout ambiguity to duplicate execution risks on blind retry',
      ],
      topicIds: ['13.1.3', '13.1.4', '13.1.6'],
    },
    {
      id: '13.1-kc-2',
      focusArea: 'Clocks, Partitions & Failure Detection',
      prompt:
        'Why is comparing `Date.now()` timestamps across two servers unsafe for resolving conflicting writes—and why can’t a heartbeat failure detector ever be 100% instant and 100% accurate during latency spikes?',
      hints: [
        'Think about NTP clock drift and NTP stepping clocks backward.',
        'What happens if a healthy node pauses for GC longer than your heartbeat timeout?',
        'Server wall clocks drift by tens of milliseconds, so a newer write on a slower clock can carry an older timestamp and lose. Meanwhile, in an asynchronous network, a slow/GC-paused node looks identical to a crashed node until the timeout window expires.',
      ],
      explanation:
        'Physical clocks across servers drift even with NTP, so an earlier write from a fast-clock server can have a higher timestamp than a genuinely newer write from a lagging-clock server—causing silent data loss. Similarly, heartbeats cannot tell a dead node from a paused/partitioned node instantaneously: short timeouts trigger false positives during latency spikes, while long timeouts delay detecting real crashes.',
      evaluationCriteria: [
        'Explains clock skew causing newer writes to be overwritten by older timestamps',
        'Explains the speed-vs-accuracy trade-off of heartbeat timeouts under latency variability',
      ],
      topicIds: ['13.1.5', '13.1.7', '13.1.8', '13.1.9'],
    },
  ],
};

export const LESSON_13_2: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Suppose you put your database on one server and take `13.1` to heart: *“What if that server catches fire?”* Naturally, you add a **replica** in another Availability Zone so your data lives in two places.',
      'Immediately, a new question appears: **When a user updates their password on Node A, what happens if someone reads from Node B 5 milliseconds later?** In this unit, we’ll derive **strong vs. eventual consistency**, **consistency models**, the **CAP theorem**, **replication** and **replication lag**, **read replicas**, **conflict resolution**, and **data ownership**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Choosing the wrong consistency model either gives users bizarre bugs (they create a post, refresh, and it vanishes!) or grinds your global system to a halt waiting for cross-continent locks.',
    prerequisites: [
      {
        subBlockId: '13.1',
        label: 'Network partitions & latency (13.1)',
        detail: 'Understanding why two nodes cannot communicate instantaneously or reliably.',
      },
      {
        subBlockId: '5.5',
        label: 'ACID Transactions & Isolation (5.5)',
        detail: 'Single-node consistency guarantees that replication stretches.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-13.2.1',
      topicId: '13.2.1',
      coveredTopicIds: ['13.2.2', '13.2.3'],
      title: 'Strong consistency, eventual consistency, and consistency models',
      problemAndRequirementsMarkdown: [
        '### First principles: When two copies of data temporarily disagree',
        'Imagine a bank account with `$100` replicated on **Leader Node A** (Virginia) and **Follower Node B** (Frankfurt). You deposit `$50` on Node A (`balance = $150`). Because light takes ~80ms round-trip across the Atlantic, Node B still says `$100` for those 80 milliseconds.',
        '',
        'Now we face a design choice whenever someone tries to read or write:',
        '- Should Node A **block** answering the deposit until Frankfurt confirms it wrote `$150` too? Or return `"Success!"` immediately and ship `$150` asynchronously in the background?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The spectrum of consistency models',
        '1. **Strong Consistency (Linearizability)**: Once a write completes, *every* subsequent read anywhere sees that new value (or a newer one). Behavior feels like there is only one single copy of the data. Cost: higher write latency (must coordinate across replicas before returning) and unavailability if replicas can’t talk.',
        '2. **Eventual Consistency**: Writes return quickly, and updates propagate asynchronously. If writes stop for long enough, all replicas *eventually* converge to the same state. Cost: readers can momentarily observe stale values.',
        '3. **Practical Middle-Ground Models**: Many bugs happen when engineers treat consistency as just two extremes. Helpful guarantees in between include:',
        '   - **Read-your-own-writes**: A user who edits their own profile always sees their update immediately (e.g., route *their* reads to the leader for 5 seconds), even if strangers see cached/replica data for a second.',
        '   - **Monotonic reads**: Once you see version `v2` of a feed, subsequent refreshes won’t hit an older replica and jump backward to `v1`.',
        '   - **Causal consistency**: If Comment B is a reply to Comment A, nobody sees Comment B appear without Comment A.',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'Use strong consistency for account balances, seat reservations, and password resets; use eventual consistency (plus read-your-own-writes) for view counters, activity feeds, and search indexes.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Strong consistency isn’t free**: Synchronous cross-region quorum commits add tens of milliseconds of WAN round-trip latency to every single write.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Strong consistency guarantees every read sees the latest write at the cost of coordination latency, while eventual consistency favors speed and allows temporary staleness—with models like read-your-own-writes bridging the gap.',
    },
    {
      id: 'topic-13.2.4',
      topicId: '13.2.4',
      coveredTopicIds: [],
      title: 'The CAP Theorem: What a network partition actually forces you to give up',
      problemAndRequirementsMarkdown: [
        '### First principles: Don’t memorize “Pick 2 of 3” blindly',
        'You have probably heard: *“Consistency, Availability, Partition Tolerance — pick two!”* That slogan misleads almost everyone because **you cannot choose “CA” and opt out of network partitions.** Networks drop cables and switches *whether you want them to or not* (`13.1`).',
        '',
        '### Deriving the real dilemma during a partition',
        'Suppose Replica A (US-East) and Replica B (US-West) are cut off from each other by a severed fiber line. A client connected to **Replica B** asks: *“Please update order status—or tell me the current balance.”*',
        '',
        'Replica B has literally only two possible behaviors while cut off from Replica A:',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### CP vs. AP during a Partition',
        '- **Choose C (Consistency — CP)**: Replica B says: *“I cannot verify whether Replica A accepted a newer write while we’re cut off, so I refuse this request with `503 Unavailable`.”* Data never diverges, at the cost of availability on the minority/partitioned side.',
        '- **Choose A (Availability — AP)**: Replica B says: *“I’ll answer using my local copy and accept writes anyway.”* Every reachable node stays online, at the cost of serving stale data or creating conflicting writes that must be merged later.',
        '',
        'Notice the real insight (also formalized by **PACELC**): **When there is NO partition**, you still trade **Latency vs. Consistency** (`L` vs. `C`) on every write depending on whether you replicate synchronously or asynchronously!',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '13.2.4-ex-1',
            title: 'Partition forces CP (refuse) or AP (risk stale/divergent state)',
            language: 'text',
            code: `Client ──▶ [ Node A ]  ◄══ X PARTITION X ══►  [ Node B ] ◀── Client 2
               │                                   │
               ├─ CP system: Minority/unreachable side returns ERROR (stays consistent)
               └─ AP system: Both sides accept reads/writes (diverge; merge later)`,
          },
          lineByLineMarkdown: [
            '- **When healthy**: Both CP and AP systems can return consistent data (though synchronous CP still pays higher latency).',
            '- **During a partition**: P is a physical reality, leaving only the binary choice between rejecting requests (CP) or accepting potential divergence (AP).',
          ].join('\n'),
        },
      ],
      backendApplicationsMarkdown:
        'An inventory checkout database chooses CP (better to return a temporary error than sell the last concert ticket twice); a shopping cart or social feed status check often chooses AP (stay online, reconcile later).',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Most partitions are partial**: Sometimes Node A can’t reach Node B, yet both can reach Node C—quorum-based consensus (Raft/Paxos) lets the majority side (`A + C`, 2 of 3 nodes) remain *both* strongly consistent and available while only the isolated minority pauses!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Because network partitions are unavoidable physical events, the CAP theorem dictates that during a partition a replicated system must choose between refusing requests to preserve consistency (CP) or serving potentially stale/divergent data to stay available (AP).',
    },
    {
      id: 'topic-13.2.5',
      topicId: '13.2.5',
      coveredTopicIds: ['13.2.6', '13.2.7'],
      title: 'Replication, replication lag, and read replicas',
      problemAndRequirementsMarkdown: [
        '### First principles: Offloading reads without melting the primary',
        'Most web applications are heavily read-biased (100 reads per 1 write). Your primary Postgres server handles writes nicely, then starts choking on analytics dashboards and feed queries.',
        '',
        'So you spin up **read replicas**: secondary databases that continuously stream the primary’s Write-Ahead Log (WAL) and apply changes locally. Now 90% of `SELECT` queries go to replicas!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### How asynchronous replication lag bites applications',
        'By default, read replicas update **asynchronously** so a slow replica doesn’t stall primary `INSERT`/`UPDATE` transactions. The time delay between a primary commit and a replica applying it is **replication lag**—typically `5–50ms`, but during bulk migrations or heavy load it can spike to **many seconds**!',
        '',
        'Here is the classic production bug:',
        '1. User submits `POST /comments` → writes to **Primary** (`201 Created`).',
        '2. Client immediately redirects and fetches `GET /comments` → routed to **Read Replica**.',
        '3. Because of 80ms replication lag, the replica hasn’t received the WAL entry yet—**the user’s brand-new comment isn’t there!**',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '13.2.7-ex-1',
            title: 'Preventing stale post-write reads by pinning fresh writes to primary',
            language: 'typescript',
            code: `async function getUserOrders(userId: string, justWroteOrder: boolean) {
  // Pin recent writers to primary (read-your-own-writes), offload everything else
  const db = justWroteOrder ? primaryPool : replicaPool;
  return db.query('SELECT id, status, total FROM orders WHERE user_id = $1', [userId]);
}`,
          },
          lineByLineMarkdown: [
            '- **Line 3**: Passing a short-lived flag/LSN watermark (e.g., within 5 seconds of a mutation by `userId`) routes *that* user’s read to the primary, keeping read-your-own-writes intact while 99% of traffic still hits replicas.',
          ].join('\n'),
        },
      ],
      backendApplicationsMarkdown:
        'Always route authentication checks, billing state updates, and post-mutation reloads to the primary (or track WAL LSN positions), leaving search listings, public feeds, and reports on read replicas.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Synchronous replication kills tail latency**: Turning on `synchronous_commit = remote_apply` removes lag, but makes every primary `COMMIT` wait for network + replica disk flush—if one replica stalls, writes freeze.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Asynchronous read replicas scale read throughput but introduce replication lag, requiring explicit routing rules (like pinning recent writers to the primary) wherever stale reads would break user workflows.',
    },
    {
      id: 'topic-13.2.8',
      topicId: '13.2.8',
      coveredTopicIds: ['13.2.9'],
      title: 'Conflict resolution and data ownership',
      problemAndRequirementsMarkdown: [
        '### First principles: What happens when two leaders accept conflicting writes?',
        'If two replicas (or a mobile client offline and the server online) both accept edits to the same record before syncing, who wins? Without a clear rule, replicas permanently diverge.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Conflict resolution & why data ownership prevents most conflicts',
        '1. **Single-owner / Data ownership (best first defense)**: Assign every piece of data **one authoritative owner**—whether a single primary database, a specific shard owner, or one owning microservice (`13.5`). If only one service/leader can mutate `InventoryCount`, concurrent writes serialize at the owner and conflicts don’t arise across replicas.',
        '2. **When multi-writer / offline sync is unavoidable (Conflict Resolution)**:',
        '   - **Last-Write-Wins (LWW)**: Attach a timestamp/version and discard the smaller one. Simple, but silently drops concurrent updates (`13.1` clock skew risk).',
        '   - **Domain Merge / CRDTs**: Design updates that merge cleanly without losing edits (e.g., `Set.union` for tags, `increment` counters per replica, or collaborative text CRDTs).',
        '   - **Application-level resolution**: Keep both conflicting siblings (like Git merge conflicts or Dropbox “conflicted copy”) and let a user or domain rule decide.',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'Keep financial ledgers, inventory, and auth under strict single-leader data ownership; reserve multi-leader CRDTs or merge strategies for offline-capable mobile notes, shopping carts, or collaborative editors.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **LWW silently loses data**: If two users add different items to a shared shopping cart concurrently under naive LWW, one user’s addition disappears completely.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Clear single-writer data ownership eliminates write conflicts at the source, whereas multi-writer or offline systems require explicit conflict resolution such as CRDTs, domain merges, or Last-Write-Wins.',
    },
  ],
  conceptConnection: {
    title: 'Choosing the right consistency rule for each slice of data',
    narrativeMarkdown: [
      'Real backends rarely pick one global consistency level—they match the model to the business consequence:',
      '- **Money / Inventory / Passwords**: Single **data owner** + **Strong consistency (CP)** on primary.',
      '- **User just edited their own profile**: **Read-your-own-writes** routing around **replication lag**.',
      '- **Public feeds / View counts**: **Eventual consistency (AP)** on **read replicas**.',
    ].join('\n\n'),
    integratedExample: {
      id: '13.2-integrated-example',
      title: 'Per-Domain Consistency Architecture',
      language: 'text',
      code: `Write: Checkout / Balance ──▶ Primary (Single Owner, Strong CP)
Write: Post Comment        ──▶ Primary ──▶ async WAL ──▶ Read Replicas
                                  └─ Author pinned to Primary for 5s (Read-your-own-writes)
                                  └─ Other readers see Replicas (Eventual AP, ~20ms lag)`,
    },
    walkthroughMarkdown:
      'Next in `13.3`, we see how to scale both stateless app servers and stateful databases once one primary node isn’t big enough.',
  },
  questions: [
    {
      id: '13.2-kc-1',
      focusArea: 'CAP Theorem & Consistency Models',
      prompt:
        'Why is “pick any 2 of C, A, P” misleading, and what must a replicated store actually choose during a network partition? Give one backend example suited for CP and one for AP.',
      hints: [
        'Can any networked database guarantee partitions never happen?',
        'When two replicas cannot communicate, what are the only two ways Replica B can answer a request?',
        'Partitions are unavoidable, so during a partition you choose CP (refuse requests to avoid diverging—e.g. bank balance/inventory) or AP (keep answering with potentially stale/conflicting data—e.g. social feeds/view counts).',
      ],
      explanation:
        'Network partitions are physical failures you cannot opt out of, so “CA” doesn’t exist across a network. During a partition, a distributed store must choose **CP** (reject requests on partitioned nodes to prevent divergence—ideal for inventory or balances) or **AP** (keep serving reads/writes on reachable nodes and reconcile later—ideal for feeds, carts, or analytics).',
      evaluationCriteria: [
        'Explains that partition tolerance is mandatory, leaving a CP vs AP choice during partitions',
        'Provides appropriate backend examples for both CP and AP',
      ],
      topicIds: ['13.2.1', '13.2.2', '13.2.3', '13.2.4'],
    },
    {
      id: '13.2-kc-2',
      focusArea: 'Replication Lag & Data Ownership',
      prompt:
        'After adding read replicas, users report creating a record and immediately getting a `404` on the next screen. Diagnose the cause and describe two ways to fix it without turning off read replicas.',
      hints: [
        'Think about where the POST went vs. where the follow-up GET went.',
        'How can you give a user read-your-own-writes without forcing every user onto the primary?',
        'Asynchronous replication lag means the replica has not applied the primary WAL yet. Fix it by pinning recent writers to the primary briefly (or passing a WAL LSN watermark) or returning the created object directly in the POST response.',
      ],
      explanation:
        'The write went to the primary while the immediate `GET` hit an asynchronous **read replica** still behind by **replication lag**. Fix this while keeping replicas by: (1) pinning that user’s reads to the primary for a short window after a write (providing **read-your-own-writes**), (2) having replicas wait for the primary’s returned WAL LSN before reading, or (3) updating client state directly from the write response.',
      evaluationCriteria: [
        'Identifies asynchronous replication lag between primary and read replica',
        'Proposes read-your-own-writes pinning, LSN tracking, or returning mutated state cleanly',
      ],
      topicIds: ['13.2.5', '13.2.6', '13.2.7', '13.2.8', '13.2.9'],
    },
  ],
};

export const LESSON_13_3: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Your product took off! One Node.js server and one Postgres database used to handle 150 requests/sec smoothly, and now traffic is hitting 8,000 requests/sec with 4 TB of data.',
      'In this unit, we’ll examine **vertical vs. horizontal scaling**, **stateless services**, **load balancing**, **database replication**, **partitioning vs. sharding**, **distributed caching**, **connection management across instances**, and **capacity planning**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Throwing more instances behind a load balancer without fixing hidden local state or Postgres connection limits will actually crash your database *faster* at scale.',
    prerequisites: [
      {
        subBlockId: '10.4',
        label: 'Distributed Caching (10.4)',
        detail: 'Sharing hot read state across backend instances via Redis.',
      },
      {
        subBlockId: '13.2',
        label: 'Replication & consistency (13.2)',
        detail: 'How read replicas trade lag for read capacity.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-13.3.1',
      topicId: '13.3.1',
      coveredTopicIds: ['13.3.2', '13.3.3', '13.3.4'],
      title: 'Vertical vs. horizontal scaling, stateless services, and load balancing',
      problemAndRequirementsMarkdown: [
        '### First principles: Bigger box vs. more boxes',
        'When your server maxes out CPU, the simplest move is **vertical scaling (scaling up)**: buy a bigger machine (8 vCPUs → 64 vCPUs, 32 GB RAM → 256 GB RAM). Zero code changes! So why doesn’t everyone just scale vertically forever?',
        '',
        'Three walls stop vertical scaling:',
        '1. **Hardware ceiling & exponential cost**: The largest cloud instances cost way more per core than commodity boxes, and eventually there *is* no bigger machine.',
        '2. **Single point of failure**: One giant box still goes dark during reboots or hardware faults.',
        '3. **Zero elasticity**: You can’t double RAM mid-request spike without restarting.',
        '',
        '### Deriving what horizontal scaling demands',
        'To **scale horizontally (scaling out)**—adding more identical server instances—a **load balancer** distributes incoming requests across instances. Look what happens if Instance 1 stores login sessions or uploaded files in its local RAM/disk: when the load balancer sends the user’s next request to Instance 2, **they appear logged out!** Horizontal scaling therefore requires **stateless services**.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### How stateless services & load balancing work together',
        '- **Stateless services**: Application servers hold *no* durable or user-session state between requests. Sessions live in Redis/JWTs, files live in S3, and business data lives in Postgres. Any instance can handle any request interchangeably, or be terminated/autoscaled at any second.',
        '- **Load balancing**: A reverse proxy/LB (`ALB`, `Nginx`, `Envoy`) accepts client traffic, runs periodic **health checks** (`GET /healthz`) to remove sick instances, and spreads load using algorithms like **Round Robin**, **Least Connections** (great when requests vary in duration), or **Consistent Hashing** (for sticky cache locality).',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'Keep Node.js/API containers strictly stateless so ECS/Kubernetes autoscaling can add 10 pods during Black Friday and drain/terminate them 2 hours later without dropping a single user session.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **WebSockets aren’t stateless**: Persistent sockets stay pinned to one backend node, requiring external pub/sub (Redis/Kafka) to broadcast messages across instances (`11.2`).',
      ].join('\n\n'),
      centralIdeaSummary:
        'Vertical scaling hits hardware and availability ceilings, whereas horizontal scaling uses load balancers across stateless service instances so any node can handle any request.',
    },
    {
      id: 'topic-13.3.5',
      topicId: '13.3.5',
      coveredTopicIds: ['13.3.6', '13.3.7'],
      title: 'Database replication, partitioning, and sharding',
      problemAndRequirementsMarkdown: [
        '### First principles: App servers scaled to 50 nodes—now the database melts',
        'Making app servers stateless is easy. Databases are hard because they **hold the state**. First you add **database replication** (`13.2`) so 10 read replicas absorb `SELECT`s. Eventually, two bottlenecks remain: **write throughput** (all writes still hit 1 primary) and **table/index size** (a 5-billion-row index no longer fits in RAM, turning index lookups into slow disk seeks).',
        '',
        '### Partitioning vs. Sharding',
        '- **Partitioning (within one database)**: Splitting one huge logical table (`events_2025_01`, `events_2025_02`) on **the same database server** so queries prune old partitions and active indexes stay small in RAM.',
        '- **Sharding (across multiple database servers)**: Splitting rows across **independent database nodes** (`Shard 1: tenant_id 1..1000`, `Shard 2: tenant_id 1001..2000`) by a **shard key** so writes and storage scale horizontally!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Why sharding is a last resort (choose your shard key carefully)',
        'Once data lives on separate database servers:',
        '- **Cross-shard joins & transactions become slow or impossible** (no single-node ACID across shards).',
        '- **Hotspots ("celebrity key" problem)**: If you shard orders by `customer_id` and Amazon/Nike accounts for 40% of orders, Shard #3 still melts while 15 other shards sit idle!',
        '- **Resharding is painful**: Changing from 4 shards to 8 shards requires migrating terabytes of live rows—consistent hashing (`hash(key) % ring`) or virtual shards minimize movement.',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '13.3.7-ex-1',
            title: 'Routing queries deterministically with a shard key',
            language: 'typescript',
            code: `function getShardIndex(tenantId: string, shardCount: number): number {
  let hash = 0;
  for (let i = 0; i < tenantId.length; i++) {
    hash = (hash * 31 + tenantId.charCodeAt(i)) >>> 0;
  }
  return hash % shardCount;
}

// Every query for a tenant includes tenantId so we hit ONLY 1 shard
async function listInvoices(tenantId: string) {
  const shard = shardPools[getShardIndex(tenantId, shardPools.length)];
  return shard.query('SELECT id, amount_cents FROM invoices WHERE tenant_id = $1', [tenantId]);
}`,
          },
          lineByLineMarkdown: [
            '- **Lines 1–7**: Hashes `tenantId` to distribute tenants evenly across shards.',
            '- **Lines 10–13**: Queries carrying the shard key go directly to 1 shard; queries *without* `tenantId` (e.g. global admin search) force expensive scatter-gather queries across every shard.',
          ].join('\n'),
        },
      ],
      backendApplicationsMarkdown:
        'Scale databases in order: (1) indexes & query tuning (`12.3`) → (2) caching (`10.2`) → (3) read replicas (`13.2`) → (4) local table partitioning → (5) sharding only when single-node writes or storage truly max out.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Scatter-gather kill switch**: If a query lacks the shard key, the router must query all N shards and merge results—latency becomes the slowest of all N shards.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Database replication scales reads, local partitioning keeps single-node tables fast, and sharding scales writes and storage across servers at the steep cost of losing cross-shard joins and transactions.',
    },
    {
      id: 'topic-13.3.8',
      topicId: '13.3.8',
      coveredTopicIds: ['13.3.9', '13.3.10'],
      title: 'Distributed caching, connection management across instances, and capacity planning',
      problemAndRequirementsMarkdown: [
        '### First principles: The “50 instances × 20 DB connections = 1,000 connections” disaster',
        'Suppose your Postgres instance allows `max_connections = 200`. Locally you configured your Node pool to `20` connections—plenty of headroom! Then autoscaling spins up `40` API containers during a launch. `40 × 20 = 800` open connections slam Postgres at once, **locking out even your admin shell and thrashing CPU on context switches!**',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Three essentials for operating multi-instance scale smoothly',
        '1. **Distributed caching (`10.4`)**: Keeping hot reads (feature flags, user sessions, rendered product summaries) in a shared Redis cluster absorbs 80–95% of repetitive read load before it ever touches Postgres.',
        '2. **Connection management across instances**: Size per-instance DB pools conservatively (`poolSize × maxInstances < dbMaxConnections`) and place a lightweight **connection pooler** (`PgBouncer` in transaction-pooling mode or RDS Proxy) in front of Postgres so 1,000 app-server connections multiplex cleanly onto ~50 real backend Postgres processes.',
        '3. **Capacity planning**: Estimate peak traffic (`RPS`), payload sizes, DB writes/sec, storage growth, and headroom *before* traffic hits:',
        '   - Measure single-node saturation limit via load testing (`k6`, `Artillery`), e.g., 1 container handles `250 RPS` comfortably at 60% CPU.',
        '   - Plan for **N+1 / Multi-AZ redundancy** (e.g., if 1 of 3 Availability Zones dies, remaining capacity must still stay below saturation ~70%).',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'Using PgBouncer/RDS Proxy plus Redis caching lets serverless functions or 100 autoscaled ECS containers share a single Postgres primary safely without connection exhaustion.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **PgBouncer transaction mode gotcha**: Session-scoped Postgres features (prepared statements without disabling, `SET LOCAL` without transactions, `LISTEN/NOTIFY`) behave differently under transaction pooling.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Scaling horizontally multiplies downstream load, requiring shared distributed caches, external connection poolers (like PgBouncer) to bound database connections, and capacity planning grounded in measured saturation limits and N+1 failover headroom.',
    },
  ],
  conceptConnection: {
    title: 'The Scaling Ladder: Climb only as high as you need',
    narrativeMarkdown: [
      'Great engineers avoid premature complexity by pulling scaling levers in sequence:',
      '1. **Optimize & Cache**: Fix N+1 queries (`12.3`), add **distributed caching** (`Redis`).',
      '2. **Stateless App Tier**: **Load balancer** + **stateless services** + **horizontal scaling**.',
      '3. **Protect DB Connections**: **PgBouncer / connection management** + **read replicas**.',
      '4. **Split Data Only When Forced**: **Partitioning** on one node → **sharding** across nodes.',
    ].join('\n\n'),
    integratedExample: {
      id: '13.3-integrated-example',
      title: 'Full Scaled Read/Write Path',
      language: 'text',
      code: `Clients ─▶ Load Balancer ─▶ Stateless App Instances (N autoscaled)
                                 ├──▶ Redis Cluster (Distributed Cache)
                                 ├──▶ PgBouncer ─▶ Primary DB (Writes, Shard 1..K)
                                 └──▶ Read Replicas (Reads)`,
    },
    walkthroughMarkdown:
      'Every box on this diagram answers a specific bottleneck—and **capacity planning** verifies with load tests where the next bottleneck will crack before users do.',
  },
  questions: [
    {
      id: '13.3-kc-1',
      focusArea: 'Stateless Horizontal Scaling & Connection Management',
      prompt:
        'Your team enables autoscaling from 4 to 40 API containers behind an Application Load Balancer. Immediately, users get randomly logged out and Postgres rejects new connections (`too many clients`). Identify both root causes and how to fix each.',
      hints: [
        'Where might the original 4 containers have stored session data locally?',
        'Multiply 40 containers by each container’s local DB connection pool size.',
        'Random logouts indicate local in-memory sessions (must move to Redis/JWTs for stateless services). Too many clients occurs when `instances × pool_size > max_connections` (fix by shrinking pools and placing PgBouncer/RDS Proxy in front of Postgres).',
      ],
      explanation:
        'First, the service was not **stateless**—storing sessions in process memory or local disk meant requests routed by the load balancer to another instance lost session state (move sessions to Redis or signed tokens). Second, `40 × poolSize` exceeded Postgres’s `max_connections`—fix **connection management across instances** by capping per-instance pools and using **PgBouncer** / RDS Proxy to multiplex connections.',
      evaluationCriteria: [
        'Identifies non-stateless local session storage and prescribes externalizing state (Redis/JWT)',
        'Identifies `instances × poolSize` exhausting DB connections and prescribes pooler + bounded pools',
      ],
      topicIds: ['13.3.2', '13.3.3', '13.3.4', '13.3.8', '13.3.9'],
    },
    {
      id: '13.3-kc-2',
      focusArea: 'Partitioning vs Sharding & Capacity Planning',
      prompt:
        'How does **partitioning** differ from **sharding**, why should sharding usually wait until vertical scaling, caching, and read replicas are exhausted, and what goes wrong if you choose a poor shard key?',
      hints: [
        'Do partitions live on the same database server or separate servers?',
        'Think about cross-node SQL joins, distributed transactions, and uneven traffic ("hot shards").',
        'Partitioning splits a table on one DB server; sharding splits data across separate DB servers. Sharding breaks single-node joins/transactions, and a skewed shard key sends most traffic to one overloaded "hot shard."',
      ],
      explanation:
        '**Partitioning** divides a large table into smaller physical segments on *one* DB server to improve index/vacuum performance, whereas **sharding** distributes rows across *independent* database servers. Sharding adds cross-shard join/transaction complexity and resharding risk, so optimize, cache, replicate reads, and partition first—and choose a high-cardinality, evenly distributed **shard key** to prevent hot shards.',
      evaluationCriteria: [
        'Distinguishes single-server partitioning from multi-server sharding',
        'Explains cross-shard joins/transactions and hot-shard risk from skewed shard keys',
      ],
      topicIds: ['13.3.1', '13.3.5', '13.3.6', '13.3.7', '13.3.10'],
    },
  ],
};
