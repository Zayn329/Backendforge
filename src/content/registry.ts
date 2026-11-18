import { SubBlockLessonContent } from '../types';
import { BLOCK_0_CONTENT } from './block0';
import { BLOCK_1_CONTENT } from './block1';
import { BLOCK_2_CONTENT } from './block2';
import { BLOCK_3_CONTENT } from './block3';
import { BLOCK_4_CONTENT } from './block4';
import { BLOCK_5_CONTENT } from './block5';
import { BLOCK_6_CONTENT } from './block6';
import { BLOCK_7_CONTENT } from './block7';
import { BLOCK_8_CONTENT } from './block8';
import { BLOCK_9_CONTENT } from './block9';
import { BLOCK_10_CONTENT } from './block10';
import { BLOCK_11_CONTENT } from './block11';
import { BLOCK_12_CONTENT } from './block12';
import { BLOCK_13_CONTENT } from './block13';
import { BLOCK_14_CONTENT } from './block14';
import { BLOCK_15_CONTENT } from './block15';
import { BLOCK_16_CONTENT } from './block16';

/**
 * Modular lesson content registry indexed by stable sub-block ID.
 * All 17 curriculum blocks (Blocks 0-16, 86 sub-blocks) are populated.
 */
const LESSON_CONTENT_REGISTRY: Record<string, SubBlockLessonContent> = {
  ...BLOCK_0_CONTENT,
  ...BLOCK_1_CONTENT,
  ...BLOCK_2_CONTENT,
  ...BLOCK_3_CONTENT,
  ...BLOCK_4_CONTENT,
  ...BLOCK_5_CONTENT,
  ...BLOCK_6_CONTENT,
  ...BLOCK_7_CONTENT,
  ...BLOCK_8_CONTENT,
  ...BLOCK_9_CONTENT,
  ...BLOCK_10_CONTENT,
  ...BLOCK_11_CONTENT,
  ...BLOCK_12_CONTENT,
  ...BLOCK_13_CONTENT,
  ...BLOCK_14_CONTENT,
  ...BLOCK_15_CONTENT,
  ...BLOCK_16_CONTENT,
};

export function getSubBlockLessonContent(
  subBlockId: string | null
): SubBlockLessonContent | null {
  if (!subBlockId) return null;
  return LESSON_CONTENT_REGISTRY[subBlockId] ?? null;
}

export function hasLessonContent(subBlockId: string): boolean {
  return Boolean(LESSON_CONTENT_REGISTRY[subBlockId]);
}

export function getPopulatedSubBlockIds(): string[] {
  return Object.keys(LESSON_CONTENT_REGISTRY);
}
