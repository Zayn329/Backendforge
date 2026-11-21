import { AUTHORITATIVE_SYLLABUS, findSubBlockById, getAllSubBlocks } from '../curriculum';
import {
  ActivityEntry,
  CurriculumSyllabus,
  DailyStudyRecord,
  LearnerProgressState,
  ProgressSummaryMetrics,
  SubBlockProgressRecord,
} from '../types';
import { getRecentDateKeys, toLocalDateKey } from '../utilities';
import {
  COMPLETED_REVISION_DELAY_DAYS,
  MASTERED_REVISION_DELAY_DAYS,
  PASSING_SCORE_THRESHOLD,
  addDaysIso,
} from './progression';

export interface HeatmapCell {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface RevisionRecommendation {
  subBlockId: string;
  reasons: string[];
  latestScore: number | null;
  status: SubBlockProgressRecord['status'];
  dueAt: string;
  isDue: boolean;
  daysUntilDue: number;
  priority: 'immediate' | 'spaced';
}

const MS_PER_DAY = 86_400_000;

function resolveEffectiveRevisionSchedule(
  record: SubBlockProgressRecord,
  referenceDate: Date
): { dueAt: string; priority: 'immediate' | 'spaced'; spacedReason?: string } | null {
  if (record.status === 'skipped' || record.status === 'not_started') {
    return null;
  }

  const nowIso = referenceDate.toISOString();

  // Immediate review conditions: low score (<70), needs_review status, or manual flag
  if (
    record.status === 'needs_review' ||
    record.needsRevision ||
    (record.latestScore !== null &&
      record.latestScore < PASSING_SCORE_THRESHOLD &&
      record.status === 'in_progress')
  ) {
    return {
      dueAt: record.revisionDueAt ?? nowIso,
      priority: 'immediate',
    };
  }

  // Spaced repetition for completed units (after 3 days) and mastered FPT/evaluated units (after 5 days)
  const found = findSubBlockById(record.subBlockId, AUTHORITATIVE_SYLLABUS);
  const isFptOrEvaluated =
    Boolean(found?.subBlock.requiredModes.includes('fpt')) ||
    record.evaluationCount > 0;

  if (record.status === 'completed') {
    const anchor = record.lastRevisedAt ?? record.lastStudiedAt;
    if (!anchor && !record.revisionDueAt) return null;
    const dueAt =
      record.revisionDueAt ??
      addDaysIso(anchor ?? nowIso, COMPLETED_REVISION_DELAY_DAYS);
    return {
      dueAt,
      priority: 'spaced',
      spacedReason: `Spaced revision ready (${COMPLETED_REVISION_DELAY_DAYS}+ days after completion)`,
    };
  }

  if (record.status === 'mastered' && isFptOrEvaluated) {
    const anchor = record.lastRevisedAt ?? record.lastStudiedAt;
    if (!anchor && !record.revisionDueAt) return null;
    const dueAt =
      record.revisionDueAt ??
      addDaysIso(anchor ?? nowIso, MASTERED_REVISION_DELAY_DAYS);
    return {
      dueAt,
      priority: 'spaced',
      spacedReason: `Spaced retention review ready (mastered ${MASTERED_REVISION_DELAY_DAYS}+ days ago)`,
    };
  }

  return null;
}

export function computeStreaks(
  dailyActivity: Record<string, DailyStudyRecord>,
  referenceDate: Date = new Date()
): { currentStreakDays: number; longestStreakDays: number } {
  const qualifyingDates = Object.values(dailyActivity)
    .filter((entry) => entry.qualifiedForStreak)
    .map((entry) => entry.date)
    .sort();

  if (qualifyingDates.length === 0) {
    return { currentStreakDays: 0, longestStreakDays: 0 };
  }

  const activeSet = new Set(qualifyingDates);

  let currentStreakDays = 0;
  const cursor = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  const todayKey = toLocalDateKey(cursor);

  if (!activeSet.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (activeSet.has(toLocalDateKey(cursor))) {
    currentStreakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  let longestStreakDays = 0;
  let running = 0;
  let prevTime: number | null = null;

  for (const dateKey of qualifyingDates) {
    const currentTime = new Date(`${dateKey}T00:00:00`).getTime();
    if (prevTime !== null) {
      const diffDays = Math.round((currentTime - prevTime) / 86400000);
      running = diffDays === 1 ? running + 1 : 1;
    } else {
      running = 1;
    }
    if (running > longestStreakDays) {
      longestStreakDays = running;
    }
    prevTime = currentTime;
  }

  return { currentStreakDays, longestStreakDays };
}

export function getRevisionRecommendations(
  progress: LearnerProgressState,
  referenceDate: Date = new Date()
): RevisionRecommendation[] {
  const nowMs = referenceDate.getTime();
  const dueItems: RevisionRecommendation[] = [];

  for (const record of Object.values(progress.subBlocks)) {
    const schedule = resolveEffectiveRevisionSchedule(record, referenceDate);
    if (!schedule) continue;

    const dueMs = Date.parse(schedule.dueAt);
    const safeDueMs = Number.isNaN(dueMs) ? nowMs : dueMs;
    const isDue = schedule.priority === 'immediate' || nowMs >= safeDueMs;

    if (!isDue) continue;

    const reasons: string[] = [];
    if (schedule.priority === 'immediate') {
      if (record.status === 'needs_review') {
        reasons.push(record.revisionReason ?? 'Requires conceptual review');
      } else if (record.needsRevision) {
        reasons.push(record.revisionReason ?? 'Flagged for revision');
      }
      if (
        record.latestScore !== null &&
        record.latestScore < PASSING_SCORE_THRESHOLD
      ) {
        reasons.push(`Low evaluation score (${record.latestScore}/100)`);
      }
    } else if (schedule.spacedReason) {
      reasons.push(schedule.spacedReason);
    }

    if (reasons.length > 0) {
      dueItems.push({
        subBlockId: record.subBlockId,
        reasons: Array.from(new Set(reasons)),
        latestScore: record.latestScore,
        status: record.status,
        dueAt: schedule.dueAt,
        isDue: true,
        daysUntilDue: 0,
        priority: schedule.priority,
      });
    }
  }

  return dueItems.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority === 'immediate' ? -1 : 1;
    }
    return a.dueAt.localeCompare(b.dueAt);
  });
}

export function getScheduledUpcomingRevisions(
  progress: LearnerProgressState,
  referenceDate: Date = new Date()
): RevisionRecommendation[] {
  const nowMs = referenceDate.getTime();
  const upcoming: RevisionRecommendation[] = [];

  for (const record of Object.values(progress.subBlocks)) {
    const schedule = resolveEffectiveRevisionSchedule(record, referenceDate);
    if (!schedule || schedule.priority !== 'spaced') continue;

    const dueMs = Date.parse(schedule.dueAt);
    if (Number.isNaN(dueMs) || dueMs <= nowMs) continue;

    const daysUntilDue = Math.max(1, Math.ceil((dueMs - nowMs) / MS_PER_DAY));
    upcoming.push({
      subBlockId: record.subBlockId,
      reasons: [
        record.status === 'mastered'
          ? `Mastered (${record.highestScore ?? record.latestScore ?? 80}+) · spaced revision in ${daysUntilDue}d`
          : `Completed · spaced revision in ${daysUntilDue}d`,
      ],
      latestScore: record.latestScore,
      status: record.status,
      dueAt: schedule.dueAt,
      isDue: false,
      daysUntilDue,
      priority: 'spaced',
    });
  }

  return upcoming.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export function computeProgressMetrics(
  progress: LearnerProgressState,
  syllabus: CurriculumSyllabus,
  referenceDate: Date = new Date()
): ProgressSummaryMetrics {
  const allSubBlocks = getAllSubBlocks(syllabus);
  const totalUnits = allSubBlocks.length;

  let completedUnits = 0;
  let masteredUnits = 0;
  let inProgressUnits = 0;
  let skippedUnits = 0;

  for (const subBlock of allSubBlocks) {
    const record = progress.subBlocks[subBlock.id];
    if (!record) continue;

    if (record.status === 'mastered') {
      masteredUnits += 1;
    } else if (record.status === 'completed') {
      completedUnits += 1;
    } else if (
      record.status === 'in_progress' ||
      record.status === 'needs_review'
    ) {
      inProgressUnits += 1;
    } else if (record.status === 'skipped') {
      skippedUnits += 1;
    }
  }

  const revisionUnitsCount = getRevisionRecommendations(
    progress,
    referenceDate
  ).length;

  // Skipped units are NEVER counted as completed or mastered
  const finishedUnits = completedUnits + masteredUnits;
  const completionPercentage =
    totalUnits > 0 ? Math.round((finishedUnits / totalUnits) * 100) : 0;
  const masteryPercentage =
    totalUnits > 0 ? Math.round((masteredUnits / totalUnits) * 100) : 0;

  const totalStudyDays = Object.values(progress.dailyActivity).filter(
    (day) => day.qualifiedForStreak
  ).length;

  const { currentStreakDays, longestStreakDays } = computeStreaks(
    progress.dailyActivity,
    referenceDate
  );

  return {
    totalUnits,
    completedUnits,
    masteredUnits,
    inProgressUnits,
    skippedUnits,
    revisionUnitsCount,
    completionPercentage,
    masteryPercentage,
    currentStreakDays,
    longestStreakDays,
    totalStudyDays,
  };
}

export function getRecentActivity(
  progress: LearnerProgressState,
  limit: number = 12
): ActivityEntry[] {
  return [...progress.activityLog]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}

export function buildHeatmapCells(
  dailyActivity: Record<string, DailyStudyRecord>,
  weeks: number = 18
): HeatmapCell[] {
  const totalDays = weeks * 7;
  const dateKeys = getRecentDateKeys(totalDays);

  return dateKeys.map((date) => {
    const day = dailyActivity[date];
    const count = day?.qualifyingActions ?? 0;
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (day?.qualifiedForStreak) {
      if (count >= 4) level = 4;
      else if (count === 3) level = 3;
      else if (count === 2) level = 2;
      else level = 1;
    }
    return { date, count, level };
  });
}
