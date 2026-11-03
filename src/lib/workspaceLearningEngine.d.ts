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
  | 'Languages'
  | 'Technology'
  | 'Health Sciences'
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
  visual: 'map' | 'timeline' | 'graph' | 'chart' | 'contour' | 'table' | 'diagram' | 'flowchart' | 'image-analysis' | 'code-diagram' | 'force-diagram' | 'none';
};

export type NewtonSecondLawDiagram = {
  mass: number;
  acceleration: number;
  force: number;
  direction: 'left' | 'right';
  directionSpecified: boolean;
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
export function createNewtonSecondLawDiagram(question: string): NewtonSecondLawDiagram | null;
export function createHydrogenWaterReactionDiagram(question: string): boolean;
export function createQuadraticStationaryPointDiagram(question: string): {
  kind: 'diagram';
  diagramType: 'contour';
  title: string;
  xLabel: string;
  yLabel: string;
  centerX: number;
  centerY: number;
  stationaryValue: number;
  curvature: number;
  radii: number[];
} | null;
export function selectLearningVisual(profile: Partial<LearningContext>, question?: string): LearningContext['visual'];
export function createLearningContext(
  question: string,
  options?: { context?: string; hasImage?: boolean },
): LearningContext;
export function buildLearningInstruction(profile: LearningContext): string;
export function createLearningClarification(question: string): string | null;
export function createDeterministicCalculusAnswer(question: string): string | null;
export function validateLearningResponse(answer: string): {
  valid: boolean;
  answer: string;
  issues: string[];
};
