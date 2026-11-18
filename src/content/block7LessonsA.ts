import { FptLessonContent, RecipeLessonContent } from '../types';

export const LESSON_7_1: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'When you build your very first backend prototype, throwing 200 lines into a single `server.ts` feels fast and effortless. Six months and 40 endpoints later, that same style turns into a 4,000-line ball of mud where editing how refunds calculate accidentally breaks CSV exports and makes unit testing impossible without booting a live database and Stripe webhook.',
      'In this unit, we’ll examine **why** software complexity breaks down and derive the core engineering forces that govern all backend architecture: **separation of concerns**, **coupling vs. cohesion**, **abstraction**, **dependency management**, and **dependency inversion**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Every architecture pattern (Layered, Modular Monolith, Clean, Hexagonal) is simply a structured answer to these seven foundational forces. Once you feel *why* high coupling and low cohesion hurt, organizing a codebase stops being guesswork.',
    prerequisites: [
      {
        subBlockId: '0.2',
        label: 'Interfaces, contracts & error modeling (0.2)',
        detail: 'Knowing how TypeScript interfaces express contracts separately from concrete implementations.',
      },
      {
        subBlockId: '3.2',
        label: 'HTTP routing & request handling (3.2)',
        detail: 'Having seen HTTP parsing, validation, business rules, and SQL mixed inside route handlers.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-7.1.1',
      topicId: '7.1.1',
      coveredTopicIds: ['7.1.2'],
      title: 'Why putting everything in one file does not scale — and separation of concerns',
      problemAndRequirementsMarkdown: [
        '### First principles: The "God File" trap',
        'Imagine writing `app.post("/orders", async (req, res) => { ... })` where one function reads `req.headers`, checks the JWT, parses the JSON body, queries Postgres inventory with raw SQL, applies discount percentages, calls Stripe’s HTTP SDK, sends a SendGrid receipt email, and formats the `201 Created` JSON response.',
        '',
        'It works on Day 1! Now try three everyday tasks on Day 90:',
        '1. **Reusing the logic**: Now a background CRON job or CLI import also needs to create orders—without an HTTP `req` or `res` object!',
        '2. **Testing discount math**: You want to verify your 20% VIP discount rule in 2 milliseconds—but because it’s buried inside `req/res` + SQL + Stripe code, you cannot call it without spinning up Express and Postgres.',
        '3. **Team collaboration**: Four engineers edit the same file simultaneously, creating merge conflicts on every PR.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Separation of Concerns: Dividing by *reason to change*',
        '**Separation of Concerns (SoC)** doesn’t mean blindly chopping one big file into 10 random smaller files. It means grouping code by **distinct responsibility / reason to change**:',
        '- **HTTP Transport Concern**: Parsing URL params, reading auth headers, returning `400` / `201` status codes. *(Changes when your API protocol changes.)*',
        '- **Business Logic Concern**: Checking credit limits, calculating discounts, reserving stock. *(Changes when product rules change.)*',
        '- **Persistence & External I/O Concern**: Running SQL queries, calling Stripe, sending emails. *(Changes when schemas or third-party SDKs change.)*',
        '',
        'When these concerns are cleanly separated, you can trigger the *exact same* order-creation logic from an HTTP route, a queue worker, or a fast unit test.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Putting HTTP parsing, business rules, and database SQL in one place blocks reuse, testing, and parallel work; Separation of Concerns splits code along independent reasons to change.',
      codeExamples: [],
    },
    {
      id: 'topic-7.1.3',
      topicId: '7.1.3',
      coveredTopicIds: ['7.1.4', '7.1.5'],
      title: 'Coupling, cohesion, and purposeful abstraction',
      problemAndRequirementsMarkdown: [
        '### First principles: Two words every senior engineer uses constantly',
        'Once you split code into modules or files, how do you tell whether your split actually made the system *better* or *worse*?',
        'Picture two bad extremes:',
        '- **Spaghetti split**: File A reaches directly into File B’s internal database column names and private helper state; changing one column in B breaks five unrelated files.',
        '- **Scattered fragments**: A single cohesive concept (like validating and charging an invoice) is shredded across eight tiny 5-line files with zero clear center, so understanding one feature requires opening nine tabs.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Measuring design quality: Low Coupling + High Cohesion + Abstraction',
        '1. **Coupling** *(how tightly modules depend on each other’s internals)*:',
        '   - **Tight coupling**: Changing module B forces module A to be rewritten too (e.g., an HTTP controller reading Postgres `pg.Result.rows[0].cust_bal_cents` directly).',
        '   - **Loose coupling**: Modules interact strictly through narrow, stable boundaries (clean function inputs/outputs). We want **low coupling**.',
        '2. **Cohesion** *(how strongly the pieces inside ONE module belong together)*:',
        '   - **Low cohesion**: A junk-drawer `utils.ts` holding `formatCurrency`, `hashPassword`, `sendEmail`, and `parseCsv`—unrelated things sharing one file.',
        '   - **High cohesion**: An `InvoiceCalculator` module where every function works closely together on invoice totals, taxes, and line items. We want **high cohesion**.',
        '3. **Abstraction**: Hiding *how* a job is done behind *what* it does. Instead of forcing every caller to understand SMTP sockets and MIME headers, you expose `emailSender.sendReceipt(to, order)`—letting the implementation swap from SendGrid to Postmark without touching callers.',
      ].join('\n\n'),
      edgeCasesAndTradeOffsMarkdown: [
        '### Warning: DRY isn’t always cohesion!',
        'Two endpoints returning similar JSON shapes today might evolve in completely opposite directions tomorrow (e.g., customer receipt vs. warehouse packing slip). Merging two things *only* because their code looks similar right now creates **accidental coupling**—sometimes duplication is cheaper than the wrong abstraction.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Aim for high cohesion (related logic lives together) and low coupling (modules communicate through stable abstractions rather than peeking into each other’s internals).',
      codeExamples: [],
    },
    {
      id: 'topic-7.1.6',
      topicId: '7.1.6',
      coveredTopicIds: ['7.1.7'],
      title: 'Dependency management and Dependency Inversion',
      problemAndRequirementsMarkdown: [
        '### First principles: Which direction do your `import` arrows point?',
        'Suppose `OrderService` sits at the heart of your company’s revenue logic. Inside `orderService.ts`, line 1 says `import { pool } from "../db/postgres"` and line 2 says `import { stripeClient } from "../payments/stripe"`.',
        '',
        'Wait—think about what that `import` arrow just did:',
        '- Your **core business logic** (`OrderService`) directly depends on **low-level infrastructure details** (`pg` driver & Stripe SDK)!',
        '- Try writing a unit test for `placeOrder()` now: Jest/Vitest imports `orderService.ts`, which immediately executes `postgres.ts` and `stripe.ts`, demanding live `DATABASE_URL` and `STRIPE_KEY` env vars!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Flipping the arrow with Dependency Inversion',
        '1. **Dependency Management**: Controlling what depends on what so the Dependency Graph forms a clean, acyclic tree (no circular imports!) where volatile details don’t infect stable core logic.',
        '2. **Dependency Inversion Principle (DIP)**: High-level policy/business logic should **not** depend on low-level implementation details. **Both should depend on an abstraction (interface)!**',
        '   - Instead of `OrderService` importing `StripeClient`, `OrderService` defines an interface it needs: `interface PaymentGateway { charge(amountCents: number, token: string): Promise<Receipt>; }`.',
        '   - Now `StripePaymentGateway` imports that interface and implements it!',
        '   - Look at what happened to the source-code dependency arrow: **Stripe now depends on OrderService’s contract**, instead of OrderService depending on Stripe! In tests, you pass a fast 5-line `InMemoryPaymentGateway` with zero network calls.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Manage dependencies so volatile infrastructure (SQL drivers, third-party APIs) implements interfaces defined by core business logic—inverting the dependency arrow.',
      codeExamples: [
        {
          snippet: {
            id: '7.1-dip-example',
            title: 'Tight concrete coupling vs. Dependency Inversion',
            language: 'typescript',
            code: `// BEFORE: High-level business logic directly coupled to low-level Postgres & Stripe
// import { pgPool } from "../infra/postgres";
// import { stripe } from "../infra/stripe";

// AFTER: Business module defines the abstract interface it needs
export interface PaymentGateway {
  charge(customerId: string, amountCents: number): Promise<{ chargeId: string }>;
}

export interface OrderRepo {
  save(order: { id: string; totalCents: number }): Promise<void>;
}

export class OrderService {
  constructor(
    private readonly payments: PaymentGateway, // Abstraction, not Stripe!
    private readonly orders: OrderRepo         // Abstraction, not pg.Pool!
  ) {}

  async checkout(customerId: string, totalCents: number) {
    if (totalCents <= 0) throw new Error("Order total must be positive");
    const { chargeId } = await this.payments.charge(customerId, totalCents);
    await this.orders.save({ id: chargeId, totalCents });
    return { chargeId, totalCents };
  }
}`,
          },
          lineByLineMarkdown:
            '- `OrderService` has zero `import` statements pointing to `pg` or `stripe`.\n- `StripePaymentGateway` and `PostgresOrderRepo` live in infrastructure and depend *inward* on `PaymentGateway` and `OrderRepo`.\n- Testing `checkout` now takes plain in-memory objects and runs in microseconds.',
        },
      ],
    },
  ],
  conceptConnection: {
    title: 'How the seven complexity concepts reinforce one another',
    narrativeMarkdown: [
      'Notice how clean code organization emerges from one logical chain:',
      '1. One giant file fails because unrelated **concerns** collide (`7.1.1`, `7.1.2`).',
      '2. Grouping by concern increases **cohesion** inside modules and lowers **coupling** between them (`7.1.3`, `7.1.4`).',
      '3. Hiding concrete mechanics behind clear **abstractions** (`7.1.5`) lets you control **dependency direction** (`7.1.6`) and apply **dependency inversion** (`7.1.7`) so business rules stay pure and testable.',
    ].join('\n\n'),
    integratedExample: {
      id: '7.1-integrated-example',
      title: 'Dependency Direction Without vs. With Dependency Inversion',
      language: 'text',
      code: `Tight Coupling (Fragile):
  HTTP Route ──▶ OrderService ──▶ pg.Pool (SQL)
                              ──▶ Stripe SDK (HTTP)
  (Cannot test OrderService without Postgres + Stripe!)

Dependency Inversion (Test-friendly & Decoupled):
  HTTP Route ──▶ OrderService ──▶ [PaymentGateway interface] ◀── StripeGateway
                              ──▶ [OrderRepo interface]      ◀── PostgresOrderRepo
  (Notice the arrows at the right flipped INWARD toward OrderService's contracts!)`,
    },
    walkthroughMarkdown:
      'Every architecture unit in the rest of Block 7 (`7.2`–`7.5`) builds directly on these exact dependency arrows.',
  },
  questions: [
    {
      id: '7.1-kc-1',
      focusArea: 'Coupling & Cohesion',
      prompt:
        'What is the difference between **coupling** and **cohesion**? Give an example of a backend codebase with *low cohesion* and *high coupling*, and explain how **separation of concerns** improves both.',
      hints: [
        'One measures relationships *within* a module; the other measures dependencies *between* modules.',
        'Think about an endpoint handler that mixes SQL queries, pricing math, and HTML formatting vs. a `utils.ts` junk drawer.',
        'Cohesion measures how closely code *inside* one module serves one unified purpose; coupling measures how tightly *separate* modules depend on each other’s internals.',
      ],
      explanation:
        '**Cohesion** measures how tightly the functions and data inside a single module belong to one focused purpose (high cohesion = good; a random `misc.ts` junk drawer = low cohesion). **Coupling** measures how much one module breaks when another module’s internals change (low coupling = good; controllers touching raw DB rows = high coupling). **Separation of concerns** puts related logic into cohesive modules that talk across narrow boundaries.',
      evaluationCriteria: [
        'Correctly contrasts intra-module cohesion vs inter-module coupling',
        'Provides a realistic backend example showing how SoC improves both',
      ],
      topicIds: ['7.1.1', '7.1.2', '7.1.3', '7.1.4'],
    },
    {
      id: '7.1-kc-2',
      focusArea: 'Abstraction & Dependency Inversion',
      prompt:
        'How does **Dependency Inversion** solve the problem of core business logic depending directly on a Postgres client or Stripe SDK—and what concrete benefit does that give you during testing or vendor swaps?',
      hints: [
        'Which module defines the `interface` (`PaymentGateway`), and which module implements it?',
        'Look at the direction of `import` statements when `OrderService` accepts an interface instead of `new Stripe(...)`.',
        'The high-level business module defines the `PaymentGateway` interface, and the low-level Stripe adapter implements it—flipping the import arrow so core logic has zero vendor imports and runs against fast in-memory fakes in tests.',
      ],
      explanation:
        'Without **dependency inversion**, high-level business services import low-level infrastructure SDKs directly (`pg`, `stripe`), coupling business rules to live network/DB details. With DIP, the business layer defines an **abstraction** (`interface PaymentGateway`) and infrastructure implements it—inverting source-code dependencies so business logic can be unit-tested with simple fakes and infrastructure can be swapped without rewriting domain rules.',
      evaluationCriteria: [
        'Explains defining interfaces in the business/policy layer implemented by infrastructure',
        'Identifies testability and vendor decoupling as concrete outcomes',
      ],
      topicIds: ['7.1.5', '7.1.6', '7.1.7'],
    },
  ],
};

export const LESSON_7_2_FPT: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Knowing you should “separate concerns” is great—until you stare at a blank `src/` folder wondering: *“Where exactly do HTTP controllers go? Where do SQL queries live? Should a controller call a repository directly, or go through a service? And how do layers share data cleanly without leaking DB rows straight out as HTTP JSON?”*',
      'In this unit, we’ll examine **Layered Backend Architecture**—the most widespread mental model in backend engineering: the **five layers** (Presentation, Application/Service, Domain, Data Access, Infrastructure), **Controller vs. Service**, the **Repository pattern**, **DTOs & mapping**, and **Dependency Injection**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Layered architecture gives every team a predictable map: when a bug hits HTTP status codes, validation, business workflows, or SQL queries, you know immediately which layer owns it—and which layers should *not* touch it.',
    prerequisites: [
      {
        subBlockId: '7.1',
        label: 'Separation of concerns & Dependency Inversion (7.1)',
        detail: 'Understanding why HTTP, business logic, and SQL belong in distinct cohesive layers.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-7.2.1',
      topicId: '7.2.1',
      coveredTopicIds: ['7.2.2', '7.2.3', '7.2.4', '7.2.5'],
      title: 'The five layers: Presentation, Application/Service, Domain, Data Access, and Infrastructure',
      problemAndRequirementsMarkdown: [
        '### First principles: Organizing a backend into horizontal responsibilities',
        'Think about what happens to a request from the instant TCP bytes hit Express/Fastify to the moment Postgres updates disk:',
        '1. Someone must speak HTTP (headers, status codes, route params, body schema validation).',
        '2. Someone must orchestrate the multi-step use case (*“Look up user, debit wallet, save order, enqueue receipt job”*).',
        '3. Someone must enforce pure business rules (*“Can’t refund an order older than 30 days”*).',
        '4. Someone must read and persist records.',
        '5. Someone must hold concrete plumbing (Postgres pools, Redis clients, SMTP mailers, Stripe HTTP SDKs).',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### How the five layers divide that journey',
        '1. **Presentation Layer (Controllers / Routes / Middleware)**: Translates external requests (HTTP/GraphQL/gRPC) into clean inputs and turns results/errors back into HTTP status codes + JSON. **Contains zero business rules or SQL.**',
        '2. **Application / Service Layer (Use Cases)**: Coordinates a specific application workflow (`createOrder`, `transferFunds`): starts transactions, fetches records via repositories, invokes domain logic, saves changes, and triggers side effects like sending emails.',
        '3. **Domain / Business Logic Layer**: Holds pure rules, calculations, and invariants (*“How are late fees calculated?”*, *“When is a subscription active?”*) independent of HTTP or SQL.',
        '4. **Data Access Layer (Repositories / Queries)**: Encapsulates how entities are fetched and persisted (`orderRepo.findById`, `orderRepo.save`), hiding raw SQL or ORM query syntax from services.',
        '5. **Infrastructure Layer**: The outer technical plumbing—Postgres connection pool, Redis client, logger, Stripe/S3 adapters, config loaders—implementing interfaces required by inner layers.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Each layer has one job: Presentation speaks HTTP, Application orchestrates use cases, Domain holds pure business rules, Data Access encapsulates storage queries, and Infrastructure provides concrete drivers/SDKs.',
      codeExamples: [],
    },
    {
      id: 'topic-7.2.6',
      topicId: '7.2.6',
      coveredTopicIds: ['7.2.7', '7.2.8', '7.2.9'],
      title: 'Controller vs service, Repository pattern, DTOs & mapping, and Dependency Injection',
      problemAndRequirementsMarkdown: [
        '### First principles: Four practical patterns that keep boundaries crisp',
        'Teams frequently start with layers and still drift into messiness because of four subtle mistakes:',
        '- Letting **Controllers** do business validation (“thin service, fat controller”).',
        '- Returning raw **ORM/DB row objects** (including `password_hash` and `internal_notes`!) straight out of `res.json(user)`.',
        '- Scattering raw `SELECT ...` strings inside `Service` functions.',
        '- Creating singletons everywhere (`import db from "./db"`) so nothing can be swapped during tests.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### How each pattern prevents boundary erosion',
        '1. **Controller vs. Service Responsibilities**:',
        '   - **Controller**: Extracts `req.params` / `req.body`, checks request format (Zod), reads `req.user`, calls **one** service method with plain typed inputs, and maps domain errors to HTTP codes (`NotFoundError` → `404`).',
        '   - **Service**: Knows nothing about `req`, `res`, cookies, or status codes! Accepts plain DTOs, runs the business workflow, and returns plain domain/response objects (or throws typed domain errors).',
        '2. **Repository Pattern**: Presents a collection-like interface (`UserRepository.findByEmail(email)`) to the service layer while hiding SQL queries, table joins, or Prisma/Drizzle calls inside the data access implementation.',
        '3. **DTOs (Data Transfer Objects) & Mapping**: Explicit input/output shapes at boundaries (`CreateOrderInput`, `OrderPublicDto`). Mapping DB rows → Domain/DTO objects prevents accidental **over-exposure** (leaking `passwordHash`) and decouples your public API contract from internal database column renames!',
        '4. **Dependency Injection (DI)**: Instead of a `Service` importing a global concrete `PostgresOrderRepo`, the Service declares dependencies in its **constructor/factory arguments** (`createOrderService({ orderRepo, mailer })`). A single **Composition Root** at app startup wires Postgres/Stripe implementations in production—and in-memory fakes in tests!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Keep controllers thin, put workflows in services, hide SQL behind repositories, convert across boundaries with DTOs, and wire implementations cleanly via Dependency Injection at the composition root.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Request flow through a clean Layered Architecture',
    narrativeMarkdown: [
      'Trace `POST /orders` top-to-bottom across the layers of `7.2`:',
      '1. **Presentation (`OrderController`)**: Validates JSON with Zod into `CreateOrderDto`, calls `orderService.placeOrder(dto)`.',
      '2. **Application (`OrderService`)**: Uses injected `ProductRepo`, `OrderRepo`, and `PaymentGateway`.',
      '3. **Domain (`calculateOrderTotals`)**: Pure math checks inventory & computes tax/totals with zero DB/HTTP knowledge.',
      '4. **Data Access + Infrastructure (`PostgresOrderRepo`)**: Executes parameterized SQL inside the DB transaction and maps the row back before the Controller serializes an `OrderResponseDto`.',
    ].join('\n\n'),
    integratedExample: {
      id: '7.2-integrated-example',
      title: 'Layered Request Trace + Dependency Injection Wiring',
      language: 'text',
      code: `HTTP POST /orders
  │
  ▼  [Presentation Layer: OrderController]  ── validates body -> CreateOrderDto
  │
  ▼  [Application Layer: OrderService]      ── orchestrates use case (knows NO HTTP!)
  │     ├──▶ [Domain Logic]                 ── pure pricing/rules (knows NO DB!)
  │     └──▶ [Repository Interface]
  │                ▲
  │                │ implements (Dependency Inversion + DI at Composition Root)
  ▼  [Data Access / Infra: PostgresOrderRepo] ─ parameterized SQL + Row->DTO mapping`,
    },
    walkthroughMarkdown:
      'Switch to the **Recipe** tab to implement a complete working mini-feature using Controller, Service, Domain function, Repository interface + Postgres implementation, DTO mapping, and a Composition Root.',
  },
  questions: [
    {
      id: '7.2-kc-1',
      focusArea: 'Controller vs Service & DTOs',
      prompt:
        'Why should a **Service** never accept Express `req` or `res` objects—and why shouldn’t an endpoint return a raw database/ORM row directly instead of mapping to a **DTO**?',
      hints: [
        'Can a background queue worker or unit test easily construct a fake Express `Request` and `Response`?',
        'What extra fields might live on a `users` DB row (`password_hash`, internal flags), and what happens if you rename a DB column?',
        'Passing `req/res` couples business workflows to HTTP; returning raw DB rows leaks sensitive columns and ties public API JSON contracts directly to internal table schemas.',
      ],
      explanation:
        'If a **Service** depends on `req`/`res`, you cannot invoke it from CLI scripts, cron jobs, queues, or lightweight tests without mocking Express internals. Keeping controllers as thin HTTP translators preserves portability. Mapping DB records through **DTOs** prevents leaking private fields (`passwordHash`) and stops internal column renames from breaking API clients.',
      evaluationCriteria: [
        'Explains why Services should stay protocol-agnostic (no req/res)',
        'Identifies security/leakage and schema-decoupling reasons for output DTO mapping',
      ],
      topicIds: ['7.2.1', '7.2.2', '7.2.6', '7.2.8'],
    },
    {
      id: '7.2-kc-2',
      focusArea: 'Repository Pattern & Dependency Injection',
      prompt:
        'How do the **Repository pattern** and **Dependency Injection** work together across the **Application**, **Data Access**, and **Infrastructure** layers?',
      hints: [
        'How does a Service fetch/save records without writing SQL strings directly?',
        'How does the Service receive the production Postgres repository vs. an in-memory test fake?',
        'The Repository exposes clean persistence methods over an interface; Dependency Injection passes the concrete Postgres repo in production or an in-memory repo in tests from a single Composition Root.',
      ],
      explanation:
        'The **Repository** (`Data Access`) hides raw SQL/ORM mechanics behind domain-focused methods (`findById`, `save`). Using **Dependency Injection**, the **Application/Service** accepts that repository interface via constructor/factory arguments rather than importing a global DB singleton—letting the startup **Composition Root** supply the **Infrastructure** implementation in production and a fast fake in unit tests.',
      evaluationCriteria: [
        'Describes Repository as abstracting persistence mechanics behind domain-oriented methods',
        'Explains DI wiring concrete infrastructure implementations at composition root / tests',
      ],
      topicIds: ['7.2.3', '7.2.4', '7.2.5', '7.2.7', '7.2.9'],
    },
  ],
};

export const LESSON_7_2_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Structure a production backend feature into explicit **Presentation (Controller)**, **Application (Service)**, **Domain**, **Data Access (Repository)**, and **Infrastructure** modules connected with **DTOs** and constructor **Dependency Injection**.',
  whenToUseMarkdown:
    'Use this clean layered structure as the default template for API resources that contain non-trivial business rules, database transactions, or external integrations.',
  setupCommands: [
    {
      id: '7.2-setup-1',
      label: 'Recommended folder layout inside a feature or layered src/',
      command: 'mkdir -p src/orders/{domain,application,infrastructure,presentation}',
      notes: 'Or group horizontally (`controllers/`, `services/`, `repositories/`) for small apps; see `7.3` for feature-first scaling.',
    },
  ],
  coreApisMarkdown: [
    '- **DTO Interfaces (`CreateInvoiceDto`, `InvoicePublicDto`)**: Decouple HTTP payloads and responses from DB table shapes.',
    '- **Domain Pure Functions (`calculateInvoiceTotal`)**: Enforce invariants without I/O.',
    '- **Repository Interface (`InvoiceRepository`)**: Defines persistence contract consumed by the Service.',
    '- **Composition Root (`bootstrap.ts`)**: Instantiates DB pools, repositories, services, and controllers once at startup.',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Define DTOs, pure Domain rules, and the Repository interface (no DB imports!)',
      detailMarkdown:
        'Start from the inside out: pure domain calculation (`7.2.3`), DTO shapes (`7.2.8`), and the `InvoiceRepository` contract (`7.2.7`) that infrastructure will later satisfy.',
      code: {
        id: '7.2-step-1',
        title: 'Domain logic, DTOs, and Repository contract',
        language: 'typescript',
        code: `// domain/invoice.ts — pure Domain Layer (7.2.3) + DTOs (7.2.8)
export interface CreateInvoiceDto {
  customerId: string;
  amountCents: number;
  taxRate: number;
}

export interface InvoicePublicDto {
  id: string;
  customerId: string;
  totalCents: number;
  status: "draft" | "issued";
}

export interface InvoiceRecord extends InvoicePublicDto {
  internalAuditNote: string; // Never exposed in InvoicePublicDto!
}

export function calculateTotalCents(amountCents: number, taxRate: number): number {
  if (amountCents <= 0) throw new Error("Amount must be positive");
  if (taxRate < 0 || taxRate > 0.5) throw new Error("Invalid tax rate");
  return Math.round(amountCents * (1 + taxRate));
}

// application/invoiceRepo.ts — Repository contract (7.2.7)
export interface InvoiceRepository {
  insert(input: { customerId: string; totalCents: number; internalAuditNote: string }): Promise<InvoiceRecord>;
}`,
      },
    },
    {
      stepNumber: 2,
      title: 'Build the Service (Application layer) using injected dependencies and DTO mapping',
      detailMarkdown:
        'Notice `InvoiceService` receives `InvoiceRepository` via **Dependency Injection** (`7.2.9`), invokes domain logic, and explicitly maps the internal record into `InvoicePublicDto` (`7.2.8`).',
      code: {
        id: '7.2-step-2',
        title: 'Application Service + explicit Record-to-DTO mapper',
        language: 'typescript',
        code: `// application/invoiceService.ts — Application/Service Layer (7.2.2)
import {
  calculateTotalCents,
  CreateInvoiceDto,
  InvoicePublicDto,
  InvoiceRecord,
} from "../domain/invoice";
import { InvoiceRepository } from "./invoiceRepo";

function toPublicDto(row: InvoiceRecord): InvoicePublicDto {
  return {
    id: row.id,
    customerId: row.customerId,
    totalCents: row.totalCents,
    status: row.status,
  };
}

export class InvoiceService {
  constructor(private readonly repo: InvoiceRepository) {}

  async issueDraft(dto: CreateInvoiceDto): Promise<InvoicePublicDto> {
    const totalCents = calculateTotalCents(dto.amountCents, dto.taxRate);
    const saved = await this.repo.insert({
      customerId: dto.customerId,
      totalCents,
      internalAuditNote: "Issued via API v1",
    });
    return toPublicDto(saved);
  }
}`,
      },
    },
    {
      stepNumber: 3,
      title: 'Implement Postgres Repository (Data Access + Infra), thin Controller (Presentation), and Composition Root',
      detailMarkdown:
        'Wire concrete Postgres SQL inside `PostgresInvoiceRepository`, keep the controller purely HTTP-focused (`7.2.6`), and inject everything together in `bootstrap.ts` (`7.2.9`).',
      code: {
        id: '7.2-step-3',
        title: 'Repository implementation, Controller, and Composition Root wiring',
        language: 'typescript',
        code: `// infrastructure/postgresInvoiceRepo.ts — Data Access (7.2.4) & Infra (7.2.5)
import { Pool } from "pg";
import { InvoiceRepository } from "../application/invoiceRepo";
import { InvoiceRecord } from "../domain/invoice";

export class PostgresInvoiceRepository implements InvoiceRepository {
  constructor(private readonly pool: Pool) {}

  async insert(input: { customerId: string; totalCents: number; internalAuditNote: string }): Promise<InvoiceRecord> {
    const { rows } = await this.pool.query(
      \`INSERT INTO invoices (customer_id, total_cents, status, internal_audit_note)
       VALUES ($1, $2, 'draft', $3)
       RETURNING id, customer_id, total_cents, status, internal_audit_note\`,
      [input.customerId, input.totalCents, input.internalAuditNote]
    );
    const r = rows[0];
    return {
      id: r.id,
      customerId: r.customer_id,
      totalCents: r.total_cents,
      status: r.status,
      internalAuditNote: r.internal_audit_note,
    };
  }
}

// presentation/invoiceController.ts — Presentation Layer (7.2.1, 7.2.6)
export function createInvoiceController(service: InvoiceService) {
  return {
    create: async (req: any, res: any) => {
      const dto = {
        customerId: String(req.body.customerId),
        amountCents: Number(req.body.amountCents),
        taxRate: Number(req.body.taxRate),
      };
      const result = await service.issueDraft(dto);
      res.status(201).json(result);
    },
  };
}

// bootstrap.ts — Composition Root (Dependency Injection 7.2.9)
export function buildApp(pool: Pool) {
  const invoiceRepo = new PostgresInvoiceRepository(pool);
  const invoiceService = new InvoiceService(invoiceRepo);
  return createInvoiceController(invoiceService);
}`,
      },
    },
  ],
  workingExamples: [
    {
      id: '7.2-ex-test',
      title: 'Zero-DB unit test enabled by Dependency Injection & Repository pattern',
      language: 'typescript',
      code: `// Test InvoiceService in 1ms with an in-memory repository!
const fakeRepo: InvoiceRepository = {
  async insert(input) {
    return {
      id: "inv_1",
      customerId: input.customerId,
      totalCents: input.totalCents,
      status: "draft",
      internalAuditNote: input.internalAuditNote,
    };
  },
};

const svc = new InvoiceService(fakeRepo);
const out = await svc.issueDraft({ customerId: "c_1", amountCents: 1000, taxRate: 0.1 });
// out === { id: "inv_1", customerId: "c_1", totalCents: 1100, status: "draft" }
// internalAuditNote is stripped by DTO mapping!`,
      explanation:
        'Notice how every concept in `7.2` pays off immediately: clean unit testing without Postgres, hidden internal columns via DTOs, and strict controller/service/repository separation.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Creating an "anemic pass-through" controller -> service -> repo where every file just forwards the same object with zero validation, domain rules, or mapping.',
      fix: 'Keep simple CRUD direct if no domain logic exists, or genuinely enforce domain invariants, transactions, and DTO boundaries in Service/Domain.',
    },
    {
      mistake: 'Returning `rows[0]` directly from Repository to Controller (`snake_case` DB columns + internal metadata exposed as API JSON).',
      fix: 'Map DB rows to typed domain records inside the Repository and map domain records to explicit response DTOs before returning from the Service.',
    },
    {
      mistake: 'Having Controller A import Repository B directly while bypassing Service checks.',
      fix: 'Controllers only call Services; only Services interact with Repositories.',
    },
  ],
  exercise: {
    id: '7.2-ex',
    title: 'Build a Layered Refund Endpoint With DI & DTO Mapping',
    instructionsMarkdown:
      'Extend the layered pattern above for `POST /invoices/:id/refund`:\n1. Pure Domain function `assertRefundable(invoice, now)` enforcing that only `"issued"` invoices within 30 days can be refunded.\n2. `InvoiceRepository` method + Postgres implementation.\n3. `InvoiceService.refundInvoice(invoiceId, actorId)` wired via constructor DI.\n4. Thin Controller translating errors to `400`/`404` and returning a mapped `InvoicePublicDto`.',
    acceptanceChecklist: [
      'Controller has zero SQL and zero business date/status logic',
      'Service accepts repository via Dependency Injection (testable without Postgres)',
      'DTO mapping explicitly selects public fields rather than returning raw SQL rows',
      'Domain rule (`assertRefundable`) is a pure testable function',
    ],
  },
};
