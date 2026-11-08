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
