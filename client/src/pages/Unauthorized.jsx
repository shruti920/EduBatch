import { Link } from "react-router-dom";
import { useAuth, homePathFor } from "../context/AuthContext";

const Unauthorized = () => {
  const { user, isAuthenticated } = useAuth();
  const home = isAuthenticated ? homePathFor(user.role) : "/login";

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-md rounded-md border border-paper-border bg-white p-8">
        <p className="text-sm font-medium text-attention">403</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-ink">You don't have access to this page</h1>
        <p className="mt-2 text-sm text-ink-muted">
          This page isn't available for your account. If you think it should be, ask your institute admin.
        </p>
        <Link
          to={home}
          className="mt-6 inline-flex rounded bg-ink px-3.5 py-2 text-sm font-medium text-white hover:bg-ink-700"
        >
          {isAuthenticated ? "Go to your dashboard" : "Log in"}
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;
