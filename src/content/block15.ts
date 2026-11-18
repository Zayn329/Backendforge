import { SubBlockLessonContent } from '../types';
import {
  LESSON_15_1_FPT,
  LESSON_15_1_RECIPE,
  LESSON_15_2,
  LESSON_15_3_RECIPE,
  LESSON_15_4_RECIPE,
} from './block15Lessons';

export const BLOCK_15_CONTENT: Record<string, SubBlockLessonContent> = {
  '15.1': {
    subBlockId: '15.1',
    fpt: LESSON_15_1_FPT,
    recipe: LESSON_15_1_RECIPE,
  },
  '15.2': {
    subBlockId: '15.2',
    fpt: LESSON_15_2,
  },
  '15.3': {
    subBlockId: '15.3',
    recipe: LESSON_15_3_RECIPE,
  },
  '15.4': {
    subBlockId: '15.4',
    recipe: LESSON_15_4_RECIPE,
  },
};
