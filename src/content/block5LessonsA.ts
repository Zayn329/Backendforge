import { FptLessonContent } from '../types';

export const LESSON_5_1: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'In Block 4, we learned how to store clean tables and run individual SQL statements. Now imagine a real bank transfer—or an e-commerce checkout—that takes **two or more SQL statements** to complete (subtract $50 from Alice, add $50 to Bob, insert a ledger row).',
      'What happens if the server crashes right after subtracting $50 from Alice, *or* someone else runs a balance report halfway between those two statements? In this unit, we’ll derive **Database Transactions**, **transaction boundaries**, **commit and rollback**, and the **ACID properties** from first principles.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Without explicit transaction boundaries, network drops, server crashes, and overlapping users silently create missing money, oversold inventory, and half-created orders.',
    prerequisites: [
      {
        subBlockId: '4.1',
        label: 'Data consistency & DBMS role (4.1.3, 4.1.5)',
        detail:
          'Understanding why backends rely on a DBMS to protect correctness across concurrent writers.',
      },
      {
        subBlockId: '4.2',
        label: 'Constraints & referential integrity (4.2.8–4.2.10)',
        detail:
          'Knowing that databases enforce rules like `CHECK (balance >= 0)` on tables.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-5.1.1',
      topicId: '5.1.1',
      coveredTopicIds: ['5.1.2'],
      title: 'The two problems: partial failures and inconsistent independent queries',
      problemAndRequirementsMarkdown: [
        '### First principles: Why aren’t individual auto-committed SQL statements safe for multi-step work?',
        'By default, PostgreSQL runs every single SQL query as its own tiny unit. Watch what breaks when your app sends **two independent queries** in a row:',
        '```sql\n-- Query 1: Deduct $50 from Alice\nUPDATE accounts SET balance = balance - 50 WHERE id = 1;\n\n-- (Imagine Node.js crashes or Query 2 hits a constraint error right here!)\n\n-- Query 2: Add $50 to Bob\nUPDATE accounts SET balance = balance + 50 WHERE id = 2;\n```',
        'Look closely at **two distinct failures** here:',
        '1. **Crash / Partial Failure**: If Node.js loses power or Query 2 fails after Query 1 ran, Alice lost $50 and Bob never got it—$50 vanished into thin air!',
        '2. **Inconsistent View Under Concurrent Modification**: Even without a crash, suppose an auditor runs `SELECT SUM(balance) FROM accounts` in the millisecond *between* Query 1 and Query 2. The auditor sees $50 missing from the whole bank! And if two withdrawals run concurrently (`balance = 100`, both check `balance >= 80` separately, then both deduct `80`), Alice goes negative or double-spends!',
        '',
        '### Deriving the requirement',
        'We need a way to group multiple SQL statements into **one indivisible logical unit of work**—all succeed together or none happen at all, and outsiders never see a half-finished intermediate state.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Grouping operations into one logical step',
        'A database solves both problems by refusing to treat Query 1 and Query 2 as unrelated strangers. Instead, your application explicitly marks a start and an end around the whole transfer so the database coordinates visibility, constraints, and crash safety across all statements inside that group.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Executing multi-step business logic as separate independent queries exposes your data to half-applied failures and inconsistent intermediate views under concurrent writes.',
      codeExamples: [],
    },
    {
      id: 'topic-5.1.3',
      topicId: '5.1.3',
      coveredTopicIds: ['5.1.4', '5.1.5'],
      title: 'Transactions, boundaries, COMMIT, and ROLLBACK',
      problemAndRequirementsMarkdown: [
        '### First principles: How do you tell the database “these three queries are one single unit”?',
        'The database can’t guess whether two queries arriving over a socket belong together or come from unrelated buttons in your UI. Your backend code has to mark the boundaries explicitly.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Transaction Boundaries (`BEGIN` → `COMMIT` / `ROLLBACK`)',
        'A **transaction** is an explicit bundle of one or more database operations treated as a single all-or-nothing unit:',
        '- **`BEGIN` (Start boundary)**: Opens the transaction on this database connection.',
        '- **Statements execute inside the bundle**: Changes are tracked provisionally—not yet finalized for the rest of the world.',
        '- **`COMMIT` (Success boundary)**: Makes every change inside the transaction permanent and visible together.',
        '- **`ROLLBACK` (Failure / Abort boundary)**: Undoes *every* earlier change in the transaction cleanly, restoring the exact database state before `BEGIN`—whether triggered explicitly by your `catch` block, a constraint violation, or a crashed connection!',
        '',
        'Notice a critical rule in Node.js backends: **keep transaction boundaries as short as possible!** Never make slow external HTTP calls (like calling Stripe or sending an email) *between* `BEGIN` and `COMMIT`, because open transactions hold database locks and snapshots longer than necessary.',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '5.1.4-ex-1',
            title: 'Explicit transaction boundary with COMMIT and ROLLBACK',
            language: 'typescript',
            code: `async function transferFunds(client: DbClient, fromId: number, toId: number, amount: number) {
  await client.query("BEGIN");
  try {
    await client.query("UPDATE accounts SET balance = balance - $1 WHERE id = $2", [amount, fromId]);
    await client.query("UPDATE accounts SET balance = balance + $1 WHERE id = $2", [amount, toId]);
    await client.query("COMMIT"); // Both updates become permanent together
  } catch (err) {
    await client.query("ROLLBACK"); // Undoes the deduction if credit fails!
    throw err;
  }
}`,
          },
          lineByLineMarkdown: [
            '- **`BEGIN` / `COMMIT`**: Bundles both `UPDATE` statements into one atomic unit on the same connection (`client`).',
            '- **`ROLLBACK` in `catch`**: Ensures any error (like a `CHECK (balance >= 0)` failure or missing account) cleanly cancels the deduction.',
          ].join('\n'),
        },
      ],
      centralIdeaSummary:
        'A transaction wraps multiple queries between BEGIN and either COMMIT (all changes stick permanently) or ROLLBACK (all changes cleanly undo).',
    },
    {
      id: 'topic-5.1.6',
      topicId: '5.1.6',
      title: 'The ACID properties',
      problemAndRequirementsMarkdown: [
        '### First principles: What exact four promises does a relational transaction make?',
        'When engineers say a database supports real transactions, they summarize the guarantees under the acronym **ACID**. Rather than memorizing four buzzwords, see how each letter directly answers one real failure mode:',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Breaking down A-C-I-D',
        '- **A — Atomicity (“All or Nothing”)**: Either *every* operation in the transaction commits, or *none* do (`ROLLBACK` erases partial steps even after a sudden crash). *Solves the $50 disappearing mid-transfer.*',
        '- **C — Consistency (“Rules Stay Valid”)**: Every transaction transitions the database from one valid state to another, respecting all defined constraints (`PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `CHECK`) plus your application’s invariants. If any rule fails, the whole transaction aborts.',
        '- **I — Isolation (“Concurrent Transactions Don’t Trip Over Each Other”)**: While Transaction A is halfway through transferring $50, Transaction B running at the exact same time behaves cleanly according to the configured isolation level (without exposing half-baked intermediate states).',
        '- **D — Durability (“Committed Means Saved”)**: Once the database tells your backend `COMMIT` succeeded, those changes survive a power outage or server crash immediately afterward (backed by persistent disk logs, which we’ll inspect in `5.4`).',
      ].join('\n\n'),
      centralIdeaSummary:
        'ACID captures the four core guarantees of transactions: Atomicity (all-or-nothing), Consistency (valid invariants/constraints), Isolation (safe concurrency), and Durability (committed data survives crashes).',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'How boundaries and ACID protect a multi-step checkout',
    narrativeMarkdown: [
      'Imagine placing an order: (1) decrement product stock, (2) insert the `orders` row, and (3) insert `order_items` rows.',
      'Wrapping all three steps inside `BEGIN ... COMMIT` guarantees **Atomicity** (no order without stock deduction), enforces **Consistency** (`CHECK (stock >= 0)` rolls everything back if out of stock), coordinates concurrent buyers through **Isolation**, and guarantees **Durability** the moment `COMMIT` replies `OK` to Node.js.',
    ].join('\n\n'),
    integratedExample: {
      id: '5.1-integrated-example',
      title: 'Transaction boundary protecting multi-step order placement',
      language: 'sql',
      code: `BEGIN;
  -- 1. Fails CHECK (stock >= 0) if item sold out -> triggers ROLLBACK
  UPDATE products SET stock = stock - 1 WHERE id = 10;

  -- 2. Only reaches commit if stock update & constraints succeed
  INSERT INTO orders (user_id, total_cents) VALUES (42, 2500);
COMMIT; -- Durable & atomic: both happen together, or neither happens`,
    },
    walkthroughMarkdown:
      'Every piece of `5.1` connects directly: multi-step work needs explicit boundaries (`BEGIN`/`COMMIT`/`ROLLBACK`), and ACID spells out the exact guarantees the DBMS upholds inside those boundaries.',
  },
  questions: [
    {
      id: '5.1-kc-1',
      focusArea: 'Transaction Boundaries',
      prompt:
        'Suppose you deduct $50 from Alice and add $50 to Bob using two separate auto-committed SQL `UPDATE` queries instead of wrapping them in `BEGIN ... COMMIT`. What goes wrong if the Node.js server crashes—or the second `UPDATE` fails—between those two queries?',
      hints: [
        'Did the database know Query 1 depended on Query 2?',
        'What happens to Alice’s $50 if Query 1 already committed by itself?',
        'Because Query 1 already committed independently, a crash or Query 2 failure leaves Alice missing $50 while Bob received nothing—violating all-or-nothing atomicity.',
      ],
      explanation:
        'Without an explicit transaction (`BEGIN ... COMMIT`), the database commits the first `UPDATE` immediately as soon as it finishes. If Node crashes or the second `UPDATE` fails, the deduction cannot automatically undo—leaving Alice down $50 and Bob unchanged. Wrapping both in a transaction lets `ROLLBACK` erase the partial step.',
      evaluationCriteria: [
        'Explains Query 1 already committed independently without transaction boundaries',
        'Shows partial-failure inconsistency ($50 lost) solved by BEGIN/COMMIT/ROLLBACK',
      ],
      topicIds: ['5.1.1', '5.1.2', '5.1.3', '5.1.4', '5.1.5'],
    },
    {
      id: '5.1-kc-2',
      focusArea: 'ACID Properties',
      prompt:
        'Distinguish **Atomicity** from **Durability**, and explain why keeping an external HTTP payment API call *inside* an open `BEGIN ... COMMIT` transaction is a bad production habit.',
      hints: [
        'Ask: what does Atomicity guarantee if a step fails vs what does Durability guarantee *after* `COMMIT`?',
        'Think about how long an external HTTP call can hang (e.g. 5–10 seconds) while the transaction holds DB locks/connections.',
        'Atomicity means all-or-nothing rollback on failure, while Durability means committed changes survive crashes; making slow external HTTP calls inside an open transaction holds DB connections and locks far too long, stalling concurrent users.',
      ],
      explanation:
        '**Atomicity** ensures a transaction’s steps either all commit together or all roll back cleanly if anything fails, whereas **Durability** ensures that once `COMMIT` succeeds, data stays safely saved even if power fails seconds later. Keeping slow external HTTP calls inside `BEGIN ... COMMIT` pins a DB connection and holds locks/snapshots for seconds—degrading concurrency and risking pool exhaustion.',
      evaluationCriteria: [
        'Accurately separates Atomicity (all-or-nothing) from Durability (persists post-commit across crashes)',
        'Explains why slow external I/O inside a transaction hurts concurrency/locks/connections',
      ],
      topicIds: ['5.1.4', '5.1.6'],
    },
  ],
};

export const LESSON_5_2: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'In Sub-block 5.1, we learned that **Isolation** is the “I” in ACID—keeping concurrent transactions from corrupting each other. But here is a surprising truth: **perfect, airtight isolation slows databases down**, so databases actually offer *different strengths* of isolation!',
      'To understand *which* isolation level you need, you first have to see every exact bug that can sneak in when two transactions overlap. In this unit, we’ll trace all seven classic **Concurrency Anomalies**: **Dirty Reads**, **Non-Repeatable Reads**, **Phantom Reads**, **Lost Updates**, **Write Skew**, **Race Conditions**, and **Deadlocks**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Every subtle production money or inventory bug—“how did two users both buy the last seat when we used a transaction?!”—is one of these exact anomalies happening in real time.',
    prerequisites: [
      {
        subBlockId: '5.1',
        label: 'Transactions & Isolation (5.1.3, 5.1.6)',
        detail:
          'Understanding `BEGIN`, `COMMIT`, `ROLLBACK`, and the meaning of Isolation in ACID.',
      },
      {
        subBlockId: '1.2',
        label: 'Race conditions & deadlocks (1.2.6, 1.2.7)',
        detail:
          'Having seen thread interleaving cause lost updates and circular lock waiting.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-5.2.2',
      topicId: '5.2.2',
      coveredTopicIds: ['5.2.3', '5.2.4'],
      title: 'Read anomalies: Dirty Reads, Non-Repeatable Reads, and Phantom Reads',
      problemAndRequirementsMarkdown: [
        '### First principles: When Transaction A is reading data while Transaction B is writing, what can go wrong?',
        'Notice that all three **read anomalies** follow one pattern: *Transaction A reads data, while Transaction B modifies data concurrently.* Let’s trace each one from mild to subtle:',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Tracing the three Read Anomalies',
        '1. **Dirty Read (reading uncommitted data that might roll back!)**:',
        '   - Tx B updates Alice’s balance from `$100` to `$0` (not committed yet!).',
        '   - Tx A reads Alice’s balance and sees `$0`, so it rejects her payment.',
        '   - Then Tx B hits an error and executes **`ROLLBACK`**—Alice actually still has `$100`, yet Tx A acted on phantom uncommitted data that never existed! *(Note: PostgreSQL never allows dirty reads even at its lowest standard level.)*',
        '',
        '2. **Non-Repeatable Read (same row changes between two reads in one transaction!)**:',
        '   - Tx A reads product #1’s price: `$50`.',
        '   - Meanwhile, Tx B updates product #1’s price to `$60` and **`COMMIT`s**.',
        '   - Later inside the *same* Tx A, Tx A reads product #1 again and suddenly sees **`$60`**! Reading the exact same row twice gave two different values.',
        '',
        '3. **Phantom Read (new matching rows appear or disappear mid-transaction!)**:',
        '   - Tx A runs `SELECT COUNT(*) FROM orders WHERE status = \'pending\'` and gets **`5` rows**.',
        '   - Meanwhile, Tx B **`INSERT`s a new pending order** and **`COMMIT`s**.',
        '   - Tx A runs the exact same query again (or sums all pending orders) and suddenly sees **`6` rows**—a brand-new “phantom” row appeared matching the same `WHERE` filter!',
        '',
        '*(Spot the difference: **Non-Repeatable Read** = an existing row’s value changed; **Phantom Read** = the set of rows matching a `WHERE` search grew/shrank due to an `INSERT`/`DELETE`!)*',
      ].join('\n\n'),
      centralIdeaSummary:
        'Dirty reads expose uncommitted rolled-back changes, non-repeatable reads see an existing row mutate mid-transaction, and phantom reads see new matching rows appear mid-transaction.',
      codeExamples: [],
    },
    {
      id: 'topic-5.2.1',
      topicId: '5.2.1',
      coveredTopicIds: ['5.2.5', '5.2.6'],
      title: 'Write anomalies & race conditions: Lost Updates and Write Skew',
      problemAndRequirementsMarkdown: [
        '### First principles: What goes wrong when TWO transactions both read and then write?',
        'Read anomalies happen when one transaction reads while another writes. Even scarier bugs happen when **two concurrent transactions both read state, make decisions, and write**—general **database race conditions** that silently break business invariants!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Lost Updates vs. Write Skew',
        '1. **Lost Update (two transactions edit the *same* row blindly)**:',
        '   Remember the thread increment bug from `1.2.6`? The exact same race happens in SQL!',
        '   ```text',
        '   Initial stock = 10',
        '   Tx A reads stock (10) ──┐',
        '   Tx B reads stock (10) ──┼─▶ Tx A writes stock = 9 (10 - 1), COMMITs',
        '                           └─▶ Tx B writes stock = 9 (10 - 1), COMMITs  [Tx A’s sale was overwritten!]',
        '   ```',
        '   *(Even using `BEGIN ... COMMIT` at default isolation doesn’t automatically save you from `SELECT stock` → compute in JS → `UPDATE stock = 9` unless you use atomic SQL like `SET stock = stock - 1`, row locking, or stronger isolation!)*',
        '',
        '2. **Write Skew (two transactions read a *shared set*, then update *different* rows!)**:',
        '   This one catches almost everyone off guard because **no two transactions touch the same row**!',
        '   Imagine a hospital rule: *“At least 1 doctor must remain on call.”* Currently **Alice** and **Bob** are both on call (`2` doctors).',
        '   ```text',
        '   Tx A (Alice): SELECT COUNT(*) FROM doctors WHERE on_call = true; --> sees 2 (>= 2, safe to leave!)',
        '   Tx B (Bob):   SELECT COUNT(*) FROM doctors WHERE on_call = true; --> sees 2 (>= 2, safe to leave!)',
        '   Tx A updates Alice’s row: on_call = false; COMMIT;',
        '   Tx B updates Bob’s row:   on_call = false; COMMIT;',
        '   Result: ZERO doctors on call!!',
        '   ```',
        '   Notice why `UPDATE` row locks on Alice’s row and Bob’s row didn’t collide: Tx A edited *Alice’s* row, and Tx B edited *Bob’s* row—yet together they violated the cross-row rule because both made decisions from the same stale snapshot!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Database race conditions include Lost Updates (two writers read-modify-write the same row, overwriting one update) and Write Skew (two transactions read overlapping data and update different rows, breaking a combined invariant).',
      codeExamples: [],
    },
    {
      id: 'topic-5.2.7',
      topicId: '5.2.7',
      title: 'Deadlocks inside databases',
      problemAndRequirementsMarkdown: [
        '### First principles: What happens when two transactions politely lock rows in opposite orders?',
        'Suppose databases use locks (`5.3`) to prevent lost updates. Alice transfers to Bob (`id = 1` then `id = 2`), while at the exact same millisecond Bob transfers to Alice (`id = 2` then `id = 1`).',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Circular waiting and Deadlock detection',
        'Trace both transactions step by step:',
        '1. **Tx 1** locks Account `1`, and next tries to lock Account `2`.',
        '2. **Tx 2** already locked Account `2`, and next tries to lock Account `1`!',
        '',
        '```text',
        'Tx 1 holds [Account 1] ──── wants ────▶ [Account 2]',
        'Tx 2 holds [Account 2] ──── wants ────▶ [Account 1]',
        '```',
        'Neither can ever proceed unless the other commits—which neither ever can! That stalemate is a **Deadlock**.',
        '',
        'Unlike a frozen desktop program that hangs forever, PostgreSQL detects circular wait cycles automatically within ~1 second, **aborts and rolls back one victim transaction** with a deadlock error so the other succeeds—and your backend can either prevent deadlocks by **always locking IDs in sorted ascending order (`min(id)` then `max(id)`)** or safely **retry** aborted transactions!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Deadlocks occur when transactions acquire locks in conflicting circular orders; databases abort one victim automatically, while consistent lock ordering and retry logic prevent or recover from them.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Recognizing every concurrency anomaly at a glance',
    narrativeMarkdown: [
      'Compare all seven concepts side by side so you can diagnose any concurrency trace immediately:',
      '',
      '| Anomaly | What Happens | Same Row or Different Rows? |',
      '| --- | --- | --- |',
      '| **Dirty Read** | Reads uncommitted data from another tx that later rolls back | Same row |',
      '| **Non-Repeatable Read** | Reads same row twice inside one tx and gets different values | Same row (`UPDATE`/`DELETE`) |',
      '| **Phantom Read** | Runs same `WHERE` query twice inside one tx and gets new/missing rows | Matching row set (`INSERT`/`DELETE`) |',
      '| **Lost Update** | Two txs read same value, compute separately, and one overwrites the other | Same row (`UPDATE`) |',
      '| **Write Skew** | Two txs check overlapping condition, then write *disjoint* rows breaking invariant | Different rows! |',
      '| **Race Condition / Deadlock** | Timing-dependent outcome OR two txs holding locks waiting on each other | Conflicting order |',
    ].join('\n'),
    integratedExample: {
      id: '5.2-integrated-example',
      title: 'Preventing a deadlock simply by sorting lock acquisition order',
      language: 'sql',
      code: `-- BAD: Tx1 updates (1 -> 2) while Tx2 updates (2 -> 1) -> DEADLOCK risk!

-- GOOD: Always lock lower account id FIRST in every transfer:
BEGIN;
  -- Suppose transferring between account 2 and account 1: sort [1, 2]
  SELECT id, balance FROM accounts WHERE id IN (1, 2) ORDER BY id ASC FOR UPDATE;
  UPDATE accounts SET balance = balance - 50 WHERE id = 2;
  UPDATE accounts SET balance = balance + 50 WHERE id = 1;
COMMIT;`,
    },
    walkthroughMarkdown:
      'Knowing the difference between single-row races (Lost Updates), query-set changes (Phantoms), multi-row invariant races (Write Skew), and circular waits (Deadlocks) prepares you directly for choosing the right concurrency control in Sub-block `5.3`.',
  },
  questions: [
    {
      id: '5.2-kc-1',
      focusArea: 'Read Anomalies Comparison',
      prompt:
        'Contrast **Non-Repeatable Read**, **Phantom Read**, and **Dirty Read** cleanly—how does the change in the database differ in each case?',
      hints: [
        'Ask: (1) Was the change committed or rolled back? (2) Did an existing row change value, or did brand-new rows appear matching a filter?',
        'Compare reading `WHERE id = 5` twice vs `WHERE status = "open"` twice.',
        'Dirty read reads uncommitted data that later rolls back; non-repeatable read sees an *existing* row’s value change after another tx commits; phantom read sees *new/deleted* rows change which rows match a `WHERE` filter.',
      ],
      explanation:
        '- **Dirty Read**: Transaction A reads uncommitted changes from Transaction B, which then rolls back.\n- **Non-Repeatable Read**: Transaction A reads the exact same row twice and gets two different values because Transaction B updated and committed it in between.\n- **Phantom Read**: Transaction A runs the same range/`WHERE` query twice and gets a different set of rows because Transaction B inserted or deleted matching rows and committed in between.',
      evaluationCriteria: [
        'Clearly separates uncommitted rollback (dirty), existing-row change (non-repeatable), and set-membership change (phantom)',
      ],
      topicIds: ['5.2.2', '5.2.3', '5.2.4'],
    },
    {
      id: '5.2-kc-2',
      focusArea: 'Lost Update vs Write Skew',
      prompt:
        'Both **Lost Update** and **Write Skew** are read-then-write race conditions. Why can row-level write locks stop a Lost Update on `inventory.stock` yet still allow **Write Skew** in the two-doctors-on-call scenario?',
      hints: [
        'Look at *which row* Tx A writes vs *which row* Tx B writes in both scenarios.',
        'Did Alice and Bob update the same row or two different rows?',
        'In a Lost Update both transactions overwrite the *same* row; in Write Skew both read a shared condition and then update *different* disjoint rows (Alice’s row vs Bob’s row), so row write locks don’t collide!',
      ],
      explanation:
        'In a **Lost Update**, two transactions read and then write the **same row**, so locking or serializing edits to that row prevents the overwrite. In **Write Skew**, two transactions read an overlapping condition (`COUNT(*) = 2` doctors on call) and then each updates a **different row** (Tx A updates Alice’s row; Tx B updates Bob’s row). Since they never write the same row, simple row-level write locks never conflict—yet the combined invariant breaks!',
      evaluationCriteria: [
        'Contrasts writing the same row (Lost Update) vs disjoint rows (Write Skew)',
        'Explains why disjoint row writes slip past basic row write locks',
      ],
      topicIds: ['5.2.1', '5.2.5', '5.2.6'],
    },
    {
      id: '5.2-kc-3',
      focusArea: 'Database Deadlocks',
      prompt:
        'How does a **deadlock** happen when transferring money concurrently between Account 1 and Account 2, what does the database do about it, and how can application SQL prevent it?',
      hints: [
        'Trace Transfer A→B (`1` then `2`) overlapping with Transfer B→A (`2` then `1`).',
        'Think about acquiring locks in a deterministic order.',
        'Tx 1 locks `1` and waits for `2` while Tx 2 locks `2` and waits for `1`; the DB detects the cycle and aborts one transaction as victim. Prevent it by always locking account IDs in consistent sorted order (e.g. lowest ID first) and retrying on abort.',
      ],
      explanation:
        'If Tx 1 locks Account 1 then requests Account 2 while Tx 2 locks Account 2 then requests Account 1, both wait forever in a circular deadlock. Databases automatically detect the deadlock cycle and roll back one transaction so the other finishes. Applications prevent most deadlocks by **acquiring locks in a consistent canonical order** (e.g., `ORDER BY id ASC`) and handling retryable deadlock errors.',
      evaluationCriteria: [
        'Traces circular lock acquisition order',
        'Explains DB cycle detection + victim rollback, and consistent lock ordering prevention',
      ],
      topicIds: ['5.2.7'],
    },
  ],
};

export const LESSON_5_3: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'In Sub-block 5.2, we saw all the subtle ways concurrent transactions corrupt data: lost updates, non-repeatable reads, phantoms, and write skew. Now comes the engineering puzzle: **how do real databases stop those anomalies *without* forcing the entire database to run one single user at a time?**',
      'In this unit, we’ll examine **why locking is required and shared vs exclusive / row vs table locks**, **pessimistic vs optimistic concurrency control**, **Multi-Version Concurrency Control (MVCC) and PostgreSQL snapshot visibility**, and **isolation levels and serialization failures**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Knowing how PostgreSQL MVCC works explains why `SELECT` queries don’t block writers, why `READ COMMITTED` can still suffer lost updates unless you use atomic SQL or `FOR UPDATE`, and why `SERIALIZABLE` requires a retry loop on serialization failures.',
    prerequisites: [
      {
        subBlockId: '5.2',
        label: 'Concurrency anomalies (5.2.1–5.2.7)',
        detail:
          'Knowing dirty reads, non-repeatable reads, phantom reads, lost updates, write skew, and deadlocks.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-5.3.1',
      topicId: '5.3.1',
      coveredTopicIds: ['5.3.2', '5.3.3'],
      title: 'Locks in databases: shared vs exclusive, row-level vs table-level',
      problemAndRequirementsMarkdown: [
        '### First principles: Can 100 people read a row safely at the same time—and what changes when someone writes?',
        'Suppose 100 transactions want to read Product #9’s price at the exact same moment. Nobody is changing anything—so letting all 100 read concurrently is 100% safe!',
        '',
        'The moment *one* transaction wants to `UPDATE` Product #9’s price, two writers can’t overwrite the row simultaneously without colliding.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Lock modes and granularity',
        'Databases separate locks by **mode** and **scope**:',
        '- **Shared Lock (Read lock)**: Many transactions can hold a shared lock on the same item at once (readers share safely), *blocking* any writer until readers finish.',
        '- **Exclusive Lock (Write lock)**: Only **one** transaction holds an exclusive lock on a modified row—blocking *other writers* from editing that same row until `COMMIT` or `ROLLBACK`!',
        '- **Row-level vs Table-level locks**:',
        '  - **Row-level lock**: Locks only the single row being updated (`WHERE id = 42`), so other users updating `id = 43` proceed freely! High concurrency, tiny bit more tracking per row.',
        '  - **Table-level lock**: Locks the entire table (used by schema changes like `ALTER TABLE`, or bad unindexed full updates)—simple, *but* stalls everyone touching unrelated rows in that table!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Shared locks allow concurrent readers while exclusive locks serialize writes; row-level locks maximize concurrency compared to coarse table-level locks.',
      codeExamples: [],
    },
    {
      id: 'topic-5.3.4',
      topicId: '5.3.4',
      coveredTopicIds: ['5.3.5'],
      title: 'Pessimistic vs Optimistic concurrency control',
      problemAndRequirementsMarkdown: [
        '### First principles: Should you lock upfront *just in case*, or check at commit time *whether anyone collided*?',
        'Think of two real-world situations:',
        '1. **Flash sale with 500 users fighting over the last 3 concert tickets**: Conflicts happen constantly!',
        '2. **Editing a user profile or document where two people almost never edit the same record at the same second**: Conflicts are rare!',
        '',
        'Holding heavy locks across multi-step workflows in Case 2 wastes waiting time; skipping locks in Case 1 causes constant retries!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Pessimistic vs. Optimistic approaches',
        '- **Pessimistic Concurrency Control (“Lock before acting”)**: Assumes conflicts are likely, so the transaction acquires a row lock immediately when reading (`SELECT ... FOR UPDATE`) and holds it until `COMMIT`. Other writers wait in line cleanly—**no wasted retries**, at the cost of waiting/deadlock risk under contention.',
        '- **Optimistic Concurrency Control (“Check when saving”)**: Assumes conflicts are rare, so it takes **no locks while reading**! Instead, the row carries a **`version` number** (e.g., `version = 4`). When saving, the app runs:',
        '  `UPDATE products SET price = 2500, version = version + 1 WHERE id = 10 AND version = 4;`',
        '  If `0` rows were updated, someone else beat you and bumped `version` to `5`—so you abort and retry (or tell the user to refresh)! Zero lock waiting during reads, ideal for low contention or multi-step UI edits.',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '5.3.4-ex-1',
            title: 'Pessimistic (`FOR UPDATE`) vs Optimistic (`version` check)',
            language: 'sql',
            code: `-- PESSIMISTIC: Lock the row immediately on read until COMMIT
BEGIN;
  SELECT stock FROM products WHERE id = 10 FOR UPDATE;
  -- Nobody else can modify product 10 until we COMMIT or ROLLBACK
  UPDATE products SET stock = stock - 1 WHERE id = 10;
COMMIT;

-- OPTIMISTIC: Read version=4 without locking; verify version unchanged on UPDATE
UPDATE products
SET name = 'Pro Keyboard', version = version + 1
WHERE id = 10 AND version = 4;
-- App checks rowCount: if 0, another writer updated version first!`,
          },
          lineByLineMarkdown: [
            '- **`FOR UPDATE`**: Acquires an exclusive row lock on `id = 10` right at `SELECT`, stopping concurrent Lost Updates.',
            '- **`AND version = 4`**: Atomic compare-and-swap—succeeds only if nobody modified `id = 10` since you read `version = 4`.',
          ].join('\n'),
        },
      ],
      centralIdeaSummary:
        'Pessimistic control locks rows upfront (`FOR UPDATE`) to prevent contention retries, while optimistic control avoids locks via version checks at update time and retries only on rare conflicts.',
    },
    {
      id: 'topic-5.3.6',
      topicId: '5.3.6',
      coveredTopicIds: ['5.3.7', '5.3.8'],
      title: 'MVCC (Multi-Version Concurrency Control) & PostgreSQL snapshot visibility',
      problemAndRequirementsMarkdown: [
        '### First principles: How do databases let readers read WITHOUT blocking writers—and writers write WITHOUT blocking readers?',
        'Earlier we said shared locks block writers and exclusive locks block readers. If a big analytics `SELECT` took 10 seconds to scan `orders`, **locking out every customer trying to place a new order for 10 seconds would destroy your site!**',
        '',
        'Wait—how can PostgreSQL let a 10-second `SELECT` run smoothly while thousands of `INSERT`s and `UPDATE`s keep writing to `orders` at full speed?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: MVCC and Snapshot Visibility',
        'Instead of overwriting a row in place and forcing readers to wait, PostgreSQL uses **MVCC (Multi-Version Concurrency Control)**.',
        '',
        'Think of MVCC like keeping versioned snapshots on a shelf:',
        '- When Tx B `UPDATE`s a row from `$50` to `$60`, PostgreSQL **does not erase `$50` on the spot**! Instead, it writes a **new row version** (`$60`, tagged with Tx B’s transaction ID) alongside the older `$50` version.',
        '- Every transaction gets a **snapshot** telling it *which* transaction IDs had already committed when its snapshot was taken (**snapshot visibility**):',
        '  - Tx A (reading under a snapshot taken *before* Tx B committed) sees the **`$50`** version—completely unblocked!',
        '  - Even if Tx B is still mid-flight (uncommitted), Tx A skips the uncommitted `$60` version automatically (making **Dirty Reads impossible**!).',
        '  - New transactions starting *after* Tx B commits see the **`$60`** version.',
        '',
        'The golden rule of MVCC: **Readers never block writers, and writers never block readers!** *(Only two writers editing the exact same row contend on row locks—and old invisible row versions get cleaned up later by Postgres’s `VACUUM` process.)*',
      ].join('\n\n'),
      centralIdeaSummary:
        'MVCC keeps multiple row versions with transaction visibility metadata so readers view consistent snapshots without blocking writers and writers never block readers.',
      codeExamples: [],
    },
    {
      id: 'topic-5.3.9',
      topicId: '5.3.9',
      coveredTopicIds: ['5.3.10'],
      title: 'Isolation levels and serialization failures',
      problemAndRequirementsMarkdown: [
        '### First principles: Why aren’t all transactions set to the strictest isolation level automatically?',
        'Because stricter isolation forces the database to track more conflicts or hold snapshots longer—potentially aborting overlapping transactions that have to be retried! So SQL defines standard **Isolation Levels** letting you pick the exact safety vs. concurrency trade-off.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Isolation Levels & Serialization Failures',
        'Look at the four standard levels (especially how **PostgreSQL** implements them with MVCC):',
        '',
        '| Isolation Level | Snapshot Taken When? | Prevents | Still Possible |',
        '| --- | --- | --- | --- |',
        '| **Read Uncommitted** | *(Postgres upgrades this to Read Committed)* | — | — |',
        '| **Read Committed** *(Postgres default)* | Fresh snapshot per **each SQL statement** | Dirty Reads | Non-Repeatable Reads, Phantoms, Lost Updates, Write Skew |',
        '| **Repeatable Read** | One frozen snapshot for the **entire transaction** | Dirty, Non-Repeatable, Phantoms (in Postgres MVCC), Lost Updates (aborts!) | **Write Skew**! |',
        '| **Serializable** | Snapshot + tracks read/write dependency cycles | **All anomalies** including Write Skew! | Must handle **Serialization Failures** |',
        '',
        'Look closely at **`Serialization Failures`** (`SQLSTATE 40001` in PostgreSQL): under **`REPEATABLE READ`** (if two txs update the same row) or **`SERIALIZABLE`** (if two txs form a **Write Skew** cycle like the two doctors leaving call!), PostgreSQL refuses to corrupt data—it **aborts one transaction with a serialization failure**!',
        '',
        '**Crucial backend pattern**: Choosing `REPEATABLE READ` or `SERIALIZABLE` isn’t a “set and forget” flag—your application code **must catch serialization errors and automatically retry the whole transaction** cleanly!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Isolation levels trade performance/retry simplicity for stronger anomaly protection (Read Committed → Repeatable Read → Serializable), and stronger MVCC levels surface conflicts as serialization failures that backends must retry.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Picking the right concurrency control strategy for real backend bugs',
    narrativeMarkdown: [
      'Connect `5.2`’s anomalies straight to `5.3`’s tools:',
      '1. **Need simple atomic decrement** (`stock = stock - 1 WHERE stock >= 1`) → Single atomic SQL `UPDATE` takes a brief exclusive row lock automatically.',
      '2. **Multi-step read-then-write under high contention** (flash sale) → **Pessimistic** `SELECT ... FOR UPDATE` inside a short `READ COMMITTED` transaction.',
      '3. **Multi-step read-then-write under low contention** → **Optimistic** `WHERE version = $1` check.',
      '4. **Consistent multi-query reports** → **MVCC `REPEATABLE READ`** freezes one snapshot without blocking writers.',
      '5. **Cross-row invariants vulnerable to Write Skew** (two doctors on call, double-booking overlapping time slots) → **`SERIALIZABLE` + automatic retry loop** on serialization failure.',
    ].join('\n\n'),
    integratedExample: {
      id: '5.3-integrated-example',
      title: 'Safe transaction retry loop handling serialization failures (40001) & deadlocks (40P01)',
      language: 'typescript',
      code: `async function withSerializableRetry<T>(
  runTx: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await runTx(); // Runs BEGIN ISOLATION LEVEL SERIALIZABLE ... COMMIT
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      const isRetryable = code === "40001" || code === "40P01"; // Serialization failure or Deadlock
      if (!isRetryable || attempt === maxRetries) throw err;
    }
  }
  throw new Error("Unreachable");
}`,
    },
    walkthroughMarkdown:
      'MVCC keeps reads fast and unblocked, locks or version checks protect targeted writes, and a small retry helper safely recovers whenever strict isolation catches a serialization conflict.',
  },
  questions: [
    {
      id: '5.3-kc-1',
      focusArea: 'MVCC & Non-Blocking Reads',
      prompt:
        'How does **PostgreSQL MVCC** let a long `SELECT` report read consistent data while concurrent `INSERT`/`UPDATE` transactions commit at full speed—without readers blocking writers or seeing **Dirty Reads**?',
      hints: [
        'Think about what MVCC stores when a row is updated instead of overwriting bytes in place.',
        'How does snapshot visibility decide which version a transaction is allowed to see?',
        'MVCC writes new row versions tagged with transaction IDs; each transaction reads against a snapshot showing only versions committed before its snapshot began, skipping uncommitted edits (no dirty reads) without blocking writers.',
      ],
      explanation:
        'Under **MVCC (Multi-Version Concurrency Control)**, updates create a new version of a row rather than overwriting the old one in place. Each transaction sees only row versions whose committing transaction is visible in its **snapshot**—completely ignoring uncommitted writes (preventing dirty reads) while letting readers and writers proceed without blocking each other.',
      evaluationCriteria: [
        'Explains multi-version row storage instead of in-place overwrite',
        'Explains snapshot visibility hiding uncommitted edits and letting readers/writers run non-blockingly',
      ],
      topicIds: ['5.3.6', '5.3.7', '5.3.8'],
    },
    {
      id: '5.3-kc-2',
      focusArea: 'Pessimistic vs Optimistic Control',
      prompt:
        'Compare **pessimistic locking (`SELECT ... FOR UPDATE`)** vs **optimistic concurrency control (`version` column)**. Which fits a flash-sale ticket checkout better, and which fits a low-conflict admin profile editor better?',
      hints: [
        'Ask how often collisions happen in each scenario and how long a human spends editing a form vs running a fast DB update.',
        'What happens to waiting users vs retry failures in each?',
        'Flash-sale tickets have high contention so pessimistic `FOR UPDATE` avoids endless failed retries; an admin form spans human think-time with rare conflicts so optimistic `version` checks avoid holding locks.',
      ],
      explanation:
        '**Pessimistic (`FOR UPDATE`)** locks rows upfront until `COMMIT`—best for short, high-contention transactions like flash-sale inventory where optimistic checks would constantly fail and retry. **Optimistic (`version`)** skips locks and checks `WHERE version = expected` on save—best for low-contention flows or edits spanning user think-time where holding a database lock would block others.',
      evaluationCriteria: [
        'Matches pessimistic locking to high-contention short transactions',
        'Matches optimistic version checks to low-contention / longer workflows',
      ],
      topicIds: ['5.3.1', '5.3.2', '5.3.3', '5.3.4', '5.3.5'],
    },
    {
      id: '5.3-kc-3',
      focusArea: 'Isolation Levels & Serialization Failures',
      prompt:
        'Contrast **`READ COMMITTED`**, **`REPEATABLE READ`**, and **`SERIALIZABLE`** in PostgreSQL—and explain why switching to `SERIALIZABLE` without a **transaction retry loop** in your backend causes user-facing errors under load.',
      hints: [
        'Compare when snapshots are taken (`Read Committed` per statement vs `Repeatable Read` per tx), and which stops Write Skew.',
        'What does Postgres return (`40001`) when two concurrent `SERIALIZABLE` transactions conflict?',
        '`Read Committed` takes a fresh snapshot per statement; `Repeatable Read` freezes one snapshot per tx (still allowing Write Skew); `Serializable` prevents Write Skew too by aborting conflicting transactions with a serialization failure (`40001`), which the app must catch and retry.',
      ],
      explanation:
        '- **`READ COMMITTED`**: Each SQL statement sees a fresh snapshot of committed data (allows non-repeatable reads and write skew).\n- **`REPEATABLE READ`**: Freezes one snapshot for the entire transaction (stops non-repeatable reads & lost updates, *still allows Write Skew*).\n- **`SERIALIZABLE`**: Prevents *all* anomalies including Write Skew—by tracking dependencies and aborting conflicting transactions with a **serialization failure** (`40001`). Your application must wrap `SERIALIZABLE` transactions in a retry loop so occasional conflicts recover seamlessly.',
      evaluationCriteria: [
        'Correctly contrasts statement vs transaction snapshots and Write Skew protection',
        'Explains serialization failure aborts requiring application retry logic',
      ],
      topicIds: ['5.3.9', '5.3.10'],
    },
  ],
};
