"use client";

import { createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";

interface AdminContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
}

export const AdminCtx = createContext<AdminContextType>({ user: null, isAdmin: false, loading: true });
export const useAdmin = () => useContext(AdminCtx);
