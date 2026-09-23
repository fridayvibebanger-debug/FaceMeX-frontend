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

function looksLikeVerificationRequest(
  message: string
): boolean {
  const text = message.toLowerCase();

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
  ];

  return words.some((word) =>
    text.includes(word)
  );
}

function looksLikeJobRequest(
  message: string
): boolean {
  const text = message.toLowerCase();

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
    'apply',
    'application',
    'recruitment',
    'recruiting',
    'internship',
    'learnership',
    'work opportunity',
  ];

  return words.some((word) =>
    text.includes(word)
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

  if (type) {
    return type;
  }

  const verificationRequested =
    Boolean(verify) ||
    looksLikeVerificationRequest(userMessage);

  const jobRequest =
    looksLikeJobRequest(userMessage);

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

  if (
    hasDocument(document) &&
    verificationRequested
  ) {
    return 'document-verification';
  }

  if (
    hasImage(image) &&
    verificationRequested
  ) {
    return 'web-verification';
  }

  if (hasImage(image)) {
    return 'vision';
  }

  if (hasDocument(document)) {
    return 'document';
  }

  return 'reply';
}

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
  return `
You are FaceMeX AI's visual analysis assistant.

The user has attached an image.

You MUST analyze the attached image before answering.

User's question:
"${options.userMessage}"

Rules:
- Carefully inspect the image.
- Describe only what is actually visible.
- Read visible text when possible.
- Do not invent information.
- If it is a job advertisement, identify the job information visible in the image.
- If the user asks whether something is legitimate, do not claim legitimacy based only on appearance.
- Explain what can and cannot be determined from the image.

Return a useful answer.
`;
}

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
- If asked whether the document is legitimate, do not determine legitimacy from appearance alone.
- Explain what requires external verification.

Return a clear answer.
`;
}

function buildVerificationPrompt(
  options: AIReplyOptions
): string {
  return `
You are FaceMeX Verification AI.

The user wants information verified using current web sources.

User request:
"${options.userMessage}"

IMPORTANT:

1. Analyze the supplied image or document.
2. Extract useful identifying information.
3. Identify organizations, companies, institutions, job titles,
   reference numbers, dates, locations, websites and application
   information.
4. Use current web search to verify the information.
5. Prefer authoritative sources such as:
   - Government websites
   - Official company websites
   - Official university websites
   - Official recruitment portals
   - Official institutional sources
6. Compare the attachment against the sources.
7. Clearly distinguish:
   - What the attachment says
   - What the web sources say
   - What is confirmed
   - What could not be confirmed
8. Never call a job legitimate merely because the poster looks professional.
9. Never invent a source.
10. If no authoritative matching source can be found, say so.
11. Include source information when available.

For job advertisements identify:
- Employer/institution
- Position
- Location
- Closing date
- Reference number
- Application method
- Official listing
- Any mismatch between the attachment and official source

Use careful verification language:

"Confirmed by official source"

"Matching official listing found"

"Could not independently verify"

"Details do not match"

"Needs further verification"

Do not claim certainty beyond the evidence.
`;
}

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

  const payload = {
    prompt,

    message: options.userMessage,

    context: options.context,

    type: requestType,

    verify:
      Boolean(options.verify) ||
      requestType === 'job-verification' ||
      requestType === 'document-verification' ||
      requestType === 'web-verification',

    maxLength,

    image: hasImage(options.image)
      ? {
          data: options.image!.data,
          mimeType:
            options.image!.mimeType || 'image/jpeg',
          name: options.image!.name,
        }
      : null,

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

  try {
    const data = await api.post(
      '/api/ai/reply',
      payload
    );

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

    reply = reply
      .replace(/^```(?:text)?/i, '')
      .replace(/```$/i, '')
      .replace(/^["']/, '')
      .replace(/["']$/, '')
      .trim();

    const isVerification =
      requestType === 'job-verification' ||
      requestType === 'document-verification' ||
      requestType === 'web-verification';

    if (isVerification) {
      return reply;
    }

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
