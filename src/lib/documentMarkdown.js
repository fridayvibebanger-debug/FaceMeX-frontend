function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInlineMarkdown(text) {
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|==([^=]+)==|`([^`]+)`|\*([^*]+)\*|_([^_]+)_/g;
  let result = '';
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    result += escapeHtml(text.slice(lastIndex, match.index));
    if (match[1] && match[2]) {
      result += `<a href="${escapeHtml(match[2])}" target="_blank" rel="noopener noreferrer">${escapeHtml(match[1])}</a>`;
    } else if (match[3] || match[4]) {
      result += `<strong>${escapeHtml(match[3] || match[4])}</strong>`;
    } else if (match[5]) {
      result += `<s>${escapeHtml(match[5])}</s>`;
    } else if (match[6]) {
      result += '<mark data-color="#fef08a" style="background-color: #fef08a">';
      result += `${escapeHtml(match[6])}</mark>`;
    } else if (match[7]) {
      result += `<code>${escapeHtml(match[7])}</code>`;
    } else {
      result += `<em>${escapeHtml(match[8] || match[9])}</em>`;
    }
    lastIndex = pattern.lastIndex;
  }

  return result + escapeHtml(text.slice(lastIndex));
}

function splitTableRow(line) {
  let value = line.trim();
  if (value.startsWith('|')) value = value.slice(1);
  if (value.endsWith('|') && !value.endsWith('\\|')) value = value.slice(0, -1);

  const cells = [];
  let cell = '';
  let escaped = false;
  for (const character of value) {
    if (escaped) {
      cell += character === '|' ? '|' : `\\${character}`;
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (character === '|') {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += character;
    }
  }
  if (escaped) cell += '\\';
  cells.push(cell.trim());
  return cells;
}

function parseMarkdownTable(headerLine, separatorLine, bodyLines = []) {
  if (typeof headerLine !== 'string' || typeof separatorLine !== 'string') return null;
  const headers = splitTableRow(headerLine);
  const separators = splitTableRow(separatorLine);
  if (headers.length < 1 || headers.length !== separators.length) return null;
  if (separators.some((cell) => !/^:?-{3,}:?$/.test(cell))) return null;

  const alignments = separators.map((cell) =>
    cell.startsWith(':') && cell.endsWith(':')
      ? 'center'
      : cell.endsWith(':')
        ? 'right'
        : 'left'
  );
  const rows = bodyLines
    .filter((line) => line.trim())
    .map((line) => {
      const cells = splitTableRow(line);
      return Array.from({ length: headers.length }, (_, index) => cells[index] || '');
    });

  return {
    headers: headers.map((cell) => cell.trim()),
    alignments,
    rows,
  };
}

function renderMarkdownTable(table) {
  const renderCell = (cell, tag, alignment) =>
    `<${tag} style="text-align: ${alignment}">${renderInlineMarkdown(cell)}</${tag}>`;
  const header = table.headers
    .map((cell, index) => renderCell(cell, 'th', table.alignments[index]))
    .join('');
  const body = table.rows
    .map((row) => `<tr>${row.map((cell, index) => renderCell(cell, 'td', table.alignments[index])).join('')}</tr>`)
    .join('');
  return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

export function renderMarkdownToEditorHtml(text, slides = false) {
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let slideStarted = false;

  for (let index = 0; index < lines.length;) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    if (/^```/.test(line)) {
      const codeLines = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index].trim())) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    if (index + 1 < lines.length) {
      const tableRows = [];
      if (parseMarkdownTable(line, lines[index + 1])) {
        tableRows.push(lines[index], lines[index + 1]);
        index += 2;
        while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
          tableRows.push(lines[index]);
          index += 1;
        }
        const table = parseMarkdownTable(tableRows[0], tableRows[1], tableRows.slice(2));
        if (table) blocks.push(renderMarkdownTable(table));
        continue;
      }
    }

    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (heading) {
      if (slides && /^SLIDE\s+\d+/i.test(heading[2])) {
        if (slideStarted) blocks.push('<div data-page-break="true"></div>');
        slideStarted = true;
      }
      blocks.push(`<h${heading[1].length}>${renderInlineMarkdown(heading[2])}</h${heading[1].length}>`);
      index += 1;
      continue;
    }

    if (/^(?:[-*_]\s*){3,}$/.test(line)) {
      blocks.push('<hr>');
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ''));
        index += 1;
      }
      blocks.push(`<blockquote><p>${quoteLines.map(renderInlineMarkdown).join('<br>')}</p></blockquote>`);
      continue;
    }

    const listMarker = line.match(/^([-*+]|\d+[.)])\s+(.+)$/);
    if (listMarker) {
      const ordered = /^\d/.test(listMarker[1]);
      const tag = ordered ? 'ol' : 'ul';
      const items = [];
      while (index < lines.length) {
        const item = lines[index].trim().match(/^([-*+]|\d+[.)])\s+(.+)$/);
        if (!item || /^\d/.test(item[1]) !== ordered) break;
        items.push(`<li>${renderInlineMarkdown(item[2])}</li>`);
        index += 1;
      }
      blocks.push(`<${tag}>${items.join('')}</${tag}>`);
      continue;
    }

    if (slides && /^SLIDE\s+\d+/i.test(line)) {
      if (slideStarted) blocks.push('<div data-page-break="true"></div>');
      slideStarted = true;
      blocks.push(`<h1>${escapeHtml(line)}</h1>`);
      index += 1;
      continue;
    }

    const paragraphLines = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() &&
      !/^(?:```|#{1,6}\s|>\s?|(?:[-*_]\s*){3,}|(?:[-*+]|\d+[.)])\s+)/.test(lines[index].trim()) &&
      !(index + 1 < lines.length && parseMarkdownTable(lines[index].trim(), lines[index + 1].trim()))) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }
    blocks.push(`<p>${renderInlineMarkdown(paragraphLines.join(' '))}</p>`);
  }

  return blocks.join('') || '<p></p>';
}

export { parseMarkdownTable };
