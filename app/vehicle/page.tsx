"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function VehiclePage() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState("");

  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    const { data, error } = await supabase
      .from("users")
      .select("id, full_name, wing, flat_no")
      .order("wing");

    if (!error && data) {
      setUsers(data);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedUser) {
      alert("Please select resident");
      return;
    }

    const { error } = await supabase
      .from("vehicles")
      .insert([
        {
          user_id: selectedUser,
          vehicle_number: vehicleNumber.toUpperCase(),
          vehicle_type: vehicleType,
        },
      ]);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Vehicle Added Successfully");

    setSelectedUser("");
    setVehicleNumber("");
    setVehicleType("");
  }

  return (
    <main className="max-w-xl mx-auto p-6">

      <h1 className="text-3xl font-bold text-black mb-6">
        Vehicle Registration
      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >

        {/* Resident Dropdown */}

        <select
          className="border p-3 w-full rounded text-black bg-white"
          value={selectedUser}
          onChange={(e) =>
            setSelectedUser(e.target.value)
          }
        >
          <option value="">
            Select Resident
          </option>

          {users.map((user) => (
            <option
              key={user.id}
              value={user.id}
            >
              {user.wing}-{user.flat_no} |{" "}
              {user.full_name}
            </option>
          ))}
        </select>

        {/* Vehicle Number */}

        <input
          className="border p-3 w-full rounded text-black bg-white"
          placeholder="MH02AB1234"
          value={vehicleNumber}
          onChange={(e) =>
            setVehicleNumber(
              e.target.value.toUpperCase()
            )
          }
        />

        {/* Vehicle Type */}

        <select
          className="border p-3 w-full rounded text-black bg-white"
          value={vehicleType}
          onChange={(e) =>
            setVehicleType(e.target.value)
          }
        >
          <option value="">
            Select Vehicle Type
          </option>

          <option value="Car">
            Car
          </option>

          <option value="Bike">
            Bike
          </option>
        </select>

        <button
          type="submit"
          className="bg-black text-white px-5 py-3 rounded"
        >
          Save Vehicle
        </button>

      </form>

    </main>
  );
}