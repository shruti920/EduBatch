import { Component } from "react";

/**
 * Last line of defence: if a screen crashes while rendering, show a calm
 * message with a way out instead of a blank page.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Screen crashed:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-4">
        <div role="alert" className="w-full max-w-md rounded-md border border-paper-border bg-white p-8">
          <h1 className="font-serif text-2xl font-semibold text-ink">Something went wrong</h1>
          <p className="mt-2 text-sm text-ink-muted">
            This screen hit an unexpected error. Your data is safe. Reload to try again.
          </p>
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded bg-ink px-3.5 py-2 text-sm font-medium text-white hover:bg-ink-700"
            >
              Reload
            </button>
            <a
              href="/"
              className="rounded border border-paper-border px-3.5 py-2 text-sm font-medium text-ink hover:border-ink"
            >
              Go home
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
