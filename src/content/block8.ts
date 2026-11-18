import { SubBlockLessonContent } from '../types';
import {
  LESSON_8_1_FPT,
  LESSON_8_1_RECIPE,
  LESSON_8_2_RECIPE,
  LESSON_8_3_RECIPE,
} from './block8LessonsA';
import {
  LESSON_8_4_FPT,
  LESSON_8_4_RECIPE,
  LESSON_8_5_FPT,
  LESSON_8_5_RECIPE,
  LESSON_8_6_FPT,
  LESSON_8_6_RECIPE,
} from './block8LessonsB';

export const BLOCK_8_CONTENT: Record<string, SubBlockLessonContent> = {
  '8.1': {
    subBlockId: '8.1',
    fpt: LESSON_8_1_FPT,
    recipe: LESSON_8_1_RECIPE,
  },
  '8.2': {
    subBlockId: '8.2',
    recipe: LESSON_8_2_RECIPE,
  },
  '8.3': {
    subBlockId: '8.3',
    recipe: LESSON_8_3_RECIPE,
  },
  '8.4': {
    subBlockId: '8.4',
    fpt: LESSON_8_4_FPT,
    recipe: LESSON_8_4_RECIPE,
  },
  '8.5': {
    subBlockId: '8.5',
    fpt: LESSON_8_5_FPT,
    recipe: LESSON_8_5_RECIPE,
  },
  '8.6': {
    subBlockId: '8.6',
    fpt: LESSON_8_6_FPT,
    recipe: LESSON_8_6_RECIPE,
  },
};
