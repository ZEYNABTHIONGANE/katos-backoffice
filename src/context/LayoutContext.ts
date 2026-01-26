import { createContext } from 'react';

export interface LayoutContextType {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
}

export const LayoutContext = createContext<LayoutContextType | undefined>(undefined);