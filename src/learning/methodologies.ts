import { LearningMethodology, MethodologyDefinition } from '../types';

export const LEARNING_METHODOLOGIES: readonly MethodologyDefinition[] = [
  {
    id: 'fpt',
    label: 'First Principles Thinking',
    shortLabel: 'FPT',
    description:
      'Reason from underlying system constraints, memory/network trade-offs, and invariants before reaching for tools.',
    focusPrompt:
      'Derive why the mechanism exists, what failure modes it addresses, and what trade-offs it forces.',
  },
  {
    id: 'recipe',
    label: 'Recipe Mode',
    shortLabel: 'Recipe',
    description:
      'Structure repeatable implementation blueprints, architectural steps, and production-ready decision sequences.',
    focusPrompt:
      'Outline the concrete engineering steps, edge-case guards, and verification checks required in production.',
  },
  {
    id: 'syntax',
    label: 'Syntax Mode',
    shortLabel: 'Syntax',
    description:
      'Translate mental models and blueprints into exact, idiomatic code, queries, schemas, and protocol primitives.',
    focusPrompt:
      'Write precise implementation code or query syntax without relying on vague pseudocode.',
  },
] as const;

export const METHODOLOGY_MAP: Record<LearningMethodology, MethodologyDefinition> = {
  fpt: LEARNING_METHODOLOGIES[0],
  recipe: LEARNING_METHODOLOGIES[1],
  syntax: LEARNING_METHODOLOGIES[2],
};

export function getMethodologyDefinition(
  methodology: LearningMethodology
): MethodologyDefinition {
  return METHODOLOGY_MAP[methodology];
}
