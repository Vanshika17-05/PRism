import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import Overview from "@/pages/Overview";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Reviews from "@/pages/Reviews";
import ReviewDetail from "@/pages/ReviewDetail";
import Repos from "@/pages/Repos";
import SettingsPage from "@/pages/Settings";
import TeamSettings from "@/pages/TeamSettings";
import AcceptInvite from "@/pages/AcceptInvite";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const Page = ({ children }) => (
  <motion.div
    className="w-full min-w-0"
    initial={{ opacity: 0, y: 5 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -4 }}
    transition={{ duration: 0.16 }}
  >
    {children}
  </motion.div>
);
export default function App() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <Page>
              <Landing />
            </Page>
          }
        />
        <Route
          path="/login"
          element={
            <Page>
              <Login />
            </Page>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route
            path="overview"
            element={
              <Page>
                <Overview />
              </Page>
            }
          />
          <Route
            path="reviews"
            element={
              <Page>
                <Reviews />
              </Page>
            }
          />
          <Route
            path="reviews/:id"
            element={
              <Page>
                <ReviewDetail />
              </Page>
            }
          />
          <Route
            path="repos"
            element={
              <Page>
                <Repos />
              </Page>
            }
          />
          <Route
            path="settings"
            element={
              <Page>
                <SettingsPage />
              </Page>
            }
          />
          <Route path="settings/team" element={<Page><TeamSettings /></Page>} />
        </Route>
        <Route path="/invite/:token" element={<ProtectedRoute><AcceptInvite /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
