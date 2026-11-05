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
  Minus,
  MoreHorizontal,
  MousePointer2,
  Pencil,
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
} from 'lucide-react';
import type { WorkspaceLearningModelId } from '@/components/WorkspaceLearningModels';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { parseQuadraticEquation } from '@/lib/workspaceGraph';
import type { WorkspaceSmartboardLesson, WorkspaceSmartboardLessonDraft } from '@/lib/projects';

type Tool = 'pen' | 'highlighter' | 'eraser' | 'line' | 'arrow' | 'rectangle' | 'ellipse' | 'triangle';
type BoardStroke = {
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
  tool: Tool;
};
type BoardText = { text: string; x: number; y: number; color: string; scale?: number };
type BoardVisualKind = 'triangle' | 'circle' | 'cube' | 'cube2d' | 'sphere' | 'prism' | 'water' | 'newton' | 'parabola';
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
};
type Selection = { type: 'stroke' | 'text' | 'visual'; index: number } | null;
type ShapeTool = 'triangle' | 'ellipse' | 'rectangle';
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
  onSolve: (expression: string) => void;
  onAnalyzeDrawing: (imageDataUrl: string, instruction: string) => Promise<string | undefined>;
  onSaveLesson: (lesson: WorkspaceSmartboardLessonDraft) => Promise<WorkspaceSmartboardLesson>;
  onListLessons: () => Promise<WorkspaceSmartboardLesson[]>;
};

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
      point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1);
}

function isBoardText(value: unknown): value is BoardText {
  if (!value || typeof value !== 'object') return false;
  const text = value as Partial<BoardText>;
  return typeof text.text === 'string' && text.text.length <= 120 &&
    typeof text.x === 'number' && Number.isFinite(text.x) && text.x >= 0 && text.x <= 1 &&
    typeof text.y === 'number' && Number.isFinite(text.y) && text.y >= 0 && text.y <= 1 &&
    (text.scale === undefined || (typeof text.scale === 'number' && Number.isFinite(text.scale) && text.scale >= 0.5 && text.scale <= 3)) &&
    typeof text.color === 'string' && /^#[\da-f]{6}$/i.test(text.color);
}

function isBoardVisual(value: unknown): value is BoardVisual {
  if (!value || typeof value !== 'object') return false;
  const visual = value as Partial<BoardVisual>;
  return typeof visual.id === 'string' &&
    (visual.kind === 'triangle' || visual.kind === 'circle' || visual.kind === 'cube' ||
      visual.kind === 'cube2d' || visual.kind === 'sphere' || visual.kind === 'prism' ||
      visual.kind === 'water' || visual.kind === 'newton' || visual.kind === 'parabola') &&
    [visual.x, visual.y, visual.width, visual.height, visual.rotation].every(
      (number) => typeof number === 'number' && Number.isFinite(number),
    ) &&
    visual.x! >= 0 && visual.x! <= 1 && visual.y! >= 0 && visual.y! <= 1 &&
    visual.width! > 0 && visual.width! <= 1 && visual.height! > 0 && visual.height! <= 1 &&
    visual.x! + visual.width! <= 1 && visual.y! + visual.height! <= 1 &&
    (visual.mass === undefined || (Number.isFinite(visual.mass) && visual.mass >= 0 && visual.mass <= 100000)) &&
    (visual.acceleration === undefined || (Number.isFinite(visual.acceleration) && visual.acceleration >= 0 && visual.acceleration <= 1000));
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
  let text = response.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
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
    text = response.trim();
  }
  return text
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .trim();
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
  const points = stroke.points.filter((_, index) => index % stride === 0);
  if (points[points.length - 1] !== stroke.points[stroke.points.length - 1]) points.push(stroke.points[stroke.points.length - 1]);
  const first = points[0];
  const last = points[points.length - 1];
  const bounds = getBounds(points);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const diagonal = Math.hypot(width, height);
  if (diagonal < 0.025 || distance(first, last) > diagonal * 0.18) return null;
  const simplified = simplify([...points.slice(0, -1), first], diagonal * 0.055);
  const vertices = simplified.slice(0, -1).length;
  if (vertices === 3) return 'triangle';
  if (vertices === 4) return 'rectangle';
  const renderedAspect = width * aspectRatio / Math.max(height, 0.0001);
  return vertices >= 6 && renderedAspect >= 0.65 && renderedAspect <= 1.5 ? 'ellipse' : null;
}

export default function WorkspaceSmartboardCanvas({
  onRecognizeDrawing,
  onSolve,
  onAnalyzeDrawing,
  onSaveLesson,
  onListLessons,
}: Props) {
  const [open, setOpen] = useState(false);
  const [scene, setScene] = useState<Scene>(emptyScene);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);
  const [selection, setSelection] = useState<Selection>(null);
  const [shapeCandidate, setShapeCandidate] = useState<{ index: number; tool: ShapeTool } | null>(null);
  const [mode, setMode] = useState<'edit' | 'markup' | 'resize'>('markup');
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#172033');
  const [width, setWidth] = useState(4);
  const [view, setView] = useState<ViewTransform>({ zoom: 1, x: 0, y: 0 });
  const [image, setImage] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [suggestion, setSuggestion] = useState('');
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const textRef = useRef<HTMLInputElement | null>(null);
  const activeStrokeRef = useRef<BoardStroke | null>(null);
  const activeStrokeIndexRef = useRef<number | null>(null);
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
  const moreMenuRef = useRef<HTMLDetailsElement | null>(null);
  const analyzeDrawingRef = useRef(onAnalyzeDrawing);
  const recognitionTimerRef = useRef<number | null>(null);
  const analysisRequestRef = useRef(0);
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
    const formatted = formatAIResponse(response);
    const recognizedText = getLabeledValue(formatted, 'Recognition') ||
      getLabeledValue(formatted, 'Transcription') ||
      getLabeledValue(formatted, 'Expression');
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
      ...scene,
      strokes: [...scene.strokes],
      texts: [...scene.texts],
      visuals: [...scene.visuals],
    },
    image,
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
        const left = bounds.width * 0.12;
        const top = bounds.height * 0.12;
        const plotWidth = bounds.width * 0.76;
        const plotHeight = bounds.height * 0.7;
        const xMin = -6;
        const xMax = 6;
        const samples = Array.from({ length: 121 }, (_, index) => {
          const x = xMin + (xMax - xMin) * index / 120;
          return { x, y: coefficients.a * x * x + coefficients.b * x + coefficients.c };
        });
        const yMin = Math.min(0, ...samples.map((point) => point.y)) - 1;
        const yMax = Math.max(0, ...samples.map((point) => point.y)) + 1;
        const scale = Math.min(plotWidth / (xMax - xMin), plotHeight / (yMax - yMin));
        const originX = left + (plotWidth - scale * (xMax - xMin)) / 2;
        const originY = top + (plotHeight - scale * (yMax - yMin)) / 2;
        const px = (x: number) => originX + (x - xMin) * scale;
        const py = (y: number) => originY + (yMax - y) * scale;
        context.strokeStyle = 'rgba(25,40,65,.14)';
        context.lineWidth = 1;
        for (let x = xMin; x <= xMax; x += 1) {
          context.beginPath(); context.moveTo(px(x), originY); context.lineTo(px(x), originY + scale * (yMax - yMin)); context.stroke();
        }
        const tick = Math.max(1, Math.ceil((yMax - yMin) / 8));
        for (let y = Math.ceil(yMin / tick) * tick; y <= yMax; y += tick) {
          context.beginPath(); context.moveTo(originX, py(y)); context.lineTo(originX + scale * (xMax - xMin), py(y)); context.stroke();
        }
        context.strokeStyle = '#29364c';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(originX, py(0)); context.lineTo(originX + scale * (xMax - xMin), py(0));
        context.moveTo(px(0), originY); context.lineTo(px(0), originY + scale * (yMax - yMin));
        context.stroke();
        context.beginPath();
        samples.forEach((point, index) => index ? context.lineTo(px(point.x), py(point.y)) : context.moveTo(px(point.x), py(point.y)));
        context.strokeStyle = '#356fe5';
        context.lineWidth = 3;
        context.stroke();
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

        if (visual.kind === 'triangle') {
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
          context.strokeStyle = 'rgba(25,40,65,.2)';
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(-width * 0.4, 0);
          context.lineTo(width * 0.4, 0);
          context.moveTo(0, -height * 0.4);
          context.lineTo(0, height * 0.4);
          context.stroke();
          context.strokeStyle = '#356fe5';
          context.lineWidth = 3;
          context.beginPath();
          for (let pointIndex = 0; pointIndex <= 60; pointIndex += 1) {
            const unitX = (pointIndex / 60) * 2 - 1;
            const unitY = coefficients
              ? coefficients.a * unitX * unitX + coefficients.b * unitX + coefficients.c
              : unitX * unitX;
            const pointX = unitX * width * 0.38;
            const pointY = Math.max(-height * 0.4, Math.min(height * 0.4, unitY * height * 0.12));
            if (pointIndex === 0) context.moveTo(pointX, pointY);
            else context.lineTo(pointX, pointY);
          }
          context.stroke();
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
        context.fillStyle = text.color;
        context.font = `600 ${18 * (text.scale || 1)}px system-ui, sans-serif`;
        context.textBaseline = 'middle';
        context.fillText(text.text, text.x * bounds.width, text.y * bounds.height);
        if (selection?.type === 'text' && selection.index === index) {
          const width = context.measureText(text.text).width;
          context.strokeStyle = '#5688ef';
          context.lineWidth = 1.5;
          context.setLineDash([6, 4]);
          context.strokeRect(text.x * bounds.width - 5, text.y * bounds.height - 16, width + 10, 32);
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
  }, [open, scene, selection, view, coefficients, imageLoaded]);

  const runAutoAnalysis = async (imageDataUrl: string) => {
    if (!aiSuggestionsEnabled) return;
    const requestId = ++analysisRequestRef.current;
    setAnalyzing(true);
    setAnalysisError('');
    try {
      const response = await withTimeout(analyzeDrawingRef.current(
        imageDataUrl,
        [
          'Read the complete visible whiteboard as a teaching assistant. Recognize handwritten text and transcribe equations exactly, preserving superscripts, subscripts, fractions, signs, units, labels and uncertainty.',
          'Identify the most likely subject and the learner’s apparent intent. For incomplete work, say it is incomplete and offer possible continuations as choices without presenting missing values as known.',
          'For rough sentences or short notes, offer one polished, subject-accurate rewrite under Suggested wording: and preserve the original meaning.',
          'Give up to three concise, relevant next actions. For a clear quadratic, include graphing and finding its vertex/axis of symmetry. For a supported cube, sphere, water molecule or Newton’s second law topic, recommend the existing matching interactive visual.',
          'For a clearly drawn triangle, offer a clean editable 2D triangle and the board-supported interactive triangular prism. For a circle, offer an editable circle and board-supported interactive sphere. For a cube, offer its board-supported interactive model. Do not claim unsupported geometry is available.',
          'Return plain text only, with these labels on separate lines: Recognition:, Subject:, Intent:, Suggestions:. Do not use Markdown, JSON, LaTeX, or claim that you changed the board.',
        ].join(' '),
      ));
      if (requestId !== analysisRequestRef.current || !aiSuggestionsEnabled) return;
      if (!response?.trim()) throw new Error('FaceMeX returned no readable work. Retry the analysis or keep drawing.');
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
      if (!canvasRef.current || activeStrokeRef.current) return;
      const imageDataUrl = canvasRef.current.toDataURL('image/png');
      if (imageDataUrl === lastAnalyzedImageRef.current) return;
      lastAnalyzedImageRef.current = imageDataUrl;
      retryAnalysisImageRef.current = imageDataUrl;
      void runAutoAnalysis(imageDataUrl);
    }, 850);
    recognitionTimerRef.current = timer;
    return () => {
      window.clearTimeout(timer);
      analysisRequestRef.current += 1;
    };
  }, [open, aiSuggestionsEnabled, scene.strokes, scene.texts, scene.visuals, scene.graphOnBoard, image]);

  const boardPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left - view.x) / (rect.width * view.zoom))),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top - view.y) / (rect.height * view.zoom))),
    };
  };

  const hitTest = (point: { x: number; y: number }, canvas: HTMLCanvasElement): Selection => {
    const toleranceX = 12 / (canvas.clientWidth * view.zoom);
    const toleranceY = 12 / (canvas.clientHeight * view.zoom);
    const strokeTolerance = 12 / view.zoom;
    for (let index = scene.texts.length - 1; index >= 0; index -= 1) {
      const text = scene.texts[index];
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
    event.currentTarget.setPointerCapture(event.pointerId);
    const position = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, position);
    if (pointersRef.current.size >= 2) {
      if (activeStrokeIndexRef.current !== null) {
        const unfinishedStrokeIndex = activeStrokeIndexRef.current;
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
    analysisRequestRef.current += 1;
    setAnalyzing(false);
    setAnalysisError('');
    setShapeCandidate(null);
    setSelection(null);
    setSuggestion('');
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
        const shiftX = Math.max(-bounds.minX, Math.min(1 - bounds.maxX, dx));
        const shiftY = Math.max(-bounds.minY, Math.min(1 - bounds.maxY, dy));
        const moved = { ...activeSelection.stroke, points: activeSelection.stroke.points.map((item) => ({ x: item.x + shiftX, y: item.y + shiftY })) };
        updateScene((previous) => ({ ...previous, strokes: previous.strokes.map((item, index) => index === activeSelection.selection.index ? moved : item) }));
      } else if (activeSelection.selection.type === 'text' && activeSelection.text) {
        const moved = { ...activeSelection.text, x: Math.max(0, Math.min(1, activeSelection.text.x + dx)), y: Math.max(0, Math.min(1, activeSelection.text.y + dy)) };
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
    const points = ['line', 'arrow', 'rectangle', 'ellipse', 'triangle'].includes(activeStroke.tool)
      ? [activeStroke.points[0], point]
      : [...activeStroke.points, point];
    const updated = { ...activeStroke, points };
    activeStrokeRef.current = updated;
    updateScene((previous) => ({ ...previous, strokes: [...previous.strokes.slice(0, -1), updated] }));
  };

  const pointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(event.pointerId);
    panRef.current = null;
    if (pointersRef.current.size < 2) gestureRef.current = null;
    const activeStroke = activeStrokeRef.current;
    const strokeIndex = activeStrokeIndexRef.current;
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (activeStroke && strokeIndex !== null && bounds?.height) {
      const shape = recognizeShape(activeStroke, bounds.width / bounds.height);
      setShapeCandidate(shape ? { index: strokeIndex, tool: shape } : null);
    }
    activeStrokeRef.current = null;
    activeStrokeIndexRef.current = null;
    activeSelectionRef.current = null;
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
      points: [{ x: bounds.minX, y: bounds.minY }, { x: bounds.maxX, y: bounds.maxY }],
    };
    updateScene((previous) => ({
      ...previous,
      strokes: [...previous.strokes, cleaned],
    }));
    setSelection({ type: 'stroke', index: scene.strokes.length });
    setShapeCandidate(null);
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
      const copy = {
        ...selectedText,
        x: selectedText.x <= 0.94 ? selectedText.x + 0.03 : selectedText.x - 0.03,
        y: selectedText.y <= 0.94 ? selectedText.y + 0.03 : selectedText.y - 0.03,
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
        x: Math.max(0, Math.min(1, centerX + (point.x - centerX) * factor)),
        y: Math.max(0, Math.min(1, centerY + (point.y - centerY) * factor)),
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

  const addText = () => {
    const value = textDraft.trim();
    if (!value) return;
    remember();
    const item = { text: value.slice(0, 120), x: 0.5, y: 0.5, color };
    updateScene((previous) => ({ ...previous, texts: [...previous.texts, item] }));
    setSelection({ type: 'text', index: scene.texts.length });
    setTextDraft('');
    setTextComposerOpen(false);
    setMathKeyboardOpen(false);
  };

  const addCleanCube = () => {
    addBoardVisual('cube2d');
  };

  const addBoardVisual = (kind: BoardVisualKind) => {
    const visual: BoardVisual = {
      id: crypto.randomUUID(),
      kind,
      x: 0.37,
      y: 0.3,
      width: kind === 'parabola' || kind === 'newton' ? 0.34 : 0.26,
      height: 0.3,
      rotation: 0,
      ...(kind === 'newton' ? { mass: 1200, acceleration: 4 } : {}),
    };
    remember();
    updateScene((previous) => ({
      ...previous,
      visuals: [...previous.visuals, visual],
      ...(kind === 'parabola' && scene.recognizedText ? {
        equation: scene.recognizedText,
        graphOnBoard: false,
      } : {}),
    }));
    setSelection({ type: 'visual', index: scene.visuals.length });
    setSuggestion('');
    setNotice(`Added an editable ${getBoardVisualLabel(kind)} to the whiteboard.`);
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
      texts: previous.texts.map((text, index) => index === selection.index ? { ...text, text: value.slice(0, 120) } : text),
    }));
  };

  const askAI = async (instruction: string) => {
    if (!canvasRef.current) return;
    const requestId = ++analysisRequestRef.current;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await withTimeout(onAnalyzeDrawing(canvasRef.current.toDataURL('image/png'), instruction));
      if (requestId !== analysisRequestRef.current) return;
      if (!response?.trim()) throw new Error('FaceMeX did not return a suggestion. Please try again.');
      setAIResult(response);
    } catch (reason) {
      if (requestId === analysisRequestRef.current) {
        setError(reason instanceof Error ? reason.message : 'FaceMeX could not analyze the board.');
      }
    } finally {
      setBusy(false);
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
    remember();
    const item = { text: getSuggestedText(suggestion, scene.recognizedText).slice(0, 120), x: 0.5, y: 0.2, color };
    updateScene((previous) => ({ ...previous, texts: [...previous.texts, item] }));
    setSelection({ type: 'text', index: scene.texts.length });
    setSuggestion('');
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
    const visuals = Array.isArray(savedScene.visuals) ? savedScene.visuals.filter(isBoardVisual) : [];
    const restoredEquation = typeof savedScene.equation === 'string' ? savedScene.equation : 'y = x² - 3';
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
      visuals,
      equation: restoredEquation,
      graphOnBoard: savedScene.graphOnBoard === true,
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
          lastAnalyzedImageRef.current = null;
          retryAnalysisImageRef.current = null;
        }
        setOpen(nextOpen);
      }}>
        <DialogContent className="!fixed !inset-0 !left-0 !top-0 !z-[100] !flex !h-[100dvh] !max-h-[100dvh] !w-screen !max-w-none !translate-x-0 !translate-y-0 !flex-col !gap-0 !overflow-hidden !rounded-none !border-0 !bg-[#eef0f3] !p-0 text-white [&>button:last-child]:hidden">
          <DialogTitle className="sr-only">FaceMeX Smartboard</DialogTitle>
          <DialogDescription className="sr-only">A full-screen whiteboard for drawing, editing and saving your work.</DialogDescription>
          <main className="relative min-h-0 flex-1 overflow-hidden bg-[#eef0f3]">
            <section aria-label="Whiteboard canvas" className="absolute inset-0 flex items-center justify-center p-1.5 pt-[calc(env(safe-area-inset-top)_+_4rem)] pb-[calc(env(safe-area-inset-bottom)_+_5rem)] sm:p-3 sm:pt-16 sm:pb-20">
            <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_48px_rgba(24,32,48,0.12)] ${scene.boardSize === 'wide' ? 'aspect-video max-h-full w-full max-w-full' : scene.boardSize === 'portrait' ? 'aspect-[0.707] h-full w-auto max-w-full' : 'h-full w-full'}`}>
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

            <header style={{ top: 'calc(env(safe-area-inset-top) + 0.75rem)' }} className="absolute left-1/2 z-30 flex w-[calc(100%-1rem)] max-w-xl -translate-x-1/2 items-center justify-between rounded-full border border-white/10 bg-[#181a1d]/90 p-1.5 shadow-xl backdrop-blur-md sm:w-auto sm:gap-8">
              <Button type="button" size="icon" variant="ghost" className="h-10 w-10 rounded-full text-white hover:bg-white/10" aria-label="Close Smartboard" title="Close" onClick={() => { analysisRequestRef.current += 1; setAnalyzing(false); lastAnalyzedImageRef.current = null; retryAnalysisImageRef.current = null; setOpen(false); }}>
                <X className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-1">
                <Button type="button" size="icon" variant="ghost" className="h-10 w-10 rounded-full text-white hover:bg-white/10" aria-label="Undo" title="Undo" disabled={!history.length} onClick={undo}><Undo2 className="h-4 w-4" /></Button>
                <Button type="button" size="icon" variant="ghost" className="h-10 w-10 rounded-full text-white hover:bg-white/10" aria-label="Redo" title="Redo" disabled={!future.length} onClick={redo}><Redo2 className="h-4 w-4" /></Button>
                <Button type="button" size="icon" variant="ghost" className="h-10 w-10 rounded-full text-white hover:bg-white/10" aria-label="Duplicate selected object" title="Duplicate" disabled={!selection} onClick={duplicate}><Copy className="h-4 w-4" /></Button>
                <details ref={moreMenuRef} className="relative">
                  <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full text-white hover:bg-white/10" aria-label="More board actions" title="More">
                    <MoreHorizontal className="h-5 w-5" />
                  </summary>
                  <div className="absolute right-0 top-full mt-2 max-h-[75dvh] w-[min(90vw,22rem)] overflow-y-auto rounded-2xl border border-white/10 bg-[#191c20] p-3 shadow-2xl">
                    <label className="block text-xs text-white/60">
                      Board name
                      <input value={boardTitle} onChange={(event) => setBoardTitle(event.target.value)} maxLength={120} className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-white/30" />
                    </label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Button type="button" variant="outline" className="min-h-10 border-white/10 bg-white/5 text-white hover:bg-white/10" disabled={busy} onClick={() => void saveBoard()}><Save className="mr-2 h-4 w-4" />Save board</Button>
                      <Button type="button" variant="outline" className="min-h-10 border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={downloadBoard}><Download className="mr-2 h-4 w-4" />Export PNG</Button>
                      <Button type="button" variant="outline" className="min-h-10 border-white/10 bg-white/5 text-white hover:bg-white/10" disabled={busy} onClick={() => void loadBoards()}>Open saved</Button>
                      <Button type="button" variant="outline" className="min-h-10 border-white/10 bg-white/5 text-white hover:bg-white/10" aria-pressed={presentation} onClick={() => setPresentation((value) => !value)}>{presentation ? 'Exit present' : 'Presentation'}</Button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button type="button" variant="outline" className="min-h-10 border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => fileRef.current?.click()}><ImagePlus className="mr-2 h-4 w-4" />Add image</Button>
                      <Button type="button" variant="outline" className="min-h-10 border-white/10 bg-white/5 text-white hover:bg-white/10" aria-pressed={settingsOpen} onClick={() => setSettingsOpen((value) => !value)}><Settings2 className="mr-2 h-4 w-4" />Board settings</Button>
                      <Button type="button" variant="outline" className="min-h-10 border-white/10 bg-white/5 text-rose-200 hover:bg-rose-950/40" onClick={clearBoard}><Trash2 className="mr-2 h-4 w-4" />Clear board</Button>
                    </div>
                    <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                      <p className="text-xs font-medium text-white">AI suggestions: {aiSuggestionsEnabled ? 'On' : 'Off'}</p>
                      <p className="mt-1 text-[11px] leading-4 text-white/55">When on, FaceMeX analyzes a board snapshot after you pause. It never edits your work.</p>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-2 min-h-10 w-full border-white/10 bg-white/5 text-white hover:bg-white/10"
                        aria-pressed={aiSuggestionsEnabled}
                        onClick={toggleAISuggestions}
                      >
                        {aiSuggestionsEnabled ? 'Pause AI suggestions' : 'Enable AI suggestions'}
                      </Button>
                    </div>
                    <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                      <p className="text-xs font-medium text-white">Drawing tools</p>
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
                          <Button key={name} type="button" size="icon" variant="ghost" className={`h-9 w-9 rounded-full ${tool === name ? 'bg-white/15 text-white' : 'text-white/65 hover:bg-white/10'}`} aria-label={label} title={label} aria-pressed={tool === name} onClick={() => { changeMode('markup'); setTool(name); moreMenuRef.current?.removeAttribute('open'); }}>
                            <Icon className="h-4 w-4" />
                          </Button>
                        ))}
                        <input aria-label="Pen colour" type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0" />
                        <input aria-label="Pen thickness" type="range" min="1" max="18" value={width} onChange={(event) => setWidth(Number(event.target.value))} className="w-20 accent-white" />
                        <Button type="button" variant="outline" className="min-h-9 border-white/10 bg-white/5 px-2 text-xs text-white hover:bg-white/10" onClick={() => { setTextComposerOpen(true); setMathKeyboardOpen(false); moreMenuRef.current?.removeAttribute('open'); window.setTimeout(() => textRef.current?.focus(), 0); }}><Type className="mr-1 h-3.5 w-3.5" />Add text</Button>
                        <Button type="button" variant="outline" className="min-h-9 border-white/10 bg-white/5 px-2 text-xs text-white hover:bg-white/10" onClick={() => { setTextComposerOpen(true); setMathKeyboardOpen(true); moreMenuRef.current?.removeAttribute('open'); window.setTimeout(() => textRef.current?.focus(), 0); }}>Math input</Button>
                      </div>
                    </div>
                    {settingsOpen && (
                      <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
                        <label className="block text-xs text-white/70">Canvas size
                          <select value={scene.boardSize} onChange={(event) => {
                            const boardSize = event.target.value === 'wide' || event.target.value === 'portrait' ? event.target.value : 'fit';
                            remember();
                            updateScene((previous) => ({ ...previous, boardSize }));
                          }} className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#15171a] px-3 text-sm text-white">
                            <option value="fit">Fit screen</option>
                            <option value="wide">Wide 16:9</option>
                            <option value="portrait">Portrait A4 proportion</option>
                          </select>
                        </label>
                        <label className="block text-xs text-white/70">Equation graph (browser-calculated)
                          <input value={scene.equation} onChange={(event) => updateScene((previous) => ({ ...previous, equation: event.target.value }))} placeholder="y = x² - 3" className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-white/30" />
                        </label>
                        <label className="flex min-h-9 items-center gap-2 text-sm text-white/80">
                          <input type="checkbox" checked={scene.graphOnBoard} disabled={!coefficients} onChange={(event) => { remember(); updateScene((previous) => ({ ...previous, graphOnBoard: event.target.checked })); }} />
                          Show graph on canvas
                        </label>
                        {scene.graphOnBoard && coefficients && (
                          <Button type="button" variant="outline" className="min-h-9 border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => onSolve(scene.equation)}>Explain equation</Button>
                        )}
                      </div>
                    )}
                    {savedListOpen && (
                      <div className="mt-3 max-h-48 overflow-y-auto rounded-xl border border-white/10 p-2">
                        {savedBoards.length ? savedBoards.map((board) => (
                          <button key={board.id} type="button" className="block min-h-10 w-full rounded-lg px-2 text-left text-sm text-white/80 hover:bg-white/10" onClick={() => restoreBoard(board)}>
                            {board.title}<span className="ml-2 text-xs text-white/45">{new Date(board.createdAt).toLocaleDateString()}</span>
                          </button>
                        )) : <p className="p-2 text-xs text-white/55">No saved boards yet.</p>}
                      </div>
                    )}
                    {(notice || error) && <p role={error ? 'alert' : 'status'} className={`mt-2 text-xs ${error ? 'text-rose-300' : 'text-emerald-300'}`}>{error || notice}</p>}
                  </div>
                </details>
              </div>
            </header>

            {shapeCandidate && aiSuggestionsEnabled && !suggestion && !presentation && (
              <section style={{ top: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="absolute right-3 z-20 w-[min(21rem,calc(100%-1.5rem))] rounded-2xl border border-slate-200 bg-white/95 p-3 text-slate-900 shadow-xl sm:right-6" aria-live="polite">
                <p className="text-sm font-medium">This may be a {shapeCandidate.tool}.</p>
                <p className="mt-1 text-xs text-slate-600">Create an editable clean version without changing the original, or keep drawing.</p>
                <div className="mt-2 flex gap-2">
                  <Button type="button" className="min-h-9 bg-slate-900 px-3 text-xs text-white hover:bg-slate-700" onClick={applyShapeCleanup}>Create clean shape</Button>
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
                  <input ref={textRef} value={textDraft} onChange={(event) => setTextDraft(event.target.value)} maxLength={120} placeholder="Type a note or equation" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-slate-400" />
                  <Button type="submit" aria-label="Add note to board" className="bg-slate-900 text-white hover:bg-slate-700" disabled={!textDraft.trim()}><Check className="h-4 w-4" /></Button>
                  <Button type="button" variant="ghost" aria-label="Cancel text" onClick={() => { setTextComposerOpen(false); setMathKeyboardOpen(false); }}><X className="h-4 w-4" /></Button>
                </div>
                {mathKeyboardOpen && (
                  <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto" aria-label="Mathematical symbols">
                    {['x²', 'x³', 'xⁿ', 'x₁', 'xₙ', '⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹', '₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉', '√', '∛', 'a/b', 'π', 'θ', '∫', '∑', '≤', '≥', '≠', '()', '[]', '×', '÷', '−', '∂', 'lim', '→'].map((symbol) => (
                      <Button key={symbol} type="button" variant="outline" aria-label={`Insert ${symbol}`} className="h-8 min-w-9 px-2 text-sm text-slate-800" onClick={() => insertMathSymbol(symbol)}>{symbol}</Button>
                    ))}
                  </div>
                )}
              </form>
            )}

            {!presentation && selection && (
              <section style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.25rem)' }} className="absolute left-1/2 z-20 flex max-w-[calc(100%-1rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-2xl border border-white/10 bg-[#191c20]/95 p-2 shadow-xl backdrop-blur" aria-label="Selected object actions">
                {selectedText && <Button type="button" variant="ghost" className="min-h-9 px-3 text-xs text-white hover:bg-white/10" onClick={editSelectedText}>Edit text</Button>}
                {selectedVisual && <span className="px-2 text-xs capitalize text-white/70">{getBoardVisualLabel(selectedVisual.kind)}</span>}
                {selectedVisual && (selectedVisual.kind === 'cube' || selectedVisual.kind === 'sphere' || selectedVisual.kind === 'prism' || selectedVisual.kind === 'water') && (
                  <label className="flex items-center gap-2 px-2 text-xs text-white/70">
                    Rotate
                    <input type="range" min="-3.14" max="3.14" step="0.05" value={selectedVisual.rotation} aria-label={`Rotate ${selectedVisual.kind}`} onPointerDown={remember} onChange={(event) => {
                      const rotation = Number(event.target.value);
                      updateScene((previous) => ({
                        ...previous,
                        visuals: previous.visuals.map((visual, index) => index === selection.index ? { ...visual, rotation } : visual),
                      }));
                    }} className="w-24 accent-white" />
                  </label>
                )}
                {selectedVisual?.kind === 'newton' && (
                  <>
                    <label className="flex items-center gap-2 px-2 text-xs text-white/70">
                      Mass {selectedVisual.mass || 1200} kg
                      <input type="range" min="100" max="2000" step="100" value={selectedVisual.mass || 1200} aria-label="Demonstration mass in kilograms" onPointerDown={remember} onChange={(event) => {
                        const mass = Number(event.target.value);
                        updateScene((previous) => ({
                          ...previous,
                          visuals: previous.visuals.map((visual, index) => index === selection.index ? { ...visual, mass } : visual),
                        }));
                      }} className="w-20 accent-white" />
                    </label>
                    <label className="flex items-center gap-2 px-2 text-xs text-white/70">
                      Acceleration {selectedVisual.acceleration ?? 4} m/s²
                      <input type="range" min="0" max="10" step="0.5" value={selectedVisual.acceleration ?? 4} aria-label="Demonstration acceleration in metres per second squared" onPointerDown={remember} onChange={(event) => {
                        const acceleration = Number(event.target.value);
                        updateScene((previous) => ({
                          ...previous,
                          visuals: previous.visuals.map((visual, index) => index === selection.index ? { ...visual, acceleration } : visual),
                        }));
                      }} className="w-20 accent-white" />
                    </label>
                  </>
                )}
                <Button type="button" variant="ghost" className="min-h-9 px-3 text-xs text-white hover:bg-white/10" disabled={busy} onClick={() => void recognizeSelectedText()}><Sparkles className="mr-1 h-3.5 w-3.5" />Read text</Button>
                <Button type="button" variant="ghost" className="min-h-9 px-3 text-xs text-white hover:bg-white/10" disabled={busy} onClick={() => void askAI('Improve the selected writing for spelling, grammar, clarity and professional tone. Preserve its meaning. Return only the suggested replacement text.')}>Improve</Button>
                <Button type="button" variant="ghost" className="min-h-9 px-3 text-xs text-white hover:bg-white/10" disabled={busy} onClick={() => void askAI('Explain the selected board content accurately and concisely. Clearly state uncertainty where content is unclear.')}>Explain</Button>
                <Button type="button" variant="ghost" className="min-h-9 px-3 text-xs text-white hover:bg-white/10" disabled={busy} onClick={() => void askAI('Suggest an accurate, editable 2D diagram for the selected content. Give a concise structured description; do not claim a graphic was inserted.')}>Convert to 2D</Button>
                <Button type="button" variant="ghost" className="min-h-9 px-3 text-xs text-white hover:bg-white/10" disabled={busy} onClick={() => void askAI('Assess whether the selected content matches a supported interactive FaceMeX subject model. If supported, identify the model and explain what can be represented. Do not claim to generate an arbitrary 3D object.')}>Convert to 3D</Button>
                <Button type="button" variant="ghost" className="min-h-9 px-3 text-xs text-white hover:bg-white/10" disabled={busy} onClick={() => void askAI('Suggest concise labels for the selected drawing. Do not invent unshown parts and do not claim to add the labels.')}>Add labels</Button>
                {busy && <span className="px-2 text-xs text-white/55">Thinking…</span>}
              </section>
            )}

            {!presentation && mode === 'resize' && (
              <div style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.25rem)' }} className="absolute left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-white/10 bg-[#191c20]/95 p-1.5 shadow-xl">
                <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-white hover:bg-white/10" aria-label="Zoom out" onClick={() => setView((current) => ({ ...current, zoom: Math.max(0.5, current.zoom - 0.15) }))}><Minus className="h-4 w-4" /></Button>
                <span className="min-w-12 text-center text-xs text-white/75">{Math.round(view.zoom * 100)}%</span>
                <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-white hover:bg-white/10" aria-label="Zoom in" onClick={() => setView((current) => ({ ...current, zoom: Math.min(3, current.zoom + 0.15) }))}><Plus className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" className="min-h-9 px-2 text-xs text-white hover:bg-white/10" onClick={() => setView({ zoom: 1, x: 0, y: 0 })}>Reset view</Button>
                {selectedStroke && (
                  <>
                    <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-white hover:bg-white/10" aria-label="Shrink selected object" onClick={() => resizeSelection(0.85)}><Minus className="h-4 w-4" /></Button>
                    <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-white hover:bg-white/10" aria-label="Enlarge selected object" onClick={() => resizeSelection(1.15)}><Plus className="h-4 w-4" /></Button>
                  </>
                )}
                {selectedVisual && (
                  <>
                    <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-white hover:bg-white/10" aria-label="Shrink selected visual" onClick={() => resizeSelection(0.85)}><Minus className="h-4 w-4" /></Button>
                    <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-white hover:bg-white/10" aria-label="Enlarge selected visual" onClick={() => resizeSelection(1.15)}><Plus className="h-4 w-4" /></Button>
                  </>
                )}
                {selectedText && (
                  <>
                    <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-white hover:bg-white/10" aria-label="Shrink selected text" onClick={() => resizeSelectedText(0.85)}><Minus className="h-4 w-4" /></Button>
                    <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-white hover:bg-white/10" aria-label="Enlarge selected text" onClick={() => resizeSelectedText(1.15)}><Plus className="h-4 w-4" /></Button>
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
              <section style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.25rem)' }} className="absolute right-3 z-20 max-h-[26dvh] w-[min(22rem,calc(100%-1.5rem))] overflow-y-auto rounded-2xl border border-white/10 bg-[#191c20]/95 p-3 text-white shadow-xl sm:right-6" aria-live="polite">
                <p className="whitespace-pre-wrap text-sm leading-5">{suggestion}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Button type="button" className="min-h-9 bg-white/15 text-xs text-white hover:bg-white/20" onClick={acceptSuggestion}>Add to board</Button>
                  <Button type="button" variant="ghost" className="min-h-9 text-xs text-white/75 hover:bg-white/10" onClick={editSuggestion}>Edit</Button>
                  {selectedText && <Button type="button" variant="ghost" className="min-h-9 text-xs text-white/75 hover:bg-white/10" onClick={replaceSelectedTextWithSuggestion}>Replace selected text</Button>}
                  {scene.recognizedText && <Button type="button" variant="ghost" className="min-h-9 text-xs text-white/75 hover:bg-white/10" onClick={() => onSolve(scene.recognizedText)}>Explain</Button>}
                  {recognizedCoefficients && (
                    <>
                      <Button type="button" variant="ghost" className="min-h-9 text-xs text-white/75 hover:bg-white/10" onClick={() => addBoardVisual('parabola')}>Plot on board</Button>
                      <Button type="button" variant="ghost" className="min-h-9 text-xs text-white/75 hover:bg-white/10" onClick={() => onSolve(scene.recognizedText)}>Find turning point</Button>
                    </>
                  )}
                  {suggestedObjectKind && suggestedObjectKind !== 'parabola' && (
                    <Button type="button" variant="ghost" className="min-h-9 text-xs text-white/75 hover:bg-white/10" onClick={() => addBoardVisual(suggestedObjectKind)}>
                      {suggestedObjectKind === 'prism' ? 'Create interactive 3D triangular prism' :
                        suggestedObjectKind === 'cube' ? 'Create interactive 3D cube' :
                        suggestedObjectKind === 'sphere' ? 'Create interactive 3D sphere' :
                          `Create ${suggestedObjectKind === 'water' ? 'water molecule' : suggestedObjectKind} on board`}
                    </Button>
                  )}
                  {suggestedObjectKind === 'circle' && <Button type="button" variant="ghost" className="min-h-9 text-xs text-white/75 hover:bg-white/10" onClick={() => addBoardVisual('sphere')}>Create interactive 3D sphere</Button>}
                  {shapeCandidate && (
                    <Button type="button" variant="ghost" className="min-h-9 text-xs text-white/75 hover:bg-white/10" onClick={applyShapeCleanup}>Create clean 2D {shapeCandidate.tool}</Button>
                  )}
                  {scene.visualModel === 'cube' && (
                    <Button type="button" variant="ghost" className="min-h-9 text-xs text-white/75 hover:bg-white/10" onClick={addCleanCube}>Add clean 2D cube</Button>
                  )}
                  <Button type="button" variant="ghost" className="min-h-9 text-xs text-white/65 hover:bg-white/10" onClick={() => setSuggestion('')}>Keep original</Button>
                </div>
              </section>
            )}

            {!presentation && mode === 'edit' && selectedText && (
              <div style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.25rem)' }} className="absolute left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-white/10 bg-[#191c20]/95 p-2 shadow-xl">
                <label className="text-xs text-white/70">Text colour</label>
                <input type="color" aria-label="Selected text colour" value={selectedText.color} onChange={(event) => updateScene((previous) => ({
                  ...previous,
                  texts: previous.texts.map((item, index) => index === selection?.index ? { ...item, color: event.target.value } : item),
                }))} onPointerDown={remember} className="h-8 w-8 rounded border-0 bg-transparent p-0" />
              </div>
            )}
            {!presentation && mode === 'edit' && selectedStroke && selection?.type === 'stroke' && (
              <div style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.25rem)' }} className="absolute left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-white/10 bg-[#191c20]/95 p-2 shadow-xl">
                <label className="text-xs text-white/70">Stroke</label>
                <input type="color" aria-label="Selected stroke colour" value={selectedStroke.color} onChange={(event) => updateScene((previous) => ({
                  ...previous,
                  strokes: previous.strokes.map((item, index) => index === selection?.index ? { ...item, color: event.target.value } : item),
                }))} onPointerDown={remember} className="h-8 w-8 rounded border-0 bg-transparent p-0" />
                <input type="range" min="1" max="18" aria-label="Selected stroke thickness" value={selectedStroke.width} onChange={(event) => updateScene((previous) => ({
                  ...previous,
                  strokes: previous.strokes.map((item, index) => index === selection?.index ? { ...item, width: Number(event.target.value) } : item),
                }))} onPointerDown={remember} className="w-20 accent-white" />
              </div>
            )}

            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => void uploadImage(event)} />

            {!presentation && (
              <nav style={{ bottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }} className="absolute left-1/2 z-30 grid w-[calc(100%-1rem)] max-w-lg -translate-x-1/2 grid-cols-4 rounded-2xl border border-white/10 bg-[#181a1d]/95 p-1.5 shadow-2xl backdrop-blur-md" aria-label="Canvas actions">
                <button type="button" aria-pressed={mode === 'edit'} onClick={() => changeMode('edit')} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-white transition-colors hover:bg-white/10 ${mode === 'edit' ? 'bg-white/10' : ''}`}>
                  <MousePointer2 className="h-5 w-5" /><span className="text-[10px] font-semibold tracking-wide">EDIT</span>
                </button>
                <button type="button" aria-pressed={mode === 'markup'} onClick={() => changeMode('markup')} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-white transition-colors hover:bg-white/10 ${mode === 'markup' ? 'bg-white/10' : ''}`}>
                  <Pencil className="h-5 w-5" /><span className="text-[10px] font-semibold tracking-wide">MARKUP</span>
                </button>
                <button type="button" aria-pressed={mode === 'resize'} onClick={() => changeMode('resize')} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-white transition-colors hover:bg-white/10 ${mode === 'resize' ? 'bg-white/10' : ''}`}>
                  <Settings2 className="h-5 w-5" /><span className="text-[10px] font-semibold tracking-wide">RESIZE</span>
                </button>
                <button type="button" onClick={removeSelection} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-white transition-colors hover:bg-rose-900/40">
                  <Trash2 className="h-5 w-5" /><span className="text-[10px] font-semibold tracking-wide">REMOVE</span>
                </button>
              </nav>
            )}
          </main>
        </DialogContent>
      </Dialog>
    </>
  );
}
