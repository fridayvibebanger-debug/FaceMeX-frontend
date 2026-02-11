import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import AuthPage from "./components/auth/AuthPage";
import FeedPage from "./pages/FeedPage";
import WatchPage from "./pages/WatchPage";
import ProfilePage from "./pages/ProfilePage";
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
import AiUtilsTest from './pages/AiUtilsTest';
import CareerAIPage from './pages/CareerAIPage';
import NotificationsPage from './pages/NotificationsPage';
import ConnectPage from './pages/ConnectPage';

function App() {
  const { isAuthenticated, isInitialized, restoreSession } = useAuthStore();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />
      <Route path="/prd" element={<PRDPage />} />
      <Route path="/tos" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/ethics" element={<EthicsPolicy />} />
      <Route path="/screenshot-policy" element={<ScreenshotPolicy />} />
      <Route path="/community-rules" element={<CommunityRules />} />
      <Route
        path="/recruiter-portal"
        element={isAuthenticated ? <RecruiterPortalPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/ads/drafts"
        element={isAuthenticated ? <AdsDraftsPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/feed"
        element={isAuthenticated ? <FeedPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/watch/:id"
        element={isAuthenticated ? <WatchPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/profile"
        element={isAuthenticated ? <ProfilePage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/profile/:id"
        element={isAuthenticated ? <ProfilePage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/messages"
        element={
          isAuthenticated ? (
            <MessagesPage />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/notifications"
        element={isAuthenticated ? <NotificationsPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/communities"
        element={isAuthenticated ? <CommunitiesPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/communities/circle/:id"
        element={isAuthenticated ? <CirclePage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/connect"
        element={isAuthenticated ? <ConnectPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/settings"
        element={isAuthenticated ? <SettingsPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/saved"
        element={isAuthenticated ? <SavedPostsPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/worlds"
        element={isAuthenticated ? <VirtualWorldsPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/share"
        element={isAuthenticated ? <ContentSharePage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/events"
        element={isAuthenticated ? <EventsPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/world"
        element={isAuthenticated ? <WorldPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/world/booth/:id"
        element={isAuthenticated ? <BoothPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/world/stage/:id"
        element={isAuthenticated ? <StagePage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/world/manage"
        element={isAuthenticated ? <WorldManagePage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/world/events"
        element={isAuthenticated ? <WorldEventsPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/world/event/:id"
        element={isAuthenticated ? <WorldEventDetailPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/marketplace"
        element={
          isAuthenticated ? (
            <TierGate minTier="free">
              <PremiumMarketplacePage />
            </TierGate>
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/media-shop"
        element={
          isAuthenticated ? (
            <MediaShopPage />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/mental-health"
        element={isAuthenticated ? <MentalHealthPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/jobs"
        element={isAuthenticated ? <JobsPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/groups/pro"
        element={isAuthenticated ? <ProfessionalGroupsPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/groups/pro/:groupId"
        element={isAuthenticated ? <ProGroupDetailPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/ai/resume"
        element={isAuthenticated ? <AIResumePage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/ai/cover-letter"
        element={isAuthenticated ? <AICoverLetterPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/ai/job-assistant"
        element={isAuthenticated ? <AIJobAssistantPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/subscriptions"
        element={isAuthenticated ? <SubscriptionsPage /> : <Navigate to="/" replace />}
      />
      <Route path="/pricing" element={<PricingPage />} />
      <Route
        path="/tools"
        element={
          isAuthenticated ? (
            <EmpowermentToolsPage />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/stories"
        element={
          isAuthenticated ? (
            <StoriesPage />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/safety"
        element={
          isAuthenticated ? (
            <SafetyCenter />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/trust"
        element={
          isAuthenticated ? (
            <TrustDashboard />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/test-ai"
        element={
          isAuthenticated ? (
            <TestAI />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/ai-utils-test"
        element={
          isAuthenticated ? (
            <AiUtilsTest />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/career-ai"
        element={
          isAuthenticated ? (
            <CareerAIPage />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
    </Routes>
  );
}

export default App;