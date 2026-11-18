import { SubBlockLessonContent } from '../types';
import {
  LESSON_11_1,
  LESSON_11_2_FPT,
  LESSON_11_2_RECIPE,
} from './block11LessonsA';
import {
  LESSON_11_3,
  LESSON_11_4_FPT,
  LESSON_11_4_RECIPE,
} from './block11LessonsB';

export const BLOCK_11_CONTENT: Record<string, SubBlockLessonContent> = {
  '11.1': {
    subBlockId: '11.1',
    fpt: LESSON_11_1,
  },
  '11.2': {
    subBlockId: '11.2',
    fpt: LESSON_11_2_FPT,
    recipe: LESSON_11_2_RECIPE,
  },
  '11.3': {
    subBlockId: '11.3',
    fpt: LESSON_11_3,
  },
  '11.4': {
    subBlockId: '11.4',
    fpt: LESSON_11_4_FPT,
    recipe: LESSON_11_4_RECIPE,
  },
};
