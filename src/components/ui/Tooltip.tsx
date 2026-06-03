"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: "right" | "left" | "top" | "bottom";
}

export function Tooltip({ content, children, side = "right" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        let top = 0;
        let left = 0;
        if (side === "right") {
          top = rect.top + rect.height / 2;
          left = rect.right + 8;
        } else if (side === "left") {
          top = rect.top + rect.height / 2;
          left = rect.left - 8;
        } else if (side === "top") {
          top = rect.top - 8;
          left = rect.left + rect.width / 2;
        } else {
          top = rect.bottom + 8;
          left = rect.left + rect.width / 2;
        }
        setCoords({ top, left });
        setVisible(true);
      }
    }, 300);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  const tooltipStyle: React.CSSProperties = {
    position: "fixed",
    top: coords.top,
    left: coords.left,
    transform: side === "right"
      ? "translateY(-50%)"
      : side === "left"
      ? "translate(-100%, -50%)"
      : side === "top"
      ? "translate(-50%, -100%)"
      : "translateX(-50%)",
    background: "#21262D",
    border: "1px solid #30363D",
    borderRadius: 6,
    padding: "4px 10px",
    fontSize: 11,
    color: "#C9D1D9",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    zIndex: 99999,
    opacity: visible ? 1 : 0,
    transition: "opacity 0.1s ease",
    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
  };

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ display: "contents" }}
    >
      {children}
      {mounted && visible &&
        createPortal(
          <div style={tooltipStyle}>{content}</div>,
          document.body
        )
      }
    </div>
  );
}
