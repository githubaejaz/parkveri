"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function PaymentPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");

  const [amount, setAmount] = useState("");
  const [validTill, setValidTill] = useState("");

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    const { data, error } = await supabase
      .from("vehicles")
      .select(`
        id,
        vehicle_number,
        vehicle_type,
        users (
          full_name,
          wing,
          flat_no
        )
      `)
      .order("vehicle_number");

    if (!error && data) {
      setVehicles(data);
    }
  }

  async function savePayment(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedVehicle) {
      alert("Please select vehicle");
      return;
    }

    const { error } = await supabase
      .from("payments")
      .insert([
        {
          vehicle_id: selectedVehicle,
          amount: Number(amount),
          valid_till: validTill,
          status: "PAID",
        },
      ]);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Payment Saved Successfully");

    setSelectedVehicle("");
    setAmount("");
    setValidTill("");
  }

  const selectedVehicleData = vehicles.find(
    (v) => v.id === selectedVehicle
  );

  return (
    <main className="max-w-xl mx-auto p-6">

      <h1 className="text-3xl font-bold text-black mb-6">
        Parking Payment
      </h1>

      <form
        onSubmit={savePayment}
        className="space-y-4"
      >

        {/* Vehicle Dropdown */}

        <select
          className="border p-3 w-full rounded text-black bg-white"
          value={selectedVehicle}
          onChange={(e) =>
            setSelectedVehicle(e.target.value)
          }
        >
          <option value="">
            Select Vehicle
          </option>

          {vehicles.map((vehicle) => (
            <option
              key={vehicle.id}
              value={vehicle.id}
            >
              {vehicle.vehicle_number} |{" "}
              {vehicle.users?.wing}-
              {vehicle.users?.flat_no} |{" "}
              {vehicle.users?.full_name}
            </option>
          ))}
        </select>

        {/* Selected Vehicle Info */}

        {selectedVehicleData && (
          <div className="border rounded p-4 bg-gray-50">

            <p>
              <strong>Owner:</strong>{" "}
              {selectedVehicleData.users?.full_name}
            </p>

            <p>
              <strong>Flat:</strong>{" "}
              {selectedVehicleData.users?.wing}-
              {selectedVehicleData.users?.flat_no}
            </p>

            <p>
              <strong>Vehicle:</strong>{" "}
              {selectedVehicleData.vehicle_number}
            </p>

            <p>
              <strong>Type:</strong>{" "}
              {selectedVehicleData.vehicle_type}
            </p>

          </div>
        )}

        {/* Amount */}

        <input
          className="border p-3 w-full rounded text-black bg-white"
          placeholder="Amount"
          value={amount}
          onChange={(e) =>
            setAmount(e.target.value)
          }
        />

        {/* Valid Till */}

        <input
          type="date"
          className="border p-3 w-full rounded text-black bg-white"
          value={validTill}
          onChange={(e) =>
            setValidTill(e.target.value)
          }
        />

        <button
          type="submit"
          className="bg-black text-white px-5 py-3 rounded"
        >
          Save Payment
        </button>

      </form>

    </main>
  );
}