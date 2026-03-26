"use client";

import React, { useEffect, useRef } from "react";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  width = "450px",
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden"; // Prevent scrolling behind drawer
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div 
        className="drawer-panel" 
        onClick={(e) => e.stopPropagation()}
        style={{ width }}
      >
        <div className="drawer-header">
          <div className="drawer-title-group">
            {title && <h2 className="drawer-title">{title}</h2>}
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close drawer">
            ✕
          </button>
        </div>
        <div className="drawer-body">
          {children}
        </div>
      </div>

      <style jsx>{`
        .drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          justify-content: flex-end;
          animation: fadeIn 0.2s ease-out;
        }

        .drawer-panel {
          height: 100%;
          background: var(--bg);
          box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          border-left: 1px solid var(--line);
        }

        .drawer-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--line);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--panel);
        }

        .drawer-title {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text);
        }

        .drawer-close {
          background: transparent;
          border: none;
          font-size: 1.25rem;
          color: var(--muted);
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .drawer-close:hover {
          background: var(--line);
          color: var(--text);
        }

        .drawer-body {
          flex: 1;
          overflow-y: auto;
          padding: 0;
        }

        /* Scoped Typography for Drawer Body to fit more content */
        .drawer-body :global(h4) {
          font-size: 0.82rem !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          color: var(--blue) !important;
          margin: 20px 20px 10px !important;
          padding-bottom: 6px !important;
          border-bottom: 1px solid var(--line) !important;
        }

        .drawer-body :global(h5) {
          font-size: 0.78rem !important;
          font-weight: 700 !important;
          color: var(--muted) !important;
          margin: 16px 20px 8px !important;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .drawer-body :global(strong) {
          font-size: 0.85rem !important;
          font-weight: 600 !important;
          color: var(--text) !important;
        }

        .drawer-body :global(p), 
        .drawer-body :global(span),
        .drawer-body :global(div:not([class])) {
          font-size: 0.82rem !important;
          line-height: 1.4 !important;
        }

        .drawer-body :global(small) {
          font-size: 0.72rem !important;
          color: var(--muted-soft) !important;
        }

        .drawer-body :global(.category-pill),
        .drawer-body :global(.status-dot) {
          font-size: 0.72rem !important;
          padding: 4px 8px !important;
        }

        .drawer-body :global(.detail-section) {
          padding: 0 0 16px 0;
        }

        /* Compact form elements in drawer */
        .drawer-body :global(select),
        .drawer-body :global(input),
        .drawer-body :global(textarea) {
          font-size: 0.78rem !important;
          padding: 6px 10px !important;
          border-radius: 8px !important;
        }

        .drawer-body :global(.compliance-item) {
          padding: 8px 20px !important;
          border-bottom: 1px solid var(--line-strong) !important;
        }

        .drawer-body :global(.compliance-item:last-child) {
          border-bottom: none !important;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
