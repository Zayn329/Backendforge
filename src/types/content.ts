export interface CodeSnippet {
  id: string;
  title: string;
  language: string;
  code: string;
  explanation?: string;
}

export interface CommandSnippet {
  id: string;
  label: string;
  command: string;
  notes?: string;
}

export interface RubricCriterion {
  name: string;
  weight: number;
  description: string;
}

export interface FptPrerequisite {
  subBlockId?: string;
  label: string;
  detail: string;
}

export interface FptIntroduction {
  summaryMarkdown: string;
  whyItMattersMarkdown: string;
  prerequisites: FptPrerequisite[];
}

export interface FptAnnotatedCodeExample {
  snippet: CodeSnippet;
  lineByLineMarkdown: string;
}

export interface FptTopicSection {
  id: string;
  topicId: string;
  /** Additional syllabus topic IDs taught in this section so anchor links jump here */
  coveredTopicIds?: string[];
  title: string;
  problemAndRequirementsMarkdown: string;
  conceptAndMechanismMarkdown: string;
  codeExamples: FptAnnotatedCodeExample[];
  backendApplicationsMarkdown?: string;
  edgeCasesAndTradeOffsMarkdown?: string;
  centralIdeaSummary: string;
}

export interface FptConceptConnection {
  title: string;
  narrativeMarkdown: string;
  integratedExample: CodeSnippet;
  walkthroughMarkdown: string;
}

export interface FptQuestion {
  id: string;
  /** Optional focus area label shown in the Knowledge Check UI */
  focusArea?: string;
  /** @deprecated Legacy 9-stage metadata preserved only for unmigrated lessons */
  stage?: number;
  prompt: string;
  hints: [string, string, string];
  explanation: string;
  evaluationCriteria: string[];
  topicIds: string[];
}

export interface FptLessonContent {
  /** Pilot flag selecting the structured 5-section theory-first teaching flow */
  mode?: 'theory_first';
  /** Section A (theory-first lessons) */
  introduction?: FptIntroduction;
  /** Section B (theory-first lessons) */
  topicSections?: FptTopicSection[];
  /** Section C (theory-first lessons) */
  conceptConnection?: FptConceptConnection;
  /** Legacy fields preserved for unmodified units (0.1, 1.x, 2.x) */
  overviewMarkdown?: string;
  prerequisites?: string[];
  mentalModelMarkdown?: string;
  /** Section D Knowledge Check questions */
  questions: FptQuestion[];
  customRubric?: RubricCriterion[];
}

export interface RecipeWorkflowStep {
  stepNumber: number;
  title: string;
  detailMarkdown: string;
  code?: CodeSnippet;
}

export interface RecipeLessonContent {
  purposeMarkdown: string;
  whenToUseMarkdown: string;
  setupCommands: CommandSnippet[];
  coreApisMarkdown: string;
  workflowSteps: RecipeWorkflowStep[];
  workingExamples: CodeSnippet[];
  commonMistakes: Array<{ mistake: string; fix: string }>;
  exercise: {
    id: string;
    title: string;
    instructionsMarkdown: string;
    acceptanceChecklist: string[];
  };
}

export interface SyntaxParameter {
  name: string;
  type: string;
  description: string;
}

export interface SyntaxLessonContent {
  referenceMarkdown: string;
  commonCommands: CommandSnippet[];
  importantParameters: SyntaxParameter[];
  configurationMarkdown: string;
  examples: CodeSnippet[];
  commonMistakes: Array<{ mistake: string; fix: string }>;
  quickExercise: {
    id: string;
    title: string;
    promptMarkdown: string;
    expectedOutcome: string;
  };
}

export interface SubBlockLessonContent {
  subBlockId: string;
  fpt?: FptLessonContent;
  recipe?: RecipeLessonContent;
  syntax?: SyntaxLessonContent;
}
