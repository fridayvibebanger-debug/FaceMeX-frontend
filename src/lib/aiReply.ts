import { api } from './api';

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

  type?:
    | 'reply'
    | 'vision'
    | 'document'
    | 'job-verification'
    | 'document-verification'
    | 'web-verification';
}

/* =========================================================
   HELPERS
========================================================= */

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

/* =========================================================
   VERIFICATION DETECTION
========================================================= */

function looksLikeVerificationRequest(
  message: string
): boolean {
  const text = String(message || '').toLowerCase();

  const words = [
    'verify',
    'verification',
    'verify this',
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
    'can you verify',
    'please verify',
    'check if this is real',
    'check if this is legitimate',
    'check whether this is real',
    'check whether this is legitimate',
  ];

  return words.some((word) =>
    text.includes(word)
  );
}

/* =========================================================
   JOB DETECTION
========================================================= */

function looksLikeJobRequest(
  message: string
): boolean {
  const text = String(message || '').toLowerCase();

  const words = [
    'job',
    'jobs',
    'vacancy',
    'vacancies',
    'employment',
    'hiring',
    'career',
    'careers',
    'position',
    'recruitment',
    'recruiting',
    'internship',
    'internships',
    'learnership',
    'learnerships',
    'work opportunity',
    'work opportunities',
    'job opportunity',
    'job opportunities',
    'job opening',
    'job openings',
  ];

  return words.some((word) =>
    text.includes(word)
  );
}

/* =========================================================
   REQUEST TYPE
========================================================= */

function determineRequestType(
  options: AIReplyOptions
):
  | 'reply'
  | 'vision'
  | 'document'
  | 'job-verification'
  | 'document-verification'
  | 'web-verification' {

  const {
    userMessage,
    image,
    document,
    verify,
    type,
  } = options;

  /*
   * Explicit type always wins.
   */
  if (type) {
    return type;
  }

  const hasAttachedImage =
    hasImage(image);

  const hasAttachedDocument =
    hasDocument(document);

  const verificationRequested =
    Boolean(verify) ||
    looksLikeVerificationRequest(
      userMessage
    );

  const jobRequest =
    looksLikeJobRequest(
      userMessage
    );

  /*
   * JOB + IMAGE + VERIFICATION
   *
   * Example:
   * "Is this job legitimate?"
   * with a job poster attached.
   */
  if (
    jobRequest &&
    (
      hasAttachedImage ||
      hasAttachedDocument ||
      verificationRequested
    )
  ) {
    return 'job-verification';
  }

  /*
   * DOCUMENT + VERIFICATION
   */
  if (
    hasAttachedDocument &&
    verificationRequested
  ) {
    return 'document-verification';
  }

  /*
   * IMAGE + VERIFICATION
   *
   * Example:
   * "Is this real?"
   * with an image.
   */
  if (
    hasAttachedImage &&
    verificationRequested
  ) {
    return 'web-verification';
  }

  /*
   * IMAGE WITHOUT VERIFICATION
   *
   * Example:
   * "What is this?"
   * with an image.
   *
   * This MUST go to Gemini Vision.
   */
  if (hasAttachedImage) {
    return 'vision';
  }

  /*
   * DOCUMENT WITHOUT VERIFICATION
   */
  if (hasAttachedDocument) {
    return 'document';
  }

  /*
   * NORMAL CHAT
   */
  return 'reply';
}

/* =========================================================
   CONVERSATION CONTEXT
========================================================= */

function buildConversationContext(
  context: AIReplyContextMessage[]
): string {
  return context
    .slice(-5)
    .map((message) => {
      const sender =
        String(
          message.sender || 'User'
        ).trim();

      const content =
        String(
          message.content || ''
        ).trim();

      if (!content) {
        return '';
      }

      return `${sender}: ${content}`;
    })
    .filter(Boolean)
    .join('\n');
}

/* =========================================================
   NORMAL CHAT PROMPT
========================================================= */

function buildNormalReplyPrompt(
  options: AIReplyOptions
): string {
  const {
    context,
    userMessage,
    tone = 'casual',
    maxLength = 150,
  } = options;

  const toneInstruction = {
    professional:
      'Write professionally, clearly and politely.',

    casual:
      'Write naturally and casually like a real person texting.',

    friendly:
      'Write warmly, naturally and friendly.',
  }[tone];

  return `
You are FaceMeX AI.

Help the user with their latest message.

Recent conversation:
${
  buildConversationContext(context) ||
  '(No previous conversation)'
}

Latest message:
"${userMessage}"

Tone:
${toneInstruction}

Rules:
- Answer the user's actual question.
- Do not give a generic FaceMeX introduction unless the user asks about FaceMeX.
- Do not say "What can I help you with today?" unless the user explicitly asks what you can do.
- Do not repeat a generic list of FaceMeX features.
- Return ONLY the answer.
- Do not explain your reasoning.
- Do not mention that you are an AI unless relevant.
- Do not use quotation marks around the answer.
- Keep it natural.
- Keep it concise.
- Do not ask unnecessary questions.
- Maximum ${maxLength} characters.
`;
}

/* =========================================================
   IMAGE / VISION PROMPT
========================================================= */

function buildVisionPrompt(
  options: AIReplyOptions
): string {
  return `
You are FaceMeX AI's visual analysis assistant.

The user has attached an image.

YOU MUST ANALYZE THE ACTUAL ATTACHED IMAGE BEFORE ANSWERING.

User's question:
"${options.userMessage}"

Instructions:

1. Carefully inspect the image.
2. Identify what the image actually contains.
3. Read visible text when possible.
4. Extract important information from the image.
5. Do not invent information that cannot be seen.
6. If text is blurry or unreadable, say so.
7. If the image is a job advertisement, identify:
   - Job title
   - Employer/institution
   - Location
   - Requirements
   - Closing date
   - Reference number
   - Application instructions
   - Any website, email or phone number visible
8. If the user only asks "What is this?", explain what the image appears to be.
9. If the image contains a job advertisement, explain that it appears to be a vacancy/job advertisement.
10. Do not claim that a job is legitimate based only on its appearance.
11. If legitimacy needs checking, explain that external verification is required.
12. Never invent an official source or application website.

Return a useful, direct answer to the user's question.
`;
}

/* =========================================================
   DOCUMENT PROMPT
========================================================= */

function buildDocumentPrompt(
  options: AIReplyOptions
): string {
  return `
You are FaceMeX AI's document analysis assistant.

The user attached a document.

User's question:
"${options.userMessage}"

Rules:

- Analyze the actual document.
- Use the document contents.
- Do not invent missing information.
- Accurately handle dates, names, numbers, tables and requirements.
- If asked to summarize, summarize the document.
- If asked to explain something, explain it clearly.
- If asked to identify a job, extract the job information.
- If asked whether the document is legitimate, do not determine legitimacy from appearance alone.
- Explain what requires external verification.
- If information is unreadable, clearly say so.

Return a clear and useful answer.
`;
}

/* =========================================================
   JOB / WEB VERIFICATION PROMPT
========================================================= */

function buildVerificationPrompt(
  options: AIReplyOptions
): string {
  return `
You are FaceMeX Verification AI.

The user wants information verified using current web sources.

User request:
"${options.userMessage}"

IMPORTANT:

You may have an attached image or document.

Your job is to:

1. Analyze the supplied image or document.

2. Extract useful identifying information.

3. Identify:
   - Organization
   - Company
   - Institution
   - Employer
   - Job title
   - Reference number
   - Dates
   - Location
   - Website
   - Email address
   - Phone number
   - Application information

4. Use CURRENT WEB SEARCH to verify the information.

5. Prefer authoritative sources such as:
   - Government websites
   - Official company websites
   - Official university websites
   - Official school websites
   - Official recruitment portals
   - Official institutional websites

6. Compare the attachment against current web sources.

7. Clearly distinguish between:
   - What the attachment says
   - What the web sources say
   - What is confirmed
   - What could not be confirmed

8. NEVER call a job legitimate merely because the poster looks professional.

9. NEVER invent a source.

10. NEVER invent an application URL.

11. If no authoritative matching source can be found, say:
   "Could not independently verify."

12. If the information conflicts with an official source, clearly identify the mismatch.

13. Do not claim certainty beyond the available evidence.

For job advertisements, identify:

- Employer/institution
- Position
- Location
- Closing date
- Reference number
- Requirements
- Application method
- Official listing
- Official source
- Any mismatch between the attachment and official source

Use careful verification language such as:

"Confirmed by official source."

"Matching official listing found."

"Could not independently verify."

"Details do not match the official source."

"Needs further verification."

"Official source not found."

IMPORTANT:

Do not treat search-engine results alone as proof of legitimacy.

Prefer the original official organization or institution.

Return the evidence and source information when available.
`;
}

/* =========================================================
   MAIN AI FUNCTION
========================================================= */

export async function generateAIReply(
  options: AIReplyOptions
): Promise<string> {

  const maxLength =
    options.maxLength ?? 150;

  const requestType =
    determineRequestType(options);

  let prompt: string;

  switch (requestType) {

    case 'vision':
      prompt =
        buildVisionPrompt(options);
      break;

    case 'document':
      prompt =
        buildDocumentPrompt(options);
      break;

    case 'job-verification':
    case 'document-verification':
    case 'web-verification':
      prompt =
        buildVerificationPrompt(options);
      break;

    case 'reply':
    default:
      prompt =
        buildNormalReplyPrompt(options);
      break;
  }

  const isVerification =
    requestType ===
      'job-verification' ||
    requestType ===
      'document-verification' ||
    requestType ===
      'web-verification';

  const imageAttached =
    hasImage(options.image);

  const documentAttached =
    hasDocument(options.document);

  /*
   * Build payload.
   */
  const payload = {

    prompt,

    message:
      options.userMessage,

    context:
      options.context,

    type:
      requestType,

    verify:
      Boolean(options.verify) ||
      isVerification,

    maxLength,

    image:
      imageAttached
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

    document:
      documentAttached
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
  };

  /* =======================================================
     CRITICAL ROUTING
     
     This is the part that fixes your current problem.
  ======================================================= */

  let endpoint =
    '/api/ai/reply';

  switch (requestType) {

    /*
     * NORMAL CHAT
     *
     * Backend should use:
     * Groq → Gemini fallback → Cerebras →
     * OpenRouter → DeepSeek
     */
    case 'reply':

      endpoint =
        '/api/ai/reply';

      break;

    /*
     * IMAGE ANALYSIS
     *
     * Backend should send this to Gemini Vision.
     */
    case 'vision':

      endpoint =
        '/api/ai/image-analysis';

      break;

    /*
     * JOB VERIFICATION
     *
     * Backend should use:
     * Gemini Vision + Google Search.
     */
    case 'job-verification':

      endpoint =
        '/api/ai/job-verification';

      break;

    /*
     * DOCUMENT VERIFICATION
     *
     * Send through verification route so
     * the backend can use current web sources.
     */
    case 'document-verification':

      endpoint =
        '/api/ai/job-verification';

      break;

    /*
     * IMAGE + WEB VERIFICATION
     */
    case 'web-verification':

      endpoint =
        '/api/ai/job-verification';

      break;

    /*
     * DOCUMENT
     *
     * Keep this on the existing AI reply route
     * unless your backend has a dedicated document
     * analysis endpoint.
     */
    case 'document':

      endpoint =
        '/api/ai/reply';

      break;

    default:

      endpoint =
        '/api/ai/reply';

      break;
  }

  /* =======================================================
     DEBUG LOGGING
  ======================================================= */

  console.log(
    '========================================'
  );

  console.log(
    'FaceMeX AI request'
  );

  console.log(
    'Request type:',
    requestType
  );

  console.log(
    'Endpoint:',
    endpoint
  );

  console.log(
    'Image attached:',
    imageAttached
  );

  console.log(
    'Document attached:',
    documentAttached
  );

  console.log(
    'Verification:',
    isVerification
  );

  console.log(
    'User message:',
    options.userMessage
  );

  console.log(
    '========================================'
  );

  /* =======================================================
     SEND REQUEST
  ======================================================= */

  try {

    const data =
      await api.post(
        endpoint,
        payload
      );

    console.log(
      'FaceMeX AI response:',
      data
    );

    /*
     * Support multiple response formats.
     */
    let reply =
      String(
        data?.text ??
        data?.reply ??
        data?.content ??
        data?.message ??
        ''
      ).trim();

    /*
     * Some backends may return:
     *
     * {
     *   success: true,
     *   response: "..."
     * }
     *
     * Support that too.
     */
    if (!reply) {

      reply =
        String(
          data?.response ??
          data?.answer ??
          data?.result ??
          ''
        ).trim();
    }

    if (!reply) {

      throw new Error(
        'The AI service returned an empty response.'
      );
    }

    /* =====================================================
       CLEAN RESPONSE
    ===================================================== */

    reply =
      reply
        .replace(
          /^```(?:text|markdown)?/i,
          ''
        )
        .replace(
          /```$/i,
          ''
        )
        .replace(
          /^["']/,
          ''
        )
        .replace(
          /["']$/,
          ''
        )
        .trim();

    /* =====================================================
       VERIFICATION
       
       NEVER TRUNCATE.
    ===================================================== */

    if (isVerification) {
      return reply;
    }

    /* =====================================================
       VISION
       
       NEVER TRUNCATE.
       
       The user needs to see the actual analysis.
    ===================================================== */

    if (
      requestType === 'vision'
    ) {
      return reply;
    }

    /* =====================================================
       DOCUMENT
       
       NEVER TRUNCATE.
    ===================================================== */

    if (
      requestType === 'document'
    ) {
      return reply;
    }

    /* =====================================================
       NORMAL CHAT
       
       Keep normal replies short.
    ===================================================== */

    if (
      reply.length <= maxLength
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
      '========================================'
    );

    console.error(
      'FaceMeX AI request FAILED'
    );

    console.error(
      'Endpoint:',
      endpoint
    );

    console.error(
      'Request type:',
      requestType
    );

    console.error(
      'Error:',
      error
    );

    console.error(
      '========================================'
    );

    let details =
      'Please try again.';

    if (
      error instanceof Error &&
      error.message
    ) {

      try {

        const parsed =
          JSON.parse(
            error.message
          );

        details =
          parsed?.error ||
          parsed?.message ||
          parsed?.details ||
          error.message;

      } catch {

        details =
          error.message;
      }
    }

    throw new Error(
      `Failed to generate FaceMeX AI response. ${details}`
    );
  }
}
