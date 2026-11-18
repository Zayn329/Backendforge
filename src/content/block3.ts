import { SubBlockLessonContent } from '../types';
import { LESSON_3_1, LESSON_3_2 } from './block3LessonsA';
import { LESSON_3_3, LESSON_3_4_FPT, LESSON_3_4_RECIPE } from './block3LessonsB';

export const BLOCK_3_CONTENT: Record<string, SubBlockLessonContent> = {
  '3.1': {
    subBlockId: '3.1',
    fpt: LESSON_3_1,
  },
  '3.2': {
    subBlockId: '3.2',
    fpt: LESSON_3_2,
  },
  '3.3': {
    subBlockId: '3.3',
    fpt: LESSON_3_3,
  },
  '3.4': {
    subBlockId: '3.4',
    fpt: LESSON_3_4_FPT,
    recipe: LESSON_3_4_RECIPE,
  },
};
