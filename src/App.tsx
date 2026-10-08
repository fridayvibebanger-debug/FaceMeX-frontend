import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { initializeAnalytics, trackAppOpen, trackEvent } from '@/lib/analytics';

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
import SettingsPage from './pages/SettingsPage';
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
import FaceMeXSettingsPage from './pages/FaceMeXSettingsPage';
import PricingPage from './pages/PricingPage';
import TierGate from './components/auth/TierGate';
import PRDPage from './pages/PRDPage';
import AdsDraftsPage from './pages/AdsDraftsPage';
import WorldManagePage from './pages/WorldManagePage';
import WorldEventsPage from './pages/WorldEventsPage';
import WorldEventDetailPage from './pages/WorldEventDetailPage';
import SafetyCenter from './pages/SafetyCenter';
import TrustDashboard from './pages/TrustDashboard';
import TermsOfService from './pages/policies/TermsOfService';
import PrivacyPolicy from './pages/policies/PrivacyPolicy';
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

  useEffect(() => {
    if (!isInitialized || (!isAuthenticated && !isPublicSeoPath(location.pathname))) return;

    const safePath = location.pathname
      .replace(/\/projects\/[^/]+/g, '/projects/:id')
      .replace(/\/profile\/[^/]+/g, '/profile/:id')
      .replace(/\/messages\/[^/]+/g, '/messages/:id')
      .replace(/\/watch\/[^/]+/g, '/watch/:id')
      .replace(/\/world\/event\/[^/]+/g, '/world/event/:id');
    trackEvent('page_view', undefined, { page_path: safePath });
  }, [isInitialized, isAuthenticated, location.pathname]);

  return null;
}

function AnalyticsBootstrap() {
  useEffect(() => {
    initializeAnalytics();
  }, []);
  return null;
}

function PageSeoMetadata() {
  const location = useLocation();

  useEffect(() => {
    const { title, description, canonical, indexable } = getSeoMetadata(location.pathname);
    const finalTitle = location.pathname === '/ai/job-assistant'
      ? 'FaceMeX AI Workspace'
      : location.pathname.startsWith('/projects/')
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
    setMeta('meta[property="og:type"]', 'property', 'og:type', location.pathname.startsWith('/resources/') ? 'article' : 'website');
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
      <LiveNotificationListener />
      <GlobalCallListener />
      <AppAnalyticsTracker />

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
        <Route path="/privacy" element={<PrivacyPolicy />} />
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
          path="/ai/settings"
          element={
            <ProtectedRoute>
              <FaceMeXSettingsPage />
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
          path="/safety"
          element={
            <ProtectedRoute>
              <SafetyCenter />
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