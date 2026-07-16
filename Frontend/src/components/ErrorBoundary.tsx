import { Component, type ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center max-w-md p-8">
            <h1 className="text-4xl font-bold mb-4 text-foreground">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <Link
              to="/"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="text-primary hover:text-primary-dark underline font-semibold transition-colors"
            >
              Return to Home
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
