function parseCoefficient(value, sign) {
  const magnitude = value ? Number(value) : 1;
  return sign === '-' ? -magnitude : magnitude;
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
  if (!/^(?:y|f\(x\))$/.test(left)) return null;
  const expression = normalized.slice(equalsIndex + 1).replace(/\*/g, '');
  if (!expression || /[^0-9.x^+-]/.test(expression) || /x\^([3-9]|\d{2,})/.test(expression)) return null;

  const terms = expression.match(/[+-]?[^+-]+/g);
  if (!terms || terms.join('') !== expression) return null;

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
  const vertexX = a === 0 ? null : -b / (2 * a);
  return {
    points,
    roots: roots.filter((root) => root >= minimumX && root <= maximumX),
    yIntercept: c,
    vertex: vertexX === null || vertexX < minimumX || vertexX > maximumX
      ? null
      : { x: vertexX, y: a * vertexX ** 2 + b * vertexX + c },
  };
}
