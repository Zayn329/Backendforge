import { SubBlockLessonContent } from '../types';
import { LESSON_2_1, LESSON_2_2 } from './block2LessonsA';
import { LESSON_2_3, LESSON_2_4 } from './block2LessonsB';

export const BLOCK_2_CONTENT: Record<string, SubBlockLessonContent> = {
  '2.1': {
    subBlockId: '2.1',
    fpt: LESSON_2_1,
  },
  '2.2': {
    subBlockId: '2.2',
    fpt: LESSON_2_2,
  },
  '2.3': {
    subBlockId: '2.3',
    fpt: LESSON_2_3,
  },
  '2.4': {
    subBlockId: '2.4',
    fpt: LESSON_2_4,
  },
};
