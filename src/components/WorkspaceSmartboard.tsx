import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Circle,
  Download,
  Eraser,
  FolderOpen,
  Hexagon,
  Highlighter,
  Minus,
  Pencil,
  Play,
  Presentation,
  Redo2,
  Save,
  Sparkles,
  Square,
  Trash2,
  Triangle,
  Type,
  Undo2,
  Upload,
  ZoomIn,
  ZoomOut,
  Pause,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import WorkspaceLearningModels from '@/components/WorkspaceLearningModels';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { parseQuadraticEquation, sampleQuadratic, solveQuadraticEquation } from '@/lib/workspaceGraph';
import type {
  WorkspaceSmartboardLesson,
  WorkspaceSmartboardLessonDraft,
} from '@/lib/projects';

type DrawingTool = 'select' | 'pen' | 'highlighter' | 'eraser' | 'line' | 'arrow' | 'rectangle' | 'ellipse' | 'triangle' | 'polygon';
type CanvasStyle = 'whiteboard' | 'blackboard' | 'grid' | 'graph' | 'transparent';
type Stroke = {
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
  tool?: DrawingTool;
};

type BoardLabel = {
  text: string;
  x: number;
  y: number;
  color: string;
};

function isBoardStroke(value: unknown): value is Stroke {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const stroke = value as Partial<Stroke>;
  const validTools: DrawingTool[] = ['select', 'pen', 'highlighter', 'eraser', 'line', 'arrow', 'rectangle', 'ellipse', 'triangle', 'polygon'];
  return typeof stroke.color === 'string' && /^#[\da-f]{6}$/i.test(stroke.color) &&
    typeof stroke.width === 'number' && Number.isFinite(stroke.width) && stroke.width > 0 && stroke.width <= 100 &&
    (stroke.tool === undefined || validTools.includes(stroke.tool)) &&
    Array.isArray(stroke.points) && stroke.points.length > 0 &&
    stroke.points.every((point) => point && Number.isFinite(point.x) && Number.isFinite(point.y) &&
      point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1);
}

function isBoardLabel(value: unknown): value is BoardLabel {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const label = value as Partial<BoardLabel>;
  return typeof label.text === 'string' && label.text.length <= 120 &&
    typeof label.x === 'number' && Number.isFinite(label.x) && label.x >= 0 && label.x <= 1 &&
    typeof label.y === 'number' && Number.isFinite(label.y) && label.y >= 0 && label.y <= 1 &&
    typeof label.color === 'string' && /^#[\da-f]{6}$/i.test(label.color);
}

type WorkspaceSmartboardProps = {
  onRecognizeDrawing: (imageDataUrl: string) => Promise<string | undefined>;
  onSolve: (expression: string) => void;
  onAnalyzeDrawing: (imageDataUrl: string, instruction: string) => Promise<string | undefined>;
  onSaveLesson: (lesson: WorkspaceSmartboardLessonDraft) => Promise<WorkspaceSmartboardLesson>;
  onListLessons: () => Promise<WorkspaceSmartboardLesson[]>;
};

function readImageFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Could not read the image.'));
    reader.readAsDataURL(file);
  });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
}

function formatEquation({ a, b, c }: { a: number; b: number; c: number }) {
  const terms: string[] = [];
  if (a !== 0) terms.push(`${a === 1 ? '' : a === -1 ? '-' : formatNumber(a)}x²`);
  if (b !== 0) terms.push(`${b > 0 && terms.length ? '+' : ''}${b === 1 ? '' : b === -1 ? '-' : formatNumber(b)}x`);
  if (c !== 0 || !terms.length) terms.push(`${c > 0 && terms.length ? '+' : ''}${formatNumber(c)}`);
  return `y = ${terms.join(' ')}`;
}

function QuadraticGraph({
  coefficients,
  setCoefficientA,
}: {
  coefficients: { a: number; b: number; c: number };
  setCoefficientA: (value: number) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [centerX, setCenterX] = useState(0);
  const [pointerPoint, setPointerPoint] = useState<{ x: number; y: number } | null>(null);
  const plot = { left: 60, top: 24, width: 550, height: 300 };
  const minimumX = centerX - 5 / zoom;
  const maximumX = centerX + 5 / zoom;
  const sampled = useMemo(
    () => sampleQuadratic(coefficients, minimumX, maximumX),
    [coefficients, minimumX, maximumX],
  );
  const minimumY = Math.min(0, ...(sampled?.points.map((point) => point.y) || [0]));
  const maximumY = Math.max(0, ...(sampled?.points.map((point) => point.y) || [1]));
  const verticalPadding = Math.max((maximumY - minimumY) * 0.08, 1);
  const yMinimum = minimumY - verticalPadding;
  const yMaximum = maximumY + verticalPadding;
  const xFor = (x: number) => plot.left + ((x - minimumX) / (maximumX - minimumX)) * plot.width;
  const yFor = (y: number) => plot.top + ((yMaximum - y) / (yMaximum - yMinimum)) * plot.height;
  const path = sampled?.points.map((point, index) =>
    `${index === 0 ? 'M' : 'L'} ${xFor(point.x).toFixed(2)} ${yFor(point.y).toFixed(2)}`
  ).join(' ') || '';
  const xAxisY = yFor(0);
  const yAxisX = minimumX <= 0 && maximumX >= 0 ? xFor(0) : plot.left;
  const tickStep = Math.max(1, Math.ceil((maximumX - minimumX) / 10));
  const xTicks = Array.from(
    { length: Math.floor((maximumX - minimumX) / tickStep) + 1 },
    (_, index) => Math.ceil(minimumX / tickStep) * tickStep + index * tickStep,
  ).filter((value) => value <= maximumX);
  const yTickStep = Math.max(1, Math.ceil((yMaximum - yMinimum) / 8));
  const yTicks = Array.from(
    { length: Math.floor((yMaximum - yMinimum) / yTickStep) + 1 },
    (_, index) => Math.ceil(yMinimum / yTickStep) * yTickStep + index * yTickStep,
  ).filter((value) => value <= yMaximum);

  const inspectPoint = (event: ReactPointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const svgX = ((event.clientX - bounds.left) / bounds.width) * 640;
    const x = minimumX + ((svgX - plot.left) / plot.width) * (maximumX - minimumX);
    if (svgX < plot.left || svgX > plot.left + plot.width) {
      setPointerPoint(null);
      return;
    }
    setPointerPoint({ x, y: coefficients.a * x ** 2 + coefficients.b * x + coefficients.c });
  };

  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-[#151515] p-3 sm:p-4" aria-label="Interactive quadratic graph">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Interactive graph</h3>
          <p className="mt-1 text-xs text-white/60">{formatEquation(coefficients)}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" size="icon" variant="ghost" aria-label="Zoom out" className="h-9 w-9 text-white/80 hover:bg-white/10" onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" aria-label="Zoom in" className="h-9 w-9 text-white/80 hover:bg-white/10" onClick={() => setZoom((value) => Math.min(3, value + 0.25))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-3 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0d0d0d]">
        <svg
          viewBox="0 0 640 370"
          role="img"
          aria-label={`Graph of ${formatEquation(coefficients)} with axes, intercepts and turning point`}
          className="block h-auto w-full touch-pan-y"
          onPointerMove={inspectPoint}
          onPointerLeave={() => setPointerPoint(null)}
        >
          {yTicks.map((tick) => (
            <g key={`y-${tick}`}>
              <line x1={plot.left} y1={yFor(tick)} x2={plot.left + plot.width} y2={yFor(tick)} stroke="rgba(255,255,255,.09)" />
              <text x={plot.left - 8} y={yFor(tick) + 4} textAnchor="end" fill="rgba(255,255,255,.55)" fontSize="11">{formatNumber(tick)}</text>
            </g>
          ))}
          {xTicks.map((tick) => (
            <g key={`x-${tick}`}>
              <line x1={xFor(tick)} y1={plot.top} x2={xFor(tick)} y2={plot.top + plot.height} stroke="rgba(255,255,255,.08)" />
              <text x={xFor(tick)} y={plot.top + plot.height + 18} textAnchor="middle" fill="rgba(255,255,255,.55)" fontSize="11">{formatNumber(tick)}</text>
            </g>
          ))}
          <line x1={plot.left} y1={xAxisY} x2={plot.left + plot.width} y2={xAxisY} stroke="rgba(255,255,255,.65)" strokeWidth="1.5" />
          <line x1={yAxisX} y1={plot.top} x2={yAxisX} y2={plot.top + plot.height} stroke="rgba(255,255,255,.65)" strokeWidth="1.5" />
          <text x={plot.left + plot.width - 6} y={xAxisY - 8} textAnchor="end" fill="white" fontSize="12">x</text>
          <text x={yAxisX + 8} y={plot.top + 13} fill="white" fontSize="12">y</text>
          <path d={path} fill="none" stroke="#9bb9ff" strokeWidth="3" strokeLinejoin="round" />
          {sampled?.roots.map((root) => (
            <circle key={`root-${root}`} cx={xFor(root)} cy={xAxisY} r="5" fill="#ffc76b" stroke="#151515" strokeWidth="2">
              <title>{`x-intercept (${formatNumber(root)}, 0)`}</title>
            </circle>
          ))}
          {sampled?.vertex && (
            <circle cx={xFor(sampled.vertex.x)} cy={yFor(sampled.vertex.y)} r="5" fill="#78d8ac" stroke="#151515" strokeWidth="2">
              <title>{`Turning point (${formatNumber(sampled.vertex.x)}, ${formatNumber(sampled.vertex.y)})`}</title>
            </circle>
          )}
          {pointerPoint && (
            <circle cx={xFor(pointerPoint.x)} cy={yFor(pointerPoint.y)} r="4" fill="white" stroke="#9bb9ff" strokeWidth="2">
              <title>{`(${formatNumber(pointerPoint.x)}, ${formatNumber(pointerPoint.y)})`}</title>
            </circle>
          )}
        </svg>
      </div>
      <p className="mt-2 min-h-5 text-xs text-white/65" aria-live="polite">
        {pointerPoint
          ? `x = ${formatNumber(pointerPoint.x)}, y = ${formatNumber(pointerPoint.y)}`
          : sampled?.vertex
            ? `Turning point (${formatNumber(sampled.vertex.x)}, ${formatNumber(sampled.vertex.y)}); x-intercepts ${sampled.roots.length ? sampled.roots.map(formatNumber).join(' and ') : 'not real'}.`
            : `y-intercept: (0, ${formatNumber(coefficients.c)}). Drag across the curve to inspect coordinates.`}
      </p>
      {coefficients.a !== 0 && (
        <label className="mt-3 block text-xs text-white/70">
          Change a in y = ax² + bx + c
          <input
            type="range"
            min="-5"
            max="5"
            step="0.1"
            value={coefficients.a}
            onChange={(event) => setCoefficientA(Number(event.target.value))}
            className="mt-2 block h-8 w-full accent-[#9bb9ff]"
          />
          <span className="text-white">a = {formatNumber(coefficients.a)}</span>
        </label>
      )}
      <label className="mt-3 block text-xs text-white/70">
        Pan horizontally
        <input
          type="range"
          min="-5"
          max="5"
          step="0.25"
          value={centerX}
          onChange={(event) => setCenterX(Number(event.target.value))}
          className="mt-2 block h-8 w-full accent-[#9bb9ff]"
        />
      </label>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/65" aria-label="Graph legend">
        <li className="flex items-center gap-2"><span className="h-2 w-3 rounded bg-[#9bb9ff]" />{formatEquation(coefficients)}</li>
        {sampled?.roots.map((root) => <li key={`root-legend-${root}`} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#ffc76b]" />x-intercept</li>)}
        {sampled?.vertex && <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#78d8ac]" />turning point</li>}
      </ul>
    </section>
  );
}

export default function WorkspaceSmartboard({
  onRecognizeDrawing,
  onSolve,
  onAnalyzeDrawing,
  onSaveLesson,
  onListLessons,
}: WorkspaceSmartboardProps) {
  const [open, setOpen] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [labels, setLabels] = useState<BoardLabel[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [penColor, setPenColor] = useState('#111827');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [tool, setTool] = useState<DrawingTool>('pen');
  const [canvasStyle, setCanvasStyle] = useState<CanvasStyle>('whiteboard');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [recognition, setRecognition] = useState('');
  const [recognizing, setRecognizing] = useState(false);
  const [analyzingDrawing, setAnalyzingDrawing] = useState(false);
  const [equation, setEquation] = useState('y = x² - 3');
  const [coefficientA, setCoefficientA] = useState<number | null>(null);
  const [imageError, setImageError] = useState('');
  const [lessonTitle, setLessonTitle] = useState('Untitled lesson');
  const [learningObjectives, setLearningObjectives] = useState('');
  const [textLabel, setTextLabel] = useState('');
  const [savedLesson, setSavedLesson] = useState<WorkspaceSmartboardLesson | null>(null);
  const [savedLessons, setSavedLessons] = useState<WorkspaceSmartboardLesson[]>([]);
  const [showSavedLessons, setShowSavedLessons] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [lessonMessage, setLessonMessage] = useState('');
  const [lessonError, setLessonError] = useState('');
  const [presentationMode, setPresentationMode] = useState(false);
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const [autoImproveWriting, setAutoImproveWriting] = useState(true);
  const [writingSuggestion, setWritingSuggestion] = useState('');
  const [suggestionError, setSuggestionError] = useState('');
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(15 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const lastSuggestionSignatureRef = useRef('');
  const onAnalyzeDrawingRef = useRef(onAnalyzeDrawing);
  const graphCoefficients = useMemo(() => parseQuadraticEquation(equation), [equation]);
  const effectiveCoefficients = graphCoefficients && coefficientA !== null
    ? { ...graphCoefficients, a: coefficientA }
    : graphCoefficients;
  const equationSolution = coefficientA === null ? solveQuadraticEquation(equation) : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const context = canvas.getContext('2d');
      if (!context) return;
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * ratio);
      canvas.height = Math.round(bounds.height * ratio);
      context.scale(ratio, ratio);
      if (canvasStyle === 'transparent') {
        context.clearRect(0, 0, bounds.width, bounds.height);
      } else {
        context.fillStyle = canvasStyle === 'blackboard' ? '#17231d' : '#ffffff';
        context.fillRect(0, 0, bounds.width, bounds.height);
        if (canvasStyle === 'grid' || canvasStyle === 'graph') {
          const spacing = canvasStyle === 'graph' ? 24 : 30;
          context.beginPath();
          context.strokeStyle = canvasStyle === 'graph' ? 'rgba(80,125,190,.22)' : 'rgba(80,90,110,.12)';
          context.lineWidth = 1;
          for (let x = spacing; x < bounds.width; x += spacing) {
            context.moveTo(x, 0);
            context.lineTo(x, bounds.height);
          }
          for (let y = spacing; y < bounds.height; y += spacing) {
            context.moveTo(0, y);
            context.lineTo(bounds.width, y);
          }
          context.stroke();
        }
      }
      context.lineCap = 'round';
      context.lineJoin = 'round';
      for (const stroke of strokes) {
        if (!stroke.points.length) continue;
        context.beginPath();
        context.strokeStyle = stroke.tool === 'eraser'
          ? canvasStyle === 'blackboard' ? '#17231d' : '#ffffff'
          : stroke.color;
        context.lineWidth = stroke.width;
        const firstPoint = stroke.points[0];
        const lastPoint = stroke.points[stroke.points.length - 1];
        const startX = firstPoint.x * bounds.width;
        const startY = firstPoint.y * bounds.height;
        const endX = lastPoint.x * bounds.width;
        const endY = lastPoint.y * bounds.height;
        if (stroke.tool === 'highlighter') context.globalAlpha = 0.3;
        if (stroke.tool === 'line' || stroke.tool === 'arrow') {
          context.moveTo(startX, startY);
          context.lineTo(endX, endY);
          context.stroke();
          if (stroke.tool === 'arrow') {
            const angle = Math.atan2(endY - startY, endX - startX);
            const headSize = Math.max(10, stroke.width * 3);
            context.beginPath();
            context.moveTo(endX, endY);
            context.lineTo(endX - headSize * Math.cos(angle - Math.PI / 6), endY - headSize * Math.sin(angle - Math.PI / 6));
            context.moveTo(endX, endY);
            context.lineTo(endX - headSize * Math.cos(angle + Math.PI / 6), endY - headSize * Math.sin(angle + Math.PI / 6));
            context.stroke();
          }
        } else if (stroke.tool === 'rectangle') {
          context.strokeRect(startX, startY, endX - startX, endY - startY);
        } else if (stroke.tool === 'ellipse' || stroke.tool === 'triangle' || stroke.tool === 'polygon') {
          const centerX = (startX + endX) / 2;
          const centerY = (startY + endY) / 2;
          const radiusX = Math.abs(endX - startX) / 2;
          const radiusY = Math.abs(endY - startY) / 2;
          if (stroke.tool === 'ellipse') {
            context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
          } else {
            const sides = stroke.tool === 'triangle' ? 3 : 6;
            for (let side = 0; side <= sides; side += 1) {
              const angle = -Math.PI / 2 + (side * Math.PI * 2) / sides;
              const x = centerX + radiusX * Math.cos(angle);
              const y = centerY + radiusY * Math.sin(angle);
              if (side === 0) context.moveTo(x, y);
              else context.lineTo(x, y);
            }
          }
          context.stroke();
        } else {
          context.moveTo(startX, startY);
          for (const point of stroke.points.slice(1)) {
            context.lineTo(point.x * bounds.width, point.y * bounds.height);
          }
          if (stroke.points.length === 1) {
            context.lineTo(startX + 0.1, startY + 0.1);
          }
          context.stroke();
        }
        context.globalAlpha = 1;
      }
      context.font = '600 18px system-ui, sans-serif';
      context.textBaseline = 'middle';
      for (const label of labels) {
        context.fillStyle = label.color;
        context.fillText(label.text, label.x * bounds.width, label.y * bounds.height);
      }
    };
    draw();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [strokes, labels, canvasStyle, open]);

  useEffect(() => {
    onAnalyzeDrawingRef.current = onAnalyzeDrawing;
  }, [onAnalyzeDrawing]);

  useEffect(() => {
    if (!open) return;
    const handleBoardShortcuts = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleBoardShortcuts);
    return () => window.removeEventListener('keydown', handleBoardShortcuts);
  }, [open, strokes, redoStack]);

  useEffect(() => {
    if (!open || !autoImproveWriting || uploadedImage || !strokes.length || presentationMode) return;
    const signature = strokes
      .map((stroke) => {
        const lastPoint = stroke.points[stroke.points.length - 1];
        return `${stroke.tool || 'pen'}:${stroke.points.length}:${lastPoint?.x.toFixed(3)}:${lastPoint?.y.toFixed(3)}`;
      })
      .join('|');
    if (!signature || signature === lastSuggestionSignatureRef.current) return;

    const timeoutId = window.setTimeout(async () => {
      if (activeStrokeRef.current || !canvasRef.current || signature === lastSuggestionSignatureRef.current) return;
      lastSuggestionSignatureRef.current = signature;
      setSuggestionDismissed(false);
      setWritingSuggestion('');
      setSuggestionError('');
      setAnalyzingDrawing(true);
      try {
        const response = await onAnalyzeDrawingRef.current(
          canvasRef.current.toDataURL('image/png'),
          'Review the handwritten text or notes on this whiteboard. If legible ordinary-language notes are present, return one polished, accurate sentence that preserves their meaning. Do not solve equations or invent missing content. If this is mainly a drawing, diagram, or equation rather than prose, return one short sentence identifying its visible subject and a useful next learning action. If essential marks are genuinely unreadable, ask one focused clarification. Return only the suggested sentence or question, without headings or markdown.',
        );
        if (response?.trim()) setWritingSuggestion(response.trim());
      } catch {
        setWritingSuggestion('');
        setSuggestionError('FaceMeX could not suggest an improvement. You can try Explain board.');
      } finally {
        setAnalyzingDrawing(false);
      }
    }, 1000);
    return () => window.clearTimeout(timeoutId);
  }, [open, autoImproveWriting, uploadedImage, strokes, presentationMode]);

  useEffect(() => {
    if (!timerRunning) return;
    const timerId = window.setInterval(() => {
      setTimerSeconds((seconds) => {
        if (seconds <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [timerRunning]);

  useEffect(() => {
    setCoefficientA(null);
  }, [equation]);

  const pointFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    };
  };

  const beginStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setWritingSuggestion('');
    setSuggestionError('');
    setSuggestionDismissed(false);
    const stroke = {
      points: [pointFromEvent(event)],
      color: tool === 'eraser' ? '#ffffff' : penColor,
      width: tool === 'eraser' ? Math.max(strokeWidth * 4, 18) : strokeWidth,
      tool,
    };
    activeStrokeRef.current = stroke;
    setRedoStack([]);
    setStrokes((previous) => [...previous, stroke]);
  };

  const continueStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const activeStroke = activeStrokeRef.current;
    if (!activeStroke) return;
    const nextPoint = pointFromEvent(event);
    const nextStroke = {
      ...activeStroke,
      points: activeStroke.tool === 'line' || activeStroke.tool === 'arrow' ||
        activeStroke.tool === 'rectangle' || activeStroke.tool === 'ellipse' ||
        activeStroke.tool === 'triangle' || activeStroke.tool === 'polygon'
        ? [activeStroke.points[0], nextPoint]
        : [...activeStroke.points, nextPoint],
    };
    activeStrokeRef.current = nextStroke;
    setStrokes((previous) => [...previous.slice(0, -1), nextStroke]);
  };

  const finishStroke = () => {
    activeStrokeRef.current = null;
  };

  const readUploadedImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setImageError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageError('Choose an image file to read your handwriting.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImageError('Image must be 10 MB or smaller.');
      return;
    }
    try {
      setUploadedImage(await readImageFile(file));
      setRecognition('');
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Could not load this image.');
    }
  };

  const recognize = async () => {
    const canvas = canvasRef.current;
    const image = uploadedImage || (strokes.length || labels.length ? canvas?.toDataURL('image/png') : null);
    if (!image) return;
    setRecognizing(true);
    setRecognition('');
    setImageError('');
    try {
      const response = await onRecognizeDrawing(image);
      const recognizedText = String(response || '').trim();
      if (!recognizedText) throw new Error('FaceMeX could not recognize the handwriting. Please try a clearer image.');
      setRecognition(recognizedText);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Handwriting recognition failed.');
    } finally {
      setRecognizing(false);
    }
  };

  const analyzeDrawing = async (instruction: string) => {
    const canvas = canvasRef.current;
    const image = uploadedImage || (strokes.length || labels.length ? canvas?.toDataURL('image/png') : null);
    if (!image) {
      setImageError('Draw or upload something on the board first.');
      return;
    }
    setAnalyzingDrawing(true);
    setImageError('');
    setSuggestionError('');
    try {
      const response = await onAnalyzeDrawing(image, instruction);
      if (response?.trim()) {
        setWritingSuggestion(response.trim());
        setSuggestionDismissed(false);
      }
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'FaceMeX could not analyze the board.');
    } finally {
      setAnalyzingDrawing(false);
    }
  };

  const downloadDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'facemex-smartboard.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const undo = () => {
    if (!strokes.length) return;
    setRedoStack((previous) => [...previous, strokes[strokes.length - 1]]);
    setStrokes((previous) => previous.slice(0, -1));
  };

  const redo = () => {
    const stroke = redoStack[redoStack.length - 1];
    if (!stroke) return;
    setStrokes((previous) => [...previous, stroke]);
    setRedoStack((previous) => previous.slice(0, -1));
  };

  const clearCanvas = () => {
    setStrokes([]);
    setLabels([]);
    setRedoStack([]);
    setUploadedImage(null);
    setRecognition('');
  };

  const solveExpression = (expression: string) => {
    if (!expression.trim()) return;
    onSolve(expression.trim());
    setOpen(false);
  };

  const addLabel = () => {
    const value = textLabel.trim();
    if (!value) return;
    setLabels((previous) => [...previous, { text: value, x: 0.5, y: 0.5, color: penColor }]);
    setTextLabel('');
  };

  const saveLesson = async () => {
    setSavingLesson(true);
    setLessonError('');
    setLessonMessage('');
    const scene: Record<string, unknown> = {
      strokes,
      labels,
      equation,
      learningObjectives,
      canvasStyle,
    };
    try {
      const saved = await onSaveLesson({
        ...(savedLesson ? { id: savedLesson.id, conversationId: savedLesson.conversationId, createdAt: savedLesson.createdAt } : {}),
        title: lessonTitle,
        scene,
        ...(uploadedImage ? {
          image: {
            id: crypto.randomUUID(),
            name: 'Smartboard image',
            dataUrl: uploadedImage,
          },
        } : {}),
      });
      setSavedLesson(saved);
      setLessonTitle(saved.title);
      setLessonMessage('Lesson saved to your FaceMeX account.');
    } catch (error) {
      setLessonError(error instanceof Error ? error.message : 'The lesson could not be saved.');
    } finally {
      setSavingLesson(false);
    }
  };

  const loadSavedLessons = async () => {
    setLoadingLessons(true);
    setLessonError('');
    try {
      setSavedLessons(await onListLessons());
      setShowSavedLessons(true);
    } catch (error) {
      setLessonError(error instanceof Error ? error.message : 'Saved lessons could not be loaded.');
    } finally {
      setLoadingLessons(false);
    }
  };

  const restoreLesson = (lesson: WorkspaceSmartboardLesson) => {
    const scene = lesson.scene;
    setStrokes(Array.isArray(scene.strokes) ? scene.strokes.filter(isBoardStroke) : []);
    setLabels(Array.isArray(scene.labels) ? scene.labels.filter(isBoardLabel) : []);
    setEquation(typeof scene.equation === 'string' ? scene.equation : '');
    setLearningObjectives(typeof scene.learningObjectives === 'string' ? scene.learningObjectives : '');
    const savedCanvasStyle = scene.canvasStyle;
    setCanvasStyle(
      savedCanvasStyle === 'blackboard' || savedCanvasStyle === 'grid' ||
        savedCanvasStyle === 'graph' || savedCanvasStyle === 'transparent'
        ? savedCanvasStyle
        : 'whiteboard',
    );
    setLessonTitle(lesson.title);
    setUploadedImage(lesson.image?.dataUrl || null);
    setSavedLesson(lesson);
    setShowSavedLessons(false);
    setRedoStack([]);
    setRecognition('');
    setLessonMessage(`Opened “${lesson.title}”.`);
  };

  const formatTimer = (seconds: number) =>
    `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="h-9 shrink-0 gap-2 rounded-full border border-white/10 px-3 text-white/80 hover:bg-white/10 hover:text-white"
        aria-label="Open AI Smartboard"
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Smartboard</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={`flex max-h-[96dvh] w-[98vw] max-w-none flex-col gap-3 overflow-y-auto border-white/10 bg-[#101010] p-3 text-white sm:p-5 [&>button]:text-white ${presentationMode ? 'h-[100dvh] max-h-[100dvh] w-screen rounded-none' : 'h-[96dvh] sm:w-[96vw]'}`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <DialogTitle>AI Smartboard</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-white/60">
                Draw, teach, visualize and save lessons inside your FaceMeX workspace.
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              className="min-h-10 gap-2 border-white/15 bg-transparent text-white hover:bg-white/10"
              aria-pressed={presentationMode}
              onClick={() => setPresentationMode((value) => !value)}
            >
              <Presentation className="h-4 w-4" />
              {presentationMode ? 'Exit presentation' : 'Present'}
            </Button>
            {!presentationMode && (
              <>
                <Button type="button" size="icon" variant="ghost" aria-label="Save lesson" title="Save lesson" className="h-10 w-10 text-white/80 hover:bg-white/10" disabled={savingLesson} onClick={() => void saveLesson()}>
                  <Save className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" aria-label="Export board as PNG" title="Export board as PNG" className="h-10 w-10 text-white/80 hover:bg-white/10" disabled={!strokes.length && !labels.length} onClick={downloadDrawing}>
                  <Download className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {!presentationMode && !strokes.length && !uploadedImage && (
            <p className="text-center text-xs text-white/55">
              Draw, write or describe anything. FaceMeX can help turn your ideas into clear explanations, diagrams and supported interactive models.
            </p>
          )}

          {!presentationMode && (
            <details className="rounded-xl border border-white/10 bg-white/[0.035] p-3" aria-label="Lesson details and saved lessons">
              <summary className="cursor-pointer text-sm font-medium text-white/80">Lesson details and saved lessons</summary>
              <div className="pt-3">
              <label htmlFor="smartboard-lesson-title" className="text-xs font-medium text-white/70">Lesson title</label>
              <input
                id="smartboard-lesson-title"
                value={lessonTitle}
                onChange={(event) => setLessonTitle(event.target.value)}
                maxLength={120}
                className="mt-1 min-h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              />
              <label htmlFor="smartboard-learning-objectives" className="mt-3 block text-xs font-medium text-white/70">Learning objectives (optional)</label>
              <textarea
                id="smartboard-learning-objectives"
                value={learningObjectives}
                onChange={(event) => setLearningObjectives(event.target.value)}
                rows={2}
                maxLength={1000}
                placeholder="What should learners understand by the end?"
                className="mt-1 w-full resize-y rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button type="button" className="min-h-10 gap-2 rounded-xl bg-[#252525] text-white hover:bg-[#333]" disabled={savingLesson} onClick={() => void saveLesson()}>
                  <Save className="h-4 w-4" />{savingLesson ? 'Saving…' : 'Save lesson'}
                </Button>
                <Button type="button" variant="outline" className="min-h-10 border-white/15 bg-transparent text-white hover:bg-white/10" onClick={() => {
                  setSavedLesson(null);
                  setLessonTitle('Untitled lesson');
                  setLearningObjectives('');
                  setStrokes([]);
                  setLabels([]);
                  setRedoStack([]);
                  setUploadedImage(null);
                  setRecognition('');
                  setEquation('y = x² - 3');
                  setCoefficientA(null);
                  setLessonMessage('');
                  setLessonError('');
                }}>
                  New lesson
                </Button>
                <Button type="button" variant="outline" className="min-h-10 gap-2 border-white/15 bg-transparent text-white hover:bg-white/10" disabled={loadingLessons} onClick={() => void loadSavedLessons()}>
                  <FolderOpen className="h-4 w-4" />{loadingLessons ? 'Loading…' : 'Open saved lesson'}
                </Button>
                {savedLesson && <span className="text-xs text-white/50">Editing a saved lesson</span>}
              </div>
              {showSavedLessons && (
                <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-2" aria-label="Saved Smartboard lessons">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-white/70">Saved lessons</p>
                    <button type="button" className="min-h-8 px-2 text-xs text-white/60 hover:text-white" onClick={() => setShowSavedLessons(false)}>Close</button>
                  </div>
                  {savedLessons.length ? savedLessons.map((lesson) => (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => restoreLesson(lesson)}
                      className="mt-1 block min-h-10 w-full rounded-md px-2 text-left text-sm text-white/85 hover:bg-white/10"
                    >
                      {lesson.title}
                      <span className="ml-2 text-xs text-white/45">{new Date(lesson.createdAt).toLocaleDateString()}</span>
                    </button>
                  )) : <p className="py-2 text-xs text-white/50">No saved lessons yet.</p>}
                </div>
              )}
              {(lessonMessage || lessonError) && (
                <p role={lessonError ? 'alert' : 'status'} className={`mt-2 text-xs ${lessonError ? 'text-rose-300' : 'text-emerald-200'}`}>
                  {lessonError || lessonMessage}
                </p>
              )}
              </div>
            </details>
          )}

          {!presentationMode && (
          <div className="sticky top-0 z-20 flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/10 bg-[#171717]/95 p-2 shadow-lg sm:gap-2" role="toolbar" aria-label="Whiteboard tools">
            <Button type="button" variant="ghost" size="icon" className={`h-11 w-11 text-white/80 hover:bg-white/10 ${tool === 'pen' ? 'bg-white/10' : ''}`} aria-label="Pen tool" aria-pressed={tool === 'pen'} onClick={() => setTool('pen')}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className={`h-11 w-11 text-white/80 hover:bg-white/10 ${tool === 'highlighter' ? 'bg-white/10' : ''}`} aria-label="Highlighter tool" aria-pressed={tool === 'highlighter'} onClick={() => setTool('highlighter')}>
              <Highlighter className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className={`h-11 w-11 text-white/80 hover:bg-white/10 ${tool === 'eraser' ? 'bg-white/10' : ''}`} aria-label="Eraser tool" aria-pressed={tool === 'eraser'} onClick={() => setTool('eraser')}>
              <Eraser className="h-4 w-4" />
            </Button>
            <span className="mx-0.5 h-7 w-px bg-white/10" />
            <details className="relative">
              <summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-3 text-sm text-white/75 hover:bg-white/10">
                <Square className="h-4 w-4" />Shapes
              </summary>
              <div className="absolute left-0 top-full z-20 mt-2 flex gap-1 rounded-xl border border-white/10 bg-[#171717] p-2 shadow-xl">
            <Button type="button" variant="ghost" size="icon" className={`h-10 w-10 text-white/80 hover:bg-white/10 ${tool === 'line' ? 'bg-white/10' : ''}`} aria-label="Line tool" aria-pressed={tool === 'line'} onClick={() => setTool('line')}>
              <Minus className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className={`h-10 w-10 text-white/80 hover:bg-white/10 ${tool === 'arrow' ? 'bg-white/10' : ''}`} aria-label="Arrow tool" aria-pressed={tool === 'arrow'} onClick={() => setTool('arrow')}>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className={`h-10 w-10 text-white/80 hover:bg-white/10 ${tool === 'rectangle' ? 'bg-white/10' : ''}`} aria-label="Rectangle tool" aria-pressed={tool === 'rectangle'} onClick={() => setTool('rectangle')}>
              <Square className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className={`h-10 w-10 text-white/80 hover:bg-white/10 ${tool === 'ellipse' ? 'bg-white/10' : ''}`} aria-label="Ellipse tool" aria-pressed={tool === 'ellipse'} onClick={() => setTool('ellipse')}>
              <Circle className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className={`h-10 w-10 text-white/80 hover:bg-white/10 ${tool === 'triangle' ? 'bg-white/10' : ''}`} aria-label="Triangle tool" aria-pressed={tool === 'triangle'} onClick={() => setTool('triangle')}>
              <Triangle className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className={`h-10 w-10 text-white/80 hover:bg-white/10 ${tool === 'polygon' ? 'bg-white/10' : ''}`} aria-label="Hexagon polygon tool" aria-pressed={tool === 'polygon'} onClick={() => setTool('polygon')}>
              <Hexagon className="h-4 w-4" />
            </Button>
              </div>
            </details>
            <details className="relative">
              <summary className="flex h-11 cursor-pointer list-none items-center rounded-lg px-3 text-sm text-white/75 hover:bg-white/10">Style</summary>
              <div className="absolute left-0 top-full z-20 mt-2 grid min-w-56 gap-3 rounded-xl border border-white/10 bg-[#171717] p-3 shadow-xl">
            <label className="flex h-10 items-center gap-2 rounded-lg border border-white/10 px-2 text-xs text-white/70">
              Pen colour
              <input type="color" value={penColor} onChange={(event) => setPenColor(event.target.value)} aria-label="Pen colour" className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0" />
            </label>
            <label className="flex h-10 min-w-36 items-center gap-2 rounded-lg border border-white/10 px-2 text-xs text-white/70">
              Width
              <input type="range" min="2" max="14" value={strokeWidth} onChange={(event) => setStrokeWidth(Number(event.target.value))} aria-label="Stroke width" className="min-w-16 accent-[#9bb9ff]" />
            </label>
                <label className="grid gap-1 text-xs text-white/70">
                  Board surface
                  <select value={canvasStyle} onChange={(event) => setCanvasStyle(event.target.value as CanvasStyle)} className="h-10 rounded-lg border border-white/10 bg-black/30 px-2 text-white">
                    <option value="whiteboard">Whiteboard</option>
                    <option value="blackboard">Blackboard</option>
                    <option value="grid">Grid paper</option>
                    <option value="graph">Graph paper</option>
                    <option value="transparent">Transparent</option>
                  </select>
                </label>
              </div>
            </details>
            <Button type="button" variant="ghost" size="icon" className="h-11 w-11 text-white/80 hover:bg-white/10" aria-label="Undo stroke" disabled={!strokes.length} onClick={undo}><Undo2 className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" className="h-11 w-11 text-white/80 hover:bg-white/10" aria-label="Redo stroke" disabled={!redoStack.length} onClick={redo}><Redo2 className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" className="h-11 w-11 text-white/80 hover:bg-white/10" aria-label="Ask FaceMeX to explain the board" title="Ask FaceMeX to explain the board" disabled={analyzingDrawing} onClick={() => void analyzeDrawing('Explain the current whiteboard clearly and step by step for a learner. Preserve all visible content and ask one focused clarification if an essential part is unreadable.')}>
              <Sparkles className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" className="h-10 gap-2 border-white/15 bg-transparent text-white hover:bg-white/10" onClick={() => imageInputRef.current?.click()}>
              <Upload className="h-4 w-4" /><span className="hidden sm:inline">Image</span>
            </Button>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void readUploadedImage(event)} />
            <Button type="button" variant="ghost" size="icon" className="h-11 w-11 text-white/80 hover:bg-white/10" aria-label="Clear board" onClick={clearCanvas}><Trash2 className="h-4 w-4" /></Button>
          </div>
          )}

          <div className="relative min-h-[52dvh] flex-1 overflow-hidden rounded-2xl border border-white/15 bg-[linear-gradient(45deg,#d9d9d9_25%,transparent_25%),linear-gradient(-45deg,#d9d9d9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#d9d9d9_75%),linear-gradient(-45deg,transparent_75%,#d9d9d9_75%)] bg-[length:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0px] sm:min-h-[60dvh]">
          {uploadedImage ? (
            <img src={uploadedImage} alt="Uploaded handwritten work" className="max-h-64 w-full rounded-xl border border-white/10 bg-white object-contain" />
          ) : (
            <canvas
              ref={canvasRef}
              className={`block h-[52dvh] max-h-[78dvh] min-h-[360px] w-full touch-none sm:h-[60dvh] ${canvasStyle === 'transparent' ? 'bg-transparent' : canvasStyle === 'blackboard' ? 'bg-[#17231d]' : 'bg-white'}`}
              onPointerDown={beginStroke}
              onPointerMove={continueStroke}
              onPointerUp={finishStroke}
              onPointerCancel={finishStroke}
              aria-label="Drawing canvas. Use a finger, stylus or mouse to write mathematics."
            />
          )}
          {writingSuggestion && !suggestionDismissed && !presentationMode && (
            <section className="absolute bottom-3 left-3 right-3 z-10 rounded-xl border border-slate-200 bg-white/95 p-3 text-slate-900 shadow-xl sm:bottom-4 sm:left-auto sm:right-4 sm:max-w-md" aria-live="polite">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">FaceMeX suggestion</p>
              <p className="mt-1 text-sm leading-5">{writingSuggestion}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="min-h-9 rounded-lg bg-slate-900 px-3 text-xs font-medium text-white" onClick={() => {
                  setLabels((previous) => [...previous, { text: writingSuggestion.slice(0, 120), x: 0.5, y: 0.25, color: '#111827' }]);
                  setSuggestionDismissed(true);
                }}>Add as text</button>
                <button type="button" className="min-h-9 rounded-lg border border-slate-300 px-3 text-xs" onClick={() => void analyzeDrawing('Explain the current whiteboard in simple, step-by-step language. Preserve all visible content and ask one focused clarification if an essential part is unreadable.')}>Explain</button>
                <button type="button" className="min-h-9 rounded-lg border border-slate-300 px-3 text-xs" onClick={() => void analyzeDrawing('Identify the subject and topic shown on this board. Return a validated, renderable FaceMeX diagram or chart block only when you can create it accurately from the visible content. Otherwise, state clearly that no matching generated visual is supported yet and provide the best factual textual guidance. Do not claim to insert a graphic into the board.')}>Turn into diagram</button>
                <button type="button" aria-label="Dismiss suggestion" className="min-h-9 rounded-lg px-3 text-xs text-slate-600" onClick={() => setSuggestionDismissed(true)}>Dismiss</button>
              </div>
            </section>
          )}
          </div>

          {!presentationMode && writingSuggestion === '' && !suggestionDismissed && !analyzingDrawing && (
            <p className="text-center text-xs text-white/45">Write on the board and pause briefly for a suggestion. Your drawing will never be replaced automatically.</p>
          )}

          {!presentationMode && (
            <>
              <section className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.035] p-3 sm:flex-row">
                <label htmlFor="smartboard-label-text" className="sr-only">Text label to add to board</label>
                <input
                  id="smartboard-label-text"
                  value={textLabel}
                  onChange={(event) => setTextLabel(event.target.value)}
                  maxLength={120}
                  placeholder="Add a text label"
                  className="min-h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addLabel();
                    }
                  }}
                />
                <Button type="button" variant="outline" className="min-h-10 gap-2 border-white/15 bg-transparent text-white hover:bg-white/10" onClick={addLabel} disabled={!textLabel.trim()}>
                  <Type className="h-4 w-4" /> Add label
                </Button>
              </section>
              <details className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                <summary className="cursor-pointer text-sm font-medium text-white/80">
                  <Sparkles className="mr-2 inline h-4 w-4" />AI teaching tools
                </summary>
                <div className="flex flex-wrap items-center gap-2 pt-3">
                  <label className="flex min-h-10 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs text-white/70">
                    <input type="checkbox" checked={autoImproveWriting} onChange={(event) => {
                      setAutoImproveWriting(event.target.checked);
                      setWritingSuggestion('');
                      setSuggestionDismissed(false);
                    }} className="accent-[#9bb9ff]" />
                    Suggest after a pause
                  </label>
                <Button type="button" onClick={() => void recognize()} disabled={recognizing || (!uploadedImage && !strokes.length)} className="min-h-10 gap-2 rounded-xl bg-[#252525] text-white hover:bg-[#333] disabled:opacity-50">
                  <Pencil className="h-4 w-4" />{recognizing ? 'Recognizing…' : 'Recognize writing'}
                </Button>
                <Button type="button" variant="outline" disabled={analyzingDrawing} className="min-h-10 border-white/15 bg-transparent text-white hover:bg-white/10" onClick={() => void analyzeDrawing('Explain the visible drawing and the concept it represents. State what is directly visible, explain it step by step for a learner, and do not infer details that are not shown.')}>
                  {analyzingDrawing ? 'Analyzing…' : 'Explain board'}
                </Button>
                <Button type="button" variant="outline" disabled={analyzingDrawing} className="min-h-10 border-white/15 bg-transparent text-white hover:bg-white/10" onClick={() => void analyzeDrawing('Check the visible drawing for mathematical, scientific, or labeling errors. Separate definite errors from uncertainty, explain each correction, and do not claim to edit or replace the drawing.')}>
                  Check accuracy
                </Button>
                <Button type="button" variant="outline" disabled={analyzingDrawing} className="min-h-10 border-white/15 bg-transparent text-white hover:bg-white/10" onClick={() => void analyzeDrawing('Create a concise lesson based on the visible board content: state learning objectives, explain the central concept in ordered steps, include one worked or real-world example where appropriate, and end with two short learner questions and their answer key. Do not invent unclear content.')}>
                  <BookOpen className="h-4 w-4" /> Generate lesson
                </Button>
                <Button type="button" variant="outline" disabled={analyzingDrawing} className="min-h-10 border-white/15 bg-transparent text-white hover:bg-white/10" onClick={() => void analyzeDrawing('Generate three short practice questions based only on the visible board content. Include a separate answer key with concise reasoning, and ask one clarification if the content cannot be read reliably.')}>
                  Generate questions
                </Button>
                <Button type="button" variant="outline" disabled={analyzingDrawing} className="min-h-10 border-white/15 bg-transparent text-white hover:bg-white/10" onClick={() => void analyzeDrawing('Suggest a clean, accurate 2D diagram based on the visible drawing. Use a supported FaceMeX diagram format only if it represents the concept accurately; otherwise describe a practical set of corrections. Do not claim to alter the board or generate a 3D model.')}>
                  Improve 2D (AI advice)
                </Button>
                </div>
              </details>
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3">
                <span className="text-xs font-medium text-white/70">Teaching timer</span>
                <span className="min-w-14 font-mono text-lg tabular-nums text-white" aria-live="polite">{formatTimer(timerSeconds)}</span>
                <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-white/80 hover:bg-white/10" aria-label={timerRunning ? 'Pause timer' : 'Start timer'} onClick={() => setTimerRunning((running) => !running)}>
                  {timerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-white/80 hover:bg-white/10" aria-label="Reset timer to 15 minutes" onClick={() => { setTimerRunning(false); setTimerSeconds(15 * 60); }}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <span className="text-xs text-white/45">3D conversion of arbitrary uploaded drawings is not available; use the supported procedural models below.</span>
              </div>
            </>
          )}

          {imageError && <p role="alert" className="text-sm text-rose-300">{imageError}</p>}
          {suggestionError && !suggestionDismissed && !writingSuggestion && (
            <p role="status" className="text-center text-xs text-white/55">{suggestionError}</p>
          )}

          {recognition && (
            <section className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
              <label htmlFor="smartboard-recognition" className="text-sm font-medium text-white">Check and correct the recognized expression</label>
              <textarea
                id="smartboard-recognition"
                value={recognition}
                onChange={(event) => setRecognition(event.target.value)}
                rows={3}
                className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              />
              <Button type="button" className="mt-2 min-h-10 rounded-xl bg-[#252525] text-white hover:bg-[#333]" onClick={() => solveExpression(recognition)} disabled={!recognition.trim()}>
                Solve and explain in chat
              </Button>
            </section>
          )}

          {!presentationMode && <details className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
            <summary className="cursor-pointer text-sm font-medium text-white/80">Equations and subject models</summary>
            <div className="pt-3">
            <label htmlFor="smartboard-equation" className="text-sm font-medium text-white">Explore or solve a quadratic equation</label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                id="smartboard-equation"
                value={equation}
                onChange={(event) => setEquation(event.target.value)}
                placeholder="y = x² - 3 or x² - 5x + 6 = 0"
                className="min-h-11 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-base text-white outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              />
              {graphCoefficients && (
                <Button type="button" variant="outline" className="min-h-11 gap-2 border-white/15 bg-transparent text-white hover:bg-white/10" onClick={() => solveExpression(equation)}>
                  <BarChart3 className="h-4 w-4" /> Explain
                </Button>
              )}
            </div>
            {effectiveCoefficients ? (
              <>
                <QuadraticGraph coefficients={effectiveCoefficients} setCoefficientA={setCoefficientA} />
                <p className="mt-2 text-xs text-white/55">The graph is computed in your browser. The highlighted points show real roots and the turning point when they exist.</p>
                {equationSolution && (
                  <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/75" aria-live="polite">
                    <p className="font-medium text-white">Equation results</p>
                    <p className="mt-1">Real solution{equationSolution.roots.length === 1 ? '' : 's'}: {equationSolution.roots.length ? equationSolution.roots.map(formatNumber).join(', ') : 'none'}.</p>
                    {equationSolution.vertex && <p>Vertex: ({formatNumber(equationSolution.vertex.x)}, {formatNumber(equationSolution.vertex.y)}); axis of symmetry: x = {formatNumber(equationSolution.vertex.x)}.</p>}
                    {equationSolution.discriminant !== null && <p>Discriminant: {formatNumber(equationSolution.discriminant)}.</p>}
                  </div>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-white/60">Enter a supported quadratic function or equation, such as y = x² - 3 or x² - 5x + 6 = 0. Higher-degree equations and other forms are not graphed yet.</p>
            )}
            </div>
          </details>}

          {!presentationMode && <details className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
            <summary className="cursor-pointer text-sm font-medium text-white/80">Explore interactive subject models</summary>
            <div className="pt-3"><WorkspaceLearningModels onExplain={solveExpression} /></div>
          </details>}
        </DialogContent>
      </Dialog>
    </>
  );
}
