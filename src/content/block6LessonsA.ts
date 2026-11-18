import { FptLessonContent, RecipeLessonContent } from '../types';

export const LESSON_6_1: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Up to now we have focused on making backends **work**—parsing HTTP, storing relational truth, and keeping queries fast. The moment you put a backend onto the public internet, anyone in the world (including automated scanners and attackers) can send arbitrary bytes straight to your ports.',
      'In this unit, we’ll establish the mental framework of **Backend Security** from first principles: **trust boundaries and attack surfaces**, **the CIA triad**, **authentication vs. authorization**, **least privilege and defense in depth**, and **practical threat modeling**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Security isn’t a single middleware you bolt on at the end of a project. Every time you inspect where trust ends, shrink your attack surface, and stack independent safeguards, you prevent breaches before writing a single endpoint.',
    prerequisites: [
      {
        subBlockId: '3.2',
        label: 'Middleware pipeline & validation gates (3.2.6, 3.2.7)',
        detail:
          'Knowing that external requests pass through auth and validation checks before reaching domain logic.',
      },
      {
        subBlockId: '2.2',
        label: 'TLS confidentiality, integrity & authentication (2.2.1)',
        detail:
          'Having already seen confidentiality, integrity, and identity verification in network transport.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-6.1.1',
      topicId: '6.1.1',
      coveredTopicIds: ['6.1.2', '6.1.3'],
      title: 'Trust boundaries, attack surfaces, and the CIA triad',
      problemAndRequirementsMarkdown: [
        '### First principles: Where does “code we control” end and “untrusted input” begin?',
        'Imagine a checkout form in your frontend app: the browser checks `if (price > 0 && isAdmin === false)` and sends JSON to your Node.js API. Did that browser check protect your server? **Not at all!** Anyone can bypass your React UI completely and run `curl -X POST https://api.site.com/orders -d \'{"price": 0, "isAdmin": true}\'`.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Deriving the concepts',
        'That line separating data you control from data outsiders can forge is a **trust boundary**:',
        '- **Trust Boundary**: Any border where data or execution crosses from a less-trusted zone into a more-trusted zone (browser → API server, API server → external webhook, public route → internal database). **Every single trust boundary requires verification!**',
        '- **Attack Surface**: The total sum of every exposed entry point an attacker can poke at—every HTTP route, query parameter, file upload, header, webhook, open port, and third-party dependency. Smaller attack surfaces leave fewer doors to defend.',
        '- **The CIA Triad (what we are protecting)**:',
        '  1. **Confidentiality**: Keeping secrets and private user data hidden from unauthorized readers.',
        '  2. **Integrity**: Ensuring data cannot be tampered with or altered without authorization.',
        '  3. **Availability**: Keeping the service responsive for real users instead of knocked offline by crashes or floods.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Security begins by identifying every trust boundary where untrusted input enters, shrinking the exposed attack surface, and protecting Confidentiality, Integrity, and Availability.',
      codeExamples: [],
    },
    {
      id: 'topic-6.1.4',
      topicId: '6.1.4',
      coveredTopicIds: ['6.1.5', '6.1.6', '6.1.7'],
      title: 'Authentication vs authorization, least privilege, defense in depth, and threat modeling',
      problemAndRequirementsMarkdown: [
        '### First principles: Four core principles that prevent catastrophic single-bug breaches',
        'Notice how two completely different mistakes cause real breaches:',
        '- Mistake A: Checking *who* a user is, then letting that logged-in user delete *someone else’s* invoice because you assumed “logged in = allowed.”',
        '- Mistake B: Giving your Node.js web app database superuser credentials (`DROP DATABASE`), AND relying on one single `if` check inside React—so one bug compromises the entire system!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Four foundational defenses',
        '1. **Authentication vs. Authorization** *(never confuse these two!)*:',
        '   - **Authentication (`AuthN`)** answers: **“Who are you?”** (Verifying identity via password, session cookie, or signed token → returns `401 Unauthorized` when missing/invalid.)',
        '   - **Authorization (`AuthZ`)** answers: **“What are you allowed to do?”** (Checking whether *this* authenticated user may read/edit *that* specific resource → returns `403 Forbidden` when denied.)',
        '2. **Principle of Least Privilege**: Every user, API token, microservice, and database account should have **only the minimum permissions strictly required** for its job. Your web app’s Postgres role only needs `SELECT/INSERT/UPDATE` on app tables—not superuser access to drop databases or read OS files!',
        '3. **Defense in Depth**: Never rely on one single lock. Layer independent safeguards—for example: TLS in transit (`2.2`) + rate limiting at the edge (`6.5`) + authentication + schema validation (`3.4`) + parameterized queries (`6.4`) + database constraints (`4.2`). If one layer has a bug, the next layer stops the blast!',
        '4. **Threat Modeling**: Asking systematically *before* shipping a feature: *“What assets live here? What are the trust boundaries? How could an attacker abuse each input, identity check, or workflow—and which layered controls mitigate it?”*',
      ].join('\n\n'),
      centralIdeaSummary:
        'Separate Authentication (who you are) from Authorization (what you may access), restrict permissions via Least Privilege, stack multiple layers via Defense in Depth, and inspect risks early through Threat Modeling.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Applying security fundamentals to a single API endpoint',
    narrativeMarkdown: [
      'Watch every principle of `6.1` guard `DELETE /invoices/:id`:',
      '- **Trust Boundary**: Treat `:id`, headers, and cookies from the internet as untrusted until verified on the server.',
      '- **Authentication vs. Authorization**: Verify session/token (`401` if unknown), then verify invoice `:id` belongs to that caller’s account (`403` if not).',
      '- **Least Privilege & Defense in Depth**: Parameterized SQL runs under a scoped app DB role + ownership `WHERE user_id = $2` check—protecting **Confidentiality** and **Integrity**, while rate limits guard **Availability**.',
    ].join('\n\n'),
    integratedExample: {
      id: '6.1-integrated-example',
      title: 'Defense in Depth + AuthN/AuthZ + Least Privilege across a trust boundary',
      language: 'text',
      code: `[Untrusted Internet] ──(Trust Boundary!)──▶ [API Server]
  Layer 1 (Availability): Rate limiter blocks abusive flood
  Layer 2 (AuthN):        Verify session/token -> "Who is caller?" (401 if invalid)
  Layer 3 (Validation):   Validate invoice ID format -> shrink attack surface (400 if malformed)
  Layer 4 (AuthZ):        Verify caller owns invoice (403 if someone else's!)
  Layer 5 (Least Priv):   App DB user runs scoped DELETE ... WHERE id = $1 AND user_id = $2`,
    },
    walkthroughMarkdown:
      'Threat modeling this endpoint reveals every failure mode upfront—and stacking layered controls ensures no single oversight hands attackers the whole database.',
  },
  questions: [
    {
      id: '6.1-kc-1',
      focusArea: 'Trust Boundaries & Attack Surface',
      prompt:
        'Why does client-side form validation in React never remove the need for server-side validation and permission checks—and how do **trust boundaries** and **attack surfaces** explain this?',
      hints: [
        'Can an attacker bypass your React frontend and send raw HTTP requests with `curl`?',
        'Where does the trust boundary actually sit in a web app?',
        'The trust boundary sits at your backend server receiving network bytes—any client UI runs outside that boundary and can be bypassed with `curl`, making every exposed endpoint and parameter part of your attack surface.',
      ],
      explanation:
        'Frontend code runs on the user’s own machine outside your **trust boundary**—attackers can bypass your UI completely and craft arbitrary HTTP payloads directly against your endpoints. Every exposed route, header, query parameter, and upload handler is part of your **attack surface** and must enforce validation and authorization on the server.',
      evaluationCriteria: [
        'Places trust boundary at the server boundary rather than client browser code',
        'Links exposed server endpoints/inputs to attack surface',
      ],
      topicIds: ['6.1.1', '6.1.2'],
    },
    {
      id: '6.1-kc-2',
      focusArea: 'AuthN vs AuthZ & CIA Triad',
      prompt:
        'A logged-in customer changes `/orders/105` in the URL to `/orders/106` and successfully reads another customer’s shipping address. Did **Authentication** or **Authorization** fail—and which pillar(s) of the **CIA triad** were violated?',
      hints: [
        'Did the server know who the logged-in user was? Did it check whether they were allowed to view order `106`?',
        'Consider Confidentiality, Integrity, Availability.',
        '**Authorization** failed (the server knew who the user was, but didn’t check resource ownership); reading someone else’s private address violates **Confidentiality**.',
      ],
      explanation:
        '**Authentication** succeeded (the server verified who the caller was), **Authorization** failed (it never verified that the caller had permission to view order `106`). Exposing another user’s private shipping address violates the **Confidentiality** pillar of the CIA triad.',
      evaluationCriteria: [
        'Correctly identifies Authorization failure (not Authentication)',
        'Identifies Confidentiality violation in CIA triad',
      ],
      topicIds: ['6.1.3', '6.1.4'],
    },
    {
      id: '6.1-kc-3',
      focusArea: 'Least Privilege & Defense in Depth',
      prompt:
        'Explain how **Least Privilege** and **Defense in Depth** work together to limit damage if a bug is discovered in an API route.',
      hints: [
        'Compare having only one security check vs multiple independent layers, and giving the API a DB superuser vs a restricted DB role.',
        'What happens if one check fails when both principles are in place?',
        'Defense in depth ensures a second independent safeguard catches what a single buggy check misses, while least privilege restricts the DB/runtime account so even an exploited handler cannot read system files or drop databases.',
      ],
      explanation:
        '**Defense in depth** layers multiple independent protections (TLS, rate limits, auth, input validation, parameterized queries, DB constraints) so a flaw in one layer doesn’t instantly cause a breach. **Least privilege** caps what each component can access (e.g., running the API with a non-superuser DB role and minimal cloud IAM permissions) so even if an attacker slips through, the blast radius stays tightly contained.',
      evaluationCriteria: [
        'Explains layered independent checks (Defense in Depth)',
        'Explains minimizing permissions/blast radius (Least Privilege)',
      ],
      topicIds: ['6.1.5', '6.1.6', '6.1.7'],
    },
  ],
};

export const LESSON_6_2_FPT: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'In Sub-block 6.1, we drew the line between **Authentication** (*“Who are you?”*) and **Authorization** (*“What may you access?”*). Now let’s inspect how Authentication actually works under the hood—because mistakes here leak user passwords or let attackers hijack accounts.',
      'In this unit, we’ll cover every core mechanism progressively: **password storage, hashing vs encryption, salting, and bcrypt/Argon2id**, **session-based cookies (`Secure`, `HttpOnly`, `SameSite`, invalidation)**, **JWTs, access vs refresh tokens, and rotation/revocation**, and **OAuth 2.0 vs OpenID Connect**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Password leaks, stolen cookies, forged or unrevocable JWTs, and broken OAuth logins are among the most common and costly backend vulnerabilities. Understanding the *why* behind each mechanism keeps user identities safe.',
    prerequisites: [
      {
        subBlockId: '6.1',
        label: 'Trust boundaries & Authentication (6.1.1, 6.1.4)',
        detail:
          'Knowing that client-supplied credentials cross an untrusted boundary and verify identity.',
      },
      {
        subBlockId: '2.3',
        label: 'HTTP Statelessness & Headers (2.3.5, 2.3.7)',
        detail:
          'Knowing why every stateless HTTP request must carry proof of identity in headers or cookies.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-6.2.1',
      topicId: '6.2.1',
      coveredTopicIds: ['6.2.2', '6.2.3', '6.2.4', '6.2.5'],
      title: 'Identity representation and safe password storage (Hashing, Salting, bcrypt/Argon2id)',
      problemAndRequirementsMarkdown: [
        '### First principles: Why can’t you store passwords in plaintext—or even *encrypt* them?!',
        'Imagine a database backup leaks (or a SQL bug exposes your `users` table):',
        '1. **Plaintext (`password = "summer2026"`)**: Attackers instantly read every user’s password—and try that same email/password on their bank and Gmail!',
        '2. **Reversible Encryption (`AES(password, key)`)**: Better than plaintext, *yet* your server holds the decryption key to reverse it! If an attacker steals the database + key (say from the same host or env), every single user password can be decrypted back to plaintext.',
        '3. **Fast Hash (`SHA-256("summer2026")`)**: One-way! You *cannot* reverse SHA-256 back to `"summer2026"`. **Wait—two problems still break plain SHA-256!** First, if Alice and Bob both pick `"summer2026"`, they get the *identical hash* (precomputed **rainbow tables** crack billions of common hashes instantly!). Second, GPUs compute billions of fast SHA-256 hashes per second!',
        '',
        '### Deriving the requirement',
        'Password storage needs a **one-way**, **uniquely salted**, **deliberately slow & memory-hard** hash!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Salted, Adaptive Hashing (`Argon2id` / `bcrypt`)',
        'Once a user authenticates, the system identifies them internally via an **identity representation** (like an immutable `userId` and claims), never keeping their raw password around:',
        '- **Hashing vs. Encryption**: Encryption is *two-way* (reversible with a key, meant for reading secrets later). Cryptographic **hashing** is *one-way* (irreversible mathematical fingerprint—on login, you hash what the user typed and check whether the fingerprints match!).',
        '- **Salting**: Before hashing, generate a unique random string (a **salt**) *per user* and mix it into their password (`hash(salt + password)`), storing the salt right alongside the hash. Now if Alice and Bob both use `"summer2026"`, their stored hashes look **completely different**—defeating precomputed lookup tables and forcing attackers to crack each account individually!',
        '- **`Argon2id` and `bcrypt`**: Unlike fast SHA-256 (designed for speed), **`Argon2id`** (modern top choice) and **`bcrypt`** are **deliberately slow, tunable password-hashing functions** (with Argon2id also consuming configurable RAM to slow down GPU/ASIC cracking!). Even if a DB leaks, brute-forcing takes years instead of seconds.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Never store plaintext or reversible encrypted passwords; store one-way hashes with unique per-user random salts using deliberately slow, memory/CPU-hard functions like Argon2id or bcrypt.',
      codeExamples: [],
    },
    {
      id: 'topic-6.2.6',
      topicId: '6.2.6',
      coveredTopicIds: ['6.2.7', '6.2.8', '6.2.9'],
      title: 'Session-based authentication, Cookie flags, and invalidation',
      problemAndRequirementsMarkdown: [
        '### First principles: Once a user logs in, how do the *next 50 HTTP requests* remember who they are?',
        'Remember HTTP is **stateless (`2.3.7`)**! You can’t force users to re-type their password on every page click. So after `POST /login` succeeds, the server needs to hand the client a **credential** to send automatically (or in a header) on future requests.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Server-Side Sessions & Hardened Cookies',
        'In **session-based authentication**:',
        '1. On login, the server generates a **cryptographically random, unguessable `sessionId`**, stores `sessionId → { userId, expiresAt }` in fast server storage (like **Redis** or PostgreSQL), and sets it on the browser via `Set-Cookie`.',
        '2. On every request, the browser attaches that cookie automatically, and the server looks up `sessionId` in Redis/DB to confirm the user is valid and not expired.',
        '3. **Why three Cookie security flags are mandatory**:',
        '   - **`HttpOnly`**: Prevents browser JavaScript (`document.cookie`) from reading the cookie—so even an XSS script injection (`6.4`) cannot steal the session token!',
        '   - **`Secure`**: Browser sends the cookie *only* over encrypted **HTTPS** connections—never plain HTTP.',
        '   - **`SameSite` (`Lax` or `Strict`)**: Restricts browsers from attaching your cookie on cross-site requests initiated by malicious third-party sites—blocking most **CSRF** attacks (`6.4`)!',
        '4. **Expiration & Instant Invalidation**: Give every session an explicit expiration (`expiresAt`) and idle timeout—and on **logout**, **password change**, or **stolen account**, deleting that `sessionId` from Redis/DB **invalidates it immediately** everywhere!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Session auth stores opaque random session IDs server-side (easy instant expiration and invalidation) and delivers them in `HttpOnly`, `Secure`, `SameSite` cookies.',
      codeExamples: [],
    },
    {
      id: 'topic-6.2.10',
      topicId: '6.2.10',
      coveredTopicIds: ['6.2.11', '6.2.12'],
      title: 'JWTs, access vs refresh tokens, rotation, and revocation',
      problemAndRequirementsMarkdown: [
        '### First principles: What if services want to verify a token *without* hitting Redis/DB on every single request—and what trap does that create?',
        'Suppose you want a mobile app or multiple microservices to verify an identity locally using just a secret or public key, without querying a central session store every call.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: JWT Structure, Verification, and Access + Refresh Tokens',
        'A **JWT (JSON Web Token)** is a self-contained string made of three Base64URL-encoded parts separated by dots (`header.payload.signature`):',
        '1. **Header**: Which signing algorithm was used (e.g. `HS256` or `RS256`).',
        '2. **Payload (Claims)**: JSON metadata like `{ "sub": "user_42", "exp": 1790000000 }`. **CRITICAL WARNING**: Base64URL is *encoding, NOT encryption*! Anyone holding a JWT can read its payload claims—so **never put secrets or passwords inside a JWT!**',
        '3. **Signature**: Cryptographic signature computed over `header.payload` using the server’s secret or private key. On every API request, the server verifies the signature (stopping anyone from editing `"sub"`!) and checks `exp` (expiration). *(Always pin allowed algorithms—never trust an untrusted `"alg": "none"` header!)*',
        '',
        '**The big JWT catch (Revocation!)**: Because a valid JWT isn’t looked up in Redis, **if someone logs out or gets banned, a stateless JWT stays valid until `exp` expires!**',
        '',
        'That is why production backends pair **two tokens**:',
        '- **Short-lived Access Token (JWT, e.g., 5–15 minutes)**: Sent on API requests—stateless verification, tiny exposure window if stolen.',
        '- **Longer-lived Refresh Token (opaque random string stored in DB/Redis, days/weeks)**: Used *only* at `POST /auth/refresh` to mint a fresh Access Token.',
        '- **Token Rotation & Revocation**: Whenever a Refresh Token is used, **rotate** it (invalidate the old refresh token and issue a brand-new one!). If an attacker steals and replays an already-used refresh token, the server detects reuse and immediately **revokes** the whole token family—forcing re-login!',
      ].join('\n\n'),
      centralIdeaSummary:
        'JWTs encode readable claims protected by a cryptographic signature (not encrypted!), and pairing short-lived access JWTs with server-tracked, rotating refresh tokens restores safe revocation.',
      codeExamples: [],
    },
    {
      id: 'topic-6.2.13',
      topicId: '6.2.13',
      coveredTopicIds: ['6.2.14'],
      title: 'OAuth 2.0 and OpenID Connect (OIDC)',
      problemAndRequirementsMarkdown: [
        '### First principles: How does “Sign in with Google / GitHub” work without handing your app the user’s Google password?',
        'If a third-party app asked users to type their Google password directly into the third-party app’s login box, users would have zero control over what that app could read or keep forever!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The mechanism: Delegated Authorization (`OAuth 2.0`) vs. Identity Layer (`OpenID Connect`)',
        'Notice the exact division of labor between these two often-confused standards:',
        '- **OAuth 2.0 (Delegated *Authorization*)**: Lets a user grant a third-party app **scoped access** (e.g., *“read my GitHub repositories, nothing else”*) without ever sharing their password! The user logs in directly on GitHub’s site, GitHub redirects back with a temporary code, and the backend exchanges that code server-side for a scoped **OAuth Access Token**.',
        '- **OpenID Connect / OIDC (Federated *Authentication*)**: OAuth 2.0 alone only gave an authorization token—it didn’t standardize *who* the user is! **OIDC** builds a thin **identity layer** right on top of OAuth 2.0, adding a signed **ID Token (a JWT)** containing standardized user identity claims (`sub`, `email`, `name`) so “Sign in with Google/GitHub” verifies the user’s identity cleanly.',
      ].join('\n\n'),
      centralIdeaSummary:
        'OAuth 2.0 delegates scoped resource permissions without sharing passwords, while OpenID Connect (OIDC) sits atop OAuth 2.0 to provide standardized identity authentication via a signed ID Token.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Choosing and layering authentication cleanly',
    narrativeMarkdown: [
      'Compare how each tool in `6.2` fits together:',
      '- **First-party web app**: Salted **`Argon2id`** hashes passwords on signup/login; **`HttpOnly` + `Secure` + `SameSite` session cookies** backed by Redis give instant logout & revocation.',
      '- **Mobile / distributed APIs**: Short-lived **signed Access JWTs** + **rotating server-stored Refresh Tokens** balance fast verification with revocability.',
      '- **Third-party login / API integrations**: **OIDC** verifies identity; **OAuth 2.0** grants scoped API access.',
    ].join('\n\n'),
    integratedExample: {
      id: '6.2-integrated-example',
      title: 'Access + Rotating Refresh Token & Session lifecycle overview',
      language: 'text',
      code: `1. Login (POST /auth/login):
     Verify password against Argon2id salted hash
     ──▶ Issue Access JWT (exp = 10 min, signed) + Opaque Refresh Token (hashed in DB)

2. Normal API Call (GET /orders):
     Verify Access JWT signature + exp locally (fast, stateless)

3. Access Expires / Refresh (POST /auth/refresh):
     Look up Refresh Token in DB:
       - Valid & unused? Rotate -> revoke old token, save new refresh token, return new Access JWT
       - Already used (stolen replay!)? Revoke entire token family -> require fresh login!`,
    },
    walkthroughMarkdown:
      'Every piece compensates for the others’ trade-offs: Argon2id protects resting passwords, cookie flags protect browser transport, and rotating short-lived tokens reconcile JWT speed with instant revocation.',
  },
  questions: [
    {
      id: '6.2-kc-1',
      focusArea: 'Password Hashing, Salting & Argon2id/bcrypt',
      prompt:
        'Why should user passwords be stored using **Argon2id or bcrypt with a unique per-user random salt**, rather than **(a)** AES encryption or **(b)** plain unsalted SHA-256?',
      hints: [
        'Ask: (a) What if the attacker steals the encryption key too? (b) What if two users pick the same password or an attacker uses a fast GPU?',
        'Connect one-way hashing, unique salts, and deliberate slowness/memory-hardness.',
        'AES is reversible if the key leaks; plain unsalted SHA-256 produces identical hashes for identical passwords (vulnerable to lookup tables) and runs billions of times/sec on GPUs. Unique salts prevent table/duplicate leaks, and Argon2id/bcrypt are one-way and deliberately slow/memory-hard.',
      ],
      explanation:
        '**(a) Encryption** is two-way—if an attacker compromises the key alongside the database, every password can be decrypted back to plaintext. **(b) Plain SHA-256** is one-way, *but* unsalted identical passwords share identical hashes (breaking via precomputed tables) and GPUs compute billions of fast SHA-256 hashes per second. **Argon2id / bcrypt with unique per-user salts** make hashing one-way, unique per account, and deliberately CPU/memory-expensive to brute-force.',
      evaluationCriteria: [
        'Explains encryption reversibility risk vs one-way hashing',
        'Explains unique per-user salts defeating identical-password/rainbow attacks and Argon2id/bcrypt slowing brute force',
      ],
      topicIds: ['6.2.1', '6.2.2', '6.2.3', '6.2.4', '6.2.5'],
    },
    {
      id: '6.2-kc-2',
      focusArea: 'Session Cookies & Flags',
      prompt:
        'Explain the specific security job of each of the three cookie flags—**`HttpOnly`**, **`Secure`**, and **`SameSite`**—for a server-side session cookie.',
      hints: [
        'Match each flag to its threat: JavaScript XSS reading cookies, plain unencrypted HTTP Wi-Fi sniffing, and cross-site third-party form requests (CSRF).',
        'Think carefully about `document.cookie`, TLS, and cross-origin requests.',
        '`HttpOnly` blocks JS `document.cookie` access (XSS theft), `Secure` restricts sending over HTTPS only, and `SameSite` stops browsers sending cookies automatically on malicious cross-site requests (CSRF).',
      ],
      explanation:
        '- **`HttpOnly`**: Blocks client-side JavaScript (`document.cookie`) from reading the session ID, protecting against cookie theft if XSS occurs.\n- **`Secure`**: Instructs the browser to send the cookie *only* over encrypted **HTTPS** links, never plain HTTP.\n- **`SameSite` (`Lax`/`Strict`)**: Controls whether the browser attaches the cookie on cross-site requests initiated from third-party domains, defending against CSRF.',
      evaluationCriteria: [
        'Correctly defines HttpOnly (blocks JS access), Secure (HTTPS-only), and SameSite (cross-site restriction/CSRF defense)',
      ],
      topicIds: ['6.2.6', '6.2.7', '6.2.8', '6.2.9'],
    },
    {
      id: '6.2-kc-3',
      focusArea: 'JWTs, Revocation & Token Rotation',
      prompt:
        'Why shouldn’t you put confidential user secrets inside a standard **JWT payload**, why can’t a long-lived stateless JWT be revoked immediately on logout, and how do **short-lived access tokens + rotating refresh tokens** solve that?',
      hints: [
        'Check whether a JWT payload is encrypted or merely Base64URL-encoded.',
        'If an access JWT only lasts 10 minutes and refresh tokens live in the DB, what happens on logout or stolen-token replay?',
        'JWT payloads are Base64URL-encoded (readable by anyone) and signed only for integrity; stateless JWTs stay valid until `exp`. Using 10-minute access JWTs + DB-backed rotating refresh tokens caps exposure and allows immediate revocation (and theft detection on reuse).',
      ],
      explanation:
        'A standard JWT’s payload is only **Base64URL-encoded**, *not encrypted*—anyone holding the token can decode and read every claim (the signature only proves it wasn’t tampered with). Because stateless JWTs aren’t checked against a database, you can’t immediately revoke a 7-day JWT upon logout. Pairing a **short-lived Access JWT** (minutes) with a **server-tracked, rotating Refresh Token** keeps API auth fast while allowing instant refresh revocation and detecting stolen refresh token reuse.',
      evaluationCriteria: [
        'Clarifies JWT payload is Base64URL-encoded (readable), signed not encrypted',
        'Explains stateless revocation gap solved via short-lived access + DB-backed rotating refresh tokens',
      ],
      topicIds: ['6.2.10', '6.2.11', '6.2.12'],
    },
    {
      id: '6.2-kc-4',
      focusArea: 'OAuth 2.0 vs OpenID Connect',
      prompt:
        'Distinguish **OAuth 2.0** from **OpenID Connect (OIDC)**—if a user clicks “Sign in with Google” so your backend knows their verified email and user ID, which protocol provides that identity token?',
      hints: [
        'One is about delegated *permissions/authorization* to an API; the other adds an *identity/authentication* layer.',
        'Remember what extra token OIDC adds on top of OAuth 2.0.',
        'OAuth 2.0 handles delegated authorization (scoped access tokens without passwords), while **OpenID Connect (OIDC)** sits on top of OAuth 2.0 and provides a signed **ID Token** carrying verified identity claims.',
      ],
      explanation:
        '**OAuth 2.0** is an **authorization** framework—it lets a user grant an app scoped access to their resources (via an access token) without sharing their password. **OpenID Connect (OIDC)** is the **authentication** layer built directly on top of OAuth 2.0 that issues a standardized, signed **ID Token (JWT)** with verified identity claims (`sub`, `email`) for “Sign in with Google/GitHub.”',
      evaluationCriteria: [
        'Contrasts OAuth 2.0 (delegated authorization) vs OIDC (identity authentication layer + ID token)',
      ],
      topicIds: ['6.2.13', '6.2.14'],
    },
  ],
};

export const LESSON_6_2_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Implement rock-solid authentication in Node.js: hash passwords with **Argon2id/bcrypt**, serve **hardened session cookies** or **short-lived JWTs + rotating refresh tokens**, and safely wire **OIDC/OAuth 2.0**.',
  whenToUseMarkdown:
    'Use this implementation sequence whenever building user signup/login, session middleware, mobile/SPA token refresh, or federated OAuth/OIDC sign-in.',
  setupCommands: [
    {
      id: '6.2-cmd-1',
      label: 'Install Argon2 (or bcrypt) and JWT library (jose)',
      command: 'npm install argon2 jose',
      notes: 'argon2 implements Argon2id with built-in per-user random salt generation; jose validates JWTs safely with explicit algorithm pinning.',
    },
  ],
  coreApisMarkdown: [
    '- **`argon2.hash(password)` / `argon2.verify(storedHash, password)`**: Automatically generates a unique cryptographic salt, hashes with Argon2id, and uses constant-time comparison on login.',
    '- **`Set-Cookie` (`httpOnly: true, secure: true, sameSite: "lax"`)**: Protects session cookies from JS/XSS theft, plaintext Wi-Fi interception, and cross-site forgery.',
    '- **`jose.SignJWT` / `jose.jwtVerify(token, key, { algorithms: ["HS256"] })`**: Signs and strictly verifies JWTs with algorithm allow-listing.',
    '- **Hashed Refresh Token Storage (`sha256(refreshToken)`)**: Store only a cryptographic hash of long-lived refresh tokens in the database so even a DB read leak can’t forge active sessions.',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Hash passwords with Argon2id on signup and verify cleanly on login',
      detailMarkdown:
        'Never roll your own salt-concatenation or comparison (`===`); `argon2.hash` handles per-user random salts and stores parameters inside the encoded hash string (`$argon2id$...`). Always return a generic `"Invalid email or password"` error on login failure so attackers can’t enumerate registered emails.',
      code: {
        id: '6.2-step-1',
        title: 'Password hashing and verification with argon2',
        language: 'typescript',
        code: `import argon2 from "argon2";

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export async function verifyPassword(storedHash: string, plain: string): Promise<boolean> {
  return argon2.verify(storedHash, plain);
}`,
      },
    },
    {
      stepNumber: 2,
      title: 'Choose Session Cookies (Web) OR Short-Lived Access JWT + Rotating Refresh Token',
      detailMarkdown:
        'For browser apps, store a random 32-byte `sessionId` in Redis/Postgres and send it with `HttpOnly; Secure; SameSite=Lax`. For token-based APIs, keep Access JWT expiry short (`10–15m`) and store a hashed Refresh Token row in Postgres (`id, user_id, token_hash, revoked_at, expires_at`).',
      code: {
        id: '6.2-step-2',
        title: 'JWT verification with explicit algorithm pinning',
        language: 'typescript',
        code: `import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function issueAccessToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<{ userId: string }> {
  const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
  if (typeof payload.sub !== "string") throw new Error("Missing sub claim");
  return { userId: payload.sub };
}`,
      },
    },
    {
      stepNumber: 3,
      title: 'Rotate & revoke refresh tokens atomically inside a DB transaction',
      detailMarkdown:
        'On `POST /auth/refresh`, wrap lookup + revocation in a transaction (`5.1`): if the presented refresh token was *already* marked used/revoked, revoke all active refresh tokens for that user/family immediately!',
    },
  ],
  workingExamples: [
    {
      id: '6.2-ex-1',
      title: 'Atomic refresh token rotation with reuse detection',
      language: 'typescript',
      code: `import crypto from "node:crypto";

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// Conceptual transaction inside POST /auth/refresh
export async function rotateRefreshToken(
  rawToken: string,
  db: {
    findByHash: (h: string) => Promise<{ id: string; userId: string; revokedAt: Date | null; expiresAt: Date } | null>;
    revokeToken: (id: string) => Promise<void>;
    revokeAllForUser: (userId: string) => Promise<void>;
    insertNewToken: (userId: string, hash: string) => Promise<void>;
  }
) {
  const tokenHash = hashToken(rawToken);
  const existing = await db.findByHash(tokenHash);

  if (!existing || existing.expiresAt < new Date()) {
    throw new Error("UNAUTHORIZED");
  }

  // Theft detection: someone replayed an already-rotated token!
  if (existing.revokedAt !== null) {
    await db.revokeAllForUser(existing.userId);
    throw new Error("TOKEN_REUSE_DETECTED");
  }

  await db.revokeToken(existing.id);
  const nextRawToken = crypto.randomBytes(32).toString("base64url");
  await db.insertNewToken(existing.userId, hashToken(nextRawToken));

  return nextRawToken;
}`,
      explanation:
        'Storing only SHA-256 hashes of opaque refresh tokens protects against DB leaks, and revoking all tokens on replay neutralizes stolen tokens immediately.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Setting `expiresIn: "30d"` on an unrevocable stateless JWT and storing user `email`/`role` claims as permanently trusted.',
      fix: 'Keep Access JWTs short-lived (5–15m) paired with a revocable Refresh Token or server-side session.',
    },
    {
      mistake: 'Verifying JWTs without specifying `algorithms: ["HS256"]` (or using `jwt.decode()` instead of `jwtVerify()`).',
      fix: '`jwt.decode()` only parses Base64URL without verifying the signature! Always verify signature, expiration, and allowed algorithms.',
    },
    {
      mistake: 'Omitting `HttpOnly` or `Secure` when putting tokens/sessions into cookies.',
      fix: 'Always set `HttpOnly`, `Secure`, and `SameSite=Lax` (or `Strict`) on authentication cookies.',
    },
  ],
  exercise: {
    id: '6.2-ex',
    title: 'Implement Password Hashing, Cookie Flags & Refresh Rotation',
    instructionsMarkdown:
      'Design an authentication module containing:\n1. `registerUser(email, password)` using `argon2id`.\n2. Exact `Set-Cookie` attributes for a server-side `sid` session cookie.\n3. `rotateRefreshToken` logic that rejects expired tokens, marks used tokens revoked, and revokes the user’s entire token family if a previously revoked token is replayed.',
    acceptanceChecklist: [
      'Uses Argon2id (or bcrypt) — never plaintext, AES, or plain SHA-256 for passwords',
      'Session cookie includes HttpOnly, Secure, and SameSite flags plus expiration',
      'Refresh rotation hashes stored token, invalidates old token on use, and triggers family revocation on reuse',
    ],
  },
};
