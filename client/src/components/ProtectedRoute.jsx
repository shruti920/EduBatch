import { Navigate, useLocation } from "react-router-dom";
import { useAuth, postLoginPath } from "../context/AuthContext";
import { LogoMark } from "./brand/Logo";
import { useSlowFlag } from "../hooks/useUi";

// Quiet loader for returning visitors (the intro preloader covers first visits)
const FullPageLoading = () => {
  const slow = useSlowFlag(true);
  return (
    <div className="paper-ruled flex min-h-screen flex-col items-center justify-center px-4 text-center" role="status">
      <LogoMark size={40} draw className="text-ink" />
      <p className="mt-4 text-sm text-ink-muted">
        {slow ? "Waking the server. The first visit after a quiet spell can take up to a minute." : "Opening your register…"}
      </p>
    </div>
  );
};

export const ProtectedRoute = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoading />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) return <Navigate to="/unauthorized" replace />;

  return children;
};

// Login/Register: a signed-in user is sent straight to their dashboard
export const PublicOnlyRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageLoading />;
  if (isAuthenticated) {
    // Keep ?batchId=… etc. when returning to the page that asked for login
    const from = location.state?.from;
    const target = postLoginPath(user.role, from?.pathname);
    const keepQuery = from && target === from.pathname;
    return <Navigate to={keepQuery ? `${from.pathname}${from.search || ""}` : target} replace />;
  }
  return children;
};

export default ProtectedRoute;
