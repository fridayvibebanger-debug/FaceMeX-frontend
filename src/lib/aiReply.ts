import { api } from './api';

/*
|--------------------------------------------------------------------------
| FACEMEX AI REPLY CLIENT
|--------------------------------------------------------------------------
|
| ONE FRONTEND AI GATEWAY
|
| Normal chat
|   -> Backend -> Groq -> Gemini -> Cerebras -> OpenRouter -> DeepSeek
|
| Lesson
|   -> Backend -> AI using supplied lesson/context
|
| Image
|   -> Backend -> Gemini Vision
|
| Job search
|   -> Backend -> Gemini + Google Search
|
| Job verification
|   -> Backend -> Gemini + Google Search
|
| Document verification
|   -> Backend -> Gemini + Google Search
|
|--------------------------------------------------------------------------
*/

export interface AIReplyContextMessage {
  sender: string;
  content: string;
}

export interface AIReplyImage {
  data: string;
  mimeType: string;
  name?: string;
}

export interface AIReplyDocument {
  data?: string;
  url?: string;
  mimeType: string;
  name?: string;
}

export interface AIReplyOptions {
  context: AIReplyContextMessage[];

  userMessage: string;

  tone?: 'professional' | 'casual' | 'friendly';

  maxLength?: number;

  image?: AIReplyImage | null;

  document?: AIReplyDocument | null;

  verify?: boolean;

  /*
   * Optional lesson information.
   *
   * The important part:
   * this file can also build lesson material
   * automatically from context if these are not supplied.
   */
  lessonTitle?: string;

  lessonContent?: string;

  lessonDescription?: string;

  lessonUrl?: string;

  type?:
    | 'reply'
    | 'vision'
    | 'document'
    | 'lesson'
    | 'lesson-summary'
    | 'job-search'
    | 'job-verification'
    | 'document-verification'
    | 'web-verification';
}

/*
|--------------------------------------------------------------------------
| BASIC HELPERS
|--------------------------------------------------------------------------
*/

function hasImage(
  image?: AIReplyImage | null
): boolean {
  return Boolean(
    image &&
      typeof image.data === 'string' &&
      image.data.trim().length > 0
  );
}

function hasDocument(
  document?: AIReplyDocument | null
): boolean {
  return Boolean(
    document &&
      (
        (
          typeof document.data === 'string' &&
          document.data.trim().length > 0
        ) ||
        (
          typeof document.url === 'string' &&
          document.url.trim().length > 0
        )
      )
  );
}

/*
|--------------------------------------------------------------------------
| CONTEXT BUILDER
|--------------------------------------------------------------------------
*/

function buildConversationContext(
  context: AIReplyContextMessage[]
): string {
  if (!Array.isArray(context)) {
    return '';
  }

  return context
    .slice(-12)
    .map((message) => {
      const sender =
        String(
          message?.sender || 'User'
        ).trim();

      const content =
        String(
          message?.content || ''
        ).trim();

      if (!content) {
        return '';
      }

      return `${sender}: ${content}`;
    })
    .filter(Boolean)
    .join('\n');
}

/*
|--------------------------------------------------------------------------
| LESSON MATERIAL
|--------------------------------------------------------------------------
|
| This is the important fix.
|
| If the caller gives us lessonContent, use it.
|
| If it doesn't, use the existing conversation/context
| as the lesson material.
|
| This means the AI is no longer told:
|
| "Summarize this lesson"
|
| with absolutely nothing to summarize.
|--------------------------------------------------------------------------
*/

function buildLessonMaterial(
  options: AIReplyOptions
): string {
  const directContent =
    String(
      options.lessonContent || ''
    ).trim();

  const description =
    String(
      options.lessonDescription || ''
    ).trim();

  const title =
    String(
      options.lessonTitle || ''
    ).trim();

  const context =
    buildConversationContext(
      options.context
    );

  const sections: string[] = [];

  if (title) {
    sections.push(
      `LESSON TITLE:\n${title}`
    );
  }

  if (description) {
    sections.push(
      `LESSON DESCRIPTION:\n${description}`
    );
  }

  if (directContent) {
    sections.push(
      `LESSON CONTENT:\n${directContent}`
    );
  }

  /*
   * If explicit lesson content wasn't supplied,
   * use the available context.
   */
  if (!directContent && context) {
    sections.push(
      `AVAILABLE LESSON / CONVERSATION MATERIAL:\n${context}`
    );
  }

  if (
    options.lessonUrl &&
    String(options.lessonUrl).trim()
  ) {
    sections.push(
      `LESSON URL:\n${String(
        options.lessonUrl
      ).trim()}`
    );
  }

  return sections.join('\n\n').trim();
}

/*
|--------------------------------------------------------------------------
| VERIFICATION DETECTION
|--------------------------------------------------------------------------
*/

function looksLikeVerificationRequest(
  message: string
): boolean {
  const text =
    String(message || '')
      .toLowerCase();

  const words = [
    'verify',
    'verification',
    'is this real',
    'is this legitimate',
    'is this legit',
    'is this genuine',
    'is this fake',
    'is this a scam',
    'scam',
    'legitimate',
    'authentic',
    'real job',
    'real vacancy',
    'real company',
    'real document',
    'check this job',
    'check this vacancy',
    'check this document',
    'confirm this job',
    'confirm this vacancy',
    'confirm this company',
  ];

  return words.some(
    (word) =>
      text.includes(word)
  );
}

/*
|--------------------------------------------------------------------------
| JOB SEARCH DETECTION
|--------------------------------------------------------------------------
*/

function looksLikeJobSearchRequest(
  message: string
): boolean {
  const text =
    String(message || '')
      .toLowerCase();

  const words = [
    'find me a job',
    'find jobs',
    'find a job',
    'job search',
    'search for jobs',
    'search jobs',
    'jobs near',
    'jobs in',
    'vacancy in',
    'vacancies in',
    'hiring in',
    'employment opportunities',
    'work opportunities',
    'career opportunities',
    'job opportunities',
    'latest jobs',
    'current jobs',
    'available jobs',
    'job openings',
    'internships',
    'learnerships',
  ];

  return words.some(
    (word) =>
      text.includes(word)
  );
}

/*
|--------------------------------------------------------------------------
| LESSON DETECTION
|--------------------------------------------------------------------------
*/

function looksLikeLessonRequest(
  message: string
): boolean {
  const text =
    String(message || '')
      .toLowerCase();

  const words = [
    'summarize this lesson',
    'summarise this lesson',
    'summarize the lesson',
    'summarise the lesson',
    'summarize this',
    'summarise this',
    'explain this lesson',
    'explain the lesson',
    'teach me this lesson',
    'lesson summary',
    'lesson explanation',
    'help me understand this lesson',
    'what is this lesson about',
  ];

  return words.some(
    (word) =>
      text.includes(word)
  );
}

/*
|--------------------------------------------------------------------------
| REQUEST TYPE
|--------------------------------------------------------------------------
*/

function determineRequestType(
  options: AIReplyOptions
):
  | 'reply'
  | 'vision'
  | 'document'
  | 'lesson'
  | 'lesson-summary'
  | 'job-search'
  | 'job-verification'
  | 'document-verification'
  | 'web-verification' {

  /*
   * Explicit type always wins.
   */
  if (options.type) {
    return options.type;
  }

  const verification =
    Boolean(options.verify) ||
    looksLikeVerificationRequest(
      options.userMessage
    );

  const jobSearch =
    looksLikeJobSearchRequest(
      options.userMessage
    );

  /*
   * Image + verification
   */
  if (
    hasImage(options.image) &&
    verification
  ) {
    return 'job-verification';
  }

  /*
   * Document + verification
   */
  if (
    hasDocument(options.document) &&
    verification
  ) {
    return 'document-verification';
  }

  /*
   * Normal job search
   */
  if (jobSearch) {
    return 'job-search';
  }

  /*
   * Normal image
   */
  if (hasImage(options.image)) {
    return 'vision';
  }

  /*
   * Normal document
   */
  if (hasDocument(options.document)) {
    return 'document';
  }

  /*
   * Lesson
   */
  if (
    looksLikeLessonRequest(
      options.userMessage
    )
  ) {
    return /summar/i.test(
      options.userMessage
    )
      ? 'lesson-summary'
      : 'lesson';
  }

  return 'reply';
}

/*
|--------------------------------------------------------------------------
| NORMAL CHAT PROMPT
|--------------------------------------------------------------------------
*/

function buildNormalReplyPrompt(
  options: AIReplyOptions
): string {

  const tone =
    options.tone || 'casual';

  const maxLength =
    options.maxLength || 150;

  const toneInstruction = {
    professional:
      'Write professionally, clearly and politely.',

    casual:
      'Write naturally and casually like a real person texting.',

    friendly:
      'Write warmly, naturally and friendly.',
  }[tone];

  const context =
    buildConversationContext(
      options.context
    );

  return `
You are FaceMeX AI.

Answer the user's actual request.

RECENT CONVERSATION:
${context || '(No previous conversation)'}

USER REQUEST:
${options.userMessage}

TONE:
${toneInstruction}

RULES:
- Answer the actual request.
- Be useful.
- Be accurate.
- Do not invent facts.
- Do not invent jobs.
- Do not invent companies.
- Do not invent links.
- Do not mention internal AI systems.
- Do not mention routing.
- Do not say "as an AI".
- Keep the response natural.
- Maximum ${maxLength} characters.
`.trim();
}

/*
|--------------------------------------------------------------------------
| LESSON PROMPT
|--------------------------------------------------------------------------
*/

function buildLessonPrompt(
  options: AIReplyOptions
): string {

  const material =
    buildLessonMaterial(
      options
    );

  const title =
    options.lessonTitle ||
    'Lesson';

  const isSummary =
    options.type ===
      'lesson-summary' ||
    /summar/i.test(
      options.userMessage
    );

  /*
   * CRITICAL:
   *
   * If no lesson material exists,
   * don't hallucinate a summary.
   */
  if (!material) {
    return `
You are FaceMeX AI, an educational assistant.

The user asked:

"${options.userMessage}"

The actual lesson content was not supplied.

Do NOT invent a lesson summary.

Tell the user clearly:

"I need the lesson content, transcript, or lesson material to summarize it accurately."

Do not provide a generic Homework Help explanation.

Do not pretend that you have seen the lesson.
`.trim();
  }

  if (isSummary) {
    return `
You are FaceMeX AI's lesson summarization assistant.

LESSON:
${title}

ACTUAL LESSON MATERIAL:
${material}

USER REQUEST:
${options.userMessage}

Your task is to summarize the ACTUAL lesson material above.

IMPORTANT:
- Use the supplied lesson material.
- Do not invent information.
- Do not replace the lesson with generic Homework Help instructions.
- Do not describe FaceMeX.
- Do not explain how to use FaceMeX.
- Do not create unrelated educational material.

Structure your response:

### Lesson Summary

**Main idea**
Explain the central idea.

**Key concepts**
List the most important concepts.

**Important points**
List the important facts or ideas.

**Simple explanation**
Explain the lesson in simple learner-friendly language.

**What to remember**
Give the most important revision points.

Only use information supported by the lesson material.
`.trim();
  }

  return `
You are FaceMeX AI's educational assistant.

LESSON:
${title}

ACTUAL LESSON MATERIAL:
${material}

USER QUESTION:
${options.userMessage}

Answer the user's question using the actual lesson material.

IMPORTANT:
- Do not invent information.
- Do not give a generic Homework Help process.
- Do not talk about FaceMeX unless asked.
- Explain difficult concepts simply.
- Use examples when they are supported by the lesson.
- If the lesson does not contain the requested information, say so.

Return the educational answer directly.
`.trim();
}

/*
|--------------------------------------------------------------------------
| IMAGE PROMPT
|--------------------------------------------------------------------------
*/

function buildVisionPrompt(
  options: AIReplyOptions
): string {

  return `
You are FaceMeX AI's image analysis assistant.

The user has uploaded an image.

USER QUESTION:
${options.userMessage}

IMPORTANT:
You MUST analyze the actual uploaded image.

Analyze what is visibly present.

Look for:
- text
- headings
- names
- dates
- numbers
- company names
- logos
- job titles
- locations
- requirements
- contact information
- application instructions

Rules:
- Do not invent information.
- Do not claim that something is visible if it is not.
- If text is unreadable, say that it is unreadable.
- If the image contains a job advertisement, extract the visible job information.
- If the user asks whether it is legitimate, appearance alone is NOT proof of legitimacy.
- Explain what can be determined from the image and what requires external verification.

Return the useful answer directly.
`.trim();
}

/*
|--------------------------------------------------------------------------
| DOCUMENT PROMPT
|--------------------------------------------------------------------------
*/

function buildDocumentPrompt(
  options: AIReplyOptions
): string {

  return `
You are FaceMeX AI's document analysis assistant.

The user uploaded a document.

USER QUESTION:
${options.userMessage}

Analyze the actual document.

Rules:
- Use the document's actual contents.
- Do not invent missing information.
- Accurately handle names, dates, numbers, tables and requirements.
- Summarize the actual document when requested.
- Explain difficult sections clearly.
- If authenticity is requested, do not determine authenticity from appearance alone.
- Explain what needs external verification.

Return a useful answer.
`.trim();
}

/*
|--------------------------------------------------------------------------
| JOB SEARCH PROMPT
|--------------------------------------------------------------------------
*/

function buildJobSearchPrompt(
  options: AIReplyOptions
): string {

  const context =
    buildConversationContext(
      options.context
    );

  return `
You are FaceMeX's live job-search assistant.

The user wants CURRENT job opportunities.

USER REQUEST:
${options.userMessage}

CONTEXT:
${context || '(None)'}

Use current web search.

Prioritize:
- Official employer websites
- Government websites
- University websites
- Official recruitment portals
- Reputable recruitment sources

Never invent:
- jobs
- employers
- vacancies
- closing dates
- application URLs

For each job found, provide where available:

1. Job title
2. Employer
3. Location
4. Closing date
5. Posting date
6. Requirements
7. Source
8. Application URL

Clearly distinguish official sources from third-party job boards.

If you cannot verify a listing, say:
"Could not independently verify."

Return useful current job results.
`.trim();
}

/*
|--------------------------------------------------------------------------
| VERIFICATION PROMPT
|--------------------------------------------------------------------------
*/

function buildVerificationPrompt(
  options: AIReplyOptions
): string {

  return `
You are FaceMeX Verification AI.

The user wants information verified using current web sources.

USER REQUEST:
${options.userMessage}

If an image or document is attached:
analyze it first.

Extract:
- employer
- organization
- institution
- job title
- location
- closing date
- reference number
- website
- application method
- contact information

Then compare the information with current authoritative web sources.

Prefer:
- official company websites
- government websites
- official university websites
- official recruitment portals
- official institutional websites

Clearly distinguish:

WHAT THE ATTACHMENT SAYS

WHAT THE OFFICIAL SOURCE SAYS

WHAT MATCHES

WHAT DOES NOT MATCH

WHAT COULD NOT BE VERIFIED

IMPORTANT:
- A professional-looking poster is NOT proof of legitimacy.
- Do not invent sources.
- Do not invent URLs.
- Do not claim certainty beyond the evidence.

Use evidence-based language such as:

"Confirmed by official source."

"Matching official listing found."

"Could not independently verify."

"Details do not match."

"Needs further verification."

Return a clear verification result.
`.trim();
}

/*
|--------------------------------------------------------------------------
| BUILD FINAL REQUEST
|--------------------------------------------------------------------------
*/

function buildPayload(
  options: AIReplyOptions,
  type:
    | 'reply'
    | 'vision'
    | 'document'
    | 'lesson'
    | 'lesson-summary'
    | 'job-search'
    | 'job-verification'
    | 'document-verification'
    | 'web-verification'
) {

  let prompt: string;

  switch (type) {

    case 'vision':
      prompt =
        buildVisionPrompt(
          options
        );
      break;

    case 'document':
      prompt =
        buildDocumentPrompt(
          options
        );
      break;

    case 'lesson':
    case 'lesson-summary':
      prompt =
        buildLessonPrompt(
          options
        );
      break;

    case 'job-search':
      prompt =
        buildJobSearchPrompt(
          options
        );
      break;

    case 'job-verification':
    case 'document-verification':
    case 'web-verification':
      prompt =
        buildVerificationPrompt(
          options
        );
      break;

    case 'reply':
    default:
      prompt =
        buildNormalReplyPrompt(
          options
        );
      break;
  }

  const verification =
    type ===
      'job-verification' ||
    type ===
      'document-verification' ||
    type ===
      'web-verification';

  /*
   * IMPORTANT:
   *
   * We send the generated prompt as BOTH
   * "prompt" and "message".
   *
   * Your backend's normalizeMessages()
   * understands both fields.
   *
   * This guarantees the actual lesson/image/
   * verification instructions reach the AI.
   */
  return {

    prompt,

    message:
      prompt,

    context:
      options.context || [],

    type,

    task:
      type === 'vision'
        ? 'vision'

        : type === 'document'
        ? 'document'

        : type === 'lesson' ||
          type === 'lesson-summary'
        ? 'lesson_explanation'

        : type === 'job-search'
        ? 'job_search'

        : type ===
            'job-verification' ||
          type ===
            'document-verification' ||
          type ===
            'web-verification'
        ? 'job_verification'

        : 'general_chat',

    verify:
      Boolean(options.verify) ||
      verification,

    maxLength:
      options.maxLength || 150,

    /*
     * IMAGE
     */
    image:
      hasImage(options.image)
        ? {
            data:
              options.image!.data,

            mimeType:
              options.image!.mimeType ||
              'image/jpeg',

            name:
              options.image!.name,
          }
        : null,

    /*
     * DOCUMENT
     */
    document:
      hasDocument(options.document)
        ? {
            data:
              options.document?.data,

            url:
              options.document?.url,

            mimeType:
              options.document!.mimeType ||
              'application/pdf',

            name:
              options.document?.name,
          }
        : null,

    /*
     * LESSON DATA
     *
     * These are also sent separately so your
     * backend can use them in the future.
     */
    lessonTitle:
      options.lessonTitle || '',

    lessonContent:
      options.lessonContent ||
      buildLessonMaterial(
        options
      ),

    lessonDescription:
      options.lessonDescription || '',

    lessonUrl:
      options.lessonUrl || '',
  };
}

/*
|--------------------------------------------------------------------------
| RESPONSE EXTRACTION
|--------------------------------------------------------------------------
*/

function extractReply(
  data: any
): string {

  const reply =
    String(
      data?.text ??
      data?.reply ??
      data?.content ??
      data?.response ??
      data?.message ??
      ''
    ).trim();

  if (!reply) {
    throw new Error(
      'The AI service returned an empty response.'
    );
  }

  return reply
    .replace(
      /^```(?:text|markdown)?/i,
      ''
    )
    .replace(
      /```$/i,
      ''
    )
    .trim();
}

/*
|--------------------------------------------------------------------------
| MAIN FUNCTION
|--------------------------------------------------------------------------
*/

export async function generateAIReply(
  options: AIReplyOptions
): Promise<string> {

  const type =
    determineRequestType(
      options
    );

  console.log(
    '[FaceMeX AI] Request',
    {
      type,

      hasImage:
        hasImage(
          options.image
        ),

      hasDocument:
        hasDocument(
          options.document
        ),

      hasLessonContent:
        Boolean(
          buildLessonMaterial(
            options
          )
        ),
    }
  );

  const payload =
    buildPayload(
      options,
      type
    );

  try {

    /*
     * EVERYTHING goes through your existing
     * /api/ai/reply endpoint.
     *
     * No separate frontend image-analysis
     * endpoint is required.
     */
    const data =
      await api.post(
        '/api/ai/reply',
        payload
      );

    let reply =
      extractReply(
        data
      );

    /*
     * Long-answer requests must NOT be
     * truncated to 150 characters.
     */
    const needsFullResponse =
      type === 'vision' ||
      type === 'document' ||
      type === 'lesson' ||
      type === 'lesson-summary' ||
      type === 'job-search' ||
      type === 'job-verification' ||
      type === 'document-verification' ||
      type === 'web-verification';

    if (
      needsFullResponse
    ) {
      return reply;
    }

    /*
     * Normal social replies can remain short.
     */
    const maxLength =
      options.maxLength ?? 150;

    if (
      reply.length <=
      maxLength
    ) {
      return reply;
    }

    return (
      reply
        .substring(
          0,
          Math.max(
            0,
            maxLength - 3
          )
        )
        .trimEnd() +
      '...'
    );

  } catch (error) {

    console.error(
      'FaceMeX AI reply failed:',
      error
    );

    let details =
      'Please try again.';

    if (
      error instanceof Error &&
      error.message
    ) {
      details =
        error.message;
    }

    throw new Error(
      `Failed to generate FaceMeX AI response. ${details}`
    );
  }
}
