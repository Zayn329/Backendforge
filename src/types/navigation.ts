export type AppSection =
  | 'dashboard'
  | 'curriculum'
  | 'workspace'
  | 'progress'
  | 'settings';

export interface NavigationItem {
  id: AppSection;
  label: string;
  shortLabel: string;
  description: string;
}
