"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";

const adminMenus = [
  {
    title: "Resident Registration",
    url: "/register",
    icon: "👤",
  },
  {
    title: "Vehicle Registration",
    url: "/vehicle",
    icon: "🚗",
  },
  {
    title: "Payment Management",
    url: "/payment",
    icon: "💳",
  },
  {
    title: "Vehicle Search",
    url: "/search",
    icon: "🔍",
  },
  {
    title: "Vehicle Status",
    url: "/status",
    icon: "📋",
  },
  {
    title: "Security Verification",
    url: "/security",
    icon: "🛡️",
  },
  {
    title: "Vehicle Management",
    url: "/admin/vehicles",
    icon: "⚙️",
  },
  {
    title: "Vehicle Images",
    url: "/admin/vehicle-image",
    icon: "📸",
  },
  {
    title: "Scanner",
    url: "/scan",
    icon: "📷",
  },
  {
    title: "Smart Scanner",
    url: "/smartscanner",
    icon: "📷",
  },
];

const residentMenus = [
  {
    title: "Vehicle Search",
    url: "/search",
    icon: "🔍",
  },
  {
    title: "Vehicle Status",
    url: "/status",
    icon: "📋",
  },
  {
    title: "Scanner",
    url: "/scan",
    icon: "📷",
  },
  {
    title: "Smart Scanner",
    url: "/smartscanner",
    icon: "📷",
  },
];

const securityMenus = [
  {
    title: "Security Verification",
    url: "/security",
    icon: "🛡️",
  },
  {
    title: "Scanner",
    url: "/scan",
    icon: "📷",
  },
  {
    title: "Smart Scanner",
    url: "/smartscanner",
    icon: "📷",
  },
];

export default function HomePage() {
  const { role } = useAuth();
  const router = useRouter();

  async function logout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/login");
    router.refresh();
  }

  let menus = residentMenus;
  
  if (role === "admin") {
    menus = adminMenus;
  }

  if (role === "security") {
    menus = securityMenus;
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gray-100 p-8">

        <div className="max-w-6xl mx-auto">

          <h1 className="text-5xl font-bold text-black mb-2">
            ParkVeri
          </h1>

          <p className="text-gray-600 mb-2">
            Society Parking Verification System
          </p>

          <div className="flex justify-between items-center mb-8">

            <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded font-semibold">
            Logged in as: {String(role || "").toUpperCase()}
            </span>

            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
            >
              Logout
            </button>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {menus.map((menu) => (
              <Link
                key={menu.url}
                href={menu.url}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
              >
                <div className="text-4xl mb-3">
                  {menu.icon}
                </div>

                <h2 className="font-bold text-lg text-black">
                  {menu.title}
                </h2>
              </Link>
            ))}

          </div>

        </div>

      </main>
    </ProtectedRoute>
  );
}