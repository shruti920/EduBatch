import { Navigate, useLocation } from "react-router-dom";
import { useAuth, postLoginPath } from "../context/AuthContext";
import { Loading } from "./ui";
import { useSlowFlag } from "../hooks/useUi";

const FullPageLoading = () => {
  const slow = useSlowFlag(true);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 text-center">
      <Loading label="Checking your session…" />
      {slow && (
        <p className="-mt-6 max-w-sm text-sm text-ink-muted">
          Starting the server. This can take up to a minute after a quiet period.
        </p>
      )}
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
