import { FptLessonContent, RecipeLessonContent } from '../types';

export const LESSON_16_4_FPT: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Now flip roles: instead of *using* AI tools to write code, **you are the backend engineer building production AI-powered systems for users**! Calling `fetch(".../chat/completions")` in a weekend demo takes 10 lines; running that system reliably for 50,000 real users brings real backend problems—slow 30-second responses, unstructured hallucinated JSON, grounded private knowledge, $8,000 surprise API bills, and flaky multi-minute agent jobs.',
      'In this unit, we’ll examine every architectural piece of AI-powered backends: **LLM API integration**, **streaming model responses**, **structured outputs**, **tool execution**, **embeddings**, **vector databases**, **Retrieval-Augmented Generation (RAG)**, **asynchronous inference**, **long-running agent workflows**, **agent execution state**, **usage and cost management**, **observability**, and **retry and recovery**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'AI features don’t replace backend engineering—they intensify it! Timeouts, streaming SSE, Zod validation, queueing, caching, cost caps, and observability matter *more* when an external API takes 15 seconds and charges per token.',
    prerequisites: [
      {
        subBlockId: '9.2',
        label: 'Queues & Workers (9.2, 9.3)',
        detail: 'Running slow work asynchronously with retries and idempotency.',
      },
      {
        subBlockId: '11.1',
        label: 'Server-Sent Events & Streaming (11.1)',
        detail: 'Pushing incremental tokens over persistent HTTP connections.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-16.4.1',
      topicId: '16.4.1',
      coveredTopicIds: ['16.4.2', '16.4.3', '16.4.4'],
      title: 'LLM API integration, streaming responses, structured outputs, and tool execution',
      problemAndRequirementsMarkdown: [
        '### First principles: Taming slow, probabilistic text APIs inside deterministic backends',
        'A normal Postgres query returns typed rows in `5ms`. An LLM call can take `12 seconds`, vary its wording every run, and fail halfway through. Three immediate requirements emerge the moment your backend integrates an LLM API:',
        '1. Users stare at a blank spinner for 12 seconds unless you stream tokens incrementally.',
        '2. Downstream TypeScript code crashes on `JSON.parse()` if the model chats *“Sure! Here is your JSON: …”*.',
        '3. The model needs live backend facts (order status, inventory) rather than guessing stale training data.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Four Core Runtime Integration Primitives',
        '- **LLM API integration**: Always call LLM providers **server-side** (never expose API keys in browsers!), set strict **HTTP timeouts + `AbortController`** (cancel in-flight streams if clients disconnect), and version prompts/model IDs like code.',
        '- **Streaming model responses (SSE)**: Pipe provider token chunks directly to clients over **Server-Sent Events (`text/event-stream`)** (`11.1`) so time-to-first-token (TTFT) drops to `<500ms` even when a full answer takes 15 seconds.',
        '- **Structured outputs**: Enforce **JSON Schema / constrained decoding** supported by the model API—and **still validate with Zod** on your server before touching DB/business logic!',
        '- **Tool execution**: Register typed backend tool schemas (`lookupOrder(orderId)`), validate model arguments strictly with Zod, enforce current user authZ inside your server handler (*never* let the model override `userId`!), execute safely, and return results to the model.',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '16.4.3-ex-1',
            title: 'Enforcing schema + Zod validation & auth-scoped tool execution',
            language: 'typescript',
            code: `const LookupArgsSchema = z.object({ orderId: z.string().uuid() });

async function executeOrderLookup(rawArgs: unknown, authenticatedUserId: string) {
  // 1. Validate LLM-supplied arguments deterministically
  const parsed = LookupArgsSchema.safeParse(rawArgs);
  if (!parsed.success) {
    return { error: 'INVALID_ARGS', details: parsed.error.flatten() };
  }

  // 2. Enforce server-side authorization—never trust userId from the model!
  const order = await db.query(
    'SELECT id, status, total_cents FROM orders WHERE id = $1 AND user_id = $2',
    [parsed.data.orderId, authenticatedUserId]
  );
  return order.rows[0] ?? { error: 'ORDER_NOT_FOUND' };
}`,
          },
          lineByLineMarkdown: [
            '- **Lines 5–8**: Validates model-generated arguments with Zod and feeds validation errors cleanly back so the model can self-correct.',
            '- **Lines 11–14**: Binds `authenticatedUserId` from the verified session—not from tool arguments—preventing prompt-injected cross-user data leaks.',
          ].join('\n'),
        },
      ],
      backendApplicationsMarkdown:
        'Use structured outputs for ticket classification, invoice extraction, and routing decisions; use SSE streaming for chat/copilot responses; and always enforce server-side session auth inside every tool handler.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Streaming + Structured JSON conflict**: If you wait to validate a full JSON blob with Zod, you can’t act on incomplete half-JSON tokens cleanly—stream prose directly to UI, or emit newline-delimited incremental JSON/events for multi-field workflows.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Production LLM integration pairs server-side keys and abortable timeouts with SSE streaming for perceived speed, schema-constrained + Zod-validated structured outputs for determinism, and auth-scoped tool handlers.',
    },
    {
      id: 'topic-16.4.5',
      topicId: '16.4.5',
      coveredTopicIds: ['16.4.6', '16.4.7'],
      title: 'Embeddings, vector databases, and Retrieval-Augmented Generation (RAG)',
      problemAndRequirementsMarkdown: [
        '### First principles: Why models don’t know your company docs—and why pasting 10,000 docs into a prompt fails',
        'Pre-trained models don’t know your private HR handbook or yesterday’s support articles. Fine-tuning weights is slow, expensive, and still hallucinates facts. Meanwhile, stuffing 500 MB of docs into every prompt hits context limits and costs dollars per click!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Semantic Search + Grounded Generation (RAG)',
        '1. **Embeddings**: Neural models convert text chunks into fixed-length numerical arrays (**vectors**, e.g., 1,536 floats) where **semantically similar meanings sit geometrically close together** (*“reset MFA token”* sits close to *“lost two-factor authenticator”* even with zero overlapping keywords!).',
        '2. **Vector databases (`pgvector`, `Qdrant`, `Pinecone`)**: Store those embedding vectors alongside **document metadata (`tenantId`, `visibility`, `docId`)** and index them with approximate nearest-neighbor structures (**HNSW / IVFFlat**) for millisecond similarity search.',
        '3. **Retrieval-Augmented Generation (RAG)**: Split documents into clean chunks → embed & index them → at query time, embed the user’s question → retrieve top-K chunks (often **hybrid search**: vector similarity + keyword `BM25` + metadata ACL filters + reranking) → inject those verified chunks into the prompt with instructions to cite sources and admit *“I don’t know”* when missing.',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'If your stack already uses PostgreSQL, `pgvector` keeps vector similarity and SQL **row-level permission filters (`WHERE tenant_id = $1`)** inside one transactional database—eliminating sync drift between Postgres and a separate vector store!',
      edgeCasesAndTradeOffsMarkdown: [
        '- **ACL / Permission leaks in RAG**: Filtering permissions *after* taking top-5 global vector matches can drop all 5 results if the top hits belonged to another user—always apply `tenant_id` / access-control predicates **inside** the vector query filter!',
        '- **Garbage-in chunking**: Splitting mid-sentence or stripping section headers ruins retrieval quality far more often than model choice.',
      ].join('\n\n'),
      centralIdeaSummary:
        'RAG grounds LLM answers in up-to-date private data by converting text chunks into embeddings, filtering and searching them in vector databases with strict tenant ACLs, and passing retrieved evidence into generation.',
    },
    {
      id: 'topic-16.4.8',
      topicId: '16.4.8',
      coveredTopicIds: ['16.4.9', '16.4.10', '16.4.11', '16.4.12', '16.4.13'],
      title: 'Async inference, long-running workflows, state, cost, observability, and recovery',
      problemAndRequirementsMarkdown: [
        '### First principles: Running 5-minute multi-step AI jobs without blowing HTTP timeouts or budgets',
        'Suppose an AI workflow extracts 200 PDF pages, queries 4 APIs, and generates a compliance report taking **3 minutes**. No ALB HTTP request stays open for 3 minutes (`504 Gateway Timeout`), a container restart mid-way wastes `$2` of tokens unless state is checkpointed, and an unthrottled user loop can burn `$5,000` overnight!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Productionizing Heavy & Long-Running AI Systems',
        '1. **Asynchronous inference**: For batch jobs (document ingestion, report synthesis, evaluations), accept `POST /jobs → 202 Accepted { jobId }`, enqueue work (`BullMQ`/`SQS`), and push completion via WebSocket/SSE or polling (`9.1`).',
        '2. **Long-running agent workflows & Agent execution state**: Persist every workflow step’s checkpoint, intermediate tool outputs, and token counters into PostgreSQL/workflow storage (`agent_runs`, `agent_steps`). If Worker #2 dies on Step 4 of 7, Worker #3 resumes right from Step 4 without repeating Steps 1–3!',
        '3. **Usage and cost management**: Track input/output tokens per `tenantId`/`userId`, enforce **per-user rate limits & monthly spend quotas**, route simple tasks (classification/routing) to small fast models, and cache identical prompt/embedding prefixes.',
        '4. **Observability**: Log structured traces (`traceId`, `promptVersion`, `model`, `latencyMs`, `ttftMs`, `inputTokens`, `outputTokens`, `toolErrors`, `estimatedCostUsd`) and run automated **evals** on sample datasets before swapping prompts or models.',
        '5. **Retry and recovery**: Distinguish transient `429 Rate Limit` / `503` (exponential backoff with `Retry-After` + fallback model provider) from permanent `400 Bad Request` / content-policy errors (fail fast cleanly, never retry forever).',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'Every multi-tenant SaaS AI feature needs three guards on day one: `tenant_id` token metering, per-request `max_tokens` + `maxSteps` caps, and durable queue workers for tasks exceeding ~10 seconds.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Retrying blind duplicates token bills**: If an upstream call timed out at 30s *after* generating 4,000 tokens, naive retries double-charge; use reasonable timeouts and checkpoint completed sub-steps immediately.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Long-running AI workloads belong on async queues with checkpointed execution state, protected by token/cost quotas, model-level observability (latency, tokens, cost, evals), and error-aware retry/fallback policies.',
    },
  ],
  conceptConnection: {
    title: 'Full AI-Powered Backend Architecture',
    narrativeMarkdown: [
      'Notice how interactive speed, private knowledge, and durable scale split cleanly across two paths:',
      '- **Interactive Low-Latency Path**: `Client ◀─SSE─▶ API ─▶ Auth-scoped RAG (Embeddings + Vector DB) ─▶ LLM (Structured Output / Tools)`.',
      '- **Heavy / Multi-Step Path**: `POST /jobs (202) ─▶ Queue ─▶ Worker (Checkpointed Agent Execution State + Retry/Fallback)` — both governed by **Usage/Cost Management** and **Observability**.',
    ].join('\n\n'),
    integratedExample: {
      id: '16.4-integrated-example',
      title: 'Dual Interactive + Async AI Backend Blueprint',
      language: 'text',
      code: `Interactive Chat: Client ◀─(SSE)─▶ API (Cost Guard + Zod Validation)
                                       ├──▶ Vector DB (pgvector + tenant_id ACL)
                                       └──▶ LLM API (Streaming + Auth-Scoped Tools)

Heavy Workflow:   Client ─(202)─▶ Queue ─▶ Worker (DB Checkpointed Agent State)
                                               └─▶ Telemetry (Tokens, Cost, Latency, Trace)`,
    },
    walkthroughMarkdown:
      'Switch to **Recipe Mode** for working SSE streaming, Zod-validated structured outputs, `pgvector` tenant-isolated RAG, and token/cost telemetry middleware.',
  },
  questions: [
    {
      id: '16.4-kc-1',
      focusArea: 'Streaming, Structured Outputs, Auth-Scoped Tools & RAG ACLs',
      prompt:
        'You’re building a multi-tenant support copilot that searches internal help docs (**RAG** + **vector DB**), calls an `issueRefund` **tool**, and streams answers back. Name three critical production bugs if you skip **streaming**, **Zod structured validation**, or **tenant ACL filtering inside vector queries**.',
      hints: [
        'What happens to UX/ALB timeouts without streaming? What happens if a tool call relies on raw unvalidated LLM JSON or model-supplied `tenantId`?',
        'What leaks—or returns zero results—if tenant filtering happens *after* global top-K vector search?',
        'Without streaming, users wait silently 10+ seconds risking timeouts. Without Zod + session-bound auth inside tool execution, malformed args crash or prompt injections refund other users’ orders. Post-filtering global vector matches leaks cross-tenant context or drops all valid results.',
      ],
      explanation:
        '(1) Without **SSE streaming**, long responses trigger spinners and HTTP timeouts. (2) Without **structured Zod validation** and **server-bound session auth** inside `issueRefund`, invalid model arguments crash handlers or prompt injections tamper with unauthorized `userId`s. (3) Filtering `tenantId` *after* top-K **vector DB** similarity search wastes slots on inaccessible docs (or risks cross-tenant leaks)—always filter ACL metadata *inside* the vector/embedding query.',
      evaluationCriteria: [
        'Covers streaming timeout/TTFT benefit, Zod + server-enforced auth on tools, and pre-filter tenant ACLs in RAG',
      ],
      topicIds: ['16.4.1', '16.4.2', '16.4.3', '16.4.4', '16.4.5', '16.4.6', '16.4.7'],
    },
    {
      id: '16.4-kc-2',
      focusArea: 'Async Inference, Checkpointed State, Cost, Observability & Recovery',
      prompt:
        'A multi-step document-analysis agent takes 2 minutes per job, occasionally hits provider `429` rate limits on step 4, and costs `~$0.45` per run. Design the execution architecture covering **asynchronous inference**, **agent execution state**, **usage/cost management**, **observability**, and **retry and recovery**.',
      hints: [
        'Should the HTTP request stay open for 2 minutes, and should step 4 failures restart steps 1–3?',
        'What telemetry and limits protect tenants and budgets?',
        'Offload to async queue (`202` + job polling/WS); checkpoint each step’s state in DB so step 4 resumes cleanly; retry `429`/`503` with backoff/fallback while failing fast on `400`; enforce per-tenant token/spend quotas and log tokens, cost, latency, and step traces.',
      ],
      explanation:
        'Return `202 Accepted` immediately via **asynchronous inference** backed by a durable worker queue (`9.2`). Persist **agent execution state** per step in Postgres so a crash or `429` at Step 4 resumes from Step 4 instead of re-paying `$0.30` for Steps 1–3. Handle `429`/`503` via backoff + model fallback (**retry and recovery**), enforce per-tenant token/step budgets (**usage and cost management**), and emit per-step **observability** (trace ID, model, latency, token counts, USD cost).',
      evaluationCriteria: [
        'Uses async queue + DB checkpointed state to avoid HTTP timeouts and wasted re-execution',
        'Includes selective retry/fallback, per-tenant cost quotas, and token/latency observability',
      ],
      topicIds: ['16.4.8', '16.4.9', '16.4.10', '16.4.11', '16.4.12', '16.4.13'],
    },
  ],
};

export const LESSON_16_4_RECIPE: RecipeLessonContent = {
  purposeMarkdown:
    'Implement production AI backend endpoints covering streaming SSE with `AbortController`, Zod-validated structured outputs & tool execution, `pgvector` tenant-scoped RAG, async job checkpointing, token/cost tracking, observability, and rate-limit retries.',
  whenToUseMarkdown:
    'Use whenever building user-facing AI features, RAG pipelines, or background LLM workflows inside a TypeScript/Node backend.',
  setupCommands: [
    {
      id: '16.4-cmd-1',
      label: 'Install official AI SDK, Zod validation & pgvector support',
      command: 'npm install @google/genai zod pgvector',
      notes: 'Keep LLM API keys exclusively on the backend server via environment variables or Secrets Manager.',
    },
    {
      id: '16.4-cmd-2',
      label: 'Enable pgvector & create HNSW index with tenant metadata in Postgres',
      command:
        'psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS vector; CREATE INDEX IF NOT EXISTS docs_emb_hnsw ON doc_chunks USING hnsw (embedding vector_cosine_ops);"',
      notes: 'Indexes chunk embeddings inside Postgres so tenant ACLs filter inside the exact SQL query.',
    },
  ],
  coreApisMarkdown: [
    '- **Server-Side Client & Streaming**: `POST /api/ai/chat` returns `Content-Type: text/event-stream` and wires `req.on("close")` to an `AbortController` so dropped tabs cancel billing.',
    '- **Structured Outputs & Tool Execution**: Pass JSON Schema (`responseSchema`) + parse server-side with `zod.safeParse()`; inject `userId`/`tenantId` strictly from verified session auth.',
    '- **Tenant-Isolated RAG + Async State**: Query `WHERE tenant_id = $1 ORDER BY embedding <=> $2 LIMIT 5`, run multi-minute agents via `202` queue jobs checkpointed per step, and log `{ traceId, model, inputTokens, outputTokens, costUsd, latencyMs }`.',
  ].join('\n'),
  workflowSteps: [
    {
      stepNumber: 1,
      title: 'Gate requests with quota checks, timeouts & streaming AbortController',
      detailMarkdown:
        'Check per-tenant daily/monthly token quotas in Redis before invoking the model; attach `AbortController` on client disconnect and emit SSE chunks cleanly.',
    },
    {
      stepNumber: 2,
      title: 'Validate structured outputs/tools with Zod & filter RAG by tenant ACLs',
      detailMarkdown:
        'Never run raw `JSON.parse` or trust model-supplied user IDs; bind `tenantId` inside SQL vector queries and Zod-validate every tool invocation.',
    },
    {
      stepNumber: 3,
      title: 'Checkpoint async workflows, retry 429s selectively & emit cost telemetry',
      detailMarkdown:
        'Persist step results for multi-step background agents, retry `429`/`503` with exponential backoff + jitter (not `400` invalid inputs), and record token usage & cost per request.',
    },
  ],
  workingExamples: [
    {
      id: '16.4-ex-rag',
      title: 'Tenant-Scoped pgvector RAG + Retry & Cost Telemetry Wrapper',
      language: 'typescript',
      code: `import { z } from 'zod';

const ClassificationSchema = z.object({
  category: z.enum(['billing', 'technical', 'account']),
  urgency: z.enum(['low', 'high']),
});

// Tenant-isolated vector search: ACL enforced BEFORE top-K ranking
export async function searchTenantKnowledge(
  tenantId: string,
  queryVector: number[],
  limit = 5
) {
  const vectorLiteral = \`[\${queryVector.join(',')}]\`;
  const res = await db.query(
    \`SELECT id, title, content
     FROM doc_chunks
     WHERE tenant_id = $1
     ORDER BY embedding <=> $2::vector
     LIMIT $3\`,
    [tenantId, vectorLiteral, limit]
  );
  return res.rows;
}

// Retry strictly transient rate/upstream errors, log tokens & cost
export async function withModelRetry<T>(
  run: () => Promise<{ data: T; usage: { inputTokens: number; outputTokens: number } }>,
  traceId: string
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const start = performance.now();
      const result = await run();
      logger.info({ traceId, latencyMs: Math.round(performance.now() - start), ...result.usage });
      return ClassificationSchema.parse(result.data);
    } catch (err: any) {
      const status = err?.status;
      if ((status === 429 || status >= 500) && attempt < 2) {
        await new Promise((r) => setTimeout(r, 300 * 2 ** attempt));
        continue;
      }
      throw err;
    }
  }
}`,
      explanation:
        'Combines strict tenant filtering inside vector search, Zod verification on structured output, selective transient retries, and structured latency/token logging.',
    },
  ],
  commonMistakes: [
    {
      mistake: 'Calling LLM APIs directly from browser React code with `VITE_GEMINI_API_KEY`.',
      fix: 'Route all model calls through authenticated backend `/api/*` endpoints so keys, quotas, and tool execution stay protected.',
    },
    {
      mistake: 'Retrying `400 Bad Request` schema/prompt failures 5 times or ignoring client disconnects on SSE.',
      fix: 'Only retry transient `429`/`5xx` statuses and wire `req.on("close", () => controller.abort())` on every stream.',
    },
  ],
  exercise: {
    id: '16.4-recipe-ex',
    title: 'Wire an Abort-Safe SSE + Tenant-Scoped RAG Endpoint',
    instructionsMarkdown:
      'Design a `POST /api/assistant/ask` route that checks a Redis tenant token budget, runs `searchTenantKnowledge(req.user.tenantId, ...)`, streams model tokens via SSE with `AbortController` on socket close, and logs `traceId`, tokens, and latency.',
    acceptanceChecklist: [
      'API key stays strictly server-side; tenant quota checked before inference',
      'Vector query filters `WHERE tenant_id = $1` before `LIMIT` ranking',
      '`AbortController` cancels in-flight inference when client closes SSE connection',
      'Structured telemetry logs latency, traceId, and token usage; retries only 429/5xx',
    ],
  },
};

export const LESSON_16_5: FptLessonContent = {
  mode: 'theory_first',
  introduction: {
    summaryMarkdown: [
      'Demo agents run on a laptop with one user. **Production agent infrastructure** runs thousands of autonomous workflows unattended across untrusted user inputs, flaky external APIs, container restarts, and strict enterprise security audits!',
      'In this capstone unit of Backend Forge, we connect distributed systems (`Block 13`), cloud isolation (`Block 14`), and AI runtime mechanics (`16.2`, `16.4`) into one cohesive production platform: **isolated tool execution**, **least-privilege permissions**, **idempotent tool operations**, **job orchestration**, **persistent agent state**, **approval workflows**, **execution traces**, and **failure handling**.',
    ].join('\n\n'),
    whyItMattersMarkdown:
      'An agent calling external tools without idempotency, sandboxing, persistent state, or execution traces will eventually double-charge a customer, leak data across tenants, or leave you unable to explain what happened in production.',
    prerequisites: [
      {
        subBlockId: '13.4',
        label: 'Distributed Transactions & Idempotency (13.4)',
        detail: 'Making retries safe across external APIs and queues.',
      },
      {
        subBlockId: '16.4',
        label: 'AI-Powered Backend Systems (16.4)',
        detail: 'Checkpointed async inference, RAG, and tool calling.',
      },
    ],
  },
  topicSections: [
    {
      id: 'topic-16.5.1',
      topicId: '16.5.1',
      coveredTopicIds: ['16.5.2', '16.5.3'],
      title: 'Isolated tool execution, least-privilege permissions, and idempotent tool operations',
      problemAndRequirementsMarkdown: [
        '### First principles: Securing untrusted execution & surviving duplicate retries',
        'Two nightmares strike production agents immediately if tools run inside your main API server without guards:',
        '1. **Security / Stability nightmare**: A user triggers a code-execution or SQL-reporting tool that crashes Node’s main event loop, reads `/proc/self/environ`, or calls AWS with admin IAM rights.',
        '2. **Financial / Data-integrity nightmare**: Step 3 calls `sendInvoiceEmail` or `chargeCustomer`, the worker times out before saving the checkpoint, the job orchestrator retries Step 3—**and charges the customer twice!**',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Hardening Production Tool Runners',
        '- **Isolated tool execution**: Execute risky or compute-heavy tools (code sandboxes, headless browsers, untrusted file parsers) in **separate ephemeral sandboxes / microVMs / Fargate tasks** (`14.3`, `16.2`) completely isolated from the orchestrator’s secrets and other tenants’ memory.',
        '- **Least-privilege permissions**: Issue scoped per-run / per-tenant credentials (`readonly` DB role for analytics tools, short-lived OAuth scopes, strict outbound egress allowlists)—never share one omnipotent service account across every tool.',
        '- **Idempotent tool operations**: Every state-mutating tool (`createTicket`, `refundPayment`, `sendSlackAlert`) receives a deterministic **`idempotencyKey = "${runId}:${stepIndex}:${toolCallId}"`** derived from the workflow step! Even if a worker crashes and retries Step 3 five times, downstream systems apply the mutation **exactly once**.',
      ].join('\n\n'),
      codeExamples: [
        {
          snippet: {
            id: '16.5.3-ex-1',
            title: 'Deterministic per-step idempotency key for safe agent retries',
            language: 'typescript',
            code: `async function runBillingToolSafely(
  runId: string,
  stepNumber: number,
  customerId: string,
  amountCents: number
) {
  // Retrying the same failed step produces the EXACT same key; a later step gets a new one
  const idempotencyKey = \`agent:\${runId}:step:\${stepNumber}\`;

  return stripe.refunds.create(
    { payment_intent: customerId, amount: amountCents },
    { idempotencyKey }
  );
}`,
          },
          lineByLineMarkdown: [
            '- **Line 8**: Derives the idempotency key from `(runId, stepNumber)`—not `crypto.randomUUID()`! Generating a random UUID on retry defeats idempotency completely.',
          ].join('\n'),
        },
      ],
      backendApplicationsMarkdown:
        'Combine isolated sandbox workers (for untrusted inputs/code) with `(runId, stepNumber)` idempotency keys on all external mutating tool adapters.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Re-planning breaks step-index keys if steps shift**: If an agent regenerates a new `toolCallId` on retry, tie the idempotency key to the persisted `stepId` / logical operation ID recorded *before* invoking the external API.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Production tools run in isolated sandboxes with strictly scoped least-privilege credentials and deterministic step-level idempotency keys so retries never cause security leaks or duplicate side effects.',
    },
    {
      id: 'topic-16.5.4',
      topicId: '16.5.4',
      coveredTopicIds: ['16.5.5', '16.5.6'],
      title: 'Job orchestration, persistent agent state, and approval workflows',
      problemAndRequirementsMarkdown: [
        '### First principles: How an agent pauses 6 hours waiting for a human to click “Approve”—without wasting a container',
        'Suppose a finance agent prepares a `$12,000` vendor payout and needs manager sign-off before executing. If that workflow sits blocked in a Node.js `await waitForManager()` loop in RAM, what happens if the server deploys or scales down two hours later? That paused workflow evaporates—or worse, wastes worker slots waiting!',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Durable Execution: State Machines + Suspend/Resume Approvals',
        '1. **Persistent agent state**: Store every workflow run as an explicit state machine in Postgres / durable execution engines (`Temporal`, `Inngest`, queue + DB tables): `run_id`, `status` (`RUNNING | WAITING_APPROVAL | COMPLETED | FAILED`), `messages[]`, `step_cursor`, `token_spent`, `pending_tool_call`.',
        '2. **Job orchestration**: Workers pick up one step or short turn, checkpoint output atomically to **persistent agent state**, and either enqueue the next step (`RUNNING`) or go to sleep freeing 100% of RAM/CPU (`WAITING_APPROVAL`).',
        '3. **Approval workflows**: When the agent proposes a gated action (`transferFunds`), the orchestrator writes an `approval_requests` row with a signed **one-time approval token + payload hash** (so nobody can swap the dollar amount while waiting!), notifies Slack/UI, and suspends. When a verified authorized user approves (and the payload hash matches), the orchestrator re-enqueues the run to resume cleanly!',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'Modeling approvals as database-persisted `WAITING_APPROVAL` states with TTL expirations lets workflows wait minutes or days with zero open sockets or idle containers.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Stale state after long pauses**: Between proposing `refund($50)` and manager approval 4 hours later, another system might have already refunded that order! Re-validate domain preconditions right after resuming from `WAITING_APPROVAL`.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Durable job orchestration backed by persistent agent state turns multi-step loops and human approval workflows into crash-safe, zero-idle-compute suspend/resume state machines.',
    },
    {
      id: 'topic-16.5.7',
      topicId: '16.5.7',
      coveredTopicIds: ['16.5.8'],
      title: 'Execution traces and systemic failure handling',
      problemAndRequirementsMarkdown: [
        '### First principles: Answering “Why did the agent send that email at 3:14 AM?”',
        'Unlike deterministic `if/else` code, an agent’s exact path varies dynamically at runtime. When a customer complains about a wrong response or failed workflow, ordinary log lines (*“Job #88 failed”*) tell you nothing unless you can replay the entire decision tree.',
      ].join('\n\n'),
      conceptAndMechanismMarkdown: [
        '### Trace Trees & Layered Failure Handling',
        '1. **Execution traces**: Record a structured hierarchical trace tree (`OpenTelemetry` spans + stored trace records) for every run: `Run Span → Step Span → [Prompt Version + Redacted Context + Retrieved Docs + Model Decision + Latency + Tokens] → Tool Execution Span [Tool Name + Validated Args + Result/Error]`. Now any incident can be inspected step-by-step!',
        '2. **Failure handling (Defense-in-Depth)**:',
        '   - **Budget & Circuit Breakers**: Hard `maxSteps`, `maxCostUsd`, and wall-clock timeouts; circuit-break flaky external tools (`12.5`).',
        '   - **Poison-pill protection & DLQs**: After bounded retries on transient errors (`429`, `503`), route permanently failing runs to a Dead-Letter Queue / `FAILED` state with a clean user-facing fallback message and alert.',
        '   - **PII / Secret Redaction**: Scrub bearer tokens, credit cards, and sensitive headers *before* writing execution traces to storage!',
      ].join('\n\n'),
      codeExamples: [],
      backendApplicationsMarkdown:
        'Pair every production `agent_run_id` with an OpenTelemetry `traceId` linking API gateway → Queue → LLM calls → Tool calls → DB writes into one searchable waterfall.',
      edgeCasesAndTradeOffsMarkdown: [
        '- **Tracing huge payloads**: Don’t store megabytes of raw PDFs inside trace spans—log hashes/S3 references plus truncated previews and redacted tool args to keep trace storage fast and compliant.',
      ].join('\n\n'),
      centralIdeaSummary:
        'Hierarchical execution traces capture every prompt, retrieval, model turn, and tool call (with PII redacted) for auditability, while hard step/cost limits, circuit breakers, and DLQs contain production failures.',
    },
  ],
  conceptConnection: {
    title: 'Capstone: The Complete Production Agent Platform',
    narrativeMarkdown: [
      'Notice how **every** block of Backend Forge converges here in `16.5`:',
      '- **Persistence & Reliability (Blocks 5, 9, 12, 13)**: **Job orchestration**, **Persistent agent state**, **Idempotent tool operations**, **Execution traces**, and **Failure handling / DLQs**.',
      '- **Security & Cloud Isolation (Blocks 7, 14, 16)**: **Isolated tool execution**, **Least-privilege permissions**, and cryptographic **Approval workflows**.',
    ].join('\n\n'),
    integratedExample: {
      id: '16.5-integrated-example',
      title: 'Production Agent Infrastructure Architecture',
      language: 'text',
      code: `API ─▶ [Job Orchestrator + Persistent State DB (RUNNING | WAITING_APPROVAL | FAILED)]
           │
           ├── Safe Read/LLM Step ─▶ Emit Hierarchical Execution Trace (PII Redacted)
           ├── Risky Action       ─▶ Suspend (WAITING_APPROVAL) + Signed Approval Token
           └── Mutating/Code Tool ─▶ [Isolated Sandbox Runner]
                                        ├─ Least-Privilege Scoped Token
                                        └─ Idempotency Key (runId:stepId)`,
    },
    walkthroughMarkdown:
      'Congratulations on completing the full 17-block Backend Forge curriculum—from TypeScript fundamentals (`0.1`) all the way to resilient, secure, production AI agent infrastructure (`16.5`).',
  },
  questions: [
    {
      id: '16.5-kc-1',
      focusArea: 'Isolation, Least Privilege & Idempotent Tool Operations',
      prompt:
        'An autonomous billing agent runs tools directly inside your main Express process using admin API keys, and uses `crypto.randomUUID()` as the Stripe `Idempotency-Key` inside its `charge` tool. Identify three severe production flaws and how **isolated tool execution**, **least-privilege permissions**, and **idempotent tool operations** fix them.',
      hints: [
        'What happens if a tool hangs/crashes Node or suffers prompt injection? What happens if Stripe succeeds, the worker crashes, and the tool generates a brand-new random UUID on retry?',
        'How should the idempotency key be derived instead?',
        'Running in-process risks crashing/leaking main API secrets (needs isolated sandboxes + least-privilege scoped creds). Generating a random UUID inside the retry defeats idempotency and double-charges customers—derive the idempotency key deterministically from the persisted `(runId, stepId)`.',
      ],
      explanation:
        '(1) Running tools inside the main Express process exposes process secrets and event-loop stability—use **isolated tool execution** (separate sandboxes/containers). (2) Sharing admin keys violates **least-privilege permissions**—scope per-tool/per-tenant credentials strictly. (3) Generating `randomUUID()` on every invocation creates a new key on retry, causing double charges! Derive **idempotent tool operations** from a persisted deterministic `(runId, stepId)` stored before calling Stripe.',
      evaluationCriteria: [
        'Identifies isolation/event-loop/secret leak risks and prescribes sandboxed execution + least privilege',
        'Spots broken per-retry random UUID and prescribes persisted deterministic `(runId, stepId)` idempotency key',
      ],
      topicIds: ['16.5.1', '16.5.2', '16.5.3'],
    },
    {
      id: '16.5-kc-2',
      focusArea: 'Orchestration, Persistent State, Approvals, Traces & Failures',
      prompt:
        'Design a production workflow where an agent investigates a security alert, pauses up to 24 hours for a human admin’s approval to revoke user tokens, and handles tool timeouts cleanly—using **job orchestration**, **persistent agent state**, **approval workflows**, **execution traces**, and **failure handling**.',
      hints: [
        'Why shouldn’t a worker process stay blocked in memory waiting 24 hours for approval?',
        'What data ensures an audit log can explain every decision safely without leaking secrets?',
        'Checkpoint persistent agent state in DB (`WAITING_APPROVAL`) and free worker compute; resume via signed approval token + re-verified preconditions; bound retries with maxSteps/cost caps + DLQ failure handling; log redacted hierarchical execution traces.',
      ],
      explanation:
        'Use **job orchestration** backed by **persistent agent state** in Postgres: each completed investigation step checkpoints cleanly, and proposing `revokeTokens` transitions the run to `WAITING_APPROVAL` while releasing worker memory completely. Send a signed, payload-hashed **approval workflow** link; upon admin sign-off, re-check preconditions and resume execution. Guard external calls with **failure handling** (step/budget caps, backoff + circuit breakers, DLQ) and capture PII-redacted **execution traces** linking every prompt, retrieval, approval, and tool call.',
      evaluationCriteria: [
        'Uses non-blocking persistent state machine (`WAITING_APPROVAL` suspend/resume)',
        'Integrates signed approval verification, failure bounds/DLQ, and redacted execution traces',
      ],
      topicIds: ['16.5.4', '16.5.5', '16.5.6', '16.5.7', '16.5.8'],
    },
  ],
};
