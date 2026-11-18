import { FptLessonContent } from '../types';

export const LESSON_4_1: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'In Block 3, our Node.js HTTP servers accepted requests, validated inputs, and processed domain logic. Up to now, though, any `Map` or array holding orders inside Node.js vanishes the instant the server restarts!',
      'In this unit, we’ll ask a foundational question from first principles: **why isn’t in-memory state (or even a plain JSON file on disk) enough for real applications?** From there, we’ll derive **persistence**, **data consistency**, **data relationships**, **what a DBMS actually provides**, and **why relational databases became the backbone of backend engineering**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Choosing where and how your application stores truth decides whether your service loses customer orders on deploy, corrupts account balances when two requests overlap, or stays fast and trustworthy as relationships grow.',
    prerequisites: [
      {
        subBlockId: '1.1',
        label: 'Process memory isolation & termination (1.1.7, 1.1.8)',
        detail:
          'Knowing that a process’s heap memory is wiped when it exits or restarts.',
      },
      {
        subBlockId: '1.5',
        label: 'Multi-process Node.js deployments (1.5.3)',
        detail:
          'Knowing that multiple worker processes do not share in-memory JavaScript objects.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-4.1.1',
      topicId: '4.1.1',
      coveredTopicIds: ['4.1.2'],
      title: 'Why in-memory application state fails & what persistence solves',
      problemAndRequirementsMarkdown: [
        '### First principles: Why not keep users and orders in a JavaScript `Map`?',
        'Suppose you store your app’s users inside `const users = new Map()`. It works fast for 10 minutes on your laptop. Now deploy it to production:',
        '1. **Restarts wipe everything**: Every time you deploy new code or the server crashes (`1.1.8`), the OS reclaims the Node heap and your entire `users` table disappears.',
        '2. **Multiple servers can’t share RAM**: Remember Sub-block `1.5`? Once you run 4 Node.js workers across CPU cores, Worker 1’s `Map` is invisible to Worker 2.',
        '3. **RAM is finite and expensive**: Holding 50 million historical orders in Node’s heap doesn’t fit cleanly in memory.',
        '',
        '### Deriving the requirement',
        'We need **persistence**: durable storage outliving any individual server restart or process boundary, shared consistently across all running API workers.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Persistence outside the application process',
        '**Persistence** means writing state to durable non-volatile storage (SSDs/disks) managed independently from your stateless application servers (`2.3.7`).',
        '',
        'Your Node.js servers can restart, crash, scale from 2 workers up to 20 during a traffic spike, and back down to 2 at night—because the **truth lives persistently outside** in durable storage rather than inside transient server RAM.',
      ].join('\n\n'),
      centralIdeaSummary:
        'In-memory state vanishes on restarts and stays trapped inside one process; persistence stores durable shared truth on disk outside stateless application workers.',
      codeExamples: [],
    },
    {
      id: 'topic-4.1.3',
      topicId: '4.1.3',
      coveredTopicIds: ['4.1.4', '4.1.5'],
      title: 'Consistency, relationships, and why a raw file isn’t a DBMS',
      problemAndRequirementsMarkdown: [
        '### First principles: What happens if you just save a giant `data.json` file to disk?',
        'Okay, RAM isn’t persistent—so why not write a plain `orders.json` file on disk? Imagine running `fs.writeFile("orders.json", JSON.stringify(allOrders))` on a busy store:',
        '1. **Crash corruption & race conditions (Consistency)**: Two workers read `orders.json` at the same time, each adds one order, and the second overwrite wipes out the first! Worse, if power cuts halfway through writing `orders.json`, the file ends truncated and fails to parse completely.',
        '2. **Searching & updating gets painfully slow**: To find orders for user `#42`, you have to load and parse the whole `orders.json` file into memory.',
        '3. **Tangled relationships**: Users have Orders, Orders have OrderItems, OrderItems point to Products. If a product’s price changes or a user’s ID is referenced across 5 files, keeping links valid by hand turns brittle fast.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: What a Database Management System (DBMS) gives you',
        'A **Database Management System (DBMS)**—like PostgreSQL, MySQL, or SQLite—is specialized software built specifically to solve those exact failure modes:',
        '- **Data Consistency & Concurrency**: Coordinates concurrent reads and writes safely, enforces constraints (like unique emails or non-negative stock), and uses crash-safe logs so partial writes never corrupt stored data.',
        '- **Data Relationships**: Lets entities reference one another cleanly without copying user profiles into every single order.',
        '- **Indexed Querying**: Finds one user out of 10 million rows in milliseconds without scanning every byte from start to finish.',
      ].join('\n\n'),
      centralIdeaSummary:
        'A DBMS solves what flat files cannot: enforcing data consistency under concurrent writes, maintaining valid relationships across entities, and querying large datasets efficiently.',
      codeExamples: [],
    },
    {
      id: 'topic-4.1.6',
      topicId: '4.1.6',
      coveredTopicIds: ['4.1.7'],
      title: 'Relational vs non-relational databases (and why relational shines)',
      problemAndRequirementsMarkdown: [
        '### First principles: One shape of storage doesn’t fit every problem—so what separates Relational from Non-Relational?',
        'Once you decide to use a DBMS, you meet two major families:',
        '- **Relational databases (SQL)** like PostgreSQL and MySQL organize data into strict **tables** (rows & columns) linked by keys.',
        '- **Non-relational databases (NoSQL)** organize data as flexible JSON **documents** (MongoDB), **key-value** pairs (Redis), wide-columns, or graphs.',
        '',
        'Why have relational databases stayed the default starting point for backend engineering for decades?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Comparing Relational and Non-Relational models',
        'Look at how they trade flexibility vs structure:',
        '',
        '| Dimension | Relational (e.g., PostgreSQL) | Non-Relational (e.g., Document / Key-Value) |',
        '| --- | --- | --- |',
        '| Data shape | Structured tables with enforced schemas and types | Flexible/schemaless documents or fast key-value blobs |',
        '| Relationships | First-class joins & foreign keys across entities | Usually embedded inside one document or joined in app code |',
        '| Guarantees | Strong consistency, constraints, multi-record transactions | Often tuned for ultra-fast single-key lookups or horizontal sharding |',
        '',
        '**Why relational databases are so useful in backends**: Real business data is deeply interconnected—customers place orders containing products, payments settle invoices, teams own projects. Storing each entity *once* in clean tables, letting the database enforce rules (foreign keys, unique constraints, transactions), and querying across them cleanly with SQL prevents duplicated, out-of-sync data as your application grows.',
      ].join('\n\n'),
      edgeCasesAndTradeOffsMarkdown:
        'Non-relational stores shine for specific needs—like Redis for ephemeral caches and rate-limit counters, or document stores for truly unstructured varying payloads—but reaching for NoSQL first when your data actually has rich relationships pushes joins and consistency bugs into your own application code.',
      centralIdeaSummary:
        'Relational databases model interconnected business data in structured tables with strong schemas, relationships, and consistency guarantees—making them the strongest general foundation for backend truth.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'From transient Node RAM to durable relational truth',
    narrativeMarkdown: [
      'Notice the progression we just walked through:',
      '1. **Node.js Heap (`Map`)** → Fast, *but* vanishes on restart and stays isolated per worker process.',
      '2. **Flat JSON File** → Survives restarts, *but* breaks on concurrent writes, half-written crashes, and large searches.',
      '3. **DBMS (Relational Database)** → Gives durable **persistence**, safe concurrent **consistency**, explicit **relationships**, and expressive querying outside stateless API servers.',
    ].join('\n\n'),
    integratedExample: {
      id: '4.1-integrated-example',
      title: 'Architecture role: stateless API processes sharing one durable DBMS',
      language: 'text',
      code: `[Node Worker 1] ──┐
[Node Worker 2] ──┼──(SQL over TCP)──▶ [Relational DBMS (e.g. PostgreSQL)]
[Node Worker 3] ──┘                       ├── Enforces schemas & constraints (Consistency)
                                          ├── Links Users <-> Orders <-> Items (Relationships)
   (Workers can restart anytime!)         └── Writes safely to disk (Persistence)`,
    },
    walkthroughMarkdown:
      'Separating stateless Node.js workers from a shared relational DBMS gives you both clean horizontal scaling (`1.5`, `2.3`) and reliable, durable truth.',
  },
  questions: [
    {
      id: '4.1-kc-1',
      focusArea: 'In-Memory State Limits & Persistence',
      prompt:
        'Give **two** distinct reasons why keeping user accounts in an in-memory JavaScript `Map` inside your Node.js server fails in production, and explain what **persistence** provides.',
      hints: [
        'Think about deployments/crashes (`1.1`) AND multi-process workers (`1.5`).',
        'What survives when a Node process exits?',
        'In-memory state is wiped on every restart/crash and isn’t shared across multiple Node worker processes; persistence stores durable data on disk outside application process RAM.',
      ],
      explanation:
        '1. **Durability**: Process heap RAM disappears whenever the server deploys, restarts, or crashes.\n2. **Shared Truth**: Separate worker processes have isolated memory (`1.5`), so Worker 2 cannot read Worker 1’s `Map`.\n**Persistence** writes state durably to disk inside an external storage system so it survives restarts and stays shared across all API workers.',
      evaluationCriteria: [
        'Identifies data loss on restart/crash and isolation across worker processes',
        'Explains persistence as durable external storage',
      ],
      topicIds: ['4.1.1', '4.1.2'],
    },
    {
      id: '4.1-kc-2',
      focusArea: 'Why Flat Files Fall Short vs DBMS',
      prompt:
        'If disk storage solves restarts, why shouldn’t a multi-worker backend simply save all records in one `orders.json` file? Identify **three** problems a **DBMS** solves instead.',
      hints: [
        'Think about two workers updating the file at once, crashes mid-write, searching 5M records, and linked entities.',
        'Connect to consistency, relationships, and querying.',
        'A DBMS prevents concurrent-write overwrites/partial-write corruption (consistency), tracks links across entities cleanly (relationships), and enables fast indexed querying without loading/rewriting the whole file.',
      ],
      explanation:
        'A plain JSON file lacks safe concurrent access (two workers overwrite each other), can corrupt mid-write on crash, forces slow full-file reads/rewrites, and duplicates linked data. A **DBMS** guarantees crash-safe **consistency** under concurrent access, models **relationships** cleanly across entities, and supports fast indexed queries.',
      evaluationCriteria: [
        'Covers concurrent-write/crash consistency, relationships, and efficient querying',
      ],
      topicIds: ['4.1.3', '4.1.4', '4.1.5'],
    },
    {
      id: '4.1-kc-3',
      focusArea: 'Relational vs Non-Relational',
      prompt:
        'Compare **relational** vs **non-relational** databases, and explain why a relational database is usually a better default for an e-commerce backend (users, orders, order items, payments).',
      hints: [
        'Look at how data is shaped (structured tables with keys vs flexible documents/key-value) and whether e-commerce records depend heavily on each other.',
        'What happens in a document store if one product’s details were copied into 10,000 order documents?',
        'Relational DBs enforce schemas, keys, and relationships across linked tables without duplicating shared entities, whereas non-relational stores trade schema/join guarantees for flexible documents or fast key-value lookups.',
      ],
      explanation:
        '**Relational databases** organize data into schema-enforced tables linked by keys, with built-in joins and strong consistency; **non-relational databases** store flexible documents or key-value pairs suited to unstructured payloads or caches. E-commerce data has tightly linked entities (users, orders, line items, payments) where avoiding duplication and enforcing consistent balances/references makes relational databases ideal.',
      evaluationCriteria: [
        'Accurately contrasts schema/relational tables vs flexible document/key-value models',
        'Explains why interconnected transactional data favors relational DBs',
      ],
      topicIds: ['4.1.6', '4.1.7'],
    },
  ],
};

export const LESSON_4_2: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'In Sub-block 4.1, we saw why backends store truth in a relational DBMS. Now the natural next question is: **how do you translate messy real-world domain ideas—users, profiles, orders, tags, products—into clean tables without creating broken links or corrupted rows?**',
      'In this unit, we’ll build **Relational Data Modeling** piece by piece: **tables, rows, columns, and data types**, **primary keys and foreign keys**, **one-to-one, one-to-many, and many-to-many relationships**, and **referential integrity alongside unique and check constraints**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'A well-modeled database schema prevents entire classes of bugs permanently—guaranteeing at the storage level that no order points to a nonexistent user, no two accounts claim the same email, and no product sells for `-50` cents.',
    prerequisites: [
      {
        subBlockId: '4.1',
        label: 'Why relational databases exist (4.1.4, 4.1.7)',
        detail:
          'Understanding that relational databases store linked entities in structured tables.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-4.2.1',
      topicId: '4.2.1',
      coveredTopicIds: ['4.2.2'],
      title: 'Tables, rows, columns, and attribute data types',
      problemAndRequirementsMarkdown: [
        '### First principles: Giving every entity a predictable structure',
        'Suppose you want to track customers and their signup info. If one record stores `age: "twenty-five"`, another stores `age: 25`, and a third forgets `email` completely, calculating averages or sending receipts breaks.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Tables, Rows, Columns, and Types',
        'A relational database models each type of entity as a **Table**:',
        '- **Columns (Attributes)**: The fixed fields describing that entity (`id`, `email`, `created_at`, `balance_cents`), each locked to an explicit **data type** (`INTEGER`, `TEXT`, `BOOLEAN`, `TIMESTAMPTZ`, `UUID`). Storing money as an integer (`balance_cents = 1999`) instead of floating-point decimals avoids rounding bugs (`0.1 + 0.2 !== 0.3`)!',
        '- **Rows (Records / Tuples)**: Each individual instance—one specific user—is one horizontal row with one value per column (or explicit `NULL` if nullable).',
        '',
        '```text',
        'Table: users',
        '┌──────────┬──────────────────────┬───────────────┬──────────────────────┐',
        '│ id (INT) │ email (TEXT)         │ is_active     │ created_at           │',
        '├──────────┼──────────────────────┼───────────────┼──────────────────────┤',
        '│ 1        │ ada@example.com      │ true          │ 2026-01-10T09:00:00Z │',
        '│ 2        │ grace@example.com    │ true          │ 2026-01-11T14:22:00Z │',
        '└──────────┴──────────────────────┴───────────────┴──────────────────────┘',
        '```',
      ].join('\n\n'),
      centralIdeaSummary:
        'Tables organize entities into typed columns (attributes) and individual rows (records), enforcing consistent types across every stored item.',
      codeExamples: [],
    },
    {
      id: 'topic-4.2.3',
      topicId: '4.2.3',
      coveredTopicIds: ['4.2.4'],
      title: 'Primary keys and foreign keys',
      problemAndRequirementsMarkdown: [
        '### First principles: How do you point unambiguously to *one* specific row—and link another table to it?',
        'Suppose two customers are both named `"Alex Chen"`. Worse, what if we used `email` to link every order to a user, and then the user changes their email address?! Suddenly 40 old orders would either break or need updating everywhere.',
        '',
        '### Deriving the requirement',
        '1. Every row needs a **stable, guaranteed-unique identifier** that never collides and ideally never changes.',
        '2. Other tables need a column specifically meant to store a **pointer to that identifier**.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Primary Keys & Foreign Keys',
        '- **Primary Key (`PRIMARY KEY`)**: A column (or combination of columns) that uniquely identifies every row in a table. It can **never be duplicated** and **never be `NULL`**. Common choices are an auto-incrementing integer (`BIGINT`) or a random `UUID`.',
        '- **Foreign Key (`FOREIGN KEY`)**: A column in one table whose value references the **Primary Key** of a row in another table. For example, `orders.user_id` is a foreign key pointing to `users.id`—forming the clean link between an order and its owner without copying the user’s name or email onto every order row!',
      ].join('\n\n'),
      centralIdeaSummary:
        'A Primary Key uniquely identifies each row in its own table, while a Foreign Key stores a reference to another table’s Primary Key to link records safely.',
      codeExamples: [],
    },
    {
      id: 'topic-4.2.5',
      topicId: '4.2.5',
      coveredTopicIds: ['4.2.6', '4.2.7'],
      title: 'Modeling 1-to-1, 1-to-Many, and Many-to-Many relationships',
      problemAndRequirementsMarkdown: [
        '### First principles: How do different real-world relationships fit into flat tables?',
        'Not all relationships work the same way:',
        '- One user has **one** billing profile (or settings record).',
        '- One user places **many** orders, while each order belongs to **one** user.',
        '- One order contains **many** products—*and* one product appears inside **many** different orders!',
        '',
        'Think carefully about that third case! If `orders` tried adding a `product_ids` column holding `"p1, p5, p9"`, searching “which orders bought product `p5`?” or storing `quantity: 2` *per product in that order* would become a mess.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: How keys model all three relationships',
        '1. **One-to-One (`1:1`)**: Table B holds a Foreign Key pointing to Table A’s Primary Key **plus a `UNIQUE` constraint** on that Foreign Key (e.g., `user_profiles.user_id` references `users.id` and is `UNIQUE`, so no user can ever get two profiles).',
        '2. **One-to-Many (`1:N`)**: Put the Foreign Key on the **“many” side** pointing to the **“one” side**! For example, `orders.user_id` points to `users.id` (no `UNIQUE` on `user_id`), so one user can own 100 orders while each order points to 1 user.',
        '3. **Many-to-Many (`M:N`)**: Neither table can cleanly hold a single pointer to the other! So we introduce a **join (junction) table** sitting in the middle with **two Foreign Keys**—one to each side! For Orders and Products, that’s `order_items(order_id, product_id, quantity, unit_price_cents)`—which turns an `M:N` link into two clean `1:N` links and even gives us a natural place to store per-link attributes like `quantity`!',
        '',
        '```text',
        '1:N    users (1) ◀──────── orders (N)         [orders.user_id -> users.id]',
        'M:N    orders (1) ◀── order_items ──▶ products (1)  [join table holds both FKs + quantity]',
        '```',
      ].join('\n\n'),
      centralIdeaSummary:
        'Use a UNIQUE foreign key for 1:1, a regular foreign key on the “many” side for 1:N, and a dedicated join table with two foreign keys for M:N relationships.',
      codeExamples: [],
    },
    {
      id: 'topic-4.2.8',
      topicId: '4.2.8',
      coveredTopicIds: ['4.2.9', '4.2.10'],
      title: 'Referential integrity and constraints (Unique & Check)',
      problemAndRequirementsMarkdown: [
        '### First principles: What if application code has a bug and tries inserting invalid data?',
        'Suppose a bug in your Node.js service tries to:',
        '- Create an order for `user_id = 99999` (a user who doesn’t exist!),',
        '- Delete user `1` while leaving 14 orphaned orders pointing to `user_id = 1`,',
        '- Insert a second user with the exact same email as an existing account (e.g., two concurrent signup requests racing!), or',
        '- Save an order item with `quantity = -3`.',
        '',
        'Remember: checking `if (qty > 0)` in Node.js helps, *but* multiple servers or concurrent requests (`4.1`) can race! Why not let the database guard its own invariants permanently?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Referential Integrity & Table Constraints',
        'Relational databases let you attach **constraints** directly to tables so invalid data is **impossible to commit**, no matter which client or script writes to the DB:',
        '- **Referential Integrity (Foreign Key enforcement)**: The database rejects any `INSERT` or `UPDATE` whose foreign key points to a nonexistent parent row—and on parent deletion, forces an explicit rule (`RESTRICT` / error if children exist, `CASCADE` to delete children too, or `SET NULL`). No dangling orphan pointers can ever exist!',
        '- **`NOT NULL` Constraint**: Guarantees required columns (like `email` or `status`) can never be left blank (`NULL`).',
        '- **`UNIQUE` Constraint**: Guarantees no two rows share the same value in a column or column pair (e.g., `UNIQUE (email)` stops duplicate signups even under two concurrent requests!).',
        '- **`CHECK` Constraint**: Enforces arbitrary row-level business rules right at the database layer—like `CHECK (quantity > 0)` or `CHECK (price_cents >= 0)`.',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '4.2.8-ex-1',
            title: 'Enforcing keys, relationships, and constraints in SQL',
            language: 'sql',
            code: `CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE orders (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0)
);`,
          },
          lineByLineMarkdown: [
            '- **`PRIMARY KEY` & `UNIQUE`**: Guarantees every `users.id` and `users.email` is distinct even under concurrent writes.',
            '- **`REFERENCES users(id) ON DELETE RESTRICT`**: Enforces **referential integrity**—you cannot create an order for a missing `user_id`, nor delete a user who still has orders.',
            '- **`CHECK (total_cents >= 0)`**: Blocks negative order totals regardless of which API service writes to the table.',
          ].join('\n'),
        },
      ],
      centralIdeaSummary:
        'Referential integrity keeps foreign keys valid (never pointing to missing rows), while NOT NULL, UNIQUE, and CHECK constraints enforce domain invariants right inside the database.',
    },
  ],
  conceptConnection: {
    title: 'Modeling a complete e-commerce schema',
    narrativeMarkdown: [
      'Watch every modeling tool from `4.2` come together for **Users → Orders → Order Items ← Products**:',
      '1. Each entity becomes a **table** with typed **columns** (`BIGINT`, `TEXT`, `INTEGER`).',
      '2. Every table gets a stable **Primary Key** (`id`).',
      '3. `users` → `orders` is **1:N** (`orders.user_id` FK); `orders` ↔ `products` is **M:N** modeled via join table `order_items(order_id, product_id, quantity)`.',
      '4. **`UNIQUE`**, **`NOT NULL`**, **`CHECK`**, and **referential integrity** prevent duplicate emails, orphan orders, and negative quantities at the storage boundary.',
    ].join('\n\n'),
    integratedExample: {
      id: '4.2-integrated-example',
      title: 'Relational schema showing PKs, FKs, 1:N, M:N join table, and constraints',
      language: 'text',
      code: `users (PK: id, UNIQUE: email)
   ▲
   │ 1:N (FK: orders.user_id -> users.id)
orders (PK: id, user_id NOT NULL, status NOT NULL)
   ▲
   │ 1:N (FK: order_items.order_id -> orders.id)
order_items (Join Table for M:N!)
   ├── PK: (order_id, product_id)
   ├── quantity INTEGER CHECK (quantity > 0)
   └── FK: order_items.product_id -> products.id
         │
         ▼
products (PK: id, price_cents CHECK (price_cents >= 0))`,
    },
    walkthroughMarkdown:
      'Because `order_items` splits the M:N relationship cleanly and stores `quantity` with a `CHECK (quantity > 0)` constraint, every relationship stays normalized, queryable, and protected by database-level invariants.',
  },
  questions: [
    {
      id: '4.2-kc-1',
      focusArea: 'Primary & Foreign Keys',
      prompt:
        'Why is referencing `users.id` (a stable Primary Key) from `orders.user_id` (a Foreign Key) far better than storing `users.email` or `users.name` as the link inside every order row?',
      hints: [
        'Think about uniqueness (two users named "Alex") and what happens if a user later changes their email or name.',
        'How many rows would need editing if `email` changed?',
        'A Primary Key is guaranteed unique and immutable; linking via `user_id` means changing a user’s email updates one row in `users` without breaking or rewriting thousands of `orders` rows.',
      ],
      explanation:
        'Names aren’t unique and emails change over time. A **Primary Key** (`users.id`) is guaranteed unique, non-null, and stable. Storing it as a **Foreign Key** (`orders.user_id`) ensures that updating a user’s email or name edits only one row in `users` while all linked orders continue pointing cleanly to the same user.',
      evaluationCriteria: [
        'Identifies PK uniqueness/stability vs mutable names/emails',
        'Explains FK avoiding cascading edits or mismatched copies',
      ],
      topicIds: ['4.2.1', '4.2.3', '4.2.4'],
    },
    {
      id: '4.2-kc-2',
      focusArea: 'Relationship Modeling (1:1, 1:N, M:N)',
      prompt:
        'How should you model each of these in relational tables? **(a)** Each user has at most one `user_profile`; **(b)** a user has many `orders`; **(c)** an `order` contains many `products` (with quantities) and each `product` appears in many `orders`.',
      hints: [
        'Check where the Foreign Key goes for 1:1 vs 1:N, and what happens when both sides have "many".',
        'Where do you store `quantity` for a product inside a specific order?',
        '(a) 1:1: `user_profiles.user_id` FK with a `UNIQUE` constraint; (b) 1:N: `orders.user_id` FK on the "many" side; (c) M:N: a join table `order_items` holding `order_id` FK, `product_id` FK, and `quantity`.',
      ],
      explanation:
        '- **(a) 1:1**: Put `user_id` Foreign Key on `user_profiles` and mark it **`UNIQUE`** so each user can have at most one profile.\n- **(b) 1:N**: Put `user_id` Foreign Key on the “many” table (`orders`).\n- **(c) M:N**: Create a **join table** (`order_items`) with Foreign Keys to both `orders(id)` and `products(id)`, plus per-link columns like `quantity`.',
      evaluationCriteria: [
        'Uses UNIQUE FK for 1:1',
        'Places FK on many side for 1:N',
        'Introduces join table with both FKs (+ quantity) for M:N',
      ],
      topicIds: ['4.2.5', '4.2.6', '4.2.7'],
    },
    {
      id: '4.2-kc-3',
      focusArea: 'Referential Integrity & Constraints',
      prompt:
        'If your Node.js validation already checks `if (quantity > 0)` and `findUserByEmail(email)`, why are database-level **Foreign Key**, **`UNIQUE`**, and **`CHECK`** constraints still indispensable?',
      hints: [
        'Think about multiple Node workers racing on two simultaneous signups with the same email, or future scripts/migrations touching the database.',
        'What does referential integrity prevent if someone deletes a parent user?',
        'App checks can race under concurrent requests or be bypassed by another script; DB `UNIQUE`, `CHECK`, and FK referential integrity enforce invariants atomically at storage time and forbid orphan references.',
      ],
      explanation:
        'Application checks can fail under concurrency (two simultaneous signups both see “email not taken” before inserting) or be bypassed by other services or admin scripts. Database **`UNIQUE`** constraints prevent duplicates atomically, **`CHECK`** constraints enforce row rules (`quantity > 0`) unconditionally, and **referential integrity** stops orphan orders pointing to deleted or nonexistent users.',
      evaluationCriteria: [
        'Explains race conditions/other writers bypassing app-only checks',
        'Covers referential integrity, UNIQUE, and CHECK enforcement inside the DB',
      ],
      topicIds: ['4.2.8', '4.2.9', '4.2.10'],
    },
  ],
};
