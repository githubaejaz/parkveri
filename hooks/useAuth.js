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
    console.log("data check");
    console.log(data);
    const authUser = data?.user;

    setUser(authUser);

    if (!authUser) {
      setRole(null);
      setLoading(false);
      return;
    }

    // GET ROLE FROM USERS TABLE
    const { data: profile, error } = await supabase
  .from("users")
  .select("role")
  .eq("id", authUser.id)
  .maybeSingle();

if (error) {
  console.error(error);
}

setRole(profile?.role || "resident");
    console.log(profile);
    console.log(profile?.role);
    setLoading(false);
  }

  return { user, role, loading };
}