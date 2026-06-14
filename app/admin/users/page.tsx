"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/auth";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [flatNo, setFlatNo] = useState("");
  const [wing, setWing] = useState("");
  const [role, setRole] = useState("resident");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    const { data } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    setUsers(data || []);
  }

  // -----------------------------
  // CREATE USER (AUTH + TABLE)
  // -----------------------------
  async function createUser() {
    setLoading(true);

    // STEP 1: Create Auth User
    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email,
        password,
      });

    if (authError) {
      alert(authError.message);
      setLoading(false);
      return;
    }

    const userId = authData.user?.id;

    if (!userId) {
      alert("User ID not created");
      setLoading(false);
      return;
    }

    // STEP 2: Insert into public.users
    const { error: dbError } = await supabase.from("users").insert({
      id: userId,
      email,
      full_name: fullName,
      flat_no: flatNo,
      wing: wing,
      role: role,
    });

    if (dbError) {
      alert(dbError.message);
      setLoading(false);
      return;
    }

    alert("User created successfully!");

    // reset
    setEmail("");
    setPassword("");
    setFullName("");
    setFlatNo("");
    setWing("");
    setRole("resident");

    fetchUsers();
    setLoading(false);
  }

  return (
    <main className="p-6 max-w-4xl mx-auto">

      <h1 className="text-3xl font-bold mb-6">
        👤 User Management (Admin)
      </h1>

      {/* FORM */}
      <div className="border p-4 rounded mb-6 space-y-3">

        <input
          className="border p-2 w-full"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="border p-2 w-full"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          className="border p-2 w-full"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <div className="flex gap-2">
          <input
            className="border p-2 w-full"
            placeholder="Wing"
            value={wing}
            onChange={(e) => setWing(e.target.value)}
          />

          <input
            className="border p-2 w-full"
            placeholder="Flat No"
            value={flatNo}
            onChange={(e) => setFlatNo(e.target.value)}
          />
        </div>

        <select
          className="border p-2 w-full"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="admin">Admin</option>
          <option value="security">Security</option>
          <option value="resident">Resident</option>
        </select>

        <button
          onClick={createUser}
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded w-full"
        >
          {loading ? "Creating..." : "Create User"}
        </button>

      </div>

      {/* USER LIST */}
      <div className="space-y-3">

        {users.map((u) => (
          <div key={u.id} className="border p-3 rounded text-black bg-white">

            <p><b>Name:</b> {u.full_name}</p>
            <p><b>Email:</b> {u.email}</p>
            <p><b>Flat:</b> {u.wing}-{u.flat_no}</p>
            <p><b>Role:</b> {u.role}</p>

          </div>
        ))}

      </div>

    </main>
  );
}