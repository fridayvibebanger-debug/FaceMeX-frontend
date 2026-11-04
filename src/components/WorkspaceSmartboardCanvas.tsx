import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react';
import {
  ArrowRight,
  Box,
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
import WorkspaceLearningModels, { type WorkspaceLearningModelId } from '@/components/WorkspaceLearningModels';
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
type Selection = { type: 'stroke' | 'text'; index: number } | null;
type ShapeTool = 'triangle' | 'ellipse' | 'rectangle';
type BoardSize = 'fit' | 'wide' | 'portrait';
type Scene = {
  strokes: BoardStroke[];
  texts: BoardText[];
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

function getBounds(points: BoardStroke['points']) {
  return points.reduce((bounds, point) => ({
    minX: Math.min(bounds.minX, point.x),
    maxX: Math.max(bounds.maxX, point.x),
    minY: Math.min(bounds.minY, point.y),
    maxY: Math.max(bounds.maxY, point.y),
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
}

function emptyScene(): Scene {
  return {
    strokes: [],
    texts: [],
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
  const section = lines.findIndex((line) => /^suggestions?:/i.test(line.trim()));
  const inlineSuggestion = section >= 0 ? lines[section].replace(/^suggestions?:\s*/i, '').trim() : '';
  const nextSuggestion = section >= 0
    ? lines.slice(section + 1).find((line) => line.trim() && !/^(recognition|subject|intent):/i.test(line.trim()))?.replace(/^\s*[•*-]\s*/, '').trim()
    : '';
  return fallback || inlineSuggestion || nextSuggestion || text;
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
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [boardTitle, setBoardTitle] = useState('Untitled board');
  const [savedBoard, setSavedBoard] = useState<WorkspaceSmartboardLesson | null>(null);
  const [savedBoards, setSavedBoards] = useState<WorkspaceSmartboardLesson[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savedListOpen, setSavedListOpen] = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);
  const [presentation, setPresentation] = useState(false);
  const [textDraft, setTextDraft] = useState('');
  const [textComposerOpen, setTextComposerOpen] = useState(false);
  const [mathKeyboardOpen, setMathKeyboardOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const textRef = useRef<HTMLInputElement | null>(null);
  const activeStrokeRef = useRef<BoardStroke | null>(null);
  const activeStrokeIndexRef = useRef<number | null>(null);
  const activeSelectionRef = useRef<{ selection: Selection; start: { x: number; y: number }; stroke?: BoardStroke; text?: BoardText } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
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

  const snapshot = (): Snapshot => ({ scene: { ...scene, strokes: [...scene.strokes], texts: [...scene.texts] }, image });
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
          stroke.points.slice(1).forEach((point) => context.lineTo(point.x * bounds.width, point.y * bounds.height));
          if (stroke.points.length === 1) context.lineTo(x1 + 0.1, y1 + 0.1);
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
          'Give up to three concise, relevant next actions. For a clear quadratic, include graphing and finding its vertex/axis of symmetry. For a supported cube, water molecule or Newton’s second law topic, recommend the existing matching interactive visual.',
          'For rough basic shapes, identify a likely editable shape only when visible. For unclear content, state what could not be read instead of guessing.',
          'Return plain text only, with these labels on separate lines: Recognition:, Subject:, Intent:, Suggestions:. Do not use Markdown, JSON, LaTeX, or claim that you changed the board.',
        ].join(' '),
      ));
      if (requestId !== analysisRequestRef.current) return;
      if (!response?.trim()) throw new Error('FaceMeX returned no readable work. Retry the analysis or keep drawing.');
      setAIResult(response);
    } catch (reason) {
      if (requestId === analysisRequestRef.current) {
        setAnalysisError(reason instanceof Error ? reason.message : 'FaceMeX could not analyze this drawing.');
      }
    } finally {
      if (requestId === analysisRequestRef.current) setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!open || !scene.strokes.length || mode !== 'markup' || image) return;
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
  }, [open, scene.strokes, mode, image]);

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
    for (let index = scene.texts.length - 1; index >= 0; index -= 1) {
      const text = scene.texts[index];
      if (Math.abs(text.x - point.x) < Math.max(toleranceX, text.text.length * 0.008 * (text.scale || 1)) && Math.abs(text.y - point.y) < toleranceY * 2 * (text.scale || 1)) {
        return { type: 'text', index };
      }
    }
    for (let index = scene.strokes.length - 1; index >= 0; index -= 1) {
      const box = getBounds(scene.strokes[index].points);
      if (point.x >= box.minX - toleranceX && point.x <= box.maxX + toleranceX &&
        point.y >= box.minY - toleranceY && point.y <= box.maxY + toleranceY) {
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
      activeSelectionRef.current = null;
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
          ...(hit.type === 'stroke' ? { stroke: scene.strokes[hit.index] } : { text: scene.texts[hit.index] }),
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
      } else if (activeSelection.text) {
        const moved = { ...activeSelection.text, x: Math.max(0, Math.min(1, activeSelection.text.x + dx)), y: Math.max(0, Math.min(1, activeSelection.text.y + dy)) };
        updateScene((previous) => ({ ...previous, texts: previous.texts.map((item, index) => index === activeSelection.selection.index ? moved : item) }));
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
      strokes: previous.strokes.map((item, index) => index === shapeCandidate.index ? cleaned : item),
    }));
    setSelection({ type: 'stroke', index: shapeCandidate.index });
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

  const duplicate = () => {
    if (!selection) return;
    remember();
    if (selection.type === 'stroke' && selectedStroke) {
      const box = getBounds(selectedStroke.points);
      const dx = box.maxX <= 0.96 ? 0.04 : -0.04;
      const dy = box.maxY <= 0.96 ? 0.04 : -0.04;
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
    } else {
      updateScene((previous) => ({ ...previous, texts: previous.texts.filter((_, index) => index !== selection.index) }));
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
    if (!selection || selection.type !== 'stroke' || !selectedStroke) return;
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
    const vertices = {
      A: { x: 0.34, y: 0.43 },
      B: { x: 0.54, y: 0.43 },
      C: { x: 0.54, y: 0.63 },
      D: { x: 0.34, y: 0.63 },
      E: { x: 0.43, y: 0.34 },
      F: { x: 0.63, y: 0.34 },
      G: { x: 0.63, y: 0.54 },
      H: { x: 0.43, y: 0.54 },
    };
    const edges = ['AB', 'BC', 'CD', 'DA', 'EF', 'FG', 'GH', 'HE', 'AE', 'BF', 'CG', 'DH'];
    const cubeStrokes: BoardStroke[] = edges.map((edge) => ({
      points: [vertices[edge[0] as keyof typeof vertices], vertices[edge[1] as keyof typeof vertices]],
      color: '#172033',
      width: 2.5,
      tool: 'line',
    }));
    const labels: BoardText[] = Object.entries(vertices).map(([label, point]) => ({
      text: label,
      x: point.x + (label === 'A' || label === 'D' || label === 'E' || label === 'H' ? -0.02 : 0.01),
      y: point.y + (label === 'A' || label === 'B' || label === 'E' || label === 'F' ? -0.02 : 0.02),
      color: '#172033',
      scale: 0.75,
    }));
    remember();
    updateScene((previous) => ({
      ...previous,
      strokes: [...previous.strokes, ...cubeStrokes],
      texts: [...previous.texts, ...labels],
    }));
    setSelection({ type: 'stroke', index: scene.strokes.length });
    setNotice('Added an editable, labelled 2D cube. Select its edges or labels to adjust them.');
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
    const savedScene = board.scene;
    const strokes = Array.isArray(savedScene.strokes)
      ? savedScene.strokes.filter(isStroke).map((stroke) => ({
        ...stroke,
        tool: isTool(stroke.tool) ? stroke.tool : 'pen',
      }))
      : [];
    const texts = Array.isArray(savedScene.labels) ? savedScene.labels.filter(isBoardText) : [];
    const restoredEquation = typeof savedScene.equation === 'string' ? savedScene.equation : 'y = x² - 3';
    const restoredView = savedScene.view && typeof savedScene.view === 'object'
      ? savedScene.view as Partial<ViewTransform>
      : {};
    const restoredModel = isWorkspaceLearningModelId(savedScene.visualModel) ? savedScene.visualModel : null;
    setScene({
      strokes,
      texts,
      equation: restoredEquation,
      graphOnBoard: savedScene.graphOnBoard === true,
      boardSize: savedScene.boardSize === 'wide' || savedScene.boardSize === 'portrait' ? savedScene.boardSize : 'fit',
      recognizedText: typeof savedScene.recognizedText === 'string' ? savedScene.recognizedText : '',
      subject: typeof savedScene.subject === 'string' ? savedScene.subject : '',
      visualModel: restoredModel,
    });
    setView({
      zoom: typeof restoredView.zoom === 'number' ? Math.max(0.5, Math.min(3, restoredView.zoom)) : 1,
      x: typeof restoredView.x === 'number' ? restoredView.x : 0,
      y: typeof restoredView.y === 'number' ? restoredView.y : 0,
    });
    setImage(board.image?.dataUrl || null);
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
        }
        setOpen(nextOpen);
      }}>
        <DialogContent className="!fixed !inset-0 !left-0 !top-0 !z-[100] !flex !h-[100dvh] !max-h-[100dvh] !w-screen !max-w-none !translate-x-0 !translate-y-0 !flex-col !gap-0 !overflow-hidden !rounded-none !border-0 !bg-[#111315] !p-0 text-white [&>button:last-child]:hidden">
          <DialogTitle className="sr-only">FaceMeX Smartboard</DialogTitle>
          <DialogDescription className="sr-only">A full-screen whiteboard for drawing, editing and saving your work.</DialogDescription>
          <main className="relative min-h-0 flex-1 overflow-hidden bg-[#111315]">
            <section aria-label="Whiteboard canvas" className="absolute inset-0 flex items-center justify-center p-2 pt-[calc(env(safe-area-inset-top)_+_4.25rem)] pb-[calc(env(safe-area-inset-bottom)_+_5.5rem)] sm:p-4 sm:pt-20 sm:pb-24">
              <div className={`overflow-hidden rounded-xl bg-white ${scene.boardSize === 'fit' ? 'h-full w-full' : scene.boardSize === 'wide' ? 'aspect-video max-h-full w-full max-w-full' : 'aspect-[0.707] h-full w-auto max-w-full'}`}>
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
              <Button type="button" size="icon" variant="ghost" className="h-10 w-10 rounded-full text-white hover:bg-white/10" aria-label="Close Smartboard" title="Close" onClick={() => { analysisRequestRef.current += 1; setAnalyzing(false); setOpen(false); }}>
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
                      <Button type="button" variant="outline" className="min-h-10 border-white/10 bg-white/5 text-white hover:bg-white/10" aria-pressed={modelsOpen} onClick={() => setModelsOpen((value) => !value)}><Box className="mr-2 h-4 w-4" />Subject models</Button>
                      <Button type="button" variant="outline" className="min-h-10 border-white/10 bg-white/5 text-white hover:bg-white/10" aria-pressed={settingsOpen} onClick={() => setSettingsOpen((value) => !value)}><Settings2 className="mr-2 h-4 w-4" />Board settings</Button>
                      <Button type="button" variant="outline" className="min-h-10 border-white/10 bg-white/5 text-rose-200 hover:bg-rose-950/40" onClick={clearBoard}><Trash2 className="mr-2 h-4 w-4" />Clear board</Button>
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
                    {modelsOpen && (
                      <div className="mt-3">
                        <WorkspaceLearningModels
                          key={scene.visualModel || 'water'}
                          initialModel={scene.visualModel || undefined}
                          onExplain={onSolve}
                        />
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

            {shapeCandidate && !presentation && (
              <section style={{ top: 'calc(env(safe-area-inset-top) + 7.5rem)' }} className="absolute left-1/2 z-20 w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 p-3 text-slate-900 shadow-xl" aria-live="polite">
                <p className="text-sm font-medium">This may be a {shapeCandidate.tool}.</p>
                <p className="mt-1 text-xs text-slate-600">Keep your original drawing, or replace it with a clean editable shape.</p>
                <div className="mt-2 flex gap-2">
                  <Button type="button" className="min-h-9 bg-slate-900 px-3 text-xs text-white hover:bg-slate-700" onClick={applyShapeCleanup}>Clean up shape</Button>
                  <Button type="button" variant="outline" className="min-h-9 px-3 text-xs" onClick={() => setShapeCandidate(null)}>Keep original</Button>
                </div>
              </section>
            )}
            {(error || notice) && (
              <p
                role={error ? 'alert' : 'status'}
                style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.25rem)' }}
                className={`absolute left-3 right-3 z-20 mx-auto max-w-xl rounded-xl border border-white/10 bg-[#191c20]/95 p-3 text-center text-xs shadow-xl ${error ? 'text-rose-200' : 'text-emerald-200'}`}
              >
                {error || notice}
              </p>
            )}

            {!presentation && mode === 'markup' && (
              <div style={{ top: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="absolute left-1/2 z-20 flex max-w-[calc(100%-1.25rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full border border-black/10 bg-white/95 p-1 shadow-lg backdrop-blur">
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
                  <Button key={name} type="button" size="icon" variant="ghost" className={`h-9 w-9 shrink-0 rounded-full ${tool === name ? 'bg-slate-200 text-slate-950' : 'text-slate-700 hover:bg-slate-100'}`} aria-label={label} title={label} aria-pressed={tool === name} onClick={() => setTool(name)}>
                    <Icon className="h-4 w-4" />
                  </Button>
                ))}
                <label className="flex h-9 shrink-0 items-center px-1" title="Pen colour">
                  <input aria-label="Pen colour" type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0" />
                </label>
                <input aria-label="Pen thickness" title="Pen thickness" type="range" min="1" max="18" value={width} onChange={(event) => setWidth(Number(event.target.value))} className="w-16 accent-slate-800" />
                <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0 rounded-full text-slate-700 hover:bg-slate-100" aria-label="Add text" title="Add text" onClick={() => { setTextComposerOpen(true); window.setTimeout(() => textRef.current?.focus(), 0); }}><Type className="h-4 w-4" /></Button>
                <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0 rounded-full text-slate-700 hover:bg-slate-100" aria-label="Open mathematical symbol input" title="Math symbols" onClick={() => { setTextComposerOpen(true); setMathKeyboardOpen(true); window.setTimeout(() => textRef.current?.focus(), 0); }}>∑</Button>
              </div>
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
                    {['x²', 'x³', 'xⁿ', '√', '∛', 'a/b', 'π', 'θ', '∫', '∑', '≤', '≥', '≠', '()', '[]', '×', '÷', '−', '∂', 'lim', '→'].map((symbol) => (
                      <Button key={symbol} type="button" variant="outline" aria-label={`Insert ${symbol}`} className="h-8 min-w-9 px-2 text-sm text-slate-800" onClick={() => insertMathSymbol(symbol)}>{symbol}</Button>
                    ))}
                  </div>
                )}
              </form>
            )}

            {!presentation && selection && (
              <section style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.25rem)' }} className="absolute left-1/2 z-20 flex max-w-[calc(100%-1rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-2xl border border-white/10 bg-[#191c20]/95 p-2 shadow-xl backdrop-blur" aria-label="Selected object actions">
                {selectedText && <Button type="button" variant="ghost" className="min-h-9 px-3 text-xs text-white hover:bg-white/10" onClick={editSelectedText}>Edit text</Button>}
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
                {selectedText && (
                  <>
                    <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-white hover:bg-white/10" aria-label="Shrink selected text" onClick={() => resizeSelectedText(0.85)}><Minus className="h-4 w-4" /></Button>
                    <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-white hover:bg-white/10" aria-label="Enlarge selected text" onClick={() => resizeSelectedText(1.15)}><Plus className="h-4 w-4" /></Button>
                  </>
                )}
              </div>
            )}

            {analyzing && !presentation && (
              <p style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.25rem)' }} className="absolute left-3 right-3 z-20 mx-auto max-w-xl rounded-xl bg-[#191c20]/90 px-3 py-2 text-center text-xs text-white/70 shadow sm:left-auto sm:right-6 sm:w-auto" role="status">
                Understanding your work…
              </p>
            )}

            {analysisError && !presentation && (
              <section style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.25rem)' }} className="absolute left-3 right-3 z-20 mx-auto max-w-xl rounded-2xl border border-rose-200/20 bg-[#191c20]/95 p-3 text-white shadow-xl sm:left-auto sm:right-6" role="alert">
                <p className="text-sm">{analysisError}</p>
                <Button type="button" variant="ghost" className="mt-1 min-h-9 px-2 text-xs text-white hover:bg-white/10" onClick={retryAnalysis}>Retry analysis</Button>
              </section>
            )}

            {suggestion && !presentation && (
              <section style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.25rem)' }} className="absolute left-3 right-3 z-20 mx-auto max-h-[38dvh] max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#191c20]/95 p-3 text-white shadow-xl sm:left-auto sm:right-6" aria-live="polite">
                <p className="whitespace-pre-wrap text-sm leading-5">{suggestion}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Button type="button" className="min-h-9 bg-white/15 text-xs text-white hover:bg-white/20" onClick={acceptSuggestion}>Add to board</Button>
                  <Button type="button" variant="ghost" className="min-h-9 text-xs text-white/75 hover:bg-white/10" onClick={editSuggestion}>Edit</Button>
                  {selectedText && <Button type="button" variant="ghost" className="min-h-9 text-xs text-white/75 hover:bg-white/10" onClick={replaceSelectedTextWithSuggestion}>Replace selected text</Button>}
                  {scene.recognizedText && <Button type="button" variant="ghost" className="min-h-9 text-xs text-white/75 hover:bg-white/10" onClick={() => onSolve(scene.recognizedText)}>Explain</Button>}
                  {recognizedCoefficients && (
                    <>
                      <Button type="button" variant="ghost" className="min-h-9 text-xs text-white/75 hover:bg-white/10" onClick={() => {
                        remember();
                        updateScene((previous) => ({
                          ...previous,
                          equation: scene.recognizedText,
                          graphOnBoard: true,
                        }));
                        setSuggestion('');
                      }}>Plot on board</Button>
                      <Button type="button" variant="ghost" className="min-h-9 text-xs text-white/75 hover:bg-white/10" onClick={() => onSolve(scene.recognizedText)}>Find turning point</Button>
                    </>
                  )}
                  {scene.visualModel && (
                    <Button type="button" variant="ghost" className="min-h-9 text-xs text-white/75 hover:bg-white/10" onClick={() => {
                      if (moreMenuRef.current) moreMenuRef.current.open = true;
                      setModelsOpen(true);
                    }}>Open interactive visual</Button>
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
