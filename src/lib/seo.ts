export const SEO_SITE_ORIGIN = 'https://facemexsocial.com';

export type SeoSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type SeoFaq = {
  question: string;
  answer: string;
};

export type SeoLandingPage = {
  path: string;
  title: string;
  description: string;
  heading: string;
  introduction: string;
  sections: SeoSection[];
  faqs?: SeoFaq[];
  cta: string;
};

export type SeoArticle = {
  slug: string;
  title: string;
  description: string;
  heading: string;
  introduction: string;
  sections: SeoSection[];
  updated: string;
  related: Array<{ label: string; href: string }>;
};

export const seoLandingPages: SeoLandingPage[] = [
  {
    path: '/',
    title: 'FaceMeX — AI Learning and Career Assistant',
    description: 'Use FaceMeX for AI study help, practical learning, job discovery, CV support and interview preparation in one learning and career workspace.',
    heading: 'AI support for learning and career preparation',
    introduction: 'FaceMeX brings an AI assistant together with practical tools for learning, job discovery and career preparation. Ask questions, work through a topic, and get help turning your next step into an action.',
    sections: [
      {
        heading: 'Learn by asking and practising',
        paragraphs: ['Ask the AI assistant to explain a difficult topic, structure revision notes, or help you think through a learning task. The Practical Lab provides guided, hands-on activities across science, mathematics and environmental studies.'],
        bullets: ['Ask follow-up questions in a conversation.', 'Use Watch lessons to find learning videos and request lesson summaries.', 'Use Practical Lab activities to explore a concept step by step.'],
      },
      {
        heading: 'Prepare for work and opportunities',
        paragraphs: ['FaceMeX includes tools to explore jobs, prepare CV and application material, and practise interview answers. Job details and application destinations can change, so check the original source before sharing personal information or applying.'],
        bullets: ['Explore job opportunities and relevant application sources.', 'Get assistance with CVs, cover letters and professional documents.', 'Practise interview questions with context from the role you are preparing for.'],
      },
      {
        heading: 'A practical assistant, not a source of guarantees',
        paragraphs: ['AI responses can be incomplete or incorrect. Use them as a starting point, verify important facts with authoritative sources, and make decisions using your own judgement. FaceMeX does not guarantee grades, admission or employment.'],
      },
    ],
    faqs: [
      { question: 'What can I use FaceMeX for?', answer: 'FaceMeX provides an AI assistant for learning and everyday work, plus tools for lesson summaries, practical activities, job discovery, CV and document preparation, and interview practice.' },
      { question: 'Does FaceMeX guarantee a job or a particular result?', answer: 'No. FaceMeX offers assistance and tools, but does not guarantee employment, grades, admission or any other outcome.' },
      { question: 'Should I verify information from the AI assistant?', answer: 'Yes. AI-generated information may be inaccurate or out of date. Verify important information, especially job details, deadlines, requirements and application destinations.' },
    ],
    cta: 'Try FaceMeX AI',
  },
  {
    path: '/ai-for-students',
    title: 'AI for Students | FaceMeX Learning Assistant',
    description: 'Explore practical ways students can use FaceMeX for explanations, revision, lesson summaries, guided activities and early career preparation.',
    heading: 'AI for students — learn, practise and prepare',
    introduction: 'FaceMeX gives students a place to ask learning questions, organise explanations and practise ideas. Use it as a study aid alongside lessons, course materials and trusted sources.',
    sections: [
      { heading: 'Understand difficult lessons', paragraphs: ['Ask the assistant to explain a concept in clear steps, define unfamiliar terms, or give an example. Add your grade or level and describe what is confusing so the response can be more relevant.'], bullets: ['Ask for a simpler explanation.', 'Request a worked example and then try a similar problem yourself.', 'Ask follow-up questions when a step is unclear.'] },
      { heading: 'Make revision more active', paragraphs: ['Turn material you provide into concise notes, key terms or practice questions. Compare the output with your teacher’s notes and correct anything that does not match your course.'], bullets: ['Summarise a supplied passage or lesson transcript.', 'Ask for a short revision plan based on your available study time.', 'Use questions to test recall instead of only rereading notes.'] },
      { heading: 'Connect study with next steps', paragraphs: ['FaceMeX also includes Practical Lab activities, job and career exploration, CV and document assistance, and interview practice. These tools can help you explore options, but they do not replace educators or official requirements.'] },
    ],
    faqs: [
      { question: 'Can FaceMeX help explain school subjects?', answer: 'You can ask the AI assistant to explain topics and work through examples. Check the response against your course materials and ask a teacher when you need authoritative guidance.' },
      { question: 'Can I use it to summarise a lesson?', answer: 'Yes. FaceMeX can help structure notes from material you provide, such as text or a lesson transcript. Review summaries for missing details or errors.' },
      { question: 'Will AI do my work for me?', answer: 'FaceMeX is intended to support learning. Use explanations and examples to understand the task, follow your school’s academic-integrity rules, and submit work that reflects your own understanding.' },
    ],
    cta: 'Try FaceMeX AI',
  },
  {
    path: '/ai-study-assistant',
    title: 'AI Study Assistant for Students | FaceMeX',
    description: 'Use the FaceMeX AI study assistant to clarify concepts, organise revision, summarise material you provide and practise learning step by step.',
    heading: 'A study assistant for questions, notes and practice',
    introduction: 'A useful study session starts with a specific question. FaceMeX can help explain a topic, organise notes from material you provide and create practice prompts that help you check your understanding.',
    sections: [
      { heading: 'Ask focused questions', paragraphs: ['Include the subject, topic, level and the exact step that is difficult. If an answer is too broad, ask for one example, a simpler explanation or a check of your reasoning.'] },
      { heading: 'Use summaries as a study aid', paragraphs: ['Provide the text, notes or transcript you want to work with. Ask for key ideas, terms and a short recap. A summary is a study aid, not a substitute for the original material; verify it against the source.'] },
      { heading: 'Build a repeatable revision routine', paragraphs: ['Choose a realistic study goal, review the relevant material, and use short questions to test recall. Ask the assistant to help break a topic into smaller sessions, then adjust the plan to your timetable and course requirements.'] },
      { heading: 'Keep academic integrity in view', paragraphs: ['Follow your institution’s rules on AI use. Do not present generated text as your own work where that is prohibited, and confirm facts, citations and calculations before relying on them.'] },
    ],
    faqs: [
      { question: 'What information should I include in a study prompt?', answer: 'Name the subject, topic, course level and what you already understand. Include the exact question or material you are working from, and say what kind of help you need.' },
      { question: 'Can FaceMeX summarise any textbook or lesson?', answer: 'The assistant can help with content you provide, subject to your rights and applicable terms. Check the summary against the original text and your course materials.' },
    ],
    cta: 'Start learning with FaceMeX',
  },
  {
    path: '/student-career-guidance',
    title: 'Career Guidance for Students | FaceMeX',
    description: 'Explore career ideas, skills, job opportunities, CV preparation and interview practice with FaceMeX tools for learning and career planning.',
    heading: 'Career guidance that starts with your interests',
    introduction: 'Career planning is a process of exploring possibilities, learning what different roles involve and choosing practical next steps. FaceMeX can help you organise that exploration without deciding your future for you.',
    sections: [
      { heading: 'Explore roles and skills', paragraphs: ['Describe subjects you enjoy, activities you are good at and the kinds of problems you like solving. Ask for possible career areas and the skills or questions you could research next. Treat suggestions as starting points, not a definitive assessment.'] },
      { heading: 'Prepare application materials', paragraphs: ['Use the CV and document tools to draft or improve professional material. Check every detail for accuracy, tailor it to the opportunity and do not include claims or experience you cannot support.'] },
      { heading: 'Practise interviews and job search', paragraphs: ['Use interview preparation to practise explaining your experience and answering role-related questions. For job opportunities, verify the employer, vacancy, deadlines and application URL through an official source before sharing sensitive information.'] },
      { heading: 'Make a plan you can review', paragraphs: ['Choose one small next step—such as researching an entry requirement, speaking with a trusted adviser or improving a document—and set a date to review what you learned. Career decisions benefit from current, local information and human guidance.'] },
    ],
    faqs: [
      { question: 'Can FaceMeX choose a career for me?', answer: 'No. FaceMeX can help you explore ideas and questions, but career choices depend on your interests, circumstances and reliable information. Use the assistant as one input among others.' },
      { question: 'Can students use FaceMeX to prepare a CV?', answer: 'FaceMeX includes CV and document assistance. Review every detail, keep it truthful, and tailor the final document to the role or opportunity.' },
    ],
    cta: 'Explore career tools',
  },
  {
    path: '/online-learning',
    title: 'Online Learning and AI Study Tools | FaceMeX',
    description: 'FaceMeX combines conversational AI study support, lesson summaries and practical activities to help learners work through topics at their own pace.',
    heading: 'Online learning support that keeps you involved',
    introduction: 'Digital learning works best when it helps you engage with a subject rather than only consume information. FaceMeX combines an AI assistant with tools for lesson review and guided practice.',
    sections: [
      { heading: 'Ask, review and revisit', paragraphs: ['Use the assistant to ask follow-up questions about a concept, request a structured explanation or revisit a point from your notes. Keep the original course or lesson as the authority for what you need to learn.'] },
      { heading: 'Work from learning material', paragraphs: ['Watch lessons helps you find video learning content and work with lesson information you provide. You can ask for a recap or revision notes, then compare them with the lesson itself.'] },
      { heading: 'Learn through practical activities', paragraphs: ['Practical Lab offers guided activities across areas such as biology, science, mathematics and environmental studies. Use each activity to explore a concept and follow appropriate real-world safety instructions.'] },
      { heading: 'Use AI thoughtfully', paragraphs: ['AI can make mistakes and may not reflect your syllabus or local requirements. Check important facts, use your own reasoning, and follow your institution’s rules for AI-assisted work.'] },
    ],
    faqs: [
      { question: 'Is FaceMeX a replacement for school or a teacher?', answer: 'No. FaceMeX provides AI assistance and learning tools; it does not replace a teacher, course, assessment or official learning resource.' },
      { question: 'Can I learn at my own pace?', answer: 'You can ask questions and revisit explanations in the workspace at a pace that suits your study session. Your access to specific tools may depend on your account plan.' },
    ],
    cta: 'Start learning',
  },
  {
    path: '/ai-career-assistant',
    title: 'AI Career Assistant for CVs and Interviews | FaceMeX',
    description: 'Use FaceMeX career tools to explore roles, find job opportunities, prepare CVs and documents, and practise for interviews.',
    heading: 'Practical AI assistance for career preparation',
    introduction: 'FaceMeX brings career-related help into an AI workspace. Ask for support exploring roles, preparing application material or practising interview responses, while keeping your decisions and final checks in your hands.',
    sections: [
      { heading: 'Explore opportunities carefully', paragraphs: ['The workspace can help you search for jobs and understand information about a listing. Confirm that the vacancy is current and use a verified employer or official application destination before sharing personal information.'] },
      { heading: 'Improve your CV and documents', paragraphs: ['Use CV and document features to draft, organise or refine material. Check names, dates, qualifications and contact details carefully, and ensure every statement is accurate and relevant.'] },
      { heading: 'Practise for interviews', paragraphs: ['Share the role and relevant experience you want to discuss. Ask for practice questions, then prepare answers that reflect your real examples rather than memorising generated scripts.'] },
      { heading: 'No outcome guarantees', paragraphs: ['An AI tool cannot ensure an interview, offer or employment. Use it for preparation, verify external information and seek advice from trusted people when you need context.'] },
    ],
    faqs: [
      { question: 'Can the assistant write a CV for me?', answer: 'FaceMeX includes CV and document assistance that can help you draft or revise material. You are responsible for checking accuracy and deciding what to submit.' },
      { question: 'Does FaceMeX verify every job listing?', answer: 'Do not assume every detail is verified or current. Check the role on the employer’s official site and be cautious of requests for money or sensitive information.' },
    ],
    cta: 'Try FaceMeX career assistant',
  },
  {
    path: '/jobs-in-south-africa',
    title: 'Job Search Tools for South Africa | FaceMeX',
    description: 'Explore FaceMeX job discovery and career preparation tools for South African opportunities, with guidance to verify listings and application sources.',
    heading: 'Explore job opportunities with careful source checks',
    introduction: 'FaceMeX includes job discovery and career preparation tools that can help you organise a search. Job availability and eligibility change; always check the employer or official listing before applying.',
    sections: [
      { heading: 'Search with a clear brief', paragraphs: ['Specify the type of work, location, experience level and any practical constraints that matter to you. A focused search can make it easier to review results and spot roles that need further checking.'] },
      { heading: 'Check the original source', paragraphs: ['Before applying, confirm the role exists on an employer or recognised official source. Check the location, closing date, requirements and application destination. FaceMeX does not guarantee that a listing is complete or still open.'] },
      { heading: 'Protect your personal information', paragraphs: ['Be cautious if a recruiter asks for payment, account passwords or unnecessary sensitive documents. Share personal information only through a destination you have independently verified and understand.'] },
      { heading: 'Prepare a truthful application', paragraphs: ['Use the CV, document and interview tools to prepare materials that accurately reflect your experience. Tailor your application to the role and verify every date, qualification and contact detail.'] },
    ],
    faqs: [
      { question: 'Does FaceMeX guarantee that a job listing is current?', answer: 'No. Job listings and deadlines can change. Verify the details and application route on the employer’s official source before acting.' },
      { question: 'Can FaceMeX help me prepare an application?', answer: 'FaceMeX includes AI support for CVs, documents and interview practice. Review generated content carefully and keep all application information truthful.' },
    ],
    cta: 'Explore FaceMeX job tools',
  },
  {
    path: '/about',
    title: 'About FaceMeX | AI Learning and Career Workspace',
    description: 'Learn about FaceMeX, an AI workspace with tools for learning, practical activities, job discovery, documents, CV preparation and interviews.',
    heading: 'About FaceMeX',
    introduction: 'FaceMeX is an AI-powered workspace focused on learning and career preparation. It brings conversational assistance together with tools for practical learning, job discovery and professional documents.',
    sections: [
      { heading: 'What the workspace includes', paragraphs: ['The current workspace includes AI conversations, learning and lesson support, Practical Lab activities, job discovery, project conversations, CV and document assistance, and interview preparation. Feature availability may vary by account plan.'] },
      { heading: 'How to use AI responses', paragraphs: ['AI output is generated assistance, not authoritative advice. Review responses, confirm important information with suitable sources and use your own judgement before taking action.'] },
      { heading: 'Responsible job searching', paragraphs: ['Job information can become outdated or be incomplete. Confirm opportunities and application destinations with the employer or an official source. FaceMeX does not guarantee employment.'] },
    ],
    cta: 'Create a FaceMeX account',
  },
];

export const seoArticles: SeoArticle[] = [
  {
    slug: 'how-can-ai-help-students',
    title: 'How Can AI Help Students Learn? | FaceMeX',
    description: 'A practical guide to using AI for explanations, revision and practice while checking accuracy and following academic-integrity rules.',
    heading: 'How can AI help students learn?',
    introduction: 'AI can support a study session by explaining an idea, helping organise notes or generating questions for practice. It is most useful when learners stay active: ask, check, practise and revise.',
    updated: '2026-10-07',
    related: [{ label: 'AI for students', href: '/ai-for-students' }, { label: 'AI study assistant', href: '/ai-study-assistant' }],
    sections: [
      { heading: 'Ask for an explanation at the right level', paragraphs: ['Name the subject, level and concept. Explain what you already understand and where you get stuck. Ask for one clear explanation or worked example, then check each step against your course material.'] },
      { heading: 'Turn material into active revision', paragraphs: ['From notes or text you provide, ask for key terms, a concise outline or self-test questions. Try answering before looking at any suggested answers; retrieval practice helps reveal what you still need to review.'] },
      { heading: 'Use AI to plan, not replace, study', paragraphs: ['A revision plan should fit your assessment date, available time and syllabus. Ask AI to help break work into sessions, then adjust the plan yourself and use official course guidance to decide what matters.'] },
      { heading: 'Check accuracy and integrity', paragraphs: ['AI can produce plausible errors, omit context or invent sources. Verify facts, calculations and citations. Follow your school or institution’s rules and do not submit generated work as your own when that is not allowed.'] },
    ],
  },
  {
    slug: 'how-to-use-ai-for-studying',
    title: 'How to Use AI for Studying Effectively | FaceMeX',
    description: 'A step-by-step study method for asking focused questions, checking explanations, practising recall and using AI responsibly.',
    heading: 'How to use AI for studying effectively',
    introduction: 'A good AI study prompt describes the learning goal and the point of difficulty. The goal is not to collect more text; it is to improve understanding and test whether you can use what you learned.',
    updated: '2026-10-07',
    related: [{ label: 'AI study assistant', href: '/ai-study-assistant' }, { label: 'Online learning with FaceMeX', href: '/online-learning' }],
    sections: [
      { heading: '1. Set a specific goal', paragraphs: ['Replace “teach me science” with a focused task such as “explain how energy changes in this example at my course level.” Include the topic and what you have already tried.'] },
      { heading: '2. Ask for steps and examples', paragraphs: ['Request a short explanation, one worked example and a new question to try yourself. If the answer skips a step, ask about that step rather than restarting with a broader prompt.'] },
      { heading: '3. Test recall without looking', paragraphs: ['Close your notes and explain the idea in your own words. Ask for a few review questions, answer them independently and then compare with trusted course materials.'] },
      { heading: '4. Correct and record gaps', paragraphs: ['Mark what was wrong or uncertain and revisit the original lesson. AI feedback can be useful, but it may also be mistaken; check important corrections against a reliable source.'] },
      { heading: '5. Keep your work your own', paragraphs: ['Use AI according to your institution’s rules. Credit sources as required and make sure submitted work represents your understanding and effort.'] },
    ],
  },
  {
    slug: 'how-to-write-a-student-cv',
    title: 'How to Write a Student CV | FaceMeX',
    description: 'A practical student CV checklist covering contact details, education, projects, skills, truthful examples and role-specific review.',
    heading: 'How to write a student CV',
    introduction: 'A student CV can show potential even when formal work experience is limited. Make it easy to scan, accurate and specific to the opportunity instead of trying to fill space with generic claims.',
    updated: '2026-10-07',
    related: [{ label: 'Student career guidance', href: '/student-career-guidance' }, { label: 'FaceMeX career assistant', href: '/ai-career-assistant' }],
    sections: [
      { heading: 'Start with clear contact and education details', paragraphs: ['Use a professional email address and a phone number you can access. List your current or completed education accurately, including dates where relevant. Follow the application instructions about personal details.'] },
      { heading: 'Describe evidence, not just qualities', paragraphs: ['For projects, volunteering, school activities or informal responsibilities, explain what you did and what skills you used. Prefer a concrete example over unsupported phrases such as “hard-working team player.”'] },
      { heading: 'Choose skills relevant to the role', paragraphs: ['Include practical, digital, language or subject skills that you can explain or demonstrate. Avoid overstating proficiency and remove skills that do not help the reader assess your fit.'] },
      { heading: 'Tailor and proofread', paragraphs: ['Move the most relevant information up, use wording from the opportunity only when it accurately describes you, and check names, dates, spelling and contact details. Ask a trusted person to review the final version.'] },
      { heading: 'Use AI as an editor, not a source of facts', paragraphs: ['An AI assistant can help organise or improve wording, but it cannot know your experience unless you provide it. Verify every line and never submit invented qualifications, dates or achievements.'] },
    ],
  },
  {
    slug: 'how-to-prepare-for-an-interview',
    title: 'How to Prepare for a Job Interview | FaceMeX',
    description: 'Prepare for an interview by researching the role, choosing truthful examples, practising clearly and planning useful questions.',
    heading: 'How to prepare for a job interview',
    introduction: 'Interview preparation is easier when you understand the role and can give clear examples from your own experience. Practice should help you speak naturally, not memorise a script.',
    updated: '2026-10-07',
    related: [{ label: 'AI career assistant', href: '/ai-career-assistant' }, { label: 'Student career guidance', href: '/student-career-guidance' }],
    sections: [
      { heading: 'Understand the role and employer', paragraphs: ['Read the vacancy and check the employer’s official information. Note the responsibilities, required skills, interview format and any documents requested. Do not rely only on a reposted listing.'] },
      { heading: 'Prepare examples from your real experience', paragraphs: ['Choose examples from work, study, projects or volunteering. Explain the situation, what you were responsible for, the actions you took and what you learned. Keep the details accurate and relevant.'] },
      { heading: 'Practise concise answers', paragraphs: ['Say answers aloud and keep them focused. Practice likely questions, but adapt your response to the question asked. If you do not know something, be honest about how you would approach it.'] },
      { heading: 'Plan your logistics and questions', paragraphs: ['Confirm the time, location or meeting link, travel plan and contact person. Prepare a few genuine questions about the role, team or next steps.'] },
      { heading: 'Use AI practice with judgement', paragraphs: ['FaceMeX can help generate practice questions and structure answers from context you provide. Check suggestions, remove anything untrue and use your own voice during the interview.'] },
    ],
  },
  {
    slug: 'how-to-choose-a-career',
    title: 'How to Choose a Career Path | FaceMeX',
    description: 'A grounded process for exploring career options using interests, skills, real requirements, trusted guidance and small next steps.',
    heading: 'How to choose a career path',
    introduction: 'Choosing a career does not require predicting your whole future at once. It is a sequence of informed decisions: understand yourself, explore options and gather evidence about the paths available to you.',
    updated: '2026-10-07',
    related: [{ label: 'Student career guidance', href: '/student-career-guidance' }, { label: 'FaceMeX AI career assistant', href: '/ai-career-assistant' }],
    sections: [
      { heading: 'Notice interests, strengths and constraints', paragraphs: ['Write down activities you enjoy, tasks you learn quickly and environments where you work well. Also consider practical factors such as location, finances, caregiving or study requirements.'] },
      { heading: 'Explore several possibilities', paragraphs: ['Compare a few roles rather than settling on the first suggestion. Look up typical tasks, entry routes, working conditions and current demand using reliable local sources. Talk to people with relevant experience where possible.'] },
      { heading: 'Check requirements at the source', paragraphs: ['Training, licensing and entry requirements vary by employer and region. Confirm them with official institutions or employers instead of relying on a general AI response.'] },
      { heading: 'Try a small next step', paragraphs: ['A short project, introductory lesson, informational conversation or carefully chosen application can help you learn whether a path fits. Review what you learn and update your plan.'] },
      { heading: 'Use AI for questions and organisation', paragraphs: ['FaceMeX can help brainstorm options based on details you choose to share and turn your research into questions or next steps. Treat recommendations as prompts for further research, not a diagnosis of your future.'] },
    ],
  },
  {
    slug: 'how-ai-can-help-job-seekers',
    title: 'How AI Can Help Job Seekers | FaceMeX',
    description: 'Learn how AI can help organise a job search, tailor truthful application material and practise interviews—plus what to verify.',
    heading: 'How AI can help job seekers',
    introduction: 'AI can help organise parts of a job search, from clarifying a role’s requirements to practising interview answers. It cannot verify every vacancy or replace your judgement about an opportunity.',
    updated: '2026-10-07',
    related: [{ label: 'FaceMeX career assistant', href: '/ai-career-assistant' }, { label: 'South African job search tools', href: '/jobs-in-south-africa' }],
    sections: [
      { heading: 'Turn a broad search into a plan', paragraphs: ['Set role, location, schedule and experience criteria. Track where you found each vacancy and when you checked it, so you can revisit the original source before applying.'] },
      { heading: 'Tailor materials without inventing experience', paragraphs: ['An AI tool can help compare a CV with a job description or improve clarity. Keep all claims accurate, include only skills you can support and proofread every generated change.'] },
      { heading: 'Practise interview communication', paragraphs: ['Generate practice questions based on the role and rehearse examples drawn from your real experience. Use feedback to improve clarity, not to memorise answers that do not sound like you.'] },
      { heading: 'Watch for scams and outdated listings', paragraphs: ['Confirm the employer and vacancy through an official channel. Be cautious about upfront fees, pressure to act immediately, requests for passwords or sensitive information, and application domains that do not match the organisation.'] },
      { heading: 'Know the limits', paragraphs: ['AI can make errors and job data can change. FaceMeX does not guarantee an interview or job. Verify deadlines, requirements and application destinations independently.'] },
    ],
  },
  {
    slug: 'how-to-find-jobs-in-south-africa',
    title: 'How to Find Jobs in South Africa | FaceMeX',
    description: 'A practical South African job-search checklist for focused searches, official employer sources, safe applications and follow-up.',
    heading: 'How to find jobs in South Africa',
    introduction: 'Finding work often involves repeated searching, careful source checks and tailored applications. A simple process can help you use your time well and reduce the risk of acting on misleading information.',
    updated: '2026-10-07',
    related: [{ label: 'South African job search tools', href: '/jobs-in-south-africa' }, { label: 'AI career assistant', href: '/ai-career-assistant' }],
    sections: [
      { heading: 'Define a realistic search', paragraphs: ['Write down role types, locations you can reach, work arrangements and experience requirements. Use alternative job titles when searching, but check that each result matches your skills and circumstances.'] },
      { heading: 'Start from trusted sources', paragraphs: ['Check employer career pages and established, verifiable opportunity sources. If you see a listing elsewhere, look for the same vacancy on the employer’s official site or contact channel.'] },
      { heading: 'Verify the listing before applying', paragraphs: ['Check the employer name, role, location, requirements, closing date and application URL. Be alert to payment demands, suspicious domains, unrealistic promises and requests for sensitive information unrelated to recruitment.'] },
      { heading: 'Keep applications accurate and organised', paragraphs: ['Tailor your CV to the role, record where and when you applied, and save a copy of the job description. Follow the instructions and avoid adding qualifications or experience you do not have.'] },
      { heading: 'Use FaceMeX as preparation support', paragraphs: ['FaceMeX offers job discovery, CV and document assistance and interview practice. Listings and AI suggestions may be incomplete or out of date, so confirm important information with the original source.'] },
    ],
  },
  {
    slug: 'how-to-build-career-skills',
    title: 'How to Build Career Skills | FaceMeX',
    description: 'A practical approach to building career skills through small projects, feedback, reflection and clear evidence of what you can do.',
    heading: 'How to build career skills',
    introduction: 'Career skills grow through practice and feedback, not only by collecting course titles. Choose a skill connected to a goal, practise it in a small project and keep evidence of what you learned.',
    updated: '2026-10-07',
    related: [{ label: 'Student career guidance', href: '/student-career-guidance' }, { label: 'Online learning', href: '/online-learning' }],
    sections: [
      { heading: 'Choose a skill with a purpose', paragraphs: ['Start from a role, study goal or task you want to handle. Identify the skill involved and check what credible employers, course providers or practitioners say it requires.'] },
      { heading: 'Practise in a small project', paragraphs: ['Create a manageable output, such as a short report, spreadsheet, design, presentation or practical exercise. Follow appropriate safety and privacy rules and avoid sharing confidential information.'] },
      { heading: 'Ask for specific feedback', paragraphs: ['Request feedback on a clear criterion: accuracy, structure, clarity or usability. Compare advice from more than one source and decide which changes improve the result.'] },
      { heading: 'Record evidence honestly', paragraphs: ['Keep a short note of what you made, the tools you used, the challenges you solved and what you would improve. Use this evidence when describing skills in a CV or interview.'] },
      { heading: 'Keep learning current', paragraphs: ['Requirements differ across occupations and change over time. Check current role descriptions and trusted learning sources, then revisit your plan as your interests and opportunities develop.'] },
    ],
  },
];

export function getSeoPage(path: string) {
  return seoLandingPages.find((page) => page.path === path);
}

export function getSeoArticle(path: string) {
  const prefix = '/resources/';
  if (!path.startsWith(prefix)) return undefined;
  const slug = path.slice(prefix.length).replace(/\/+$/, '');
  return seoArticles.find((article) => article.slug === slug);
}

export function getSeoMetadata(path: string) {
  const page = getSeoPage(path);
  if (page) return { title: page.title, description: page.description, canonical: `${SEO_SITE_ORIGIN}${page.path}`, indexable: true };

  const article = getSeoArticle(path);
  if (article) {
    const articlePath = `/resources/${article.slug}`;
    return { title: article.title, description: article.description, canonical: `${SEO_SITE_ORIGIN}${articlePath}`, indexable: true };
  }

  if (path === '/resources') {
    return {
      title: 'Learning and Career Guides | FaceMeX Resources',
      description: 'Practical guides to AI-assisted study, student CVs, interviews, career choices, job searching and skill development.',
      canonical: `${SEO_SITE_ORIGIN}/resources`,
      indexable: true,
    };
  }

  if (path === '/jobs') {
    return {
      title: 'Jobs | FaceMeX',
      description: 'Sign in to use FaceMeX job discovery and career preparation tools.',
      canonical: `${SEO_SITE_ORIGIN}/jobs`,
      indexable: false,
    };
  }

  return {
    title: 'FaceMeX',
    description: 'FaceMeX AI learning and career workspace.',
    canonical: '',
    indexable: false,
  };
}
