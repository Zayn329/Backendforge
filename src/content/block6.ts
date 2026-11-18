import { SubBlockLessonContent } from '../types';
import {
  LESSON_6_1,
  LESSON_6_2_FPT,
  LESSON_6_2_RECIPE,
} from './block6LessonsA';
import {
  LESSON_6_3,
  LESSON_6_4,
  LESSON_6_5_FPT,
  LESSON_6_5_RECIPE,
} from './block6LessonsB';

export const BLOCK_6_CONTENT: Record<string, SubBlockLessonContent> = {
  '6.1': {
    subBlockId: '6.1',
    fpt: LESSON_6_1,
  },
  '6.2': {
    subBlockId: '6.2',
    fpt: LESSON_6_2_FPT,
    recipe: LESSON_6_2_RECIPE,
  },
  '6.3': {
    subBlockId: '6.3',
    fpt: LESSON_6_3,
  },
  '6.4': {
    subBlockId: '6.4',
    fpt: LESSON_6_4,
  },
  '6.5': {
    subBlockId: '6.5',
    fpt: LESSON_6_5_FPT,
    recipe: LESSON_6_5_RECIPE,
  },
};
