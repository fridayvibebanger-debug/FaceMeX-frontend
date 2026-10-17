import { useEffect, useState } from 'react';
import { ArrowLeft, Download, Trash2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createFaceMeXDataExport } from '@/services/facemexDataExport';
import './DataControlsPage.css';

type LocationPermission = 'checking' | 'granted' | 'denied' | 'prompt' | 'unknown' | 'unavailable';

function getSafeBackPath(from: unknown, currentPath: string) {
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && from !== currentPath
    ? from
    : '/ai/settings';
}

export default function DataControlsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [locationPermission, setLocationPermission] = useState<LocationPermission>('checking');
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [exportError, setExportError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    let active = true;
    let permissionStatus: PermissionStatus | undefined;
    let onPermissionChange: (() => void) | undefined;

    if (!navigator.permissions?.query) {
      setLocationPermission(navigator.geolocation ? 'unknown' : 'unavailable');
      return;
    }

    void navigator.permissions.query({ name: 'geolocation' })
      .then((status) => {
        permissionStatus = status;
        onPermissionChange = () => {
          if (active) setLocationPermission(status.state);
        };
        onPermissionChange();
        status.addEventListener('change', onPermissionChange);
      })
      .catch(() => {
        if (active) setLocationPermission(navigator.geolocation ? 'unknown' : 'unavailable');
      });

    return () => {
      active = false;
      if (permissionStatus && onPermissionChange) {
        permissionStatus.removeEventListener('change', onPermissionChange);
      }
    };
  }, []);

  useEffect(() => {
    if (!deleteDialogOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDeleteDialogOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [deleteDialogOpen]);

  const goBack = () => {
    navigate(getSafeBackPath((location.state as { from?: unknown } | null)?.from, location.pathname));
  };

  const exportData = async () => {
    if (exporting) return;
    setExporting(true);
    setExportMessage('');
    setExportError('');
    try {
      const data = await createFaceMeXDataExport();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = `facemex-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      const recordCount = data.workspace.projects.length
        + data.workspace.conversations.length
        + data.workspace.messages.length
        + data.workspace.documents.length;
      setExportMessage(recordCount
        ? `Export downloaded with ${recordCount} workspace records and available profile and settings data.`
        : 'Export downloaded. No saved workspace records were found; available profile and settings data are included.');
    } catch (error) {
      console.error('FaceMeX data export failed', error);
      setExportError(error instanceof Error ? error.message : 'Could not export your data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const locationStatus = locationPermission === 'granted'
    ? 'On'
    : locationPermission === 'denied'
      ? 'Off'
      : locationPermission === 'prompt'
        ? 'Not set'
        : locationPermission === 'checking'
          ? 'Checking…'
          : 'Unavailable';

  return (
    <main className="dc-page">
      <div className="dc-content">
        <header className="dc-header">
          <button type="button" className="dc-back" onClick={goBack} aria-label="Go back">
            <ArrowLeft aria-hidden="true" />
          </button>
          <h1>Data controls</h1>
          <span className="dc-header-spacer" aria-hidden="true" />
        </header>

        <div className="dc-sections">
          <section className="dc-section" aria-labelledby="dc-model-title">
            <div className="dc-row">
              <div className="dc-row-copy">
                <h2 id="dc-model-title">Improve the model for everyone</h2>
                <span className="dc-row-status">Not available</span>
              </div>
              <button className="dc-switch" type="button" role="switch" aria-checked="false" disabled aria-label="Improve the model for everyone is unavailable">
                <span />
              </button>
            </div>
            <p className="dc-description">
              FaceMeX does not currently offer a backend-enforced preference for model improvement. This control is disabled and does not change how configured AI providers process requests.
            </p>
          </section>

          <section className="dc-section" aria-labelledby="dc-location-heading">
            <h2 id="dc-location-heading" className="dc-section-heading">Location</h2>
            <div className="dc-row">
              <div className="dc-row-copy">
                <h3>Location services</h3>
              </div>
              <span className={`dc-location-status dc-location-${locationPermission}`} aria-live="polite">
                {locationStatus}
              </span>
            </div>
            <p className="dc-description">
              Browser permission status only. FaceMeX has no location-aware feature using device location. This page does not request or store your coordinates; change site access in your browser settings.
            </p>
          </section>

          <section className="dc-section" aria-labelledby="dc-export-heading">
            <h2 id="dc-export-heading" className="dc-section-heading">Export Data</h2>
            <p className="dc-description">
              Download available account profile, FaceMeX settings, projects, conversations, messages, and documents as JSON. Social-feed activity and data held by other services are not included.
            </p>
            <button type="button" className="dc-action" onClick={() => void exportData()} disabled={exporting}>
              <Download aria-hidden="true" />
              {exporting ? 'Preparing export…' : 'Export Data'}
            </button>
            {exportMessage && <p className="dc-feedback" role="status">{exportMessage}</p>}
            {exportError && <p className="dc-feedback dc-error" role="alert">{exportError}</p>}
          </section>

          <section className="dc-section" aria-labelledby="dc-delete-heading">
            <h2 id="dc-delete-heading" className="dc-section-heading">Delete FaceMeX account</h2>
            <button type="button" className="dc-action dc-delete" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 aria-hidden="true" />
              Delete FaceMeX account
            </button>
          </section>

          <section className="dc-section" aria-labelledby="dc-voice-heading">
            <h2 id="dc-voice-heading" className="dc-section-heading">Voice</h2>
            <div className="dc-row">
              <div className="dc-row-copy">
                <h3>Include your audio recordings</h3>
                <span className="dc-row-status">Not available</span>
              </div>
              <button className="dc-switch" type="button" role="switch" aria-checked="false" disabled aria-label="Audio recording preference is unavailable">
                <span />
              </button>
            </div>
            <p className="dc-description">
              FaceMeX does not provide an account-wide audio retention or training preference. Microphone access is requested by individual features when used; this page cannot change their processing or retention.
            </p>
          </section>

          <section className="dc-section" aria-labelledby="dc-apps-heading">
            <h2 id="dc-apps-heading" className="dc-section-heading">Apps with access</h2>
            <div className="dc-empty-card">
              Connected-app authorization is not currently supported by FaceMeX.
            </div>
          </section>
        </div>
      </div>

      {deleteDialogOpen && (
        <div className="dc-dialog-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setDeleteDialogOpen(false);
        }}>
          <section
            className="dc-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dc-dialog-title"
            aria-describedby="dc-dialog-description"
          >
            <h2 id="dc-dialog-title">Account deletion isn’t available yet</h2>
            <p id="dc-dialog-description">
              Deleting an account can permanently remove account data. FaceMeX does not currently have a secure deletion endpoint, so no deletion can be performed here and nothing has been changed. Please review the Privacy Policy for the current request process.
            </p>
            <div className="dc-dialog-actions">
              <button type="button" onClick={() => setDeleteDialogOpen(false)}>Close</button>
              <button type="button" onClick={() => {
                setDeleteDialogOpen(false);
                navigate('/privacy');
              }}>
                Privacy Policy
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
