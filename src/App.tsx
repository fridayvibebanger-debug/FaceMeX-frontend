import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import {
  hasAnalyticsConsentChoice,
  initializeAnalytics,
  setAnalyticsConsent,
  trackAppOpen,
  trackEvent,
} from '@/lib/analytics';

import { useAuthStore } from './store/authStore';

import AuthPage from './components/auth/AuthPage';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';
import EmotionAIPage from './pages/EmotionAIPage';
import MEXA from "./components/MEXA";
import MEXAUpgrade from "./pages/MEXAUpgrade";
import FacemexPlusPage from './pages/FacemexPlusPage';
import FeedPage from './pages/FeedPage';
import WatchPage from './pages/WatchPage';
import ProfilePage from './pages/ProfilePage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import MessagesPage from './pages/MessagesPage';
import VirtualWorldsPage from './pages/VirtualWorldsPage';
import WorldPage from './pages/WorldPage';
import BoothPage from './pages/BoothPage';
import StagePage from './pages/StagePage';
import CommunitiesPage from './pages/CommunitiesPage';
import CirclePage from './pages/CirclePage';
import ContentSharePage from './pages/ContentSharePage';
import EventsPage from './pages/EventsPage';
import PremiumMarketplacePage from './pages/PremiumMarketplacePage';
import MediaShopPage from './pages/MediaShopPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import MentalHealthPage from './pages/MentalHealthPage';
import EmpowermentToolsPage from './pages/EmpowermentToolsPage';
import StoriesPage from './pages/StoriesPage';
import JobsPage from './pages/JobsPage';
import ProfessionalGroupsPage from './pages/ProfessionalGroupsPage';
import ProGroupDetailPage from './pages/ProGroupDetailPage';
import SavedPostsPage from './pages/SavedPostsPage';
import AIResumePage from './pages/AIResumePage';
import AIJobAssistantPage from './pages/AIJobAssistantPage';
import FaceMeXSettingsSync from './components/facemex-settings/FaceMeXSettingsSync';
import AccountSettingsPage from './pages/AccountSettingsPage';
import PersonalizationSettingsPage from './pages/PersonalizationSettingsPage';
import DataControlsPage from './pages/DataControlsPage';
import PrivacyCenterPage from './pages/PrivacyCenterPage';
import PrivacyCenterDetailPage from './pages/PrivacyCenterDetailPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import PrivacyGuidePage from './pages/PrivacyGuidePage';
import SettingsHomePage from './features/settings/pages/SettingsHomePage';
import SettingsCategoryPage from './features/settings/pages/SettingsCategoryPage';
import PricingPage from './pages/PricingPage';
import TierGate from './components/auth/TierGate';
import PRDPage from './pages/PRDPage';
import AdsDraftsPage from './pages/AdsDraftsPage';
import WorldManagePage from './pages/WorldManagePage';
import WorldEventsPage from './pages/WorldEventsPage';
import WorldEventDetailPage from './pages/WorldEventDetailPage';
import TrustDashboard from './pages/TrustDashboard';
import TermsOfService from './pages/policies/TermsOfService';
import EthicsPolicy from './pages/policies/EthicsPolicy';
import ScreenshotPolicy from './pages/policies/ScreenshotPolicy';
import CommunityRules from './pages/policies/CommunityRules';
import RecruiterPortalPage from './pages/RecruiterPortalPage';
import TestAI from './pages/TestAI';
import TierSync from '@/components/auth/TierSync';
import LiveNotificationListener from '@/components/LiveNotificationListener';
import GlobalCallListener from '@/components/calls/GlobalCallListener';
import AiUtilsTest from './pages/AiUtilsTest';
import CareerAIPage from './pages/CareerAIPage';
import PublicSeoPage, { isPublicSeoPath } from './pages/PublicSeoPage';
import { getSeoMetadata, SEO_SITE_ORIGIN } from './lib/seo';

const PracticalLabLibrary = lazy(() => import('./pages/PracticalLabLibrary'));
import NotificationsPage from './pages/NotificationsPage';
import ConnectPage from './pages/ConnectPage';
import CallPage from './pages/CallPage';
import EnterpriseHomePage from './enterprise/pages/EnterpriseHomePage';
import DepartmentDetailPage from './enterprise/pages/DepartmentDetailPage';

const DEFAULT_AUTHENTICATED_ROUTE = '/ai/job-assistant';

function PublicHomeRoute() {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Navigate to={DEFAULT_AUTHENTICATED_ROUTE} replace /> : <PublicSeoPage />;
}

function PublicSignupRoute() {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated
    ? <Navigate to={DEFAULT_AUTHENTICATED_ROUTE} replace />
    : <AuthPage />;
}

function PublicAuthRoute() {
  const { isAuthenticated, isInitialized } = useAuthStore();

  if (!isInitialized && !isAuthenticated) {
    return <AuthPage />;
  }

  return isAuthenticated ? <Navigate to={DEFAULT_AUTHENTICATED_ROUTE} replace /> : <AuthPage />;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitialized } = useAuthStore();

  if (!isInitialized && !isAuthenticated) {
    return <AuthPage />;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppAnalyticsTracker() {
  const location = useLocation();
  const { isAuthenticated, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return;

    trackAppOpen();
  }, [isInitialized, isAuthenticated]);

  const trackCurrentPage = () => {
    const featureByRoute: Array<[RegExp, string]> = [
      [/^\/ai\/job-assistant/, 'ai_workspace'],
      [/^\/documents?/, 'documents'],
      [/^\/ai\/resume/, 'cv_tools'],
      [/^\/ai\/interview/, 'interview_prep'],
      [/^\/watch/, 'watch'],
      [/^\/jobs?/, 'job_search'],
      [/^\/projects/, 'projects'],
      [/^\/screen-share/, 'screen_sharing'],
      [/^\/ai\/settings/, 'settings'],
    ];
    const feature = featureByRoute.find(([pattern]) => pattern.test(location.pathname))?.[1] || 'workspace';
    trackEvent('feature_opened', undefined, { feature });
  };

  useEffect(() => {
    if (!isInitialized || (!isAuthenticated && !isPublicSeoPath(location.pathname))) return;

    const safePath = location.pathname
      .replace(/\/projects\/[^/]+/g, '/projects/:id')
      .replace(/\/profile\/[^/]+/g, '/profile/:id')
      .replace(/\/messages\/[^/]+/g, '/messages/:id')
      .replace(/\/watch\/[^/]+/g, '/watch/:id')
      .replace(/\/world\/event\/[^/]+/g, '/world/event/:id');
    trackEvent('page_view', undefined, { page_path: safePath });
    if (isAuthenticated) trackCurrentPage();
  }, [isInitialized, isAuthenticated, location.pathname]);

  useEffect(() => {
    if (!isInitialized) return;
    const trackAfterConsent = () => {
      if (!isAuthenticated) return;
      trackAppOpen();
      trackEvent('page_view', undefined, { page_path: location.pathname });
      trackCurrentPage();
    };
    window.addEventListener('facemex:analytics-consent-changed', trackAfterConsent);
    return () => window.removeEventListener('facemex:analytics-consent-changed', trackAfterConsent);
  }, [isInitialized, isAuthenticated, location.pathname]);

  return null;
}

function AnalyticsBootstrap() {
  useEffect(() => {
    initializeAnalytics();
  }, []);
  return null;
}

function AnalyticsConsentNotice() {
  const { isAuthenticated, isInitialized } = useAuthStore();
  const [visible, setVisible] = useState(false);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    setVisible(isInitialized && isAuthenticated && !hasAnalyticsConsentChoice());
  }, [isInitialized, isAuthenticated]);

  if (!visible) return null;

  const chooseConsent = (consent: 'granted' | 'denied') => {
    if (!setAnalyticsConsent(consent)) {
      setStorageError(true);
      return;
    }
    setStorageError(false);
    setVisible(false);
  };

  return (
    <aside
      role="region"
      aria-label="Product analytics preference"
      className="fixed inset-x-3 bottom-3 z-[110] mx-auto max-w-2xl rounded-xl border border-slate-300 bg-white p-4 text-slate-900 shadow-2xl dark:border-white/15 dark:bg-[#1d1d1d] dark:text-white sm:inset-x-5 sm:bottom-5"
    >
      <h2 className="text-sm font-semibold">Help improve FaceMeX?</h2>
      <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-white/70">
        If you agree, FaceMeX will record signed-in feature usage, page, device category, and your account identifier to understand reliability and usage. Your prompts, messages, and uploaded content are not included. You can change this choice in Data controls.
      </p>
      {storageError && (
        <p role="alert" className="mt-2 text-xs text-red-700 dark:text-red-300">
          Your preference couldn’t be saved in this browser. Check your browser’s storage settings and try again.
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => chooseConsent('granted')}
          className="min-h-9 rounded-lg bg-slate-900 px-3 text-xs font-medium text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Allow analytics
        </button>
        <button
          type="button"
          onClick={() => chooseConsent('denied')}
          className="min-h-9 rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
        >
          Decline
        </button>
        <Link
          to="/ai/settings/data-controls"
          className="ml-auto min-h-9 content-center px-2 text-xs text-slate-600 underline underline-offset-2 dark:text-white/70"
        >
          Data controls
        </Link>
      </div>
    </aside>
  );
}

function PageSeoMetadata() {
  const location = useLocation();

  useEffect(() => {
    const pagePath = location.pathname.replace(/\/+$/, '') || '/';
    const { title, description, canonical, indexable } = getSeoMetadata(pagePath);
    const finalTitle = pagePath === '/ai/job-assistant'
      ? 'FaceMeX AI Workspace'
      : pagePath.startsWith('/projects/')
        ? 'FaceMeX Project Workspace'
        : title;
    const finalDescription = description;
    const finalCanonical = indexable ? canonical : '';
    const shouldIndex = indexable;

    document.title = finalTitle;
    const setMeta = (selector: string, attribute: 'name' | 'property', key: string, content: string) => {
      let element = document.querySelector<HTMLMetaElement>(selector);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }
      element.content = content;
    };
    setMeta('meta[name="description"]', 'name', 'description', finalDescription);
    setMeta('meta[name="robots"]', 'name', 'robots', shouldIndex ? 'index, follow' : 'noindex, follow');
    setMeta('meta[property="og:title"]', 'property', 'og:title', finalTitle);
    setMeta('meta[property="og:description"]', 'property', 'og:description', finalDescription);
    setMeta('meta[property="og:type"]', 'property', 'og:type', pagePath.startsWith('/resources/') ? 'article' : 'website');
    setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', 'FaceMeX');
    setMeta('meta[property="og:image"]', 'property', 'og:image', `${SEO_SITE_ORIGIN}/facemex-logo.png`);
    setMeta('meta[property="og:image:alt"]', 'property', 'og:image:alt', 'FaceMeX');
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary');
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', finalTitle);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', finalDescription);
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', `${SEO_SITE_ORIGIN}/facemex-logo.png`);
    if (finalCanonical) {
      setMeta('meta[property="og:url"]', 'property', 'og:url', finalCanonical);
    } else {
      document.querySelector('meta[property="og:url"]')?.remove();
    }

    let canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (finalCanonical) {
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.rel = 'canonical';
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.href = finalCanonical;
    } else {
      canonicalLink?.remove();
    }

  }, [location.pathname]);

  return null;
}

function App() {
  const { restoreSession } = useAuthStore();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <>
      <PageSeoMetadata />
      <AnalyticsBootstrap />
      <TierSync />
      <FaceMeXSettingsSync />
      <LiveNotificationListener />
      <GlobalCallListener />
      <AppAnalyticsTracker />
      <AnalyticsConsentNotice />

      <Routes>
        <Route path="/" element={<PublicHomeRoute />} />
        <Route path="/login" element={<PublicAuthRoute />} />
        <Route path="/signup" element={<PublicSignupRoute />} />
        <Route path="/auth" element={<PublicAuthRoute />} />
        <Route path="/ai-for-students" element={<PublicSeoPage />} />
        <Route path="/ai-study-assistant" element={<PublicSeoPage />} />
        <Route path="/student-career-guidance" element={<PublicSeoPage />} />
        <Route path="/online-learning" element={<PublicSeoPage />} />
        <Route path="/ai-career-assistant" element={<PublicSeoPage />} />
        <Route path="/jobs-in-south-africa" element={<PublicSeoPage />} />
        <Route path="/about" element={<PublicSeoPage />} />
        <Route path="/resources" element={<PublicSeoPage />} />
        <Route path="/resources/:slug" element={<PublicSeoPage />} />

        <Route path="/prd" element={<PRDPage />} />
        <Route path="/tos" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/ethics" element={<EthicsPolicy />} />
        <Route path="/screenshot-policy" element={<ScreenshotPolicy />} />
        <Route path="/community-rules" element={<CommunityRules />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/mexa"
          element={
            <ProtectedRoute>
              <MEXA />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mexa-upgrade"
          element={
            <ProtectedRoute>
              <MEXAUpgrade />
            </ProtectedRoute>
          }
        />
        <Route
          path="/facemex-plus"
          element={
            <ProtectedRoute>
              <FacemexPlusPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/enterprise"
          element={
            <ProtectedRoute>
              <EnterpriseHomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/enterprise/:departmentKey"
          element={
            <ProtectedRoute>
              <DepartmentDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recruiter-portal"
          element={
            <ProtectedRoute>
              <RecruiterPortalPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ads/drafts"
          element={
            <ProtectedRoute>
              <AdsDraftsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/emotion"
          element={
            <ProtectedRoute>
              <EmotionAIPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/feed"
          element={
            <ProtectedRoute>
              <FeedPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute>
              <AdminAnalyticsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/watch/:id"
          element={
            <ProtectedRoute>
              <WatchPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile/:id"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/messages/:userId"
          element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/call/:userId"
          element={
            <ProtectedRoute>
              <CallPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/communities"
          element={
            <ProtectedRoute>
              <CommunitiesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/communities/circle/:id"
          element={
            <ProtectedRoute>
              <CirclePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/connect"
          element={
            <ProtectedRoute>
              <ConnectPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ai/settings/account"
          element={
            <ProtectedRoute>
              <AccountSettingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ai/settings"
          element={
            <ProtectedRoute>
              <SettingsHomePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ai/settings/history-and-data"
          element={
            <ProtectedRoute>
              <Navigate to="/ai/settings/data-controls" replace />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ai/settings/privacy-center"
          element={
            <ProtectedRoute>
              <Navigate to="/privacy-center" replace />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ai/settings/personalization"
          element={
            <ProtectedRoute>
              <PersonalizationSettingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ai/settings/data-controls"
          element={
            <ProtectedRoute>
              <DataControlsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/privacy-center"
          element={
            <ProtectedRoute>
              <PrivacyCenterPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/privacy-center/guides/:slug"
          element={
            <ProtectedRoute>
              <PrivacyGuidePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/privacy-center/:section"
          element={
            <ProtectedRoute>
              <PrivacyCenterDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ai/settings/:category"
          element={
            <ProtectedRoute>
              <SettingsCategoryPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/saved"
          element={
            <ProtectedRoute>
              <SavedPostsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/worlds"
          element={
            <ProtectedRoute>
              <VirtualWorldsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/share"
          element={
            <ProtectedRoute>
              <ContentSharePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/events"
          element={
            <ProtectedRoute>
              <EventsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/world"
          element={
            <ProtectedRoute>
              <WorldPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/world/booth/:id"
          element={
            <ProtectedRoute>
              <BoothPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/world/stage/:id"
          element={
            <ProtectedRoute>
              <StagePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/world/manage"
          element={
            <ProtectedRoute>
              <WorldManagePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/world/events"
          element={
            <ProtectedRoute>
              <WorldEventsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/world/event/:id"
          element={
            <ProtectedRoute>
              <WorldEventDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/marketplace"
          element={
            <ProtectedRoute>
              <TierGate minTier="free">
                <PremiumMarketplacePage />
              </TierGate>
            </ProtectedRoute>
          }
        />

        <Route
          path="/media-shop"
          element={
            <ProtectedRoute>
              <MediaShopPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/mental-health"
          element={
            <ProtectedRoute>
              <MentalHealthPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/jobs"
          element={
            <ProtectedRoute>
              <JobsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/groups/pro"
          element={
            <ProtectedRoute>
              <ProfessionalGroupsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/groups/pro/:groupId"
          element={
            <ProtectedRoute>
              <ProGroupDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ai/resume"
          element={
            <ProtectedRoute>
              <AIResumePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ai/job-assistant"
          element={
            <ProtectedRoute>
              <AIJobAssistantPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/projects/:projectId"
          element={
            <ProtectedRoute>
              <AIJobAssistantPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/subscriptions"
          element={
            <ProtectedRoute>
              <SubscriptionsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tools"
          element={
            <ProtectedRoute>
              <EmpowermentToolsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/stories"
          element={
            <ProtectedRoute>
              <StoriesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/trust"
          element={
            <ProtectedRoute>
              <TrustDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/test-ai"
          element={
            <ProtectedRoute>
              <TestAI />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ai-utils-test"
          element={
            <ProtectedRoute>
              <AiUtilsTest />
            </ProtectedRoute>
          }
        />

        <Route
          path="/career-ai"
          element={
            <ProtectedRoute>
              <CareerAIPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/practical-lab"
          element={
            <ProtectedRoute>
              <Suspense
                fallback={
                  <div className="flex min-h-screen items-center justify-center bg-white text-sm text-slate-500 lg:bg-[#050505] lg:text-slate-400">
                    Loading Practical Lab...
                  </div>
                }
              >
                <PracticalLabLibrary />
              </Suspense>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<PublicSeoPage />} />
      </Routes>
    </>
  );
}

export default App;
