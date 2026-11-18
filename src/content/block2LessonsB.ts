import { FptLessonContent } from '../types';

export const LESSON_2_3: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'In Sub-blocks 2.1 and 2.2, we built a reliable, encrypted pipe between client and server (TCP + TLS). Right now, though, that pipe only carries raw, unlabeled bytes—it doesn’t know what an “endpoint,” a “status,” or a “JSON body” is!',
      'In this unit, we’ll explore **HTTP** from first principles: **why HTTP was designed around stateless request/response messages**, **what requests, responses, methods, headers, bodies, and status codes look like**, **how HTTP evolved from HTTP/1.1 Keep-Alive to HTTP/2 multiplexing and HTTP/3 (QUIC)**, and **how compression, streaming responses, and timeouts work in production**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Every REST API, webhook, reverse proxy, and browser request speaks HTTP. Understanding HTTP’s message structure, statelessness, connection reuse, and streaming explains everything from 4xx vs 5xx debugging to why HTTP/2 fixed waterfall delays and why timeouts protect servers.',
    prerequisites: [
      {
        subBlockId: '2.1',
        label: 'TCP reliable streams & handshakes (2.1.7–2.1.9)',
        detail:
          'Knowing that TCP delivers an ordered byte stream after a 3-way handshake.',
      },
      {
        subBlockId: '2.2',
        label: 'TLS & HTTPS (2.2.5, 2.2.7)',
        detail:
          'Understanding that HTTPS runs HTTP inside an encrypted TLS tunnel over TCP.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-2.3.1',
      topicId: '2.3.1',
      coveredTopicIds: ['2.3.2', '2.3.7'],
      title: 'Why HTTP was designed: stateless request/response messaging',
      problemAndRequirementsMarkdown: [
        '### First principles: Why isn’t a raw TCP byte stream enough for web APIs?',
        'Imagine your frontend opens a TCP connection to your backend and writes raw bytes: `"get user 42"`. Notice all the questions TCP leaves unanswered:',
        '- How does the server know *where* one message ends and the next begins?',
        '- How does the client say *what format* it is sending (JSON vs an uploaded image)?',
        '- How does the server tell the client whether the work succeeded, the input was invalid, or the server crashed?',
        '',
        '### Deriving the protocol',
        'We need a shared **application-layer contract** on top of the byte stream where:',
        '1. Every interaction follows a predictable **Request → Response** turn: the client sends a structured request; the server sends back a structured response.',
        '2. Every request is **stateless**: it carries all context the server needs (like an auth token or cookie) right inside that request, rather than relying on the server’s RAM remembering previous requests.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Request/Response and Statelessness',
        'In **HTTP (Hypertext Transfer Protocol)**, communication is structured into discrete **Request** and **Response** messages.',
        '',
        'Look closely at **statelessness**, because it shapes all modern backend architecture: by protocol design, HTTP treats **each request independently**. Once the server finishes sending a response, HTTP does not assume the server remembers anything about Request #1 when Request #2 arrives—even over the same connection!',
        '',
        'Why is statelessness so valuable? Remember from Sub-block `1.5` that production backends run multiple worker processes or servers behind a load balancer. Because Request #1 can hit Server A and Request #2 can hit Server B, keeping requests stateless (sending credentials/IDs per request and storing durable state in a database or Redis) lets *any* healthy backend server handle *any* request!',
      ].join('\n\n'),
      centralIdeaSummary:
        'HTTP structures raw byte streams into clear Request/Response exchanges where every request is stateless and self-contained, letting any backend instance serve it independently.',
      codeExamples: [],
    },
    {
      id: 'topic-2.3.3',
      topicId: '2.3.3',
      coveredTopicIds: ['2.3.4', '2.3.5', '2.3.6'],
      title: 'Anatomy of an HTTP Request and Response (methods, headers, body, status codes)',
      problemAndRequirementsMarkdown: [
        '### First principles: What exact information must every HTTP message carry?',
        'Whether asking for a user profile or submitting a payment, both sides need three essentials in a clear, readable envelope: **what action/outcome happened** (the start line), **metadata about the payload** (headers), and **the actual data** (optional body).',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Request & Response Structure',
        'Look at an HTTP/1.1 request and response side by side—there is no magic binary mystery here, just clear structured text:',
        '```http',
        '── HTTP Request ──────────────────────────────────────────',
        'POST /api/orders HTTP/1.1          <-- Method, Target Path, HTTP Version',
        'Host: api.example.com              <-- Headers (Key: Value metadata)',
        'Authorization: Bearer eyJ...',
        'Content-Type: application/json',
        'Content-Length: 31',
        '                                   <-- Blank line separating headers & body',
        '{"productId":"sku_9","qty":2}      <-- Optional Body (payload)',
        '',
        '── HTTP Response ─────────────────────────────────────────',
        'HTTP/1.1 201 Created               <-- Version, Status Code, Reason Phrase',
        'Content-Type: application/json',
        'Content-Length: 27',
        '',
        '{"orderId":"ord_401"}              <-- Optional Response Body',
        '```',
        'Let’s unpack the three key pieces inside that structure:',
        '- **Methods (verbs describing intent)**: `GET` (fetch data, no request body needed), `POST` (create/submit work), `PUT` (replace a resource), `PATCH` (partially update), and `DELETE` (remove).',
        '- **Headers (key-value metadata)**: Carry context *about* the message—who you are (`Authorization`), how to parse the body (`Content-Type: application/json`), how long the body is (`Content-Length`), or caching rules (`Cache-Control`).',
        '- **Status Codes (3-digit outcome families)**:',
        '  - **`2xx` (Success)**: `200 OK`, `201 Created`, `204 No Content`.',
        '  - **`3xx` (Redirection)**: `301`/`302` redirect to another URL, `304 Not Modified`.',
        '  - **`4xx` (Client Error)**: The *client’s* request was invalid, unauthorized, or missing—`400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.',
        '  - **`5xx` (Server Error)**: The *server* failed while handling a valid-looking request—`500 Internal Server Error`, `502 Bad Gateway`, `503 Service Unavailable`, `504 Gateway Timeout`.',
      ].join('\n\n'),
      backendApplicationsMarkdown:
        'Returning honest `4xx` vs `5xx` status codes matters for monitoring: a spike in `400`/`404` points to bad client inputs or broken frontend links, whereas `500`/`503` alerts mean your backend or database is failing!',
      centralIdeaSummary:
        'HTTP requests pair a method, path, headers, and optional body; responses pair a semantic status code (`2xx`/`3xx`/`4xx`/`5xx`), metadata headers, and optional body.',
      codeExamples: [],
    },
    {
      id: 'topic-2.3.8',
      topicId: '2.3.8',
      coveredTopicIds: ['2.3.9'],
      title: 'HTTP/1.1, Keep-Alive, and persistent connections',
      problemAndRequirementsMarkdown: [
        '### First principles: Why was opening a new TCP/TLS connection per request so slow?',
        'Imagine a web page loads 1 HTML document, 4 API calls, and 15 images. In early HTTP/1.0, the client opened a TCP connection, sent **one** request, read **one** response, and closed the socket—20 separate times!',
        '',
        'Remember Blocks `2.1` and `2.2`? Every new HTTPS connection costs a TCP 3-way handshake + TLS handshake (multiple round-trips of waiting before sending even 1 HTTP byte) *and* leaves old sockets piling up in `TIME_WAIT`.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: HTTP/1.1 Persistent Connections (`Keep-Alive`)',
        '**HTTP/1.1** solved that waste by making **persistent connections (`Connection: keep-alive`)** the default:',
        '1. Client opens TCP + TLS **once**.',
        '2. Client sends Request #1 and receives Response #1.',
        '3. Instead of tearing down the socket, both sides **keep the TCP+TLS connection open** and immediately reuse it for Request #2, #3, and #4!',
        '',
        '**Wait—what limitation remained in HTTP/1.1?**',
        'Even with Keep-Alive, an HTTP/1.1 connection is still **one request at a time in sequence** (known as **HTTP head-of-line blocking**): Request #2 cannot receive its response on that socket until Request #1 finishes completely. To load 6 assets concurrently, browsers opened 6 separate TCP connections—wasting handshakes and sockets!',
      ].join('\n\n'),
      centralIdeaSummary:
        'HTTP/1.1 introduced persistent Keep-Alive connections so multiple sequential requests reuse one TCP/TLS handshake, though each connection still stalls behind slow earlier responses (head-of-line blocking).',
      codeExamples: [],
    },
    {
      id: 'topic-2.3.10',
      topicId: '2.3.10',
      coveredTopicIds: ['2.3.11'],
      title: 'HTTP/2 multiplexing and HTTP/3 (QUIC)',
      problemAndRequirementsMarkdown: [
        '### First principles: Can we send 20 requests concurrently over ONE connection—and what happens if one TCP packet drops?',
        'Having browsers open 6 parallel TCP connections per domain was a clumsy workaround for HTTP/1.1’s sequential bottleneck. Why couldn’t one single connection carry dozens of independent requests and responses simultaneously without waiting for each other?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: HTTP/2 Multiplexing → HTTP/3 & QUIC',
        '1. **HTTP/2 Multiplexing**: Instead of sending plain text messages sequentially one after another, HTTP/2 splits every request and response into small binary **frames**, each tagged with a **Stream ID** (`Stream 1`, `Stream 3`, `Stream 5`).',
        '   Over **one** TCP connection, frames from multiple requests and responses can interleave freely—so a slow API call on Stream 1 no longer stalls fast responses on Stream 3 or Stream 5! (HTTP/2 also compresses repetitive headers to save bandwidth.)',
        '',
        '2. **The hidden TCP bottleneck that led to HTTP/3 + QUIC**:',
        '   Wait—HTTP/2 fixed head-of-line blocking *inside HTTP*, **but HTTP/2 still runs on top of a single TCP byte stream!** Remember from `2.1` that TCP delivers bytes strictly in order: if *one* network packet carrying bytes for Stream 1 drops on Wi-Fi, the **OS TCP layer pauses the entire connection**—stalling Stream 3 and Stream 5 too until that single TCP packet is retransmitted!',
        '   **HTTP/3** solves this by replacing TCP with **QUIC**, a modern transport protocol built over **UDP**:',
        '   - QUIC handles encryption (TLS 1.3 built in) and reliability itself—so connection + security setup happens in fewer round-trips.',
        '   - QUIC keeps **truly independent streams**: if a packet drops for Stream 1, only Stream 1 waits for retransmission while Streams 3 and 5 keep flowing uninterrupted!',
      ].join('\n\n'),
      centralIdeaSummary:
        'HTTP/2 multiplexes concurrent tagged streams over one TCP connection, while HTTP/3 runs over QUIC (UDP) so independent streams no longer stall together on a single lost TCP packet.',
      codeExamples: [],
    },
    {
      id: 'topic-2.3.12',
      topicId: '2.3.12',
      coveredTopicIds: ['2.3.13', '2.3.14'],
      title: 'Compression, transfer encoding, streaming responses, and timeouts',
      problemAndRequirementsMarkdown: [
        '### First principles: Sending large payloads cleanly without blowing memory or hanging forever',
        'Three practical problems show up fast in real HTTP APIs:',
        '1. Sending 500 KB of repetitive JSON text wastes mobile bandwidth and latency.',
        '2. If a server generates a 200 MB CSV export or streams live AI/log output, waiting to build the whole 200 MB string in RAM just to compute `Content-Length` would spike memory and delay the first byte!',
        '3. If a slow or dead client/server stops talking mid-connection, waiting forever ties up sockets and memory (`1.1`, `1.5`).',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Compression, Streaming, and Timeouts',
        '- **Compression (`Accept-Encoding` / `Content-Encoding`)**: The client advertises compression formats it understands (e.g., `Accept-Encoding: gzip, br`), and the server compresses the HTTP body before sending—tagging `Content-Encoding: br` (Brotli) or `gzip` so the client knows how to decompress it. Repetitive JSON often shrinks 70–85%!',
        '- **Transfer Encoding & Streaming Responses**: Normally a server declares `Content-Length: 1024` up front. When the final size isn’t known yet—or you want the client to start reading immediately—HTTP can **stream** the response progressively (in HTTP/1.1 using `Transfer-Encoding: chunked`, where each chunk sends its small size followed by its bytes until a `0`-byte end marker; in HTTP/2/3 via stream data frames). The server writes small pieces directly out to the socket without holding the entire file in heap RAM!',
        '- **Connection & Request Timeouts**: Every production HTTP server and client enforces bounded **timeouts**—such as how long to wait for incoming headers, how long an idle Keep-Alive socket may sit unused, and maximum overall request duration—closing stalled sockets cleanly instead of leaking file descriptors.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Compression shrinks payload size, chunked/streaming transfers send incremental data without buffering everything in RAM, and explicit timeouts keep stalled connections from exhausting server sockets.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Comparing HTTP/1.1, HTTP/2, and HTTP/3 side by side',
    narrativeMarkdown: [
      'Notice how HTTP kept the *exact same semantic contract* (methods, headers, bodies, status codes, statelessness) across versions while steadily removing transport bottlenecks:',
      '',
      '| Version | Underlying Transport | Concurrent Requests per Connection | Key Bottleneck Solved |',
      '| --- | --- | --- | --- |',
      '| HTTP/1.1 (`Keep-Alive`) | TCP | Sequential (1 at a time per socket) | Reuses TCP+TLS handshakes across requests |',
      '| HTTP/2 | TCP | Multiplexed binary streams | Removes HTTP head-of-line blocking (still shares 1 TCP queue) |',
      '| HTTP/3 | QUIC (over UDP) | Truly independent streams | Removes TCP-level packet-loss blocking & combines setup handshakes |',
    ].join('\n'),
    integratedExample: {
      id: '2.3-integrated-example',
      title: 'How HTTP request semantics stay consistent while streaming & compression work',
      language: 'http',
      code: `GET /api/events/export HTTP/1.1
Host: api.example.com
Authorization: Bearer <token>          <-- Stateless per-request auth
Accept-Encoding: gzip, br              <-- Client supports compressed body

HTTP/1.1 200 OK
Content-Type: application/x-ndjson
Content-Encoding: gzip                 <-- Body compressed in transit
Transfer-Encoding: chunked             <-- Streamed in pieces without pre-buffering total Content-Length`,
    },
    walkthroughMarkdown:
      'Because HTTP separates *application semantics* (stateless request/response, methods, headers, status codes) from *transport framing* (Keep-Alive, HTTP/2 streams, QUIC, chunked streaming, gzip compression), your backend API design remains clean across all protocol upgrades.',
  },
  questions: [
    {
      id: '2.3-kc-1',
      focusArea: 'Statelessness',
      prompt:
        'What does it mean that HTTP is **stateless**, why does every API request still have to send its own auth token or session cookie, and why does statelessness help when scaling a backend across multiple servers?',
      hints: [
        'Suppose Request 1 went to Server A and Request 2 lands on Server B behind a load balancer.',
        'Does HTTP require the server to remember previous requests automatically?',
        'HTTP treats each request independently with no built-in cross-request memory, so sending auth/context on every request lets any server in a cluster handle any user seamlessly.',
      ],
      explanation:
        'HTTP is **stateless**: the protocol treats each request/response pair independently without assuming the server remembers prior requests. Because clients include authentication (tokens/cookies) and context on each request—and shared state lives in a database or Redis rather than one server’s RAM—any backend worker behind a load balancer can handle any incoming request.',
      evaluationCriteria: [
        'Defines HTTP statelessness (independent self-contained requests)',
        'Connects statelessness to horizontal scaling across multiple backend processes/servers',
      ],
      topicIds: ['2.3.1', '2.3.2', '2.3.7'],
    },
    {
      id: '2.3-kc-2',
      focusArea: 'HTTP Message Anatomy & Status Codes',
      prompt:
        'In an HTTP message, what is the practical difference between **headers** and the **body**, and how should an API choose between a **`4xx`** status code vs a **`5xx`** status code?',
      hints: [
        'Compare metadata *about* the message (`Content-Type`, `Authorization`) vs the actual payload.',
        'Ask *whose fault* the failure is when an API cannot fulfill a request.',
        'Headers describe metadata and instructions while the body holds the payload; `4xx` signals a client error (invalid input, missing auth, unknown route) whereas `5xx` signals a server-side failure.',
      ],
      explanation:
        '**Headers** carry key-value metadata about the request or response (`Host`, `Authorization`, `Content-Type`, `Content-Encoding`), separated by a blank line from the **body** (the actual data payload like JSON). Use **`4xx`** when the client made an invalid or unauthorized request (`400`, `401`, `403`, `404`), and **`5xx`** when the server itself crashed, timed out, or failed unexpectedly (`500`, `502`, `503`, `504`).',
      evaluationCriteria: [
        'Distinguishes metadata headers from data payload body',
        'Correctly contrasts `4xx` (client fault) vs `5xx` (server fault)',
      ],
      topicIds: ['2.3.3', '2.3.4', '2.3.5', '2.3.6'],
    },
    {
      id: '2.3-kc-3',
      focusArea: 'HTTP/1.1 Keep-Alive vs HTTP/2 Multiplexing',
      prompt:
        'How did **HTTP/1.1 Keep-Alive** improve performance over opening one connection per request, and what bottleneck did **HTTP/2 multiplexing** solve on top of that?',
      hints: [
        'Think about TCP + TLS handshake round-trips first.',
        'Then think about sending Request A (slow) and Request B (fast) down the same HTTP/1.1 socket.',
        'Keep-Alive reuses one TCP+TLS connection across multiple sequential requests; HTTP/2 multiplexing lets multiple tagged streams interleave concurrently on one connection so a slow response doesn’t block faster ones behind it.',
      ],
      explanation:
        '**HTTP/1.1 Keep-Alive** keeps a single TCP+TLS socket open across multiple requests, avoiding repeated handshake round-trips. However, HTTP/1.1 still forces requests on one socket to finish sequentially (head-of-line blocking). **HTTP/2 multiplexing** splits messages into stream-tagged binary frames so many requests and responses interleave concurrently over one connection.',
      evaluationCriteria: [
        'Explains Keep-Alive reusing TCP/TLS connections',
        'Explains HTTP/2 stream multiplexing solving HTTP-level sequential blocking',
      ],
      topicIds: ['2.3.8', '2.3.9', '2.3.10'],
    },
    {
      id: '2.3-kc-4',
      focusArea: 'HTTP/3 and QUIC',
      prompt:
        'If HTTP/2 already multiplexes multiple streams over one connection, why was **HTTP/3 (over QUIC/UDP)** still invented?',
      hints: [
        'Remember what transport protocol sits *underneath* HTTP/2 and how it handles one dropped packet.',
        'Does TCP know that Stream 1 and Stream 2 are independent?',
        'HTTP/2 runs over a single TCP stream, so one dropped TCP packet stalls all multiplexed HTTP/2 streams waiting for TCP retransmission; HTTP/3 uses QUIC over UDP so streams stay independent even on packet loss.',
      ],
      explanation:
        'Underneath HTTP/2, **TCP** sees only one single ordered byte stream—so losing even one TCP packet causes the OS to pause delivery for *all* HTTP/2 streams until that packet is retransmitted. **HTTP/3** switches to **QUIC** (built over UDP), giving truly independent streams where packet loss on Stream 1 never stalls Stream 2 (and combining transport + TLS setup into faster handshakes).',
      evaluationCriteria: [
        'Identifies TCP-level head-of-line blocking under HTTP/2',
        'Explains QUIC over UDP isolating packet loss per stream',
      ],
      topicIds: ['2.3.10', '2.3.11'],
    },
    {
      id: '2.3-kc-5',
      focusArea: 'Compression, Streaming & Timeouts',
      prompt:
        'Why would a backend **stream** a large export (e.g., via chunked transfer encoding) instead of building the full file in RAM to set `Content-Length`, and why must servers still enforce **connection timeouts**?',
      hints: [
        'Compare memory usage and time-to-first-byte when generating a 300 MB export.',
        'What happens to a server’s file descriptors if 5,000 clients open Keep-Alive sockets and silently go idle?',
        'Streaming sends chunks progressively without buffering the whole payload in heap memory or delaying initial bytes; timeouts reclaim idle or stuck sockets so file descriptors and memory don’t exhaust.',
      ],
      explanation:
        '**Streaming** (such as chunked transfer encoding in HTTP/1.1 or stream frames in HTTP/2+) lets the server transmit generated chunks incrementally without knowing the full `Content-Length` beforehand—keeping heap memory flat and lowering time-to-first-byte (especially paired with compression like `gzip`/`br`). Meanwhile, **timeouts** prevent slow, broken, or idle Keep-Alive connections from holding open sockets and memory forever.',
      evaluationCriteria: [
        'Explains lower memory overhead and faster first-byte delivery of streaming',
        'Explains timeouts protecting sockets/file descriptors from stalled or idle connections',
      ],
      topicIds: ['2.3.12', '2.3.13', '2.3.14'],
    },
  ],
};

export const LESSON_2_4: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Now we reach the synthesis capstone for Block 2! Over the last three units—plus Block 1’s OS and Node.js runtime—you studied every individual gear: **DNS**, **IP & ports**, **TCP**, **TLS**, **HTTP**, and a **Node.js server process**.',
      'In this unit, we’ll reconstruct the **entire end-to-end journey of a single request** (`Frontend → DNS → TCP → TLS → HTTP request → Backend server`)—and practice tracing exactly **which layer breaks** when real production errors show up.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'When a frontend shows “Failed to load orders,” senior engineers don’t guess randomly. They walk down the exact sequence—DNS → TCP → TLS → HTTP → Backend handler—and pinpoint which hop failed in seconds.',
    prerequisites: [
      {
        subBlockId: '1.4',
        label: 'Node.js Event Loop & libuv non-blocking I/O (1.4.4, 1.4.8)',
        detail:
          'Understanding how Node accepts socket events and resumes async route handlers without blocking.',
      },
      {
        subBlockId: '2.1',
        label: 'DNS, IP/Port, Sockets & TCP 3-way handshake (2.1.3–2.1.9)',
        detail:
          'Knowing how a domain name turns into an established TCP socket.',
      },
      {
        subBlockId: '2.2',
        label: 'TLS handshake & Certificate verification (2.2.4–2.2.7)',
        detail:
          'Knowing how identity is verified and symmetric session keys wrap the TCP stream.',
      },
      {
        subBlockId: '2.3',
        label: 'HTTP Request/Response & Keep-Alive (2.3.3–2.3.9)',
        detail:
          'Knowing how structured HTTP messages flow inside the established connection.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-2.4.1',
      topicId: '2.4.1',
      title: 'End-to-End Trace: Frontend → DNS → TCP → TLS → HTTP → Backend Server',
      problemAndRequirementsMarkdown: [
        '### First principles: One button click, six distinct engineering layers',
        'Imagine a user in a browser clicks **“Place Order”**, triggering:',
        '```javascript\nfetch("https://api.shop.example/orders", {\n  method: "POST",\n  headers: { "Content-Type": "application/json", Authorization: "Bearer ..." },\n  body: JSON.stringify({ sku: "book-1", qty: 1 }),\n});\n```',
        'Before your Node.js `POST /orders` handler ever executes line 1, **multiple independent systems** across the OS, the internet, cryptography, and Node’s runtime must each succeed in exact order.',
        '',
        'Let’s trace the complete journey step by step, noticing what happens if there is no cached connection yet—and what shortcut happens on the second request!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Step 1 — Frontend & DNS Resolution',
        '1. **Frontend (`fetch`)**: The browser parses the URL: protocol `https` (default port `443`), hostname `api.shop.example`, path `/orders`.',
        '2. **DNS Lookup**: Before sending any packet, the client needs an IP address. It checks its local DNS cache (honoring **TTL**); on a cache miss, it asks a DNS resolver, which translates `api.shop.example` → e.g. `203.0.113.42`.',
        '',
        '### Step 2 — OS Socket & TCP Three-Way Handshake',
        '3. **OS Socket & TCP Connect**: The client’s OS allocates a socket with an ephemeral local port, targets `203.0.113.42:443`, and runs the **TCP 3-way handshake** (`SYN` → `SYN-ACK` → `ACK`). Now a reliable, ordered byte stream exists between client and server.',
        '',
        '### Step 3 — TLS Handshake & Certificate Verification',
        '4. **TLS Handshake**: Because the scheme is `https`, the client won’t send the `Authorization` token in plain text yet! Client and server exchange `ClientHello` / `ServerHello`, the server sends its **Certificate** and proves ownership of its **private key**, and the client verifies:',
        '   - Trusted **CA** signature chain,',
        '   - Hostname matches `api.shop.example`, and',
        '   - Certificate is not expired.',
        '   Both sides derive the shared **symmetric session key**. Now the encrypted tunnel is ready.',
        '',
        '### Step 4 — HTTP Request Travels into the Backend Server',
        '5. **HTTP Request Sent**: The frontend formats the stateless HTTP request (`POST /orders`, `Authorization`, `Content-Type`, JSON body), encrypts it with the TLS session key, and sends it as TCP packets across the internet.',
        '6. **Backend Server Receives & Processes**:',
        '   - Packets reach the server’s IP (`203.0.113.42`) and port `443`, where `libuv` / the OS notifies the listening Node.js process via its socket **file descriptor**.',
        '   - Node decrypts TLS, parses the HTTP method, headers, and JSON body into objects on V8’s **heap**, and runs your route handler on the **Event Loop**.',
        '   - Your handler validates the payload at runtime (`0.1`), awaits an async database insert (freeing the Call Stack while waiting, `1.4`), and formats an HTTP response (`201 Created` + JSON).',
        '7. **HTTP Response Returns**: The encrypted response flows back over the same TCP+TLS socket. On `fetch`’s next call seconds later, **Keep-Alive / HTTP/2 connection reuse** skips Steps 2 and 3 entirely!',
      ].join('\n\n'),
      backendApplicationsMarkdown: [
        '### Pinpointing real failures by layer',
        'Once you memorize this exact chain, every cryptic error tells you *immediately* which layer broke:',
        '- **`ENOTFOUND api.shop.example`**: Failed at **Step 1 (DNS)**—domain typo or DNS failure.',
        '- **`ECONNREFUSED` or TCP connect timeout**: DNS worked, failed at **Step 2 (TCP)**—wrong port, firewall drop, or server process crashed/not listening.',
        '- **`CERT_HAS_EXPIRED` / hostname mismatch**: TCP connected, failed at **Step 3 (TLS)**—certificate expired or issued for the wrong domain.',
        '- **`400` / `401` / `404` / `500` JSON response**: DNS, TCP, TLS, and HTTP framing **all succeeded!** Now you are debugging application validation, auth, routing, or backend code in **Step 4**.',
      ].join('\n\n'),
      edgeCasesAndTradeOffsMarkdown:
        'In production, a **reverse proxy or load balancer** often sits in front of Node.js—terminating TLS on port `443` and forwarding plain or internal HTTP to several Node worker processes listening on internal ports (`1.5`). Even then, the exact logical sequence (`DNS → TCP → TLS → HTTP → Node Worker`) still holds!',
      centralIdeaSummary:
        'Every `https://` call progresses sequentially through Frontend → DNS (name to IP) → TCP (3-way handshake reliable stream) → TLS (verified encrypted tunnel) → HTTP (stateless request/response) → Backend Event Loop & Handler—and subsequent calls reuse the open TCP+TLS pipe.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Complete visual map of a single request',
    narrativeMarkdown: [
      'Trace the full stack from top to bottom in one table, connecting Block 0, Block 1, and Block 2:',
      '',
      '| Stage | Protocol / Layer | Key Artifact Created or Verified | Failure Signal if It Breaks |',
      '| --- | --- | --- | --- |',
      '| 1. Name lookup | **DNS** | `api.shop.example` → IP (`203.0.113.42`, cached via TTL) | `ENOTFOUND` |',
      '| 2. Reliable pipe | **TCP** (on IP + Port) | OS socket fd + 3-way handshake (`SYN`/`SYN-ACK`/`ACK`) | `ECONNREFUSED` / Connect Timeout |',
      '| 3. Secure tunnel | **TLS** | Verified CA cert + private-key proof + symmetric session key | `CERT_HAS_EXPIRED` / TLS Error |',
      '| 4. App message | **HTTP** | Stateless Request (`POST /orders`, headers, JSON body) | `4xx` / `5xx` / Request Timeout |',
      '| 5. Server execution | **Node.js + TS** | `libuv` socket → Event Loop → runtime validation (`0.1`) → async DB (`1.4`) → Response | Unhandled exception / slow Event Loop |',
    ].join('\n'),
    integratedExample: {
      id: '2.4-integrated-example',
      title: 'Full end-to-end trace: Frontend -> Backend -> Response',
      language: 'text',
      code: `Frontend: fetch("https://api.shop.example/orders", { method: "POST", ... })
   │
   ├── 1. DNS:  api.shop.example ──▶ 203.0.113.42
   ├── 2. TCP:  Client ──SYN──▶ Server:443 ──SYN-ACK──▶ Client ──ACK──▶ [Socket Open]
   ├── 3. TLS:  ClientHello ──▶ ServerHello + Cert + Signature ──▶ [Verified + Session Key]
   ├── 4. HTTP: Encrypted "POST /orders" + Headers + JSON Body ──────────▶
   │
   ▼ Backend Server (Node.js Process):
   ├── 5. libuv reads socket fd -> decrypts TLS -> parses HTTP request onto V8 heap
   ├── 6. Event Loop runs handler -> validates input -> awaits async DB write
   └── 7. Sends encrypted "HTTP 201 Created" back over persistent socket (ready for reuse!)`,
    },
    walkthroughMarkdown:
      'Every single layer exists for a concrete reason derived earlier: DNS avoids memorizing IPs, TCP fixes dropped/reordered packets, TLS stops eavesdropping and impersonation, HTTP adds stateless structure, and Node’s Event Loop serves concurrent I/O without blocking.',
  },
  questions: [
    {
      id: '2.4-kc-1',
      focusArea: 'Complete End-to-End Sequence',
      prompt:
        'A browser calls `fetch("https://api.example.com/profile")` for the very first time (no cached DNS or open sockets yet). Put **DNS**, **HTTP**, **TCP**, **TLS**, and the **Node.js Event Loop** in exact chronological order, explaining what each hands off to the next.',
      hints: [
        'Start from having only the string `"api.example.com"`—what do you need before you can open a socket?',
        'Once the socket connects, what must happen *before* sending a secret `Authorization` header?',
        'DNS turns the hostname into an IP -> TCP 3-way handshake opens a reliable socket -> TLS handshake verifies the cert & establishes encryption -> HTTP request flies inside TLS -> Backend Node Event Loop reads socket, runs handler, and returns HTTP response.',
      ],
      explanation:
        '1. **DNS** resolves `api.example.com` into an IP address.\n2. **TCP** performs a 3-way handshake (`SYN`, `SYN-ACK`, `ACK`) to port `443` to open a reliable socket.\n3. **TLS** verifies the server’s CA-signed certificate, hostname, expiry, and private-key proof, then derives a symmetric session key.\n4. **HTTP** sends the encrypted `GET /profile` request inside that TLS tunnel.\n5. The **Node.js server** (`libuv` + Event Loop) reads the socket, processes the request asynchronously, and sends back the encrypted HTTP response.',
      evaluationCriteria: [
        'Orders DNS -> TCP -> TLS -> HTTP -> Backend Event Loop accurately',
        'Explains what each step produces for the next layer',
      ],
      topicIds: ['2.4.1'],
    },
    {
      id: '2.4-kc-2',
      focusArea: 'Layer-by-Layer Failure Diagnosis',
      prompt:
        'You run three test calls against different broken environments and observe: (a) `ENOTFOUND`, (b) `CERT_HAS_EXPIRED`, and (c) `HTTP 400 Bad Request`. For each error, identify **which layer failed** and **which earlier layers already succeeded**.',
      hints: [
        'Walk down DNS -> TCP -> TLS -> HTTP -> Application handler for each one.',
        'Could a server ever return `400 Bad Request` if TLS failed?',
        '(a) `ENOTFOUND` failed at DNS before TCP ever ran; (b) `CERT_HAS_EXPIRED` passed DNS and TCP 3-way handshake, failing at TLS certificate verification; (c) `400 Bad Request` passed DNS, TCP, TLS, and HTTP transport—your backend handler parsed it and rejected invalid input.',
      ],
      explanation:
        '- **`ENOTFOUND`**: Failed at **DNS resolution**—never reached TCP, TLS, or HTTP.\n- **`CERT_HAS_EXPIRED`**: **DNS** and **TCP** succeeded (a socket connected to port `443`), and failure occurred during **TLS certificate verification** before any HTTP request was sent.\n- **`400 Bad Request`**: **DNS**, **TCP**, **TLS**, and **HTTP framing** all succeeded; the backend application received and parsed the HTTP request and rejected invalid client input.',
      evaluationCriteria: [
        'Maps ENOTFOUND to DNS failure',
        'Maps CERT_HAS_EXPIRED to TLS failure after DNS + TCP succeeded',
        'Maps HTTP 400 to application validation after transport & TLS succeeded',
      ],
      topicIds: ['2.4.1'],
    },
    {
      id: '2.4-kc-3',
      focusArea: 'Second Request Shortcut (Connection Reuse)',
      prompt:
        'One second after the `GET /profile` request finishes, the same frontend sends `POST /orders` to `https://api.example.com`. Assuming DNS TTL and an HTTP Keep-Alive (or HTTP/2) connection are still active, which expensive steps get skipped—and why does that dramatically speed up the second call?',
      hints: [
        'Look back at the 5 stages in the integrated trace: which ones set up the address and pipe vs which ones run per request?',
        'Recall how many round-trips TCP + TLS setup cost on the cold first request.',
        'DNS lookup (cached via TTL), TCP 3-way handshake, and TLS handshake are all skipped—reusing the already-open encrypted socket so the HTTP request starts immediately.',
      ],
      explanation:
        'With a cached DNS entry (within TTL) and a persistent Keep-Alive or HTTP/2 connection still open, the browser skips **DNS resolution**, the **TCP 3-way handshake**, and the **TLS handshake**—eliminating multiple network round-trips so the `POST /orders` HTTP request goes straight down the already-verified encrypted socket.',
      evaluationCriteria: [
        'Identifies DNS cache + persistent TCP/TLS socket reuse',
        'Explains eliminating multiple handshake round-trips on subsequent requests',
      ],
      topicIds: ['2.4.1'],
    },
    {
      id: '2.4-kc-4',
      focusArea: 'Full-Stack Connection Between Blocks 0, 1, and 2',
      prompt:
        'When that `POST /orders` JSON arrives at your Node.js server over HTTPS, explain why **TLS** doesn’t replace **runtime input validation** (from Sub-block 0.1) and why **`await db.insertOrder(...)`** doesn’t freeze the next user’s `GET /health` request (from Sub-block 1.4).',
      hints: [
        'What does TLS protect (the wire between client and server) vs what can an authenticated user still send inside valid JSON?',
        'Trace what Node’s Call Stack and `libuv` do while `await db.insertOrder(...)` waits on Postgres.',
        'TLS only guarantees encryption/authenticity in transit, not that client JSON matches your schema (requiring runtime narrowing); meanwhile `await db.insertOrder(...)` hands socket waiting to `libuv`, freeing the Event Loop to answer `GET /health` immediately.',
      ],
      explanation:
        '**TLS** protects bytes against eavesdropping and tampering *in transit*, **not** against a valid client sending malformed JSON (`{"qty": "oops"}`)—so your handler still needs runtime checks (remember TypeScript types erased at compile time). Inside Node.js, `await db.insertOrder(...)` delegates waiting on the Postgres TCP socket to `libuv` and suspends only that handler, keeping the single **Event Loop** free to serve `GET /health` concurrently.',
      evaluationCriteria: [
        'Separates TLS transit security from runtime schema/input validation',
        'Explains `await` + `libuv` keeping the Event Loop unblocked during DB I/O',
      ],
      topicIds: ['2.4.1'],
    },
  ],
};
