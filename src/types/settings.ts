import { LearningMethodology } from './curriculum';

export type ThemeMode = 'dark' | 'light';

export interface AppSettings {
  theme: ThemeMode;
  groqApiKey: string;
  groqModel: string;
  defaultMethodology: LearningMethodology;
  autoStartTimer: boolean;
  confirmBeforeSkipTopic: boolean;
}
