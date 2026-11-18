import { SubBlockLessonContent } from '../types';
import {
  LESSON_16_1_FPT,
  LESSON_16_1_RECIPE,
  LESSON_16_2,
  LESSON_16_3_RECIPE,
} from './block16LessonsA';
import {
  LESSON_16_4_FPT,
  LESSON_16_4_RECIPE,
  LESSON_16_5,
} from './block16LessonsB';

export const BLOCK_16_CONTENT: Record<string, SubBlockLessonContent> = {
  '16.1': {
    subBlockId: '16.1',
    fpt: LESSON_16_1_FPT,
    recipe: LESSON_16_1_RECIPE,
  },
  '16.2': {
    subBlockId: '16.2',
    fpt: LESSON_16_2,
  },
  '16.3': {
    subBlockId: '16.3',
    recipe: LESSON_16_3_RECIPE,
  },
  '16.4': {
    subBlockId: '16.4',
    fpt: LESSON_16_4_FPT,
    recipe: LESSON_16_4_RECIPE,
  },
  '16.5': {
    subBlockId: '16.5',
    fpt: LESSON_16_5,
  },
};
