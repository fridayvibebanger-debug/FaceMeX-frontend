import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, LoaderCircle, Mail, RefreshCw, Send, Sparkles, Unlink } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';

type EmailDraft = {
  to: string;
  recipientName: string;
  subject: string;
  message: string;
};

type GmailStatus = {
  connected: boolean;
  needsReauth: boolean;
  connectedAt: string | null;
};

const EMPTY_STATUS: GmailStatus = {
  connected: false,
  needsReauth: false,
  connectedAt: null,
};

const darkInputClassName = 'border-[#444] bg-[#202020] text-[#f5f5f5] placeholder:text-[#777] focus-visible:ring-white';
const facemexSecondaryButtonClassName = 'h-10 rounded-lg !border !border-[#444] !bg-[#202020] text-sm font-medium !text-[#f5f5f5] hover:!bg-[#282828] hover:!text-[#f5f5f5]';
const facemexPrimaryButtonClassName = 'h-10 rounded-lg !bg-white text-sm font-medium !text-[#202123] hover:!bg-[#e5e5e5] hover:!text-[#202123]';

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function EmailAssistantPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [prompt, setPrompt] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [editing, setEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [gmailStatus, setGmailStatus] = useState(EMPTY_STATUS);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmation, setConfirmation] = useState<EmailDraft | null>(null);
  const [sendKey, setSendKey] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sentMessageId, setSentMessageId] = useState('');
  const sendKeyRef = useRef('');

  const loadGmailStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const status = await api.get('/api/email/google/status') as GmailStatus;
      setGmailStatus({
        connected: Boolean(status.connected),
        needsReauth: Boolean(status.needsReauth),
        connectedAt: status.connectedAt || null,
      });
    } catch (error) {
      setGmailStatus(EMPTY_STATUS);
      toast({ title: 'Gmail status unavailable', description: messageFromError(error) });
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    void loadGmailStatus();
  }, [loadGmailStatus]);

  useEffect(() => {
    const result = searchParams.get('gmail');
    if (!result) return;

    if (result === 'connected') {
      toast({ title: 'Gmail connected', description: 'You can now review and send emails through Gmail.' });
      void loadGmailStatus();
    } else if (result === 'cancelled') {
      toast({ title: 'Gmail connection cancelled', description: 'No Gmail account was connected.' });
    } else {
      toast({ title: 'Gmail connection failed', description: 'Check the Google Cloud and Render OAuth settings, then try again.' });
    }

    const next = new URLSearchParams(searchParams);
    next.delete('gmail');
    setSearchParams(next, { replace: true });
  }, [loadGmailStatus, searchParams, setSearchParams]);

  const generateDraft = async () => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      toast({ title: 'Describe your email', description: 'Tell FaceMeX what you want the email to say.' });
      return;
    }
    if (recipientEmail.trim() && !isValidEmail(recipientEmail)) {
      toast({ title: 'Check the recipient address', description: 'Enter a valid email address or leave it blank.' });
      return;
    }

    setGenerating(true);
    setSendError('');
    setSentMessageId('');
    try {
      const result = await api.post('/api/email/generate', {
        prompt: cleanPrompt,
        recipientEmail: recipientEmail.trim(),
        recipientName: recipientName.trim(),
      }) as { draft?: { recipientEmail?: string | null; recipientName?: string | null; subject: string; body: string; signature?: string } };
      if (!result?.draft) throw new Error('The email assistant returned an invalid draft.');
      const message = [result.draft.body, result.draft.signature]
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .join('\n\n');
      setDraft({
        to: result.draft.recipientEmail || '',
        recipientName: result.draft.recipientName || '',
        subject: result.draft.subject,
        message,
      });
      setEditing(false);
    } catch (error) {
      toast({ title: 'Email generation failed', description: messageFromError(error) });
    } finally {
      setGenerating(false);
    }
  };

  const connectGmail = async () => {
    setConnecting(true);
    try {
      const result = await api.get('/api/email/google/connect') as { authorizationUrl?: string };
      const authorizationUrl = result.authorizationUrl;
      if (!authorizationUrl || new URL(authorizationUrl).origin !== 'https://accounts.google.com') {
        throw new Error('The Gmail authorization link was invalid.');
      }
      window.location.assign(authorizationUrl);
    } catch (error) {
      toast({ title: 'Could not connect Gmail', description: messageFromError(error) });
      setConnecting(false);
    }
  };

  const disconnectGmail = async () => {
    setDisconnecting(true);
    try {
      const result = await api.post('/api/email/google/disconnect') as { revocationWarning?: boolean };
      setGmailStatus(EMPTY_STATUS);
      toast({
        title: 'Gmail disconnected',
        description: result.revocationWarning
          ? 'FaceMeX removed its saved connection, but Google did not confirm revocation. You can also remove access from your Google Account.'
          : 'FaceMeX no longer has access to this Gmail account.',
      });
    } catch (error) {
      toast({ title: 'Could not disconnect Gmail', description: messageFromError(error) });
    } finally {
      setDisconnecting(false);
    }
  };

  const updateDraft = (field: keyof EmailDraft, value: string) => {
    setDraft((current) => current ? { ...current, [field]: value } : current);
    setSentMessageId('');
  };

  const cancelDraft = () => {
    setDraft(null);
    setEditing(false);
    setConfirmation(null);
    setSendError('');
    setSendKey('');
    sendKeyRef.current = '';
    setSentMessageId('');
  };

  const requestConfirmation = () => {
    if (!draft) return;
    if (!isValidEmail(draft.to)) {
      toast({ title: 'Check the recipient address', description: 'Enter a valid email address before sending.' });
      setEditing(true);
      return;
    }
    if (!draft.subject.trim() || !draft.message.trim()) {
      toast({ title: 'Complete the email', description: 'A subject and message are required before sending.' });
      setEditing(true);
      return;
    }
    setSendError('');
    setSendKey('');
    sendKeyRef.current = '';
    setConfirmation({ ...draft });
  };

  const confirmAndSend = async () => {
    if (!confirmation || !gmailStatus.connected) return;
    const key = sendKeyRef.current || crypto.randomUUID();
    sendKeyRef.current = key;
    setSendKey(key);
    setSending(true);
    setSendError('');
    try {
      const result = await api.post('/api/email/send', {
        confirmed: true,
        idempotencyKey: key,
        ...confirmation,
      }) as { messageId?: string };
      setSentMessageId(result.messageId || 'sent');
      setConfirmation(null);
      setSendKey('');
      sendKeyRef.current = '';
      toast({ title: 'Email sent', description: 'Gmail accepted your message.' });
    } catch (error) {
      setSendError(`${messageFromError(error)} This confirmation will not send again with different content.`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 h-[100dvh] overflow-y-auto overscroll-contain bg-[#0d0d0d] text-white">
      <main className="mx-auto w-full max-w-5xl px-4 pb-[max(env(safe-area-inset-bottom),2rem)] pt-[max(env(safe-area-inset-top),1.25rem)] md:px-6 md:pt-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-[#aaa]">
              <Sparkles className="h-4 w-4 text-[#ddd]" />
              FaceMeX AI
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Email Assistant</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#aaa]">
              Draft professional emails, review every detail, and send only after you confirm the exact message.
            </p>
          </div>

          <Card className="w-full border-[#333] bg-[#171717] text-[#f5f5f5] shadow-none sm:max-w-sm">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-4 w-4" />
                  Gmail
                </div>
                <p className="mt-1 text-xs text-[#aaa]">
                  {loadingStatus
                    ? 'Checking connection…'
                    : gmailStatus.connected
                      ? 'Connected securely'
                      : gmailStatus.needsReauth
                        ? 'Reconnect to continue'
                        : 'Not connected'}
                </p>
              </div>
              {gmailStatus.connected ? (
                <Button type="button" size="sm" variant="outline" className={facemexSecondaryButtonClassName} onClick={disconnectGmail} disabled={disconnecting}>
                  {disconnecting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Unlink className="mr-2 h-4 w-4" />}
                  Disconnect
                </Button>
              ) : (
                <Button type="button" size="sm" className={facemexPrimaryButtonClassName} onClick={connectGmail} disabled={connecting || loadingStatus}>
                  {connecting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                  Connect Gmail
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card className="border-[#333] bg-[#171717] text-[#f5f5f5] shadow-none">
            <CardHeader>
              <CardTitle className="text-lg">What should the email say?</CardTitle>
              <p className="text-sm text-[#aaa]">For applications, enquiries, follow-ups, meetings, academic, or support emails.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-prompt">Instructions</Label>
                <Textarea
                  id="email-prompt"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="For example: Write a polite follow-up after my interview yesterday. Mention that I enjoyed learning about the role."
                  rows={5}
                  maxLength={4000}
                  className={`min-h-32 resize-y ${darkInputClassName}`}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="recipient-email">Recipient email (optional)</Label>
                  <Input
                    id="recipient-email"
                    type="email"
                    autoComplete="email"
                    value={recipientEmail}
                    onChange={(event) => setRecipientEmail(event.target.value)}
                    placeholder="name@example.com"
                    className={darkInputClassName}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipient-name">Recipient name (optional)</Label>
                  <Input
                    id="recipient-name"
                    value={recipientName}
                    onChange={(event) => setRecipientName(event.target.value)}
                    placeholder="Name"
                    maxLength={120}
                    className={darkInputClassName}
                  />
                </div>
              </div>
              <Button type="button" className={`w-full sm:w-auto ${facemexPrimaryButtonClassName}`} onClick={generateDraft} disabled={generating}>
                {generating ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {draft ? 'Regenerate email' : 'Generate email'}
              </Button>
              {!gmailStatus.connected && !loadingStatus && (
                <p className="text-xs leading-5 text-[#aaa]">
                  You can create and edit a draft without connecting Gmail. Connect an account before sending.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-[#333] bg-[#171717] text-[#f5f5f5] shadow-none">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Review your email</CardTitle>
                <p className="mt-1 text-sm text-[#aaa]">Nothing is sent while you generate, edit, or preview.</p>
              </div>
              {draft && (
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  <Button type="button" size="sm" variant="outline" className={facemexSecondaryButtonClassName} onClick={() => setEditing((current) => !current)}>
                    {editing ? 'Preview' : 'Edit'}
                  </Button>
                  <Button type="button" size="sm" variant="outline" className={facemexSecondaryButtonClassName} onClick={generateDraft} disabled={generating}>
                    <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
                    Regenerate
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {!draft ? (
                <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#444] px-6 text-center">
                  <Mail className="h-8 w-8 text-[#777]" />
                  <p className="mt-3 text-sm font-medium">Your draft will appear here</p>
                  <p className="mt-1 max-w-xs text-xs leading-5 text-[#aaa]">Enter instructions and generate a draft. You stay in control of every field.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="draft-to">To</Label>
                    {editing ? (
                      <Input id="draft-to" type="email" value={draft.to} onChange={(event) => updateDraft('to', event.target.value)} placeholder="name@example.com" className={darkInputClassName} />
                    ) : (
                      <p className="min-h-10 rounded-lg border border-[#333] bg-[#202020] px-3 py-2 text-sm">
                        {draft.recipientName ? `${draft.recipientName} ` : ''}{draft.to || 'Recipient address required'}
                      </p>
                    )}
                  </div>
                  {editing && (
                    <div className="space-y-2">
                      <Label htmlFor="draft-recipient-name">Recipient name (optional)</Label>
                      <Input id="draft-recipient-name" value={draft.recipientName} onChange={(event) => updateDraft('recipientName', event.target.value)} maxLength={120} className={darkInputClassName} />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="draft-subject">Subject</Label>
                    {editing ? (
                      <Input id="draft-subject" value={draft.subject} onChange={(event) => updateDraft('subject', event.target.value)} maxLength={250} className={darkInputClassName} />
                    ) : (
                      <p className="min-h-10 rounded-lg border border-[#333] bg-[#202020] px-3 py-2 text-sm">{draft.subject}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="draft-message">Message</Label>
                    {editing ? (
                      <Textarea id="draft-message" value={draft.message} onChange={(event) => updateDraft('message', event.target.value)} rows={11} maxLength={30000} className={`min-h-64 resize-y ${darkInputClassName}`} />
                    ) : (
                      <div id="draft-message" className="min-h-64 whitespace-pre-wrap rounded-lg border border-[#333] bg-[#202020] px-3 py-3 text-sm leading-6">
                        {draft.message}
                      </div>
                    )}
                  </div>
                  {sentMessageId && (
                    <p role="status" className="flex items-center gap-2 text-sm text-emerald-300">
                      <Check className="h-4 w-4" />
                      Sent successfully.
                    </p>
                  )}
                  <div className="flex flex-col-reverse gap-2 border-t border-[#333] pt-4 sm:flex-row sm:justify-between">
                    <Button type="button" variant="ghost" className="h-10 rounded-lg text-[#ddd] hover:bg-[#222] hover:text-[#f5f5f5]" onClick={cancelDraft}>Cancel</Button>
                    <Button type="button" className={facemexPrimaryButtonClassName} onClick={requestConfirmation} disabled={!gmailStatus.connected || editing || sending}>
                      <Send className="mr-2 h-4 w-4" />
                      Confirm and Send
                    </Button>
                  </div>
                  {!gmailStatus.connected && (
                    <p className="text-xs text-amber-300">Connect Gmail before sending this draft.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => {
          if (!open && !sending) {
            setConfirmation(null);
            setSendError('');
          }
        }}
      >
        <DialogContent className="max-h-[90vh] w-[calc(100%-1rem)] overflow-y-auto border-[#333] bg-[#171717] text-[#f5f5f5] sm:max-w-2xl [&>button]:text-[#ddd]">
          <DialogHeader>
            <DialogTitle>Confirm this exact email</DialogTitle>
            <DialogDescription>Review the recipient, subject, and full message below. FaceMeX will send only this version after you choose Send email.</DialogDescription>
          </DialogHeader>
          {confirmation && (
            <div className="space-y-3 rounded-xl border border-[#333] bg-[#202020] p-4 text-sm">
              <p className="break-all">
                <span className="font-medium">To:</span>{' '}
                {confirmation.recipientName ? `${confirmation.recipientName} <${confirmation.to}>` : confirmation.to}
              </p>
              <p className="break-words"><span className="font-medium">Subject:</span> {confirmation.subject}</p>
              <div>
                <p className="font-medium">Message:</p>
                <p className="mt-1 max-h-64 overflow-y-auto whitespace-pre-wrap break-words leading-6">{confirmation.message}</p>
              </div>
            </div>
          )}
          {sendError && <p role="alert" className="text-sm text-red-300">{sendError}</p>}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className={facemexSecondaryButtonClassName} onClick={() => setConfirmation(null)} disabled={sending}>Go back</Button>
            <Button type="button" className={facemexPrimaryButtonClassName} onClick={confirmAndSend} disabled={sending || !gmailStatus.connected}>
              {sending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {sendKey ? 'Retry same confirmation' : 'Send email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
