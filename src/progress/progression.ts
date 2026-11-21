import {
  CurriculumSubBlock,
  EvaluationHistoryRecord,
  SubBlockProgressRecord,
  SubBlockProgressStatus,
} from '../types';

export const PASSING_SCORE_THRESHOLD = 70;
export const MASTERY_SCORE_THRESHOLD = 80;
export const COMPLETED_REVISION_DELAY_DAYS = 3;
export const MASTERED_REVISION_DELAY_DAYS = 5;

const MS_PER_DAY = 86_400_000;

export function addDaysIso(baseIso: string, days: number): string {
  const baseMs = Date.parse(baseIso);
  const safeBaseMs = Number.isNaN(baseMs) ? Date.now() : baseMs;
  return new Date(safeBaseMs + days * MS_PER_DAY).toISOString();
}

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
      revisionReason: `Partial understanding (${score}/100) — review core gaps before finalizing`,
    };
  }
  if (score <= 79) {
    return {
      band: 'progress_with_revision',
      label: 'Completed · spaced revision in 3 days',
      shouldFlagRevision: false,
      revisionReason: `Completed with ${score}/100 — scheduled for spaced revision after ${COMPLETED_REVISION_DELAY_DAYS} days`,
    };
  }
  return {
    band: 'mastery_eligible',
    label: `Mastery achieved (${MASTERY_SCORE_THRESHOLD}+)`,
    shouldFlagRevision: false,
  };
}

export interface UnitEvaluationSummary {
  averageScore: number | null;
  highestScore: number | null;
  latestScore: number | null;
  unresolvedMisconceptionCount: number;
  evaluatedQuestionCount: number;
}

export function summarizeUnitEvaluations(
  subBlockId: string,
  evaluations?: EvaluationHistoryRecord[]
): UnitEvaluationSummary {
  if (!evaluations || evaluations.length === 0) {
    return {
      averageScore: null,
      highestScore: null,
      latestScore: null,
      unresolvedMisconceptionCount: 0,
      evaluatedQuestionCount: 0,
    };
  }

  const unitEvals = evaluations
    .filter((ev) => ev.subBlockId === subBlockId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  if (unitEvals.length === 0) {
    return {
      averageScore: null,
      highestScore: null,
      latestScore: null,
      unresolvedMisconceptionCount: 0,
      evaluatedQuestionCount: 0,
    };
  }

  const latestByQuestion = new Map<string, EvaluationHistoryRecord>();
  let highestScore = 0;

  for (const ev of unitEvals) {
    if (ev.result.score > highestScore) {
      highestScore = ev.result.score;
    }
    if (!latestByQuestion.has(ev.questionId)) {
      latestByQuestion.set(ev.questionId, ev);
    }
  }

  const latestEntries = Array.from(latestByQuestion.values());
  const totalScore = latestEntries.reduce(
    (sum, ev) => sum + ev.result.score,
    0
  );
  const averageScore = Math.round(totalScore / latestEntries.length);

  // Only count misconceptions that remain unresolved on questions scoring below mastery
  const unresolvedMisconceptionCount = latestEntries.filter(
    (ev) =>
      ev.result.misconceptions.length > 0 &&
      ev.result.score < MASTERY_SCORE_THRESHOLD
  ).length;

  return {
    averageScore,
    highestScore,
    latestScore: unitEvals[0]?.result.score ?? null,
    unresolvedMisconceptionCount,
    evaluatedQuestionCount: latestEntries.length,
  };
}

function isManualRevisionFlag(record: SubBlockProgressRecord): boolean {
  return (
    record.needsRevision &&
    Boolean(record.revisionReason?.toLowerCase().includes('manual'))
  );
}

export function deriveDeterministicStatus(params: {
  subBlock: CurriculumSubBlock;
  record: SubBlockProgressRecord;
  totalFptQuestions: number;
  fptQuestionIds?: string[];
  hasRecipeExercise: boolean;
  hasSyntaxExercise: boolean;
  unitEvaluations?: EvaluationHistoryRecord[];
}): {
  status: SubBlockProgressStatus;
  needsRevision: boolean;
  revisionReason?: string;
  revisionDueAt?: string;
  unresolvedMisconceptionCount: number;
} {
  const {
    subBlock,
    record,
    totalFptQuestions,
    fptQuestionIds,
    hasRecipeExercise,
    hasSyntaxExercise,
    unitEvaluations,
  } = params;

  const evalSummary = summarizeUnitEvaluations(subBlock.id, unitEvaluations);
  const unresolvedMisconceptions = unitEvaluations
    ? evalSummary.unresolvedMisconceptionCount
    : record.misconceptionCount;

  if (record.status === 'skipped') {
    return {
      status: 'skipped',
      needsRevision: record.needsRevision,
      revisionReason: record.revisionReason,
      revisionDueAt: record.revisionDueAt,
      unresolvedMisconceptionCount: unresolvedMisconceptions,
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

  const effectiveScore =
    evalSummary.averageScore !== null
      ? evalSummary.averageScore
      : record.latestScore ?? record.highestScore;

  const peakScore =
    evalSummary.highestScore !== null
      ? Math.max(evalSummary.highestScore, record.highestScore ?? 0)
      : record.highestScore;

  const anchorIso =
    record.lastRevisedAt ?? record.lastStudiedAt ?? new Date().toISOString();
  const manualFlag = isManualRevisionFlag(record);

  if (allRequiredModesDone) {
    if (!requiresFpt) {
      return {
        status: 'mastered',
        needsRevision: manualFlag,
        revisionReason: manualFlag ? record.revisionReason : undefined,
        revisionDueAt: manualFlag
          ? record.revisionDueAt ?? anchorIso
          : record.revisionDueAt,
        unresolvedMisconceptionCount: unresolvedMisconceptions,
      };
    }

    if (effectiveScore !== null) {
      const masteryAchieved =
        effectiveScore >= MASTERY_SCORE_THRESHOLD ||
        (peakScore !== null &&
          peakScore >= MASTERY_SCORE_THRESHOLD &&
          effectiveScore >= 75);

      if (masteryAchieved) {
        return {
          status: 'mastered',
          needsRevision: manualFlag,
          revisionReason: manualFlag
            ? record.revisionReason
            : `Mastered (${effectiveScore}/100) — spaced retention review in ${MASTERED_REVISION_DELAY_DAYS} days`,
          revisionDueAt: manualFlag
            ? record.revisionDueAt ?? anchorIso
            : addDaysIso(anchorIso, MASTERED_REVISION_DELAY_DAYS),
          unresolvedMisconceptionCount: unresolvedMisconceptions,
        };
      }

      if (effectiveScore >= PASSING_SCORE_THRESHOLD) {
        return {
          status: 'completed',
          needsRevision: manualFlag,
          revisionReason: manualFlag
            ? record.revisionReason
            : `Completed (${effectiveScore}/100) — spaced revision scheduled in ${COMPLETED_REVISION_DELAY_DAYS} days`,
          revisionDueAt: manualFlag
            ? record.revisionDueAt ?? anchorIso
            : addDaysIso(anchorIso, COMPLETED_REVISION_DELAY_DAYS),
          unresolvedMisconceptionCount: unresolvedMisconceptions,
        };
      }

      // Completed all questions, but average score is below 70
      return {
        status: 'needs_review',
        needsRevision: true,
        revisionReason: `Evaluation average ${effectiveScore}/100 is below 70 — review key mechanisms`,
        revisionDueAt: anchorIso,
        unresolvedMisconceptionCount: unresolvedMisconceptions,
      };
    }

    // Completed offline without AI evaluation
    return {
      status: 'completed',
      needsRevision: manualFlag,
      revisionReason: manualFlag
        ? record.revisionReason
        : `Completed offline — spaced revision scheduled in ${COMPLETED_REVISION_DELAY_DAYS} days`,
      revisionDueAt: manualFlag
        ? record.revisionDueAt ?? anchorIso
        : addDaysIso(anchorIso, COMPLETED_REVISION_DELAY_DAYS),
      unresolvedMisconceptionCount: unresolvedMisconceptions,
    };
  }

  // Unit is not finished across all required modes yet
  const hasLowScore =
    effectiveScore !== null && effectiveScore < PASSING_SCORE_THRESHOLD;
  const hasUnresolvedRepeatedMisconceptions =
    unresolvedMisconceptions >= 2 &&
    (effectiveScore === null || effectiveScore < PASSING_SCORE_THRESHOLD);

  if (hasLowScore || hasUnresolvedRepeatedMisconceptions) {
    return {
      status: 'needs_review',
      needsRevision: true,
      revisionReason: hasLowScore
        ? `Evaluation score ${effectiveScore}/100 requires review`
        : 'Repeated unresolved misconceptions detected across evaluations',
      revisionDueAt: anchorIso,
      unresolvedMisconceptionCount: unresolvedMisconceptions,
    };
  }

  const hasAnyProgress =
    fptAnsweredCount > 0 ||
    record.completedModes.length > 0 ||
    record.completedExerciseIds.length > 0 ||
    record.evaluationCount > 0;

  return {
    status: hasAnyProgress ? 'in_progress' : 'not_started',
    needsRevision: manualFlag,
    revisionReason: manualFlag ? record.revisionReason : undefined,
    revisionDueAt: manualFlag ? record.revisionDueAt ?? anchorIso : undefined,
    unresolvedMisconceptionCount: unresolvedMisconceptions,
  };
}

export interface SubBlockCompletionDetail {
  completedItems: number;
  totalItems: number;
  percentage: number;
}

export function computeSubBlockCompletionDetail(params: {
  subBlock: CurriculumSubBlock;
  record?: SubBlockProgressRecord;
  totalFptQuestions: number;
  fptQuestionIds?: string[];
  hasRecipeExercise: boolean;
  hasSyntaxExercise: boolean;
}): SubBlockCompletionDetail {
  const {
    subBlock,
    record,
    totalFptQuestions,
    fptQuestionIds,
    hasRecipeExercise,
    hasSyntaxExercise,
  } = params;

  const requiresFpt = subBlock.requiredModes.includes('fpt');
  const requiresRecipe = subBlock.requiredModes.includes('recipe') && hasRecipeExercise;
  const requiresSyntax = subBlock.requiredModes.includes('syntax') && hasSyntaxExercise;

  let totalItems = 0;
  let completedItems = 0;

  if (requiresFpt) {
    const fptTotal = Math.max(1, totalFptQuestions);
    totalItems += fptTotal;
    const answered = record?.fptSession
      ? fptQuestionIds && fptQuestionIds.length > 0
        ? fptQuestionIds.filter((qId) =>
            Boolean(record.fptSession?.submittedAnswers[qId])
          ).length
        : Object.keys(record.fptSession.submittedAnswers).length
      : 0;
    completedItems += Math.min(fptTotal, answered);
  }

  if (requiresRecipe) {
    totalItems += 1;
    if (record?.completedModes.includes('recipe')) {
      completedItems += 1;
    }
  }

  if (requiresSyntax) {
    totalItems += 1;
    if (record?.completedModes.includes('syntax')) {
      completedItems += 1;
    }
  }

  if (
    record?.status === 'completed' ||
    record?.status === 'mastered'
  ) {
    return {
      completedItems: totalItems,
      totalItems,
      percentage: 100,
    };
  }

  const percentage =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return {
    completedItems,
    totalItems,
    percentage,
  };
}
