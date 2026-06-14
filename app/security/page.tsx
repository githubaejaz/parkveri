"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SecurityPage() {
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [result, setResult] = useState<any>(null);

  async function verifyVehicle() {
    setResult(null);

    const { data: vehicle, error } = await supabase
      .from("vehicles")
      .select(
        `
        *,
        users (
          full_name,
          flat_no,
          wing
        )
      `
      )
      .eq("vehicle_number", vehicleNumber.toUpperCase().trim())
      .single();

    if (error || !vehicle) {
      setResult({
        found: false,
      });
      return;
    }

    const { data: payments } = await supabase
      .from("payments")
      .select("*")
      .eq("vehicle_id", vehicle.id)
      .order("valid_till", { ascending: false })
      .limit(1);

    const latestPayment = payments?.[0];

    const paymentActive =
      latestPayment &&
      new Date(latestPayment.valid_till) >= new Date();

    const active =
      vehicle.is_active &&
      paymentActive;

    const daysRemaining = latestPayment
      ? Math.ceil(
          (new Date(latestPayment.valid_till).getTime() -
            new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

    let statusMessage = "";
    let statusColor = "";

    if (!vehicle.is_active) {
      statusMessage = "🔴 VEHICLE DISABLED";
      statusColor = "text-red-600";
    } else if (!paymentActive) {
      statusMessage = "🔴 PAYMENT EXPIRED";
      statusColor = "text-red-600";
    } else {
      statusMessage = "🟢 ENTRY ALLOWED";
      statusColor = "text-green-600";
    }

    setResult({
      found: true,
      vehicle,
      payment: latestPayment,
      active,
      daysRemaining,
      statusMessage,
      statusColor,
    });
  }

  return (
    <main className="max-w-4xl mx-auto p-6">

      <h1 className="text-4xl font-bold text-black mb-6">
        Security Verification
      </h1>

      <div className="flex gap-2 mb-6">
        <input
          className="border p-3 flex-1 rounded"
          placeholder="Enter Vehicle Number"
          value={vehicleNumber}
          onChange={(e) =>
            setVehicleNumber(e.target.value)
          }
        />

        <button
          onClick={verifyVehicle}
          className="bg-black text-white px-6 rounded"
        >
          Verify
        </button>
      </div>

      {result?.found === false && (
        <div className="border border-red-500 rounded p-6">
          <h2 className="text-3xl font-bold text-red-600">
            🔴 VEHICLE NOT REGISTERED
          </h2>
        </div>
      )}

      {result?.found && (
        <div
          className={`border rounded p-6 ${
            result.active
              ? "border-green-500"
              : "border-red-500"
          }`}
        >

          <h2
            className={`text-3xl font-bold mb-4 ${result.statusColor}`}
          >
            {result.statusMessage}
          </h2>

          {result.vehicle.vehicle_image && (
            <img
              src={result.vehicle.vehicle_image}
              alt="Vehicle"
              className="w-full max-w-md rounded border mb-6"
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <strong>Vehicle Number:</strong>
              <br />
              {result.vehicle.vehicle_number}
            </div>

            <div>
              <strong>Vehicle Type:</strong>
              <br />
              {result.vehicle.vehicle_type}
            </div>

            <div>
              <strong>Owner Name:</strong>
              <br />
              {result.vehicle.users?.full_name}
            </div>

            <div>
              <strong>Flat Number:</strong>
              <br />
              {result.vehicle.users?.wing}-
              {result.vehicle.users?.flat_no}
            </div>

            <div>
              <strong>Vehicle Status:</strong>
              <br />
              {result.vehicle.is_active
                ? "Active"
                : "Disabled"}
            </div>

            <div>
              <strong>Valid Till:</strong>
              <br />
              {result.payment?.valid_till || "N/A"}
            </div>

            <div>
              <strong>Days Remaining:</strong>
              <br />
              {result.daysRemaining}
            </div>

          </div>

        </div>
      )}

    </main>
  );
}