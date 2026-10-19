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
  Search,
  Save,
  Strikethrough,
  Underline,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/components/ui/use-toast';

type EditorToolbarProps = {
  editor: Editor | null;
  onSave: () => void;
  onPrint: () => void;
  onDownload: () => void;
  onDetails?: () => void;
  onPageBreak?: () => void;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
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
const zoomOptions = [50, 75, 90, 100, 110, 125, 150, 200];
const lineSpacingOptions = [
  { value: '1', label: '1.0' },
  { value: '1.15', label: '1.15' },
  { value: '1.5', label: '1.5' },
  { value: '2', label: '2.0' },
  { value: '2.5', label: '2.5' },
  { value: '3', label: '3.0' },
];

export default function EditorToolbar({ editor, onSave, onPrint, onDownload, onDetails, onPageBreak, zoom = 100, onZoomChange }: EditorToolbarProps) {
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [tableOpen, setTableOpen] = useState(false);
  const [tableRows, setTableRows] = useState(2);
  const [tableCols, setTableCols] = useState(2);
  const [tableHasHeaderRow, setTableHasHeaderRow] = useState(true);
  const fontValue = editor?.getAttributes('textStyle').fontFamily ?? 'Arial, Helvetica, sans-serif';
  const sizeValue = editor?.getAttributes('textStyle').fontSize ?? '16px';
  const textColor = editor?.getAttributes('textStyle').color ?? '#172033';
  const highlightColor = editor?.getAttributes('highlight').color ?? 'transparent';
  const paragraphAttributes = editor?.getAttributes(editor?.isActive('heading') ? 'heading' : 'paragraph') ?? {};
  const lineHeight = paragraphAttributes.lineHeight ?? '1.5';
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
    editor.chain().setMark('textStyle', { [key]: value }).run();
  };

  const setBlockStyle = (value: string) => {
    if (!editor) return;
    if (value === 'paragraph') {
      editor.chain().setParagraph().run();
      return;
    }
    editor.chain().toggleHeading({ level: Number(value.split('-')[1]) as 1 | 2 | 3 | 4 }).run();
  };

  const updateParagraph = (attributes: Record<string, string | null>) => {
    if (!editor) return;
    const type = editor.isActive('heading') ? 'heading' : 'paragraph';
    editor.chain().updateAttributes(type, attributes).run();
  };

  const adjustParagraphSpacing = (attribute: 'spaceBefore' | 'spaceAfter', increment: number) => {
    const type = editor?.isActive('heading') ? 'heading' : 'paragraph';
    const current = editor?.getAttributes(type)[attribute] as string | null | undefined;
    const currentPixels = Number.parseFloat(current || '0') || 0;
    const nextPixels = Math.min(96, Math.max(0, currentPixels + increment));
    updateParagraph({ [attribute]: `${nextPixels}px` });
  };

  const findMatches = () => {
    if (!editor || !findQuery.trim()) return [];
    const query = findQuery.toLocaleLowerCase();
    const matches: Array<{ from: number; to: number }> = [];

    editor.state.doc.descendants((node, pos) => {
      if (!node.isText || !node.text) return;
      let start = 0;
      const text = node.text.toLocaleLowerCase();
      let index = text.indexOf(query, start);

      while (index >= 0) {
        matches.push({ from: pos + index, to: pos + index + findQuery.length });
        start = index + Math.max(1, query.length);
        index = text.indexOf(query, start);
      }
    });

    return matches;
  };

  const selectFirstMatch = () => {
    const matches = findMatches();
    if (!matches.length) {
      toast({ title: 'No matches found', description: 'Check the search text and try again.' });
      return;
    }
    const selection = editor?.state.selection;
    const nextMatch = matches.find((match) => match.from > (selection?.from ?? -1)) || matches[0];
    editor?.chain().setTextSelection(nextMatch).run();
  };

  const replaceCurrent = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, '\n');
    const match = selectedText.toLocaleLowerCase() === findQuery.toLocaleLowerCase()
      ? { from, to }
      : findMatches()[0];
    if (!match) {
      toast({ title: 'No matches found', description: 'Check the search text and try again.' });
      return;
    }
    editor.chain().insertContentAt(match, replaceQuery).run();
  };

  const replaceAll = () => {
    if (!editor || !findQuery.trim()) return;
    const matches = findMatches();
    if (!matches.length) {
      toast({ title: 'No matches found', description: 'Check the search text and try again.' });
      return;
    }
    for (const match of [...matches].reverse()) {
      editor.commands.insertContentAt(match, replaceQuery);
    }
    toast({ title: 'Text replaced', description: `Replaced ${matches.length} match${matches.length === 1 ? '' : 'es'}.` });
  };

  const applyHighlight = (color: string) => {
    if (!editor) return;
    if (color === 'transparent') {
      editor.chain().unsetHighlight().run();
      return;
    }
    editor.chain().toggleHighlight({ color }).run();
  };

  const applyTextColor = (color: string) => {
    if (!editor) return;
    editor.chain().setColor(color).run();
  };

  const handleLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Enter a URL', previousUrl || 'https://');
    if (url === null) return;
    const value = url.trim();
    if (!value) {
      editor.chain().unsetLink().run();
      return;
    }
    if (!/^https?:\/\//i.test(value) && !/^mailto:/i.test(value)) {
      window.alert('Please enter a valid http://, https://, or mailto: link.');
      return;
    }
    editor.chain().setLink({ href: value, target: '_blank', rel: 'noopener noreferrer' }).run();
  };

  const handleCopy = async () => {
    if (!editor) return;
    const content = editor.getText();

    try {
      await navigator.clipboard.writeText(content);
      toast({ title: 'Copied', description: 'Document text copied to the clipboard.' });
    } catch {
      const helper = document.createElement('textarea');
      helper.value = content;
      helper.setAttribute('readonly', '');
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(helper);
      if (copied) {
        toast({ title: 'Copied', description: 'Document text copied to the clipboard.' });
      } else {
        toast({ title: 'Could not copy', description: 'Your browser blocked clipboard access.', variant: 'destructive' });
      }
    }
  };

  const insertTableWithPicker = () => {
    if (!editor || tableRows < 1 || tableCols < 1) return;
    editor.chain().insertTable({ rows: tableRows, cols: tableCols, withHeaderRow: tableHasHeaderRow }).run();
    setTableOpen(false);
  };
  const updateTableSize = (rows: number, cols: number) => {
    setTableRows(Math.min(20, Math.max(1, rows)));
    setTableCols(Math.min(20, Math.max(1, cols)));
  };
  const zoomIndex = zoomOptions.reduce((closest, value, index) =>
    Math.abs(value - zoom) < Math.abs(zoomOptions[closest] - zoom) ? index : closest, 0);

  return (
    <TooltipProvider>
      <div className="fm-editor-toolbar fm-editor-toolbar--compact flex w-full min-w-0 flex-nowrap gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1.5 md:gap-1.5 lg:border-slate-700 lg:bg-[#11151b] [&>div]:shrink-0 [&>div]:min-w-0">
        <div className="flex shrink-0 gap-1 border-r border-slate-300 pr-2 lg:border-slate-600">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => editor?.chain().undo().run()}
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
                onClick={() => editor?.chain().redo().run()}
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
            value={lineHeight}
            onChange={(event) => updateParagraph({ lineHeight: event.target.value })}
            className="h-10 min-w-[76px] rounded-md border border-slate-300 bg-white px-2 text-[10px] outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 lg:border-slate-600 lg:bg-slate-900 lg:text-slate-100"
            aria-label="Line spacing"
          >
            {lineSpacingOptions.map((spacing) => <option key={spacing.value} value={spacing.value}>{spacing.label}</option>)}
          </select>
          <Button type="button" variant="outline" size="sm" onClick={() => adjustParagraphSpacing('spaceBefore', 6)} aria-label="Add space before paragraph" className="h-10 px-2 text-[10px] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">Before +</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => adjustParagraphSpacing('spaceBefore', -6)} aria-label="Remove space before paragraph" className="h-10 px-2 text-[10px] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">Before -</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => adjustParagraphSpacing('spaceAfter', 6)} aria-label="Add space after paragraph" className="h-10 px-2 text-[10px] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">After +</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => adjustParagraphSpacing('spaceAfter', -6)} aria-label="Remove space after paragraph" className="h-10 px-2 text-[10px] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">After -</Button>
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
                onClick={() => editor?.chain().toggleBold().run()}
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
              <Button type="button" variant="outline" size="icon" onClick={() => setFindOpen((value) => !value)} aria-label="Find and replace" className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                <Search className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Find and replace</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={editor?.isActive('italic') ? 'default' : 'outline'}
                size="icon"
                onClick={() => editor?.chain().toggleItalic().run()}
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
              <Button type="button" variant="outline" size="icon" onClick={() => editor?.chain().addRowBefore().run()} disabled={!editor?.isActive('table')} aria-label="Add table row above" className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">↑R</Button>
            </TooltipTrigger>
            <TooltipContent>Add table row above</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="icon" onClick={() => editor?.chain().addRowAfter().run()} disabled={!editor?.isActive('table')} aria-label="Add table row" className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">R+</Button>
            </TooltipTrigger>
            <TooltipContent>Add table row</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="icon" onClick={() => editor?.chain().addColumnBefore().run()} disabled={!editor?.isActive('table')} aria-label="Add table column before" className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">←C</Button>
            </TooltipTrigger>
            <TooltipContent>Add table column before</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="icon" onClick={() => editor?.chain().addColumnAfter().run()} disabled={!editor?.isActive('table')} aria-label="Add table column" className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">C+</Button>
            </TooltipTrigger>
            <TooltipContent>Add table column</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="icon" onClick={() => editor?.chain().deleteRow().run()} disabled={!editor?.isActive('table')} aria-label="Delete table row" className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">R-</Button>
            </TooltipTrigger>
            <TooltipContent>Delete table row</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="icon" onClick={() => editor?.chain().deleteColumn().run()} disabled={!editor?.isActive('table')} aria-label="Delete table column" className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">C-</Button>
            </TooltipTrigger>
            <TooltipContent>Delete table column</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="sm" onClick={() => editor?.chain().toggleHeaderRow().run()} disabled={!editor?.isActive('table')} aria-label="Toggle table header row" aria-pressed={Boolean(editor?.isActive('tableHeader'))} className="h-10 shrink-0 px-2 text-[10px] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">Header</Button>
            </TooltipTrigger>
            <TooltipContent>Toggle table header row</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="sm" onClick={() => editor?.chain().deleteTable().run()} disabled={!editor?.isActive('table')} aria-label="Delete table" className="h-10 shrink-0 px-2 text-[10px] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">Delete table</Button>
            </TooltipTrigger>
            <TooltipContent>Delete table</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={editor?.isActive('underline') ? 'default' : 'outline'}
                size="icon"
                onClick={() => editor?.chain().toggleUnderline().run()}
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
                onClick={() => editor?.chain().toggleStrike().run()}
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
                onClick={() => editor?.chain().setTextAlign('left').run()}
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
                onClick={() => editor?.chain().setTextAlign('center').run()}
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
                onClick={() => editor?.chain().setTextAlign('right').run()}
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
                onClick={() => editor?.chain().setTextAlign('justify').run()}
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
                onClick={() => editor?.chain().toggleBulletList().run()}
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
                onClick={() => editor?.chain().toggleOrderedList().run()}
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
              <Button type="button" variant="outline" size="icon" onClick={() => editor?.chain().sinkListItem('listItem').run()} disabled={!editor?.can().sinkListItem('listItem')} aria-label="Increase indent" className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                <Indent className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Increase indent</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="icon" onClick={() => editor?.chain().liftListItem('listItem').run()} disabled={!editor?.can().liftListItem('listItem')} aria-label="Decrease indent" className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
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
              <Button type="button" variant="outline" size="icon" onClick={() => editor?.chain().unsetLink().run()} disabled={!editor?.isActive('link')} aria-label="Remove link" className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                <span className="text-[10px] font-black">L</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove link</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="icon" onClick={() => editor?.chain().toggleHighlight().run()} aria-label="Highlight text" className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
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

          <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-slate-300 bg-white outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 lg:border-slate-600 lg:bg-slate-900" aria-label="Custom text color">
            <span className="sr-only">Custom text color</span>
            <input type="color" value={textColor} onChange={(event) => applyTextColor(event.target.value)} className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0" aria-label="Choose custom text color" />
          </label>
        </div>

        <div className="flex shrink-0 gap-1 border-r border-slate-300 pr-2 lg:border-slate-600">
          {onDetails && <Button type="button" variant="outline" onClick={onDetails} aria-label="Your details" className="h-10 shrink-0 rounded-md px-3 text-xs focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">Your Details</Button>}
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
              <Button type="button" variant="outline" size="sm" onClick={() => setTableOpen((value) => !value)} aria-label="Insert table" aria-expanded={tableOpen} aria-controls="fm-table-size-picker" className="h-10 shrink-0 px-2 text-xs focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                Table
              </Button>
            </TooltipTrigger>
            <TooltipContent>Insert table</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="icon" onClick={() => editor?.chain().setHorizontalRule().run()} aria-label="Horizontal line" className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                <span className="text-[10px] font-black">—</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Horizontal line</TooltipContent>
          </Tooltip>

          {onPageBreak && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="outline" size="icon" onClick={onPageBreak} aria-label="Insert page break" className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                  <span className="text-[10px] font-black">PB</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Insert page break</TooltipContent>
            </Tooltip>
          )}

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
              <Button type="button" variant="outline" size="sm" onClick={() => editor?.chain().clearNodes().unsetAllMarks().run()} aria-label="Clear formatting" className="h-10 px-2 text-xs focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                Clear
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear formatting</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex shrink-0 gap-1">
          {onZoomChange && <>
            <Button type="button" variant="outline" size="icon" onClick={() => onZoomChange(zoomOptions[Math.max(0, zoomIndex - 1)])} disabled={zoomIndex === 0} aria-label="Zoom out" className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"><ZoomOut className="h-4 w-4" /></Button>
            <select value={zoom} onChange={(event) => onZoomChange(Number(event.target.value))} aria-label="Document zoom" className="h-10 min-w-[68px] rounded-md border border-slate-300 bg-white px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 lg:border-slate-600 lg:bg-slate-900 lg:text-slate-100">
              {zoomOptions.map((option) => <option key={option} value={option}>{option}%</option>)}
            </select>
            <Button type="button" variant="outline" size="icon" onClick={() => onZoomChange(zoomOptions[Math.min(zoomOptions.length - 1, zoomIndex + 1)])} disabled={zoomIndex === zoomOptions.length - 1} aria-label="Zoom in" className="h-10 w-10 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"><ZoomIn className="h-4 w-4" /></Button>
          </>}
          <Button type="button" onClick={onSave} className="h-10 rounded-md bg-blue-600 px-3 text-xs text-white hover:bg-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" aria-label="Save document">
            <Save className="mr-1 h-3.5 w-3.5" />
            Save
          </Button>
        </div>
      </div>
      {findOpen && (
        <div className="fm-editor-toolbar mt-2 flex flex-nowrap items-center gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 lg:border-slate-700 lg:bg-[#181d24]">
          <input value={findQuery} onChange={(event) => setFindQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') selectFirstMatch(); }} placeholder="Find" aria-label="Find text" className="h-9 min-w-[120px] rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:border-slate-600 lg:bg-slate-900 lg:text-white" />
          <input value={replaceQuery} onChange={(event) => setReplaceQuery(event.target.value)} placeholder="Replace" aria-label="Replace text" className="h-9 min-w-[120px] rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:border-slate-600 lg:bg-slate-900 lg:text-white" />
          <Button type="button" variant="outline" size="sm" onClick={selectFirstMatch} aria-label="Find next match" className="h-9 shrink-0 text-xs">Find next</Button>
          <Button type="button" variant="outline" size="sm" onClick={replaceCurrent} aria-label="Replace current match" className="h-9 shrink-0 text-xs">Replace</Button>
          <Button type="button" variant="outline" size="sm" onClick={replaceAll} aria-label="Replace all matches" className="h-9 shrink-0 text-xs">Replace all</Button>
        </div>
      )}
      {tableOpen && (
        <div id="fm-table-size-picker" className="fm-table-picker mt-2 flex max-w-full flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 lg:border-slate-700 lg:bg-[#181d24]" role="group" aria-label="Insert table options">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-900 lg:text-white">Insert table</p>
              <p className="text-xs text-slate-500 lg:text-slate-400" aria-live="polite">{tableRows} × {tableCols} table</p>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-700 lg:text-slate-200">
              <input type="checkbox" checked={tableHasHeaderRow} onChange={(event) => setTableHasHeaderRow(event.target.checked)} className="accent-blue-600" />
              Header row
            </label>
          </div>
          <div className="max-w-full overflow-x-auto pb-1" aria-label="Choose table dimensions">
            <div className="grid w-max grid-cols-10 gap-1" role="group" aria-label="Table size picker">
              {Array.from({ length: 8 }, (_, rowIndex) =>
                Array.from({ length: 10 }, (_, colIndex) => {
                  const rows = rowIndex + 1;
                  const cols = colIndex + 1;
                  const selected = rows <= tableRows && cols <= tableCols;
                  return (
                    <button
                      key={`${rows}-${cols}`}
                      type="button"
                      aria-label={`${rows} rows by ${cols} columns`}
                      aria-pressed={tableRows === rows && tableCols === cols}
                      onMouseEnter={() => updateTableSize(rows, cols)}
                      onFocus={() => updateTableSize(rows, cols)}
                      onClick={() => {
                        updateTableSize(rows, cols);
                        editor?.chain().insertTable({ rows, cols, withHeaderRow: tableHasHeaderRow }).run();
                        setTableOpen(false);
                      }}
                      className={`h-6 w-6 rounded-sm border ${selected ? 'border-blue-600 bg-blue-500/30' : 'border-slate-300 bg-white hover:border-blue-500'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:border-slate-600`}
                    />
                  );
                })
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 lg:text-slate-200">
              Rows
              <input type="number" min="1" max="20" value={tableRows} onChange={(event) => updateTableSize(Number(event.target.value) || 1, tableCols)} className="h-8 w-16 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:border-slate-600 lg:bg-slate-900 lg:text-white" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 lg:text-slate-200">
              Columns
              <input type="number" min="1" max="20" value={tableCols} onChange={(event) => updateTableSize(tableRows, Number(event.target.value) || 1)} className="h-8 w-16 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:border-slate-600 lg:bg-slate-900 lg:text-white" />
            </label>
            <Button type="button" onClick={insertTableWithPicker} className="h-8 text-xs" aria-label="Insert custom table">Insert table</Button>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}
