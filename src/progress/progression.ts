import {
  CurriculumSubBlock,
  SubBlockProgressRecord,
  SubBlockProgressStatus,
} from '../types';

export interface ScoreThresholdDecision {
  band: 'rebuild' | 'follow_up' | 'progress_with_revision' | 'mastery_eligible';
  label: string;
  shouldFlagRevision: boolean;
  revisionReason?: string;
}

export function classifyScoreThreshold(score: number): ScoreThresholdDecision {
  if (score <= 49) {
    return {
      band: 'rebuild',
      label: 'Rebuild understanding',
      shouldFlagRevision: true,
      revisionReason: `Low evaluation score (${score}/100) — rebuild underlying mental model`,
    };
  }
  if (score <= 69) {
    return {
      band: 'follow_up',
      label: 'Targeted follow-up',
      shouldFlagRevision: true,
      revisionReason: `Partial understanding (${score}/100) — review gaps and misconceptions`,
    };
  }
  if (score <= 84) {
    return {
      band: 'progress_with_revision',
      label: 'Progress with revision recommendation',
      shouldFlagRevision: true,
      revisionReason: `Completed below mastery threshold (${score}/100) — scheduled for revision`,
    };
  }
  return {
    band: 'mastery_eligible',
    label: 'Mastery-eligible',
    shouldFlagRevision: false,
  };
}

export function deriveDeterministicStatus(params: {
  subBlock: CurriculumSubBlock;
  record: SubBlockProgressRecord;
  totalFptQuestions: number;
  fptQuestionIds?: string[];
  hasRecipeExercise: boolean;
  hasSyntaxExercise: boolean;
}): {
  status: SubBlockProgressStatus;
  needsRevision: boolean;
  revisionReason?: string;
} {
  const {
    subBlock,
    record,
    totalFptQuestions,
    fptQuestionIds,
    hasRecipeExercise,
    hasSyntaxExercise,
  } = params;

  if (record.status === 'skipped') {
    return {
      status: 'skipped',
      needsRevision: record.needsRevision,
      revisionReason: record.revisionReason,
    };
  }

  const requiresFpt = subBlock.requiredModes.includes('fpt');
  const requiresRecipe = subBlock.requiredModes.includes('recipe');
  const requiresSyntax = subBlock.requiredModes.includes('syntax');

  const fptAnsweredCount = record.fptSession
    ? fptQuestionIds && fptQuestionIds.length > 0
      ? fptQuestionIds.filter((qId) =>
          Boolean(record.fptSession?.submittedAnswers[qId])
        ).length
      : Object.keys(record.fptSession.submittedAnswers).length
    : 0;
  const fptDone =
    !requiresFpt ||
    (totalFptQuestions > 0 && fptAnsweredCount >= totalFptQuestions);

  const recipeDone =
    !requiresRecipe ||
    !hasRecipeExercise ||
    record.completedModes.includes('recipe');
  const syntaxDone =
    !requiresSyntax ||
    !hasSyntaxExercise ||
    record.completedModes.includes('syntax');

  const allRequiredModesDone = fptDone && recipeDone && syntaxDone;

  const hasLowScore =
    record.latestScore !== null && record.latestScore < 70;
  const hasRepeatedMisconceptions = record.misconceptionCount >= 2;

  if (hasLowScore || hasRepeatedMisconceptions) {
    return {
      status: 'needs_review',
      needsRevision: true,
      revisionReason: hasRepeatedMisconceptions
        ? 'Repeated misconceptions detected across evaluations'
        : `Evaluation score ${record.latestScore}/100 requires review`,
    };
  }

  if (allRequiredModesDone) {
    const masteryAchieved =
      !requiresFpt ||
      (record.highestScore !== null && record.highestScore >= 85);

    if (masteryAchieved) {
      return {
        status: 'mastered',
        needsRevision: false,
      };
    }

    return {
      status: 'completed',
      needsRevision:
        record.needsRevision ||
        (record.latestScore !== null && record.latestScore < 85),
      revisionReason:
        record.revisionReason ??
        'Completed unit without mastery score (85+) — recommended for revision',
    };
  }

  const hasAnyProgress =
    fptAnsweredCount > 0 ||
    record.completedModes.length > 0 ||
    record.completedExerciseIds.length > 0 ||
    record.evaluationCount > 0;

  return {
    status: hasAnyProgress ? 'in_progress' : 'not_started',
    needsRevision: record.needsRevision,
    revisionReason: record.revisionReason,
  };
}
