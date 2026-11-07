import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react';
import {
  ArrowRight,
  Circle,
  Check,
  Copy,
  Download,
  Eraser,
  Highlighter,
  ImagePlus,
  Mic,
  MicOff,
  Minus,
  MoreHorizontal,
  MousePointer2,
  Pencil,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Redo2,
  Save,
  Settings2,
  Sparkles,
  Square,
  Trash2,
  Type,
  Triangle,
  Undo2,
  X,
  ZoomIn,
} from 'lucide-react';
import type { WorkspaceLearningModelId } from '@/components/WorkspaceLearningModels';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  createIncompleteEquationClarification,
  createQuadraticFunctionExplanation,
  isIncompleteEquation,
  parseQuadraticEquation,
} from '@/lib/workspaceGraph';
import { formatWorkspaceMathForBoard } from '@/lib/workspaceMarkdown';
import type { WorkspaceSmartboardLesson, WorkspaceSmartboardLessonDraft } from '@/lib/projects';

type Tool = 'pen' | 'highlighter' | 'eraser' | 'line' | 'arrow' | 'rectangle' | 'ellipse' | 'triangle';
type BoardStroke = {
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
  tool: Tool;
};
type BoardText = {
  text: string;
  x: number;
  y: number;
  color: string;
  scale?: number;
  kind?: 'explanation';
  width?: number;
  height?: number;
};
type BoardVisualKind = 'triangle' | 'circle' | 'cube' | 'cube2d' | 'sphere' | 'prism' | 'water' | 'newton' | 'parabola' | 'diagram' | 'photo';
type BoardDiagram = {
  title: string;
  nodes: Array<{ label: string; x: number; y: number }>;
  edges: Array<{ from: number; to: number; label?: string }>;
};
type BoardVisual = {
  id: string;
  kind: BoardVisualKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  mass?: number;
  acceleration?: number;
  equation?: string;
  imageUrl?: string;
  imageAlt?: string;
  attribution?: string;
  attributionUrl?: string;
  diagram?: BoardDiagram;
};
type BoardReferenceImage = {
  url: string;
  alt: string;
  attribution: string;
  attributionUrl: string;
  photoUrl: string;
};
type Selection = { type: 'stroke' | 'text' | 'visual'; index: number } | null;
type ShapeTool = 'line' | 'triangle' | 'ellipse' | 'rectangle';
type BoardSize = 'fit' | 'wide' | 'portrait';
type Scene = {
  strokes: BoardStroke[];
  texts: BoardText[];
  visuals: BoardVisual[];
  graphOnBoard: boolean;
  equation: string;
  boardSize: BoardSize;
  recognizedText: string;
  subject: string;
  visualModel: WorkspaceLearningModelId | null;
};
type Snapshot = { scene: Scene; image: string | null };
type ViewTransform = { zoom: number; x: number; y: number };
type Props = {
  onRecognizeDrawing: (imageDataUrl: string) => Promise<string | undefined>;
  onSolve: (expression: string, imageDataUrl?: string) => Promise<string | undefined>;
  onAnalyzeDrawing: (imageDataUrl: string, instruction: string) => Promise<string | undefined>;
  onSearchReferenceImage: (query: string) => Promise<BoardReferenceImage | undefined>;
  onSaveLesson: (lesson: WorkspaceSmartboardLessonDraft) => Promise<WorkspaceSmartboardLesson>;
  onListLessons: () => Promise<WorkspaceSmartboardLesson[]>;
  onSendToWorkspace?: (content: string) => void;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const AUTO_ANALYSIS_IDLE_DELAY_MS = 5000;
const AUTO_ANALYSIS_COOLDOWN_MS = 30000;

const isTool = (value: unknown): value is Tool =>
  value === 'pen' || value === 'highlighter' || value === 'eraser' ||
  value === 'line' || value === 'arrow' || value === 'rectangle' ||
  value === 'ellipse' || value === 'triangle';

type StoredBoardStroke = Omit<BoardStroke, 'tool'> & { tool?: Tool | 'select' };

function isStroke(value: unknown): value is StoredBoardStroke {
  if (!value || typeof value !== 'object') return false;
  const stroke = value as Partial<StoredBoardStroke>;
  return (isTool(stroke.tool) || stroke.tool === 'select' || stroke.tool === undefined) && typeof stroke.color === 'string' &&
    /^#[\da-f]{6}$/i.test(stroke.color) && typeof stroke.width === 'number' &&
    Number.isFinite(stroke.width) && stroke.width > 0 && stroke.width <= 100 &&
    Array.isArray(stroke.points) && stroke.points.length > 0 &&
    stroke.points.every((point) => point && Number.isFinite(point.x) && Number.isFinite(point.y) &&
      point.x >= -1000 && point.x <= 1000 && point.y >= -1000 && point.y <= 1000);
}

function isBoardText(value: unknown): value is BoardText {
  if (!value || typeof value !== 'object') return false;
  const text = value as Partial<BoardText>;
  return typeof text.text === 'string' &&
    text.text.length <= (text.kind === 'explanation' ? 1600 : 120) &&
    (text.kind === undefined || text.kind === 'explanation') &&
    (text.width === undefined || (Number.isFinite(text.width) && text.width >= 0.1 && text.width <= 0.9)) &&
    (text.height === undefined || (Number.isFinite(text.height) && text.height >= 0.1 && text.height <= 0.9)) &&
    typeof text.x === 'number' && Number.isFinite(text.x) && text.x >= -1000 && text.x <= 1000 &&
    typeof text.y === 'number' && Number.isFinite(text.y) && text.y >= -1000 && text.y <= 1000 &&
    (text.scale === undefined || (typeof text.scale === 'number' && Number.isFinite(text.scale) && text.scale >= 0.5 && text.scale <= 3)) &&
    typeof text.color === 'string' && /^#[\da-f]{6}$/i.test(text.color);
}

function isBoardVisual(value: unknown): value is BoardVisual {
  if (!value || typeof value !== 'object') return false;
  const visual = value as Partial<BoardVisual>;
  return typeof visual.id === 'string' &&
    (visual.kind === 'triangle' || visual.kind === 'circle' || visual.kind === 'cube' ||
      visual.kind === 'cube2d' || visual.kind === 'sphere' || visual.kind === 'prism' ||
      visual.kind === 'water' || visual.kind === 'newton' || visual.kind === 'parabola' ||
      visual.kind === 'diagram' || visual.kind === 'photo') &&
    [visual.x, visual.y, visual.width, visual.height, visual.rotation].every(
      (number) => typeof number === 'number' && Number.isFinite(number),
    ) &&
    visual.x! >= 0 && visual.x! <= 1 && visual.y! >= 0 && visual.y! <= 1 &&
    visual.width! > 0 && visual.width! <= 1 && visual.height! > 0 && visual.height! <= 1 &&
    visual.x! + visual.width! <= 1 && visual.y! + visual.height! <= 1 &&
    (visual.mass === undefined || (Number.isFinite(visual.mass) && visual.mass >= 0 && visual.mass <= 100000)) &&
    (visual.acceleration === undefined || (Number.isFinite(visual.acceleration) && visual.acceleration >= 0 && visual.acceleration <= 1000)) &&
    (visual.equation === undefined || (typeof visual.equation === 'string' && visual.equation.length <= 120)) &&
    (visual.kind !== 'photo' || (
      typeof visual.imageUrl === 'string' &&
      /^https:\/\/images\.unsplash\.com\//i.test(visual.imageUrl) &&
      typeof visual.imageAlt === 'string' &&
      typeof visual.attribution === 'string' &&
      typeof visual.attributionUrl === 'string' &&
      /^https:\/\/(www\.)?unsplash\.com\//i.test(visual.attributionUrl)
    )) &&
    (visual.kind !== 'diagram' || isBoardDiagram(visual.diagram));
}

function isBoardDiagram(value: unknown): value is BoardDiagram {
  if (!value || typeof value !== 'object') return false;
  const diagram = value as Partial<BoardDiagram>;
  return typeof diagram.title === 'string' && diagram.title.length > 0 && diagram.title.length <= 80 &&
    Array.isArray(diagram.nodes) && diagram.nodes.length >= 2 && diagram.nodes.length <= 8 &&
    diagram.nodes.every((node) => node && typeof node.label === 'string' && node.label.length > 0 &&
      node.label.length <= 48 && Number.isFinite(node.x) && node.x >= 0.08 && node.x <= 0.92 &&
      Number.isFinite(node.y) && node.y >= 0.12 && node.y <= 0.88) &&
    Array.isArray(diagram.edges) && diagram.edges.length <= 12 &&
    diagram.edges.every((edge) => edge && Number.isInteger(edge.from) && Number.isInteger(edge.to) &&
      edge.from >= 0 && edge.from < diagram.nodes!.length && edge.to >= 0 && edge.to < diagram.nodes!.length &&
      edge.from !== edge.to && (edge.label === undefined || (typeof edge.label === 'string' && edge.label.length <= 32)));
}

function getBounds(points: BoardStroke['points']) {
  return points.reduce((bounds, point) => ({
    minX: Math.min(bounds.minX, point.x),
    maxX: Math.max(bounds.maxX, point.x),
    minY: Math.min(bounds.minY, point.y),
    maxY: Math.max(bounds.maxY, point.y),
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
}

function isNearStroke(
  point: { x: number; y: number },
  stroke: BoardStroke,
  canvas: HTMLCanvasElement,
  tolerance: number,
): boolean {
  const toPixels = ({ x, y }: { x: number; y: number }) => ({
    x: x * canvas.clientWidth,
    y: y * canvas.clientHeight,
  });
  const pixelPoint = toPixels(point);
  const points = stroke.points.map(toPixels);
  if (stroke.tool === 'rectangle' || stroke.tool === 'triangle') {
    const [{ x: firstX, y: firstY }, { x: lastX, y: lastY }] = [points[0], points[points.length - 1]];
    const minX = Math.min(firstX, lastX);
    const maxX = Math.max(firstX, lastX);
    const minY = Math.min(firstY, lastY);
    const maxY = Math.max(firstY, lastY);
    if (pixelPoint.x < minX - tolerance || pixelPoint.x > maxX + tolerance ||
      pixelPoint.y < minY - tolerance || pixelPoint.y > maxY + tolerance) return false;
    const edges = stroke.tool === 'rectangle'
      ? [
        [{ x: minX, y: minY }, { x: maxX, y: minY }],
        [{ x: maxX, y: minY }, { x: maxX, y: maxY }],
        [{ x: maxX, y: maxY }, { x: minX, y: maxY }],
        [{ x: minX, y: maxY }, { x: minX, y: minY }],
      ]
      : [
        [{ x: (minX + maxX) / 2, y: minY }, { x: maxX, y: maxY }],
        [{ x: maxX, y: maxY }, { x: minX, y: maxY }],
        [{ x: minX, y: maxY }, { x: (minX + maxX) / 2, y: minY }],
      ];
    return edges.some(([start, end]) => distanceToLine(pixelPoint, start, end) <= tolerance + stroke.width / 2);
  }
  if (stroke.tool === 'ellipse') {
    const bounds = getBounds(stroke.points);
    const radiusX = (bounds.maxX - bounds.minX) * canvas.clientWidth / 2;
    const radiusY = (bounds.maxY - bounds.minY) * canvas.clientHeight / 2;
    if (!radiusX || !radiusY) return false;
    const centerX = (bounds.minX + bounds.maxX) * canvas.clientWidth / 2;
    const centerY = (bounds.minY + bounds.maxY) * canvas.clientHeight / 2;
    const radialDistance = Math.hypot((pixelPoint.x - centerX) / radiusX, (pixelPoint.y - centerY) / radiusY);
    return Math.abs(radialDistance - 1) * Math.min(radiusX, radiusY) <= tolerance + stroke.width / 2;
  }
  for (let index = 1; index < points.length; index += 1) {
    if (distanceToLine(pixelPoint, points[index - 1], points[index]) <= tolerance + stroke.width / 2) return true;
  }
  return points.length === 1 && distance(pixelPoint, points[0]) <= tolerance + stroke.width / 2;
}

function emptyScene(): Scene {
  return {
    strokes: [],
    texts: [],
    visuals: [],
    graphOnBoard: false,
    equation: 'y = x² - 3',
    boardSize: 'fit',
    recognizedText: '',
    subject: '',
    visualModel: null,
  };
}

function formatAIResponse(response: string): string {
  let text = response.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .replace(/```[^\n]*\n[\s\S]*?```/g, '');
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const fields = parsed as Record<string, unknown>;
      const entries = Object.entries(fields).flatMap(([key, value]) => {
        const label = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^\w/, (letter) => letter.toUpperCase());
        if (typeof value === 'string' && value.trim()) return [`${label}: ${value.trim()}`];
        if (Array.isArray(value)) {
          const items = value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()));
          return items.length ? [`${label}:`, ...items.map((item) => `• ${item.trim()}`)] : [];
        }
        return [];
      });
      if (entries.length) text = entries.join('\n');
    }
  } catch {
    text = text.trim();
  }
  return formatWorkspaceMathForBoard(text
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .trim());
}

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  text.split('\n').forEach((paragraph) => {
    if (!paragraph.trim()) {
      lines.push('');
      return;
    }
    let line = '';
    paragraph.split(/\s+/).forEach((word) => {
      const chunks = [];
      let chunk = '';
      [...word].forEach((character) => {
        if (chunk && context.measureText(chunk + character).width > maxWidth) {
          chunks.push(chunk);
          chunk = character;
        } else {
          chunk += character;
        }
      });
      if (chunk) chunks.push(chunk);
      chunks.forEach((wordChunk, index) => {
        const next = index > 0
          ? `${line}${wordChunk}`
          : line ? `${line} ${wordChunk}` : wordChunk;
        if (line && context.measureText(next).width > maxWidth) {
          lines.push(line);
          line = wordChunk;
        } else {
          line = next;
        }
      });
    });
    if (line) lines.push(line);
  });
  return lines;
}

function drawQuadraticGraph(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  coefficients: { a: number; b: number; c: number },
) {
  const padding = Math.max(12, Math.min(34, Math.min(width, height) * 0.09));
  const plot = {
    x: x + padding,
    y: y + padding,
    width: Math.max(1, width - padding * 2),
    height: Math.max(1, height - padding * 2),
  };
  const xMin = -6;
  const xMax = 6;
  const samples = Array.from({ length: 121 }, (_, index) => {
    const value = xMin + (xMax - xMin) * index / 120;
    return { x: value, y: coefficients.a * value * value + coefficients.b * value + coefficients.c };
  });
  let yMin = Math.min(0, ...samples.map((point) => point.y));
  let yMax = Math.max(0, ...samples.map((point) => point.y));
  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  }
  const yPadding = (yMax - yMin) * 0.08;
  yMin -= yPadding;
  yMax += yPadding;
  const scaleX = plot.width / (xMax - xMin);
  const scaleY = plot.height / (yMax - yMin);
  const px = (value: number) => plot.x + (value - xMin) * scaleX;
  const py = (value: number) => plot.y + (yMax - value) * scaleY;

  context.fillStyle = '#ffffff';
  context.fillRect(x, y, width, height);
  context.strokeStyle = '#cbd5e1';
  context.lineWidth = 1;
  context.strokeRect(x, y, width, height);
  context.strokeStyle = 'rgba(25,40,65,.12)';
  context.lineWidth = 1;
  for (let value = xMin; value <= xMax; value += 1) {
    context.beginPath();
    context.moveTo(px(value), plot.y);
    context.lineTo(px(value), plot.y + plot.height);
    context.stroke();
    context.fillStyle = '#475569';
    context.font = `${Math.max(9, Math.min(12, padding * 0.42))}px system-ui, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'bottom';
    context.fillText(String(value), px(value), plot.y + plot.height + padding * 0.42, Math.max(12, padding * 0.8));
  }
  const rawYStep = (yMax - yMin) / 8;
  const stepMagnitude = 10 ** Math.floor(Math.log10(Math.max(rawYStep, Number.EPSILON)));
  const normalizedStep = rawYStep / stepMagnitude;
  const yStep = (normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10) * stepMagnitude;
  context.font = `${Math.max(9, Math.min(12, padding * 0.42))}px system-ui, sans-serif`;
  context.fillStyle = '#475569';
  context.textAlign = 'center';
  context.textBaseline = 'top';
  for (let value = Math.ceil(yMin / yStep) * yStep; value <= yMax; value += yStep) {
    context.beginPath();
    context.moveTo(plot.x, py(value));
    context.lineTo(plot.x + plot.width, py(value));
    context.stroke();
    context.fillText(String(Number(value.toPrecision(4))), x + padding * 0.48, py(value) - 6, padding * 0.8);
  }
  context.strokeStyle = '#29364c';
  context.lineWidth = 1.5;
  context.beginPath();
  if (yMin <= 0 && yMax >= 0) {
    context.moveTo(plot.x, py(0));
    context.lineTo(plot.x + plot.width, py(0));
  }
  context.moveTo(px(0), plot.y);
  context.lineTo(px(0), plot.y + plot.height);
  context.stroke();
  context.save();
  context.beginPath();
  context.rect(plot.x, plot.y, plot.width, plot.height);
  context.clip();
  context.beginPath();
  samples.forEach((point, index) => {
    if (index === 0) context.moveTo(px(point.x), py(point.y));
    else context.lineTo(px(point.x), py(point.y));
  });
  context.strokeStyle = '#356fe5';
  context.lineWidth = 2.5;
  context.stroke();
  context.restore();
  context.fillStyle = '#1e293b';
  context.font = `600 ${Math.max(9, Math.min(11, padding * 0.38))}px system-ui, sans-serif`;
  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.fillText('y', plot.x + 3, plot.y + 3);
  context.textAlign = 'right';
  context.textBaseline = 'bottom';
  context.fillText('x', plot.x + plot.width - 3, plot.y + plot.height - 3);

  const discriminant = coefficients.b ** 2 - 4 * coefficients.a * coefficients.c;
  const vertexX = coefficients.a === 0 ? null : -coefficients.b / (2 * coefficients.a);
  const points = [];
  if (vertexX !== null && vertexX >= xMin && vertexX <= xMax) {
    points.push({
      x: vertexX,
      y: coefficients.a * vertexX ** 2 + coefficients.b * vertexX + coefficients.c,
      label: `Vertex (${Number(vertexX.toFixed(2))}, ${Number((coefficients.a * vertexX ** 2 + coefficients.b * vertexX + coefficients.c).toFixed(2))})`,
    });
  }
  if ((coefficients.a === 0 && coefficients.b !== 0) ||
    (coefficients.a !== 0 && discriminant >= 0)) {
    const roots = coefficients.a === 0
      ? [-coefficients.c / coefficients.b]
      : discriminant === 0
        ? [-coefficients.b / (2 * coefficients.a)]
        : [
          (-coefficients.b - Math.sqrt(discriminant)) / (2 * coefficients.a),
          (-coefficients.b + Math.sqrt(discriminant)) / (2 * coefficients.a),
        ];
    roots.forEach((root, index) => {
      if (root >= xMin && root <= xMax) {
        points.push({
          x: root,
          y: 0,
          label: `x${roots.length > 1 ? index + 1 : ''} (${Number(root.toFixed(2))}, 0)`,
        });
      }
    });
  }
  points.forEach((point) => {
    if (point.y < yMin || point.y > yMax) return;
    const pointX = px(point.x);
    const pointY = py(point.y);
    context.beginPath();
    context.arc(pointX, pointY, Math.max(3, padding * 0.12), 0, Math.PI * 2);
    context.fillStyle = '#dc2626';
    context.fill();
    context.font = `600 ${Math.max(8, Math.min(10, padding * 0.34))}px system-ui, sans-serif`;
    const labelWidth = context.measureText(point.label).width;
    const labelX = Math.max(plot.x + labelWidth / 2 + 2, Math.min(plot.x + plot.width - labelWidth / 2 - 2, pointX));
    const labelY = Math.max(plot.y + 2, pointY - 14);
    context.fillStyle = 'rgba(255,255,255,.92)';
    context.fillRect(labelX - labelWidth / 2 - 2, labelY - 1, labelWidth + 4, 12);
    context.strokeStyle = 'rgba(148,163,184,.8)';
    context.lineWidth = 0.5;
    context.strokeRect(labelX - labelWidth / 2 - 2, labelY - 1, labelWidth + 4, 12);
    context.fillStyle = '#1e293b';
    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.fillText(point.label, labelX, labelY, plot.width - 4);
  });
  context.fillStyle = '#1e293b';
  context.font = `600 ${Math.max(10, Math.min(13, padding * 0.46))}px system-ui, sans-serif`;
  context.textAlign = 'right';
  context.textBaseline = 'bottom';
  const terms = [
    { coefficient: coefficients.a, variable: 'x²' },
    { coefficient: coefficients.b, variable: 'x' },
    { coefficient: coefficients.c, variable: '' },
  ].filter((term) => term.coefficient !== 0);
  const equation = terms.length
    ? terms.map(({ coefficient, variable }, index) => {
      const sign = coefficient < 0 ? '−' : index ? '+' : '';
      const magnitude = Math.abs(coefficient);
      const value = variable && magnitude === 1 ? '' : String(Number(magnitude.toPrecision(4)));
      return `${sign}${value}${variable}`;
    }).join(' ')
    : '0';
  context.fillText(`y = ${equation}`, x + width - 5, y + height - 4, width * 0.78);
}

function getModelForSuggestion(text: string): WorkspaceLearningModelId | null {
  const normalized = text.toLowerCase();
  if (/\b(cube|cuboid)\b/.test(normalized)) return 'cube';
  if (/\b(water molecule|h₂o|h2o)\b/.test(normalized)) return 'water';
  if (/\b(newton|force|f\s*=\s*ma|second law)\b/.test(normalized)) return 'newton';
  return null;
}

function getBoardVisualKind(text: string): BoardVisualKind | null {
  const normalized = text.toLowerCase();
  if (/\b(triangular prism|prism)\b/.test(normalized)) return 'prism';
  if (/\b(cube|cuboid)\b/.test(normalized)) return 'cube';
  if (/\bsphere\b/.test(normalized)) return 'sphere';
  if (/\b(water molecule|h₂o|h2o)\b/.test(normalized)) return 'water';
  if (/\b(newton|force|f\s*=\s*ma|second law)\b/.test(normalized)) return 'newton';
  if (/\b(parabola|quadratic|graph)\b/.test(normalized)) return 'parabola';
  if (/\b(triangle|triangular)\b/.test(normalized)) return 'triangle';
  if (/\b(circle|circular)\b/.test(normalized)) return 'circle';
  return null;
}

function getBoardVisualLabel(kind: BoardVisualKind): string {
  if (kind === 'cube2d') return '2D cube';
  if (kind === 'prism') return 'triangular prism';
  if (kind === 'water') return 'water molecule';
  if (kind === 'newton') return 'Newton’s second law';
  if (kind === 'diagram') return '2D educational diagram';
  if (kind === 'photo') return 'real-world photo reference';
  return kind;
}

function isWorkspaceLearningModelId(value: unknown): value is WorkspaceLearningModelId {
  return value === 'water' || value === 'cube' || value === 'newton' ||
    value === 'photosynthesis' || value === 'economics' || value === 'solar';
}

function getLabeledValue(text: string, label: string): string {
  return text.match(new RegExp(`^${label}:\\s*(.+)$`, 'im'))?.[1]?.trim() || '';
}

function getSuggestedText(text: string, fallback: string): string {
  const lines = text.split(/\r?\n/);
  const wording = lines.find((line) => /^(suggested wording|improved sentence):/i.test(line.trim()));
  if (wording) return wording.replace(/^(suggested wording|improved sentence):\s*/i, '').trim() || fallback || text;
  if (/^(recognition|transcription|expression|suggestions?):/im.test(text)) {
    return getLabeledValue(text, 'Recognition') ||
      getLabeledValue(text, 'Transcription') ||
      getLabeledValue(text, 'Expression') ||
      fallback ||
      text;
  }
  return text;
}

function withTimeout<T>(request: Promise<T>, timeoutMs = 15000): Promise<T> {
  let timeoutId: number;
  return Promise.race([
    request,
    new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(
        () => reject(new Error('FaceMeX did not respond in time. Retry the analysis or keep drawing.')),
        timeoutMs,
      );
    }),
  ]).finally(() => window.clearTimeout(timeoutId));
}

function distance(first: { x: number; y: number }, second: { x: number; y: number }) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function distanceToLine(point: { x: number; y: number }, start: { x: number; y: number }, end: { x: number; y: number }) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = dx * dx + dy * dy;
  if (!length) return distance(point, start);
  const amount = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / length));
  return distance(point, { x: start.x + amount * dx, y: start.y + amount * dy });
}

function simplify(points: BoardStroke['points'], tolerance: number): BoardStroke['points'] {
  if (points.length <= 2) return points;
  const keep = new Set([0, points.length - 1]);
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop()!;
    let maximum = tolerance;
    let indexToKeep = -1;
    for (let index = start + 1; index < end; index += 1) {
      const current = distanceToLine(points[index], points[start], points[end]);
      if (current > maximum) {
        maximum = current;
        indexToKeep = index;
      }
    }
    if (indexToKeep >= 0) {
      keep.add(indexToKeep);
      stack.push([start, indexToKeep], [indexToKeep, end]);
    }
  }
  return [...keep].sort((a, b) => a - b).map((index) => points[index]);
}

function recognizeShape(stroke: BoardStroke, aspectRatio: number): ShapeTool | null {
  if (stroke.tool !== 'pen' || stroke.points.length < 10) return null;
  const stride = Math.max(1, Math.ceil(stroke.points.length / 500));
  const points = stroke.points.filter((_, index) => index % stride === 0)
    .map((point) => ({ x: point.x * aspectRatio, y: point.y }));
  const finalPoint = stroke.points[stroke.points.length - 1];
  if (points[points.length - 1].x !== finalPoint.x * aspectRatio ||
    points[points.length - 1].y !== finalPoint.y) {
    points.push({ x: finalPoint.x * aspectRatio, y: finalPoint.y });
  }
  const first = points[0];
  const last = points[points.length - 1];
  const bounds = getBounds(points);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const diagonal = Math.hypot(width, height);
  if (diagonal < 0.025) return null;
  const lineDeviation = Math.max(...points.map((point) => distanceToLine(point, first, last)));
  if (distance(first, last) >= 0.045 &&
    lineDeviation >= 0.0015 &&
    lineDeviation <= distance(first, last) * 0.045) return 'line';
  if (distance(first, last) > diagonal * 0.18) return null;
  const simplified = simplify([...points.slice(0, -1), first], diagonal * 0.055);
  const vertices = simplified.slice(0, -1).length;
  if (vertices === 3) return 'triangle';
  if (vertices === 4) return 'rectangle';
  const renderedAspect = width / Math.max(height, 0.0001);
  return vertices >= 6 && renderedAspect >= 0.65 && renderedAspect <= 1.5 ? 'ellipse' : null;
}

export default function WorkspaceSmartboardCanvas({
  onRecognizeDrawing,
  onSolve,
  onAnalyzeDrawing,
  onSearchReferenceImage,
  onSaveLesson,
  onListLessons,
  onSendToWorkspace,
}: Props) {
  const [open, setOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [scene, setScene] = useState<Scene>(emptyScene);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);
  const [selection, setSelection] = useState<Selection>(null);
  const [equationPrompt, setEquationPrompt] = useState('');
  const [shapeCandidate, setShapeCandidate] = useState<{ index: number; tool: ShapeTool } | null>(null);
  const [mode, setMode] = useState<'edit' | 'markup' | 'resize'>('markup');
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#172033');
  const [width, setWidth] = useState(4);
  const [view, setView] = useState<ViewTransform>({ zoom: 1, x: 0, y: 0 });
  const [image, setImage] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [referenceImageVersion, setReferenceImageVersion] = useState(0);
  const [suggestion, setSuggestion] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [aiSuggestionsEnabled, setAISuggestionsEnabled] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [boardTitle, setBoardTitle] = useState('Untitled board');
  const [savedBoard, setSavedBoard] = useState<WorkspaceSmartboardLesson | null>(null);
  const [savedBoards, setSavedBoards] = useState<WorkspaceSmartboardLesson[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savedListOpen, setSavedListOpen] = useState(false);
  const [presentation, setPresentation] = useState(false);
  const [textDraft, setTextDraft] = useState('');
  const [textComposerOpen, setTextComposerOpen] = useState(false);
  const [mathKeyboardOpen, setMathKeyboardOpen] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [boardInteractionVersion, setBoardInteractionVersion] = useState(0);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const boardImageRef = useRef(image);
  boardImageRef.current = image;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const textRef = useRef<HTMLInputElement | null>(null);
  const activeStrokeRef = useRef<BoardStroke | null>(null);
  const activeStrokeIndexRef = useRef<number | null>(null);
  const strokeRenderFrameRef = useRef<number | null>(null);
  const activeSelectionRef = useRef<{
    selection: Selection;
    start: { x: number; y: number };
    stroke?: BoardStroke;
    text?: BoardText;
    visual?: BoardVisual;
  } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const panRef = useRef<{ startX: number; startY: number; x: number; y: number } | null>(null);
  const gestureRef = useRef<{ distance: number; zoom: number; anchorX: number; anchorY: number; centerX: number; centerY: number } | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const referenceImagesRef = useRef(new Map<string, HTMLImageElement>());
  const moreMenuRef = useRef<HTMLDetailsElement | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const analyzeDrawingRef = useRef(onAnalyzeDrawing);
  const recognitionTimerRef = useRef<number | null>(null);
  const analysisRequestRef = useRef(0);
  const labelSuggestionRef = useRef(false);
  const lastAutoAnalysisAtRef = useRef(0);
  const lastAnalyzedImageRef = useRef<string | null>(null);
  const retryAnalysisImageRef = useRef<string | null>(null);
  const coefficients = useMemo(() => parseQuadraticEquation(scene.equation), [scene.equation]);
  const recognizedCoefficients = useMemo(
    () => scene.recognizedText ? parseQuadraticEquation(scene.recognizedText) : null,
    [scene.recognizedText],
  );
  const suggestedObjectKind = useMemo(
    () => getBoardVisualKind(`${scene.recognizedText}\n${suggestion}`),
    [scene.recognizedText, suggestion],
  );

  useEffect(() => {
    analyzeDrawingRef.current = onAnalyzeDrawing;
  }, [onAnalyzeDrawing]);

  const setAIResult = (response: string) => {
    labelSuggestionRef.current = false;
    const formatted = formatAIResponse(response);
    const recognizedText = getLabeledValue(formatted, 'Recognition') ||
      getLabeledValue(formatted, 'Transcription') ||
      getLabeledValue(formatted, 'Expression');
    if (recognizedText && /[=≤≥]/.test(recognizedText) && /[a-z0-9]/i.test(recognizedText)) {
      setEquationPrompt(recognizedText);
    }
    const subject = getLabeledValue(formatted, 'Subject');
    const visualModel = getModelForSuggestion(`${recognizedText}\n${subject}\n${formatted}`);
    setSuggestion(formatted);
    setScene((previous) => ({
      ...previous,
      recognizedText: recognizedText || previous.recognizedText,
      subject: subject || previous.subject,
      visualModel: visualModel || previous.visualModel,
    }));
  };

  const toggleAISuggestions = () => {
    if (aiSuggestionsEnabled) {
      analysisRequestRef.current += 1;
      setAISuggestionsEnabled(false);
      setAnalyzing(false);
      setAnalysisError('');
      setSuggestion('');
      lastAnalyzedImageRef.current = null;
      return;
    }
    if (!window.confirm(
      'Enable AI suggestions for this board? After you pause, a snapshot of your writing may be sent to FaceMeX’s existing AI service for recognition. FaceMeX will only suggest actions and will not change your board without approval.',
    )) return;
    setAISuggestionsEnabled(true);
    setAnalysisError('');
  };

  const snapshot = (): Snapshot => ({
    scene: {
      ...sceneRef.current,
      strokes: [...sceneRef.current.strokes],
      texts: [...sceneRef.current.texts],
      visuals: [...sceneRef.current.visuals],
    },
    image: boardImageRef.current,
  });
  const remember = () => {
    setHistory((previous) => [...previous.slice(-49), snapshot()]);
    setFuture([]);
  };
  const updateScene = (updater: (previous: Scene) => Scene) => setScene(updater);

  useEffect(() => {
    if (!image) {
      imageRef.current = null;
      setImageLoaded(false);
      return;
    }
    const source = new Image();
    source.onload = () => {
      imageRef.current = source;
      setImageLoaded(true);
    };
    source.onerror = () => {
      setImageLoaded(false);
      setError('The board image could not be displayed.');
    };
    source.src = image;
  }, [image]);

  useEffect(() => {
    let active = true;
    scene.visuals.forEach((visual) => {
      if (visual.kind !== 'photo' || !visual.imageUrl || referenceImagesRef.current.has(visual.imageUrl)) return;
      const source = new Image();
      source.crossOrigin = 'anonymous';
      source.onload = () => {
        referenceImagesRef.current.set(visual.imageUrl!, source);
        if (active) setReferenceImageVersion((version) => version + 1);
      };
      source.onerror = () => {
        referenceImagesRef.current.delete(visual.imageUrl!);
        if (active) setError('The real-world reference photo could not be loaded.');
      };
      referenceImagesRef.current.set(visual.imageUrl, source);
      source.src = visual.imageUrl;
    });
    return () => {
      active = false;
    };
  }, [scene.visuals]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const bounds = canvas.getBoundingClientRect();
      const context = canvas.getContext('2d');
      if (!context || !bounds.width || !bounds.height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * ratio);
      canvas.height = Math.round(bounds.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, bounds.width, bounds.height);
      context.save();
      context.translate(view.x, view.y);
      context.scale(view.zoom, view.zoom);
      if (imageLoaded && imageRef.current) {
        const source = imageRef.current;
        const scale = Math.min(bounds.width * 0.8 / source.width, bounds.height * 0.8 / source.height);
        const width = source.width * scale;
        const height = source.height * scale;
        context.drawImage(source, (bounds.width - width) / 2, (bounds.height - height) / 2, width, height);
      }
      context.lineCap = 'round';
      context.lineJoin = 'round';
      scene.strokes.forEach((stroke, index) => {
        if (!stroke.points.length) return;
        const start = stroke.points[0];
        const end = stroke.points[stroke.points.length - 1];
        const x1 = start.x * bounds.width;
        const y1 = start.y * bounds.height;
        const x2 = end.x * bounds.width;
        const y2 = end.y * bounds.height;
        context.beginPath();
        context.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
        context.lineWidth = stroke.width;
        context.globalAlpha = stroke.tool === 'highlighter' ? 0.28 : 1;
        if (stroke.tool === 'line' || stroke.tool === 'arrow') {
          context.moveTo(x1, y1);
          context.lineTo(x2, y2);
          context.stroke();
          if (stroke.tool === 'arrow') {
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const head = Math.max(10, stroke.width * 3);
            context.beginPath();
            context.moveTo(x2, y2);
            context.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
            context.moveTo(x2, y2);
            context.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
            context.stroke();
          }
        } else if (stroke.tool === 'rectangle') {
          context.strokeRect(x1, y1, x2 - x1, y2 - y1);
        } else if (stroke.tool === 'ellipse') {
          context.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, Math.PI * 2);
          context.stroke();
        } else if (stroke.tool === 'triangle') {
          context.moveTo((x1 + x2) / 2, Math.min(y1, y2));
          context.lineTo(Math.max(x1, x2), Math.max(y1, y2));
          context.lineTo(Math.min(x1, x2), Math.max(y1, y2));
          context.closePath();
          context.stroke();
        } else {
          context.moveTo(x1, y1);
          if (stroke.points.length === 1) context.lineTo(x1 + 0.1, y1 + 0.1);
          for (let pointIndex = 1; pointIndex < stroke.points.length - 1; pointIndex += 1) {
            const current = stroke.points[pointIndex];
            const next = stroke.points[pointIndex + 1];
            context.quadraticCurveTo(
              current.x * bounds.width,
              current.y * bounds.height,
              ((current.x + next.x) / 2) * bounds.width,
              ((current.y + next.y) / 2) * bounds.height,
            );
          }
          if (stroke.points.length > 1) {
            const last = stroke.points[stroke.points.length - 1];
            context.lineTo(last.x * bounds.width, last.y * bounds.height);
          }
          context.stroke();
        }
        context.globalAlpha = 1;
        if (selection?.type === 'stroke' && selection.index === index) {
          const box = getBounds(stroke.points);
          context.strokeStyle = '#5688ef';
          context.lineWidth = 1.5;
          context.setLineDash([6, 4]);
          context.strokeRect(box.minX * bounds.width - 8, box.minY * bounds.height - 8,
            (box.maxX - box.minX) * bounds.width + 16, (box.maxY - box.minY) * bounds.height + 16);
          context.setLineDash([]);
        }
      });
      if (scene.graphOnBoard && coefficients) {
        drawQuadraticGraph(context, bounds.width * 0.12, bounds.height * 0.12, bounds.width * 0.76, bounds.height * 0.7, coefficients);
      }
      scene.visuals.forEach((visual, index) => {
        const x = visual.x * bounds.width;
        const y = visual.y * bounds.height;
        const width = visual.width * bounds.width;
        const height = visual.height * bounds.height;
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        context.save();
        context.translate(centerX, centerY);
        context.rotate(visual.kind === 'cube' || visual.kind === 'cube2d' || visual.kind === 'water' || visual.kind === 'sphere' || visual.kind === 'prism' ? 0 : visual.rotation);
        context.lineWidth = 3;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.strokeStyle = '#356fe5';
        context.fillStyle = '#356fe5';

        if (visual.kind === 'photo') {
          const source = visual.imageUrl ? referenceImagesRef.current.get(visual.imageUrl) : undefined;
          if (source?.complete && source.naturalWidth > 0) {
            const imageScale = Math.min(width / source.naturalWidth, height / source.naturalHeight);
            const imageWidth = source.naturalWidth * imageScale;
            const imageHeight = source.naturalHeight * imageScale;
            context.drawImage(source, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
            context.strokeStyle = '#94a3b8';
            context.lineWidth = 1;
            context.strokeRect(-imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
            context.fillStyle = 'rgba(255,255,255,.92)';
            context.fillRect(-width / 2, height / 2 - 22, width, 22);
            context.fillStyle = '#334155';
            context.font = '11px system-ui, sans-serif';
            context.textAlign = 'left';
            context.fillText(
              `Photo: ${(visual.attribution || 'Unsplash').slice(0, 40)}`,
              -width / 2 + 5,
              height / 2 - 7,
              width - 10,
            );
          } else {
            context.strokeStyle = '#94a3b8';
            context.strokeRect(-width / 2, -height / 2, width, height);
            context.fillStyle = '#475569';
            context.font = '12px system-ui, sans-serif';
            context.textAlign = 'center';
            context.fillText('Loading photo reference…', 0, 0, width - 12);
          }
        } else if (visual.kind === 'diagram' && visual.diagram) {
          const diagram = visual.diagram;
          const fontSize = Math.max(11, Math.min(14, width * 0.045));
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillStyle = '#172033';
          context.font = `700 ${fontSize}px system-ui, sans-serif`;
          context.fillText(diagram.title, 0, -height * 0.43, width - 12);
          const nodes = diagram.nodes.map((node) => {
            context.font = `600 ${fontSize}px system-ui, sans-serif`;
            const nodeWidth = Math.min(width * 0.42, Math.max(68, context.measureText(node.label).width + 18));
            return {
              x: (node.x - 0.5) * width,
              y: (node.y - 0.5) * height + 8,
              width: nodeWidth,
              height: Math.max(34, fontSize * 2.4),
              label: node.label,
            };
          });
          diagram.edges.forEach((edge) => {
            const from = nodes[edge.from];
            const to = nodes[edge.to];
            if (!from || !to) return;
            const angle = Math.atan2(to.y - from.y, to.x - from.x);
            const startX = from.x + Math.cos(angle) * from.width * 0.42;
            const startY = from.y + Math.sin(angle) * from.height * 0.42;
            const endX = to.x - Math.cos(angle) * to.width * 0.48;
            const endY = to.y - Math.sin(angle) * to.height * 0.48;
            context.strokeStyle = '#64748b';
            context.fillStyle = '#64748b';
            context.lineWidth = 1.5;
            context.beginPath();
            context.moveTo(startX, startY);
            context.lineTo(endX, endY);
            context.stroke();
            context.beginPath();
            context.moveTo(endX, endY);
            context.lineTo(endX - 7 * Math.cos(angle - 0.45), endY - 7 * Math.sin(angle - 0.45));
            context.lineTo(endX - 7 * Math.cos(angle + 0.45), endY - 7 * Math.sin(angle + 0.45));
            context.closePath();
            context.fill();
            if (edge.label) {
              context.fillStyle = '#334155';
              context.font = `500 ${Math.max(10, fontSize - 1)}px system-ui, sans-serif`;
              context.fillText(edge.label, (startX + endX) / 2, (startY + endY) / 2 - 7, width * 0.35);
            }
          });
          nodes.forEach((node) => {
            context.fillStyle = '#eff6ff';
            context.strokeStyle = '#356fe5';
            context.lineWidth = 1.5;
            context.fillRect(node.x - node.width / 2, node.y - node.height / 2, node.width, node.height);
            context.strokeRect(node.x - node.width / 2, node.y - node.height / 2, node.width, node.height);
            context.fillStyle = '#172033';
            context.font = `600 ${fontSize}px system-ui, sans-serif`;
            const lines = wrapCanvasText(context, node.label, node.width - 12);
            const lineHeight = fontSize * 1.2;
            lines.slice(0, 2).forEach((line, lineIndex) => {
              context.fillText(
                line,
                node.x,
                node.y + (lineIndex - (Math.min(lines.length, 2) - 1) / 2) * lineHeight,
                node.width - 12,
              );
            });
          });
        } else if (visual.kind === 'triangle') {
          context.beginPath();
          context.moveTo(0, -height * 0.4);
          context.lineTo(width * 0.42, height * 0.36);
          context.lineTo(-width * 0.42, height * 0.36);
          context.closePath();
          context.stroke();
        } else if (visual.kind === 'circle') {
          context.beginPath();
          context.ellipse(0, 0, width * 0.4, height * 0.4, 0, 0, Math.PI * 2);
          context.stroke();
        } else if (visual.kind === 'sphere') {
          const radius = Math.min(width, height) * 0.38;
          const shading = context.createRadialGradient(-radius * 0.38, -radius * 0.42, radius * 0.06, 0, 0, radius);
          shading.addColorStop(0, '#ffffff');
          shading.addColorStop(0.25, '#b8d5ff');
          shading.addColorStop(1, '#356fe5');
          context.fillStyle = shading;
          context.beginPath();
          context.arc(0, 0, radius, 0, Math.PI * 2);
          context.fill();
          const projectSpherePoint = (latitude: number, longitude: number) => {
            const x = Math.cos(latitude) * Math.cos(longitude);
            const y = Math.sin(latitude);
            const z = Math.cos(latitude) * Math.sin(longitude);
            const yawX = x * Math.cos(visual.rotation) - z * Math.sin(visual.rotation);
            const yawZ = x * Math.sin(visual.rotation) + z * Math.cos(visual.rotation);
            const pitch = 0.28;
            const pitchY = y * Math.cos(pitch) - yawZ * Math.sin(pitch);
            const pitchZ = y * Math.sin(pitch) + yawZ * Math.cos(pitch);
            const perspective = 1 / (1.8 - pitchZ * 0.35);
            return { x: yawX * radius * perspective, y: -pitchY * radius * perspective };
          };
          context.save();
          context.beginPath();
          context.arc(0, 0, radius - 1, 0, Math.PI * 2);
          context.clip();
          context.strokeStyle = 'rgba(255,255,255,.62)';
          context.lineWidth = 1.1;
          for (let latitude = -60; latitude <= 60; latitude += 30) {
            context.beginPath();
            for (let longitude = 0; longitude <= 360; longitude += 5) {
              const point = projectSpherePoint(latitude * Math.PI / 180, longitude * Math.PI / 180);
              if (longitude === 0) context.moveTo(point.x, point.y);
              else context.lineTo(point.x, point.y);
            }
            context.stroke();
          }
          for (let longitude = 0; longitude < 180; longitude += 30) {
            context.beginPath();
            for (let latitude = -90; latitude <= 90; latitude += 3) {
              const point = projectSpherePoint(latitude * Math.PI / 180, longitude * Math.PI / 180);
              if (latitude === -90) context.moveTo(point.x, point.y);
              else context.lineTo(point.x, point.y);
            }
            context.stroke();
          }
          context.restore();
          context.strokeStyle = '#244f9f';
          context.beginPath();
          context.arc(0, 0, radius, 0, Math.PI * 2);
          context.stroke();
        } else if (visual.kind === 'prism') {
          const vertices = [
            [-0.8, -1, 1], [0.8, -1, 1], [0, 1, 1],
            [-0.8, -1, -1], [0.8, -1, -1], [0, 1, -1],
          ];
          const yaw = visual.rotation;
          const pitch = 0.35;
          const projected = vertices.map(([vx, vy, vz]) => {
            const rotatedX = vx * Math.cos(yaw) - vz * Math.sin(yaw);
            const rotatedZ = vx * Math.sin(yaw) + vz * Math.cos(yaw);
            const rotatedY = vy * Math.cos(pitch) - rotatedZ * Math.sin(pitch);
            return { x: rotatedX * width * 0.22, y: rotatedY * height * 0.22 };
          });
          const edges = [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3], [0, 3], [1, 4], [2, 5]];
          edges.forEach(([from, to]) => {
            context.beginPath();
            context.moveTo(projected[from].x, projected[from].y);
            context.lineTo(projected[to].x, projected[to].y);
            context.stroke();
          });
        } else if (visual.kind === 'cube' || visual.kind === 'cube2d') {
          const vertices = [
            [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
            [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
          ];
          const yaw = visual.kind === 'cube2d' ? -0.45 : visual.rotation;
          const pitch = 0.35;
          const projected = vertices.map(([vx, vy, vz]) => {
            const rotatedX = vx * Math.cos(yaw) - vz * Math.sin(yaw);
            const rotatedZ = vx * Math.sin(yaw) + vz * Math.cos(yaw);
            const rotatedY = vy * Math.cos(pitch) - rotatedZ * Math.sin(pitch);
            return { x: rotatedX * width * 0.22, y: rotatedY * height * 0.22 };
          });
          const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
          context.strokeStyle = '#356fe5';
          edges.forEach(([from, to]) => {
            context.beginPath();
            context.moveTo(projected[from].x, projected[from].y);
            context.lineTo(projected[to].x, projected[to].y);
            context.stroke();
          });
          context.fillStyle = '#172033';
          context.font = `600 ${Math.max(11, Math.min(16, width * 0.08))}px system-ui, sans-serif`;
          projected.forEach((point, vertexIndex) => {
            context.beginPath();
            context.arc(point.x, point.y, 3, 0, Math.PI * 2);
            context.fill();
            context.fillText(String.fromCharCode(65 + vertexIndex), point.x + 5, point.y - 5);
          });
        } else if (visual.kind === 'water') {
          const angle = visual.rotation + 0.45;
          const oxygen = { x: 0, y: -height * 0.05 };
          const bond = Math.min(width, height) * 0.28;
          const hydrogenPoints = [
            { x: Math.cos(angle) * bond, y: Math.sin(angle) * bond },
            { x: Math.cos(angle + 1.75) * bond, y: Math.sin(angle + 1.75) * bond },
          ];
          context.strokeStyle = '#718096';
          context.lineWidth = Math.max(5, bond * 0.18);
          hydrogenPoints.forEach((point) => {
            context.beginPath();
            context.moveTo(oxygen.x, oxygen.y);
            context.lineTo(point.x, point.y);
            context.stroke();
          });
          context.fillStyle = '#b83c36';
          context.beginPath();
          context.arc(oxygen.x, oxygen.y, Math.max(10, bond * 0.3), 0, Math.PI * 2);
          context.fill();
          context.fillStyle = '#263449';
          hydrogenPoints.forEach((point) => {
            context.beginPath();
            context.arc(point.x, point.y, Math.max(7, bond * 0.22), 0, Math.PI * 2);
            context.fill();
          });
          context.fillStyle = '#fff';
          context.font = 'bold 12px system-ui, sans-serif';
          context.fillText('O', -4, 4);
          context.fillStyle = '#172033';
          context.fillText('H', hydrogenPoints[0].x - 4, hydrogenPoints[0].y + 4);
          context.fillText('H', hydrogenPoints[1].x - 4, hydrogenPoints[1].y + 4);
        } else if (visual.kind === 'newton') {
          const mass = visual.mass || 1200;
          const acceleration = visual.acceleration ?? 4;
          const force = mass * acceleration;
          context.fillStyle = '#172033';
          context.font = `700 ${Math.max(18, Math.min(30, width * 0.16))}px system-ui, sans-serif`;
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillText(`F = ma = ${force.toLocaleString()} N`, 0, -height * 0.06);
          context.strokeStyle = '#e05a47';
          context.beginPath();
          const arrowEnd = Math.min(width * 0.38, width * 0.1 + force / 10000 * width * 0.28);
          context.moveTo(-width * 0.38, height * 0.22);
          context.lineTo(arrowEnd, height * 0.22);
          context.lineTo(arrowEnd - width * 0.08, height * 0.1);
          context.moveTo(arrowEnd, height * 0.22);
          context.lineTo(arrowEnd - width * 0.08, height * 0.34);
          context.stroke();
          context.fillStyle = '#475569';
          context.font = '12px system-ui, sans-serif';
          context.fillText(`${mass.toLocaleString()} kg · ${acceleration} m/s²`, 0, height * 0.44);
        } else if (visual.kind === 'parabola') {
          const graphEquation = visual.equation || scene.equation;
          const graphCoefficients = parseQuadraticEquation(graphEquation);
          if (graphCoefficients) {
            drawQuadraticGraph(context, -width / 2, -height / 2, width, height, graphCoefficients);
          } else {
            context.fillStyle = '#fff';
            context.fillRect(-width / 2, -height / 2, width, height);
            context.strokeStyle = '#cbd5e1';
            context.strokeRect(-width / 2, -height / 2, width, height);
            context.fillStyle = '#b91c1c';
            context.font = '12px system-ui, sans-serif';
            context.textAlign = 'center';
            context.fillText('Enter a supported linear or quadratic equation', 0, 0, width - 16);
          }
        }

        if (selection?.type === 'visual' && selection.index === index) {
          context.strokeStyle = '#5688ef';
          context.lineWidth = 1.5;
          context.setLineDash([6, 4]);
          context.strokeRect(-width / 2 - 8, -height / 2 - 8, width + 16, height + 16);
          context.setLineDash([]);
        }
        context.restore();
      });
      scene.texts.forEach((text, index) => {
        const x = text.x * bounds.width;
        const y = text.y * bounds.height;
        let selectionWidth: number;
        let selectionHeight: number;
        if (text.kind === 'explanation') {
          const width = (text.width || 0.48) * bounds.width;
          const height = (text.height || 0.42) * bounds.height;
          const padding = Math.max(10, Math.min(18, width * 0.035));
          const fontSize = Math.max(13, Math.min(17, width * 0.04)) * (text.scale || 1);
          const lineHeight = fontSize * 1.4;
          context.fillStyle = 'rgba(255,255,255,0.97)';
          context.fillRect(x, y, width, height);
          context.strokeStyle = '#cbd5e1';
          context.lineWidth = 1;
          context.strokeRect(x, y, width, height);
          context.fillStyle = '#1e3a5f';
          context.font = `700 ${fontSize}px system-ui, sans-serif`;
          context.textBaseline = 'top';
          context.fillText('FaceMeX · Explanation', x + padding, y + padding);
          context.strokeStyle = '#dbe4ef';
          context.beginPath();
          context.moveTo(x + padding, y + padding + fontSize + 5);
          context.lineTo(x + width - padding, y + padding + fontSize + 5);
          context.stroke();
          context.fillStyle = '#1f2937';
          context.font = `400 ${fontSize}px system-ui, sans-serif`;
          const lines = wrapCanvasText(context, text.text, width - padding * 2);
          const textTop = y + padding + fontSize + 13;
          const visibleLines = Math.max(1, Math.floor((height - padding - (textTop - y)) / lineHeight));
          lines.slice(0, visibleLines).forEach((line, lineIndex) => {
            const clippedLine = lineIndex === visibleLines - 1 && lines.length > visibleLines
              ? `${line.replace(/\s+$/, '')}…`
              : line;
            context.fillText(clippedLine, x + padding, textTop + lineIndex * lineHeight, width - padding * 2);
          });
          selectionWidth = width;
          selectionHeight = height;
        } else {
          context.fillStyle = text.color;
          context.font = `600 ${18 * (text.scale || 1)}px system-ui, sans-serif`;
          context.textBaseline = 'middle';
          context.fillText(text.text, x, y);
          selectionWidth = context.measureText(text.text).width;
          selectionHeight = 32;
        }
        if (selection?.type === 'text' && selection.index === index) {
          context.strokeStyle = '#5688ef';
          context.lineWidth = 1.5;
          context.setLineDash([6, 4]);
          context.strokeRect(
            x - 5,
            y - (text.kind === 'explanation' ? 5 : 16),
            selectionWidth + 10,
            text.kind === 'explanation' ? selectionHeight + 10 : 32,
          );
          context.setLineDash([]);
        }
      });
      context.restore();
    };
    draw();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [open, scene, selection, view, coefficients, imageLoaded, referenceImageVersion]);

  const runAutoAnalysis = async (imageDataUrl: string) => {
    if (!aiSuggestionsEnabled) return;
    const requestId = ++analysisRequestRef.current;
    lastAutoAnalysisAtRef.current = Date.now();
    setAnalyzing(true);
    setAnalysisError('');
    try {
      const response = await withTimeout(analyzeDrawingRef.current(
        imageDataUrl,
        [
          'Read the complete visible whiteboard before answering. Recognize handwritten text and transcribe equations exactly, preserving superscripts, subscripts, fractions, signs, units, labels and uncertainty. Separate directly visible content from interpretation.',
          'Classify the content as a complete equation, incomplete equation, unclear handwriting, question/instruction, or diagram/drawing. If an equation ends after an equals sign, report the exact left-hand side, say the right-hand side is missing, and ask what should follow. Never reinterpret an expression such as x² + 5 = as a function or invent missing values, variables, operators, or assumptions. If a character is unclear, name only the uncertain character and ask one focused question.',
          'For complete mathematics, explain the actual expression, show relevant steps, and independently check calculations before stating results. Ask a question only when the visible work is genuinely ambiguous or incomplete.',
          'For rough sentences or short notes, offer one polished, subject-accurate rewrite under Suggested wording: and preserve the original meaning.',
          'Give up to three concise, relevant next actions. For a clear quadratic, include graphing and finding its vertex/axis of symmetry. For a supported cube, sphere, water molecule or Newton’s second law topic, recommend the existing matching interactive visual.',
          'For a clearly drawn triangle, offer a clean editable 2D triangle and the board-supported interactive triangular prism. For a circle, offer an editable circle and board-supported interactive sphere. For a cube, offer its board-supported interactive model. Do not claim unsupported geometry is available.',
          'Return plain text only, with these labels on separate lines: Recognition:, Subject:, Intent:, Suggestions:. Do not use Markdown, JSON, LaTeX, or claim that you changed the board.',
        ].join(' '),
      ));
      if (requestId !== analysisRequestRef.current || !aiSuggestionsEnabled) return;
      if (!response?.trim()) throw new Error('FaceMeX returned no readable work. Retry the analysis or keep drawing.');
      const formattedResponse = formatAIResponse(response);
      const recognizedText = getLabeledValue(formattedResponse, 'Recognition') ||
        getLabeledValue(formattedResponse, 'Transcription') ||
        getLabeledValue(formattedResponse, 'Expression');
      if (recognizedText && isIncompleteEquation(recognizedText)) {
        setAIResult([
          `Recognition: ${recognizedText}`,
          'Subject: Mathematics',
          'Intent: Incomplete equation; the right-hand side is missing.',
          'Suggestions: Ask what should come after the equals sign. Do not treat this as a function.',
        ].join('\n'));
        return;
      }
      setAIResult(response);
    } catch (reason) {
      if (requestId === analysisRequestRef.current && aiSuggestionsEnabled) {
        setAnalysisError(reason instanceof Error ? reason.message : 'FaceMeX could not analyze this drawing.');
      }
    } finally {
      if (requestId === analysisRequestRef.current) setAnalyzing(false);
    }
  };

  useEffect(() => {
    const hasAnalyzableContent = scene.strokes.length > 0 || scene.texts.length > 0 ||
      scene.visuals.length > 0 || scene.graphOnBoard || Boolean(image);
    if (!open || !aiSuggestionsEnabled || !hasAnalyzableContent) return;
    if (recognitionTimerRef.current !== null) window.clearTimeout(recognitionTimerRef.current);
    const timer = window.setTimeout(() => {
      if (!canvasRef.current || activeStrokeRef.current || activeSelectionRef.current ||
        panRef.current || pointersRef.current.size > 0) return;
      const imageDataUrl = canvasRef.current.toDataURL('image/png');
      if (imageDataUrl === lastAnalyzedImageRef.current) return;
      lastAnalyzedImageRef.current = imageDataUrl;
      retryAnalysisImageRef.current = imageDataUrl;
      void runAutoAnalysis(imageDataUrl);
    }, Math.max(
      AUTO_ANALYSIS_IDLE_DELAY_MS,
      AUTO_ANALYSIS_COOLDOWN_MS - (Date.now() - lastAutoAnalysisAtRef.current),
    ));
    recognitionTimerRef.current = timer;
    return () => {
      window.clearTimeout(timer);
      analysisRequestRef.current += 1;
    };
  }, [open, aiSuggestionsEnabled, scene.strokes, scene.texts, scene.visuals, scene.graphOnBoard, image, boardInteractionVersion]);

  const boardPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(-1000, Math.min(1000, (event.clientX - rect.left - view.x) / (rect.width * view.zoom))),
      y: Math.max(-1000, Math.min(1000, (event.clientY - rect.top - view.y) / (rect.height * view.zoom))),
    };
  };

  const hitTest = (point: { x: number; y: number }, canvas: HTMLCanvasElement): Selection => {
    const toleranceX = 12 / (canvas.clientWidth * view.zoom);
    const toleranceY = 12 / (canvas.clientHeight * view.zoom);
    const strokeTolerance = 12 / view.zoom;
    for (let index = scene.texts.length - 1; index >= 0; index -= 1) {
      const text = scene.texts[index];
      if (text.kind === 'explanation') {
        const textWidth = text.width || 0.48;
        const textHeight = text.height || 0.42;
        if (point.x >= text.x - toleranceX && point.x <= text.x + textWidth + toleranceX &&
          point.y >= text.y - toleranceY && point.y <= text.y + textHeight + toleranceY) {
          return { type: 'text', index };
        }
        continue;
      }
      if (Math.abs(text.x - point.x) < Math.max(toleranceX, text.text.length * 0.008 * (text.scale || 1)) && Math.abs(text.y - point.y) < toleranceY * 2 * (text.scale || 1)) {
        return { type: 'text', index };
      }
    }
    for (let index = scene.visuals.length - 1; index >= 0; index -= 1) {
      const visual = scene.visuals[index];
      if (point.x >= visual.x - toleranceX && point.x <= visual.x + visual.width + toleranceX &&
        point.y >= visual.y - toleranceY && point.y <= visual.y + visual.height + toleranceY) {
        return { type: 'visual', index };
      }
    }
    for (let index = scene.strokes.length - 1; index >= 0; index -= 1) {
      if (isNearStroke(point, scene.strokes[index], canvas, strokeTolerance)) {
        return { type: 'stroke', index };
      }
    }
    return null;
  };

  const pointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (recognitionTimerRef.current !== null) window.clearTimeout(recognitionTimerRef.current);
    analysisRequestRef.current += 1;
    setAnalyzing(false);
    setSuggestion('');
    event.currentTarget.setPointerCapture(event.pointerId);
    const position = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, position);
    if (pointersRef.current.size >= 2) {
      if (activeStrokeIndexRef.current !== null) {
        const unfinishedStrokeIndex = activeStrokeIndexRef.current;
        if (strokeRenderFrameRef.current !== null) {
          window.cancelAnimationFrame(strokeRenderFrameRef.current);
          strokeRenderFrameRef.current = null;
        }
        updateScene((previous) => ({
          ...previous,
          strokes: previous.strokes.filter((_, index) => index !== unfinishedStrokeIndex),
        }));
      }
      const [first, second] = [...pointersRef.current.values()];
      const rect = event.currentTarget.getBoundingClientRect();
      const centerX = (first.x + second.x) / 2;
      const centerY = (first.y + second.y) / 2;
      gestureRef.current = {
        distance: distance(first, second),
        zoom: view.zoom,
        anchorX: (centerX - rect.left - view.x) / view.zoom,
        anchorY: (centerY - rect.top - view.y) / view.zoom,
        centerX,
        centerY,
      };
      activeStrokeRef.current = null;
      activeStrokeIndexRef.current = null;
      activeSelectionRef.current = null;
      return;
    }
    if (mode === 'resize') {
      panRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        x: view.x,
        y: view.y,
      };
      return;
    }
    const point = boardPoint(event);
    if (mode !== 'markup') {
      const hit = hitTest(point, event.currentTarget);
      setSelection(hit);
      if (hit) {
        remember();
        activeSelectionRef.current = {
          selection: hit,
          start: point,
          ...(hit.type === 'stroke' ? { stroke: scene.strokes[hit.index] } :
            hit.type === 'text' ? { text: scene.texts[hit.index] } : { visual: scene.visuals[hit.index] }),
        };
      }
      return;
    }
    setAnalysisError('');
    setShapeCandidate(null);
    setSelection(null);
    setSuggestion('');
    labelSuggestionRef.current = false;
    setEquationPrompt('');
    setError('');
    const stroke: BoardStroke = {
      points: [point],
      color,
      width: tool === 'eraser' ? Math.max(width * 5, 18) : width,
      tool,
    };
    remember();
    activeStrokeRef.current = stroke;
    activeStrokeIndexRef.current = scene.strokes.length;
    updateScene((previous) => ({
      ...previous,
      strokes: [...previous.strokes, stroke],
      recognizedText: '',
      subject: '',
      visualModel: null,
    }));
  };

  const pointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const pointers = pointersRef.current;
    if (pointers.has(event.pointerId)) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size >= 2 && gestureRef.current) {
      const [first, second] = [...pointers.values()];
      const gesture = gestureRef.current;
      const nextZoom = Math.max(0.5, Math.min(3, gesture.zoom * distance(first, second) / Math.max(gesture.distance, 1)));
      const centerX = (first.x + second.x) / 2;
      const centerY = (first.y + second.y) / 2;
      const rect = event.currentTarget.getBoundingClientRect();
      setView({
        zoom: nextZoom,
        x: centerX - rect.left - gesture.anchorX * nextZoom,
        y: centerY - rect.top - gesture.anchorY * nextZoom,
      });
      return;
    }
    const activePan = panRef.current;
    if (activePan) {
      setView((current) => ({
        ...current,
        x: activePan.x + event.clientX - activePan.startX,
        y: activePan.y + event.clientY - activePan.startY,
      }));
      return;
    }
    const point = boardPoint(event);
    const activeSelection = activeSelectionRef.current;
    if (activeSelection) {
      const dx = point.x - activeSelection.start.x;
      const dy = point.y - activeSelection.start.y;
      if (activeSelection.selection.type === 'stroke' && activeSelection.stroke) {
        const bounds = getBounds(activeSelection.stroke.points);
        const shiftX = Math.max(-1000 - bounds.minX, Math.min(1000 - bounds.maxX, dx));
        const shiftY = Math.max(-1000 - bounds.minY, Math.min(1000 - bounds.maxY, dy));
        const moved = { ...activeSelection.stroke, points: activeSelection.stroke.points.map((item) => ({ x: item.x + shiftX, y: item.y + shiftY })) };
        updateScene((previous) => ({ ...previous, strokes: previous.strokes.map((item, index) => index === activeSelection.selection.index ? moved : item) }));
      } else if (activeSelection.selection.type === 'text' && activeSelection.text) {
        const text = activeSelection.text;
        const maxX = text.kind === 'explanation' ? 1000 - (text.width || 0.48) : 1000;
        const maxY = text.kind === 'explanation' ? 1000 - (text.height || 0.42) : 1000;
        const minX = -1000;
        const minY = -1000;
        const moved = {
          ...text,
          x: Math.max(minX, Math.min(maxX, text.x + dx)),
          y: Math.max(minY, Math.min(maxY, text.y + dy)),
        };
        updateScene((previous) => ({ ...previous, texts: previous.texts.map((item, index) => index === activeSelection.selection.index ? moved : item) }));
      } else if (activeSelection.selection.type === 'visual' && activeSelection.visual) {
        const visual = activeSelection.visual;
        const moved = {
          ...visual,
          x: Math.max(0, Math.min(1 - visual.width, visual.x + dx)),
          y: Math.max(0, Math.min(1 - visual.height, visual.y + dy)),
        };
        updateScene((previous) => ({
          ...previous,
          visuals: previous.visuals.map((item, index) => index === activeSelection.selection?.index ? moved : item),
        }));
      }
      return;
    }
    const activeStroke = activeStrokeRef.current;
    if (!activeStroke) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const coalescedEvents = event.nativeEvent.getCoalescedEvents?.();
    const pointerSamples = coalescedEvents?.length ? coalescedEvents : [event.nativeEvent];
    const sampledPoints = pointerSamples.map((sample) => ({
      x: Math.max(-1000, Math.min(1000, (sample.clientX - rect.left - view.x) / (rect.width * view.zoom))),
      y: Math.max(-1000, Math.min(1000, (sample.clientY - rect.top - view.y) / (rect.height * view.zoom))),
    }));
    const points = ['line', 'arrow', 'rectangle', 'ellipse', 'triangle'].includes(activeStroke.tool)
      ? [activeStroke.points[0], point]
      : [...activeStroke.points, ...sampledPoints.filter((sample, index) =>
        index === sampledPoints.length - 1 || distance(sample, activeStroke.points[activeStroke.points.length - 1]) >= 0.0015)];
    const updated = { ...activeStroke, points };
    activeStrokeRef.current = updated;
    if (strokeRenderFrameRef.current === null) {
      strokeRenderFrameRef.current = window.requestAnimationFrame(() => {
        strokeRenderFrameRef.current = null;
        const latestStroke = activeStrokeRef.current;
        const latestIndex = activeStrokeIndexRef.current;
        if (!latestStroke || latestIndex === null) return;
        updateScene((previous) => ({
          ...previous,
          strokes: previous.strokes.map((stroke, index) => index === latestIndex ? latestStroke : stroke),
        }));
      });
    }
  };

  const pointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(event.pointerId);
    panRef.current = null;
    if (pointersRef.current.size < 2) gestureRef.current = null;
    const activeStroke = activeStrokeRef.current;
    const strokeIndex = activeStrokeIndexRef.current;
    if (strokeRenderFrameRef.current !== null) {
      window.cancelAnimationFrame(strokeRenderFrameRef.current);
      strokeRenderFrameRef.current = null;
    }
    if (activeStroke && strokeIndex !== null) {
      updateScene((previous) => ({
        ...previous,
        strokes: previous.strokes.map((stroke, index) => index === strokeIndex ? activeStroke : stroke),
      }));
    }
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (activeStroke && strokeIndex !== null && bounds?.height) {
      const shape = recognizeShape(activeStroke, bounds.width / bounds.height);
      setShapeCandidate(shape ? { index: strokeIndex, tool: shape } : null);
    }
    activeStrokeRef.current = null;
    activeStrokeIndexRef.current = null;
    activeSelectionRef.current = null;
    if (pointersRef.current.size === 0) setBoardInteractionVersion((version) => version + 1);
  };

  const applyShapeCleanup = () => {
    if (!shapeCandidate) return;
    const stroke = scene.strokes[shapeCandidate.index];
    if (!stroke) {
      setShapeCandidate(null);
      return;
    }
    const bounds = getBounds(stroke.points);
    remember();
    const cleaned: BoardStroke = {
      ...stroke,
      tool: shapeCandidate.tool,
      points: shapeCandidate.tool === 'line'
        ? [stroke.points[0], stroke.points[stroke.points.length - 1]]
        : [{ x: bounds.minX, y: bounds.minY }, { x: bounds.maxX, y: bounds.maxY }],
    };
    updateScene((previous) => ({
      ...previous,
      strokes: previous.strokes.map((item, index) => index === shapeCandidate.index ? cleaned : item),
    }));
    setSelection({ type: 'stroke', index: shapeCandidate.index });
    setShapeCandidate(null);
    setNotice(`${shapeCandidate.tool === 'line' ? 'Straight line' : `Clean ${shapeCandidate.tool}`} applied using local geometry. No AI was used.`);
  };

  const undo = () => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setFuture((items) => [...items.slice(-49), snapshot()]);
    setHistory((items) => items.slice(0, -1));
    setScene(previous.scene);
    setImage(previous.image);
    setSelection(null);
  };

  const redo = () => {
    const next = future[future.length - 1];
    if (!next) return;
    setHistory((items) => [...items.slice(-49), snapshot()]);
    setFuture((items) => items.slice(0, -1));
    setScene(next.scene);
    setImage(next.image);
    setSelection(null);
  };

  const selectedStroke = selection?.type === 'stroke' ? scene.strokes[selection.index] : null;
  const selectedText = selection?.type === 'text' ? scene.texts[selection.index] : null;
  const selectedVisual = selection?.type === 'visual' ? scene.visuals[selection.index] : null;

  const duplicate = () => {
    if (!selection) return;
    remember();
    if (selection.type === 'stroke' && selectedStroke) {
      const box = getBounds(selectedStroke.points);
      const dx = box.maxX + 0.04 <= 1 ? 0.04 : box.minX - 0.04 >= 0 ? -0.04 : 0;
      const dy = box.maxY + 0.04 <= 1 ? 0.04 : box.minY - 0.04 >= 0 ? -0.04 : 0;
      const copy = { ...selectedStroke, points: selectedStroke.points.map((point) => ({ x: point.x + dx, y: point.y + dy })) };
      updateScene((previous) => ({ ...previous, strokes: [...previous.strokes, copy] }));
      setSelection({ type: 'stroke', index: scene.strokes.length });
    } else if (selection.type === 'text' && selectedText) {
      const minX = selectedText.kind === 'explanation' ? -1000 : 0;
      const minY = selectedText.kind === 'explanation' ? -1000 : 0;
      const maxX = selectedText.kind === 'explanation' ? 1000 - (selectedText.width || 0.48) : 1;
      const maxY = selectedText.kind === 'explanation' ? 1000 - (selectedText.height || 0.42) : 1;
      const copy = {
        ...selectedText,
        x: selectedText.x + 0.03 <= maxX ? selectedText.x + 0.03 : Math.max(minX, selectedText.x - 0.03),
        y: selectedText.y + 0.03 <= maxY ? selectedText.y + 0.03 : Math.max(minY, selectedText.y - 0.03),
      };
      updateScene((previous) => ({ ...previous, texts: [...previous.texts, copy] }));
      setSelection({ type: 'text', index: scene.texts.length });
    } else if (selection.type === 'visual' && selectedVisual) {
      const copy = {
        ...selectedVisual,
        id: crypto.randomUUID(),
        x: Math.min(1 - selectedVisual.width, selectedVisual.x + 0.04),
        y: Math.min(1 - selectedVisual.height, selectedVisual.y + 0.04),
      };
      updateScene((previous) => ({ ...previous, visuals: [...previous.visuals, copy] }));
      setSelection({ type: 'visual', index: scene.visuals.length });
    }
  };

  const removeSelection = () => {
    if (!selection) {
      clearBoard();
      return;
    }
    remember();
    if (selection.type === 'stroke') {
      updateScene((previous) => ({ ...previous, strokes: previous.strokes.filter((_, index) => index !== selection.index) }));
    } else if (selection.type === 'text') {
      updateScene((previous) => ({ ...previous, texts: previous.texts.filter((_, index) => index !== selection.index) }));
    } else {
      updateScene((previous) => ({ ...previous, visuals: previous.visuals.filter((_, index) => index !== selection.index) }));
    }
    setSelection(null);
  };

  const clearBoard = () => {
    if (!window.confirm('Clear the entire board? This can be undone.')) return;
    analysisRequestRef.current += 1;
    lastAnalyzedImageRef.current = null;
    retryAnalysisImageRef.current = null;
    setAnalyzing(false);
    setAnalysisError('');
    remember();
    setScene(emptyScene());
    setImage(null);
    setSelection(null);
    setShapeCandidate(null);
    setEquationPrompt('');
    labelSuggestionRef.current = false;
    setSuggestion('');
  };

  const resizeSelection = (factor: number) => {
    if (!selection) return;
    if (selection.type === 'visual' && selectedVisual) {
      const width = Math.max(0.08, Math.min(0.8, selectedVisual.width * factor));
      const height = Math.max(0.08, Math.min(0.8, selectedVisual.height * factor));
      const centerX = selectedVisual.x + selectedVisual.width / 2;
      const centerY = selectedVisual.y + selectedVisual.height / 2;
      remember();
      updateScene((previous) => ({
        ...previous,
        visuals: previous.visuals.map((visual, index) => index === selection.index
          ? {
            ...visual,
            x: Math.max(0, Math.min(1 - width, centerX - width / 2)),
            y: Math.max(0, Math.min(1 - height, centerY - height / 2)),
            width,
            height,
          }
          : visual),
      }));
      return;
    }
    if (selection.type !== 'stroke' || !selectedStroke) return;
    const box = getBounds(selectedStroke.points);
    const centerX = (box.minX + box.maxX) / 2;
    const centerY = (box.minY + box.maxY) / 2;
    remember();
    const resized = {
      ...selectedStroke,
      points: selectedStroke.points.map((point) => ({
        x: Math.max(-1000, Math.min(1000, centerX + (point.x - centerX) * factor)),
        y: Math.max(-1000, Math.min(1000, centerY + (point.y - centerY) * factor)),
      })),
    };
    updateScene((previous) => ({ ...previous, strokes: previous.strokes.map((item, index) => index === selection.index ? resized : item) }));
  };

  const resizeSelectedText = (factor: number) => {
    if (!selectedText || !selection) return;
    remember();
    const scale = Math.max(0.5, Math.min(3, (selectedText.scale || 1) * factor));
    updateScene((previous) => ({
      ...previous,
      texts: previous.texts.map((text, index) => index === selection.index ? { ...text, scale } : text),
    }));
  };

  const editSelectedDiagram = () => {
    if (!selectedVisual?.diagram || !selection || selection.type !== 'visual') return;
    const title = window.prompt('Edit diagram title', selectedVisual.diagram.title);
    if (title === null) return;
    const labels = window.prompt(
      'Edit node labels, one per line (2–8 labels)',
      selectedVisual.diagram.nodes.map((node) => node.label).join('\n'),
    );
    if (labels === null) return;
    const nextLabels = labels.split(/\r?\n/).map((label) => label.trim()).filter(Boolean).slice(0, 8);
    if (!title.trim() || nextLabels.length < 2) {
      setError('A diagram needs a title and at least two node labels.');
      return;
    }
    const nodes = nextLabels.map((label, index) => {
      const current = selectedVisual.diagram!.nodes[index];
      return {
        label: label.slice(0, 48),
        x: current?.x ?? (nextLabels.length === 2 ? 0.28 + index * 0.44 : 0.16 + (index % 3) * 0.34),
        y: current?.y ?? (nextLabels.length === 2 ? 0.5 : 0.24 + Math.floor(index / 3) * 0.28),
      };
    });
    const diagram: BoardDiagram = {
      title: title.trim().slice(0, 80),
      nodes,
      edges: nodes.slice(0, -1).map((_, index) => ({ from: index, to: index + 1 })),
    };
    remember();
    updateScene((previous) => ({
      ...previous,
      visuals: previous.visuals.map((visual, index) =>
        index === selection.index ? { ...visual, diagram } : visual),
    }));
    setError('');
    setNotice('Diagram labels and connections updated.');
  };

  const addSuggestedLabels = () => {
    const canvas = canvasRef.current;
    if (!canvas || !selection || !suggestion) return;
    const labels = suggestion.split(/\r?\n/)
      .map((line) => line.replace(/^\s*(?:[•*-]|\d+[.)])\s*/, '').trim())
      .filter((line) => line && !/^(labels?|suggested labels?)\s*:?$/i.test(line))
      .slice(0, 6)
      .map((line) => line.slice(0, 64));
    if (!labels.length) {
      setError('No usable labels were returned. Edit the suggestions or try again.');
      return;
    }
    const context = canvas.getContext('2d');
    if (!context) {
      setError('The board could not prepare label placement.');
      return;
    }
    const bounds = selection.type === 'visual' && selectedVisual
      ? {
        minX: selectedVisual.x,
        maxX: selectedVisual.x + selectedVisual.width,
        minY: selectedVisual.y,
        maxY: selectedVisual.y + selectedVisual.height,
      }
      : selection.type === 'stroke' && selectedStroke
        ? getBounds(selectedStroke.points)
        : null;
    if (!bounds) return;
    context.font = '600 18px system-ui, sans-serif';
    const longestLabelWidth = Math.max(...labels.map((label) => context.measureText(label).width)) + 12;
    const labelWidth = Math.min(0.7, longestLabelWidth / Math.max(canvas.clientWidth, 1));
    const labelX = bounds.maxX + labelWidth + 0.025 <= 1
      ? bounds.maxX + 0.025
      : Math.max(0.02, bounds.minX - labelWidth - 0.025);
    const lineHeight = 30 / Math.max(canvas.clientHeight, 1);
    const labelY = bounds.minY - labels.length * lineHeight - 0.02 >= 0
      ? bounds.minY - labels.length * lineHeight - 0.02
      : Math.min(0.98 - (labels.length - 1) * lineHeight, bounds.maxY + 0.02);
    const textItems = labels.map((text, index) => ({
      text,
      x: Math.max(0.02, Math.min(0.98 - labelWidth, labelX)),
      y: Math.max(0.02, Math.min(0.98, labelY + index * lineHeight)),
      color,
    }));
    remember();
    updateScene((previous) => ({ ...previous, texts: [...previous.texts, ...textItems] }));
    labelSuggestionRef.current = false;
    setSuggestion('');
    setSelection(null);
    setNotice(`${textItems.length} editable label${textItems.length === 1 ? '' : 's'} added to the board.`);
  };

  const addText = () => {
    const value = textDraft.trim();
    if (!value) return;
    const isEquation = /[=≤≥]/.test(value) && /[a-z0-9]/i.test(value);
    remember();
    const item = { text: value.slice(0, 120), x: 0.5, y: 0.5, color };
    updateScene((previous) => ({ ...previous, texts: [...previous.texts, item] }));
    setSelection(isEquation ? null : { type: 'text', index: scene.texts.length });
    setEquationPrompt(isEquation ? value : '');
    setTextDraft('');
    setTextComposerOpen(false);
    setMathKeyboardOpen(false);
  };

  const presentEquationAsGraph = (equation: string) => {
    if (!parseQuadraticEquation(equation)) return;
    addBoardVisual('parabola', equation);
    setEquationPrompt('');
    setNotice('Added an editable graph. Select it to move, resize, or change its equation.');
  };

  const addCleanCube = () => {
    addBoardVisual('cube2d');
  };

  const findOpenVisualPosition = (width: number, height: number, sourceScene = sceneRef.current) => {
    const candidates = [
      { x: 0.5 - width / 2, y: 0.5 - height / 2 },
      { x: 0.04, y: 0.04 },
      { x: 0.96 - width, y: 0.04 },
      { x: 0.04, y: 0.96 - height },
      { x: 0.96 - width, y: 0.96 - height },
      { x: 0.5 - width / 2, y: 0.04 },
      { x: 0.04, y: 0.5 - height / 2 },
      { x: 0.96 - width, y: 0.5 - height / 2 },
      { x: 0.5 - width / 2, y: 0.96 - height },
    ];
    const overlap = (
      first: { x: number; y: number; width: number; height: number },
      second: { x: number; y: number; width: number; height: number },
    ) => {
      const overlapWidth = Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x));
      const overlapHeight = Math.max(0, Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y));
      return overlapWidth * overlapHeight / Math.max(first.width * first.height, 0.0001);
    };
    const score = (position: { x: number; y: number }) => {
      const area = { ...position, width, height };
      let total = 0;
      sourceScene.strokes.forEach((stroke) => {
        const bounds = getBounds(stroke.points);
        const pointsInside = stroke.points.filter((point) =>
          point.x >= area.x && point.x <= area.x + width &&
          point.y >= area.y && point.y <= area.y + height).length;
        total += pointsInside / Math.max(stroke.points.length, 1);
        total += overlap(area, {
          x: bounds.minX,
          y: bounds.minY,
          width: Math.max(0.004, bounds.maxX - bounds.minX),
          height: Math.max(0.004, bounds.maxY - bounds.minY),
        }) * 0.2;
      });
      sourceScene.texts.forEach((text) => {
        total += overlap(area, text.kind === 'explanation'
          ? { x: text.x, y: text.y, width: text.width || 0.48, height: text.height || 0.42 }
          : { x: text.x, y: text.y - 0.025, width: Math.min(0.5, text.text.length * 0.012), height: 0.05 });
      });
      sourceScene.visuals.forEach((visual) => {
        total += overlap(area, { x: visual.x, y: visual.y, width: visual.width, height: visual.height });
      });
      if (sourceScene.graphOnBoard) {
        total += overlap(area, { x: 0.12, y: 0.12, width: 0.76, height: 0.7 });
      }
      return total;
    };
    return candidates.reduce((best, candidate) => score(candidate) < score(best) ? candidate : best);
  };

  const addBoardVisual = (kind: BoardVisualKind, equation?: string, diagram?: BoardDiagram) => {
    const visualWidth = kind === 'diagram' ? 0.46 : kind === 'parabola' || kind === 'newton' ? 0.34 : 0.26;
    const visualHeight = kind === 'diagram' ? 0.42 : 0.3;
    const position = findOpenVisualPosition(visualWidth, visualHeight);
    const visual: BoardVisual = {
      id: crypto.randomUUID(),
      kind,
      x: position.x,
      y: position.y,
      width: visualWidth,
      height: visualHeight,
      rotation: 0,
      ...(kind === 'newton' ? { mass: 1200, acceleration: 4 } : {}),
      ...(kind === 'parabola' && (equation || scene.recognizedText)
        ? { equation: equation || scene.recognizedText }
        : {}),
      ...(kind === 'diagram' && diagram ? { diagram } : {}),
    };
    remember();
    updateScene((previous) => ({
      ...previous,
      visuals: [...previous.visuals, visual],
      ...(kind === 'parabola' && (equation || scene.recognizedText) ? {
        equation: equation || scene.recognizedText,
        graphOnBoard: false,
      } : {}),
    }));
    setSelection({ type: 'visual', index: scene.visuals.length });
    setSuggestion('');
    setNotice(`Added an editable ${getBoardVisualLabel(kind)} to the whiteboard.`);
  };

  const toggleEquationGraph = (enabled: boolean) => {
    if (enabled) {
      addBoardVisual('parabola', scene.equation);
      return;
    }
    const graphIndex = scene.visuals.map((visual) =>
      visual.kind === 'parabola' && (visual.equation || scene.equation) === scene.equation).lastIndexOf(true);
    if (graphIndex < 0) return;
    remember();
    updateScene((previous) => ({
      ...previous,
      visuals: previous.visuals.filter((_, index) => index !== graphIndex),
    }));
    setSelection(null);
    setNotice('Removed the selected equation graph.');
  };

  const addReferencePhoto = (photo: BoardReferenceImage) => {
    const width = 0.34;
    const height = 0.3;
    const position = findOpenVisualPosition(width, height);
    const visual: BoardVisual = {
      id: crypto.randomUUID(),
      kind: 'photo',
      x: position.x,
      y: position.y,
      width,
      height,
      rotation: 0,
      imageUrl: photo.url,
      imageAlt: photo.alt,
      attribution: photo.attribution,
      attributionUrl: photo.attributionUrl,
    };
    remember();
    updateScene((previous) => ({ ...previous, visuals: [...previous.visuals, visual] }));
    setSelection({ type: 'visual', index: scene.visuals.length });
    setNotice(`Added a real-world photo reference by ${photo.attribution}.`);
  };

  const insertMathSymbol = (symbol: string) => {
    const input = textRef.current;
    const start = input?.selectionStart ?? textDraft.length;
    const end = input?.selectionEnd ?? textDraft.length;
    const updated = `${textDraft.slice(0, start)}${symbol}${textDraft.slice(end)}`.slice(0, 120);
    setTextDraft(updated);
    window.setTimeout(() => {
      input?.focus();
      const cursor = Math.min(start + symbol.length, updated.length);
      input?.setSelectionRange(cursor, cursor);
    }, 0);
  };

  const editSuggestion = () => {
    setTextDraft(getSuggestedText(suggestion, scene.recognizedText).slice(0, 120));
    setTextComposerOpen(true);
    setMathKeyboardOpen(false);
    window.setTimeout(() => textRef.current?.focus(), 0);
  };

  const editSelectedText = () => {
    if (!selectedText || !selection) return;
    const value = window.prompt('Edit board text', selectedText.text);
    if (value === null) return;
    remember();
    updateScene((previous) => ({
      ...previous,
      texts: previous.texts.map((text, index) => index === selection.index
        ? { ...text, text: value.slice(0, text.kind === 'explanation' ? 1600 : 120) }
        : text),
    }));
  };

  const placeExplanation = (response: string) => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error('The Smartboard is not ready to place an explanation.');
    const bounds = canvas.getBoundingClientRect();
    const context = canvas.getContext('2d');
    if (!context || !bounds.width || !bounds.height) {
      throw new Error('The Smartboard could not measure available space for the explanation.');
    }
    const currentScene = sceneRef.current;
    const currentImage = boardImageRef.current;

    const text = formatAIResponse(response).slice(0, 1600);
    const zoom = Math.max(view.zoom, 0.5);
    const width = Math.min(0.9, Math.min(0.72, Math.max(0.4, 560 / bounds.width)) / zoom);
    const padding = 22 / zoom;
    const fontSize = Math.max(14, Math.min(17, width * bounds.width * zoom * 0.04)) / zoom;
    context.font = `400 ${fontSize}px system-ui, sans-serif`;
    const lines = wrapCanvasText(context, text, width * bounds.width - padding * 2);
    const height = Math.min(0.9, Math.max(0.1, Math.min(0.82 / zoom, (lines.length * fontSize * 1.4 + padding * 2 + 38 / zoom) / bounds.height)));
    const visibleLeft = (-view.x) / (bounds.width * zoom);
    const visibleRight = (bounds.width - view.x) / (bounds.width * zoom);
    const visibleTop = (-view.y) / (bounds.height * zoom);
    const visibleBottom = (bounds.height - view.y) / (bounds.height * zoom);
    const xPositions = [
      visibleLeft + 16 / (bounds.width * zoom),
      (visibleLeft + visibleRight - width) / 2,
      visibleRight - width - 16 / (bounds.width * zoom),
    ].map((x) => Math.max(-1000, Math.min(1000 - width, x)));
    const yPositions = [
      visibleTop + 16 / (bounds.height * zoom),
      (visibleTop + visibleBottom - height) / 2,
      visibleBottom - height - 16 / (bounds.height * zoom),
    ].map((y) => Math.max(-1000, Math.min(1000 - height, y)));
    const positions = xPositions
      .flatMap((x) => yPositions
        .map((y) => ({ x, y })));
    const overlap = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) => {
      const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
      const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
      return width * height / Math.max(a.width * a.height, 0.0001);
    };
    const scorePosition = (candidate: { x: number; y: number }) => {
      const area = { ...candidate, width, height };
      let score = 0;
      currentScene.strokes.forEach((stroke) => {
        const pointsInside = stroke.points.filter((point) =>
          point.x >= area.x && point.x <= area.x + width &&
          point.y >= area.y && point.y <= area.y + height).length;
        const pointRatio = pointsInside / Math.max(stroke.points.length, 1);
        const strokeBounds = getBounds(stroke.points);
        const boundsOverlap = overlap(area, {
          x: strokeBounds.minX,
          y: strokeBounds.minY,
          width: Math.max(0.004, strokeBounds.maxX - strokeBounds.minX),
          height: Math.max(0.004, strokeBounds.maxY - strokeBounds.minY),
        });
        score += Math.max(pointRatio, boundsOverlap * 0.2);
      });
      currentScene.texts.forEach((item) => {
        const itemBounds = item.kind === 'explanation'
          ? { x: item.x, y: item.y, width: item.width || 0.48, height: item.height || 0.42 }
          : { x: item.x, y: item.y - 0.025, width: Math.min(0.5, item.text.length * 0.012), height: 0.05 };
        score += overlap(area, itemBounds) * 2;
      });
      currentScene.visuals.forEach((visual) => {
        score += overlap(area, { x: visual.x, y: visual.y, width: visual.width, height: visual.height }) * 2;
      });
      if (currentScene.graphOnBoard) {
        score += overlap(area, { x: 0.12, y: 0.12, width: 0.76, height: 0.7 }) * 2;
      }
      if (currentImage && imageRef.current?.naturalWidth && imageRef.current.naturalHeight) {
        const imageScale = Math.min(bounds.width * 0.8 / imageRef.current.naturalWidth, bounds.height * 0.8 / imageRef.current.naturalHeight);
        const imageWidth = imageRef.current.naturalWidth * imageScale / bounds.width;
        const imageHeight = imageRef.current.naturalHeight * imageScale / bounds.height;
        score += overlap(area, { x: (1 - imageWidth) / 2, y: (1 - imageHeight) / 2, width: imageWidth, height: imageHeight }) * 2;
      }
      return score;
    };
    const position = positions
      .map((candidate) => ({ ...candidate, score: scorePosition(candidate) }))
      .reduce((best, candidate) => candidate.score < best.score ? candidate : best);
    const note: BoardText = {
      text,
      x: Math.max(-1000, Math.min(1000, position.x)),
      y: Math.max(-1000, Math.min(1000, position.y)),
      color: '#1f2937',
      kind: 'explanation',
      width,
      height,
    };
    remember();
    updateScene((previous) => ({ ...previous, texts: [...previous.texts, note] }));
    setSelection(null);
    setSuggestion('');
    setNotice('Explanation added to the clearest available area. Select Edit to move it if needed.');
  };

  const askAI = async (instruction: string, explainOnBoard = false) => {
    if (!canvasRef.current) return;
    const requestId = ++analysisRequestRef.current;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const incompleteEquation = explainOnBoard
        ? createIncompleteEquationClarification(sceneRef.current.recognizedText)
        : null;
      if (incompleteEquation) {
        placeExplanation(incompleteEquation);
        setNotice('The equation is incomplete. Complete it before asking for a solution.');
        return;
      }
      const response = await withTimeout(onAnalyzeDrawing(canvasRef.current.toDataURL('image/png'), instruction));
      if (requestId !== analysisRequestRef.current) return;
      if (!response?.trim()) throw new Error('FaceMeX did not return a suggestion. Please try again.');
      if (explainOnBoard) {
        placeExplanation(response);
        setAIResult(response);
        setSuggestion('');
      } else {
        setAIResult(response);
      }
    } catch (reason) {
      if (requestId === analysisRequestRef.current) {
        setError(reason instanceof Error ? reason.message : 'FaceMeX could not analyze the board.');
      }
    } finally {
      setBusy(false);
    }
  };

  const solveOnBoard = async (expression: string) => {
    const canvas = canvasRef.current;
    if (!canvas || busy) return;
    const requestId = ++analysisRequestRef.current;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const clarification = createIncompleteEquationClarification(expression);
      if (clarification) {
        placeExplanation(clarification);
        setNotice('The equation is incomplete. Complete it before asking for a solution.');
        return;
      }
      const checkedQuadraticExplanation = createQuadraticFunctionExplanation(expression);
      if (checkedQuadraticExplanation) {
        placeExplanation(checkedQuadraticExplanation);
        setNotice('Added a checked, step-by-step explanation to the board.');
        return;
      }
      const response = await withTimeout(onSolve(expression, canvas.toDataURL('image/png')));
      if (requestId !== analysisRequestRef.current) return;
      if (!response?.trim()) throw new Error('FaceMeX did not return an explanation. Please try again.');
      setAIResult(response);
      placeExplanation(response);
    } catch (reason) {
      if (requestId === analysisRequestRef.current) {
        setError(reason instanceof Error ? reason.message : 'FaceMeX could not explain this content.');
      }
    } finally {
      setBusy(false);
    }
  };

  const suggestSelectedLabels = async () => {
    if (!canvasRef.current || !selection || (!selectedStroke && !selectedVisual) || busy) return;
    const requestId = ++analysisRequestRef.current;
    labelSuggestionRef.current = false;
    setBusy(true);
    setError('');
    setNotice('');
    setSuggestion('');
    try {
      const response = await withTimeout(onAnalyzeDrawing(
        canvasRef.current.toDataURL('image/png'),
        'Suggest 2–6 short, accurate educational labels for the selected visible drawing or object. Label only parts that are clearly present or directly supported by the drawing. Return only the labels, one per line, with no numbering, explanation, headings, or Markdown. If the drawing is unclear, return one concise clarification question instead of labels.',
      ));
      if (requestId !== analysisRequestRef.current) return;
      if (!response?.trim()) throw new Error('FaceMeX did not return any labels.');
      const formatted = formatAIResponse(response);
      if (/^(what|which|could|can|please|is this|are these|clarify)/i.test(formatted.trim())) {
        setError(formatted.trim());
        return;
      }
      labelSuggestionRef.current = true;
      setSuggestion(formatted);
    } catch (reason) {
      if (requestId === analysisRequestRef.current) {
        setError(reason instanceof Error ? reason.message : 'FaceMeX could not suggest labels.');
      }
    } finally {
      if (requestId === analysisRequestRef.current) setBusy(false);
    }
  };

  const demonstrateBoard = async () => {
    const canvas = canvasRef.current;
    if (!canvas || busy) return;
    const hasContent = sceneRef.current.strokes.length > 0 ||
      sceneRef.current.texts.length > 0 ||
      sceneRef.current.visuals.length > 0 ||
      sceneRef.current.graphOnBoard ||
      Boolean(boardImageRef.current);
    if (!hasContent) {
      setError('Add a drawing, note, equation, or image before creating a demonstration.');
      return;
    }

    const requestId = ++analysisRequestRef.current;
    setBusy(true);
    setError('');
    setNotice('');
    setSuggestion('');
    try {
      const response = await withTimeout(onAnalyzeDrawing(
        canvas.toDataURL('image/png'),
        [
          'Interpret the attached complete teaching board and choose exactly one truthful visual demonstration that best explains its main visible idea. Preserve the learner’s actual values and subject; do not infer missing data. Prefer an editable native 2D shape or a quadratic graph when appropriate. Use a supported 3D-style model only for a clear spatial concept: cube, sphere, triangular prism, water molecule, or Newton’s second law. For a concrete real-world physical object that is not better represented by a supported diagram or model, request a relevant real photograph. Never choose a photo for a mathematical graph or abstract concept.',
          'Use only these 2D/GRAPH values: triangle, circle, cube2d, parabola, diagram, none. Use only these 3D MODEL values: cube, sphere, prism, water, newton, none. Prefer editable 2D shapes or a graph for clearly recognized geometry or quadratic equations. For other readable concepts, use a small 2D diagram with 2–6 concise labelled nodes and directional links. Return exactly five plain-text lines, with one value per line, and no other text:\n2D/GRAPH: <one allowed value>\n3D MODEL: <one allowed value>\nPHOTO QUERY: <short specific physical-object search phrase or none>\nEQUATION: <exactly visible quadratic equation or none>\nDIAGRAM: <single-line JSON object with title, nodes containing label/x/y, and edges containing from/to/optional label; or none>\nChoose at most one supported visual kind across the first two lines. Use none for the unused visual kind. Select parabola only for a clearly supported quadratic; never invent an equation. For a diagram, use x and y positions from 0.1 to 0.9, include 2–6 nodes and clear connections, avoid overlapping nodes, and preserve the board’s meaning.',
        ].join('\n\n'),
      ));
      if (requestId !== analysisRequestRef.current) return;
      if (!response?.trim()) throw new Error('FaceMeX could not identify a visual demonstration.');

      const getLine = (label: string) => response.split(/\r?\n/)
        .find((line) => line.trim().toLowerCase().startsWith(`${label.toLowerCase()}:`))
        ?.trim().slice(label.length + 1)
        .trim()
        .replace(/^["'`]|["'`]$/g, '') || '';
      const normalizeChoice = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
      const twoDChoice = normalizeChoice(getLine('2D/GRAPH'));
      const threeDChoice = normalizeChoice(getLine('3D MODEL'));
      const twoDVisuals: Record<string, BoardVisualKind> = {
        triangle: 'triangle',
        circle: 'circle',
        cube2d: 'cube2d',
        parabola: 'parabola',
        diagram: 'diagram',
      };
      const threeDVisuals: Record<string, BoardVisualKind> = {
        cube: 'cube',
        sphere: 'sphere',
        prism: 'prism',
        water: 'water',
        newton: 'newton',
      };
      const visualKind = twoDVisuals[twoDChoice] || threeDVisuals[threeDChoice];
      if (visualKind) {
        const equation = getLine('EQUATION');
        let diagram: BoardDiagram | undefined;
        if (visualKind === 'diagram') {
          try {
            const parsed: unknown = JSON.parse(getLine('DIAGRAM'));
            if (!isBoardDiagram(parsed)) throw new Error('The diagram data was incomplete.');
            diagram = parsed;
          } catch {
            throw new Error('FaceMeX could not create a readable 2D diagram from this board. Keep the original work unchanged and try again.');
          }
        }
        addBoardVisual(visualKind, equation && !/^none$/i.test(equation) ? equation : undefined, diagram);
        return;
      }

      const photoQuery = getLine('PHOTO QUERY');
      if (!photoQuery || /^(none|n\/a|not applicable)$/i.test(photoQuery)) {
        throw new Error('No supported 2D, graph, 3D-style, or real-object demonstration could be identified. Keep the original work unchanged and try a clearer board image.');
      }
      const photo = await withTimeout(onSearchReferenceImage(photoQuery));
      if (requestId !== analysisRequestRef.current) return;
      if (!photo) throw new Error(`No relevant credited reference photo was found for “${photoQuery}”.`);
      addReferencePhoto(photo);
    } catch (reason) {
      if (requestId === analysisRequestRef.current) {
        setError(reason instanceof Error ? reason.message : 'FaceMeX could not create a visual demonstration.');
      }
    } finally {
      if (requestId === analysisRequestRef.current) setBusy(false);
    }
  };

  const recognizeSelectedText = async () => {
    if (!canvasRef.current) return;
    const requestId = ++analysisRequestRef.current;
    setBusy(true);
    setError('');
    try {
      const response = await withTimeout(onRecognizeDrawing(canvasRef.current.toDataURL('image/png')));
      if (requestId !== analysisRequestRef.current) return;
      if (!response?.trim()) throw new Error('No readable writing was found.');
      setAIResult(/^recognition:/im.test(response) ? response : `Recognition: ${response.trim()}`);
    } catch (reason) {
      if (requestId === analysisRequestRef.current) {
        setError(reason instanceof Error ? reason.message : 'FaceMeX could not recognize the writing.');
      }
    } finally {
      setBusy(false);
    }
  };

  const acceptSuggestion = () => {
    if (!suggestion) return;
    if (labelSuggestionRef.current) {
      addSuggestedLabels();
      return;
    }
    remember();
    const item = { text: getSuggestedText(suggestion, scene.recognizedText).slice(0, 120), x: 0.5, y: 0.2, color };
    updateScene((previous) => ({ ...previous, texts: [...previous.texts, item] }));
    setSelection({ type: 'text', index: scene.texts.length });
    setSuggestion('');
    if (/[=≤≥]/.test(item.text) && /[a-z0-9]/i.test(item.text)) setEquationPrompt(item.text);
  };

  const replaceSelectedTextWithSuggestion = () => {
    if (!selectedText || !selection) return;
    remember();
    const replacement = getSuggestedText(suggestion, scene.recognizedText).slice(0, 120);
    updateScene((previous) => ({
      ...previous,
      texts: previous.texts.map((text, index) => index === selection.index ? { ...text, text: replacement } : text),
    }));
    setSuggestion('');
  };

  const retryAnalysis = () => {
    if (!retryAnalysisImageRef.current) return;
    setAnalysisError('');
    void runAutoAnalysis(retryAnalysisImageRef.current);
  };

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
      setError('Choose an image file no larger than 10 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      analysisRequestRef.current += 1;
      setAnalyzing(false);
      remember();
      setImage(String(reader.result || ''));
      setError('');
    };
    reader.onerror = () => setError('The image could not be loaded.');
    reader.readAsDataURL(file);
  };

  const saveBoard = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    const bounds = canvasRef.current?.getBoundingClientRect();
    const draft: WorkspaceSmartboardLessonDraft = {
      ...(savedBoard ? { id: savedBoard.id, conversationId: savedBoard.conversationId, createdAt: savedBoard.createdAt } : {}),
      title: boardTitle.trim() || 'Untitled board',
      scene: {
        strokes: scene.strokes,
        labels: scene.texts,
        visuals: scene.visuals,
        graphOnBoard: scene.graphOnBoard,
        equation: scene.equation,
        boardSize: scene.boardSize,
        canvasStyle: 'whiteboard',
        boardDimensions: bounds ? { width: Math.round(bounds.width), height: Math.round(bounds.height) } : null,
        view,
        recognizedText: scene.recognizedText,
        subject: scene.subject,
        visualModel: scene.visualModel,
        suggestion,
      },
      ...(image ? { image: { id: crypto.randomUUID(), name: 'Board image', dataUrl: image } } : {}),
    };
    try {
      const saved = await onSaveLesson(draft);
      setSavedBoard(saved);
      setBoardTitle(saved.title);
      setNotice('Board saved.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The board could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const loadBoards = async () => {
    setBusy(true);
    setError('');
    try {
      setSavedBoards(await onListLessons());
      setSavedListOpen(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Saved boards could not be loaded.');
    } finally {
      setBusy(false);
    }
  };

  const restoreBoard = (board: WorkspaceSmartboardLesson) => {
    analysisRequestRef.current += 1;
    const savedScene = board.scene;
    const strokes = Array.isArray(savedScene.strokes)
      ? savedScene.strokes.filter(isStroke).map((stroke) => ({
        ...stroke,
        tool: isTool(stroke.tool) ? stroke.tool : 'pen',
      }))
      : [];
    const texts = Array.isArray(savedScene.labels) ? savedScene.labels.filter(isBoardText) : [];
    const restoredEquation = typeof savedScene.equation === 'string' ? savedScene.equation : 'y = x² - 3';
    const visuals = Array.isArray(savedScene.visuals) ? savedScene.visuals.filter(isBoardVisual) : [];
    const restoredGraph = savedScene.graphOnBoard === true && parseQuadraticEquation(restoredEquation)
      ? {
        id: crypto.randomUUID(),
        kind: 'parabola' as const,
        x: 0.12,
        y: 0.12,
        width: 0.76,
        height: 0.7,
        rotation: 0,
        equation: restoredEquation,
      }
      : null;
    const restoredView = savedScene.view && typeof savedScene.view === 'object'
      ? savedScene.view as Partial<ViewTransform>
      : {};
    const savedDimensions = savedScene.boardDimensions && typeof savedScene.boardDimensions === 'object'
      ? savedScene.boardDimensions as Record<string, unknown>
      : {};
    const savedWidth = typeof savedDimensions.width === 'number' && Number.isFinite(savedDimensions.width) && savedDimensions.width > 0
      ? savedDimensions.width
      : null;
    const savedHeight = typeof savedDimensions.height === 'number' && Number.isFinite(savedDimensions.height) && savedDimensions.height > 0
      ? savedDimensions.height
      : null;
    const currentBounds = canvasRef.current?.getBoundingClientRect();
    const restoredX = typeof restoredView.x === 'number' && Number.isFinite(restoredView.x) ? restoredView.x : 0;
    const restoredY = typeof restoredView.y === 'number' && Number.isFinite(restoredView.y) ? restoredView.y : 0;
    const restoredModel = isWorkspaceLearningModelId(savedScene.visualModel) ? savedScene.visualModel : null;
    setScene({
      strokes,
      texts,
      visuals: restoredGraph ? [...visuals, restoredGraph] : visuals,
      equation: restoredEquation,
      graphOnBoard: savedScene.graphOnBoard === true && !restoredGraph,
      boardSize: savedScene.boardSize === 'wide' || savedScene.boardSize === 'portrait' ? savedScene.boardSize : 'fit',
      recognizedText: typeof savedScene.recognizedText === 'string' ? savedScene.recognizedText : '',
      subject: typeof savedScene.subject === 'string' ? savedScene.subject : '',
      visualModel: restoredModel,
    });
    setView({
      zoom: typeof restoredView.zoom === 'number' && Number.isFinite(restoredView.zoom)
        ? Math.max(0.5, Math.min(3, restoredView.zoom))
        : 1,
      x: savedWidth && currentBounds?.width ? restoredX * currentBounds.width / savedWidth : restoredX,
      y: savedHeight && currentBounds?.height ? restoredY * currentBounds.height / savedHeight : restoredY,
    });
    setImage(board.image?.dataUrl || null);
    setBusy(false);
    setAnalyzing(false);
    setSuggestion(typeof savedScene.suggestion === 'string' ? savedScene.suggestion : '');
    setAnalysisError('');
    lastAnalyzedImageRef.current = null;
    retryAnalysisImageRef.current = null;
    setSelection(null);
    setHistory([]);
    setFuture([]);
    setBoardTitle(board.title);
    setSavedBoard(board);
    setSavedListOpen(false);
    setNotice('Board restored.');
  };

  const downloadBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${(boardTitle || 'facemex-board').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const changeMode = (next: 'edit' | 'markup' | 'resize') => {
    analysisRequestRef.current += 1;
    setAnalyzing(false);
    setMode(next);
    if (next === 'markup') {
      setSelection(null);
      setTool('pen');
    }
  };

  const toggleVoiceInput = () => {
    if (voiceListening) {
      speechRecognitionRef.current?.stop();
      setVoiceListening(false);
      return;
    }

    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice input is not supported by this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-ZA';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript.trim();
      if (transcript) {
        setAiPrompt((current) => current ? `${current.trimEnd()} ${transcript}` : transcript);
        setError('');
      }
    };
    recognition.onerror = () => {
      setVoiceListening(false);
      setError('Voice input failed. Check microphone permission and try again.');
    };
    recognition.onend = () => setVoiceListening(false);

    try {
      speechRecognitionRef.current = recognition;
      recognition.start();
      setVoiceListening(true);
      setError('');
    } catch {
      setVoiceListening(false);
      setError('The microphone could not be started.');
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => { setAnalyzing(false); setOpen(true); }}
        className="h-9 shrink-0 gap-2 rounded-full border border-white/10 px-3 text-white/80 hover:bg-white/10 hover:text-white"
        aria-label="Open AI Smartboard"
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Smartboard</span>
      </Button>
      <Dialog open={open} onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          analysisRequestRef.current += 1;
          setAnalyzing(false);
          speechRecognitionRef.current?.stop();
          setVoiceListening(false);
          lastAnalyzedImageRef.current = null;
          retryAnalysisImageRef.current = null;
        }
        setOpen(nextOpen);
      }}>
        <DialogContent className="!fixed !inset-0 !left-0 !top-0 !z-[100] !flex !h-[100dvh] !max-h-[100dvh] !w-screen !max-w-none !translate-x-0 !translate-y-0 !flex-col !gap-0 !overflow-hidden !rounded-none !border-0 !bg-[#111112] !p-0 text-white [&>button:last-child]:hidden">
          <DialogTitle className="sr-only">FaceMeX Smartboard</DialogTitle>
          <DialogDescription className="sr-only">A full-screen whiteboard for drawing, editing and saving your work.</DialogDescription>
          <main className="relative min-h-0 flex-1 overflow-hidden bg-[#111112]">
            <header className="absolute left-3 top-[calc(env(safe-area-inset-top)_+_0.65rem)] z-40 flex h-11 items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-11 w-11 shrink-0 rounded-full border border-white/10 bg-[#29292b] text-white shadow-lg hover:bg-[#38383a]"
                aria-label="Close Smartboard"
                title="Close"
                onClick={() => { analysisRequestRef.current += 1; setAnalyzing(false); lastAnalyzedImageRef.current = null; retryAnalysisImageRef.current = null; setOpen(false); }}
              >
                <X className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-10 w-10 shrink-0 rounded-full border border-white/10 bg-[#29292b] text-white/85 shadow-lg hover:bg-[#38383a]"
                aria-label={sidebarOpen ? 'Close Smartboard sidebar' : 'Open Smartboard sidebar'}
                aria-expanded={sidebarOpen}
                title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                onClick={() => setSidebarOpen((value) => !value)}
              >
                {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              </Button>
            </header>
            <section aria-label="Whiteboard canvas" className="absolute inset-0 flex items-center justify-center overflow-hidden bg-white">
            <div className="h-full w-full overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  className={`block h-full w-full touch-none bg-white ${mode === 'markup' ? 'cursor-crosshair' : 'cursor-default'}`}
                  onPointerDown={pointerDown}
                  onPointerMove={pointerMove}
                  onPointerUp={pointerUp}
                  onPointerCancel={pointerUp}
                  aria-label="White drawing canvas. Draw with touch, stylus or mouse; use two fingers to zoom and pan."
                />
              </div>
            </section>

            {!presentation && sidebarOpen && (
              <nav
                aria-label="Smartboard tools"
                className="absolute bottom-[calc(env(safe-area-inset-bottom)_+_4.25rem)] left-1/2 z-30 flex max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-0.5 overflow-x-auto rounded-full border border-white/10 bg-[#181819]/95 p-1 shadow-lg backdrop-blur-md sm:gap-1.5 sm:p-1.5"
              >
                <Button type="button" size="icon" variant="ghost" className={`h-[30px] w-[30px] shrink-0 rounded-full text-white hover:bg-white/10 sm:h-10 sm:w-10 ${mode === 'edit' ? 'bg-white/15' : ''}`} aria-label="Select and move" title="Select and move" aria-pressed={mode === 'edit'} onClick={() => changeMode('edit')}><MousePointer2 className="h-4 w-4 sm:h-5 sm:w-5" /></Button>
                <Button type="button" size="icon" variant="ghost" className={`h-[30px] w-[30px] shrink-0 rounded-full text-white hover:bg-white/10 sm:h-10 sm:w-10 ${mode === 'markup' && tool === 'pen' ? 'bg-white/15' : ''}`} aria-label="Pen" title="Pen" aria-pressed={mode === 'markup' && tool === 'pen'} onClick={() => { changeMode('markup'); setTool('pen'); }}><Pencil className="h-4 w-4 sm:h-5 sm:w-5" /></Button>
                <Button type="button" size="icon" variant="ghost" className={`h-[30px] w-[30px] shrink-0 rounded-full text-white hover:bg-white/10 sm:h-10 sm:w-10 ${mode === 'markup' && tool === 'highlighter' ? 'bg-white/15' : ''}`} aria-label="Highlighter" title="Highlighter" aria-pressed={mode === 'markup' && tool === 'highlighter'} onClick={() => { changeMode('markup'); setTool('highlighter'); }}><Highlighter className="h-4 w-4 sm:h-5 sm:w-5" /></Button>
                <Button type="button" size="icon" variant="ghost" className={`h-[30px] w-[30px] shrink-0 rounded-full text-white hover:bg-white/10 sm:h-10 sm:w-10 ${mode === 'markup' && tool === 'eraser' ? 'bg-white/15' : ''}`} aria-label="Eraser" title="Eraser" aria-pressed={mode === 'markup' && tool === 'eraser'} onClick={() => { changeMode('markup'); setTool('eraser'); }}><Eraser className="h-4 w-4 sm:h-5 sm:w-5" /></Button>
                <Button type="button" size="icon" variant="ghost" className="h-[30px] w-[30px] shrink-0 rounded-full text-white hover:bg-white/10 sm:h-10 sm:w-10" aria-label="Add text" title="Add text" onClick={() => { setTextComposerOpen(true); setMathKeyboardOpen(false); window.setTimeout(() => textRef.current?.focus(), 0); }}><Type className="h-4 w-4 sm:h-5 sm:w-5" /></Button>
                <Button type="button" size="icon" variant="ghost" className="h-[30px] w-[30px] shrink-0 rounded-full font-semibold text-white hover:bg-white/10 sm:h-10 sm:w-10" aria-label="Open math input" title="Math input" onClick={() => { setTextComposerOpen(true); setMathKeyboardOpen(true); window.setTimeout(() => textRef.current?.focus(), 0); }}><span aria-hidden="true" className="text-xs sm:text-sm">x²</span></Button>
                <Button type="button" size="icon" variant="ghost" className="h-[30px] w-[30px] shrink-0 rounded-full text-white hover:bg-white/10 sm:h-10 sm:w-10" aria-label="Add image" title="Add image" onClick={() => fileRef.current?.click()}><ImagePlus className="h-4 w-4 sm:h-5 sm:w-5" /></Button>
                <Button type="button" size="icon" variant="ghost" className={`h-[30px] w-[30px] shrink-0 rounded-full text-white hover:bg-white/10 sm:h-10 sm:w-10 ${mode === 'resize' ? 'bg-white/15' : ''}`} aria-label="Pan and zoom" title="Pan and zoom" aria-pressed={mode === 'resize'} onClick={() => changeMode('resize')}><ZoomIn className="h-4 w-4 sm:h-5 sm:w-5" /></Button>
                <Button type="button" size="icon" variant="ghost" className="h-[30px] w-[30px] shrink-0 rounded-full text-white hover:bg-rose-500/30 hover:text-rose-200 sm:h-10 sm:w-10" aria-label={selection ? 'Remove selected object' : 'Clear board'} title={selection ? 'Remove selected object' : 'Clear board'} onClick={removeSelection}><Trash2 className="h-4 w-4 sm:h-5 sm:w-5" /></Button>
              </nav>
            )}

            {sidebarOpen && <header style={{ top: 'calc(env(safe-area-inset-top) + 0.65rem)' }} className="absolute right-3 z-40 flex items-center gap-1 rounded-full border border-white/10 bg-[#29292b]/95 p-1.5 shadow-lg backdrop-blur-md">
              <div className="flex items-center gap-1">
                <Button type="button" size="icon" variant="ghost" className="h-9 w-9 rounded-full text-white/90 hover:bg-white/10" aria-label="Undo" title="Undo" disabled={!history.length} onClick={undo}><Undo2 className="h-5 w-5" /></Button>
                <Button type="button" size="icon" variant="ghost" className="h-9 w-9 rounded-full text-white/90 hover:bg-white/10" aria-label="Redo" title="Redo" disabled={!future.length} onClick={redo}><Redo2 className="h-5 w-5" /></Button>
                <Button type="button" size="icon" variant="ghost" className="h-9 w-9 rounded-full text-white/90 hover:bg-white/10" aria-label="Duplicate selected object" title="Duplicate" disabled={!selection} onClick={duplicate}><Copy className="h-5 w-5" /></Button>
                <details ref={moreMenuRef} className="relative">
                  <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full text-white/90 hover:bg-white/10" aria-label="More board actions" title="More">
                    <MoreHorizontal className="h-5 w-5" />
                  </summary>
                  <div className="absolute right-0 top-full mt-2 max-h-[75dvh] w-[min(90vw,22rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 shadow-2xl">
                    <label className="block text-xs text-slate-500">
                      Board name
                      <input value={boardTitle} onChange={(event) => setBoardTitle(event.target.value)} maxLength={120} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-slate-400" />
                    </label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Button type="button" className="col-span-2 min-h-10 bg-slate-900 text-white hover:bg-slate-700" disabled={busy} onClick={() => { moreMenuRef.current?.removeAttribute('open'); void demonstrateBoard(); }}><Sparkles className="mr-2 h-4 w-4" />Create visual demonstration</Button>
                      <Button type="button" variant="outline" className="min-h-10 border-slate-200 bg-white text-slate-700 hover:bg-slate-50" disabled={busy} onClick={() => void saveBoard()}><Save className="mr-2 h-4 w-4" />Save board</Button>
                      <Button type="button" variant="outline" className="min-h-10 border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={downloadBoard}><Download className="mr-2 h-4 w-4" />Export PNG</Button>
                      <Button type="button" variant="outline" className="min-h-10 border-slate-200 bg-white text-slate-700 hover:bg-slate-50" disabled={busy} onClick={() => void loadBoards()}>Open saved</Button>
                      <Button type="button" variant="outline" className="min-h-10 border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-pressed={presentation} onClick={() => setPresentation((value) => !value)}>{presentation ? 'Exit present' : 'Presentation'}</Button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button type="button" variant="outline" className="min-h-10 border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={() => fileRef.current?.click()}><ImagePlus className="mr-2 h-4 w-4" />Add image</Button>
                      <Button type="button" variant="outline" className="min-h-10 border-slate-200 bg-white text-slate-700 hover:bg-slate-50" aria-pressed={settingsOpen} onClick={() => setSettingsOpen((value) => !value)}><Settings2 className="mr-2 h-4 w-4" />Board settings</Button>
                      <Button type="button" variant="outline" className="min-h-10 border-rose-200 bg-white text-rose-700 hover:bg-rose-50" onClick={clearBoard}><Trash2 className="mr-2 h-4 w-4" />Clear board</Button>
                    </div>
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-900">AI suggestions: {aiSuggestionsEnabled ? 'On' : 'Off'}</p>
                      <p className="mt-1 text-[11px] leading-4 text-slate-500">When on, FaceMeX analyzes a board snapshot after you pause. It never edits your work.</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-2 min-h-10 w-full border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                        aria-pressed={aiSuggestionsEnabled}
                        onClick={toggleAISuggestions}
                      >
                        {aiSuggestionsEnabled ? 'Pause AI suggestions' : 'Enable AI suggestions'}
                      </Button>
                    </div>
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-900">Drawing tools</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        {([
                          ['pen', Pencil, 'Pen'],
                          ['highlighter', Highlighter, 'Highlight'],
                          ['eraser', Eraser, 'Erase'],
                          ['arrow', ArrowRight, 'Arrow'],
                          ['line', Minus, 'Line'],
                          ['rectangle', Square, 'Rectangle'],
                          ['ellipse', Circle, 'Ellipse'],
                          ['triangle', Triangle, 'Triangle'],
                        ] as const).map(([name, Icon, label]) => (
                          <Button key={name} type="button" size="icon" variant="ghost" className={`h-9 w-9 rounded-full ${tool === name ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100'}`} aria-label={label} title={label} aria-pressed={tool === name} onClick={() => { changeMode('markup'); setTool(name); moreMenuRef.current?.removeAttribute('open'); }}>
                            <Icon className="h-4 w-4" />
                          </Button>
                        ))}
                        <input aria-label="Pen colour" type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0" />
                        <input aria-label="Pen thickness" type="range" min="1" max="18" value={width} onChange={(event) => setWidth(Number(event.target.value))} className="w-20 accent-slate-700" />
                        <Button type="button" variant="outline" className="min-h-9 border-slate-200 bg-white px-2 text-xs text-slate-700 hover:bg-slate-100" onClick={() => { setTextComposerOpen(true); setMathKeyboardOpen(false); moreMenuRef.current?.removeAttribute('open'); window.setTimeout(() => textRef.current?.focus(), 0); }}><Type className="mr-1 h-3.5 w-3.5" />Add text</Button>
                      </div>
                    </div>
                    {settingsOpen && (
                      <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <label className="block text-xs text-slate-600">Equation graph (browser-calculated)
                          <input value={scene.equation} onFocus={remember} onChange={(event) => updateScene((previous) => ({ ...previous, equation: event.target.value }))} placeholder="y = x² - 3" className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-slate-400" />
                        </label>
                        <label className="flex min-h-9 items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={scene.graphOnBoard || scene.visuals.some((visual) =>
                              visual.kind === 'parabola' && (visual.equation || scene.equation) === scene.equation)}
                            disabled={!coefficients}
                            onChange={(event) => toggleEquationGraph(event.target.checked)}
                          />
                          Show editable graph on canvas
                        </label>
                        {scene.graphOnBoard && coefficients && (
                          <Button type="button" variant="outline" className="min-h-9 border-slate-200 bg-white text-slate-700 hover:bg-slate-100" disabled={busy} onClick={() => void solveOnBoard(scene.equation)}>Explain equation</Button>
                        )}
                      </div>
                    )}
                    {savedListOpen && (
                      <div className="mt-3 max-h-48 overflow-y-auto rounded-xl border border-white/10 p-2">
                        {savedBoards.length ? savedBoards.map((board) => (
                          <button key={board.id} type="button" className="block min-h-10 w-full rounded-lg px-2 text-left text-sm text-slate-800 hover:bg-slate-100" onClick={() => restoreBoard(board)}>
                            {board.title}<span className="ml-2 text-xs text-slate-500">{new Date(board.createdAt).toLocaleDateString()}</span>
                          </button>
                        )) : <p className="p-2 text-xs text-slate-500">No saved boards yet.</p>}
                      </div>
                    )}
                    {(notice || error) && <p role={error ? 'alert' : 'status'} className={`mt-2 text-xs ${error ? 'text-rose-700' : 'text-emerald-700'}`}>{error || notice}</p>}
                  </div>
                </details>
              </div>
            </header>}

            {equationPrompt && !shapeCandidate && !suggestion && !presentation && (
              <section style={{ top: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="absolute right-3 z-20 w-[min(24rem,calc(100%-1.5rem))] rounded-2xl border border-slate-200 bg-white/95 p-3 text-slate-900 shadow-xl sm:right-6" aria-live="polite">
                <p className="text-sm font-semibold">{isIncompleteEquation(equationPrompt) ? 'This equation is incomplete.' : 'Would you like to present this equation?'}</p>
                <p className="mt-1 truncate text-xs text-slate-600" title={equationPrompt}>{equationPrompt}</p>
                {isIncompleteEquation(equationPrompt)
                  ? <p className="mt-1 text-xs text-slate-600">The right-hand side is missing. What should come after the equals sign?</p>
                  : <p className="mt-1 text-xs text-slate-600">Add a graph, explore teaching visuals, or explain it. Your board stays unchanged until you choose.</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  {!isIncompleteEquation(equationPrompt) && parseQuadraticEquation(equationPrompt) && (
                    <Button type="button" className="min-h-9 bg-slate-900 px-3 text-xs text-white hover:bg-slate-700" onClick={() => presentEquationAsGraph(equationPrompt)}>Add graph</Button>
                  )}
                  {!isIncompleteEquation(equationPrompt) && (
                    <>
                      <Button type="button" variant="outline" className="min-h-9 border-slate-300 bg-white px-3 text-xs text-slate-700 hover:bg-slate-100" disabled={busy} onClick={() => { setEquationPrompt(''); void solveOnBoard(equationPrompt); }}>Explain steps</Button>
                      <Button type="button" variant="outline" className="min-h-9 border-slate-300 bg-white px-3 text-xs text-slate-700 hover:bg-slate-100" disabled={busy} onClick={() => { setEquationPrompt(''); void demonstrateBoard(); }}>Explore visual ideas</Button>
                    </>
                  )}
                  <Button type="button" variant="ghost" className="min-h-9 px-3 text-xs text-slate-600 hover:bg-slate-100" onClick={() => setEquationPrompt('')}>Not now</Button>
                </div>
              </section>
            )}

            {shapeCandidate && !suggestion && !presentation && (
              <section style={{ top: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="absolute right-3 z-20 w-[min(21rem,calc(100%-1.5rem))] rounded-2xl border border-slate-200 bg-white/95 p-3 text-slate-900 shadow-xl sm:right-6" aria-live="polite">
                <p className="text-sm font-medium">This {shapeCandidate.tool === 'line' ? 'line' : `shape may be a ${shapeCandidate.tool}`} looks slightly uneven.</p>
                <p className="mt-1 text-xs text-slate-600">Straighten it with local geometry? No AI is used, and you can undo the change.</p>
                <div className="mt-2 flex gap-2">
                  <Button type="button" className="min-h-9 bg-slate-900 px-3 text-xs text-white hover:bg-slate-700" onClick={applyShapeCleanup}>Straighten drawing</Button>
                  <Button type="button" variant="outline" className="min-h-9 px-3 text-xs" onClick={() => setShapeCandidate(null)}>Keep original</Button>
                </div>
              </section>
            )}
            {error && (
              <p
                role="alert"
                style={{ top: 'calc(env(safe-area-inset-top) + 4.5rem)' }}
                className="absolute right-3 z-20 max-w-[min(22rem,calc(100%-1.5rem))] rounded-xl border border-rose-200/60 bg-white/95 p-3 text-xs text-rose-800 shadow-lg sm:right-6"
              >
                {error}
              </p>
            )}

            {textComposerOpen && !presentation && (
              <form onSubmit={(event) => { event.preventDefault(); addText(); }} className="absolute left-1/2 top-1/2 z-30 flex w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                <div className="flex gap-2">
                  <input ref={textRef} value={textDraft} onChange={(event) => setTextDraft(event.target.value)} maxLength={120} placeholder={mathKeyboardOpen ? 'Type an equation, then add it to the board' : 'Type a note or equation'} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-slate-400" />
                  <Button type="submit" aria-label="Add note to board" className="bg-slate-900 text-white hover:bg-slate-700" disabled={!textDraft.trim()}><Check className="h-4 w-4" /></Button>
                  <Button type="button" variant="ghost" aria-label="Cancel text" onClick={() => { setTextComposerOpen(false); setMathKeyboardOpen(false); }}><X className="h-4 w-4" /></Button>
                </div>
                {mathKeyboardOpen && (
                  <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto rounded-xl border border-white/10 bg-[#181819] p-2" aria-label="Mathematical symbols">
                    {['x²', 'x³', 'xⁿ', 'x₁', 'xₙ', '⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹', '₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉', '√', '∛', 'a/b', 'π', 'θ', '∫', '∑', '≤', '≥', '≠', '()', '[]', '×', '÷', '−', '∂', 'lim', '→'].map((symbol) => (
                      <Button key={symbol} type="button" variant="ghost" aria-label={`Insert ${symbol}`} className="h-9 min-w-10 rounded-full border border-white/10 bg-[#29292b] px-2 text-sm font-medium text-white hover:bg-[#38383a] hover:text-white" onClick={() => insertMathSymbol(symbol)}>{symbol}</Button>
                    ))}
                  </div>
                )}
              </form>
            )}

            {!presentation && selection && (
              <section style={{ top: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="absolute left-1/2 z-20 flex max-h-[22dvh] max-w-[calc(100%-1rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white/95 p-2 text-slate-700 shadow-xl backdrop-blur" aria-label="Selected object actions">
                {selectedText && <Button type="button" variant="ghost" className="min-h-9 px-3 text-xs text-slate-700 hover:bg-slate-100" onClick={editSelectedText}>Edit text</Button>}
                {selectedVisual && <span className="px-2 text-xs capitalize text-slate-600">{getBoardVisualLabel(selectedVisual.kind)}</span>}
                {selectedVisual?.kind === 'parabola' && selection?.type === 'visual' && (
                  <label className="flex items-center gap-2 px-2 text-xs text-slate-600">
                    Equation
                    <input
                      aria-label="Graph equation"
                      value={selectedVisual.equation || scene.equation}
                      maxLength={120}
                      onFocus={remember}
                      onChange={(event) => {
                        const equation = event.target.value;
                        updateScene((previous) => ({
                          ...previous,
                                            equation,
                                            visuals: previous.visuals.map((visual, index) =>
                                              index === selection.index ? { ...visual, equation } : visual),
                                          }));
                      }}
                      className="h-8 w-40 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    />
                  </label>
                )}
                {selectedVisual?.kind === 'diagram' && selectedVisual.diagram && (
                  <Button type="button" variant="ghost" className="min-h-9 px-3 text-xs text-slate-700 hover:bg-slate-100" onClick={editSelectedDiagram}>Edit diagram</Button>
                )}
                {selectedVisual?.kind === 'photo' && selectedVisual.attributionUrl && (
                  <a href={selectedVisual.attributionUrl} target="_blank" rel="noreferrer" className="px-2 text-xs text-slate-600 underline underline-offset-2">
                    Photo by {selectedVisual.attribution || 'Unsplash'} · Unsplash
                  </a>
                )}
                {selectedVisual && (
                  selectedVisual.kind === 'cube' || selectedVisual.kind === 'sphere' ||
                  selectedVisual.kind === 'prism' || selectedVisual.kind === 'water' ||
                  selectedVisual.kind === 'triangle' || selectedVisual.kind === 'diagram' ||
                  selectedVisual.kind === 'photo'
                ) && (
                  <label className="flex items-center gap-2 px-2 text-xs text-slate-600">
                    Rotate
                    <input type="range" min="-3.14" max="3.14" step="0.05" value={selectedVisual.rotation} aria-label={`Rotate ${selectedVisual.kind}`} onPointerDown={remember} onChange={(event) => {
                      const rotation = Number(event.target.value);
                      updateScene((previous) => ({
                        ...previous,
                        visuals: previous.visuals.map((visual, index) => index === selection.index ? { ...visual, rotation } : visual),
                      }));
                    }} className="w-24 accent-slate-700" />
                  </label>
                )}
                {selectedVisual?.kind === 'newton' && (
                  <>
                    <label className="flex items-center gap-2 px-2 text-xs text-slate-600">
                      Mass {selectedVisual.mass || 1200} kg
                      <input type="range" min="100" max="2000" step="100" value={selectedVisual.mass || 1200} aria-label="Demonstration mass in kilograms" onPointerDown={remember} onChange={(event) => {
                        const mass = Number(event.target.value);
                        updateScene((previous) => ({
                          ...previous,
                          visuals: previous.visuals.map((visual, index) => index === selection.index ? { ...visual, mass } : visual),
                        }));
                      }} className="w-20 accent-slate-700" />
                    </label>
                    <label className="flex items-center gap-2 px-2 text-xs text-slate-600">
                      Acceleration {selectedVisual.acceleration ?? 4} m/s²
                      <input type="range" min="0" max="10" step="0.5" value={selectedVisual.acceleration ?? 4} aria-label="Demonstration acceleration in metres per second squared" onPointerDown={remember} onChange={(event) => {
                        const acceleration = Number(event.target.value);
                        updateScene((previous) => ({
                          ...previous,
                          visuals: previous.visuals.map((visual, index) => index === selection.index ? { ...visual, acceleration } : visual),
                        }));
                      }} className="w-20 accent-slate-700" />
                    </label>
                  </>
                )}
                <Button type="button" variant="ghost" className="min-h-9 px-3 text-xs text-slate-700 hover:bg-slate-100" disabled={busy} onClick={() => void recognizeSelectedText()}><Sparkles className="mr-1 h-3.5 w-3.5" />Read text</Button>
                <Button type="button" variant="ghost" className="min-h-9 px-3 text-xs text-slate-700 hover:bg-slate-100" disabled={busy} onClick={() => void askAI('Improve the selected writing for spelling, grammar, clarity and professional tone. Preserve its meaning. Return only the suggested replacement text.')}>Improve</Button>
                <Button type="button" variant="ghost" className="min-h-9 px-3 text-xs text-slate-700 hover:bg-slate-100" disabled={busy} onClick={() => void askAI('Explain the selected work in a clear, professional manner. First identify its context from what is visible. For academic work, teach the concept in logical steps, define specialist terms, and connect the reasoning to the drawing. For business or career work, explain the main point, practical implications, and useful next steps. Use short headings such as “What it shows”, “How it works”, and “Key takeaway” only when they help. Use plain English, preserve notation and values exactly, distinguish observation from inference, and state uncertainty rather than guessing. Keep the explanation under 140 words so it fits as a readable board note; do not include source code or programming syntax, redraw, cover, or claim to edit the work.', true)}>Explain</Button>
                <Button type="button" variant="ghost" className="min-h-9 px-3 text-xs text-slate-700 hover:bg-slate-100" disabled={busy} onClick={() => void demonstrateBoard()}><Sparkles className="mr-1 h-3.5 w-3.5" />Demonstrate on board</Button>
                {(selectedStroke || selectedVisual) && <Button type="button" variant="ghost" className="min-h-9 px-3 text-xs text-slate-700 hover:bg-slate-100" disabled={busy} onClick={() => void suggestSelectedLabels()}><Type className="mr-1 h-3.5 w-3.5" />Add labels</Button>}
                {busy && <span className="px-2 text-xs text-slate-500">Thinking…</span>}
              </section>
            )}

            {!presentation && mode === 'resize' && (
              <div style={{ top: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="absolute right-3 z-20 flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1.5 text-slate-700 shadow-xl">
                <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-slate-700 hover:bg-slate-100" aria-label="Zoom out" onClick={() => setView((current) => ({ ...current, zoom: Math.max(0.5, current.zoom - 0.15) }))}><Minus className="h-4 w-4" /></Button>
                <span className="min-w-12 text-center text-xs text-slate-600">{Math.round(view.zoom * 100)}%</span>
                <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-slate-700 hover:bg-slate-100" aria-label="Zoom in" onClick={() => setView((current) => ({ ...current, zoom: Math.min(3, current.zoom + 0.15) }))}><Plus className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" className="min-h-9 px-2 text-xs text-slate-700 hover:bg-slate-100" onClick={() => setView({ zoom: 1, x: 0, y: 0 })}>Reset view</Button>
                {selectedStroke && (
                  <>
                    <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-slate-700 hover:bg-slate-100" aria-label="Shrink selected object" onClick={() => resizeSelection(0.85)}><Minus className="h-4 w-4" /></Button>
                    <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-slate-700 hover:bg-slate-100" aria-label="Enlarge selected object" onClick={() => resizeSelection(1.15)}><Plus className="h-4 w-4" /></Button>
                  </>
                )}
                {selectedVisual && (
                  <>
                    <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-slate-700 hover:bg-slate-100" aria-label="Shrink selected visual" onClick={() => resizeSelection(0.85)}><Minus className="h-4 w-4" /></Button>
                    <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-slate-700 hover:bg-slate-100" aria-label="Enlarge selected visual" onClick={() => resizeSelection(1.15)}><Plus className="h-4 w-4" /></Button>
                  </>
                )}
                {selectedText && (
                  <>
                    <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-slate-700 hover:bg-slate-100" aria-label="Shrink selected text" onClick={() => resizeSelectedText(0.85)}><Minus className="h-4 w-4" /></Button>
                    <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-slate-700 hover:bg-slate-100" aria-label="Enlarge selected text" onClick={() => resizeSelectedText(1.15)}><Plus className="h-4 w-4" /></Button>
                  </>
                )}
              </div>
            )}

            {analyzing && !presentation && (
              <p style={{ top: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="absolute right-3 z-20 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-600 shadow sm:right-6" role="status">
                Understanding your work…
              </p>
            )}

            {analysisError && !presentation && (
              <section style={{ top: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="absolute right-3 z-20 w-[min(22rem,calc(100%-1.5rem))] rounded-2xl border border-rose-200 bg-white/95 p-3 text-slate-800 shadow-lg sm:right-6" role="alert">
                <p className="text-sm">{analysisError}</p>
                <Button type="button" variant="ghost" className="mt-1 min-h-9 px-2 text-xs text-slate-700 hover:bg-slate-100" onClick={retryAnalysis}>Retry analysis</Button>
              </section>
            )}

            {suggestion && !presentation && (
              <section style={{ top: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="absolute right-3 z-20 max-h-[30dvh] w-[min(22rem,calc(100%-1.5rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white/95 p-3 text-slate-900 shadow-xl sm:right-6" aria-live="polite">
                {recognizedCoefficients && (
                  <p className="mb-2 text-sm font-semibold">Would you like to present this equation with a graph or visual aid?</p>
                )}
                <p className="whitespace-pre-wrap text-sm leading-5">{suggestion}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {onSendToWorkspace && <Button type="button" variant="outline" className="min-h-9 border-slate-200 bg-white text-xs text-slate-700 hover:bg-slate-100" onClick={() => { onSendToWorkspace(suggestion); setOpen(false); }}>Continue in AI workspace</Button>}
                  <Button type="button" className="min-h-9 bg-slate-900 text-xs text-white hover:bg-slate-700" onClick={acceptSuggestion}>{labelSuggestionRef.current ? 'Add labels to board' : 'Add to board'}</Button>
                  <Button type="button" variant="ghost" className="min-h-9 text-xs text-slate-700 hover:bg-slate-100" onClick={editSuggestion}>Edit</Button>
                  {!labelSuggestionRef.current && selectedText && <Button type="button" variant="ghost" className="min-h-9 text-xs text-slate-700 hover:bg-slate-100" onClick={replaceSelectedTextWithSuggestion}>Replace selected text</Button>}
                  {scene.recognizedText && <Button type="button" variant="ghost" className="min-h-9 text-xs text-slate-700 hover:bg-slate-100" disabled={busy} onClick={() => void solveOnBoard(scene.recognizedText)}>Explain</Button>}
                  {recognizedCoefficients && (
                    <>
                      <Button type="button" variant="ghost" className="min-h-9 text-xs text-slate-700 hover:bg-slate-100" onClick={() => presentEquationAsGraph(scene.recognizedText)}>Add graph on board</Button>
                      <Button type="button" variant="ghost" className="min-h-9 text-xs text-slate-700 hover:bg-slate-100" disabled={busy} onClick={() => void demonstrateBoard()}>Explore visual ideas</Button>
                      <Button type="button" variant="ghost" className="min-h-9 text-xs text-slate-700 hover:bg-slate-100" disabled={busy} onClick={() => void solveOnBoard(scene.recognizedText)}>Find turning point</Button>
                    </>
                  )}
                  {suggestedObjectKind && suggestedObjectKind !== 'parabola' && (
                    <Button type="button" variant="ghost" className="min-h-9 text-xs text-slate-700 hover:bg-slate-100" onClick={() => addBoardVisual(suggestedObjectKind)}>
                      {suggestedObjectKind === 'prism' ? 'Create interactive 3D triangular prism' :
                        suggestedObjectKind === 'cube' ? 'Create interactive 3D cube' :
                        suggestedObjectKind === 'sphere' ? 'Create interactive 3D sphere' :
                          `Create ${suggestedObjectKind === 'water' ? 'water molecule' : suggestedObjectKind} on board`}
                    </Button>
                  )}
                  {suggestedObjectKind === 'circle' && <Button type="button" variant="ghost" className="min-h-9 text-xs text-slate-700 hover:bg-slate-100" onClick={() => addBoardVisual('sphere')}>Create interactive 3D sphere</Button>}
                  {shapeCandidate && (
                    <Button type="button" variant="ghost" className="min-h-9 text-xs text-slate-700 hover:bg-slate-100" onClick={applyShapeCleanup}>Straighten {shapeCandidate.tool} · no AI</Button>
                  )}
                  {scene.visualModel === 'cube' && (
                    <Button type="button" variant="ghost" className="min-h-9 text-xs text-slate-700 hover:bg-slate-100" onClick={addCleanCube}>Add clean 2D cube</Button>
                  )}
                  <Button type="button" variant="ghost" className="min-h-9 text-xs text-slate-500 hover:bg-slate-100" onClick={() => { labelSuggestionRef.current = false; setSuggestion(''); setEquationPrompt(''); }}>Keep original</Button>
                </div>
              </section>
            )}

            {!presentation && mode === 'edit' && selectedText && (
              <div style={{ top: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="absolute left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 text-slate-700 shadow-xl">
                <label className="text-xs text-slate-600">Text colour</label>
                <input type="color" aria-label="Selected text colour" value={selectedText.color} onChange={(event) => updateScene((previous) => ({
                  ...previous,
                  texts: previous.texts.map((item, index) => index === selection?.index ? { ...item, color: event.target.value } : item),
                }))} onPointerDown={remember} className="h-8 w-8 rounded border-0 bg-transparent p-0" />
              </div>
            )}
            {!presentation && mode === 'edit' && selectedStroke && selection?.type === 'stroke' && (
              <div style={{ top: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="absolute left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 text-slate-700 shadow-xl">
                <label className="text-xs text-slate-600">Stroke</label>
                <input type="color" aria-label="Selected stroke colour" value={selectedStroke.color} onChange={(event) => updateScene((previous) => ({
                  ...previous,
                  strokes: previous.strokes.map((item, index) => index === selection?.index ? { ...item, color: event.target.value } : item),
                }))} onPointerDown={remember} className="h-8 w-8 rounded border-0 bg-transparent p-0" />
                <input type="range" min="1" max="18" aria-label="Selected stroke thickness" value={selectedStroke.width} onChange={(event) => updateScene((previous) => ({
                  ...previous,
                  strokes: previous.strokes.map((item, index) => index === selection?.index ? { ...item, width: Number(event.target.value) } : item),
                }))} onPointerDown={remember} className="w-20 accent-slate-700" />
              </div>
            )}

            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => void uploadImage(event)} />

            {!presentation && (
              <form
                style={{ bottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
                className="absolute left-3 right-3 z-30 mx-auto flex max-w-3xl items-end gap-2 rounded-[1.65rem] border border-white/10 bg-[#29292b]/95 p-2 shadow-lg backdrop-blur-md sm:left-6 sm:right-6"
                aria-label="Ask FaceMeX about the whiteboard"
                onSubmit={(event) => {
                  event.preventDefault();
                  const instruction = aiPrompt.trim();
                  if (!instruction || busy) return;
                  setAiPrompt('');
                  void askAI(instruction);
                }}
              >
                <Button type="button" size="icon" variant="ghost" className="mb-0.5 h-9 w-9 shrink-0 rounded-full text-white/85 hover:bg-white/10" aria-label="Add image to board" title="Add image" onClick={() => fileRef.current?.click()}><Plus className="h-5 w-5" /></Button>
                <textarea
                  value={aiPrompt}
                  onChange={(event) => setAiPrompt(event.target.value)}
                  rows={1}
                  maxLength={500}
                  placeholder="Ask FaceMeX"
                  aria-label="Describe what you want FaceMeX to do"
                  className="max-h-24 min-h-10 flex-1 resize-none self-center bg-transparent px-1 py-2 text-sm leading-5 text-white outline-none placeholder:text-white/50"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                {aiPrompt.trim() ? (
                  <Button type="submit" size="icon" className="mb-0.5 h-9 w-9 shrink-0 rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Ask FaceMeX" title="Ask FaceMeX" disabled={busy}>
                    {busy ? <Sparkles className="h-4 w-4 animate-pulse" /> : <ArrowRight className="h-4 w-4" />}
                  </Button>
                ) : (
                  <Button type="button" size="icon" className={`mb-0.5 h-9 w-9 shrink-0 rounded-full text-white hover:bg-white/20 ${voiceListening ? 'bg-white/25' : 'bg-white/10'}`} aria-label={voiceListening ? 'Stop voice input' : 'Start voice input'} title={voiceListening ? 'Stop voice input' : 'Voice input'} onClick={toggleVoiceInput}>
                    {voiceListening ? <MicOff className="h-4 w-4 animate-pulse" /> : <Mic className="h-4 w-4" />}
                  </Button>
                )}
              </form>
            )}
          </main>
        </DialogContent>
      </Dialog>
    </>
  );
}
