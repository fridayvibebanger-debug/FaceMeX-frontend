import {
  ArrowLeft,
  ArrowRight,
  Bold,
  Copy,
  Highlighter,
  Italic,
  Link,
  List,
  ListOrdered,
  Save,
  Strikethrough,
  Underline,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type EditorToolbarProps = {
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onStrike: () => void;
  onAlignLeft: () => void;
  onAlignCenter: () => void;
  onAlignRight: () => void;
  onAlignJustify: () => void;
  onBulletList: () => void;
  onNumberedList: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onLink: () => void;
  onClear: () => void;
  onHighlight: () => void;
  onHeading: (level: 1 | 2 | 3) => void;
  onIndent: () => void;
  onOutdent: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onSelectAll: () => void;
  onSave: () => void;
  fontValue: string;
  sizeValue: string;
  alignValue: 'left' | 'center' | 'right' | 'justify';
  highlightColor: string;
  onFontChange: (font: string) => void;
  onSizeChange: (size: string) => void;
  onHighlightColorChange: (color: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  isStrike?: boolean;
};

export default function EditorToolbar({
  onBold,
  onItalic,
  onUnderline,
  onStrike,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onAlignJustify,
  onBulletList,
  onNumberedList,
  onUndo,
  onRedo,
  onLink,
  onClear,
  onHighlight,
  onHeading,
  onIndent,
  onOutdent,
  onCopy,
  onPaste,
  onSelectAll,
  onSave,
  fontValue,
  sizeValue,
  alignValue,
  highlightColor,
  onFontChange,
  onSizeChange,
  onHighlightColorChange,
  canUndo,
  canRedo,
  isBold,
  isItalic,
  isUnderline,
  isStrike,
}: EditorToolbarProps) {
  const fonts = [
    { value: 'sans', label: 'Sans' },
    { value: 'serif', label: 'Serif' },
    { value: 'mono', label: 'Mono' },
  ];

  const sizes = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48'];
  const highlightColors = [
    { value: '#fef08a', label: 'Yellow' },
    { value: '#bfdbfe', label: 'Blue' },
    { value: '#bbf7d0', label: 'Green' },
    { value: '#fecaca', label: 'Red' },
    { value: '#e9d5ff', label: 'Purple' },
  ];

  return (
    <TooltipProvider>
      <div className="flex flex-nowrap gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-2 lg:border-slate-700 lg:bg-[#11151b] lg:overflow-x-auto">
        <div className="flex shrink-0 gap-1 border-r border-slate-300 pr-2 lg:border-slate-600">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={canUndo ? 'outline' : 'ghost'} size="icon" onClick={onUndo} disabled={!canUndo} className="h-9 w-9 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" aria-label="Undo" aria-pressed={false}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={canRedo ? 'outline' : 'ghost'} size="icon" onClick={onRedo} disabled={!canRedo} className="h-9 w-9 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" aria-label="Redo" aria-pressed={false}>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex gap-1 border-r border-slate-300 pr-2 lg:border-slate-600">
          <select value={fontValue} onChange={(event) => onFontChange(event.target.value)} className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 lg:border-slate-600 lg:bg-slate-800 lg:text-slate-100" aria-label="Font family">
            {fonts.map((font) => (
              <option key={font.value} value={font.value}>{font.label}</option>
            ))}
          </select>

          <select value={sizeValue} onChange={(event) => onSizeChange(event.target.value)} className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 lg:border-slate-600 lg:bg-slate-800 lg:text-slate-100" aria-label="Font size">
            {sizes.map((size) => (
              <option key={size} value={size}>{size}pt</option>
            ))}
          </select>
        </div>

        <div className="flex gap-1 border-r border-slate-300 pr-2 lg:border-slate-600">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={isBold ? 'default' : 'outline'} size="icon" onClick={onBold} className="h-9 w-9 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" aria-label="Bold" aria-pressed={Boolean(isBold)}>
                <Bold className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bold</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={isItalic ? 'default' : 'outline'} size="icon" onClick={onItalic} className="h-9 w-9 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" aria-label="Italic" aria-pressed={Boolean(isItalic)}>
                <Italic className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Italic</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={isUnderline ? 'default' : 'outline'} size="icon" onClick={onUnderline} className="h-9 w-9 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" aria-label="Underline" aria-pressed={Boolean(isUnderline)}>
                <Underline className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Underline</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={isStrike ? 'default' : 'outline'} size="icon" onClick={onStrike} className="h-9 w-9 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" aria-label="Strikethrough" aria-pressed={Boolean(isStrike)}>
                <Strikethrough className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Strikethrough</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex gap-1 border-r border-slate-300 pr-2 lg:border-slate-600">
          <Button variant={alignValue === 'left' ? 'default' : 'outline'} size="icon" onClick={onAlignLeft} className="h-9 w-9 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" aria-label="Align left" aria-pressed={alignValue === 'left'}>L</Button>
          <Button variant={alignValue === 'center' ? 'default' : 'outline'} size="icon" onClick={onAlignCenter} className="h-9 w-9 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" aria-label="Align center" aria-pressed={alignValue === 'center'}>C</Button>
          <Button variant={alignValue === 'right' ? 'default' : 'outline'} size="icon" onClick={onAlignRight} className="h-9 w-9 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" aria-label="Align right" aria-pressed={alignValue === 'right'}>R</Button>
          <Button variant={alignValue === 'justify' ? 'default' : 'outline'} size="icon" onClick={onAlignJustify} className="h-9 w-9 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" aria-label="Justify" aria-pressed={alignValue === 'justify'}>J</Button>
        </div>

        <div className="flex gap-1 border-r border-slate-300 pr-2 lg:border-slate-600">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onBulletList} className="h-9 w-9 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" aria-label="Bulleted list" aria-pressed={false}>
                <List className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bulleted list</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onNumberedList} className="h-9 w-9 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" aria-label="Numbered list" aria-pressed={false}>
                <ListOrdered className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Numbered list</TooltipContent>
          </Tooltip>

          <Button variant="outline" size="icon" onClick={onIndent} className="h-9 w-9 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" aria-label="Indent" aria-pressed={false}>+</Button>
          <Button variant="outline" size="icon" onClick={onOutdent} className="h-9 w-9 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" aria-label="Outdent" aria-pressed={false}>-</Button>
        </div>

        <div className="flex gap-1 border-r border-slate-300 pr-2 lg:border-slate-600">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onLink} className="h-9 w-9 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" aria-label="Insert link" aria-pressed={false}>
                <Link className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Insert link</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onHighlight} className="h-9 w-9 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" aria-label="Highlight text" aria-pressed={false}>
                <Highlighter className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Highlight</TooltipContent>
          </Tooltip>

          <select value={highlightColor} onChange={(event) => onHighlightColorChange(event.target.value)} className="h-9 rounded-md border border-slate-300 bg-white px-2 text-[10px] outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 lg:border-slate-600 lg:bg-slate-800" aria-label="Highlight color">
            {highlightColors.map((color) => (
              <option key={color.value} value={color.value}>{color.label}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-1 border-r border-slate-300 pr-2 lg:border-slate-600">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onCopy} className="h-9 w-9 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" aria-label="Copy document" aria-pressed={false}>
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onPaste} className="h-9 w-9 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" aria-label="Paste into document" aria-pressed={false}>
                <span className="text-[10px] font-bold">P</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Paste</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onSelectAll} className="h-9 w-9 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" aria-label="Select all" aria-pressed={false}>
                <span className="text-[10px] font-bold">A</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Select all</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={onClear} className="h-9 px-2 text-xs focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" aria-label="Clear formatting" aria-pressed={false}>
                Clear
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear formatting</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex shrink-0 gap-1">
          <Button onClick={onSave} className="h-9 rounded-md bg-blue-600 px-3 text-xs text-white hover:bg-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" aria-label="Save document" aria-pressed={false}>
            <Save className="mr-1 h-3.5 w-3.5" />
            Save
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
