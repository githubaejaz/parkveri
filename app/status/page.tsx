"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function StatusPage() {
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [result, setResult] = useState<any>(null);

  async function checkStatus() {
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("*")
      .eq("vehicle_number", vehicleNumber)
      .single();

    if (!vehicle) {
      alert("Vehicle Not Found");
      return;
    }

    const { data: payments } = await supabase
      .from("payments")
      .select("*")
      .eq("vehicle_id", vehicle.id)
      .order("valid_till", { ascending: false })
      .limit(1);

    const latestPayment = payments?.[0];

    const today = new Date();

    const validTill = latestPayment
      ? new Date(latestPayment.valid_till)
      : null;

    const active =
      validTill && validTill >= today;

    setResult({
      vehicle,
      payment: latestPayment,
      active,
    });
  }

  return (
    <main className="max-w-2xl mx-auto p-6">

      <h1 className="text-3xl font-bold mb-6">
        Vehicle Status Check
      </h1>

      <div className="flex gap-2">
        <input
          className="border p-2 flex-1"
          placeholder="Vehicle Number"
          value={vehicleNumber}
          onChange={(e) =>
            setVehicleNumber(e.target.value)
          }
        />

        <button
          onClick={checkStatus}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Check
        </button>
      </div>

      {result && (
        <div className="mt-6 border rounded p-4">

          <p>
            Vehicle:
            {result.vehicle.vehicle_number}
          </p>

          <p>
            Type:
            {result.vehicle.vehicle_type}
          </p>

          <p>
            Valid Till:
            {result.payment?.valid_till}
          </p>

          <p
            className={`text-2xl font-bold mt-4 ${
              result.active
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {result.active
              ? "ACTIVE"
              : "EXPIRED"}
          </p>

        </div>
      )}
    </main>
  );
}