"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface Store {
  id: string;
  name: string;
  platform: string;
  status: string;
  currency: string;
  logo_url?: string | null;
  integration_id?: string | null;
  metadata?: Record<string, unknown>;
}

interface StoreContextValue {
  stores: Store[];
  currentStore: Store | null;
  currentStoreId: string | null;
  switchStore: (storeId: string) => void;
  refreshStores: () => Promise<void>;
  loading: boolean;
}

const StoreContext = createContext<StoreContextValue>({
  stores: [],
  currentStore: null,
  currentStoreId: null,
  switchStore: () => {},
  refreshStores: async () => {},
  loading: true,
});

const STORAGE_KEY = "brandmind_current_store_id";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [stores, setStores] = useState<Store[]>([]);
  const [currentStoreId, setCurrentStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStores = useCallback(async () => {
    try {
      const res = await fetch("/api/stores");
      if (!res.ok) return;
      const data = await res.json();
      const list: Store[] = data.stores || [];
      setStores(list);

      // Restore last selected store, or pick the first active one
      const saved = typeof window !== "undefined"
        ? localStorage.getItem(STORAGE_KEY)
        : null;

      if (saved && list.find((s) => s.id === saved)) {
        setCurrentStoreId(saved);
      } else if (list.length > 0) {
        const active = list.find((s) => s.status === "active") || list[0];
        setCurrentStoreId(active.id);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, active.id);
        }
      }
    } catch {
      // silently fail — page-level fallback handles the empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  const switchStore = useCallback((storeId: string) => {
    setCurrentStoreId(storeId);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, storeId);
    }
  }, []);

  const currentStore = stores.find((s) => s.id === currentStoreId) ?? null;

  return (
    <StoreContext.Provider
      value={{
        stores,
        currentStore,
        currentStoreId,
        switchStore,
        refreshStores: loadStores,
        loading,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}

export const PLATFORM_ICONS: Record<string, string> = {
  shopify:    "🛍️",
  amazon:     "📦",
  tiktok_shop:"🎵",
  etsy:       "🎨",
  walmart:    "🏪",
  faire:      "🤝",
  independent:"🌐",
};

export const PLATFORM_COLORS: Record<string, string> = {
  shopify:    "bg-green-500",
  amazon:     "bg-orange-500",
  tiktok_shop:"bg-pink-500",
  etsy:       "bg-orange-400",
  walmart:    "bg-blue-600",
  faire:      "bg-purple-500",
  independent:"bg-gray-500",
};
