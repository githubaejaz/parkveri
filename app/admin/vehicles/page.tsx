"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function VehicleListPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    const { data, error } = await supabase
      .from("vehicle_details")
      .select("*")
      .order("vehicle_number");

    if (error) {
      console.error(error);
      return;
    }

    setVehicles(data || []);
    setLoading(false);
  }

  async function toggleVehicleStatus(
    id: string,
    currentStatus: boolean
  ) {
    const { error } = await supabase
      .from("vehicles")
      .update({
        is_active: !currentStatus,
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadVehicles();
  }

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <main className="p-6">

      <h1 className="text-3xl font-bold mb-6">
        Vehicle Management
      </h1>

      <div className="overflow-auto">

        <table className="w-full border">

          <thead>
            <tr className="border-b bg-gray-100">

              <th className="p-3 text-left">
                Vehicle Number
              </th>

              <th className="p-3 text-left">
                Owner
              </th>

              <th className="p-3 text-left">
                Flat
              </th>

              <th className="p-3 text-left">
                Type
              </th>

              <th className="p-3 text-left">
                Status
              </th>

              <th className="p-3 text-left">
                Action
              </th>

            </tr>
          </thead>

          <tbody>

            {vehicles.map((vehicle) => (
              <tr
                key={vehicle.id}
                className="border-b"
              >
                <td className="p-3">
                  {vehicle.vehicle_number}
                </td>

                <td className="p-3">
                  {vehicle.full_name}
                </td>

                <td className="p-3">
                  {vehicle.wing}-{vehicle.flat_no}
                </td>

                <td className="p-3">
                  {vehicle.vehicle_type}
                </td>

                <td className="p-3">

                  {vehicle.is_active ? (
                    <span className="text-green-600 font-bold">
                      Active
                    </span>
                  ) : (
                    <span className="text-red-600 font-bold">
                      Disabled
                    </span>
                  )}

                </td>

                <td className="p-3">

                  <button
                    onClick={() =>
                      toggleVehicleStatus(
                        vehicle.id,
                        vehicle.is_active
                      )
                    }
                    className="border px-3 py-1 rounded"
                  >
                    {vehicle.is_active
                      ? "Disable"
                      : "Enable"}
                  </button>

                </td>

              </tr>
            ))}

          </tbody>

        </table>

      </div>

    </main>
  );
}