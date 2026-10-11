import { useEffect, useState } from 'react';
import { ArrowLeft, LogOut, Mail, Sparkles, SquarePlus, UserRound } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import './AccountSettingsPage.css';

function formatPlan(tier: string) {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export default function AccountSettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const tier = useUserStore((state) => state.tier);
  const profileName = useUserStore((state) => state.name);
  const accountId = useUserStore((state) => state.id);
  const subscriptionLoading = useUserStore((state) => state.loading);
  const loadMe = useUserStore((state) => state.loadMe);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const goBack = () => {
    if (typeof window !== 'undefined' && Number(window.history.state?.idx) > 0) {
      navigate(-1);
      return;
    }

    const from = (location.state as { from?: unknown } | null)?.from;
    const fallback = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && from !== location.pathname
      ? from
      : '/ai/settings';
    navigate(fallback, { replace: true });
  };

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setLogoutError('');
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Failed to sign out', error);
      setLogoutError('Could not log out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  const subscriptionReady = Boolean(accountId) && !subscriptionLoading;
  const paidPlan = subscriptionReady && tier !== 'free';
  const premiumAction = !subscriptionReady
    ? subscriptionLoading ? 'Checking subscription…' : 'View subscription options'
    : paidPlan ? 'Manage subscription' : 'Get FaceMeX Plus';

  return (
    <main className="account-settings-page">
      <div className="account-settings-content">
        <header className="account-settings-header">
          <button type="button" className="account-settings-back" onClick={goBack} aria-label="Go back">
            <ArrowLeft aria-hidden="true" />
          </button>
          <h1>Account</h1>
        </header>

        <section className="account-settings-card" aria-label="Account information">
          <div className="account-settings-row">
            <Mail className="account-settings-icon" aria-hidden="true" />
            <div className="account-settings-row-copy">
              <h2>Email</h2>
              <p title={user?.email || undefined}>{user?.email || 'Not available'}</p>
            </div>
          </div>

          <div className="account-settings-row">
            <UserRound className="account-settings-icon" aria-hidden="true" />
            <div className="account-settings-row-copy">
              <h2>Name</h2>
              <p>{user?.name || profileName || 'Not provided'}</p>
            </div>
          </div>

          <div className="account-settings-row">
            <SquarePlus className="account-settings-icon" aria-hidden="true" />
            <div className="account-settings-row-copy">
              <h2>Subscription</h2>
              <p>{subscriptionLoading ? 'Checking…' : accountId ? formatPlan(tier) : 'Unavailable'}</p>
            </div>
          </div>

          <button
            type="button"
            className="account-settings-row account-settings-premium"
            onClick={() => navigate('/facemex-plus')}
            aria-label={premiumAction}
          >
            <Sparkles className="account-settings-icon" aria-hidden="true" />
            <span className="account-settings-row-copy">
              <span className="account-settings-row-title">{premiumAction}</span>
              <span className="account-settings-row-subtitle">
                {paidPlan ? 'View available plans' : subscriptionReady ? 'Explore premium plans' : 'Plan status is not available yet'}
              </span>
            </span>
            <span className="account-settings-chevron" aria-hidden="true">›</span>
          </button>
        </section>

        <div className="account-settings-logout-wrap">
          <button
            type="button"
            className="account-settings-logout"
            onClick={() => void handleLogout()}
            disabled={signingOut}
            aria-busy={signingOut}
          >
            <LogOut aria-hidden="true" />
            <span>{signingOut ? 'Logging out…' : 'Log out'}</span>
          </button>
          {logoutError && <p className="account-settings-error" role="alert">{logoutError}</p>}
        </div>
      </div>
    </main>
  );
}
