import { FptLessonContent } from '../types';

export const LESSON_7_3: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Layered architecture (`7.2`) works great at 10,000 lines—you put files into `controllers/`, `services/`, and `repositories/`. At 100,000 lines, something breaks: you have 85 controllers in one folder and 85 services in another, and worse, `BillingService` casually imports `InventoryRepository`, `UsersService`, and `ShippingHelper` until everything imports everything else in a giant tangled web.',
      'Many teams panic and split into 15 network microservices overnight—trading tangled imports for distributed network latency, partial failures, and deployment chaos. Before jumping to microservices, there is a far cleaner middle ground: the **Modular Monolith**. Let’s explore **monoliths**, **module & dependency boundaries**, **feature-based organization**, **internal communication**, **shared infrastructure**, **preventing circular dependencies**, and **modular monolith vs. microservices**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Most growing companies don’t have a “monolith problem”—they have a *lack-of-boundaries* problem. Mastering the modular monolith gives you microservice-level clarity and team autonomy with zero distributed network overhead.',
    prerequisites: [
      {
        subBlockId: '7.1',
        label: 'Coupling, cohesion & dependency management (7.1)',
        detail: 'Understanding why unguarded cross-module imports destroy maintainability.',
      },
      {
        subBlockId: '7.2',
        label: 'Layered Backend Architecture (7.2)',
        detail: 'Seeing how single-feature layers scale up into multi-domain applications.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-7.3.1',
      topicId: '7.3.1',
      coveredTopicIds: ['7.3.2', '7.3.3', '7.3.4'],
      title: 'What a monolith is, why it rots, feature-based organization, and module boundaries',
      problemAndRequirementsMarkdown: [
        '### First principles: A deployment unit is NOT an architecture style',
        'A **monolith** simply means an application packaged and deployed as **one single runtime unit** (one Node.js process/container talking to one database). Wait—why do people treat "monolith" like a swear word? Because without discipline, monoliths rot into a **Big Ball of Mud**:',
        '- **Cross-domain table joins**: The `analytics` code writes `JOIN billing_invoices JOIN users` directly—so the `billing` team can’t even rename an internal column without breaking `analytics`!',
        '- **Technical-layer folders at scale**: When folders are organized purely by technical role (`controllers/`, `services/`, `repositories/`), adding one feature requires touching files scattered across six top-level directories.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Fixing the monolith from the inside: Feature slices & hard boundaries',
        '1. **Feature-Based (Vertical) Organization**: Instead of grouping by technical layer at the root (`controllers/orders.ts`, `controllers/billing.ts`), group top-level folders by **business capability / module**:',
        '   - `src/modules/orders/` *(contains its own routes, service, domain, and repo)*',
        '   - `src/modules/billing/`',
        '   - `src/modules/inventory/`',
        '   Now 95% of edits for an Ordering feature live inside `src/modules/orders/`.',
        '2. **Module Boundaries (Public API vs. Private Internals)**: Treat each module like an independent npm package inside your repo! Every module exposes **one narrow `index.ts` (public facade)**—e.g. `billing/index.ts` exports `chargeCustomer()`. Everything inside `billing/internal/` (its DB tables, repositories, helper types) is **strictly off-limits** to other modules.',
      ].join('\n\n'),
      centralIdeaSummary:
        'A monolith is simply a single deployable unit; organizing vertically by business feature and hiding module internals behind an explicit public API stops it from rotting into a Big Ball of Mud.',
      codeExamples: [],
    },
    {
      id: 'topic-7.3.5',
      topicId: '7.3.5',
      coveredTopicIds: ['7.3.6', '7.3.7', '7.3.8'],
      title: 'Internal module communication, dependency boundaries, shared infrastructure, and preventing circular dependencies',
      problemAndRequirementsMarkdown: [
        '### First principles: When `Orders` needs `Billing`, and `Billing` imports `Orders`',
        'Suppose `Orders` calls `Billing` to charge a card, and later `Billing` wants to look up order metadata—so `billing.ts` imports `orders.ts` while `orders.ts` already imports `billing.ts`. Welcome to a **circular dependency**! Modules crash with cryptic `undefined` imports at startup, can’t be tested independently, and are permanently glued together.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Keeping modules independent inside one process',
        '1. **Internal Module Communication**: Modules inside one process have two clean ways to interact without bypassing encapsulation:',
        '   - **Synchronous Public Facade Calls**: `Orders` calls `billingPublicApi.charge(...)` (an in-process async function call—fast and transactional, zero HTTP overhead!).',
        '   - **In-Process Domain Events**: When an order is paid, `Orders` emits `OrderPaidEvent` on an internal event bus (or transactional outbox), and `Analytics` or `Notifications` subscribes—so `Orders` doesn’t even know `Analytics` exists!',
        '2. **Dependency Boundaries & Preventing Circular Dependencies**: Enforce import rules automatically in ESLint / `dependency-cruiser` (e.g., *“No module may import from `anotherModule/internal/*`”* and *“Cycles are build errors”*). When Module A needs data from Module B AND B reacts to A, break the cycle either with **events** (B subscribes to A) or by extracting a shared interface/type.',
        '3. **Shared Infrastructure**: Keep a small `src/shared/` (or `src/platform/`) folder strictly for **generic technical utilities** (Postgres pool, logger, clock, `HttpError`, auth middleware)—NEVER business logic! Business concepts sneaking into `shared/` quietly turn `shared/` into a hidden global coupler.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Communicate across modules only via public facades or internal events, keep shared infrastructure purely technical, and enforce acyclic dependency rules with automated lint/architecture checks.',
      codeExamples: [
        {
          snippet: {
            id: '7.3-module-boundary-example',
            title: 'Modular Monolith directory & import boundary rules',
            language: 'text',
            code: `src/
  shared/                  # Generic technical infra ONLY (db pool, logger, errors)
  modules/
    orders/
      index.ts             # ONLY public entry point allowed for other modules!
      internal/
        orderRoutes.ts     # Private
        orderService.ts    # Private
        orderRepo.ts       # Private (owns \`orders\` table exclusively!)
    billing/
      index.ts             # Exports createInvoice(), etc.
      internal/
        billingService.ts  # Can import \`orders/index.ts\` OR listen to OrderPlacedEvent
                           # FORBIDDEN: import ".../orders/internal/orderRepo"`,
          },
          lineByLineMarkdown:
            '- Only `modules/*/index.ts` is importable by sibling modules.\n- If `orders` imports `billing/index.ts`, `billing` must NOT import `orders/index.ts` synchronously (use an event or invert via interface to stay acyclic).',
        },
      ],
    },
    {
      id: 'topic-7.3.9',
      topicId: '7.3.9',
      coveredTopicIds: [],
      title: 'Modular monolith vs. microservices',
      problemAndRequirementsMarkdown: [
        '### First principles: What actually changes when you split modules across a network?',
        'Before deciding to split a codebase into separate microservices, compare **in-process function calls** against **network RPC/HTTP calls**:',
        '- Function call: **0.001 ms**, compiler-checked types, **never drops packets**, and shares **ACID Postgres transactions**.',
        '- Network call between microservices: **2–50 ms**, serialization overhead, retries/timeouts/circuit-breakers required, **distributed transactions don’t easily work**, and debugging spans multiple deployments and log streams.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Choosing deliberately based on organizational & scaling reality',
        '- **Start with a Modular Monolith** when one team or a handful of squads builds a cohesive product. You get **1 deployment**, local debugging, ACID transactions, and crisp domain boundaries.',
        '- **Extract a Microservice ONLY when a concrete force demands independent deployment or scaling**—for example: video transcoding needs GPU nodes scaling separately from your API, a compliance boundary requires strict physical DB isolation, or 50+ engineers hit genuine release/ownership contention on one deploy pipeline.',
        '- **The Superpower**: Because your modular monolith *already* respects strict module facades, owns its own tables, and communicates via narrow contracts, extracting `modules/billing/` into its own service later takes days instead of a multi-year rewrite!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Prefer a Modular Monolith until independent scaling, hardware isolation, or large-org release autonomy justifies the heavy tax of distributed microservices.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Modular Monolith as the bridge between simple apps and distributed systems',
    narrativeMarkdown: [
      'Put all nine ideas of `7.3` on one mental shelf:',
      '- **Structure**: Group by feature (`modules/orders`, `modules/billing`), not giant horizontal folders.',
      '- **Encapsulation**: Hide internals behind a public `index.ts` facade and enforce DB table ownership per module.',
      '- **Wiring**: Use lightweight `shared/` infrastructure only for technical plumbing, communicate via public facades or events, block circular dependencies in CI, and hold off on microservices until a real operational or org bottleneck earns that complexity.',
    ].join('\n\n'),
    integratedExample: {
      id: '7.3-integrated-example',
      title: 'Modular Monolith vs. Microservices Trade-Off Summary',
      language: 'text',
      code: `                    Unstructured Monolith    Modular Monolith         Microservices
──────────────────────────────────────────────────────────────────────────────────────────
Module Boundaries   None (tangled imports)   Strict (public facades)  Physical (network API)
Cross-Module Call   Any internal file        Public API / Event bus   HTTP / gRPC / Broker
Database Integrity  Any SQL joins anything   Module owns its tables   Separate DB per svc
Operational Cost    Low                      Low (1 deploy/process)   High (distributed ops)`,
    },
    walkthroughMarkdown:
      'A modular monolith captures almost all of the clean code boundaries of microservices while paying only the operational cost of a single deployable app.',
  },
  questions: [
    {
      id: '7.3-kc-1',
      focusArea: 'Module Boundaries & Feature Organization',
      prompt:
        'Why does a **modular monolith** organize folders by **feature/module** (`modules/orders`, `modules/billing`) with strict **module boundaries**—and what goes wrong if `Orders` directly runs SQL `JOIN`s against `Billing`’s tables?',
      hints: [
        'Think about what happens when the Billing module needs to change its database schema or split out later.',
        'Also think about where developers look when modifying a single feature.',
        'Feature organization keeps related code together; bypassing module boundaries with direct table joins couples Billing’s internal schema to Orders so Billing can never refactor safely.',
      ],
      explanation:
        '**Feature-based organization** keeps everything for one capability localized. Strict **module boundaries** (calling only `billing/index.ts` rather than importing internals or querying `billing_*` tables directly) ensure each module owns its own schema and invariants—allowing safe refactoring inside a module or future extraction into a separate service.',
      evaluationCriteria: [
        'Explains co-locating feature code vs global technical folders',
        'Explains how direct cross-module table joins or internal imports break encapsulation and schema evolution',
      ],
      topicIds: ['7.3.1', '7.3.2', '7.3.3', '7.3.4', '7.3.6'],
    },
    {
      id: '7.3-kc-2',
      focusArea: 'Internal Communication, Shared Infra & Circular Deps',
      prompt:
        'Suppose `Orders` calls `Billing` synchronously, and now `Billing` needs to update an order status when a dispute arrives—creating a **circular dependency**. How do you fix this cleanly, and why must `shared/` contain only **shared infrastructure** rather than business logic?',
      hints: [
        'How can `Billing` notify `Orders` without importing `Orders` directly?',
        'What happens to module independence if business rules start accumulating in `shared/`?',
        'Break the cycle using internal domain events (or Dependency Inversion interfaces); keep `shared/` strictly technical (DB pool, logger, HTTP errors) so it never becomes a hidden global business coupler.',
      ],
      explanation:
        'You break circular dependencies by switching the back-edge to **in-process domain events** (`Billing` emits `DisputeOpenedEvent`, `Orders` subscribes) or defining an **inverted interface**. Meanwhile, `shared/` must hold only generic **shared infrastructure** (database client, logger, error primitives)—putting domain logic there recreates tangled coupling across every module.',
      evaluationCriteria: [
        'Uses domain events or inverted interfaces to break circular imports',
        'Restricts `shared/` to technical plumbing rather than cross-cutting business logic',
      ],
      topicIds: ['7.3.5', '7.3.7', '7.3.8'],
    },
    {
      id: '7.3-kc-3',
      focusArea: 'Modular Monolith vs Microservices',
      prompt:
        'A 5-person startup plans to split their brand-new app into 8 **microservices** so the codebase stays clean. Using first principles, why is a **modular monolith** usually the superior choice here—and when *do* microservices earn their complexity?',
      hints: [
        'Do you need separate network deployments just to enforce clean code boundaries?',
        'Compare in-process calls + single ACID DB vs. distributed latency, retries, eventual consistency, and CI/CD pipelines.',
        'Clean boundaries come from disciplined modular design, not network hops; microservices earn their complexity only for independent scaling/hardware profiles, strict isolation, or large multi-team release autonomy.',
      ],
      explanation:
        'Code cleanliness is an architectural property, not a deployment property. Splitting into 8 microservices for a small team adds massive distributed-systems overhead (network failures, latency, partial failure, distributed tracing, no shared ACID transactions) without helping code quality. A **modular monolith** gives clean boundaries with zero network tax; **microservices** make sense when independent scaling, hardware profiles, isolation, or 50+ engineers demand separate deployables.',
      evaluationCriteria: [
        'Distinguishes code modularity from physical network distribution',
        'Names concrete distributed costs and valid triggers for extracting microservices',
      ],
      topicIds: ['7.3.9'],
    },
  ],
};

export const LESSON_7_4: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'When two engineers talk to a warehouse manager or finance lead about an “Order,” they often accidentally build completely mismatched code—because to Sales, an “Order” is a cart with promo codes; to Finance, it’s an immutable invoice; and to Shipping, it’s boxes and tracking numbers. Meanwhile, core business rules like *“Never ship an order whose line-item total mismatches payment”* get bypassed because any random service can mutate `order_items` directly in SQL.',
      'In this unit, we’ll demystify **Domain-Driven Design (DDD)** from first principles—not as academic buzzwords, but as practical modeling tools: **domain & ubiquitous language**, **Entities vs. Value Objects**, **Aggregates & Aggregate Roots**, **Domain Services & Repositories**, and **Bounded Contexts**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'DDD helps your database schema and TypeScript classes reflect *real business truth and invariants* rather than generic CRUD bags of getters and setters.',
    prerequisites: [
      {
        subBlockId: '4.2',
        label: 'Data modeling & invariants (4.2)',
        detail: 'Understanding schemas, foreign keys, and why invalid states should be unrepresentable.',
      },
      {
        subBlockId: '7.3',
        label: 'Module boundaries (7.3)',
        detail: 'Seeing why large systems break along business capability seams.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-7.4.1',
      topicId: '7.4.1',
      coveredTopicIds: ['7.4.2', '7.4.9'],
      title: 'Domain, Ubiquitous Language, and Bounded Contexts',
      problemAndRequirementsMarkdown: [
        '### First principles: Why translation errors between business experts and code cause subtle bugs',
        'Suppose finance staff call something a **“Settlement”** when money clears from Stripe, while developers name the table `order_transfers` and a variable `isPaid`. Every time someone updates rules, developers have to mentally translate—and worse, different teams overload the single word **`Account`** to mean a login credential, a billing subscription, AND a bank ledger!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Aligning words, models, and boundaries',
        '1. **What is a Domain?**: Simply the real-world problem space your software solves (e.g., e-commerce fulfillment, healthcare scheduling, or freight logistics).',
        '2. **Ubiquitous Language**: Developers and domain experts agree on **one shared vocabulary** used identically in conversations, tickets, function names, and database tables (`settlements`, `issueCreditNote()`, `VoidedInvoice`). Zero mental translation.',
        '3. **Bounded Context**: A clear **semantic boundary** inside which a term has one exact meaning. Inside the **Identity Context**, a `User` has `email` and `passwordHash`. Inside the **Shipping Context**, the *same* person is a `Recipient` with `deliveryAddress` and `gateCode`! Instead of building one 90-column mega-`User` table shared by everyone, each **Bounded Context** models only what matters inside its boundary (which maps cleanly to Modular Monolith modules in `7.3`!).',
      ].join('\n\n'),
      centralIdeaSummary:
        'A Domain is your problem space, Ubiquitous Language aligns code names directly with business terminology, and Bounded Contexts give every model one crisp meaning within its boundary.',
      codeExamples: [],
    },
    {
      id: 'topic-7.4.3',
      topicId: '7.4.3',
      coveredTopicIds: ['7.4.4'],
      title: 'Entities vs. Value Objects',
      problemAndRequirementsMarkdown: [
        '### First principles: When does ID matter, and when do only attributes matter?',
        'Compare two real-world objects:',
        '- **A `$20` bill (Money)**: If I swap your `$20` USD bill for another `$20` USD bill, do you care which serial number you hold? No—any two `Money(2000, "USD")` instances are identical and immutable! Furthermore, representing money as a bare `number` invites bugs like adding USD to EUR (`10 + 20`) or sending negative `-500` cents.',
        '- **A Customer or Order**: If Customer `#42` changes their email from `alice@old.com` to `alice@new.com`, are they still the *same* customer? **Yes!** Even though every field changed, identity (`id = 42`) stayed continuous over time.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### How Entities and Value Objects model those two realities',
        '1. **Entity**: Defined by **continuous identity (`id`)** across time and state transitions (`Order`, `User`, `BankAccount`). Two customers both named `"Alice"` with different IDs are *not* the same entity.',
        '2. **Value Object**: Defined purely by its **attributes**, **has no identity**, and is **immutable** (`Money`, `EmailAddress`, `DateRange`, `ShippingAddress`). Whenever you construct `Money.usd(2000)`, it validates itself at creation (no negative currency or invalid `"XYZ"` code!) and operations like `price.add(tax)` return a **new** `Money` instance—making invalid values structurally impossible to pass around.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Use Entities for things tracked by persistent identity across changes, and immutable self-validating Value Objects for descriptive concepts defined solely by their values.',
      codeExamples: [
        {
          snippet: {
            id: '7.4-vo-entity',
            title: 'Immutable self-validating Value Object (`Money`) vs. stateful Entity (`Order`)',
            language: 'typescript',
            code: `// Value Object: No ID, immutable, self-validating!
export class Money {
  private constructor(
    public readonly cents: number,
    public readonly currency: "USD" | "EUR"
  ) {}

  static of(cents: number, currency: "USD" | "EUR"): Money {
    if (!Number.isInteger(cents) || cents < 0) throw new Error("Invalid money amount");
    return new Money(cents, currency);
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) throw new Error("Currency mismatch");
    return new Money(this.cents + other.cents, this.currency);
  }
}

// Entity: Tracked by continuous \`id\`, mutates via guarded methods
export class Order {
  constructor(
    public readonly id: string,
    private status: "draft" | "submitted",
    private total: Money
  ) {}
  // State changes happen through behavior, not arbitrary public \`order.status = ...\`
}`,
          },
          lineByLineMarkdown:
            '- `Money` guarantees you can never accidentally add `"USD"` to `"EUR"` or hold negative cents.\n- `Order` carries a permanent `id` and guards its `status` internally.',
        },
      ],
    },
    {
      id: 'topic-7.4.5',
      topicId: '7.4.5',
      coveredTopicIds: ['7.4.6', '7.4.7', '7.4.8'],
      title: 'Aggregates, Aggregate Roots, Domain Services, and Repositories',
      problemAndRequirementsMarkdown: [
        '### First principles: Protecting business invariants across related objects',
        'Suppose an `Order` has a rule: *“An order’s `totalCents` must always equal the sum of its `OrderLineItem`s, and a `submitted` order cannot have new line items added!”*',
        'What happens if any controller can fetch `order_line_items` directly and `INSERT` a new row into SQL behind `Order`’s back? That invariant silently breaks! You end up with a `submitted` order whose line items sum to $500 while `order.total` still says $100.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Enforcing consistency boundaries cleanly',
        '1. **Aggregate**: A cluster of tightly linked Entities and Value Objects treated as **one unit for data changes and transactional consistency** (e.g., `Order` + its `OrderLineItem`s + `ShippingAddress`).',
        '2. **Aggregate Root**: The single **gatekeeper Entity** (`Order`) at the top of the Aggregate. External code may **ONLY** reference and mutate the cluster through the Aggregate Root (`order.addItem(item)`, `order.submit()`)—never grabbing an `OrderLineItem` directly to mutate it out of band! This also defines your **transaction boundary**: load/save one Aggregate per DB transaction (`5.1`).',
        '3. **Domain Service**: What if a pure business rule naturally spans **two distinct Aggregates** and doesn’t belong inside either one—like `transferFunds(fromAccount, toAccount, money)` or `calculateDynamicShippingRate(order, carrierRates)`? Put that stateless pure business operation into a **Domain Service** (separate from Application Services that orchestrate DB transactions and emails!).',
        '4. **Repositories**: In DDD, you create Repositories **only for Aggregate Roots** (`OrderRepository`, NOT `OrderLineItemRepository`!), enforcing that the entire `Order` aggregate loads and saves atomically as one consistent unit.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Group tightly coupled entities into an Aggregate protected by a single Aggregate Root gatekeeper, fetch/save only Aggregate Roots via Repositories, and use Domain Services for cross-aggregate pure business rules.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Putting DDD building blocks together in one order flow',
    narrativeMarkdown: [
      'Watch every building block of `7.4` collaborate when adding an item to an order inside the **Orders Bounded Context**:',
      '- **Repository** loads the **`Order` Aggregate Root** (along with its child `OrderLineItem`s and `Money` **Value Objects**).',
      '- Caller invokes `order.addItem(sku, Money.of(1500, "USD"))` on the **Aggregate Root**, which enforces the **Domain invariant** (*“Cannot modify after submission!”*) and updates `total` atomically.',
      '- If calculating tax requires cross-aggregate rules, a pure **Domain Service** computes it.',
      '- **Repository** persists the whole updated **`Order` Aggregate** in one ACID transaction.',
    ].join('\n\n'),
    integratedExample: {
      id: '7.4-integrated-example',
      title: 'Bounded Context -> Aggregate Root -> Entities & Value Objects',
      language: 'text',
      code: `[Orders Bounded Context]   <-- Ubiquitous Language: Order, LineItem, Submit
  │
  ├── OrderRepository (fetches/saves ONLY Aggregate Root)
  │     │
  │     ▼
  │   [Order Aggregate]  (Single transactional consistency boundary)
  │     ├── Order (Aggregate Root Entity — enforces invariants!)
  │     ├── OrderLineItem[] (Child Entities — NEVER mutated directly from outside)
  │     └── Money (Immutable Value Object — currency + non-negative cents)
  │
  └── PricingDomainService (stateless rules spanning multiple Aggregates)`,
    },
    walkthroughMarkdown:
      'You don’t need a 500-page DDD book to get 90% of the benefit: use **Value Objects** for validated concepts like `Money`/`Email`, guard invariants inside **Aggregate Roots**, keep **Bounded Contexts** separate, and speak one **Ubiquitous Language**.',
  },
  questions: [
    {
      id: '7.4-kc-1',
      focusArea: 'Entities vs Value Objects & Invariants',
      prompt:
        'In a payments backend, why should `Money` (`amount` + `currency`) be modeled as an immutable **Value Object** instead of a plain number or an **Entity**, whereas `Account` is an **Entity**?',
      hints: [
        'Does $10 USD have a unique lifelong ID separate from another $10 USD, or does only its value matter?',
        'What bugs does wrapping `(cents, currency)` inside a self-validating immutable class eliminate?',
        '`Money` has no continuous identity—two `Money(1000, "USD")` are identical—and self-validation/immutability prevent negative amounts or USD+EUR bugs; `Account` keeps its identity even when its balance changes.',
      ],
      explanation:
        'An **Entity** (`Account`) needs continuous identity across state mutations (`balance` changes, same account). A **Value Object** (`Money`) is defined solely by its attributes: two `$10 USD` objects are interchangeable, immutable, and validate invariants (`cents >= 0`, matching currencies on `add()`) right at creation.',
      evaluationCriteria: [
        'Distinguishes identity-based Entities from attribute-based immutable Value Objects',
        'Explains self-validation and currency/amount invariant safety',
      ],
      topicIds: ['7.4.3', '7.4.4'],
    },
    {
      id: '7.4-kc-2',
      focusArea: 'Aggregates, Aggregate Roots & Repositories',
      prompt:
        'Why does DDD forbid having an `OrderLineItemRepository` that lets external code mutate line items independently of the **`Order` Aggregate Root**?',
      hints: [
        'What invariants tie `Order` and `OrderLineItem` together (e.g., total amount, max items, locked after shipment)?',
        'If anyone can `INSERT` directly into `order_line_items`, who enforces those rules?',
        'An Aggregate Root is the single gatekeeper enforcing invariants across its entire Aggregate boundary; mutating child items directly bypasses those rules and breaks transactional consistency.',
      ],
      explanation:
        'An **Aggregate** groups objects (`Order` + `OrderLineItem`s) that share invariants (e.g., total matches line sum; shipped orders cannot change). If external code modifies child items directly through a child repository, those invariants get bypassed. Loading and saving only the **Aggregate Root** through `OrderRepository` keeps invariants enforced and transactions atomic.',
      evaluationCriteria: [
        'Explains Aggregate Root as the single gatekeeper for invariants across child objects',
        'Connects Repositories exclusively to Aggregate Roots for atomic consistency',
      ],
      topicIds: ['7.4.5', '7.4.6', '7.4.8'],
    },
    {
      id: '7.4-kc-3',
      focusArea: 'Bounded Contexts, Ubiquitous Language & Domain Services',
      prompt:
        'Why does having one global shared `User` model across Auth, Billing, and Shipping eventually collapse—and how do **Bounded Contexts**, **Ubiquitous Language**, and **Domain Services** help?',
      hints: [
        'Does Shipping care about password hashes? Does Auth care about freight delivery instructions?',
        'Where do pure rules go when an action coordinates two different Aggregates?',
        'Different contexts care about different attributes and speak different Ubiquitous Language (`User` vs `Customer` vs `Recipient`); Bounded Contexts keep models lean and local, while Domain Services hold pure cross-aggregate logic.',
      ],
      explanation:
        'A global `User` god-model accumulates dozens of unrelated columns and forces Auth, Billing, and Shipping teams to couple their schemas together. **Bounded Contexts** isolate each domain’s model (`AuthUser`, `BillingCustomer`, `ShippingRecipient`) using its team’s exact **Ubiquitous Language**, while **Domain Services** capture pure business rules spanning multiple aggregates inside a context.',
      evaluationCriteria: [
        'Explains why Bounded Contexts split overloaded god-models along domain meanings',
        'Accurately places Ubiquitous Language and stateless cross-aggregate Domain Services',
      ],
      topicIds: ['7.4.1', '7.4.2', '7.4.7', '7.4.9'],
    },
  ],
};

export const LESSON_7_5: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Open five backend engineering blogs and you’ll see five fancy pattern diagrams: **Clean Architecture** (concentric circles), **Hexagonal Architecture** (a hexagon with plugs), **Inversion of Control**, plus classic Gang-of-Four patterns like **Strategy**, **Adapter**, **Factory**, and **Observer**. It’s easy to think you need *all of them* everywhere—and end up with 14 interfaces for a 2-endpoint CRUD API.',
      'In this unit, we’ll cut through the jargon and see how **Clean** and **Hexagonal Architecture** express the **exact same core idea** (`Ports & Adapters` + `Dependency Rule`), how four practical design patterns solve real backend problems, and—most importantly—**when abstractions become overengineering**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Knowing *how* architectural patterns work is only half the skill; knowing *when NOT to add an interface* separates pragmatic senior engineers from enterprise boilerplate factories.',
    prerequisites: [
      {
        subBlockId: '7.1',
        label: 'Dependency Inversion (7.1.7)',
        detail: 'Understanding why inner business logic defines contracts implemented by outer infra.',
      },
      {
        subBlockId: '7.2',
        label: 'Layered Backend Architecture & DI (7.2)',
        detail: 'Having practiced separating Controllers, Services, Repositories, and Composition Roots.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-7.5.1',
      topicId: '7.5.1',
      coveredTopicIds: ['7.5.2', '7.5.3', '7.5.4'],
      title: 'Clean Architecture, Hexagonal Architecture (Ports & Adapters), and Inversion of Control',
      problemAndRequirementsMarkdown: [
        '### First principles: One big idea wearing two different geometric hats',
        'Wait—are **Clean Architecture** and **Hexagonal Architecture** totally different inventions? Not really! Both exist to solve **one exact problem**: in classic top-down layered code (`UI -> Service -> Database`), the business layer ends up pointing *down* to the database—so your core domain still knows about SQL or Express!',
        '',
        'Both patterns reshape those layers around **one golden rule**: **Dependencies ONLY point INWARD toward business logic—never outward toward frameworks, databases, or HTTP.**',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Unpacking the terminology simply',
        '1. **Hexagonal Architecture & Ports and Adapters**:',
        '   - Draw your pure application/domain core as a **hexagon** in the middle—completely unaware of Express, Postgres, or Redis.',
        '   - Any edge where the outside world talks to your core (or your core talks outside) is a **Port** (an abstract interface owned by the core):',
        '     - *Driving (Inbound) Port*: E.g., `PlaceOrderUseCase` interface called by an HTTP Adapter, CLI Adapter, or Queue Consumer Adapter.',
        '     - *Driven (Outbound) Port*: E.g., `OrderRepository` or `EmailPort` interface implemented by `PostgresOrderAdapter` or `SendGridAdapter`.',
        '   - Notice: **Adapters** sit *outside* the hexagon and translate external protocols (HTTP/SQL/SMTP) into the core’s Ports!',
        '2. **Clean Architecture**: Same Dependency Rule visualized as **concentric rings**: **Entities** (core business objects) in the center → **Use Cases** around them → **Interface Adapters** (Controllers, Presenters, Gateways) → **Frameworks & Drivers** (Express, Postgres, Web) on the outer rim. Source code imports ONLY point inward!',
        '3. **Inversion of Control (IoC)**: The overarching principle behind DI and Ports & Adapters: instead of *your business code* deciding when/how frameworks or concrete drivers get created and called, **an outer container / Composition Root constructs and injects dependencies** and drives execution according to your core’s ports.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Clean and Hexagonal Architecture both enforce the same Dependency Rule: isolate core domain logic from frameworks by defining Ports inside the core and plugging external Adapters in from the outside via IoC.',
      codeExamples: [],
    },
    {
      id: 'topic-7.5.5',
      topicId: '7.5.5',
      coveredTopicIds: ['7.5.6', '7.5.7', '7.5.8'],
      title: 'Four workhorse backend patterns: Strategy, Adapter, Factory, and Observer',
      problemAndRequirementsMarkdown: [
        '### First principles: Recurring shapes you meet in almost every growing backend',
        'Forget memorizing 23 textbook patterns. Four practical patterns show up constantly in production Node.js/TypeScript backends:',
        '1. You have an ugly 200-line `if (provider === "stripe") ... else if (provider === "paypal") ... else if (provider === "adyen")` chain.',
        '2. A new third-party shipping SDK uses `create_label({ weight_grams })` when your domain expects `generateLabel(kg)`.',
        '3. Creating the right payment processor or notification channel depends on runtime tenant config (`country`, `tier`).',
        '4. When a user signs up, three independent side effects must happen (send welcome email, create Stripe customer, log analytics) without turning `registerUser()` into a bloated giant.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Matching each problem to its clean pattern',
        '1. **Strategy Pattern** *(swap algorithms behind one interface)*: Define `interface ShippingCalculator { quote(weightKg: number): number }` with implementations `FlatRateStrategy`, `ExpressWeightStrategy`, `FreeVipStrategy`. Instead of nested `if/else`, pass the selected strategy! Easy to add new pricing rules without editing existing strategies.',
        '2. **Adapter Pattern** *(translate incompatible interfaces)*: Wrap `LegacyFedExSoapSdk` inside a `FedExShippingAdapter` class implementing your own clean `ShippingPort` interface—shielding the rest of your app from vendor-specific quirks and naming.',
        '3. **Factory Pattern** *(centralize object creation)*: When instantiating the right strategy/adapter requires inspecting config or runtime inputs (`createPaymentProcessor(country)` returning `StripeProcessor` for US or `MercadoPagoProcessor` for Brazil), encapsulate that branching in one **Factory** function instead of repeating `switch` blocks across services.',
        '4. **Observer Pattern (Pub/Sub / Event Emitter)** *(decouple reactions from triggers)*: `UserService` emits `"user.registered"`, and independent listeners (`WelcomeEmailObserver`, `AnalyticsObserver`, `BillingCustomerObserver`) react without `UserService` importing any of them!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Use Strategy to swap algorithms, Adapter to wrap external APIs into your own interface, Factory to centralize conditional creation, and Observer to trigger decoupled side effects from events.',
      codeExamples: [
        {
          snippet: {
            id: '7.5-patterns-combo',
            title: 'Ports + Adapter + Strategy + Factory working together concisely',
            language: 'typescript',
            code: `// Port (Interface owned by core domain)
export interface NotificationPort {
  send(to: string, message: string): Promise<void>;
}

// Adapter #1 & Strategy #1: adapts SendGrid SDK to our Port
export class SendGridAdapter implements NotificationPort {
  async send(to: string, message: string) { /* call SendGrid API */ }
}

// Adapter #2 & Strategy #2: adapts Console/Fake for local dev & tests
export class ConsoleNotificationAdapter implements NotificationPort {
  async send(to: string, message: string) { console.log(\`[DEV] -> \${to}: \${message}\`); }
}

// Factory: chooses implementation from config in ONE place
export function createNotifier(env: "prod" | "dev"): NotificationPort {
  return env === "prod" ? new SendGridAdapter() : new ConsoleNotificationAdapter();
}`,
          },
          lineByLineMarkdown:
            '- `NotificationPort` is the **Port** inside your core.\n- `SendGridAdapter` is an **Adapter** translating SendGrid’s SDK.\n- `SendGridAdapter` and `ConsoleNotificationAdapter` act as interchangeable **Strategies**.\n- `createNotifier` is the **Factory** deciding which concrete adapter to build.',
        },
      ],
    },
    {
      id: 'topic-7.5.9',
      topicId: '7.5.9',
      coveredTopicIds: [],
      title: 'When abstractions become overengineering',
      problemAndRequirementsMarkdown: [
        '### First principles: Every abstraction has a cognitive tax',
        'Every `interface`, extra DTO mapper, Factory, and Event Bus you introduce adds **indirection**: a new engineer reading `orderController.ts` can no longer `Cmd+Click` straight to what actually runs—they click through `UseCase` → `Port` → `Factory` → `Adapter` across six files.',
        '',
        'Wait: when is that indirection *worth it*, and when is it pure **overengineering**?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Pragmatic judgment rules (knowing when to stop)',
        'Abstractions earn their rent when they **isolate genuine volatility, complex domain invariants, or testability barriers** (like wrapping Postgres, Stripe, email providers, or multi-step pricing logic).',
        'Abstractions become **overengineering** when:',
        '- **Single-implementation boilerplate (`IFoo` + `FooImpl`)** wraps trivial 10-line CRUD endpoints that have zero complex domain rules and will never swap implementations.',
        '- **Speculative generalization ("We might swap Postgres for MongoDB someday!")** adds leaky generic query wrappers that prevent you from using Postgres’s best features (`RETURNING`, CTEs, advisory locks) when you’re never actually switching databases.',
        '- **Premature Clean/Hexagonal ceremony** forces four layers of identical pass-through DTO copies (`HttpDto` → `UseCaseDto` → `DomainEntity` → `OrmModel`) for a simple internal admin tool.',
        '- **Rule of Three**: Start simple and concrete (Controller → Service → SQL); extract a Port, Strategy, or Factory **when a real second implementation, painful test dependency, or rule explosion proves you need it**!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Abstractions trade simplicity for flexibility—use Ports, Strategies, Factories, and Observers where volatility, complexity, or I/O testing demand isolation, and avoid speculative ceremony for trivial CRUD.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Choosing the right architectural depth for the job',
    narrativeMarkdown: [
      'Zoom out across all of Block 7:',
      '- **Simple internal tool or early prototype**: Clean layered separation (`7.2`: Controller → Service → Repo) with real SQL and Zod validation is plenty.',
      '- **Growing product with multiple domains**: Add **Modular Monolith** boundaries (`7.3`) + tactical **DDD** (`7.4`: Value Objects & Aggregate Roots) where domain rules are rich.',
      '- **High-volatility external integrations or complex core domains**: Isolate core rules with **Ports & Adapters / Clean Architecture** (`7.5`), using **Strategy, Adapter, Factory, and Observer** deliberately—never blindly.',
    ].join('\n\n'),
    integratedExample: {
      id: '7.5-integrated-example',
      title: 'Hexagonal (Ports & Adapters) Core With Practical Patterns',
      language: 'text',
      code: `           [HTTP Express Adapter]     [CLI / Cron Adapter]
                      │                          │
                      ▼ (calls Driving Port)     ▼
         ┌────────────────────────────────────────────┐
         │         CORE APPLICATION & DOMAIN          │
         │   • Use Cases & Domain Invariants          │
         │   • Defines Ports: OrderRepo, PaymentPort  │
         │   • Emits Events (Observer pattern)        │
         └──────────┬────────────────────┬────────────┘
                    │ implements         │ implements
     ┌──────────────▼─────┐      ┌───────▼──────────────┐
     │ PostgresOrderAdapter│      │ StripePaymentAdapter │  (Built via Factory / IoC)
     └────────────────────┘      └──────────────────────┘`,
    },
    walkthroughMarkdown:
      'Every architecture pattern serves the same master: keeping change cheap, bugs localized, and tests fast without drowning the team in unnecessary boilerplate.',
  },
  questions: [
    {
      id: '7.5-kc-1',
      focusArea: 'Clean / Hexagonal Architecture & IoC',
      prompt:
        'In **Hexagonal (Ports & Adapters)** and **Clean Architecture**, which direction do source-code dependencies (`import`s) point—and what is the difference between a **Port** and an **Adapter**?',
      hints: [
        'Does your core domain import Express and Postgres, or do Express and Postgres adapters implement interfaces defined by your core?',
        'Think of a USB-C socket vs. a specific monitor cable plugged into it.',
        'Dependencies point exclusively inward toward the core; a Port is the core’s abstract interface, while an Adapter is the outer concrete implementation plugging Express, Postgres, or Stripe into that Port via IoC.',
      ],
      explanation:
        'Both **Clean Architecture** and **Hexagonal Architecture** enforce the inward Dependency Rule: core business logic never imports frameworks or databases. A **Port** is an interface owned by the core (`OrderRepository`, `PaymentPort`), while an **Adapter** (`PostgresOrderAdapter`, `ExpressOrderController`) lives outside and translates external tech into that Port—wired at startup via **Inversion of Control**.',
      evaluationCriteria: [
        'States that dependencies point inward toward core domain/use cases',
        'Accurately distinguishes core-owned Ports from outer protocol/tech Adapters',
      ],
      topicIds: ['7.5.1', '7.5.2', '7.5.3', '7.5.4'],
    },
    {
      id: '7.5-kc-2',
      focusArea: 'Backend Design Patterns',
      prompt:
        'Match each backend problem to the right pattern (**Strategy**, **Adapter**, **Factory**, **Observer**): (a) wrapping a messy third-party SMS SDK into your own `SmsPort`, (b) swapping tax calculation rules per country without `if/else` chains, (c) triggering email + analytics when an invoice pays without coupling `Billing`, and (d) constructing the right payment gateway from env config.',
      hints: [
        'One translates an incompatible interface; one swaps interchangeable behavior; one decouples event reactions; one centralizes conditional instantiation.',
        'Read (a)–(d) against each pattern’s single job.',
        '(a) Adapter wraps the SMS SDK; (b) Strategy swaps country tax rules; (c) Observer reacts to payment events; (d) Factory constructs the configured gateway.',
      ],
      explanation:
        '(a) **Adapter** translates an external SDK’s interface into your internal `SmsPort`. (b) **Strategy** encapsulates interchangeable algorithms behind a shared contract. (c) **Observer** lets independent listeners react to `"invoice.paid"` without coupling `Billing`. (d) **Factory** centralizes conditional creation of the right gateway from runtime config.',
      evaluationCriteria: [
        'Correctly pairs all four problems with Adapter, Strategy, Observer, and Factory',
      ],
      topicIds: ['7.5.5', '7.5.6', '7.5.7', '7.5.8'],
    },
    {
      id: '7.5-kc-3',
      focusArea: 'Avoiding Overengineering',
      prompt:
        'A team builds a simple 4-endpoint CRUD microservice and wraps every table in `IRepo` + `RepoImpl` + `IUseCase` + `UseCaseImpl` + 4 identical DTO mappers “just in case we switch from Postgres to MongoDB later.” Why is this **overengineering**, and when *do* those abstractions pay off?',
      hints: [
        'What real cost do unused layers and speculative DB-swap interfaces impose on daily reading, debugging, and Postgres SQL usage?',
        'When does a Port/Adapter abstraction genuinely pay off instead?',
        'Speculative single-impl abstractions add heavy boilerplate and navigation tax without real flexibility; abstractions pay off around complex invariants, multiple real implementations, or external I/O boundaries that need isolated testing.',
      ],
      explanation:
        'Every unused interface and duplicate pass-through DTO adds boilerplate, hides control flow, and stops you from using Postgres’s full power on a database switch that rarely ever happens (**overengineering**). Add **Ports**, **Factories**, or multi-layer DTOs when genuine complexity, multiple implementations, volatile external SDKs, or business invariant protection actually justify the indirection.',
      evaluationCriteria: [
        'Explains the indirection/maintenance cost of speculative single-implementation abstractions',
        'Identifies genuine triggers (volatile external APIs, rich invariants, multiple real strategies, testing isolation) where abstractions earn their cost',
      ],
      topicIds: ['7.5.9'],
    },
  ],
};
