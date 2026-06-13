"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [flatNo, setFlatNo] = useState("");
  const [wing, setWing] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("users").insert([
      {
        full_name: fullName,
        mobile,
        email,
        flat_no: flatNo,
        wing,
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Resident Registered Successfully");

    setFullName("");
    setMobile("");
    setEmail("");
    setFlatNo("");
    setWing("");
  };

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        Resident Registration
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">

        <input
          className="border p-2 w-full"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <input
          className="border p-2 w-full"
          placeholder="Mobile Number"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
        />

        <input
          className="border p-2 w-full"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="border p-2 w-full"
          placeholder="Flat Number"
          value={flatNo}
          onChange={(e) => setFlatNo(e.target.value)}
        />

        <input
          className="border p-2 w-full"
          placeholder="Wing"
          value={wing}
          onChange={(e) => setWing(e.target.value)}
        />

        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded"
        >
          Register
        </button>

      </form>
    </main>
  );
}