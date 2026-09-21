import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import { DataProvider } from "./db/store.jsx";
import { isLoggedIn, isAdmin } from "./auth/session.js";
import Layout from "./components/Layout.jsx";

import Login from "./pages/Login.jsx";
import Overview from "./pages/Overview.jsx";
import VoiceAI from "./pages/VoiceAI.jsx";
import CallLogs from "./pages/CallLogs.jsx";
import VoiceAgents from "./pages/VoiceAgents.jsx";
import CallJoin from "./pages/CallJoin.jsx";
import CallAlerts from "./pages/CallAlerts.jsx";
import OutboundCaller from "./pages/OutboundCaller.jsx";
import UnifiedInbox from "./pages/UnifiedInbox.jsx";
import Customers from "./pages/Customers.jsx";
import Settings from "./pages/Settings.jsx";
import FollowUps from "./pages/FollowUps.jsx";
import Testing from "./pages/Testing.jsx";
import FieldsStructure from "./pages/FieldsStructure.jsx";
import ReviewPanel from "./pages/ReviewPanel.jsx";
import EscalatePanel from "./pages/EscalatePanel.jsx";
import Workflows from "./pages/Workflows.jsx";
import CallListen from "./pages/CallListen.jsx";

function RequireAuth({ children }) {
  const location = useLocation();
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

function RequireAdmin({ children }) {
  if (!isAdmin()) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            {/* Pages accessible to both Admin and Supervisor */}
            <Route index element={<Overview />} />
            <Route path="/call-logs" element={<CallLogs />} />
            <Route path="/interactions" element={<CallLogs />} />
            <Route path="/voice-ai" element={<CallLogs />} />
            <Route path="/voice-agents" element={<VoiceAgents />} />
            <Route path="/outbound-caller" element={<OutboundCaller />} />
            <Route path="/call-monitoring" element={<CallJoin />} />
            <Route path="/call-listen" element={<CallListen />} />
            <Route path="/call/join" element={<CallJoin />} />
            <Route path="/call-alerts" element={<CallAlerts />} />
            <Route path="/follow-ups" element={<FollowUps />} />
            <Route path="/testing" element={<Testing />} />
            <Route path="/fields-insights" element={<FieldsStructure />} />
            <Route path="/fields-structure" element={<FieldsStructure />} />
            <Route path="/review-panel" element={<ReviewPanel />} />
            <Route path="/escalate-panel" element={<EscalatePanel />} />
            <Route path="/workflows" element={<Workflows />} />
            <Route path="/settings" element={<Settings />} />

            {/* Pages restricted to Admin only */}
            <Route
              path="/unified-inbox"
              element={
                <RequireAdmin>
                  <UnifiedInbox />
                </RequireAdmin>
              }
            />
            <Route
              path="/customers"
              element={
                <RequireAdmin>
                  <Customers />
                </RequireAdmin>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </DataProvider>
    </BrowserRouter>
  );
}
