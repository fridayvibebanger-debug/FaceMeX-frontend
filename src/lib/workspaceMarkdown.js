const SUBSCRIPT_DIGITS = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', '+': '₊', '-': '₋' };
const SUPERSCRIPT_DIGITS = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻' };

function splitTableRow(line) {
  const cells = [];
  let cell = '';
  let escaped = false;

  for (const character of line.trim()) {
    if (character === '|' && !escaped) {
      cells.push(cell.trim());
      cell = '';
      continue;
    }

    cell += character;
    escaped = character === '\\' && !escaped;
  }
  cells.push(cell.trim());

  if (cells[0] === '') cells.shift();
  if (cells.at(-1) === '') cells.pop();
  return cells.map((value) => value.replace(/\\\|/g, '|'));
}

function isTableSeparator(line) {
  const cells = splitTableRow(line);
  return cells.length >= 2 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isTableRow(line) {
  return line.includes('|');
}

function isListItem(line) {
  return /^\s*(?:[-+*]|\d+[.)])\s+/.test(line);
}

function isBlockStart(lines, index) {
  const line = lines[index];
  return !line.trim() ||
    /^```/.test(line.trim()) ||
    /^#{1,6}\s+/.test(line.trim()) ||
    /^>\s?/.test(line.trim()) ||
    /^(-{3,}|\*{3,}|_{3,})$/.test(line.trim()) ||
    isListItem(line) ||
    (isTableRow(line) && index + 1 < lines.length && isTableSeparator(lines[index + 1]));
}

function normalizeRawBreakTags(source) {
  let insideCodeBlock = false;
  return String(source || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => {
      if (/^\s*```/.test(line)) {
        insideCodeBlock = !insideCodeBlock;
        return line;
      }
      return insideCodeBlock ? line : line.replace(/<br\s*\/?>/gi, ' ');
    })
    .join('\n');
}

export function parseWorkspaceMarkdown(source) {
  const lines = normalizeRawBreakTags(source).split('\n');
  const blocks = [];

  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed === '[[VISUAL_REFERENCE]]') {
      blocks.push({ type: 'visual-reference' });
      index += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim().split(/\s+/)[0] || '';
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith('```')) code.push(lines[index++]);
      if (index < lines.length) index += 1;
      blocks.push({ type: 'code', language, text: code.join('\n') });
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
      index += 1;
      continue;
    }

    if (index + 1 < lines.length && isTableRow(line) && isTableSeparator(lines[index + 1])) {
      const headers = splitTableRow(line);
      const rows = [];
      index += 2;
      while (index < lines.length && isTableRow(lines[index]) && lines[index].trim()) {
        rows.push(splitTableRow(lines[index++]));
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'separator' });
      index += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quote = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quote.push(lines[index++].trim().replace(/^>\s?/, ''));
      }
      blocks.push({ type: 'quote', text: quote.join(' ') });
      continue;
    }

    const listMatch = line.match(/^\s*([-+*]|\d+[.)])\s+(.+)$/);
    if (listMatch) {
      const ordered = /^\d/.test(listMatch[1]);
      const items = [];
      let start = ordered ? Number.parseInt(listMatch[1], 10) : 1;
      while (index < lines.length) {
        const item = lines[index].match(/^\s*([-+*]|\d+[.)])\s+(.+)$/);
        if (!item || /^\d/.test(item[1]) !== ordered) break;
        if (ordered && items.length === 0) start = Number.parseInt(item[1], 10);
        items.push(item[2]);
        index += 1;
      }
      blocks.push({ type: 'list', ordered, start, items });
      continue;
    }

    const paragraph = [trimmed];
    index += 1;
    while (index < lines.length && !isBlockStart(lines, index)) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }

  return blocks;
}

function unicodeScript(value, mapping) {
  return [...value].map((character) => mapping[character] || character).join('');
}

export function formatWorkspaceMath(source) {
  let value = String(source || '')
    .replace(/^\s*(?:\$\$|\$|\\\[|\\\()/, '')
    .replace(/(?:\$\$|\$|\\\]|\\\))\s*$/, '')
    .replace(/\\(?:mathrm|mathbf|mathit|text|operatorname)\s*\{([^{}]*)\}/g, '$1')
    .replace(/\\(?:ce|pu)\s*\{([^{}]*)\}/g, '$1')
    .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)')
    .replace(/\\sqrt\s*\{([^{}]*)\}/g, '√($1)')
    .replace(/\\(?:times|timesdot)/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\(?:rightarrow|to|longrightarrow)/g, '→')
    .replace(/\\leftarrow/g, '←')
    .replace(/\\approx/g, '≈')
    .replace(/\\neq/g, '≠')
    .replace(/\\leq?/g, '≤')
    .replace(/\\geq?/g, '≥')
    .replace(/\\pm/g, '±')
    .replace(/\\pi\b/g, 'π')
    .replace(/\\alpha\b/g, 'α')
    .replace(/\\beta\b/g, 'β')
    .replace(/\\gamma\b/g, 'γ')
    .replace(/\\Delta\b/g, 'Δ')
    .replace(/\\delta\b/g, 'δ')
    .replace(/\\infty\b/g, '∞')
    .replace(/_\{([^{}]+)\}|_([a-zA-Z0-9]+)/g, (_, braced, simple) => unicodeScript(braced || simple, SUBSCRIPT_DIGITS))
    .replace(/\^\{([^{}]+)\}|\^([a-zA-Z0-9]+)/g, (_, braced, simple) => unicodeScript(braced || simple, SUPERSCRIPT_DIGITS))
    .replace(/[{}]/g, '')
    .replace(/\\/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return value;
}

export function tokenizeWorkspaceInline(source) {
  const text = String(source || '');
  const tokens = [];
  const pattern = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$(?!\$)[^$\n]+\$|`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\s][^_\n]*?_|!\[([^\]]*)\]\((https?:\/\/[^)\s]+|www\.[^)\s]+)\)|\[([^\]]+)\]\((https?:\/\/[^)\s]+|www\.[^)\s]+)\)|(https?:\/\/[^\s<>]+|www\.[^)\s<>]+|(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>]*)?))/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) tokens.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    const value = match[0];
    if (
      /^(?:\$\$|\\\[|\\\()/.test(value) ||
      (/^\$(?!\$)/.test(value) && text[match.index - 1] !== '\\')
    ) {
      tokens.push({ type: 'math', text: formatWorkspaceMath(value) });
    } else if (value.startsWith('`')) {
      tokens.push({ type: 'code', text: value.slice(1, -1) });
    } else if (value.startsWith('**') || value.startsWith('__')) {
      tokens.push({ type: 'strong', text: value.slice(2, -2) });
    } else if (value.startsWith('*') || value.startsWith('_')) {
      tokens.push({ type: 'emphasis', text: value.slice(1, -1) });
    } else if (match[2] && match[3]) {
      const rawHref = match[3];
      const href = rawHref.startsWith('www.') ? `https://${rawHref}` : rawHref;
      tokens.push({ type: 'image', text: match[2], href });
    } else if (match[4] && match[5]) {
      const rawHref = match[5];
      const href = rawHref.startsWith('www.') ? `https://${rawHref}` : rawHref;
      tokens.push({ type: 'link', text: match[4], href });
    } else if (value.startsWith('$')) {
      tokens.push({ type: 'text', text: value });
    } else {
      const linkValue = value.replace(/[),.;:!?]+$/, '');
      const href = linkValue.startsWith('http') ? linkValue : `https://${linkValue}`;
      tokens.push({ type: 'link', text: linkValue, href });
      if (linkValue.length < value.length) {
        tokens.push({ type: 'text', text: value.slice(linkValue.length) });
      }
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) tokens.push({ type: 'text', text: text.slice(lastIndex) });
  return tokens.reduce((result, token) => {
    const previous = result.at(-1);
    if (previous?.type === 'text' && token.type === 'text') {
      previous.text += token.text;
    } else {
      result.push(token);
    }
    return result;
  }, []);
}
