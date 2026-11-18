import { FptLessonContent, RecipeLessonContent } from '../types';

export const LESSON_9_4: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Now that your API writes orders to PostgreSQL AND pushes `"Send Order Receipt + Charge Warehouse"` events to Redis/RabbitMQ/Kafka, a subtle nightmare appears. Look at those two separate systems: **Postgres** and **Redis/Kafka**. There is **no magic single transaction** spanning both of them at once!',
      'What happens if Postgres commits the order, and 1 millisecond later the network blinks before Redis gets the message? Your customer paid—and the warehouse **never hears about it!** In this unit, we’ll solve **Transactional Messaging** from first principles: the **dual-write problem**, **DB transaction vs. message publishing**, **Transactional Outbox**, the **Inbox pattern**, **delivery guarantees**, and **eventual consistency**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'The dual-write problem is one of the sneakiest data-corruption bugs in distributed backends. Solving it with Outbox + Inbox turns fragile multi-system writes into rock-solid consistency.',
    prerequisites: [
      {
        subBlockId: '5.1',
        label: 'ACID & Database Transactions (5.1)',
        detail: 'Knowing that Postgres guarantees all-or-nothing atomicity inside a single DB transaction.',
      },
      {
        subBlockId: '9.3',
        label: 'At-least-once delivery & Idempotency (9.3)',
        detail: 'Understanding duplicate message deliveries and idempotent consumers.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-9.4.1',
      topicId: '9.4.1',
      coveredTopicIds: ['9.4.2'],
      title: 'The Dual-Write Problem: Database transactions vs. message publishing',
      problemAndRequirementsMarkdown: [
        '### First principles: Why BOTH orders of writing to two systems can fail',
        'Suppose `placeOrder()` must do two things: (A) `INSERT INTO orders ...` in Postgres, and (B) `queue.publish("order.created")` in Redis/Kafka. Try both orderings—watch how *both* break!',
        '',
        '- **Ordering 1 (Publish AFTER Commit)**:\n  `await db.commit();` → *process crashes or network times out!* → `await queue.publish(...)` never runs! Result: **Phantom DB row with missing event**—the warehouse never ships the paid order!',
        '- **Ordering 2 (Publish INSIDE Transaction before Commit)**:\n  `await db.insert(...);` → `await queue.publish(...);` → `await db.commit();` fails with a unique constraint or deadlock! Result: **Ghost event published for an order that rolled back and doesn’t exist!** Plus, holding a slow network call open *inside* a DB transaction holds locks across the database.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Deriving the requirement',
        'Any time your code tries to update **two independent stores** (Database + Message Broker) without cross-system atomicity, you hit the **Dual-Write Problem**. What we need is a way to make *"save order"* and *"schedule event"* happen inside **ONE single ACID PostgreSQL transaction**!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Writing separately to a database and a message broker creates the Dual-Write Problem where partial failures leave phantom rows or ghost events regardless of write order.',
      codeExamples: [],
    },
    {
      id: 'topic-9.4.3',
      topicId: '9.4.3',
      coveredTopicIds: ['9.4.4'],
      title: 'The Transactional Outbox and Inbox patterns',
      problemAndRequirementsMarkdown: [
        '### First principles: How do we publish an event inside a single Postgres transaction?',
        'Wait—Postgres *already* gives us all-or-nothing atomicity across **any tables inside the same database**! What if instead of calling Redis/Kafka directly inside `placeOrder()`, we write the outgoing event into a **`outbox_events` table inside the exact same Postgres transaction** as the `orders` row?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Outbox (Producer safety) + Inbox (Consumer deduplication)',
        '1. **Transactional Outbox Pattern**:',
        '   - Inside `BEGIN ... COMMIT`, insert into `orders` **AND** `INSERT INTO outbox_events (id, event_type, payload, published_at)` in the same Postgres transaction. If `orders` rolls back, `outbox_events` rolls back too—zero ghost events! Once committed, the event is **guaranteed on disk**—zero lost events!',
        '   - A lightweight background **Outbox Relay / Poller** (or CDC like Debezium) continuously reads unpublished rows (`WHERE published_at IS NULL ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED`), publishes them to Redis/Kafka, and stamps `published_at = NOW()`.',
        '2. **Inbox Pattern (Consumer side)**: Wait—what if the Outbox Relay publishes event `evt_99` to Kafka and crashes right *before* marking `published_at = NOW()`? On restart, it publishes `evt_99` a second time! On the receiving side, the consumer runs a single local transaction:',
        '   - `INSERT INTO inbox_processed_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING` (`RETURNING` / rowCount check).',
        '   - If `rowCount === 0` → duplicate event, skip safely! If `1` → update consumer tables and commit atomically.',
      ].join('\n\n'),
      centralIdeaSummary:
        'The Transactional Outbox writes domain state and events atomically in one DB transaction for guaranteed publishing, while the Inbox pattern records consumed event IDs atomically to deduplicate at-least-once deliveries.',
      codeExamples: [
        {
          snippet: {
            id: '9.4-outbox-sql',
            title: 'Atomic Order + Outbox write in one PostgreSQL transaction',
            language: 'sql',
            code: `BEGIN;

INSERT INTO orders (id, customer_id, total_cents)
VALUES ('ord_101', 'cust_5', 4500);

-- Written in the EXACT SAME ACID transaction -> impossible to lose or emit on rollback!
INSERT INTO outbox_events (id, aggregate_id, event_type, payload)
VALUES (
  'evt_900',
  'ord_101',
  'order.created',
  '{"orderId":"ord_101","totalCents":4500}'::jsonb
);

COMMIT;`,
          },
          lineByLineMarkdown:
            '- If `INSERT INTO orders` fails, `outbox_events` rolls back automatically.\n- Once `COMMIT` succeeds, `evt_900` is durable even if Redis/Kafka is offline for 10 minutes—the Outbox Relay simply delivers it once the broker returns.',
        },
      ],
    },
    {
      id: 'topic-9.4.5',
      topicId: '9.4.5',
      coveredTopicIds: ['9.4.6'],
      title: 'Delivery guarantees and Eventual Consistency',
      problemAndRequirementsMarkdown: [
        '### First principles: Can distributed messaging ever give magic "Exactly-Once" delivery over an unreliable network?',
        'Think carefully: if Consumer B runs a message and sends back `"ACK"` over TCP, and that `"ACK"` packet drops on the wire, Producer/Broker A *cannot tell* whether Consumer B crashed before running or succeeded and lost the ACK packet!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Understanding delivery semantics & time lag realistically',
        '1. **Delivery Guarantees**:',
        '   - **At-most-once**: Fire-and-forget (send without retrying). Fast, *loses messages* on failure.',
        '   - **At-least-once** *(Industry standard)*: Retry until ACKed. *Never loses messages*, *can deliver duplicates*—which **Outbox** ensures on the send side and **Inbox / Idempotency** turns into **effectively-once processing** on the receive side!',
        '   - *(Why pure “Exactly-once delivery” over a network doesn’t magically exist without idempotent receivers: you pair At-Least-Once transport + Idempotent/Inbox consumption!)*',
        '2. **Eventual Consistency**: Because `orders` commits first and the Outbox Relay + Worker process milliseconds (or seconds on outage) later, downstream read models or email states don’t update at the *exact* same instant as `orders`—they **converge to consistent state shortly after** (**eventual consistency**). Design UIs/APIs cleanly around that tiny propagation window!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Combine At-Least-Once Outbox delivery with an Idempotent/Inbox consumer for effectively-once processing, embracing short-lived Eventual Consistency across decoupled stages.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Closing the consistency loop: Outbox -> Broker -> Inbox',
    narrativeMarkdown: [
      'Trace how `9.4` eliminates every dual-write failure mode end-to-end:',
      '1. **Database Write + Outbox**: Order and `outbox_events` commit atomically in Postgres (`9.4.3`).',
      '2. **Relay -> At-Least-Once Delivery**: Outbox worker forwards unpublished events to the queue/broker (`9.4.5`).',
      '3. **Inbox Consumer -> Effectively-Once**: Consumer atomically inserts `event_id` into `inbox_events` alongside its business update (`9.4.4`), bringing the whole system to **eventual consistency** (`9.4.6`) without losing or duplicating outcomes.',
    ].join('\n\n'),
    integratedExample: {
      id: '9.4-integrated-example',
      title: 'End-to-End Transactional Outbox & Inbox Pipeline',
      language: 'text',
      code: `[Orders DB Transaction]
   INSERT orders + INSERT outbox_events ──(1 ACID Commit!)──▶ Guaranteed durable!
                                                                 │
   [Outbox Relay Poller] (SELECT ... FOR UPDATE SKIP LOCKED) ◀───┘
         │  (At-least-once publish; may retry if crash pre-mark)
         ▼
   [Message Broker / Queue]
         │
         ▼
[Consumer DB Transaction]
   INSERT INTO inbox_events (event_id) ON CONFLICT DO NOTHING
     ├── Inserted (new)   -> Update analytics/fulfillment & COMMIT!
     └── Conflict (dup)   -> Safe no-op -> Eventual Consistency achieved cleanly!`,
    },
    walkthroughMarkdown:
      'Notice there is never a moment where an HTTP request performs an unguarded dual write across two separate infrastructure systems.',
  },
  questions: [
    {
      id: '9.4-kc-1',
      focusArea: 'Dual-Write Problem & Outbox Pattern',
      prompt:
        'Why does calling `await db.insertOrder()` followed immediately by `await broker.publish()` suffer from the **dual-write problem** (and why doesn’t moving `broker.publish()` *before* `db.commit()` fix it)—and how does the **Transactional Outbox** solve both?',
      hints: [
        'Test both cases: what fails if the server crashes *between* DB commit and `broker.publish()`, vs. if `db.commit()` fails *after* `broker.publish()`?',
        'How can you make saving the order and recording the event share ONE atomic commit?',
        'Publish-after-commit loses events on crash; publish-before-commit emits ghost events if DB rolls back. Transactional Outbox writes the event row into Postgres in the SAME ACID transaction as the order, and a relay publishes asynchronously.',
      ],
      explanation:
        'Because Postgres and a message broker cannot share one transaction, publishing after commit risks lost events if the process/network fails between them, while publishing before commit emits ghost events if the DB transaction rolls back (and holds DB locks across network I/O). The **Transactional Outbox** inserts into both domain and `outbox_events` tables in **one ACID Postgres transaction**, letting an asynchronous relay publish reliably afterward.',
      evaluationCriteria: [
        'Explains failure modes of both publish-after-commit and publish-before-commit',
        'Explains atomic same-DB commit of domain row + outbox_events row plus relay',
      ],
      topicIds: ['9.4.1', '9.4.2', '9.4.3'],
    },
    {
      id: '9.4-kc-2',
      focusArea: 'Inbox Pattern, Delivery Guarantees & Eventual Consistency',
      prompt:
        'If the **Transactional Outbox** guarantees we never *lose* an event, why do we also pair it with the **Inbox pattern**—and how do **at-least-once delivery** and **eventual consistency** work together here?',
      hints: [
        'What happens if the Outbox Relay publishes `evt_99` to RabbitMQ/Kafka, then crashes *before* updating `published_at = NOW()` in Postgres?',
        'How does a consumer deduplicate `evt_99` atomically inside its own database transaction?',
        'Crashing pre-mark causes duplicate at-least-once delivery; the Inbox pattern atomically records `event_id` in the consumer DB inside the same transaction as the state update (effectively-once), converging via eventual consistency.',
      ],
      explanation:
        'Because the Outbox Relay provides **at-least-once delivery**, a crash between broker ACK and updating `published_at` causes the relay to re-publish the same event. The **Inbox pattern** guards the consumer by inserting `event_id` (unique key) inside the *same* DB transaction as the consumer’s business write—turning duplicates into safe no-ops—while the relay delay introduces bounded **eventual consistency**.',
      evaluationCriteria: [
        'Explains duplicate relay delivery risk and Inbox atomic deduplication',
        'Connects at-least-once transport + Inbox idempotency + eventual consistency',
      ],
      topicIds: ['9.4.4', '9.4.5', '9.4.6'],
    },
  ],
};

export const LESSON_9_5_FPT: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Sooner or later your backend needs user avatars, PDF invoices, or 500 MB video uploads. Beginners save files straight onto the API server’s local folder (`./uploads/avatar.png`) or buffer the whole upload into Node.js RAM before shipping it forward. Within weeks, deploying a second container breaks half your image links (User A uploaded to Server 1; User B gets routed to Server 2!), a container restart wipes `./uploads/`, and 10 users uploading 200 MB videos simultaneously OOM-crash Node.js!',
      'In this unit, we’ll build **File Storage and Processing** from first principles: **local server storage limits**, **object storage & S3 architecture**, **multipart, streaming & resumable uploads**, **pre-signed URLs**, **file validation & security**, and **background media processing**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Putting file bytes directly through your API server destroys horizontal scalability and wastes bandwidth. Offloading uploads straight to Object Storage via Pre-Signed URLs and processing thumbnails asynchronously keeps your API fast and stateless.',
    prerequisites: [
      {
        subBlockId: '9.1',
        label: 'Async task delegation (9.1, 9.2)',
        detail: 'Offloading heavy image/video transformations to background workers.',
      },
      {
        subBlockId: '6.4',
        label: 'Path traversal & input validation (6.4)',
        detail: 'Treating uploaded filenames, MIME types, and file bytes as untrusted.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-9.5.1',
      topicId: '9.5.1',
      coveredTopicIds: ['9.5.2', '9.5.3'],
      title: 'Why local server storage fails — Object Storage and S3 architecture',
      problemAndRequirementsMarkdown: [
        '### First principles: Your API containers are ephemeral and replicated',
        'Why does `fs.writeFileSync("./uploads/pic.png", buf)` break in production?',
        '1. **Horizontal scaling breaks file reads**: Load Balancer sends `POST /upload` to Container A (`./uploads` on A’s disk), then sends `GET /pic.png` to Container B → `404 Not Found`!',
        '2. **Ephemeral containers**: Every CI deploy replaces the container and wipes its local filesystem (`8.4`).',
        '3. **PostgreSQL `BYTEA` anti-pattern**: Storing gigabytes of binary video inside Postgres bloats backups, slows `VACUUM`, and wastes expensive database SSD IOPS.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Object Storage & S3 Architecture',
        'Instead of local disks or database blobs, store binary files in **Object Storage** (AWS S3, Cloudflare R2, Google Cloud Storage, MinIO):',
        '- **Buckets & Object Keys**: Files live as immutable **Objects** (`key: "tenants/org_4/uploads/uuid.png"` — a flat key namespace, even if `/` looks like folders!) inside a **Bucket**, stored redundantly across multiple physical disks/availability zones.',
        '- **Separation of Metadata & Bytes**: Store lightweight **metadata** (`file_id, object_key, size_bytes, mime_type, owner_id`) in PostgreSQL, and store the heavy **bytes** in Object Storage (served directly or via CDN!). Your API containers remain 100% stateless.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Keep API servers stateless by storing binary bytes in durable Object Storage (S3/R2/GCS) and storing only keys, ownership, and metadata in PostgreSQL.',
      codeExamples: [],
    },
    {
      id: 'topic-9.5.4',
      topicId: '9.5.4',
      coveredTopicIds: ['9.5.5', '9.5.6', '9.5.9'],
      title: 'Pre-signed URLs, streaming uploads, multipart uploads, and resumable uploads',
      problemAndRequirementsMarkdown: [
        '### First principles: Why proxy 500 MB uploads through your Express API if S3 can receive them directly?',
        'Suppose 50 users upload 200 MB videos at once. Even if you forward them to S3, passing all 10 GB *through* your Node.js server pins 50 HTTP connections, burns double network egress, and—if buffered via `multer.memoryStorage()`—exhausts Node’s heap and crashes!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Four patterns for transferring file bytes cleanly',
        '1. **Pre-Signed URLs** *(Direct Client ↔ Object Storage)*: Client asks `POST /uploads/init` (`{ filename, size, contentType }`). Your API checks auth & quotas (`6.3`, `6.5`), creates a pending DB row, cryptographically signs a **short-lived Pre-Signed `PUT` URL** (valid e.g. 60 seconds, locked to exact `key`, max size, and `Content-Type`), and returns it. The browser/mobile app uploads bytes **directly to S3**—your API never touches a single megabyte of upload traffic!',
        '2. **Streaming Uploads**: Whenever an API *must* inspect or receive upload bytes directly (e.g., proxy to virus scanner or small CSV parser), pipe Node `Readable` streams directly chunk-by-chunk (`stream.pipeline`) rather than buffering whole files into RAM.',
        '3. **Multipart Uploads** *(Large files > ~5–100 MB)*: Splits a 2 GB file into independent 5–10 MB chunks uploaded **in parallel** to S3 (`CreateMultipartUpload` → `UploadPart` 1..N → `CompleteMultipartUpload`), saturating client bandwidth smoothly.',
        '4. **Resumable Uploads**: Built naturally on **Multipart** (or protocols like **tus**): if Wi-Fi drops at chunk 42 of 100, the client queries uploaded parts and resumes at chunk 43 instead of restarting 2 GB from byte zero!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Use short-lived Pre-Signed URLs so clients upload directly to Object Storage without touching API RAM/bandwidth, pairing streaming or multipart/resumable chunks for large files.',
      codeExamples: [],
    },
    {
      id: 'topic-9.5.7',
      topicId: '9.5.7',
      coveredTopicIds: ['9.5.8'],
      title: 'File validation, security, and background media processing',
      problemAndRequirementsMarkdown: [
        '### First principles: Never trust `.jpg` in a filename—and never resize 4K images inline!',
        '1. An attacker renames `malware.html` or an executable script to `avatar.jpg` and sets `Content-Type: image/jpeg`—or uploads a 10 GB decompression zip-bomb / SVG containing `<script>` XSS!',
        '2. Meanwhile, generating 3 thumbnails or transcoding an `.mp4` takes seconds of heavy CPU—blocking HTTP (`9.1`) or blocking Node’s single event loop!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Securing uploads and processing media asynchronously',
        '1. **File Validation & Security**:',
        '   - Enforce strict **allow-listed file types** and **byte-size limits** inside signed upload policies and server checks.',
        '   - **Inspect magic bytes** (actual file header bytes like `FF D8 FF` for JPEG, `89 50 4E 47` for PNG—never trust the `.ext` filename or `Content-Type` header alone!).',
        '   - Generate **random UUID object keys** (blocking path traversal `../../` `6.4`), strip EXIF GPS metadata from user photos, serve user uploads from a **separate sandbox domain** with `Content-Disposition: attachment` / `X-Content-Type-Options: nosniff` (preventing stored XSS from uploaded HTML/SVGs!).',
        '2. **Background Media Processing**: Once upload completes (via client callback + S3 verification or S3 Event Notification → Queue), enqueue a background worker (`9.2`) to validate magic bytes, strip metadata, run malware scans, and generate WebP thumbnails / HLS video variants safely off the API server.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Validate actual magic bytes and sizes, randomize keys and isolate serving domains against XSS, and offload heavy image/video transformations to asynchronous background workers.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Complete direct-to-S3 upload & background processing workflow',
    narrativeMarkdown: [
      'Trace how all nine pieces of `9.5` flow seamlessly:',
      '1. Client requests upload slot → API verifies permissions, creates pending Postgres metadata row (`uuid` key), and issues a **60s Pre-Signed `PUT` URL** (or **Multipart** URLs for large/resumable files).',
      '2. Client uploads bytes **directly to S3 Object Storage** (zero load on API containers!).',
      '3. Client calls `POST /uploads/:id/complete` (or S3 event fires) → API enqueues **background media worker**.',
      '4. Worker **streams** bytes, checks **magic bytes**, strips EXIF / generates thumbnails, marks DB status `"ready"`.',
    ].join('\n\n'),
    integratedExample: {
      id: '9.5-integrated-example',
      title: 'Direct Pre-Signed Upload + Async Validation & Media Worker',
      language: 'text',
      code: `[Client] ──1. POST /uploads/init──▶ [API Server] ──▶ Postgres (status: "pending", key: uuid)
         ◀──2. { preSignedUrl } ──

[Client] ──3. PUT bytes directly──▶ [S3 Object Storage] (Multipart/Resumable for big files!)

[Client / S3 Event] ──4. Complete──▶ [API] ──enqueue──▶ [Media Worker]
                                                           • Stream & verify magic bytes
                                                           • Strip EXIF & create thumbnails
                                                           • Update Postgres status: "ready"`,
    },
    walkthroughMarkdown:
      'Switch to the **Recipe** tab to implement pre-signed S3 upload URLs, multipart initiation, magic-byte validation, and async thumbnail processing.',
  },
  questions: [
    {
      id: '9.5-kc-1',
      focusArea: 'Object Storage & Pre-Signed URLs',
      prompt:
        'Why do **Pre-Signed URLs** to **Object Storage (S3)** outperform uploading files to Express (`multer`) and saving them on `./uploads/`—and when do you add **Multipart / Resumable uploads**?',
      hints: [
        'Compare what breaks when running 4 containers (`./uploads`), what happens to Node’s network/RAM when proxying 500 MB uploads, and what happens on mobile Wi-Fi drops at 85%.',
        'Who receives the file bytes when using a Pre-Signed URL?',
        'Local disk breaks horizontal scaling and deploy durability; Pre-Signed URLs let clients upload bytes directly to durable S3 (zero API bandwidth/RAM), while Multipart/Resumable uploads split large files into parallel retryable chunks.',
      ],
      explanation:
        'Saving uploads to local `./uploads/` fails under horizontal scaling (other containers lack the file) and ephemeral container deploys. **Pre-Signed URLs** let your API authorize upload permissions cleanly in milliseconds while the client sends bytes directly to **Object Storage**, sparing API RAM/bandwidth. For large files or flaky connections, **Multipart & Resumable uploads** split payloads into parallel chunks so interrupted uploads resume without restarting from byte zero.',
      evaluationCriteria: [
        'Explains local storage failure (horizontal scaling + ephemeral containers)',
        'Explains direct-to-S3 Pre-Signed URL offload and Multipart/Resumable benefit for large/unstable uploads',
      ],
      topicIds: ['9.5.1', '9.5.2', '9.5.3', '9.5.4', '9.5.5', '9.5.6', '9.5.9'],
    },
    {
      id: '9.5-kc-2',
      focusArea: 'Upload Security & Background Processing',
      prompt:
        'An attacker uploads an HTML/JavaScript XSS payload renamed to `avatar.jpg` with `Content-Type: image/jpeg`. Why didn’t checking `req.file.originalname.endsWith(".jpg")` catch it, and what defenses protect both storage and viewing?',
      hints: [
        'Can a client set any filename and `Content-Type` header they want in `curl`?',
        'What inside the actual file bytes reveals its true format, and how should untrusted uploads be processed and served?',
        'Filenames and headers are attacker-controlled; inspect magic bytes (file signature), generate UUID keys, process/re-encode images in a background worker, and serve from a separate sandbox domain with `nosniff`.',
      ],
      explanation:
        'File extensions and `Content-Type` headers are trivially spoofed by any client. Safe upload pipelines use **UUID object keys** (blocking path traversal), validate **magic bytes** inside the actual binary header, re-encode/strip EXIF metadata inside an **asynchronous background media worker**, and serve files from an isolated origin/CDN domain with `X-Content-Type-Options: nosniff` so disguised HTML/SVG scripts can never execute on your app origin.',
      evaluationCriteria: [
        'Explains why filename extensions and Content-Type headers are untrusted',
        'Names magic-byte verification, UUID keys, async worker re-encoding, and sandboxed serving/nosniff',
      ],
      topicIds: ['9.5.7', '9.5.8'],
    },
  ],
};

export const LESSON_9_5_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Implement secure direct-to-S3 **Pre-Signed URLs**, **Multipart upload initiation**, **streaming magic-byte file validation**, and **background media worker processing** without buffering user uploads on API disk or RAM.',
  whenToUseMarkdown:
    'Use this pattern for user avatars, document uploads, attachments, and video/image pipelines in production.',
  setupCommands: [
    {
      id: '9.5-setup-1',
      label: 'Install AWS S3 SDK, presigner, file-type (magic bytes), and sharp',
      command: 'npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner file-type sharp',
      notes: 'Works with AWS S3, Cloudflare R2, MinIO, or any S3-compatible object storage.',
    },
  ],
  coreApisMarkdown: [
    '- **`PutObjectCommand` + `getSignedUrl(s3, cmd, { expiresIn: 60 })`**: Generates a short-lived direct upload URL locked to a UUID key and `ContentType`.',
    '- **`CreateMultipartUploadCommand` / `UploadPartCommand` / `CompleteMultipartUploadCommand`**: Handles parallel/resumable chunked uploads for large files (`9.5.4`, `9.5.9`).',
    '- **`fileTypeFromBuffer(headChunk)`**: Inspects real binary magic bytes rather than trusting `.ext` (`9.5.7`).',
    '- **`sharp(stream).resize(...)`**: Streams/re-encodes images safely in a background worker, stripping EXIF metadata (`9.5.8`).',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Issue a validated, short-lived Pre-Signed PUT URL (or Multipart session) using UUID keys',
      detailMarkdown:
        'Validate allowed MIME types and declared size upfront (`9.5.7`), store a `"pending"` row in Postgres, and generate a random UUID object key so user filenames never cause path collisions or traversal (`9.5.6`).',
      code: {
        id: '9.5-step-1',
        title: 'src/storage/presign.ts — Pre-Signed PUT + Multipart Upload init',
        language: 'typescript',
        code: `import crypto from "node:crypto";
import { S3Client, PutObjectCommand, CreateMultipartUploadCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: process.env.AWS_REGION! });
const BUCKET = process.env.S3_BUCKET!;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function createAvatarUploadUrl(orgId: string, contentType: string, sizeBytes: number) {
  if (!ALLOWED_TYPES.has(contentType)) throw new Error("Unsupported file type");
  if (sizeBytes <= 0 || sizeBytes > 10 * 1024 * 1024) throw new Error("Max size 10MB");

  // Always server-generated UUID key — never trust req.body.filename!
  const objectKey = \`tenants/\${orgId}/uploads/\${crypto.randomUUID()}\`;
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: objectKey,
    ContentType: contentType,
    ContentLength: sizeBytes,
  });

  const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 });
  return { objectKey, uploadUrl };
}

// For >50MB resumable/multipart uploads (9.5.4, 9.5.9):
export async function initMultipartUpload(orgId: string, contentType: string) {
  const key = \`tenants/\${orgId}/videos/\${crypto.randomUUID()}\`;
  const { UploadId } = await s3.send(
    new CreateMultipartUploadCommand({ Bucket: BUCKET, Key: key, ContentType: contentType })
  );
  return { key, uploadId: UploadId! };
}`,
      },
    },
    {
      stepNumber: 2,
      title: 'Verify magic bytes via streaming/range read and process thumbnails in a Background Worker',
      detailMarkdown:
        'Never run `sharp` inside Express! When upload completes, enqueue a BullMQ worker (`9.2`, `9.3`) that inspects the uploaded object’s **magic bytes** (`9.5.7`), re-encodes safe WebP variants stripping EXIF GPS tags (`9.5.8`), and streams outputs back to S3 (`9.5.5`).',
      code: {
        id: '9.5-step-2',
        title: 'src/jobs/mediaWorker.ts — Magic-byte verification + async Sharp processing',
        language: 'typescript',
        code: `import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";

const s3 = new S3Client({ region: process.env.AWS_REGION! });
const BUCKET = process.env.S3_BUCKET!;

export async function processUploadedImage(objectKey: string) {
  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: objectKey }));
  const stream = obj.Body as NodeJS.ReadableStream;

  // Buffer or inspect header chunks safely (size capped during upload)
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const rawBuffer = Buffer.concat(chunks);

  // Magic-byte validation (ignores spoofed .jpg extension / headers!)
  const detected = await fileTypeFromBuffer(rawBuffer);
  if (!detected || !["image/jpeg", "image/png", "image/webp"].includes(detected.mime)) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: objectKey }));
    throw new Error("Spoofed or unsupported file signature deleted");
  }

  // Re-encode safely (strips EXIF GPS metadata & neutralizes payload quirks)
  const thumbnail = await sharp(rawBuffer).rotate().resize(512, 512, { fit: "inside" }).webp().toBuffer();

  const thumbKey = \`\${objectKey}.thumb.webp\`;
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: thumbKey,
      Body: thumbnail,
      ContentType: "image/webp",
    })
  );
  return { thumbKey };
}`,
      },
    },
    {
      stepNumber: 3,
      title: 'Serve files safely via CDN / Pre-Signed GET from a sandboxed domain',
      detailMarkdown:
        'Serve private files via short-lived `GetObjectCommand` pre-signed URLs (after resource AuthZ check `6.3`) and set `Content-Disposition` / `X-Content-Type-Options: nosniff` on user-uploaded assets.',
    },
  ],
  workingExamples: [
    {
      id: '9.5-ex-stream',
      title: 'Streaming direct upload passthrough without buffering whole file in RAM (9.5.5)',
      language: 'typescript',
      code: `import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";

// When an API MUST stream bytes through, pipe chunks instead of \`Buffer.concat\` on 2GB files
export async function streamToTemp(reqStream: NodeJS.ReadableStream, tempPath: string) {
  await pipeline(reqStream, createWriteStream(tempPath));
}`,
      explanation:
        'Using `stream.pipeline` keeps Node.js memory constant (a few kilobytes of buffer) regardless of file size, and cleans up streams automatically on error.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Using user-supplied `req.body.filename` directly inside S3 object keys (`uploads/${filename}`).',
      fix: 'Always generate server-side UUID keys (`crypto.randomUUID()`) and store the original display filename solely as escaped DB metadata.',
    },
    {
      mistake: 'Checking only `file.mimetype` or `.endsWith(".png")` and skipping magic-byte inspection.',
      fix: 'Inspect actual file header bytes with `fileTypeFromBuffer` / `fileTypeFromStream` and re-encode images in a background worker.',
    },
    {
      mistake: 'Serving user-uploaded SVGs or HTML inline from your main `app.example.com` origin.',
      fix: 'SVGs can contain embedded `<script>` XSS! Reject SVGs for avatars or serve user files from a separate CDN/sandbox origin with `Content-Disposition: attachment` and `nosniff`.',
    },
  ],
  exercise: {
    id: '9.5-ex',
    title: 'Design a Direct Pre-Signed S3 Upload & Async Validation Worker',
    instructionsMarkdown:
      'Implement an upload workflow containing:\n1. `POST /uploads/init` endpoint checking MIME allow-list + size caps, recording a `"pending"` DB row, and returning a 60s Pre-Signed `PUT` URL with a UUID object key.\n2. An async worker function checking real magic bytes via `fileTypeFromBuffer`, deleting invalid/spoofed files, and outputting a stripped WebP thumbnail.\n3. Note how you’d extend to Multipart upload for 1 GB files.',
    acceptanceChecklist: [
      'Uses server-generated UUID S3 keys and short-lived Pre-Signed URLs (no bytes buffered in API RAM)',
      'Validates actual magic bytes rather than filename or Content-Type header',
      'Performs re-encoding/EXIF-stripping asynchronously inside a worker',
      'Explains Multipart chunking + isolated CDN domain / nosniff serving',
    ],
  },
};
