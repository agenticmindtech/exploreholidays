"use client";

import { Component, type ReactNode } from "react";
import { RotateCw } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Wraps (app) main — a calm fallback card instead of a blank screen or stack trace (spec §7/hard rule 6). */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto flex max-w-lg items-center justify-center py-20">
          <Card className="flex flex-col items-center gap-3 text-center">
            <p className="font-display text-lg font-bold text-ink">Something went off course.</p>
            <p className="text-sm text-inkMuted">This screen ran into a problem. Reloading usually fixes it.</p>
            <Button className="mt-2" icon={RotateCw} onClick={() => window.location.reload()}>
              Reload
            </Button>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
