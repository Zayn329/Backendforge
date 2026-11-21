import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getSubBlockLessonContent } from '../content';
import {
  AUTHORITATIVE_SYLLABUS,
  findSubBlockById,
  getNextSubBlock,
} from '../curriculum';
import {
  classifyScoreThreshold,
  deriveDeterministicStatus,
} from '../progress';
import { applyThemeToDocument } from '../settings';
import {
  ActivityAction,
  AppSection,
  EvaluationHistoryRecord,
  FptSessionState,
  LearningMethodology,
  StructuredEvaluationResponse,
  SubBlockProgressRecord,
  ThemeMode,
} from '../types';
import { toLocalDateKey } from '../utilities';
import {
  ExportedBackupPayload,
  ImportResult,
  PersistedAppState,
  exportAppStateJson,
  importAppStateJson,
  loadAppState,
  resetProgressInState,
  saveAppState,
} from './index';

interface AppStateContextValue {
  state: PersistedAppState;
  activeSection: AppSection;
  navigateTo: (section: AppSection) => void;
  selectSubBlock: (
    subBlockId: string,
    preferredMode?: LearningMethodology
  ) => void;
  setActiveMethodology: (methodology: LearningMethodology) => void;
  // FPT session actions
  setFptPosition: (subBlockId: string, questionIndex: number) => void;
  saveFptDraft: (subBlockId: string, questionId: string, draft: string) => void;
  recordFptSubmission: (params: {
    subBlockId: string;
    questionId: string;
    questionLabel?: string;
    questionFocus?: string;
    answer: string;
    evaluation?: StructuredEvaluationResponse;
    model?: string;
  }) => void;
  viewFptHint: (
    subBlockId: string,
    questionId: string,
    hintLevel: number
  ) => void;
  revealFptExplanation: (subBlockId: string, questionId: string) => void;
  skipFptQuestion: (
    subBlockId: string,
    questionId: string,
    nextQuestionIndex: number
  ) => void;
  // Recipe & Syntax exercise + notes
  toggleExerciseCompletion: (
    subBlockId: string,
    exerciseId: string,
    mode: LearningMethodology,
    completed: boolean
  ) => void;
  saveSubBlockNotes: (subBlockId: string, notes: string) => void;
  // Deterministic progression & revision
  skipSubBlock: (subBlockId: string) => string | null;
  toggleManualRevisionFlag: (
    subBlockId: string,
    needsRevision: boolean,
    reason?: string
  ) => void;
  markUnitRevised: (subBlockId: string) => void;
  // Study timer
  timerElapsedSeconds: number;
  startStudyTimer: (subBlockId: string) => void;
  pauseStudyTimer: () => void;
  resumeStudyTimer: () => void;
  stopStudyTimer: () => void;
  // Settings & backup
  setTheme: (theme: ThemeMode) => void;
  setGroqApiKey: (key: string) => void;
  setGroqModel: (model: string) => void;
  setDefaultMethodology: (methodology: LearningMethodology) => void;
  setAutoStartTimer: (enabled: boolean) => void;
  setConfirmBeforeSkipTopic: (enabled: boolean) => void;
  exportData: () => string;
  validateImportJson: (rawJson: string) => ImportResult;
  applyImportedData: (data: {
    progress: PersistedAppState['progress'];
    preferences: ExportedBackupPayload['preferences'];
  }) => void;
  resetProgressOnly: () => void;
}

const VALID_SECTIONS: readonly AppSection[] = [
  'dashboard',
  'curriculum',
  'workspace',
  'progress',
  'settings',
];

function readSectionFromHash(): AppSection {
  if (typeof window === 'undefined') return 'dashboard';
  const raw = window.location.hash.replace(/^#\/?/, '').trim();
  if (VALID_SECTIONS.includes(raw as AppSection)) {
    return raw as AppSection;
  }
  return 'dashboard';
}

function createEmptySubBlockRecord(subBlockId: string): SubBlockProgressRecord {
  return {
    subBlockId,
    status: 'not_started',
    completedModes: [],
    completedExerciseIds: [],
    latestScore: null,
    highestScore: null,
    evaluationCount: 0,
    misconceptionCount: 0,
    needsRevision: false,
    lastStudiedAt: null,
  };
}

function createDefaultFptSession(subBlockId: string): FptSessionState {
  return {
    subBlockId,
    currentQuestionIndex: 0,
    submittedAnswers: {},
    draftAnswers: {},
    viewedHints: {},
    revealedExplanations: [],
    skippedQuestionIds: [],
    completedQuestionIds: [],
    updatedAt: new Date().toISOString(),
  };
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function recordDailyActivity(
  dailyActivity: PersistedAppState['progress']['dailyActivity'],
  subBlockId: string,
  options: { qualifying?: boolean; addedFocusedSeconds?: number }
): PersistedAppState['progress']['dailyActivity'] {
  const date = toLocalDateKey();
  const existing = dailyActivity[date] ?? {
    date,
    qualifyingActions: 0,
    focusedSeconds: 0,
    qualifiedForStreak: false,
    subBlocksTouched: [],
  };

  const focusedSeconds =
    existing.focusedSeconds + (options.addedFocusedSeconds ?? 0);
  const qualifyingActions =
    existing.qualifyingActions + (options.qualifying ? 1 : 0);
  const qualifiedForStreak =
    existing.qualifiedForStreak ||
    Boolean(options.qualifying) ||
    focusedSeconds >= 300;

  const subBlocksTouched = existing.subBlocksTouched.includes(subBlockId)
    ? existing.subBlocksTouched
    : [...existing.subBlocksTouched, subBlockId];

  return {
    ...dailyActivity,
    [date]: {
      date,
      qualifyingActions,
      focusedSeconds,
      qualifiedForStreak,
      subBlocksTouched,
    },
  };
}

function appendActivityLog(
  log: PersistedAppState['progress']['activityLog'],
  params: {
    subBlockId: string;
    methodology: LearningMethodology;
    action: ActivityAction;
    summary: string;
  }
): PersistedAppState['progress']['activityLog'] {
  const found = findSubBlockById(params.subBlockId, AUTHORITATIVE_SYLLABUS);
  const title = found
    ? `${found.subBlock.id} ${found.subBlock.title}`
    : params.subBlockId;
  return [
    {
      id: makeId('act'),
      timestamp: new Date().toISOString(),
      subBlockId: params.subBlockId,
      subBlockTitle: title,
      methodology: params.methodology,
      action: params.action,
      summary: params.summary,
    },
    ...log,
  ].slice(0, 150);
}

function recomputeRecordStatus(
  subBlockId: string,
  record: SubBlockProgressRecord,
  evaluations?: EvaluationHistoryRecord[]
): SubBlockProgressRecord {
  const found = findSubBlockById(subBlockId, AUTHORITATIVE_SYLLABUS);
  if (!found) return record;
  const lesson = getSubBlockLessonContent(subBlockId);
  const fptQuestions = lesson?.fpt?.questions ?? [];

  let normalizedModes = record.completedModes;
  if (
    fptQuestions.length > 0 &&
    fptQuestions.every((q) =>
      Boolean(record.fptSession?.submittedAnswers[q.id])
    ) &&
    !normalizedModes.includes('fpt')
  ) {
    normalizedModes = [...normalizedModes, 'fpt'];
  }

  const normalizedRecord: SubBlockProgressRecord = {
    ...record,
    completedModes: normalizedModes,
  };

  const derived = deriveDeterministicStatus({
    subBlock: found.subBlock,
    record: normalizedRecord,
    totalFptQuestions: fptQuestions.length,
    fptQuestionIds: fptQuestions.map((q) => q.id),
    hasRecipeExercise: Boolean(lesson?.recipe?.exercise),
    hasSyntaxExercise: Boolean(lesson?.syntax?.quickExercise),
    unitEvaluations: evaluations,
  });

  return {
    ...normalizedRecord,
    status: derived.status,
    misconceptionCount: evaluations
      ? derived.unresolvedMisconceptionCount
      : normalizedRecord.misconceptionCount,
    needsRevision: derived.needsRevision,
    revisionReason: derived.revisionReason,
    revisionDueAt: derived.revisionDueAt,
  };
}

function reconcileProgressState(
  progress: PersistedAppState['progress']
): PersistedAppState['progress'] {
  const reconciledSubBlocks: Record<string, SubBlockProgressRecord> = {};
  for (const [subBlockId, record] of Object.entries(progress.subBlocks)) {
    reconciledSubBlocks[subBlockId] = recomputeRecordStatus(
      subBlockId,
      record,
      progress.evaluations
    );
  }
  return {
    ...progress,
    subBlocks: reconciledSubBlocks,
  };
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedAppState>(() => {
    const loaded = loadAppState();
    return {
      ...loaded,
      progress: reconcileProgressState(loaded.progress),
    };
  });
  const [activeSection, setActiveSection] = useState<AppSection>(() =>
    readSectionFromHash()
  );
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    applyThemeToDocument(state.settings.theme);
  }, [state.settings.theme]);

  useEffect(() => {
    saveAppState(state);
  }, [state]);

  useEffect(() => {
    const handleHashChange = () => {
      setActiveSection(readSectionFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Study timer live tick + 5-minute streak milestone check
  useEffect(() => {
    if (!state.progress.studyTimer.isRunning) return;
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [state.progress.studyTimer.isRunning]);

  const timerElapsedSeconds = useMemo(() => {
    const timer = state.progress.studyTimer;
    if (!timer.isRunning || timer.startedAtMs === null) {
      return timer.accumulatedSeconds;
    }
    const delta = Math.max(0, Math.floor((nowMs - timer.startedAtMs) / 1000));
    return timer.accumulatedSeconds + delta;
  }, [state.progress.studyTimer, nowMs]);

  // Credit 5-minute focused study milestone automatically once reached
  useEffect(() => {
    const timer = state.progress.studyTimer;
    if (!timer.isRunning || !timer.subBlockId) return;
    const todayKey = toLocalDateKey();
    const todayRecord = state.progress.dailyActivity[todayKey];
    if (
      timerElapsedSeconds >= 300 &&
      (!todayRecord || !todayRecord.qualifiedForStreak)
    ) {
      const targetId = timer.subBlockId;
      setState((prev) => {
        const currentToday = prev.progress.dailyActivity[todayKey];
        if (currentToday?.qualifiedForStreak) return prev;
        return {
          ...prev,
          progress: {
            ...prev.progress,
            dailyActivity: recordDailyActivity(
              prev.progress.dailyActivity,
              targetId,
              { qualifying: true, addedFocusedSeconds: 300 }
            ),
            activityLog: appendActivityLog(prev.progress.activityLog, {
              subBlockId: targetId,
              methodology: prev.progress.currentMethodology,
              action: 'study_timer_milestone',
              summary: 'Reached 5 minutes of focused study',
            }),
          },
        };
      });
    }
  }, [
    timerElapsedSeconds,
    state.progress.studyTimer,
    state.progress.dailyActivity,
  ]);

  const navigateTo = useCallback((section: AppSection) => {
    setActiveSection(section);
    if (typeof window !== 'undefined') {
      const targetHash = `#${section}`;
      if (window.location.hash !== targetHash) {
        window.history.pushState(null, '', targetHash);
      }
    }
  }, []);

  const selectSubBlock = useCallback(
    (subBlockId: string, preferredMode?: LearningMethodology) => {
      const found = findSubBlockById(subBlockId, AUTHORITATIVE_SYLLABUS);
      if (!found) return;
      const validModes = found.subBlock.requiredModes;
      const chosenMode =
        preferredMode && validModes.includes(preferredMode)
          ? preferredMode
          : validModes[0] ?? 'fpt';

      setState((prev) => {
        const existingTimer = prev.progress.studyTimer;
        const shouldAutoStart =
          prev.settings.autoStartTimer && !existingTimer.isRunning;

        return {
          ...prev,
          progress: {
            ...prev.progress,
            currentSubBlockId: subBlockId,
            currentMethodology: chosenMode,
            studyTimer: shouldAutoStart
              ? {
                  isRunning: true,
                  subBlockId,
                  accumulatedSeconds: 0,
                  startedAtMs: Date.now(),
                  lastRecordedDate: toLocalDateKey(),
                }
              : existingTimer,
          },
        };
      });
    },
    []
  );

  const setActiveMethodology = useCallback((methodology: LearningMethodology) => {
    setState((prev) => ({
      ...prev,
      progress: {
        ...prev.progress,
        currentMethodology: methodology,
      },
    }));
  }, []);

  const setFptPosition = useCallback(
    (subBlockId: string, questionIndex: number) => {
      setState((prev) => {
        const record =
          prev.progress.subBlocks[subBlockId] ??
          createEmptySubBlockRecord(subBlockId);
        const session =
          record.fptSession ?? createDefaultFptSession(subBlockId);
        return {
          ...prev,
          progress: {
            ...prev.progress,
            subBlocks: {
              ...prev.progress.subBlocks,
              [subBlockId]: {
                ...record,
                fptSession: {
                  ...session,
                  currentQuestionIndex: questionIndex,
                  updatedAt: new Date().toISOString(),
                },
              },
            },
          },
        };
      });
    },
    []
  );

  const saveFptDraft = useCallback(
    (subBlockId: string, questionId: string, draft: string) => {
      setState((prev) => {
        const record =
          prev.progress.subBlocks[subBlockId] ??
          createEmptySubBlockRecord(subBlockId);
        const session =
          record.fptSession ?? createDefaultFptSession(subBlockId);

        return {
          ...prev,
          progress: {
            ...prev.progress,
            subBlocks: {
              ...prev.progress.subBlocks,
              [subBlockId]: {
                ...record,
                fptSession: {
                  ...session,
                  draftAnswers: {
                    ...session.draftAnswers,
                    [questionId]: draft,
                  },
                  updatedAt: new Date().toISOString(),
                },
              },
            },
          },
        };
      });
    },
    []
  );

  const recordFptSubmission = useCallback(
    (params: {
      subBlockId: string;
      questionId: string;
      questionLabel?: string;
      questionFocus?: string;
      answer: string;
      evaluation?: StructuredEvaluationResponse;
      model?: string;
    }) => {
      const {
        subBlockId,
        questionId,
        questionLabel,
        questionFocus,
        answer,
        evaluation,
        model,
      } = params;
      const nowIso = new Date().toISOString();

      setState((prev) => {
        const existing =
          prev.progress.subBlocks[subBlockId] ??
          createEmptySubBlockRecord(subBlockId);
        const session =
          existing.fptSession ?? createDefaultFptSession(subBlockId);

        const completedQ = session.completedQuestionIds.includes(questionId)
          ? session.completedQuestionIds
          : [...session.completedQuestionIds, questionId];

        const skippedQ = session.skippedQuestionIds.filter(
          (id) => id !== questionId
        );

        let nextScore = existing.latestScore;
        let nextHighest = existing.highestScore;
        let nextEvalCount = existing.evaluationCount;
        let nextMisconceptions = existing.misconceptionCount;
        let nextNeedsRevision = existing.needsRevision;
        let nextRevisionReason = existing.revisionReason;

        let nextEvaluations = prev.progress.evaluations;

        if (evaluation) {
          nextScore = evaluation.score;
          nextHighest =
            existing.highestScore === null
              ? evaluation.score
              : Math.max(existing.highestScore, evaluation.score);
          nextEvalCount += 1;
          if (evaluation.misconceptions.length > 0 && evaluation.score < 80) {
            nextMisconceptions += 1;
          }
          const threshold = classifyScoreThreshold(evaluation.score);
          if (threshold.shouldFlagRevision) {
            nextNeedsRevision = true;
            nextRevisionReason = threshold.revisionReason;
          } else if (
            existing.needsRevision &&
            !existing.revisionReason?.toLowerCase().includes('manual')
          ) {
            nextNeedsRevision = false;
            nextRevisionReason = undefined;
          }

          const historyItem: EvaluationHistoryRecord = {
            id: makeId('eval'),
            timestamp: nowIso,
            subBlockId,
            questionId,
            questionFocus,
            learnerAnswer: answer,
            model: model ?? prev.settings.groqModel,
            result: evaluation,
          };
          nextEvaluations = [historyItem, ...prev.progress.evaluations].slice(
            0,
            200
          );
        }

        // Preserve non-skipped status when revisiting
        const baseStatus =
          existing.status === 'skipped' ? 'in_progress' : existing.status;

        const updatedRecord = recomputeRecordStatus(
          subBlockId,
          {
            ...existing,
            status: baseStatus,
            latestScore: nextScore,
            highestScore: nextHighest,
            evaluationCount: nextEvalCount,
            misconceptionCount: nextMisconceptions,
            needsRevision: nextNeedsRevision,
            revisionReason: nextRevisionReason,
            lastStudiedAt: nowIso,
            fptSession: {
              ...session,
              submittedAnswers: {
                ...session.submittedAnswers,
                [questionId]: answer,
              },
              draftAnswers: {
                ...session.draftAnswers,
                [questionId]: answer,
              },
              skippedQuestionIds: skippedQ,
              completedQuestionIds: completedQ,
              updatedAt: nowIso,
            },
          },
          nextEvaluations
        );

        const finalizedRecord = updatedRecord;
        const label = questionLabel ?? questionId;

        return {
          ...prev,
          progress: {
            ...prev.progress,
            subBlocks: {
              ...prev.progress.subBlocks,
              [subBlockId]: finalizedRecord,
            },
            evaluations: nextEvaluations,
            dailyActivity: recordDailyActivity(
              prev.progress.dailyActivity,
              subBlockId,
              { qualifying: true }
            ),
            activityLog: appendActivityLog(prev.progress.activityLog, {
              subBlockId,
              methodology: 'fpt',
              action: 'fpt_submitted',
              summary: evaluation
                ? `${label} evaluated (${evaluation.score}/100)`
                : `${label} response saved`,
            }),
          },
        };
      });
    },
    []
  );

  const viewFptHint = useCallback(
    (subBlockId: string, questionId: string, hintLevel: number) => {
      setState((prev) => {
        const record =
          prev.progress.subBlocks[subBlockId] ??
          createEmptySubBlockRecord(subBlockId);
        const session =
          record.fptSession ?? createDefaultFptSession(subBlockId);
        const clamped = Math.min(3, Math.max(0, hintLevel));
        const currentViewed = session.viewedHints[questionId] ?? 0;
        if (clamped <= currentViewed) return prev;

        return {
          ...prev,
          progress: {
            ...prev.progress,
            subBlocks: {
              ...prev.progress.subBlocks,
              [subBlockId]: {
                ...record,
                fptSession: {
                  ...session,
                  viewedHints: {
                    ...session.viewedHints,
                    [questionId]: clamped,
                  },
                  updatedAt: new Date().toISOString(),
                },
              },
            },
            activityLog: appendActivityLog(prev.progress.activityLog, {
              subBlockId,
              methodology: 'fpt',
              action: 'hint_viewed',
              summary: `Viewed Hint ${clamped} for ${questionId}`,
            }),
          },
        };
      });
    },
    []
  );

  const revealFptExplanation = useCallback(
    (subBlockId: string, questionId: string) => {
      setState((prev) => {
        const record =
          prev.progress.subBlocks[subBlockId] ??
          createEmptySubBlockRecord(subBlockId);
        const session =
          record.fptSession ?? createDefaultFptSession(subBlockId);
        if (session.revealedExplanations.includes(questionId)) {
          return prev;
        }

        // Recorded strictly as a learning event, NOT proof of mastery
        return {
          ...prev,
          progress: {
            ...prev.progress,
            subBlocks: {
              ...prev.progress.subBlocks,
              [subBlockId]: {
                ...record,
                status:
                  record.status === 'not_started'
                    ? 'in_progress'
                    : record.status,
                fptSession: {
                  ...session,
                  revealedExplanations: [
                    ...session.revealedExplanations,
                    questionId,
                  ],
                  updatedAt: new Date().toISOString(),
                },
              },
            },
            activityLog: appendActivityLog(prev.progress.activityLog, {
              subBlockId,
              methodology: 'fpt',
              action: 'explanation_revealed',
              summary: `Revealed explanation for ${questionId}`,
            }),
          },
        };
      });
    },
    []
  );

  const skipFptQuestion = useCallback(
    (
      subBlockId: string,
      questionId: string,
      nextQuestionIndex: number
    ) => {
      setState((prev) => {
        const record =
          prev.progress.subBlocks[subBlockId] ??
          createEmptySubBlockRecord(subBlockId);
        const session =
          record.fptSession ?? createDefaultFptSession(subBlockId);
        const skipped = session.skippedQuestionIds.includes(questionId)
          ? session.skippedQuestionIds
          : [...session.skippedQuestionIds, questionId];

        return {
          ...prev,
          progress: {
            ...prev.progress,
            subBlocks: {
              ...prev.progress.subBlocks,
              [subBlockId]: {
                ...record,
                status:
                  record.status === 'not_started'
                    ? 'in_progress'
                    : record.status,
                lastStudiedAt: new Date().toISOString(),
                fptSession: {
                  ...session,
                  currentQuestionIndex: nextQuestionIndex,
                  skippedQuestionIds: skipped,
                  updatedAt: new Date().toISOString(),
                },
              },
            },
            activityLog: appendActivityLog(prev.progress.activityLog, {
              subBlockId,
              methodology: 'fpt',
              action: 'question_skipped',
              summary: `Skipped question ${questionId} (unit remains active)`,
            }),
          },
        };
      });
    },
    []
  );

  const toggleExerciseCompletion = useCallback(
    (
      subBlockId: string,
      exerciseId: string,
      mode: LearningMethodology,
      completed: boolean
    ) => {
      const nowIso = new Date().toISOString();
      setState((prev) => {
        const existing =
          prev.progress.subBlocks[subBlockId] ??
          createEmptySubBlockRecord(subBlockId);

        const nextExercises = completed
          ? Array.from(new Set([...existing.completedExerciseIds, exerciseId]))
          : existing.completedExerciseIds.filter((id) => id !== exerciseId);

        const nextModes = completed
          ? Array.from(new Set([...existing.completedModes, mode]))
          : existing.completedModes.filter((m) => m !== mode);

        const baseStatus =
          existing.status === 'skipped' ? 'in_progress' : existing.status;

        const updatedRecord = recomputeRecordStatus(
          subBlockId,
          {
            ...existing,
            status: baseStatus,
            completedExerciseIds: nextExercises,
            completedModes: nextModes,
            lastStudiedAt: nowIso,
          },
          prev.progress.evaluations
        );

        return {
          ...prev,
          progress: {
            ...prev.progress,
            subBlocks: {
              ...prev.progress.subBlocks,
              [subBlockId]: updatedRecord,
            },
            dailyActivity: completed
              ? recordDailyActivity(prev.progress.dailyActivity, subBlockId, {
                  qualifying: true,
                })
              : prev.progress.dailyActivity,
            activityLog: completed
              ? appendActivityLog(prev.progress.activityLog, {
                  subBlockId,
                  methodology: mode,
                  action: 'exercise_completed',
                  summary: `Completed ${mode.toUpperCase()} practical exercise`,
                })
              : prev.progress.activityLog,
          },
        };
      });
    },
    []
  );

  const saveSubBlockNotes = useCallback((subBlockId: string, notes: string) => {
    setState((prev) => {
      const existing =
        prev.progress.subBlocks[subBlockId] ??
        createEmptySubBlockRecord(subBlockId);
      return {
        ...prev,
        progress: {
          ...prev.progress,
          subBlocks: {
            ...prev.progress.subBlocks,
            [subBlockId]: {
              ...existing,
              draftNotes: notes,
            },
          },
        },
      };
    });
  }, []);

  const skipSubBlock = useCallback((subBlockId: string): string | null => {
    const nextUnit = getNextSubBlock(subBlockId, AUTHORITATIVE_SYLLABUS);
    const nextId = nextUnit?.id ?? null;
    const nowIso = new Date().toISOString();

    setState((prev) => {
      const existing =
        prev.progress.subBlocks[subBlockId] ??
        createEmptySubBlockRecord(subBlockId);

      const skippedRecord: SubBlockProgressRecord = {
        ...existing,
        status: 'skipped',
        skippedAt: nowIso,
      };

      const nextFound = nextId
        ? findSubBlockById(nextId, AUTHORITATIVE_SYLLABUS)
        : null;

      return {
        ...prev,
        progress: {
          ...prev.progress,
          currentSubBlockId: nextId,
          currentMethodology:
            nextFound?.subBlock.requiredModes[0] ??
            prev.progress.currentMethodology,
          subBlocks: {
            ...prev.progress.subBlocks,
            [subBlockId]: skippedRecord,
          },
          activityLog: appendActivityLog(prev.progress.activityLog, {
            subBlockId,
            methodology: prev.progress.currentMethodology,
            action: 'unit_skipped',
            summary: `Skipped unit ${subBlockId} (attempts preserved, not counted as completed)`,
          }),
        },
      };
    });

    return nextId;
  }, []);

  const toggleManualRevisionFlag = useCallback(
    (subBlockId: string, needsRevision: boolean, reason?: string) => {
      const nowIso = new Date().toISOString();
      setState((prev) => {
        const existing =
          prev.progress.subBlocks[subBlockId] ??
          createEmptySubBlockRecord(subBlockId);

        const patchedRecord: SubBlockProgressRecord = {
          ...existing,
          needsRevision,
          revisionReason: needsRevision
            ? reason ?? 'Manually flagged for revision'
            : undefined,
          revisionDueAt: needsRevision ? nowIso : undefined,
        };

        const finalRecord = needsRevision
          ? patchedRecord
          : recomputeRecordStatus(
              subBlockId,
              patchedRecord,
              prev.progress.evaluations
            );

        return {
          ...prev,
          progress: {
            ...prev.progress,
            subBlocks: {
              ...prev.progress.subBlocks,
              [subBlockId]: finalRecord,
            },
            activityLog: needsRevision
              ? appendActivityLog(prev.progress.activityLog, {
                  subBlockId,
                  methodology: prev.progress.currentMethodology,
                  action: 'marked_revision',
                  summary: reason ?? 'Flagged unit for revision',
                })
              : prev.progress.activityLog,
          },
        };
      });
    },
    []
  );

  const markUnitRevised = useCallback((subBlockId: string) => {
    const nowIso = new Date().toISOString();
    setState((prev) => {
      const existing =
        prev.progress.subBlocks[subBlockId] ??
        createEmptySubBlockRecord(subBlockId);

      const updated = recomputeRecordStatus(
        subBlockId,
        {
          ...existing,
          needsRevision: false,
          revisionReason: undefined,
          revisionDueAt: undefined,
          lastRevisedAt: nowIso,
          lastStudiedAt: nowIso,
        },
        prev.progress.evaluations
      );

      return {
        ...prev,
        progress: {
          ...prev.progress,
          subBlocks: {
            ...prev.progress.subBlocks,
            [subBlockId]: updated,
          },
          dailyActivity: recordDailyActivity(
            prev.progress.dailyActivity,
            subBlockId,
            { qualifying: true }
          ),
          activityLog: appendActivityLog(prev.progress.activityLog, {
            subBlockId,
            methodology: prev.progress.currentMethodology,
            action: 'unit_revised',
            summary: `Completed spaced revision for ${subBlockId}`,
          }),
        },
      };
    });
  }, []);

  const startStudyTimer = useCallback((subBlockId: string) => {
    const now = Date.now();
    setNowMs(now);
    setState((prev) => ({
      ...prev,
      progress: {
        ...prev.progress,
        studyTimer: {
          isRunning: true,
          subBlockId,
          accumulatedSeconds: 0,
          startedAtMs: now,
          lastRecordedDate: toLocalDateKey(),
        },
      },
    }));
  }, []);

  const pauseStudyTimer = useCallback(() => {
    const now = Date.now();
    setNowMs(now);
    setState((prev) => {
      const timer = prev.progress.studyTimer;
      if (!timer.isRunning || timer.startedAtMs === null) return prev;
      const delta = Math.max(0, Math.floor((now - timer.startedAtMs) / 1000));
      return {
        ...prev,
        progress: {
          ...prev.progress,
          studyTimer: {
            ...timer,
            isRunning: false,
            accumulatedSeconds: timer.accumulatedSeconds + delta,
            startedAtMs: null,
          },
        },
      };
    });
  }, []);

  const resumeStudyTimer = useCallback(() => {
    const now = Date.now();
    setNowMs(now);
    setState((prev) => {
      const timer = prev.progress.studyTimer;
      if (timer.isRunning) return prev;
      return {
        ...prev,
        progress: {
          ...prev.progress,
          studyTimer: {
            ...timer,
            isRunning: true,
            subBlockId:
              timer.subBlockId ?? prev.progress.currentSubBlockId ?? '0.1',
            startedAtMs: now,
            lastRecordedDate: toLocalDateKey(),
          },
        },
      };
    });
  }, []);

  const stopStudyTimer = useCallback(() => {
    const now = Date.now();
    setNowMs(now);
    setState((prev) => {
      const timer = prev.progress.studyTimer;
      const delta =
        timer.isRunning && timer.startedAtMs !== null
          ? Math.max(0, Math.floor((now - timer.startedAtMs) / 1000))
          : 0;
      const totalSeconds = timer.accumulatedSeconds + delta;
      const targetId = timer.subBlockId ?? prev.progress.currentSubBlockId;

      const updatedDaily =
        targetId && totalSeconds > 0
          ? recordDailyActivity(prev.progress.dailyActivity, targetId, {
              addedFocusedSeconds: totalSeconds,
              qualifying: totalSeconds >= 300,
            })
          : prev.progress.dailyActivity;

      return {
        ...prev,
        progress: {
          ...prev.progress,
          dailyActivity: updatedDaily,
          studyTimer: {
            isRunning: false,
            subBlockId: null,
            accumulatedSeconds: 0,
            startedAtMs: null,
            lastRecordedDate: null,
          },
        },
      };
    });
  }, []);

  const setTheme = useCallback((theme: ThemeMode) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, theme },
    }));
  }, []);

  const setGroqApiKey = useCallback((groqApiKey: string) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, groqApiKey: groqApiKey.trim() },
    }));
  }, []);

  const setGroqModel = useCallback((groqModel: string) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, groqModel },
    }));
  }, []);

  const setDefaultMethodology = useCallback(
    (defaultMethodology: LearningMethodology) => {
      setState((prev) => ({
        ...prev,
        settings: { ...prev.settings, defaultMethodology },
      }));
    },
    []
  );

  const setAutoStartTimer = useCallback((autoStartTimer: boolean) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, autoStartTimer },
    }));
  }, []);

  const setConfirmBeforeSkipTopic = useCallback(
    (confirmBeforeSkipTopic: boolean) => {
      setState((prev) => ({
        ...prev,
        settings: { ...prev.settings, confirmBeforeSkipTopic },
      }));
    },
    []
  );

  const exportData = useCallback(() => {
    return exportAppStateJson(state);
  }, [state]);

  const validateImportJson = useCallback((rawJson: string) => {
    return importAppStateJson(rawJson);
  }, []);

  const applyImportedData = useCallback(
    (data: {
      progress: PersistedAppState['progress'];
      preferences: ExportedBackupPayload['preferences'];
    }) => {
      setState((prev) => ({
        ...prev,
        progress: reconcileProgressState(data.progress),
        settings: {
          ...prev.settings,
          ...data.preferences,
          // Always preserve local Groq API key — never overwritten by backups
          groqApiKey: prev.settings.groqApiKey,
        },
      }));
    },
    []
  );

  const resetProgressOnly = useCallback(() => {
    setState((prev) => resetProgressInState(prev));
  }, []);

  const value = useMemo<AppStateContextValue>(
    () => ({
      state,
      activeSection,
      navigateTo,
      selectSubBlock,
      setActiveMethodology,
      setFptPosition,
      saveFptDraft,
      recordFptSubmission,
      viewFptHint,
      revealFptExplanation,
      skipFptQuestion,
      toggleExerciseCompletion,
      saveSubBlockNotes,
      skipSubBlock,
      toggleManualRevisionFlag,
      markUnitRevised,
      timerElapsedSeconds,
      startStudyTimer,
      pauseStudyTimer,
      resumeStudyTimer,
      stopStudyTimer,
      setTheme,
      setGroqApiKey,
      setGroqModel,
      setDefaultMethodology,
      setAutoStartTimer,
      setConfirmBeforeSkipTopic,
      exportData,
      validateImportJson,
      applyImportedData,
      resetProgressOnly,
    }),
    [
      state,
      activeSection,
      navigateTo,
      selectSubBlock,
      setActiveMethodology,
      setFptPosition,
      saveFptDraft,
      recordFptSubmission,
      viewFptHint,
      revealFptExplanation,
      skipFptQuestion,
      toggleExerciseCompletion,
      saveSubBlockNotes,
      skipSubBlock,
      toggleManualRevisionFlag,
      markUnitRevised,
      timerElapsedSeconds,
      startStudyTimer,
      pauseStudyTimer,
      resumeStudyTimer,
      stopStudyTimer,
      setTheme,
      setGroqApiKey,
      setGroqModel,
      setDefaultMethodology,
      setAutoStartTimer,
      setConfirmBeforeSkipTopic,
      exportData,
      validateImportJson,
      applyImportedData,
      resetProgressOnly,
    ]
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState must be used inside AppStateProvider');
  }
  return ctx;
}
