import { FptLessonContent, RecipeLessonContent } from '../types';

export const LESSON_14_4_FPT: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Click through the AWS console to build a VPC, 4 subnets, 3 security groups, an ALB, an RDS instance, and 2 ECS services—and it works! Now your CTO says: *“Great, clone the exact same setup into `staging` and `eu-west-1` by Friday, and tell me who changed the DB security group yesterday.”*',
      'Clicking in a web dashboard (**ClickOps**) breaks completely at that moment. In this unit, we’ll examine **why manual infrastructure breaks**, **declarative infrastructure**, **Terraform providers**, **resources**, **variables**, **outputs**, **modules**, **state management**, and **infrastructure drift**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Infrastructure as Code turns cloud architecture into versioned, peer-reviewed, repeatable files—eliminating “works in staging, missing a firewall rule in prod” outages.',
    prerequisites: [
      {
        subBlockId: '14.3',
        label: 'AWS Architecture (14.3)',
        detail: 'Knowing the cloud primitives (VPC, RDS, IAM, ECS) you are provisioning.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-14.4.1',
      topicId: '14.4.1',
      coveredTopicIds: ['14.4.2'],
      title: 'Why manual configuration fails & declarative infrastructure',
      problemAndRequirementsMarkdown: [
        '### First principles: ClickOps & brittle shell scripts',
        'If you configure 30 cloud resources manually in a browser, you get zero audit trail, zero peer review, hidden tribal knowledge, and subtle inconsistencies between staging and production.',
        '',
        'Trying to automate it with **imperative bash scripts** (`aws ec2 create-vpc ...`) introduces a subtler problem: *what happens if you run the script a second time after editing line 14?* It crashes trying to create a duplicate VPC, or forgets to delete an old security group rule you removed!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Why Declarative Infrastructure Wins',
        'Instead of writing *step-by-step commands* (**imperative**), **declarative Infrastructure as Code (IaC)** lets you describe the **desired end state**: *“There should exist a VPC `10.0.0.0/16` and an RDS Postgres 16 instance `db.t4g.medium`.”*',
        '',
        'The IaC engine (like Terraform / OpenTofu) compares **what currently exists** against **your desired code**, generates an explicit **`plan`** (`+ create 1, ~ update in-place 2, - destroy 0`) you can review in a Pull Request *before* changing a single production resource, and applies only the minimal diff!',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'Every production VPC, IAM role, RDS instance, and queue lives in Git-reviewed Terraform code—allowing identical `dev`, `staging`, and `prod` environments from one blueprint.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Plan before Apply (Destructive replacements)**: Changing certain attributes (like an RDS engine or subnet CIDR) forces Terraform to **destroy and recreate** the resource (`-/+`). Always read `terraform plan` carefully before applying!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Manual infrastructure lacks repeatability and reviewability, whereas declarative IaC specifies the desired end state so tools compute safe diffs and preview plans before modifying live cloud resources.',
    },
    {
      id: 'topic-14.4.3',
      topicId: '14.4.3',
      coveredTopicIds: ['14.4.4', '14.4.5', '14.4.6', '14.4.7'],
      title: 'Terraform providers, resources, variables, outputs, and modules',
      problemAndRequirementsMarkdown: [
        '### First principles: Building reusable cloud blueprints without copy-paste',
        'How does one HCL tool talk to AWS, Cloudflare DNS, and GitHub repositories—and how do you reuse your battle-tested VPC + ECS pattern across 5 microservices without duplicating 800 lines of HCL?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Core Terraform Building Blocks',
        '- **Providers**: Plugins (`hashicorp/aws`, `cloudflare/cloudflare`) that translate HCL declarations into actual vendor API calls.',
        '- **Resources**: The concrete infrastructure objects you create (`aws_vpc`, `aws_db_instance`, `aws_sqs_queue`). Terraform builds a dependency graph (DAG) automatically when one resource references another (`vpc_id = aws_vpc.main.id`).',
        '- **Variables (`input`)**: Parameterize differences across environments (`env = "prod"`, `instance_class = "db.r6g.large"` vs `"db.t4g.micro"`).',
        '- **Outputs**: Expose values produced after creation (e.g., `alb_dns_name`, `rds_endpoint`) for engineers or other stacks to consume.',
        '- **Modules**: Reusable packages bundling resources, variables, and outputs (e.g., a `modules/backend-service` folder invoked once per environment or service) so fixes propagate consistently everywhere.',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '14.4.4-ex-1',
            title: 'Connecting provider, variables, resources, and outputs in HCL',
            language: 'hcl',
            code: `provider "aws" {
  region = var.aws_region
}

variable "env" {
  type = string
}

resource "aws_sqs_queue" "jobs_dlq" {
  name                      = "\${var.env}-jobs-dlq"
  message_retention_seconds = 1209600
}

resource "aws_sqs_queue" "jobs" {
  name = "\${var.env}-jobs"
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.jobs_dlq.arn
    maxReceiveCount     = 5
  })
}

output "jobs_queue_url" {
  value = aws_sqs_queue.jobs.url
}`,
          },
          lineByLineMarkdown: [
            '- **Lines 1–7**: Configures the AWS provider and environment variable.',
            '- **Lines 9–20**: Referencing `aws_sqs_queue.jobs_dlq.arn` tells Terraform automatically to create `jobs_dlq` *before* `jobs`.',
          ].join('\n'),
        },
      ],
      backendApplicationsMarkdown:
        'Organize IaC into small, well-scoped **modules** (e.g., `network`, `database`, `fargate-service`) rather than one giant 3,000-line state file where an experiment in staging risks touching production.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Blast radius of huge monostates**: Keep production and staging in separate state files so a syntax slip or accidental destroy in staging can never touch production.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Providers connect Terraform to cloud APIs, resources form an ordered dependency graph, variables and outputs parameterize environments, and modules package repeatable infrastructure patterns cleanly.',
    },
    {
      id: 'topic-14.4.8',
      topicId: '14.4.8',
      coveredTopicIds: ['14.4.9'],
      title: 'State management and infrastructure drift',
      problemAndRequirementsMarkdown: [
        '### First principles: How Terraform remembers what it created—and what happens when someone edits the console anyway',
        'Suppose `main.tf` declares an SQS queue. How does Terraform know whether it should *create* a brand-new queue or *modify* the existing one—and how does it notice you deleted a rule from `main.tf` that still exists in AWS?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### State Files & Detecting Drift',
        '1. **State management (`terraform.tfstate`)**: Terraform records a mapping between your HCL resource names (`aws_sqs_queue.jobs`) and real cloud IDs/attributes in a **state file**. Never store state solely on a laptop! Use **remote state** (e.g., encrypted **S3 bucket with versioning + state locking** via S3 lockfile/DynamoDB) so teammates don’t run concurrent `apply`s and corrupt state.',
        '2. **Infrastructure drift**: Happens whenever live cloud resources diverge from your IaC code—usually because someone manually clicked in the AWS console during a 2 AM outage (“just opening port 5432 temporarily!”) or an external tool modified tags. Running `terraform plan` queries real cloud APIs, compares live state against HCL, and flags the **drift** so you can either revert the manual hack or `import` / reconcile it into code.',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'Run a scheduled CI job (`terraform plan -detailed-exitcode`) daily against production: if someone made an emergency console change and forgot to codify it, CI alerts the team immediately.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Secrets inside `tfstate`**: Terraform state stores resource attributes in JSON—including sensitive outputs or generated passwords! Always encrypt remote S3 state at rest, restrict bucket IAM strictly, and never commit `*.tfstate` to Git.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Remote state with locking maps HCL definitions to real cloud IDs safely across teams, while scheduled plans expose infrastructure drift caused by manual out-of-band console edits.',
    },
  ],
  conceptConnection: {
    title: 'The Git-to-Cloud IaC Lifecycle',
    narrativeMarkdown: [
      'When Infrastructure as Code runs smoothly across a team:',
      '1. Engineers edit reusable **modules** parameterized with **variables** for `staging` and `prod`.',
      '2. CI runs `terraform plan` using **remote state** + lock, catching **infrastructure drift** and previewing exact diffs in the Pull Request.',
      '3. On merge, `terraform apply` executes the approved plan through **providers** to update live **resources** safely.',
    ].join('\n\n'),
    integratedExample: {
      id: '14.4-integrated-example',
      title: 'Safe Team Terraform Workflow',
      language: 'text',
      code: `PR Opened ─▶ CI acquires State Lock ─▶ terraform plan (reads Remote S3 State + Live AWS)
                                                │ (posts diff & drift warnings on PR)
PR Merged ─▶ Peer Approved ─▶ terraform apply ─▶ Updates AWS + Remote State ─▶ Releases Lock`,
    },
    walkthroughMarkdown:
      'Switch to **Recipe Mode** to configure an S3 remote backend with locking, write a reusable Terraform module, and reconcile drift.',
  },
  questions: [
    {
      id: '14.4-kc-1',
      focusArea: 'Declarative IaC, Modules & State Management',
      prompt:
        'Two engineers run `terraform apply` from their laptops using local `terraform.tfstate` files. What goes wrong immediately, and how do **remote state**, **state locking**, and **modules** fix team IaC workflows?',
      hints: [
        'What happens when Engineer B runs `apply` without seeing Engineer A’s newly created resource IDs in `terraform.tfstate`?',
        'What happens if both run `apply` at the exact same second?',
        'Local state causes Engineer B to create duplicates or destroy Engineer A’s resources, and concurrent applies corrupt state. Remote encrypted S3 state shares one source of truth, state locking serializes applies, and modules reuse standardized blueprints cleanly.',
      ],
      explanation:
        'With local state files, each laptop has a different picture of reality—causing duplicate creation, unintended deletions, and secret leaks. **Remote state** (encrypted S3) gives the team a shared source of truth, **state locking** prevents simultaneous `apply` races, and **modules** package reusable VPC/service patterns cleanly across environments via **variables** and **outputs**.',
      evaluationCriteria: [
        'Identifies state divergence and concurrent-apply corruption from local state files',
        'Prescribes remote encrypted state, state locking, and reusable modules',
      ],
      topicIds: ['14.4.1', '14.4.2', '14.4.3', '14.4.4', '14.4.5', '14.4.6', '14.4.7', '14.4.8'],
    },
    {
      id: '14.4-kc-2',
      focusArea: 'Infrastructure Drift & Destructive Plans',
      prompt:
        'During an incident, an engineer temporarily opens port `5432` to their home IP in the AWS Console and forgets about it. How does Terraform detect this **infrastructure drift**, and why should you inspect `terraform plan` carefully for `-/+ destroy and then create replacement`?',
      hints: [
        'What does `terraform plan` compare against your `.tf` files during refresh?',
        'What happens to live data if Terraform decides an RDS instance must be replaced (`-/+`)?',
        '`terraform plan` refreshes live AWS API attributes and flags the manual security-group rule as drift to be reverted. Always check plans for `-/+` replacements because destroying and recreating stateful resources like RDS can wipe databases or cause downtime.',
      ],
      explanation:
        'During `terraform plan`, Terraform queries live AWS resources and compares them against your HCL code—immediately revealing **infrastructure drift** (the console-added rule) so it can be reverted cleanly. Inspecting `plan` output is critical because immutable attribute edits trigger `-/+` destroy-and-recreate replacements that would wipe stateful resources like RDS databases.',
      evaluationCriteria: [
        'Explains how `terraform plan` compares live state vs code to catch out-of-band drift',
        'Warns against accidental `-/+` replacement of stateful resources without reading plan output',
      ],
      topicIds: ['14.4.2', '14.4.8', '14.4.9'],
    },
  ],
};

export const LESSON_14_4_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Structure production Terraform with encrypted remote state + locking, reusable modules, typed variables/outputs, and drift detection in CI.',
  whenToUseMarkdown:
    'Use for provisioning any repeatable cloud environment (VPC, RDS, ECS, SQS, IAM) without manual console changes.',
  setupCommands: [
    {
      id: '14.4-cmd-1',
      label: 'Initialize backend, validate syntax, and preview plan',
      command: 'terraform init && terraform validate && terraform plan -var-file="prod.tfvars" -out=tfplan',
      notes: 'Saving `-out=tfplan` guarantees `apply` runs the exact diff you reviewed.',
    },
    {
      id: '14.4-cmd-2',
      label: 'Detect out-of-band infrastructure drift in CI',
      command: 'terraform plan -var-file="prod.tfvars" -detailed-exitcode',
      notes: 'Exit code 0 = no changes, 1 = error, 2 = drift or pending changes detected.',
    },
  ],
  coreApisMarkdown: [
    '- **`backend "s3"`**: Stores `terraform.tfstate` centrally with encryption and `use_lockfile = true` (or DynamoDB locking).',
    '- **Separate state per environment**: Keep `envs/staging` and `envs/prod` isolated, sharing code through `modules/*`.',
    '- **Never `apply` blindly in prod**: Run `terraform plan` on PRs and `terraform apply tfplan` only after peer review.',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Configure remote S3 state backend with locking & encryption',
      detailMarkdown:
        'Declare `backend "s3"` with `encrypt = true`, versioning enabled on the bucket, and lock support so concurrent runs never corrupt state.',
    },
    {
      stepNumber: 2,
      title: 'Extract repeatable resources into versioned modules',
      detailMarkdown:
        'Place shared patterns (like queue + DLQ or VPC + subnets) in `modules/` with explicit `variable` inputs and `output` exports.',
    },
    {
      stepNumber: 3,
      title: 'Enforce PR plan review & scheduled drift checks',
      detailMarkdown:
        'Run `terraform fmt -check`, `terraform validate`, and `terraform plan` on every PR; schedule daily `-detailed-exitcode` drift scans.',
    },
  ],
  workingExamples: [
    {
      id: '14.4-ex-module',
      title: 'Remote state backend + invoking a reusable service queue module',
      language: 'hcl',
      code: `terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
  backend "s3" {
    bucket       = "acme-terraform-state"
    key          = "prod/worker-queues/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}

module "email_queue" {
  source           = "../../modules/reliable-queue"
  env              = "prod"
  queue_name       = "email-dispatch"
  max_receive_count = 5
}`,
      explanation:
        'Pins provider versions cleanly, enables encrypted locked remote state on S3, and instantiates a reusable `reliable-queue` module.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Sharing one giant `terraform.tfstate` across dev, staging, and production.',
      fix: 'Use separate state keys/backends per environment while sharing reusable modules.',
    },
    {
      mistake: 'Committing `*.tfstate` or `*.tfvars` secrets to Git.',
      fix: 'Gitignore `*.tfstate*` and `.terraform/`, use remote S3 state, and fetch runtime secrets via Secrets Manager.',
    },
  ],
  exercise: {
    id: '14.4-recipe-ex',
    title: 'Modularize & Lock a Queue Stack in Terraform',
    instructionsMarkdown:
      'Create a reusable `modules/reliable-queue` HCL module accepting `env`, `queue_name`, and `max_receive_count` variables and exporting `queue_url` + `dlq_arn` outputs, wired to an encrypted S3 remote backend.',
    acceptanceChecklist: [
      'Remote S3 backend configured with `encrypt = true` and state locking',
      'Module isolates `aws_sqs_queue` + DLQ redrive policy via typed `variable` and `output` blocks',
      'Production and staging environments use separate state keys',
    ],
  },
};

export const LESSON_14_5_FPT: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'A bad deployment shouldn’t take your whole site down—and neither should a normal Tuesday release! Yet beginners often stop old servers, run `ALTER TABLE` migrations, and boot new servers in a way that drops active checkout requests or leaves v1 code crashing on v2 database columns.',
      'In this unit, we’ll design safe production releases using **rolling deployments**, **blue-green deployment**, **canary deployment**, **zero-downtime deployments**, **database migration compatibility**, **rollback strategies**, **feature flags**, and **infrastructure monitoring**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Deploying code is the #1 cause of production outages. Decoupling deployment from feature release and keeping migrations backward-compatible lets teams ship 20 times a day safely.',
    prerequisites: [
      {
        subBlockId: '14.3',
        label: 'ALB Health Checks & ECS (14.3)',
        detail: 'How load balancers drain connections and route to healthy targets.',
      },
      {
        subBlockId: '5.4',
        label: 'Database Migrations (5.4)',
        detail: 'Applying schema evolution cleanly without locking tables.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-14.5.1',
      topicId: '14.5.1',
      coveredTopicIds: ['14.5.2', '14.5.3', '14.5.4'],
      title: 'Zero-downtime strategies: Rolling, Blue-Green, and Canary deployments',
      problemAndRequirementsMarkdown: [
        '### First principles: Updating a plane while it’s flying',
        'If you run 4 containers behind an ALB and overwrite all 4 at once, users get `502 Bad Gateway` for 30 seconds while new containers boot. Worse, if the new image crashes on startup, your *entire* fleet is dead!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### How Zero-Downtime Cutovers Work',
        'Every **zero-downtime deployment** obeys one rule: **spin up healthy new instances (passing `/readyz` checks) BEFORE draining and terminating old ones (`SIGTERM` + ALB deregistration delay).** Three patterns balance speed, cost, and blast radius:',
        '1. **Rolling deployment**: Gradually replace old instances in small batches (e.g., 1 of 4 at a time, `maxUnavailable: 0, maxSurge: 1`). Low extra cost; slower full rollback since mixed versions (`v1` + `v2`) run side-by-side temporarily.',
        '2. **Blue-Green deployment**: Spin up a full parallel **Green** fleet alongside live **Blue**. Verify health, then flip the load balancer target group cleanly from Blue → Green in one atomic cutover! Instant rollback (flip back to Blue), at the cost of temporarily running `2×` compute.',
        '3. **Canary deployment**: Route a tiny slice of real production traffic (say **2% → 10% → 50% → 100%**) to the new version while watching error rates and `p99` latency. Catches subtle production bugs affecting at most 2% of users, triggering instant abort before wide impact.',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'Use **Rolling** with `minHealthyPercent >= 100` for routine stateless releases, **Canary** for risky core-path/billing changes, and **Blue-Green** when you need clean instant all-or-nothing cutover.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Mixed-version window**: In *every* rolling or canary deploy (and for active in-flight requests during blue-green), **`v1` and `v2` code are live at the exact same moment**—meaning API contracts, queue payloads, and database schemas MUST be mutually compatible!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Zero-downtime deployments start and health-check new instances before gracefully draining old ones, choosing between Rolling (low extra compute), Blue-Green (instant cutover/rollback), and Canary (minimal blast radius).',
    },
    {
      id: 'topic-14.5.5',
      topicId: '14.5.5',
      coveredTopicIds: ['14.5.6', '14.5.7', '14.5.8'],
      title: 'Database migration compatibility, rollback strategies, feature flags, and monitoring',
      problemAndRequirementsMarkdown: [
        '### First principles: Why “just rollback” explodes when a migration dropped a column',
        'Imagine deploying `v2` with a migration `ALTER TABLE users DROP COLUMN full_name;` (replaced by `display_name`). Two minutes after deploy, `v2` starts throwing `500` errors, so you roll back containers to `v1`! **Boom—`v1` immediately crashes everywhere because `full_name` is gone from Postgres!** Or even simpler: during a rolling deploy, `v1` containers crash the second that migration runs *before* `v2` finishes booting.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Expand-and-Contract, Feature Flags & Safe Rollbacks',
        '1. **Database migration compatibility (Expand-and-Contract)**: Never break the currently running version (`N-1`) with a migration! Split breaking schema changes across separate safe deploys:',
        '   - **Expand**: Add nullable `display_name` column (keep `full_name` intact!). Deploy code that writes *both* columns and reads `display_name ?? full_name`.',
        '   - **Backfill**: Copy historical rows in small throttled batches.',
        '   - **Contract**: Only *after* zero `v1` instances remain and rollback isn’t needed, drop `full_name` in a later deploy.',
        '2. **Rollback strategies**: Because database rollbacks are destructive/slow, code must stay backward-compatible with the latest schema (`N+1` safe) so **code rollback** is simply re-pointing traffic or re-deploying the previous immutable Docker tag—while **feature flags** let you kill a broken feature in **1 second** via runtime config without redeploying at all!',
        '3. **Infrastructure monitoring**: Automated deploy gates watch HTTP `5xx`, `p99` latency, CPU/RAM saturation, and DB lock waits right after shifting traffic—halting/rolling back automatically if SLOs degrade.',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '14.5.5-ex-1',
            title: 'Expand-and-Contract safe column rename across releases',
            language: 'sql',
            code: `-- Release 1 (Expand - safe while v1 is still running!):
ALTER TABLE users ADD COLUMN display_name TEXT;
-- Deploy v2: dual-write (full_name + display_name), read COALESCE(display_name, full_name)
-- Background job: backfill display_name in batches of 5,000 rows

-- Release 2 (Contract - weeks/days later once only v2+ reads display_name):
ALTER TABLE users DROP COLUMN full_name;`,
          },
          lineByLineMarkdown: [
            '- **Line 2**: Additive nullable column does not break `v1` `SELECT`/`INSERT` queries or hold long table-rewrite locks.',
            '- **Line 7**: Dropping the legacy column happens in a completely separate future deploy so `v2 -> v1` rollback stays 100% safe.',
          ].join('\n'),
        },
      ],
      backendApplicationsMarkdown:
        'Decouple **deployment** (shipping compiled code to servers) from **release** (enabling a **feature flag** for 5% → 100% of users)—giving instant kill-switch rollback with zero container restarts.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Table-locking DDL in Postgres**: Adding a column with a volatile expression or creating a non-concurrent index (`CREATE INDEX` without `CONCURRENTLY`) blocks writes on huge tables and stalls live traffic—always use `CONCURRENTLY` and lock timeouts.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Backward-compatible Expand-and-Contract migrations keep N-1 rollbacks safe, feature flags decouple code deployment from instant release toggles, and automated monitoring gates abort bad rollouts early.',
    },
  ],
  conceptConnection: {
    title: 'Putting Safe Continuous Delivery Together',
    narrativeMarkdown: [
      'A mature deployment pipeline protects every layer simultaneously:',
      '- **Schema**: **Expand-and-Contract** ensures `v1` and `v2` share the DB cleanly.',
      '- **Traffic Cutover**: **Rolling**, **Blue-Green**, or **Canary** drains old tasks only after new ones pass `/readyz`.',
      '- **Runtime Safety**: **Feature flags** toggle risky paths instantly, while **Infrastructure monitoring** auto-triggers **Rollback** on `5xx`/`p99` regressions.',
    ].join('\n\n'),
    integratedExample: {
      id: '14.5-integrated-example',
      title: 'Zero-Downtime Canary Release Pipeline',
      language: 'text',
      code: `1. Additive DB Migration (Expand) ─▶ Safe for v1 & v2
2. Deploy v2 (Feature Flag OFF) ─▶ Pass /readyz ─▶ Shift 5% Canary Traffic
3. Monitor CloudWatch (5xx, p99, DB locks) for 10 min:
   ├── Anomaly? ─▶ Auto-Rollback traffic to 100% v1 immediately!
   └── Healthy? ─▶ Promote 100% v2 ─▶ Gradually turn Feature Flag ON (10% -> 100%)`,
    },
    walkthroughMarkdown:
      'Switch to **Recipe Mode** for concrete ECS/ALB deployment safety settings, Expand-and-Contract steps, and automated rollback alarms.',
  },
  questions: [
    {
      id: '14.5-kc-1',
      focusArea: 'Zero-Downtime Cutovers & Rollback Strategies',
      prompt:
        'Compare **Rolling**, **Blue-Green**, and **Canary** deployments on three axes: extra compute cost, blast radius if `v2` has a subtle bug, and rollback speed.',
      hints: [
        'Which one runs a full duplicate fleet? Which exposes only a tiny fraction of traffic first?',
        'How fast is flipping a router rule back to Blue vs. rolling back 20 instances one by one?',
        'Rolling uses minimal extra compute, affects batches progressively, and rolls back at deployment speed. Blue-Green needs 2x temporary compute, exposes 100% on flip, and rolls back instantaneously to Blue. Canary exposes 1–5% first (minimal blast radius) and halts/reverts traffic fast.',
      ],
      explanation:
        '**Rolling** replaces batches incrementally (minimal extra compute, moderate blast radius, slower rollback). **Blue-Green** provisions a full duplicate Green environment (`2×` temporary compute, instant cutover and instant rollback back to Blue). **Canary** shifts a small fraction (e.g., 2–5%) of real traffic first (tiny blast radius if a bug escapes staging, fast abort back to 0%).',
      evaluationCriteria: [
        'Accurately compares Rolling, Blue-Green, and Canary across cost, blast radius, and rollback speed',
      ],
      topicIds: ['14.5.1', '14.5.2', '14.5.3', '14.5.4', '14.5.6'],
    },
    {
      id: '14.5-kc-2',
      focusArea: 'Database Migration Compatibility, Feature Flags & Monitoring',
      prompt:
        'Why does dropping or renaming a column in the same deploy as your new code break **zero-downtime** rollouts and **rollbacks**—and how do **Expand-and-Contract**, **feature flags**, and **infrastructure monitoring** prevent this?',
      hints: [
        'Remember both `v1` and `v2` run at the same time during rolling/canary deploys—and rolling back restarts `v1`.',
        'How can you make a schema change safe for both `v1` and `v2` before removing the old column later?',
        'During mixed-version deploys or rollbacks, `v1` still reads/writes the old column so dropping it breaks `v1`. Expand-and-Contract adds the new column compatibly first, dual-writes/backfills, and drops the old column in a later deploy. Feature flags disable buggy paths in seconds without redeploying, while monitoring detects regressions automatically.',
      ],
      explanation:
        'During a rolling/canary rollout—and if you roll back to `v1`—`v1` instances still query the old column, crashing immediately if it was renamed or dropped. **Expand-and-Contract** keeps `v1` compatible (add new column → dual-write & backfill → drop old column in a later deploy). Pairing with **feature flags** isolates new behavior behind instant runtime switches while **monitoring** (`5xx`, `p99`) triggers fast rollback before wide customer impact.',
      evaluationCriteria: [
        'Explains why mixed-version execution and rollbacks require backward-compatible migrations',
        'Correctly describes Expand-and-Contract plus feature flags and monitoring alarms',
      ],
      topicIds: ['14.5.4', '14.5.5', '14.5.6', '14.5.7', '14.5.8'],
    },
  ],
};

export const LESSON_14_5_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Execute zero-downtime releases safely using health-gated container replacements, Expand-and-Contract SQL migrations, feature flags, and automated metric-based rollback alarms.',
  whenToUseMarkdown:
    'Use for every production backend release, especially whenever touching database schemas, auth, or checkout paths.',
  setupCommands: [
    {
      id: '14.5-cmd-1',
      label: 'Run pre-deploy non-blocking additive migrations',
      command: 'npx prisma migrate deploy # verified additive-only in CI before image rollout',
      notes: 'Runs Expand migrations while v1 is still healthy before shifting traffic to v2.',
    },
    {
      id: '14.5-cmd-2',
      label: 'Trigger instant rollback on ECS if alarms fire',
      command: 'aws ecs update-service --cluster prod --service api --task-definition api:41',
      notes: 'Or set DeploymentCircuitBreaker enable=true,rollback=true for automatic ECS rollback.',
    },
  ],
  coreApisMarkdown: [
    '- **ALB Target Group Deregistration Delay**: Set `deregistration_delay = 30s` and match container `SIGTERM` drain so in-flight HTTP requests finish before termination.',
    '- **ECS Deployment Configuration**: `minimumHealthyPercent = 100`, `maximumPercent = 200`, plus `deploymentCircuitBreaker` with rollback enabled.',
    '- **Expand-and-Contract + Feature Flags**: Keep `N-1` code compatible with every schema migration and guard risky code paths with runtime flags (`isEnabled("new_tax_calc", tenantId)`).',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Gate schema changes on backward-compatibility checks',
      detailMarkdown:
        'Ensure migrations only add nullable columns, new tables, or `CREATE INDEX CONCURRENTLY` while `v1` is still live; defer `DROP COLUMN` to a later cleanup release.',
    },
    {
      stepNumber: 2,
      title: 'Roll out new tasks cleanly & monitor Canary/ALB health',
      detailMarkdown:
        'Require passing `/readyz` checks before shifting traffic, drain old tasks politely via `SIGTERM`, and gate promotion on `5xx < 0.5%` and stable `p99` latency.',
    },
    {
      stepNumber: 3,
      title: 'Toggle feature flags & preserve fast rollback paths',
      detailMarkdown:
        'Ship `v2` with risky features dark behind a flag, enable progressively (`5% -> 25% -> 100%`), and monitor alarms to auto-rollback image tags or flip flags off immediately on spikes.',
    },
  ],
  workingExamples: [
    {
      id: '14.5-ex-ecs',
      title: 'Zero-downtime ECS rolling deployment with auto-rollback circuit breaker',
      language: 'json',
      code: `{
  "deploymentConfiguration": {
    "maximumPercent": 200,
    "minimumHealthyPercent": 100,
    "deploymentCircuitBreaker": {
      "enable": true,
      "rollback": true
    },
    "alarms": {
      "alarmNames": ["prod-api-5xx-spike", "prod-api-p99-high"],
      "enable": true,
      "rollback": true
    }
  }
}`,
      explanation:
        'Guarantees 100% healthy capacity stays online while booting v2, and automatically rolls back to the last stable task definition if health checks fail or CloudWatch 5xx/p99 alarms trip.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Setting `minimumHealthyPercent: 50` on a 2-task service—killing one task before the replacement is healthy.',
      fix: 'Keep `minimumHealthyPercent: 100` (`maxSurge` > 0) so capacity never drops mid-deploy.',
    },
    {
      mistake: 'Running `DROP COLUMN` or `ALTER COLUMN TYPE` in the same deploy as code changes.',
      fix: 'Use two-phase Expand-and-Contract releases so rollbacks never hit missing columns.',
    },
  ],
  exercise: {
    id: '14.5-recipe-ex',
    title: 'Design an Expand-and-Contract + Canary Rollback Plan',
    instructionsMarkdown:
      'Write the step-by-step release sequence to split `users.full_name` into `users.display_name` with zero downtime, including feature-flag rollout and exact CloudWatch rollback triggers.',
    acceptanceChecklist: [
      'Expand migration is additive/non-locking and preserves `v1` compatibility',
      'App release rolls out with health gates and dual-write/fallback read logic',
      'Feature flag + metric alarms allow instant rollback without dropping `display_name` or losing data',
    ],
  },
};

export const LESSON_14_6_FPT: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Docker containers (`Block 8`) solved *“it runs identically on my laptop and the server.”* Great! Now you have **45 microservices across 12 Linux hosts**, containers crash at night, traffic spikes 5x during lunch, and rolling deploys need zero downtime.',
      'Running `docker run` manually on individual servers falls apart fast. In this closing unit of Block 14, we’ll examine **why orchestration exists**, **Kubernetes architecture**, **Pods**, **Deployments**, **Services**, **Ingress**, **ConfigMaps and Secrets**, **health probes**, **resource limits**, and **Horizontal Pod Autoscaling (HPA)**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'Kubernetes is the universal operating system of cloud-native infrastructure. Understanding its declarative control loop makes debugging Pods, Ingress routing, and OOMKilled restarts effortless.',
    prerequisites: [
      {
        subBlockId: '8.1',
        label: 'Docker Containers (8.1)',
        detail: 'Images, container lifecycles, and cgroup isolation.',
      },
      {
        subBlockId: '14.5',
        label: 'Zero-Downtime Deployments (14.5)',
        detail: 'Rolling replacement, readiness gates, and graceful drain.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-14.6.1',
      topicId: '14.6.1',
      coveredTopicIds: ['14.6.2', '14.6.3', '14.6.4'],
      title: 'Why orchestration exists, Kubernetes architecture, Pods, and Deployments',
      problemAndRequirementsMarkdown: [
        '### First principles: Managing fleets instead of pets',
        'Without an orchestrator, if Host #3’s kernel dies at 2 AM, every container on Host #3 stays dead until a human SSHs into Host #4 and starts replacements. Who schedules containers onto nodes with spare RAM, replaces crashed ones, and coordinates rolling updates across 30 machines?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### The Reconciliation Loop, Control Plane, Pods & Deployments',
        '1. **Kubernetes architecture**: Splits into a **Control Plane** (`API Server` storing desired state in `etcd`, `Scheduler` picking nodes, and `Controller Managers` continuously reconciling actual state → desired state) and **Worker Nodes** (`kubelet` starting/monitoring containers via `containerd`, `kube-proxy` wiring cluster networking).',
        '2. **Pods**: The smallest deployable unit in Kubernetes—a wrapper around 1 (or tightly coupled sidecar) container sharing one network IP and volumes. **Pods are mortal!** When a Pod dies, Kubernetes never resurrects it—it creates a brand-new Pod with a new IP.',
        '3. **Deployments**: Since raw Pods don’t self-heal or roll out updates, a **Deployment** manages a `ReplicaSet` declaring: *“Always keep 4 healthy Pods of `api:v2.1` running, updating smoothly with `maxUnavailable: 0`.”* If a Node dies, the Controller creates replacement Pods automatically on healthy Nodes.',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'Never deploy bare `Pod` manifests in production—always wrap stateless backends in a `Deployment` (or `StatefulSet` for stateful queues/caches) so self-healing and rolling updates work automatically.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Don’t adopt Kubernetes too early**: Managing EKS/GKE upgrades, CNI networking, ingress controllers, and RBAC takes real operational effort—for small teams, ECS Fargate (`14.3`) or PaaS removes that control-plane tax.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Kubernetes orchestrates container fleets via a declarative reconciliation loop where Controllers inside the Control Plane keep live Deployments and mortal Pods matched to desired cluster state.',
    },
    {
      id: 'topic-14.6.5',
      topicId: '14.6.5',
      coveredTopicIds: ['14.6.6', '14.6.7'],
      title: 'Services, Ingress, ConfigMaps, and Secrets',
      problemAndRequirementsMarkdown: [
        '### First principles: Stable networking & externalized configuration for ephemeral Pods',
        'Because Pods die and respawn with brand-new internal IPs every deploy, how can Billing Service call `orders-api` reliably—and how does external HTTPS traffic (`https://api.acme.com/orders`) enter the cluster without hardcoding pod IPs or baking `.env` secrets into Docker images?',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Routing & Config Decoupling',
        '- **Services**: Gives a dynamic set of Pods matching a label selector (`app: orders-api`) a **single stable virtual IP (ClusterIP) and internal DNS name** (`orders-api.prod.svc.cluster.local`), automatically updating endpoints whenever Pods scale or restart.',
        '- **Ingress**: Layer-7 HTTP/HTTPS entry controller (`Nginx Ingress`, `ALB Ingress`) exposing external domains, terminating TLS, and routing paths (`/api/*` → `orders-api` Service, `/auth/*` → `auth-api` Service).',
        '- **ConfigMaps and Secrets**: Decouple configuration from container images (`12-Factor App`). **ConfigMaps** inject non-sensitive settings (`PORT=3000`, `LOG_LEVEL=info`); **Secrets** inject sensitive values (DB URLs, JWT keys) as env vars or mounted files—ideally encrypted in `etcd` or synced from external Secrets Managers.',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'Build *one* immutable Docker image (`api:git-sha`) in CI and deploy that identical artifact across staging and production by swapping ConfigMaps and Secrets.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Base64 is NOT encryption**: Kubernetes `Secret` YAML encodes fields in base64 purely for transport; enable KMS envelope encryption on `etcd` (or External Secrets Operator) plus strict RBAC.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Services give mortal Pods stable internal DNS and load-balancing, Ingress routes external HTTPS paths into Services, and ConfigMaps and Secrets separate runtime configuration from immutable images.',
    },
    {
      id: 'topic-14.6.8',
      topicId: '14.6.8',
      coveredTopicIds: ['14.6.9', '14.6.10'],
      title: 'Health probes, resource limits, and Horizontal Pod Autoscaling (HPA)',
      problemAndRequirementsMarkdown: [
        '### First principles: Preventing “black-hole traffic”, noisy neighbors, and traffic meltdowns',
        'Even with a Deployment and Service, three subtle production crashes happen when manifests skip operational guards: traffic hits a Pod *before* its DB pool finishes connecting, one memory-leaking Pod crashes every other healthy app on the same host Node, or morning traffic doubles faster than engineers wake up.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Keeping Pods Honest, Bounded, and Elastic',
        '1. **Health probes**:',
        '   - **`readinessProbe`** (`/readyz`): *“Is this Pod ready to receive traffic?”* While failing (booting up, or gracefully draining on `SIGTERM`), Kubernetes removes the Pod from the **Service endpoints** immediately—zero 502s! Don’t couple this to downstream flaky external APIs.',
        '   - **`livenessProbe`** (`/livez`): *“Is this process deadlocked?”* If failing repeatedly, `kubelet` **restarts the container**. Keep it fast and local (process alive, not DB ping, or a DB hiccup restarts your entire fleet at once!).',
        '   - **`startupProbe`**: Gives slow-booting apps extra startup time before liveness begins.',
        '2. **Resource requests & limits**: **`requests`** guarantee minimum CPU/RAM so the Scheduler picks a Node with room; **`limits`** cap maximum usage—if RAM hits its limit, the kernel **OOMKills (`Exit 137`)** that container before it starves neighboring Pods (and high CPU limits throttle CPU cycles).',
        '3. **Horizontal Pod Autoscaling (HPA)**: Watches metrics (CPU %, or custom queue depth/RPS) and automatically adjusts `Deployment` replicas between `minReplicas` and `maxReplicas` as load fluctuates.',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '14.6.8-ex-1',
            title: 'Production Deployment fragment with probes & resource bounds',
            language: 'yaml',
            code: `resources:
  requests:
    cpu: "250m"
    memory: "256Mi"
  limits:
    cpu: "1000m"
    memory: "512Mi"
readinessProbe:
  httpGet: { path: /readyz, port: 3000 }
  periodSeconds: 5
livenessProbe:
  httpGet: { path: /livez, port: 3000 }
  periodSeconds: 10`,
          },
          lineByLineMarkdown: [
            '- **Lines 1–7**: Reserves 250m CPU / 256Mi RAM for safe scheduling and OOM-protects neighbors at 512Mi.',
            '- **Lines 8–13**: Separates traffic eligibility (`/readyz`) from container restart detection (`/livez`).',
          ].join('\n'),
        },
      ],
      backendApplicationsMarkdown:
        'Always check `kubectl describe pod <name>` when seeing `CrashLoopBackOff` or `OOMKilled`: 90% of the time either `livenessProbe` checked an unreachable DB on startup or `resources.limits.memory` was too tight.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **The DB-in-Liveness Disaster**: Putting `SELECT 1` inside `/livez` causes Kubernetes to restart *every* healthy API Pod in an endless loop whenever Postgres blips for 15 seconds—making recovery 10x harder!',
      ].join('\n\n'),
      centralIdeaSummary:
        'Readiness probes gate Service traffic safely while lightweight liveness probes catch deadlocks, resource requests/limits prevent noisy-neighbor OOM crashes, and HPA scales Pod counts dynamically with demand.',
    },
  ],
  conceptConnection: {
    title: 'How All 10 Kubernetes Concepts Fit One Request',
    narrativeMarkdown: [
      'Trace one HTTPS request cleanly through a **Kubernetes** cluster:',
      '1. **Ingress** terminates TLS and routes `api.acme.com` → **Service** (`ClusterIP`).',
      '2. **Service** forwards traffic strictly to **Pods** passing their **`readinessProbe`** (managed by a **Deployment** + **HPA**).',
      '3. Each **Pod** reads runtime settings from **ConfigMaps / Secrets** and runs safely within **Resource requests/limits**, monitored by **`livenessProbe`** and scheduled by the **Control Plane**.',
    ].join('\n\n'),
    integratedExample: {
      id: '14.6-integrated-example',
      title: 'Kubernetes Traffic & Control Plane Flow',
      language: 'text',
      code: `Control Plane (API Server + Scheduler + Controllers + HPA)
   └── reconciles Deployment (min 3..15 Pods) ──▶ Worker Nodes
                                                    │
Internet ─▶ Ingress (TLS) ─▶ Service (ClusterIP) ───┴─▶ Ready Pods (/readyz OK)
                                                          ├─ ConfigMap + Secret
                                                          └─ CPU/RAM requests & limits`,
    },
    walkthroughMarkdown:
      'Switch to **Recipe Mode** for a complete, production-ready Deployment + Service + Ingress + HPA manifest stack and `kubectl` debugging workflow.',
  },
  questions: [
    {
      id: '14.6-kc-1',
      focusArea: 'Architecture, Pods, Deployments, Services & Ingress',
      prompt:
        'Why do production workloads create a **Deployment** and **Service** instead of standalone **Pods**, and what distinct job does an **Ingress** perform that a basic `ClusterIP` Service does not?',
      hints: [
        'What happens if a standalone Pod’s host Node crashes—and what happens to Pod IPs on restarts?',
        'Think about external domain names, TLS termination, and Layer-7 path routing (`/api` vs `/web`).',
        'Deployments automatically replace failed Pods and perform rolling updates, while Services provide a stable virtual IP/DNS load-balancing across ephemeral Pod IPs. Ingress handles external Layer-7 HTTP/HTTPS host/path routing and TLS termination into internal Services.',
      ],
      explanation:
        'Individual **Pods** are ephemeral and do not recreate themselves if their Node dies. A **Deployment**’s controller enforces desired replica counts and zero-downtime rolling updates, while a **Service** gives rotating Pod IPs one stable internal DNS name and load-balanced virtual IP. **Ingress** sits in front to terminate external HTTPS/TLS and route host/path rules (`/api/*`) to internal Services.',
      evaluationCriteria: [
        'Explains self-healing/rolling updates via Deployments and stable DNS/VIP via Services',
        'Distinguishes internal ClusterIP Services from external Layer-7/TLS Ingress',
      ],
      topicIds: ['14.6.1', '14.6.2', '14.6.3', '14.6.4', '14.6.5', '14.6.6'],
    },
    {
      id: '14.6-kc-2',
      focusArea: 'Probes, ConfigMaps/Secrets, Resource Limits & HPA',
      prompt:
        'Why is putting a PostgreSQL `SELECT 1` inside a Pod’s **`livenessProbe`** dangerous—whereas checking DB readiness in **`readinessProbe`** (with proper **`resource limits`**, **ConfigMaps/Secrets**, and **HPA**) makes outages safer?',
      hints: [
        'What action does Kubernetes take when `livenessProbe` fails vs. when `readinessProbe` fails?',
        'If Postgres has a 10-second failover blip, do you want Kubernetes killing and rebooting all 20 API Pods simultaneously?',
        '`livenessProbe` failure kills and restarts the Pod (creating a reboot storm during a transient DB blip); `readinessProbe` failure simply pauses traffic routing until dependencies recover. Resource limits protect nodes from OOM cascades while HPA scales pods based on CPU/custom metrics.',
      ],
      explanation:
        'Failing a **`livenessProbe`** instructs `kubelet` to kill and restart the container—checking Postgres there causes cascading Pod restarts whenever the database has a brief failover. Put dependency readiness in **`readinessProbe`** so Kubernetes smoothly pauses Service routing until ready, keep **`livenessProbe`** lightweight/local, externalize env settings in **ConfigMaps/Secrets**, set **requests/limits** to prevent OOM neighbor crashes, and configure **HPA** for automatic scaling.',
      evaluationCriteria: [
        'Distinguishes liveness (container restart) vs readiness (traffic removal) consequences',
        'Integrates ConfigMaps/Secrets, resource requests/limits, and HPA accurately',
      ],
      topicIds: ['14.6.7', '14.6.8', '14.6.9', '14.6.10'],
    },
  ],
};

export const LESSON_14_6_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Deploy, configure, scale, and debug a stateless Node.js API on Kubernetes using Deployment, Service, Ingress, ConfigMap/Secret, probes, resource bounds, and HorizontalPodAutoscaler.',
  whenToUseMarkdown:
    'Use when operating container fleets on Kubernetes (EKS, GKE, AKS, or local kind/k3s) requiring declarative self-healing and Layer-7 routing.',
  setupCommands: [
    {
      id: '14.6-cmd-1',
      label: 'Apply manifests & watch zero-downtime rollout',
      command: 'kubectl apply -f k8s/ && kubectl rollout status deployment/backend-api -n prod',
      notes: 'Streams live rollout progress and catches stuck readiness probes immediately.',
    },
    {
      id: '14.6-cmd-2',
      label: 'Inspect crashing/OOMKilled Pods & events',
      command: 'kubectl get pods -n prod && kubectl describe pod <pod-name> -n prod && kubectl logs -l app=backend-api -n prod --tail=100',
      notes: '`describe pod` reveals OOMKilled, ImagePullBackOff, FailedScheduling, and probe failure events.',
    },
  ],
  coreApisMarkdown: [
    '- **`Deployment`**: Manages `replicas`, `RollingUpdate` (`maxUnavailable: 0`, `maxSurge: 1`), container `resources`, and `/readyz` + `/livez` probes.',
    '- **`Service` + `Ingress`**: Stable `ClusterIP` service targeting `app: backend-api`, exposed externally via TLS-enabled `Ingress`.',
    '- **`ConfigMap` + `Secret` + `HorizontalPodAutoscaler`**: Separates config from image tags and scales Pods between `minReplicas` and `maxReplicas`.',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Externalize configuration via ConfigMap and Secret',
      detailMarkdown:
        'Keep runtime flags in `ConfigMap` and sensitive keys/DSNs in KMS-encrypted `Secret` (or ExternalSecrets) referenced via `envFrom`.',
    },
    {
      stepNumber: 2,
      title: 'Define Deployment with requests/limits, maxUnavailable: 0, and split probes',
      detailMarkdown:
        'Set CPU/RAM requests & limits (`HPA` requires CPU `requests` to compute utilization percentages!), separate `/readyz` from `/livez`, and include `terminationGracePeriodSeconds: 30`.',
    },
    {
      stepNumber: 3,
      title: 'Expose via Service + Ingress and attach HPA',
      detailMarkdown:
        'Wire a `ClusterIP` Service to your Deployment selector, route TLS traffic through `Ingress`, and attach an `HorizontalPodAutoscaler` targeting 70% CPU utilization.',
    },
  ],
  workingExamples: [
    {
      id: '14.6-ex-k8s',
      title: 'Complete Production Deployment, Service, and HPA YAML',
      language: 'yaml',
      code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
  namespace: prod
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate: { maxUnavailable: 0, maxSurge: 1 }
  selector:
    matchLabels: { app: backend-api }
  template:
    metadata:
      labels: { app: backend-api }
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: api
          image: ghcr.io/acme/backend-api:1.4.2
          ports: [{ containerPort: 3000 }]
          envFrom:
            - configMapRef: { name: api-config }
            - secretRef: { name: api-secrets }
          resources:
            requests: { cpu: "250m", memory: "256Mi" }
            limits: { cpu: "1000m", memory: "512Mi" }
          readinessProbe:
            httpGet: { path: /readyz, port: 3000 }
            periodSeconds: 5
          livenessProbe:
            httpGet: { path: /livez, port: 3000 }
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: backend-api
  namespace: prod
spec:
  selector: { app: backend-api }
  ports:
    - port: 80
      targetPort: 3000
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-api-hpa
  namespace: prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend-api
  minReplicas: 3
  maxReplicas: 15
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70`,
      explanation:
        'Ensures zero-downtime rolling replacement (`maxUnavailable: 0`), bounds memory against noisy neighbors, separates `/readyz` from `/livez`, and scales smoothly between 3 and 15 Pods.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Creating an HPA without setting `resources.requests.cpu` on the Deployment container.',
      fix: 'Always define `resources.requests` on every container; HPA reports `<unknown>` metrics and refuses to scale without CPU requests.',
    },
    {
      mistake: 'Tagging Deployment images as `:latest`.',
      fix: 'Pin immutable semantic tags or Git SHA digests (`api:1.4.2` / `@sha256:...`) so rollbacks and Pods stay deterministic.',
    },
  ],
  exercise: {
    id: '14.6-recipe-ex',
    title: 'Author a Self-Healing Ingress + Deployment + HPA Stack',
    instructionsMarkdown:
      'Add a TLS `Ingress` manifest and `ConfigMap`/`Secret` references to the `backend-api` Deployment above, and write the `kubectl` command to roll back if `rollout status` stalls.',
    acceptanceChecklist: [
      'Deployment uses immutable image tag, `maxUnavailable: 0`, resource requests/limits, and split probes',
      'Service targets Pod labels cleanly and Ingress routes HTTPS domain path to the Service',
      'Includes `kubectl rollout undo deployment/backend-api` rollback command',
    ],
  },
};
