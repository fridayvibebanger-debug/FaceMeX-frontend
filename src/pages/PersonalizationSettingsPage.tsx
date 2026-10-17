import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import FaceMeXSettingsPageShell from '@/components/facemex-settings/FaceMeXSettingsPageShell';
import { useFaceMeXSettings } from '@/hooks/useFaceMeXSettings';
import type { FaceMeXPersonalizationSettings } from '@/types/facemexSettings';

function safeReturnPath(from: unknown, currentPath: string) {
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && from !== currentPath
    ? from
    : '/ai/settings';
}

export default function PersonalizationSettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings, loading, loaded, saving, error, saved, reload, update, clearSaved } = useFaceMeXSettings();
  const [draft, setDraft] = useState<FaceMeXPersonalizationSettings>(settings.personalization);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings.personalization);

  useEffect(() => {
    if (loaded) setDraft(settings.personalization);
  }, [loaded, settings.personalization]);

  useEffect(() => {
    if (!dirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [dirty]);

  const change = <Field extends keyof FaceMeXPersonalizationSettings>(
    field: Field,
    value: FaceMeXPersonalizationSettings[Field],
  ) => setDraft((current) => ({ ...current, [field]: value }));

  const goBack = () => {
    if (dirty && !window.confirm('Discard your unsaved personalization changes?')) return;
    navigate(safeReturnPath((location.state as { from?: unknown } | null)?.from, location.pathname));
  };

  const save = async () => {
    clearSaved();
    await update({ ...settings, personalization: draft });
  };

  const loadingError = error && !loaded;

  return (
    <FaceMeXSettingsPageShell
      title="Personalization"
      onBack={goBack}
      onSave={() => void save()}
      saveDisabled={!dirty || loading || !loaded}
      saving={saving}
    >
      {loading && !loaded ? (
        <div className="fm-settings-info-card" role="status">Loading your saved personalization…</div>
      ) : loadingError ? (
        <div className="fm-settings-control-section">
          <p className="fm-settings-error" role="alert">{error}</p>
          <button type="button" className="fm-settings-action" onClick={() => void reload()}>Try again</button>
        </div>
      ) : (
        <>
          <section className="fm-settings-control-section" aria-labelledby="fm-personalization-style">
            <h2 id="fm-personalization-style" className="fm-settings-section-title">Base style and tone</h2>
            <div className="fm-settings-control">
              <label htmlFor="fm-response-style" className="fm-settings-control-label">Response style</label>
              <select
                id="fm-response-style"
                className="fm-settings-select"
                value={draft.responseStyle}
                disabled={saving}
                onChange={(event) => change('responseStyle', event.target.value as FaceMeXPersonalizationSettings['responseStyle'])}
              >
                <option value="default">Default</option>
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="concise">Concise</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>
          </section>

          <section className="fm-settings-control-section" aria-labelledby="fm-personalization-formatting">
            <h2 id="fm-personalization-formatting" className="fm-settings-section-title">Headers and lists</h2>
            <div className="fm-settings-control">
              <label htmlFor="fm-response-formatting" className="fm-settings-control-label">Formatting</label>
              <select
                id="fm-response-formatting"
                className="fm-settings-select"
                value={draft.formatting}
                disabled={saving}
                onChange={(event) => change('formatting', event.target.value as FaceMeXPersonalizationSettings['formatting'])}
              >
                <option value="standard">Default</option>
                <option value="headers-and-lists">Headers and lists</option>
                <option value="minimal">Minimal</option>
              </select>
            </div>
          </section>

          <section className="fm-settings-control-section" aria-labelledby="fm-personalization-emoji">
            <h2 id="fm-personalization-emoji" className="fm-settings-section-title">Emoji</h2>
            <div className="fm-settings-control">
              <label htmlFor="fm-emoji-usage" className="fm-settings-control-label">Emoji usage</label>
              <select
                id="fm-emoji-usage"
                className="fm-settings-select"
                value={draft.emojiUsage}
                disabled={saving}
                onChange={(event) => change('emojiUsage', event.target.value as FaceMeXPersonalizationSettings['emojiUsage'])}
              >
                <option value="never">Never</option>
                <option value="sometimes">Sometimes</option>
                <option value="often">Often</option>
              </select>
            </div>
          </section>

          <section className="fm-settings-control-section" aria-labelledby="fm-custom-instructions">
            <h2 id="fm-custom-instructions" className="fm-settings-section-title">Custom instructions</h2>
            <textarea
              className="fm-settings-textarea"
              value={draft.preferences}
              maxLength={2000}
              disabled={saving}
              onChange={(event) => change('preferences', event.target.value)}
              placeholder="What would you like FaceMeX to know or keep in mind when responding?"
              aria-label="Custom instructions"
            />
            <p className="fm-settings-explainer">
              Saved to your FaceMeX account and included as context in supported AI workspace requests.
              {draft.preferences.length}/2000
            </p>
          </section>

          <section className="fm-settings-control-section" aria-labelledby="fm-personalization-advanced">
            <button
              type="button"
              className="fm-settings-advanced-trigger fm-settings-advanced"
              aria-expanded={advancedOpen}
              aria-controls="fm-personalization-advanced-fields"
              onClick={() => setAdvancedOpen((open) => !open)}
            >
              <span id="fm-personalization-advanced">Advanced</span>
              <ChevronDown aria-hidden="true" />
            </button>
            {advancedOpen && (
              <div id="fm-personalization-advanced-fields" className="fm-settings-advanced-content fm-settings-advanced">
                <label className="fm-settings-field">
                  Set up FaceMeX for
                  <select
                    value={draft.audience}
                    disabled={saving}
                    onChange={(event) => change('audience', event.target.value as FaceMeXPersonalizationSettings['audience'])}
                  >
                    <option value="individual">Myself</option>
                    <option value="organization">Company or team</option>
                  </select>
                </label>
                <label className="fm-settings-field">
                  {draft.audience === 'organization' ? 'Company or team name' : 'Name'}
                  <input
                    value={draft.name}
                    maxLength={80}
                    disabled={saving}
                    onChange={(event) => change('name', event.target.value)}
                    placeholder={draft.audience === 'organization' ? 'Company or team' : 'Name'}
                  />
                </label>
                <label className="fm-settings-field">
                  Role
                  <input
                    value={draft.role}
                    maxLength={120}
                    disabled={saving}
                    onChange={(event) => change('role', event.target.value)}
                    placeholder="Work, study, or role"
                  />
                </label>
                <label className="fm-settings-field">
                  Goals
                  <textarea
                    value={draft.goals}
                    maxLength={1000}
                    disabled={saving}
                    onChange={(event) => change('goals', event.target.value)}
                    placeholder="Goals, projects, or challenges"
                  />
                </label>
                <label className="fm-settings-field">
                  Warmth
                  <select
                    value={draft.warmth}
                    disabled={saving}
                    onChange={(event) => change('warmth', event.target.value as FaceMeXPersonalizationSettings['warmth'])}
                  >
                    <option value="low">Low</option>
                    <option value="balanced">Balanced</option>
                    <option value="high">High</option>
                  </select>
                </label>
                <label className="fm-settings-field">
                  Enthusiasm
                  <select
                    value={draft.enthusiasm}
                    disabled={saving}
                    onChange={(event) => change('enthusiasm', event.target.value as FaceMeXPersonalizationSettings['enthusiasm'])}
                  >
                    <option value="low">Low</option>
                    <option value="balanced">Balanced</option>
                    <option value="high">High</option>
                  </select>
                </label>
              </div>
            )}
          </section>

          <p className="fm-settings-notice">
            Fast answers and rich-response controls are not available as account preferences in the current FaceMeX AI settings.
          </p>
          {error && <p className="fm-settings-error" role="alert">{error}</p>}
          <p className="fm-settings-status" role="status" aria-live="polite">
            {saving ? 'Saving your changes…' : saved && !dirty ? 'Your changes are saved.' : ''}
          </p>
        </>
      )}
    </FaceMeXSettingsPageShell>
  );
}
