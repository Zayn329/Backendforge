import { FptLessonContent } from '../types';

export const LESSON_0_1: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Before we write TypeScript services, we need to understand **what TypeScript actually checks—and what disappears before your server ever runs**.',
      'In this unit, we’ll build four core ideas from first principles: **Runtime values vs. compile-time types**, **Structural typing**, **Type narrowing**, and **Discriminated unions**. For each one, we’ll start with a real problem, derive what we need, understand the mechanism, and look at its consequences.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Many backend bugs happen when engineers expect TypeScript types to protect them from malformed client JSON or invalid domain states at runtime. Knowing exactly where compile-time checking ends and runtime JavaScript begins keeps API boundaries honest.',
    prerequisites: [
      {
        label: 'Basic JavaScript values and objects',
        detail:
          'Comfort with primitives (`string`, `number`, `boolean`), plain objects, and runtime checks like `typeof` and `===`.',
      },
      {
        label: 'JSON and HTTP payloads',
        detail:
          'Knowing that incoming HTTP request bodies arrive over the network as text and are parsed into plain JavaScript objects at runtime.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-0.1.1',
      topicId: '0.1.1',
      title: 'JavaScript runtime values vs TypeScript compile-time types',
      problemAndRequirementsMarkdown: [
        '### First principles: Does TypeScript protect running code?',
        'Imagine you are building a backend endpoint that creates an order from JSON sent by a client:',
        '```typescript\ninterface CreateOrderInput {\n  productId: string;\n  quantity: number;\n}\n\nfunction placeOrder(body: unknown) {\n  const input = body as CreateOrderInput;\n  return input.quantity * 20;\n}\n```',
        'TypeScript compiles this with zero errors. So if a client sends `{ "productId": "sku-1" }` *without* `quantity`, surely TypeScript will stop it, right?',
        '',
        '**Wrong.** `input.quantity` is `undefined` at runtime, and `undefined * 20` silently produces `NaN`.',
        '',
        'Why didn’t TypeScript catch it?',
        '',
        '### Deriving the boundary',
        'Node.js and browsers do not execute TypeScript. Before your code runs, the TypeScript compiler (`tsc`) checks your files and **erases every `interface`, `type`, and type annotation** to emit plain JavaScript.',
        '',
        'Look at what `tsc` actually outputs for Node.js to execute:',
        '```javascript\nfunction placeOrder(body) {\n  const input = body;\n  return input.quantity * 20;\n}\n```',
        'Notice that `CreateOrderInput` and `as CreateOrderInput` vanished completely. An `as` assertion only tells the compiler “trust me”—it emits **zero runtime checks**.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Two separate worlds',
        'Think of TypeScript and JavaScript as operating at two completely different moments in time:',
        '1. **Compile time (`tsc`)**: TypeScript reads `.ts` files, verifies that your assumptions match your declared types, and flags mismatches *before* deployment.',
        '2. **Runtime (Node.js / V8)**: Only erased JavaScript objects exist. Real network data, JSON bodies, and database rows have whatever runtime shape actually arrived.',
        '',
        'That is why external inputs (HTTP bodies, query strings, environment variables) should start as **`unknown`** rather than blindly cast with `as`: `unknown` forces you to write real JavaScript checks before trusting the data.',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '0.1.1-ex-1',
            title: 'Why an `as` cast fails vs checking at runtime',
            language: 'typescript',
            code: `interface OrderRequest {
  quantity: number;
}

// Risky: compiler trusts your assertion, emits no check
function unsafeTotal(rawBody: unknown): number {
  const data = rawBody as OrderRequest;
  return data.quantity * 10; // NaN if client forgot quantity!
}

// Honest: runtime check actually inspects what arrived
function safeTotal(rawBody: unknown): number {
  if (
    typeof rawBody === "object" &&
    rawBody !== null &&
    "quantity" in rawBody &&
    typeof (rawBody as { quantity: unknown }).quantity === "number"
  ) {
    return (rawBody as { quantity: number }).quantity * 10;
  }
  throw new Error("Invalid order payload");
}`,
          },
          lineByLineMarkdown: [
            '- **Lines 6–9**: `rawBody as OrderRequest` is erased at compile time—no property or type check ever executes when a request arrives.',
            '- **Lines 12–19**: Actual JavaScript checks (`typeof`, `!== null`, `"quantity" in rawBody`) stay in the emitted JS and validate the real value at runtime.',
          ].join('\n'),
        },
      ],
      backendApplicationsMarkdown:
        'At every backend boundary—HTTP request bodies, webhook payloads, URL parameters, and parsed JSON files—you validate untrusted data with runtime JavaScript (or schema libraries built on runtime checks) first, then rely on TypeScript inside your verified application core.',
      edgeCasesAndTradeOffsMarkdown:
        'Using `any` or `as` across I/O boundaries feels convenient while coding, but silently disables TypeScript’s compile-time protection right where untrusted user input enters.',
      centralIdeaSummary:
        'TypeScript types exist only during compilation and are completely erased before JavaScript runs; validating external runtime data always requires real JavaScript checks.',
    },
    {
      id: 'topic-0.1.2',
      topicId: '0.1.2',
      title: 'Structural typing and type compatibility',
      problemAndRequirementsMarkdown: [
        '### First principles: How does TypeScript decide if two types match?',
        'In languages like Java or C#, two classes with identical fields aren’t interchangeable unless they share an explicit class name or `implements` clause. That is called **nominal typing** (matching by name).',
        '',
        'Now look at TypeScript:',
        '```typescript\ninterface UserRow {\n  id: string;\n  email: string;\n}\n\ninterface EmailRecipient {\n  id: string;\n  email: string;\n}\n\nfunction sendReceipt(recipient: EmailRecipient) {\n  console.log("Sending to", recipient.email);\n}\n\nconst row: UserRow = { id: "u1", email: "ada@example.com" };\nsendReceipt(row); // Compiles cleanly!\n```',
        'Even though `UserRow` and `EmailRecipient` have different names and never mention each other, TypeScript accepts `row`. Why?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Matching by shape',
        'TypeScript uses **structural typing**. Instead of asking *“What is this type named?”*, TypeScript asks:',
        '> *Does this value have at least every property and compatible type that the target requires?*',
        '',
        'Think of it like a checklist. `EmailRecipient` asks for `{ id: string, email: string }`. `UserRow` provides `{ id: string, email: string }`. Every requirement on the checklist is met, so `UserRow` is compatible with `EmailRecipient`.',
        '',
        'Even more important: what if `UserRow` has **extra** properties?',
        '```typescript\ninterface DbUser {\n  id: string;\n  email: string;\n  passwordHash: string;\n}\n\ninterface PublicUser {\n  id: string;\n  email: string;\n}\n\nconst dbUser: DbUser = { id: "u1", email: "ada@example.com", passwordHash: "secret" };\nconst responseDto: PublicUser = dbUser; // Valid structurally!\n```',
        '`DbUser` has everything `PublicUser` requires (`id` and `email`), plus an extra `passwordHash`. Under structural typing, having *more* fields than required is allowed.',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '0.1.2-ex-1',
            title: 'The hidden runtime consequence of extra properties',
            language: 'typescript',
            code: `interface DbUser {
  id: string;
  email: string;
  passwordHash: string;
}

interface PublicUserDto {
  id: string;
  email: string;
}

const dbUser: DbUser = {
  id: "u1",
  email: "ada@example.com",
  passwordHash: "$2b$10$secret",
};

// Structural typing allows passing dbUser where PublicUserDto is expected:
const dto: PublicUserDto = dbUser;

// At runtime, JSON.stringify serializes ALL properties on the object:
console.log(JSON.stringify(dto));
// Output: {"id":"u1","email":"ada@example.com","passwordHash":"$2b$10$secret"}!`,
          },
          lineByLineMarkdown: [
            '- **Line 19**: TypeScript allows `dbUser` to satisfy `PublicUserDto` because it has `id` and `email`.',
            '- **Line 22**: Because types are erased at runtime, `dto` is still the exact same object in memory—so `JSON.stringify(dto)` still serializes `passwordHash` unless you explicitly copy only `{ id: dbUser.id, email: dbUser.email }`.',
          ].join('\n'),
        },
      ],
      backendApplicationsMarkdown:
        'Structural typing makes backend helpers remarkably clean because small functions can declare just the fields they need without forcing callers to import a giant shared class hierarchy—as long as you explicitly map database rows before sending HTTP responses.',
      edgeCasesAndTradeOffsMarkdown:
        'One subtle trap: two domain IDs that are both plain `string` (`UserId` and `OrderId`) are structurally identical to TypeScript, so swapping `charge(orderId, userId)` won’t trigger a type error unless you wrap or brand them explicitly.',
      centralIdeaSummary:
        'TypeScript checks compatibility by shape rather than name: any value containing at least the required properties fits, though extra runtime fields on objects remain present in memory.',
    },
    {
      id: 'topic-0.1.3',
      topicId: '0.1.3',
      title: 'Type narrowing and control-flow analysis',
      problemAndRequirementsMarkdown: [
        '### First principles: Working safely with uncertain values',
        'Suppose a function can receive either a numeric user ID or a string slug:',
        '```typescript\nfunction normalizeId(id: string | number) {\n  return id.toUpperCase(); // Compile error!\n}\n```',
        'TypeScript refuses `id.toUpperCase()` because `id` might be a `number`, and numbers do not have `.toUpperCase()`.',
        '',
        'How do we satisfy the compiler without casting with `as`?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Narrowing via runtime checks',
        'If we write an ordinary JavaScript `if` check, something cool happens:',
        '```typescript\nfunction normalizeId(id: string | number): string {\n  if (typeof id === "string") {\n    return id.toUpperCase(); // Inside here, TypeScript knows id is string\n  }\n  return String(id); // Here, TypeScript knows id MUST be number!\n}\n```',
        'This is **type narrowing** driven by **control-flow analysis**. As TypeScript reads down each `if` / `else` / `return` / `throw` path, it eliminates the possibilities that cannot reach that line.',
        '',
        'TypeScript understands several everyday JavaScript checks automatically:',
        '- **`typeof x === "string"`** for primitives.',
        '- **`x !== null`** or truthiness checks to rule out `null` and `undefined`.',
        '- **`"field" in obj`** to check whether an object has a property.',
        '- **`Array.isArray(x)`** and **`x instanceof Error`** for arrays and class instances.',
        '',
        'Notice how `unknown` works hand-in-hand with narrowing. Unlike `any` (which lets you call anything unchecked), `unknown` forces you to narrow first before accessing properties or calling methods.',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '0.1.3-ex-1',
            title: 'Comparing `any` vs `unknown` with narrowing',
            language: 'typescript',
            code: `function logErrorAny(err: any) {
  // Dangerous: compiles even if err is null or a string
  console.log(err.message.toUpperCase());
}

function logErrorSafe(err: unknown) {
  if (err instanceof Error) {
    // Narrowed to Error — safe to read .message
    console.log(err.message.toUpperCase());
    return;
  }
  console.log("Non-Error thrown:", String(err));
}`,
          },
          lineByLineMarkdown: [
            '- **Lines 1–4**: `any` switches off type checking—if `err` is `"timeout"`, `err.message` is `undefined` and crashes on `.toUpperCase()`.',
            '- **Lines 7–11**: `err instanceof Error` proves at runtime that `err` is an `Error`, so TypeScript narrows `err` inside the `if` block and lets you read `.message` safely.',
          ].join('\n'),
        },
      ],
      centralIdeaSummary:
        'Control-flow analysis tracks your runtime JavaScript checks (`typeof`, `in`, `instanceof`, `!== null`) along every branch to narrow broad types like `unknown` or unions down to exact safe types.',
    },
    {
      id: 'topic-0.1.4',
      topicId: '0.1.4',
      title: 'Union and discriminated union types',
      problemAndRequirementsMarkdown: [
        '### First principles: Why flat optional interfaces break down',
        'Suppose you are modeling the outcome of a payment attempt. A very common first try looks like this:',
        '```typescript\ninterface PaymentOutcome {\n  status: "paid" | "failed";\n  transactionId?: string;\n  failureReason?: string;\n}\n```',
        'Look closely at what this flat interface accidentally allows:',
        '- `{ status: "paid" }` with `transactionId` completely missing.',
        '- `{ status: "failed", transactionId: "tx_123", failureReason: "declined" }` with contradictory fields.',
        '',
        'Even after checking `if (outcome.status === "paid")`, TypeScript still sees `outcome.transactionId` as `string | undefined`, forcing you to guess or check again.',
        '',
        '### Deriving the requirement',
        'We want the type system to **make illegal combinations impossible**. When `status` is `"paid"`, `transactionId` must exist and `failureReason` must not. When `status` is `"failed"`, `failureReason` must exist.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Discriminated unions',
        'A **union type** (`A | B`) says a value can be one of several shapes. A **discriminated union** gives every variant a shared literal property—the **discriminant tag** (like `status` or `kind`)—so TypeScript can narrow the whole object by checking that one field:',
        '```typescript\ntype PaymentOutcome =\n  | { status: "paid"; transactionId: string }\n  | { status: "failed"; failureReason: string };\n```',
        'Now try checking `outcome.status`:',
        '- When `outcome.status === "paid"`, TypeScript knows `transactionId: string` is definitely present (not optional!).',
        '- When `outcome.status === "failed"`, TypeScript knows `failureReason: string` is definitely present.',
        '',
        'And what happens if someone adds a third state next month, like `"pending"`? We can make the compiler catch forgotten cases using **`never`** (the type representing “no possible value remains”):',
        'If every known branch of a `switch` returns, any value reaching `default` has type `never`. Assigning it to `never` guarantees a compile error the moment a new variant is added and left unhandled!',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '0.1.4-ex-1',
            title: 'Discriminated union with exhaustive `never` check',
            language: 'typescript',
            code: `type PaymentEvent =
  | { type: "authorized"; amountCents: number }
  | { type: "failed"; errorCode: string };

function assertNever(value: never): never {
  throw new Error(\`Unhandled event: \${JSON.stringify(value)}\`);
}

function formatEvent(event: PaymentEvent): string {
  switch (event.type) {
    case "authorized":
      return \`Authorized \${event.amountCents} cents\`;
    case "failed":
      return \`Failed with \${event.errorCode}\`;
    default:
      // If a new variant is added to PaymentEvent and missed above,
      // TypeScript throws a compile error right here!
      return assertNever(event);
  }
}`,
          },
          lineByLineMarkdown: [
            '- **Lines 1–3**: Both variants share the literal tag `type` (`"authorized"` vs `"failed"`), binding each variant to its exact required fields.',
            '- **Lines 10–14**: Checking `event.type` narrows `event` so `event.amountCents` and `event.errorCode` are guaranteed to exist.',
            '- **Line 18**: Because both cases are handled, `event` in `default` narrows to `never`, turning future missing cases into compile-time errors.',
          ].join('\n'),
        },
      ],
      edgeCasesAndTradeOffsMarkdown:
        'Discriminated unions require choosing a clear shared literal tag (`type`, `kind`, `status`, or `ok`). Without a literal discriminant tag, TypeScript cannot reliably distinguish two objects just from optional fields.',
      centralIdeaSummary:
        'Discriminated unions bind a shared literal tag to each valid shape so impossible state combinations cannot be constructed and `never` checks catch missing branches at compile time.',
    },
  ],
  conceptConnection: {
    title: 'Putting it together at an API boundary',
    narrativeMarkdown: [
      'Now look at how all four ideas from this unit protect a real backend handler from start to finish:',
      '1. Untrusted input arrives at **runtime** as `unknown` (recognizing compile-time erasure).',
      '2. Runtime checks **narrow** it into a verified shape.',
      '3. **Structural typing** lets internal helpers accept the exact fields they need—while we explicitly project response objects so extra columns don’t leak.',
      '4. A **discriminated union** models the domain result (`"created" | "rejected"`) so the HTTP mapper handles every outcome exhaustively.',
    ].join('\n\n'),
    integratedExample: {
      id: '0.1-integrated-example',
      title: 'Validating input, narrowing, and returning an explicit discriminated outcome',
      language: 'typescript',
      code: `type OrderDecision =
  | { status: "created"; orderId: string }
  | { status: "rejected"; reason: string };

function handleOrderBody(rawBody: unknown): OrderDecision {
  // 1 & 2. Runtime narrowing from unknown
  if (
    typeof rawBody !== "object" ||
    rawBody === null ||
    !("quantity" in rawBody) ||
    typeof (rawBody as { quantity: unknown }).quantity !== "number"
  ) {
    return { status: "rejected", reason: "quantity must be a number" };
  }

  const quantity = (rawBody as { quantity: number }).quantity;
  if (quantity <= 0) {
    return { status: "rejected", reason: "quantity must be positive" };
  }

  return { status: "created", orderId: "ord_101" };
}

function toHttpMessage(decision: OrderDecision): string {
  // 3. Discriminated union guarantees orderId or reason exists in each branch
  if (decision.status === "created") {
    return \`Created order \${decision.orderId}\`;
  }
  return \`Order rejected: \${decision.reason}\`;
}`,
    },
    walkthroughMarkdown:
      'Because `rawBody` starts as `unknown`, the compiler forces real runtime checks before reading `quantity`. And once `handleOrderBody` returns an `OrderDecision`, `toHttpMessage` cannot accidentally read `orderId` when `status` is `"rejected"`.',
  },
  questions: [
    {
      id: '0.1-kc-1',
      focusArea: 'Compile Time vs Runtime',
      prompt:
        'A Node.js API endpoint writes `const order = req.body as CreateOrderInput` and immediately reads `order.quantity * 20`. Why does TypeScript let this compile, and what goes wrong if a client sends a missing or string `quantity`?',
      hints: [
        'Think about what happens to `interface CreateOrderInput` and `as` when TypeScript compiles to JavaScript.',
        'Does `as` generate an `if` check in the output JS?',
        'TypeScript erases all type annotations and `as` casts before Node.js executes; malformed runtime JSON enters unchecked and causes `NaN` or runtime crashes.',
      ],
      explanation:
        'TypeScript checks types only during compilation and strips interfaces and `as` assertions completely before Node.js runs. Casting with `as` tells the compiler to trust you without emitting any runtime checks, so malformed client JSON flows straight into your calculation (`undefined * 20` → `NaN`).',
      evaluationCriteria: [
        'Distinguishes compile-time erasure from runtime execution',
        'Explains that `as` casts emit no runtime validation',
      ],
      topicIds: ['0.1.1'],
    },
    {
      id: '0.1-kc-2',
      focusArea: 'Structural Typing',
      prompt:
        'What does it mean that TypeScript is **structurally typed**, and why can passing a `DbUser` variable (with `id`, `email`, and `passwordHash`) to a `PublicUser` type (`id`, `email`) leak `passwordHash` in `JSON.stringify`?',
      hints: [
        'Compare checking a type’s name vs checking whether its shape has all required fields.',
        'Does structural typing strip extra properties at runtime?',
        'Structural typing accepts any object with at least the required fields (`id`, `email`). Because types are erased, `passwordHash` remains on the runtime object and gets serialized by `JSON.stringify`.',
      ],
      explanation:
        'Structural typing matches types by shape rather than name: since `DbUser` contains `id` and `email`, it satisfies `PublicUser` even with extra fields. Because TypeScript types vanish at runtime, `passwordHash` is still attached to the JavaScript object in memory and is included by `JSON.stringify` unless you explicitly copy only the public fields.',
      evaluationCriteria: [
        'Explains shape-based compatibility allowing extra fields',
        'Connects erased types to extra runtime fields still existing in memory',
      ],
      topicIds: ['0.1.1', '0.1.2'],
    },
    {
      id: '0.1-kc-3',
      focusArea: 'Type Narrowing',
      prompt:
        'Why is `unknown` safer than `any` for an error or incoming payload, and how do JavaScript expressions like `typeof` or `instanceof` let TypeScript unlock property access?',
      hints: [
        'Compare calling `err.message` when `err` is `any` vs when `err` is `unknown`.',
        'What does TypeScript’s control-flow analysis observe inside an `if (err instanceof Error)` block?',
        '`any` disables type checking completely; `unknown` blocks unchecked access until a runtime JavaScript check (`typeof`, `instanceof`, `in`) narrows the type along that branch.',
      ],
      explanation:
        '`any` turns off type checking so invalid accesses compile silently and crash at runtime. `unknown` forces you to narrow the value first using real JavaScript checks (`typeof`, `instanceof`, `in`, `!== null`), which control-flow analysis uses to prove a narrower type inside each branch.',
      evaluationCriteria: [
        'Contrasts `any` disabling checks vs `unknown` requiring narrowing',
        'Connects runtime JS checks to compiler control-flow narrowing',
      ],
      topicIds: ['0.1.3'],
    },
    {
      id: '0.1-kc-4',
      focusArea: 'Discriminated Unions',
      prompt:
        'Why is a discriminated union (`{ status: "paid"; txId: string } | { status: "failed"; reason: string }`) safer than one flat interface `{ status: string; txId?: string; reason?: string }`?',
      hints: [
        'Think about what invalid combinations of optional fields compile in the flat interface.',
        'Look at how checking `outcome.status === "paid"` behaves in both designs.',
        'A flat optional interface permits impossible states (like `"paid"` with no `txId`); a discriminated union ties each literal tag to its exact required fields and narrows automatically.',
      ],
      explanation:
        'A flat interface with optional fields permits impossible states (such as `status: "paid"` with `txId: undefined` and `reason` set). A discriminated union pairs each literal `status` tag with the exact fields valid for that state, making invalid combinations unrepresentable and letting TypeScript prove property presence inside each branch.',
      evaluationCriteria: [
        'Identifies impossible states allowed by flat optional interfaces',
        'Explains how tag discrimination enforces exact per-branch fields',
      ],
      topicIds: ['0.1.4'],
    },
    {
      id: '0.1-kc-5',
      focusArea: 'Exhaustiveness & Boundary Synthesis',
      prompt:
        'How does assigning the `default` branch of a `switch` on a discriminated union to `never` catch bugs over time, and how do compile-time types and runtime checks work together at an API boundary?',
      hints: [
        'Imagine adding a third `"pending"` variant to `PaymentEvent` months later.',
        'Think about what each half protects: untrusted JSON coming in vs internal state handling.',
        'When all current cases are handled, `default` narrows to `never`, triggering a compile error if a new variant goes unhandled. At API boundaries, runtime checks narrow untrusted `unknown` inputs while compile-time unions enforce exhaustive internal handling.',
      ],
      explanation:
        'Once all known union tags are handled in a `switch`, the remaining type in `default` is `never`. Assigning it to `never` forces a compile-time error whenever someone adds a new variant and forgets to handle it. Together, runtime checks validate incoming `unknown` payloads while TypeScript’s structural types and discriminated unions guarantee consistent internal handling.',
      evaluationCriteria: [
        'Explains `never` exhaustiveness protection when variants grow',
        'Clearly separates runtime validation from compile-time type guarantees',
      ],
      topicIds: ['0.1.1', '0.1.3', '0.1.4'],
    },
  ],
};
