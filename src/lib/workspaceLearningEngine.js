import { parseWorkspacePractice, parseWorkspaceVisualization } from './workspaceResponse.js';

const SUBJECTS = [
  { name: 'Life Sciences', pattern: /\b(?:life sciences?|lifesciences?)\b/i },
  { name: 'Mathematics', pattern: /\b(?:maths?|mathematics)\b/i },
  { name: 'Biology', pattern: /\bbiology\b/i },
  { name: 'Physics', pattern: /\b(?:physics|physical sciences?)\b/i },
  { name: 'Chemistry', pattern: /\bchemistry\b/i },
  { name: 'Geography', pattern: /\bgeography\b/i },
  { name: 'Natural Sciences', pattern: /\bnatural sciences?\b/i },
  { name: 'History', pattern: /\bhistory\b/i },
  { name: 'Accounting', pattern: /\baccounting\b/i },
  { name: 'Economics', pattern: /\beconomics?\b/i },
  { name: 'Business Studies', pattern: /\bbusiness studies?\b/i },
  { name: 'Computer Science', pattern: /\bcomputer sciences?\b/i },
  { name: 'Information Technology', pattern: /\b(?:information technology|IT class|in IT|IT course|ICT)\b/i },
  { name: 'Engineering', pattern: /\bengineering\b/i },
  { name: 'Agricultural Sciences', pattern: /\b(?:agricultural sciences?|agriculture)\b/i },
  { name: 'Environmental Studies', pattern: /\b(?:environmental studies|environmental science)\b/i },
  { name: 'Statistics', pattern: /\bstatistics?\b/i },
  { name: 'English and Literature', pattern: /\b(?:english|literature|poetry|novel|shakespeare)\b/i },
  { name: 'Languages', pattern: /\b(?:language learning|foreign language|second language|grammar|translation|translate|vocabulary|verb conjugation)\b/i },
  { name: 'Technology', pattern: /\b(?:technology|technological systems?|design and technology)\b/i },
  { name: 'Health Sciences', pattern: /\b(?:health sciences?|anatomy|physiology|public health|human body systems?)\b/i },
];

const TOPICS = [
  { subjects: ['Mathematics'], area: 'Algebra', topic: 'Quadratic equations', pattern: /\bquadratic(?:s| equation| equations)?\b/i },
  { subjects: ['Mathematics'], area: 'Algebra', topic: 'Linear equations', pattern: /\b(?:linear equation|solve for [a-z]|simultaneous equations?)\b/i },
  { subjects: ['Mathematics'], area: 'Algebra', topic: 'Algebraic expressions', pattern: /\b(?:algebra|factor(?:ise|ize)|simplif(?:y|ying).{0,30}(?:expression|variable))\b/i },
  { subjects: ['Mathematics'], area: 'Geometry', topic: 'Right-angled triangles', pattern: /\b(?:pythagor(?:as|ean)|hypotenuse|right[- ]angled triangle)\b/i },
  { subjects: ['Mathematics'], area: 'Geometry', topic: 'Geometry', pattern: /\b(?:geometry|angle|triangle|circle|area|perimeter|volume)\b/i },
  { subjects: ['Mathematics'], area: 'Calculus', topic: 'Differentiation', pattern: /\b(?:differentiat(?:e|ion)|derivative|stationary point|hessian)\b/i },
  { subjects: ['Mathematics'], area: 'Calculus', topic: 'Integration', pattern: /\b(?:integrat(?:e|ion)|integral)\b/i },
  { subjects: ['Mathematics', 'Statistics'], area: 'Statistics', topic: 'Probability and data', pattern: /\b(?:probability|mean|median|mode|standard deviation|statistics?)\b/i },
  { subjects: ['Mathematics'], area: 'Number', topic: 'Fractions and percentages', pattern: /\b(?:fraction|percentage|percent|ratio)\b|\b\d+\s*\/\s*\d+\b/i },
  { subjects: ['Biology', 'Life Sciences'], area: 'Cell biology', topic: 'Mitosis', pattern: /\bmitosis\b/i },
  { subjects: ['Biology', 'Life Sciences'], area: 'Cell biology', topic: 'Cell structure', pattern: /\b(?:cell biology|cell structure|organelle|mitochondri|chloroplast|cell membrane)\b/i },
  { subjects: ['Biology', 'Life Sciences'], area: 'Biological processes', topic: 'Photosynthesis', pattern: /\bphotosynthesis\b/i },
  { subjects: ['Biology', 'Life Sciences', 'Health Sciences'], area: 'Human biology', topic: 'Human circulatory system', pattern: /\b(?:circulatory system|blood circulation|heart chambers|blood flow)\b/i },
  { subjects: ['Biology', 'Life Sciences'], area: 'Genetics', topic: 'Genetics and inheritance', pattern: /\b(?:genetics?|inheritance|dna|gene|chromosome)\b/i },
  { subjects: ['Biology', 'Life Sciences'], area: 'Ecology', topic: 'Ecosystems and ecology', pattern: /\b(?:ecosystem|ecology|food chain|food web|biodiversity)\b/i },
  { subjects: ['Physics'], area: 'Mechanics', topic: "Newton's laws of motion", pattern: /\b(?:newton'?s laws?|law of inertia)\b/i },
  { subjects: ['Physics'], area: 'Mechanics', topic: 'Forces and motion', pattern: /\b(?:force|motion|acceleration|velocity|momentum|projectile)\b/i },
  { subjects: ['Physics'], area: 'Electricity', topic: 'Electric circuits', pattern: /\b(?:electric(?:ity|al)|circuit|voltage|current|resistance|ohm)\b/i },
  { subjects: ['Physics'], area: 'Waves', topic: 'Waves and sound', pattern: /\b(?:wave|sound|frequency|wavelength|amplitude)\b/i },
  { subjects: ['Chemistry'], area: 'Chemical reactions', topic: 'Balancing chemical equations', pattern: /\b(?:balanc(?:e|ing).{0,30}(?:chemical )?equation|chemical equation)\b/i },
  { subjects: ['Chemistry'], area: 'Chemical reactions', topic: 'Chemical reactions', pattern: /\b(?:reaction|reactants?|products?|stoichiometry|mole calculation)\b/i },
  { subjects: ['Chemistry'], area: 'Acids and bases', topic: 'Acids, bases and pH', pattern: /\b(?:acid|base|alkali|ph scale|neutralis)\b/i },
  { subjects: ['Chemistry'], area: 'Matter', topic: 'Atoms and the periodic table', pattern: /\b(?:atom|periodic table|element|electron|proton|neutron)\b/i },
  { subjects: ['Chemistry'], area: 'Chemical reactions', topic: 'Hydrogen and oxygen forming water', pattern: /\b(?:hydrogen|h2)\b.{0,80}\b(?:oxygen|o2)\b.{0,80}\b(?:water|h2o)\b|\b(?:hydrogen|h2)\b.{0,80}\b(?:water|h2o)\b.{0,80}\b(?:oxygen|o2)\b/i },
  { subjects: ['Geography'], area: 'Climate', topic: 'Rainfall and climate patterns', pattern: /\b(?:rainfall|precipitation|climate|weather pattern|climate graph)\b/i },
  { subjects: ['Geography'], area: 'Maps and spatial skills', topic: 'Maps and spatial patterns', pattern: /\b(?:map|mapping|latitude|longitude|scale|contour|spatial pattern)\b/i },
  { subjects: ['Geography'], area: 'Physical geography', topic: 'Plate tectonics and landforms', pattern: /\b(?:plate tectonics?|earthquake|volcano|landform|erosion)\b/i },
  { subjects: ['Geography'], area: 'Human geography', topic: 'Population and settlement', pattern: /\b(?:population|settlement|urbanisation|migration)\b/i },
  { subjects: ['History'], area: 'South African history', topic: 'Apartheid', pattern: /\bapartheid\b/i },
  { subjects: ['History'], area: 'Industrial history', topic: 'The Industrial Revolution', pattern: /\bindustrial revolution\b/i },
  { subjects: ['History'], area: 'Historical methods', topic: 'Historical timelines and chronology', pattern: /\b(?:timeline|chronolog|historical dates|causes and consequences)\b/i },
  { subjects: ['History'], area: 'Historical methods', topic: 'Historical evidence and context', pattern: /\b(?:primary source|historical evidence|historical context|source analysis)\b/i },
  { subjects: ['Accounting'], area: 'Financial accounting', topic: 'The accounting equation', pattern: /\b(?:accounting equation|assets?\s*[=+]|liabilit(?:y|ies)|equity)\b/i },
  { subjects: ['Accounting'], area: 'Financial statements', topic: 'Financial statements and calculations', pattern: /\b(?:income statement|balance sheet|cash flow|trial balance|debit|credit|ledger)\b/i },
  { subjects: ['Economics'], area: 'Markets', topic: 'Supply and demand', pattern: /\b(?:supply|demand|equilibrium|market price)\b/i },
  { subjects: ['Economics'], area: 'Macroeconomics', topic: 'Inflation and economic indicators', pattern: /\b(?:inflation|unemployment|gdp|economic growth|interest rate)\b/i },
  { subjects: ['Economics'], area: 'Economic reasoning', topic: 'Opportunity cost and scarcity', pattern: /\b(?:opportunity cost|scarcity|trade[- ]off)\b/i },
  { subjects: ['Business Studies'], area: 'Business management', topic: 'Business planning and management', pattern: /\b(?:business plan|management|entrepreneur|marketing mix|business studies)\b/i },
  { subjects: ['Computer Science', 'Information Technology'], area: 'Algorithms', topic: 'Algorithms and problem solving', pattern: /\b(?:algorithm|pseudocode|flowchart|sorting|search algorithm)\b/i },
  { subjects: ['Computer Science', 'Information Technology'], area: 'Programming', topic: 'Programming and code', pattern: /\b(?:programming|code|function|recursion|variable|loop|debug)\b/i },
  { subjects: ['Computer Science', 'Information Technology'], area: 'Web systems', topic: 'API request flow', pattern: /\b(?:api request|frontend.{0,30}backend|backend.{0,30}database)\b/i },
  { subjects: ['Computer Science', 'Information Technology'], area: 'Computer systems', topic: 'Computer systems and networks', pattern: /\b(?:computer system|network|database|operating system|cybersecurity)\b/i },
  { subjects: ['Engineering'], area: 'Engineering design', topic: 'Engineering systems and design', pattern: /\b(?:engineering design|circuit design|load|stress|mechanical system)\b/i },
  { subjects: ['Engineering', 'Technology', 'Physics'], area: 'Energy systems', topic: 'Solar photovoltaic energy conversion', pattern: /\b(?:solar photovoltaic|photovoltaic system|solar panel).{0,80}\b(?:electricity|energy|power|convert)\b|\b(?:electricity|energy|power|convert).{0,80}\b(?:solar photovoltaic|photovoltaic system|solar panel)\b/i },
  { subjects: ['Agricultural Sciences'], area: 'Agricultural science', topic: 'Crops, soil and farming systems', pattern: /\b(?:crop|soil|irrigation|livestock|farming|agricultur)\b/i },
  { subjects: ['Agricultural Sciences'], area: 'Plant growth', topic: 'Maize growth stages', pattern: /\bmaize\b.{0,50}\b(?:growth|stage|lifecycle|life cycle)\b|\b(?:growth|stage|lifecycle|life cycle)\b.{0,50}\bmaize\b/i },
  { subjects: ['Environmental Studies'], area: 'Environmental systems', topic: 'Climate and ecosystems', pattern: /\b(?:climate change|conservation|pollution|sustainability|ecosystem)\b/i },
  { subjects: ['English and Literature'], area: 'Reading and writing', topic: 'Literary analysis and communication', pattern: /\b(?:poem|poetry|novel|theme|character|metaphor|essay|grammar|literature)\b/i },
];

const TEACHING_METHODS = {
  Mathematics: ['define variables and relevant formulas', 'show calculations in small, ordered steps', 'verify the result by substitution or an independent check'],
  Biology: ['explain the biological process in sequence', 'define scientific terms as they arise', 'connect structure and function to a real example'],
  'Life Sciences': ['explain the biological process in sequence', 'define scientific terms as they arise', 'connect structure and function to a real example'],
  Physics: ['state the relevant physical law', 'show the equation, substitutions, units and calculations', 'check whether the result and units are physically reasonable'],
  Chemistry: ['identify reactants, products and relevant principles', 'show balanced equations and calculations clearly', 'include concise safety context when handling substances is discussed'],
  Geography: ['explain spatial patterns and place-specific context', 'distinguish sourced geographic facts from interpretation', 'use a map or climate graph only when accurate data or a reliable source is available'],
  History: ['establish the relevant chronology and historical context', 'distinguish evidence from interpretation', 'explain causes, events and consequences without inventing evidence'],
  Accounting: ['state the accounting rule or formula', 'show each calculation in a clear financial table where useful', 'check that totals and statement relationships balance'],
  Economics: ['define the economic concept and assumptions', 'explain market relationships and cause/effect', 'use a graph only when its axes and values are supported by the question or a source'],
  'Computer Science': ['explain the logic before implementation details', 'use a small, relevant code example or stepwise trace when helpful', 'mention complexity or edge cases only when relevant'],
  'Information Technology': ['explain the system or workflow in practical steps', 'use a small, relevant technical example when helpful', 'identify security or reliability implications when relevant'],
  Engineering: ['state assumptions, constraints and governing principles', 'show calculations with consistent units', 'label a system diagram when it clarifies the design'],
  'Agricultural Sciences': ['explain the biological or environmental process', 'use practical farming examples suited to the question', 'separate established guidance from local conditions that need checking'],
  'Environmental Studies': ['explain the system and interactions involved', 'distinguish measured evidence from projections', 'avoid unsupported numerical claims'],
  Statistics: ['identify the data, variables and statistical method', 'show calculations and explain what the result means', 'state assumptions and avoid claims beyond the sample'],
  'English and Literature': ['interpret the passage or task directly', 'support literary claims with the supplied text or clearly identified evidence', 'explain language choices and their effect'],
  Languages: ['identify the language feature or communication goal', 'use accurate examples and translations', 'explain patterns and exceptions clearly'],
  Technology: ['explain how the system or product works', 'show a labeled process or component flow when useful', 'distinguish general principles from design-specific details'],
  'Health Sciences': ['use accurate anatomical and physiological terms', 'explain structures and processes in a clear sequence', 'avoid diagnosing individuals or overstating medical evidence'],
  'Natural Sciences': ['identify the relevant scientific idea', 'explain the process in simple ordered steps', 'connect the explanation to an observable example'],
  Other: ['identify the core idea and explain it in clear steps', 'use a relevant example without inventing facts', 'check that the conclusion follows from the information given'],
};

function inferLevel(text) {
  if (/\b(?:university|undergraduate|postgraduate|tertiary|degree level)\b/i.test(text)) return 'university';
  if (/\b(?:advanced|expert|graduate level|prove rigorously)\b/i.test(text)) return 'advanced';
  if (/\b(?:intermediate|grade\s?(?:9|10|11|12)|year\s?(?:10|11|12))\b/i.test(text)) return 'intermediate';
  return 'beginner';
}

function inferTopic(text, subject) {
  const topic = TOPICS.find((item) => item.subjects.includes(subject) && item.pattern.test(text));
  if (topic) return { area: topic.area, topic: topic.topic };

  const explicitTopic = text
    .replace(/^(?:please\s+)?(?:can you\s+|could you\s+|would you\s+)?(?:explain|teach me|help me understand|show me|calculate|solve|what is|how does|how do)\s+/i, '')
    .replace(/[?!]+$/g, '')
    .trim();
  return {
    area: subject === 'Other' ? 'General study' : 'General concepts',
    topic: explicitTopic.slice(0, 100) || 'General concepts',
  };
}

export function detectSubjectAndTopic(question, context = '') {
  const questionText = String(question || '');
  const contextText = String(context || '').slice(-4000);
  const questionSubject = SUBJECTS.find((subject) => subject.pattern.test(questionText));
  const questionTopic = TOPICS.find((topic) => topic.pattern.test(questionText));
  const contextSubject = SUBJECTS.find((subject) => subject.pattern.test(contextText));
  const contextTopic = TOPICS.find((topic) => topic.pattern.test(contextText));
  const subject = questionSubject?.name ||
    questionTopic?.subjects[0] ||
    contextSubject?.name ||
    contextTopic?.subjects[0] ||
    'Other';
  const matchedTopic = questionTopic ||
    (contextTopic?.subjects.includes(subject) ? contextTopic : null);
  const topic = matchedTopic
    ? { area: matchedTopic.area, topic: matchedTopic.topic }
    : inferTopic(questionText || contextText, subject);
  return {
    subject,
    area: topic.area,
    topic: topic.topic,
    confidence: questionSubject
      ? 'explicit'
      : questionTopic || contextSubject || contextTopic
        ? 'inferred'
        : 'unknown',
  };
}

export function understandLearningQuestion(question, options = {}) {
  const text = String(question || '').trim();
  const lower = text.toLowerCase();
  return {
    level: inferLevel(`${text}\n${options.context || ''}`),
    struggling: /\b(?:i don't understand|i do not understand|i'm confused|im confused|i am confused|struggling|lost|stuck|explain more simply|simpler please|break it down)\b/i.test(lower),
    questionType: /\b(?:calculate|solve|work out|find the value|evaluate)\b/i.test(lower)
      ? 'calculation'
      : /\b(?:compare|difference between|versus|vs\.?)\b/i.test(lower)
        ? 'comparison'
        : /\b(?:why|how does|how do|explain|what happens)\b/i.test(lower)
          ? 'explanation'
          : 'general',
    hasImage: Boolean(options.hasImage),
  };
}

export function selectTeachingMethod(subject) {
  return TEACHING_METHODS[subject] || TEACHING_METHODS.Other;
}

export function createNewtonSecondLawDiagram(question) {
  const text = String(question || '');
  if (!/\b(?:force|newton'?s second law)\b/i.test(text)) return null;

  const massMatches = [...text.matchAll(/\b([0-9][0-9,]*(?:\.\d+)?)\s*(?:kg|kilograms?)\b/gi)];
  const accelerationMatches = [...text.matchAll(/\b([0-9][0-9,]*(?:\.\d+)?)\s*(?:m\s*\/\s*s\s*(?:\^\s*2|²|2)|m\s*s\s*(?:\^\s*-2|⁻²|-2))(?=$|[\s,.;!?])/gi)];
  if (massMatches.length !== 1 || accelerationMatches.length !== 1) return null;

  const mass = Number(massMatches[0][1].replace(/,/g, ''));
  const acceleration = Number(accelerationMatches[0][1].replace(/,/g, ''));
  if (!Number.isFinite(mass) || !Number.isFinite(acceleration) || mass <= 0 || acceleration <= 0) return null;

  const directionMatch = text.match(/\b(?:to|toward|towards)\s+(?:the\s+)?(left|right)\b|\baccelerates?\s+(left|right)\b/i);
  const force = mass * acceleration;
  if (!Number.isFinite(force)) return null;

  return {
    mass,
    acceleration,
    force,
    direction: (directionMatch?.[1] || directionMatch?.[2])?.toLowerCase() === 'left' ? 'left' : 'right',
    directionSpecified: Boolean(directionMatch),
  };
}

export function createHydrogenWaterReactionDiagram(question) {
  const text = String(question || '');
  const hasHydrogen = /\b(?:hydrogen|h2)\b/i.test(text);
  const hasOxygen = /\b(?:oxygen|o2)\b/i.test(text);
  const hasWater = /\b(?:water|h2o)\b/i.test(text);
  const asksAboutEquation = /\b(?:balance|balancing|balanced|equation|reaction|form)\b/i.test(text);
  return hasHydrogen && hasOxygen && hasWater && asksAboutEquation;
}

export function createQuadraticStationaryPointDiagram(question) {
  const match = String(question || '').match(/\bf\s*\([^)]*\)\s*=\s*([^\n?]+)/i);
  if (!match) return null;

  const expression = match[1]
    .replace(/[−–]/g, '-')
    .replace(/²/g, '^2')
    .replace(/[.!]+$/g, '')
    .replace(/\s+/g, '');
  const terms = expression.match(/[+-]?[^+-]+/g);
  if (!terms?.length) return null;

  let xSquared = 0;
  let ySquared = 0;
  let xLinear = 0;
  let yLinear = 0;
  let constant = 0;
  const readCoefficient = (sign, coefficient) =>
    (sign === '-' ? -1 : 1) * (coefficient ? Number(coefficient) : 1);
  for (const term of terms) {
    let parsed = term.match(/^([+-]?)(?:(\d+(?:\.\d+)?)\*?)?x\^2$/i);
    if (parsed) {
      xSquared += readCoefficient(parsed[1], parsed[2]);
      continue;
    }
    parsed = term.match(/^([+-]?)(?:(\d+(?:\.\d+)?)\*?)?y\^2$/i);
    if (parsed) {
      ySquared += readCoefficient(parsed[1], parsed[2]);
      continue;
    }
    parsed = term.match(/^([+-]?)(?:(\d+(?:\.\d+)?)\*?)?x$/i);
    if (parsed) {
      xLinear += readCoefficient(parsed[1], parsed[2]);
      continue;
    }
    parsed = term.match(/^([+-]?)(?:(\d+(?:\.\d+)?)\*?)?y$/i);
    if (parsed) {
      yLinear += readCoefficient(parsed[1], parsed[2]);
      continue;
    }
    if (/^[+-]?\d+(?:\.\d+)?$/.test(term)) {
      constant += Number(term);
      continue;
    }
    return null;
  }

  if (!Number.isFinite(xSquared) || xSquared === 0 || xSquared !== ySquared ||
    !Number.isFinite(xLinear) || !Number.isFinite(yLinear) || !Number.isFinite(constant)) return null;
  const centerX = -xLinear / (2 * xSquared);
  const centerY = -yLinear / (2 * ySquared);
  const stationaryValue = xSquared * centerX ** 2 + ySquared * centerY ** 2 +
    xLinear * centerX + yLinear * centerY + constant;
  if (![centerX, centerY, stationaryValue].every(Number.isFinite)) return null;

  return parseWorkspaceVisualization('diagram', JSON.stringify({
    type: 'contour',
    title: 'Quadratic function contour',
    xLabel: 'x',
    yLabel: 'y',
    centerX,
    centerY,
    stationaryValue,
    curvature: xSquared,
    radii: [1, 2, 3],
  }));
}

export function selectLearningVisual(profile, question = '') {
  const text = String(question || '').toLowerCase();
  if (profile.subject === 'Physics' && createNewtonSecondLawDiagram(question)) return 'force-diagram';
  if (/\bstationary points?\b/i.test(question) && createQuadraticStationaryPointDiagram(question)) return 'contour';
  if (/\b(?:map|atlas|where is|geographic location)\b/.test(text)) return 'map';
  if (/\b(?:timeline|chronology|historical dates)\b/.test(text)) return 'timeline';
  if (/\b(?:graph|plot|curve)\b/.test(text)) return 'graph';
  if (/\b(?:chart|data visualization)\b/.test(text)) return 'chart';
  if (/\b(?:table|compare in columns)\b/.test(text)) return 'table';
  if (/\b(?:diagram|draw|label|illustration|show how)\b/.test(text)) return 'diagram';
  if (/\b(?:flowchart|algorithm)\b/.test(text)) return 'flowchart';
  if (profile.hasImage) return 'image-analysis';

  if (profile.subject === 'Economics' && /\b(?:supply|demand|equilibrium)\b/i.test(profile.topic)) return 'graph';
  if (profile.subject === 'Accounting' && /\b(?:financial statements|accounting equation)\b/i.test(profile.topic)) return 'table';
  if (profile.subject === 'History' && /\b(?:industrial revolution|apartheid|war|revolution|independence|timeline)\b/i.test(profile.topic)) return 'timeline';
  if (['Biology', 'Life Sciences', 'Health Sciences'].includes(profile.subject) &&
      /\b(?:circulatory|cell|process|cycle|mitosis|photosynthesis|system)\b/i.test(profile.topic)) return 'diagram';
  if (['Agricultural Sciences', 'Technology', 'Engineering'].includes(profile.subject) &&
      /\b(?:maize|crop|solar|photovoltaic|system|process)\b/i.test(profile.topic)) return 'diagram';
  if (['Biology', 'Life Sciences', 'Natural Sciences'].includes(profile.subject) &&
      /\b(?:process|cycle|mitosis|photosynthesis|cell|system)\b/i.test(profile.topic)) return 'diagram';
  if (profile.subject === 'History' && /\b(?:apartheid|war|revolution|independence|timeline)\b/i.test(profile.topic)) return 'timeline';
  if (profile.subject === 'Computer Science' || profile.subject === 'Information Technology') return 'code-diagram';
  if (profile.questionType === 'calculation' &&
      ['Mathematics', 'Physics', 'Chemistry', 'Accounting', 'Statistics'].includes(profile.subject)) return 'table';
  return 'none';
}

export function createLearningContext(question, options = {}) {
  const understanding = understandLearningQuestion(question, options);
  const detected = detectSubjectAndTopic(question, options.context);
  const profile = { ...detected, ...understanding };
  return {
    ...profile,
    teachingMethods: selectTeachingMethod(profile.subject),
    visual: selectLearningVisual(profile, question),
  };
}

export function buildLearningInstruction(profile) {
  const learningLevel = {
    beginner: 'Use plain language and explain unfamiliar terms. Do not talk down to the learner.',
    intermediate: 'Assume basic familiarity, explain important reasoning, and show useful links between ideas.',
    advanced: 'Keep technical depth, state assumptions and caveats, and do not replace rigorous reasoning with a simplified analogy.',
    university: 'Use appropriate university-level precision, terminology and evidence; define only terms needed for clarity.',
  }[profile.level] || 'Default to a clear, beginner-friendly explanation.';
  const visualGuidance = profile.visual === 'map'
    ? 'A map is appropriate only if a trustworthy, relevant map source is available; never draw or label an unverified map.'
    : profile.visual === 'contour'
      ? 'A validated FaceMeX contour SVG is generated for supported separable quadratic functions from the exact coefficients. For other multivariable functions, calculate and classify stationary points rigorously and do not invent a contour plot.'
    : profile.visual === 'graph' || profile.visual === 'chart'
      ? 'When the question supplies values or a reliable source is available, render an actual validated chart JSON block. For a mathematical function, use chart type "scatter" with increasing numeric x/y coordinates calculated from the exact function. For conceptual supply-and-demand curves, use chart type "multi-line", numeric quantity/price points and two labeled series; set "illustrative": true and identify the graph as illustrative in its title unless points are sourced. Never invent real climate, population, or economic observations; if reliable data is unavailable, state that and explain in text instead of drawing a factual-looking graph.'
      : profile.visual === 'timeline'
        ? 'Render a concise validated timeline diagram when the event sequence and dates are well established or supplied. Otherwise use a table and clearly qualify uncertain dates; never invent historical evidence.'
        : profile.visual === 'diagram' || profile.visual === 'flowchart' || profile.visual === 'code-diagram'
          ? 'When a relevant process or request path is known, render it as a validated diagram JSON block of type "flow" with 2–8 short, ordered steps. Use accurate labels and direction; do not substitute ASCII art or say a diagram is shown when none is rendered. Use a table or text if relationships are not linear or are uncertain.'
          : profile.visual === 'table'
            ? 'Use a compact table only when it clarifies the actual calculations or comparisons.'
            : 'Do not add a visual merely for decoration. Use text when it is clearer or safer.';
  const imageGuidance = profile.hasImage
    ? 'Inspect the attached image itself. Describe what is visible, separate observation from inference, and ask about any unclear handwriting or labels rather than guessing.'
    : '';
  const forceDiagramGuidance = profile.visual === 'force-diagram'
    ? 'A validated FaceMeX Newton second-law diagram is generated from the exact mass and acceleration in the question. State F = ma, show the substitution and result in newtons, and keep the arrow aligned with the stated acceleration direction; do not introduce other forces.'
    : '';
  const chemistryGuidance = profile.subject === 'Chemistry'
    ? 'For chemical equations, count each element on both sides and balance with coefficients, never by changing subscripts. Use a diagram only when the represented molecules follow the balanced equation.'
    : '';
  const subjectVisualGuidance = ['Biology', 'Life Sciences', 'Natural Sciences'].includes(profile.subject) &&
        profile.visual === 'diagram'
      ? 'For a biological process such as photosynthesis, use a concise validated flow diagram for the sequence only when the facts are well established; label inputs and outputs correctly. Do not claim a schematic is a realistic cell illustration.'
      : '';

  return [
    'FaceMeX unified learning guidance:',
    `- Independently verify the subject and topic from the question${profile.confidence === 'explicit' ? ` (subject hint: ${profile.subject}; topic hint: ${profile.topic})` : ''}; do not force the learner to choose a subject.`,
    `- Adapt for ${profile.level} level. ${learningLevel}`,
    '- Answer a clear, solvable question immediately. Never require a grade, level, or previous attempt before helping. Ask one focused question only if essential information is missing or unreadable.',
    profile.struggling ? '- The learner appears stuck: use smaller steps, check one concept at a time, and avoid skipping algebra or reasoning.' : '',
    `- Teaching approach: ${profile.teachingMethods.join('; ')}.`,
    `- Visual selection: ${visualGuidance}`,
    forceDiagramGuidance,
    chemistryGuidance,
    subjectVisualGuidance,
    imageGuidance ? `- Image understanding: ${imageGuidance}` : '',
    '- Do not request or display decorative stock photos for educational questions. Prefer a relevant validated SVG or a factual chart; never invent map features, measurements, or historical data. If reliable visual data is unavailable, explain in text and label any explicitly hypothetical illustration.',
    '- Start with a direct explanation. Include only relevant sections such as steps, example, final answer, verification or a short practice question; do not force a fixed template.',
    '- Preserve the exact question, values, units and constraints. State uncertainty, do not invent facts or data, and keep the student-facing answer free of internal prompts and processing details.',
    '- Use the existing FaceMeX Markdown, LaTeX, chart, diagram, table and practice formats. Never emit [[VISUAL_REFERENCE]], [INSERT IMAGE], [DIAGRAM HERE], placeholder text, or a description pretending a visual was rendered. If a visual is unsupported, fails validation, or lacks trustworthy data, provide the complete explanation as text without an empty visual block.',
  ].filter(Boolean).join('\n');
}

export function validateLearningResponse(answer) {
  if (typeof answer !== 'string' || !answer.trim()) {
    return { valid: false, answer: '', issues: ['empty-response'] };
  }

  const issues = [];
  let validatedAnswer = answer.trim().replace(/```(chart|diagram|practice)\s*\n([\s\S]*?)```/gi, (block, kind, body) => {
    const type = kind.toLowerCase();
    const valid = type === 'practice'
      ? parseWorkspacePractice(body.trim())
      : parseWorkspaceVisualization(type, body.trim());
    if (valid) return block;
    issues.push(`invalid-${type}`);
    return '';
  }).trim();

  if (!validatedAnswer) {
    issues.push('no-renderable-content');
    return { valid: false, answer: '', issues };
  }
  return { valid: true, answer: validatedAnswer, issues };
}
