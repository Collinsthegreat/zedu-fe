"use client";

import React, { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface ScrollToLatestButtonProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  isAtBottom: boolean;
  onScrollToBottom?: () => void;
  className?: string;
}

export const ScrollToLatestButton = ({
  scrollContainerRef,
  isAtBottom,
  onScrollToBottom,
  className,
}: ScrollToLatestButtonProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({ top: 0, behavior: "smooth" });
    }
    onScrollToBottom?.();
  };

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    if (isAtBottom) {
      button.style.opacity = "0";
      button.style.pointerEvents = "none";
      button.style.transform = "translateY(10px)";
    } else {
      button.style.opacity = "1";
      button.style.pointerEvents = "auto";
      button.style.transform = "translateY(0)";
    }
  }, [isAtBottom]);

  return (
    <Button
      ref={buttonRef}
      variant="secondary"
      size="icon"
      className={cn(
        "absolute bottom-4 right-4 z-20 shadow-lg transition-all duration-200 ease-in-out",
        className
      )}
      onClick={handleClick}
      aria-label="Scroll to latest messages"
    >
      <ChevronDown size={18} strokeWidth={2.5} className="text-primary" />
    </Button>
  );
};
