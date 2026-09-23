import { api } from './api';

/*
|--------------------------------------------------------------------------
| FACEMEX AI REPLY CLIENT
|--------------------------------------------------------------------------
|
| ONE FRONTEND AI GATEWAY
|
| NORMAL CHAT
|   -> /api/ai/reply
|
| IMAGE
|   -> /api/ai/reply -> Gemini Vision
|
| LESSON
|   -> /api/ai/reply
|
| JOB SEARCH
|   -> /api/ai/reply -> Gemini + Google Search
|
| VERIFICATION
|   -> /api/ai/reply -> Gemini + Google Search
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
| HELPERS
|--------------------------------------------------------------------------
*/

function hasImage(
  image?: AIReplyImage | null
): boolean {
  return Boolean(
    image &&
      typeof image.data === 'string' &&
      image.data.trim()
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
          document.data.trim()
        ) ||
        (
          typeof document.url === 'string' &&
          document.url.trim()
        )
      )
  );
}

/*
|--------------------------------------------------------------------------
| CONTEXT
|--------------------------------------------------------------------------
*/

function buildConversationContext(
  context: AIReplyContextMessage[]
): string {
  if (!Array.isArray(context)) {
    return '';
  }

  return context
    .slice(-8)
    .map((message) => {
      const sender =
        String(message?.sender || 'User').trim();

      const content =
        String(message?.content || '').trim();

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
| REQUEST DETECTION
|--------------------------------------------------------------------------
|
| Keep this deliberately small.
|
|--------------------------------------------------------------------------
*/

function detectType(
  options: AIReplyOptions
): NonNullable<AIReplyOptions['type']> {

  /*
   * Explicit type always wins.
   */
  if (options.type) {
    return options.type;
  }

  /*
   * Image.
   */
  if (hasImage(options.image)) {
    if (options.verify) {
      return 'job-verification';
    }

    return 'vision';
  }

  /*
   * Document.
   */
  if (hasDocument(options.document)) {
    if (options.verify) {
      return 'document-verification';
    }

    return 'document';
  }

  const text =
    String(options.userMessage || '')
      .toLowerCase()
      .trim();

  /*
   * Job search.
   */
  const jobSearch =
    /find (me )?(a )?job|find jobs|job search|search (for )?jobs|jobs? in |jobs? near |vacancies? in |hiring in |latest jobs|current jobs|job opportunities|internships|learnerships/
      .test(text);

  if (jobSearch) {
    return 'job-search';
  }

  /*
   * Verification.
   */
  const verification =
    options.verify ||
    /verify|verification|is this (real|legit|legitimate|fake|a scam)|scam|check this (job|vacancy|document)|confirm this (job|vacancy|company)/
      .test(text);

  if (verification) {
    return 'web-verification';
  }

  /*
   * Lesson.
   */
  const lesson =
    /summari[sz]e (this|the) lesson|lesson summary|lesson explanation|explain (this|the) lesson|teach me this lesson|help me understand this lesson/
      .test(text);

  if (lesson) {
    return /summari[sz]e|summary/.test(text)
      ? 'lesson-summary'
      : 'lesson';
  }

  return 'reply';
}

/*
|--------------------------------------------------------------------------
| NORMAL CHAT
|--------------------------------------------------------------------------
|
| This is intentionally lightweight.
|
|--------------------------------------------------------------------------
*/

function buildNormalPrompt(
  options: AIReplyOptions
): string {

  const tone =
    options.tone || 'casual';

  const context =
    buildConversationContext(
      options.context
    );

  return `
You are FaceMeX AI.

User:
${options.userMessage}

Recent conversation:
${context || 'None'}

Tone:
${tone}

Answer the user's request directly.

Rules:
- Be natural.
- Be useful.
- Be accurate.
- Do not invent facts.
- Do not invent jobs or companies.
- Do not mention internal systems.
- Do not say "as an AI".
`.trim();
}

/*
|--------------------------------------------------------------------------
| LESSON
|--------------------------------------------------------------------------
*/

function buildLessonPrompt(
  options: AIReplyOptions
): string {

  const material =
    String(
      options.lessonContent ||
      options.lessonDescription ||
      buildConversationContext(options.context) ||
      ''
    ).trim();

  if (!material) {
    return `
You are FaceMeX AI.

The user asked:

${options.userMessage}

No actual lesson material was supplied.

Tell the user that they need to provide the lesson content, transcript, or material before you can accurately summarize or explain it.

Do not invent the lesson.
`.trim();
  }

  return `
You are FaceMeX AI's educational assistant.

Lesson title:
${options.lessonTitle || 'Lesson'}

Lesson material:
${material}

User request:
${options.userMessage}

Use the actual lesson material.

Do not invent information.

Explain the material clearly and simply.

If the user requested a summary, provide:
- Main idea
- Key concepts
- Important points
- Simple explanation
- What to remember
`.trim();
}

/*
|--------------------------------------------------------------------------
| IMAGE
|--------------------------------------------------------------------------
*/

function buildVisionPrompt(
  options: AIReplyOptions
): string {

  return `
You are FaceMeX AI's image analysis assistant.

Analyze the uploaded image.

User question:
${options.userMessage}

Read and explain what is actually visible.

Look for:
- text
- names
- dates
- numbers
- companies
- job titles
- locations
- requirements
- contact information
- application instructions

Do not invent information.

If something cannot be read, say so.

If this is a job advertisement, extract the visible job information.

If the user asks whether it is legitimate, explain that the image alone cannot prove legitimacy.
`.trim();
}

/*
|--------------------------------------------------------------------------
| DOCUMENT
|--------------------------------------------------------------------------
*/

function buildDocumentPrompt(
  options: AIReplyOptions
): string {

  return `
You are FaceMeX AI's document analysis assistant.

Analyze the uploaded document.

User question:
${options.userMessage}

Use the actual document contents.

Do not invent information.

Accurately handle:
- names
- dates
- numbers
- requirements
- tables
- instructions

Explain the document clearly.

If authenticity is requested, explain what can and cannot be verified from the document itself.
`.trim();
}

/*
|--------------------------------------------------------------------------
| JOB SEARCH
|--------------------------------------------------------------------------
*/

function buildJobSearchPrompt(
  options: AIReplyOptions
): string {

  return `
You are FaceMeX's live job-search assistant.

User request:
${options.userMessage}

Find CURRENT job opportunities using live web search.

Prefer:
- official employer websites
- government websites
- universities
- official recruitment portals
- reputable recruitment sources

Do not invent jobs.

For each result, provide where available:

Job title:
Employer:
Location:
Closing date:
Requirements:
Source:
Application URL:

If a listing cannot be independently verified, say so.

Return useful current results.
`.trim();
}

/*
|--------------------------------------------------------------------------
| VERIFICATION
|--------------------------------------------------------------------------
*/

function buildVerificationPrompt(
  options: AIReplyOptions
): string {

  return `
You are FaceMeX Verification AI.

User request:
${options.userMessage}

Verify the information using current authoritative web sources.

If an image or document is attached, analyze it first.

Compare:
1. What the attachment says.
2. What official sources say.
3. What matches.
4. What does not match.
5. What could not be verified.

Prefer:
- official company websites
- government websites
- university websites
- official recruitment portals
- official institutional websites

Do not invent sources or URLs.

Use evidence-based conclusions such as:

Confirmed by official source.
Matching official listing found.
Could not independently verify.
Details do not match.
Needs further verification.

Do not claim certainty beyond the evidence.
`.trim();
}

/*
|--------------------------------------------------------------------------
| PAYLOAD
|--------------------------------------------------------------------------
*/

function buildPayload(
  options: AIReplyOptions,
  type: NonNullable<AIReplyOptions['type']>
) {

  let prompt: string;

  switch (type) {

    case 'vision':
      prompt = buildVisionPrompt(options);
      break;

    case 'document':
      prompt = buildDocumentPrompt(options);
      break;

    case 'lesson':
    case 'lesson-summary':
      prompt = buildLessonPrompt(options);
      break;

    case 'job-search':
      prompt = buildJobSearchPrompt(options);
      break;

    case 'job-verification':
    case 'document-verification':
    case 'web-verification':
      prompt = buildVerificationPrompt(options);
      break;

    case 'reply':
    default:
      prompt = buildNormalPrompt(options);
      break;
  }

  const verification =
    type === 'job-verification' ||
    type === 'document-verification' ||
    type === 'web-verification';

  return {
    /*
     * Keep both because your current backend
     * accepts both.
     */
    prompt,
    message: prompt,

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
        : verification
        ? 'job_verification'
        : 'general_chat',

    verify:
      Boolean(options.verify) ||
      verification,

    maxLength:
      options.maxLength || 150,

    image:
      hasImage(options.image)
        ? {
            data: options.image!.data,
            mimeType:
              options.image!.mimeType ||
              'image/jpeg',
            name:
              options.image!.name,
          }
        : null,

    document:
      hasDocument(options.document)
        ? {
            data:
              options.document?.data,
            url:
              options.document?.url,
            mimeType:
              options.document?.mimeType ||
              'application/pdf',
            name:
              options.document?.name,
          }
        : null,

    lessonTitle:
      options.lessonTitle || '',

    lessonContent:
      options.lessonContent || '',

    lessonDescription:
      options.lessonDescription || '',

    lessonUrl:
      options.lessonUrl || '',
  };
}

/*
|--------------------------------------------------------------------------
| RESPONSE
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
| MAIN AI FUNCTION
|--------------------------------------------------------------------------
*/

export async function generateAIReply(
  options: AIReplyOptions
): Promise<string> {

  const type =
    detectType(options);

  /*
   * IMPORTANT:
   *
   * Do NOT build lesson material,
   * conversation prompts, verification
   * prompts, etc. unless needed.
   *
   * Normal chat gets one lightweight path.
   */

  const payload =
    buildPayload(
      options,
      type
    );

  try {

    const data =
      await api.post(
        '/api/ai/reply',
        payload
      );

    const reply =
      extractReply(data);

    /*
     * Long-form requests.
     */
    const longResponse =
      type === 'vision' ||
      type === 'document' ||
      type === 'lesson' ||
      type === 'lesson-summary' ||
      type === 'job-search' ||
      type === 'job-verification' ||
      type === 'document-verification' ||
      type === 'web-verification';

    if (longResponse) {
      return reply;
    }

    /*
     * Normal FaceMeX social reply.
     */
    const maxLength =
      options.maxLength ?? 150;

    if (reply.length <= maxLength) {
      return reply;
    }

    return (
      reply
        .substring(
          0,
          Math.max(0, maxLength - 3)
        )
        .trimEnd() +
      '...'
    );

  } catch (error) {

    console.error(
      '[FaceMeX AI] Request failed:',
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : 'Please try again.';

    throw new Error(
      `Failed to generate FaceMeX AI response. ${message}`
    );
  }
}
