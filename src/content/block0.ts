import { SubBlockLessonContent } from '../types';
import { LESSON_0_1 } from './lesson01';
import { LESSON_0_2 } from './lesson02';

export const BLOCK_0_CONTENT: Record<string, SubBlockLessonContent> = {
  '0.1': {
    subBlockId: '0.1',
    fpt: LESSON_0_1,
  },
  '0.2': {
    subBlockId: '0.2',
    fpt: LESSON_0_2,
  },
  '0.3': {
    subBlockId: '0.3',
    recipe: {
      purposeMarkdown:
        'Derive strict Data Transfer Objects (DTOs), partial update payloads, typed lookup dictionaries, and inferred handler return types from canonical domain entities using TypeScript built-in utility types without duplicating field definitions.',
      whenToUseMarkdown:
        'Use utility types whenever creating API request/response projections (`Pick`, `Omit`), `PATCH` update inputs (`Partial`), dictionary maps (`Record`), or deriving types from existing factory/query functions (`ReturnType`).',
      setupCommands: [
        {
          id: '0.3-cmd-1',
          label: 'Run TypeScript compiler check without emitting files',
          command: 'npx tsc --noEmit',
          notes: 'Verifies derived utility types across your backend modules.',
        },
      ],
      coreApisMarkdown: [
        '- `Pick<T, K>`: Constructs a type by selecting specific keys `K` from `T`. Ideal for public response DTOs.',
        '- `Omit<T, K>`: Constructs a type by removing keys `K` from `T`. Ideal for stripping sensitive fields like `passwordHash` or server-generated fields (`id`, `createdAt`) from creation inputs.',
        '- `Partial<T>`: Marks all properties of `T` optional. Ideal for `PATCH` update payloads (paired with runtime non-empty checks).',
        '- `Record<K, V>`: Maps every key in union/string `K` to value type `V`. Ideal for role permission tables and lookup maps.',
        '- `ReturnType<F>`: Extracts the return type of a function type `typeof fn` without re-declaring an interface.',
      ].join('\n'),
      workflowSteps: [
        {
          stepNumber: 1,
          title: 'Define the canonical domain entity once',
          detailMarkdown:
            'Keep a single authoritative entity interface (e.g., `UserRecord`) as the source of truth for field types.',
        },
        {
          stepNumber: 2,
          title: 'Project public DTOs with Pick and Omit',
          detailMarkdown:
            'Use `Pick` for explicit allow-listed response shapes and `Omit` for creation inputs excluding DB-generated fields.',
          code: {
            id: '0.3-step-2',
            title: 'DTO projections with Pick and Omit',
            language: 'typescript',
            code: `interface UserRecord {\n  id: string;\n  email: string;\n  passwordHash: string;\n  role: "admin" | "member";\n  createdAt: Date;\n}\n\nexport type PublicUserDto = Pick<UserRecord, "id" | "email" | "role">;\nexport type CreateUserInput = Omit<UserRecord, "id" | "createdAt">;`,
          },
        },
        {
          stepNumber: 3,
          title: 'Build PATCH updates with Partial and lookups with Record',
          detailMarkdown:
            'Combine `Partial<Pick<...>>` so immutable fields (`id`, `createdAt`) cannot be patched, and use `Record` for exhaustive role mappings.',
        },
        {
          stepNumber: 4,
          title: 'Infer factory outputs with ReturnType',
          detailMarkdown:
            'Use `ReturnType<typeof buildConfig>` so you derive a type straight from a builder function instead of maintaining a duplicate interface by hand.',
        },
      ],
      workingExamples: [
        {
          id: '0.3-ex-1',
          title: 'Complete DTO, Patch, Role Map, and ReturnType workflow',
          language: 'typescript',
          code: `type Role = "admin" | "member" | "viewer";\n\ninterface Account {\n  id: string;\n  email: string;\n  passwordHash: string;\n  role: Role;\n}\n\n// 1. Pick: explicit allow-list prevents leaking passwordHash\ntype AccountResponse = Pick<Account, "id" | "email" | "role">;\n\n// 2. Omit: strip server-managed id\ntype CreateAccountDto = Omit<Account, "id">;\n\n// 3. Partial: allow updating subset of mutable fields\ntype UpdateAccountDto = Partial<Pick<Account, "email" | "role">>;\n\n// 4. Record: compiler enforces every Role has permissions\nconst ROLE_PERMISSIONS: Record<Role, readonly string[]> = {\n  admin: ["read", "write", "delete"],\n  member: ["read", "write"],\n  viewer: ["read"],\n};\n\n// 5. ReturnType: infer output from builder function\nfunction createSessionContext(userId: string) {\n  return { userId, issuedAt: Date.now() };\n}\ntype SessionContext = ReturnType<typeof createSessionContext>;`,
          explanation:
            'Combining `Pick`, `Omit`, `Partial`, `Record`, and `ReturnType` keeps types synchronized when `Account` or `Role` changes.',
        },
      ],
      commonMistakes: [
        {
          mistake:
            'Using `Omit<User, "passwordHash">` for public API responses.',
          fix: 'Prefer `Pick` (allow-list) over `Omit` (deny-list) for external responses—if someone adds a new sensitive column like `mfaSecret`, `Pick` never leaks it automatically.',
        },
        {
          mistake: 'Passing `Partial<Entity>` directly to `PATCH` handlers.',
          fix: 'Combine `Partial<Pick<Entity, "allowedField">>` so `id` or `createdAt` cannot be overwritten, and validate at runtime that at least one field is provided.',
        },
        {
          mistake: 'Using `Record<string, T>` when keys are a fixed union.',
          fix: 'Use `Record<MyUnion, T>` for compile-time exhaustiveness, or `Partial<Record<string, T>>` when arbitrary keys may be missing (`undefined`).',
        },
      ],
      exercise: {
        id: '0.3-ex',
        title: 'Design Derived Backend Contracts',
        instructionsMarkdown:
          'Given `interface Invoice { id: string; customerId: string; amountCents: number; status: "draft" | "sent" | "paid"; internalAuditNote: string; }`, construct:\n1. `PublicInvoiceDto` using `Pick` (excluding `internalAuditNote`).\n2. `CreateInvoiceInput` using `Omit` (excluding `id`).\n3. `PatchInvoiceInput` using `Partial` + `Pick` (only `amountCents` and `status`).\n4. `STATUS_LABELS` using `Record` for all 3 statuses.\n5. A `buildSummary` function and `SummaryOutput` via `ReturnType`.',
        acceptanceChecklist: [
          'PublicInvoiceDto uses Pick and excludes internalAuditNote',
          'CreateInvoiceInput omits id',
          'PatchInvoiceInput prevents modifying id or customerId',
          'Record covers all three literal invoice statuses',
          'ReturnType<typeof buildSummary> compiles cleanly under strict mode',
        ],
      },
    },
  },
  '0.4': {
    subBlockId: '0.4',
    syntax: {
      referenceMarkdown: [
        'Two small setup details trip up many Node.js + TypeScript backends: mismatched module formats (`import` vs `require`) and unvalidated environment variables crashing mid-request instead of at startup.',
        'Node.js supports both **ECMAScript Modules (ESM)** (`import`/`export`) and **CommonJS (CJS)** (`require`/`module.exports`), controlled by `package.json` `"type"` and `tsconfig.json` `module` / `moduleResolution`. Meanwhile, OS environment variables arrive in `process.env` as `string | undefined` and should be parsed into a typed config object once when the server boots.',
      ].join('\n\n'),
      commonCommands: [
        {
          id: '0.4-cmd-1',
          label: 'Run TypeScript file directly with tsx (ESM & CJS interop)',
          command: 'npx tsx src/server.ts',
        },
        {
          id: '0.4-cmd-2',
          label: 'Inspect resolved TypeScript config',
          command: 'npx tsc --showConfig',
        },
        {
          id: '0.4-cmd-3',
          label: 'Run Node.js with a local .env file (Node 20.6+)',
          command: 'node --env-file=.env dist/server.js',
        },
      ],
      importantParameters: [
        {
          name: 'package.json "type"',
          type: '"module" | "commonjs"',
          description:
            'Determines whether .js files are parsed by Node.js as ESM ("module") or CommonJS ("commonjs", default).',
        },
        {
          name: 'tsconfig "module"',
          type: '"NodeNext" | "ESNext" | "CommonJS"',
          description:
            'Controls emitted module format. Use "NodeNext" for native Node ESM/CJS resolution or "ESNext" with bundlers/tsx.',
        },
        {
          name: 'tsconfig "moduleResolution"',
          type: '"NodeNext" | "Bundler"',
          description:
            'Matches import specifier resolution rules (explicit .js extensions required under NodeNext ESM).',
        },
        {
          name: 'process.env[KEY]',
          type: 'string | undefined',
          description:
            'All OS environment variables arrive as strings or undefined; numbers and booleans require explicit parsing.',
        },
      ],
      configurationMarkdown: [
        '```json',
        '// tsconfig.json (NodeNext ESM backend)',
        '{',
        '  "compilerOptions": {',
        '    "target": "ES2022",',
        '    "module": "NodeNext",',
        '    "moduleResolution": "NodeNext",',
        '    "strict": true,',
        '    "noUncheckedIndexedAccess": true,',
        '    "outDir": "dist"',
        '  }',
        '}',
        '```',
      ].join('\n'),
      examples: [
        {
          id: '0.4-ex-1',
          title: 'ESM vs CommonJS syntax comparison',
          language: 'typescript',
          code: `// ESM (recommended for modern Node.js + TS)\nimport http from "node:http";\nimport { loadConfig } from "./config.js";\nexport const server = http.createServer();\n\n// CommonJS (legacy)\nconst httpCjs = require("node:http");\nmodule.exports = { server: httpCjs.createServer() };`,
        },
        {
          id: '0.4-ex-2',
          title: 'Fail-fast type-safe configuration with Zod',
          language: 'typescript',
          code: `import { z } from "zod";\n\nconst envSchema = z.object({\n  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),\n  PORT: z.coerce.number().int().min(1).max(65535).default(3000),\n  DATABASE_URL: z.string().url(),\n  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),\n});\n\nexport type AppConfig = z.infer<typeof envSchema>;\n\nexport function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {\n  const parsed = envSchema.safeParse(env);\n  if (!parsed.success) {\n    console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);\n    process.exit(1);\n  }\n  return parsed.data;\n}`,
        },
      ],
      commonMistakes: [
        {
          mistake:
            'Omitting `.js` extension in relative imports when `moduleResolution` is `NodeNext` with ESM.',
          fix: 'Import `./config.js` even when source file is `./config.ts`—TypeScript resolves `.ts` during checking and Node ESM resolves `.js` at runtime.',
        },
        {
          mistake:
            'Reading `Boolean(process.env.ENABLE_CACHE)` directly in code.',
          fix: '`Boolean("false")` evaluates to `true` in JS! Parse `"true" | "false"` explicitly via schema validation at startup.',
        },
      ],
      quickExercise: {
        id: '0.4-ex',
        title: 'Validate Backend Startup Environment',
        promptMarkdown:
          'Write a `loadConfig` function using `zod` that parses `PORT` (number, default `4000`), `JWT_SECRET` (min 32 chars), and `ENABLE_METRICS` (string `"true"`/`"false"` transformed to boolean), exiting immediately if invalid.',
        expectedOutcome:
          'Calling `loadConfig` returns a strictly typed readonly config object with parsed types and fails fast on missing `JWT_SECRET`.',
      },
    },
  },
};
