'use client';

/**
 * Global cart state for the storefront.
 * - Loads the server cart on first render (the server is the source of truth).
 * - Quantity changes update the subtotal instantly (optimistic), then reconcile
 *   with the server's response; on error the previous cart is restored.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { apiFetch } from '@/lib/api-client';
import type { CartDTO } from '@/types';

const EMPTY_CART: CartDTO = { id: null, items: [], itemCount: 0, subtotal: 0, hasPhysicalItems: false };

interface CartContextValue {
  cart: CartDTO;
  loading: boolean;
  /** variantId currently being added, for button spinners */
  addingVariantId: string | null;
  /** cart line ids with a request in flight */
  pendingItemIds: string[];
  error: string | null;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  refresh: () => Promise<void>;
  addItem: (variantId: string, quantity?: number, options?: { openDrawer?: boolean }) => Promise<boolean>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearError: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function recalculate(cart: CartDTO): CartDTO {
  const items = cart.items.map((item) => ({ ...item, lineTotal: item.unitPrice * item.quantity }));
  const purchasable = items.filter((item) => item.available);
  return {
    ...cart,
    items,
    itemCount: purchasable.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: purchasable.reduce((sum, item) => sum + item.lineTotal, 0),
    hasPhysicalItems: purchasable.some((item) => item.fulfillment === 'PHYSICAL'),
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartDTO>(EMPTY_CART);
  const [loading, setLoading] = useState(true);
  const [addingVariantId, setAddingVariantId] = useState<string | null>(null);
  const [pendingItemIds, setPendingItemIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const cartRef = useRef(cart);
  cartRef.current = cart;

  const refresh = useCallback(async () => {
    try {
      setCart(await apiFetch<CartDTO>('/api/cart'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your cart.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const clearError = useCallback(() => setError(null), []);

  const markPending = (itemId: string, pending: boolean) =>
    setPendingItemIds((ids) => (pending ? [...ids, itemId] : ids.filter((id) => id !== itemId)));

  const addItem = useCallback<CartContextValue['addItem']>(async (variantId, quantity = 1, options) => {
    setAddingVariantId(variantId);
    setError(null);
    try {
      const next = await apiFetch<CartDTO>('/api/cart/items', { method: 'POST', body: { variantId, quantity } });
      setCart(next);
      if (options?.openDrawer !== false) setDrawerOpen(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add this item.');
      return false;
    } finally {
      setAddingVariantId(null);
    }
  }, []);

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    const previous = cartRef.current;
    setError(null);
    // Optimistic: subtotal updates immediately
    setCart(
      recalculate({
        ...previous,
        items:
          quantity <= 0
            ? previous.items.filter((item) => item.id !== itemId)
            : previous.items.map((item) => (item.id === itemId ? { ...item, quantity } : item)),
      }),
    );
    markPending(itemId, true);
    try {
      setCart(await apiFetch<CartDTO>(`/api/cart/items/${itemId}`, { method: 'PATCH', body: { quantity } }));
    } catch (err) {
      setCart(previous);
      setError(err instanceof Error ? err.message : 'Could not update the quantity.');
    } finally {
      markPending(itemId, false);
    }
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    const previous = cartRef.current;
    setError(null);
    setCart(recalculate({ ...previous, items: previous.items.filter((item) => item.id !== itemId) }));
    markPending(itemId, true);
    try {
      setCart(await apiFetch<CartDTO>(`/api/cart/items/${itemId}`, { method: 'DELETE' }));
    } catch (err) {
      setCart(previous);
      setError(err instanceof Error ? err.message : 'Could not remove the item.');
    } finally {
      markPending(itemId, false);
    }
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      loading,
      addingVariantId,
      pendingItemIds,
      error,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      refresh,
      addItem,
      updateQuantity,
      removeItem,
      clearError,
    }),
    [cart, loading, addingVariantId, pendingItemIds, error, isDrawerOpen, openDrawer, closeDrawer, clearError, refresh, addItem, updateQuantity, removeItem],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside <CartProvider>');
  return context;
}
