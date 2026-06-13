"use client";

import { useRef, useState } from "react";
import Webcam from "react-webcam";
import Tesseract from "tesseract.js";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function ScanPage() {
  const webcamRef = useRef<Webcam>(null);

  const [image, setImage] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [cleanPlate, setCleanPlate] = useState("");
  const [pageloading, setPageLoading] = useState(false);

  const [vehicle, setVehicle] = useState(null);
  const [payment, setPayment] = useState(null);
  const [status, setStatus] = useState<any>(null);

const { user, role, loading } = useAuth();
const router = useRouter();

useEffect(() => {
  if (!loading) {
    if (!user) {
      router.push("/login");
    } else if (role !== "admin" && role !== "security") {
      router.push("/");
    }
  }
}, [user, role, loading]);

  // -----------------------------
  // Capture Image
  // -----------------------------
  function captureImage() {
    const img = webcamRef.current?.getScreenshot();
    if (img) {
      setImage(img);
      reset();
    }
  }

  function reset() {
    setOcrText("");
    setCleanPlate("");
    setVehicle(null);
    setPayment(null);
    setStatus(null);
  }

  // -----------------------------
  // OCR CLEANING (IMPORTANT)
  // -----------------------------
  function normalizePlate(text: string) {
    const cleaned = text
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      // OCR fixes
      .replace(/O/g, "0")
      .replace(/I/g, "1")
      .replace(/Z/g, "2");

    const patterns = [
      /[A-Z]{2}[0-9]{2}[A-Z]{1,3}[0-9]{4}/, // MH02AB1234
      /[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{3,4}/
    ];

    for (const p of patterns) {
      const match = cleaned.match(p);
      if (match) return match[0];
    }

    return "";
  }

  // -----------------------------
  // CONFIDENCE CHECK (SIMULATED)
  // -----------------------------
  function getConfidence(text: string, plate: string) {
    if (!plate) return 0;

    if (plate.length >= 10) return 90;
    if (plate.length >= 8) return 75;
    if (plate.length >= 6) return 55;

    return 30;
  }

  // -----------------------------
  // OCR RUN
  // -----------------------------
  async function runOCR() {
    if (!image) return alert("Capture image first");

    setPageLoading(true);

    const result = await Tesseract.recognize(image, "eng");
    const text = result.data.text;

    setOcrText(text);

    const plate = normalizePlate(text);
    const confidence = getConfidence(text, plate);

    if (!plate || confidence < 60) {
      setCleanPlate("");
      setStatus({
        type: "low_confidence",
        confidence,
      });
      setPageLoading(false);
      return;
    }

    setCleanPlate(plate);
    await searchVehicle(plate);

    setPageLoading(false);
  }

  // -----------------------------
  // SEARCH VEHICLE + PAYMENT
  // -----------------------------
  async function searchVehicle(plate: string) {
    const { data: v } = await supabase
      .from("vehicles")
      .select(`
        *,
        users (
          full_name,
          flat_no,
          wing
        )
      `)
      .eq("vehicle_number", plate)
      .single();

    if (!v) {
      setStatus({
  type: "not_found",
  paymentActive: false,
  vehicleActive: false,
  daysRemaining: 0,
  confidence: 0,
});
      return;
    }

    const { data: payments } = await supabase
      .from("payments")
      .select("*")
      .eq("vehicle_id", v.id)
      .order("valid_till", { ascending: false })
      .limit(1);

    const latest = payments?.[0];

    const paymentActive =
      latest &&
      new Date(latest.valid_till) >= new Date();

    const allowed =
      v.is_active && paymentActive;

    const daysRemaining = latest
      ? Math.ceil(
          (new Date(latest.valid_till).getTime() -
            new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

    setVehicle(v);
    setPayment(latest);

    setStatus({
      type: allowed ? "allowed" : "denied",
      paymentActive,
      vehicleActive: v.is_active,
      daysRemaining,
      confidence: status?.confidence || 100,
    });
  }

  // -----------------------------
  // MANUAL VERIFY
  // -----------------------------
  async function manualSearch() {
    if (!cleanPlate) return;
    await searchVehicle(cleanPlate);
  }

  return (
    <main className="max-w-5xl mx-auto p-6">

      <h1 className="text-4xl font-bold mb-6">
        🚗 Smart Scanner PRO
      </h1>

      {/* CAMERA */}
      <div className="border p-4 rounded">

        {!image ? (
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className="w-full rounded"
          />
        ) : (
          <img src={image} className="w-full rounded" />
        )}

        <div className="flex gap-2 mt-3">

          <button
            onClick={captureImage}
            className="bg-black text-white px-4 py-2 rounded"
          >
            Capture
          </button>

          <button
            onClick={() => setImage(null)}
            className="border px-4 py-2 rounded"
          >
            Reset
          </button>

          <button
            onClick={runOCR}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            {pageloading ? "Scanning..." : "Scan Plate"}
          </button>

        </div>
      </div>

      {/* OCR TEXT */}
      {ocrText && (
        <div className="border p-3 rounded mt-3 text-sm">
          <b>OCR Raw Output:</b>
          <pre>{ocrText}</pre>
        </div>
      )}

      {/* LOW CONFIDENCE */}
      {status?.type === "low_confidence" && (
        <div className="border p-4 rounded bg-yellow-50 mt-4">
          <h2 className="text-yellow-700 font-bold">
            ⚠ LOW CONFIDENCE DETECTION
          </h2>

          <p>Confidence: {status.confidence}%</p>

          <p className="mt-2">
            Please enter number manually:
          </p>

          <input
            className="border p-2 w-full mt-2"
            value={cleanPlate}
            onChange={(e) =>
              setCleanPlate(e.target.value.toUpperCase())
            }
          />

          <button
            onClick={manualSearch}
            className="mt-2 bg-green-600 text-white px-4 py-2 rounded"
          >
            Verify Manually
          </button>
        </div>
      )}

      {/* RESULT CARD */}
      {vehicle && status?.type !== "low_confidence" && (
        <div
          className={`border p-5 rounded mt-4 ${
            status?.type === "allowed"
              ? "bg-green-50"
              : "bg-red-50"
          }`}
        >

          <h2
            className={`text-2xl font-bold mb-4 ${
              status?.type === "allowed"
                ? "text-green-700"
                : "text-red-700"
            }`}
          >
            {status?.type === "allowed"
              ? "🟢 ENTRY ALLOWED"
              : "🔴 ENTRY DENIED"}
          </h2>

          {vehicle.vehicle_image && (
            <img
              src={vehicle.vehicle_image}
              className="w-64 rounded mb-4"
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">

            <p><b>Vehicle:</b> {vehicle.vehicle_number}</p>
            <p><b>Type:</b> {vehicle.vehicle_type}</p>
            <p><b>Make:</b> {vehicle.vehicle_make || "-"}</p>
            <p><b>Model:</b> {vehicle.vehicle_model || "-"}</p>
            <p><b>Color:</b> {vehicle.vehicle_color || "-"}</p>

            <p><b>Owner:</b> {vehicle.users?.full_name}</p>
            <p>
              <b>Flat:</b>{" "}
              {vehicle.users?.wing}-{vehicle.users?.flat_no}
            </p>

            <p>
              <b>Vehicle Active:</b>{" "}
              {status.vehicleActive ? "Yes" : "No"}
            </p>

            <p>
              <b>Payment Active:</b>{" "}
              {status.paymentActive ? "Yes" : "No"}
            </p>

            <p>
              <b>Valid Till:</b>{" "}
              {payment?.valid_till || "N/A"}
            </p>

            <p>
              <b>Days Left:</b>{" "}
              {status.daysRemaining}
            </p>

          </div>
        </div>
      )}

      {/* NOT FOUND */}
      {status?.type === "not_found" && (
        <div className="border p-4 rounded bg-gray-100 mt-4">
          <h2 className="font-bold">
            ❌ VEHICLE NOT FOUND
          </h2>
        </div>
      )}

    </main>
  );
}