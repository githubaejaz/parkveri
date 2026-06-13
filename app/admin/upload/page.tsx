"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);

  async function uploadImage() {
    if (!file) {
      alert("Select image");
      return;
    }

    const fileName =
      `${Date.now()}-${file.name}`;

    const { data, error } =
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

    alert("Uploaded Successfully");

    console.log(
      publicUrl.publicUrl
    );
  }

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-6">
        Upload Vehicle Image
      </h1>

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
        onClick={uploadImage}
        className="ml-4 bg-black text-white px-4 py-2 rounded"
      >
        Upload
      </button>
    </main>
  );
}