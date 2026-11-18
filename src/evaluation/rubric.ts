import { RubricCriterion } from '../types';

export const DEFAULT_FPT_RUBRIC: readonly RubricCriterion[] = [
  {
    name: 'Conceptual accuracy',
    weight: 30,
    description:
      'Technical correctness of runtime, OS, network, or protocol claims without conflating mechanisms.',
  },
  {
    name: 'Causal reasoning and derivation',
    weight: 25,
    description:
      'Explains why a behavior or design emerges from underlying constraints rather than repeating slogans.',
  },
  {
    name: 'Completeness of mental model',
    weight: 20,
    description:
      'Covers the essential steps, invariants, and interactions asked in the prompt.',
  },
  {
    name: 'Edge cases and trade-offs',
    weight: 15,
    description:
      'Recognizes failure modes, boundaries, or engineering trade-offs where applicable.',
  },
  {
    name: 'Clarity',
    weight: 10,
    description:
      'Clear, structured engineering communication without hand-waving.',
  },
] as const;
