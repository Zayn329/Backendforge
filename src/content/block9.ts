import { SubBlockLessonContent } from '../types';
import {
  LESSON_9_1,
  LESSON_9_2,
  LESSON_9_3_FPT,
  LESSON_9_3_RECIPE,
} from './block9LessonsA';
import {
  LESSON_9_4,
  LESSON_9_5_FPT,
  LESSON_9_5_RECIPE,
} from './block9LessonsB';

export const BLOCK_9_CONTENT: Record<string, SubBlockLessonContent> = {
  '9.1': {
    subBlockId: '9.1',
    fpt: LESSON_9_1,
  },
  '9.2': {
    subBlockId: '9.2',
    fpt: LESSON_9_2,
  },
  '9.3': {
    subBlockId: '9.3',
    fpt: LESSON_9_3_FPT,
    recipe: LESSON_9_3_RECIPE,
  },
  '9.4': {
    subBlockId: '9.4',
    fpt: LESSON_9_4,
  },
  '9.5': {
    subBlockId: '9.5',
    fpt: LESSON_9_5_FPT,
    recipe: LESSON_9_5_RECIPE,
  },
};
