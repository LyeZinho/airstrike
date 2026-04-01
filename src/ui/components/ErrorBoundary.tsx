import React, { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-900/20 border border-red-500/50 rounded text-red-400 text-sm font-mono">
          <h2 className="font-bold mb-2 text-red-300">SYSTEM ERROR — TACTICAL MAP FAILURE</h2>
          <p className="text-red-400/80">An error occurred during render. Please refresh.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 px-3 py-1 bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 transition-colors rounded text-xs"
          >
            RETRY
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
