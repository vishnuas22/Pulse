import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface AppUiContextValue {
  createOpen: boolean;
  openCreate: () => void;
  closeCreate: () => void;
}

const AppUiContext = createContext<AppUiContextValue | null>(null);

export function useAppUi(): AppUiContextValue {
  const ctx = useContext(AppUiContext);
  if (!ctx) throw new Error('useAppUi must be used inside <AppUiProvider>');
  return ctx;
}

export function AppUiProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo<AppUiContextValue>(
    () => ({ createOpen: open, openCreate: () => setOpen(true), closeCreate: () => setOpen(false) }),
    [open],
  );
  return <AppUiContext.Provider value={value}>{children}</AppUiContext.Provider>;
}
