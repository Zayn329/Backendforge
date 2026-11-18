import { FptLessonContent } from '../types';

export const LESSON_3_1: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'In Block 2, we followed a request across the internet until encrypted TCP packets arrived at port `443` on a server machine. Now we step *inside* the Node.js server process on the receiving end.',
      'In this unit, we’ll trace what an **HTTP server** actually does from first principles: **what it listens on**, **how it accepts incoming connections**, **how raw text/bytes get parsed into request and response objects**, **the full request lifecycle**, and **how responses finish and connections close cleanly**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Understanding server mechanics explains “address already in use” (`EADDRINUSE`) startup errors, why forgetting `res.end()` hangs browsers forever, why `req` is a readable stream rather than an instant JSON object, and how Keep-Alive keeps sockets open after a single response completes.',
    prerequisites: [
      {
        subBlockId: '1.4',
        label: 'Node.js Event Loop & libuv sockets (1.4.4, 1.4.8)',
        detail:
          'Knowing that libuv watches non-blocking OS sockets and triggers callbacks on the Event Loop when bytes arrive.',
      },
      {
        subBlockId: '2.1',
        label: 'Ports & TCP sockets (2.1.4, 2.1.6, 2.1.8)',
        detail:
          'Understanding that a server binds to a port and communicates through OS socket file descriptors.',
      },
      {
        subBlockId: '2.3',
        label: 'HTTP Request/Response structure (2.3.3–2.3.5, 2.3.9)',
        detail:
          'Knowing HTTP start lines, headers, blank-line separator, optional body, and persistent Keep-Alive connections.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-3.1.1',
      topicId: '3.1.1',
      coveredTopicIds: ['3.1.2', '3.1.3'],
      title: 'What an HTTP server is, what it listens on, and how it accepts connections',
      problemAndRequirementsMarkdown: [
        '### First principles: Why doesn’t a normal Node.js script automatically receive web requests?',
        'If you write a regular Node.js script that logs `"ready"` and stops, nobody on the network can send HTTP traffic to it. Even if a client sends TCP packets to your machine’s IP address, the OS drops them unless a running process has explicitly asked the OS to reserve a **port** and wait for callers.',
        '',
        'Wait—once a server *is* listening on port `3000`, what happens if 50 clients knock at the exact same millisecond? The server can’t keep everyone chatting on one shared welcome desk; it needs a way to accept each caller onto its own dedicated conversation line while immediately going back to greet the next caller!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Listening socket → Accepting connection sockets',
        'An **HTTP server** is simply a long-running process (kept alive by an active `libuv` socket handle from Sub-block `1.5`) that speaks the HTTP protocol over OS network sockets.',
        '',
        'Look at the two distinct jobs happening when you call `server.listen(3000, "0.0.0.0")`:',
        '1. **Listening on an IP interface + Port**: Your server asks the OS kernel to bind a **listening socket** to a specific network address (like `127.0.0.1` for local-only, or `0.0.0.0` for all network interfaces on the machine) and a **port** (`3000`). *(If another process already owns port `3000`, the OS refuses with `EADDRINUSE`!)*',
        '2. **Accepting incoming connections**: When a client completes the TCP 3-way handshake, the OS places that new connection into the listening socket’s **accept queue**. The server calls *accept* (driven by `libuv`), which hands your process a **brand-new per-client connection socket** (a new file descriptor!) dedicated solely to that client, leaving the listening socket free to accept thousands more callers.',
        '```text',
        'Client A (TCP SYN) ──┐',
        'Client B (TCP SYN) ──┼──▶ Listening Socket (:3000) ──accept()──▶ Conn Socket #1 (Client A)',
        '                                                    └──accept()──▶ Conn Socket #2 (Client B)',
        '```',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '3.1.1-ex-1',
            title: 'A minimal Node.js HTTP server listening and handling requests',
            language: 'javascript',
            code: `import http from "node:http";

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain");
  res.end("Hello from port 3000\\n");
});

// Bind to port 3000 on all interfaces and start accepting connections
server.listen(3000, "0.0.0.0", () => {
  console.log("Server listening on http://0.0.0.0:3000");
});`,
          },
          lineByLineMarkdown: [
            '- **`http.createServer(handler)`**: Registers a callback that runs on the Event Loop whenever a complete HTTP request header block arrives on any accepted client socket.',
            '- **`server.listen(3000, "0.0.0.0")`**: Tells the OS to bind port `3000` and keeps the Node Event Loop alive waiting for new TCP connections.',
          ].join('\n'),
        },
      ],
      centralIdeaSummary:
        'An HTTP server binds a listening socket to an IP address and port, then accepts incoming TCP handshakes into individual per-client connection sockets.',
    },
    {
      id: 'topic-3.1.4',
      topicId: '3.1.4',
      coveredTopicIds: ['3.1.5'],
      title: 'Parsing raw HTTP bytes into Request and Response objects',
      problemAndRequirementsMarkdown: [
        '### First principles: A socket only gives you raw chunks of bytes—not `req.url` or `req.headers`!',
        'Remember Sub-block `2.3`? Over TCP, an HTTP request arrives as a continuous stream of bytes (`POST /orders HTTP/1.1\\r\\nHost: ...\\r\\n\\r\\n{"qty":2}`). Even trickier: on a slow network, the headers might arrive in one TCP packet and the JSON body in two later packets!',
        '',
        'Writing manual byte-slicing and `\r\n` splitting inside every single endpoint would be miserable and bug-prone.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: HTTP Parser + `req` and `res` objects',
        'Node’s built-in HTTP module puts a fast **HTTP parser** between the raw TCP socket and your handler callback:',
        '1. As bytes trickle in from the connection socket, the parser watches for the **request line** (`POST /orders HTTP/1.1`) and **headers** up to the blank line (`\\r\\n\\r\\n`).',
        '2. Once headers are complete, Node invokes your handler with two objects:',
        '   - **Request object (`req`, an `IncomingMessage`)**: Gives you the parsed `req.method`, `req.url`, and lowercased `req.headers` immediately—*and* acts as a **Readable Stream** for the body bytes that may still be arriving over the network! (Notice why Express/Fastify need body-parser middleware or built-in body reading: Node doesn’t automatically load a potentially 500 MB upload into RAM unless your code explicitly collects the stream chunks.)',
        '   - **Response object (`res`, a `ServerResponse`)**: Acts as a **Writable Stream** wrapping the same socket, letting you set `res.statusCode`, attach headers (`res.setHeader(...)`), write body chunks, and signal completion.',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '3.1.4-ex-1',
            title: 'Reading a streamed HTTP request body in raw Node.js',
            language: 'javascript',
            code: `import http from "node:http";

const server = http.createServer((req, res) => {
  // Method, URL, and headers are already parsed!
  if (req.method === "POST" && req.url === "/echo") {
    const chunks = [];

    // Body bytes arrive asynchronously as stream 'data' events
    req.on("data", (chunk) => chunks.push(chunk));

    req.on("end", () => {
      const rawBody = Buffer.concat(chunks).toString("utf8");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ received: rawBody }));
    });
    return;
  }

  res.writeHead(404).end("Not found");
});`,
          },
          lineByLineMarkdown: [
            '- **`req.method`, `req.url`**: Available immediately once the HTTP parser finishes reading the header block.',
            '- **`req.on("data")` & `req.on("end")`**: Body bytes stream in chunks via `libuv`; `"end"` fires once `Content-Length` bytes (or the final chunk) arrive.',
          ].join('\n'),
        },
      ],
      edgeCasesAndTradeOffsMarkdown:
        'Streaming `req` protects RAM from blindly buffering huge uploads—which is why production servers also enforce a **body size limit** while collecting `chunks` so a malicious client can’t send 10 GB and crash Node’s heap.',
      centralIdeaSummary:
        'Node’s HTTP parser turns incoming TCP byte streams into a readable Request object (parsed start line/headers plus streamed body) and a writable Response stream.',
    },
    {
      id: 'topic-3.1.6',
      topicId: '3.1.6',
      coveredTopicIds: ['3.1.7', '3.1.8'],
      title: 'Request lifecycle, response completion, and connection closure',
      problemAndRequirementsMarkdown: [
        '### First principles: Why does forgetting `res.end()` leave the browser spinning forever—and does `res.end()` always close the TCP connection?',
        'Two classic surprises happen when learners write their first raw HTTP server:',
        '1. You write `res.write("Hello")` without `res.end()`, hit `localhost:3000`, and the browser loading spinner spins endlessly!',
        '2. You *do* call `res.end()`, the browser shows `"Hello"` instantly, yet when you inspect open sockets, the TCP connection is still open!',
        '',
        'What is the difference between finishing an **HTTP response** and closing the **TCP connection**?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Request Lifecycle, `res.end()`, and Socket Closure',
        'Follow one request through its full lifecycle inside the server:',
        '1. **Connection & Request Start**: Socket accepts connection → parser reads headers → `request` event fires with `(req, res)`.',
        '2. **Processing & Streaming**: Handler reads any `req` body chunks, runs async work (`await db.query(...)`), and sets `res.statusCode` and headers. *(Important: once the first body byte is written with `res.write()`, headers are flushed onto the wire and can no longer be modified!)*',
        '3. **Response Completion (`res.end()`)**: Calling `res.end()` tells the HTTP client, *“Every byte of this HTTP response is now complete.”* Without `res.end()`, the client keeps waiting for more bytes until a timeout expires.',
        '4. **Connection Closure vs. Reuse (Keep-Alive)**: Finishing the *response* (`res.end()`) does **not** automatically tear down the underlying TCP socket! Under HTTP/1.1 Keep-Alive (Sub-block `2.3`), the socket returns to an idle pool so the same client can send Request #2 immediately. The TCP socket closes only when:',
        '   - A side sends `Connection: close` (or HTTP close is requested),',
        '   - The server’s **idle Keep-Alive timeout** expires,',
        '   - The client disconnects cleanly (`FIN`) or aborts mid-request (`req` emits `"close"` before finishing), or',
        '   - The server shuts down (`server.close()`).',
      ].join('\n\n'),
      backendApplicationsMarkdown:
        'If a client closes their laptop or cancels `fetch` mid-request, `req` / `res` emits a `"close"` event while work may still be running—letting your server stop wasted database work early (which we’ll pair with cancellation in `3.2`).',
      centralIdeaSummary:
        'A request moves from socket acceptance and header parsing through async processing to `res.end()` (completing the HTTP message), while the underlying TCP socket stays open for Keep-Alive reuse until explicit close, client disconnect, or idle timeout.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Tracing one socket through multiple HTTP requests inside Node.js',
    narrativeMarkdown: [
      'Now connect OS sockets (`2.1`), the Event Loop (`1.4`), and HTTP parsing into one server timeline:',
      '1. **`server.listen(3000)`** binds the listening socket and keeps Node alive.',
      '2. Client connects via TCP 3-way handshake → kernel hands Node a dedicated **client socket**.',
      '3. **Request #1** arrives → HTTP parser builds `(req, res)` → handler runs → **`res.end()`** completes Response #1.',
      '4. Socket remains open (`Keep-Alive`) → **Request #2** arrives over the *same* socket → **`res.end()`** completes Response #2 → after idle timeout, socket closes (`FIN`).',
    ].join('\n\n'),
    integratedExample: {
      id: '3.1-integrated-example',
      title: 'Server socket vs HTTP request lifecycle timeline',
      language: 'text',
      code: `server.listen(3000) ──▶ [Listening Socket bound to 0.0.0.0:3000]
   │
   ▼ Client connects (TCP SYN/SYN-ACK/ACK)
[Accepted Client Socket #1]
   ├── Request #1 bytes arrive ─▶ HTTP Parser ─▶ handler(req, res) ─▶ res.end() [Response #1 done]
   │   (TCP Socket stays OPEN via Keep-Alive!)
   ├── Request #2 bytes arrive ─▶ HTTP Parser ─▶ handler(req, res) ─▶ res.end() [Response #2 done]
   │
   ▼ Idle keep-alive timeout expires (or client disconnects / server.close())
[TCP FIN / Socket Closed & File Descriptor Freed]`,
    },
    walkthroughMarkdown:
      'Separating **connection lifetime** (accept → Keep-Alive reuse → socket close) from **request lifetime** (parse headers → stream body → run handler → `res.end()`) is the foundation every framework—Express, Fastify, or raw `node:http`—is built on.',
  },
  questions: [
    {
      id: '3.1-kc-1',
      focusArea: 'Listening vs Accepting Connections',
      prompt:
        'When a Node.js server calls `server.listen(3000)`, what happens if 20 clients connect around the same time? Explain the difference between the **listening socket** and **accepted connection sockets**.',
      hints: [
        'Does every client share the same file descriptor that listens on port 3000?',
        'Think about what the OS hands back each time a client completes the TCP 3-way handshake.',
        'The listening socket only waits on `0.0.0.0:3000` (or `127.0.0.1:3000`) for new handshakes; accepting creates a separate per-client connection socket for each caller while the listening socket keeps listening.',
      ],
      explanation:
        '`server.listen(3000)` binds a single **listening socket** to that IP interface and port. When clients complete TCP handshakes, accepting each connection gives the server a distinct **per-client connection socket** (its own file descriptor) for exchanging HTTP bytes, while the listening socket continues accepting new callers.',
      evaluationCriteria: [
        'Distinguishes the bound listening socket from per-client accepted sockets',
        'Explains how concurrent clients get independent connection sockets',
      ],
      topicIds: ['3.1.1', '3.1.2', '3.1.3'],
    },
    {
      id: '3.1-kc-2',
      focusArea: 'HTTP Parsing & Streams',
      prompt:
        'Why are `req.method` and `req.headers` ready immediately when your `createServer((req, res) => ...)` callback runs, whereas reading a JSON `POST` body requires listening to `data` and `end` stream events?',
      hints: [
        'Look at when Node’s HTTP parser fires your request callback.',
        'Imagine a client uploading a 50 MB payload over slow Wi-Fi—should Node freeze or buffer everything blindly into heap RAM before calling your handler?',
        'Node’s HTTP parser waits only for the start line and headers (`\\r\\n\\r\\n`) to build `req` and invoke your handler; the body streams in asynchronously as chunks so you can validate limits or stream without blindly buffering huge payloads.',
      ],
      explanation:
        'Node’s HTTP parser reads incoming socket bytes until the header block ends (`\\r\\n\\r\\n`), parses `method`, `url`, and `headers`, and immediately invokes your handler. Because request bodies can be large or arrive slowly across multiple TCP packets, `req` exposes the body as a **Readable Stream** (`data` and `end` events) instead of forcing Node to buffer arbitrarily huge payloads in RAM upfront.',
      evaluationCriteria: [
        'Explains headers are parsed before invoking the handler',
        'Explains `req` body as an asynchronous stream avoiding blind memory buffering',
      ],
      topicIds: ['3.1.4', '3.1.5'],
    },
    {
      id: '3.1-kc-3',
      focusArea: 'Response Completion vs Socket Closure',
      prompt:
        'Why does omitting `res.end()` hang a client request indefinitely, and why does calling `res.end()` normally *not* close the underlying TCP connection immediately?',
      hints: [
        'How does the browser know the server won’t send one more `res.write("...")` chunk?',
        'Remember HTTP/1.1 Keep-Alive from Sub-block 2.3.',
        '`res.end()` signals that the HTTP response message is complete so the client stops waiting; under HTTP Keep-Alive, the TCP socket stays open afterwards to reuse for the next request until idle timeout or explicit close.',
      ],
      explanation:
        'Because `res` is a writable stream, the client has no way to know the response is finished until **`res.end()`** sends the final framing/completion marker—without it, the request hangs. Calling `res.end()` finishes the *HTTP request/response cycle*, **not** necessarily the *TCP connection*: with HTTP Keep-Alive, the socket stays open for reuse until a close header, disconnect, or idle timeout.',
      evaluationCriteria: [
        'Explains `res.end()` as completing the HTTP response message',
        'Separates HTTP response completion from Keep-Alive TCP socket lifetime',
      ],
      topicIds: ['3.1.6', '3.1.7', '3.1.8'],
    },
    {
      id: '3.1-kc-4',
      focusArea: 'Header Timing & Client Disconnects',
      prompt:
        'Once your handler calls `res.write("first chunk")`, why can’t a later error handler change `res.statusCode = 500`? Also, how can a server tell if a client cancelled early before `res.end()`?',
      hints: [
        'Think about the order of an HTTP response over a byte stream: status line -> headers -> body.',
        'What event fires on `req` / `res` if the client tears down the socket mid-flight?',
        'HTTP status and headers must be sent on the wire before any body bytes, so calling `res.write` flushes and locks headers; if a client disconnects early, the request/response emits a `"close"` event.',
      ],
      explanation:
        'In HTTP’s wire format, the status line and headers come *before* the body (`Sub-block 2.3`). Sending the first body chunk via `res.write()` flushes the status and headers onto the TCP socket, so changing `statusCode` afterwards is too late. If a client aborts mid-request, Node emits a `"close"` event on `req`/`res`, signaling the handler to abort leftover work.',
      evaluationCriteria: [
        'Explains headers flush before body bytes on the wire',
        'Identifies `"close"` signal/event for premature client disconnect',
      ],
      topicIds: ['3.1.5', '3.1.6', '3.1.8'],
    },
  ],
};

export const LESSON_3_2: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'In Sub-block 3.1, we saw how `http.createServer((req, res) => ...)` gives us raw request and response streams inside a single callback. On a real backend with 40 endpoints, authentication, validation, error formatting, and logging, stuffing everything into one giant `if/else` function quickly becomes unmanageable.',
      'In this unit, we’ll derive the **Request Processing Pipeline** from first principles: **routing and URL matching**, **middleware architecture, execution order, and request context**, **validation and authentication middleware**, **centralized error handling and response serialization**, and **request cancellation and timeouts**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Every Node.js framework (Express, Fastify, Hono, NestJS) is built around this exact pipeline. Understanding middleware order, request context, error propagation, and cancellation prevents classic production bugs like “headers already sent,” unprotected routes, or queries continuing long after a client hung up.',
    prerequisites: [
      {
        subBlockId: '3.1',
        label: 'HTTP Server req/res lifecycle (3.1.5–3.1.8)',
        detail:
          'Knowing how `req` streams input, headers lock once body bytes flush, and `"close"` fires when clients abort.',
      },
      {
        subBlockId: '0.2',
        label: 'Async functions & explicit error contracts (0.2.2, 0.2.3)',
        detail:
          'Understanding how async continuations work and separating expected domain failures from unexpected throws.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-3.2.1',
      topicId: '3.2.1',
      coveredTopicIds: ['3.2.2'],
      title: 'Routing: matching methods and URLs to handlers',
      problemAndRequirementsMarkdown: [
        '### First principles: Why doesn’t one giant handler function scale?',
        'Imagine your API starts with two endpoints (`GET /health` and `POST /orders`), and then grows to `GET /orders/:id`, `DELETE /orders/:id`, `GET /users/:userId/invoices`, and 30 more routes.',
        '',
        'Putting all of those in one `if (req.url === ...)` ladder mixes path-parsing string logic (`split("/")`) directly with business logic, makes it painful to extract parameters like `:id`, and ignores HTTP methods (`GET /orders` vs `POST /orders`).',
        '',
        '### Deriving the requirement',
        'We need a **router**: a dispatcher that inspects `(method, pathname)`—ignoring query strings like `?page=2` during route matching—matches static and parameterized segments (`/orders/:id`), extracts route parameters (`{ id: "42" }`), and runs only the matching handler (or returns `404` if nothing matches).',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: How URLs match route handlers',
        'A **router** compares the incoming request against a table of registered `(METHOD, pattern) → handler` entries:',
        '1. **Split path from query string**: For `GET /orders/42?expand=items`, route matching inspects `/orders/42`, while `?expand=items` becomes query parameters.',
        '2. **Match method + path pattern**: `GET /orders/:id` matches `GET /orders/42` and binds `params.id = "42"`, whereas `POST /orders/42` does not match a `GET` route.',
        '3. **Order / specificity matters**: Static routes like `/orders/summary` must be checked (or ranked) ahead of parameterized `/orders/:id`—otherwise `"summary"` gets treated as an `:id`!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Routing decouples endpoint dispatch from business logic by matching an incoming HTTP method and path pattern (extracting dynamic parameters like `:id`) to the right handler.',
      codeExamples: [],
    },
    {
      id: 'topic-3.2.3',
      topicId: '3.2.3',
      coveredTopicIds: ['3.2.4', '3.2.5'],
      title: 'Middleware architecture, execution order, and request context',
      problemAndRequirementsMarkdown: [
        '### First principles: Where do logging, timing, auth, and parsing live without repeating them in 40 handlers?',
        'Suppose every endpoint in your API needs the same four chores:',
        '1. Assign a `requestId` and measure how long the request took.',
        '2. Parse the JSON request body.',
        '3. Verify the caller’s authentication token.',
        '4. Catch unexpected errors cleanly.',
        '',
        'Copy-pasting those 25 lines into all 40 route handlers means updating 40 files every time a header name changes—and forgetting one route leaves a security hole!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: The Middleware Chain and Request Context',
        'Instead of jumping straight to the route handler, requests flow through a **middleware pipeline**—an ordered chain of small, focused steps wrapped around the handler like concentric onion layers (or an assembly line):',
        '```text',
        'Request ──▶ [1. Logger/Timer] ──▶ [2. Auth] ──▶ [3. Route Handler] ──▶ Response',
        '                   ▲                                      │',
        '                   └────── runs "after" when next() awaits/returns',
        '```',
        'Two rules make middleware either crystal clear or a source of subtle bugs:',
        '- **Execution order matters strictly**: Middleware runs in the **exact order registered**! If your Auth middleware tries to read `req.cookies`, Cookie-parser middleware *must* run before Auth. Once a middleware sends a response (e.g., Auth rejects with `401`), it **stops** and does *not* call `next()`—short-circuiting downstream handlers cleanly.',
        '- **Request Context**: How does Auth middleware pass `userId: "u_9"` or Logger pass `requestId` down to the route handler without touching global variables (which would overwrite each other across concurrent async requests!)? By attaching per-request metadata to a **request context** scoped strictly to *that single request* (e.g., `ctx.user`, `ctx.requestId`, or `AsyncLocalStorage`).',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '3.2.3-ex-1',
            title: 'Onion-style async middleware pipeline with per-request context',
            language: 'typescript',
            code: `interface RequestContext {
  requestId: string;
  userId?: string;
}

type Next = () => Promise<void>;
type Middleware = (ctx: RequestContext, next: Next) => Promise<void>;

async function runPipeline(ctx: RequestContext, middlewares: Middleware[]) {
  let index = -1;
  async function dispatch(i: number): Promise<void> {
    if (i <= index) throw new Error("next() called multiple times");
    index = i;
    const fn = middlewares[i];
    if (!fn) return;
    await fn(ctx, () => dispatch(i + 1)); // Pass control to next layer
  }
  await dispatch(0);
}`,
          },
          lineByLineMarkdown: [
            '- **`ctx: RequestContext`**: Holds data strictly isolated to one request (never module-global state that concurrent requests could overwrite).',
            '- **`await fn(ctx, () => dispatch(i + 1))`**: Each middleware runs code *before* `await next()`, awaits downstream middleware + the route handler, and can run timing/logging *after* `await next()` unwinds.',
          ].join('\n'),
        },
      ],
      centralIdeaSummary:
        'Middleware chains execute reusable cross-cutting steps in registration order, passing per-request data forward through an isolated request context and short-circuiting early when needed.',
    },
    {
      id: 'topic-3.2.6',
      topicId: '3.2.6',
      coveredTopicIds: ['3.2.7'],
      title: 'Validation and authentication middleware',
      problemAndRequirementsMarkdown: [
        '### First principles: Keeping untrusted input and unauthenticated callers out of business logic',
        'Before a route handler ever touches your database (`createOrder`), two gates must pass:',
        '1. **Who is calling?** (**Authentication middleware**) — checking the `Authorization` header or session cookie, attaching `ctx.user`, or returning `401 Unauthorized` immediately.',
        '2. **Is their input shaped validly?** (**Validation middleware**) — checking body/query/params at runtime (`0.1`) and returning `400 Bad Request` with clear field errors if anything is missing or wrong.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Ordering gates cleanly',
        'Notice why ordering **Authentication → Validation → Route Handler** makes sense:',
        '- Unauthenticated callers get rejected with `401` right away before wasting CPU parsing or validating complex payloads.',
        '- Validating input in a dedicated stage means the route handler receives clean, typed, verified data instead of defensive `typeof` checks scattered everywhere.',
        '- *(Exception: public endpoints like `POST /login` skip auth middleware and go straight to validation!)*',
      ].join('\n\n'),
      centralIdeaSummary:
        'Authentication middleware establishes caller identity into request context (rejecting with 401), while validation middleware enforces runtime input shapes (rejecting with 400) before route handlers execute.',
      codeExamples: [],
    },
    {
      id: 'topic-3.2.8',
      topicId: '3.2.8',
      coveredTopicIds: ['3.2.9', '3.2.10'],
      title: 'Centralized error handling, response serialization, and timeouts/cancellation',
      problemAndRequirementsMarkdown: [
        '### First principles: What happens when step 3 throws, or when the client gives up waiting?',
        'Three edge cases turn fragile toy servers into resilient production pipelines:',
        '1. If a handler throws an unexpected database error, you must **never** leak raw stack traces or SQL snippets to the client—nor forget to send an HTTP response (`3.1`)!',
        '2. Handlers prefer returning clean JS objects (`{ id: "ord_1", total: 50 }`), yet HTTP sockets only send bytes (`JSON.stringify`, `Content-Type: application/json`).',
        '3. If a client hits cancel (closes the browser tab) or a slow query drags past 10 seconds, keeping that work running burns database connections for nobody!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Error Boundaries, Serialization, and Cancellation',
        '- **Centralized Error Handling**: Wrapping the pipeline in a top-level `try/catch` (or Express-style error middleware `(err, req, res, next)`) catches both thrown errors and async rejections from *any* downstream route. It logs the full internal stack trace on the server, maps known domain errors (`NotFoundError` → `404`, `ValidationError` → `400`), and returns a clean generic `500` JSON body for unexpected bugs—provided headers haven’t already been sent!',
        '- **Response Serialization**: Converting domain objects into the wire representation (typically UTF-8 JSON via `JSON.stringify` with `Content-Type: application/json`, explicitly projecting only allowed public fields so secrets like `passwordHash` from `0.1.2` don’t leak!).',
        '- **Request Cancellation & Timeouts**: Node’s `AbortController` / `AbortSignal` connects straight to `req.on("close")` and server timeouts: if the client disconnects early or a request timeout fires, the `AbortSignal` notifies downstream HTTP fetches or database drivers to **cancel in-flight work** rather than wasting server resources—and guards against writing a duplicate response after a timeout already sent `504`/`408`.',
      ].join('\n\n'),
      edgeCasesAndTradeOffsMarkdown:
        'Be careful of the **double-response bug**: if a timeout fires at 5s and sends `504 Gateway Timeout`, and 100ms later the slow database query finally finishes and calls `res.end()`, Node throws `ERR_HTTP_HEADERS_SENT`. Always check `res.headersSent` / `signal.aborted` before writing responses!',
      centralIdeaSummary:
        'Centralized error handling turns downstream failures into safe HTTP statuses, serialization maps domain data cleanly to JSON bytes, and timeouts + abort signals cancel abandoned work and prevent double responses.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Following one request through the complete processing pipeline',
    narrativeMarkdown: [
      'Now look at all stages of `3.2` working as one cohesive pipeline:',
      '1. **Outer Error Boundary & Timeout/Cancel**: Wraps everything below in `try/catch` and creates an `AbortController` linked to client `"close"` and a deadline timer.',
      '2. **Logging / Request Context**: Assigns `requestId` and starts a latency clock.',
      '3. **Authentication Middleware**: Verifies token, attaches `ctx.user` (or returns `401`).',
      '4. **Router**: Matches `POST /orders` → runs **Validation Middleware** → runs **`createOrderHandler(ctx, input)`**.',
      '5. **Serialization**: Converts handler output to JSON (`201 Created`) and finishes cleanly via `res.end()`.',
    ].join('\n\n'),
    integratedExample: {
      id: '3.2-integrated-example',
      title: 'Pipeline order: error boundary, context, auth, routing, validation, serialization',
      language: 'text',
      code: `Incoming Request (POST /orders)
   │
   ▼ 1. Timeout + Client Close AbortController + Top-level Error Handler (try/catch)
   ▼ 2. Request Context & Logger (assigns requestId, starts timer)
   ▼ 3. Authentication Middleware (verifies Bearer token -> sets ctx.user, or 401)
   ▼ 4. Router matches (POST, /orders)
   ▼ 5. Validation Middleware (validates JSON body -> clean typed DTO, or 400)
   ▼ 6. Route Handler (executes domain logic passing AbortSignal to DB)
   ▼ 7. Response Serializer (sets 201 + Content-Type: application/json -> res.end())`,
    },
    walkthroughMarkdown:
      'Every piece stays small and focused because order is explicit: auth guards identity, validation guards shapes, the handler owns business decisions, serialization formats output, and the outer error boundary catches anything unexpected.',
  },
  questions: [
    {
      id: '3.2-kc-1',
      focusArea: 'Middleware Order & Short-Circuiting',
      prompt:
        'Suppose a team registers routes in this order: (1) Router (`POST /orders`), then (2) Authentication middleware, then (3) JSON body parser. What breaks in practice, and how does middleware **short-circuiting** work when authentication fails?',
      hints: [
        'Remember: middleware runs in exact registration order.',
        'What does `POST /orders` see when it runs before Auth and before JSON parsing?',
        'Because `POST /orders` ran first, unauthenticated callers bypass Auth and `req.body` isn’t parsed yet; properly placed Auth runs before routes and stops the chain by returning `401` without calling `next()`.',
      ],
      explanation:
        'Middleware executes strictly in **registration order**. Putting the router first lets callers hit `POST /orders` before Authentication runs and before the JSON body is parsed. Auth should sit *before* protected routes—and when verification fails, it sends `401 Unauthorized` and **does not call `next()`**, short-circuiting downstream middleware and route handlers.',
      evaluationCriteria: [
        'Identifies registration order dependency (Auth + parser before routes)',
        'Explains short-circuiting by sending response without calling `next()`',
      ],
      topicIds: ['3.2.1', '3.2.3', '3.2.4', '3.2.7'],
    },
    {
      id: '3.2-kc-2',
      focusArea: 'Request Context Isolation',
      prompt:
        'Why should user identity (`userId`) or a `requestId` set by middleware live in a **per-request context** rather than a module-level `let currentUserId = null` variable?',
      hints: [
        'Recall from Block 1 how Node.js’s Event Loop interleaves multiple concurrent async requests.',
        'Trace what happens if User A awaits a DB call while User B’s request enters the middleware.',
        'Concurrent requests share module scope on the Event Loop: User B would overwrite `currentUserId` while User A is paused at `await`, leaking User B’s identity into User A’s response!',
      ],
      explanation:
        'Node’s Event Loop serves thousands of requests concurrently in the same process. While Request A pauses on `await db.query(...)`, Request B enters middleware and would overwrite a module-level `currentUserId`, corrupting User A’s permissions or logs. Storing `userId` and `requestId` in a **per-request context** keeps every concurrent request isolated.',
      evaluationCriteria: [
        'Connects Event Loop async interleaving to shared module variable corruption',
        'Explains per-request context isolating concurrent requests',
      ],
      topicIds: ['3.2.5'],
    },
    {
      id: '3.2-kc-3',
      focusArea: 'Centralized Error Handling & Serialization',
      prompt:
        'What are two key benefits of a **centralized error handler** at the top of the pipeline over repeating `try/catch` formatting in every route—and what happens if an error is thrown *after* a streaming handler already called `res.write()`?',
      hints: [
        'Think about stack-trace safety, consistent JSON error shapes, and DRY status mapping.',
        'Recall from Sub-block 3.1 what `res.write()` does to HTTP status/headers on the wire.',
        'Centralized error handling avoids leaking internal stack traces and enforces consistent JSON error formats; however, once `res.write()` flushes headers (`res.headersSent === true`), a later error cannot change the HTTP status code to `500`.',
      ],
      explanation:
        'A centralized error handler catches uncaught sync/async failures across all routes in one place, logs full details internally, prevents accidentally leaking stack traces or SQL to users, and emits consistent JSON error responses (`4xx`/`5xx`). However, if a handler already called `res.write()`, headers are flushed (`res.headersSent` is true)—so you can no longer overwrite the status code to `500` cleanly.',
      evaluationCriteria: [
        'Explains consistent safe error responses and hiding internal stack traces',
        'Notes `res.headersSent` constraint after streaming body bytes',
      ],
      topicIds: ['3.2.8', '3.2.9'],
    },
    {
      id: '3.2-kc-4',
      focusArea: 'Cancellation, Timeouts & Double-Response Guards',
      prompt:
        'A request triggers a 12-second database query, but your server times out the request at 5 seconds and sends `504`. What two things go wrong if you don’t use **cancellation (`AbortSignal`)** and **`res.headersSent` guards**?',
      hints: [
        'Think about (1) what the database keeps doing for the remaining 7 seconds, and (2) what happens when that DB query finishes at second 12.',
        'Remember what Node does if you try to send headers twice on one response.',
        'Without an `AbortSignal`, the abandoned DB query keeps burning server/DB resources for nothing; without checking `res.headersSent`, the handler tries to send `200 OK` after `504` was already sent, crashing with `ERR_HTTP_HEADERS_SENT`.',
      ],
      explanation:
        'First, without propagating a cancellation signal (`AbortSignal`), the slow database query keeps consuming CPU, memory, and a DB connection for 7 wasted seconds even though the user already got `504`. Second, when that late query eventually resolves and tries to write `200 OK`, calling `setHeader`/`writeHead` again causes an `ERR_HTTP_HEADERS_SENT` error unless guarded by checking `res.headersSent` / `signal.aborted`.',
      evaluationCriteria: [
        'Identifies wasted DB/backend work without cancellation propagation',
        'Identifies duplicate header/response error (`ERR_HTTP_HEADERS_SENT`) without guards',
      ],
      topicIds: ['3.2.10'],
    },
  ],
};
