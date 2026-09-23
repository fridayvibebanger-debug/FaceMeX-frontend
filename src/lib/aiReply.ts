````ts
/**
 * FaceMeX AI Reply Utility
 *
 * ROUTING:
 *
 * 1. Normal text conversation
 *    -> Groq
 *
 * 2. Image attached
 *    -> Gemini
 *
 * 3. Document attached
 *    -> Gemini
 *
 * 4. Job/document verification
 *    -> Gemini + Google Search
 *
 * IMPORTANT:
 * API keys are NEVER stored in this frontend file.
 * Everything goes through the FaceMeX backend.
 */

import { api } from './api';


// ============================================================
// TYPES
// ============================================================

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

  /**
   * Image attached by the user.
   *
   * Example:
   * data:image/jpeg;base64,/9j/4AAQ...
   */
  image?: AIReplyImage | null;

  /**
   * Document attached by the user.
   */
  document?: AIReplyDocument | null;

  /**
   * Force verification.
   *
   * Useful for:
   * "Is this job real?"
   * "Verify this document"
   * "Is this vacancy legitimate?"
   */
  verify?: boolean;

  /**
   * Explicit request type.
   */
  type?:
    | 'reply'
    | 'vision'
    | 'document'
    | 'job-verification'
    | 'document-verification'
    | 'web-verification';
}


// ============================================================
// HELPERS
// ============================================================

function hasImage(
  image?: AIReplyImage | null
): boolean {
  return !!(
    image &&
    typeof image.data === 'string' &&
    image.data.trim().length > 0
  );
}


function hasDocument(
  document?: AIReplyDocument | null
): boolean {
  return !!(
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


function looksLikeVerificationRequest(
  message: string
): boolean {
  const text = message.toLowerCase();

  const verificationWords = [
    'verify',
    'verification',
    'verify this',
    'is this real',
    'is this legitimate',
    'is this legit',
    'is this genuine',
    'is this fake',
    'is this scam',
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

  return verificationWords.some(
    (word) => text.includes(word)
  );
}


function looksLikeJobRequest(
  message: string
): boolean {
  const text = message.toLowerCase();

  const jobWords = [
    'job',
    'jobs',
    'vacancy',
    'vacancies',
    'employment',
    'hiring',
    'career',
    'careers',
    'position',
    'post available',
    'apply',
    'application',
    'recruitment',
    'recruiting',
    'internship',
    'learnership',
    'work opportunity',
  ];

  return jobWords.some(
    (word) => text.includes(word)
  );
}


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

  // Explicit type always wins.
  if (type) {
    return type;
  }

  const verificationRequested =
    verify ||
    looksLikeVerificationRequest(userMessage);

  const jobRequest =
    looksLikeJobRequest(userMessage);

  // Job + attachment/verification
  if (
    jobRequest &&
    (
      hasImage(image) ||
      hasDocument(document) ||
      verificationRequested
    )
  ) {
    return 'job-verification';
  }

  // Document verification
  if (
    hasDocument(document) &&
    verificationRequested
  ) {
    return 'document-verification';
  }

  // Image verification
  if (
    hasImage(image) &&
    verificationRequested
  ) {
    return 'web-verification';
  }

  // Any image
  if (hasImage(image)) {
    return 'vision';
  }

  // Any document
  if (hasDocument(document)) {
    return 'document';
  }

  // Normal text
  return 'reply';
}


// ============================================================
// PROMPT BUILDERS
// ============================================================

function buildConversationContext(
  context: AIReplyContextMessage[]
): string {

  return context
    .slice(-5)
    .map((message) => {
      const sender =
        String(message.sender || 'User').trim();

      const content =
        String(message.content || '').trim();

      return `${sender}: ${content}`;
    })
    .filter(Boolean)
    .join('\n');
}


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

Help the user write a natural reply to the latest message.

Recent conversation:
${buildConversationContext(context) || '(No previous conversation)'}

Latest message:
"${userMessage}"

Tone:
${toneInstruction}

Rules:
- Return ONLY the reply.
- Do not explain your reasoning.
- Do not mention that you are an AI.
- Do not use quotation marks around the reply.
- Keep it natural.
- Keep it concise.
- Do not ask unnecessary questions.
- Maximum ${maxLength} characters.
`;
}


function buildVisionPrompt(
  options: AIReplyOptions
): string {

  const {
    userMessage,
  } = options;

  return `
You are FaceMeX AI's visual analysis assistant.

The user has attached an image.

IMPORTANT:
You MUST analyze the attached image.

User's question:
"${userMessage}"

Rules:
- Carefully inspect the image.
- Describe what is actually visible.
- Do not invent information that cannot be seen.
- If text appears in the image, read and use it.
- If the image appears to contain a job advertisement, identify that.
- If the image contains potentially sensitive information, avoid unnecessarily repeating private information.
- If the user asks whether something is legitimate, do not declare it legitimate based only on appearance.
- Explain what can and cannot be determined from the image.

Return a useful, concise answer.
`;
}


function buildDocumentPrompt(
  options: AIReplyOptions
): string {

  const {
    userMessage,
  } = options;

  return `
You are FaceMeX AI's document analysis assistant.

The user attached a document.

User's question:
"${userMessage}"

Rules:
- Analyze the supplied document.
- Use the actual document contents.
- Do not invent missing information.
- If the document contains tables, dates, names, numbers or requirements, preserve them accurately.
- If the user asks for a summary, summarize the document.
- If the user asks for an explanation, explain the relevant section.
- If the user asks whether the document is legitimate, do NOT determine legitimacy from appearance alone.
- State what can be verified from the document and what requires external verification.

Return a clear answer.
`;
}


function buildVerificationPrompt(
  options: AIReplyOptions
): string {

  const {
    userMessage,
  } = options;

  return `
You are FaceMeX Verification AI.

The user wants information verified using current web sources.

User request:
"${userMessage}"

IMPORTANT VERIFICATION RULES:

1. Analyze the supplied image/document first.
2. Extract useful identifying information.
3. Identify names, organizations, job titles, reference numbers,
   dates, locations, websites and application information.
4. Use Google Search to find current public sources.
5. Prefer official sources:
   - Government websites
   - Official company websites
   - Official university websites
   - Official recruitment portals
   - Recognized institutional sources
6. Compare the supplied information against the sources.
7. Clearly distinguish:
   - What the attachment says
   - What the web sources say
   - What is confirmed
   - What could not be confirmed
8. NEVER call a job legitimate merely because the poster looks professional.
9. NEVER invent an official source.
10. If no authoritative matching source can be found, say so.
11. Provide source information when available.

For job advertisements specifically:
- Identify employer/institution.
- Identify position.
- Identify location.
- Identify closing date.
- Identify reference number.
- Identify application method.
- Look for the same vacancy on an official source.
- Compare the details.
- Flag mismatches.

Use cautious verification language such as:
"Confirmed by official source"
"Matching official listing found"
"Could not independently verify"
"Details do not match"
"Needs further verification"

Do not claim certainty beyond the evidence.
`;
}


// ============================================================
// MAIN FUNCTION
// ============================================================

export async function generateAIReply(
  options: AIReplyOptions
): Promise<string> {

  const {
    maxLength = 150,
  } = options;

  // ----------------------------------------------------------
  // Determine what kind of request this is.
  // ----------------------------------------------------------

  const requestType =
    determineRequestType(options);

  // ----------------------------------------------------------
  // Build appropriate prompt.
  // ----------------------------------------------------------

  let prompt: string;

  switch (requestType) {

    case 'vision':
      prompt = buildVisionPrompt(options);
      break;

    case 'document':
      prompt = buildDocumentPrompt(options);
      break;

    case 'job-verification':
    case 'document-verification':
    case 'web-verification':
      prompt = buildVerificationPrompt(options);
      break;

    case 'reply':
    default:
      prompt = buildNormalReplyPrompt(options);
      break;
  }


  // ----------------------------------------------------------
  // Build request payload.
  // ----------------------------------------------------------

  const payload = {
    prompt,

    message: options.userMessage,

    context: options.context,

    type: requestType,

    verify:
      options.verify ||
      requestType === 'job-verification' ||
      requestType === 'document-verification' ||
      requestType === 'web-verification',

    maxLength,

    // Send image when present.
    image: hasImage(options.image)
      ? {
          data: options.image!.data,
          mimeType:
            options.image!.mimeType || 'image/jpeg',
          name: options.image!.name,
        }
      : null,

    // Send document when present.
    document: hasDocument(options.document)
      ? {
          data: options.document?.data,
          url: options.document?.url,
          mimeType:
            options.document!.mimeType ||
            'application/pdf',
          name: options.document?.name,
        }
      : null,
  };


  // ----------------------------------------------------------
  // Send EVERYTHING through one backend endpoint.
  // ----------------------------------------------------------

  try {

    const data = await api.post(
      '/api/ai/reply',
      payload
    );


    // --------------------------------------------------------
    // Accept multiple backend response formats.
    // --------------------------------------------------------

    let reply = String(
      data?.text ??
      data?.reply ??
      data?.content ??
      data?.message ??
      ''
    ).trim();


    if (!reply) {
      throw new Error(
        'The AI service returned an empty response.'
      );
    }


    // --------------------------------------------------------
    // Remove accidental formatting.
    // --------------------------------------------------------

    reply = reply
      .replace(/^```(?:text)?/i, '')
      .replace(/```$/i, '')
      .replace(/^["']/, '')
      .replace(/["']$/, '')
      .trim();


    // --------------------------------------------------------
    // For verification requests, DON'T aggressively truncate.
    //
    // A verification response needs room for:
    // - findings
    // - evidence
    // - sources
    //
    // --------------------------------------------------------

    const isVerification =
      requestType === 'job-verification' ||
      requestType === 'document-verification' ||
      requestType === 'web-verification';


    if (isVerification) {
      return reply;
    }


    // --------------------------------------------------------
    // Normal social reply length limit.
    // --------------------------------------------------------

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
      'FaceMeX AI reply failed:',
      error
    );


    let details =
      'Please try again.';


    if (
      error instanceof Error &&
      error.message
    ) {

      try {

        const parsed =
          JSON.parse(error.message);

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
````

