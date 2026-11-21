import { z } from 'zod';
import { EvaluationRequest, StructuredEvaluationResponse } from '../types';

export const GROQ_API_ENDPOINT =
  'https://api.groq.com/openai/v1/chat/completions';

export const GROQ_AVAILABLE_MODELS = [
  {
    id: 'llama-3.3-70b-versatile',
    label: 'Llama 3.3 70B Versatile (Recommended)',
  },
  {
    id: 'openai/gpt-oss-120b',
    label: 'OpenAI GPT-OSS 120B',
  },
  {
    id: 'openai/gpt-oss-20b',
    label: 'OpenAI GPT-OSS 20B (Fast)',
  },
  {
    id: 'llama-3.1-8b-instant',
    label: 'Llama 3.1 8B Instant (Fast)',
  },
  {
    id: 'mixtral-8x7b-32768',
    label: 'Mixtral 8x7B 32K',
  },
] as const;

export const structuredEvaluationSchema = z.object({
  score: z.number().min(0).max(100),
  verdict: z.string().min(1),
  criterion_scores: z
    .array(
      z.object({
        criterion: z.string(),
        weight: z.number(),
        score: z.number().min(0),
        rationale: z.string(),
      })
    )
    .min(1),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  misconceptions: z.array(z.string()),
  feedback: z.string().min(1),
  suggested_improvement: z.string(),
  follow_up_question: z.string(),
  recommended_action: z.enum([
    'reinforce',
    'follow_up',
    'proceed',
    'mastered',
    'retry',
  ]),
});

export type GroqEvaluationErrorCode =
  | 'missing_key'
  | 'invalid_key'
  | 'rate_limited'
  | 'network_error'
  | 'invalid_response'
  | 'api_error';

export type GroqEvaluationOutcome =
  | {
      ok: true;
      data: StructuredEvaluationResponse;
    }
  | {
      ok: false;
      code: GroqEvaluationErrorCode;
      error: string;
    };

function buildEvaluationSystemPrompt(request: EvaluationRequest): string {
  const rubricText = request.rubric
    .map((c) => `- ${c.name} (Weight: ${c.weight}): ${c.description}`)
    .join('\n');

  return [
    'You are a rigorous yet constructive senior backend systems mentor evaluating a learner response in Backend Forge.',
    'Evaluate conceptual understanding, causal reasoning, and mechanism accuracy—never demand memorized terminology, optional examples, or exact textbook phrasing.',
    'Recognize valid alternative phrasings and concise engineering explanations when the underlying mechanism is sound. Award 80-95+ when the core causal mechanism and key invariants are accurate in the learner\'s own words; reserve 96-100 for thorough coverage of edge cases as well.',
    'Use "gaps" for omitted nuances or edge cases, and reserve "misconceptions" STRICTLY for genuinely false technical claims or broken causal reasoning (leave "misconceptions" as [] when the learner\'s statements are technically accurate).',
    'Stay strictly within the current sub-block learning objectives and taught lesson concepts. Do NOT introduce unrelated syllabus topics or penalize for untaught advanced concepts.',
    '',
    'RUBRIC (total weight 100):',
    rubricText,
    '',
    'REQUIRED JSON SCHEMA (return ONLY valid JSON, no markdown code fences):',
    '{',
    '  "score": number (0-100, sum of criterion_scores.score),',
    '  "verdict": string (concise 1-sentence engineering assessment),',
    '  "criterion_scores": [',
    '    { "criterion": string, "weight": number, "score": number (0..weight), "rationale": string }',
    '  ],',
    '  "strengths": string[] (what the learner understood correctly),',
    '  "gaps": string[] (optional or missing nuances/edge cases without treating them as errors),',
    '  "misconceptions": string[] (strictly false technical assumptions detected, [] if claims are technically valid),',
    '  "feedback": string (clear mechanism-level explanation connecting strengths and gaps),',
    '  "suggested_improvement": string (specific next step to refine their understanding),',
    '  "follow_up_question": string (one targeted question within current taught concepts when follow-up deepens understanding, or empty string if score >= 80),',
    '  "recommended_action": "reinforce" | "follow_up" | "proceed" | "mastered" | "retry" (use "mastered" for 80+, "proceed" for 70-79, "follow_up"/"reinforce"/"retry" below 70)',
    '}',
  ].join('\n');
}

function buildEvaluationUserPrompt(request: EvaluationRequest): string {
  return [
    `Block: ${request.blockTitle}`,
    `Sub-Block: ${request.subBlockId} — ${request.subBlockTitle}`,
    `Question Focus: ${request.questionContext ?? 'Conceptual Understanding'}`,
    '',
    'Learning Objectives:',
    ...request.objectives.map((o) => `- ${o}`),
    '',
    'Evaluation Criteria for this Question:',
    ...request.evaluationCriteria.map((c) => `- ${c}`),
    '',
    'Taught Lesson Context:',
    request.lessonContext,
    ...(request.questionExplanation
      ? ['', 'Reference Reasoning Anchor (use to check accuracy, not exact phrasing):', request.questionExplanation]
      : []),
    '',
    'Question:',
    request.questionPrompt,
    '',
    "Learner's Answer:",
    request.learnerAnswer,
  ].join('\n');
}

function isOpenAiOssModel(model: string): boolean {
  return model.startsWith('openai/gpt-oss');
}

function extractJsonPayload(rawContent: string): unknown {
  const trimmed = rawContent
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Strip markdown fences if model wrapped JSON despite instructions
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch?.[1]) {
      return JSON.parse(fenceMatch[1].trim());
    }
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    }
    throw new Error('Response does not contain parseable JSON.');
  }
}

export async function evaluateFptAnswerWithGroq(
  request: EvaluationRequest,
  apiKey: string,
  model: string
): Promise<GroqEvaluationOutcome> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return {
      ok: false,
      code: 'missing_key',
      error:
        'No Groq API key configured. Add your API key in Settings to run AI evaluation, or continue studying manually.',
    };
  }

  let response: Response;
  try {
    response = await fetch(GROQ_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cleanKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        ...(isOpenAiOssModel(model)
          ? { reasoning_effort: 'low', max_completion_tokens: 2048 }
          : {}),
        messages: [
          { role: 'system', content: buildEvaluationSystemPrompt(request) },
          { role: 'user', content: buildEvaluationUserPrompt(request) },
        ],
      }),
    });
  } catch {
    return {
      ok: false,
      code: 'network_error',
      error:
        'Network error reaching Groq API. Verify your internet connection and try again; your answer has been preserved.',
    };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      code: 'invalid_key',
      error:
        'Groq rejected the API key (authentication failed). Verify or replace your key in Settings.',
    };
  }

  if (response.status === 429) {
    return {
      ok: false,
      code: 'rate_limited',
      error:
        'Groq API rate limit reached. Wait a moment and retry; your submitted answer is saved.',
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      code: 'api_error',
      error: `Groq API returned HTTP ${response.status}. Please retry shortly.`,
    };
  }

  let rawBody: unknown;
  try {
    rawBody = await response.json();
  } catch {
    return {
      ok: false,
      code: 'invalid_response',
      error: 'Groq API returned a non-JSON HTTP body.',
    };
  }

  const content = (
    rawBody as { choices?: Array<{ message?: { content?: string } }> }
  )?.choices?.[0]?.message?.content;

  if (!content || typeof content !== 'string') {
    return {
      ok: false,
      code: 'invalid_response',
      error: 'Groq API response was missing evaluation message content.',
    };
  }

  let parsedJson: unknown;
  try {
    parsedJson = extractJsonPayload(content);
  } catch {
    return {
      ok: false,
      code: 'invalid_response',
      error:
        'Model returned malformed JSON that could not be parsed. Retry evaluation.',
    };
  }

  const validated = structuredEvaluationSchema.safeParse(parsedJson);
  if (!validated.success) {
    return {
      ok: false,
      code: 'invalid_response',
      error:
        'Evaluation payload failed schema validation. Retry evaluation; progress was not modified.',
    };
  }

  const normalizedScore = Math.max(
    0,
    Math.min(100, Math.round(validated.data.score))
  );

  return {
    ok: true,
    data: {
      ...validated.data,
      score: normalizedScore,
    },
  };
}

export async function testGroqConnection(
  apiKey: string,
  model: string
): Promise<{ ok: boolean; message: string }> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return { ok: false, message: 'Enter a Groq API key before testing.' };
  }

  try {
    const response = await fetch(GROQ_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cleanKey}`,
      },
      body: JSON.stringify({
        model,
        ...(isOpenAiOssModel(model)
          ? { max_completion_tokens: 128, reasoning_effort: 'low' }
          : { max_tokens: 16 }),
        temperature: 0,
        messages: [{ role: 'user', content: 'Respond with OK.' }],
      }),
    });

    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        message: 'Authentication failed. Check that your Groq API key is valid.',
      };
    }
    if (response.status === 429) {
      return {
        ok: false,
        message: 'Key recognized, but rate limit was exceeded. Try again soon.',
      };
    }
    if (!response.ok) {
      return {
        ok: false,
        message: `Connection failed with HTTP ${response.status}.`,
      };
    }
    return {
      ok: true,
      message: `Connected successfully using ${model}.`,
    };
  } catch {
    return {
      ok: false,
      message: 'Network request failed while contacting Groq API.',
    };
  }
}
