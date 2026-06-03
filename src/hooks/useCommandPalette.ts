"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  createElement,
  type ReactNode,
} from "react";

interface CommandPaletteContextType {
  isOpen: boolean;
  openPalette: (initialQuery?: string) => void;
  closePalette: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextType>(null!);

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error("useCommandPalette must be used inside CommandPaletteProvider");
  return ctx;
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const openPalette = () => setIsOpen(true);
  const closePalette = () => setIsOpen(false);

  return createElement(
    CommandPaletteContext.Provider,
    { value: { isOpen, openPalette, closePalette } },
    children
  );
}
