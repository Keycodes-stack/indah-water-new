import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import { DataProvider } from "./db/store.jsx";
import { isLoggedIn, isAdmin } from "./auth/session.js";
import Layout from "./components/Layout.jsx";

import Login from "./pages/Login.jsx";
import Overview from "./pages/Overview.jsx";
import VoiceAI from "./pages/VoiceAI.jsx";
import CallJoin from "./pages/CallJoin.jsx";
import CallAlerts from "./pages/CallAlerts.jsx";
import OutboundCaller from "./pages/OutboundCaller.jsx";
import UnifiedInbox from "./pages/UnifiedInbox.jsx";
import BookPosition from "./pages/BookPosition.jsx";
import Segments from "./pages/Segments.jsx";
import Treatment from "./pages/Treatment.jsx";
import Performance from "./pages/Performance.jsx";
import Compliance from "./pages/Compliance.jsx";
import DcaLegal from "./pages/DcaLegal.jsx";
import Geography from "./pages/Geography.jsx";
import Customers from "./pages/Customers.jsx";
import Settings from "./pages/Settings.jsx";
import FollowUps from "./pages/FollowUps.jsx";
import TicketsKanban from "./pages/TicketsKanban.jsx";
import Testing from "./pages/Testing.jsx";

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
            <Route path="/voice-ai" element={<VoiceAI />} />
            <Route path="/outbound-caller" element={<OutboundCaller />} />
            <Route path="/tickets" element={<TicketsKanban />} />
            <Route path="/call/join" element={<CallJoin />} />
            <Route path="/call-alerts" element={<CallAlerts />} />
            <Route path="/follow-ups" element={<FollowUps />} />
            <Route path="/testing" element={<Testing />} />

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
              path="/book-position"
              element={
                <RequireAdmin>
                  <BookPosition />
                </RequireAdmin>
              }
            />
            <Route
              path="/segments"
              element={
                <RequireAdmin>
                  <Segments />
                </RequireAdmin>
              }
            />
            <Route
              path="/treatment"
              element={
                <RequireAdmin>
                  <Treatment />
                </RequireAdmin>
              }
            />
            <Route
              path="/performance"
              element={
                <RequireAdmin>
                  <Performance />
                </RequireAdmin>
              }
            />
            <Route
              path="/compliance"
              element={
                <RequireAdmin>
                  <Compliance />
                </RequireAdmin>
              }
            />
            <Route
              path="/dca-legal"
              element={
                <RequireAdmin>
                  <DcaLegal />
                </RequireAdmin>
              }
            />
            <Route
              path="/geography"
              element={
                <RequireAdmin>
                  <Geography />
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
            <Route
              path="/settings"
              element={
                <RequireAdmin>
                  <Settings />
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
