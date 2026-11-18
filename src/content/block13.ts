import { SubBlockLessonContent } from '../types';
import { LESSON_13_1, LESSON_13_2, LESSON_13_3 } from './block13LessonsA';
import { LESSON_13_4, LESSON_13_5, LESSON_13_6 } from './block13LessonsB';

export const BLOCK_13_CONTENT: Record<string, SubBlockLessonContent> = {
  '13.1': { subBlockId: '13.1', fpt: LESSON_13_1 },
  '13.2': { subBlockId: '13.2', fpt: LESSON_13_2 },
  '13.3': { subBlockId: '13.3', fpt: LESSON_13_3 },
  '13.4': { subBlockId: '13.4', fpt: LESSON_13_4 },
  '13.5': { subBlockId: '13.5', fpt: LESSON_13_5 },
  '13.6': { subBlockId: '13.6', fpt: LESSON_13_6 },
};
