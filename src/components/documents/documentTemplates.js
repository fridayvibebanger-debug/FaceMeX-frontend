const templates = [
  {
    id: 'cv-creative-lime',
    name: 'Creative CV · Lime Accent',
    description: 'Portrait-ready profile, bold name, skills column, experience and education timeline.',
    category: 'CV & Career',
    documentType: 'cv',
    style: 'modern',
    variant: 'creative',
    content: `# [[fullName]]
## [[jobTitle]]
[[email]] · [[phone]] · [[location]]

[[summary]]

| SKILLS & EXPERTISE | EXPERIENCE |
| --- | --- |
| [[skills]] | [[experience]] |

## EDUCATION
[[education]]

## PROJECTS & ACHIEVEMENTS
[[extras]]`,
  },
  {
    id: 'cv-minimal-professional',
    name: 'Minimal Professional CV',
    description: 'Quiet typography and clear sections designed for quick scanning and ATS readability.',
    category: 'CV & Career',
    documentType: 'cv',
    style: 'minimal',
    variant: 'minimal',
    content: `# [[fullName]]
## [[jobTitle]]
[[email]] · [[phone]] · [[location]]

## PROFESSIONAL SUMMARY
[[summary]]

## EXPERIENCE
[[experience]]

## SKILLS
[[skills]]

## EDUCATION & QUALIFICATIONS
[[education]]

## PROJECTS & ADDITIONAL INFORMATION
[[extras]]`,
  },
  {
    id: 'cv-two-column',
    name: 'Modern Two-Column CV',
    description: 'A compact sidebar for contact and skills beside a structured experience timeline.',
    category: 'CV & Career',
    documentType: 'cv',
    style: 'executive',
    variant: 'sidebar',
    content: `# [[fullName]]
## [[jobTitle]]

| CONTACT & SKILLS | PROFESSIONAL EXPERIENCE |
| --- | --- |
| [[email]] · [[phone]] · [[location]] — [[skills]] | [[experience]] |

## PROFILE
[[summary]]

## EDUCATION
[[education]]

## SELECTED PROJECTS
[[extras]]`,
  },
  {
    id: 'cv-corporate',
    name: 'Corporate CV',
    description: 'A formal, balanced structure for professional applications and established industries.',
    category: 'CV & Career',
    documentType: 'cv',
    style: 'classic',
    variant: 'corporate',
    content: `## PERSONAL INFORMATION
Identity number: [[idNumber]]

## EDUCATIONAL QUALIFICATIONS
[[education]]

## PROFESSIONAL TITLE
[[jobTitle]]

## PROFESSIONAL SUMMARY
[[summary]]

## EXPERIENCE
[[experience]]

## SKILLS
[[skills]]

## ADDITIONAL INFORMATION
[[extras]]`,
  },
  {
    id: 'portfolio-casebook',
    name: 'Portfolio Casebook',
    description: 'An overview, selected case studies, tools and a clear contact section.',
    category: 'CV & Career',
    documentType: 'portfolio',
    style: 'minimal',
    variant: 'minimal',
    content: `# [[fullName]]
## SELECTED WORK · [[jobTitle]]
[[email]] · [[location]]

## ABOUT
[[summary]]

## CASE STUDY 01
[[experience]]

## SKILLS & TOOLS
[[skills]]

## EDUCATION
[[education]]

## CONTACT & LINKS
[[extras]]`,
  },
  {
    id: 'professional-bio',
    name: 'Professional Biography',
    description: 'A concise introduction, background, areas of expertise and selected work.',
    category: 'CV & Career',
    documentType: 'bio',
    style: 'classic',
    variant: 'corporate',
    content: `# [[fullName]]
## [[jobTitle]]

## BIOGRAPHY
[[summary]]

## BACKGROUND
[[education]]

## AREAS OF EXPERTISE
[[skills]]

## SELECTED EXPERIENCE
[[experience]]

## ADDITIONAL DETAILS
[[extras]]`,
  },
  {
    id: 'linkedin-profile',
    name: 'LinkedIn Profile Kit',
    description: 'Editable headline, about section, experience, skills and education prompts.',
    category: 'CV & Career',
    documentType: 'linkedin-profile',
    style: 'modern',
    variant: 'corporate',
    content: `# [[fullName]]
## LINKEDIN PROFILE

## HEADLINE
[[jobTitle]]

## ABOUT
[[summary]]

## EXPERIENCE
[[experience]]

## SKILLS
[[skills]]

## EDUCATION
[[education]]

## CONTACT & LINKS
[[extras]]`,
  },
  {
    id: 'portfolio-website',
    name: 'Portfolio Website Content',
    description: 'A page-ready hero, about section, services, work samples and contact prompts.',
    category: 'CV & Career',
    documentType: 'portfolio-website',
    style: 'modern',
    variant: 'creative',
    content: `# [[fullName]]
## [[jobTitle]]

## HERO
[[summary]]

## ABOUT
[[experience]]

## SERVICES & EXPERTISE
[[skills]]

## SELECTED WORK
[[education]]

## CONTACT
[[extras]]`,
  },
  {
    id: 'letter-sidebar',
    name: 'Two-Column Cover Letter',
    description: 'A personal-details sidebar paired with a clean, readable letter layout.',
    category: 'CV & Career',
    documentType: 'cover-letter',
    style: 'executive',
    variant: 'letter',
    content: `# [[fullName]]
## [[jobTitle]]

| PERSONAL DETAILS | APPLICATION LETTER |
| --- | --- |
| [[email]] · [[phone]] · [[location]] | [[company]] · [[jobTitle]] |
| [Add a professional profile link, if relevant] | Dear Hiring Manager, |
| [Add any relevant reference details] | [[summary]] |
| [Replace with verified contact details] | [[extras]] |
|  | Thank you for your consideration. |
|  | Sincerely, [[fullName]] |`,
  },
  {
    id: 'letter-corporate',
    name: 'Corporate Cover Letter',
    description: 'A traditional letter format with a clear recipient, opening, evidence and close.',
    category: 'Letters',
    documentType: 'cover-letter',
    style: 'classic',
    variant: 'corporate',
    content: `# [[fullName]]
[[email]] · [[phone]] · [[location]]

[[company]]
[[jobTitle]]

Dear Hiring Manager,

## WHY I AM WRITING
[[summary]]

## RELEVANT EXPERIENCE
[[experience]]

## WHY THIS ROLE
[[extras]]

Thank you for your time and consideration. I would welcome the opportunity to discuss my application.

Sincerely,
[[fullName]]`,
  },
  {
    id: 'proposal-business',
    name: 'Business Proposal',
    description: 'Executive summary, objectives, scope, timeline, cost and notes.',
    category: 'Business',
    documentType: 'proposal',
    style: 'modern',
    variant: 'proposal',
    content: `# [[company]]
## BUSINESS PROPOSAL
Prepared by [[fullName]] · [[email]]

## EXECUTIVE SUMMARY
[[summary]]

| OBJECTIVES | SCOPE OF WORK |
| --- | --- |
| [[skills]] | [[experience]] |

## TIMELINE & DELIVERABLES
[[education]]

## PROJECT COST
[[extras]]

## ASSUMPTIONS & NEXT STEPS
[Add verified terms, dependencies and the decision required.]`,
  },
  {
    id: 'proposal-corporate',
    name: 'Corporate Project Proposal',
    description: 'Project details, methodology, investment, timeline and next steps.',
    category: 'Business',
    documentType: 'proposal',
    style: 'executive',
    variant: 'corporate',
    content: `# [[company]]
## PROJECT PROPOSAL
Prepared by [[fullName]] · [[location]]

## PROJECT DETAILS
[[summary]]

| SCOPE & DELIVERABLES | INVESTMENT & TIMELINE |
| --- | --- |
| [[experience]] | [[education]] |

## METHODOLOGY
[[skills]]

## NEXT STEPS & TERMS
[[extras]]`,
  },
  {
    id: 'proposal-startup',
    name: 'Startup Proposal',
    description: 'Market opportunity, solution, revenue model, growth strategy and targets.',
    category: 'Business',
    documentType: 'business-plan',
    style: 'modern',
    variant: 'startup',
    content: `# [[company]]
## STARTUP PROPOSAL
[[jobTitle]]

## OPPORTUNITY
[[summary]]

## SOLUTION
[[experience]]

## REVENUE STRUCTURE
[[skills]]

## GROWTH STRATEGY
[[education]]

## BUSINESS TARGETS
[[extras]]

## ASSUMPTIONS TO VALIDATE
[List evidence and assumptions separately; do not present estimates as actual results.]`,
  },
  {
    id: 'proposal-budget',
    name: 'Project Proposal · Budget Focus',
    description: 'Blue-accented proposal with objectives, delivery phases and an editable budget table.',
    category: 'Business',
    documentType: 'proposal',
    style: 'classic',
    variant: 'proposal',
    content: `# [[company]]
## PROJECT PROPOSAL
[[jobTitle]]

## EXECUTIVE SUMMARY
[[summary]]

## OBJECTIVES & SCOPE
[[experience]]

## DELIVERY PLAN
[[education]]

## PROJECT BUDGET
| ITEM | BASIS / NOTES | AMOUNT |
| --- | --- | --- |
| [Add an agreed cost item] | [Add verified details] | [Add amount] |

## RISKS & NEXT STEPS
[[extras]]`,
  },
  {
    id: 'presentation-corporate',
    name: 'Blue & White Corporate Deck',
    description: 'Editable, slide-by-slide business presentation with clear section hierarchy.',
    category: 'Presentations',
    documentType: 'presentation',
    style: 'classic',
    variant: 'corporate',
    content: `# [[fullName]]
## [[jobTitle]]

## SLIDE 01 — OVERVIEW
[[summary]]

## SLIDE 02 — CONTEXT
[[experience]]

## SLIDE 03 — KEY POINTS
[[skills]]

## SLIDE 04 — PLAN
[[education]]

## SLIDE 05 — NEXT STEPS
[[extras]]`,
  },
  {
    id: 'presentation-pitch',
    name: 'Modern Pitch Deck',
    description: 'Cover, problem, solution, market, business model, competition, marketing and roadmap.',
    category: 'Presentations',
    documentType: 'presentation',
    style: 'executive',
    variant: 'pitch',
    content: `# [[company]]
## PITCH DECK · [[jobTitle]]

## SLIDE 01 — THE OPPORTUNITY
[[summary]]

## SLIDE 02 — THE PROBLEM
[[experience]]

## SLIDE 03 — THE SOLUTION
[[skills]]

## SLIDE 04 — MARKET OPPORTUNITY
[Add sourced market data and identify the source.]

## SLIDE 05 — BUSINESS MODEL
[Describe actual or proposed revenue streams and assumptions.]

## SLIDE 06 — COMPETITIVE LANDSCAPE
[Name alternatives and compare using verified information.]

## SLIDE 07 — MARKETING STRATEGY
[Describe audience, channels and experiments.]

## SLIDE 08 — ROADMAP
[[education]]

## SLIDE 09 — NEXT STEPS
[[extras]]`,
  },
  {
    id: 'presentation-cybersecurity',
    name: 'Technology & Cybersecurity',
    description: 'Technology briefing with editable threat, control, impact and action sections.',
    category: 'Presentations',
    documentType: 'presentation',
    style: 'modern',
    variant: 'technology',
    content: `# [[fullName]]
## TECHNOLOGY BRIEFING · [[jobTitle]]

## SLIDE 01 — BRIEFING
[[summary]]

## SLIDE 02 — CURRENT CONTEXT
[[experience]]

## SLIDE 03 — THREATS & EXPOSURE
[Use confirmed findings only. Mark unverified items as questions.]

## SLIDE 04 — CONTROLS & RESPONSE
[[skills]]

## SLIDE 05 — IMPLEMENTATION PLAN
[[education]]

## SLIDE 06 — DECISIONS & NEXT STEPS
[[extras]]`,
  },
  {
    id: 'presentation-clinical',
    name: 'Medical & Clinical Case',
    description: 'Case overview, history, assessment, evidence table and discussion placeholders.',
    category: 'Presentations',
    documentType: 'presentation',
    style: 'classic',
    variant: 'clinical',
    content: `# [[fullName]]
## CLINICAL CASE PRESENTATION

## SLIDE 01 — CASE OVERVIEW
[[summary]]

## SLIDE 02 — HISTORY & CONTEXT
[[experience]]

## SLIDE 03 — ASSESSMENT
[[skills]]

## SLIDE 04 — FINDINGS
| MEASURE / FINDING | OBSERVATION | SOURCE / DATE |
| --- | --- | --- |
| [Enter a verified finding] | [Enter the observed value] | [Record source] |

## SLIDE 05 — DISCUSSION
[Discuss evidence and uncertainty. Do not include identifiable patient information.]

## SLIDE 06 — PLAN & LEARNING POINTS
[[education]]

## SLIDE 07 — REFERENCES
[[extras]]`,
  },
  {
    id: 'presentation-business',
    name: 'General Business Presentation',
    description: 'Reusable slides for objectives, findings, options, a data table and decision.',
    category: 'Presentations',
    documentType: 'presentation',
    style: 'minimal',
    variant: 'corporate',
    content: `# [[fullName]]
## [[jobTitle]]

## SLIDE 01 — PURPOSE
[[summary]]

## SLIDE 02 — BACKGROUND
[[experience]]

## SLIDE 03 — FINDINGS
[[skills]]

## SLIDE 04 — DATA
| CATEGORY | VALUE | SOURCE / NOTES |
| --- | --- | --- |
| [Enter category] | [Enter verified value] | [Enter source] |

## SLIDE 05 — OPTIONS & RECOMMENDATION
[[education]]

## SLIDE 06 — ACTIONS
[[extras]]`,
  },
  {
    id: 'report-professional',
    name: 'Professional Report',
    description: 'Executive summary, method, evidence, analysis, recommendations and references.',
    category: 'Reports & Planning',
    documentType: 'report',
    style: 'minimal',
    variant: 'report',
    content: `# [[fullName]]
## [[jobTitle]]

## EXECUTIVE SUMMARY
[[summary]]

## BACKGROUND & OBJECTIVES
[[experience]]

## METHOD & SOURCES
[[education]]

## FINDINGS
[[skills]]

## ANALYSIS & LIMITATIONS
[Separate evidence from interpretation and record limitations.]

## RECOMMENDATIONS
[[extras]]

## REFERENCES
[Add source titles, authors and dates.]`,
  },
  {
    id: 'project-plan',
    name: 'Project Plan',
    description: 'Objectives, deliverables, owners, dependencies, milestones, risks and decisions.',
    category: 'Reports & Planning',
    documentType: 'business-plan',
    style: 'modern',
    variant: 'plan',
    content: `# [[company]]
## PROJECT PLAN · [[jobTitle]]

## PURPOSE & OUTCOMES
[[summary]]

## SCOPE & DELIVERABLES
[[experience]]

## WORKSTREAMS & OWNERS
[[skills]]

## MILESTONES
| MILESTONE | OWNER | TARGET DATE | STATUS |
| --- | --- | --- | --- |
| [Add milestone] | [Add owner] | [Add agreed date] | [Not started] |

## RISKS & DEPENDENCIES
[[education]]

## DECISIONS & NEXT STEPS
[[extras]]`,
  },
  {
    id: 'meeting-report',
    name: 'Meeting Report',
    description: 'Meeting purpose, attendees, decisions and an actionable owner/date table.',
    category: 'Reports & Planning',
    documentType: 'meeting-notes',
    style: 'classic',
    variant: 'report',
    content: `# [[fullName]]
## MEETING REPORT
[[company]]

## PURPOSE & AGENDA
[[summary]]

## ATTENDEES
[[extras]]

## DISCUSSION
[[experience]]

## DECISIONS
[[skills]]

## ACTION ITEMS
| ACTION | OWNER | DUE DATE | STATUS |
| --- | --- | --- | --- |
| [Add agreed action] | [Add owner] | [Add date] | [Open] |

## NEXT MEETING
[[education]]`,
  },
  {
    id: 'academic-document',
    name: 'Academic Document',
    description: 'Structured academic writing with research question, method, discussion and references.',
    category: 'Reports & Planning',
    documentType: 'report',
    style: 'classic',
    variant: 'academic',
    content: `# [[fullName]]
## [[jobTitle]]

## ABSTRACT
[[summary]]

## INTRODUCTION & RESEARCH QUESTION
[[experience]]

## METHOD
[[education]]

## RESULTS / EVIDENCE
[[skills]]

## DISCUSSION & LIMITATIONS
[Interpret the evidence and state limitations clearly.]

## CONCLUSION
[[extras]]

## REFERENCES
[Add complete, verifiable citations in the required style.]`,
  },
  {
    id: 'project-timeline',
    name: 'Project Timeline',
    description: 'Editable milestones, phases, owners and dependencies in a clear table.',
    category: 'Reports & Planning',
    documentType: 'business-plan',
    style: 'minimal',
    variant: 'timeline',
    content: `# [[company]]
## PROJECT TIMELINE · [[jobTitle]]

## GOAL
[[summary]]

## MILESTONES
| PHASE / MILESTONE | START | END | OWNER | DEPENDENCY |
| --- | --- | --- | --- | --- |
| [Add phase] | [Add date] | [Add date] | [Add owner] | [Add dependency] |

## DELIVERY NOTES
[[experience]]

## RISKS & ASSUMPTIONS
[[skills]]

## NEXT CHECKPOINT
[[education]]

## NOTES
[[extras]]`,
  },
  {
    id: 'professional-letter',
    name: 'Professional Letter',
    description: 'Simple formal correspondence with editable sender, recipient and message sections.',
    category: 'Letters',
    documentType: 'cover-letter',
    style: 'minimal',
    variant: 'letter',
    content: `# [[fullName]]
[[email]] · [[phone]] · [[location]]

[[company]]
[[jobTitle]]

Dear [Recipient],

[[summary]]

[[experience]]

[[extras]]

Sincerely,
[[fullName]]`,
  },
];

export function listDocumentTemplates(kind) {
  return kind ? templates.filter((template) => template.documentType === kind) : templates;
}

export function getDocumentTemplate(id) {
  return templates.find((template) => template.id === id);
}

export function buildDocumentTemplateContent(template, details) {
  return template.content.replace(/\[\[([a-zA-Z]+)\]\]/g, (placeholder, key) => {
    const value = details[key]?.trim();
    if (value) return value;
    const labels = {
      fullName: 'Your name',
      email: '[Add your email]',
      phone: '[Add your phone]',
      location: '[Add your location]',
      jobTitle: '[Add your role or purpose]',
      company: '[Add a business or recipient]',
      summary: '[Add details based on your real information]',
      experience: '[Add relevant experience or project details]',
      skills: '[Add skills or objectives you can support]',
      education: '[Add education, milestones or timeline details]',
      extras: '[Add other verified information or next steps]',
    };
    return labels[key] || `[Add ${key}]`;
  });
}

export function buildClassicCvTemplateContent(details) {
  const value = (key) => String(details?.[key] || '').trim();
  const idNumber = value('idNumber');
  const escapeCell = (text) => text.replace(/\|/g, '\\|');
  const detailsTable = (rows) => [
    '| FIELD | : | VALUE |',
    '| --- | --- | --- |',
    ...rows.map(([label, detail]) => `| ${escapeCell(label)} | : | ${escapeCell(detail)} |`),
  ].join('\n');
  const educationEntries = value('education')
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const sections = [
    ['PERSONAL INFORMATION', idNumber ? detailsTable([['Identity number', idNumber]]) : ''],
    ['EDUCATIONAL QUALIFICATIONS', educationEntries.length
      ? detailsTable(educationEntries.map((entry, index) => [index === 0 ? 'Education' : '', entry]))
      : ''],
    ['PROFESSIONAL TITLE', value('jobTitle')],
    ['PROFESSIONAL SUMMARY', value('summary')],
    ['EXPERIENCE', value('experience')],
    ['SKILLS', value('skills')],
    ['REFERENCES', value('references')],
    ['ADDITIONAL INFORMATION', value('extras')],
  ].filter(([, value]) => String(value || '').trim());

  return sections
    .map(([heading, sectionContent]) => `## ${heading}\n${String(sectionContent).trim()}`)
    .join('\n\n');
}

export const documentTemplateCategories = [
  'CV & Career',
  'Business',
  'Presentations',
  'Reports & Planning',
  'Letters',
];
