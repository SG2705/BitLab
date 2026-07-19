import { Component, type ErrorInfo, type ReactNode } from "react";
import { FormattedMessage } from "react-intl";

interface ErrorBoundaryProps {
  /** Content to render when an error occurs */
  fallback?: ReactNode;
  /** Child components to protect */
  children: ReactNode;
  /** Optional callback when an error is caught */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — catches rendering errors in child components and displays
 * a fallback UI instead of crashing the entire application.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  // eslint-disable-next-line react/static-property-placement
  static defaultProps: { fallback: undefined; onError: undefined };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const { onError } = this.props;

    onError?.(error, info);
  }

  render(): ReactNode {
    const { hasError } = this.state;
    const { fallback, children } = this.props;
    const { error } = this.state;

    if (hasError) {
      if (fallback) return fallback;

      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-3">
          <div className="text-destructive font-mono text-sm font-semibold">
            <FormattedMessage
              id="JqiqNj"
              defaultMessage="Something went wrong"
            />
          </div>
          <p className="text-muted-foreground text-xs max-w-md">
            {error?.message ?? (
              <FormattedMessage
                id="Xkdnen"
                defaultMessage="An unexpected error occurred."
              />
            )}
          </p>
          <button
            type="button"
            className="mt-2 px-3 py-1.5 text-xs rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            <FormattedMessage id="FazwRl" defaultMessage="Try again" />
          </button>
        </div>
      );
    }

    return children;
  }
}

ErrorBoundary.defaultProps = { fallback: undefined, onError: undefined };

export default ErrorBoundary;
