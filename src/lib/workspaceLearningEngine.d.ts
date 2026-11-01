export type LearningSubject =
  | 'Mathematics'
  | 'Biology'
  | 'Life Sciences'
  | 'Physics'
  | 'Chemistry'
  | 'Geography'
  | 'Natural Sciences'
  | 'History'
  | 'Accounting'
  | 'Economics'
  | 'Business Studies'
  | 'Computer Science'
  | 'Information Technology'
  | 'Engineering'
  | 'Agricultural Sciences'
  | 'Environmental Studies'
  | 'Statistics'
  | 'English and Literature'
  | 'Other';

export type LearningContext = {
  subject: LearningSubject;
  area: string;
  topic: string;
  confidence: 'explicit' | 'inferred' | 'unknown';
  level: 'beginner' | 'intermediate' | 'advanced' | 'university';
  struggling: boolean;
  questionType: 'calculation' | 'comparison' | 'explanation' | 'general';
  hasImage: boolean;
  teachingMethods: string[];
  visual: 'map' | 'timeline' | 'graph' | 'chart' | 'table' | 'diagram' | 'flowchart' | 'image-analysis' | 'code-diagram' | 'none';
};

export function detectSubjectAndTopic(question: string, context?: string): {
  subject: LearningSubject;
  area: string;
  topic: string;
  confidence: 'explicit' | 'inferred' | 'unknown';
};

export function understandLearningQuestion(
  question: string,
  options?: { context?: string; hasImage?: boolean },
): Pick<LearningContext, 'level' | 'struggling' | 'questionType' | 'hasImage'>;

export function selectTeachingMethod(subject: LearningSubject): string[];
export function selectLearningVisual(profile: Partial<LearningContext>, question?: string): LearningContext['visual'];
export function createLearningContext(
  question: string,
  options?: { context?: string; hasImage?: boolean },
): LearningContext;
export function buildLearningInstruction(profile: LearningContext): string;
export function validateLearningResponse(answer: string): {
  valid: boolean;
  answer: string;
  issues: string[];
};
