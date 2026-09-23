import { Link } from "react-router-dom";
import { useAuth, homePathFor } from "../context/AuthContext";
import { useDocumentTitle } from "../hooks/useUi";

const NotFound = () => {
  const { user, isAuthenticated } = useAuth();
  useDocumentTitle("Page not found");

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-md rounded-md border border-paper-border bg-white p-8">
        <p className="text-sm font-medium text-ink-muted">404</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-ink">This page doesn't exist</h1>
        <p className="mt-2 text-sm text-ink-muted">The link may be old or mistyped.</p>
        <Link
          to={isAuthenticated ? homePathFor(user.role) : "/login"}
          className="mt-6 inline-flex rounded bg-ink px-3.5 py-2 text-sm font-medium text-white hover:bg-ink-700"
        >
          {isAuthenticated ? "Go to your dashboard" : "Log in"}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
