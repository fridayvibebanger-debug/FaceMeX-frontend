function parseCoefficient(value, sign) {
  const magnitude = value ? Number(value) : 1;
  return sign === '-' ? -magnitude : magnitude;
}

function parseQuadraticPolynomial(expression) {
  const normalized = expression.replace(/\*/g, '');
  if (!normalized || /[^0-9.x^+-]/.test(normalized) || /x\^([3-9]|\d{2,})/.test(normalized)) return null;
  const terms = normalized.match(/[+-]?[^+-]+/g);
  if (!terms || terms.join('') !== normalized) return null;

  const coefficients = { a: 0, b: 0, c: 0 };
  for (const term of terms) {
    const parsed = term.match(/^([+-]?)(?:(\d+(?:\.\d*)?|\.\d+))?(x(?:\^2)?)?$/);
    if (!parsed) return null;
    const [, sign, magnitude, variable] = parsed;
    if (variable === 'x^2') coefficients.a += parseCoefficient(magnitude, sign);
    else if (variable === 'x') coefficients.b += parseCoefficient(magnitude, sign);
    else if (magnitude) coefficients.c += (sign === '-' ? -1 : 1) * Number(magnitude);
    else return null;
  }
  if (![coefficients.a, coefficients.b, coefficients.c].every(Number.isFinite) ||
    Math.max(Math.abs(coefficients.a), Math.abs(coefficients.b), Math.abs(coefficients.c)) > 1_000_000) {
    return null;
  }
  return coefficients;
}

function compileExpression(source) {
  const expression = String(source || '')
    .replace(/[−–]/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/²/g, '^2')
    .replace(/π/g, 'pi')
    .replace(/√\s*\(/g, 'sqrt(')
    .replace(/√\s*([a-z0-9.]+)/gi, 'sqrt($1)')
    .replace(/\s+/g, '')
    .toLowerCase();
  if (!expression || expression.length > 120 || /[^a-z0-9.+*/^()-]/.test(expression)) return null;

  const tokenPattern = /(?:\d+(?:\.\d*)?|\.\d+)|[a-z]+|[()+\-*/^]/gy;
  const rawTokens = [];
  let cursor = 0;
  while (cursor < expression.length) {
    tokenPattern.lastIndex = cursor;
    const match = tokenPattern.exec(expression);
    if (!match) return null;
    rawTokens.push(match[0]);
    cursor = tokenPattern.lastIndex;
  }
  const functions = new Set(['sin', 'cos', 'tan', 'abs', 'sqrt', 'exp', 'ln', 'log']);
  const constants = new Set(['pi', 'e']);
  const variables = new Set(['x']);
  const tokens = [];
  for (let index = 0; index < rawTokens.length; index += 1) {
    const current = rawTokens[index];
    if (/^[a-z]+$/.test(current) && !functions.has(current) && !constants.has(current) && !variables.has(current)) return null;
    const previous = tokens.at(-1);
    const previousCanEnd = previous && (/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(previous) ||
      previous === 'x' || constants.has(previous) || previous === ')');
    const currentCanStart = /^(?:\d+(?:\.\d*)?|\.\d+|x|pi|e|\()$/.test(current) ||
      functions.has(current) && rawTokens[index + 1] === '(';
    const previousIsFunction = previous && functions.has(previous);
    if (previousCanEnd && currentCanStart && !previousIsFunction) tokens.push('*');
    tokens.push(current);
  }

  let index = 0;
  const parseExpression = () => {
    let node = parseTerm();
    while (tokens[index] === '+' || tokens[index] === '-') {
      const operator = tokens[index++];
      const right = parseTerm();
      node = { type: 'binary', operator, left: node, right };
    }
    return node;
  };
  const parseTerm = () => {
    let node = parseUnary();
    while (tokens[index] === '*' || tokens[index] === '/') {
      const operator = tokens[index++];
      const right = parseUnary();
      node = { type: 'binary', operator, left: node, right };
    }
    return node;
  };
  const parseUnary = () => {
    if (tokens[index] === '+' || tokens[index] === '-') {
      const operator = tokens[index++];
      return { type: 'unary', operator, value: parseUnary() };
    }
    return parsePower();
  };
  const parsePower = () => {
    let node = parsePrimary();
    if (tokens[index] === '^') {
      index += 1;
      node = { type: 'binary', operator: '^', left: node, right: parseUnary() };
    }
    return node;
  };
  const parsePrimary = () => {
    const token = tokens[index++];
    if (!token) throw new Error('incomplete');
    if (token === '(') {
      const node = parseExpression();
      if (tokens[index++] !== ')') throw new Error('missing closing bracket');
      return node;
    }
    if (/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) return { type: 'number', value: Number(token) };
    if (token === 'x') return { type: 'x' };
    if (token === 'pi' || token === 'e') return { type: 'constant', value: token };
    if (functions.has(token)) {
      if (tokens[index++] !== '(') throw new Error('function requires parentheses');
      const value = parseExpression();
      if (tokens[index++] !== ')') throw new Error('missing function bracket');
      return { type: 'function', name: token, value };
    }
    throw new Error('unexpected token');
  };

  try {
    const tree = parseExpression();
    if (index !== tokens.length) return null;
    const evaluate = (x) => {
      const visit = (node) => {
        if (node.type === 'number') return node.value;
        if (node.type === 'x') return x;
        if (node.type === 'constant') return node.value === 'pi' ? Math.PI : Math.E;
        if (node.type === 'unary') return node.operator === '-' ? -visit(node.value) : visit(node.value);
        if (node.type === 'function') {
          const value = visit(node.value);
          if (node.name === 'sin') return Math.sin(value);
          if (node.name === 'cos') return Math.cos(value);
          if (node.name === 'tan') return Math.tan(value);
          if (node.name === 'abs') return Math.abs(value);
          if (node.name === 'sqrt') return Math.sqrt(value);
          if (node.name === 'exp') return Math.exp(value);
          if (node.name === 'ln') return Math.log(value);
          return Math.log10(value);
        }
        const left = visit(node.left);
        const right = visit(node.right);
        if (node.operator === '+') return left + right;
        if (node.operator === '-') return left - right;
        if (node.operator === '*') return left * right;
        if (node.operator === '/') return right === 0 ? NaN : left / right;
        return left ** right;
      };
      try {
        const value = visit(tree);
        return Number.isFinite(value) && Math.abs(value) <= 1e8 ? value : null;
      } catch {
        return null;
      }
    };
    return { evaluate, expression };
  } catch {
    return null;
  }
}

export function parseGraphFunction(input) {
  const source = String(input || '').trim();
  const match = source.match(/^\s*(?:y|f\(x\))\s*=\s*(.+)$/i);
  if (!match) return null;
  const compiled = compileExpression(match[1]);
  if (!compiled) return null;
  const coefficients = parseQuadraticEquation(source);
  const family = coefficients
    ? coefficients.a === 0 ? 'linear' : 'quadratic'
    : /\b(?:sin|cos|tan)\s*\(/i.test(match[1]) ? 'trigonometric'
      : /\b(?:ln|log|sqrt)\s*\(/i.test(match[1]) ? 'logarithmic'
        : /\bexp\s*\(|\be\s*\^/i.test(match[1]) ? 'exponential'
          : /\bx\s*\^|x²/i.test(match[1]) ? 'polynomial'
            : /\babs\s*\(/i.test(match[1]) ? 'absolute-value'
              : /[/]/.test(match[1]) ? 'rational' : 'function';
  return {
    expression: source,
    family,
    coefficients,
    evaluate: compiled.evaluate,
  };
}

export function sampleGraphFunction(input, minimumX = -10, maximumX = 10, pointCount = 241) {
  const graphFunction = typeof input === 'string' ? parseGraphFunction(input) : input;
  if (!graphFunction || !Number.isFinite(minimumX) || !Number.isFinite(maximumX) ||
    minimumX >= maximumX || !Number.isInteger(pointCount) || pointCount < 2 || pointCount > 1000) return null;
  const points = Array.from({ length: pointCount }, (_, index) => {
    const x = minimumX + (maximumX - minimumX) * index / (pointCount - 1);
    const y = graphFunction.evaluate(x);
    return y === null ? null : { x, y };
  });
  return { expression: graphFunction.expression, family: graphFunction.family, points };
}

function formatNumber(value) {
  return Number(value.toFixed(3)).toString();
}

export function createLinearFunctionExplanation(input) {
  const graphFunction = parseGraphFunction(input);
  const coefficients = graphFunction?.coefficients;
  if (!coefficients || coefficients.a !== 0) return null;
  const { b, c } = coefficients;
  const sign = c < 0 ? '-' : '+';
  const intercept = b === 0 ? null : -c / b;
  return [
    'What I see',
    `The board shows the linear function \\[${String(input).trim()}\\].`,
    '',
    `The slope is \\(${formatNumber(b)}\\). This tells us how much y changes when x increases by 1.`,
    `The y-intercept is \\((0,${formatNumber(c)})\\), where the line crosses the y-axis.`,
    '',
    'Step-by-step check',
    `At \\(x=0\\): \\(y=${formatNumber(b)}(0)${sign}${formatNumber(Math.abs(c))}=${formatNumber(c)}\\).`,
    ...(intercept === null ? [] : [`At \\(y=0\\): \\(x=${formatNumber(intercept)}\\), so the x-intercept is \\((${formatNumber(intercept)},0)\\).`]),
    '',
    'Final understanding',
    `This is a straight line with slope ${formatNumber(b)} and y-intercept ${formatNumber(c)}.`,
  ].join('\n');
}

function createQuestion(id, prompt, answer, hint, explanation, options) {
  return {
    id,
    prompt,
    answer,
    hint,
    explanation,
    ...(options ? { options } : {}),
  };
}

export function createGraphPractice(input) {
  const graphFunction = parseGraphFunction(input);
  if (!graphFunction) return null;
  const questions = [];
  const { coefficients, family, evaluate } = graphFunction;
  if (coefficients?.a !== undefined && coefficients.a !== 0) {
    const { a, b, c } = coefficients;
    const vertexX = -b / (2 * a);
    const vertexY = a * vertexX ** 2 + b * vertexX + c;
    const discriminant = b ** 2 - 4 * a * c;
    questions.push(createQuestion(
      'vertex',
      'What are the coordinates of the vertex?',
      `${formatNumber(vertexX)},${formatNumber(vertexY)}`,
      'Find the x-coordinate first using −b ÷ (2a), then substitute it into the function.',
      `The vertex is \\((${formatNumber(vertexX)},${formatNumber(vertexY)})\\).`,
      [
        `(${formatNumber(vertexX)}, ${formatNumber(vertexY)})`,
        `(${formatNumber(vertexY)}, ${formatNumber(vertexX)})`,
        `(0, ${formatNumber(c)})`,
        `(${formatNumber(vertexX)}, ${formatNumber(-vertexY)})`,
      ],
    ));
    questions.push(createQuestion(
      'opening',
      'Does the parabola open upward or downward?',
      a > 0 ? 'upward' : 'downward',
      'Look at the sign of the coefficient of x².',
      `The coefficient of x² is ${a}, so the parabola opens ${a > 0 ? 'upward' : 'downward'}.`,
      ['Upward', 'Downward'],
    ));
    questions.push(createQuestion(
      'intercept',
      'What is the y-intercept?',
      `0,${formatNumber(c)}`,
      'Set x = 0. The constant term gives the y-value.',
      `At x = 0, y = ${formatNumber(c)}, so the y-intercept is (0, ${formatNumber(c)}).`,
    ));
    questions.push(createQuestion(
      'roots',
      'How many real x-intercepts does the graph have?',
      discriminant > 0 ? '2' : discriminant === 0 ? '1' : '0',
      'Check the discriminant, b² − 4ac: positive means two, zero means one, and negative means none.',
      discriminant < 0
        ? 'The discriminant is negative, so there are no real x-intercepts.'
        : discriminant === 0
          ? 'The discriminant is zero, so the graph touches the x-axis once.'
          : 'The discriminant is positive, so the graph crosses the x-axis twice.',
      ['0', '1', '2'],
    ));
    questions.push(createQuestion(
      'minimum',
      a > 0 ? 'What is the minimum value of the function?' : 'What is the maximum value of the function?',
      formatNumber(vertexY),
      'The minimum or maximum value is the y-coordinate of the vertex.',
      `The vertex has y-coordinate ${formatNumber(vertexY)}, which is the ${a > 0 ? 'minimum' : 'maximum'} value.`,
    ));
  } else if (coefficients?.a === 0) {
    const { b, c } = coefficients;
    questions.push(createQuestion(
      'slope',
      'What is the slope of the line?',
      formatNumber(b),
      'The slope is the coefficient multiplying x.',
      `The coefficient of x is ${formatNumber(b)}, so the slope is ${formatNumber(b)}.`,
    ));
    questions.push(createQuestion(
      'intercept',
      'What is the y-intercept?',
      `0,${formatNumber(c)}`,
      'Set x = 0. The constant term gives the y-value.',
      `At x = 0, y = ${formatNumber(c)}, so the y-intercept is (0, ${formatNumber(c)}).`,
    ));
    questions.push(createQuestion(
      'value',
      'What is the value of y when x = 1?',
      formatNumber(b + c),
      'Substitute x = 1 into the displayed function.',
      `Substituting x = 1 gives y = ${formatNumber(b)} + ${formatNumber(c)} = ${formatNumber(b + c)}.`,
    ));
  } else {
    const atZero = evaluate(0);
    const atOne = evaluate(1);
    if (atZero === null || atOne === null) return null;
    questions.push(createQuestion(
      'value-zero',
      'What is the value of the function when x = 0?',
      formatNumber(atZero),
      'Substitute 0 wherever x appears in the displayed function.',
      `Substituting x = 0 gives y = ${formatNumber(atZero)}.`,
    ));
    questions.push(createQuestion(
      'value-one',
      'What is the value of the function when x = 1?',
      formatNumber(atOne),
      'Substitute 1 wherever x appears in the displayed function.',
      `Substituting x = 1 gives y = ${formatNumber(atOne)}.`,
    ));
    questions.push(createQuestion(
      'family',
      'Which family best describes this function?',
      family,
      'Look at the main operation used in the expression.',
      `The expression is classified as a ${family} function.`,
      ['polynomial', 'exponential', 'logarithmic', 'trigonometric', 'rational', 'absolute-value'],
    ));
  }
  return {
    topic: `${family} function`,
    equation: graphFunction.expression,
    questions,
    currentIndex: 0,
    attempts: 0,
    correct: 0,
    completed: false,
    createdAt: new Date().toISOString(),
    lastAttemptAt: null,
  };
}

export function parseQuadraticEquation(input) {
  const normalized = String(input || '')
    .replace(/[−–]/g, '-')
    .replace(/²/g, '^2')
    .replace(/\s+/g, '')
    .toLowerCase();
  const equalsIndex = normalized.indexOf('=');
  if (equalsIndex < 1 || normalized.indexOf('=', equalsIndex + 1) >= 0) return null;
  const left = normalized.slice(0, equalsIndex);
  const right = normalized.slice(equalsIndex + 1);
  if (!right) return null;
  if (/^(?:y|f\(x\))$/.test(left)) {
    return parseQuadraticPolynomial(right);
  }

  const leftCoefficients = parseQuadraticPolynomial(left);
  const rightCoefficients = parseQuadraticPolynomial(right);
  if (!leftCoefficients || !rightCoefficients) return null;
  const coefficients = {
    a: leftCoefficients.a - rightCoefficients.a,
    b: leftCoefficients.b - rightCoefficients.b,
    c: leftCoefficients.c - rightCoefficients.c,
  };
  return Object.values(coefficients).every(Number.isFinite) &&
    Math.max(...Object.values(coefficients).map(Math.abs)) <= 1_000_000
    ? coefficients
    : null;
}

export function isIncompleteEquation(input) {
  const expression = String(input || '')
    .replace(/\\(?:\[|\]|\(|\))/g, '')
    .replace(/[$\s]/g, '')
    .trim();
  const equalityIndex = expression.lastIndexOf('=');
  if (equalityIndex < 0 || equalityIndex !== expression.length - 1 ||
    expression.indexOf('=') !== equalityIndex) return false;
  return /[a-z0-9]/i.test(expression.slice(0, equalityIndex));
}

export function createIncompleteEquationClarification(input) {
  const expression = String(input || '').trim();
  if (!isIncompleteEquation(expression)) return null;
  const withoutDelimiters = expression.replace(/\\(?:\[|\]|\(|\))/g, '').replace(/^\$+|\$+$/g, '').trim();
  const equalsIndex = withoutDelimiters.lastIndexOf('=');
  const left = withoutDelimiters.slice(0, equalsIndex).trim();
  const right = withoutDelimiters.slice(equalsIndex + 1).trim();
  if (!left) {
    return [
      'What I noticed',
      'Your equation is missing the expression before the equals sign.',
      '',
      'Let’s complete it',
      'What should go on the left-hand side?',
    ].join('\n');
  }
  if (right) return null;
  return [
    'What I noticed',
    'Your equation currently reads:',
    '',
    `\\[${left} =\\]`,
    '',
    'The right-hand side is missing.',
    '',
    'Let’s complete it',
    'What should come after the equals sign?',
  ].join('\n');
}

function formatExactQuadraticRoots(coefficients, discriminant) {
  const { a, b } = coefficients;
  const denominator = 2 * a;
  if (!Number.isInteger(a) || !Number.isInteger(b) || !Number.isInteger(discriminant) ||
    a <= 0 || denominator === 0) return null;

  const centerNumerator = -b;
  if (centerNumerator % denominator !== 0) return null;
  let outside = 1;
  let inside = discriminant;
  for (let factor = 2; factor * factor <= inside; factor += 1) {
    while (inside % (factor * factor) === 0) {
      outside *= factor;
      inside /= factor * factor;
    }
  }
  if (outside % denominator !== 0) return null;

  const center = centerNumerator / denominator;
  const radicalCoefficient = outside / denominator;
  const radical = inside === 1
    ? String(radicalCoefficient)
    : `${radicalCoefficient === 1 ? '' : radicalCoefficient}\\sqrt{${inside}}`;
  return `${center} \\pm ${radical}`;
}

function formatQuadraticPolynomial(a, b, c) {
  return [
    { coefficient: a, variable: 'x^2' },
    { coefficient: b, variable: 'x' },
    { coefficient: c, variable: '' },
  ].filter(({ coefficient }) => coefficient !== 0)
    .map(({ coefficient, variable }, index) => {
      const sign = coefficient < 0 ? '-' : index === 0 ? '' : '+';
      const magnitude = Math.abs(coefficient);
      const value = variable && magnitude === 1 ? '' : String(magnitude);
      return `${sign}${value}${variable}`;
    }).join('');
}

export function createQuadraticFunctionExplanation(input) {
  const source = String(input || '').trim();
  const expression = source.replace(/\\(?:\[|\]|\(|\))/g, '').replace(/^\$+|\$+$/g, '').trim();
  if (!/^(?:y|f\(x\))\s*=/i.test(expression)) return null;
  const result = solveQuadraticEquation(expression);
  if (!result || result.kind !== 'quadratic' || !result.vertex || result.discriminant === null) return null;

  const { a, b, c } = result.coefficients;
  const { x, y } = result.vertex;
  const fixed = (value) => Number(value.toFixed(3)).toString();
  const direction = a > 0 ? 'upward' : 'downward';
  const roots = result.roots.length
    ? result.roots.map(fixed)
    : [];
  const exactRoots = result.discriminant >= 0
    ? formatExactQuadraticRoots(result.coefficients, result.discriminant)
    : null;
  const rootExplanation = result.discriminant < 0
    ? 'There are no real x-intercepts because the discriminant is negative.'
    : result.roots.length === 1
      ? `The graph touches the x-axis once, at \\(x=${roots[0]}\\).`
      : `The roots are ${exactRoots ? `\\(x=${exactRoots}\\)` : 'given by the quadratic formula'}; approximately \\(x\\approx${roots[0]}\\) and \\(x\\approx${roots[1]}\\).`;
  const polynomial = formatQuadraticPolynomial(a, b, c);
  const substitutedY = [
    { value: a, term: `${fixed(x)}^2` },
    { value: b, term: `(${fixed(x)})` },
    { value: c, term: '' },
  ].filter(({ value }) => value !== 0)
    .map(({ value, term }, index) => {
      const sign = value < 0 ? '-' : index === 0 ? '' : '+';
      const magnitude = Math.abs(value);
      const coefficient = term && magnitude === 1 ? '' : String(magnitude);
      return `${sign}${coefficient}${term}`;
    }).join('');

  return [
    'What I see',
    'The board shows the quadratic function:',
    '',
    `\\[${source}\\]`,
    '',
    `Its coefficients are \\(a=${a},\\ b=${b},\\ c=${c}\\).`,
    '',
    'Step 1: Find the turning point’s x-coordinate.',
    `\\[x=-\\frac{b}{2a}=\\frac{${-b}}{2(${a})}=${fixed(x)}\\]`,
    '',
    'Step 2: Substitute that value to find the y-coordinate.',
    `\\[y=${substitutedY}=${fixed(y)}\\]`,
    '',
    `The vertex is \\((${fixed(x)},${fixed(y)})\\), the ${a > 0 ? 'lowest' : 'highest'} point.`,
    `The axis of symmetry is \\(x=${fixed(x)}\\), and the ${a > 0 ? 'minimum' : 'maximum'} value is \\(${fixed(y)}\\).`,
    '',
    'Step 3: Find the y-intercept by setting x to zero.',
    `\\[y=${c}\\]`,
    `The y-intercept is \\((0,${c})\\).`,
    '',
    'Step 4: Find where the graph crosses the x-axis.',
    `Set \\(y=0\\): \\[${polynomial}=0\\]`,
    rootExplanation,
    '',
    'Final understanding',
    `The parabola opens ${direction}. Its vertex is \\((${fixed(x)},${fixed(y)})\\), and its y-intercept is \\((0,${c})\\).`,
  ].join('\n');
}

export function solveQuadraticEquation(input) {
  const coefficients = parseQuadraticEquation(input);
  if (!coefficients) return null;
  const { a, b, c } = coefficients;
  if (a === 0) {
    if (b === 0) return null;
    return {
      coefficients,
      discriminant: null,
      roots: [-c / b],
      vertex: null,
      kind: 'linear',
    };
  }

  const discriminant = b ** 2 - 4 * a * c;
  const roots = discriminant < 0
    ? []
    : discriminant === 0
      ? [-b / (2 * a)]
      : [(-b - Math.sqrt(discriminant)) / (2 * a), (-b + Math.sqrt(discriminant)) / (2 * a)];
  const vertexX = -b / (2 * a);
  return {
    coefficients,
    discriminant,
    roots,
    vertex: { x: vertexX, y: a * vertexX ** 2 + b * vertexX + c },
    kind: 'quadratic',
  };
}

export function sampleQuadratic(coefficients, minimumX, maximumX, pointCount = 101) {
  const { a, b, c } = coefficients || {};
  if (![a, b, c, minimumX, maximumX].every(Number.isFinite) ||
    minimumX >= maximumX || !Number.isInteger(pointCount) || pointCount < 2 || pointCount > 500) {
    return null;
  }
  const points = Array.from({ length: pointCount }, (_, index) => {
    const x = minimumX + ((maximumX - minimumX) * index) / (pointCount - 1);
    return { x, y: a * x ** 2 + b * x + c };
  });
  const discriminant = b ** 2 - 4 * a * c;
  const roots = a === 0
    ? b === 0 ? [] : [-c / b]
    : discriminant < 0
      ? []
      : discriminant === 0
        ? [-b / (2 * a)]
        : [(-b - Math.sqrt(discriminant)) / (2 * a), (-b + Math.sqrt(discriminant)) / (2 * a)];
  const rawVertexX = a === 0 ? null : -b / (2 * a);
  const vertexX = rawVertexX === 0 ? 0 : rawVertexX;
  return {
    points,
    roots: roots.filter((root) => root >= minimumX && root <= maximumX),
    yIntercept: c,
    vertex: vertexX === null || vertexX < minimumX || vertexX > maximumX
      ? null
      : { x: vertexX, y: a * vertexX ** 2 + b * vertexX + c },
  };
}
