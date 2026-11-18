import { SubBlockLessonContent } from '../types';
import { LESSON_4_1, LESSON_4_2 } from './block4LessonsA';
import { LESSON_4_3, LESSON_4_4, LESSON_4_5 } from './block4LessonsB';

export const BLOCK_4_CONTENT: Record<string, SubBlockLessonContent> = {
  '4.1': {
    subBlockId: '4.1',
    fpt: LESSON_4_1,
  },
  '4.2': {
    subBlockId: '4.2',
    fpt: LESSON_4_2,
  },
  '4.3': {
    subBlockId: '4.3',
    recipe: LESSON_4_3,
  },
  '4.4': {
    subBlockId: '4.4',
    fpt: LESSON_4_4,
  },
  '4.5': {
    subBlockId: '4.5',
    recipe: LESSON_4_5,
  },
};
