export type LearningMethodology = 'fpt' | 'recipe' | 'syntax';

export type LearningModeAssignment =
  | 'FPT'
  | 'Recipe'
  | 'Syntax'
  | 'FPT + Recipe'
  | 'Concept + Recipe'
  | 'FPT + Practical'
  | 'Practical'
  | 'Recipe + Practical'
  | 'Concept + Practical';

export interface MethodologyDefinition {
  id: LearningMethodology;
  label: string;
  shortLabel: string;
  description: string;
  focusPrompt: string;
}

export interface CurriculumTopic {
  id: string;
  subBlockId: string;
  order: number;
  title: string;
  group?: string;
}

export interface CurriculumSubBlock {
  id: string;
  blockId: string;
  order: number;
  title: string;
  description?: string;
  learningMode: LearningModeAssignment;
  requiredModes: LearningMethodology[];
  topics: CurriculumTopic[];
}

export interface CurriculumBlock {
  id: string;
  order: number;
  title: string;
  subBlocks: CurriculumSubBlock[];
}

export interface CurriculumSyllabus {
  version: string;
  title: string;
  description: string;
  blocks: CurriculumBlock[];
}
