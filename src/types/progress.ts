import { LearningMethodology } from './curriculum';
import { EvaluationHistoryRecord } from './evaluation';

export type SubBlockProgressStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'mastered'
  | 'skipped'
  | 'needs_review';

export type ActivityAction =
  | 'fpt_submitted'
  | 'hint_viewed'
  | 'explanation_revealed'
  | 'question_skipped'
  | 'exercise_completed'
  | 'unit_completed'
  | 'unit_mastered'
  | 'unit_skipped'
  | 'study_timer_milestone'
  | 'marked_revision';

export interface FptSessionState {
  subBlockId: string;
  /** @deprecated Legacy field retained as optional for safe v2 migration */
  currentStage?: number;
  currentQuestionIndex: number;
  submittedAnswers: Record<string, string>;
  draftAnswers: Record<string, string>;
  viewedHints: Record<string, number>;
  revealedExplanations: string[];
  skippedQuestionIds: string[];
  completedQuestionIds: string[];
  updatedAt: string;
}

export interface SubBlockProgressRecord {
  subBlockId: string;
  status: SubBlockProgressStatus;
  completedModes: LearningMethodology[];
  completedExerciseIds: string[];
  latestScore: number | null;
  highestScore: number | null;
  evaluationCount: number;
  misconceptionCount: number;
  needsRevision: boolean;
  revisionReason?: string;
  lastStudiedAt: string | null;
  skippedAt?: string;
  fptSession?: FptSessionState;
  draftNotes?: string;
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  subBlockId: string;
  subBlockTitle: string;
  methodology: LearningMethodology;
  action: ActivityAction;
  summary: string;
}

export interface DailyStudyRecord {
  date: string; // YYYY-MM-DD in local timezone
  qualifyingActions: number;
  focusedSeconds: number;
  qualifiedForStreak: boolean;
  subBlocksTouched: string[];
}

export interface StudyTimerState {
  isRunning: boolean;
  subBlockId: string | null;
  accumulatedSeconds: number;
  startedAtMs: number | null;
  lastRecordedDate: string | null;
}

export interface LearnerProgressState {
  currentSubBlockId: string | null;
  currentMethodology: LearningMethodology;
  subBlocks: Record<string, SubBlockProgressRecord>;
  evaluations: EvaluationHistoryRecord[];
  activityLog: ActivityEntry[];
  dailyActivity: Record<string, DailyStudyRecord>;
  studyTimer: StudyTimerState;
}

export interface ProgressSummaryMetrics {
  totalUnits: number;
  completedUnits: number;
  masteredUnits: number;
  inProgressUnits: number;
  skippedUnits: number;
  revisionUnitsCount: number;
  completionPercentage: number;
  masteryPercentage: number;
  currentStreakDays: number;
  longestStreakDays: number;
  totalStudyDays: number;
}
