"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/auth";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();

    const { data: listener } =
      supabase.auth.onAuthStateChange(() => {
        init();
      });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function init() {
    setLoading(true);

    const { data } = await supabase.auth.getUser();
    const authUser = data?.user;

    setUser(authUser);

    if (!authUser) {
      setRole(null);
      setLoading(false);
      return;
    }

    // GET ROLE FROM USERS TABLE
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", authUser.id)
      .single();

    setRole(profile?.role || "resident");
    setLoading(false);
  }

  return { user, role, loading };
}