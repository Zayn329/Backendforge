import { FptLessonContent, RecipeLessonContent } from '../types';

export const LESSON_11_1: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Standard HTTP works like a polite walkie-talkie where **only the browser can initiate**: Client speaks (`GET /orders`), Server replies (`200 OK`), conversation ends. Wait—what if you are building a live chat room, collaborative document, stock ticker, or streaming AI response where **the server has brand-new data right now** and wants to push it to the client instantly?',
      'In this unit, we’ll trace the entire evolution from HTTP polling up to full real-time transport: **client polling**, **short polling**, **long polling**, **Server-Sent Events (SSE)**, **WebSockets**, **persistent connections**, and **bidirectional communication**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Teams frequently jump straight to heavy WebSockets when simple Server-Sent Events (SSE) or short polling would solve the problem with 10x less infrastructure complexity. Knowing each transport’s exact trade-off lets you pick the simplest tool that fits.',
    prerequisites: [
      {
        subBlockId: '2.1',
        label: 'TCP connections & HTTP request-response (2.1)',
        detail: 'Understanding TCP sockets, HTTP headers, and round-trip latency.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-11.1.1',
      topicId: '11.1.1',
      coveredTopicIds: ['11.1.2', '11.1.3'],
      title: 'Client polling: Short polling vs. Long polling',
      problemAndRequirementsMarkdown: [
        '### First principles: Forcing push updates out of a pull-only protocol',
        'If HTTP only lets clients ask first, the simplest trick is **Client Polling**: have browser JavaScript call `GET /messages?since=...` repeatedly!',
        'Let’s trace what breaks as soon as 5,000 users open your chat tab:',
        '- **Short Polling**: Client asks every 2 seconds (`setInterval(fetchMessages, 2000)`). **Result**: 98% of those 2,500 req/sec return `200 OK []` (empty!)—wasting huge server CPU, HTTP headers, and mobile battery while *still* adding up to 2 full seconds of delay!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Stepping up to Long Polling (Comet)',
        '- **Long Polling**: Client sends `GET /updates`, and instead of replying `[]` immediately, the **server holds the HTTP connection open** until either new data arrives OR a timeout (e.g., 25s) fires. The instant data arrives, the server responds `200 [event]`, and the client immediately fires the next `GET /updates`!',
        '- **Trade-off**: Eliminates empty polling noise and gives instant delivery, **yet still pays repeated HTTP header/re-connect overhead** after every single message and struggles under high message rates.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Short polling wastes bandwidth on empty checks; Long polling holds requests open for instant delivery but still rebuilds a full HTTP cycle after every single event.',
      codeExamples: [],
    },
    {
      id: 'topic-11.1.4',
      topicId: '11.1.4',
      coveredTopicIds: ['11.1.5', '11.1.6', '11.1.7'],
      title: 'Persistent connections: Server-Sent Events (SSE) vs. WebSockets (Bidirectional)',
      problemAndRequirementsMarkdown: [
        '### First principles: Keep ONE TCP connection open and stream frames cleanly!',
        'Instead of tearing down and reopening HTTP requests after every message, both **SSE** and **WebSockets** hold a **Persistent Connection** open over TCP—allowing the server to push data the microsecond an event happens with tiny per-message framing overhead!',
        '',
        'Notice the key fork in the road: **Do you only need Server → Client streaming, OR true two-way Client ↔ Server low-latency messaging?**',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Comparing Server-Sent Events (SSE) and WebSockets',
        '1. **Server-Sent Events (`SSE` / `text/event-stream`)** *(One-way: Server → Client over standard HTTP!)*:',
        '   - Client opens one plain `GET /events` HTTP request; server keeps the response stream open and writes `data: {"price": 102}\n\n` events indefinitely.',
        '   - **Superpowers**: Works over ordinary HTTP/HTTPS (friendly with proxies/firewalls), browsers have **automatic reconnection + `Last-Event-ID` catch-up** built into `EventSource`, and perfect for **AI token streaming**, live dashboards, notifications, and build logs!',
        '   - **Limitation**: Unidirectional (Server → Client only; client sends actions via normal `POST` requests) and limited to UTF-8 text.',
        '2. **WebSockets (`ws://` / `wss://`)** *(Full-duplex Bidirectional Communication!)*:',
        '   - Starts as a normal HTTP request, then **upgrades** (`101 Switching Protocols`) the underlying TCP socket into a persistent **full-duplex binary/text pipe** (`11.2`).',
        '   - Both client and server can push messages at any instant simultaneously—essential for **multiplayer games**, **collaborative cursors/editors**, and **high-frequency chat/trading**.',
        '   - **Cost**: Stateful long-lived TCP connections make load balancing, auth refresh, heartbeats, and horizontal broadcasting harder than stateless HTTP!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Use Short/Long polling for infrequent updates, Server-Sent Events (SSE) for simple Server-to-Client streams over HTTP, and WebSockets when true low-latency bidirectional communication is needed.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Decision ladder for real-time transport selection',
    narrativeMarkdown: [
      'Always pick the **simplest** real-time mechanism from `11.1` that matches your directionality and latency budget:',
      '1. Updates happen every few minutes (job status, daily report)? → **Short polling** (or lazy UI refresh).',
      '2. Need real-time **Server → Client** push (live notifications, stock feed, LLM streaming)? → **Server-Sent Events (SSE)**.',
      '3. Need sub-50ms **Client ↔ Server bidirectional** streaming (chat, multiplayer, live cursors)? → **WebSockets**.',
    ].join('\n\n'),
    integratedExample: {
      id: '11.1-integrated-example',
      title: 'Real-Time Transport Comparison Matrix',
      language: 'text',
      code: `Mechanism       Direction          Connection Model       Ideal Use Cases
──────────────────────────────────────────────────────────────────────────────────────────
Short Polling   Client pulls       Repeated HTTP reqs     Infrequent background job status
Long Polling    Client pulls/wait  Held HTTP + reopen     Legacy fallback environments
SSE             Server -> Client   Persistent HTTP stream AI streams, alerts, live feeds
WebSockets      Bidirectional      Persistent upgraded TCP Chat, gaming, live cursors/collab`,
    },
    walkthroughMarkdown:
      'In `11.2`, we’ll zoom right inside **WebSocket Architecture**—how the HTTP `Upgrade` works, heartbeats, reconnection, presence, horizontal Redis broadcasting, and real-time auth.',
  },
  questions: [
    {
      id: '11.1-kc-1',
      focusArea: 'Polling vs Long Polling vs Persistent Connections',
      prompt:
        'Contrast **short polling**, **long polling**, and a **persistent connection**: why does short polling burn server resources at scale, and what overhead remains even with long polling?',
      hints: [
        'Trace how many empty responses short polling creates when checking every 2 seconds across 5,000 idle tabs.',
        'In long polling, what happens immediately *after* the server sends one event?',
        'Short polling floods the server with empty requests; long polling avoids empty replies by holding the request open, but still pays repeated HTTP round-trip/header/teardown costs after every single message.',
      ],
      explanation:
        '**Short polling** sends fixed-interval HTTP checks where most responses return empty, wasting bandwidth, headers, and DB/CPU cycles. **Long polling** holds the request open until an event arrives (cutting idle waste), yet still tears down and re-establishes a full HTTP request/response cycle after every message—whereas **persistent connections** (SSE / WebSockets) keep one socket open continuously.',
      evaluationCriteria: [
        'Explains empty-poll waste and latency lag in short polling',
        'Explains held-response improvement and per-message HTTP reopen overhead in long polling',
      ],
      topicIds: ['11.1.1', '11.1.2', '11.1.3', '11.1.6'],
    },
    {
      id: '11.1-kc-2',
      focusArea: 'SSE vs WebSockets',
      prompt:
        'You’re building an AI chat interface that streams tokens from server to browser, while user prompts are sent as ordinary `POST /messages` requests. Why is **Server-Sent Events (SSE)** often a better fit here than **WebSockets**—and when *do* you truly need **WebSockets**?',
      hints: [
        'Does token streaming require pushing high-frequency binary frames from client → server over the same socket?',
        'What features do SSE and `EventSource` give you for free over standard HTTP?',
        'SSE streams Server->Client cleanly over standard HTTP with built-in reconnection/`Last-Event-ID`; WebSockets are justified when low-latency bidirectional or binary Client<->Server messaging is needed (gaming, collaborative cursors, high-freq chat).',
      ],
      explanation:
        'Because prompt submission works fine over `POST` and only tokens flow continuously **Server → Client**, **SSE** delivers persistent low-latency streaming over standard HTTP—working seamlessly with proxies/TLS and offering automatic reconnection with `Last-Event-ID` out of the box. Reserve **WebSockets** for true **bidirectional** low-latency or binary workloads (live multiplayer, collaborative editing, interactive trading).',
      evaluationCriteria: [
        'Matches SSE to unidirectional Server->Client HTTP streaming with auto-reconnect',
        'Matches WebSockets to genuine bidirectional low-latency or binary communication',
      ],
      topicIds: ['11.1.4', '11.1.5', '11.1.7'],
    },
  ],
};

export const LESSON_11_2_FPT: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Connecting two browsers to one local WebSocket server in a tutorial takes 10 lines of code. Putting WebSockets into production with 50,000 users across **multiple backend containers**, flaky mobile 4G tunnels that drop silently without closing TCP, authentication tokens that expire mid-connection, and room broadcasting turns out to be a completely different beast!',
      'In this unit, we’ll architect production **WebSocket systems** from first principles: **connection establishment & HTTP Upgrade**, **connection lifecycle**, **heartbeats**, **reconnection**, **message delivery**, **presence**, **broadcasting across multiple servers**, **connection management**, and **authentication & authorization over real-time connections**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Unlike stateless HTTP endpoints, WebSockets pin stateful sockets inside specific server instances—requiring explicit heartbeats, horizontal Pub/Sub fan-out, and per-message auth guards.',
    prerequisites: [
      {
        subBlockId: '11.1',
        label: 'WebSockets & persistent bidirectional sockets (11.1)',
        detail: 'Knowing when WebSockets are chosen over polling and SSE.',
      },
      {
        subBlockId: '6.2',
        label: 'Auth tokens, cookies & permissions (6.2, 6.3)',
        detail: 'Understanding authentication and authorization boundaries.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-11.2.1',
      topicId: '11.2.1',
      coveredTopicIds: ['11.2.2', '11.2.3', '11.2.4', '11.2.5'],
      title: 'Handshake & Upgrade mechanism, lifecycle, heartbeats, and reconnection',
      problemAndRequirementsMarkdown: [
        '### First principles: How an HTTP request becomes a raw two-way socket—and how dead sockets leak',
        'Two subtle things happen in real WebSocket deployments:',
        '1. **Starting on Port 443**: Browsers and corporate firewalls already allow HTTPS (`443`). How do you open a raw bidirectional socket without inventing a blocked custom port?',
        '2. **Zombie Connections**: A mobile user enters a subway tunnel; their phone loses Wi-Fi *without sending a TCP `FIN` packet*. Your server still thinks the socket is alive, holding RAM and marking them `"Online"` for hours!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Mechanics of Connection, Heartbeats & Reconnection',
        '1. **Connection Establishment & Upgrade Mechanism**: Every WebSocket begins as a standard HTTP/1.1 `GET` request carrying headers `Upgrade: websocket` and `Connection: Upgrade`. If the server agrees (and checks Auth!), it replies **`101 Switching Protocols`**—and that *exact same TCP socket* switches seamlessly from HTTP framing to lightweight bidirectional WebSocket frames!',
        '2. **Connection Lifecycle**: `Handshake (Upgrade)` → `Open (send/receive frames)` → `Closing / Close` (`onclose` cleanup releasing memory maps and room memberships).',
        '3. **Heartbeats (`PING` / `PONG`)**: Every e.g. 25 seconds, the server sends a tiny WebSocket `PING` frame (or application heartbeat) and expects `PONG` back within 5 seconds. Missing 1–2 pongs proves the client vanished silently → server terminates the zombie socket and frees RAM!',
        '4. **Reconnection (Client-side with Backoff + Jitter)**: Whenever a socket drops or server restarts (`8.5`), **10,000 clients must NOT reconnect at the exact same millisecond** (a reconnect storm!). Clients reconnect using **exponential backoff + random jitter** (`1s..2s..4s..max 30s`) and send `lastSeenSeq` / cursor so missed messages are fetched cleanly!',
      ].join('\n\n'),
      centralIdeaSummary:
        'WebSockets upgrade an HTTP connection via `101 Switching Protocols`, detect dead mobile sockets with `PING/PONG` heartbeats, and prevent thundering-herd reconnect storms using exponential backoff with jitter.',
      codeExamples: [],
    },
    {
      id: 'topic-11.2.6',
      topicId: '11.2.6',
      coveredTopicIds: ['11.2.7', '11.2.8', '11.2.9'],
      title: 'Message delivery, presence, broadcasting across servers, and connection management',
      problemAndRequirementsMarkdown: [
        '### First principles: Why `rooms.get(roomId).forEach(ws => ws.send(...))` breaks the moment you scale to 2 servers!',
        'Imagine User A connects via Load Balancer to **API Server #1**, and User B (in the exact same `room:general`) connects to **API Server #2**! When User A sends `"Hello"` to Server #1, Server #1 loops over its local `Map` of sockets—**and User B isn’t in Server #1’s memory!**',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Scaling state, rooms, presence, and fan-out horizontally',
        '1. **Connection Management**: Maintain per-instance in-memory maps (`socketById`, `rooms -> Set<WebSocket>`) cleanly cleaned up on `close`/`error`, with per-socket **backpressure** checks (`ws.bufferedAmount`) so one slow client doesn’t crash the server buffering megabytes.',
        '2. **Broadcasting (Cross-Instance Pub/Sub)**: Connect all WebSocket servers to a shared **Redis Pub/Sub** (or message broker `11.3`): when Server #1 wants to broadcast to `room:general`, it publishes `{ roomId: "general", payload }` to Redis; **all servers** subscribed to that channel receive it and push to their locally connected room sockets!',
        '3. **Presence (`Online / Typing / Away`)**: Store user presence keys in **Redis with short TTLs (`SET presence:user_42 "online" EX 45`)**, refreshed by each WebSocket **heartbeat**! If a container crashes without sending `offline`, presence expires cleanly in 45 seconds rather than leaving users stuck "Online" forever.',
        '4. **Message Delivery**: WebSockets alone give *best-effort delivery while connected*—if a socket disconnects mid-flight, frames drop! Pair real-time push with **durable DB persistence + sequence IDs** so reconnecting clients catch up any missed messages via `GET /messages?afterSeq=...`.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Manage local socket/room registries per server, bridge multiple server instances via Redis Pub/Sub broadcasting, track presence with heartbeat-refreshed Redis TTLs, and pair push frames with durable sequence-based catch-up.',
      codeExamples: [],
    },
    {
      id: 'topic-11.2.10',
      topicId: '11.2.10',
      coveredTopicIds: [],
      title: 'Authentication and authorization over real-time connections',
      problemAndRequirementsMarkdown: [
        '### First principles: Browser `new WebSocket()` quirks + why checking auth ONLY at connect time isn’t enough',
        'Two sneaky security traps hit real-time servers:',
        '1. Browser `new WebSocket(url)` **cannot set custom `Authorization: Bearer ...` headers!** Putting a JWT directly in the URL query string (`wss://api.com/ws?token=eyJ...`) leaks that secret token into Nginx logs, browser history, and proxy telemetry!',
        '2. Suppose User A connects legitimately at `10:00`, and at `10:05` an admin **removes User A from `room:finance`** or **revokes User A’s account**! If you only checked permissions during the initial `10:00` handshake, User A stays inside `room:finance` receiving confidential updates all day!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Securing real-time sockets end-to-end',
        '- **Safe Handshake Auth**: Use existing **`HttpOnly; Secure; SameSite` session cookies** (sent automatically on same-site Upgrade requests—**and ALWAYS validate the `Origin` header** during Upgrade to stop Cross-Site WebSocket Hijacking!), OR have an authenticated HTTP `POST /ws-ticket` mint a **10-second, single-use opaque ticket** for `?ticket=...` instead of putting long-lived JWTs in URLs!',
        '- **Ongoing Authorization**: Check room/channel **permissions (`6.3`)** when subscribing to any room *and* re-verify or disconnect active sockets immediately via a Redis revocation/permission-change Pub/Sub event whenever a user’s access is revoked!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Authenticate upgrades via HttpOnly cookies (with strict `Origin` checks) or short-lived single-use tickets rather than raw JWT query strings, and enforce room authorization on subscribe plus live revocation.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Multi-server WebSocket topology from handshake to broadcast',
    narrativeMarkdown: [
      'Watch all ten concepts of `11.2` work together when Alice (`Server 1`) messages `room:42` where Bob is listening (`Server 2`):',
      '1. **Upgrade & Auth**: Both upgraded via HTTP `101` checking `Origin` + `HttpOnly` cookie / 1-use ticket.',
      '2. **Heartbeats & Presence**: `PING/PONG` refreshes Redis `presence:*` TTLs and reaps dead sockets.',
      '3. **Broadcast & Delivery**: Alice’s message persists to Postgres (`seq = 508`), Server 1 publishes to Redis Pub/Sub `room:42`, Server 2 delivers to Bob; if Bob was offline, his backoff-jitter reconnect catches up `afterSeq=507`.',
    ].join('\n\n'),
    integratedExample: {
      id: '11.2-integrated-example',
      title: 'Horizontally Scaled WebSocket + Redis Pub/Sub Architecture',
      language: 'text',
      code: `[Alice] ──wss (Auth + Heartbeats)──▶ [WS Server #1] ──save msg (seq=508)──▶ [Postgres]
                                            │
                                    PUBLISH room:42
                                            ▼
                                     [Redis Pub/Sub] (also holds TTL Presence!)
                                            │
                                   DELIVER to local room sockets
                                            ▼
                                     [WS Server #2] ──wss──▶ [Bob]`,
    },
    walkthroughMarkdown:
      'Switch to the **Recipe** tab next to build a working `ws` + `ioredis` WebSocket server implementing HTTP `Upgrade` auth, `PING/PONG` zombie cleanup, Redis Pub/Sub room broadcast, and TTL presence.',
  },
  questions: [
    {
      id: '11.2-kc-1',
      focusArea: 'Upgrade, Heartbeats, Reconnection & Delivery',
      prompt:
        'How does a **WebSocket** connection start over standard HTTP, why do servers need **heartbeats (`PING/PONG`)** instead of relying on TCP close events, and why must clients add **exponential backoff + jitter** when reconnecting?',
      hints: [
        'Recall the `101` HTTP status code during handshake.',
        'What happens when a phone loses signal silently without sending a close frame—and what happens when 20,000 clients reconnect at the exact instant a server restarts?',
        'HTTP `Upgrade` switches the socket via `101 Switching Protocols`; heartbeats detect silent network drops (half-open zombie sockets); backoff + jitter prevents thundering-herd reconnect storms after server deploys.',
      ],
      explanation:
        'Clients send an HTTP `GET` with `Upgrade: websocket`; the server replies `101 Switching Protocols` to convert the socket into a persistent frame stream. Because mobile disconnects or NAT timeouts rarely send clean close frames, periodic **`PING/PONG` heartbeats** detect and free dead zombie sockets. On disconnect, clients use **exponential backoff + random jitter** so thousands don’t stampede the server simultaneously, fetching missed messages via sequence IDs.',
      evaluationCriteria: [
        'Explains HTTP Upgrade -> 101 Switching Protocols handshake',
        'Explains heartbeats for silent zombie-socket cleanup and backoff+jitter against reconnect storms',
      ],
      topicIds: ['11.2.1', '11.2.2', '11.2.3', '11.2.4', '11.2.5', '11.2.6'],
    },
    {
      id: '11.2-kc-2',
      focusArea: 'Horizontal Broadcasting, Presence & Real-Time Auth',
      prompt:
        'Why does an in-memory `rooms` Map fail when broadcasting across 3 WebSocket servers—how do **Redis Pub/Sub** and **TTL presence** fix scaling—and why shouldn’t you pass long-lived JWTs inside `?token=...` on WebSocket URLs?',
      hints: [
        'Can Server #1 send directly to a socket connected to Server #2’s process memory?',
        'Where do URL query strings get logged, and what happens if a user’s room permission is revoked 10 minutes *after* connecting?',
        'Redis Pub/Sub relays room broadcasts across all WS nodes while TTL keys track live presence across crashes; `?token=` leaks in URL logs—use `HttpOnly` cookies (with `Origin` checks) or 10s single-use tickets, plus per-action AuthZ and live revocation.',
      ],
      explanation:
        'Each server only holds sockets connected directly to its own process; **Redis Pub/Sub** lets any instance broadcast room messages across all instances, while heartbeat-refreshed **Redis TTL keys** maintain accurate **presence** across crashes. For **real-time AuthN/AuthZ**, avoid putting long-lived JWTs in `?token=` query logs—authenticate the HTTP Upgrade using `HttpOnly` cookies (strictly verifying `Origin`) or short single-use tickets, validate room permissions on subscribe, and kick/evict sockets on permission revocation.',
      evaluationCriteria: [
        'Explains Redis Pub/Sub cross-instance fan-out and TTL-based presence',
        'Explains avoiding URL JWTs (cookies + Origin or 1-use tickets) plus room AuthZ/revocation',
      ],
      topicIds: ['11.2.7', '11.2.8', '11.2.9', '11.2.10'],
    },
  ],
};

export const LESSON_11_2_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Build a production-ready multi-instance **WebSocket** server using **`ws`** and **`ioredis`**: authenticated HTTP `Upgrade` handling (with `Origin` validation), `PING/PONG` heartbeat reaper, room connection management, cross-instance **Redis Pub/Sub broadcasting**, **TTL presence**, and **graceful disconnect**. ',
  whenToUseMarkdown:
    'Use whenever building live chat, collaborative presence, multiplayer state, or multi-instance real-time rooms.',
  setupCommands: [
    {
      id: '11.2-setup-1',
      label: 'Install ws and ioredis',
      command: 'npm install ws ioredis && npm install -D @types/ws',
      notes: 'Redis Pub/Sub requires a dedicated subscriber connection separate from normal Redis command connections.',
    },
  ],
  coreApisMarkdown: [
    '- **`new WebSocketServer({ noServer: true })` + `httpServer.on("upgrade", ...)`**: Gives full control over `Origin` checking and auth *before* sending `101 Switching Protocols` (`11.2.2`, `11.2.10`).',
    '- **`ws.ping()` + `"pong"` event**: Reaps silent half-open zombie connections every 25s (`11.2.4`).',
    '- **`redisPub.publish(channel, msg)` / `redisSub.subscribe(...)`**: Broadcasts room messages across all backend instances (`11.2.8`).',
    '- **`redis.set("presence:" + userId, "online", "EX", 45)`**: Heartbeat-refreshed TTL presence (`11.2.7`).',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Authenticate and check Origin manually during HTTP `upgrade` before accepting WebSocket',
      detailMarkdown:
        'Attach `noServer: true` so you reject unauthorized users (`401`) or untrusted `Origin` headers (`403`) cleanly *before* upgrading the socket (`11.2.1`, `11.2.2`, `11.2.10`).',
      code: {
        id: '11.2-step-1',
        title: 'Authenticated HTTP Upgrade + Origin guard',
        language: 'typescript',
        code: `import http from "node:http";
import { WebSocketServer, WebSocket } from "ws";

interface AuthedSocket extends WebSocket {
  userId: string;
  isAlive: boolean;
  rooms: Set<string>;
}

const ALLOWED_ORIGINS = new Set(["https://app.example.com"]);
export const wss = new WebSocketServer({ noServer: true });

export function attachWebSocketUpgrade(server: http.Server, verifySessionCookie: (req: http.IncomingMessage) => Promise<string | null>) {
  server.on("upgrade", async (req, socket, head) => {
    const origin = req.headers.origin;
    if (!origin || !ALLOWED_ORIGINS.has(origin)) {
      socket.write("HTTP/1.1 403 Forbidden\\r\\n\\r\\n");
      return socket.destroy();
    }

    const userId = await verifySessionCookie(req); // From HttpOnly cookie or 1-use ticket!
    if (!userId) {
      socket.write("HTTP/1.1 401 Unauthorized\\r\\n\\r\\n");
      return socket.destroy();
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      const authed = ws as AuthedSocket;
      authed.userId = userId;
      authed.isAlive = true;
      authed.rooms = new Set();
      wss.emit("connection", authed, req);
    });
  });
}`,
      },
    },
    {
      stepNumber: 2,
      title: 'Run PING/PONG Heartbeats + TTL Presence + Room Connection Cleanup',
      detailMarkdown:
        'Refresh presence TTLs on `pong` (`11.2.4`, `11.2.7`), terminate dead sockets, and clean up room maps on `close` (`11.2.3`, `11.2.9`).',
      code: {
        id: '11.2-step-2',
        title: 'Heartbeat reaper, room map, and Redis TTL presence',
        language: 'typescript',
        code: `import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);
const localRooms = new Map<string, Set<AuthedSocket>>();

wss.on("connection", (ws: AuthedSocket) => {
  redis.set(\`presence:\${ws.userId}\`, "online", "EX", 45);

  ws.on("pong", () => {
    ws.isAlive = true;
    redis.set(\`presence:\${ws.userId}\`, "online", "EX", 45);
  });

  ws.on("message", async (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type === "join" && typeof msg.roomId === "string") {
      // Always authorize room access BEFORE subscribing! (11.2.10)
      if (!(await canAccessRoom(ws.userId, msg.roomId))) return;
      ws.rooms.add(msg.roomId);
      if (!localRooms.has(msg.roomId)) localRooms.set(msg.roomId, new Set());
      localRooms.get(msg.roomId)!.add(ws);
    }
  });

  ws.on("close", () => {
    for (const roomId of ws.rooms) {
      localRooms.get(roomId)?.delete(ws);
    }
  });
});

// Heartbeat interval every 25s: terminate sockets missing previous pong
setInterval(() => {
  for (const client of wss.clients as Set<AuthedSocket>) {
    if (!client.isAlive) { client.terminate(); continue; }
    client.isAlive = false;
    client.ping();
  }
}, 25_000).unref();`,
      },
    },
    {
      stepNumber: 3,
      title: 'Bridge multiple server instances with Redis Pub/Sub broadcasting',
      detailMarkdown:
        'Publish room payloads to Redis (`11.2.8`) so every server forwards them to locally connected members—checking `ws.readyState === WebSocket.OPEN` and bounded `ws.bufferedAmount` (`11.2.9`).',
      code: {
        id: '11.2-step-3',
        title: 'Cross-instance Redis Pub/Sub room broadcast',
        language: 'typescript',
        code: `const redisPub = new Redis(process.env.REDIS_URL!);
const redisSub = new Redis(process.env.REDIS_URL!);

redisSub.subscribe("ws:broadcast");
redisSub.on("message", (_chan, raw) => {
  const { roomId, payload } = JSON.parse(raw);
  const sockets = localRooms.get(roomId);
  if (!sockets) return;

  const serialized = JSON.stringify(payload);
  for (const ws of sockets) {
    // Check socket state & cap slow-consumer buffer backpressure
    if (ws.readyState === WebSocket.OPEN && ws.bufferedAmount < 1_000_000) {
      ws.send(serialized);
    }
  }
});

export async function broadcastToRoom(roomId: string, payload: unknown) {
  await redisPub.publish("ws:broadcast", JSON.stringify({ roomId, payload }));
}`,
      },
    },
  ],
  workingExamples: [
    {
      id: '11.2-ex-reconnect',
      title: 'Client exponential backoff + jitter reconnect helper (11.2.5)',
      language: 'typescript',
      code: `function reconnectWithJitter(attempt: number, connectFn: () => void) {
  const baseMs = Math.min(30_000, 1000 * 2 ** attempt);
  const jitterMs = Math.random() * 1000;
  setTimeout(connectFn, baseMs + jitterMs);
}`,
      explanation:
        'Randomizing reconnect wait times prevents tens of thousands of dropped mobile clients from hammering your auth endpoint simultaneously after a server deploy.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Passing long-lived JWTs in `wss://api.site.com/ws?token=eyJ...`.',
      fix: 'URLs get saved in proxy/CDN logs and browser history; use `HttpOnly` cookies (with strict `Origin` checks!) or short 10s single-use WebSocket tickets.',
    },
    {
      mistake: 'Reusing a single `ioredis` client for both `.subscribe()` and normal `.set()` / `.publish()` commands.',
      fix: 'Once a Redis connection calls `subscribe()`, Redis puts it in Pub/Sub-only mode; always keep separate `redisPub`/`redis` and `redisSub` connections.',
    },
    {
      mistake: 'Calling `ws.send()` unconditionally without checking `ws.bufferedAmount` on slow 3G clients.',
      fix: 'Unchecked sends queue megabytes of backlogged buffers in Node RAM; drop or disconnect sockets exceeding a safe `bufferedAmount` cap.',
    },
  ],
  exercise: {
    id: '11.2-ex',
    title: 'Build a Multi-Instance Authenticated WebSocket Chat Room',
    instructionsMarkdown:
      'Combine the steps above into a WebSocket server module that:\n1. Validates `Origin` and session/ticket auth inside `httpServer.on("upgrade")`.\n2. Reaps unresponsive sockets via 25s `PING/PONG` heartbeats and refreshes Redis TTL presence.\n3. Verifies room membership before joining `localRooms` and broadcasts across instances via Redis Pub/Sub.\n4. Implements client-side exponential backoff + jitter reconnection.',
    acceptanceChecklist: [
      'AuthN and strict Origin validation run during HTTP Upgrade before 101 Switching Protocols',
      'PING/PONG heartbeat detects dead clients and cleans up room state + presence TTL',
      'Uses separate Redis Pub and Sub clients for horizontal multi-instance room broadcasting',
      'Enforces room authorization on join and guards slow sockets via bufferedAmount check',
    ],
  },
};
