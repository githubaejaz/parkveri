"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function VehiclePage() {
  const [userId, setUserId] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase
      .from("vehicles")
      .insert([
        {
          user_id: userId,
          vehicle_number: vehicleNumber,
          vehicle_type: vehicleType,
        },
      ]);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Vehicle Added Successfully");

    setUserId("");
    setVehicleNumber("");
    setVehicleType("");
  };

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        Vehicle Registration
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">

        <input
          className="border p-2 w-full"
          placeholder="User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />

        <input
          className="border p-2 w-full"
          placeholder="Vehicle Number"
          value={vehicleNumber}
          onChange={(e) => setVehicleNumber(e.target.value)}
        />

        <select
          className="border p-2 w-full"
          value={vehicleType}
          onChange={(e) => setVehicleType(e.target.value)}
        >
          <option value="">Select Vehicle Type</option>
          <option value="Car">Car</option>
          <option value="Bike">Bike</option>
        </select>

        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded"
        >
          Save Vehicle
        </button>

      </form>
    </main>
  );
}