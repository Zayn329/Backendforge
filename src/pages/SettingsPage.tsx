import React, { useRef, useState } from 'react';
import {
  Check,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Moon,
  Sun,
  Trash2,
  Upload,
  Wifi,
} from 'lucide-react';
import { MethodologySwitcher, Panel, PanelHeader } from '../components';
import { GROQ_AVAILABLE_MODELS, testGroqConnection } from '../evaluation';
import { ExportedBackupPayload } from '../persistence';
import { useAppState } from '../persistence/AppStateContext';
import { cn, toLocalDateKey } from '../utilities';

export function SettingsPage() {
  const {
    state,
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
  } = useAppState();

  const [apiKeyDraft, setApiKeyDraft] = useState(state.settings.groqApiKey);
  const [showKey, setShowKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<{
    type: 'info' | 'success' | 'error';
    text: string;
  } | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  const [backupMessage, setBackupMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [pendingImport, setPendingImport] = useState<{
    progress: ExportedBackupPayload['progress'];
    preferences: ExportedBackupPayload['preferences'];
    unitCount: number;
    evalCount: number;
  } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasSavedKey = state.settings.groqApiKey.trim().length > 0;

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    setGroqApiKey(apiKeyDraft);
    setKeyStatus({
      type: 'success',
      text: apiKeyDraft.trim()
        ? 'Groq API key saved locally in browser storage.'
        : 'Groq API key cleared.',
    });
  };

  const handleClearApiKey = () => {
    setApiKeyDraft('');
    setGroqApiKey('');
    setKeyStatus({
      type: 'info',
      text: 'Groq API key removed from browser storage.',
    });
  };

  const handleTestConnection = async () => {
    const keyToTest = apiKeyDraft.trim() || state.settings.groqApiKey.trim();
    setTestingConnection(true);
    setKeyStatus(null);
    const result = await testGroqConnection(
      keyToTest,
      state.settings.groqModel
    );
    setTestingConnection(false);
    setKeyStatus({
      type: result.ok ? 'success' : 'error',
      text: result.message,
    });
  };

  const handleExport = () => {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backend-forge-progress-${toLocalDateKey()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setBackupMessage({
      type: 'success',
      text: 'Exported versioned progress backup (Groq API key excluded).',
    });
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackupMessage(null);

    try {
      const text = await file.text();
      const result = validateImportJson(text);
      if (result.success && result.data) {
        setPendingImport({
          progress: result.data.progress,
          preferences: result.data.preferences,
          unitCount: Object.keys(result.data.progress.subBlocks).length,
          evalCount: result.data.progress.evaluations.length,
        });
      } else {
        setPendingImport(null);
        setBackupMessage({
          type: 'error',
          text: result.error ?? 'Failed to validate backup file.',
        });
      }
    } catch {
      setPendingImport(null);
      setBackupMessage({
        type: 'error',
        text: 'Unable to read the selected file.',
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (!pendingImport) return;
    applyImportedData({
      progress: pendingImport.progress,
      preferences: pendingImport.preferences,
    });
    setPendingImport(null);
    setBackupMessage({
      type: 'success',
      text: 'Progress backup imported successfully. Authoritative curriculum and local API key were preserved.',
    });
  };

  const handleResetConfirmed = () => {
    resetProgressOnly();
    setConfirmReset(false);
    setBackupMessage({
      type: 'success',
      text: 'Learner progress, streaks, and sessions were reset. Curriculum and lesson content remain intact.',
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* AI Configuration */}
      <Panel>
        <PanelHeader
          title="AI Configuration (Groq)"
          subtitle="Direct browser evaluation using your personal Groq API key"
          action={
            <span
              className={cn(
                'text-xs font-medium',
                hasSavedKey
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400'
              )}
            >
              {hasSavedKey ? 'Configured locally' : 'Not configured'}
            </span>
          }
        />

        <form onSubmit={handleSaveApiKey} className="p-5 space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="groq-api-key-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Groq API Key (never exported or logged)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <KeyRound
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="groq-api-key-input"
                  type={showKey ? 'text' : 'password'}
                  value={apiKeyDraft}
                  onChange={(e) => setApiKeyDraft(e.target.value)}
                  placeholder="gsk_..."
                  autoComplete="off"
                  className="w-full pl-9 pr-10 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((prev) => !prev)}
                  aria-label={showKey ? 'Hide API key' : 'Show API key'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showKey ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{hasSavedKey ? 'Replace / Save' : 'Save Key'}</span>
                </button>
                <button
                  type="button"
                  disabled={testingConnection}
                  onClick={handleTestConnection}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161C26] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {testingConnection ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wifi className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>Test Connection</span>
                </button>
                {hasSavedKey ? (
                  <button
                    type="button"
                    onClick={handleClearApiKey}
                    className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161C26] transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="groq-model-select"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Configured Evaluation Model
            </label>
            <select
              id="groq-model-select"
              value={state.settings.groqModel}
              onChange={(e) => setGroqModel(e.target.value)}
              className="w-full sm:w-80 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {GROQ_AVAILABLE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {keyStatus ? (
            <p
              className={cn(
                'text-xs font-medium',
                keyStatus.type === 'success'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : keyStatus.type === 'error'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-slate-600 dark:text-slate-400'
              )}
            >
              {keyStatus.text}
            </p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Your API key stays exclusively in browser localStorage and is
              excluded from JSON progress exports. Backend Forge works offline
              without a key.
            </p>
          )}
        </form>
      </Panel>

      {/* Application & Study Preferences */}
      <Panel>
        <PanelHeader
          title="Application & Study Preferences"
          subtitle="Theme, default methodology, and workflow guardrails"
        />
        <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
          <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Interface Theme
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Dark mode is default; switch anytime.
              </p>
            </div>
            <div
              role="group"
              aria-label="Theme selection"
              className="inline-flex items-center gap-1 p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-[#0B0E14] self-start sm:self-auto"
            >
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer',
                  state.settings.theme === 'dark'
                    ? 'bg-white dark:bg-[#18202F] text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                )}
              >
                <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Dark</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer',
                  state.settings.theme === 'light'
                    ? 'bg-white dark:bg-[#18202F] text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                )}
              >
                <Sun className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Light</span>
              </button>
            </div>
          </div>

          <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Preferred Learning Mode
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Default methodology highlight for mixed-mode units.
              </p>
            </div>
            <MethodologySwitcher
              value={state.settings.defaultMethodology}
              onChange={setDefaultMethodology}
              compact
            />
          </div>

          <div className="p-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Auto-start Focus Timer
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Automatically start the study timer when opening a curriculum
                unit.
              </p>
            </div>
            <input
              type="checkbox"
              checked={state.settings.autoStartTimer}
              onChange={(e) => setAutoStartTimer(e.target.checked)}
              aria-label="Auto-start focus timer"
              className="w-4 h-4 accent-blue-600 cursor-pointer"
            />
          </div>

          <div className="p-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Confirm Before Skipping Topic
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Show a confirmation dialog before skipping an entire learning
                unit.
              </p>
            </div>
            <input
              type="checkbox"
              checked={state.settings.confirmBeforeSkipTopic}
              onChange={(e) => setConfirmBeforeSkipTopic(e.target.checked)}
              aria-label="Confirm before skipping topic"
              className="w-4 h-4 accent-blue-600 cursor-pointer"
            />
          </div>
        </div>
      </Panel>

      {/* Data Management */}
      <Panel>
        <PanelHeader
          title="Data Management"
          subtitle="Versioned JSON export/import (excludes secrets) and progress-only reset"
        />

        <div className="p-5 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#161C26] text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-[#1E2634] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Export Progress</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportFile}
              className="hidden"
              aria-label="Import progress JSON file"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#161C26] text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-[#1E2634] transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Import Progress</span>
            </button>
          </div>

          {pendingImport ? (
            <div
              role="alertdialog"
              aria-label="Confirm progress import"
              className="p-4 rounded-lg border border-blue-400/50 bg-blue-50/70 dark:bg-blue-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1 text-slate-800 dark:text-slate-200">
                <p className="font-semibold">
                  Validated backup ready to import
                </p>
                <p className="text-slate-600 dark:text-slate-300 tabular-nums">
                  Contains {pendingImport.unitCount} unit records and{' '}
                  {pendingImport.evalCount} evaluations. Replacing existing
                  progress keeps your local API key and authoritative curriculum
                  intact.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="px-3.5 py-1.5 font-medium rounded-md bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                >
                  Confirm Import
                </button>
                <button
                  type="button"
                  onClick={() => setPendingImport(null)}
                  className="px-3 py-1.5 font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {backupMessage ? (
            <p
              className={cn(
                'text-xs font-medium',
                backupMessage.type === 'success'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              )}
            >
              {backupMessage.text}
            </p>
          ) : null}

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Reset Progress
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Resets topic progress, evaluations, streaks, and sessions while
                preserving curriculum, lesson content, and API key.
              </p>
            </div>

            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-red-300 dark:border-red-900/70 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors self-start sm:self-auto cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Reset Progress</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleResetConfirmed}
                  className="px-3.5 py-2 text-xs font-medium rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer"
                >
                  Confirm Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161C26] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
