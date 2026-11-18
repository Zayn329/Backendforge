import { FptLessonContent, RecipeLessonContent } from '../types';

export const LESSON_10_1: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Your homepage loads the “Top 10 Trending Products” query (`JOIN products JOIN reviews GROUP BY ...`) cleanly for 50 users. Suddenly a social post brings 20,000 visitors in two minutes—all asking for the **exact same Top 10 list**! Your CPU shoots to 100% recalculating the identical answer 20,000 times from Postgres disks.',
      'In this unit, we’ll examine **Why Caching Exists** from hardware and systems first principles: **repeated computation**, **expensive database queries**, **network latency**, **memory vs. disk access**, **cache hits and misses**, and **cache locality**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Caching can cut response latency from 80 milliseconds to under 2 milliseconds and shield PostgreSQL from 95% of read load—provided you understand *when* reads are actually repeatable enough to cache.',
    prerequisites: [
      {
        subBlockId: '4.4',
        label: 'Database query execution & I/O cost (4.4)',
        detail: 'Knowing why joins, aggregations, and disk reads cost orders of magnitude more than RAM lookups.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-10.1.1',
      topicId: '10.1.1',
      coveredTopicIds: ['10.1.2', '10.1.3', '10.1.4'],
      title: 'Repeated computation, expensive queries, network latency, and memory vs. disk access',
      problemAndRequirementsMarkdown: [
        '### First principles: Why is fetching fresh data from Postgres (or an external API) slow?',
        'Notice what happens on every uncached request for a user’s dashboard or product catalog:',
        '1. **Repeated Computation**: Your backend runs the *exact same* tax brackets, JSON serialization, or recommendation scoring over identical inputs thousands of times per second.',
        '2. **Expensive Database Queries**: Even indexed Postgres aggregations scan B-trees, join rows across tables, sort, and lock buffer pages.',
        '3. **Network Latency**: Calling a third-party REST API (exchange rates, weather, OAuth JWKS keys) adds 50–300ms per round-trip across the public internet.',
        '4. **Memory vs. Disk Access**: Reading a precomputed value out of **RAM (~100 nanoseconds locally, ~0.5–1ms over VPC Redis)** is orders of magnitude faster than scanning SSD blocks, parsing SQL, and executing query plans!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Deriving the core idea of a Cache',
        'A **cache** trades a small slice of fast, expensive **memory** to remember the result of a slow operation so subsequent identical requests get the answer without repeating the expensive work!',
        '- **When caching helps massively**: Read-heavy data where the **same key is read far more often than it changes** (feature flags, session lookups, product pages, leaderboards, JWKS public keys).',
        '- **When caching barely helps**: Write-heavy workloads or unrepeatable unique queries (`SELECT * FROM logs WHERE message LIKE \'%random_9281%\'`).',
      ].join('\n\n'),
      centralIdeaSummary:
        'Caching eliminates repeated computation, heavy DB queries, and network round-trips by serving precomputed results from fast memory instead of slow disk or remote APIs.',
      codeExamples: [],
    },
    {
      id: 'topic-10.1.5',
      topicId: '10.1.5',
      coveredTopicIds: ['10.1.6'],
      title: 'Cache hits, cache misses, and cache locality',
      problemAndRequirementsMarkdown: [
        '### First principles: Measuring whether your cache is actually helping—and where it sits',
        'Adding a cache isn’t free! Every cache lookup adds a tiny check step. If 95 out of 100 requests *aren’t* in the cache anyway, you just made 95% of your traffic *slower* (check cache → miss → hit Postgres → write cache)!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Hits, misses, and where data lives (Locality)',
        '1. **Cache Hit vs. Cache Miss**:',
        '   - **Cache Hit**: The requested key exists in the cache → fast return (`< 1–2 ms`) without hitting the database.',
        '   - **Cache Miss**: Key is absent (or expired) → fall back to the slower source of truth (Postgres / API), optionally store the result in the cache for next time.',
        '   - **Hit Ratio (`hits / total_reads`)**: Good caches typically target `85%–99%+` hit rates. A 20% hit rate means poor key design or wrong workload!',
        '2. **Cache Locality**: Where does the cache sit relative to your code? Closer = faster, but less shared:',
        '   - **CPU L1/L2 & In-Process RAM (`Map` / LRU inside Node.js)**: Nanoseconds (`0` network hops!)—great for immutable config or tiny hot keys, **not shared** across 10 backend containers.',
        '   - **Distributed In-Memory Cache (Redis in same VPC)**: Sub-millisecond network hop—shared cleanly across all backend containers (`10.4`).',
        '   - **CDN Edge Cache (Cloudflare/CloudFront)**: Located geographically near the user—serves static assets or public API responses before traffic even reaches your origin servers!',
        '   - Also remember **temporal & spatial locality**: recently accessed items (hot users/articles) or related keys accessed together are far likelier to be requested again soon.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Effective caching achieves high cache-hit ratios by exploiting locality—placing hot, repeatable data as close to the caller as consistency and sharing requirements allow.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Latency ladder from CPU memory down to Disk and Internet',
    narrativeMarkdown: [
      'Compare how `10.1` trades speed against persistence and sharing across tiers:',
      '- **In-Process Memory**: Fastest (`~0.001ms`), zero network, per-container only.',
      '- **Shared Redis (Memory)**: Fast (`~0.5–1ms`), shared across all API instances.',
      '- **PostgreSQL (Indexed Disk/Buffer)**: Authoritative durable truth (`~5–50ms`+ under load).',
      '- **External HTTP API**: Slowest (`~50–300ms`+ across internet).',
    ].join('\n\n'),
    integratedExample: {
      id: '10.1-integrated-example',
      title: 'Storage & Latency Hierarchy Driving Cache Design',
      language: 'text',
      code: `[Request]
  ├─► In-Process LRU (Node RAM)    ~0.001 ms  (Local to 1 instance; tiny capacity)
  ├─► Redis Cluster (VPC RAM)      ~0.5–1 ms  (Shared across all API pods; Hit vs Miss!)
  ├─► Postgres (Queries + Disk)    ~5–50 ms   (ACID source of truth)
  └─► External Vendor HTTP API     ~50–300 ms (Unreliable internet latency)`,
    },
    walkthroughMarkdown:
      'Now that you understand *why* caches speed up reads, `10.2` examines the strategies for reading, writing, expiring, and protecting caches under heavy traffic.',
  },
  questions: [
    {
      id: '10.1-kc-1',
      focusArea: 'Why Caching Exists & Hit Ratios',
      prompt:
        'Why can a poorly designed cache with a 15% **cache-hit ratio** actually make average latency *worse* than having no cache—and what types of workloads benefit most from **memory vs. disk/compute** caching?',
      hints: [
        'Trace the steps taken on a cache miss: (1) check cache, (2) wait for DB anyway, (3) serialize and write into cache.',
        'Contrast unique random searches vs. hot, repeated read queries or slow external computations.',
        'On every miss (85% of requests), you pay an extra cache-lookup + write hop on top of the DB call; caching wins when repeated reads/computations yield high hit ratios (85%–99%+) on shared hot data.',
      ],
      explanation:
        'A **cache miss** pays *both* the cache network check *and* the full database query plus a cache write. If hit ratios stay low (e.g., unique search filters), caching adds overhead without shielding Postgres. Caching shines on **repeated computation**, **expensive DB joins**, and **slow network API calls** with strong temporal/key locality where reads heavily outnumber writes.',
      evaluationCriteria: [
        'Explains extra round-trip cost on cache misses when hit ratio is low',
        'Identifies high read-reuse, expensive compute/DB/network workloads as ideal candidates',
      ],
      topicIds: ['10.1.1', '10.1.2', '10.1.3', '10.1.4', '10.1.5'],
    },
    {
      id: '10.1-kc-2',
      focusArea: 'Cache Locality Tiers',
      prompt:
        'Compare storing cached items inside Node.js **in-process RAM** vs. **VPC Redis** vs. a **CDN edge cache** in terms of **cache locality**, latency, and multi-instance sharing.',
      hints: [
        'Which one avoids network hops completely? Which one shares state across 10 backend containers? Which one stops requests before reaching your servers?',
        'Consider what happens if Container A updates a key stored only in Container A’s local `Map`.',
        'In-process RAM has zero network hop but isn’t shared across pods; Redis adds ~1ms VPC hop while sharing state across all backend pods; CDNs cache near users at the edge before traffic hits your origin.',
      ],
      explanation:
        '**Cache locality** trades distance against sharing: **in-process RAM** gives microsecond access with zero network hops, but each API container holds its own isolated copy (hard to invalidate globally). **VPC Redis** adds ~1ms network latency while giving all backend replicas one shared cache. **CDNs** place public responses geographically closest to users, absorbing traffic before it even touches your backend.',
      evaluationCriteria: [
        'Contrasts latency, locality, and shared consistency across in-process, Redis, and CDN tiers',
      ],
      topicIds: ['10.1.6'],
    },
  ],
};

export const LESSON_10_2: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Famous saying in computer science: *“There are only two hard things in Computer Science: cache invalidation and naming things.”* Putting data *into* Redis is one line of code. The hard part is keeping cached data fresh when the database changes—and stopping 10,000 concurrent users from crashing Postgres at the exact instant a hot key expires!',
      'In this unit, we’ll examine **Caching Strategies** from first principles: **cache-aside**, **read-through**, **write-through**, **write-behind**, **TTL & cache invalidation**, **stale data**, **cache stampedes**, **cache penetration**, and **cache warming**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Picking the wrong read/write strategy causes either stale pricing bugs, lost writes on crash, or thundering-herd DB outages right when traffic spikes.',
    prerequisites: [
      {
        subBlockId: '10.1',
        label: 'Cache hits, misses & memory speed (10.1)',
        detail: 'Understanding the basic read path between cache and database.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-10.2.1',
      topicId: '10.2.1',
      coveredTopicIds: ['10.2.2', '10.2.3', '10.2.4'],
      title: 'Read & Write Patterns: Cache-Aside, Read-Through, Write-Through, and Write-Behind',
      problemAndRequirementsMarkdown: [
        '### First principles: Who orchestrates the Cache and the Database—your app or the cache?',
        'There are two decisions every cache architecture makes: **(1) How are misses loaded?** and **(2) When database rows change, how does the cache update?**',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Four classic caching strategies & their trade-offs',
        '1. **Cache-Aside (Lazy Loading)** *(Most common in backend apps!)*: **Your application** manages both Redis and Postgres:',
        '   - Read: App checks `redis.get(key)`. Hit → return. Miss → query Postgres, `redis.set(key, val, "EX", ttl)`, return.',
        '   - Why it’s great: Only data actually requested gets cached, and if Redis crashes, your app still falls back to Postgres!',
        '2. **Read-Through**: Your app asks *only* the cache provider; on a miss, the **cache layer itself** loads from the DB, caches it, and returns it (hiding DB logic from callers).',
        '3. **Write-Through**: On every write, the app (or cache layer) writes to **cache AND database synchronously** before returning. Reads are always fresh (`low stale data`), **at the cost of slower writes** (2 sequential hops) and caching items that may never be read.',
        '4. **Write-Behind (Write-Back)**: App writes **only to RAM cache** and returns immediately (`<1ms`), while an async worker flushes batched updates to Postgres later. Blazing fast writes (used for view counters/analytics!), **at the risk of losing unflushed writes if cache memory crashes before flush!**',
      ].join('\n\n'),
      centralIdeaSummary:
        'Cache-aside lazily loads only requested keys under app control, Read/Write-through keep the cache synchronized on reads/writes, and Write-behind trades durability for ultra-fast batched writes.',
      codeExamples: [],
    },
    {
      id: 'topic-10.2.5',
      topicId: '10.2.5',
      coveredTopicIds: ['10.2.6', '10.2.7'],
      title: 'TTL, cache invalidation, and stale data',
      problemAndRequirementsMarkdown: [
        '### First principles: Why "delete on update" isn’t as trivial as it looks',
        'Suppose `Product #9` costs `$50` in both Postgres and Redis. An admin changes the price to `$75` in Postgres. If you never touch Redis, customers keep buying `$75` items for `$50` (**stale data**)!',
        'Wait: what if you try deleting `redis.del("product:9")` on every update—could two concurrent requests *still* put `$50` back in Redis?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Taming staleness safely',
        '1. **TTL (Time-To-Live)**: Attach an expiration (`EX 300` = 5 minutes) to *every* cache key as a **safety net**. Even if an invalidation message drops or an admin edits Postgres directly, stale data self-heals after TTL.',
        '2. **Explicit Cache Invalidation (Update DB → Delete Cache)**: On writes, update Postgres first, then **delete (`DEL`)** the cache key rather than trying to overwrite it (`SET`). Why delete instead of `SET`? Because if Request A (old `$50` read) and Request B (new `$75` write) race, two concurrent `SET`s can leave `$50` stuck in Redis; deleting lets the next clean read fetch `$75`.',
        '3. **Stale Data Tolerance**: Never cache data where 1-second staleness is catastrophic (like bank balances during withdrawal!)—cache things where brief staleness is harmless (product descriptions, public profiles), or use versioned keys (`user:42:v8`) so updates atomically point to a brand-new key!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Pair explicit post-write cache deletion (or versioned keys) with a bounded TTL fallback, and only cache data whose staleness window matches business tolerance.',
      codeExamples: [],
    },
    {
      id: 'topic-10.2.8',
      topicId: '10.2.8',
      coveredTopicIds: ['10.2.9', '10.2.10'],
      title: 'Cache stampedes, cache penetration, and cache warming',
      problemAndRequirementsMarkdown: [
        '### First principles: Three failure modes that hit high-traffic caches',
        '1. **Cache Stampede (Thundering Herd)**: `homepage:feed` takes 400ms to compute in Postgres and serves 5,000 req/sec. At `12:00:00`, its TTL expires! During the next 400ms, **2,000 requests all see a cache miss simultaneously**—and all 2,000 slam Postgres with the identical heavy query, crashing the DB!',
        '2. **Cache Penetration**: A bot sends 10,000 requests/sec for `GET /users/nonexistent_99999`. Because user `99999` doesn’t exist in Postgres, **nothing ever gets cached**—so 100% of those malicious requests bypass Redis and hammer Postgres directly!',
        '3. **Cold Cache on Boot / Deploy**: You launch a brand-new empty Redis cluster during peak traffic—instant 0% hit rate overwhelms Postgres immediately!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Three surgical fixes',
        '1. **Preventing Cache Stampedes**:',
        '   - **Mutex / Singleflight Lock**: Only **one** request acquires a short lock (`SET lock:homepage 1 NX PX 2000`) to recompute Postgres while concurrent callers wait briefly (50ms) or receive slightly stale previous data (**stale-while-revalidate**).',
        '   - **Jittered TTLs**: Add random jitter (`300s + random(0..60s)`) so 10,000 keys seeded at boot don’t all expire at the exact same second!',
        '2. **Preventing Cache Penetration**: Cache **negative results** briefly (`SET user:99999 "__NULL__" EX 30`) so repeated misses hit Redis instead of Postgres (and validate ID formats / Bloom filters at the edge before querying!).',
        '3. **Cache Warming**: Run a startup/pre-cutover script that preloads the top 1,000 hot catalog/config keys into Redis *before* shifting live user traffic onto a fresh cache.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Prevent cache stampedes with singleflight locks and jittered TTLs, stop cache penetration by caching short-lived null markers, and avoid cold-start DB spikes via cache warming.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Decision map for production caching strategies',
    narrativeMarkdown: [
      'Before adding Redis to an endpoint, walk through these four choices from `10.2`:',
      '1. **Read/Write Flow**: Default to **Cache-Aside** for general reads; reserve **Write-Behind** only when losing recent buffered writes (like view counts) is acceptable.',
      '2. **Freshness**: Always set a **TTL** (with random jitter) and `DEL` (or bump version key) after Postgres commits.',
      '3. **Protection**: Guard expensive hot keys against **Stampedes** (singleflight/stale-while-revalidate), nonexistent-ID floods against **Penetration** (short negative cache), and fresh deploys via **Warming**.',
    ].join('\n\n'),
    integratedExample: {
      id: '10.2-integrated-example',
      title: 'Resilient Cache-Aside Flow With Anti-Stampede & Anti-Penetration Guards',
      language: 'text',
      code: `GET /products/:id
  1. Check Redis -> Found JSON? Return in 1ms!
                 -> Found "__NULL__"? Return 404 (Stops Cache Penetration!)
  2. Cache Miss:
     ├─► Acquire short singleflight lock ("lock:prod:42") -> Only 1 worker hits Postgres!
     │      (Other concurrent callers wait briefly & read populated cache — Stops Stampede!)
     ├─► Query Postgres:
     │      • Found -> redis.set(key, json, "EX", 300 + jitter)
     │      • Missing -> redis.set(key, "__NULL__", "EX", 30)
     └─► Release lock`,
    },
    walkthroughMarkdown:
      'In `10.3`, we’ll look inside **Redis** itself—its data structures, atomic commands, Lua scripts, persistence, and eviction policies.',
  },
  questions: [
    {
      id: '10.2-kc-1',
      focusArea: 'Cache-Aside vs Write-Through vs Write-Behind',
      prompt:
        'Contrast **Cache-Aside**, **Write-Through**, and **Write-Behind**: which one risks losing data if Redis crashes, which slows down every write, and why is **Cache-Aside** (`update DB -> DEL key` + TTL) the most common default?',
      hints: [
        'Trace where writes go first and when they hit Postgres in each strategy.',
        'What happens if Redis reboots before an async Write-Behind queue flushes?',
        'Write-Behind risks data loss on cache crash before async DB flush; Write-Through adds cache write latency to every DB write (and caches unread data); Cache-Aside loads lazily on demand and safely heals via DEL + TTL.',
      ],
      explanation:
        '**Write-Behind** buffers writes only in fast cache memory and flushes to DB asynchronously—great for high-volume counters, risky for critical records if memory crashes before flush. **Write-Through** updates cache + DB synchronously, keeping cache warm at the cost of slower writes. **Cache-Aside** lets the app lazily populate only actually read keys while keeping Postgres authoritative via `DEL` on write + **TTL** safety expiration.',
      evaluationCriteria: [
        'Correctly maps Write-Behind data-loss risk and Write-Through write-latency trade-off',
        'Explains Cache-Aside lazy population + DEL/TTL invalidation simplicity',
      ],
      topicIds: ['10.2.1', '10.2.2', '10.2.3', '10.2.4', '10.2.5', '10.2.6', '10.2.7'],
    },
    {
      id: '10.2-kc-2',
      focusArea: 'Stampedes, Penetration & Warming',
      prompt:
        'Differentiate a **cache stampede** from **cache penetration**—and give one concrete production mitigation for each (plus why **cache warming** helps during deployments).',
      hints: [
        'In one failure, a real hot key expires and thousands rush to recompute it; in the other, callers query keys that *never exist* in Postgres.',
        'Think about singleflight locks/jitter vs. negative null caching vs. pre-populating cold caches.',
        'Stampede = simultaneous DB rebuild of an expired hot key (fix: singleflight lock + jittered TTL); Penetration = uncached queries for nonexistent IDs hitting DB (fix: cache short-TTL `__NULL__` + input/Bloom filter); Warming preloads hot keys before traffic arrives.',
      ],
      explanation:
        'A **cache stampede** occurs when a heavily requested key expires and thousands of concurrent misses recompute the same expensive DB query simultaneously—mitigated via **singleflight mutex locks**, stale-while-revalidate, and **jittered TTLs**. **Cache penetration** occurs when traffic requests nonexistent IDs that miss both Redis and Postgres repeatedly—mitigated by caching short-lived **`__NULL__` sentinel values** and validating inputs. **Cache warming** preloads top keys before traffic shifts to a cold cache.',
      evaluationCriteria: [
        'Accurately distinguishes cache stampede from cache penetration',
        'Gives valid fixes (singleflight/jitter, negative caching, warming)',
      ],
      topicIds: ['10.2.8', '10.2.9', '10.2.10'],
    },
  ],
};

export const LESSON_10_3_FPT: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'People often treat Redis as just a giant `JSON.stringify` key-value box (`GET key` / `SET key`). That uses maybe 10% of what makes Redis extraordinary! Because Redis stores rich native **in-memory data structures** and executes commands on a **single-threaded atomic execution loop**, Redis can manage leaderboards, atomic counters, unique visitor sets, and rate-limiter sliding windows cleanly with zero race conditions.',
      'In this unit, we’ll examine **Redis Fundamentals** from first principles: **in-memory storage**, **Strings, Hashes, Lists, Sets, and Sorted Sets**, **expiration**, **atomic operations**, **persistence (RDB & AOF)**, **eviction policies**, **Redis transactions**, and **Lua scripting**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Picking the right native Redis data structure and atomic command turns multi-step race-prone code into a single sub-millisecond atomic operation.',
    prerequisites: [
      {
        subBlockId: '10.1',
        label: 'Memory speed & caching role (10.1)',
        detail: 'Understanding why RAM-resident stores operate orders of magnitude faster than disk DBs.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-10.3.1',
      topicId: '10.3.1',
      coveredTopicIds: ['10.3.2', '10.3.3', '10.3.4', '10.3.5', '10.3.6', '10.3.7'],
      title: 'In-memory storage and the five core Redis data structures',
      problemAndRequirementsMarkdown: [
        '### First principles: Why storing everything inside one JSON string wastes memory and creates race conditions',
        'Suppose you store a user’s profile or a 1,000-player game leaderboard as one big JSON string in Redis. Every time *one* field (`loginCount`) or *one* player’s score updates, you have to download the whole JSON string, parse it in Node.js, modify 1 field, stringify it, and overwrite it—**clobbering any concurrent update that happened in between!**',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Matching the 5 Redis data structures to real backend problems',
        '1. **Strings (`SET`, `GET`, `INCR`)**: Hold raw text, JSON blobs, or 64-bit integer counters (`INCR views:post_9`). Great for simple cache-aside values, distributed locks, and counters.',
        '2. **Hashes (`HSET`, `HGET`, `HINCRBY`)**: Key-field-value maps inside one Redis key (`user:42 -> { name: "Ada", logins: 5 }`). You can update or increment **one field atomically (`HINCRBY user:42 logins 1`)** without downloading/overwriting the entire object!',
        '3. **Lists (`LPUSH`, `RPOP`, `BLPOP`)**: Doubly-linked ordered lists—ideal for fast bounded activity feeds (`LTRIM` keep latest 50) or simple FIFO work queues.',
        '4. **Sets (`SADD`, `SISMEMBER`, `SINTER`)**: Unordered collections of **unique** strings—great for tags, online user IDs, or checking common followers (`SINTER`).',
        '5. **Sorted Sets (`ZADD`, `ZRANGE`, `ZREMRANGEBYSCORE`)**: Sets where every member has a numeric **score**, kept continuously sorted! Essential for **real-time leaderboards** (`ZREVRANGE`), **priority/delayed job schedules** (score = timestamp!), and **sliding-window rate limiters** (`10.5`).',
      ].join('\n\n'),
      centralIdeaSummary:
        'Redis stores native Strings, Hashes, Lists, Sets, and Sorted Sets in memory so backends update fields, unique memberships, and ranked scores directly without JSON read-modify-write races.',
      codeExamples: [],
    },
    {
      id: 'topic-10.3.8',
      topicId: '10.3.8',
      coveredTopicIds: ['10.3.9', '10.3.12', '10.3.13'],
      title: 'Expiration, atomic operations, Redis transactions, and Lua scripting',
      problemAndRequirementsMarkdown: [
        '### First principles: Executing multi-step Redis logic without race conditions',
        'Suppose you want to: *(1) Check if rate-limit counter < 100, (2) Increment it, and (3) Set a 60-second TTL if it’s new*. If Node.js runs those as 3 separate network commands, two concurrent requests both see `99`—and if Node crashes right after `INCR` before `EXPIRE`, that key leaks in RAM **forever**!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### How Redis guarantees atomicity cleanly',
        '1. **Expiration (`EX`, `PX`, `TTL`)**: Always attach expiration **atomically in the same command** when possible (`SET key val EX 300 NX`).',
        '2. **Atomic Operations**: Redis executes commands on a **single main command thread**—so every individual command (`INCR`, `SET ... NX`, `ZADD`) runs completely atomically with zero interleaved writes from other clients!',
        '3. **Redis Transactions (`MULTI` / `EXEC` + `WATCH`)**: Bundles multiple Redis commands so they execute sequentially without interruption. **Crucial caveat**: Unlike PostgreSQL transactions, **`MULTI/EXEC` does NOT roll back** if a later command errors, and you cannot run an `if (val > 10)` branch *inside* `MULTI/EXEC` based on an intermediate read!',
        '4. **Lua Scripting (`EVAL` / `EVALSHA`)**: When you need **atomic read-check-modify logic** (*“Check current count; ONLY increment and set TTL if under limit”*), send a tiny **Lua script** to Redis! Redis runs the entire Lua script atomically as one uninterruptible operation in **one single network round-trip**—zero race conditions, zero leaked TTLs!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Single Redis commands run atomically; use `MULTI/EXEC` to batch independent writes and Lua scripts whenever multi-step logic needs conditional read-then-write atomicity.',
      codeExamples: [],
    },
    {
      id: 'topic-10.3.10',
      topicId: '10.3.10',
      coveredTopicIds: ['10.3.11'],
      title: 'Persistence (RDB & AOF) and Eviction Policies',
      problemAndRequirementsMarkdown: [
        '### First principles: What happens when Redis hits its RAM limit—or restarts?',
        'RAM is finite and volatile! Two critical questions hit every production Redis deployment:',
        '1. You gave Redis 2 GB of RAM (`maxmemory 2gb`), and 2 GB fills up. Should Redis crash your writes with OOM errors, or quietly throw away old keys?',
        '2. The cloud host reboots Redis at 3 AM. Should all data vanish, or reload from disk?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Configuring persistence and eviction deliberately by workload',
        '1. **Persistence**:',
        '   - **RDB (Point-in-Time Snapshots)**: Periodically forks and dumps memory snapshots (e.g., every 5 minutes). Fast restarts, compact files, *may lose the last few minutes of writes on crash*.',
        '   - **AOF (Append-Only File)**: Logs every write command to disk (typically `appendfsync everysec` = at most ~1 second lost). Higher durability, slightly larger disk logs.',
        '   - *(Rule)*: Pure **caches** often run with persistence off/light (Postgres is truth); **queues / session stores** enable AOF + RDB!',
        '2. **Eviction Policies (`maxmemory-policy`)**:',
        '   - **`allkeys-lru` / `volatile-lru` (or LFU)**: When full, evict Least Recently Used (or Least Frequently Used) keys automatically. **Ideal for pure caches!**',
        '   - **`noeviction`**: Reject new writes with an error when RAM is full instead of silently deleting keys! **Mandatory for job queues (BullMQ) and rate/lock stores**—and keep pure caches in a separate Redis instance from queues so cache bloat never evicts active jobs!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Separate cache Redis instances (LRU/LFU eviction, optional persistence) from queue/state Redis instances (`noeviction`, AOF+RDB persistence) so memory pressure never drops critical jobs.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Choosing the exact right Redis tool for the job',
    narrativeMarkdown: [
      'Match each backend problem to its native Redis feature from `10.3`:',
      '- **Leaderboard / Sliding Window**: **Sorted Set** (`ZADD`, `ZREVRANGE`, `ZREMRANGEBYSCORE`).',
      '- **Partial Object Update**: **Hash** (`HSET`, `HINCRBY`).',
      '- **Atomic Conditional Check + Mutate**: **Lua Script** (`EVAL`).',
      '- **Cache vs. Queue Ops Config**: Cache → `allkeys-lru`; Queue/Locks → `noeviction` + AOF!',
    ].join('\n\n'),
    integratedExample: {
      id: '10.3-integrated-example',
      title: 'Redis Data Structures & Eviction Policy Cheat Map',
      language: 'text',
      code: `Use Case                Structure     Key Commands              Eviction / Persistence
──────────────────────────────────────────────────────────────────────────────────────────
Cache-aside JSON        String        SET key val EX 300        allkeys-lru  / minimal
User session fields     Hash          HSET, HINCRBY, EXPIRE     volatile-lru / AOF
Unique online tags      Set           SADD, SISMEMBER, SINTER   allkeys-lru  / optional
Leaderboard / Timers    Sorted Set    ZADD, ZREVRANGE, ZSCORE   noeviction   / AOF + RDB
Conditional Rate Limit  Lua Script    EVAL (atomic check+set)   noeviction   / optional`,
    },
    walkthroughMarkdown:
      'Switch to the **Recipe** tab next to build real TypeScript + `ioredis` implementations using Hashes, Sorted Sets, `MULTI` pipelines, and atomic Lua scripts.',
  },
  questions: [
    {
      id: '10.3-kc-1',
      focusArea: 'Redis Data Structures & Atomicity',
      prompt:
        'When building a real-time gaming leaderboard and tracking per-user login counters, why are Redis **Sorted Sets** and **Hashes** strictly better than storing one giant `JSON.stringify` **String**?',
      hints: [
        'What happens if two servers read, parse, modify, and overwrite the same JSON leaderboard string simultaneously?',
        'How do `ZADD`/`ZREVRANGE` and `HINCRBY` avoid race conditions and save bandwidth?',
        'JSON Strings force slow read-modify-write cycles that clobber concurrent updates; Sorted Sets keep scores ranked natively with O(log N) updates (`ZADD`), and Hashes mutate single fields atomically (`HINCRBY`).',
      ],
      explanation:
        'Storing lists or objects as one JSON **String** forces read-parse-modify-write round-trips that waste bandwidth and overwrite concurrent updates. **Sorted Sets** maintain continuously ordered scores natively (`ZADD`, `ZREVRANGE`) in O(log N), while **Hashes** let you increment or update single fields (`HINCRBY`, `HSET`) atomically in one command.',
      evaluationCriteria: [
        'Identifies read-modify-write race condition and bandwidth waste of JSON strings',
        'Matches Sorted Sets to ranked scores and Hashes to atomic field updates',
      ],
      topicIds: ['10.3.1', '10.3.2', '10.3.3', '10.3.4', '10.3.5', '10.3.6', '10.3.7', '10.3.8', '10.3.9'],
    },
    {
      id: '10.3-kc-2',
      focusArea: 'Lua vs Transactions & Eviction Policies',
      prompt:
        'Why can’t a Redis **`MULTI`/`EXEC` transaction** implement *“Increment counter ONLY if current value < 10”* safely—how does a **Lua script** solve this—and why must a queue Redis instance NEVER use **`allkeys-lru`** eviction?',
      hints: [
        'Inside `MULTI ... EXEC`, when do the queued commands actually return values?',
        'What does `allkeys-lru` do when Redis runs out of `maxmemory`?',
        '`MULTI/EXEC` batches writes blindly without reading intermediate results or rolling back, whereas Lua executes conditional read-check-write atomically on Redis’s single thread. `allkeys-lru` silently deletes queue/job keys under memory pressure—queues need `noeviction` + AOF persistence.',
      ],
      explanation:
        'Commands inside `MULTI/EXEC` are queued and executed together at `EXEC`, so your application cannot inspect a `GET` result mid-transaction to branch conditionally (nor does Redis roll back failed writes). A **Lua script** runs inside Redis’s single thread atomically in one round-trip, enabling safe conditional check-and-mutate logic. Meanwhile, **`allkeys-lru`** silently evicts old keys when full—great for pure caches, fatal for BullMQ job queues, which require **`noeviction`** plus **AOF/RDB persistence**.',
      evaluationCriteria: [
        'Explains why MULTI/EXEC cannot branch on intermediate reads (vs atomic Lua scripts)',
        'Contrasts LRU cache eviction vs noeviction + persistence for queues/critical state',
      ],
      topicIds: ['10.3.10', '10.3.11', '10.3.12', '10.3.13'],
    },
  ],
};

export const LESSON_10_3_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Implement production Redis patterns with **`ioredis`**: **Hashes** for session/user fields, **Sets** for unique tags, **Sorted Sets** for real-time leaderboards, **`MULTI` atomic pipelines**, and **Lua scripts** for race-free conditional operations.',
  whenToUseMarkdown:
    'Use these building blocks for counters, leaderboards, session state, unique membership checks, and atomic multi-step Redis mutations.',
  setupCommands: [
    {
      id: '10.3-setup-1',
      label: 'Install ioredis',
      command: 'npm install ioredis',
      notes: 'Keep separate Redis logical instances/configs for Evictable Cache (`allkeys-lru`) vs Durable Queues (`noeviction` + AOF).',
    },
  ],
  coreApisMarkdown: [
    '- **`redis.hset` / `redis.hincrby` / `redis.hgetall`**: Mutates individual object fields atomically (`10.3.4`, `10.3.9`).',
    '- **`redis.sadd` / `redis.sismember` / `redis.scard`**: Tracks unique elements (`10.3.6`).',
    '- **`redis.zadd` / `redis.zrevrange(..., "WITHSCORES")`**: Maintains O(log N) ranked leaderboards (`10.3.7`).',
    '- **`redis.multi()...exec()`**: Batches independent commands atomically (`10.3.12`).',
    '- **`redis.defineCommand` / `redis.eval`**: Executes conditional read-check-write **Lua scripts** atomically (`10.3.13`).',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Use Hashes, Sets, and Sorted Sets instead of serializing monolithic JSON strings',
      detailMarkdown:
        'Increment user stats (`10.3.4`), track unique active tags (`10.3.6`), and maintain ranked leaderboards (`10.3.7`) with automatic key expiration (`10.3.8`).',
      code: {
        id: '10.3-step-1',
        title: 'src/cache/redisStructures.ts — Strings, Hashes, Sets & Sorted Sets',
        language: 'typescript',
        code: `import Redis from "ioredis";
const redis = new Redis(process.env.REDIS_URL!);

// Hash (10.3.4) + TTL (10.3.8): atomic partial updates
export async function recordSessionHit(sessionId: string) {
  await redis.multi()
    .hset(\`sess:\${sessionId}\`, { lastSeen: Date.now().toString() })
    .hincrby(\`sess:\${sessionId}\`, "hits", 1)
    .expire(\`sess:\${sessionId}\`, 3600)
    .exec();
}

// Set (10.3.6): deduplicated daily active users
export async function markDailyActive(dayKey: string, userId: string): Promise<number> {
  await redis.sadd(\`dau:\${dayKey}\`, userId);
  return redis.scard(\`dau:\${dayKey}\`);
}

// Sorted Set (10.3.7): real-time top 10 leaderboard
export async function addScoreAndTop10(playerId: string, delta: number) {
  await redis.zincrby("leaderboard:season1", delta, playerId);
  return redis.zrevrange("leaderboard:season1", 0, 9, "WITHSCORES");
}`,
      },
    },
    {
      stepNumber: 2,
      title: 'Run conditional read-check-write logic atomically using a Lua Script',
      detailMarkdown:
        'Unlike `MULTI/EXEC`, **Lua scripts** (`10.3.13`) evaluate `if current < limit` inside Redis itself so two concurrent callers can never exceed the cap or leave a key without a TTL.',
      code: {
        id: '10.3-step-2',
        title: 'Atomic Lua script for bounded seat/quota reservation',
        language: 'typescript',
        code: `// Reserve 1 unit only if current usage < maxCapacity, setting TTL on first creation
const RESERVE_LUA = \`
  local current = tonumber(redis.call("GET", KEYS[1]) or "0")
  local limit = tonumber(ARGV[1])
  if current >= limit then
    return 0
  end
  local nextVal = redis.call("INCR", KEYS[1])
  if nextVal == 1 then
    redis.call("EXPIRE", KEYS[1], tonumber(ARGV[2]))
  end
  return nextVal
\`;

export async function tryReserveSlot(key: string, limit: number, ttlSec: number): Promise<boolean> {
  const result = await redis.eval(RESERVE_LUA, 1, key, limit, ttlSec);
  return Number(result) > 0;
}`,
      },
    },
    {
      stepNumber: 3,
      title: 'Verify Redis memory, persistence (RDB/AOF), and eviction configuration',
      detailMarkdown:
        'For pure cache nodes (`10.3.10`, `10.3.11`), configure `maxmemory` + `maxmemory-policy allkeys-lru`. For durable queues/locks, configure `maxmemory-policy noeviction` + `appendonly yes` (`AOF`).',
    },
  ],
  workingExamples: [
    {
      id: '10.3-ex-list',
      title: 'Bounded recent-activity feed with List (LTRIM cap) (10.3.5)',
      language: 'typescript',
      code: `export async function pushRecentEvent(userId: string, eventJson: string) {
  const key = \`feed:\${userId}\`;
  await redis.multi()
    .lpush(key, eventJson)
    .ltrim(key, 0, 49) // Cap list strictly at latest 50 items so RAM stays bounded!
    .expire(key, 86_400)
    .exec();
}`,
      explanation:
        'Combining `LPUSH` + `LTRIM` + `EXPIRE` inside `MULTI` maintains a fast capped timeline per user with bounded RAM.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Running `KEYS *` in production Redis.',
      fix: '`KEYS *` blocks Redis’s single thread scanning every key in RAM and stalls all traffic! Always use cursor-based `SCAN` if iterating keys.',
    },
    {
      mistake: 'Running `await redis.incr(k)` followed by `await redis.expire(k, 60)` as two separate client calls.',
      fix: 'If the Node process crashes between `incr` and `expire`, `k` lives forever without TTL! Bundle them inside a Lua script (or `SET ... EX`).',
    },
    {
      mistake: 'Using one shared Redis instance with `allkeys-lru` for both HTTP page caching and BullMQ queues.',
      fix: 'Separate cache Redis (`allkeys-lru`) from queue/lock Redis (`noeviction` + AOF) so cache growth never evicts jobs or locks.',
    },
  ],
  exercise: {
    id: '10.3-ex',
    title: 'Implement Leaderboard, Bounded Feed & Atomic Lua Quota Helper',
    instructionsMarkdown:
      'Write a TypeScript Redis module using `ioredis` that:\n1. Tracks user profile/session fields with a **Hash** (`HINCRBY` + `EXPIRE`).\n2. Maintains a top-10 **Sorted Set** leaderboard.\n3. Implements an **atomic Lua script** (`tryReserveSlot`) that increments a counter only when `< maxLimit` and sets a TTL atomically on creation.',
    acceptanceChecklist: [
      'Uses Hash atomic field updates rather than overwriting full JSON strings',
      'Uses Sorted Set (`ZINCRBY` / `ZREVRANGE`) for O(log N) ranking',
      'Uses a Lua script (`EVAL`) for race-free conditional check + increment + TTL',
      'Documents `allkeys-lru` (cache) vs `noeviction` + AOF (queues/locks)',
    ],
  },
};
