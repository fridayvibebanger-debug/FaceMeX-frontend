import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react';
import {
  BarChart3,
  Download,
  Eraser,
  Pencil,
  Redo2,
  Trash2,
  Undo2,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { parseQuadraticEquation, sampleQuadratic } from '@/lib/workspaceGraph';

type Stroke = {
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
};

type WorkspaceSmartboardProps = {
  onRecognizeDrawing: (imageDataUrl: string) => Promise<string | undefined>;
  onSolve: (expression: string) => void;
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
}: WorkspaceSmartboardProps) {
  const [open, setOpen] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [penColor, setPenColor] = useState('#111827');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [eraser, setEraser] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [recognition, setRecognition] = useState('');
  const [recognizing, setRecognizing] = useState(false);
  const [equation, setEquation] = useState('y = x² - 3');
  const [coefficientA, setCoefficientA] = useState<number | null>(null);
  const [imageError, setImageError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const graphCoefficients = useMemo(() => parseQuadraticEquation(equation), [equation]);
  const effectiveCoefficients = graphCoefficients && coefficientA !== null
    ? { ...graphCoefficients, a: coefficientA }
    : graphCoefficients;

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
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, bounds.width, bounds.height);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      for (const stroke of strokes) {
        if (!stroke.points.length) continue;
        context.beginPath();
        context.strokeStyle = stroke.color;
        context.lineWidth = stroke.width;
        context.moveTo(stroke.points[0].x * bounds.width, stroke.points[0].y * bounds.height);
        for (const point of stroke.points.slice(1)) {
          context.lineTo(point.x * bounds.width, point.y * bounds.height);
        }
        if (stroke.points.length === 1) {
          context.lineTo(stroke.points[0].x * bounds.width + 0.1, stroke.points[0].y * bounds.height + 0.1);
        }
        context.stroke();
      }
    };
    draw();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [strokes, open]);

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
    const stroke = {
      points: [pointFromEvent(event)],
      color: eraser ? '#ffffff' : penColor,
      width: eraser ? Math.max(strokeWidth * 4, 18) : strokeWidth,
    };
    activeStrokeRef.current = stroke;
    setRedoStack([]);
    setStrokes((previous) => [...previous, stroke]);
  };

  const continueStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const activeStroke = activeStrokeRef.current;
    if (!activeStroke) return;
    const nextStroke = { ...activeStroke, points: [...activeStroke.points, pointFromEvent(event)] };
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
    const image = uploadedImage || (strokes.length ? canvas?.toDataURL('image/png') : null);
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
    setRedoStack([]);
    setUploadedImage(null);
    setRecognition('');
  };

  const solveExpression = (expression: string) => {
    if (!expression.trim()) return;
    onSolve(expression.trim());
    setOpen(false);
  };

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
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-3xl overflow-y-auto border-white/10 bg-[#101010] p-3 text-white sm:p-5 [&>button]:text-white">
          <DialogTitle>AI Smartboard</DialogTitle>
          <DialogDescription className="text-sm text-white/60">
            Write or upload a question, check the recognized expression, then solve it or explore its graph.
          </DialogDescription>

          <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Drawing tools">
            <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-white/80 hover:bg-white/10" aria-label="Pen tool" aria-pressed={!eraser} onClick={() => setEraser(false)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className={`h-10 w-10 text-white/80 hover:bg-white/10 ${eraser ? 'bg-white/10' : ''}`} aria-label="Eraser tool" aria-pressed={eraser} onClick={() => setEraser(true)}>
              <Eraser className="h-4 w-4" />
            </Button>
            <label className="flex h-10 items-center gap-2 rounded-lg border border-white/10 px-2 text-xs text-white/70">
              Pen colour
              <input type="color" value={penColor} onChange={(event) => setPenColor(event.target.value)} aria-label="Pen colour" className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0" />
            </label>
            <label className="flex h-10 min-w-36 items-center gap-2 rounded-lg border border-white/10 px-2 text-xs text-white/70">
              Width
              <input type="range" min="2" max="14" value={strokeWidth} onChange={(event) => setStrokeWidth(Number(event.target.value))} aria-label="Stroke width" className="min-w-16 accent-[#9bb9ff]" />
            </label>
            <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-white/80 hover:bg-white/10" aria-label="Undo stroke" disabled={!strokes.length} onClick={undo}><Undo2 className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-white/80 hover:bg-white/10" aria-label="Redo stroke" disabled={!redoStack.length} onClick={redo}><Redo2 className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-white/80 hover:bg-white/10" aria-label="Clear canvas" onClick={clearCanvas}><Trash2 className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-white/80 hover:bg-white/10" aria-label="Download drawing" disabled={!strokes.length} onClick={downloadDrawing}><Download className="h-4 w-4" /></Button>
            <Button type="button" variant="outline" className="h-10 gap-2 border-white/15 bg-transparent text-white hover:bg-white/10" onClick={() => imageInputRef.current?.click()}>
              <Upload className="h-4 w-4" /> Upload handwriting
            </Button>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void readUploadedImage(event)} />
          </div>

          {uploadedImage ? (
            <img src={uploadedImage} alt="Uploaded handwritten work" className="max-h-64 w-full rounded-xl border border-white/10 bg-white object-contain" />
          ) : (
            <canvas
              ref={canvasRef}
              className="h-56 w-full touch-none rounded-xl border border-white/15 bg-white sm:h-64"
              onPointerDown={beginStroke}
              onPointerMove={continueStroke}
              onPointerUp={finishStroke}
              onPointerCancel={finishStroke}
              aria-label="Drawing canvas. Use a finger, stylus or mouse to write mathematics."
            />
          )}

          {imageError && <p role="alert" className="text-sm text-rose-300">{imageError}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => void recognize()}
              disabled={recognizing || (!uploadedImage && !strokes.length)}
              className="min-h-10 gap-2 rounded-xl bg-[#252525] text-white hover:bg-[#333] disabled:opacity-50"
            >
              <Pencil className="h-4 w-4" />{recognizing ? 'Recognizing…' : 'Recognize writing'}
            </Button>
          </div>

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

          <section className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
            <label htmlFor="smartboard-equation" className="text-sm font-medium text-white">Explore a quadratic graph</label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                id="smartboard-equation"
                value={equation}
                onChange={(event) => setEquation(event.target.value)}
                placeholder="y = x² - 3"
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
              </>
            ) : (
              <p className="mt-2 text-sm text-white/60">Enter a supported quadratic such as y = x² - 3. Other forms are not graphed yet.</p>
            )}
          </section>
        </DialogContent>
      </Dialog>
    </>
  );
}
