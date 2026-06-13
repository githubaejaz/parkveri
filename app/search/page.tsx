"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SearchPage() {
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicle, setVehicle] = useState<any>(null);

  async function searchVehicle() {
    const { data, error } = await supabase
      .from("vehicles")
      .select(`
        *,
        users (
          full_name,
          flat_no,
          wing
        )
      `)
      .eq("vehicle_number", vehicleNumber)
      .single();

    if (error) {
      alert("Vehicle Not Found");
      setVehicle(null);
      return;
    }

    setVehicle(data);
  }

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        Vehicle Search
      </h1>

      <div className="flex gap-2">
        <input
          className="border p-2 flex-1"
          placeholder="Enter Vehicle Number"
          value={vehicleNumber}
          onChange={(e) => setVehicleNumber(e.target.value)}
        />

        <button
          onClick={searchVehicle}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Search
        </button>
      </div>

      {vehicle && (
        <div className="mt-6 border rounded p-4">

          <h2 className="text-xl font-bold mb-2">
            Vehicle Details
          </h2>

          <p>
            <strong>Vehicle:</strong>{" "}
            {vehicle.vehicle_number}
          </p>

          <p>
            <strong>Type:</strong>{" "}
            {vehicle.vehicle_type}
          </p>

          <p>
            <strong>Owner:</strong>{" "}
            {vehicle.users?.full_name}
          </p>

          <p>
            <strong>Flat:</strong>{" "}
            {vehicle.users?.wing}-
            {vehicle.users?.flat_no}
          </p>

        </div>
      )}
    </main>
  );
}