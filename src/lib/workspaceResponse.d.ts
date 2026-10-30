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
      kind: 'diagram';
      diagramType: 'flow';
      title: string;
      steps: string[];
    };

export function parseWorkspaceVisualization(
  kind: string,
  source: string,
): WorkspaceVisualization | null;

export function extractYouTubeVideoId(input: string): string | null;

export function extractYouTubeUrlFromText(input: string): string | null;

export function isYouTubeSummaryRequest(input: string): boolean;

export type WorkspaceResponseImage = {
  id: string;
  url: string;
  alt: string;
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
  imageQuery: string;
  videoQuery: string;
  showImages: boolean;
  showVideos: boolean;
};

export function createWorkspaceMediaPlan(prompt: string, context?: string): WorkspaceMediaPlan;

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
