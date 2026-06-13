"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function PaymentPage() {
  const [vehicleId, setVehicleId] = useState("");
  const [amount, setAmount] = useState("");
  const [validTill, setValidTill] = useState("");

  async function savePayment(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase
      .from("payments")
      .insert([
        {
          vehicle_id: vehicleId,
          amount: Number(amount),
          valid_till: validTill,
          status: "PAID",
        },
      ]);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Payment Saved");
  }

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        Parking Payment
      </h1>

      <form onSubmit={savePayment} className="space-y-4">

        <input
          className="border p-2 w-full"
          placeholder="Vehicle ID"
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
        />

        <input
          className="border p-2 w-full"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <input
          type="date"
          className="border p-2 w-full"
          value={validTill}
          onChange={(e) => setValidTill(e.target.value)}
        />

        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded"
        >
          Save Payment
        </button>

      </form>
    </main>
  );
}