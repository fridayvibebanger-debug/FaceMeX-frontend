import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

type ExportRow = Record<string, unknown>;

const EXPORT_PAGE_SIZE = 500;

async function fetchAllPages(
  readPage: (from: number, to: number) => PromiseLike<{ data: ExportRow[] | null; error: { message: string } | null }>,
): Promise<ExportRow[]> {
  const rows: ExportRow[] = [];
  for (let offset = 0; ; offset += EXPORT_PAGE_SIZE) {
    const { data, error } = await readPage(offset, offset + EXPORT_PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < EXPORT_PAGE_SIZE) return rows;
  }
}

export async function createFaceMeXDataExport() {
  if (!isSupabaseConfigured) throw new Error('Data export needs an active FaceMeX connection. Please try again later.');
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(`Could not verify your account: ${authError.message}`);
  const user = authData.user;
  if (!user) throw new Error('Sign in to export your FaceMeX data.');

  const [profileResult, settingsResult, projects, conversations, documents] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name,avatar_url,professional,tier')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('facemex_user_settings')
      .select('settings,created_at,updated_at')
      .eq('user_id', user.id)
      .maybeSingle(),
    fetchAllPages((from, to) => supabase
      .from('workspace_projects')
      .select('id,name,description,created_at,updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .range(from, to)),
    fetchAllPages((from, to) => supabase
      .from('workspace_conversations')
      .select('id,project_id,title,metadata,created_at,updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .range(from, to)),
    fetchAllPages((from, to) => supabase
      .from('documents')
      .select('id,project_id,document_key,title,document_type,content,metadata,created_at,updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .range(from, to)),
  ]);

  if (profileResult.error) throw new Error(`Could not export your profile: ${profileResult.error.message}`);
  if (settingsResult.error) throw new Error(`Could not export your settings: ${settingsResult.error.message}`);

  const messages: ExportRow[] = [];
  for (let start = 0; start < conversations.length; start += 100) {
    const conversationIds = conversations
      .slice(start, start + 100)
      .map((conversation) => conversation.id)
      .filter((id): id is string => typeof id === 'string');
    if (conversationIds.length === 0) continue;
    const conversationMessages = await fetchAllPages((from, to) => supabase
      .from('workspace_messages')
      .select('id,conversation_id,role,content,metadata,created_at')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: true })
      .range(from, to));
    messages.push(...conversationMessages);
  }

  return {
    format: 'FaceMeX data export',
    version: 1,
    generatedAt: new Date().toISOString(),
    account: {
      email: user.email || null,
      createdAt: user.created_at,
    },
    profile: profileResult.data,
    settings: settingsResult.data,
    workspace: {
      projects,
      conversations,
      messages,
      documents,
    },
    notIncluded: [
      'Social-feed activity and posts',
      'Media or records held by services not exposed through the authenticated FaceMeX data tables',
    ],
  };
}
