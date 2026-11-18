import React from 'react';
import { AppShell } from './components';
import {
  CurriculumPage,
  DashboardPage,
  ProgressPage,
  SettingsPage,
  WorkspacePage,
} from './pages';
import { AppStateProvider, useAppState } from './persistence/AppStateContext';

function SectionRouter() {
  const { activeSection } = useAppState();

  switch (activeSection) {
    case 'dashboard':
      return <DashboardPage />;
    case 'curriculum':
      return <CurriculumPage />;
    case 'workspace':
      return <WorkspacePage />;
    case 'progress':
      return <ProgressPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <DashboardPage />;
  }
}

export default function App() {
  return (
    <AppStateProvider>
      <AppShell>
        <SectionRouter />
      </AppShell>
    </AppStateProvider>
  );
}
