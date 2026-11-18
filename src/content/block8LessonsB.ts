import { FptLessonContent, RecipeLessonContent } from '../types';

export const LESSON_8_4_FPT: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Every engineer has heard (or said): *“Weird, it works on my machine!”* Your laptop runs macOS with Node 22 and OpenSSL 3; your teammate runs Windows; the production server runs Debian Linux with Node 20 and a missing native image library. Installing dependencies globally on servers turns deployments into fragile guesswork.',
      'In this unit, we’ll build **Containerization** from first principles: **why containers exist**, **virtual machines vs. containers**, **OS-level isolation (namespaces & cgroups)**, **Docker images, layers, and Dockerfiles**, **volumes & networking**, **Docker Compose**, and **multi-stage builds**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Containers package your runtime, OS libraries, and compiled application into one immutable artifact that behaves identically on your laptop, in CI tests, and across production cloud hosts.',
    prerequisites: [
      {
        subBlockId: '8.3',
        label: 'Runtime configuration & env vars (8.3)',
        detail: 'Understanding that immutable artifacts take environment-specific config at startup.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-8.4.1',
      topicId: '8.4.1',
      coveredTopicIds: ['8.4.2', '8.4.3'],
      title: 'Why containers exist, Virtual Machines vs. Containers, and container isolation',
      problemAndRequirementsMarkdown: [
        '### First principles: Why couldn’t we just ship a ZIP file—or spin up a Virtual Machine per service?',
        '- **Shipping a ZIP file** assumes the target server already has the exact Node version, Python binaries, fonts, and OS shared libraries installed globally. Two apps on the same server needing Node 18 and Node 22 collide immediately.',
        '- **Virtual Machines (VMs)** solve that by emulating an entire physical machine and booting a **full guest OS kernel** per app. It’s super isolated—but booting a 2 GB guest OS per small API service wastes gigabytes of RAM and takes minutes to start.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### How Linux containers give VM-like isolation at process speed',
        'A **container** doesn’t boot a second Linux kernel! Instead, multiple containers **share the single host Linux kernel**, while the kernel isolates each container like a private mini-machine using two core Linux primitives:',
        '1. **Namespaces** *(“What can this process SEE?”)*: Give the container its own private view of process IDs (`PID 1`), filesystem mount (`/`), network interfaces/ports, and hostname. App A cannot see App B’s files or `ps` processes.',
        '2. **Control Groups (`cgroups`)** *(“How much can this process USE?”)*: Enforce strict limits on CPU cores and RAM (`--memory 512m`) so one memory-leaking service can’t starve every neighbor on the host.',
        '',
        'Because there is **no guest OS boot**, containers weigh tens of megabytes and start in **milliseconds** instead of minutes!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Containers share the host Linux kernel while using namespaces (visibility isolation) and cgroups (CPU/RAM limits) to deliver reproducible environments with near-zero VM overhead.',
      codeExamples: [],
    },
    {
      id: 'topic-8.4.4',
      topicId: '8.4.4',
      coveredTopicIds: ['8.4.5', '8.4.6', '8.4.10'],
      title: 'Docker images, layers, Dockerfiles, and multi-stage builds',
      problemAndRequirementsMarkdown: [
        '### First principles: How do we build reproducible images fast—without shipping compilers to prod?',
        'Think of a **Dockerfile** as a repeatable recipe that builds an immutable **Docker image** (a read-only filesystem snapshot). Wait: if every `npm run build` rebuilt the entire Linux OS + Node.js + `node_modules` from zero, builds would take 10 minutes and push 1 GB over the network every single commit!',
        'And notice a second trap: to compile TypeScript (`tsc`), you need `typescript`, `@types/*`, and dev tools—yet in production, shipping source `.ts` files, compilers, and `devDependencies` bloats image size and widens your security **attack surface** (`6.1`).',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Layers, caching, and Multi-Stage Builds',
        '1. **Image Layers & Copy-on-Write**: Each instruction (`FROM`, `COPY`, `RUN`) creates a **cached read-only layer**. If you copy `package*.json` and run `npm ci` *before* `COPY src/ .`, editing `src/app.ts` reuses the cached `node_modules` layer in under a second! When a container runs, Docker simply adds **one thin writable scratch layer** on top.',
        '2. **Dockerfiles**: Define the deterministic steps (`FROM node:22-alpine`, `WORKDIR /app`, `COPY`, `RUN`, `USER node`, `CMD`).',
        '3. **Multi-Stage Builds**: Use two `FROM` stages in one Dockerfile:',
        '   - **Stage 1 (`builder`)**: Installs all `devDependencies`, copies `src/`, runs `npm run build` → produces `dist/`.',
        '   - **Stage 2 (`runtime`)**: Starts fresh from minimal `node:22-alpine`, installs **production-only** dependencies (`npm ci --omit=dev`), copies **only `dist/`** from `builder`, and drops root privileges (`USER node`). Your production image shrinks from ~900 MB down to ~150 MB with zero compilers inside!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Order Dockerfile instructions from least-frequently changed to most-frequently changed to maximize layer caching, and use multi-stage builds to exclude compilers and devDependencies from production images.',
      codeExamples: [],
    },
    {
      id: 'topic-8.4.7',
      topicId: '8.4.7',
      coveredTopicIds: ['8.4.8', '8.4.9'],
      title: 'Volumes, container networking, and Docker Compose',
      problemAndRequirementsMarkdown: [
        '### First principles: Where does database data go when a container restarts—and how does `api` find `postgres`?',
        '1. Remember a container’s top writable layer is **ephemeral**: run `docker rm postgres`, and every table inside the container vanishes forever!',
        '2. Inside containers, `localhost` inside the `api` container means *only the `api` container itself*—NOT the `postgres` container next door! Hardcoding `127.0.0.1:5432` inside your container breaks immediately.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Persistence, DNS service discovery, and multi-container orchestration locally',
        '1. **Volumes**: A **Volume** mounts a persistent directory managed outside the container’s ephemeral filesystem (e.g., `/var/lib/postgresql/data`). You can delete and upgrade the Postgres container image cleanly while your database files survive intact.',
        '2. **Container Networking**: Docker creates a **private bridge network** with built-in DNS. Any container on that network resolves sibling services **by service name**—so `api` connects directly to `postgres://postgres:5432/app` without knowing dynamic container IPs, while keeping Postgres unexposed to the public host if desired.',
        '3. **Docker Compose**: Defines your full local/staging multi-container stack (`api` + `postgres` + `redis` + volumes + networks + health checks) in one declarative `compose.yaml` started via `docker compose up`.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Attach Volumes so state survives container restarts, use private Docker networks so services reach each other by service name, and coordinate multi-service local stacks with Docker Compose.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'How images, multi-stage builds, volumes, and networks work together',
    narrativeMarkdown: [
      'Trace how a containerized backend operates from build to runtime:',
      '- **Build time**: `Dockerfile` uses **layer caching** + **multi-stage builds** to create a lean, non-root `app:1.0` image.',
      '- **Run time**: `docker compose` boots `api` + `postgres` on a private **bridge network** (`postgres:5432` DNS), mounts a persistent **volume** for Postgres data, and enforces kernel **namespace/cgroup** isolation on each container.',
    ].join('\n\n'),
    integratedExample: {
      id: '8.4-integrated-example',
      title: 'VM vs. Container Stack & Runtime Topology',
      language: 'text',
      code: `Virtual Machines:  [Host OS] -> [Hypervisor] -> [Guest OS + App A] [Guest OS + App B]
Containers:        [Host Linux Kernel (namespaces + cgroups)] -> [App A] [Postgres]

Inside Docker Compose Bridge Network ("backend-net"):
  [api container]  ──DNS: "postgres:5432"──▶  [postgres container]
                                                    │
                                              [pgdata Volume] (persists across restarts!)`,
    },
    walkthroughMarkdown:
      'Switch to the **Recipe** tab to inspect a production-ready multi-stage `Dockerfile`, `.dockerignore`, and `compose.yaml` with health checks and persistent volumes.',
  },
  questions: [
    {
      id: '8.4-kc-1',
      focusArea: 'VMs vs Containers & Isolation',
      prompt:
        'How do **containers** achieve process, file, and resource isolation without booting a full guest OS like a **Virtual Machine**—and what two Linux kernel mechanisms provide this?',
      hints: [
        'Compare what sits underneath each app in a VM vs. a container.',
        'One kernel feature hides host PIDs/files/networks; the other limits CPU and memory.',
        'Containers share the host Linux kernel and use namespaces (isolating PIDs, mounts, network view) and cgroups (enforcing CPU/memory limits) without a guest OS.',
      ],
      explanation:
        'Unlike **VMs** (which bundle an entire guest OS kernel per instance), **containers** share the host Linux kernel. Kernel **namespaces** isolate what each container can see (its own PID tree, filesystem root, and network stack), while **cgroups** cap how much CPU and RAM it can consume.',
      evaluationCriteria: [
        'Notes containers share the host kernel (no guest OS)',
        'Names and accurately explains namespaces (visibility) and cgroups (resource caps)',
      ],
      topicIds: ['8.4.1', '8.4.2', '8.4.3'],
    },
    {
      id: '8.4-kc-2',
      focusArea: 'Layers & Multi-Stage Builds',
      prompt:
        'Why should a `Dockerfile` run `COPY package*.json` + `npm ci` **before** `COPY src/ .`, and what two concrete problems do **multi-stage builds** solve?',
      hints: [
        'What happens to Docker’s layer cache when a single line in `src/index.ts` changes?',
        'What stays behind in the builder stage vs. what enters the final production image?',
        'Installing deps before copying `src/` preserves the cached `node_modules` layer across code edits; multi-stage builds shrink image size and remove compilers/devDependencies (reducing attack surface).',
      ],
      explanation:
        'Docker invalidates every subsequent layer cache once an instruction’s input changes. Putting `package*.json` + `npm ci` *before* `COPY src/` lets Docker reuse cached dependencies whenever only source code changes. **Multi-stage builds** compile TypeScript in a heavy builder stage and copy only `dist/` + production deps into a slim runtime stage, shrinking images and eliminating dev-tool attack surface.',
      evaluationCriteria: [
        'Explains layer cache invalidation order for fast rebuilds',
        'Identifies smaller image size and smaller security attack surface from multi-stage builds',
      ],
      topicIds: ['8.4.4', '8.4.5', '8.4.6', '8.4.10'],
    },
    {
      id: '8.4-kc-3',
      focusArea: 'Volumes, Networking & Compose',
      prompt:
        'When running `api` and `postgres` in **Docker Compose**, why does `DATABASE_URL=postgres://localhost:5432/app` fail inside `api`—and what happens to your data on `docker compose down` if you forgot a **volume**?',
      hints: [
        'Inside the `api` container, who does `localhost` refer to?',
        'What happens to a container’s writable filesystem layer when the container is removed?',
        '`localhost` resolves only to the `api` container itself (use service DNS `postgres:5432` on the Compose network); without a persistent Volume, recreating/removing the container wipes the database files.',
      ],
      explanation:
        'Each container has its own network namespace, so `localhost` inside `api` points only to `api`, not `postgres`; services on a shared Docker network reach each other by service name (`postgres:5432`). Without a **Volume**, database writes stay inside the container’s ephemeral writable layer and vanish when the container is replaced.',
      evaluationCriteria: [
        'Explains container-local `localhost` vs Docker DNS service-name resolution',
        'Explains ephemeral writable layer loss vs persistent Volumes',
      ],
      topicIds: ['8.4.7', '8.4.8', '8.4.9'],
    },
  ],
};

export const LESSON_8_4_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Package a TypeScript backend into a slim, secure, non-root **multi-stage Docker image** and orchestrate local `api + postgres + redis` dependencies cleanly with **Docker Compose**, **volumes**, and **bridge networking**.',
  whenToUseMarkdown:
    'Use this container setup for consistent local onboarding, Testcontainers/CI parity, and container-based cloud deployments.',
  setupCommands: [
    {
      id: '8.4-setup-1',
      label: 'Build and start multi-container local stack',
      command: 'docker compose up --build',
      notes: 'Add `-d` to run detached and `docker compose down -v` only when intentionally wiping volumes.',
    },
  ],
  coreApisMarkdown: [
    '- **`.dockerignore`**: Excludes `node_modules`, `.git`, `.env`, and tests from the build context so `COPY` stays fast and secrets never enter layers.',
    '- **`FROM ... AS builder` + `FROM ... AS runtime`**: Two-stage build dropping `tsc` and `devDependencies` from the final image.',
    '- **`USER node`**: Runs Node.js as an unprivileged non-root OS user inside the container.',
    '- **`compose.yaml` (`services`, `volumes`, `networks`, `healthcheck`)**: Boots Postgres cleanly before `api` connects.',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Add .dockerignore before building any image',
      detailMarkdown:
        'Without `.dockerignore`, `COPY . .` sends your local `node_modules`, `.env`, and `.git` folder into the Docker daemon—slowing builds and risking baked-in secrets!',
      code: {
        id: '8.4-step-1',
        title: '.dockerignore',
        language: 'text',
        code: `node_modules
dist
.git
.env
.env.*
coverage
*.log`,
      },
    },
    {
      stepNumber: 2,
      title: 'Write a layer-cached, non-root Multi-Stage Dockerfile',
      detailMarkdown:
        'Install dependencies before copying `src/` for layer caching (`8.4.5`), compile in `builder`, and copy only `dist/` + `--omit=dev` dependencies into the final `runtime` image (`8.4.10`).',
      code: {
        id: '8.4-step-2',
        title: 'Production Multi-Stage Dockerfile',
        language: 'dockerfile',
        code: `# Stage 1: Build TypeScript
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Stage 2: Minimal non-root runtime
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]`,
      },
    },
    {
      stepNumber: 3,
      title: 'Orchestrate api + postgres with Volumes, Bridge Networking & Healthchecks',
      detailMarkdown:
        'Connect `api` to `postgres` via Docker DNS (`postgres:5432`) and persist data inside a named volume (`8.4.7`, `8.4.8`, `8.4.9`).',
      code: {
        id: '8.4-step-3',
        title: 'compose.yaml',
        language: 'yaml',
        code: `services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: dev_only_password
      POSTGRES_DB: app_db
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d app_db"]
      interval: 5s
      timeout: 3s
      retries: 10

  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgres://app:dev_only_password@postgres:5432/app_db
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  pg_data:`,
      },
    },
  ],
  workingExamples: [
    {
      id: '8.4-ex-verify',
      title: 'Inspect image size and verify non-root user',
      language: 'bash',
      code: `docker build -t my-api:1.0 .
docker images my-api:1.0
docker run --rm my-api:1.0 id   # uid=1000(node) gid=1000(node)`,
      explanation:
        'Always verify your built image size (`docker images`) and confirm the container runs as `node` rather than `uid=0(root)`.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Writing `COPY . .` before `RUN npm ci`.',
      fix: 'Every single code edit breaks the `npm ci` layer cache! Always copy `package*.json` and run `npm ci` first.',
    },
    {
      mistake: 'Forgetting `.dockerignore` and accidentally baking `.env` secrets inside an image layer.',
      fix: 'Ignore `.env*` in `.dockerignore` and inject secrets strictly at runtime via `environment` or platform secret managers.',
    },
    {
      mistake: 'Using `depends_on: [postgres]` without `condition: service_healthy`.',
      fix: '`depends_on` alone only waits for the container to start, not for Postgres to finish booting; pair it with a `healthcheck`.',
    },
  ],
  exercise: {
    id: '8.4-ex',
    title: 'Containerize a Node/TypeScript API + Postgres Stack',
    instructionsMarkdown:
      'Create a `.dockerignore`, a 2-stage non-root `Dockerfile`, and a `compose.yaml` running `api` + `postgres` with:\n1. Proper layer ordering for `npm ci` caching.\n2. `dist/` compiled in `builder` and copied into `runtime` running as `USER node`.\n3. Persistent named volume `pg_data`, bridge DNS (`postgres:5432`), and `service_healthy` wait.',
    acceptanceChecklist: [
      '.dockerignore excludes node_modules, .git, and .env*',
      'Multi-stage Dockerfile drops devDependencies/tsc from runtime and runs as USER node',
      'compose.yaml attaches a persistent volume to Postgres and uses service DNS + healthcheck',
    ],
  },
};

export const LESSON_8_5_FPT: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Your app passes tests locally in Docker Compose. Now you’re ready to put it on the real internet so users can reach `https://api.yourproduct.com`. Between `npm run build` on your laptop and a reliable production deployment sit several operational realities: **Managed PostgreSQL**, **health checks**, **graceful shutdown** when servers restart, **centralized logs**, **verified database backups**, and **HTTPS / DNS termination**.',
      'In this unit, we’ll examine **Deployment** from first principles across every one of those links: **build & startup**, **deploying an application**, **managed PostgreSQL**, **environment configuration**, **health checks**, **graceful shutdown**, **logs**, **database backups**, and **HTTPS & domain configuration**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Production environments restart containers, rotate hosts, and drop network cables routinely. Building clean health probes, zero-drop graceful shutdowns, TLS routing, and tested backups turns routine deploys from outages into non-events.',
    prerequisites: [
      {
        subBlockId: '8.3',
        label: 'Validated runtime configuration (8.3)',
        detail: 'Understanding fail-fast env loading and pre-traffic migrations.',
      },
      {
        subBlockId: '8.4',
        label: 'Containerized runtime images (8.4)',
        detail: 'Packaging deterministic build outputs for deployment.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-8.5.1',
      topicId: '8.5.1',
      coveredTopicIds: ['8.5.2', '8.5.3', '8.5.4'],
      title: 'Build & startup, deploying an application, Managed PostgreSQL, and environment configuration',
      problemAndRequirementsMarkdown: [
        '### First principles: Why running Postgres inside your app container—or building on the live server—breaks in production',
        'Two tempting beginner shortcuts fail quickly once real users arrive:',
        '1. **Running `tsc` / `npm install` on the live server**: If a deploy compiles in-place and fails halfway, your live server is half-broken.',
        '2. **Self-hosting PostgreSQL on the same VM without automation**: Disks fill up, OS patches require reboots, and failing drives destroy unbacked-up customer data.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Clean deployment building blocks',
        '1. **Build and Startup Process**: Separate **Build** (compile TS → `dist/` into an immutable artifact/image once in CI) from **Startup** (`node dist/server.js`, reading **environment configuration** (`8.5.4`) and binding `process.env.PORT` immediately).',
        '2. **Deploying an Application**: Upload the built artifact/container behind a **Load Balancer / Reverse Proxy**, verify it passes health checks, shift live traffic over, and tear down old instances cleanly.',
        '3. **Managed PostgreSQL** (RDS, Cloud SQL, Supabase, Neon): Offloads automated OS patching, encrypted storage, **automated point-in-time backups**, high-availability failover replicas, and metrics—so you focus on schema/queries instead of disk recovery at 3 AM.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Separate immutable build artifacts from fast startup with runtime environment config, and rely on Managed PostgreSQL for automated backups, failover, and storage hygiene.',
      codeExamples: [],
    },
    {
      id: 'topic-8.5.5',
      topicId: '8.5.5',
      coveredTopicIds: ['8.5.6'],
      title: 'Health checks and graceful shutdown (zero-dropped-request deploys)',
      problemAndRequirementsMarkdown: [
        '### First principles: What happens to in-flight payments when you click "Deploy"?',
        'Imagine your load balancer sends `POST /checkout` to Container `v1`. Halfway through charging Stripe and writing the Postgres row, your platform deploys `v2` and immediately sends `kill -9` (`SIGKILL`) to Container `v1`! The TCP socket snaps mid-response, the client gets a `502 Bad Gateway`, and your database transaction is left dangling!',
        '',
        'And simultaneously, if Container `v2` boots before its Postgres pool connects, the load balancer starts sending live traffic to a server that isn’t ready yet!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Two endpoints + one signal handler that make deploys invisible to users',
        '1. **Health Checks** *(two distinct questions!)*:',
        '   - **Liveness (`/healthz` or `/live`)**: *“Is the Node process alive and not deadlocked?”* Lightweight `200 OK` without hammering Postgres—if it fails, restart the container.',
        '   - **Readiness (`/readyz`)**: *“Am I ready to receive user traffic right now?”* Runs a fast `SELECT 1` against Postgres / `PING` against Redis and checks we aren’t shutting down. While unready (or draining), return `503 Service Unavailable` so the load balancer stops routing new requests here!',
        '2. **Graceful Shutdown (`SIGTERM`)**: Before killing a container, platforms send `SIGTERM` and wait a grace period (e.g., 30 seconds). Your shutdown handler must:',
        '   - Flip an internal `isShuttingDown = true` flag so `/readyz` immediately returns `503`.',
        '   - Call `server.close()` to stop accepting *new* TCP connections while **letting already in-flight requests finish**. ',
        '   - Wait for in-flight requests to drain, then cleanly close `pool.end()` / `redis.quit()` and exit with code `0`!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Expose lightweight liveness and dependency-checking readiness probes so load balancers route safely, and handle SIGTERM by draining active HTTP requests and closing DB pools before exiting.',
      codeExamples: [],
    },
    {
      id: 'topic-8.5.7',
      topicId: '8.5.7',
      coveredTopicIds: ['8.5.8', '8.5.9'],
      title: 'Logs, database backups, and HTTPS / domain configuration',
      problemAndRequirementsMarkdown: [
        '### First principles: Three things you only miss when something goes wrong',
        '1. **SSHing into a dead container to read `app.log`**: When a container crashes and gets replaced, any file written inside the container is **gone**.',
        '2. **Untested backups**: Having a backup script that quietly ran out of disk space 4 months ago gives you zero backups when someone accidentally runs `DELETE` without `WHERE`.',
        '3. **Bare IP HTTP (`http://34.12.90.5:3000`)**: Browsers block `Secure` cookies, passwords travel in plaintext, and users can’t remember IP addresses.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Production hygiene for visibility, recovery, and transport',
        '1. **Logs**: Write **structured JSON logs to `stdout` / `stderr`** (never local container files!). Your platform’s log agent automatically ships `stdout` centrally even if the container crashes seconds later.',
        '2. **Database Backups**: Enable automated daily snapshots + **Write-Ahead Log (WAL) Point-in-Time Recovery (PITR)** on Managed Postgres—and **regularly test restoring a backup into a staging DB**! An untested backup isn’t a backup.',
        '3. **HTTPS and Domain Configuration**: Point your DNS (`api.example.com` A/AAAA or CNAME) at your **Load Balancer / Reverse Proxy** (Caddy, Nginx, Cloudflare, AWS ALB), which automatically provisions/renews **TLS certificates (Let’s Encrypt / ACM)**, **terminates HTTPS** at the edge, and forwards traffic over private VPC networking (with `X-Forwarded-For` / `X-Forwarded-Proto`) to port `3000` on your backend.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Stream structured JSON logs to stdout, automate and restore-test Point-in-Time database backups, and terminate HTTPS on your custom domain at the load balancer/reverse proxy.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'Lifecycle of a zero-downtime production deployment',
    narrativeMarkdown: [
      'Watch every piece of `8.5` execute during a real traffic cutover from `v1` to `v2`:',
      '- User hits `https://api.site.com` (**DNS + HTTPS TLS termination** at the Load Balancer).',
      '- Platform boots `v2` with **env config** (`8.5.4`), pointing at **Managed Postgres** (`8.5.3` with **PITR backups**).',
      '- Load Balancer polls `/readyz` (**health check** `8.5.5`); once `200 OK`, it routes new requests to `v2`.',
      '- Platform sends `SIGTERM` to `v1`; `v1` stops taking new connections, drains active requests (**graceful shutdown** `8.5.6`), logs structured events to `stdout` (`8.5.7`), and exits cleanly.',
    ].join('\n\n'),
    integratedExample: {
      id: '8.5-integrated-example',
      title: 'Zero-Downtime Traffic Shift From v1 to v2',
      language: 'text',
      code: `[Browser] ──HTTPS──▶ [DNS + Load Balancer (TLS Termination)]
                           │
        ┌──────────────────┴──────────────────┐
        ▼ (Draining on SIGTERM)               ▼ (GET /readyz -> 200 OK)
   [API v1]                              [API v2]
   • /readyz -> 503                      • Env config validated
   • server.close() waits in-flight      • Serving new traffic
   • pool.end() -> exit(0)               • JSON logs -> stdout
        │                                     │
        └──────────────────┬──────────────────┘
                           ▼
               [Managed PostgreSQL + PITR Backups]`,
    },
    walkthroughMarkdown:
      'Switch to the **Recipe** tab to implement `/healthz`, `/readyz`, `SIGTERM`/`SIGINT` graceful shutdown, and reverse-proxy HTTPS headers (`trust proxy`).',
  },
  questions: [
    {
      id: '8.5-kc-1',
      focusArea: 'Health Checks & Graceful Shutdown',
      prompt:
        'Why should `/healthz` (liveness) NOT query PostgreSQL while `/readyz` (readiness) SHOULD—and what steps must happen inside a **graceful shutdown (`SIGTERM`)** handler to avoid dropping active user requests?',
      hints: [
        'If Postgres blinks for 3 seconds and `/healthz` restarts all 10 API containers simultaneously, does that help Postgres recover or cause a cascading restart storm?',
        'Trace what happens to `/readyz`, `server.close()`, and `pool.end()` when `SIGTERM` arrives.',
        'Liveness checks only whether the process is alive (avoiding cascading DB restart loops), whereas Readiness checks DB/Redis availability (`503` pauses routing). On `SIGTERM`, mark unready, call `server.close()` to drain in-flight HTTP calls, then close DB pools.',
      ],
      explanation:
        'If a liveness probe queries Postgres, a brief DB hiccup causes the orchestrator to kill and restart healthy API containers repeatedly. Keep **liveness (`/healthz`)** lightweight and process-only, and put dependency checks (`SELECT 1`) in **readiness (`/readyz`)** so load balancers stop routing traffic temporarily. On **`SIGTERM`**, immediately fail `/readyz`, stop accepting new connections (`server.close()`), wait for in-flight requests to complete, close `pool.end()`, and exit `0`.',
      evaluationCriteria: [
        'Distinguishes lightweight liveness from dependency-checking readiness',
        'Orders graceful shutdown steps: unready -> drain HTTP (`server.close`) -> close DB/Redis -> exit',
      ],
      topicIds: ['8.5.5', '8.5.6'],
    },
    {
      id: '8.5-kc-2',
      focusArea: 'Backups, Logs & HTTPS Proxy Termination',
      prompt:
        'Why should containerized backends log JSON to `stdout` instead of `/var/log/app.log`, why must **HTTPS** behind a reverse proxy set `trust proxy`, and what makes a **Managed Postgres backup** incomplete if you have never practiced restoring it?',
      hints: [
        'What happens to files inside a container when the container crashes or gets replaced? Who sees the real client IP if TLS terminates at a Load Balancer?',
        'Think about corrupt backups, missing permissions, or forgotten encryption keys discovered *during* an outage.',
        'Container files vanish on replacement (`stdout` gets collected externally); `trust proxy` preserves client IP/HTTPS protocol behind TLS-terminating load balancers; untested backups can silently fail until verified via restore drills.',
      ],
      explanation:
        'Container filesystems are ephemeral, so shipping structured logs to `stdout` ensures log collectors preserve crash context. When a reverse proxy or load balancer terminates **HTTPS**, it forwards plain HTTP internally with `X-Forwarded-For` / `X-Forwarded-Proto`—enabling `trust proxy` lets rate limiters and `Secure` cookies see real client info. Finally, backups are only trustworthy once tested in an actual restore drill.',
      evaluationCriteria: [
        'Explains stdout log collection vs ephemeral container disk',
        'Explains TLS termination + forwarded headers and restore-testing database backups',
      ],
      topicIds: ['8.5.1', '8.5.2', '8.5.3', '8.5.4', '8.5.7', '8.5.8', '8.5.9'],
    },
  ],
};

export const LESSON_8_5_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Instrument a production Node.js/Express entrypoint with reverse-proxy HTTPS awareness, `/healthz` & `/readyz` probes, `stdout` structured logging, and a zero-drop `SIGTERM`/`SIGINT` graceful shutdown sequence.',
  whenToUseMarkdown:
    'Include this server lifecycle wrapper in every deployed backend API service.',
  setupCommands: [
    {
      id: '8.5-setup-1',
      label: 'Install pino for fast structured JSON logging to stdout',
      command: 'npm install pino',
      notes: 'Pino outputs newline-delimited JSON directly to stdout with minimal event-loop overhead.',
    },
  ],
  coreApisMarkdown: [
    '- **`app.set("trust proxy", 1)`**: Honors `X-Forwarded-Proto` (`https`) and `X-Forwarded-For` from the TLS-terminating Load Balancer.',
    '- **`GET /healthz` / `GET /readyz`**: Separates process liveness from database readiness (`SELECT 1`).',
    '- **`process.on("SIGTERM", shutdown)`**: Triggers drain mode, closes the HTTP server, drains DB/Redis connections cleanly, and enforces a safety timeout.',
    '- **`pino()`**: Streams JSON logs to `stdout` for cloud log aggregation.',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Enable proxy trust, stdout JSON logger, and split Liveness / Readiness endpoints',
      detailMarkdown:
        'Return `503` from `/readyz` both when PostgreSQL is unreachable AND the instant `isShuttingDown` turns `true` (`8.5.5`, `8.5.7`, `8.5.9`).',
      code: {
        id: '8.5-step-1',
        title: 'Health probes + proxy config + structured stdout logs',
        language: 'typescript',
        code: `import express from "express";
import pino from "pino";
import { Pool } from "pg";

export const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

export function createProductionServer(pool: Pool) {
  const app = express();
  let isShuttingDown = false;

  // Behind Load Balancer / Caddy / Nginx terminating HTTPS (8.5.9)
  app.set("trust proxy", 1);

  // Liveness: Is process alive? (No DB query!) (8.5.5)
  app.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "alive" });
  });

  // Readiness: Can we accept live requests right now? (8.5.5)
  app.get("/readyz", async (_req, res) => {
    if (isShuttingDown) {
      return res.status(503).json({ status: "draining" });
    }
    try {
      await pool.query("SELECT 1");
      return res.status(200).json({ status: "ready" });
    } catch {
      return res.status(503).json({ status: "db_unavailable" });
    }
  });

  return { app, markShuttingDown: () => { isShuttingDown = true; } };
}`,
      },
    },
    {
      stepNumber: 2,
      title: 'Implement SIGTERM/SIGINT graceful shutdown with force-exit safety timer',
      detailMarkdown:
        'Wait for `httpServer.close()` so active requests finish, then close Postgres (`pool.end()`), with a hard safety fallback timer (`25s`) before Docker sends `SIGKILL` at `30s` (`8.5.6`).',
      code: {
        id: '8.5-step-2',
        title: 'src/server.ts — zero-drop graceful shutdown',
        language: 'typescript',
        code: `import { Pool } from "pg";
import { createProductionServer, logger } from "./app";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const { app, markShuttingDown } = createProductionServer(pool);
const port = Number(process.env.PORT ?? 3000);

const server = app.listen(port, () => {
  logger.info({ port }, "API listening");
});

async function shutdown(signal: string) {
  logger.info({ signal }, "Graceful shutdown initiated");
  markShuttingDown(); // /readyz immediately begins returning 503

  // Force exit if a hung socket refuses to drain within 25s
  const forceTimer = setTimeout(() => {
    logger.error("Forced exit after shutdown timeout");
    process.exit(1);
  }, 25_000).unref();

  server.close(async () => {
    await pool.end();
    clearTimeout(forceTimer);
    logger.info("HTTP & DB pools closed cleanly");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));`,
      },
    },
    {
      stepNumber: 3,
      title: 'Configure TLS reverse proxy & Managed Postgres PITR verification',
      detailMarkdown:
        'Route custom domain DNS (`api.example.com`) to a TLS-terminating Load Balancer/Caddy proxy (`8.5.9`), enable Managed Postgres daily snapshots + PITR (`8.5.3`, `8.5.8`), and schedule periodic restore drills to staging.',
    },
  ],
  workingExamples: [
    {
      id: '8.5-ex-caddy',
      title: 'Automatic HTTPS reverse proxy configuration (Caddyfile)',
      language: 'text',
      code: `api.example.com {
  reverse_proxy api:3000 {
    health_uri /readyz
    health_interval 5s
  }
}`,
      explanation:
        'Caddy provisions and renews TLS certificates automatically for `api.example.com`, checks `/readyz`, and forwards clean HTTPS headers to port `3000`.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Calling `process.exit(0)` immediately inside `process.on("SIGTERM")` without `server.close()`.',
      fix: 'That kills active requests mid-flight! Always drain `server.close()` first, then close DB/Redis pools.',
    },
    {
      mistake: 'Using `app.set("trust proxy", true)` blindly when directly exposed without a trusted proxy.',
      fix: 'Set `trust proxy` to the exact hop count (`1`) or trusted CIDR subnet so clients cannot spoof `X-Forwarded-For` IPs.',
    },
    {
      mistake: 'Leaving `/readyz` unimplemented so load balancers drop traffic onto warming-up containers.',
      fix: 'Separate `/healthz` (process alive) from `/readyz` (DB reachable and not draining).',
    },
  ],
  exercise: {
    id: '8.5-ex',
    title: 'Wire Health Probes & Graceful Shutdown on a Live Server',
    instructionsMarkdown:
      'Build a bootable `server.ts` module that:\n1. Sets `trust proxy` appropriately for reverse-proxy TLS termination.\n2. Implements separate `/healthz` and `/readyz` routes.\n3. Logs structured JSON events to `stdout`.\n4. Handles `SIGTERM` by failing `/readyz`, draining active connections via `server.close()`, closing the DB pool, and timing out safely if connections hang.',
    acceptanceChecklist: [
      '/healthz returns 200 without hitting Postgres; /readyz checks Postgres + shutdown flag',
      'SIGTERM flips readiness to 503 before draining active connections via server.close()',
      'DB pool closes cleanly before process.exit(0), backed by a fallback force-exit timer',
      'Logs emit JSON to stdout and trust proxy is scoped cleanly',
    ],
  },
};

export const LESSON_8_6_FPT: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Running tests locally on your laptop and typing `docker build` + `ssh deploy` by hand works right up until someone skips tests on a Friday afternoon, commits with a broken migration, or pushes an accidental typo that takes down checkout with no fast way back.',
      'In this unit, we’ll examine **CI/CD (Continuous Integration & Continuous Delivery)** from first principles: **continuous integration**, **continuous delivery**, **build pipelines**, **test automation**, **migration checks**, **deployment automation**, **secrets in CI/CD**, and **rollbacks**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'CI/CD turns software delivery from a stressful manual ritual into a boring, repeatable, auditable pipeline where every single commit is verified automatically before touching users.',
    prerequisites: [
      {
        subBlockId: '8.1',
        label: 'Automated testing suite (8.1, 8.2)',
        detail: 'Having fast deterministic unit/integration tests suitable for automated CI gates.',
      },
      {
        subBlockId: '8.4',
        label: 'Reproducible Docker images (8.4, 8.5)',
        detail: 'Building one immutable artifact that moves cleanly through environments.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-8.6.1',
      topicId: '8.6.1',
      coveredTopicIds: ['8.6.2', '8.6.3', '8.6.4'],
      title: 'Continuous Integration, Continuous Delivery, build pipelines, and test automation',
      problemAndRequirementsMarkdown: [
        '### First principles: Why “wait two weeks and merge everyone’s branches” causes integration hell',
        'Before CI, teams worked on separate branches for weeks, then merged right before release—discovering dozens of broken tests, incompatible API edits, and missing dependencies all at once.',
        'What if **every small pull request** automatically ran lint, type-check, build, and tests in a clean neutral machine before anyone could merge?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### CI vs. CD and how a Build Pipeline works',
        '1. **Continuous Integration (CI)**: Merging small code changes frequently (daily!) into `main`, where an automated server immediately verifies every commit on a clean environment—catching integration bugs within minutes while context is fresh.',
        '2. **Continuous Delivery (CD)**: Extending CI so that **every green commit on `main` produces a tested, deployable artifact ready to ship to production** (either automatically = *Continuous Deployment*, or with one automated click/approval = *Continuous Delivery*).',
        '3. **Build Pipelines & Test Automation**: A pipeline models ordered **quality gates** running from fastest to slowest so failures report early:',
        '   - **Gate 1 (Seconds)**: Lint + TypeScript type check (`tsc --noEmit`) + security audit.',
        '   - **Gate 2 (Seconds)**: Build compilation (`npm run build`) + Unit/Contract tests.',
        '   - **Gate 3 (1–2 min)**: Ephemeral DB Integration tests (Testcontainers Postgres) + Docker image build.',
      ].join('\n\n'),
      centralIdeaSummary:
        'CI catches broken builds and regressions on every commit automatically; CD packages every verified commit into an immutable release candidate ready for safe automated deployment.',
      codeExamples: [],
    },
    {
      id: 'topic-8.6.5',
      topicId: '8.6.5',
      coveredTopicIds: ['8.6.6', '8.6.7', '8.6.8'],
      title: 'Migration checks, deployment automation, secrets in CI/CD, and rollbacks',
      problemAndRequirementsMarkdown: [
        '### First principles: Three things that break automated deployments in real companies',
        '1. **Database mismatch**: Your pipeline builds a flawless API image, deploys it automatically, and crashes because someone added a `DROP COLUMN` migration that broke live `v1` containers during rollout.',
        '2. **Leaked CI credentials**: A malicious or careless pull request from a fork runs `echo $PROD_DEPLOY_KEY` inside a CI job!',
        '3. **Broken release in production**: Despite green tests, `v42` spikes `500` errors on a real customer payload—how fast can you return to `v41`?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Safeguarding migrations, secrets, deploys, and rollbacks',
        '1. **Migration Checks**: Run migrations inside CI against an ephemeral Postgres container (including testing on realistic schema state!) AND lint for destructive locks or expand/contract violations (`5.6`) *before* merge.',
        '2. **Deployment Automation**: Push the exact **immutable image digest (`sha256:...` or git SHA tag)** tested in CI—never rebuild from source on the prod server! Run the pre-traffic migration step, roll out the new containers behind `/readyz` health checks, and verify smoke checks.',
        '3. **Secrets in CI/CD**: Store deploy credentials and API keys in **encrypted CI Secrets / OIDC short-lived federation** (better than static cloud keys!). **Never expose production deploy secrets to untrusted pull-request workflows** (restrict prod secrets strictly to protected `main` / tagged release environments with masked log output).',
        '4. **Rollbacks**: If `v42` misbehaves in production, you must be able to **re-point traffic back to `v41`’s already-built immutable container in under 60 seconds**—which works smoothly *only* if database migrations were **backward-compatible** (expand/contract `5.6`) so `v41` can still read/write the updated schema!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Validate migrations in CI, deploy immutable tested images using scoped/OIDC secrets protected from PRs, and design backward-compatible rollbacks so production can revert in seconds.',
      codeExamples: [],
    },
  ],
  conceptConnection: {
    title: 'End-to-end automated pipeline from Git Push to Production Rollout',
    narrativeMarkdown: [
      'Notice how every concept in `8.6` connects into one deterministic conveyor belt:',
      '1. **PR Opened (CI)**: Fast lint + types → unit/contract tests → Testcontainers integration + migration test. *(No production secrets attached!)*',
      '2. **Merged to `main` (CD)**: Build & tag immutable Docker image once (`sha-9f3a1`) → authenticate via scoped **CI Secret / OIDC** → run backward-compatible **migration check/apply** → roll out `sha-9f3a1` behind `/readyz`.',
      '3. **Safety Net**: Error spike? Instant **rollback** switches traffic right back to `sha-8c20b` safely.',
    ].join('\n\n'),
    integratedExample: {
      id: '8.6-integrated-example',
      title: 'Fast-Fail CI/CD Pipeline Stages & Rollback Loop',
      language: 'text',
      code: `[PR Push] ──▶ Lint & Typecheck ─▶ Unit & Contract Tests ─▶ Postgres Integration + Migration Check
                                                                      │ (Green Merge to main)
                                                                      ▼
[Production] ◀── Health Check Gate ◀── Deploy Image (sha-9f3a1) ◀── Build & Push Image (OIDC Secret)
     │
     └── (Error spike?) ──▶ Instant Rollback to previous immutable image (sha-8c20b)!`,
    },
    walkthroughMarkdown:
      'Switch to the **Recipe** tab to inspect and implement a complete GitHub Actions CI/CD workflow with fast caching, Postgres service tests, OIDC/scoped deploy secrets, and rollback readiness.',
  },
  questions: [
    {
      id: '8.6-kc-1',
      focusArea: 'CI vs CD & Ordered Pipeline Gates',
      prompt:
        'Why should a **CI build pipeline** run lint, type checks, and unit tests *before* booting Testcontainers integration tests and building Docker images—and what is the key difference between **Continuous Integration** and **Continuous Delivery**?',
      hints: [
        'If a teammate misses a semicolon or breaks a TypeScript type, would you rather wait 10 seconds or 4 minutes to find out?',
        'One focuses on integrating/verifying code frequently; the other keeps every verified commit releasable.',
        'Fail-fast ordering saves CI minutes and gives developers feedback in seconds; CI verifies integrated code on every commit, while CD ensures every green build produces a deployable release artifact.',
      ],
      explanation:
        'Ordering fast static checks (`lint`, `tsc`, unit tests) ahead of slower database integration tests and Docker builds implements **fail-fast** feedback—catching obvious errors in seconds instead of wasting compute minutes. **Continuous Integration** automates verifying every merge frequently, while **Continuous Delivery** keeps the main branch continuously packaged and ready to deploy safely.',
      evaluationCriteria: [
        'Explains fail-fast pipeline ordering (seconds-long checks before heavy integration/builds)',
        'Distinguishes CI (frequent verified integration) from CD (ready-to-release packaging/delivery)',
      ],
      topicIds: ['8.6.1', '8.6.2', '8.6.3', '8.6.4'],
    },
    {
      id: '8.6-kc-2',
      focusArea: 'Migrations, Secrets & Rollbacks',
      prompt:
        'Suppose `v42` runs a destructive `DROP COLUMN legacy_name` migration during deployment, and 5 minutes later `v42` crashes in production. Why does your **rollback** to `v41` fail—and why must **CI/CD production secrets** never run on unreviewed pull requests?',
      hints: [
        'Remember what `v41` expects to read/write in the database if you roll the app code back.',
        'What could a public fork or compromised PR commit run inside a CI workflow if prod credentials were injected?',
        'Rolling back app code cannot un-drop a deleted column (`v41` crashes—use expand/contract migrations instead); PRs run arbitrary branch code, so production secrets belong only on protected `main`/release environments via scoped secrets or OIDC.',
      ],
      explanation:
        'Code **rollbacks** redeploy `v41` quickly, *but `v41` still queries `legacy_name`!* If a migration destructively dropped or renamed columns in the same deploy, `v41` breaks on rollback; **migration checks** must enforce backward-compatible expand/contract changes (`5.6`). Meanwhile, **secrets in CI/CD** must be scoped exclusively to protected `main`/deployment environments (ideally using short-lived OIDC tokens) so untrusted PR branches cannot exfiltrate credentials.',
      evaluationCriteria: [
        'Connects backward-compatible migrations to safe instant application rollbacks',
        'Explains protecting production secrets from arbitrary PR branch execution',
      ],
      topicIds: ['8.6.5', '8.6.6', '8.6.7', '8.6.8'],
    },
  ],
};

export const LESSON_8_6_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Implement an automated **GitHub Actions CI/CD pipeline** with fail-fast lint/type/unit stages, ephemeral Postgres integration & migration checks, locked-down deployment secrets, immutable SHA-tagged container builds, and instant rollback capability.',
  whenToUseMarkdown:
    'Add this `.github/workflows/ci-cd.yml` template to every repository before shipping production code.',
  setupCommands: [
    {
      id: '8.6-setup-1',
      label: 'Test full CI check locally before pushing',
      command: 'npm run lint && npm run build && npm test',
      notes: 'Mirror the exact CI commands locally so commits pass on the first run.',
    },
  ],
  coreApisMarkdown: [
    '- **`actions/checkout@v4` & `actions/setup-node@v4` (`cache: npm`)**: Reproducible clean runner with cached npm downloads.',
    '- **`services: postgres` (`pg_isready` health check)**: Spins up real PostgreSQL right inside the CI job for migration & integration tests.',
    '- **`environment: production` + OIDC (`id-token: write`)**: Restricts deployment secrets strictly to protected `main` builds.',
    '- **Image Digest / Git SHA Tag (`${{ github.sha }}`)**: Enables 1-command rollback to any previous green build.',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Configure fast-fail CI gates (Lint -> Typecheck -> Build -> Unit Tests)',
      detailMarkdown:
        'Run on every pull request and push to `main` with **zero production secrets** (`8.6.1`, `8.6.3`, `8.6.4`).',
      code: {
        id: '8.6-step-1',
        title: '.github/workflows/ci-cd.yml (Part 1: Fast CI + DB Migration/Integration)',
        language: 'yaml',
        code: `name: CI / CD Pipeline
on:
  pull_request:
  push:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: ci
          POSTGRES_PASSWORD: ci_password
          POSTGRES_DB: app_test
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint              # Typecheck & lint first (fail fast!)
      - run: npm run build             # Verify compilation
      - run: npm run db:migrate        # Migration check against real Postgres (8.6.5)
        env:
          DATABASE_URL: postgres://ci:ci_password@localhost:5432/app_test
      - run: npm test                  # Automated unit + integration tests (8.6.4)
        env:
          DATABASE_URL: postgres://ci:ci_password@localhost:5432/app_test`,
      },
    },
    {
      stepNumber: 2,
      title: 'Gate CD deployment strictly to `main` with Environment Secrets & immutable SHA tags',
      detailMarkdown:
        'Only run `deploy` after `verify` passes on `main` (`8.6.2`, `8.6.6`, `8.6.7`). Tag the container with `github.sha` so you never deploy mutable `:latest` tags.',
      code: {
        id: '8.6-step-2',
        title: '.github/workflows/ci-cd.yml (Part 2: Protected CD Deploy)',
        language: 'yaml',
        code: `  deploy:
    needs: verify
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    environment: production # Protects secrets & allows optional manual approval (8.6.7)
    permissions:
      id-token: write       # Prefer OIDC short-lived auth over static keys
      contents: read
    steps:
      - uses: actions/checkout@v4
      - name: Build & Push Immutable Image
        run: |
          docker build -t registry.example.com/api:\${{ github.sha }} .
          docker push registry.example.com/api:\${{ github.sha }}
      - name: Run Backward-Compatible Migration & Rollout
        env:
          PROD_DB_URL: \${{ secrets.PROD_DATABASE_URL }}
        run: |
          echo "Run pre-traffic migration job & deploy image \${{ github.sha }}"`,
      },
    },
    {
      stepNumber: 3,
      title: 'Verify post-deploy health and keep a 1-command rollback workflow ready',
      detailMarkdown:
        'After rollout, curl `/readyz` to verify live health; if errors spike, roll back immediately to the previous known-good `PREV_SHA` image (`8.6.8`)—safe because migrations stayed backward-compatible.',
      code: {
        id: '8.6-step-3',
        title: 'Post-deploy smoke check & instant image rollback command',
        language: 'bash',
        code: `# Smoke check after rollout:
curl --fail --retry 5 --retry-delay 3 https://api.example.com/readyz

# Emergency rollback (re-deploys exact previous immutable artifact):
# deploy-cli rollback --image registry.example.com/api:<PREVIOUS_GREEN_SHA>`,
      },
    },
  ],
  workingExamples: [
    {
      id: '8.6-ex-rollback-rule',
      title: 'Pre-merge migration safety checklist',
      language: 'text',
      code: `Can previous container (N-1) keep reading/writing AFTER this migration runs?
  [x] Adding nullable column or default -> SAFE for rollback
  [x] Adding index CONCURRENTLY          -> SAFE for rollback
  [ ] Dropping or renaming column in use -> UNSAFE! Split into two releases (Expand/Contract).`,
      explanation:
        'Checking backward compatibility on every PR ensures automated rollbacks never fail due to missing columns.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Tagging and deploying `:latest` in CI/CD so you can’t tell which exact commit is running or revert cleanly.',
      fix: 'Always tag artifacts with immutable `${{ github.sha }}` (or image digest) so rollbacks point to an exact verified build.',
    },
    {
      mistake: 'Exposing `PROD_DATABASE_URL` or cloud keys at workflow top-level `env:` where `pull_request` jobs can access them.',
      fix: 'Isolate production secrets strictly inside the `deploy` job’s protected `environment: production` after `if: github.ref == \'refs/heads/main\'`.',
    },
    {
      mistake: 'Running `npm install` instead of `npm ci` in CI pipelines.',
      fix: '`npm ci` installs exact locked versions from `package-lock.json` and fails if lockfiles drift.',
    },
  ],
  exercise: {
    id: '8.6-ex',
    title: 'Author a Fail-Fast CI/CD Workflow With Protected Secrets & Rollback Plan',
    instructionsMarkdown:
      'Write a `.github/workflows/ci-cd.yml` file that:\n1. Runs `lint`, `build`, Postgres `db:migrate` check, and `test` on all PRs without prod secrets.\n2. Restricts image push and deployment strictly to `main` inside a protected `production` environment.\n3. Uses immutable `${{ github.sha }}` image tags and includes a post-deploy `/readyz` health gate plus rollback command.',
    acceptanceChecklist: [
      'Pipeline gates ordered fast-to-slow (lint -> build -> DB migration check -> tests)',
      'Production secrets isolated from pull_request jobs via protected environment',
      'Deploys immutable SHA-tagged images (never mutable :latest) with health verification',
      'Documents backward-compatible migration rule enabling instant rollback',
    ],
  },
};
