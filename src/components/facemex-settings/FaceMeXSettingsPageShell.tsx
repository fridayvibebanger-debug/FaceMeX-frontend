import { ArrowLeft, Check } from 'lucide-react';
import type { ReactNode } from 'react';
import './FaceMeXSettingsPageShell.css';

type Props = {
  title: string;
  onBack: () => void;
  children: ReactNode;
  onSave?: () => void;
  saveDisabled?: boolean;
  saving?: boolean;
  variant?: 'legacy' | 'plus';
};

export default function FaceMeXSettingsPageShell({
  title,
  onBack,
  children,
  onSave,
  saveDisabled = false,
  saving = false,
  variant = 'legacy',
}: Props) {
  return (
    <main className={`fm-settings-page${variant === 'plus' ? ' fm-settings-page-plus' : ''}`}>
      <div className="fm-settings-page-content">
        <header className="fm-settings-page-header">
          {variant === 'plus' ? (
            <>
              <div className="fm-settings-page-heading">
                <p>FaceMeX account</p>
                <h1>{title}</h1>
              </div>
              {onSave ? (
                <button
                  type="button"
                  className="fm-settings-header-save"
                  onClick={onSave}
                  disabled={saveDisabled || saving}
                  aria-label={saving ? 'Saving settings' : 'Save settings'}
                  title={saving ? 'Saving…' : 'Save changes'}
                >
                  <Check aria-hidden="true" />
                  <span>{saving ? 'Saving…' : 'Save changes'}</span>
                </button>
              ) : (
                <button type="button" className="fm-settings-header-back" onClick={onBack}>
                  <ArrowLeft aria-hidden="true" />
                  <span>Settings</span>
                </button>
              )}
            </>
          ) : (
            <>
              <button type="button" className="fm-settings-header-action" onClick={onBack} aria-label="Go back">
                <ArrowLeft aria-hidden="true" />
              </button>
              <h1>{title}</h1>
              {onSave ? (
                <button
                  type="button"
                  className="fm-settings-header-action"
                  onClick={onSave}
                  disabled={saveDisabled || saving}
                  aria-label={saving ? 'Saving settings' : 'Save settings'}
                  title={saving ? 'Saving…' : 'Save changes'}
                >
                  <Check aria-hidden="true" />
                </button>
              ) : (
                <span className="fm-settings-header-spacer" aria-hidden="true" />
              )}
            </>
          )}
        </header>
        <div className="fm-settings-page-body">{children}</div>
      </div>
    </main>
  );
}
