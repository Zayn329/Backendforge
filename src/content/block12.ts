import { SubBlockLessonContent } from '../types';
import {
  LESSON_12_1,
  LESSON_12_2_FPT,
  LESSON_12_2_RECIPE,
  LESSON_12_3_FPT,
  LESSON_12_3_RECIPE,
} from './block12LessonsA';
import {
  LESSON_12_4_FPT,
  LESSON_12_4_RECIPE,
  LESSON_12_5,
  LESSON_12_6,
} from './block12LessonsB';

export const BLOCK_12_CONTENT: Record<string, SubBlockLessonContent> = {
  '12.1': {
    subBlockId: '12.1',
    fpt: LESSON_12_1,
  },
  '12.2': {
    subBlockId: '12.2',
    fpt: LESSON_12_2_FPT,
    recipe: LESSON_12_2_RECIPE,
  },
  '12.3': {
    subBlockId: '12.3',
    fpt: LESSON_12_3_FPT,
    recipe: LESSON_12_3_RECIPE,
  },
  '12.4': {
    subBlockId: '12.4',
    fpt: LESSON_12_4_FPT,
    recipe: LESSON_12_4_RECIPE,
  },
  '12.5': {
    subBlockId: '12.5',
    fpt: LESSON_12_5,
  },
  '12.6': {
    subBlockId: '12.6',
    fpt: LESSON_12_6,
  },
};
