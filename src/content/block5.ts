import { SubBlockLessonContent } from '../types';
import { LESSON_5_1, LESSON_5_2, LESSON_5_3 } from './block5LessonsA';
import { LESSON_5_4, LESSON_5_5 } from './block5LessonsB';
import {
  LESSON_5_6_FPT,
  LESSON_5_6_RECIPE,
  LESSON_5_7_FPT,
  LESSON_5_7_RECIPE,
} from './block5LessonsC';

export const BLOCK_5_CONTENT: Record<string, SubBlockLessonContent> = {
  '5.1': {
    subBlockId: '5.1',
    fpt: LESSON_5_1,
  },
  '5.2': {
    subBlockId: '5.2',
    fpt: LESSON_5_2,
  },
  '5.3': {
    subBlockId: '5.3',
    fpt: LESSON_5_3,
  },
  '5.4': {
    subBlockId: '5.4',
    fpt: LESSON_5_4,
  },
  '5.5': {
    subBlockId: '5.5',
    fpt: LESSON_5_5,
  },
  '5.6': {
    subBlockId: '5.6',
    fpt: LESSON_5_6_FPT,
    recipe: LESSON_5_6_RECIPE,
  },
  '5.7': {
    subBlockId: '5.7',
    fpt: LESSON_5_7_FPT,
    recipe: LESSON_5_7_RECIPE,
  },
};
