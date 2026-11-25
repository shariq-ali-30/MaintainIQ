import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { LoadingScreen } from "./components/Shared";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Issues from "./pages/Issues";
import AssetDetails from "./pages/AssetDetails";
import IssueDetails from "./pages/IssueDetails";
import PublicAsset from "./pages/PublicAsset";

function PageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = pathname === "/login" ? "Login | MaintainIQ" : "MaintainIQ | Asset Management";
  }, [pathname]);

  return null;
}

function ProtectedRoute({ roles, children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user || user.isAnonymous || !profile) return <Navigate to="/login" replace />;

  if (!roles.includes(String(profile.role || "").toLowerCase())) {
    return <Navigate to={String(profile.role).toLowerCase() === "admin" ? "/" : "/issues"} replace />;
  }

  return children;
}

function LegacyRedirect({ param, target }) {
  const [searchParams] = useSearchParams();
  const value = searchParams.get(param);
  return <Navigate to={value ? target + encodeURIComponent(value) : target} replace />;
}

export default function App() {
  return (
    <>
      <PageTitle />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/pages/login.html" element={<Navigate to="/login" replace />} />
        <Route path="/" element={<ProtectedRoute roles={["admin"]}><Dashboard /></ProtectedRoute>} />
        <Route path="/index.html" element={<Navigate to="/" replace />} />
        <Route path="/issues" element={<ProtectedRoute roles={["admin", "technician"]}><Issues /></ProtectedRoute>} />
        <Route path="/assets/:code" element={<ProtectedRoute roles={["admin"]}><AssetDetails /></ProtectedRoute>} />
        <Route path="/issues/:issueNumber" element={<ProtectedRoute roles={["admin", "technician"]}><IssueDetails /></ProtectedRoute>} />
        <Route path="/public/:code" element={<PublicAsset />} />

        {/* Keep old shared QR/bookmark URLs working while moving the app to clean routes. */}
        <Route path="/pages/issues.html" element={<Navigate to="/issues" replace />} />
        <Route path="/pages/details.html" element={<LegacyRedirect param="code" target="/assets/" />} />
        <Route path="/pages/issue-details.html" element={<LegacyRedirect param="issue-id" target="/issues/" />} />
        <Route path="/pages/public.html" element={<LegacyRedirect param="code" target="/public/" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}