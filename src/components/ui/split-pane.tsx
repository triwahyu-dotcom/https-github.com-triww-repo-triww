"use client";

import React, { useState, useEffect, useRef } from "react";

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  isResizing?: boolean;
}

export function SplitPane({
  left,
  right,
  initialWidth = 54,
  minWidth = 28,
  maxWidth = 72,
}: SplitPaneProps) {
  const [paneWidth, setPaneWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const layoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isResizing) return;

    function handlePointerMove(event: PointerEvent) {
      if (!layoutRef.current) return;
      const rect = layoutRef.current.getBoundingClientRect();
      const nextWidth = ((event.clientX - rect.left) / rect.width) * 100;
      setPaneWidth(Math.min(maxWidth, Math.max(minWidth, nextWidth)));
    }

    function stopResize() {
      setIsResizing(false);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
    };
  }, [isResizing, maxWidth, minWidth]);

  return (
    <section
      className={`notion-layout ${isResizing ? "is-resizing" : ""}`}
      ref={layoutRef}
      style={{ "--list-pane-width": `${paneWidth}%` } as React.CSSProperties}
    >
      <div className="notion-list">
        {left}
        <div 
          className="notion-resizer" 
          onPointerDown={() => setIsResizing(true)}
        />
      </div>
      <div className="notion-detail">
        {right}
      </div>
    </section>
  );
}
