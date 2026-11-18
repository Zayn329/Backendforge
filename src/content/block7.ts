import { SubBlockLessonContent } from '../types';
import {
  LESSON_7_1,
  LESSON_7_2_FPT,
  LESSON_7_2_RECIPE,
} from './block7LessonsA';
import {
  LESSON_7_3,
  LESSON_7_4,
  LESSON_7_5,
} from './block7LessonsB';

export const BLOCK_7_CONTENT: Record<string, SubBlockLessonContent> = {
  '7.1': {
    subBlockId: '7.1',
    fpt: LESSON_7_1,
  },
  '7.2': {
    subBlockId: '7.2',
    fpt: LESSON_7_2_FPT,
    recipe: LESSON_7_2_RECIPE,
  },
  '7.3': {
    subBlockId: '7.3',
    fpt: LESSON_7_3,
  },
  '7.4': {
    subBlockId: '7.4',
    fpt: LESSON_7_4,
  },
  '7.5': {
    subBlockId: '7.5',
    fpt: LESSON_7_5,
  },
};
