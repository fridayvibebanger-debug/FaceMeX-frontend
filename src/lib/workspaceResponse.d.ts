export type WorkspaceVisualization =
  | {
      kind: 'chart';
      chartType: 'bar' | 'line';
      title: string;
      xLabel: string;
      yLabel: string;
      data: Array<{ label: string; value: number }>;
    }
  | {
      kind: 'chart';
      chartType: 'scatter';
      title: string;
      xLabel: string;
      yLabel: string;
      data: Array<{ x: number; y: number }>;
    }
  | {
      kind: 'chart';
      chartType: 'multi-line';
      title: string;
      xLabel: string;
      yLabel: string;
      series: Array<{ label: string; data: Array<{ x: number; y: number }> }>;
      illustrative: boolean;
    }
  | {
      kind: 'diagram';
      diagramType: 'flow';
      title: string;
      steps: string[];
    }
  | {
      kind: 'diagram';
      diagramType: 'triangle';
      title: string;
      legA: number;
      legB: number;
      hypotenuse: number;
      unit: string;
    }
  | {
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
    }
  | {
      kind: 'diagram';
      diagramType: 'timeline';
      title: string;
      events: Array<{ date: string; label: string; description: string }>;
    };

export function parseWorkspaceVisualization(
  kind: string,
  source: string,
): WorkspaceVisualization | null;

export type WorkspacePractice = {
  question: string;
  solution: string;
};

export function parseWorkspacePractice(source: string): WorkspacePractice | null;

export function extractYouTubeVideoId(input: string): string | null;

export function extractYouTubeUrlFromText(input: string): string | null;

export function isYouTubeSummaryRequest(input: string): boolean;

export function isMathematicsQuestion(input: string): boolean;

export type WorkspaceResponseImage = {
  id: string;
  url: string;
  smallUrl?: string;
  alt: string;
  description?: string;
  tags?: string[];
  width?: number;
  height?: number;
  attribution: string;
  attributionUrl: string;
  photoUrl?: string;
};

export function normalizeWorkspaceImages(
  raw: unknown,
  limit?: number,
): WorkspaceResponseImage[];

export function normalizeClarificationText(value: unknown): string;

export function removeRepeatedClarification(value: string, question: string): string;

export function createSolveForXGuidanceResponse(prompt?: string): string;

export function isExplicitTechnicalRequest(prompt: string): boolean;

export function normalizeWorkspaceAnswerForDisplay(answer: string, prompt?: string): string;

export function normalizeWorkspaceResponse(raw: unknown, fallback?: string): string;

export type WorkspaceMediaPlan = {
  category: string;
  subject: string;
  topic: string;
  mainObject: string;
  photoType: string;
  purpose: string;
  educationalPhoto: boolean;
  allowPeople: boolean;
  allowPortrait: boolean;
  keywordGroups: string[][];
  imageQuery: string;
  imageKeywords: string[];
  videoQuery: string;
  showImages: boolean;
  showVideos: boolean;
};

export function createWorkspaceMediaPlan(
  prompt: string,
  context?: string,
  learningProfile?: { subject?: string; topic?: string; visual?: string },
): WorkspaceMediaPlan;

export function selectRelevantWorkspaceImages(
  images: WorkspaceResponseImage[],
  plan: Partial<WorkspaceMediaPlan>,
  limit?: number,
): WorkspaceResponseImage[];

export function selectRelevantYouTubeLessonVideos<T extends {
  videoId?: string;
  id?: string;
  title?: string;
  description?: string | null;
  channelTitle?: string | null;
}>(videos: T[], query: string, limit?: number): T[];

export type WorkspaceFollowUp = {
  question: string;
  options: string[];
};

export function parseWorkspaceFollowUp(input: string): {
  content: string;
  followUp: WorkspaceFollowUp | null;
};
