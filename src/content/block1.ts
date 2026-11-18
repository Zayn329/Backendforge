import { SubBlockLessonContent } from '../types';
import { LESSON_1_1, LESSON_1_2, LESSON_1_3 } from './block1LessonsA';
import { LESSON_1_4, LESSON_1_5 } from './block1LessonsB';

export const BLOCK_1_CONTENT: Record<string, SubBlockLessonContent> = {
  '1.1': {
    subBlockId: '1.1',
    fpt: LESSON_1_1,
  },
  '1.2': {
    subBlockId: '1.2',
    fpt: LESSON_1_2,
  },
  '1.3': {
    subBlockId: '1.3',
    fpt: LESSON_1_3,
  },
  '1.4': {
    subBlockId: '1.4',
    fpt: LESSON_1_4,
  },
  '1.5': {
    subBlockId: '1.5',
    fpt: LESSON_1_5,
  },
};
