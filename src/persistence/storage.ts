import { isValidSubBlockId } from '../curriculum';
import {
  CURRENT_SCHEMA_VERSION,
  ExportedBackupPayload,
  PersistedAppState,
  createDefaultAppState,
  createDefaultProgressState,
  exportedBackupSchema,
  persistedAppStateSchema,
} from './schema';

export const STORAGE_KEY = 'backend_forge_v1';

export interface ImportResult {
  success: boolean;
  data?: {
    progress: PersistedAppState['progress'];
    preferences: ExportedBackupPayload['preferences'];
  };
  error?: string;
}

function isStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    const probeKey = '__backend_forge_probe__';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Migrates v1 Pass-1 state cleanly into v2 without crashing.
 */
function migrateV1ToV2(raw: Record<string, unknown>): PersistedAppState | null {
  try {
    const rawSettings = (raw.settings ?? {}) as Record<string, unknown>;
    const theme = rawSettings.theme === 'light' ? 'light' : 'dark';
    const groqApiKey =
      typeof rawSettings.groqApiKey === 'string' ? rawSettings.groqApiKey : '';
    const defaultMethodology =
      rawSettings.defaultMethodology === 'recipe' ||
      rawSettings.defaultMethodology === 'syntax'
        ? rawSettings.defaultMethodology
        : 'fpt';

    const defaults = createDefaultAppState();
    return {
      ...defaults,
      settings: {
        ...defaults.settings,
        theme,
        groqApiKey,
        defaultMethodology,
      },
    };
  } catch {
    return null;
  }
}

export function loadAppState(): PersistedAppState {
  const fallback = createDefaultAppState();
  if (!isStorageAvailable()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsedJson: unknown = JSON.parse(raw);
    if (parsedJson && typeof parsedJson === 'object') {
      const version = (parsedJson as { schemaVersion?: unknown }).schemaVersion;
      if (version === 1) {
        const migrated = migrateV1ToV2(parsedJson as Record<string, unknown>);
        return migrated ?? fallback;
      }
      if (version === 2) {
        const migratedV3 = persistedAppStateSchema.safeParse({
          ...(parsedJson as Record<string, unknown>),
          schemaVersion: CURRENT_SCHEMA_VERSION,
        });
        if (migratedV3.success) {
          return migratedV3.data;
        }
      }
    }

    const validated = persistedAppStateSchema.safeParse(parsedJson);
    if (!validated.success) {
      return fallback;
    }

    return validated.data;
  } catch {
    return fallback;
  }
}

export function saveAppState(state: PersistedAppState): boolean {
  if (!isStorageAvailable()) {
    return false;
  }

  const nextState: PersistedAppState = {
    ...state,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  };

  const validated = persistedAppStateSchema.safeParse(nextState);
  if (!validated.success) {
    return false;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(validated.data));
    return true;
  } catch {
    return false;
  }
}

export function resetProgressInState(
  currentState: PersistedAppState
): PersistedAppState {
  return {
    ...currentState,
    updatedAt: new Date().toISOString(),
    progress: createDefaultProgressState(),
  };
}

/**
 * Exports progress, evaluation history, sessions, streaks, revisions, and UI preferences.
 * Explicitly EXCLUDES groqApiKey and any sensitive credentials.
 */
export function exportAppStateJson(state: PersistedAppState): string {
  const payload: ExportedBackupPayload = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    progress: state.progress,
    preferences: {
      theme: state.settings.theme,
      groqModel: state.settings.groqModel,
      defaultMethodology: state.settings.defaultMethodology,
      autoStartTimer: state.settings.autoStartTimer,
      confirmBeforeSkipTopic: state.settings.confirmBeforeSkipTopic,
    },
  };
  return JSON.stringify(payload, null, 2);
}

export function importAppStateJson(rawText: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return {
      success: false,
      error: 'The selected file does not contain valid JSON.',
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      success: false,
      error: 'Backup file root must be a JSON object.',
    };
  }

  const version = (parsed as { schemaVersion?: unknown }).schemaVersion;
  if (version !== CURRENT_SCHEMA_VERSION && version !== 2) {
    return {
      success: false,
      error: `Incompatible backup schema version (${String(version ?? 'unknown')}). Expected version ${CURRENT_SCHEMA_VERSION} (or 2).`,
    };
  }

  const normalizedPayload =
    version === 2
      ? {
          ...(parsed as Record<string, unknown>),
          schemaVersion: CURRENT_SCHEMA_VERSION,
        }
      : parsed;

  const result = exportedBackupSchema.safeParse(normalizedPayload);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const pathLabel = firstIssue?.path.length
      ? `${firstIssue.path.join('.')}: `
      : '';
    return {
      success: false,
      error: `Invalid Backend Forge backup format (${pathLabel}${firstIssue?.message ?? 'schema mismatch'}).`,
    };
  }

  // Verify every referenced curriculum subBlockId against authoritative syllabus
  const { progress } = result.data;
  if (progress.currentSubBlockId && !isValidSubBlockId(progress.currentSubBlockId)) {
    return {
      success: false,
      error: `Backup references unknown curriculum unit "${progress.currentSubBlockId}".`,
    };
  }

  for (const subBlockId of Object.keys(progress.subBlocks)) {
    if (!isValidSubBlockId(subBlockId)) {
      return {
        success: false,
        error: `Backup contains unknown curriculum sub-block ID "${subBlockId}".`,
      };
    }
  }

  for (const ev of progress.evaluations) {
    if (!isValidSubBlockId(ev.subBlockId)) {
      return {
        success: false,
        error: `Backup evaluation history references unknown sub-block "${ev.subBlockId}".`,
      };
    }
  }

  return {
    success: true,
    data: {
      progress: result.data.progress,
      preferences: result.data.preferences,
    },
  };
}
