import { FptLessonContent, RecipeLessonContent } from '../types';

export const LESSON_15_1_FPT: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Your first week on a 250,000-line open-source repo or company monorepo feels overwhelming if you open `src/` and try reading files alphabetically from top to bottom. Nobody navigates a large codebase linearly!',
      'In this unit, we’ll learn the systematic mental model senior engineers use to map unfamiliar repositories in an hour: **repository anatomy**, **entry points**, **dependency graphs**, **module boundaries**, **configuration flow**, **request execution flow**, **tracing function calls**, **understanding unfamiliar abstractions**, and **reading tests to understand expected behavior**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Engineers spend 10× more time reading existing code than writing new code. Systematic exploration turns a daunting monolith into a clear execution map before you touch a single line.',
    prerequisites: [
      {
        subBlockId: '3.2',
        label: 'HTTP Server Entry & Routing (3.2)',
        detail: 'Knowing how servers wire routes, middleware, and controllers.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-15.1.1',
      topicId: '15.1.1',
      coveredTopicIds: ['15.1.2', '15.1.3', '15.1.4'],
      title: 'Repository anatomy, entry points, dependency graphs, and module boundaries',
      problemAndRequirementsMarkdown: [
        '### First principles: Map the building before checking every room',
        'Opening random helper files inside `src/utils/` leaves you wondering *“Who calls this? Does production even load it?”* Instead, read top-down starting from **metadata and boot entry points**, just like opening a city transit map before walking down alleys.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Four Landmarks Every Codebase Reveals Quickly',
        '1. **Repository anatomy**: Read `README.md`, `package.json` (`scripts`, `main`, `workspaces`), `Dockerfile`, and top-level directories (`apps/`, `packages/`, `src/`, `migrations/`, `tests/`) to separate runnable apps, shared packages, build scripts, and infra.',
        '2. **Entry points**: Find *where execution starts*—`src/server.ts`, `src/index.ts`, CLI bin scripts, or `worker.ts`. An HTTP app only handles what gets registered on that root server!',
        '3. **Dependency graphs**: Follow `import` directions between packages/modules. Notice **which layer depends on which** (`routes → services → repositories`, never `repositories → routes`) and watch for circular dependencies or workspace boundaries.',
        '4. **Module boundaries**: Look for public `index.ts` barrel exports, `internal/` folders, or workspace boundaries showing what a module intends as its public contract vs. private implementation details.',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'Before fixing a bug in an unfamiliar open-source repo, inspect `package.json` scripts (`test`, `build`, `dev`) and trace from the root entry point down to the module owning the failing feature.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Dead code trap**: Large repos often contain abandoned v1 folders that look active on disk—always trace from live entry points (`package.json` `start`/`exports`) so you don’t waste hours studying unused code!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Start mapping unfamiliar codebases top-down from repository metadata and live entry points, then trace import dependency graphs and module boundaries to see how subsystems isolate responsibilities.',
    },
    {
      id: 'topic-15.1.5',
      topicId: '15.1.5',
      coveredTopicIds: ['15.1.6', '15.1.7'],
      title: 'Configuration flow, request execution flow, and tracing function calls',
      problemAndRequirementsMarkdown: [
        '### First principles: Following a single request through middleware, DI, and layers',
        'Once you know where the server boots, the fastest way to learn *how work actually happens* is picking **one real API endpoint** (like `POST /orders`) and following a single request byte-for-byte until the response goes out.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Tracing Configuration and Runtime Execution',
        '1. **Configuration flow**: Trace how `.env` / CLI flags / Secrets load into a typed config/Zod schema (`config.ts`) at startup—this reveals every external dependency (Postgres, Redis, Stripe, feature flags) the codebase touches!',
        '2. **Request execution flow**: Walk one route end-to-end: `Router → Auth/Validation Middleware → Controller → Service → Repository/DB → Error Handler`. Watching *one* request flow reveals 80% of the repo’s conventions immediately.',
        '3. **Tracing function calls**: Use IDE **Go to Definition**, **Find All References**, **Call Hierarchy**, or `rg`/`grep -rn` across the repo—and when dynamic wiring hides callers, set a **debugger breakpoint** or inspect a thrown stack trace in a unit test to see the exact runtime call stack!',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '15.1.6-ex-1',
            title: 'Tracing one request path reveals the full layered architecture',
            language: 'text',
            code: `GET /v1/invoices/:id
  └─▶ app.ts (express setup + error middleware)
        └─▶ routes/invoices.ts (authMiddleware + requireScope('invoices:read'))
              └─▶ controllers/invoiceController.ts (parse params, map HTTP status)
                    └─▶ services/invoiceService.ts (ownership check + business rules)
                          └─▶ repos/invoiceRepo.ts (parametrized SQL query)`,
          },
          lineByLineMarkdown: [
            '- **Top to bottom**: Tracing a single endpoint immediately reveals where auth lives, where validation lives, where domain authorization lives, and where SQL lives.',
          ].join('\n'),
        },
      ],
      backendApplicationsMarkdown:
        'Reading `config.ts` in the first 5 minutes of onboarding tells you every database, broker, cache, and third-party API the service integrates with.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Implicit magic (decorators, IoC containers, event buses)**: When static “Find References” stops at an event name or DI token, search for the string literal / token symbol or step through a failing test with a debugger.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Inspecting configuration loading reveals external dependencies, while tracing one end-to-end request and using static references plus runtime stack traces cuts cleanly through layered call chains.',
    },
    {
      id: 'topic-15.1.8',
      topicId: '15.1.8',
      coveredTopicIds: ['15.1.9'],
      title: 'Understanding unfamiliar abstractions & reading tests for expected behavior',
      problemAndRequirementsMarkdown: [
        '### First principles: When clever generic wrappers hide what code actually does',
        'Large codebases love abstractions: `BaseCommandHandler<TIn, TOut>`, custom query builders, or middleware factories. Staring at the abstract class definition with 4 generic parameters often makes zero sense on its own.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Concrete Usage & Tests Decode Abstractions Fastest',
        '1. **Understanding unfamiliar abstractions**: Jump from the abstract interface/base class to **two concrete implementations** (`Find All Implementations`)! Seeing two real examples side-by-side (`CreateOrderCommand`, `RefundPaymentCommand`) clarifies *why* the abstraction exists and which parts vary vs. stay fixed—much faster than reading the generic framework code first.',
        '2. **Reading tests to understand expected behavior**: Production code tells you *what* runs; **unit and integration tests tell you *why* and what invariants must never break!** Read `*.test.ts` / `*.spec.ts` files for:',
        '   - Exact input shapes and mock contracts.',
        '   - Edge cases (empty inputs, race conditions, idempotency, permission denials) discovered during past incidents.',
        '   - Safe ways to execute and verify changes locally.',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'Before modifying any shared utility or domain service, read its test file first: every regression test guards a subtle contract someone once broke in production.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Over-mocked tests lie**: Notice whether a test uses a real test database or stubs everything out—heavily mocked unit tests prove call wiring, while integration tests prove actual SQL/HTTP behavior.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Decode unfamiliar abstractions by inspecting concrete callers and implementations side-by-side, and read test suites as executable specifications of invariants and edge cases.',
    },
  ],
  conceptConnection: {
    title: 'The 45-Minute Large-Repo Onboarding Protocol',
    narrativeMarkdown: [
      'Combine all nine exploration habits of `15.1` in exact order:',
      '1. **Anatomy & Config (`5 min`)**: `README`, `package.json`, folder layout, `config` schema.',
      '2. **Entry Points & Boundaries (`10 min`)**: Boot files (`server.ts`, `worker.ts`), module dependency graph.',
      '3. **Trace One Request (`15 min`)**: Follow a single endpoint through middleware → service → repository.',
      '4. **Abstractions & Tests (`15 min`)**: Inspect 2 concrete implementations + run and read the module’s tests.',
    ].join('\n\n'),
    integratedExample: {
      id: '15.1-integrated-example',
      title: 'Quick Exploration Command Sequence',
      language: 'bash',
      code: `# 1. Inspect repo shape, scripts, and config keys
cat package.json
ls -la src/
rg -n "process\\.env" src/

# 2. Find entry points & trace one route + its tests
rg -n "app\\.listen|createServer|router\\." src/
npm test -- src/orders/`,
    },
    walkthroughMarkdown:
      'Switch to **Recipe Mode** for a hands-on checklist of `rg`/IDE tracing steps you can apply to any open-source backend repo today.',
  },
  questions: [
    {
      id: '15.1-kc-1',
      focusArea: 'Anatomy, Entry Points, Dependency Graphs & Config Flow',
      prompt:
        'You clone an unfamiliar 150k-line TypeScript monorepo to add an endpoint. Why is starting at `package.json`, **entry points**, and **configuration flow** faster than opening random files in `src/`—and what do **dependency graphs** and **module boundaries** show you?',
      hints: [
        'How do you avoid reading dead/legacy files or guessing which databases the service uses?',
        'What does the direction of imports tell you about where business logic vs. SQL belongs?',
        'Starting at `package.json`, root entry points, and config schemas shows live boot paths, scripts, and all external dependencies immediately. Dependency graphs and module boundaries show architectural layers and public vs. private contracts.',
      ],
      explanation:
        'Reading `package.json`, boot **entry points**, and **configuration flow** immediately reveals runnable apps/workers, test commands, and every external service (`DB`, `Redis`, `Queues`) while skipping dead code. Mapping **dependency graphs** and **module boundaries** clarifies intended layering (e.g., routes → services → repos) and which internal files should stay encapsulated.',
      evaluationCriteria: [
        'Explains top-down discovery via repository anatomy, entry points, and configuration flow',
        'Explains layering and encapsulation via dependency graphs and module boundaries',
      ],
      topicIds: ['15.1.1', '15.1.2', '15.1.3', '15.1.4', '15.1.5'],
    },
    {
      id: '15.1-kc-2',
      focusArea: 'Request Tracing, Unfamiliar Abstractions & Reading Tests',
      prompt:
        'You find an unfamiliar `BaseRepository<T>` abstraction and a failing endpoint. Why should you inspect **concrete implementations**, trace **one full request flow**, and read existing **tests** before rewriting anything?',
      hints: [
        'Why is reading concrete callers clearer than staring at generic base class code alone?',
        'What crucial edge-case history do test suites preserve that code alone obscures?',
        'Tracing one request end-to-end clarifies lifecycle hooks/middleware; inspecting 2 concrete implementations demystifies generic abstractions; reading tests reveals expected behavior, edge cases, and invariants your fix must preserve.',
      ],
      explanation:
        'Tracing **request execution flow** and **function calls** shows every middleware, auth guard, and error mapper along a live request. Inspecting **concrete implementations** of unfamiliar abstractions shows which hooks actually vary in practice, and **reading tests** uncovers expected inputs, error semantics, and past regression constraints before you change behavior.',
      evaluationCriteria: [
        'Uses end-to-end request tracing and concrete examples to understand abstractions',
        'Uses test suites as specifications of expected behavior and regression edge cases',
      ],
      topicIds: ['15.1.6', '15.1.7', '15.1.8', '15.1.9'],
    },
  ],
};

export const LESSON_15_1_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Map any unfamiliar backend or open-source repository systematically in under an hour using entry-point tracing, dependency inspection, config auditing, call tracing, and test-driven comprehension.',
  whenToUseMarkdown:
    'Use when onboarding onto a new team codebase, debugging an open-source dependency, or planning changes inside a large monorepo.',
  setupCommands: [
    {
      id: '15.1-cmd-1',
      label: 'Map directory anatomy, scripts & environment configuration',
      command: 'ls -la && cat package.json && rg -n "process\\.env\\.|zod" src/',
      notes: 'Quickly locates workspace layout, runnable scripts, and every external config variable.',
    },
    {
      id: '15.1-cmd-2',
      label: 'Trace route registration & execute targeted tests',
      command: 'rg -n "router\\.(get|post|put|delete)|app\\.use" src/ && npx vitest run src/orders',
      notes: 'Finds HTTP entry handlers and confirms local tests run cleanly before editing.',
    },
  ],
  coreApisMarkdown: [
    '- **Top-down Navigation**: `README.md` → `package.json` → `src/server.ts` / `worker.ts` → `config.ts`.',
    '- **Call & Boundary Tracing**: IDE *Go to Definition*, *Find References*, *Find Implementations*, and `rg` across `import` boundaries.',
    '- **Test Inspection**: Run and step through `*.test.ts` / `*.spec.ts` to verify expected contracts and edge cases.',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Scan repository anatomy, boot entry points & configuration flow',
      detailMarkdown:
        'Read `package.json`, `workspaces`, and `config` files to chart runnable services, external dependencies (DB/Redis/queues), and build/test commands.',
    },
    {
      stepNumber: 2,
      title: 'Trace dependency graphs, module boundaries & one full request path',
      detailMarkdown:
        'Pick one representative route and step through middleware → controller → service → repository, noting module index exports and dependency direction.',
    },
    {
      stepNumber: 3,
      title: 'Decode unfamiliar abstractions via concrete usages & test suites',
      detailMarkdown:
        'Open two concrete implementations of any generic base class and read its unit/integration tests to learn edge cases and expected behavior.',
    },
  ],
  workingExamples: [
    {
      id: '15.1-ex-notes',
      title: 'Scratchpad Codebase Map Template (fill out during first hour)',
      language: 'markdown',
      code: `## Codebase Map
- Entry points: \`src/api/server.ts\` (HTTP :3000), \`src/jobs/worker.ts\` (BullMQ)
- Config flow: \`src/config/env.ts\` (Zod-validated at boot; uses DATABASE_URL, REDIS_URL)
- Module boundaries: \`routes/*\` -> \`services/*\` -> \`repositories/*\` (no upward imports)
- Sample traced request: \`POST /v1/orders\` -> \`authGuard\` -> \`orderController\` -> \`orderService.create\` -> \`orderRepo.insertWithOutbox\`
- Anchor tests: \`tests/integration/orders.test.ts\``,
      explanation:
        'Writing a 10-line map prevents getting lost across deep directory trees and accelerates onboarding for the next engineer too.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Trying to understand a codebase by reading helper files alphabetically without knowing what calls them.',
      fix: 'Always trace top-down from live entry points (`server.ts`, CLI bins, route handlers) or failing tests.',
    },
    {
      mistake: 'Skipping test files and guessing edge-case rules from implementation code alone.',
      fix: 'Read existing `*.test.ts` cases early—they document intentional constraints and historical bug fixes.',
    },
  ],
  exercise: {
    id: '15.1-recipe-ex',
    title: 'Produce a 1-Page Exploration Map for a Real Backend Repo',
    instructionsMarkdown:
      'Pick any medium-sized TypeScript/Node repository, trace one HTTP endpoint from entry point to DB call, identify config dependencies, inspect one shared abstraction via two concrete implementations, and verify its test suite passes.',
    acceptanceChecklist: [
      'Identifies exact boot entry point, config loader, and module import boundaries',
      'Traces one complete request call chain from middleware to repository',
      'Documents expected behavior and edge cases learned from existing tests',
    ],
  },
};

export const LESSON_15_2: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Why do some backends remain pleasant to change three years after launch while others turn into a minefield where fixing one bug breaks three unrelated endpoints?',
      'Good architecture isn’t about adding maximum interfaces or splitting every 10-line function into 6 files. In this unit, we’ll examine practical maintainability through **SOLID principles**, **coupling and cohesion**, **refactoring**, **technical debt**, **naming and API design**, **backward compatibility**, **error handling conventions**, **abstraction boundaries**, and **maintainability trade-offs**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Over-abstraction creates just as much friction as spaghetti code. The real skill is choosing boundaries that minimize blast radius *when requirements inevitably change*.',
    prerequisites: [
      {
        subBlockId: '15.1',
        label: 'Module Boundaries & Dependency Graphs (15.1)',
        detail: 'Seeing how imports wire subsystems together.',
      },
      {
        subBlockId: '0.2',
        label: 'Error Modeling & Typed Results (0.2)',
        detail: 'Making expected failures explicit in function signatures.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-15.2.1',
      topicId: '15.2.1',
      coveredTopicIds: ['15.2.2', '15.2.8'],
      title: 'Coupling, cohesion, abstraction boundaries, and SOLID principles',
      problemAndRequirementsMarkdown: [
        '### First principles: Why one small edit shouldn’t break 14 files',
        'Two forces determine how painful a codebase is to evolve:',
        '- **High Cohesion**: Things that *change together for the same business reason* live together cleanly in the same module.',
        '- **Low Coupling**: Module A depends only on a narrow, stable **abstraction boundary** (contract) of Module B—not on Module B’s internal SQL tables, temporary variables, or private helpers.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### SOLID Through the Lens of Coupling & Cohesion (No Dogma)',
        '- **Single Responsibility (SRP)**: A module should have one cohesive domain reason to change (e.g., separate tax calculation logic from Express `req`/`res` HTTP formatting).',
        '- **Open/Closed & Interface Segregation**: Add a new payment method (`PayPalProvider`) by implementing a narrow `PaymentGateway` interface (`charge()`, `refund()`) rather than editing 9 `switch (provider)` blocks across the app—and don’t force small consumers to depend on giant 20-method interfaces.',
        '- **Liskov Substitution**: Implementations must honor the contract callers expect—if `MemoryStore.save()` throws silently on missing keys while `PostgresStore.save()` inserts, callers break when swapping implementations.',
        '- **Dependency Inversion**: High-level business policy (`OrderService`) depends on a narrow interface (`PaymentGateway`), not directly on raw Stripe HTTP SDK details—making testing and swapping trivial.',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '15.2.1-ex-1',
            title: 'Dependency Inversion across a clean abstraction boundary',
            language: 'typescript',
            code: `export interface ReceiptMailer {
  sendOrderReceipt(to: string, orderId: string, totalCents: number): Promise<void>;
}

// High-level business service depends on a narrow interface, not Postmark/SES SDK specifics
export class OrderCompletionService {
  constructor(private readonly mailer: ReceiptMailer) {}

  async complete(order: { id: string; email: string; totalCents: number }) {
    await this.mailer.sendOrderReceipt(order.email, order.id, order.totalCents);
  }
}`,
          },
          lineByLineMarkdown: [
            '- **Lines 1–3**: Defines a domain-focused `ReceiptMailer` boundary (no SES headers or SMTP config leaked into `OrderCompletionService`).',
            '- **Lines 6–11**: `OrderCompletionService` stays cohesive and easy to unit-test with an in-memory spy, while AWS SES or Resend plugs in cleanly at the composition root.',
          ].join('\n'),
        },
      ],
      backendApplicationsMarkdown:
        'Apply Dependency Inversion at **external IO edges** (databases, email providers, payment gateways, clocks), not blindly between every tiny internal pure helper function.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Premature abstraction (“Rule of Three”)**: Inventing 4 interfaces and 3 factories for something that only has *one* concrete implementation today increases indirection without reducing risk—wait until you actually have two real variations or a clear external IO boundary.',
      ].join('\n\n'),
      centralIdeaSummary:
        'High cohesion groups related domain logic together, low coupling hides internals behind narrow abstraction boundaries, and SOLID principles guide dependency direction without requiring premature interfaces everywhere.',
    },
    {
      id: 'topic-15.2.3',
      topicId: '15.2.3',
      coveredTopicIds: ['15.2.4', '15.2.9'],
      title: 'Refactoring, technical debt, and maintainability trade-offs',
      problemAndRequirementsMarkdown: [
        '### First principles: Moving fast today without cementing chaos tomorrow',
        'Ward Cunningham coined **technical debt** as a financial metaphor: taking a deliberate shortcut to ship an urgent launch on Friday is like taking out a loan—useful if you *pay down the principal* soon after, crippling if interest compounds until every feature takes 3× longer!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Strategic Refactoring & Honest Trade-Offs',
        '- **Deliberate vs. Accidental Debt**: Shortcuts with clear `TODO(ticket-id)` and clean isolation boundaries are *managed debt*; duplicated business rules copy-pasted across 6 controllers with zero tests are *accidental rot*.',
        '- **Safe Refactoring**: Restructuring internal code **without changing external observable behavior**. Never start a big refactor without automated tests covering current behavior first! Refactor in small, green-test commits (*“Boy Scout Rule”* on files you’re already touching) rather than 4,000-line “rewrite branches” that conflict endlessly.',
        '- **Maintainability trade-offs**: Every design balances **readability**, **flexibility**, **performance**, and **delivery speed**. Explicitly duplicating 10 lines of validation between two independent domains is often *more* maintainable than coupling two unrelated teams to one rigid shared helper!',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'Keep refactor PRs separate from behavioral bug-fix or feature PRs so reviewers can verify “zero intended behavior change” cleanly.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Wrong abstraction is worse than duplication**: Forcing two domains that are slowly diverging into one parameterized shared utility (`if (isV2 && !isEnterprise) ...`) creates fragile spaghetti.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Manage technical debt deliberately, refactor incrementally behind passing tests, and weigh maintainability trade-offs—recognizing that mild duplication often beats a premature, tightly coupled abstraction.',
    },
    {
      id: 'topic-15.2.5',
      topicId: '15.2.5',
      coveredTopicIds: ['15.2.6', '15.2.7'],
      title: 'Naming, API design, backward compatibility, and error handling conventions',
      problemAndRequirementsMarkdown: [
        '### First principles: Public contracts outlive internal code',
        'You can rename a private variable inside `calculateDiscount.ts` in two seconds. Renaming a response field in `GET /v1/orders`, changing a library export signature, or suddenly throwing raw strings instead of typed domain errors breaks every client and consumer depending on you!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Designing Clear, Stable, Predictable Interfaces',
        '1. **Naming and API design**: Name functions, modules, and HTTP endpoints after *intent and domain invariants*, not vague verbs (`processData`, `handleStuff`). Design APIs to be **hard to misuse** (pass `{ timeoutMs: 5000 }` instead of mysterious boolean flags `fetchUser(id, true, false)`).',
        '2. **Backward compatibility**: Additive changes (`new optional field`, `new endpoint`, `accepting old + new parameter`) preserve compatibility; removing fields, narrowing accepted inputs, or changing error shapes breaks callers. Deprecate with warnings/headers and transition periods before removing legacy behavior.',
        '3. **Error handling conventions**: Establish one consistent convention across the codebase—e.g., domain functions return typed `Result<T, DomainError>` or throw subclasses of a central `AppError` carrying stable machine-readable `code` (`"INSUFFICIENT_FUNDS"`), HTTP status mapping, and cause chains—never silently swallowing errors in empty `catch {}` blocks!',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'Use machine-readable error `code` strings (`"CARD_DECLINED"`) instead of telling clients to parse English human messages like `"Your card was declined"`, so copy edits never break mobile clients.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Hyrum’s Law**: With enough consumers, *every* observable behavior of an API—even undocumented field order or bug quirks—ends up depended upon by someone; keep public API responses minimal and intentional.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Clear domain naming prevents misuse, strict backward compatibility protects existing consumers during evolution, and consistent error-handling conventions turn failures into predictable, debuggable contracts.',
    },
  ],
  conceptConnection: {
    title: 'Evaluating Any Code Change Like a Staff Reviewer',
    narrativeMarkdown: [
      'Before merging a large backend change, review it against these five `15.2` questions:',
      '1. **Cohesion & Coupling**: Does each module own one clear responsibility behind clean **abstraction boundaries**?',
      '2. **SOLID without Over-Engineering**: Are dependencies pointing toward stable abstractions where needed, without unnecessary layers?',
      '3. **Naming & Contracts**: Are APIs self-explanatory, **backward-compatible**, and consistent in **error handling**?',
      '4. **Debt & Refactoring**: Did we leave the touched module cleaner behind green tests without mixing giant unrelated rewrites?',
    ].join('\n\n'),
    integratedExample: {
      id: '15.2-integrated-example',
      title: 'Before vs. After: Tightly Coupled vs. Maintainable API Boundary',
      language: 'typescript',
      code: `// Hard to evolve: boolean flags, raw SDK leak, mixed HTTP + domain concerns
// async function handle(req, res, sendEmail: boolean, strictMode: boolean) { ... }

// Clear contract: explicit options, consistent AppError codes, clean boundary
export interface CancelOrderInput {
  orderId: string;
  reason: 'CUSTOMER_REQUEST' | 'FRAUD';
  notifyCustomer: boolean;
}
// Returns typed Result<CancelledOrder, OrderCancelError> cleanly`,
    },
    walkthroughMarkdown:
      'Next in `15.3`, we’ll put these quality standards into practice inside a complete open-source and team **Contribution Workflow**.',
  },
  questions: [
    {
      id: '15.2-kc-1',
      focusArea: 'Coupling, Cohesion, SOLID & Trade-offs',
      prompt:
        'Why is “abstract everything behind an interface just in case” often *bad* for **maintainability**, and how do **cohesion**, **coupling**, and **Dependency Inversion** tell you where abstraction boundaries actually belong?',
      hints: [
        'Compare indirection cost vs. stability benefit across internal helpers vs. external IO (DB, Stripe, Email).',
        'What happens when two slightly similar features actually diverge over time behind one shared abstraction?',
        'Premature interfaces add indirection and rigid coupling when requirements diverge. Place narrow abstraction boundaries at volatile external IO edges and stable domain seams (Dependency Inversion), keeping cohesive logic direct and readable internally.',
      ],
      explanation:
        'Every abstraction adds indirection. Creating premature shared abstractions across diverging code creates tight **coupling** to the wrong shape, whereas mild duplication stays independent. Apply **Dependency Inversion** and **abstraction boundaries** specifically where high-level **cohesive** domain logic meets external IO (databases, payment providers, mailers) or genuinely polymorphic plugins.',
      evaluationCriteria: [
        'Explains indirection/wrong-abstraction costs vs genuine decoupling benefits',
        'Places abstraction boundaries purposefully at external IO / stable domain seams',
      ],
      topicIds: ['15.2.1', '15.2.2', '15.2.8', '15.2.9'],
    },
    {
      id: '15.2-kc-2',
      focusArea: 'Refactoring, Technical Debt, Naming, Backward Compatibility & Errors',
      prompt:
        'You need to refactor a legacy checkout function while fixing a bug where swallowed errors return HTTP `200`. Describe a safe workflow covering **refactoring**, **backward compatibility**, **naming/API design**, and **error handling conventions**.',
      hints: [
        'What must exist before refactoring behavior, and should the refactor ship in the same commit as unrelated changes?',
        'How should callers distinguish failure reasons cleanly without breaking existing consumers?',
        'Write characterization/regression tests first, isolate the refactor from behavioral edits, preserve backward-compatible request/response fields, replace empty catch blocks with consistent typed errors/codes, and name parameters explicitly rather than cryptic flags.',
      ],
      explanation:
        'First write tests pinning existing **backward-compatible** behavior before touching structure. Keep **refactoring** commits cleanly separated from the bug fix, improve unclear boolean flags into descriptive **naming/API option objects**, and replace swallowed catches with the codebase’s standard **error handling convention** (explicit machine-readable error codes + structured logging) while tracking any deferred cleanup explicitly rather than leaving silent **technical debt**.',
      evaluationCriteria: [
        'Prescribes test-backed incremental refactoring separate from behavior changes',
        'Addresses backward compatibility, clear naming/APIs, and consistent non-swallowed errors',
      ],
      topicIds: ['15.2.3', '15.2.4', '15.2.5', '15.2.6', '15.2.7'],
    },
  ],
};

export const LESSON_15_3_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Contribute clean, low-friction changes to open-source and large team repositories—covering `CONTRIBUTING.md`, bug triage, minimal reproduction, root-cause analysis, regression tests, surgical PRs, code reviews, feedback resolution, and breaking changes.',
  whenToUseMarkdown:
    'Use whenever submitting a bug fix, feature, or patch to an open-source project or a large multi-team production repository.',
  setupCommands: [
    {
      id: '15.3-cmd-1',
      label: 'Read contributing docs, sync fork & create scoped topic branch',
      command:
        'cat CONTRIBUTING.md && git fetch upstream && git switch -c fix/idempotency-race upstream/main',
      notes: 'Always branch from up-to-date upstream/main and follow repo commit/lint conventions.',
    },
    {
      id: '15.3-cmd-2',
      label: 'Run lint, typecheck, and targeted regression tests before opening PR',
      command: 'npm run lint && npm run typecheck && npm test -- tests/idempotency.test.ts',
      notes: 'Verify the exact checks CI runs locally so maintainers don’t review broken builds.',
    },
  ],
  coreApisMarkdown: [
    '- **Contribution Guidelines & Issue Triage**: Read `CONTRIBUTING.md`, `.github/ISSUE_TEMPLATE`, PR checklists, and existing open/closed issues before coding to confirm scope and license/CLA rules.',
    '- **Reproduce → Root Cause → Regression Test**: Never fix a bug until you reproduce it reliably in a failing test that isolates the exact **root cause** (not just patching the symptom).',
    '- **Minimal Changes & PR Hygiene**: Keep diffs surgical (don’t reformat unrelated files!), write clear PR summaries, handle **breaking changes** only with deprecation/semver bumps + migration notes, and resolve **code review** feedback constructively.',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Study contribution guidelines & triage the issue',
      detailMarkdown:
        'Read `CONTRIBUTING.md` (branch naming, commit format like Conventional Commits, test setup). Check the issue report for environment versions, logs, and maintainer discussion before writing code.',
    },
    {
      stepNumber: 2,
      title: 'Create a minimal reproduction & isolate the root cause',
      detailMarkdown:
        'Strip away unrelated code until you have the smallest failing test case reproducing the exact bug (`git bisect` helps pinpoint when regressions entered). Trace why the invariant broke rather than adding a defensive `if` band-aid.',
    },
    {
      stepNumber: 3,
      title: 'Lock in a regression test & make minimal, scoped changes',
      detailMarkdown:
        'Verify your new **regression test** fails on `main`, apply the **minimal change** solving the root cause, verify the test passes, and confirm no unrelated formatting noise polluted `git diff`. If a change alters public APIs or schemas (**breaking change**), discuss with maintainers first, add deprecation warnings or major-version notes, and document the upgrade path.',
    },
    {
      stepNumber: 4,
      title: 'Open a clear Pull Request & resolve code review feedback gracefully',
      detailMarkdown:
        'Reference `Fixes #123`, explain *what* broke, *why* this fix addresses the root cause, and *how* it was tested. During **code review**, address every reviewer comment cleanly (push focused follow-up commits or reply with clear technical reasoning without taking critique personally), re-verify CI green, and keep history tidy for merge.',
    },
  ],
  workingExamples: [
    {
      id: '15.3-ex-bug',
      title: 'High-signal Bug Report & Regression Test Example',
      language: 'typescript',
      code: `// Minimal regression test reproducing issue #418 before fixing:
// Bug: Concurrent POST /webhooks calls with same eventId inserted duplicate ledger rows.
it('deduplicates concurrent webhook deliveries with the same eventId (#418)', async () => {
  const payload = { eventId: 'evt_concurrent_1', amountCents: 2500 };

  const [first, second] = await Promise.all([
    request(app).post('/webhooks/stripe').send(payload),
    request(app).post('/webhooks/stripe').send(payload),
  ]);

  expect([first.status, second.status].sort()).toEqual([200, 200]);
  const rows = await db.query('SELECT count(*)::int FROM ledger WHERE event_id = $1', [
    payload.eventId,
  ]);
  expect(rows.rows[0].count).toBe(1);
});`,
      explanation:
        'Reproduces the exact race condition reliably, proves the original check-then-insert code fails, and permanently guards the root-cause fix (`INSERT ... ON CONFLICT DO NOTHING`).',
    },
    {
      id: '15.3-ex-review',
      title: 'Pre-PR Diff & Breaking-Change Hygiene Check',
      language: 'bash',
      code: `# Inspect every changed line to ensure strictly minimal edits (no accidental reformatting)
git diff --stat upstream/main
git diff upstream/main

# Run full project checks matching CI
npm run lint && npm run typecheck && npm test`,
      explanation:
        'Maintainers review small, focused diffs 5x faster than PRs cluttered with unrelated whitespace edits or missing tests.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Running Prettier across an entire directory on a 10-line bug-fix PR, or bundling 3 unrelated cleanups.',
      fix: 'Keep PRs strictly minimal—1 logical change per PR, touching only relevant lines—so blame/bisect and code review stay crisp.',
    },
    {
      mistake: 'Silently introducing a breaking change (renaming exports, changing error formats, dropping env vars) in a patch fix.',
      fix: 'Maintain backward compatibility, or get maintainer approval for major/breaking releases with clear deprecation notices and migration docs.',
    },
  ],
  exercise: {
    id: '15.3-recipe-ex',
    title: 'Execute a Full Root-Cause + Regression-Test Contribution Drill',
    instructionsMarkdown:
      'Write a clean issue reproduction report, a failing regression test isolating the root cause, a minimal patch (no unrelated edits), and polite code-review responses addressing one edge-case question and one naming suggestion.',
    acceptanceChecklist: [
      'Follows repo `CONTRIBUTING.md` conventions and isolates root cause rather than symptom',
      'Regression test fails before fix and passes after fix with minimal `git diff`',
      'Explicitly checks for breaking changes and addresses all reviewer feedback cleanly',
    ],
  },
};

export const LESSON_15_4_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Communicate complex backend designs and production events clearly across teams using Component diagrams, Sequence diagrams, ERDs, Data-Flow diagrams, Architecture Decision Records (ADRs), Technical Proposals (RFCs), PR descriptions, and Incident Reports.',
  whenToUseMarkdown:
    'Use whenever proposing a new architecture, documenting database schemas/data pipelines, requesting peer sign-off on PRs, or writing blameless postmortems.',
  setupCommands: [
    {
      id: '15.4-cmd-1',
      label: 'Create an Architecture Decision Record directory in docs/',
      command: 'mkdir -p docs/adr docs/rfcs docs/diagrams docs/postmortems',
      notes: 'Storing diagrams and ADRs in Git alongside code keeps documentation versioned and reviewable.',
    },
  ],
  coreApisMarkdown: [
    '- **Four Core Diagrams (Mermaid/text-as-code so diffs work in Git!)**:',
    '  1. **Component Diagram**: Static services, queues, and databases and their dependency edges.',
    '  2. **Sequence Diagram**: Exact chronological request/response & async message arrows across actors.',
    '  3. **Entity Relationship Diagram (ERD)**: Tables, primary/foreign keys, and `1:N` / `N:M` cardinalities.',
    '  4. **Data-Flow Diagram (DFD)**: How data transforms and moves from external inputs through processes into stores.',
    '- **Four Engineering Documents**:',
    '  1. **Architecture Decision Record (ADR)**: Short permanent record of *Context → Decision → Consequences/Trade-offs*.',
    '  2. **Technical Proposal / RFC**: Problem statement, constraints, evaluated alternatives, chosen design, rollout & rollback plan.',
    '  3. **Pull Request Description**: *What changed, Why, Trade-offs, How tested, Rollout/Migration notes*.',
    '  4. **Incident Report (Blameless Postmortem)**: Impact, Timeline, Root Cause, What went well/poorly, Concrete Action Items with owners.',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Match the right diagram to the question being asked',
      detailMarkdown:
        'Use **Component diagrams** for service boundaries, **Sequence diagrams** for multi-step auth/Saga timing, **ERDs** for relational table modeling, and **Data-Flow diagrams** for ETL/webhook/privacy/PII pipelines.',
    },
    {
      stepNumber: 2,
      title: 'Write concise ADRs & RFCs before building irreversible systems',
      detailMarkdown:
        'Before adopting Kafka, sharding, or Event Sourcing, capture rejected alternatives and explicit trade-offs in an **RFC** for review, then freeze the final choice in a numbered **ADR** (`docs/adr/0004-use-transactional-outbox.md`).',
    },
    {
      stepNumber: 3,
      title: 'Standardize high-signal PR descriptions & blameless Incident Reports',
      detailMarkdown:
        'Give PR reviewers context, test proof, and migration safety upfront—and after outages, write **blameless Incident Reports** fixing systemic gaps rather than blaming individuals.',
    },
  ],
  workingExamples: [
    {
      id: '15.4-ex-diagrams',
      title: 'The Four Engineering Diagrams in Versionable Mermaid Syntax',
      language: 'markdown',
      code: `### 1. Component Diagram
\`\`\`mermaid
flowchart LR
  Client --> Gateway[API Gateway]
  Gateway --> Orders[Orders Service]
  Orders --> OrdersDB[(Orders Postgres)]
  Orders --> Broker[(Kafka / SQS)]
  Broker --> Billing[Billing Worker]
\`\`\`

### 2. Sequence Diagram
\`\`\`mermaid
sequenceDiagram
  Client->>API: POST /checkout (Idempotency-Key)
  API->>OrdersDB: BEGIN + INSERT order + outbox
  API-->>Client: 202 Accepted
  Relay->>Broker: Publish OrderPlaced
  Broker->>Payment: Charge card (idempotent)
\`\`\`

### 3. Entity Relationship Diagram (ERD)
\`\`\`mermaid
erDiagram
  USERS ||--o{ ORDERS : places
  ORDERS ||--|{ ORDER_ITEMS : contains
  ORDERS {
    uuid id PK
    uuid user_id FK
    text status
  }
\`\`\`

### 4. Data-Flow Diagram (DFD)
\`\`\`mermaid
flowchart LR
  Webhook((Stripe Event)) -->|signed JSON| Ingest[Verify Signature]
  Ingest -->|sanitized tx| Ledger[(Immutable Ledger Store)]
  Ledger -->|PII redacted| Warehouse[(Analytics Warehouse)]
\`\`\``,
      explanation:
        'Storing Mermaid diagrams right inside Markdown lets diagrams evolve inside Pull Requests alongside the code they describe.',
    },
    {
      id: '15.4-ex-docs',
      title: 'Templates: ADR, Technical Proposal, PR Description & Incident Report',
      language: 'markdown',
      code: `## ADR-0007: Adopt Transactional Outbox for Order Events
- **Status**: Accepted (2026-03)
- **Context**: Dual-writing Postgres + SQS dropped ~0.2% of events on container crash.
- **Decision**: Write domain rows + outbox rows in one local Postgres transaction; poll via relay worker.
- **Consequences**: (+) Eliminates lost events. (-) Consumers receive at-least-once deliveries and must be idempotent.

---
## Technical Proposal (RFC) Outline
1. Problem & Goals / Non-Goals  2. Proposed Design (+ Component/Sequence/ERD/DFD)
3. Alternatives Considered & Trade-offs  4. Migration, Rollback & Security Plan

---
## Pull Request Description Template
- **Summary**: Why this change is needed (links to issue/ADR).
- **Key Changes**: Focused bullet list of behavior updates.
- **Safety / Migrations**: Backward compatibility & feature flags.
- **Verification**: Unit/integration tests run + manual curl/load checks.

---
## Incident Report (Blameless Postmortem) Outline
- **Impact & Severity**: Duration, % requests/users affected, SLO budget burned.
- **Timeline (UTC)**: Detection -> Mitigation -> Full Resolution.
- **Root Cause & Contributing Factors**: Technical chain (5 Whys), no individual blame.
- **Action Items**: Concrete preventive fixes with owners and due dates.`,
      explanation:
        'Crisp structured writing saves hours of synchronous meetings and creates institutional memory for future engineers.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Writing a 10-page RFC or PR description with zero diagrams, or mixing 4 diagram types into one unreadable box-and-arrow mess.',
      fix: 'Pick the exact diagram matching the question (Sequence for timing, ERD for schema, Component for structure, DFD for data movement/PII) and keep ADRs under 1 page.',
    },
    {
      mistake: 'Writing incident reports that conclude “Engineer forgot to check X” instead of fixing missing guardrails.',
      fix: 'Keep postmortems strictly blameless—treat human mistakes as symptoms and build automated CI checks, circuit breakers, or safer defaults.',
    },
  ],
  exercise: {
    id: '15.4-recipe-ex',
    title: 'Author a Mini Design Pack (2 Diagrams + ADR + Incident Report)',
    instructionsMarkdown:
      'For an idempotent webhook ingestion pipeline: draft a Sequence Diagram + Data-Flow Diagram (Mermaid), write a 1-page ADR justifying Transactional Outbox vs. direct broker publish, and draft a blameless Incident Report template for an outage caused by duplicate delivery.',
    acceptanceChecklist: [
      'Sequence Diagram shows sync HTTP ack vs async background relay clearly',
      'DFD explicitly marks trust/signature verification and storage boundaries',
      'ADR documents Context, Decision, Alternatives, and Positive/Negative Consequences',
      'Incident Report includes Impact, Timeline, Root Cause, and systemic Action Items without blame',
    ],
  },
};
