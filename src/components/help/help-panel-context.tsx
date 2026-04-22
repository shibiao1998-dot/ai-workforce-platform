"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface HelpPanelContextType {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

const HelpPanelContext = createContext<HelpPanelContextType | null>(null);

export function HelpPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <HelpPanelContext value={{ isOpen, toggle, open, close }}>
      {children}
    </HelpPanelContext>
  );
}

export function useHelpPanel() {
  const ctx = useContext(HelpPanelContext);
  if (!ctx) throw new Error("useHelpPanel must be used within HelpPanelProvider");
  return ctx;
}
