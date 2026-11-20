Backend Forge
A local-first, interactive backend engineering learning platform built around First Principles Thinking (FPT), Recipe Mode, and Syntax Mode. Backend Forge pairs an authoritative 17-block, 86-unit backend engineering syllabus with structured exercises, study streak tracking, and optional AI rubric evaluation powered by Groq.
Features
Structured 17-Block Curriculum: Covers 86 sub-blocks and 726 learning objectives spanning TypeScript fundamentals, OS/Node.js internals, networking, SQL and database concurrency, security, distributed systems, cloud operations, and AI-native backend engineering.
Three Complementary Learning Modes:
First Principles Thinking (FPT): Reason from system constraints, memory/network trade-offs, and invariants with multi-tier hints, reference explanations, and open-ended conceptual prompts.
Recipe Mode: Work through repeatable implementation blueprints, architectural decision sequences, edge-case guards, and production verification checks.
Syntax Mode: Practice idiomatic implementation code, SQL queries, schemas, and protocol primitives.
Optional AI Rubric Evaluation (BYOK via Groq): Grade FPT responses directly from the browser against a 100-point, 5-criterion engineering rubric using your own Groq API key—or study completely offline with manual progression.
Progress, Streaks & Revision Queue: Tracks unit completion, mastery scores, misconceptions, focused study time via a built-in study timer, and an 18-week local-timezone activity heatmap.
Local-First Persistence & JSON Backups: Stores state in browser localStorage (backend_forge_v1) with Zod-validated schema migrations, versioned JSON export/import (excluding API keys), and progress-only reset.
Responsive Dark & Light UI: Desktop sidebar and mobile bottom navigation across five views—Dashboard, Curriculum, Learning Workspace, Progress, and Settings.
Architecture & Technical Details
Backend Forge is a client-side single-page application that separates immutable curriculum data from mutable learner state, deterministic progression logic, and optional external AI evaluation:
