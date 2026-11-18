import { SubBlockLessonContent } from '../types';
import {
  LESSON_14_1_FPT,
  LESSON_14_1_RECIPE,
  LESSON_14_2,
  LESSON_14_3_FPT,
  LESSON_14_3_RECIPE,
} from './block14LessonsA';
import {
  LESSON_14_4_FPT,
  LESSON_14_4_RECIPE,
  LESSON_14_5_FPT,
  LESSON_14_5_RECIPE,
  LESSON_14_6_FPT,
  LESSON_14_6_RECIPE,
} from './block14LessonsB';

export const BLOCK_14_CONTENT: Record<string, SubBlockLessonContent> = {
  '14.1': {
    subBlockId: '14.1',
    fpt: LESSON_14_1_FPT,
    recipe: LESSON_14_1_RECIPE,
  },
  '14.2': {
    subBlockId: '14.2',
    fpt: LESSON_14_2,
  },
  '14.3': {
    subBlockId: '14.3',
    fpt: LESSON_14_3_FPT,
    recipe: LESSON_14_3_RECIPE,
  },
  '14.4': {
    subBlockId: '14.4',
    fpt: LESSON_14_4_FPT,
    recipe: LESSON_14_4_RECIPE,
  },
  '14.5': {
    subBlockId: '14.5',
    fpt: LESSON_14_5_FPT,
    recipe: LESSON_14_5_RECIPE,
  },
  '14.6': {
    subBlockId: '14.6',
    fpt: LESSON_14_6_FPT,
    recipe: LESSON_14_6_RECIPE,
  },
};
