import { FptLessonContent, RecipeLessonContent } from '../types';

export const LESSON_14_1_FPT: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Your TypeScript API runs great inside Docker—until one Friday night the server stops answering SSH, `ENOSPC: no space left on device` fires even though `df -h` claims 40 GB is free, or systemd kills your server mid-checkout instead of draining active requests.',
      'In this unit, we’ll examine what Linux is actually doing underneath your backend: **processes and signals**, **file permissions**, **networking**, **system services**, **resource limits**, **disk usage**, **logs**, **SSH**, and **server troubleshooting**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Every container, VM, and cloud runtime is still a Linux kernel under the hood. When production catches fire, Linux literacy turns guesswork into a 60-second root-cause diagnosis.',
    prerequisites: [
      {
        subBlockId: '8.1',
        label: 'Containers & Isolation (8.1)',
        detail: 'Understanding Linux namespaces, processes, and cgroup limits.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-14.1.1',
      topicId: '14.1.1',
      coveredTopicIds: ['14.1.2', '14.1.5'],
      title: 'Processes, signals, file permissions, and resource limits',
      problemAndRequirementsMarkdown: [
        '### First principles: How Linux keeps programs alive, separated, and bounded',
        'Every running Node.js server is a kernel **process** identified by a **PID**. When systemd or Kubernetes wants to deploy a new version, it doesn’t magically know where your HTTP server object lives in memory—how does the kernel tell a process *“wrap up politely and exit”* vs. *“die immediately”*?',
        '',
        'At the same time, why shouldn’t an attacker who compromises your web process be able to edit `/etc/shadow` or exhaust all `1024` open file descriptors on the host?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Signals, Ownership, and Kernel Limits',
        '1. **Processes and signals**: Signals are asynchronous software interrupts delivered by the kernel:',
        '   - **`SIGTERM` (15)**: Polite shutdown request. Your Node app catches `process.on("SIGTERM")`, stops accepting new connections, finishes in-flight requests, closes DB pools, and exits `0`.',
        '   - **`SIGKILL` (9)**: Uncatchable kernel termination—used as a last resort if a process ignores `SIGTERM` past the grace period (risks corrupted buffers/dropped users!).',
        '2. **File permissions (`rwx` & user/group)**: Every file and socket has an **owner**, **group**, and **mode bits** (`user`, `group`, `others` for Read `4`, Write `2`, Execute `1`—plus execute `x` on directories means permission to traverse into them). Running services as a dedicated non-root user (`appuser`) limits blast radius (`640` for configs/keys, `600` for SSH private keys).',
        '3. **Resource limits (`ulimit` / `cgroups`)**: Everything in Linux—including **every TCP socket**—consumes a **file descriptor (FD)**. Default `nofile` limits (`1024`) crash busy proxies with `EMFILE: too many open files`, while **cgroups** enforce hard RAM/CPU caps (`OOM killer` strikes if exceeded).',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '14.1.1-ex-1',
            title: 'Handling SIGTERM cleanly before SIGKILL arrives',
            language: 'typescript',
            code: `process.on('SIGTERM', async () => {
  // 1. Stop accepting new TCP connections, finish active HTTP responses
  server.close(async () => {
    await dbPool.end();
    await redis.quit();
    process.exit(0);
  });
});`,
          },
          lineByLineMarkdown: [
            '- **Line 1**: Registers a handler for `SIGTERM`, allowing graceful shutdown instead of mid-request termination.',
            '- **Lines 3–6**: Drains active HTTP sockets first, then closes external connection pools cleanly.',
          ].join('\n'),
        },
      ],
      backendApplicationsMarkdown:
        'Configure non-root container/systemd users, raise `LimitNOFILE=65536` on reverse proxies and APIs, and always handle `SIGTERM` so rolling deploys drop zero requests.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **PID 1 zombie reaping**: Inside minimal containers, `node` running directly as PID 1 ignores default signal behaviors unless you register `SIGTERM` handlers explicitly (or run `tini` / `--init`).',
      ].join('\n\n'),
      centralIdeaSummary:
        'Linux isolates workloads via non-root file permissions and resource limits (file descriptors, memory cgroups), while coordinating clean restarts using catchable SIGTERM signals before resorting to SIGKILL.',
    },
    {
      id: 'topic-14.1.3',
      topicId: '14.1.3',
      coveredTopicIds: ['14.1.4', '14.1.8'],
      title: 'Networking, system services, and SSH',
      problemAndRequirementsMarkdown: [
        '### First principles: Running daemons reliably & accessing servers securely',
        'If you log into a server and type `node dist/server.js`, what happens the second your terminal disconnects or the server reboots? Your API dies! And how do you verify whether port `3000` is actually listening on `0.0.0.0` vs. stuck on `127.0.0.1`?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Keeping Services Alive & Checking Ports Safely',
        '1. **System services (`systemd`)**: Manages background daemons via unit files (`/etc/systemd/system/api.service`)—starting after `network.target`, injecting environment variables, restarting automatically on crash (`Restart=always`), and sending `SIGTERM` on `systemctl stop`.',
        '2. **Linux networking**: Processes bind to an interface IP + port (`127.0.0.1:3000` accepts local host traffic only; `0.0.0.0:3000` accepts external NIC traffic). Inspect live sockets with `ss -tulpn`, DNS resolution with `dig`, and packet paths with `curl -v` / `nc`.',
        '3. **SSH (Secure Shell)**: Encrypted remote administration using **asymmetric key pairs** (public key in `~/.ssh/authorized_keys`, private key guarded locally with `chmod 600`). Disable password logins (`PasswordAuthentication no`) and root SSH logins, and use **SSH port forwarding (`ssh -L`)** to reach private internal databases without opening them to the public internet.',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'Use `systemd` on VM deployments, bind internal services to `127.0.0.1` behind Nginx (`0.0.0.0:443`), and restrict SSH via Bastion/SSM Session Manager with key-only authentication.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **`127.0.0.1` inside Docker**: Binding to `localhost` inside a container prevents Docker/ALB health checks outside the container namespace from reaching the port—containers must bind to `0.0.0.0`.',
      ].join('\n\n'),
      centralIdeaSummary:
        'systemd supervises service lifecycles and restarts, interface binding determines local vs. external socket reachability, and key-based SSH enables encrypted administration and private tunneling.',
    },
    {
      id: 'topic-14.1.6',
      topicId: '14.1.6',
      coveredTopicIds: ['14.1.7', '14.1.9'],
      title: 'Disk usage, logs, and systematic server troubleshooting',
      problemAndRequirementsMarkdown: [
        '### First principles: When a server runs out of disk, inodes, or RAM silently',
        'Imagine `df -h` shows disk at **100%**, so you delete a massive `20 GB` log file (`rm app.log`)—yet `df -h` **still says 100% full**! Why? Because the API process still holds an open file descriptor to that unlinked log file, so the kernel cannot reclaim the disk blocks until the process closes the FD or restarts!',
        '',
        'Or `df -h` shows `50%` disk free, yet `df -i` shows **100% inodes used** from millions of tiny uncleaned temp files—and Postgres refuses to write WAL files.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Disk, Journald Logs, and a 5-Minute Triage Loop',
        '1. **Disk usage**: Distinguish **space (`df -h`, `du -sh *`)**, **inodes (`df -i`)**, and **deleted-but-held files (`lsof +L1`)**. Rotate logs with `logrotate` (`copytruncate` or `SIGUSR1` reopen) rather than deleting open log files.',
        '2. **Logs (`journalctl`)**: `systemd` captures stdout/stderr cleanly in structured journald logs (`journalctl -u api -n 200 --since "10 min ago"`) with built-in size rotation.',
        '3. **Server troubleshooting (USE Method — Utilization, Saturation, Errors)**:',
        '   - Check **what failed**: `systemctl status api` + `journalctl -u api -f` + `dmesg -T` (spot OOM kills!).',
        '   - Check **CPU / RAM / I/O**: `top`/`htop`, `free -m`, `vmstat 1` / `iostat`.',
        '   - Check **Disk & Ports**: `df -h`, `df -i`, `ss -tulpn`.',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'Checking `dmesg -T | grep -i oom` and `df -h && df -i` in the first 30 seconds of an incident immediately resolves two of the most common silent server failures.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Disk-filling debug logs**: Leaving `LOG_LEVEL=debug` enabled in production writes gigabytes per hour—enforce journald max disk caps (`SystemMaxUse=2G`) so logs can never brick the OS partition.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Effective server troubleshooting inspects systemd logs, OOM kernel messages, socket bindings, and both disk bytes and inodes, recognizing that unlinked open files stay allocated until released.',
    },
  ],
  conceptConnection: {
    title: 'The Linux Server Triage Flow',
    narrativeMarkdown: [
      'When a production Linux host misbehaves, walk systematically through four layers instead of guessing randomly:',
      '1. **Service & Logs**: `systemctl status`, `journalctl -u service`, `dmesg -T` (crashes/OOM).',
      '2. **Resources & Limits**: `free -m`, `top`, `ulimit -n`, `df -h`, `df -i`, `lsof +L1`.',
      '3. **Network & Sockets**: `ss -tulpn`, `curl -I localhost:port`, `dig`.',
      '4. **Permissions & Access**: `ls -la` ownership/modes and non-root execution.',
    ].join('\n\n'),
    integratedExample: {
      id: '14.1-integrated-example',
      title: '60-Second Production Linux Triage Script',
      language: 'bash',
      code: `# 1. Service health, recent app logs, and kernel OOM kills
systemctl status api --no-pager
journalctl -u api -n 100 --no-pager
dmesg -T | grep -iE "killed process|out of memory" | tail -n 10

# 2. Disk bytes, inodes, and deleted-but-open files
df -h && df -i && lsof +L1 | head -n 20

# 3. Listening ports & memory
ss -tulpn && free -m`,
    },
    walkthroughMarkdown:
      'Switch to **Recipe Mode** next for ready-to-run `systemd`, `ss`, `chmod`, `ulimit`, `df`, `journalctl`, and SSH commands.',
  },
  questions: [
    {
      id: '14.1-kc-1',
      focusArea: 'Signals, Deleted Open Files & Disk Inodes',
      prompt:
        'You run `rm /var/log/api/huge.log` (`25 GB`) after an out-of-disk alert, yet `df -h` still reports `100%` disk full. Meanwhile another server reports `ENOSPC` even though `df -h` shows `45%` free space. Explain both causes and how to fix each.',
      hints: [
        'When does the Linux kernel actually free disk blocks after `rm` if a process still has the file open?',
        'Besides raw gigabytes, what finite filesystem metadata table runs out when millions of tiny files exist?',
        'In the first case, the running API still holds an open file descriptor to the unlinked log (find via `lsof +L1`, reload/restart gracefully with SIGTERM/logrotate). In the second case, inodes are exhausted (`df -i` at 100%).',
      ],
      explanation:
        '`rm` only unlinks the directory entry; the kernel keeps the `25 GB` allocated until the process holding the **open file descriptor** closes it or restarts cleanly (`lsof +L1` reveals it; reload/restart releases it). For the second server, `ENOSPC` with free gigabytes usually means **100% inode exhaustion** (`df -i`) from millions of tiny temp/session files—clean up the small files.',
      evaluationCriteria: [
        'Explains open file descriptors keeping unlinked file blocks allocated until process close/restart',
        'Identifies inode exhaustion (`df -i`) when free disk space remains',
      ],
      topicIds: ['14.1.1', '14.1.6', '14.1.9'],
    },
    {
      id: '14.1-kc-2',
      focusArea: 'Networking Binding, Permissions, Services & SSH',
      prompt:
        'Your Node.js service starts fine in `systemd`, and `curl http://127.0.0.1:3000/health` succeeds on the server, yet the load balancer health check times out. What two Linux/networking causes should you check first—and why shouldn’t the app run as `root`?',
      hints: [
        'Check which IP address your server bound to (`ss -tulpn`), plus host firewall/security rules.',
        'Consider blast radius if an app dependency has an RCE or path-traversal bug.',
        'Check whether the process bound only to `127.0.0.1` instead of `0.0.0.0` (or firewall blocking port 3000). Running as a non-root user limits file permissions (`rwx`) and prevents attackers from taking over the entire OS.',
      ],
      explanation:
        'Check `ss -tulpn` to confirm the process is listening on `0.0.0.0:3000` (not loopback-only `127.0.0.1:3000`) and check firewall rules on port `3000`. Running the `systemd` service as a dedicated **non-root user** with minimal **file permissions** enforces least privilege so an app vulnerability cannot alter system binaries, SSH keys, or root configs.',
      evaluationCriteria: [
        'Identifies loopback (`127.0.0.1`) vs all-interface (`0.0.0.0`) binding or firewall block',
        'Explains least-privilege blast-radius reduction via non-root file permissions',
      ],
      topicIds: ['14.1.2', '14.1.3', '14.1.4', '14.1.5', '14.1.7', '14.1.8'],
    },
  ],
};

export const LESSON_14_1_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Run, harden, inspect, and troubleshoot Linux backend servers in production using `systemd`, permissions, `ss`, resource limits, disk/inode diagnostics, `journalctl`, and SSH.',
  whenToUseMarkdown:
    'Use whenever provisioning VMs, writing container entrypoints, configuring graceful `SIGTERM` shutdown, locking down SSH/permissions, or triaging a sick Linux host.',
  setupCommands: [
    {
      id: '14.1-cmd-1',
      label: 'Create non-root service user & inspect sockets/limits',
      command: 'sudo useradd --system --no-create-home --shell /usr/sbin/nologin appuser && ss -tulpn',
      notes: 'Runs backend services without root privileges and lists all listening TCP/UDP ports.',
    },
    {
      id: '14.1-cmd-2',
      label: 'Check disk space, inodes, open unlinked files & logs',
      command: 'df -h && df -i && sudo lsof +L1 && journalctl -u backend-api -n 100 --no-pager',
      notes: 'Catches disk exhaustion, inode exhaustion, deleted-yet-open files, and recent service logs.',
    },
  ],
  coreApisMarkdown: [
    '- **Processes & Signals**: `ps aux`, `kill -TERM <pid>`, `kill -KILL <pid>` (last resort), `dmesg -T | grep -i oom`.',
    '- **Permissions**: `chmod 600 ~/.ssh/id_ed25519`, `chown -R appuser:appuser /srv/api`.',
    '- **Services & Limits**: `systemctl enable --now api`, `systemctl reload-or-restart api`, `LimitNOFILE=65536`.',
    '- **SSH Hardening & Tunneling**: `ssh -i ~/.ssh/prod.pem -L 5433:rds.internal:5432 bastion`.',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Harden SSH access & directory permissions',
      detailMarkdown:
        'Ensure SSH private keys are `0600`, disable password/root SSH login in `/etc/ssh/sshd_config`, and assign app directories to a dedicated `appuser`.',
    },
    {
      stepNumber: 2,
      title: 'Configure systemd unit with non-root user and FD limits',
      detailMarkdown:
        'Define `User=appuser`, `LimitNOFILE=65536`, `Restart=on-failure`, and a `TimeoutStopSec=30` grace window so `SIGTERM` drains traffic cleanly.',
    },
    {
      stepNumber: 3,
      title: 'Triage CPU, RAM, sockets, disk, and logs systematically',
      detailMarkdown:
        'Run `systemctl status`, `journalctl -u`, `ss -tulpn`, `free -m`, `df -h`, `df -i`, and `lsof +L1` before restarting blindly so root-cause evidence isn’t lost.',
    },
  ],
  workingExamples: [
    {
      id: '14.1-ex-systemd',
      title: 'Production systemd service unit (/etc/systemd/system/backend-api.service)',
      language: 'ini',
      code: `[Unit]
Description=Backend Forge API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=appuser
Group=appuser
WorkingDirectory=/srv/backend-api
EnvironmentFile=/etc/backend-api/env
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=3
TimeoutStopSec=30
KillSignal=SIGTERM
LimitNOFILE=65536
MemoryMax=1536M

[Install]
WantedBy=multi-user.target`,
      explanation:
        'Runs Node as `appuser`, enforces a 1.5 GB cgroup memory cap and 65k file descriptors, and sends `SIGTERM` with 30 seconds to drain before `SIGKILL`.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Deleting a huge active log file with `rm` expecting disk space back immediately.',
      fix: 'Use `logrotate` with `copytruncate` or send a reopen signal; if already unlinked, check `lsof +L1` and restart/reload the holding process cleanly.',
    },
    {
      mistake: 'Binding a containerized or VM service to `127.0.0.1` when external proxies/containers need to connect.',
      fix: 'Bind to `0.0.0.0` (or the private VPC IP) when reverse proxies or load balancers connect across namespaces/hosts.',
    },
  ],
  exercise: {
    id: '14.1-recipe-ex',
    title: 'Author a Hardened Service & Diagnostic Checklist',
    instructionsMarkdown:
      'Write a `systemd` unit file for a Node.js API listening on port `3000` with non-root execution, `LimitNOFILE=65536`, graceful `SIGTERM` timeout, plus the 4 commands you would run first during an `ENOSPC` / high-latency incident.',
    acceptanceChecklist: [
      'Service runs as non-root `User` with `LimitNOFILE` and `SIGTERM` grace period configured',
      'Environment secrets stored in `0600` EnvironmentFile owned by root/service user',
      'Triage sequence checks `journalctl`, `df -h`, `df -i`, `lsof +L1`, and `ss -tulpn`',
    ],
  },
};

export const LESSON_14_2: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Spinning up servers in the cloud isn’t just picking CPU and RAM—it’s deciding **who can reach what on the network**. Putting your PostgreSQL database on a public IP with `0.0.0.0/0` open is one typo away from an automated ransomware wipe.',
      'In this unit, we’ll trace how cloud packets flow from browser to database through **private and public networks**, **subnets**, **routing**, **firewalls**, **security groups**, **DNS configuration**, **reverse proxies**, **TLS termination**, and **load balancers**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      '90% of “why can’t my API connect to Postgres?” and “why is our admin port exposed to the internet?” mistakes come straight down to subnets, route tables, and security groups.',
    prerequisites: [
      {
        subBlockId: '1.3',
        label: 'DNS, TCP & TLS Basics (1.3)',
        detail: 'How domain names resolve to IPs and TLS encrypts transport.',
      },
      {
        subBlockId: '13.3',
        label: 'Load Balancing & Stateless Services (13.3)',
        detail: 'Spreading HTTP traffic across backend nodes.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-14.2.1',
      topicId: '14.2.1',
      coveredTopicIds: ['14.2.2', '14.2.3'],
      title: 'Private & public networks, subnets, and routing',
      problemAndRequirementsMarkdown: [
        '### First principles: Why every server shouldn’t have a public internet address',
        'Does your PostgreSQL primary or Redis cache ever need a browser in Brazil to open a direct TCP connection to it? **Never!** Only your edge load balancer / reverse proxy needs a public IP. Everything behind it—API servers, background workers, Postgres, Redis—should sit in isolated **private networks** unreachable from the public internet.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Subnets & Route Tables Make “Public vs. Private” Real',
        'A cloud **VPC (Virtual Private Cloud)** divides one private IP range (e.g., `10.0.0.0/16` = 65,536 private IPs) into smaller **subnets** (`10.0.1.0/24` in AZ-a, `10.0.2.0/24` in AZ-b):',
        '- **What actually makes a subnet “public” vs. “private”?** Not its name—its **route table**!',
        '  - A **Public Subnet** has a route `0.0.0.0/0 → Internet Gateway (IGW)` so instances with public IPs can send/receive internet traffic directly.',
        '  - A **Private Subnet** has *no* route to an Internet Gateway! Outbound OS updates or external Stripe API calls route through a **NAT Gateway** sitting in a public subnet (`0.0.0.0/0 → NAT GW`), which allows private nodes to initiate *outbound* connections while blocking unsolicited *inbound* internet traffic completely.',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'Place Application Load Balancers and NAT Gateways in public subnets; place ECS/Kubernetes API containers in private app subnets, and place RDS/ElastiCache in isolated private data subnets.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **NAT Gateway cost & single-AZ risk**: Sending gigabytes of S3 or ECR container pulls through a NAT Gateway adds per-GB charges; use VPC Gateway/Interface Endpoints for AWS-internal traffic and put one NAT GW per AZ for HA.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Subnets partition a private network by CIDR range and Availability Zone, while route tables determine whether a subnet is public (routed via Internet Gateway) or private (no direct inbound internet path).',
    },
    {
      id: 'topic-14.2.4',
      topicId: '14.2.4',
      coveredTopicIds: ['14.2.5'],
      title: 'Firewalls and security groups',
      problemAndRequirementsMarkdown: [
        '### First principles: Subnet isolation isn’t enough inside the network',
        'Suppose both your web tier and your database live inside private subnets. Without per-tier traffic rules, a compromised staging worker could still probe port `5432` on your production database. You need fine-grained packet filtering at both subnet and instance boundaries.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Stateless Firewalls vs. Stateful Security Groups',
        '- **Firewalls / Network ACLs (stateless)**: Filter traffic at the OS (`ufw`/`nftables`) or subnet boundary (`NACL`) by IP/CIDR and port. Being *stateless* means you must explicitly allow *both* inbound port `443` and outbound ephemeral return ports (`1024–65535`).',
        '- **Security Groups (stateful virtual firewalls)**: Attached directly to compute resources (ALB, API containers, RDS). Two superpowers:',
        '  1. **Stateful**: If inbound port `443` is allowed, the return response packet is *automatically* allowed out.',
        '  2. **Identity chaining**: Instead of hardcoding fragile IPs, `db-sg` allows inbound TCP `5432` **only from `api-sg`**! Even as API containers autoscale across changing private IPs, only instances wearing `api-sg` can reach Postgres.',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '14.2.5-ex-1',
            title: 'Least-privilege Security Group chaining across 3 tiers',
            language: 'text',
            code: `[Internet 0.0.0.0/0] ──(443)──▶ [alb-sg]
                                   │ (HTTP 3000 only from alb-sg)
                                   ▼
                               [api-sg]
                                   │ (TCP 5432 only from api-sg)
                                   ▼
                                [db-sg]`,
          },
          lineByLineMarkdown: [
            '- **Layer 1**: Only `alb-sg` accepts public `443` traffic.',
            '- **Layer 2 & 3**: `api-sg` refuses direct internet connections; `db-sg` only accepts `5432` from instances in `api-sg`.',
          ].join('\n'),
        },
      ],
      backendApplicationsMarkdown:
        'Default-deny all inbound traffic on every security group, chain `alb-sg → api-sg → db-sg`, and never expose ports `5432` (Postgres), `6379` (Redis), or `22` (SSH) to `0.0.0.0/0`.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Allow-list vs. Deny rules**: Security groups are purely *allow-only* (deny everything not explicitly allowed); use stateless NACLs when you need explicit *deny* rules against an abusive IP block.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Firewalls filter packets by IP/port rules, while stateful security groups protect cloud resources by chaining tier identities (ALB → API → DB) without brittle IP allowlists.',
    },
    {
      id: 'topic-14.2.6',
      topicId: '14.2.6',
      coveredTopicIds: ['14.2.7', '14.2.8', '14.2.9'],
      title: 'DNS configuration, reverse proxies, TLS termination, and load balancers',
      problemAndRequirementsMarkdown: [
        '### First principles: Why browsers shouldn’t talk straight to `node:3000`',
        'Even if a client resolves `api.example.com`, you rarely want browsers completing expensive TLS handshakes straight against 20 different Node.js processes—nor renewing SSL certificates across 20 containers.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The Edge Delivery Stack',
        '1. **DNS configuration**: Maps human names to infrastructure endpoints (`A`/`AAAA` records to fixed IPs, `CNAME` / Cloud `ALIAS` records to dynamic Load Balancer DNS names). Short **TTL** (`60s`–`300s`) enables fast DNS failovers; internal **Private Hosted Zones** resolve `db.internal` solely inside your VPC.',
        '2. **Load balancers**: Sit across multiple Availability Zones, monitor target `/healthz` probes, and distribute traffic across healthy backend instances (`13.3`).',
        '3. **Reverse proxies (`Nginx`, `Caddy`, `Envoy`)**: Accept client connections on behalf of backend servers—handling gzip/Brotli compression, connection buffering (protecting Node from slow mobile clients!), static assets, rate limits, and routing `/api` vs `/ws`.',
        '4. **TLS termination**: Decrypts HTTPS (`TLS 1.3`) at the Load Balancer or Reverse Proxy using managed certificates (ACM / Let’s Encrypt), then forwards plain HTTP (or re-encrypted internal mTLS) over the private VPC—adding `X-Forwarded-For` (real client IP) and `X-Forwarded-Proto: https` headers.',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'Always configure Express/Fastify with `trust proxy` scoped to your load balancer/VPC so rate limiters and audit logs read `X-Forwarded-For` accurately without letting attackers spoof headers.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Spoofable `X-Forwarded-For`**: If your Node server is reachable *without* going through the reverse proxy/LB (or you set `app.set("trust proxy", true)` blindly), clients can forge `X-Forwarded-For` to bypass IP rate limits (`10.5`). Trust only your known proxy hop count or VPC CIDR.',
      ].join('\n\n'),
      centralIdeaSummary:
        'DNS directs users to highly available load balancers and reverse proxies that terminate TLS centrally, buffer slow clients, and forward verified traffic cleanly into private backend subnets.',
    },
  ],
  conceptConnection: {
    title: 'End-to-End Packet Journey in Production',
    narrativeMarkdown: [
      'Every piece of `14.2` connects in order along one HTTPS request:',
      '1. **DNS** resolves `api.acme.com` → **Public Subnet Load Balancer**.',
      '2. **Load Balancer / Reverse Proxy** passes **Firewall/Security Group (`443`)**, performs **TLS Termination**, and inspects **Route Table** to reach **Private Subnet**.',
      '3. **API Container** passes `api-sg`, queries **RDS** in an isolated **Private Subnet** allowed strictly via **`db-sg`**, and replies back out.',
    ].join('\n\n'),
    integratedExample: {
      id: '14.2-integrated-example',
      title: 'Production VPC & Edge Routing Map',
      language: 'text',
      code: `Browser ─(DNS api.acme.com)─▶ Public Subnet [ALB / Nginx: TLS Termination on :443]
                                    │ (Private VPC Route + Security Group api-sg:3000)
                                    ▼
                              Private App Subnet [Node API Instances]
                                    │ (Security Group db-sg:5432)
                                    ▼
                              Private Data Subnet [Postgres / Redis]`,
    },
    walkthroughMarkdown:
      'Notice how zero application servers or databases ever hold a public IP—and yet external traffic reaches them cleanly through controlled gateways.',
  },
  questions: [
    {
      id: '14.2-kc-1',
      focusArea: 'Private Subnets, Routing & Security Groups',
      prompt:
        'What technically separates a **public subnet** from a **private subnet** in a cloud VPC, and why is chaining **security groups (`alb-sg → api-sg → db-sg`)** superior to hardcoding backend IP addresses?',
      hints: [
        'Look at each subnet’s route table destination for `0.0.0.0/0`.',
        'Think about what happens to private IP addresses when autoscaling replaces containers every hour.',
        'A public subnet’s route table sends `0.0.0.0/0` to an Internet Gateway, while a private subnet has no direct route to an IGW (using a NAT Gateway for outbound-only). Security group chaining dynamically authorizes instances by role regardless of ephemeral IPs during autoscaling.',
      ],
      explanation:
        'A **public subnet** routes `0.0.0.0/0` directly to an Internet Gateway, whereas a **private subnet** omits any IGW route (routing outbound requests via a NAT Gateway instead). Chaining **security groups** (`db-sg` allows `5432` from `api-sg`) adapts automatically as containers autoscale with changing IPs while blocking every other tier by default.',
      evaluationCriteria: [
        'Distinguishes public vs private subnets by route table target (IGW vs NAT/none)',
        'Explains stateful security-group chaining vs brittle ephemeral IPs',
      ],
      topicIds: ['14.2.1', '14.2.2', '14.2.3', '14.2.4', '14.2.5'],
    },
    {
      id: '14.2-kc-2',
      focusArea: 'DNS, Reverse Proxies, TLS Termination & Load Balancers',
      prompt:
        'Why do production backends terminate **TLS** at a **load balancer** or **reverse proxy** rather than inside every Node.js container, and what header/trust mistake breaks IP rate limiting when a proxy sits in front?',
      hints: [
        'Think about certificate management, slow-client buffering, and what `req.ip` equals behind a proxy.',
        'What happens if Express either ignores `X-Forwarded-For` or blindly trusts any client-supplied header?',
        'Central TLS termination simplifies certificate rotation and offloads TLS/slow clients from Node. Behind a proxy, `req.ip` becomes the proxy’s private IP unless `trust proxy` reads `X-Forwarded-For`—and trusting arbitrary hops lets attackers spoof it.',
      ],
      explanation:
        'Terminating **TLS** at the **load balancer / reverse proxy** centralizes certificate renewal (ACM/Let’s Encrypt), offloads crypto/slow-client buffering, and keeps internal routing uniform. Behind a proxy, backend apps see the proxy’s IP unless configured to read `X-Forwarded-For`—so configure `trust proxy` strictly for your load balancer tier to avoid IP spoofing.',
      evaluationCriteria: [
        'Explains centralized cert management, offloading, and buffering at LB/reverse proxy',
        'Explains `X-Forwarded-For` and strict `trust proxy` configuration',
      ],
      topicIds: ['14.2.6', '14.2.7', '14.2.8', '14.2.9'],
    },
  ],
};

export const LESSON_14_3_FPT: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'AWS exposes over 200 services, which makes beginners feel like they have to memorize an alphabet soup. In reality, **80% of production backends run on the same dozen core primitives** working together seamlessly.',
      'In this unit, we’ll connect those building blocks by the exact job each one performs: **IAM**, **VPC**, **EC2**, **S3**, **RDS**, **Application Load Balancer**, **CloudWatch**, **SQS and SNS**, **ElastiCache**, **ECS with Fargate**, **Secrets Manager**, and **Availability Zones & Regions**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Knowing *why* you choose Fargate vs. EC2, SQS vs. SNS, and IAM Roles vs. hardcoded API keys lets you design resilient, least-privilege cloud systems without racking up surprise bills.',
    prerequisites: [
      {
        subBlockId: '14.2',
        label: 'Networking Infrastructure (14.2)',
        detail: 'Subnets, route tables, security groups, and TLS termination.',
      },
      {
        subBlockId: '9.5',
        label: 'Object Storage & Queues (9.5)',
        detail: 'Why stateless servers offload files to S3 and jobs to queues.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-14.3.1',
      topicId: '14.3.1',
      coveredTopicIds: ['14.3.2', '14.3.11', '14.3.12'],
      title: 'Regions, Availability Zones, VPC, IAM, and Secrets Manager',
      problemAndRequirementsMarkdown: [
        '### First principles: Physical resilience & zero-trust access',
        'Before launching a single container, you must answer three foundational questions: **Where** does the hardware physically live if a data center floods? **How** do containers talk to AWS S3 without pasting `AWS_SECRET_ACCESS_KEY` into `.env`? And **where** do database passwords live safely?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Geography, Identity, and Secrets',
        '- **Regions & Availability Zones (AZs)**: A **Region** (`us-east-1`, `eu-central-1`) is a geographic cluster of 3+ isolated **Availability Zones**—physically separate data centers with independent power/cooling linked by sub-2ms fiber. Always span workloads across **2–3 AZs** for high availability (`Multi-AZ`), and pick Regions close to users or compliance boundaries (GDPR).',
        '- **VPC**: Your private isolated network (`14.2`) spanning multiple AZs within a Region, containing public subnets (ALB/NAT) and private subnets (ECS/RDS).',
        '- **IAM (Identity & Access Management)**: Controls *who can call which AWS API on what resource*. Follow **least privilege**: never hand apps long-lived IAM User access keys! Attach an **IAM Role** directly to your ECS task or EC2 instance so AWS STS issues short-lived auto-rotating credentials automatically.',
        '- **Secrets Manager**: Stores encrypted runtime secrets (DB passwords, Stripe keys) with IAM-gated access and optional automatic RDS password rotation—keeping secrets out of Git, container images, and plain env templates.',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '14.3.1-ex-1',
            title: 'IAM Role credential-free SDK usage vs. risky static access keys',
            language: 'typescript',
            code: `import { S3Client } from '@aws-sdk/client-s3';

// Fragile & risky: baked-in static IAM user keys never expire if leaked
// const s3Bad = new S3Client({ credentials: { accessKeyId: 'AKIA...', secretAccessKey: '...' } });

// Production AWS: ECS Task IAM Role injects auto-rotating short-lived STS tokens via metadata
const s3Safe = new S3Client({ region: process.env.AWS_REGION });`,
          },
          lineByLineMarkdown: [
            '- **Lines 3–4**: Static `AKIA...` keys stay valid until manually revoked if accidentally committed or leaked.',
            '- **Lines 6–7**: Passing no static keys lets the SDK pull short-lived, auto-rotated STS credentials directly from the attached **IAM Task Role**.',
          ].join('\n'),
        },
      ],
      backendApplicationsMarkdown:
        'Attach an IAM Task Role granting strictly `s3:PutObject` on `arn:aws:s3:::acme-uploads/*` and `secretsmanager:GetSecretValue` on your single production secret—never `Action: "*"`!',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Cross-AZ data transfer**: Spreading nodes across AZs keeps you alive during a building outage, though noisy cross-AZ chatter (like chatty service meshes or un-cached DB loops) incurs minor AWS inter-AZ per-GB fees.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Multi-AZ Regions and VPC subnets provide physical and network isolation, IAM Roles provide credential-free least-privilege authorization, and Secrets Manager secures and rotates sensitive runtime credentials.',
    },
    {
      id: 'topic-14.3.3',
      topicId: '14.3.3',
      coveredTopicIds: ['14.3.6', '14.3.7', '14.3.10'],
      title: 'Compute, Ingress & Telemetry: EC2, ECS with Fargate, ALB, and CloudWatch',
      problemAndRequirementsMarkdown: [
        '### First principles: Virtual servers vs. serverless containers',
        'Launching a raw Linux VM (**EC2**) gives you total OS control—which also means *you* patch kernels, manage AMIs, rotate SSH access, and right-size EC2 cluster capacity. What if you just want to hand AWS your Docker image and say *“run 4 copies across 2 AZs behind HTTPS”*?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Running & Monitoring Backend Compute',
        '- **EC2 (Elastic Compute Cloud)**: Virtual Linux servers—best when you need custom kernels, GPU workloads, persistent local NVMe disks, or tight host cost optimization.',
        '- **ECS with Fargate**: **ECS** is AWS’s native container orchestrator; **Fargate** runs each container task serverless without you provisioning or patching underlying EC2 hosts. Define CPU/RAM (`512 CPU / 1024 MB`), attach an IAM Role, and ECS handles placement and autoscaling.',
        '- **Application Load Balancer (ALB)**: Layer-7 HTTPS load balancer (`14.2`) terminating TLS with ACM certificates, routing paths (`/api/*` vs `/admin/*`), and health-checking Fargate tasks across multiple AZs.',
        '- **CloudWatch**: Aggregates container `stdout` logs (Logs), CPU/memory/5xx counters (Metrics), and threshold paging (Alarms).',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'For most TypeScript/Node backend services, **ALB + ECS Fargate across 2+ AZs + CloudWatch** hits the sweet spot: zero OS patching, zero Kubernetes cluster control-plane overhead, and instant autoscaling.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Fargate vs. EC2 cost**: Fargate carries a ~15–25% per-vCPU premium over raw EC2/Savings Plans—worth it for ops simplicity early on, easy to mix with EC2 capacity providers at huge steady scale.',
      ].join('\n\n'),
      centralIdeaSummary:
        'ALB routes HTTPS across Availability Zones to serverless containers on ECS Fargate (or raw EC2 VMs when host control is needed), while CloudWatch centralizes logs, metrics, and alarms.',
    },
    {
      id: 'topic-14.3.4',
      topicId: '14.3.4',
      coveredTopicIds: ['14.3.5', '14.3.8', '14.3.9'],
      title: 'Managed Data & Messaging: S3, RDS, ElastiCache, SQS, and SNS',
      problemAndRequirementsMarkdown: [
        '### First principles: Why you don’t self-host Postgres or Redis on raw EC2 unless forced',
        'Running stateful databases on a single EC2 volume means *you* wake up at 4 AM for OS upgrades, failover promotion, point-in-time WAL backups, and disk expansion. AWS managed services automate the undifferentiated heavy lifting.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The Five Core Managed Stateful Services',
        '- **S3 (Simple Storage Service)**: Virtually unlimited durable (`99.999999999%` / 11-nines) object storage (`9.5`) for user uploads, backups, and static assets—accessed via pre-signed URLs so large files bypass your API containers.',
        '- **RDS (Relational Database Service)**: Managed PostgreSQL/MySQL handling automated backups, point-in-time recovery, storage scaling, **Multi-AZ synchronous standby failover**, and **Read Replicas** (`13.2`).',
        '- **ElastiCache**: Managed in-memory **Redis** (Valkey) cluster inside your private subnets for sub-millisecond caching (`10.3`), rate limiting (`10.5`), and WebSocket pub/sub (`11.2`).',
        '- **SQS and SNS**:',
        '  - **SQS (Simple Queue Service)**: Managed durable **point-to-point queue** (`9.2`)—workers pull jobs at their own pace with visibility timeouts and built-in **Dead-Letter Queues (DLQ)**.',
        '  - **SNS (Simple Notification Service)**: Managed **pub/sub fan-out topic** (`11.3`)—pushing 1 `OrderPaid` event simultaneously into 3 independent SQS queues (Billing, Email, Analytics) cleanly!',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'Pair **SNS → multiple SQS queues** for fan-out reliability: SNS broadcasts an event to multiple downstream subscribers, and each subscriber’s SQS queue buffers spikes and retries independently with its own DLQ.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **RDS Multi-AZ standby is NOT a read replica**: An RDS Multi-AZ standby stays hot purely for automatic failover; to offload `SELECT` traffic you must provision a separate **Read Replica**.',
      ].join('\n\n'),
      centralIdeaSummary:
        'AWS managed data and messaging services—S3 for objects, RDS for Multi-AZ SQL, ElastiCache for Redis, and SNS fan-out into durable SQS worker queues—automate backups, failover, and durable decoupling.',
    },
  ],
  conceptConnection: {
    title: 'Standard Production AWS Reference Architecture',
    narrativeMarkdown: [
      'Put all 12 AWS concepts together into one cohesive production blueprint:',
      '- **Region (2 AZs)** inside a **VPC** (`Public` + `Private` subnets).',
      '- **ALB** terminates TLS → forwards to **ECS Fargate** containers running with least-privilege **IAM Role** and **Secrets Manager** credentials.',
      '- **Fargate** reads/writes **RDS** + **ElastiCache** + **S3**, publishes events via **SNS → SQS** to background Fargate workers, and ships telemetry to **CloudWatch**.',
    ].join('\n\n'),
    integratedExample: {
      id: '14.3-integrated-example',
      title: '12-Service AWS Backend Topology',
      language: 'text',
      code: `Users ─▶ [ALB (Public Subnets, Multi-AZ)]
             │
             ▼ (Private Subnets)
        [ECS Fargate API] ──(IAM Role)──▶ [S3] & [Secrets Manager] & [CloudWatch]
             ├──▶ [ElastiCache Redis]
             ├──▶ [RDS PostgreSQL (Multi-AZ + Read Replica)]
             └──▶ [SNS Topic] ──▶ [SQS Queue + DLQ] ──▶ [ECS Fargate Worker]`,
    },
    walkthroughMarkdown:
      'Switch to **Recipe Mode** for step-by-step IAM policy JSON, SNS→SQS fan-out wiring, Secrets Manager retrieval, and S3 pre-signed URL setup.',
  },
  questions: [
    {
      id: '14.3-kc-1',
      focusArea: 'IAM, VPC, Multi-AZ & Secrets Manager',
      prompt:
        'A backend team hardcodes `AWS_ACCESS_KEY_ID` and `DB_PASSWORD` into their Dockerfile, and deploys RDS + Fargate into a single Availability Zone. Identify three security/resilience flaws and the exact AWS mechanisms that fix them.',
      hints: [
        'What replaces static IAM User keys inside ECS/EC2? Where do DB passwords belong?',
        'What happens to uptime if that single data center loses power?',
        'Replace static IAM keys with an IAM Task Role (short-lived STS credentials); move `DB_PASSWORD` to Secrets Manager (gated by IAM); deploy Fargate tasks and RDS Multi-AZ across 2+ Availability Zones inside private VPC subnets.',
      ],
      explanation:
        '(1) Static IAM keys baked into images leak easily—attach a least-privilege **IAM Role** to the Fargate task instead. (2) Passwords in Dockerfiles expose credentials in layer history—store them in **Secrets Manager** and fetch at startup/rotation. (3) Single-AZ deployment creates a single point of failure—run **ECS Fargate** and **RDS Multi-AZ** across at least two **Availability Zones** in private **VPC** subnets.',
      evaluationCriteria: [
        'Replaces static IAM keys with IAM Roles',
        'Replaces hardcoded secrets with Secrets Manager and prescribes Multi-AZ private subnet deployment',
      ],
      topicIds: ['14.3.1', '14.3.2', '14.3.5', '14.3.10', '14.3.11', '14.3.12'],
    },
    {
      id: '14.3-kc-2',
      focusArea: 'Compute, Caching, Storage & SQS/SNS Fan-Out',
      prompt:
        'When a user uploads a video and completes an order, three independent systems (Transcoding, Email, Analytics) must react reliably—without blocking HTTP or routing multi-GB uploads through API containers. Design the AWS service flow using **S3**, **ALB**, **Fargate**, **ElastiCache**, **SNS**, **SQS**, and **CloudWatch**.',
      hints: [
        'How should multi-GB uploads bypass Fargate RAM/bandwidth?',
        'How do you broadcast one event reliably to 3 independent queues with retry + DLQ isolation?',
        'Clients upload straight to S3 via pre-signed URLs issued by ALB -> Fargate (cached session checks in ElastiCache). API publishes 1 OrderCreated event to SNS, fanning out to 3 dedicated SQS queues (each with DLQs) consumed by Fargate workers, monitored via CloudWatch.',
      ],
      explanation:
        'Traffic enters via **ALB** to **ECS Fargate** (checking auth/rate limits via **ElastiCache** and monitoring health/latency in **CloudWatch**; **EC2** only if specialized GPU transcoding hosts are needed). Fargate issues a pre-signed **S3** URL so large videos upload directly to S3. On completion, the API publishes once to **SNS**, which fans out into three separate **SQS** queues (plus DLQs) so Transcoding, Email, and Analytics scale and retry independently.',
      evaluationCriteria: [
        'Offloads large uploads directly to S3 via pre-signed URLs',
        'Uses SNS fan-out to independent SQS queues/DLQs plus ALB, Fargate, ElastiCache, and CloudWatch accurately',
      ],
      topicIds: ['14.3.3', '14.3.4', '14.3.6', '14.3.7', '14.3.8', '14.3.9'],
    },
  ],
};

export const LESSON_14_3_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Wire core AWS backend primitives securely: least-privilege IAM Task Roles, Secrets Manager runtime loading, S3 pre-signed URLs, and an SNS → SQS fan-out pipeline with a Dead-Letter Queue.',
  whenToUseMarkdown:
    'Use when deploying containerized backends onto AWS ECS Fargate + RDS + ElastiCache + S3 + SQS/SNS across Multi-AZ private VPC subnets.',
  setupCommands: [
    {
      id: '14.3-cmd-1',
      label: 'Create SQS DLQ, main queue, and subscribe to SNS topic',
      command:
        'aws sqs create-queue --queue-name orders-email-dlq && aws sns create-topic --name order-events',
      notes: 'Always pair every worker SQS queue with a RedrivePolicy Dead-Letter Queue.',
    },
    {
      id: '14.3-cmd-2',
      label: 'Tail ECS Fargate logs in CloudWatch',
      command: 'aws logs tail /ecs/backend-api --follow --since 15m',
      notes: 'Streams structured application stdout logs directly from CloudWatch Logs.',
    },
  ],
  coreApisMarkdown: [
    '- **IAM Role (`ecsTaskRole`)**: Grants minimum permissions (`s3:PutObject`, `sns:Publish`, `secretsmanager:GetSecretValue`) with zero long-lived access keys.',
    '- **VPC + ALB + Fargate**: ALB in public subnets routes HTTPS `:443` → Fargate tasks in private subnets (`api-sg`) → RDS/ElastiCache (`db-sg`) across `>= 2` Availability Zones.',
    '- **SNS + SQS**: `sns.publish()` fans out 1 domain event to N isolated SQS queues; each SQS worker uses `sqs.receiveMessage()` + `deleteMessage()`.',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Store DB/API credentials in Secrets Manager & scope IAM Role',
      detailMarkdown:
        'Create `/prod/backend/db` in Secrets Manager and attach an IAM Task Role allowing read access solely to that secret ARN, your S3 bucket prefix, and your SNS topic.',
    },
    {
      stepNumber: 2,
      title: 'Place compute and state in Multi-AZ private VPC subnets behind ALB',
      detailMarkdown:
        'Terminate ACM TLS certificates at the Application Load Balancer in public subnets; run Fargate, RDS Multi-AZ, and ElastiCache in private subnets chained by Security Groups.',
    },
    {
      stepNumber: 3,
      title: 'Wire CloudWatch alarms + SNS-to-SQS fan-out with DLQ',
      detailMarkdown:
        'Emit domain events to SNS topics subscribed by per-consumer SQS queues with `maxReceiveCount: 5` redrive to DLQs, and alarm in CloudWatch on `ApproximateNumberOfMessagesVisible` in any DLQ.',
    },
  ],
  workingExamples: [
    {
      id: '14.3-ex-iam',
      title: 'Least-privilege ECS Task IAM Policy JSON',
      language: 'json',
      code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::acme-prod-uploads/*"
    },
    {
      "Effect": "Allow",
      "Action": "sns:Publish",
      "Resource": "arn:aws:sns:us-east-1:123456789012:order-events"
    },
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:/prod/backend/*"
    }
  ]
}`,
      explanation:
        'Restricts both actions and exact resource ARNs so compromised code cannot touch billing, IAM, or unrelated buckets.',
    },
    {
      id: '14.3-ex-sns',
      title: 'Publishing an event to SNS using IAM Task Role credentials',
      language: 'typescript',
      code: `import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const sns = new SNSClient({ region: process.env.AWS_REGION });

export async function publishOrderPlaced(orderId: string, traceId: string) {
  await sns.send(
    new PublishCommand({
      TopicArn: process.env.ORDER_EVENTS_TOPIC_ARN,
      Message: JSON.stringify({ eventType: 'OrderPlaced', orderId }),
      MessageAttributes: {
        traceId: { DataType: 'String', StringValue: traceId },
      },
    })
  );
}`,
      explanation:
        'Notice zero AWS access keys in code—the AWS SDK automatically reads short-lived Task Role credentials from the ECS metadata endpoint.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Putting EC2/Fargate containers or RDS directly into public subnets or granting `AmazonS3FullAccess`.',
      fix: 'Keep compute and databases in private subnets behind an ALB and scope IAM Role permissions to exact resource ARNs.',
    },
    {
      mistake: 'Confusing RDS Multi-AZ Standby with a Read Replica.',
      fix: 'Enable Multi-AZ for automatic failover high availability, and provision an explicit Read Replica if you need horizontal read scaling.',
    },
  ],
  exercise: {
    id: '14.3-recipe-ex',
    title: 'Design a Least-Privilege Multi-AZ AWS Blueprint',
    instructionsMarkdown:
      'Draft an IAM Task Policy JSON and an architecture diagram mapping ALB, ECS Fargate, RDS Multi-AZ, ElastiCache, S3, Secrets Manager, SNS→SQS+DLQ, and CloudWatch across public vs. private subnets in 2 Availability Zones.',
    acceptanceChecklist: [
      'ALB sits in public subnets; Fargate, RDS, and ElastiCache sit in private subnets across >= 2 AZs',
      'No static IAM keys—ECS uses IAM Task Role + Secrets Manager ARN scoping',
      'Event fan-out uses SNS subscribed by isolated SQS queues with DLQs and CloudWatch alarms',
    ],
  },
};
