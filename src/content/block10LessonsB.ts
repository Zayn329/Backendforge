import { FptLessonContent, RecipeLessonContent } from '../types';

export const LESSON_10_4: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'On a single server, caching in a JavaScript `Map` and locking with a boolean flag works fine. The moment you run **4 backend API containers behind a load balancer**, everything changes: Container A updates a user’s permissions while Containers B, C, and D still serve stale copies from their private memories—and two cron containers both try to run the exact same midnight billing batch!',
      'In this unit, we’ll examine **Distributed Caching** from first principles: **multiple backend instances**, **shared cache**, **cache consistency**, **distributed invalidation**, **distributed locks**, and **lock expiration & failure cases**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Scaling out to multiple servers breaks in-process caches and locks immediately. Knowing both how shared caches stay consistent and where distributed locks can silently fail keeps multi-instance backends safe.',
    prerequisites: [
      {
        subBlockId: '10.2',
        label: 'Cache invalidation & staleness (10.2)',
        detail: 'Understanding TTLs and post-write cache deletion.',
      },
      {
        subBlockId: '10.3',
        label: 'Redis atomic commands & Lua (10.3)',
        detail: 'Knowing how `SET ... NX PX` and Lua execute atomically on Redis.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-10.4.1',
      topicId: '10.4.1',
      coveredTopicIds: ['10.4.2', '10.4.3', '10.4.4'],
      title: 'Multiple backend instances, shared cache, consistency, and distributed invalidation',
      problemAndRequirementsMarkdown: [
        '### First principles: Why local `Map` caches tear apart across 4 containers',
        'Imagine Container #1, #2, #3, and #4 all hold a local `userCache = new Map()`. Alice updates her display name on Container #2 (`PATCH /profile`), which deletes `user:42` from Container #2’s `Map`. Next second, her browser hits Container #3—and sees her **old name**! Even worse, Container #1 has its own old copy too!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Coordinating cache state across replicas',
        '1. **Shared Cache (Redis)**: Move the cache out of individual API processes into one shared **Redis** service in your VPC (`10.4.2`). When Container #2 runs `redis.del("user:42")`, Containers #1, #3, and #4 immediately see the deletion!',
        '2. **Cache Consistency & Distributed Invalidation**: What if you use Redis *or* hybrid L1 (local) + L2 (Redis) caching?',
        '   - **Shared Redis + `DEL` + TTL**: Single shared place to invalidate (`DEL`) after Postgres commit—simplest and cleanest.',
        '   - **Pub/Sub Invalidation (if using local L1 caches)**: Container #2 publishes `invalidate:user:42` onto a Redis Pub/Sub channel so all 4 pods drop their local L1 entry within milliseconds. *(Note: Redis Pub/Sub is fire-and-forget, so always combine with short L1 TTLs!)*',
        '   - **Versioned Keys (`user:42:v17`)**: Store `version = 17` in Postgres/Redis; updates bump the version cleanly so no concurrent stale reader can ever poison `v18`!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Replace isolated per-process caches with a shared Redis cache (plus versioned keys or Pub/Sub invalidation + short TTLs if local L1 caches exist) so all backend instances see consistent updates.',
      codeExamples: [],
    },
    {
      id: 'topic-10.4.5',
      topicId: '10.4.5',
      coveredTopicIds: ['10.4.6'],
      title: 'Distributed locks, lock expiration, and subtle failure cases',
      problemAndRequirementsMarkdown: [
        '### First principles: Coordinating exclusive work across multiple servers—and how locks lie!',
        'Suppose 3 API/worker containers want to guarantee **only ONE container** runs a 5-second invoice sync for `org_9` at a time. Can you use Redis `SET lock:org_9 1 NX`? Wait—two sneaky traps catch almost everyone:',
        '- **Trap 1 (Deadlock on crash)**: Container A acquires `SET lock:org_9 1 NX` without an expiration, then crashes (`kill -9`). Nobody ever runs `DEL` → **permanent deadlock forever!**',
        '- **Trap 2 (Accidental Unlock by Slow Owner!)**: You add `PX 5000` (5-second TTL). Container A gets stuck in a **6-second GC pause** (`12.2`)! At `t = 5s`, Redis expires A’s lock and grants it to **Container B**. At `t = 6s`, Container A wakes up, finishes, and runs `redis.del("lock:org_9")`—**accidentally deleting Container B’s active lock**, letting Container C enter too!!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Safe Distributed Locking & Honest Limitations',
        '1. **Safe Acquire (`SET lockKey uniqueToken NX PX 10000`)**: Always set both `NX` (only if absent) AND a bounded TTL (`PX`), storing a **unique random `ownerToken`** (UUID) as the value—NOT `"1"`!',
        '2. **Safe Release (Compare-and-Delete Lua Script)**: Never run bare `redis.del(lockKey)`. Run an atomic Lua script: *“ONLY delete `lockKey` IF `redis.call(\'GET\', lockKey) == ownerToken`!”* That guarantees slow Container A can **never** delete Container B’s lock!',
        '3. **Lock Expiration & Failure Cases (Fencing Tokens)**: Wait—even with compare-and-delete Lua, notice that during A’s 6-second pause between `t = 5s` and `t = 6s`, **both A and B were momentarily running concurrently!** For critical money/inventory correctness where overlap cannot be tolerated:',
        '   - Use **Fencing Tokens** (a monotonically increasing sequence number `token = 34` checked by Postgres `WHERE last_fence_token < 34`—Postgres rejects A’s late stale write!) OR rely on **PostgreSQL transactions / `SELECT ... FOR UPDATE` / advisory locks** directly on your source-of-truth DB instead of Redis locks!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Acquire distributed Redis locks with NX + TTL + a unique owner token, release via atomic compare-and-delete Lua, and pair with DB fencing tokens or Postgres locks when strict correctness is required.',
      codeExamples: [
        {
          snippet: {
            id: '10.4-safe-lock',
            title: 'Safe Redis Distributed Lock (Acquire + Lua Compare-and-Delete)',
            language: 'typescript',
            code: `import crypto from "node:crypto";
import Redis from "ioredis";

const RELEASE_LOCK_LUA = \`
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  else
    return 0
  end
\`;

export async function withDistributedLock<T>(
  redis: Redis,
  lockKey: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T | null> {
  const token = crypto.randomUUID();
  const acquired = await redis.set(lockKey, token, "PX", ttlMs, "NX");
  if (acquired !== "OK") return null;

  try {
    return await fn();
  } finally {
    // Only deletes the lock if WE still own it!
    await redis.eval(RELEASE_LOCK_LUA, 1, lockKey, token);
  }
}`,
          },
          lineByLineMarkdown:
            '- `PX ttlMs` prevents permanent deadlocks if the holder crashes.\n- Storing `token = crypto.randomUUID()` and deleting via `RELEASE_LOCK_LUA` prevents a slow expired holder from deleting another worker’s lock.',
        },
      ],
    },
  ],
  conceptConnection: {
    title: 'Multi-instance cache & lock coordination across replicas',
    narrativeMarkdown: [
      'When scaling horizontally from 1 server to N replicas:',
      '- **Reads & Writes**: All replicas share one **Redis** cache (`10.4.2`) invalidated via `DEL`/versioning/PubSub (`10.4.4`).',
      '- **Coordination**: Exclusive tasks use **NX + TTL + unique-token Lua locks** (`10.4.5`), backed by **DB fencing tokens / Postgres locks** when GC pauses or TTL expiry (`10.4.6`) could cause two writers to overlap.',
    ].join('\n\n'),
    integratedExample: {
      id: '10.4-integrated-example',
      title: 'Why Compare-and-Delete + Fencing Tokens Matter Under GC Pause',
      language: 'text',
      code: `t=0s: Pod A acquires lock (token="aaa", ttl=5s) -> enters 6s GC pause!
t=5s: Lock expires! Pod B acquires lock (token="bbb", ttl=5s)
t=6s: Pod A wakes up -> runs Lua compare-and-delete("aaa")
        ├─► GET(lock) is "bbb" != "aaa" -> Pod B's lock stays SAFE!
        └─► If Pod A still tries to write DB: Postgres checks fencing_token (33 < 34) -> REJECTS A!`,
    },
    walkthroughMarkdown:
      'Understanding *both* why shared caches work cleanly and where Redis TTL locks have limits prepares you for distributed systems in Block 13.',
  },
  questions: [
    {
      id: '10.4-kc-1',
      focusArea: 'Shared Cache & Distributed Invalidation',
      prompt:
        'Why do in-memory JavaScript `Map` caches break as soon as you scale to 4 backend containers—and how do **shared Redis caches** (plus Pub/Sub invalidation or versioned keys) restore **cache consistency**?',
      hints: [
        'If Container #2 updates Postgres and deletes a key from Container #2’s private `Map`, what do Containers #1, #3, and #4 still hold?',
        'Compare moving cache state to shared Redis vs. broadcasting L1 invalidations.',
        'Per-process caches diverge across instances so users see stale flips depending on which container serves them; shared Redis gives one invalidatable cache (while Pub/Sub or versioned keys + TTLs synchronize any local L1 tier).',
      ],
      explanation:
        'Each backend instance has an isolated memory space, so invalidating a local `Map` on Instance #2 leaves Instances #1, #3, and #4 serving stale data randomly across load-balanced requests. Moving cached data into a **shared Redis** cluster ensures one consistent cache copy; if local L1 caches are also used for extreme hot keys, **Redis Pub/Sub invalidation** (paired with short TTLs) or **versioned keys** keep replicas aligned.',
      evaluationCriteria: [
        'Explains multi-instance cache divergence with local Maps',
        'Explains shared Redis and L1 invalidation/versioning strategies',
      ],
      topicIds: ['10.4.1', '10.4.2', '10.4.3', '10.4.4'],
    },
    {
      id: '10.4-kc-2',
      focusArea: 'Distributed Locks & Failure Cases',
      prompt:
        'Trace the two classic failure bugs in a naive Redis lock (`SET lock 1 NX` + `DEL lock`): (1) omitting a TTL, and (2) adding a TTL (`PX 5000`) but releasing with bare `DEL lock` after a 6-second pause. Why might you still need a **fencing token** or Postgres lock even after fixing release with Lua?',
      hints: [
        'What happens if the holder crashes without TTL? What happens at `t=6s` if Worker B acquired the expired lock at `t=5s`?',
        'Even with safe Lua compare-and-delete, could Worker A write stale data to Postgres at `t=5.8s` *before* realizing its lock expired?',
        'No TTL deadlocks on crash; bare DEL deletes B’s active lock after A pauses past TTL (fixed by unique token + Lua check); fencing tokens/DB locks guard against A executing stale DB writes after its lease already expired.',
      ],
      explanation:
        'Without a **TTL**, a crashed lock holder causes permanent deadlock. With a TTL but bare `DEL`, a paused Worker A wakes up after TTL expiration and deletes Worker B’s newly acquired lock—fixed by storing a unique random token and releasing via **atomic Lua compare-and-delete**. Even then, a paused Worker A can still issue an overlapping DB write right after expiration unless downstream storage enforces a monotonic **fencing token** (or uses Postgres row/advisory locks directly).',
      evaluationCriteria: [
        'Explains crash deadlock without TTL and stolen-lock deletion with bare DEL',
        'Explains unique-token Lua release plus fencing tokens / DB locks for strict safety',
      ],
      topicIds: ['10.4.5', '10.4.6'],
    },
  ],
};

export const LESSON_10_5_FPT: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'A partner writes a buggy retry `while(true)` loop, or a bot hammers your `/search` endpoint at 3,000 requests/second—knocking your database offline for every real customer. Earlier in `6.5` we met rate limiting as a security guardrail; now let’s dive into **how rate-limiting algorithms actually work under the hood** and how Redis executes them accurately across distributed servers.',
      'In this unit, we’ll derive **Rate Limiting** algorithms and architecture from first principles: **why rate limiting is required**, **fixed window**, **sliding window**, **token bucket**, **leaky bucket**, **Redis-backed rate limiting**, and **identity-based vs. IP-based limits**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Choosing between Fixed Window, Sliding Window, Token Bucket, and Leaky Bucket determines whether bursty legitimate clients get unfairly blocked—or whether attackers slip double traffic through window boundaries!',
    prerequisites: [
      {
        subBlockId: '10.3',
        label: 'Redis Strings, Sorted Sets & Lua scripts (10.3)',
        detail: 'Knowing how Redis executes atomic counters, sorted-set timelines, and Lua scripts.',
      },
      {
        subBlockId: '6.5',
        label: 'Production rate limits & quotas (6.5)',
        detail: 'Understanding `429 Too Many Requests` and protecting availability.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-10.5.1',
      topicId: '10.5.1',
      coveredTopicIds: ['10.5.2', '10.5.3', '10.5.4', '10.5.5'],
      title: 'Why rate limiting is required — and the four core algorithms',
      problemAndRequirementsMarkdown: [
        '### First principles: One limit rule, four totally different burst behaviors',
        'Suppose your goal is: *“Allow ~60 requests per minute per client.”* Seems simple—until you trace what happens at `12:00:59` and `12:01:01`!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Comparing the four classic rate-limiting algorithms',
        '1. **Fixed Window Counter**: Divide time into fixed buckets (`12:00`, `12:01`) and increment `INCR key:12:00` up to `60`. Super cheap (1 integer in Redis!), **but has the Boundary Burst Bug**: a client can send **60 requests at `12:00:59`** and **60 more at `12:01:01`**—pushing **120 requests in 2 seconds** (double your limit)!',
        '2. **Sliding Window (Log or Counter)**: Evaluates the **rolling past 60 seconds** from *right now* (`now - 60s .. now`). Eliminates boundary spikes cleanly—either via a **Sliding Window Log** (exact timestamps in a Redis Sorted Set) or **Sliding Window Counter** (weighted blend of current + previous fixed bucket using almost zero RAM!).',
        '3. **Token Bucket** *(Most versatile in APIs!)*: Imagine a bucket holding up to `capacity = 20` tokens, refilling smoothly at `refillRate = 2 tokens/sec`. Each request consumes 1 token (`>= 1` → allow; `0` → `429`). **Why engineers love it**: It naturally permits **healthy short bursts** (up to bucket capacity when a page loads 8 API calls at once) while strictly capping the **sustained average rate**!',
        '4. **Leaky Bucket**: Imagine requests entering a FIFO queue of fixed size and **draining out at a strictly constant rate** (like water dripping steadily from a hole in a bucket). Smooths spikey bursts into an even steady trickle for fragile downstream services—at the cost of queueing delay or dropping overflow.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Fixed Window is simple but allows 2x boundary bursts; Sliding Window smooths rolling checks; Token Bucket allows controlled bursts while capping average rate; Leaky Bucket enforces a constant outflow rate.',
      codeExamples: [],
    },
    {
      id: 'topic-10.5.6',
      topicId: '10.5.6',
      coveredTopicIds: ['10.5.7'],
      title: 'Redis-backed rate limiting and identity-based vs. IP-based limits',
      problemAndRequirementsMarkdown: [
        '### First principles: *Who* are we counting, and *where* does the counter live?',
        'Counting requests in local Node.js memory fails across 5 load-balanced pods (each pod gives the attacker a fresh 60-request quota = 300 req/min!). Meanwhile, counting **only by IP address** breaks two common situations:',
        '- **Shared corporate / university Wi-Fi (NAT)**: 500 legitimate employees share *one* public IP—IP limits unfairly block all 500 coworkers!',
        '- **Botnets / Rotating proxies**: One attacker uses 500 IPs to attack one user’s account or one API key!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Putting distributed limits together cleanly',
        '1. **Redis-Backed Rate Limiting**: Centralize counters/buckets in **Redis** using atomic **Lua scripts** (`10.3`) so all API pods enforce the exact same global budget in `< 1ms` with zero race conditions.',
        '2. **Identity-Based vs. IP-Based Limits (Layer Both!)**:',
        '   - **Unauthenticated routes (`/login`, `/signup`, public search)**: Key by **client IP** (read safely via trusted proxy `req.ip`!), plus email/account key on login attempts (`6.5`).',
        '   - **Authenticated routes**: Key by **authenticated `userId`, `orgId`, or `apiKeyId`** (falls back to IP only if anonymous)—so 500 employees behind one office NAT each get their own fair allowance, while a stolen token on 50 IPs shares one cap!',
        '   - Return standard **`429 Too Many Requests`** plus `Retry-After` / `X-RateLimit-Remaining` headers so well-behaved SDKs back off politely.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Back global limits with atomic Redis Lua scripts, keying anonymous traffic by trusted IP and authenticated traffic by user/tenant/API key identity.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Choosing the right rate-limiting algorithm and key',
    narrativeMarkdown: [
      'Compare how each algorithm behaves before checking out the concrete implementations in the **Recipe** tab:',
      '- **Fixed Window**: Minimal Redis memory, allows 2x edge bursts.',
      '- **Sliding Window**: Accurate rolling cap, removes edge bursts.',
      '- **Token Bucket**: Controlled burst capacity + steady refill rate.',
      '- **Leaky Bucket**: Strictly smoothed constant output trickle.',
    ].join('\n\n'),
    integratedExample: {
      id: '10.5-integrated-example',
      title: 'Algorithm Behavior & Keying Matrix',
      language: 'text',
      code: `Algorithm       Burst Handling              Redis Structure           Keying Strategy
───────────────────────────────────────────────────────────────────────────────────────────────
Fixed Window    Up to 2x at bucket edge     String (INCR + EXPIRE)    • Anon: trusted req.ip
Sliding Window  No edge spikes (rolling)    Sorted Set or 2 Counters  • Login: ip + email
Token Bucket    Allows burst up to max cap  Hash/String + Lua math    • Auth API: userId / apiKeyId
Leaky Bucket    Fixed steady drip rate      Queue / Lua timestamp     • Tenant quota: orgId`,
    },
    walkthroughMarkdown:
      'Switch to the **Recipe** tab to implement both an atomic Redis **Sliding Window** limiter and a Redis **Token Bucket** Lua limiter wired into Express middleware.',
  },
  questions: [
    {
      id: '10.5-kc-1',
      focusArea: 'Fixed vs Sliding Window vs Token/Leaky Bucket',
      prompt:
        'Why can a **Fixed Window** limit of 60 req/min let a client fire **120 requests in 2 seconds**—and how do **Sliding Window**, **Token Bucket**, and **Leaky Bucket** behave differently?',
      hints: [
        'Consider 60 requests arriving at `12:00:59` followed by 60 more at `12:01:00`.',
        'Contrast rolling window smoothing vs. burst-allowing token buckets vs. steady-drip leaky buckets.',
        'Fixed Window resets sharply at minute edges (allowing 2x edge bursts); Sliding Window enforces the limit across any rolling window; Token Bucket permits controlled bursts up to bucket size while capping refill rate; Leaky Bucket drains at a strictly uniform rate.',
      ],
      explanation:
        'With **Fixed Window**, a client can send 60 requests at `12:00:59` and 60 at `12:01:00` when the minute bucket resets—pushing 120 requests in 2 seconds. **Sliding Window** evaluates a rolling `60s` interval so edge spikes cannot bypass the cap. **Token Bucket** refills tokens steadily and permits short healthy bursts up to bucket capacity, whereas **Leaky Bucket** outputs requests at a strictly constant smooth rate.',
      evaluationCriteria: [
        'Demonstrates the 2x window-boundary burst flaw of Fixed Window',
        'Accurately differentiates Sliding Window, Token Bucket, and Leaky Bucket behaviors',
      ],
      topicIds: ['10.5.1', '10.5.2', '10.5.3', '10.5.4', '10.5.5'],
    },
    {
      id: '10.5-kc-2',
      focusArea: 'Redis Enforcement & IP vs Identity Keys',
      prompt:
        'Why should authenticated endpoints prefer **identity-based limits (`userId` / `apiKeyId`)** over **IP-based limits**, and why must **Redis-backed rate limiters** execute their check-and-update atomically (e.g., via Lua)?',
      hints: [
        'Think about 500 coworkers sharing one corporate NAT IP vs. one user running a scraper from 100 cloud IPs.',
        'What happens if two concurrent requests read `count = 59` from Redis before either increments it to `60`?',
        'Identity limits avoid penalizing corporate/mobile NATs while stopping multi-IP abuse of one account; atomic Redis Lua scripts eliminate read-then-increment race conditions across multiple API instances.',
      ],
      explanation:
        'On **IP-only limits**, hundreds of users behind a corporate/university NAT share one quota and get unfairly throttled, whereas an attacker with multiple IPs multiplies their budget. Keying authenticated endpoints by **`userId`/`orgId`/`apiKeyId`** (and public routes by trusted IP) fixes both. Running the check, increment/refill, and TTL update inside an **atomic Redis Lua script** prevents concurrent API instances from racing past the limit.',
      evaluationCriteria: [
        'Contrasts IP-based (NAT false positives / multi-IP bypass) vs identity-based keys',
        'Explains shared Redis + Lua atomicity across distributed API instances',
      ],
      topicIds: ['10.5.6', '10.5.7'],
    },
  ],
};

export const LESSON_10_5_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Implement distributed, race-free **Redis-backed rate limiting** in TypeScript/Express using atomic **Lua scripts** for both **Sliding Window** and **Token Bucket** algorithms, with **IP vs. identity key selection** and standard `429` headers.',
  whenToUseMarkdown:
    'Mount at API gateways or Express route boundaries to protect expensive endpoints, login routes, and multi-tenant APIs across multiple backend instances.',
  setupCommands: [
    {
      id: '10.5-setup-1',
      label: 'Ensure ioredis is installed',
      command: 'npm install ioredis',
      notes: 'Uses atomic `EVAL` Lua scripts so every check+mutate runs in 1 network round-trip.',
    },
  ],
  coreApisMarkdown: [
    '- **Sliding Window Log (`ZREMRANGEBYSCORE` + `ZCARD` + `ZADD`)**: Exact rolling window check in a Redis Sorted Set (`10.5.3`).',
    '- **Token Bucket Lua (`tokens`, `lastRefillMs`)**: Computes continuous refill since `lastRefillMs` and deducts 1 token atomically (`10.5.4`).',
    '- **`429 Too Many Requests` + `Retry-After` / `X-RateLimit-Remaining`**: Standard machine-readable throttling headers.',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Implement an atomic Redis Token Bucket Lua script (allows controlled bursts)',
      detailMarkdown:
        'Calculates newly refilled tokens cleanly inside Redis (`10.5.4`, `10.5.6`) without maintaining background timer loops.',
      code: {
        id: '10.5-step-1',
        title: 'src/rateLimit/tokenBucket.ts — Atomic Redis Token Bucket via Lua',
        language: 'typescript',
        code: `import Redis from "ioredis";

const TOKEN_BUCKET_LUA = \`
  local key = KEYS[1]
  local capacity = tonumber(ARGV[1])
  local refillPerSec = tonumber(ARGV[2])
  local nowMs = tonumber(ARGV[3])

  local data = redis.call("HMGET", key, "tokens", "lastMs")
  local tokens = tonumber(data[1])
  local lastMs = tonumber(data[2])

  if not tokens then
    tokens = capacity
    lastMs = nowMs
  else
    local elapsedSec = math.max(0, (nowMs - lastMs) / 1000.0)
    tokens = math.min(capacity, tokens + elapsedSec * refillPerSec)
    lastMs = nowMs
  end

  if tokens < 1 then
    local retryAfterSec = math.ceil((1 - tokens) / refillPerSec)
    return { 0, math.floor(tokens), retryAfterSec }
  end

  tokens = tokens - 1
  redis.call("HSET", key, "tokens", tokens, "lastMs", lastMs)
  redis.call("EXPIRE", key, math.ceil(capacity / refillPerSec) * 2)
  return { 1, math.floor(tokens), 0 }
\`;

export async function consumeTokenBucket(
  redis: Redis,
  key: string,
  capacity: number,
  refillPerSec: number
) {
  const [allowed, remaining, retryAfter] = (await redis.eval(
    TOKEN_BUCKET_LUA,
    1,
    key,
    capacity,
    refillPerSec,
    Date.now()
  )) as [number, number, number];

  return { allowed: allowed === 1, remaining, retryAfter };
}`,
      },
    },
    {
      stepNumber: 2,
      title: 'Implement a Sliding Window Log limiter with Redis Sorted Sets',
      detailMarkdown:
        'Drops timestamps older than `now - windowMs`, counts current entries, and records the new timestamp only if below `limit` (`10.5.3`).',
      code: {
        id: '10.5-step-2',
        title: 'src/rateLimit/slidingWindow.ts — Sorted Set Sliding Window Lua',
        language: 'typescript',
        code: `import crypto from "node:crypto";
import Redis from "ioredis";

const SLIDING_WINDOW_LUA = \`
  local key = KEYS[1]
  local now = tonumber(ARGV[1])
  local windowMs = tonumber(ARGV[2])
  local limit = tonumber(ARGV[3])
  local member = ARGV[4]

  redis.call("ZREMRANGEBYSCORE", key, 0, now - windowMs)
  local count = redis.call("ZCARD", key)
  if count >= limit then
    return { 0, 0 }
  end
  redis.call("ZADD", key, now, member)
  redis.call("PEXPIRE", key, windowMs)
  return { 1, limit - count - 1 }
\`;

export async function checkSlidingWindow(
  redis: Redis,
  key: string,
  windowMs: number,
  limit: number
) {
  const uniqueMember = \`\${Date.now()}:\${crypto.randomUUID()}\`;
  const [allowed, remaining] = (await redis.eval(
    SLIDING_WINDOW_LUA,
    1,
    key,
    Date.now(),
    windowMs,
    limit,
    uniqueMember
  )) as [number, number];
  return { allowed: allowed === 1, remaining };
}`,
      },
    },
    {
      stepNumber: 3,
      title: 'Mount Identity-or-IP middleware returning 429 + Retry-After headers',
      detailMarkdown:
        'Prefer authenticated `req.user.id` / `apiKeyId` over `req.ip` (`10.5.7`), and fail-open vs. fail-closed intentionally if Redis experiences a brief network blip.',
      code: {
        id: '10.5-step-3',
        title: 'Express rate-limit middleware selecting Identity vs IP key',
        language: 'typescript',
        code: `export function rateLimitMiddleware(redis: Redis, opts: { capacity: number; refillPerSec: number }) {
  return async (req: any, res: any, next: any) => {
    // Prefer verified user/API-key identity; fall back to trusted req.ip for anonymous routes (10.5.7)
    const subjectKey = req.user?.id ? \`rl:user:\${req.user.id}\` : \`rl:ip:\${req.ip}\`;
    const result = await consumeTokenBucket(redis, subjectKey, opts.capacity, opts.refillPerSec);

    res.setHeader("X-RateLimit-Remaining", String(result.remaining));
    if (!result.allowed) {
      res.setHeader("Retry-After", String(result.retryAfter));
      return res.status(429).json({ error: "Too many requests", retryAfterSeconds: result.retryAfter });
    }
    next();
  };
}`,
      },
    },
  ],
  workingExamples: [
    {
      id: '10.5-ex-leaky',
      title: 'Comparing key prefix scoping per endpoint sensitivity',
      language: 'text',
      code: `Public Search Endpoint -> key: "rl:search:ip:<ip>"       (Token Bucket: cap 30, refill 2/s)
Login Endpoint         -> key: "rl:login:acct:<email>"  (Sliding Window: 5 failures / 15m)
Paid Partner API       -> key: "rl:partner:<apiKeyId>"  (Token Bucket: cap 200, refill 50/s)`,
      explanation:
        'Scoping rate-limit keys by endpoint class + subject identity lets you tune burst allowances separately for search, login security, and paid APIs.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Using `ZADD key now now` in Sliding Window Log where two requests in the same millisecond overwrite the same Sorted Set member!',
      fix: 'Include a unique suffix (`${now}:${randomUUID()}`) as the Sorted Set member so sub-millisecond concurrent requests count distinctly.',
    },
    {
      mistake: 'Reading `req.headers["x-forwarded-for"]` directly without configuring `app.set("trust proxy", ...)`.',
      fix: 'Any attacker can spoof `X-Forwarded-For: 1.2.3.4` to bypass IP limits! Always configure Express `trust proxy` to match your real Load Balancer hop.',
    },
    {
      mistake: 'Doing `tokens = await redis.get(...)` in Node.js, subtracting 1 in JS, and `redis.set(...)`.',
      fix: 'Concurrent requests race cleanly past `get` before `set`; always evaluate Token Bucket and Sliding Window math inside atomic Redis Lua scripts.',
    },
  ],
  exercise: {
    id: '10.5-ex',
    title: 'Build & Wire a Redis Token Bucket Middleware',
    instructionsMarkdown:
      'Implement `rateLimitMiddleware` backed by the Redis Token Bucket Lua script:\n1. Key authenticated callers by `userId` (or `apiKeyId`) and anonymous callers by trusted `req.ip`.\n2. Return `429` with `Retry-After` and `X-RateLimit-Remaining` headers when depleted.\n3. Note how you’d swap to Sliding Window Log for strict burst-free login limits.',
    acceptanceChecklist: [
      'Executes Token Bucket refill + consumption atomically in a single Redis Lua call',
      'Uses identity-based keys for authenticated routes and trusted IP for anonymous routes',
      'Emits HTTP 429 + Retry-After + X-RateLimit-Remaining headers cleanly',
      'Handles same-millisecond uniqueness in Sorted Set Sliding Window implementations',
    ],
  },
};
