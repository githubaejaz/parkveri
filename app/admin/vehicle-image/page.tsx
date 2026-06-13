"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function VehicleImagePage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    const { data } = await supabase
      .from("vehicles")
      .select("id, vehicle_number");

    setVehicles(data || []);
  }

  async function uploadAndSave() {
    if (!file || !vehicleId) {
      alert("Select vehicle and image");
      return;
    }

    const fileName =
      `${Date.now()}-${file.name}`;

    const { error } =
      await supabase.storage
        .from("vehicle-images")
        .upload(fileName, file);

    if (error) {
      alert(error.message);
      return;
    }

    const { data: publicUrl } =
      supabase.storage
        .from("vehicle-images")
        .getPublicUrl(fileName);

    await supabase
      .from("vehicles")
      .update({
        vehicle_image:
          publicUrl.publicUrl,
      })
      .eq("id", vehicleId);

    alert("Vehicle Image Saved");
  }

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-6">
        Vehicle Image Mapping
      </h1>

      <select
        className="border p-2 w-full mb-4"
        value={vehicleId}
        onChange={(e) =>
          setVehicleId(e.target.value)
        }
      >
        <option value="">
          Select Vehicle
        </option>

        {vehicles.map((v) => (
          <option
            key={v.id}
            value={v.id}
          >
            {v.vehicle_number}
          </option>
        ))}
      </select>

      <input
        type="file"
        accept="image/*"
        onChange={(e) =>
          setFile(
            e.target.files?.[0] || null
          )
        }
      />

      <button
        onClick={uploadAndSave}
        className="ml-4 bg-black text-white px-4 py-2 rounded"
      >
        Save Image
      </button>
    </main>
  );
}