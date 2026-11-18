import { FptLessonContent, RecipeLessonContent } from '../types';

export const LESSON_5_6_FPT: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Up to here, you write SQL (`SELECT ... JOIN ... WHERE ...`)—which only describes **what** result you want, never **how** the database should fetch it! Inside PostgreSQL, a query planner turns your declarative SQL into concrete physical steps across the heap pages (`5.4`) and B+ tree indexes (`5.5`).',
      'In this unit, we’ll examine **Query Execution** from first principles: **how SQL parsing, planning, and optimization produce execution plans**, **sequential vs. index scans**, **how the engine executes joins**, **reading `EXPLAIN` vs `EXPLAIN ANALYZE`**, and **why the N+1 query problem crushes backend latency**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Understanding execution plans stops guesswork when an endpoint slows down from 15ms to 4 seconds—letting you see immediately whether Postgres used your index, picked a bad join, or got buried under 501 tiny N+1 round-trips from Node.js.',
    prerequisites: [
      {
        subBlockId: '5.4',
        label: 'Heap pages & Buffer Cache (5.4.1–5.4.5)',
        detail:
          'Knowing that sequential reads and random page fetches have very different costs.',
      },
      {
        subBlockId: '5.5',
        label: 'B+ Tree indexes & selectivity (5.5.3–5.5.10)',
        detail:
          'Knowing why selective lookups prefer indexes while broad low-selectivity scans don’t.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-5.6.1',
      topicId: '5.6.1',
      coveredTopicIds: ['5.6.2', '5.6.3', '5.6.4'],
      title: 'SQL parsing, planning, optimization, and execution plans',
      problemAndRequirementsMarkdown: [
        '### First principles: How does declarative SQL turn into actual disk & memory operations?',
        'Notice that SQL never says *“open `idx_users_email`, walk 3 levels, then hash-join `orders`.”* Two different databases—or the same table at 100 rows vs 10,000,000 rows—might execute the exact same SQL string in completely different ways!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Parse → Plan & Optimize → Execute',
        'Every SQL query passes through three conceptual stages before returning rows:',
        '1. **SQL Parsing**: Checks syntax (`SELECT`, `FROM`, table/column names) and verifies permissions, turning SQL text into a structured syntax tree.',
        '2. **Query Planning & Optimization (Cost-Based)**: The planner uses **table statistics** (how many rows are in each table, how common different values are) to invent several candidate ways to answer your query—for instance, scanning the table vs using Index A vs Index B, or joining `users` first vs `orders` first. It estimates the CPU + I/O cost of each plan and picks the cheapest **Execution Plan** (a tree of operators like `Scan`, `Join`, `Sort`, `Limit`).',
        '3. **Execution**: The executor walks that chosen plan tree from leaves up to the root, pulling rows and streaming them back to your client.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Because SQL is declarative, the database parses SQL, uses table statistics to cost-optimize candidate strategies into an Execution Plan tree, and executes that plan.',
      codeExamples: [],
    },
    {
      id: 'topic-5.6.5',
      topicId: '5.6.5',
      coveredTopicIds: ['5.6.6', '5.6.7'],
      title: 'Sequential scans, Index scans, and Join strategies',
      problemAndRequirementsMarkdown: [
        '### First principles: Why doesn’t the optimizer ALWAYS pick an Index Scan—and how does it join two tables?',
        'If a table has only 20 rows (all fitting on **1** 8 KB heap page!), reading 3 index pages + 1 heap page is actually *more* work than just reading that 1 heap page directly! And when joining `orders` (`100,000` rows) with `users` (`50,000` rows), there isn’t just one way to match `orders.user_id = users.id`.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Scans & the three Join Strategies',
        '**Scanning a table**:',
        '- **Sequential Scan (`Seq Scan`)**: Reads every 8 KB heap page of the table from start to finish. Fastest for tiny tables OR when a query needs a large fraction (say 40%+) of the table anyway.',
        '- **Index Scan (`Index Scan` / `Index Only Scan`)**: Traverses a B+ tree to fetch only matching row pointers (or just the leaf entries for a covering index!). Wins overwhelmingly when selectivity is high (fetching a tiny slice of a large table).',
        '',
        '**Joining two tables (3 classic algorithms)**:',
        '1. **Nested Loop Join**: For each matching row in the outer table, look up matching rows in the inner table (great when the outer set is tiny—say 10 rows—and the inner table has an **index** on the join key!).',
        '2. **Hash Join**: Load the smaller filtered side into an in-memory **hash table** keyed by `id`, then stream through the larger table once checking the hash table (`O(1)` per row). Great for large unsorted joins when no small index range applies!',
        '3. **Merge Join**: If both tables are already sorted by the join key (e.g., from B+ tree indexes), zip straight down both sorted streams in one single pass!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Optimizers choose Sequential Scans for tiny tables or broad reads and Index Scans for selective lookups, pairing them with Nested Loop, Hash, or Merge Joins depending on input sizes and sort order.',
      codeExamples: [],
    },
    {
      id: 'topic-5.6.8',
      topicId: '5.6.8',
      coveredTopicIds: ['5.6.9', '5.6.10'],
      title: 'EXPLAIN, EXPLAIN ANALYZE, and the N+1 query problem',
      problemAndRequirementsMarkdown: [
        '### First principles: Never guess why a query is slow—AND watch out for loops hiding fast queries!',
        'Two different latency traps hit Node.js backends constantly:',
        '1. One single SQL query runs slowly because the planner made a bad guess (maybe stats were stale or an index didn’t match)—you need x-ray vision into what the planner *guessed* vs what *actually ran*.',
        '2. Every single SQL query takes only **1 millisecond** (`SELECT * FROM items WHERE order_id = $1`), yet your `GET /orders` endpoint takes **800 milliseconds**! How can 1ms queries take 800ms?!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: `EXPLAIN`, `EXPLAIN ANALYZE`, and Fixing `N+1`',
        '- **`EXPLAIN <query>`**: Asks the planner to print its chosen execution plan and **estimated** row counts/costs—*without actually executing the query* (completely safe even for `DELETE`/`UPDATE` inspection!).',
        '- **`EXPLAIN ANALYZE <query>`**: **Actually executes the query** and prints **real** timing, **actual row counts**, and **actual loops** right next to the estimates! *(Caution: since it truly executes the SQL, wrap `UPDATE`/`DELETE` in `BEGIN; EXPLAIN ANALYZE ...; ROLLBACK;` so changes don’t stick!)* Comparing *estimated rows* vs *actual rows* immediately exposes stale table statistics or surprise `Seq Scan` bottlenecks.',
        '',
        '- **The N+1 Query Problem**: Suppose you fetch `200` orders (`1` query), and then in JavaScript loop `for (const order of orders)` calling `await db.query("SELECT * FROM order_items WHERE order_id = $1", [order.id])` (`200` more queries = **`201` total queries**, i.e., `1 + N`)! Even if Postgres executes each query in `0.5ms`, paying `200` sequential TCP network round-trips kills latency and floods the database.',
        '  *The fix*: Replace the loop with **one** `JOIN`, an `IN / ANY($1::bigint[])` batch query (`WHERE order_id = ANY($1)`), or a dataloader batch—turning `N + 1` round-trips into **`2` (or `1`)**!',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '5.6.10-ex-1',
            title: 'Eliminating the N+1 query loop with a batched query',
            language: 'typescript',
            code: `// BAD: N+1 pattern — 1 query + N sequential network round-trips!
async function loadOrdersSlow(userId: number) {
  const orders = await db.query("SELECT id, total_cents FROM orders WHERE user_id = $1", [userId]);
  for (const order of orders) {
    order.items = await db.query("SELECT * FROM order_items WHERE order_id = $1", [order.id]);
  }
  return orders;
}

// GOOD: 2 queries total regardless of how many orders exist!
async function loadOrdersFast(userId: number) {
  const orders = await db.query("SELECT id, total_cents FROM orders WHERE user_id = $1", [userId]);
  if (orders.length === 0) return [];
  const orderIds = orders.map((o) => o.id);
  const allItems = await db.query("SELECT * FROM order_items WHERE order_id = ANY($1)", [orderIds]);
  // Group allItems by order_id in memory...
  return { orders, allItems };
}`,
          },
          lineByLineMarkdown: [
            '- **Lines 2–8**: For 100 orders, this pays **101** database network round-trips sequentially.',
            '- **Lines 12–17**: Fetches all matching items in **one** batched query (`WHERE order_id = ANY($1)` in Postgres) and maps them in JS memory.',
          ].join('\n'),
        },
      ],
      centralIdeaSummary:
        'EXPLAIN shows the planner’s estimated plan while EXPLAIN ANALYZE measures actual runtime rows and timings; replacing per-item N+1 query loops with JOINs or batched IN/ANY queries eliminates redundant network round-trips.',
    },
  ],
  conceptConnection: {
    title: 'Diagnosing slow backend endpoints systematically',
    narrativeMarkdown: [
      'When a database-backed endpoint feels slow, `5.6` gives you a concrete two-question checklist:',
      '1. **Too many queries? (`N+1`)**: Check how many SQL statements ran per HTTP request—collapse loops into a `JOIN` or `WHERE id = ANY($1)` batch.',
      '2. **One slow query? (`EXPLAIN ANALYZE`)**: Inspect whether Postgres used a `Seq Scan` instead of an `Index Scan`, misestimated row counts (stale stats), or chose an inefficient join strategy.',
    ].join('\n\n'),
    integratedExample: {
      id: '5.6-integrated-example',
      title: 'Reading a PostgreSQL EXPLAIN ANALYZE plan',
      language: 'text',
      code: `EXPLAIN ANALYZE
SELECT o.id, c.email FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'pending';

Hash Join  (cost=12.50..248.00 rows=40 width=40) (actual time=0.45..2.10 rows=38 loops=1)
  Hash Cond: (o.customer_id = c.id)
  -> Index Scan using idx_orders_pending on orders o (actual time=0.05..0.18 rows=38 loops=1)
  -> Hash (actual time=0.35..0.35 rows=1000 loops=1)
       -> Seq Scan on customers c (actual time=0.02..0.20 rows=1000 loops=1)`,
    },
    walkthroughMarkdown:
      'Reading bottom-up: Postgres used our partial index (`idx_orders_pending`) to grab the 38 pending orders in `0.18ms`, hashed the small 1,000-row `customers` table in `0.35ms`, and matched them via `Hash Join` in `2.1ms` total.',
  },
  questions: [
    {
      id: '5.6-kc-1',
      focusArea: 'Seq Scan vs Index Scan & Planner Costs',
      prompt:
        'Why does PostgreSQL’s query optimizer sometimes deliberately choose a **Sequential Scan** over an **Index Scan** even when a valid index exists on the column in `WHERE`?',
      hints: [
        'Think about two cases: a tiny 10-row table, OR a filter matching 70% of a large table.',
        'Compare hopping back and forth between index pages and random heap pages vs streaming heap pages sequentially.',
        'If a table fits on a couple of pages—or the filter matches a large percentage of rows (low selectivity)—reading the heap sequentially costs fewer page reads and less random I/O than bouncing between B+ tree index pages and heap pages.',
      ],
      explanation:
        'The optimizer picks whichever execution plan has the lowest estimated CPU + I/O cost. On tiny tables (only a few 8 KB pages) or low-selectivity filters matching a large share of rows, hopping back and forth from B+ tree leaf pages to heap pages causes more I/O than simply streaming through the heap pages once with a **Sequential Scan**.',
      evaluationCriteria: [
        'Identifies tiny table size and low-selectivity broad filters',
        'Explains random index+heap I/O exceeding sequential heap scan cost',
      ],
      topicIds: ['5.6.2', '5.6.3', '5.6.4', '5.6.5', '5.6.6'],
    },
    {
      id: '5.6-kc-2',
      focusArea: 'EXPLAIN vs EXPLAIN ANALYZE',
      prompt:
        'What is the critical difference between running **`EXPLAIN`** vs **`EXPLAIN ANALYZE`**, and why should you wrap `EXPLAIN ANALYZE UPDATE ...` inside `BEGIN; ... ROLLBACK;`?',
      hints: [
        'One only asks the planner for estimates; the other runs the query to time it.',
        'What happens to the database rows if you run `EXPLAIN ANALYZE DELETE FROM orders;` directly?',
        '`EXPLAIN` only displays estimated plan costs without running the query; `EXPLAIN ANALYZE` actually executes the statement to record real row counts and timings—so write statements really modify data unless rolled back.',
      ],
      explanation:
        '**`EXPLAIN`** runs only the parser and planner, returning the chosen plan tree and *estimated* costs/rows without modifying anything. **`EXPLAIN ANALYZE`** actually **executes** the query to report *actual* runtime milliseconds, loops, and row counts—which means running it on `INSERT`/`UPDATE`/`DELETE` mutates real rows unless wrapped in `BEGIN; ... ROLLBACK;`.',
      evaluationCriteria: [
        'Distinguishes planner estimates (`EXPLAIN`) from real execution timings (`EXPLAIN ANALYZE`)',
        'Notes real side-effect risk on write queries without ROLLBACK',
      ],
      topicIds: ['5.6.8', '5.6.9'],
    },
    {
      id: '5.6-kc-3',
      focusArea: 'The N+1 Query Problem',
      prompt:
        'A dashboard endpoint runs `SELECT * FROM posts LIMIT 50`, then loops over the 50 posts calling `await db.query("SELECT * FROM users WHERE id = $1", [post.authorId])`. Even though each query takes <1ms in Postgres, why is this **N+1 pattern** slow—and name two ways to fix it.',
      hints: [
        'Count how many sequential network round-trips occurred (`1 + 50`), and remember TCP/protocol overhead per round-trip.',
        'Think about fetching all 50 authors in one call via SQL.',
        'It pays 51 sequential network/query round-trips instead of 1–2; fix it with a single `JOIN` or by collecting all unique `authorId`s and running one batched `WHERE id = ANY($1)` query.',
      ],
      explanation:
        'Even if each SQL execution takes `<1ms`, running 50 separate `await` queries inside a loop pays **51 sequential network round-trips**, parsing/planning overhead, and connection pool contention (`1 + N`). Fix it either by joining `users` in the initial SQL query (`JOIN`) or collecting all `authorId` values and running **one** batched query (`WHERE id = ANY($1)`).',
      evaluationCriteria: [
        'Identifies repeated sequential network round-trip latency (`1 + N`)',
        'Proposes SQL JOIN or batched `IN` / `ANY($1)` lookup',
      ],
      topicIds: ['5.6.7', '5.6.10'],
    },
  ],
};

export const LESSON_5_6_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Inspect real SQL execution plans with **`EXPLAIN (ANALYZE, BUFFERS)`**, fix missing/misaligned indexes, pick the right join/batch pattern, and eliminate **`N+1` query loops** in Node.js services.',
  whenToUseMarkdown:
    'Run this workflow whenever a database endpoint degrades under real table sizes, before adding a new index, or during code review of endpoints that query lists and nested relations.',
  setupCommands: [
    {
      id: '5.6-cmd-1',
      label: 'Inspect actual plan, timings, and buffer cache hits in psql',
      command: 'psql "$DATABASE_URL" -c "EXPLAIN (ANALYZE, BUFFERS) SELECT ...;"',
      notes: 'BUFFERS shows how many 8 KB pages came from RAM Buffer Cache ("shared hit") vs physical disk ("shared read").',
    },
  ],
  coreApisMarkdown: [
    '- **`EXPLAIN <sql>`**: Safe read-only estimate of scan types, join strategy, and estimated rows.',
    '- **`EXPLAIN (ANALYZE, BUFFERS) <sql>`**: Executes query and prints actual timings, actual row counts, and 8 KB page hits/reads.',
    '- **Batched Array Filtering (`WHERE id = ANY($1::bigint[])`)**: Replaces `N` per-item loop queries with 1 single query.',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Verify query count per request first (spot N+1 loops)',
      detailMarkdown:
        'Check your handler for `await db.query(...)` inside `for` or `Promise.all(rows.map(...))`. Replace per-row queries with a single `JOIN` or batched `WHERE foreign_key = ANY($1)` lookup.',
    },
    {
      stepNumber: 2,
      title: 'Run EXPLAIN (ANALYZE, BUFFERS) on slow queries',
      detailMarkdown:
        'Compare `rows=` (planner estimate) vs `actual rows=` (reality). Large mismatches mean stale stats (`ANALYZE table_name;`); unexpected `Seq Scan` on huge tables points to missing or unaligned indexes (`5.5`).',
      code: {
        id: '5.6-step-2',
        title: 'Safe EXPLAIN ANALYZE on a write query inside a rolled-back transaction',
        language: 'sql',
        code: `BEGIN;
EXPLAIN (ANALYZE, BUFFERS)
UPDATE orders SET status = 'archived' WHERE created_at < '2025-01-01';
ROLLBACK;`,
      },
    },
    {
      stepNumber: 3,
      title: 'Align index columns and re-verify',
      detailMarkdown:
        'If a `Filter:` line discards 99% of scanned rows (`Rows Removed by Filter: 98500`), add a composite or partial index matching the `WHERE` + `ORDER BY` predicates and re-run `EXPLAIN (ANALYZE, BUFFERS)` to confirm the scan switched to `Index Scan` / `Index Only Scan`.',
    },
  ],
  workingExamples: [
    {
      id: '5.6-ex-1',
      title: 'Replacing N+1 order-item queries with 1 batched query + Map lookup in TypeScript',
      language: 'typescript',
      code: `interface Order { id: number; totalCents: number; }
interface OrderItem { orderId: number; sku: string; qty: number; }

export async function getOrdersWithItems(
  query: <T>(sql: string, params: unknown[]) => Promise<T[]>,
  customerId: number
) {
  const orders = await query<Order>(
    "SELECT id, total_cents AS \\"totalCents\\" FROM orders WHERE customer_id = $1 ORDER BY id DESC LIMIT 20",
    [customerId]
  );
  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const items = await query<OrderItem>(
    "SELECT order_id AS \\"orderId\\", sku, qty FROM order_items WHERE order_id = ANY($1::bigint[])",
    [orderIds]
  );

  const itemsByOrder = new Map<number, OrderItem[]>();
  for (const item of items) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }

  return orders.map((order) => ({
    ...order,
    items: itemsByOrder.get(order.id) ?? [],
  }));
}`,
      explanation:
        'Constant 2 database queries regardless of whether the customer has 1 order or 20 orders, using a Map for O(1) in-memory assembly.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Running `EXPLAIN ANALYZE UPDATE/DELETE ...` outside a `BEGIN; ... ROLLBACK;` block.',
      fix: '`EXPLAIN ANALYZE` genuinely executes the SQL! Always wrap mutations in a rolled-back transaction when profiling.',
    },
    {
      mistake: 'Adding `WHERE LOWER(email) = ...` and wondering why an index on `(email)` isn’t used.',
      fix: 'Wrapping an indexed column in a function hides raw values from a standard B+ tree—either normalize on write or create a matching expression index `ON users (LOWER(email))`.',
    },
  ],
  exercise: {
    id: '5.6-ex',
    title: 'Eliminate N+1 Queries & Diagnose an Execution Plan',
    instructionsMarkdown:
      '1. Given an endpoint that queries 50 projects and loops to fetch `tasks` per project, rewrite it cleanly into a batched `WHERE project_id = ANY($1)` loader grouped by `Map`.\n2. Inspect this hypothetical `EXPLAIN ANALYZE` snippet:\n`Seq Scan on invoices (cost=0..18500 rows=50000) (actual time=0.1..195.4 rows=12 loops=1)`\n`  Filter: (tenant_id = 42 AND status = \'overdue\')`\n`  Rows Removed by Filter: 499988`\nDiagnose why it’s slow and write the exact index DDL that fixes it.',
    acceptanceChecklist: [
      'Replaces loop query with batched ANY($1) query and Map grouping',
      'Identifies Seq Scan removing 499,988 rows + stale estimate (50000 vs 12)',
      'Creates targeted composite or partial index on (tenant_id, status) or WHERE status = \'overdue\'',
    ],
  },
};

export const LESSON_5_7_FPT: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Every time our Node.js service runs a SQL query, it travels over a **database connection** (`2.1`, `2.2`). Now ask a practical scaling question: **should your Node.js handler open a fresh connection to PostgreSQL on every HTTP request, or keep one single global connection forever?**',
      'Spoiler: **both extremes fail badly under real load!** In this unit, we’ll derive **Connection Management** from first principles: **what a database connection costs**, **why connection pooling solves it**, **how to think about pool sizing and pool exhaustion**, **prepared statements**, and **connection timeouts**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Misconfigured connection pools crash production apps more often than bad SQL—“sorry, too many clients already,” hung requests waiting forever for a pool slot, or Postgres running out of RAM under 500 idle backend connections.',
    prerequisites: [
      {
        subBlockId: '2.1',
        label: 'TCP 3-way handshake & TIME_WAIT (2.1.8, 2.1.9)',
        detail:
          'Knowing that opening a new TCP socket costs round-trip latency and teardown lingers in TIME_WAIT.',
      },
      {
        subBlockId: '2.2',
        label: 'TLS handshake cost (2.2.5, 2.2.7)',
        detail:
          'Knowing that encrypted connections add TLS verification and key-exchange round-trips on setup.',
      },
      {
        subBlockId: '1.1',
        label: 'OS processes & memory (1.1.3, 1.1.7)',
        detail:
          'Knowing each live OS process reserves its own memory and file descriptors.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-5.7.1',
      topicId: '5.7.1',
      coveredTopicIds: ['5.7.2', '5.7.3'],
      title: 'Database connections, establishment cost, and connection pooling',
      problemAndRequirementsMarkdown: [
        '### First principles: Why can’t we just open a DB connection per request (or share 1 connection forever)?',
        'Test both naive designs against 500 concurrent users:',
        '1. **Open-and-close per HTTP request**: Every single query pays TCP handshake + TLS handshake + Postgres authentication—easily adding **20–100ms** of overhead before even parsing SQL! Worse, in PostgreSQL each connection spawns a dedicated OS backend **process** (~5–10 MB RAM per connection), so 500 rapid connections thrash CPU and memory.',
        '2. **One single shared connection for the whole Node process**: Remember `5.1`? Transactions (`BEGIN ... COMMIT`) live on a connection, and a single connection runs queries sequentially—so 50 concurrent users queue up behind one slow query!',
        '',
        '### Deriving the requirement',
        'We want a **bounded pool of warm, already-authenticated connections** kept open and shared safely across requests (**Connection Pooling**).',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: How a Connection Pool works',
        'A **connection pool** (such as `new Pool({ max: 10 })` in `node-postgres`) maintains a reusable set of open connections to PostgreSQL:',
        '1. **Borrow**: When a request needs a query or transaction, it borrows an idle warm connection from the pool (`0ms` handshake cost!).',
        '2. **Execute**: Runs its query (or full `BEGIN ... COMMIT` transaction on that exact borrowed connection).',
        '3. **Release**: Hands the connection cleanly back to the pool so the next request reuses it right away—**never closing the underlying TCP/TLS socket** unless idle too long or broken.',
        '',
        '```text',
        '500 Concurrent Node Requests ──▶ [Connection Pool (max = 10)] ══(10 warm TCP/TLS links)══▶ PostgreSQL',
        '```',
      ].join('\n\n'),
      centralIdeaSummary:
        'Opening connections per request wastes TCP/TLS/auth handshakes and DB memory, while a single connection bottlenecks concurrency; a connection pool reuses a bounded set of warm connections cleanly.',
      codeExamples: [],
    },
    {
      id: 'topic-5.7.4',
      topicId: '5.7.4',
      coveredTopicIds: ['5.7.5'],
      title: 'Pool sizing and pool exhaustion',
      problemAndRequirementsMarkdown: [
        '### First principles: If pools are great, why not set `max: 500` connections per Node server?',
        'Careful! Remember two facts from `1.1` and `1.2`:',
        '- PostgreSQL forks a backend OS process per connection (eating RAM), *and* a 4-core or 8-core database CPU can physically run only ~4–8 things at once!',
        '- If **10 Node worker containers** each set `pool.max = 50`, that’s **`500` connections** fighting over an 8-core Postgres server—causing massive OS **context switching** (`1.2.4`), lock contention, and hitting Postgres’s `max_connections` limit!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Smart Pool Sizing & Avoiding Pool Exhaustion',
        '- **Pool Sizing**: Counterintuitively, **smaller pools are often faster!** A few dozen active connections *total across your whole fleet* (e.g., `max: 10–20` per Node process, divided by total Node instances—or fronted by a shared pooler like PgBouncer) keep Postgres CPU cores saturated without context-switch thrashing.',
        '- **Pool Exhaustion (The #1 silent outage!)**: Suppose `max = 10`. Every borrowed connection **must** be returned in a `finally { client.release(); }` block! Watch what happens if one route borrows a connection with `const client = await pool.connect()`, hits an exception *before* calling `client.release()`, and returns early:',
        '  After **10 errors**, all 10 pool slots are leaked and permanently marked “in use”—the **11th request waits forever** (`Pool Exhaustion`), freezing the entire API even though the database itself is sitting 99% idle!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Keep total DB connections across all app instances modest to avoid Postgres memory/context-switch thrashing, and always release borrowed clients in `finally` to prevent pool exhaustion.',
      codeExamples: [],
    },
    {
      id: 'topic-5.7.6',
      topicId: '5.7.6',
      coveredTopicIds: ['5.7.7'],
      title: 'Prepared statements and connection timeouts',
      problemAndRequirementsMarkdown: [
        '### First principles: Saving repeat parsing work—and refusing to hang forever when the network or pool stalls',
        'Two final details finish production connection management:',
        '1. If your API runs `SELECT id, email FROM users WHERE id = $1` 5,000 times a second, does Postgres really need to re-parse and re-plan the SQL text 5,000 times?',
        '2. What happens if Postgres is overloaded or the pool is full—should your HTTP route hang for 10 minutes waiting for a connection?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Prepared Statements & Layered Timeouts',
        '- **Prepared Statements**: A prepared statement sends the parameterized SQL template (`SELECT ... WHERE id = $1`) once so the database parses and caches its structure/plan under a name on that connection—subsequent executions only ship the compact parameter values (`[42]`)! *(Bonus from `6.4`: separating SQL structure from parameters also blocks SQL injection!)*',
        '- **Connection & Query Timeouts**: Configure explicit, bounded deadlines at every layer:',
        '  1. **Acquire / Connection Timeout** (`connectionTimeoutMillis`, e.g., 2–5s): How long to wait to borrow a slot from a busy pool (or connect TCP) before failing fast instead of piling up thousands of hung HTTP requests.',
        '  2. **Statement / Query Timeout** (`statement_timeout`, e.g., 5–10s): Cancels runaway SQL queries inside Postgres so one bad query can’t hold a pool slot indefinitely and starve healthy users!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Prepared statements skip repeated SQL parsing on hot queries, while connection-acquire and statement timeouts fail fast instead of letting stalled queries exhaust the pool.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Production connection pool architecture in Node.js',
    narrativeMarkdown: [
      'Notice how every part of `5.7` guards stability between Node.js (`1.5`) and PostgreSQL (`5.1`–`5.6`):',
      '- **Warm Pool (`max` sized across all workers)** eliminates per-request TCP/TLS/auth cost without exceeding Postgres `max_connections`.',
      '- **`try { ... } finally { client.release(); }`** stops connection leaks and **pool exhaustion**.',
      '- **Prepared statements** reduce repeated SQL parsing overhead.',
      '- **`connectionTimeoutMillis` + `statement_timeout`** ensure a slow query or outage fails fast rather than freezing every Event Loop request queue.',
    ].join('\n\n'),
    integratedExample: {
      id: '5.7-integrated-example',
      title: 'Production pool lifecycle with timeouts and guaranteed release()',
      language: 'typescript',
      code: `// Pool sized so (workerCount * max) stays well below Postgres max_connections
const poolConfig = {
  max: 10,
  connectionTimeoutMillis: 3000, // Fail fast if pool full or DB unreachable
  idleTimeoutMillis: 30000,      // Reclaim unused extra sockets cleanly
  statement_timeout: 5000,       // Abort runaway SQL holding a connection
};

async function runInTransaction<T>(pool: Pool, fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect(); // Respects connectionTimeoutMillis
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release(); // ALWAYS returns slot to pool even if ROLLBACK or fn() throws!
  }
}`,
    },
    walkthroughMarkdown:
      'Every borrowed connection stays guaranteed to return in `finally`, bounded timeouts protect both wait queues and Postgres CPU, and warm pooled sockets skip cold TCP/TLS setup.',
  },
  questions: [
    {
      id: '5.7-kc-1',
      focusArea: 'Establishment Cost & Pooling',
      prompt:
        'Why do Node.js backends use a **connection pool** instead of **(a)** opening a new Postgres connection on every HTTP request, or **(b)** sharing one single Postgres connection across the whole Node server?',
      hints: [
        'Compare setup cost (TCP + TLS + auth + DB process memory) vs transaction/concurrency limits of 1 connection.',
        'How does a pool balance both?',
        'Opening per request wastes TCP/TLS/auth handshakes and DB process RAM; one connection bottlenecks concurrent queries and mixes transaction boundaries (`BEGIN`/`COMMIT`). A pool keeps a warm, bounded set of connections checked out per query/tx.',
      ],
      explanation:
        'Opening a connection per HTTP request pays TCP + TLS + authentication handshakes on every call and floods Postgres with backend processes. Sharing a single connection serializes all queries and breaks concurrent `BEGIN`/`COMMIT` transaction isolation. A **connection pool** reuses a bounded group of warm, pre-authenticated connections safely across concurrent requests.',
      evaluationCriteria: [
        'Explains per-request handshake & DB process cost',
        'Explains single-connection concurrency/transaction bottleneck and how pooling solves both',
      ],
      topicIds: ['5.7.1', '5.7.2', '5.7.3'],
    },
    {
      id: '5.7-kc-2',
      focusArea: 'Pool Sizing & Exhaustion',
      prompt:
        'Suppose you deploy **10 Node.js worker instances**, each configured with a Postgres pool `max: 30`, against a 4-core Postgres database whose `max_connections = 200`. Identify **two** problems this causes—and also explain how forgetting `client.release()` causes **pool exhaustion**.',
      hints: [
        'Multiply `10 * 30` and compare to `200` and 4 CPU cores.',
        'Trace what happens when 10 errors skip `client.release()` inside a `max: 10` pool.',
        '`10 × 30 = 300 > 200` exceeds `max_connections` (crashing deploys) and creates heavy context switching on 4 cores; forgetting `client.release()` on errors permanently leaks pool slots until every new request hangs waiting for a free connection.',
      ],
      explanation:
        '1. **Oversized fleet pool**: `10 × 30 = 300` exceeds `max_connections = 200` (causing connection rejections) and thrashes a 4-core database with excessive process memory and context switching.\n2. **Pool exhaustion**: Whenever code borrows a connection (`pool.connect()`) and throws before `client.release()`, that slot stays locked forever—once `max` slots leak, every subsequent request hangs waiting for a connection until timeout.',
      evaluationCriteria: [
        'Multiplies worker count × pool max against DB max_connections & CPU cores',
        'Explains leaked unreleased clients causing pool exhaustion',
      ],
      topicIds: ['5.7.4', '5.7.5'],
    },
    {
      id: '5.7-kc-3',
      focusArea: 'Prepared Statements & Timeouts',
      prompt:
        'How do **prepared statements** reduce database work on hot queries, and why are **both** a connection-acquire timeout and a SQL statement timeout essential for keeping a server healthy during a database slowdown?',
      hints: [
        'Think about repeatedly parsing `"SELECT ... WHERE id = $1"` vs sending parameters.',
        'Separate waiting *for a pool slot* from holding a pool slot *while a slow query runs*.',
        'Prepared statements cache parsed query structure per connection so repeated calls just pass parameters; `statement_timeout` frees connections stuck on slow SQL while `connectionTimeoutMillis` fails fast when the pool is full instead of hanging HTTP requests indefinitely.',
      ],
      explanation:
        '**Prepared statements** let Postgres parse and cache a parameterized query template once per connection so repeated runs ship only parameter values. Meanwhile, **`statement_timeout`** aborts runaway SQL queries before they hold pool connections indefinitely, and **`connectionTimeoutMillis`** fails fast when all pool slots are busy or the DB is unreachable so HTTP queues don’t back up indefinitely.',
      evaluationCriteria: [
        'Explains prepared statements caching query parse/plan structure',
        'Separates connection-acquire timeout (fail fast on busy pool) from statement timeout (free stuck queries)',
      ],
      topicIds: ['5.7.6', '5.7.7'],
    },
  ],
};

export const LESSON_5_7_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Configure a leak-proof, properly sized **PostgreSQL connection pool** with **prepared statements**, **fail-fast timeouts**, and safe **graceful shutdown** (`1.5`).',
  whenToUseMarkdown:
    'Use a shared `Pool` instance (one per Node process, never created per request!) in every backend service talking to PostgreSQL or MySQL.',
  setupCommands: [
    {
      id: '5.7-cmd-1',
      label: 'Install node-postgres (pg) and types',
      command: 'npm install pg && npm install -D @types/pg',
      notes: 'Provides Pool, connection timeouts, parameterized queries, and named prepared statements.',
    },
  ],
  coreApisMarkdown: [
    '- **`new Pool({ max, connectionTimeoutMillis, idleTimeoutMillis })`**: Creates one reusable process-wide connection pool.',
    '- **`pool.query(sql, params)`**: Automatically borrows a connection, runs one single query (with optional `name` for prepared statements), and releases it automatically.',
    '- **`pool.connect()` + `try { ... } finally { client.release() }`**: Required ONLY when running multiple queries inside one `BEGIN ... COMMIT` transaction.',
    '- **`pool.end()`**: Drains active connections cleanly during `SIGTERM` graceful shutdown (`1.5`).',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Size the pool across your total app instances',
      detailMarkdown:
        'Calculate `(number of API processes × pool.max) + admin headroom < Postgres max_connections`. Start conservative (`max: 10–20` per Node worker).',
      code: {
        id: '5.7-step-1',
        title: 'Configured singleton Pool with timeouts',
        language: 'typescript',
        code: `import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 3_000,
  idleTimeoutMillis: 30_000,
  statement_timeout: 5_000,
});`,
      },
    },
    {
      stepNumber: 2,
      title: 'Use `pool.query` for single queries and `try/finally release()` for transactions',
      detailMarkdown:
        'Prefer `pool.query` for standalone queries (zero leak risk!). Whenever checking out a client with `pool.connect()` for a transaction, **always** release inside `finally`—and pass `name` on ultra-hot queries to reuse prepared statements.',
      code: {
        id: '5.7-step-2',
        title: 'Prepared statement + leak-proof transaction helper',
        language: 'typescript',
        code: `// Single query with named prepared statement (parsed once per connection)
export async function findUserById(id: string) {
  const { rows } = await pool.query({
    name: "find-user-by-id",
    text: "SELECT id, email FROM users WHERE id = $1",
    values: [id],
  });
  return rows[0] ?? null;
}

// Multi-statement transaction with guaranteed release()
export async function withTransaction<T>(fn: (client: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}`,
      },
    },
    {
      stepNumber: 3,
      title: 'Close the pool gracefully on SIGTERM',
      detailMarkdown:
        'Inside your `SIGTERM` handler (`1.5`), call `await pool.end()` right after `server.close(...)` finishes draining HTTP requests.',
    },
  ],
  workingExamples: [
    {
      id: '5.7-ex-1',
      title: 'Complete db.ts module with health check, transaction helper, and shutdown',
      language: 'typescript',
      code: `import { Pool, PoolClient } from "pg";

export const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 3000,
  statement_timeout: 5000,
});

export async function checkDbHealth(): Promise<boolean> {
  await dbPool.query("SELECT 1");
  return true;
}

export async function runTx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await dbPool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}`,
      explanation:
        'Singletons avoid per-request handshakes, timeouts bound stall duration, and finally guarantees no pool exhaustion.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Creating `new Pool()` or `new Client()` inside an Express/HTTP route handler.',
      fix: 'Instantiate **one** `Pool` at module/startup scope and share it across all requests (`pool.end()` only on shutdown).',
    },
    {
      mistake: 'Calling `client.release()` only at the end of `try` (skipping it on `catch`).',
      fix: 'Always put `client.release()` inside `finally { ... }` so errors never leak pool connections.',
    },
  ],
  exercise: {
    id: '5.7-ex',
    title: 'Configure a Safe Pool & Leak-Proof Transaction Wrapper',
    instructionsMarkdown:
      'Given a Postgres server with `max_connections = 100` shared across **4** Node.js worker instances:\n1. Pick a safe `max` pool size per worker (leaving ~20 admin/migration connections free).\n2. Configure `connectionTimeoutMillis` (`3000`) and `statement_timeout` (`5000`).\n3. Write a `withTransaction` helper that catches errors, attempts `ROLLBACK`, and always releases the `PoolClient` in `finally`.',
    acceptanceChecklist: [
      'Pool max per worker keeps 4 * max <= 80 (e.g. max = 15 or 20)',
      'Both connectionTimeoutMillis and statement_timeout are set',
      'withTransaction calls BEGIN, COMMIT, ROLLBACK on catch, and client.release() in finally',
    ],
  },
};
