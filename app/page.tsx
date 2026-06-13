import Link from "next/link";

const menus = [
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
  title: "Smart Scanner",
  url: "/scan",
  icon: "📷",
},
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-100 p-8">

      <div className="max-w-6xl mx-auto">

        <h1 className="text-5xl font-bold mb-2">
          ParkVeri
        </h1>

        <p className="text-gray-600 mb-8">
          Society Parking Verification System
        </p>

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

              <h2 className="font-bold text-lg">
                {menu.title}
              </h2>
            </Link>
          ))}

        </div>

      </div>

    </main>
  );
}