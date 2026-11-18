import { SubBlockLessonContent } from '../types';
import {
  LESSON_10_1,
  LESSON_10_2,
  LESSON_10_3_FPT,
  LESSON_10_3_RECIPE,
} from './block10LessonsA';
import {
  LESSON_10_4,
  LESSON_10_5_FPT,
  LESSON_10_5_RECIPE,
} from './block10LessonsB';

export const BLOCK_10_CONTENT: Record<string, SubBlockLessonContent> = {
  '10.1': {
    subBlockId: '10.1',
    fpt: LESSON_10_1,
  },
  '10.2': {
    subBlockId: '10.2',
    fpt: LESSON_10_2,
  },
  '10.3': {
    subBlockId: '10.3',
    fpt: LESSON_10_3_FPT,
    recipe: LESSON_10_3_RECIPE,
  },
  '10.4': {
    subBlockId: '10.4',
    fpt: LESSON_10_4,
  },
  '10.5': {
    subBlockId: '10.5',
    fpt: LESSON_10_5_FPT,
    recipe: LESSON_10_5_RECIPE,
  },
};
