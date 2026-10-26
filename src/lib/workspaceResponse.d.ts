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

export function normalizeWorkspaceResponse(raw: unknown, fallback?: string): string;

export type WorkspaceMediaPlan = {
  category: string;
  imageQuery: string;
  videoQuery: string;
  showImages: boolean;
  showVideos: boolean;
};

export function createWorkspaceMediaPlan(prompt: string, context?: string, answer?: string): WorkspaceMediaPlan;

export type WorkspaceFollowUp = {
  question: string;
  options: string[];
};

export function parseWorkspaceFollowUp(input: string): {
  content: string;
  followUp: WorkspaceFollowUp | null;
};
