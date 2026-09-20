import { createContext, useContext } from 'react';

/**
 * Exposes the gate's already-resolved access rights to every screen
 * rendered inside `<CharterGate>`, so a screen like `my-badges` reads
 * `canReceive` from context instead of calling `useMinibadgeAccess()` again
 * itself. Only ever provided with a value once the gate has resolved and
 * lets `children` through — see `CharterGate`'s render — so `null` here
 * only ever means "used outside a `CharterGate`", not "still loading".
 */
export interface MinibadgeAccessContextValue {
  canAssign: boolean;
  canReceive: boolean;
  /** Gates `/admin` and the `AppNavbar` "Administration" item. */
  isAdmin: boolean;
  /** Gates `/statistics` and the `AppNavbar` "Statistiques" item. */
  isStatisticsView: boolean;
  /** Gates extra sections INSIDE `/statistics` only (never a route). Independent from `isStatisticsView`. */
  isStatisticsViewAllStructures: boolean;
}

export const MinibadgeAccessContext = createContext<MinibadgeAccessContextValue | null>(null);

export const useMinibadgeAccessContext = (): MinibadgeAccessContextValue => {
  const context = useContext(MinibadgeAccessContext);
  if (!context) {
    throw new Error('useMinibadgeAccessContext must be used within a <CharterGate>');
  }
  return context;
};
