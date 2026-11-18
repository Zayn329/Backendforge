import {
  CurriculumBlock,
  CurriculumSubBlock,
  CurriculumSyllabus,
  LearningModeAssignment,
} from '../types';
import { CURRICULUM_BLOCKS_0_TO_8 } from './blocksDataA';
import { CURRICULUM_BLOCKS_9_TO_16 } from './blocksDataB';

/**
 * Authoritative fixed curriculum derived from BACKEND_FORGE_SYLLABUS.md (v1.0).
 * Strictly immutable and separate from learner progress and lesson content.
 */
export const AUTHORITATIVE_SYLLABUS: CurriculumSyllabus = {
  version: '1.0',
  title: 'Backend Engineering Curriculum',
  description:
    'Authoritative 17-block backend engineering syllabus across First Principles Thinking, Recipe, and Syntax modes.',
  blocks: [...CURRICULUM_BLOCKS_0_TO_8, ...CURRICULUM_BLOCKS_9_TO_16],
};

export const ALL_LEARNING_MODE_ASSIGNMENTS: readonly LearningModeAssignment[] = [
  'FPT',
  'Recipe',
  'Syntax',
  'FPT + Recipe',
  'Concept + Recipe',
  'FPT + Practical',
  'Practical',
  'Recipe + Practical',
  'Concept + Practical',
] as const;

export function getAllSubBlocks(
  syllabus: CurriculumSyllabus = AUTHORITATIVE_SYLLABUS
): CurriculumSubBlock[] {
  const list: CurriculumSubBlock[] = [];
  for (const block of syllabus.blocks) {
    for (const subBlock of block.subBlocks) {
      list.push(subBlock);
    }
  }
  return list;
}

export function findSubBlockById(
  subBlockId: string | null,
  syllabus: CurriculumSyllabus = AUTHORITATIVE_SYLLABUS
): { block: CurriculumBlock; subBlock: CurriculumSubBlock } | null {
  if (!subBlockId) return null;
  for (const block of syllabus.blocks) {
    const match = block.subBlocks.find((sb) => sb.id === subBlockId);
    if (match) {
      return { block, subBlock: match };
    }
  }
  return null;
}

export function getNextSubBlock(
  currentSubBlockId: string | null,
  syllabus: CurriculumSyllabus = AUTHORITATIVE_SYLLABUS
): CurriculumSubBlock | null {
  const all = getAllSubBlocks(syllabus);
  if (all.length === 0) return null;
  if (!currentSubBlockId) return all[0];
  const idx = all.findIndex((sb) => sb.id === currentSubBlockId);
  if (idx === -1) return all[0];
  return all[idx + 1] ?? null;
}

export function getCurriculumCounts(
  syllabus: CurriculumSyllabus = AUTHORITATIVE_SYLLABUS
): { blocks: number; subBlocks: number; topics: number } {
  let subBlocks = 0;
  let topics = 0;
  for (const block of syllabus.blocks) {
    subBlocks += block.subBlocks.length;
    for (const subBlock of block.subBlocks) {
      topics += subBlock.topics.length;
    }
  }
  return {
    blocks: syllabus.blocks.length,
    subBlocks,
    topics,
  };
}

export function filterCurriculumBlocks(
  blocks: CurriculumBlock[],
  query: string,
  modeFilter: LearningModeAssignment | 'ALL' = 'ALL'
): CurriculumBlock[] {
  const normalized = query.trim().toLowerCase();

  return blocks
    .map((block) => {
      const blockMatchesQuery =
        !normalized ||
        block.title.toLowerCase().includes(normalized) ||
        `block ${block.order}`.includes(normalized);

      const filteredSubBlocks = block.subBlocks
        .map((subBlock) => {
          const modeMatches =
            modeFilter === 'ALL' || subBlock.learningMode === modeFilter;
          if (!modeMatches) return null;

          if (!normalized || blockMatchesQuery) {
            return subBlock;
          }

          const subMatches =
            subBlock.id.toLowerCase().includes(normalized) ||
            subBlock.title.toLowerCase().includes(normalized) ||
            (subBlock.description?.toLowerCase().includes(normalized) ?? false);

          if (subMatches) return subBlock;

          const matchingTopics = subBlock.topics.filter(
            (topic) =>
              topic.title.toLowerCase().includes(normalized) ||
              (topic.group?.toLowerCase().includes(normalized) ?? false)
          );

          if (matchingTopics.length === 0) return null;
          return { ...subBlock, topics: matchingTopics };
        })
        .filter((sb): sb is CurriculumSubBlock => sb !== null);

      if (filteredSubBlocks.length === 0) return null;
      return { ...block, subBlocks: filteredSubBlocks };
    })
    .filter((b): b is CurriculumBlock => b !== null);
}

export function isValidSubBlockId(
  subBlockId: string,
  syllabus: CurriculumSyllabus = AUTHORITATIVE_SYLLABUS
): boolean {
  return Boolean(findSubBlockById(subBlockId, syllabus));
}
