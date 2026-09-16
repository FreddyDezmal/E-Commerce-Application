import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { cartApi } from '../api/cartApi';
import { useAuth } from './AuthContext';
import { toErrorMessage } from '../lib/errorMessage';
import type { Cart } from '../types/api';

interface CartContextValue {
  cart: Cart | null;
  itemCount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addItem: (productId: string, quantity: number) => Promise<void>;
  updateItem: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await cartApi.getCart();
      setCart(result);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback(async (productId: string, quantity: number) => {
    setError(null);
    const result = await cartApi.addItem({ productId, quantity });
    setCart(result);
  }, []);

  const updateItem = useCallback(async (productId: string, quantity: number) => {
    setError(null);
    const result = await cartApi.updateItem(productId, { quantity });
    setCart(result);
  }, []);

  const removeItem = useCallback(async (productId: string) => {
    setError(null);
    await cartApi.removeItem(productId);
    // The DELETE endpoint returns 204 (no body), so refetch the
    // authoritative cart state rather than guessing at the new subtotal.
    await refresh();
  }, [refresh]);

  const itemCount = useMemo(
    () => cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    [cart]
  );

  const value = useMemo<CartContextValue>(
    () => ({ cart, itemCount, isLoading, error, refresh, addItem, updateItem, removeItem }),
    [cart, itemCount, isLoading, error, refresh, addItem, updateItem, removeItem]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
