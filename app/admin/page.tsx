"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    residents: 0,
    vehicles: 0,
    activeVehicles: 0,
    disabledVehicles: 0,
    validPayments: 0,
    expiredPayments: 0,
  });

  const { user, role, loading } = useAuth();
const router = useRouter();

useEffect(() => {
  if (!loading) {
    if (!user) {
      router.push("/login");
    } else if (role !== "admin") {
      router.push("/");
    }
  }
}, [user, role, loading]);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const { count: residents } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    const { data: vehicles } = await supabase
      .from("vehicles")
      .select("*");

    const { data: payments } = await supabase
      .from("payments")
      .select("*");

    const today = new Date();

    const activeVehicles =
      vehicles?.filter(v => v.is_active).length || 0;

    const disabledVehicles =
      vehicles?.filter(v => !v.is_active).length || 0;

    const validPayments =
      payments?.filter(
        p => new Date(p.valid_till) >= today
      ).length || 0;

    const expiredPayments =
      payments?.filter(
        p => new Date(p.valid_till) < today
      ).length || 0;

    setStats({
      residents: residents || 0,
      vehicles: vehicles?.length || 0,
      activeVehicles,
      disabledVehicles,
      validPayments,
      expiredPayments,
    });
  }

  const cards = [
    {
      title: "Residents",
      value: stats.residents,
      icon: "👤",
    },
    {
      title: "Vehicles",
      value: stats.vehicles,
      icon: "🚗",
    },
    {
      title: "Active Vehicles",
      value: stats.activeVehicles,
      icon: "✅",
    },
    {
      title: "Disabled Vehicles",
      value: stats.disabledVehicles,
      icon: "❌",
    },
    {
      title: "Valid Payments",
      value: stats.validPayments,
      icon: "💰",
    },
    {
      title: "Expired Payments",
      value: stats.expiredPayments,
      icon: "⚠️",
    },
  ];

  return (
    <main className="p-8">

      <h1 className="text-4xl font-bold mb-8">
        Admin Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {cards.map(card => (
          <div
            key={card.title}
            className="bg-white border rounded-lg p-6 shadow"
          >
            <div className="text-4xl mb-3">
              {card.icon}
            </div>

            <h2 className="text-lg font-semibold">
              {card.title}
            </h2>

            <p className="text-3xl font-bold mt-2">
              {card.value}
            </p>
          </div>
        ))}

      </div>

    </main>
  );
}