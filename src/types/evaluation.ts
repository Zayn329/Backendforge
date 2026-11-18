import { RubricCriterion } from './content';

export type RecommendedAction =
  | 'reinforce'
  | 'follow_up'
  | 'proceed'
  | 'mastered'
  | 'retry';

export interface CriterionEvaluation {
  criterion: string;
  weight: number;
  score: number;
  rationale: string;
}

export interface StructuredEvaluationResponse {
  score: number;
  verdict: string;
  criterion_scores: CriterionEvaluation[];
  strengths: string[];
  gaps: string[];
  misconceptions: string[];
  feedback: string;
  suggested_improvement: string;
  follow_up_question: string;
  recommended_action: RecommendedAction;
}

export interface EvaluationRequest {
  blockTitle: string;
  subBlockId: string;
  subBlockTitle: string;
  objectives: string[];
  questionContext?: string;
  questionId: string;
  questionPrompt: string;
  learnerAnswer: string;
  lessonContext: string;
  questionExplanation?: string;
  evaluationCriteria: string[];
  rubric: RubricCriterion[];
}

export interface EvaluationHistoryRecord {
  id: string;
  timestamp: string;
  subBlockId: string;
  questionId: string;
  questionFocus?: string;
  /** @deprecated Legacy stage tag preserved only for historical v2 records */
  stage?: number;
  learnerAnswer: string;
  model: string;
  result: StructuredEvaluationResponse;
}
