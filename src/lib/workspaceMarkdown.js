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
    /^(?:\$\$|\\\[)/.test(line.trim()) ||
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

    const mathStart = trimmed.startsWith('$$')
      ? { opening: '$$', closing: '$$' }
      : trimmed.startsWith('\\[')
        ? { opening: '\\[', closing: '\\]' }
        : null;
    if (mathStart) {
      const remainder = trimmed.slice(mathStart.opening.length);
      const closingIndex = remainder.indexOf(mathStart.closing);
      if (closingIndex >= 0 && !remainder.slice(closingIndex + mathStart.closing.length).trim()) {
        blocks.push({ type: 'math', latex: remainder.slice(0, closingIndex).trim() });
        index += 1;
        continue;
      }

      const equation = [remainder];
      let cursor = index + 1;
      let closed = false;
      while (cursor < lines.length) {
        const closingLineIndex = lines[cursor].indexOf(mathStart.closing);
        if (closingLineIndex >= 0) {
          if (lines[cursor].slice(closingLineIndex + mathStart.closing.length).trim()) break;
          equation.push(lines[cursor].slice(0, closingLineIndex));
          cursor += 1;
          closed = true;
          break;
        }
        equation.push(lines[cursor]);
        cursor += 1;
      }
      if (closed) {
        blocks.push({ type: 'math', latex: equation.join('\n').trim() });
        index = cursor;
        continue;
      }
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

const MATH_SYMBOLS = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ϵ',
  zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ',
  lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ',
  tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'ϕ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π',
  Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
  times: '×', cdot: '·', div: '÷', pm: '±', mp: '∓', neq: '≠', approx: '≈',
  leq: '≤', le: '≤', geq: '≥', ge: '≥', to: '→', rightarrow: '→',
  longrightarrow: '⟶', implies: '⟹', iff: '⟺', leftarrow: '←', leftrightarrow: '↔',
  infinity: '∞', partial: '∂',
  nabla: '∇', int: '∫', iint: '∬', oint: '∮', sum: '∑', prod: '∏',
  cdots: '⋯', ldots: '…', forall: '∀', exists: '∃', in: '∈', notin: '∉',
  subset: '⊂', subseteq: '⊆', perp: '⊥', angle: '∠', degree: '°',
};

const MATH_OPERATORS = new Set([
  '+', '-', '=', '<', '>', '≤', '≥', '≠', '≈', '×', '·', '÷', '±', '∓',
  '→', '⟶', '⟹', '⟺', '←', '↔', '∞', '∫', '∬', '∮', '∑', '∏', '∈', '∉', '⊂', '⊆',
  '⊥', '∠', '°', '(', ')', '[', ']', '{', '}', '|', ',', ';', ':',
]);

function escapeMathXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function mathNode(name, content, attributes = '') {
  return `<${name}${attributes}>${content}</${name}>`;
}

function readMathGroup(source, start, opening = '{', closing = '}') {
  if (source[start] !== opening) return { value: '', next: start };
  let depth = 1;
  for (let index = start + 1; index < source.length; index += 1) {
    if (source[index] === '\\') {
      index += 1;
      continue;
    }
    if (source[index] === opening) depth += 1;
    if (source[index] === closing) depth -= 1;
    if (depth === 0) return { value: source.slice(start + 1, index), next: index + 1 };
  }
  return { value: source.slice(start + 1), next: source.length };
}

function readMathArgument(source, start, depth) {
  let index = start;
  while (/\s/.test(source[index] || '')) index += 1;
  if (source[index] === '{') {
    const group = readMathGroup(source, index);
    return { markup: mathNode('mrow', renderMathSequence(group.value, depth + 1)), next: group.next };
  }
  return parseMathAtom(source, index, depth + 1);
}

function splitMathEnvironment(source) {
  const rows = [[]];
  let cellStart = 0;
  let groupDepth = 0;
  let environmentDepth = 0;
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '\\') {
      const environmentMarker = source.slice(index).match(/^\\(begin|end)\s*\{([^}]+)\}/);
      if (environmentMarker) {
        environmentDepth += environmentMarker[1] === 'begin' ? 1 : -1;
        index += environmentMarker[0].length - 1;
        continue;
      }
      if (source[index + 1] === '\\' && groupDepth === 0 && environmentDepth === 0) {
        rows.at(-1).push(source.slice(cellStart, index));
        rows.push([]);
        index += 1;
        cellStart = index + 1;
        continue;
      }
      const command = source.slice(index + 1).match(/^[a-zA-Z]+/);
      if (command) index += command[0].length;
      else index += 1;
      continue;
    }
    if (source[index] === '{') groupDepth += 1;
    if (source[index] === '}') groupDepth = Math.max(0, groupDepth - 1);
    if (source[index] === '&' && groupDepth === 0 && environmentDepth === 0) {
      rows.at(-1).push(source.slice(cellStart, index));
      cellStart = index + 1;
    }
  }
  rows.at(-1).push(source.slice(cellStart));
  return rows;
}

function renderMathEnvironment(source, name, depth) {
  const expression = /\\(begin|end)\s*\{([^}]+)\}/g;
  let nesting = 1;
  let match;
  let closingStart = -1;
  let closingEnd = -1;
  while ((match = expression.exec(source)) !== null) {
    if (match[2] !== name) continue;
    if (match[1] === 'begin') nesting += 1;
    else nesting -= 1;
    if (nesting === 0) {
      closingStart = match.index;
      closingEnd = expression.lastIndex;
      break;
    }
  }
  if (closingStart < 0) return { markup: `<mtext>${escapeMathXml(name)}</mtext>`, next: source.length };

  const rows = splitMathEnvironment(source.slice(0, closingStart));
  const table = `<mtable>${rows.map((row) =>
    `<mtr>${row.map((cell) => `<mtd>${renderMathSequence(cell, depth + 1)}</mtd>`).join('')}</mtr>`
  ).join('')}</mtable>`;
  const delimiters = {
    bmatrix: ['[', ']'],
    pmatrix: ['(', ')'],
    Bmatrix: ['{', '}'],
    vmatrix: ['|', '|'],
    Vmatrix: ['‖', '‖'],
    cases: ['{', ''],
  }[name];
  const markup = delimiters
    ? `<mrow><mo>${delimiters[0]}</mo>${table}${delimiters[1] ? `<mo>${delimiters[1]}</mo>` : ''}</mrow>`
    : table;
  return { markup, next: closingEnd };
}

function parseMathAtom(source, start, depth = 0) {
  let index = start;
  while (/\s/.test(source[index] || '')) index += 1;
  if (index >= source.length) return { markup: '', next: index };
  if (depth > 32) return { markup: '<mtext>…</mtext>', next: source.length };

  const character = source[index];
  if (character === '{') {
    const group = readMathGroup(source, index);
    return { markup: mathNode('mrow', renderMathSequence(group.value, depth + 1)), next: group.next };
  }

  if (character === '\\') {
    if (source[index + 1] === '\\') return { markup: '<mspace width="0.5em"/>', next: index + 2 };
    const commandMatch = source.slice(index + 1).match(/^[a-zA-Z]+/);
    const command = commandMatch?.[0] || source[index + 1] || '';
    const next = index + 1 + command.length;
    if (command === 'left' || command === 'right' || command === 'displaystyle' || command === 'limits') {
      return { markup: '', next };
    }
    if (command === 'begin') {
      const environment = readMathGroup(source, next);
      const renderedEnvironment = renderMathEnvironment(source.slice(environment.next), environment.value, depth);
      return { ...renderedEnvironment, next: environment.next + renderedEnvironment.next };
    }
    if (command === 'frac' || command === 'dfrac' || command === 'tfrac') {
      const numerator = readMathArgument(source, next, depth);
      const denominator = readMathArgument(source, numerator.next, depth);
      return {
        markup: `<mfrac>${numerator.markup}${denominator.markup}</mfrac>`,
        next: denominator.next,
      };
    }
    if (command === 'sqrt') {
      let argumentStart = next;
      let rootIndex = null;
      while (/\s/.test(source[argumentStart] || '')) argumentStart += 1;
      if (source[argumentStart] === '[') {
        const indexGroup = readMathGroup(source, argumentStart, '[', ']');
        rootIndex = mathNode('mrow', renderMathSequence(indexGroup.value, depth + 1));
        argumentStart = indexGroup.next;
      }
      const radicand = readMathArgument(source, argumentStart, depth);
      return {
        markup: rootIndex
          ? `<mroot>${radicand.markup}${rootIndex}</mroot>`
          : `<msqrt>${radicand.markup}</msqrt>`,
        next: radicand.next,
      };
    }
    if (command === 'boxed' || command === 'cancel') {
      const group = readMathGroup(source, next);
      const inner = mathNode('mrow', renderMathSequence(group.value, depth + 1));
      const notation = command === 'boxed' ? 'box' : 'updiagonalstrike';
      return { markup: `<menclose notation="${notation}">${inner}</menclose>`, next: group.next };
    }
    if (['text', 'mathrm', 'mathbf', 'mathit', 'operatorname', 'mathbb', 'boldsymbol'].includes(command)) {
      const group = readMathGroup(source, next);
      const text = escapeMathXml(group.value.replace(/\\([{}%])/g, '$1'));
      const variant = ['mathbf', 'boldsymbol'].includes(command)
        ? 'bold'
        : command === 'mathit' ? 'italic' : command === 'mathbb' ? 'double-struck' : 'normal';
      const tag = command === 'text' ? 'mtext' : 'mi';
      return { markup: mathNode(tag, text, ` mathvariant="${variant}"`), next: group.next };
    }
    if ([',', ';', ':', '!', ' '].includes(command)) {
      const width = command === ',' ? '0.2em' : command === ';' ? '0.35em' : command === '!' ? '0.05em' : '0.25em';
      return { markup: `<mspace width="${width}"/>`, next };
    }
    if (command === 'quad' || command === 'qquad') {
      return { markup: `<mspace width="${command === 'quad' ? '1em' : '2em'}"/>`, next };
    }
    const symbol = MATH_SYMBOLS[command] || ({
      '{': '{', '}': '}', '|': '|', '%': '%', '_': '_', '#': '#', '&': '&',
    }[command] ?? command);
    const tag = MATH_OPERATORS.has(symbol) ? 'mo' : 'mi';
    return { markup: mathNode(tag, escapeMathXml(symbol)), next };
  }

  if (/\d/.test(character)) {
    const number = source.slice(index).match(/^\d+(?:\.\d+)?/)[0];
    return { markup: mathNode('mn', number), next: index + number.length };
  }

  if (/[a-zA-Z]/.test(character)) return { markup: mathNode('mi', escapeMathXml(character)), next: index + 1 };
  if (character === '&') return { markup: '<mo>&amp;</mo>', next: index + 1 };
  if (character === '_') return { markup: '<mi>_</mi>', next: index + 1 };
  if (character === '^') return { markup: '<mo>^</mo>', next: index + 1 };
  return {
    markup: mathNode(MATH_OPERATORS.has(character) ? 'mo' : 'mi', escapeMathXml(character)),
    next: index + 1,
  };
}

function renderMathSequence(source, depth = 0) {
  if (depth > 32) return '<mtext>…</mtext>';
  let index = 0;
  let markup = '';
  while (index < source.length) {
    while (/\s/.test(source[index] || '')) index += 1;
    if (index >= source.length) break;
    const atom = parseMathAtom(source, index, depth);
    if (atom.next <= index) break;
    index = atom.next;
    let subscript = '';
    let superscript = '';
    while (index < source.length) {
      const script = source[index];
      if (script !== '_' && script !== '^') break;
      const argument = readMathArgument(source, index + 1, depth);
      if (argument.next <= index + 1) break;
      if (script === '_') subscript = argument.markup;
      else superscript = argument.markup;
      index = argument.next;
      while (/\s/.test(source[index] || '')) index += 1;
    }
    if (subscript && superscript) {
      markup += `<msubsup>${atom.markup}${subscript}${superscript}</msubsup>`;
    } else if (subscript) {
      markup += `<msub>${atom.markup}${subscript}</msub>`;
    } else if (superscript) {
      markup += `<msup>${atom.markup}${superscript}</msup>`;
    } else {
      markup += atom.markup;
    }
  }
  return markup;
}

export function renderWorkspaceMathML(source, display = false) {
  const latex = String(source || '');
  if (!latex || latex.length > 10_000) return '';
  const body = renderMathSequence(latex);
  return `<math xmlns="http://www.w3.org/1998/Math/MathML"${display ? ' display="block"' : ''}><mrow>${body}</mrow></math>`;
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
      const delimiterLength = value.startsWith('$$') ? 2 : value.startsWith('\\[') || value.startsWith('\\(') ? 2 : 1;
      const closingLength = value.startsWith('$$') ? 2 : value.endsWith('\\]') || value.endsWith('\\)') ? 2 : 1;
      const latex = value.slice(delimiterLength, value.length - closingLength);
      tokens.push({
        type: 'math',
        text: formatWorkspaceMath(value),
        latex,
        display: value.startsWith('$$') || value.startsWith('\\['),
      });
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
