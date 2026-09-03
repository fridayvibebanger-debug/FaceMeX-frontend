import type { Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Copy,
  Highlighter,
  Indent,
  Italic,
  Link,
  List,
  ListOrdered,
  Outdent,
  Redo2,
  Save,
  Strikethrough,
  Underline,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type EditorToolbarProps = {
  editor: Editor | null;
  onSave: () => void;
  onPrint: () => void;
  onDownload: () => void;
};

const fontOptions = [
  { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
  { value: 'Calibri, sans-serif', label: 'Calibri' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: '"Times New Roman", serif', label: 'Times New Roman' },
  { value: '"Courier New", monospace', label: 'Courier New' },
];

const sizeOptions = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48'];
const textStyleOptions = [
  { value: 'paragraph', label: 'Normal' },
  { value: 'heading-1', label: 'Title' },
  { value: 'heading-2', label: 'Heading 1' },
  { value: 'heading-3', label: 'Heading 2' },
  { value: 'heading-4', label: 'Heading 3' },
];
const highlightOptions = [
  { value: '#fef08a', label: 'Yellow' },
  { value: '#bbf7d0', label: 'Green' },
  { value: '#bfdbfe', label: 'Blue' },
  { value: '#fecaca', label: 'Pink' },
  { value: '#fed7aa', label: 'Orange' },
  { value: 'transparent', label: 'None' },
];
const textColorOptions = [
  { value: '#172033', label: 'Black' },
  { value: '#2563eb', label: 'Blue' },
  { value: '#0f766e', label: 'Teal' },
  { value: '#b91c1c', label: 'Red' },
  { value: '#7c3aed', label: 'Violet' },
  { value: '#64748b', label: 'Gray' },
];

export default function EditorToolbar({ editor, onSave, onPrint, onDownload }: EditorToolbarProps) {
  const fontValue = editor?.getAttributes('textStyle').fontFamily ?? 'Arial, Helvetica, sans-serif';
  const sizeValue = editor?.getAttributes('textStyle').fontSize ?? '16px';
  const textColor = editor?.getAttributes('textStyle').color ?? '#172033';
  const highlightColor = editor?.getAttributes('highlight').color ?? 'transparent';
  const textStyle = editor?.isActive('heading', { level: 1 })
    ? 'heading-1'
    : editor?.isActive('heading', { level: 2 })
      ? 'heading-2'
      : editor?.isActive('heading', { level: 3 })
        ? 'heading-3'
        : editor?.isActive('heading', { level: 4 })
          ? 'heading-4'
          : 'paragraph';
  const alignment = editor?.isActive({ textAlign: 'left' })
    ? 'left'
    : editor?.isActive({ textAlign: 'center' })
      ? 'center'
      : editor?.isActive({ textAlign: 'right' })
        ? 'right'
        : editor?.isActive({ textAlign: 'justify' })
          ? 'justify'
          : 'left';

  const setTextStyle = (key: 'fontFamily' | 'fontSize', value: string) => {
    if (!editor) return;
    editor.chain().focus().setMark('textStyle', { [key]: value }).run();
  };

  const setBlockStyle = (value: string) => {
    if (!editor) return;
    if (value === 'paragraph') {
      editor.chain().focus().setParagraph().run();
      return;
    }
    editor.chain().focus().toggleHeading({ level: Number(value.split('-')[1]) as 1 | 2 | 3 | 4 }).run();
  };

  const applyHighlight = (color: string) => {
    if (!editor) return;
    if (color === 'transparent') {
      editor.chain().focus().unsetHighlight().run();
      return;
    }
    editor.chain().focus().toggleHighlight({ color }).run();
  };

  const applyTextColor = (color: string) => {
    if (!editor) return;
    editor.chain().focus().setColor(color).run();
  };

  const handleLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Enter a URL', previousUrl || 'https://');
    if (url === null) return;
    const value = url.trim();
    if (!value) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    if (!/^https?:\/\//i.test(value) && !/^mailto:/i.test(value)) {
      window.alert('Please enter a valid http://, https://, or mailto: link.');
      return;
    }
    editor.chain().focus().setLink({ href: value, target: '_blank', rel: 'noopener noreferrer' }).run();
  };

  const handleCopy = async () => {
    if (!editor) return;
    const content = editor.getText();

    try {
      await navigator.clipboard.writeText(content);
    } catch {
      const helper = document.createElement('textarea');
      helper.value = content;
      helper.setAttribute('readonly', '');
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      document.execCommand('copy');
      document.body.removeChild(helper);
    }
  };

  const insertTable = () => {
    if (!editor) return;
    const size = window.prompt('Table size (rows x cols)', '2x2');
    if (!size) return;
    const match = size.trim().match(/^(\d+)\s*[xX]\s*(\d+)$/);
    if (!match) {
      window.alert('Use format like 2x2 or 3x3.');
      return;
    }
    const rows = Number(match[1]);
    const cols = Number(match[2]);
    if (rows < 1 || cols < 1) return;
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
  };

  return (
    <TooltipProvider>
      <div className="flex flex-nowrap gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-2 md:gap-1.5 lg:border-slate-700 lg:bg-[#11151b] lg:overflow-x-auto [&>div]:shrink-0 [&>div]:min-w-0">
        <div className="flex shrink-0 gap-1 border-r border-slate-300 pr-2 lg:border-slate-600">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => editor?.chain().focus().undo().run()}
                disabled={!editor?.can().undo()}
                aria-label="Undo"
                className="h-10 w-10 border-slate-300 bg-white text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 lg:border-slate-600 lg:bg-slate-900 lg:text-slate-100"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => editor?.chain().focus().redo().run()}
                disabled={!editor?.can().redo()}
                aria-label="Redo"
                className="h-10 w-10 border-slate-300 bg-white text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 lg:border-slate-600 lg:bg-slate-900 lg:text-slate-100"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex shrink-0 gap-1 border-r border-slate-300 pr-2 lg:border-slate-600">
          <select
            value={textStyle}
            onChange={(event) => setBlockStyle(event.target.value)}
            className="h-10 min-w-[112px] rounded-md border border-slate-300 bg-white px-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 lg:border-slate-600 lg:bg-slate-900 lg:text-slate-100"
            aria-label="Text style"
          >
            {textStyleOptions.map((style) => (
              <option key={style.value} value={style.value}>{style.label}</option>
            ))}
          </select>

          <select
            value={fontValue}
            onChange={(event) => setTextStyle('fontFamily', event.target.value)}
            className="h-10 min-w-[110px] rounded-md border border-slate-300 bg-white px-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 lg:border-slate-600 lg:bg-slate-900 lg:text-slate-100"
            aria-label="Font family"
          >
            {fontOptions.map((font) => (
              <option key={font.value} value={font.value}>{font.label}</option>
            ))}
          </select>

          <select
            value={sizeValue.replace(/px$/, '')}
            onChange={(event) => setTextStyle('fontSize', `${event.target.value}px`)}
            className="h-10 min-w-[72px] rounded-md border border-slate-300 bg-white px-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 lg:border-slate-600 lg:bg-slate-900 lg:text-slate-100"
            aria-label="Font size"
          >
            {sizeOptions.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>

        <div className="flex shrink-0 gap-1 border-r border-slate-300 pr-2 lg:border-slate-600">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={editor?.isActive('bold') ? 'default' : 'outline'}
                size="icon"
                onClick={() => editor?.chain().focus().toggleBold().run()}
                aria-label="Bold"
                className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <Bold className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bold</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={editor?.isActive('italic') ? 'default' : 'outline'}
                size="icon"
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                aria-label="Italic"
                className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <Italic className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Italic</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={editor?.isActive('underline') ? 'default' : 'outline'}
                size="icon"
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                aria-label="Underline"
                className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <Underline className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Underline</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={editor?.isActive('strike') ? 'default' : 'outline'}
                size="icon"
                onClick={() => editor?.chain().focus().toggleStrike().run()}
                aria-label="Strikethrough"
                className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <Strikethrough className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Strikethrough</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex shrink-0 gap-1 border-r border-slate-300 pr-2 lg:border-slate-600">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={alignment === 'left' ? 'default' : 'outline'}
                size="icon"
                onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                aria-label="Align left"
                className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Align left</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={alignment === 'center' ? 'default' : 'outline'}
                size="icon"
                onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                aria-label="Align center"
                className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Align center</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={alignment === 'right' ? 'default' : 'outline'}
                size="icon"
                onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                aria-label="Align right"
                className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <AlignRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Align right</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={alignment === 'justify' ? 'default' : 'outline'}
                size="icon"
                onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
                aria-label="Justify"
                className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <AlignJustify className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Justify</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex shrink-0 gap-1 border-r border-slate-300 pr-2 lg:border-slate-600">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={editor?.isActive('bulletList') ? 'default' : 'outline'}
                size="icon"
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                aria-label="Bulleted list"
                className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <List className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bulleted list</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={editor?.isActive('orderedList') ? 'default' : 'outline'}
                size="icon"
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                aria-label="Numbered list"
                className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Numbered list</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="icon" onClick={() => editor?.chain().focus().sinkListItem('listItem').run()} aria-label="Increase indent" className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                <Indent className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Increase indent</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="icon" onClick={() => editor?.chain().focus().liftListItem('listItem').run()} aria-label="Decrease indent" className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                <Outdent className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Decrease indent</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex shrink-0 gap-1 border-r border-slate-300 pr-2 lg:border-slate-600">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="icon" onClick={handleLink} aria-label="Insert link" className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                <Link className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Insert link</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="icon" onClick={() => editor?.chain().focus().unsetLink().run()} aria-label="Remove link" className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                <span className="text-[10px] font-black">L</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove link</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="icon" onClick={() => editor?.chain().focus().toggleHighlight().run()} aria-label="Highlight text" className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                <Highlighter className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Highlight</TooltipContent>
          </Tooltip>

          <select
            value={highlightColor}
            onChange={(event) => applyHighlight(event.target.value)}
            className="h-10 min-w-[96px] rounded-md border border-slate-300 bg-white px-2 text-[10px] outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 lg:border-slate-600 lg:bg-slate-900"
            aria-label="Highlight color"
          >
            {highlightOptions.map((color) => (
              <option key={color.value} value={color.value}>{color.label}</option>
            ))}
          </select>

          <select
            value={textColor}
            onChange={(event) => applyTextColor(event.target.value)}
            className="h-10 min-w-[86px] rounded-md border border-slate-300 bg-white px-2 text-[10px] outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 lg:border-slate-600 lg:bg-slate-900"
            aria-label="Text color"
          >
            {textColorOptions.map((color) => (
              <option key={color.value} value={color.value}>{color.label}</option>
            ))}
          </select>
        </div>

        <div className="flex shrink-0 gap-1 border-r border-slate-300 pr-2 lg:border-slate-600">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="icon" onClick={onPrint} aria-label="Print PDF" className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                <span className="text-[10px] font-black">PDF</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Print PDF</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="icon" onClick={onDownload} aria-label="Download DOCX" className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                <span className="text-[10px] font-black">DOCX</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download DOCX</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="icon" onClick={() => editor?.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()} aria-label="Insert table" className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                <span className="text-[10px] font-black">T</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Insert table</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="icon" onClick={() => editor?.chain().focus().setHorizontalRule().run()} aria-label="Horizontal line" className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                <span className="text-[10px] font-black">—</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Horizontal line</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="icon" onClick={insertTable} aria-label="Insert custom table" className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                <span className="text-[10px] font-black">+</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Insert custom table</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex shrink-0 gap-1 border-r border-slate-300 pr-2 lg:border-slate-600">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="icon" onClick={() => void handleCopy()} aria-label="Copy" className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="icon" onClick={() => editor?.commands.selectAll()} aria-label="Select all" className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                <span className="text-[10px] font-black">A</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Select all</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="sm" onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()} aria-label="Clear formatting" className="h-10 px-2 text-xs focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                Clear
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear formatting</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex shrink-0 gap-1">
          <Button type="button" onClick={onSave} className="h-10 rounded-md bg-blue-600 px-3 text-xs text-white hover:bg-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" aria-label="Save document">
            <Save className="mr-1 h-3.5 w-3.5" />
            Save
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
