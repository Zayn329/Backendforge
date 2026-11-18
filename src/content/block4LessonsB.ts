import { FptLessonContent, RecipeLessonContent } from '../types';

export const LESSON_4_3: RecipeLessonContent = {
  purposeMarkdown:
    'In Sub-block 4.2, we designed clean tables and relationships. **SQL (Structured Query Language)** is how your backend actually creates those tables, modifies data safely, joins entities back together, and computes analytics without pulling millions of rows into Node.js RAM.',
  whenToUseMarkdown:
    'Use SQL for every schema definition, transactional read/write, filtered paginated list, multi-table join, and aggregation inside PostgreSQL or any relational database.',
  setupCommands: [
    {
      id: '4.3-cmd-1',
      label: 'Connect to local PostgreSQL via psql',
      command: 'psql "$DATABASE_URL"',
      notes: 'Runs interactive SQL against your database; end each statement with a semicolon (;).',
    },
  ],
  coreApisMarkdown: [
    '- **DDL (`CREATE TABLE`, `ALTER TABLE`)**: Defines and evolves table structure, keys, and constraints.',
    '- **DML (`INSERT`, `SELECT`, `UPDATE`, `DELETE`)**: Writes and reads rows (`RETURNING *` hands back affected rows in PostgreSQL).',
    '- **Filtering & Ordering (`WHERE`, `ORDER BY`, `LIMIT`)**: Narrows and orders matching rows at the DB layer.',
    '- **Grouping vs. Window Functions (`GROUP BY` + `COUNT`/`SUM` vs. `OVER (...)`)**: `GROUP BY` collapses rows into one summary row per group; Window Functions compute aggregates/ranks *across* related rows while keeping every detail row intact!',
    '- **Combining & Structuring (`JOIN`, Subqueries, CTEs `WITH`)**: Reconnects normalized tables and breaks multi-step queries into readable named stages.',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Define & evolve tables (`CREATE` and `ALTER`)',
      detailMarkdown:
        'Start with `CREATE TABLE` including Primary Keys, Foreign Keys, and `CHECK`/`UNIQUE` constraints (`4.2`). Use `ALTER TABLE` to add new columns or constraints as requirements grow.',
      code: {
        id: '4.3-step-1',
        title: 'CREATE TABLE and ALTER TABLE',
        language: 'sql',
        code: `CREATE TABLE customers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled')),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE customers ADD COLUMN tier TEXT NOT NULL DEFAULT 'standard';`,
      },
    },
    {
      stepNumber: 2,
      title: 'Insert, query, filter, update, and delete safely (`INSERT`, `SELECT`, `WHERE`, `UPDATE`, `DELETE`)',
      detailMarkdown:
        'Always filter `SELECT`, `UPDATE`, and `DELETE` with an explicit `WHERE` clause (never run `UPDATE` or `DELETE` without `WHERE` unless you truly intend to touch the entire table!). In PostgreSQL, add `RETURNING *` to get inserted/updated values back in one round-trip.',
      code: {
        id: '4.3-step-2',
        title: 'CRUD queries with WHERE and RETURNING',
        language: 'sql',
        code: `-- INSERT with RETURNING
INSERT INTO customers (email) VALUES ('ada@example.com') RETURNING id, email;

-- SELECT + WHERE
SELECT id, status, total_cents
FROM orders
WHERE customer_id = 1 AND status = 'paid';

-- UPDATE & DELETE (always scoped by WHERE!)
UPDATE orders SET status = 'paid' WHERE id = 42 AND status = 'pending' RETURNING id, status;
DELETE FROM orders WHERE id = 99 AND status = 'cancelled';`,
      },
    },
    {
      stepNumber: 3,
      title: 'Sort, group, and aggregate (`ORDER BY`, `GROUP BY`, `COUNT`, `SUM`)',
      detailMarkdown:
        'Sort results predictably with `ORDER BY` (notice: without `ORDER BY`, SQL gives no guaranteed order!). Use `GROUP BY` + aggregate functions (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`) to collapse rows into per-customer summaries—and use `HAVING` (not `WHERE`) to filter *after* grouping.',
      code: {
        id: '4.3-step-3',
        title: 'Sorting, grouping, and aggregates',
        language: 'sql',
        code: `SELECT
  customer_id,
  COUNT(*) AS paid_order_count,
  SUM(total_cents) AS total_spent_cents
FROM orders
WHERE status = 'paid'                 -- Filters rows BEFORE grouping
GROUP BY customer_id
HAVING SUM(total_cents) >= 10000      -- Filters groups AFTER aggregating
ORDER BY total_spent_cents DESC
LIMIT 10;`,
      },
    },
    {
      stepNumber: 4,
      title: 'Reconnect tables with `JOIN` (INNER vs LEFT JOIN)',
      detailMarkdown:
        '`INNER JOIN` returns rows that match in *both* tables; `LEFT JOIN` keeps every row from the left table even when no matching row exists on the right (filling missing right-side columns with `NULL`)—essential when finding “all customers, including those with zero orders.”',
      code: {
        id: '4.3-step-4',
        title: 'INNER JOIN vs LEFT JOIN',
        language: 'sql',
        code: `-- LEFT JOIN keeps customers even if they have 0 orders
SELECT
  c.id,
  c.email,
  COUNT(o.id) AS order_count,
  COALESCE(SUM(o.total_cents), 0) AS lifetime_cents
FROM customers c
LEFT JOIN orders o
  ON o.customer_id = c.id AND o.status = 'paid'
GROUP BY c.id, c.email;`,
      },
    },
    {
      stepNumber: 5,
      title: 'Compose multi-step logic (`Subqueries`, `CTEs`, and `Window Functions`)',
      detailMarkdown:
        'When a query needs an intermediate calculation:\n- A **Subquery** nests one `SELECT` inside another (`WHERE customer_id IN (SELECT ...)`).\n- A **CTE (`WITH ... AS`)** names that intermediate step at the top so the query reads cleanly top-to-bottom.\n- A **Window Function (`OVER (PARTITION BY ... ORDER BY ...)`)** computes rankings, running totals, or group averages *without* collapsing individual rows like `GROUP BY` does!',
      code: {
        id: '4.3-step-5',
        title: 'Subquery, CTE, and Window Function comparison',
        language: 'sql',
        code: `-- Subquery: customers who placed at least one high-value paid order
SELECT email
FROM customers
WHERE id IN (
  SELECT customer_id FROM orders WHERE status = 'paid' AND total_cents > 50000
);

-- CTE + Window Function: rank each customer's paid orders while keeping every order row!
WITH paid_orders AS (
  SELECT id, customer_id, total_cents, created_at
  FROM orders
  WHERE status = 'paid'
)
SELECT
  id AS order_id,
  customer_id,
  total_cents,
  ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC) AS customer_order_rank,
  SUM(total_cents) OVER (PARTITION BY customer_id) AS customer_lifetime_cents
FROM paid_orders;`,
      },
    },
  ],
  workingExamples: [
    {
      id: '4.3-ex-1',
      title: 'End-to-end backend reporting query using CTE + LEFT JOIN + Window Function',
      language: 'sql',
      code: `WITH customer_totals AS (
  SELECT
    c.id AS customer_id,
    c.email,
    COALESCE(SUM(o.total_cents), 0) AS spent_cents
  FROM customers c
  LEFT JOIN orders o
    ON o.customer_id = c.id AND o.status = 'paid'
  GROUP BY c.id, c.email
)
SELECT
  customer_id,
  email,
  spent_cents,
  DENSE_RANK() OVER (ORDER BY spent_cents DESC) AS spending_rank
FROM customer_totals
ORDER BY spending_rank ASC, customer_id ASC;`,
      explanation:
        'The CTE aggregates spend per customer (preserving zero-order customers via LEFT JOIN + COALESCE), and the outer Window Function ranks everyone without losing individual customer rows.',
    },
  ],
  commonMistakes: [
    {
      mistake:
        'Putting a `LEFT JOIN` table filter (`WHERE o.status = \'paid\'`) in the `WHERE` clause instead of the `ON` clause.',
      fix: 'Filtering `o.status = \'paid\'` in `WHERE` discards rows where `o.status` is `NULL`, silently turning your `LEFT JOIN` back into an `INNER JOIN`! Put optional-side filters inside `LEFT JOIN ... ON o.customer_id = c.id AND o.status = \'paid\'`.',
    },
    {
      mistake: 'Trying to filter an aggregate like `WHERE SUM(total_cents) > 1000`.',
      fix: '`WHERE` filters individual rows *before* grouping; use `HAVING SUM(total_cents) > 1000` *after* `GROUP BY`.',
    },
    {
      mistake: 'Using `OFFSET` / `LIMIT` without `ORDER BY`.',
      fix: 'Without `ORDER BY`, databases return rows in arbitrary storage order that can shuffle across pages—always pair pagination with a deterministic `ORDER BY` (ending with a unique tie-breaker like `id`).',
    },
  ],
  exercise: {
    id: '4.3-ex',
    title: 'Write Schema, Joins, CTE & Window Queries',
    instructionsMarkdown:
      'Using tables `users(id, email)` and `invoices(id, user_id, status, amount_cents, issued_at)`:\n1. Write `CREATE TABLE` statements with `PRIMARY KEY`, `FOREIGN KEY`, and a `CHECK (amount_cents >= 0)` constraint.\n2. Write a `LEFT JOIN` + `GROUP BY` query returning every user’s email and total paid `amount_cents` (`0` if none), filtering to users who spent at least `5000` cents.\n3. Write a CTE + Window Function query listing every paid invoice along with each user’s cumulative running total (`SUM(amount_cents) OVER (PARTITION BY user_id ORDER BY issued_at, id)`).',
    acceptanceChecklist: [
      'Tables enforce PK, FK references, and non-negative CHECK constraint',
      'LEFT JOIN places status filter on JOIN ON (or handles NULL via COALESCE)',
      'HAVING filters aggregated spend >= 5000',
      'CTE + Window Function computes per-user running total while keeping every invoice row',
    ],
  },
};

export const LESSON_4_4: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Now that we know how to model tables (`4.2`) and query them with SQL (`4.3`), let’s ask a deeper design question: **if you shove all related facts into one wide table, what actually breaks as data changes over time?**',
      'In this unit, we’ll learn **Database Normalization** from first principles: **update, insertion, and deletion anomalies**, **functional dependencies**, walking a messy table step by step through **First, Second, and Third Normal Form (1NF → 2NF → 3NF)**, and understanding **when controlled denormalization makes sense (and its trade-offs)**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Normalization isn’t an abstract academic exam rule—it directly stops bugs where changing one customer’s address updates 3 old orders but misses 2, or deleting the last order accidentally erases a customer or product record forever.',
    prerequisites: [
      {
        subBlockId: '4.2',
        label: 'Primary keys, foreign keys & join tables (4.2.3–4.2.7)',
        detail:
          'Knowing how tables reference each other using Primary Keys and Foreign Keys.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-4.4.1',
      topicId: '4.4.1',
      coveredTopicIds: ['4.4.2', '4.4.3'],
      title: 'Why unnormalized tables break: Update, Insertion, and Deletion anomalies',
      problemAndRequirementsMarkdown: [
        '### First principles: Watch what goes wrong in one giant spreadsheet-style table',
        'Imagine a startup stores everything about orders inside **one single table**:',
        '```text',
        'order_sheet(order_id, customer_id, customer_email, product_id, product_name, qty)',
        '  (101, u1, "ada@mail.com", p5, "Mechanical Keyboard", 1)',
        '  (102, u1, "ada@mail.com", p8, "USB-C Cable",         2)',
        '```',
        'Look closely at **three real bugs (anomalies)** this single table creates immediately:',
        '1. **Update Anomaly**: Ada changes her email to `"ada@newdomain.com"`. Because her email is copied into every order row, you must hunt down and update *both* rows `101` and `102` (or 5,000 rows!). If one update misses or fails halfway, Ada now has two different emails in the same database!',
        '2. **Insertion Anomaly**: You just added a brand-new product `p9 ("Laptop Stand")` to your store, **but nobody has ordered it yet**. Where can you insert `p9` in `order_sheet`? Nowhere—unless you invent a fake `order_id` with `NULL` customer!',
        '3. **Deletion Anomaly**: Suppose order `101` gets cancelled and you `DELETE` that row. If `101` was the *only* order that ever bought `Mechanical Keyboard`, deleting order `101` **silently deletes your last record that `p5` even existed**!',
        '',
        '### Deriving the root cause',
        'Every single one of those anomalies happened because **one table tried to store facts about three separate entities (`orders`, `customers`, `products`) in the same row**!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Storing each fact in exactly one place',
        'Database normalization fixes update, insertion, and deletion anomalies by splitting mixed tables so that **each independent entity and fact lives in one single authoritative home**, linked by keys (`4.2`):',
        '- `customers(id, email)` holds Ada’s email **once** (no update anomaly!).',
        '- `products(id, name)` holds `Laptop Stand` **independently** of whether anyone ordered it yet (no insertion or deletion anomaly!).',
        '- `orders` and `order_items` reference them by ID!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Mixing multiple entities into one table creates update (partial edits), insertion (can’t add unlinked records), and deletion (deleting a row erases unrelated facts) anomalies.',
      codeExamples: [],
    },
    {
      id: 'topic-4.4.4',
      topicId: '4.4.4',
      coveredTopicIds: ['4.4.5', '4.4.6', '4.4.7'],
      title: 'Functional dependencies and 1NF → 2NF → 3NF step by step',
      problemAndRequirementsMarkdown: [
        '### First principles: How do you systematically spot *which* columns belong together in a table?',
        'Before guessing how to split tables, database designers ask a simple question called **functional dependency** (`A → B`, read *“A determines B”*):',
        '> *If I know the value of column `A`, does that uniquely determine one exact value of column `B`?*',
        '',
        'For example: knowing `customer_id` determines `customer_email` (`customer_id → customer_email`). Knowing `order_id` does **not** determine `product_id` if one order has 3 items—you need `(order_id, product_id)` together to determine `qty`!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Walking through 1NF, 2NF, and 3NF',
        'Think of the Normal Forms as three progressively stricter cleanup passes:',
        '',
        '1. **First Normal Form (1NF) — Atomic values, no repeating groups/lists**:',
        '   - *Bad*: One `orders` row storing `product_ids = "p5, p8"` (comma-separated list inside one cell!). You can’t enforce Foreign Keys or join cleanly.',
        '   - *1NF Fix*: Every cell holds **one single atomic value**—split multi-item lists into separate rows (`(order_id, product_id)`).',
        '',
        '2. **Second Normal Form (2NF) — No partial dependency on a composite key**:',
        '   - *Starts in 1NF*, and matters when a table has a **multi-column Primary Key** like `(order_id, product_id)` in `order_items(order_id, product_id, product_name, qty)`.',
        '   - Look closely: `qty` depends on the *whole* key `(order_id, product_id)`, **but `product_name` depends ONLY on `product_id`!** That’s a *partial dependency*—repeating `"Mechanical Keyboard"` in every order line.',
        '   - *2NF Fix*: Move `product_name` out to `products(product_id, product_name)` so every non-key column depends on the **entire** Primary Key!',
        '',
        '3. **Third Normal Form (3NF) — No transitive dependency between non-key columns**:',
        '   - *Starts in 2NF*. Look at `orders(order_id, customer_id, customer_email)`. Here the Primary Key is single-column `order_id`—so there’s no partial key problem! **Yet look at the chain**: `order_id → customer_id`, and `customer_id → customer_email`! So `customer_email` depends on `order_id` *indirectly through another non-key column (`customer_id`)*—a **transitive dependency**.',
        '   - *3NF Fix*: Move `customer_email` into `customers(customer_id, email)`, leaving only `customer_id` FK in `orders`.',
        '',
        'Notice the classic memory rhyme that sums up 1NF–3NF cleanly: *every non-key column depends on **the key** (1NF), **the whole key** (2NF), and **nothing but the key** (3NF)!*',
      ].join('\n\n'),
      centralIdeaSummary:
        'Using functional dependencies, 1NF makes every column value atomic, 2NF eliminates partial dependencies on part of a composite key, and 3NF eliminates transitive dependencies through other non-key columns.',
      codeExamples: [],
    },
    {
      id: 'topic-4.4.8',
      topicId: '4.4.8',
      title: 'Denormalization and engineering trade-offs',
      problemAndRequirementsMarkdown: [
        '### First principles: If 3NF removes anomalies cleanly, why would anyone *ever* denormalize?',
        'Suppose you normalize everything cleanly into 3NF: `users`, `orders`, `order_items`, `products`, `categories`, `discounts`.',
        '',
        'Now imagine an analytics dashboard or high-traffic `GET /orders` list runs 5,000 times per second and must `JOIN` 6 tables and `SUM(qty * unit_price)` every single time! Or even simpler: think about **unit price at purchase time** (`order_items.unit_price_cents` vs `products.price_cents`)!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Intentional, controlled Denormalization',
        '**Denormalization** means deliberately storing a computed or copied column in a table (breaking strict 3NF) to optimize **read speed** or capture a **historical snapshot**—after you understand the exact write cost!',
        '',
        'Look at the two real reasons backend engineers denormalize on purpose:',
        '1. **Historical Snapshots (actually required for correctness!)**: Copying `products.price_cents` into `order_items.unit_price_cents` when an order is placed ensures that raising a product’s price next month *doesn’t retroactively rewrite last year’s invoices*!',
        '2. **Read-Heavy Performance**: Storing a cached `orders.item_count` or `posts.like_count` avoids running expensive `COUNT(*)` joins across millions of rows on every page load.',
        '',
        '**The trade-off you accept whenever you denormalize**: Faster reads come at the cost of **more complex, slower writes** (every insert/delete on `order_items` or `likes` must also update the cached counter inside a transaction, or it drifts out of sync!). Normalize to 3NF *first* by default, and denormalize deliberately only where measured reads justify maintaining the extra copy.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Normalize to 3NF by default to guarantee clean single-source-of-truth writes; denormalize selectively only for historical snapshots or proven read bottlenecks, accepting extra write/sync complexity.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Transforming an anomalous table cleanly through 1NF → 2NF → 3NF',
    narrativeMarkdown: [
      'Watch how each normalization rule fixes one concrete anomaly—and where intentional denormalization sits afterward:',
      '',
      '| Stage | Rule Enforced | Table Change |',
      '| --- | --- | --- |',
      '| Unnormalized | Multi-value `"p5, p8"` cell | Cannot join or enforce product FKs |',
      '| **1NF** | Atomic values (one item per row) | `order_rows(order_id, product_id, product_name, customer_id, customer_email, qty)` |',
      '| **2NF** | Whole composite key `(order_id, product_id)` | Extract `products(product_id, product_name)` |',
      '| **3NF** | Nothing but the key (no `order_id -> customer_id -> email`) | Extract `customers(customer_id, email)` and `orders(order_id, customer_id)` |',
      '| **Selective Denormalization** | Historical snapshot / read optimization | Keep `unit_price_cents_at_purchase` in `order_items` so price edits never alter old receipts |',
    ].join('\n'),
    integratedExample: {
      id: '4.4-integrated-example',
      title: 'Resulting 3NF schema (plus historical unit_price snapshot)',
      language: 'sql',
      code: `CREATE TABLE customers (
  id BIGINT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE        -- Stored once: zero update anomaly
);

CREATE TABLE products (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,               -- Can exist with 0 orders: zero insertion/deletion anomaly
  current_price_cents INTEGER NOT NULL
);

CREATE TABLE orders (
  id BIGINT PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id)
);

CREATE TABLE order_items (
  order_id BIGINT NOT NULL REFERENCES orders(id),
  product_id BIGINT NOT NULL REFERENCES products(id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_price_cents INTEGER NOT NULL, -- Intentional historical snapshot!
  PRIMARY KEY (order_id, product_id)
);`,
    },
    walkthroughMarkdown:
      'Every non-key fact now lives in its one authoritative home (`customers.email`, `products.name`), eliminating update, insertion, and deletion anomalies—while storing `unit_price_cents` on `order_items` intentionally preserves historical order pricing.',
  },
  questions: [
    {
      id: '4.4-kc-1',
      focusArea: 'Update, Insertion & Deletion Anomalies',
      prompt:
        'A table `enrollments(student_id, student_email, course_id, course_title)` stores one row per student course registration. Give one concrete example of an **update anomaly**, an **insertion anomaly**, and a **deletion anomaly** on this table.',
      hints: [
        'Test three scenarios: (1) changing a student’s email, (2) launching a brand-new course with 0 students yet, (3) the only enrolled student drops a course.',
        'Watch how copying student and course info across rows breaks each case.',
        'Update: editing `student_email` across 5 rows risks partial mismatch; Insertion: can’t add a new course with 0 enrolled students; Deletion: dropping the last student row deletes the course record entirely.',
      ],
      explanation:
        '- **Update anomaly**: Updating a student’s email must touch every course row they are enrolled in—missing one row creates conflicting emails.\n- **Insertion anomaly**: You cannot insert a newly created course before at least one student enrolls (unless using fake `NULL` student fields).\n- **Deletion anomaly**: If the last student drops a course and you delete that row, all record of the course (`course_title`) disappears too.',
      evaluationCriteria: [
        'Gives accurate scenario for update anomaly',
        'Gives accurate scenario for insertion anomaly',
        'Gives accurate scenario for deletion anomaly',
      ],
      topicIds: ['4.4.1', '4.4.2', '4.4.3'],
    },
    {
      id: '4.4-kc-2',
      focusArea: '2NF vs 3NF Functional Dependencies',
      prompt:
        'Explain the difference between violating **Second Normal Form (2NF)** vs violating **Third Normal Form (3NF)** using functional dependencies—and show how to fix each.',
      hints: [
        '2NF looks at a multi-column Primary Key (`(A, B) -> C` vs `B -> C`).',
        '3NF looks at a chain (`PK -> X` and `X -> Y` where `X` is NOT a key).',
        '2NF violation is a partial dependency on only *part* of a composite Primary Key; 3NF violation is a transitive dependency where a non-key column depends on *another non-key column*. Fix both by extracting the partial or transitive dependency into its own table.',
      ],
      explanation:
        'A **2NF violation** occurs when a table has a composite Primary Key `(order_id, product_id)` and a non-key column like `product_name` depends on only *part* of that key (`product_id → product_name`). A **3NF violation** occurs when a non-key column depends *transitively* on the key via another non-key column (`order_id → customer_id → customer_email`). Both are fixed by extracting those attributes into their own tables (`products` and `customers`).',
      evaluationCriteria: [
        'Distinguishes partial key dependency (2NF) from transitive non-key dependency (3NF)',
        'Shows extracting into dedicated tables linked by keys',
      ],
      topicIds: ['4.4.4', '4.4.5', '4.4.6', '4.4.7'],
    },
    {
      id: '4.4-kc-3',
      focusArea: 'Denormalization & Trade-offs',
      prompt:
        'If 3NF avoids anomalies, why might a backend store `unit_price_cents` on `order_items` or cache `like_count` on `posts`—and what engineering trade-off does denormalizing `like_count` introduce?',
      hints: [
        'Consider two distinct reasons: freezing historical values vs speeding up expensive read queries.',
        'What happens on every `INSERT` or `DELETE` of a `like` if `posts.like_count` is stored as a cached column?',
        '`unit_price_cents` preserves historical pricing if product prices change later, and cached `like_count` speeds up reads—but cached denormalized counts require extra write logic/transactions on every change to avoid drifting out of sync.',
      ],
      explanation:
        'Storing `unit_price_cents` on `order_items` captures a **historical snapshot** so later product price edits don’t corrupt past receipts. Caching `like_count` on `posts` eliminates heavy `COUNT(*)` aggregations on read-heavy feeds. The **trade-off** is write complexity and sync risk: every insert/delete on `likes` must atomically update `posts.like_count` (or it will drift from reality).',
      evaluationCriteria: [
        'Identifies read optimization and/or historical snapshot preservation',
        'Explains extra write maintenance and synchronization/drift risk',
      ],
      topicIds: ['4.4.8'],
    },
  ],
};

export const LESSON_4_5: RecipeLessonContent = {
  purposeMarkdown:
    'In production, you cannot run `DROP TABLE` and start over whenever your schema changes—live customer data is already inside! **Database migrations** apply incremental, versioned, repeatable schema and data changes across development, staging, and production safely.',
  whenToUseMarkdown:
    'Use versioned migrations for every schema change (`CREATE TABLE`, `ALTER TABLE`, indexes, constraints) and structural data backfill once a database has shared environments or live data.',
  setupCommands: [
    {
      id: '4.5-cmd-1',
      label: 'Example migration status / apply commands (tool-agnostic pattern)',
      command: 'npx drizzle-kit migrate   # or prisma migrate deploy / node-pg-migrate up',
      notes: 'Every migration runner tracks applied migration filenames in a database metadata table so each migration runs exactly once.',
    },
  ],
  coreApisMarkdown: [
    '- **Schema Versioning Table (e.g., `_migrations`)**: Stores `(id, filename, applied_at)` inside the DB itself so the runner knows which migrations have already run.',
    '- **Ordered Migration Files (`0001_init.sql`, `0002_add_tier.sql`)**: Immutable SQL scripts applied in strict numeric/timestamp order.',
    '- **Expand-and-Contract Pattern**: Multi-step zero-downtime deployment sequence (add new nullable column → backfill → update app code → enforce `NOT NULL` / drop old column later) so old & new server processes run simultaneously without crashing.',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Create versioned, immutable migration files',
      detailMarkdown:
        'Never edit a migration file that has already run in staging or production—the runner skips files already recorded in its version table! Every new change gets a new numbered/timestamped file (`0002_...`).',
      code: {
        id: '4.5-step-1',
        title: 'Forward ("up") and rollback ("down") migration files',
        language: 'sql',
        code: `-- 0002_add_user_phone.up.sql
ALTER TABLE users ADD COLUMN phone TEXT;

-- 0002_add_user_phone.down.sql (reverts only if safe to drop)
ALTER TABLE users DROP COLUMN IF EXISTS phone;`,
      },
    },
    {
      stepNumber: 2,
      title: 'Apply migrations atomically on deploy (before new app traffic)',
      detailMarkdown:
        'Run forward migrations inside transactions (where supported by PostgreSQL DDL) before routing traffic to new application containers—and test reverting (`down`) locally before merging, knowing some drops (like `DROP COLUMN` with data) are destructive in production.',
    },
    {
      stepNumber: 3,
      title: 'Use safe non-breaking changes (Expand → Migrate → Contract)',
      detailMarkdown:
        'Think about rolling deployments: for 60 seconds, **Old App v1** and **New App v2** talk to the *same* database! If you rename `name` → `full_name` in one migration, v1 crashes immediately. Instead:\n1. **Expand**: Add `full_name` as nullable (`ADD COLUMN full_name TEXT`).\n2. **Data Migration**: Backfill `full_name` in small batches (avoiding long table locks!), while v2 writes both columns.\n3. **Contract**: Only *after* v1 is completely gone, add `NOT NULL` safely and drop old `name`.',
      code: {
        id: '4.5-step-3',
        title: 'Safe batched data migration (avoiding giant single-transaction lock)',
        language: 'sql',
        code: `-- Backfill in bounded batches so live queries aren't locked for minutes
UPDATE users
SET full_name = display_name
WHERE id IN (
  SELECT id FROM users
  WHERE full_name IS NULL
  LIMIT 1000
);`,
      },
    },
  ],
  workingExamples: [
    {
      id: '4.5-ex-1',
      title: 'Zero-downtime NOT NULL addition sequence on a large PostgreSQL table',
      language: 'sql',
      code: `-- Step 1 (Deploy A): Add nullable column cleanly (instant metadata-only in modern Postgres)
ALTER TABLE orders ADD COLUMN currency TEXT;

-- Step 2 (Backfill): Populate existing rows in small batches while app writes currency on new rows
UPDATE orders SET currency = 'USD' WHERE currency IS NULL AND id BETWEEN 1 AND 5000;

-- Step 3 (Deploy B): Add constraint safely without blocking writes long-term
ALTER TABLE orders ADD CONSTRAINT orders_currency_not_null CHECK (currency IS NOT NULL) NOT VALID;
ALTER TABLE orders VALIDATE CONSTRAINT orders_currency_not_null;`,
      explanation:
        'Separating nullable column creation, batched data migration, and NOT VALID constraint validation avoids locking out live customer checkouts during schema evolution.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Editing an already-applied `0001_init.sql` file instead of creating `0002_...sql`.',
      fix: 'Environments that already ran `0001` will ignore your edit—causing production schemas to drift from local dev! Always create a new migration file.',
    },
    {
      mistake: 'Running `ALTER TABLE orders RENAME COLUMN total TO amount_cents` in a single deploy.',
      fix: 'Old running app containers immediately fail queries for `total`! Use Expand-and-Contract across two deploys.',
    },
    {
      mistake: 'Updating 10 million rows in one massive `UPDATE` inside a schema migration.',
      fix: 'Backfill large tables in small batched chunks (data migrations) so locks and WAL spikes don’t stall production traffic.',
    },
  ],
  exercise: {
    id: '4.5-ex',
    title: 'Plan a Safe Column Split Migration',
    instructionsMarkdown:
      'Your live `users` table (2M rows) currently has `full_name TEXT NOT NULL`. You want to replace it with `first_name TEXT NOT NULL` without dropping requests during rolling deploys.\nWrite:\n1. The **Expand** SQL migration (`up` and `down`).\n2. A batched **Data Migration** SQL query populating `first_name` where `NULL` (batch of 1,000).\n3. A brief 3-step rollout plan explaining when old app code vs new app code deploys before the **Contract** step drops `full_name`.',
    acceptanceChecklist: [
      'Expand step adds first_name as nullable (not NOT NULL without default/safety)',
      'Down migration safely reverses the expand change',
      'Data migration limits batch size (e.g. LIMIT 1000) to avoid long locks',
      'Rollout plan ensures app reads/writes new column before dropping full_name',
    ],
  },
};
