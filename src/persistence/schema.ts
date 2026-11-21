import { z } from 'zod';

export const CURRENT_SCHEMA_VERSION = 3 as const;

export const learningMethodologySchema = z.enum(['fpt', 'recipe', 'syntax']);

export const legacyFptStageSchema = z.number().int().min(1).max(9);

export const subBlockProgressStatusSchema = z.enum([
  'not_started',
  'in_progress',
  'completed',
  'mastered',
  'skipped',
  'needs_review',
]);

export const activityActionSchema = z.enum([
  'fpt_submitted',
  'hint_viewed',
  'explanation_revealed',
  'question_skipped',
  'exercise_completed',
  'unit_completed',
  'unit_mastered',
  'unit_skipped',
  'unit_revised',
  'study_timer_milestone',
  'marked_revision',
]);

export const fptSessionStateSchema = z.object({
  subBlockId: z.string().min(1),
  currentStage: legacyFptStageSchema.optional(),
  currentQuestionIndex: z.number().int().nonnegative(),
  submittedAnswers: z.record(z.string(), z.string()),
  draftAnswers: z.record(z.string(), z.string()),
  viewedHints: z.record(z.string(), z.number().int().min(0).max(3)),
  revealedExplanations: z.array(z.string()),
  skippedQuestionIds: z.array(z.string()),
  completedQuestionIds: z.array(z.string()),
  updatedAt: z.string(),
});

export const subBlockProgressRecordSchema = z.object({
  subBlockId: z.string().min(1),
  status: subBlockProgressStatusSchema,
  completedModes: z.array(learningMethodologySchema),
  completedExerciseIds: z.array(z.string()),
  latestScore: z.number().min(0).max(100).nullable(),
  highestScore: z.number().min(0).max(100).nullable(),
  evaluationCount: z.number().int().nonnegative(),
  misconceptionCount: z.number().int().nonnegative(),
  needsRevision: z.boolean(),
  revisionReason: z.string().optional(),
  revisionDueAt: z.string().optional(),
  lastRevisedAt: z.string().optional(),
  lastStudiedAt: z.string().nullable(),
  skippedAt: z.string().optional(),
  fptSession: fptSessionStateSchema.optional(),
  draftNotes: z.string().optional(),
});

export const structuredEvaluationResultSchema = z.object({
  score: z.number().min(0).max(100),
  verdict: z.string(),
  criterion_scores: z.array(
    z.object({
      criterion: z.string(),
      weight: z.number(),
      score: z.number(),
      rationale: z.string(),
    })
  ),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  misconceptions: z.array(z.string()),
  feedback: z.string(),
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

export const evaluationHistoryRecordSchema = z.object({
  id: z.string().min(1),
  timestamp: z.string().min(1),
  subBlockId: z.string().min(1),
  questionId: z.string().min(1),
  questionFocus: z.string().optional(),
  stage: legacyFptStageSchema.optional(),
  learnerAnswer: z.string(),
  model: z.string(),
  result: structuredEvaluationResultSchema,
});

export const activityEntrySchema = z.object({
  id: z.string().min(1),
  timestamp: z.string().min(1),
  subBlockId: z.string().min(1),
  subBlockTitle: z.string().min(1),
  methodology: learningMethodologySchema,
  action: activityActionSchema,
  summary: z.string(),
});

export const dailyStudyRecordSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  qualifyingActions: z.number().int().nonnegative(),
  focusedSeconds: z.number().int().nonnegative(),
  qualifiedForStreak: z.boolean(),
  subBlocksTouched: z.array(z.string()),
});

export const studyTimerStateSchema = z.object({
  isRunning: z.boolean(),
  subBlockId: z.string().nullable(),
  accumulatedSeconds: z.number().int().nonnegative(),
  startedAtMs: z.number().nullable(),
  lastRecordedDate: z.string().nullable(),
});

export const learnerProgressStateSchema = z.object({
  currentSubBlockId: z.string().nullable(),
  currentMethodology: learningMethodologySchema,
  subBlocks: z.record(z.string(), subBlockProgressRecordSchema),
  evaluations: z.array(evaluationHistoryRecordSchema),
  activityLog: z.array(activityEntrySchema),
  dailyActivity: z.record(z.string(), dailyStudyRecordSchema),
  studyTimer: studyTimerStateSchema,
});

export const appSettingsSchema = z.object({
  theme: z.enum(['dark', 'light']),
  groqApiKey: z.string(),
  groqModel: z.string().min(1),
  defaultMethodology: learningMethodologySchema,
  autoStartTimer: z.boolean(),
  confirmBeforeSkipTopic: z.boolean(),
});

export const persistedAppStateSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  updatedAt: z.string(),
  progress: learnerProgressStateSchema,
  settings: appSettingsSchema,
});

/**
 * Safe export schema that explicitly excludes groqApiKey and secrets.
 */
export const exportPreferencesSchema = z.object({
  theme: z.enum(['dark', 'light']),
  groqModel: z.string().min(1),
  defaultMethodology: learningMethodologySchema,
  autoStartTimer: z.boolean(),
  confirmBeforeSkipTopic: z.boolean(),
});

export const exportedBackupSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  exportedAt: z.string(),
  progress: learnerProgressStateSchema,
  preferences: exportPreferencesSchema,
});

export type PersistedAppState = z.infer<typeof persistedAppStateSchema>;
export type ExportedBackupPayload = z.infer<typeof exportedBackupSchema>;

export function createDefaultProgressState(): PersistedAppState['progress'] {
  return {
    currentSubBlockId: null,
    currentMethodology: 'fpt',
    subBlocks: {},
    evaluations: [],
    activityLog: [],
    dailyActivity: {},
    studyTimer: {
      isRunning: false,
      subBlockId: null,
      accumulatedSeconds: 0,
      startedAtMs: null,
      lastRecordedDate: null,
    },
  };
}

export function createDefaultAppState(): PersistedAppState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    progress: createDefaultProgressState(),
    settings: {
      theme: 'dark',
      groqApiKey: '',
      groqModel: 'llama-3.3-70b-versatile',
      defaultMethodology: 'fpt',
      autoStartTimer: false,
      confirmBeforeSkipTopic: true,
    },
  };
}
