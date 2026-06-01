import { useEffect, type ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { trackAppOpen, trackEvent } from '@/lib/analytics';

import { useAuthStore } from './store/authStore';

import AuthPage from './components/auth/AuthPage';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';
import EmotionAIPage from './pages/EmotionAIPage';
import FeedPage from './pages/FeedPage';
import WatchPage from './pages/WatchPage';
import ProfilePage from './pages/ProfilePage';
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
import AICoverLetterPage from './pages/AICoverLetterPage';
import AIJobAssistantPage from './pages/AIJobAssistantPage';
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
import NotificationsPage from './pages/NotificationsPage';
import ConnectPage from './pages/ConnectPage';
import CallPage from './pages/CallPage';

function PublicAuthRoute() {
  const { isAuthenticated, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return <AuthPage />;
  }

  return isAuthenticated ? <Navigate to="/feed" replace /> : <AuthPage />;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isInitialized } = useAuthStore();

  if (!isInitialized) {
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
    if (!isInitialized || !isAuthenticated) return;

    trackEvent('page_view', location.pathname, {
      path: location.pathname,
      search: location.search,
      fullPath: `${location.pathname}${location.search}`,
    });
  }, [isInitialized, isAuthenticated, location.pathname, location.search]);

  return null;
}

function App() {
  const { restoreSession } = useAuthStore();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <>
      <TierSync />
      <LiveNotificationListener />
      <GlobalCallListener />
      <AppAnalyticsTracker />

      <Routes>
        <Route path="/" element={<PublicAuthRoute />} />
        <Route path="/login" element={<PublicAuthRoute />} />
        <Route path="/signup" element={<PublicAuthRoute />} />
        <Route path="/auth" element={<PublicAuthRoute />} />

        <Route path="/prd" element={<PRDPage />} />
        <Route path="/tos" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/ethics" element={<EthicsPolicy />} />
        <Route path="/screenshot-policy" element={<ScreenshotPolicy />} />
        <Route path="/community-rules" element={<CommunityRules />} />
        <Route path="/pricing" element={<PricingPage />} />

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
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
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
          path="/ai/cover-letter"
          element={
            <ProtectedRoute>
              <AICoverLetterPage />
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
