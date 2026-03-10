"use client";

import { createContext, useContext, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AdminContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  adminFetch: (url: string, init?: RequestInit) => Promise<Response>;
}

export const AdminCtx = createContext<AdminContextType>({
  user: null,
  isAdmin: false,
  loading: true,
  adminFetch: (url, init) => fetch(url, init),
});

export const useAdmin = () => useContext(AdminCtx);

/**
 * Hook that returns a fetch wrapper which automatically
 * includes the Supabase access token in the Authorization header.
 */
export function useAdminFetch() {
  const adminFetch = useCallback(async (url: string, init?: RequestInit): Promise<Response> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers = new Headers(init?.headers);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(url, { ...init, headers });
  }, []);

  return adminFetch;
}
