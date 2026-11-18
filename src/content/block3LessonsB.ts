import { FptLessonContent, RecipeLessonContent } from '../types';

export const LESSON_3_3: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'In Sub-blocks 3.1 and 3.2, we built a working Node.js HTTP server with routing, middleware, and error handling. Now comes a design question: **if 10 developers design endpoints for the same app, why does an ad-hoc collection like `POST /getUserById` and `GET /deleteOrder?id=9` quickly become confusing and dangerous?**',
      'In this unit, we’ll derive **REST API Design** from first principles: **resources and URL design**, **HTTP method semantics and safe vs. idempotent operations**, **status code selection**, **request/response contracts with pagination, filtering, and sorting**, and **API versioning and backward compatibility**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Consistent REST contracts let frontend apps, mobile clients, caches, and retry logic work predictably—without accidentally charging a credit card twice on a network retry or breaking mobile users whenever your backend evolves.',
    prerequisites: [
      {
        subBlockId: '2.3',
        label: 'HTTP Methods, Headers & Status Codes (2.3.5, 2.3.6)',
        detail:
          'Knowing the structure of HTTP requests, verbs, and `2xx`/`3xx`/`4xx`/`5xx` status families.',
      },
      {
        subBlockId: '3.2',
        label: 'Routing & Pipeline (3.2.1, 3.2.2)',
        detail:
          'Understanding how `(METHOD, path)` pairs map to route handlers.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-3.3.1',
      topicId: '3.3.1',
      coveredTopicIds: ['3.3.2'],
      title: 'Resources and resource-oriented URL design',
      problemAndRequirementsMarkdown: [
        '### First principles: Why do verb-stuffed URLs break down?',
        'Imagine an API where every action gets its own custom URL name:',
        '`POST /createOrder`, `GET /fetchAllOrdersForUser`, `POST /doCancelOrder`, `GET /removeOrderItem`.',
        '',
        'Notice two problems immediately:',
        '1. HTTP *already* has standard action verbs (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`)—putting verbs into URLs forces clients to guess whether creating a user is `/createUser`, `/addUser`, or `/newUser`!',
        '2. Caches, browsers, and proxies understand HTTP methods, not arbitrary custom URL verbs like `/doCancelOrder`.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Nouns in URLs, Verbs in HTTP Methods',
        'REST organizes an API around **resources**—the key domain nouns your system manages (like `users`, `orders`, `invoices`).',
        '',
        'In **resource-oriented URL design**:',
        '- URLs identify **what** you are acting on (plural nouns and nested sub-resources): `/orders`, `/orders/42`, `/orders/42/items`.',
        '- The **HTTP method** states **what action** to perform on that resource (`GET /orders/42` reads it; `DELETE /orders/42` removes it).',
        '',
        '| Action | Verb-RPC Style (avoid) | Resource-Oriented REST |',
        '| --- | --- | --- |',
        '| List orders | `GET /getOrders` | `GET /orders` |',
        '| Create order | `POST /createOrder` | `POST /orders` |',
        '| Fetch one order | `POST /fetchOrder` | `GET /orders/42` |',
        '| Items in an order | `GET /getOrderItems?id=42` | `GET /orders/42/items` |',
      ].join('\n\n'),
      centralIdeaSummary:
        'A resource is a domain noun exposed at a stable path (`/orders/:id`), while the HTTP method expresses the action performed on it.',
      codeExamples: [],
    },
    {
      id: 'topic-3.3.3',
      topicId: '3.3.3',
      coveredTopicIds: ['3.3.4', '3.3.5'],
      title: 'HTTP method semantics, safe vs idempotent operations, and status codes',
      problemAndRequirementsMarkdown: [
        '### First principles: Why does a network retry care whether you used `GET`, `POST`, or `PUT`?',
        'Suppose a user clicks **Pay** on flaky subway Wi-Fi. The phone sends the request, the server processes it, *and then the Wi-Fi drops before the response comes back!*',
        '',
        'Now ask yourself: **is it safe for the client or load balancer to automatically retry that request?**',
        '- If it was `GET /orders/42`, retrying is completely harmless!',
        '- If it was `POST /orders` (creating a brand-new order), retrying blindly creates **two** orders and charges the user twice!',
        '- If it was `PUT /orders/42` (setting order 42’s shipping address to `"123 Main St"`), running it twice leaves order 42 with the exact same address!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Safe, Idempotent, and Honest Status Codes',
        'HTTP divides method behavior along two crucial properties:',
        '- **Safe**: Calling it **never modifies server state** (read-only). `GET` and `HEAD` are safe. *(Why never put a delete inside `GET /deleteOrder`? Because web crawlers, link prefetchers, and browser caches freely re-fetch `GET` URLs automatically!)*',
        '- **Idempotent**: Calling the operation **once or ten times produces the exact same resulting server state** (even if it creates/changes state the first time).',
        '',
        '| Method | Meaning | Safe? | Idempotent? | Typical Success Status |',
        '| --- | --- | --- | --- | --- |',
        '| `GET` | Read resource(s) | Yes | Yes | `200 OK` |',
        '| `POST` | Create new resource / trigger action | No | **No** (can create duplicates!) | `201 Created` (with `Location` or body) |',
        '| `PUT` | Replace whole resource at known URI | No | **Yes** (overwrite produces same state) | `200 OK` or `204 No Content` |',
        '| `PATCH` | Partially update fields | No | Depends (setting `{status:"paid"}` is; `{increment:1}` is not) | `200 OK` |',
        '| `DELETE` | Remove resource | No | **Yes** (resource remains deleted) | `204 No Content` or `200 OK` |',
        '',
        'And pair methods with **honest status codes**: `201 Created` when a resource was created, `204 No Content` when deletion succeeds with nothing to return, `400`/`422` for invalid inputs, `401` (unauthenticated — who are you?) vs `403` (forbidden — we know who you are, not allowed), `404` when missing, `409 Conflict` when state collides (e.g., duplicate email), and `500`/`503` for server failures.',
      ].join('\n\n'),
      backendApplicationsMarkdown:
        'When clients *must* safely retry `POST /payments` across flaky mobile networks, backends accept an `Idempotency-Key` header so repeated retries return the cached first result instead of charging twice.',
      centralIdeaSummary:
        'Choosing methods by semantics (`GET` safe; `PUT`/`DELETE` idempotent; `POST` non-idempotent) and honest status codes lets clients, caches, and retry logic behave safely.',
      codeExamples: [],
    },
    {
      id: 'topic-3.3.6',
      topicId: '3.3.6',
      coveredTopicIds: ['3.3.7', '3.3.8'],
      title: 'Request/response contracts, pagination, filtering, and sorting',
      problemAndRequirementsMarkdown: [
        '### First principles: What happens when `GET /orders` grows from 12 rows to 2,000,000 rows?',
        'Returning every row in a `GET /orders` array works great in local tests with 5 rows—until production hits 500,000 orders and a single `GET /orders` call tries to serialize 200 MB of JSON, crashing Node’s heap and timing out the client!',
        '',
        '### Deriving the contract',
        'Collection endpoints must bound how much data returns in one call (**pagination**), let callers narrow what they actually want (**filtering**), and return items in a deterministic order (**sorting**) using predictable **request and response contracts**.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Pagination, Filtering, and Sorting via Query Params',
        'Because `GET` selects sub-views of a collection without changing the resource identity, **filtering**, **sorting**, and **pagination** belong in **query parameters**:',
        '```text',
        'GET /orders?status=paid&sort=-createdAt&limit=20&cursor=ord_980',
        '```',
        'Notice the two main **pagination** strategies and their trade-offs:',
        '- **Offset pagination (`?page=3&limit=20` or `offset=40`)**: Easy to understand and lets UIs jump straight to “Page 5.” **Catch**: On large tables, the database still counts past and discards the skipped rows (`OFFSET 100000`), and if new rows get inserted while paging, items shift and appear twice!',
        '- **Cursor pagination (`?cursor=ord_980&limit=20`)**: Passes a pointer (like the last item’s `(createdAt, id)`) so the database jumps directly to the next 20 items (`WHERE id < \'ord_980\' LIMIT 20`). Fast at any depth and never duplicates rows on live feeds—at the trade-off of not supporting arbitrary “jump to page 47.”',
        '',
        'And keep collection response shapes **consistent** (for example `{ data: [...], pagination: { nextCursor, hasMore } }`) so clients always know where items and paging metadata live.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Collection contracts use query parameters for filtering, sorting, and bounded pagination—trading offset pagination’s page-jumping simplicity against cursor pagination’s speed and consistency on live data.',
      codeExamples: [],
    },
    {
      id: 'topic-3.3.9',
      topicId: '3.3.9',
      coveredTopicIds: ['3.3.10'],
      title: 'API versioning and backward compatibility',
      problemAndRequirementsMarkdown: [
        '### First principles: Why can’t you just rename `user.name` to `user.fullName` in production?',
        'When you deploy a website frontend, everyone gets the new JavaScript on refresh. But if mobile apps, partner webhooks, or third-party scripts call your API, **old clients keep running for weeks or months after you deploy!**',
        '',
        'If you rename `amount` → `amountCents` or drop a required field overnight, every old client still live in production breaks immediately.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Backward compatibility & Versioning',
        'Good API evolution follows one golden rule: **prefer additive, backward-compatible changes first:**',
        '- **Safe (backward-compatible)**: Adding a *new optional* response field, adding a new endpoint, or accepting a *new optional* request field with a sensible default.',
        '- **Breaking (backward-incompatible)**: Renaming or removing response fields, making an optional request parameter required, or changing a field’s type/meaning (`"19.99"` string → `1999` cents integer).',
        '',
        'When a genuinely **breaking** redesign is unavoidable, use explicit **API versioning**—most commonly in the URL prefix (`/v1/orders` alongside `/v2/orders`) or an `Accept` / version header—so old clients continue calling `/v1` safely while new clients migrate to `/v2` on a clear deprecation schedule.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Maintain backward compatibility through additive changes whenever possible, and isolate breaking contract changes behind explicit API versions (`/v1` → `/v2`) while deprecating gracefully.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Designing a coherent resource API end-to-end',
    narrativeMarkdown: [
      'See how every decision in `3.3` locks together across an Orders API:',
      '',
      '| Operation | Endpoint | Why It’s Designed This Way |',
      '| --- | --- | --- |',
      '| List paid orders | `GET /v1/orders?status=paid&sort=-createdAt&cursor=...&limit=20` | Safe + idempotent read; query params handle filter/sort/cursor paging |',
      '| Create order | `POST /v1/orders` (with optional `Idempotency-Key`) | Non-idempotent creation returns `201 Created`; key protects retries |',
      '| Partial status update | `PATCH /v1/orders/42` | Updates specific allowed fields without replacing the whole resource |',
      '| Remove draft order | `DELETE /v1/orders/42` | Idempotent deletion returning `204 No Content` |',
    ].join('\n'),
    integratedExample: {
      id: '3.3-integrated-example',
      title: 'Consistent REST endpoints, pagination envelope, and additive evolution',
      language: 'http',
      code: `GET /v1/orders?status=paid&sort=-createdAt&limit=2
Authorization: Bearer <token>

HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    { "id": "ord_902", "status": "paid", "totalCents": 4500, "currency": "USD" },
    { "id": "ord_901", "status": "paid", "totalCents": 1200, "currency": "USD" }
  ],
  "pagination": {
    "limit": 2,
    "nextCursor": "ord_901",
    "hasMore": true
  }
}`,
    },
    walkthroughMarkdown:
      'Every piece works together predictably: plural resource URLs, safe `GET` semantics, bounded cursor pagination, consistent `{ data, pagination }` contracts, and `/v1` isolation so adding a new optional field tomorrow never breaks existing callers.',
  },
  questions: [
    {
      id: '3.3-kc-1',
      focusArea: 'Resource Design & Safe vs Idempotent',
      prompt:
        'Why is exposing `GET /orders/42/cancel` a serious REST design mistake? Which two HTTP properties are violated, and what real-world bug can automated browsers or crawlers trigger?',
      hints: [
        'Think about what `GET` promises to caches, prefetchers, and crawlers.',
        'Compare safe (read-only) vs state-mutating operations.',
        '`GET` must be **safe** (read-only) and idempotent; putting state-changing cancellation on `GET` lets browser link prefetching, proxies, or crawlers accidentally cancel user orders just by visiting the URL!',
      ],
      explanation:
        '`GET` is defined as **safe** (no server state changes) and **idempotent**. Putting a destructive or state-changing action on `GET` violates HTTP method semantics—meaning browser prefetchers, monitoring bots, or retry proxies can trigger `/orders/42/cancel` automatically and cancel orders unintentionally. State mutations belong on `POST`, `PATCH`, `PUT`, or `DELETE`.',
      evaluationCriteria: [
        'Identifies `GET` as safe/read-only',
        'Explains accidental mutation risk from prefetchers, crawlers, or proxies',
      ],
      topicIds: ['3.3.1', '3.3.2', '3.3.3', '3.3.4'],
    },
    {
      id: '3.3-kc-2',
      focusArea: 'Idempotency & Status Codes',
      prompt:
        'Contrast why `DELETE /orders/42` and `PUT /orders/42` are **idempotent**, whereas `POST /orders` is **not**—and pick the right HTTP status code for: (a) creating an order, (b) deleting an order cleanly, and (c) rejecting a duplicate email on signup.',
      hints: [
        'Ask: if the exact same request runs twice, does the resulting state change on the second call?',
        'Review `201`, `204`, and `409`.',
        '`PUT`/`DELETE` target a specific resource URI so repeating them leaves the exact same final state, while repeating `POST /orders` creates multiple new orders; statuses are `201 Created`, `204 No Content`, and `409 Conflict`.',
      ],
      explanation:
        '`PUT /orders/42` replaces the resource at that exact URI and `DELETE /orders/42` ensures it is gone—running either once or twice leaves the same state (**idempotent**). `POST /orders` creates a new resource each time, so blind retries create duplicates (**non-idempotent**). Appropriate status codes: **(a) `201 Created`**, **(b) `204 No Content`** (or `200 OK`), and **(c) `409 Conflict`**.',
      evaluationCriteria: [
        'Correctly contrasts PUT/DELETE idempotency vs POST non-idempotency',
        'Selects 201 Created, 204 No Content (or 200), and 409 Conflict',
      ],
      topicIds: ['3.3.3', '3.3.4', '3.3.5'],
    },
    {
      id: '3.3-kc-3',
      focusArea: 'Pagination Trade-offs',
      prompt:
        'Compare **offset pagination** (`?page=50&limit=20`) vs **cursor pagination** (`?cursor=ord_980&limit=20`) for a rapidly updating `GET /orders` feed.',
      hints: [
        'Think about what happens when a brand-new order arrives at the top while a user clicks "Next Page" under offset pagination.',
        'Also think about database cost when `OFFSET 100000` runs vs jumping straight to a cursor.',
        'Offset lets you jump to any page number, *but* degrades at high offsets and causes skipped/duplicate rows when new items arrive; cursor stays fast and consistent across live writes, though it only steps forward/back from a cursor.',
      ],
      explanation:
        '**Offset pagination** is simple and supports jumping straight to arbitrary page numbers, *but* the database still skips past `N` earlier rows on deep pages and live inserts shift offsets—causing users to see duplicate or skipped items across pages. **Cursor pagination** uses an indexed boundary pointer so deep pages stay fast and live inserts never duplicate items, trading away random “jump to page 50” links.',
      evaluationCriteria: [
        'Identifies offset’s live-insert drift and deep-offset cost vs random page jumping',
        'Identifies cursor’s consistent live paging and depth speed vs sequential navigation',
      ],
      topicIds: ['3.3.6', '3.3.7', '3.3.8'],
    },
    {
      id: '3.3-kc-4',
      focusArea: 'Versioning & Backward Compatibility',
      prompt:
        'Your mobile app clients take 6 weeks to update. Which of these two changes requires a new API version (`/v2`), and which can safely ship on `/v1`: **(a)** adding an optional `estimatedDelivery` field to responses, or **(b)** renaming `price` to `priceCents` and changing its unit from dollars to cents?',
      hints: [
        'Ask whether an un-updated mobile app built last month crashes on each change.',
        'Additive optional fields vs renaming/changing units.',
        '(a) Adding an optional field is backward-compatible on `/v1`; (b) renaming `price` and changing units breaks existing `/v1` parsers and calculations, requiring `/v2` while keeping `/v1` running.',
      ],
      explanation:
        '**(a)** Adding a new optional response field (`estimatedDelivery`) is **backward-compatible** and can ship directly on `/v1` (existing clients simply ignore fields they don’t use). **(b)** Renaming `price` to `priceCents` and changing dollars to cents is a **breaking contract change**—existing clients would crash or misdisplay prices—so it requires a new version (`/v2`) while `/v1` remains supported during deprecation.',
      evaluationCriteria: [
        'Identifies additive optional field as backward-compatible on `/v1`',
        'Identifies field rename/unit change as breaking requiring `/v2`',
      ],
      topicIds: ['3.3.9', '3.3.10'],
    },
  ],
};

export const LESSON_3_4_FPT: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'In Sub-block 3.3, we designed clean REST URLs, methods, and status codes. Now ask a practical reliability question: **how do you guarantee that what enters and leaves your API at runtime actually obeys those contracts—and that other teams can trust your documentation?**',
      'In this unit, we’ll connect **runtime validation vs TypeScript types** (`0.1`) to **schema validation with Zod**, **DTOs**, **standardized error formats**, **OpenAPI fundamentals and API documentation**, and **managing contract changes safely**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Without schema validation and explicit DTOs, invalid client JSON crashes internal code or leaks private database columns, inconsistent error objects break frontend parsing, and hand-written docs silently go stale the week after launch.',
    prerequisites: [
      {
        subBlockId: '0.1',
        label: 'Compile-time type erasure & narrowing (0.1.1, 0.1.2)',
        detail:
          'Knowing that TypeScript types vanish before Node.js runs and extra properties on objects still serialize at runtime.',
      },
      {
        subBlockId: '3.3',
        label: 'REST Contracts & Status Codes (3.3.5, 3.3.6, 3.3.10)',
        detail:
          'Understanding request/response contracts, status codes, and backward compatibility.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-3.4.1',
      topicId: '3.4.1',
      coveredTopicIds: ['3.4.2', '3.4.3'],
      title: 'Runtime schema validation and Zod',
      problemAndRequirementsMarkdown: [
        '### First principles: Why aren’t TypeScript interfaces + manual `if` checks enough at scale?',
        'Remember Sub-block `0.1`? TypeScript interfaces vanish at compile time, so `req.body as CreateOrderDto` performs **zero checks at runtime**.',
        '',
        'Wait—then you could write manual `if (typeof body.qty !== "number" || body.qty < 1 ...)` checks in every route. Now imagine an order payload with 12 nested fields (`email`, `items[]`, optional `couponCode`, enum `currency`). Writing manual `if` checks takes 60 error-prone lines—*and* you still have to maintain a separate TypeScript `interface` that can easily drift out of sync with your `if` checks!',
        '',
        '### Deriving the requirement',
        'We want **one single source of truth** that both validates untrusted `unknown` data at runtime **and** produces the exact TypeScript type automatically.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Schema Validation with Zod',
        'A **schema validation** library lets you declare the exact shape, value constraints (min/max, email format, integer, enum), and defaults as a runnable JavaScript schema object.',
        '',
        'In TypeScript backends, **Zod** is popular because it gives you both halves from one declaration:',
        '1. **At runtime**: `schema.safeParse(req.body)` checks every field of the untrusted `unknown` payload and returns either `{ success: true, data }` (validated and stripped/coerced!) or `{ success: false, error }` with structured per-field issues.',
        '2. **At compile time**: `type CreateOrderInput = z.infer<typeof createOrderSchema>` extracts the exact TypeScript type directly from the runtime schema—so your validation rules and your TypeScript types can **never** drift apart!',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '3.4.3-ex-1',
            title: 'Single source of truth with Zod runtime validation + z.infer',
            language: 'typescript',
            code: `import { z } from "zod";

const CreateOrderSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(100),
  note: z.string().max(200).optional(),
});

// Compile-time type automatically matches the runtime schema!
type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

function parseOrderInput(rawBody: unknown): CreateOrderInput | null {
  const result = CreateOrderSchema.safeParse(rawBody);
  if (!result.success) {
    return null; // Caller maps result.error.issues to 400 Bad Request
  }
  return result.data; // Strictly typed CreateOrderInput!
}`,
          },
          lineByLineMarkdown: [
            '- **Lines 3–7**: Defines runtime constraints (`quantity` must be an integer between `1` and `100`, not merely *any* `number` like `-5` or `1.5`).',
            '- **Line 10**: `z.infer` derives `CreateOrderInput` automatically so you don’t duplicate an interface by hand.',
            '- **Line 13**: `safeParse(rawBody)` validates `unknown` data safely without throwing an uncaught exception.',
          ].join('\n'),
        },
      ],
      centralIdeaSummary:
        'Schema validation libraries like Zod solve TypeScript’s runtime erasure by turning one runtime schema into both real input verification and an inferred compile-time TypeScript type.',
    },
    {
      id: 'topic-3.4.4',
      topicId: '3.4.4',
      coveredTopicIds: ['3.4.5'],
      title: 'DTOs and standardized error formats',
      problemAndRequirementsMarkdown: [
        '### First principles: Why shouldn’t database models or random error strings be sent straight to clients?',
        'Two silent contract leaks happen in real backends:',
        '1. **Returning raw database rows**: Suppose your `users` table has `id`, `email`, `passwordHash`, and `internalRiskScore`. Returning `res.json(dbUser)`—even typed as a narrower TS interface (`0.1.2`)—serializes `passwordHash` onto the network! And changing a DB column name breaks every client.',
        '2. **Inconsistent error shapes**: One route returns `{ "error": "Bad email" }`, another returns `{ "message": ["qty invalid"] }`, and a third returns plain text `"Unauthorized"`. Frontend code has to write 5 fragile error parsers!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Explicit DTOs & Standardized Error Envelopes',
        '- **DTO (Data Transfer Object)**: An explicit contract object representing **strictly what crosses the API boundary**—separate from internal database entities! An incoming DTO validates what callers may send (never letting a client pass `role: "admin"` or `id` on signup), while an outgoing response DTO explicitly maps only safe public fields (`{ id: user.id, email: user.email }`).',
        '- **Standardized Error Format**: Every `4xx` and `5xx` error across the entire API returns **one predictable JSON structure** (for example `{ error: { code, message, details?, requestId } }`, or the industry-standard RFC 9457 Problem Details fields `type`, `title`, `status`, `detail`). Machine-readable `code` strings (`"VALIDATION_ERROR"`, `"INSUFFICIENT_STOCK"`) let frontends handle errors reliably without brittle English-sentence matching.',
      ].join('\n\n'),
      centralIdeaSummary:
        'DTOs decouple external API payloads from internal database schemas (preventing data leaks and over-posting), while a standardized error format makes every failure predictable for clients.',
      codeExamples: [],
    },
    {
      id: 'topic-3.4.6',
      topicId: '3.4.6',
      coveredTopicIds: ['3.4.7', '3.4.8'],
      title: 'OpenAPI fundamentals, API documentation, and contract changes',
      problemAndRequirementsMarkdown: [
        '### First principles: Why do handwritten Markdown API docs always rot?',
        'You write a lovely README describing `POST /orders`. Two months later, someone adds `couponCode`, changes `400` details, and forgets to update the README. Now frontend engineers trust the docs, hit production bugs, and stop reading documentation altogether.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: OpenAPI as a machine-readable contract',
        '**OpenAPI** (formerly Swagger) is a standard YAML/JSON specification format that formally describes an HTTP API’s paths, methods, parameters, request/response schemas, status codes, and authentication schemes.',
        '',
        'Notice why OpenAPI is much more useful than static prose:',
        '- **Interactive API documentation**: Tools automatically render live “Try it out” docs straight from the OpenAPI file.',
        '- **Code-first or schema-generated sync**: Generating OpenAPI directly from your route schemas (like Zod schemas) keeps documentation synchronized with real runtime validation automatically!',
        '- **Automated contract-change checks**: You can diff `openapi.json` between pull requests in CI to catch accidental breaking **contract changes** (e.g., removing a response field or turning an optional input required) *before* deploying to production (`3.3.10`).',
      ].join('\n\n'),
      centralIdeaSummary:
        'OpenAPI captures routes, schemas, and status codes in a machine-readable spec—powering living API documentation and automated detection of breaking contract changes.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'How Zod, DTOs, standardized errors, and OpenAPI guard the API boundary',
    narrativeMarkdown: [
      'See how all four pieces work together on a single `POST /orders` boundary:',
      '1. **Zod Schema** validates `req.body` at runtime and gives TypeScript `CreateOrderDto`.',
      '2. Invalid fields map cleanly into the **Standardized Error Format** (`400 VALIDATION_ERROR` with per-field issues).',
      '3. An explicit **Response DTO** projects only safe public fields from the database row (`201 Created`).',
      '4. The **OpenAPI spec** documents those exact request/response DTOs and error shapes so consumers and CI contract checks stay aligned.',
    ].join('\n\n'),
    integratedExample: {
      id: '3.4-integrated-example',
      title: 'Standardized error envelope paired with validated DTO output',
      language: 'json',
      code: `// 400 Standardized Validation Error Response
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request body failed schema validation",
    "requestId": "req_91af",
    "details": [
      { "path": "quantity", "message": "Expected integer >= 1" }
    ]
  }
}

// 201 Explicit Output DTO (internal DB columns never leaked)
{
  "id": "ord_401",
  "status": "pending",
  "totalCents": 2500
}`,
    },
    walkthroughMarkdown:
      'Every input passes through schema validation before touching domain code, every domain entity is mapped to an explicit DTO before leaving, every failure speaks one error contract, and OpenAPI publishes the whole contract.',
  },
  questions: [
    {
      id: '3.4-kc-1',
      focusArea: 'Runtime Validation & Zod',
      prompt:
        'Why is defining a **Zod schema** + `z.infer<typeof Schema>` stronger than writing a TypeScript `interface` alongside manual `if` checks in your route handler?',
      hints: [
        'Remember Sub-block 0.1 (compile-time erasure) and what happens two months later when a field changes.',
        'Compare maintaining one schema vs two separate artifacts.',
        'A TypeScript `interface` performs zero runtime checks, and manual `if` checks can drift out of sync with the interface; Zod uses one schema as a single source of truth for both runtime validation and the compile-time TypeScript type.',
      ],
      explanation:
        'A standalone TypeScript `interface` disappears at runtime, and keeping manual `if` checks synchronized with a separate `interface` quickly drifts as code evolves. A **Zod schema** enforces runtime constraints (`min`, `int`, types, stripping extra fields) while `z.infer` automatically derives the exact matching TypeScript type—creating one single source of truth.',
      evaluationCriteria: [
        'Notes TypeScript interfaces perform no runtime checks',
        'Explains single source of truth (runtime validation + inferred compile-time type avoiding drift)',
      ],
      topicIds: ['3.4.1', '3.4.2', '3.4.3'],
    },
    {
      id: '3.4-kc-2',
      focusArea: 'DTOs & Data Safety',
      prompt:
        'Give **two** security or architectural reasons to map database rows into explicit **input/output DTOs** instead of passing `req.body` straight into `db.insert()` or returning `res.json(dbUser)`.',
      hints: [
        'Think about what happens on signup if a user sends `{ "email": "...", "role": "admin" }`, and what happens on response if `dbUser` has `passwordHash`.',
        'Also think about renaming an internal database column later.',
        'Input DTOs stop clients from injecting privileged fields (like `role: "admin"`), while output DTOs prevent leaking sensitive DB columns (`passwordHash`) and decouple external API shapes from internal table refactors.',
      ],
      explanation:
        '1. **Security (preventing leaks & over-posting)**: Explicit input DTOs whitelist only allowed fields so clients can’t inject `role: "admin"`, and explicit output DTOs project only safe public fields so `passwordHash` or internal columns aren’t serialized.\n2. **Decoupling**: Separating DTOs from database entities lets you refactor internal table names or columns without breaking external API consumers.',
      evaluationCriteria: [
        'Identifies preventing sensitive column leaks / over-posting attacks',
        'Identifies decoupling external API contract from internal DB schema',
      ],
      topicIds: ['3.4.4'],
    },
    {
      id: '3.4-kc-3',
      focusArea: 'Standardized Error Formats',
      prompt:
        'Why should every route in an API return errors using a **standardized JSON structure** with a machine-readable `code` instead of ad-hoc `{ error: "..." }` vs `{ msg: "..." }` strings?',
      hints: [
        'Think from the perspective of a frontend developer writing API error-handling code.',
        'What breaks if one endpoint changes `"Invalid quantity"` to `"Quantity must be positive"`?',
        'A uniform envelope lets client apps parse every `4xx`/`5xx` consistently in one place, and stable error codes (`VALIDATION_ERROR`) avoid brittle string matching when human messages change.',
      ],
      explanation:
        'If every endpoint invents its own error shape, clients need fragile per-endpoint parsing. A **standardized error format** guarantees predictable fields (`code`, `message`, `details`, `requestId`) across the entire API, and machine-readable `code` identifiers let clients react reliably even when human-readable `message` wording is improved or localized.',
      evaluationCriteria: [
        'Explains uniform client-side error parsing across all endpoints',
        'Explains stable machine-readable error codes vs brittle message text',
      ],
      topicIds: ['3.4.5'],
    },
    {
      id: '3.4-kc-4',
      focusArea: 'OpenAPI & Contract Changes',
      prompt:
        'How does deriving **OpenAPI** specs from your validation schemas solve stale API docs, and how can OpenAPI help prevent accidental breaking changes in CI?',
      hints: [
        'Compare hand-edited Markdown docs vs machine-readable OpenAPI specs.',
        'Think about comparing yesterday’s `openapi.json` to today’s PR `openapi.json`.',
        'Generating OpenAPI from schemas keeps live docs synchronized with real runtime rules, and CI can diff the OpenAPI spec between commits to flag breaking contract changes (like removed fields or narrowed types) before merge.',
      ],
      explanation:
        'Handwritten docs go stale whenever routes change; generating **OpenAPI** directly from your validation schemas guarantees interactive documentation reflects the actual runtime contract. Because OpenAPI is structured YAML/JSON, CI pipelines can also automatically diff specs across commits to detect breaking **contract changes** before deployment.',
      evaluationCriteria: [
        'Explains automated sync between runtime schemas and OpenAPI documentation',
        'Explains machine-readable OpenAPI diffing to catch breaking contract changes',
      ],
      topicIds: ['3.4.6', '3.4.7', '3.4.8'],
    },
  ],
};

export const LESSON_3_4_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Turn TypeScript API endpoints from fragile “trust-me” handlers into contract-enforced boundaries: validate untrusted inputs with **Zod**, strip extra fields via **DTOs**, format every failure with a **standardized error envelope**, and keep **OpenAPI** contracts accurate.',
  whenToUseMarkdown:
    'Use this pattern on every HTTP endpoint accepting JSON bodies, query params, or path params—and whenever exposing APIs consumed by frontends, mobile apps, or external integrations.',
  setupCommands: [
    {
      id: '3.4-cmd-1',
      label: 'Install Zod for schema validation',
      command: 'npm install zod',
      notes: 'Zero-dependency schema validation with first-class TypeScript type inference.',
    },
  ],
  coreApisMarkdown: [
    '- **`z.object({ ... })` & `.safeParse(raw)`**: Validate untrusted `unknown` data without throwing; strips unknown keys by default.',
    '- **`z.infer<typeof Schema>`**: Derive the compile-time DTO type straight from the runtime schema.',
    '- **Explicit Mapper Functions (`toPublicOrderDto(row)`)**: Project only safe response fields instead of serializing raw database rows.',
    '- **Error Envelope Helper (`formatApiError`)**: Maps validation issues and domain/internal errors to one uniform JSON shape.',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Define input Zod schemas & infer Input DTOs',
      detailMarkdown:
        'Define path, query, and body schemas with strict bounds (`min`, `max`, `int`, enums) and derive TypeScript types via `z.infer`.',
      code: {
        id: '3.4-step-1',
        title: 'Input schema + inferred DTO',
        language: 'typescript',
        code: `import { z } from "zod";

export const CreateOrderBodySchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(100),
});

export type CreateOrderInput = z.infer<typeof CreateOrderBodySchema>;`,
      },
    },
    {
      stepNumber: 2,
      title: 'Standardize error envelopes',
      detailMarkdown:
        'Create one shared error shape (`code`, `message`, `details`, `requestId`) so Zod validation failures (`400`), domain errors (`404`/`409`), and unexpected failures (`500`) look identical to clients.',
      code: {
        id: '3.4-step-2',
        title: 'Standardized API error payload',
        language: 'typescript',
        code: `export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: Array<{ path: string; message: string }>;
  };
}

export function fromZodError(err: z.ZodError, requestId: string): ApiErrorBody {
  return {
    error: {
      code: "VALIDATION_ERROR",
      message: "Invalid request payload",
      requestId,
      details: err.issues.map((issue) => ({
        path: issue.path.join(".") || "body",
        message: issue.message,
      })),
    },
  };
}`,
      },
    },
    {
      stepNumber: 3,
      title: 'Map internal records to explicit Output DTOs',
      detailMarkdown:
        'Never return raw ORM/SQL rows directly; map to an explicit output DTO (and keep a matching output schema for OpenAPI docs).',
    },
    {
      stepNumber: 4,
      title: 'Publish & diff an OpenAPI contract for breaking changes',
      detailMarkdown:
        'Describe your paths, request/response schemas, and error status codes in OpenAPI YAML/JSON (or generate them from your schemas) and check diffs before merging contract changes.',
    },
  ],
  workingExamples: [
    {
      id: '3.4-ex-1',
      title: 'Complete validated route boundary with Input/Output DTOs and error format',
      language: 'typescript',
      code: `import { z } from "zod";

const CreateUserSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(2).max(60),
});

interface DbUserRow {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
}

interface PublicUserDto {
  id: string;
  email: string;
  displayName: string;
}

function toPublicUserDto(row: DbUserRow): PublicUserDto {
  return { id: row.id, email: row.email, displayName: row.displayName };
}

export function handleCreateUser(rawBody: unknown, requestId: string) {
  const parsed = CreateUserSchema.safeParse(rawBody);
  if (!parsed.success) {
    return {
      status: 400,
      body: {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          requestId,
          details: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
      },
    };
  }

  // parsed.data only has email & displayName; extra keys like role:"admin" were stripped!
  const fakeSavedRow: DbUserRow = {
    id: "usr_101",
    email: parsed.data.email,
    displayName: parsed.data.displayName,
    passwordHash: "hashed_secret",
  };

  return { status: 201, body: toPublicUserDto(fakeSavedRow) };
}`,
      explanation:
        'Demonstrates runtime Zod validation, stripping unallowed fields, standardized validation error output, and explicit Output DTO projection.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Using `schema.parse(rawBody)` without catching `ZodError`.',
      fix: 'Use `safeParse` (or catch `ZodError` in centralized error middleware) so invalid client payloads return `400 VALIDATION_ERROR` instead of `500 Internal Server Error`.',
    },
    {
      mistake: 'Returning `res.json(dbRow)` and relying on a TypeScript return type annotation to hide secret fields.',
      fix: 'TypeScript types erase at runtime (`0.1`). Always construct a fresh Output DTO picking only allowed public properties.',
    },
  ],
  exercise: {
    id: '3.4-ex',
    title: 'Build a Validated Order Endpoint Contract',
    instructionsMarkdown:
      'Design:\n1. A Zod schema `CreateInvoiceSchema` requiring `customerId` (non-empty string), `currency` (`"USD" | "EUR"`), and `amountCents` (positive integer).\n2. A standardized `400 VALIDATION_ERROR` formatter using `safeParse`.\n3. An explicit `toInvoiceDto(row)` mapper that drops `internalAuditSecret`.\n4. A short OpenAPI snippet (YAML or JSON) documenting `POST /v1/invoices` (`201` and `400` responses).',
    acceptanceChecklist: [
      'CreateInvoiceSchema enforces integer amountCents > 0 and currency union',
      'safeParse maps ZodError issues into standardized error envelope with code and details',
      'Output DTO omits internalAuditSecret at runtime',
      'OpenAPI snippet specifies requestBody and 201/400 response schemas',
    ],
  },
};
