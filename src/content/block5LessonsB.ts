import { FptLessonContent } from '../types';

export const LESSON_5_4: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Up to now, we treated a database like an abstract collection of tables and transactions. Now let’s peek underneath: **how does PostgreSQL actually store rows on a hard drive or SSD—and how does it promise Durability (`5.1`) without running unbearably slowly on every `COMMIT`?**',
      'In this unit, we’ll build **Database Physical Storage** from first principles: **pages, blocks, database tuples, and heap storage**, **the buffer cache and disk I/O**, and **Write-Ahead Logging (WAL) and crash recovery**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Understanding pages, the buffer cache, and WAL explains why sequential scans kill performance, why “warm cache” queries run 100x faster than cold ones, how Postgres recovers cleanly after a power cut without losing committed transactions, and why indexes work the way they do in `5.5`.',
    prerequisites: [
      {
        subBlockId: '5.1',
        label: 'Atomicity & Durability (5.1.6)',
        detail:
          'Knowing that committed transactions must survive crashes and uncommitted ones must roll back.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-5.4.1',
      topicId: '5.4.1',
      coveredTopicIds: ['5.4.2', '5.4.3'],
      title: 'Pages, blocks, tuples, and heap storage',
      problemAndRequirementsMarkdown: [
        '### First principles: Why doesn’t a database read or write one single row at a time from disk?',
        'Disks and SSDs don’t operate one variable at a time like RAM—they read and write in fixed-size **blocks**. If a database tried opening and seeking a separate tiny file for every single row, fetching 500 user rows would cost 500 slow disk reads!',
        '',
        'At the same time, when an `INSERT` adds a new row, where should it put it without rewriting a 50 GB file just to keep rows sorted on disk?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Fixed-size Pages, Tuples, and Heap Files',
        'Relational databases split every table file on disk into fixed-size **Pages** (or **Blocks**, typically **8 KB** each in PostgreSQL):',
        '- **Page / Block (8 KB)**: The fundamental unit of I/O moved between disk and memory. One 8 KB page packs dozens or hundreds of rows together!',
        '- **Database Tuple**: The physical representation of one row version (`MVCC` from `5.3`!) stored inside a page, along with its row metadata and column values.',
        '- **Heap Storage**: Notice the word *heap* here doesn’t mean the process heap from `1.1`—in databases, a **heap file** simply means an **unordered pile of 8 KB pages**! When you `INSERT` a new order, Postgres drops the tuple into whichever page currently has free space—making inserts fast (`O(1)`) instead of shuffling sorted files on disk. *(And because heap pages are unordered, finding a specific email without an index requires scanning pages until you find it!)*',
        '',
        '```text',
        'Table File on Disk (Heap Storage = Unordered 8 KB Pages)',
        '┌─────────────────────────┐  ┌─────────────────────────┐',
        '│ Page 0 (8 KB)           │  │ Page 1 (8 KB)           │  ...',
        '│  [tuple1][tuple2][...]  │  │  [tuple9][tuple10][...] │',
        '└─────────────────────────┘  └─────────────────────────┘',
        '```',
      ].join('\n\n'),
      centralIdeaSummary:
        'Tables are stored on disk as heap files—unordered collections of fixed-size 8 KB pages, each holding multiple physical row tuples.',
      codeExamples: [],
    },
    {
      id: 'topic-5.4.4',
      topicId: '5.4.4',
      coveredTopicIds: ['5.4.5'],
      title: 'Buffer cache and disk I/O',
      problemAndRequirementsMarkdown: [
        '### First principles: Reading from SSD/disk is thousands of times slower than RAM—so why aren’t all SQL queries painfully slow?',
        'Reading RAM takes nanoseconds. Reading a page from an SSD or spinning disk takes tens of microseconds to milliseconds—thousands of times slower (**Disk I/O**)! If every `SELECT` and `UPDATE` waited on physical disk reads, databases could barely handle a handful of queries per second.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: The Buffer Cache (Shared Buffers)',
        'Every DBMS allocates a large pool of RAM called the **Buffer Cache** (called `shared_buffers` in PostgreSQL), divided into 8 KB slots matching disk pages:',
        '1. When a query needs Page 42, the DB checks the **Buffer Cache** in RAM first.',
        '   - **Cache Hit**: Page 42 is already in RAM—served at memory speed with zero disk I/O!',
        '   - **Cache Miss**: Only now does the DB pay disk I/O to read Page 42 from SSD into a Buffer Cache slot (evicting an old unused page if full).',
        '2. **What about writes (`UPDATE` / `INSERT`)?** Writes modify the page **in the Buffer Cache (RAM)** first—marking that page “dirty”—instead of immediately scattering slow random writes all over the 50 GB heap file on disk!',
      ].join('\n\n'),
      centralIdeaSummary:
        'The Buffer Cache holds hot 8 KB pages in RAM so frequent reads avoid slow disk I/O and writes can update memory pages quickly before flushing asynchronously to heap files.',
      codeExamples: [],
    },
    {
      id: 'topic-5.4.6',
      topicId: '5.4.6',
      coveredTopicIds: ['5.4.7'],
      title: 'Write-Ahead Logging (WAL) and crash recovery',
      problemAndRequirementsMarkdown: [
        '### First principles: Wait—if `UPDATE` only edits the Buffer Cache in RAM, what happens if power dies right after `COMMIT`?!',
        'Hold on! Look closely at the contradiction we just created:',
        '- For speed, `COMMIT` shouldn’t have to hunt down and overwrite 15 scattered random 8 KB heap pages across the disk on every transaction.',
        '- Yet **Durability (`5.1`)** promises that the instant `COMMIT` returns success, even a sudden power failure will **not** lose that transaction!',
        '',
        'How can a database commit fast *and* guarantee zero lost commits in RAM?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Append-only Write-Ahead Logging (WAL)',
        'The database writes a small, ultra-fast sequential journal called the **Write-Ahead Log (WAL)**!',
        '',
        'Think of WAL like an accountant’s append-only ledger book:',
        '1. **Why sequential append is fast**: Writing one small change record (*“Tx 901 changed Page 42 tuple 3: balance 100→50”*) straight to the **end** of one sequential WAL file on disk is orders of magnitude faster than rewriting scattered random 8 KB heap pages across the table files.',
        '2. **The Golden Rule (“Write-Ahead”)**: Before `COMMIT` ever says “OK” to your Node.js app, the database forces **only the WAL entry** safely onto durable disk (`fsync`)—long before the dirty 8 KB heap page in the Buffer Cache gets flushed lazily in the background!',
        '3. **Crash Recovery**: If power cuts out two seconds after `COMMIT` (before the dirty Buffer Cache pages flushed to the table file), when Postgres boots back up it **replays the WAL**:',
        '   - Any **committed** transaction found in the WAL whose dirty page hadn’t hit the heap file yet gets **redone** (preserving Durability!).',
        '   - Any **uncommitted** transaction whose `COMMIT` never reached the WAL is ignored / undone (preserving Atomicity!).',
        '',
        'Periodically, the DB runs a **Checkpoint** that flushes all dirty Buffer Cache pages safely to heap files so WAL replay after a crash stays short and fast.',
      ].join('\n\n'),
      backendApplicationsMarkdown:
        'Beyond crash recovery, PostgreSQL streams those exact WAL records to **read replicas** and continuous backups—letting another server stay continuously synchronized with every committed byte!',
      centralIdeaSummary:
        'Write-Ahead Logging flushes small sequential change records to disk before `COMMIT` returns, letting databases stay fast via the RAM Buffer Cache while replaying WAL on startup for crash recovery.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Following one `UPDATE` through Buffer Cache, WAL, and Crash Recovery',
    narrativeMarkdown: [
      'Put every layer of physical storage together in exact order for `UPDATE accounts SET balance = 50 WHERE id = 1; COMMIT;`:',
      '1. **Load Page into Buffer Cache**: If the 8 KB heap page holding `id = 1`’s tuple isn’t in RAM yet, read it from disk (`Disk I/O`).',
      '2. **Record WAL + Modify RAM**: Write the change description to the **WAL** buffer, update the tuple in the **Buffer Cache** (marking the page dirty).',
      '3. **`COMMIT` Flushes WAL**: Force the WAL record sequentially to disk—now the commit is **durable** without random heap-file disk writes!',
      '4. **Background / Crash Recovery**: Later, a checkpoint writes the dirty heap page to disk; if a crash happens first, startup recovery replays the WAL.',
    ].join('\n\n'),
    integratedExample: {
      id: '5.4-integrated-example',
      title: 'How Buffer Cache + WAL reconcile speed with crash-safe durability',
      language: 'text',
      code: `COMMIT Path (Fast + Durable):
  1. Tuple edited in RAM [Buffer Cache: Page #42 (dirty)]
  2. Sequential append & fsync ──▶ [WAL File on Disk]  <-- COMMIT returns OK right here!
  3. (Later, lazily) Checkpoint flushes Page #42 ──▶ [Heap Table File on Disk]

If Power Fails Between Step 2 & Step 3:
  On Reboot -> Postgres reads WAL -> Replays Tx change onto Page #42 -> Zero committed data lost!`,
    },
    walkthroughMarkdown:
      'Every piece serves a clear physical constraint: 8 KB pages batch disk reads, unordered heap files keep inserts fast, the Buffer Cache turns repeated reads into RAM hits, and WAL turns random dirty-page durability into fast sequential appends.',
  },
  questions: [
    {
      id: '5.4-kc-1',
      focusArea: 'Pages, Heap Storage & Buffer Cache',
      prompt:
        'Why do databases store rows inside fixed-size **8 KB pages** in unordered **heap files** managed through a RAM **Buffer Cache**, rather than reading individual rows straight off disk every query?',
      hints: [
        'Compare SSD/disk access latency vs RAM access latency, and the cost of keeping a massive file physically sorted on every `INSERT`.',
        'Think about what happens on a Cache Hit vs Cache Miss.',
        'Disks transfer blocks efficiently and are thousands of times slower than RAM; 8 KB pages batch rows, unordered heap files allow fast inserts without sorting on disk, and the Buffer Cache keeps hot pages in RAM to skip repeated disk I/O.',
      ],
      explanation:
        'Disk I/O is orders of magnitude slower than RAM and works in block chunks. Packing row **tuples** into fixed-size **8 KB pages** lets one read load many rows, storing them in unordered **heap storage** avoids costly sorted-file rewrites on every `INSERT`, and keeping hot pages in the **Buffer Cache** serves frequent queries straight from RAM without slow disk reads.',
      evaluationCriteria: [
        'Explains block/page batching and unordered heap insert efficiency',
        'Explains Buffer Cache eliminating slow repeated disk I/O',
      ],
      topicIds: ['5.4.1', '5.4.2', '5.4.3', '5.4.4', '5.4.5'],
    },
    {
      id: '5.4-kc-2',
      focusArea: 'Write-Ahead Logging (WAL) & Crash Recovery',
      prompt:
        'How does **Write-Ahead Logging (WAL)** let PostgreSQL avoid flushing random 8 KB table heap pages to disk on every single `COMMIT` while still surviving a sudden power failure cleanly?',
      hints: [
        'Compare writing randomly across a 50 GB table file vs appending sequentially to one journal file.',
        'What must hit disk *before* `COMMIT` returns—and what happens during reboot crash recovery?',
        'Postgres flushes only a small sequential WAL entry to disk before `COMMIT` succeeds while leaving modified 8 KB pages in the RAM Buffer Cache; on crash recovery it replays committed WAL records to restore any unflushed dirty pages.',
      ],
      explanation:
        'Flushing scattered 8 KB heap pages on every `COMMIT` would cause slow random disk I/O. Instead, the **Write-Ahead Log (WAL)** appends small descriptions of changes sequentially to disk and forces only the WAL record safely to disk before `COMMIT` confirms—leaving heap pages to flush lazily later. If power cuts out first, **crash recovery** replays committed WAL records onto disk pages (Preserving Durability) and ignores uncommitted ones (preserving Atomicity).',
      evaluationCriteria: [
        'Explains sequential WAL append before COMMIT vs lazy random heap page flush',
        'Describes WAL replay during crash recovery preserving both Durability and Atomicity',
      ],
      topicIds: ['5.4.4', '5.4.6', '5.4.7'],
    },
  ],
};

export const LESSON_5_5: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'In Sub-block 5.4, we uncovered a crucial limitation of **heap storage**: rows are appended into unordered 8 KB pages wherever free space exists! That makes inserts fast—but if your `users` table has 10 million rows across 150,000 heap pages and you run `SELECT * FROM users WHERE email = \'ada@mail.com\'`, **how does Postgres find Ada without reading all 150,000 pages off disk?!**',
      'In this unit, we’ll derive **Indexing Mechanics** from first principles: **why full-table search gets expensive**, **search complexity intuition**, **B-tree and B+ tree structure & traversal**, **composite, unique, partial, and covering indexes**, **selectivity/cardinality**, and **the write overhead trade-off**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Knowing how B+ trees actually work stops you from blindly slapping indexes on every column (slowing down every `INSERT`/`UPDATE`), teaches you why column order in a composite index makes or breaks a query, and lets you shrink 2-second queries down to 1 millisecond.',
    prerequisites: [
      {
        subBlockId: '5.4',
        label: 'Pages & heap storage (5.4.1, 5.4.3)',
        detail:
          'Knowing that table heap files store unordered rows across thousands of 8 KB disk pages.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-5.5.1',
      topicId: '5.5.1',
      coveredTopicIds: ['5.5.2'],
      title: 'Why searching every row breaks down (Search complexity intuition)',
      problemAndRequirementsMarkdown: [
        '### First principles: Scanning 100 rows vs 10,000,000 rows',
        'Imagine looking up `"Zain"` in an unindexed notebook where 100 names were written in random arrival order. Checking every line takes a second. Now imagine a phonebook with **10,000,000** unindexed entries written in random order—reading line by line takes **linear `O(N)` work**: doubling the rows doubles the query time and forces the database to read hundreds of thousands of heap pages!',
        '',
        'Compare that to looking up `"Zain"` in a **sorted** phonebook: you open the middle, jump right to the `Z`s, split the `Z` section in half a few times, and land on `"Zain"` in ~23 tiny comparisons instead of 10,000,000 (**logarithmic `O(log N)` intuition**)!',
        '',
        '### Deriving the requirement',
        'We can’t keep the table’s main heap file sorted (inserting into the middle of a 50 GB file is too slow!). Instead, we keep a **separate, sorted lookup structure**—an **Index**—storing `(search_key → heap_page_pointer)` so queries jump straight to the exact 8 KB page holding that row!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: From O(N) scan to O(log N) lookup',
        'An **index** doesn’t duplicate the entire table—it keeps a compact, sorted map of just the indexed column(s) alongside pointers to the physical `(page, slot)` location in the heap file. Searching a sorted structure eliminates huge chunks of possibilities at every step instead of inspecting every row one by one.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Unindexed searches scan unordered heap pages in O(N) linear time; an index creates a compact sorted lookup structure reducing lookups to O(log N) logarithmic hops.',
      codeExamples: [],
    },
    {
      id: 'topic-5.5.3',
      topicId: '5.5.3',
      coveredTopicIds: ['5.5.4', '5.5.5'],
      title: 'B-trees, B+ trees, and index traversal',
      problemAndRequirementsMarkdown: [
        '### First principles: Why doesn’t a database use a simple binary tree (2 branches per node) on disk?',
        'In RAM, a binary search tree splits 2 ways per node: for 10,000,000 items, a binary tree is ~24 levels deep. Wait—on disk (`5.4`), reading a node means reading an **8 KB page**! Paying 24 separate disk page reads per query is still too slow—and leaves tons of each 8 KB page empty!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: High-Fanout B-Trees & B+ Trees',
        'That is why databases pack **hundreds of sorted keys into every 8 KB tree page**, creating shallow, wide **B-trees** and **B+ trees**:',
        '- **B-Tree intuition**: Instead of branching 2 ways like a binary tree, each 8 KB node holds hundreds of sorted boundary keys pointing to hundreds of child pages! Even for **100,000,000 rows**, a tree with ~300–500 children per page is only **3 or 4 levels tall**!',
        '- **B+ Tree refinement (what SQL databases like Postgres/InnoDB use)**:',
        '  1. **Internal (branch) nodes** store *only* routing keys and child page pointers—packing even more branches per 8 KB page so the tree stays super shallow.',
        '  2. **Leaf nodes at the bottom** hold all the actual `(key → heap tuple pointer)` entries—and **leaf pages link horizontally to the next leaf page (`→`)**!',
        '  Why are linked leaves a superpower? For range queries (`WHERE created_at >= \'2026-01-01\' AND created_at < \'2026-02-01\'`), **index traversal** walks down 3 levels *once* to Jan 1, then glides smoothly right across the linked leaf pages without ever climbing back up the tree!',
        '',
        '```text',
        '               [ Root Page:   | 500 | 1200 | ]          (Level 1 — usually pinned in Buffer Cache)',
        '                  /              |              \\',
        '     [1..499 Branch]      [500..1199 Branch]    [1200+ Branch]   (Level 2)',
        '       /        \\',
        ' [Leaf 1] ◀──▶ [Leaf 2] ◀──▶ [Leaf 3] ... (Sorted entries + pointers to Heap Pages!)',
        '```',
      ].join('\n\n'),
      centralIdeaSummary:
        'B+ trees store routing keys in shallow high-fanout 8 KB branch pages and sorted row pointers in horizontally linked leaf pages, letting equality and range queries locate heap rows in ~3–4 hops.',
      codeExamples: [],
    },
    {
      id: 'topic-5.5.6',
      topicId: '5.5.6',
      coveredTopicIds: ['5.5.7', '5.5.8', '5.5.9'],
      title: 'Specialized indexes: Composite, Unique, Partial, and Covering',
      problemAndRequirementsMarkdown: [
        '### First principles: One single-column index doesn’t fit every query—how do indexes adapt to real patterns?',
        'Real backends don’t just query `WHERE id = 5`. You filter by `(tenant_id, created_at)`, enforce unique emails, query *only* the 1% of rows that are still `status = \'pending\'`, or fetch `SELECT email` from an indexed column without even needing the rest of the row!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Four indispensable B+ tree index patterns',
        '1. **Composite Index (`(tenant_id, status, created_at)`)**: Indexes multiple columns sorted **left-to-right** (first by `tenant_id`, ties broken by `status`, then `created_at`—just like a phonebook sorted by `(LastName, FirstName)`!).',
        '   - *Critical rule (Leftmost Prefix)*: An index on `(a, b)` speeds up queries filtering on **`a` alone** or **`(a, b)` together**, **but CANNOT jump efficiently into `WHERE b = 5` alone** (just like a phonebook sorted by Last Name won’t help you find every `"John"` without scanning everyone)!',
        '2. **Unique Index (`UNIQUE INDEX ON users(email)`)**: Enforces uniqueness *and* accelerates lookups using the exact same B+ tree—in fact, `PRIMARY KEY` and `UNIQUE` constraints from `4.2` are implemented under the hood as unique indexes!',
        '3. **Partial Index (`WHERE deleted_at IS NULL` or `WHERE status = \'pending\'`)**: Indexes **only the subset of rows matching a `WHERE` filter**. If 99% of orders are `' + "'completed'" + '` and your worker polls `WHERE status = \'pending\'`, a partial index on pending rows is tiny, stays hot in RAM, and adds zero overhead to completed rows!',
        '4. **Covering Index (`INCLUDE (total_cents)`)**: Normally an index lookup reads the leaf pointer and *still* hops over to the heap page to read non-indexed columns. A **covering index** includes those extra requested columns right inside the leaf entry—allowing an **Index-Only Scan** that answers the query without touching the table heap at all!',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '5.5.6-ex-1',
            title: 'Composite, Partial, and Covering indexes in PostgreSQL',
            language: 'sql',
            code: `-- 1. Composite index (supports WHERE tenant_id = $1 AND created_at > $2)
CREATE INDEX idx_orders_tenant_created ON orders (tenant_id, created_at DESC);

-- 2. Partial index (only indexes active pending jobs — tiny & fast!)
CREATE INDEX idx_jobs_pending ON jobs (run_at) WHERE status = 'pending';

-- 3. Covering index (Index-Only Scan can return total_cents without hitting heap)
CREATE INDEX idx_orders_user_cover ON orders (user_id) INCLUDE (total_cents, status);`,
          },
          lineByLineMarkdown: [
            '- **Line 2**: Sorted by `tenant_id` first, then `created_at DESC`—supports tenant-filtered timelines cleanly.',
            '- **Line 5**: Ignores millions of `' + "'completed'" + '` rows completely, keeping the index small and writes fast.',
            '- **Line 8**: Stores `total_cents` and `status` in the index leaf alongside `user_id` so matching reads can skip heap page fetches.',
          ].join('\n'),
        },
      ],
      centralIdeaSummary:
        'Composite indexes obey leftmost column order, unique indexes enforce uniqueness, partial indexes shrink size by filtering rows, and covering indexes include extra columns to skip heap lookups.',
    },
    {
      id: 'topic-5.5.10',
      topicId: '5.5.10',
      coveredTopicIds: ['5.5.11'],
      title: 'Selectivity, cardinality, and index write overhead',
      problemAndRequirementsMarkdown: [
        '### First principles: Why shouldn’t you just put an index on every single column in every table?',
        'Two hard realities stop “index everything” from working:',
        '1. Some columns barely narrow anything down (**low selectivity**—imagine indexing `is_deleted` when 99% of rows are `false`!).',
        '2. Every index you add makes **writes slower** and eats disk + Buffer Cache RAM!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Selectivity, Cardinality, and Write Amplification',
        '- **Cardinality & Selectivity**: **Cardinality** is how many distinct values a column has (`users.email` has high cardinality—millions of unique values; `orders.is_gift` has cardinality 2: `true`/`false`). **Selectivity** is how small a slice of the table your filter keeps (`WHERE email = \'...\'` matches 1 out of 10,000,000 rows → **high selectivity**, great for an index!). If `WHERE is_gift = false` matches 80% of the table, hopping back and forth between an index and 80% of the heap pages is *slower* than just reading the heap sequentially—so the planner ignores that index!',
        '- **Index Write Overhead**: An index isn’t free magic! Every `INSERT`, `DELETE`, or `UPDATE` touching an indexed column must update **not just the table heap page**, **but also every affected B+ tree index** (plus write extra WAL records and consume Buffer Cache RAM). Having 12 redundant indexes on a write-heavy table slows down inserts dramatically.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Indexes help most on high-selectivity filters that narrow down a tiny fraction of rows, and every extra index adds write amplification (`INSERT`/`UPDATE`/`DELETE` + WAL overhead).',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Choosing the right index for a real backend workload',
    narrativeMarkdown: [
      'Now tie `5.4` and `5.5` together with a single lookup:',
      '1. Without an index, finding `WHERE tenant_id = 7 ORDER BY created_at DESC LIMIT 20` scans thousands of unordered 8 KB heap pages (`O(N)`).',
      '2. Adding a **composite index** `(tenant_id, created_at DESC)` lets Postgres traverse ~3–4 B+ tree branch pages straight to Tenant 7’s newest leaf entries (`O(log N)`) and walk horizontally across 20 linked leaf pointers.',
      '3. Adding **`INCLUDE (status, total_cents)`** turns it into a **covering index** so even the heap page jumps vanish—while keeping total index count lean avoids unnecessary **write overhead**.',
    ].join('\n\n'),
    integratedExample: {
      id: '5.5-integrated-example',
      title: 'Tracing a B+ Tree index lookup vs a full heap scan',
      language: 'text',
      code: `Query: SELECT status, total_cents FROM orders WHERE tenant_id = 7 ORDER BY created_at DESC LIMIT 20;

Without Index:
  Reads ALL 150,000 Heap Pages sequentially ──▶ discards 99% ──▶ sorts in memory (SLOW!)

With Covering Composite Index (tenant_id, created_at DESC) INCLUDE (status, total_cents):
  1. Root Page ─▶ Branch Page ─▶ Leaf Page for tenant_id=7 (3-4 page hops!)
  2. Walks 20 sorted entries right across linked leaf pages (already ordered DESC!)
  3. Reads status & total_cents directly from leaf (Covering Index -> ZERO heap page reads!)`,
    },
    walkthroughMarkdown:
      'Every index choice balances **read speedup** (high selectivity, leftmost composite alignment, partial filtering, covering reads) against **write & memory overhead** (extra B+ tree updates and WAL bytes on every write).',
  },
  questions: [
    {
      id: '5.5-kc-1',
      focusArea: 'B+ Tree Structure & Traversal',
      prompt:
        'Why do relational databases use shallow, wide **B+ trees** (with linked leaf pages) instead of scanning heap files linearly—or using simple 2-branch binary trees on disk?',
      hints: [
        'Connect back to 8 KB disk pages (`5.4`): how many keys fit in one 8 KB node, and what do linked leaf pages unlock?',
        'Contrast `O(N)` heap scans, 24-level binary trees, and 3–4 level B+ trees.',
        'Packing hundreds of routing keys per 8 KB page keeps B+ trees ~3–4 hops deep (`O(log N)` with huge fanout) instead of scanning millions of heap pages (`O(N)`) or paying ~24 binary tree disk reads; horizontally linked leaf pages make range scans glide sequentially.',
      ],
      explanation:
        'Scanning unordered heap pages takes `O(N)` disk reads, and a binary tree takes ~20+ disk hops for millions of rows. A **B+ tree** packs hundreds of sorted routing keys into each 8 KB branch page—keeping the tree only 3–4 levels tall (`O(log N)` with massive fanout)—and keeps all row pointers in horizontally linked **leaf pages** so both exact matches and range queries traverse fast with minimal disk I/O.',
      evaluationCriteria: [
        'Explains O(log N) high-fanout 8 KB tree depth vs O(N) scan and deep binary trees',
        'Explains linked leaf pages supporting fast ordered range scans',
      ],
      topicIds: ['5.5.1', '5.5.2', '5.5.3', '5.5.4', '5.5.5'],
    },
    {
      id: '5.5-kc-2',
      focusArea: 'Composite, Partial & Covering Indexes',
      prompt:
        'You create a composite index `ON orders (customer_id, created_at)`. Why does it speed up `WHERE customer_id = 42 AND created_at > \'2026-01-01\'`, yet fail to optimize `WHERE created_at > \'2026-01-01\'` by itself? Also explain what **partial** and **covering** indexes optimize.',
      hints: [
        'Compare `(customer_id, created_at)` to a phonebook sorted by `(LastName, FirstName)`.',
        'Think about filtering rows at index creation time (partial) vs skipping heap lookups at read time (covering).',
        'Composite indexes sort left-to-right so skipping the leftmost column (`customer_id`) leaves `created_at` scattered; partial indexes shrink index size by indexing only a filtered subset (`WHERE status=\'pending\'`), and covering indexes (`INCLUDE`) satisfy reads from the index leaf without reading heap pages.',
      ],
      explanation:
        'A composite index sorts by `customer_id` *first* and only sorts `created_at` *within* each customer—so filtering only on `created_at` finds matching dates scattered under every customer (violating the leftmost-prefix rule). A **partial index** (`WHERE ...`) indexes only matching rows, shrinking index size and write overhead; a **covering index** (`INCLUDE (...)`) stores extra projected columns in the leaf so reads skip fetching the heap page altogether.',
      evaluationCriteria: [
        'Explains leftmost-prefix sorting in composite indexes',
        'Correctly defines partial indexes (filtered subset) and covering indexes (avoiding heap reads)',
      ],
      topicIds: ['5.5.6', '5.5.7', '5.5.8', '5.5.9'],
    },
    {
      id: '5.5-kc-3',
      focusArea: 'Selectivity & Write Overhead',
      prompt:
        'Give **two** reasons why adding an index to a boolean column (`is_verified` where 95% of users are `true`) on a high-write table is counterproductive.',
      hints: [
        'Look at how useful an index is when 95% of rows match `WHERE is_verified = true`, AND what happens to every `INSERT`/`UPDATE`.',
        'Think about selectivity/cardinality vs write overhead.',
        'First, low selectivity (95% match) means jumping from index to 95% of heap pages is slower than a sequential scan so the DB ignores it; second, every `INSERT`/`UPDATE` pays write overhead updating that extra B+ tree and WAL.',
      ],
      explanation:
        '1. **Low selectivity / low cardinality**: `is_verified` has only two values and `true` matches 95% of rows—hopping via the index to almost every heap page is slower than reading the table sequentially, so the query planner won’t even use it (for rare `false` queries, a *partial* index `WHERE is_verified = false` would be far better!).\n2. **Write overhead**: Every `INSERT`, `DELETE`, or `UPDATE` changing `is_verified` still has to update that B+ tree and write extra WAL logs, slowing writes and wasting RAM.',
      evaluationCriteria: [
        'Explains low selectivity causing planner to skip index (and noting partial index alternative if querying rare value)',
        'Explains write amplification / Buffer Cache cost on every write',
      ],
      topicIds: ['5.5.10', '5.5.11'],
    },
  ],
};
