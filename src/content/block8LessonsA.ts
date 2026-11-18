import { FptLessonContent, RecipeLessonContent } from '../types';

export const LESSON_8_1_FPT: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Up to now, you’ve verified features by running the server, firing a couple of `curl` or Postman calls, and glancing at the console. That works while your app has three endpoints. The afternoon your codebase reaches 40 endpoints and two teammates ship changes to pricing and auth at the same time, manually clicking around stops catching subtle regressions—and deploying feels like rolling dice.',
      'In this unit, we’ll establish **Testing Fundamentals** from first principles: **why software requires automated tests**, **unit vs. integration vs. end-to-end testing**, **test isolation**, **mocks, stubs, and fakes**, **test fixtures**, **deterministic tests**, **regression testing**, and **contract testing**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Good tests aren’t busywork for coverage metrics—they are an automated safety net that lets you refactor architecture, upgrade dependencies, and deploy multiple times a day without fear.',
    prerequisites: [
      {
        subBlockId: '7.2',
        label: 'Layered Backend Architecture & DI (7.2)',
        detail: 'Understanding how Dependency Injection separates pure business logic from I/O adapters.',
      },
      {
        subBlockId: '3.3',
        label: 'API request & response contracts (3.3)',
        detail: 'Recognizing that external consumers rely on stable JSON shapes and status codes.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-8.1.1',
      topicId: '8.1.1',
      coveredTopicIds: ['8.1.2', '8.1.3', '8.1.4'],
      title: 'Why software requires testing — and Unit vs. Integration vs. End-to-End tests',
      problemAndRequirementsMarkdown: [
        '### First principles: Why manual testing fails as systems grow',
        'Imagine modifying your tax calculation rule in `checkout.ts`. Did that break VIP discount stacking? Did it break `POST /refunds`? Did it cause `GET /invoices` to return `NaN` when a subtotal is `0`?',
        '',
        'Checking every edge case manually takes 20 minutes per edit—so engineers skip checking old features, and bugs quietly reach production. Automated tests encode expected behavior once and re-verify hundreds of scenarios in seconds before any user is affected.',
        '',
        '### Deriving the test pyramid: Not every test should boot the whole universe',
        'If every test spins up Docker, Postgres, Redis, and an HTTP server, 500 tests take 45 minutes—so nobody runs them locally. Instead, tests divide into **three scopes trading speed against realism**:',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Comparing Unit, Integration, and End-to-End (E2E) tests',
        '1. **Unit Testing**: Tests **one small piece of logic in isolation** (e.g., `calculateDiscount(subtotal, tier)` or an aggregate invariant) with zero real database or network calls. Runs in **milliseconds** and pinpoints the exact broken function.',
        '2. **Integration Testing**: Tests **how real components collaborate across boundaries**—for instance, does `OrderController -> OrderService -> PostgresOrderRepo` actually parse HTTP JSON, write rows to real PostgreSQL, trigger unique constraints, and return `201`? Slower (hundreds of ms), catches SQL/serialization/wiring bugs unit tests miss.',
        '3. **End-to-End (E2E) Testing**: Exercises a **complete user journey across the live running system** (e.g., signup → verify email → checkout → webhook callback). Highest realism, slowest and most brittle to maintain—reserve E2E for critical revenue/auth paths rather than testing 50 validation typos.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Automated tests replace slow manual checks with fast feedback: write fast Unit tests for pure rules, Integration tests for DB/HTTP boundaries, and a lean set of E2E tests for critical full-system flows.',
      codeExamples: [],
    },
    {
      id: 'topic-8.1.5',
      topicId: '8.1.5',
      coveredTopicIds: ['8.1.6', '8.1.7', '8.1.8'],
      title: 'Test isolation, test doubles (mocks, stubs, fakes), fixtures, and determinism',
      problemAndRequirementsMarkdown: [
        '### First principles: Why “flaky” tests are worse than no tests',
        'Have you ever seen a test suite pass on Tuesday, fail randomly on Wednesday morning, and pass again when you click “Re-run”? When tests fail unpredictably, engineers stop trusting red builds and blindly hit retry until a real bug slips into production!',
        '',
        'Flakiness usually comes from three broken assumptions:',
        '- **Shared mutable state**: Test A inserts `user@test.com`; Test B crashes unless Test A ran first!',
        '- **Non-deterministic inputs**: Calling `new Date()`, `Math.random()`, or live external APIs like Stripe inside tests.',
        '- **Fragile test doubles**: Over-mocking internal implementation details so refactoring breaks tests even though behavior stayed identical.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Building rock-solid, isolated, deterministic tests',
        '1. **Test Isolation**: Every test case must pass **alone, in any order, or in parallel**. Clean or roll back database state between tests (truncate tables, use per-test transactions, or isolate schemas) and never leak global singletons across specs.',
        '2. **Test Fixtures**: Reusable, explicit **seed data / factory builders** (`makeUser({ role: "admin" })`, `seedPaidInvoice()`) that create clean known starting states per test instead of relying on one giant shared magic seed script.',
        '3. **Deterministic Tests**: Same commit → same result **100% of the time**. Control non-deterministic boundaries by injecting a **Clock** (`now: () => new Date("2026-01-01T00:00:00Z")`), fixed ID generators, and local test doubles for external HTTP vendors—never depend on wall-clock timing (`setTimeout(50)`) or public internet APIs.',
        '4. **Mocks, Stubs, and Fakes** *(three distinct "test doubles"!)*:',
        '   - **Stub**: Returns canned hardcoded answers (*“When `exchangeRate.get("EUR")` is called, always return `0.92`”*). Doesn’t assert call history.',
        '   - **Fake**: A **real working lightweight implementation** (*“An `InMemoryEmailOutbox` array or in-memory `UserRepo` Map”*) that behaves like production without slow external I/O. Usually the cleanest double!',
        '   - **Mock**: An object programmed with **call expectations** (*“Verify `mailer.send()` was called exactly once with `receipt@acme.com`”*). Useful at outbound side-effect boundaries, dangerous if used everywhere because mocking internals couples tests to how code is written rather than what it produces.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Keep tests deterministic and isolated with per-test fixtures, controlled clocks/randomness, and lightweight Fakes or Stubs at external boundaries rather than brittle mocks of internal methods.',
      codeExamples: [
        {
          snippet: {
            id: '8.1-doubles-clock',
            title: 'Deterministic test using a Fake repository, Stub rate, and injected Clock',
            language: 'typescript',
            code: `// Production code accepts time & dependencies cleanly
export interface Clock { now(): Date }
export interface ReceiptMailer { send(to: string, totalCents: number): Promise<void> }

export async function renewSubscription(
  userEmail: string,
  clock: Clock,
  mailer: ReceiptMailer
) {
  const renewedUntil = new Date(clock.now().getTime() + 30 * 86_400_000);
  await mailer.send(userEmail, 2900);
  return { renewedUntil };
}

// Deterministic Test: zero wall-clock drift, zero SMTP network calls!
const sentEmails: Array<{ to: string; totalCents: number }> = [];
const fakeMailer: ReceiptMailer = {
  async send(to, totalCents) { sentEmails.push({ to, totalCents }); },
};
const fixedClock: Clock = { now: () => new Date("2026-03-01T00:00:00.000Z") };

const res = await renewSubscription("ada@acme.io", fixedClock, fakeMailer);
// Asserts exact date "2026-03-31T00:00:00.000Z" and sentEmails.length === 1 every time!`,
          },
          lineByLineMarkdown:
            '- `fixedClock` removes wall-clock timing variance so date math never breaks at midnight or on leap days.\n- `fakeMailer` works like a real mailbox in memory, letting us inspect actual state (`sentEmails`) rather than brittle mock internals.',
        },
      ],
    },
    {
      id: 'topic-8.1.9',
      topicId: '8.1.9',
      coveredTopicIds: ['8.1.10'],
      title: 'Regression testing and contract testing',
      problemAndRequirementsMarkdown: [
        '### First principles: Two special failures that normal unit tests miss',
        '1. **The Returning Bug**: A subtle bug slips into production—say, coupons apply twice if a request contains lowercase `"save20"` and `"SAVE20"`. You fix the `if` condition, ship, and move on. Three months later a refactor removes `.toLowerCase()`, and the **exact same bug** comes back!',
        '2. **The Silent API Break**: Your backend team renames `{ "total_cents": 500 }` to `{ "total": 500 }`. All your backend unit tests still pass 100%! Yet your mobile app and partner webhook consumers crash in production because the **external agreement** changed!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Preventing repeat bugs and cross-service schema breaks',
        '1. **Regression Testing**: Every time a bug escapes to production (or gets caught late in QA), **write a failing test that reproduces that exact bug *before* writing the fix**. Once fixed, that test stays in your suite forever—guaranteeing the regression can never silently reappear.',
        '2. **Contract Testing**: Verifies that a **Provider** (your API or event publisher) and a **Consumer** (frontend, mobile app, or downstream microservice) agree on exact request shapes, response fields, headers, and status codes—**without spinning up full E2E staging environments**. You can enforce contracts via shared OpenAPI/Zod schema validation tests or consumer-driven contract tools (like Pact) in seconds.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Turn every escaped bug into a permanent regression test, and use contract tests against shared schemas to catch breaking API changes before consumers hit production.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'How testing layers combine on a real backend service',
    narrativeMarkdown: [
      'Think of your test suite as a balanced portfolio protecting one payment service:',
      '- **Unit tests** verify discount math and aggregate invariants in `<5ms` using deterministic clocks and fixtures.',
      '- **Integration tests** verify Express routes, auth checks, and real SQL queries in isolation.',
      '- **Contract tests** lock down your OpenAPI/Zod response shapes so renaming a field fails CI immediately.',
      '- **Regression tests** ensure past bugs never return, while a tiny **E2E** smoke suite proves the live stack boots cleanly.',
    ].join('\n\n'),
    integratedExample: {
      id: '8.1-integrated-example',
      title: 'Balanced Backend Testing Portfolio',
      language: 'text',
      code: `Layer          Speed     Scope                        Doubles / Realism
───────────────────────────────────────────────────────────────────────────────
Unit           ~1 ms     Domain rules, pure logic     Fakes / Stubs / Fixed Clock
Integration    ~100 ms   Routes + Auth + Real SQL     Real DB + Stubbed 3rd-party HTTP
Contract       ~20 ms    API / Event JSON schemas     OpenAPI / Zod / Pact assertions
E2E            Seconds   Critical signup/pay flows    Full booted system`,
    },
    walkthroughMarkdown:
      'Head over to the **Recipe** tab next to see a runnable Vitest/TypeScript setup combining fixtures, fakes, unit tests, and schema contract assertions.',
  },
  questions: [
    {
      id: '8.1-kc-1',
      focusArea: 'Unit, Integration & E2E Trade-offs',
      prompt:
        'Why shouldn’t a backend team rely **only** on unit tests—and why shouldn’t they replace unit tests with 500 slow **end-to-end** tests either?',
      hints: [
        'What bugs happen *between* components (like a wrong SQL column name or broken Express JSON middleware) that unit tests with in-memory fakes never see?',
        'What happens to developer speed and build flakiness if every small rule requires a full booted E2E suite?',
        'Unit tests miss real SQL, serialization, and auth wiring bugs (caught by Integration tests), while hundreds of E2E tests are slow and brittle; combine fast unit tests for logic with targeted integration and lean E2E tests.',
      ],
      explanation:
        'Pure **unit tests** run in milliseconds and verify domain rules, but because they replace Postgres/HTTP with doubles they miss SQL errors, JSON serialization mismatches, and middleware ordering bugs (**integration tests** catch these). Meanwhile, heavy **E2E suites** take minutes and flake easily—making them ideal only as a slim smoke layer over critical journeys.',
      evaluationCriteria: [
        'Explains blind spots of unit-only testing (DB/HTTP/wiring boundaries)',
        'Explains speed and flakiness costs of excessive E2E testing',
      ],
      topicIds: ['8.1.1', '8.1.2', '8.1.3', '8.1.4'],
    },
    {
      id: '8.1-kc-2',
      focusArea: 'Isolation, Doubles & Determinism',
      prompt:
        'Compare a **Stub**, a **Fake**, and a **Mock**—and explain two concrete causes of non-deterministic (flaky) tests plus how **test isolation** and **fixtures** prevent order-dependent failures.',
      hints: [
        'Which double provides a working lightweight implementation (like an in-memory Map repo), which returns canned values, and which asserts exact call expectations?',
        'Consider `new Date()`, `Math.random()`, live network calls, and shared DB rows across tests.',
        'Stubs return canned data, Fakes implement lightweight working behavior, and Mocks verify interactions. Injecting clocks/seeds eliminates time/random flakiness, while per-test fixtures and cleanup isolate state.',
      ],
      explanation:
        'A **Stub** returns fixed responses; a **Fake** is a simplified working implementation (like an in-memory repository); a **Mock** records and asserts specific method calls. Injecting fixed clocks/random seeds and stubbing external HTTP removes non-determinism, while resetting DB state and building fresh **fixtures** per test guarantees **isolation** regardless of execution order.',
      evaluationCriteria: [
        'Accurately distinguishes Stub, Fake, and Mock',
        'Identifies determinism controls (clock/random/network) and state isolation via fixtures/cleanup',
      ],
      topicIds: ['8.1.5', '8.1.6', '8.1.7', '8.1.8'],
    },
    {
      id: '8.1-kc-3',
      focusArea: 'Regression & Contract Testing',
      prompt:
        'After fixing a production bug where uppercase coupon codes failed, what makes a **regression test** valuable—and how does **contract testing** prevent your API from accidentally breaking frontend or partner consumers?',
      hints: [
        'How do you prove your fix works today AND stays fixed six months from now?',
        'Why can internal backend unit tests pass even after you rename a JSON response field?',
        'A regression test locks in the exact failing reproducer permanently; contract testing validates API request/response schemas against shared consumer expectations so breaking field/status changes fail CI immediately.',
      ],
      explanation:
        'Writing a **regression test** that reproduces the exact uppercase-coupon failure before fixing it proves the fix and ensures future refactors never reintroduce it. **Contract testing** verifies your endpoints against shared OpenAPI/Zod or consumer expectations so renaming or dropping fields fails CI even when internal unit tests still pass.',
      evaluationCriteria: [
        'Explains permanent lock-in value of regression tests written from real bug repros',
        'Explains contract testing as verifying producer/consumer API compatibility without full E2E',
      ],
      topicIds: ['8.1.9', '8.1.10'],
    },
  ],
};

export const LESSON_8_1_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Set up a fast, deterministic backend test suite using Vitest with clean test fixtures, Fake/Stub doubles, regression test conventions, and Zod/OpenAPI schema contract checks.',
  whenToUseMarkdown:
    'Use this baseline test harness for every TypeScript backend module before wiring full database integration containers (`8.2`).',
  setupCommands: [
    {
      id: '8.1-setup-1',
      label: 'Install Vitest for fast TypeScript unit and contract testing',
      command: 'npm install -D vitest',
      notes: 'Add `"test": "vitest run"` to package.json scripts.',
    },
  ],
  coreApisMarkdown: [
    '- **`describe` / `it` / `expect`**: Expressive grouping and assertions with crisp diffs.',
    '- **`beforeEach`**: Resets fake stores or fixtures so every test runs in strict isolation.',
    '- **`vi.fn()` / typed Fakes**: Create lightweight in-memory repositories or spy on outbound ports.',
    '- **`zodSchema.safeParse(responseBody)`**: Enforces strict response contract checks inside tests.',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Create explicit factory Fixtures so every test builds isolated inputs',
      detailMarkdown:
        'Never mutate a single global test object across specs. Write tiny `build*` factory helpers (`8.1.7`) with sensible defaults and partial overrides.',
      code: {
        id: '8.1-step-1',
        title: 'Deterministic test fixture factory',
        language: 'typescript',
        code: `// test/fixtures/orderFixture.ts
export interface OrderInput {
  id: string;
  customerTier: "standard" | "vip";
  subtotalCents: number;
  couponCode?: string;
}

let seq = 0;
export function buildOrderFixture(overrides: Partial<OrderInput> = {}): OrderInput {
  seq += 1;
  return {
    id: \`ord_\${seq}\`,
    customerTier: "standard",
    subtotalCents: 10_000,
    ...overrides,
  };
}`,
      },
    },
    {
      stepNumber: 2,
      title: 'Write isolated Unit & Regression tests using Fakes and fixed Clocks',
      detailMarkdown:
        'Keep state local inside `beforeEach` (`8.1.5`, `8.1.8`) and capture past edge-case bugs as named regression specs (`8.1.9`).',
      code: {
        id: '8.1-step-2',
        title: 'Unit + regression test with deterministic clock',
        language: 'typescript',
        code: `import { describe, it, expect, beforeEach } from "vitest";
import { buildOrderFixture } from "./fixtures/orderFixture";

function priceOrder(input: ReturnType<typeof buildOrderFixture>, now: Date): number {
  const isVip = input.customerTier === "vip";
  const normalizedCoupon = input.couponCode?.trim().toUpperCase();
  let total = isVip ? Math.round(input.subtotalCents * 0.8) : input.subtotalCents;
  if (normalizedCoupon === "SAVE10" && now.getUTCFullYear() === 2026) {
    total = Math.max(0, total - 1000);
  }
  return total;
}

describe("priceOrder", () => {
  const fixedNow = new Date("2026-05-01T12:00:00Z");

  it("applies 20% VIP discount deterministically", () => {
    const order = buildOrderFixture({ customerTier: "vip", subtotalCents: 5000 });
    expect(priceOrder(order, fixedNow)).toBe(4000);
  });

  // Regression test for Issue #142: lowercase coupon codes failed matching
  it("regression #142: handles lowercase and whitespace-padded coupon codes", () => {
    const order = buildOrderFixture({ subtotalCents: 5000, couponCode: " save10 " });
    expect(priceOrder(order, fixedNow)).toBe(4000);
  });
});`,
      },
    },
    {
      stepNumber: 3,
      title: 'Verify public API response shapes with a Contract Test',
      detailMarkdown:
        'Validate serialized outputs against the exact consumer Zod contract (`8.1.10`) so breaking renames or missing fields fail CI immediately.',
      code: {
        id: '8.1-step-3',
        title: 'API response schema contract test',
        language: 'typescript',
        code: `import { describe, it, expect } from "vitest";
import { z } from "zod";

const OrderResponseContract = z.object({
  id: z.string(),
  totalCents: z.number().int().nonnegative(),
  currency: z.literal("USD"),
}).strict(); // Fails if unexpected/renamed fields leak out!

it("matches consumer v1 contract shape", () => {
  const payload = { id: "ord_1", totalCents: 4000, currency: "USD" };
  const parsed = OrderResponseContract.safeParse(payload);
  expect(parsed.success).toBe(true);
});`,
      },
    },
    {
      stepNumber: 4,
      title: 'Run tests in isolated random order to expose hidden dependencies',
      detailMarkdown:
        'Enable randomized test order (`vitest --sequence.shuffle`) in CI to prove no test depends on another test running first.',
    },
  ],
  workingExamples: [
    {
      id: '8.1-ex-fake-repo',
      title: 'Lightweight In-Memory Fake Repository with beforeEach reset',
      language: 'typescript',
      code: `class FakeUserRepo {
  private rows = new Map<string, { id: string; email: string }>();
  async save(user: { id: string; email: string }) { this.rows.set(user.id, user); }
  async findById(id: string) { return this.rows.get(id) ?? null; }
  clear() { this.rows.clear(); }
}`,
      explanation:
        'Calling `fakeRepo.clear()` inside `beforeEach` gives you fast stateful tests with complete isolation and zero database startup cost.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Sharing one mutable `const testUser = { ... }` across multiple `it()` blocks.',
      fix: 'Call a `build*` fixture helper inside each test so mutations never leak between cases.',
    },
    {
      mistake: 'Using `new Date()` inside both production code and test assertions ("works on my laptop, fails at UTC midnight").',
      fix: 'Inject a `Clock` interface or freeze fake timers (`vi.setSystemTime`) during tests.',
    },
    {
      mistake: 'Mocking private internal helper calls instead of testing public behavior and state.',
      fix: 'Prefer Fakes/Stubs at external boundaries (DB, HTTP, clock) so refactoring internals doesn’t shatter your tests.',
    },
  ],
  exercise: {
    id: '8.1-ex',
    title: 'Build a Deterministic Unit + Contract + Regression Suite',
    instructionsMarkdown:
      'Create a Vitest test file for a `SubscriptionService` that:\n1. Uses a `buildSubscriptionFixture()` helper (`8.1.7`).\n2. Injects a `FakeBillingPort` and `FixedClock` (`8.1.6`, `8.1.8`).\n3. Includes one named **regression test** for an edge case (e.g., renewing on Feb 28 / canceled trial).\n4. Validates the service’s serialized output against a strict Zod **contract schema** (`8.1.10`).',
    acceptanceChecklist: [
      'Uses fresh per-test fixtures with zero shared mutable global state',
      'Uses a Fake/Stub double and injected Clock for 100% deterministic execution',
      'Includes an explicit regression test and a strict API contract assertion',
    ],
  },
};

export const LESSON_8_2_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Test a real backend end-to-end against **real HTTP routes** and a **real PostgreSQL database**—verifying service logic, endpoint validation, authentication & authorization rules, concurrent race conditions, failure scenarios, and disposable Postgres instances with **Testcontainers**.',
  whenToUseMarkdown:
    'Use whenever unit tests aren’t enough—especially for SQL queries, unique constraints, transaction locks, Express auth middleware, and RBAC/IDOR checks.',
  setupCommands: [
    {
      id: '8.2-setup-1',
      label: 'Install Supertest and Testcontainers for PostgreSQL',
      command: 'npm install -D supertest @types/supertest @testcontainers/postgresql',
      notes: 'Requires Docker running locally/in CI so Testcontainers can boot a clean ephemeral Postgres container.',
    },
  ],
  coreApisMarkdown: [
    '- **`new PostgreSqlContainer("postgres:16-alpine").start()`**: Boots an isolated ephemeral PostgreSQL instance and returns a clean connection string.',
    '- **`supertest(app)`**: Fires real HTTP requests through your Express middleware, parsers, auth, and error handlers without binding a live public port.',
    '- **`Promise.all([...])` concurrency tests**: Fires parallel HTTP/DB calls simultaneously to prove `FOR UPDATE` / unique constraints hold under contention.',
    '- **`TRUNCATE ... RESTART IDENTITY CASCADE`**: Wipes tables between tests in `<5ms` so every test starts clean.',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Boot a real ephemeral PostgreSQL container and run migrations once per suite',
      detailMarkdown:
        'Using **Testcontainers** (`8.2.8`) eliminates "works on my local Postgres, breaks in CI" and tests real PostgreSQL locks, indexes, and SQL syntax instead of lying with SQLite or mocked ORMs.',
      code: {
        id: '8.2-step-1',
        title: 'Testcontainers Postgres setup + schema migration',
        language: 'typescript',
        code: `import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";

let container: StartedPostgreSqlContainer;
let pool: Pool;

export async function setupTestDb() {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  pool = new Pool({ connectionString: container.getConnectionUri() });
  await pool.query(\`
    CREATE TABLE accounts (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      balance_cents INT NOT NULL CHECK (balance_cents >= 0)
    );
  \`);
  return pool;
}

export async function resetTables(pool: Pool) {
  await pool.query("TRUNCATE TABLE accounts RESTART IDENTITY CASCADE");
}

export async function teardownTestDb() {
  await pool?.end();
  await container?.stop();
}`,
      },
    },
    {
      stepNumber: 2,
      title: 'Test real HTTP endpoints, service logic, and DB interactions with Supertest',
      detailMarkdown:
        'Wire your `createApp(pool)` factory (never call `app.listen()` at import time!) so Supertest tests validation (`400`), persistence (`201`/`200`), and real SQL constraints (`8.2.1`, `8.2.2`, `8.2.3`).',
      code: {
        id: '8.2-step-2',
        title: 'Endpoint + service + real Postgres integration test',
        language: 'typescript',
        code: `import request from "supertest";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
// Suppose createApp(pool) wires auth, validation, service, and Postgres repos

describe("Accounts Integration", () => {
  it("persists deposit in Postgres and rejects negative balances", async () => {
    await pool.query("INSERT INTO accounts (id, owner_id, balance_cents) VALUES ('a1', 'u1', 500)");

    // Valid authenticated request (8.2.2, 8.2.3)
    const ok = await request(app)
      .post("/accounts/a1/withdraw")
      .set("Authorization", \`Bearer \${tokenFor("u1")}\`)
      .send({ amountCents: 200 });
    expect(ok.status).toBe(200);
    expect(ok.body.balanceCents).toBe(300);

    // Failure scenario: insufficient funds -> 409 / 400 (8.2.7)
    const overdraw = await request(app)
      .post("/accounts/a1/withdraw")
      .set("Authorization", \`Bearer \${tokenFor("u1")}\`)
      .send({ amountCents: 999 });
    expect(overdraw.status).toBe(409);
  });
});`,
      },
    },
    {
      stepNumber: 3,
      title: 'Explicitly test Authentication (401) and Authorization / IDOR (403/404)',
      detailMarkdown:
        'Every protected route needs tests proving unauthenticated callers fail (`401`) AND signed-in User B cannot touch User A’s resource (`403`/`404`) (`8.2.4`, `8.2.5`).',
      code: {
        id: '8.2-step-3',
        title: 'Testing AuthN and cross-user IDOR AuthZ boundaries',
        language: 'typescript',
        code: `it("returns 401 without token and blocks cross-user IDOR with 403/404", async () => {
  await pool.query("INSERT INTO accounts (id, owner_id, balance_cents) VALUES ('a1', 'u1', 500)");

  const unauth = await request(app).get("/accounts/a1");
  expect(unauth.status).toBe(401);

  const idorAttempt = await request(app)
    .get("/accounts/a1")
    .set("Authorization", \`Bearer \${tokenFor("u2")}\`); // Signed in, wrong owner!
  expect([403, 404]).toContain(idorAttempt.status);
});`,
      },
    },
    {
      stepNumber: 4,
      title: 'Test concurrent operations and infrastructure failure scenarios',
      detailMarkdown:
        'Fire parallel requests with `Promise.all` (`8.2.6`) to prove double-spend/race locking works under Postgres concurrency, and simulate downstream/DB failures (`8.2.7`) to verify clean `503`/`500` handling without crashing.',
      code: {
        id: '8.2-step-4',
        title: 'Concurrent double-withdrawal race test + failure simulation',
        language: 'typescript',
        code: `it("allows only ONE $400 withdrawal when two requests race on a $500 balance", async () => {
  await pool.query("INSERT INTO accounts (id, owner_id, balance_cents) VALUES ('a1', 'u1', 500)");

  const [r1, r2] = await Promise.all([
    request(app).post("/accounts/a1/withdraw").set("Authorization", \`Bearer \${tokenFor("u1")}\`).send({ amountCents: 400 }),
    request(app).post("/accounts/a1/withdraw").set("Authorization", \`Bearer \${tokenFor("u1")}\`).send({ amountCents: 400 }),
  ]);

  const statuses = [r1.status, r2.status].sort();
  expect(statuses).toEqual([200, 409]); // Exactly one wins, one fails!

  const { rows } = await pool.query("SELECT balance_cents FROM accounts WHERE id = 'a1'");
  expect(rows[0].balance_cents).toBe(100);
});`,
      },
    },
  ],
  workingExamples: [
    {
      id: '8.2-ex-failure',
      title: 'Testing failure scenarios with an injected failing port/client',
      language: 'typescript',
      code: `it("rolls back order and returns 502 when payment gateway times out", async () => {
  const failingPaymentPort = {
    charge: async () => { throw new Error("ETIMEDOUT"); },
  };
  const app = createApp(pool, { paymentPort: failingPaymentPort });

  const res = await request(app).post("/orders").send({ itemId: "sku_1" });
  expect(res.status).toBe(502);

  const { rows } = await pool.query("SELECT count(*)::int AS c FROM orders");
  expect(rows[0].c).toBe(0); // Transaction rolled back cleanly!
});`,
      explanation:
        'Real Postgres + injected failure stubs let you assert that failed external API calls roll back local DB state cleanly instead of leaving partial orphan rows.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Using SQLite in-memory (`:memory:`) to test an app that runs PostgreSQL in production.',
      fix: 'SQLite lacks Postgres row locks (`FOR UPDATE`), `JSONB`, `ARRAY`, and partial indexes; use real Postgres via Testcontainers.',
    },
    {
      mistake: 'Testing only the happy path (`200 OK`) and forgetting `401`, `403`, concurrent races, and timeout rollbacks.',
      fix: 'Write dedicated specs for unauthenticated callers, wrong-owner IDOR attempts, parallel double-spends, and external dependency failures.',
    },
    {
      mistake: 'Calling `app.listen(3000)` at the top level of `server.ts`, causing `EADDRINUSE` in tests.',
      fix: 'Export `createApp(deps)` separately from `server.ts` so tests mount `app` directly with `supertest(app)`.',
    },
  ],
  exercise: {
    id: '8.2-ex',
    title: 'Write a Complete Testcontainers + Supertest Integration Suite',
    instructionsMarkdown:
      'Build an integration test file for an `Invoices` API backed by Testcontainers PostgreSQL that covers:\n1. Happy-path endpoint + DB persistence check.\n2. AuthN (`401`) and cross-tenant IDOR (`403`/`404`) verification.\n3. Concurrent `Promise.all` race test on seat/credit deduction.\n4. Downstream failure rollback verification.',
    acceptanceChecklist: [
      'Uses real PostgreSQL via Testcontainers with per-test TRUNCATE isolation',
      'Verifies both authentication (401) and resource-level authorization (403/404)',
      'Includes a `Promise.all` concurrency test proving transaction/locking correctness',
      'Tests an external or DB failure path and verifies clean rollback/status code',
    ],
  },
};

export const LESSON_8_3_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Manage backend configuration cleanly across local development, staging, and production: **environment variables**, fail-fast **Zod config validation**, **dev vs. prod behavior**, **secrets hygiene**, **runtime configuration**, and **database migrations during deployment**.',
  whenToUseMarkdown:
    'Apply this pattern at the startup boundary of every backend service so misconfigured deployments fail in 50ms at boot instead of crashing on a customer request 3 hours later.',
  setupCommands: [
    {
      id: '8.3-setup-1',
      label: 'Install Zod and dotenv for schema-validated config loading',
      command: 'npm install zod dotenv',
      notes: 'Commit `.env.example` with dummy placeholder keys; NEVER commit `.env` with real credentials.',
    },
  ],
  coreApisMarkdown: [
    '- **`z.object({ ... }).safeParse(process.env)`**: Validates all env vars (`DATABASE_URL`, `PORT`, `JWT_SECRET`, `NODE_ENV`) at startup before listening on any port.',
    '- **`z.coerce.number()`**: Converts env string values like `"3000"` cleanly into typed numbers.',
    '- **Separate Runtime Config vs. Build Config**: Never bake prod secrets into build artifacts; read them from environment/secret store at boot.',
    '- **Pre-deploy / Startup Migration Step (`migrate` job)**: Applies versioned schema migrations safely before new app instances serve live traffic.',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Validate every environment variable with a strict Zod schema at boot',
      detailMarkdown:
        'Reading `process.env.STRIPE_KEY!` scattered across 12 files means your server boots happily and crashes at 2 AM when a webhook hits an unconfigured variable. Validate once into a frozen typed `env` object (`8.3.1`, `8.3.2`).',
      code: {
        id: '8.3-step-1',
        title: 'src/config/env.ts — fail-fast validated configuration',
        language: 'typescript',
        code: `import { z } from "zod";
import "dotenv/config"; // Loads .env in local dev only if file exists

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  FEATURE_NEW_BILLING: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1); // Fail fast before binding HTTP port!
}

export const config = Object.freeze(parsed.data);`,
      },
    },
    {
      stepNumber: 2,
      title: 'Separate Dev vs. Prod defaults and protect Secrets cleanly',
      detailMarkdown:
        'Keep **development vs. production** differences explicit through config flags—never `if (hostname === ...)` hacks (`8.3.3`)—and load **secrets** from your cloud secret manager / CI secrets rather than `.env` files in production (`8.3.4`).',
      code: {
        id: '8.3-step-2',
        title: 'Environment-aware behavior without secret leakage',
        language: 'typescript',
        code: `export const isProd = config.NODE_ENV === "production";

export const runtimeSettings = {
  prettyLogs: !isProd,                      // Pretty in dev, JSON lines in prod
  exposeErrorStack: !isProd,                // Stack traces in dev ONLY, never prod HTTP!
  cookieSecure: isProd,                     // Require HTTPS cookies in production
  corsOrigin: isProd ? "https://app.example.com" : "http://localhost:5173",
};`,
      },
    },
    {
      stepNumber: 3,
      title: 'Handle runtime configuration and deployment database migrations safely',
      detailMarkdown:
        'Use **runtime configuration** (env vars, feature flags in DB/Redis) so one immutable Docker image moves cleanly from staging → production (`8.3.5`). Run **backward-compatible migrations** as an explicit pre-traffic deployment step rather than racing across 10 replicas at boot (`8.3.6`).',
      code: {
        id: '8.3-step-3',
        title: 'Safe pre-traffic migration entrypoint pattern',
        language: 'bash',
        code: `# 1. Run idempotent migration job ONCE before rolling out new app containers:
npm run db:migrate

# 2. Boot immutable container with runtime env injected by orchestrator:
NODE_ENV=production PORT=3000 node dist/server.js`,
      },
    },
  ],
  workingExamples: [
    {
      id: '8.3-ex-env-example',
      title: 'Safe .env.example template committed to Git',
      language: 'bash',
      code: `# Safe placeholders ONLY — never put real secrets in .env.example or Git!
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/app_dev
JWT_SECRET=replace_with_at_least_32_char_random_secret
LOG_LEVEL=debug
FEATURE_NEW_BILLING=false`,
      explanation:
        'New engineers copy `.env.example` to `.env` locally, while production injects real secrets from Secret Manager / platform env vars at runtime.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Using `Boolean(process.env.FEATURE_FLAG)` in JavaScript—remember `Boolean("false")` evaluates to `true`!',
      fix: 'Parse string booleans explicitly in Zod (`v === "true"`) or `z.enum(["true", "false"])`.',
    },
    {
      mistake: 'Running `db.migrate()` inside every API replica’s `server.ts` startup when running 6 containers.',
      fix: 'Execute migrations in a dedicated single pre-deploy step (or guarded by a Postgres advisory lock) using backward-compatible expand/contract changes (`5.6`).',
    },
    {
      mistake: 'Logging `console.log("Loaded config:", config)` at startup.',
      fix: 'Never log secret fields (`DATABASE_URL`, `JWT_SECRET`, API keys); log only non-sensitive metadata (`NODE_ENV`, `PORT`, `LOG_LEVEL`).',
    },
  ],
  exercise: {
    id: '8.3-ex',
    title: 'Implement Fail-Fast Typed Config & Safe Deploy Migration Plan',
    instructionsMarkdown:
      'Create a `src/config/env.ts` module plus `.env.example` that:\n1. Validates `NODE_ENV`, `PORT`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` (min 32 chars), and a boolean feature flag with Zod.\n2. Terminates with exit code `1` on missing/invalid vars while keeping secrets out of error output.\n3. Documents dev vs. prod differences and how migrations run safely during deployment without multi-replica race conditions.',
    acceptanceChecklist: [
      'All env vars validated once at boot with Zod (`process.exit(1)` on invalid config)',
      'String boolean flags handled safely without `Boolean("false") === true` bug',
      'Secrets excluded from Git (`.env` ignored, `.env.example` placeholder-only) and logs',
      'Migrations separated into a single pre-traffic step or advisory-locked job',
    ],
  },
};
