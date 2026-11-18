import { getAllSubBlocks } from '../curriculum';
import {
  ActivityEntry,
  CurriculumSyllabus,
  DailyStudyRecord,
  LearnerProgressState,
  ProgressSummaryMetrics,
  SubBlockProgressRecord,
} from '../types';
import { getRecentDateKeys, toLocalDateKey } from '../utilities';

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

export function computeProgressMetrics(
  progress: LearnerProgressState,
  syllabus: CurriculumSyllabus
): ProgressSummaryMetrics {
  const allSubBlocks = getAllSubBlocks(syllabus);
  const totalUnits = allSubBlocks.length;

  let completedUnits = 0;
  let masteredUnits = 0;
  let inProgressUnits = 0;
  let skippedUnits = 0;
  let revisionUnitsCount = 0;

  for (const subBlock of allSubBlocks) {
    const record = progress.subBlocks[subBlock.id];
    if (!record) continue;

    if (record.status === 'mastered') {
      masteredUnits += 1;
    } else if (record.status === 'completed') {
      completedUnits += 1;
    } else if (record.status === 'in_progress') {
      inProgressUnits += 1;
    } else if (record.status === 'skipped') {
      skippedUnits += 1;
    }

    if (record.needsRevision || record.status === 'needs_review') {
      revisionUnitsCount += 1;
    }
  }

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
    progress.dailyActivity
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

export function getRevisionRecommendations(
  progress: LearnerProgressState
): RevisionRecommendation[] {
  const recommendations: RevisionRecommendation[] = [];

  for (const record of Object.values(progress.subBlocks)) {
    const reasons: string[] = [];
    if (record.status === 'needs_review') {
      reasons.push(record.revisionReason ?? 'Requires conceptual review');
    } else if (record.needsRevision) {
      reasons.push(record.revisionReason ?? 'Flagged for revision');
    }
    if (record.latestScore !== null && record.latestScore < 70) {
      reasons.push(`Low evaluation score (${record.latestScore}/100)`);
    }
    if (record.misconceptionCount >= 2) {
      reasons.push(`Repeated misconceptions (${record.misconceptionCount})`);
    }
    if (record.status === 'completed') {
      reasons.push('Completed without mastery score (85+)');
    }

    if (reasons.length > 0) {
      recommendations.push({
        subBlockId: record.subBlockId,
        reasons: Array.from(new Set(reasons)),
        latestScore: record.latestScore,
        status: record.status,
      });
    }
  }

  return recommendations;
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
