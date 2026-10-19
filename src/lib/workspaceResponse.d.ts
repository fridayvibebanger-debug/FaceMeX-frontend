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
