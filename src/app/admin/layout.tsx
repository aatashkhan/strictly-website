"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { AdminCtx } from "./AdminContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setLoading(false);
        return;
      }
      setUser(authUser);

      const { data: admin } = await supabase
        .from("admin_users")
        .select("id")
        .eq("id", authUser.id)
        .single();

      setIsAdmin(!!admin);
      setLoading(false);
    };

    check();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <p className="font-mono text-muted">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream gap-6">
        <h1 className="font-serif text-3xl text-brown">Admin Access</h1>
        <p className="font-mono text-sm text-secondary">Sign in with your admin account.</p>
        <button
          onClick={() => supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: window.location.origin + "/admin" },
          })}
          className="px-6 py-3 bg-brown text-cream font-mono text-sm rounded-full hover:bg-brown/90 transition-colors"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream gap-4">
        <h1 className="font-serif text-3xl text-brown">Access Denied</h1>
        <p className="font-mono text-sm text-secondary">
          You don&apos;t have admin access. Signed in as {user.email}.
        </p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="px-5 py-2 border border-border rounded-full font-mono text-sm text-secondary hover:border-gold transition-colors"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <AdminCtx.Provider value={{ user, isAdmin, loading }}>
      {children}
    </AdminCtx.Provider>
  );
}
