export type EvaluationReadinessStatus = 'unconfigured' | 'ready';

export interface EvaluationReadiness {
  status: EvaluationReadinessStatus;
  canEvaluate: boolean;
  message: string;
}

export function getEvaluationReadiness(groqApiKey: string): EvaluationReadiness {
  const hasKey = groqApiKey.trim().length > 0;
  if (!hasKey) {
    return {
      status: 'unconfigured',
      canEvaluate: false,
      message:
        'Groq API key is not configured. You can save answers locally, review hints/explanations, and progress manually, or add a key in Settings for AI rubric grading.',
    };
  }

  return {
    status: 'ready',
    canEvaluate: true,
    message:
      'Groq evaluation ready. Submitted answers are graded against the sub-block rubric and learning objectives.',
  };
}
