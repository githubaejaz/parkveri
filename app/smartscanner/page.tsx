"use client";

import { useRef, useState } from "react";
import Webcam from "react-webcam";
import Tesseract from "tesseract.js";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

type StatusType = {
  type: "low_confidence" | "not_found" | "allowed" | "denied";
  paymentActive: boolean;
  vehicleActive: boolean;
  daysRemaining: number;
  confidence: number;
};

export default function ScanPage() {
  const webcamRef = useRef<Webcam>(null);

  const [image, setImage] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [cleanPlate, setCleanPlate] = useState("");
  const [pageloading, setPageLoading] = useState(false);

  const [vehicle, setVehicle] = useState<any | null>(null);
  const [payment, setPayment] = useState<any | null>(null);
  const [status, setStatus] = useState<StatusType | null>(null);
  const [facingMode, setFacingMode] = useState("environment");

const { user, role, loading } = useAuth();
const router = useRouter();

/*useEffect(() => {
  if (!loading) {
    if (!user) {
      router.push("/login");
    } else if (role !== "admin" && role !== "security") {
      router.push("/");
    }
  }
}, [user, role, loading]);*/

  // -----------------------------
  // Capture Image
  // -----------------------------
  function captureImage() {
    const img = webcamRef.current?.getScreenshot();
    if (img) {
      setImage(img);
    }
  }

  

  // -----------------------------
  // OCR CLEANING (IMPORTANT)
  // -----------------------------
  function normalizePlate(text: string) {

    let cleaned = text
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
  
    cleaned = cleaned
      .replace(/5/g, "S")
      .replace(/8/g, "B");
  
    const patterns = [
  
      /[A-Z]{2}[0-9]{2}[A-Z]{1,3}[0-9]{4}/,
  
      /[A-Z]{2}[0-9]{1}[A-Z]{1,3}[0-9]{4}/,
  
    ];
  
    for (const p of patterns) {
  
      const match =
        cleaned.match(p);
  
      if (match) {
  
        let plate =
          match[0];
  
        plate =
          plate.replace(
            /^([A-Z]{2})(.*)$/,
            (_, s, rest) =>
              s
                .replace(/0/g, "O")
                .replace(/1/g, "I") +
              rest
          );
  
        return plate;
      }
    }
  
    return "";
  }

  // -----------------------------
  // CONFIDENCE CHECK (SIMULATED)
  // -----------------------------
  function getConfidence(
    ocrConfidence: number,
    plate: string
  ) {
    if (!plate) return 0;
  
    let score = Math.round(ocrConfidence);
  
    if (plate.length >= 10)
      score += 10;
  
    return Math.min(score, 100);
  }

  // -----------------------------
  // OCR RUN
  // -----------------------------
  async function runOCR() {
    if (!image) {
      alert("Capture image first");
      return;
    }
  
    setPageLoading(true);
  
    try {
      setVehicle(null);
      setPayment(null);
      setStatus(null);
  
      // =====================================
      // MULTIPLE CROP REGIONS
      // =====================================
  
      const regions = await cropMultipleRegions(image);
  
      const allTexts: string[] = [];
      const allCandidates: string[] = [];
  
      let highestConfidence = 0;
  
      for (const region of regions) {
  
        const grayImage =
          await makeGrayScale(region);
  
        const contrastImage =
          await makeHighContrast(region);
  
        const imagesToScan = [
          region,
          grayImage,
          contrastImage,
        ];
  
        for (const img of imagesToScan) {
  
          const result =
  await Tesseract.recognize(
    img,
    "eng",
    {
      tessedit_pageseg_mode: "7",
      tessedit_char_whitelist:
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
      logger: (m) =>
        console.log(m),
    } as any
  );
  
          const text =
            result.data.text || "";
  
          const confidence =
            result.data.confidence || 0;
  
          highestConfidence =
            Math.max(
              highestConfidence,
              confidence
            );
  
          allTexts.push(text);
  
          const plate =
            normalizePlate(text);
  
          if (plate) {
            allCandidates.push(plate);
          }
        }
      }
  
      // =====================================
      // SHOW OCR OUTPUT
      // =====================================
  
      setOcrText(
        allTexts.join("\n-----------------\n")
      );
  
      console.log(
        "Detected Plates:",
        allCandidates
      );
  
      // =====================================
      // NO PLATE
      // =====================================
  
      if (allCandidates.length === 0) {
  
        setStatus({
          type: "low_confidence",
          confidence: 0,
          paymentActive: false,
          vehicleActive: false,
          daysRemaining: 0,
        });
  
        return;
      }
  
      // =====================================
      // VOTING SYSTEM
      // =====================================
  
      const frequency:
        Record<string, number> = {};
  
      allCandidates.forEach((plate) => {
        frequency[plate] =
          (frequency[plate] || 0) + 1;
      });
  
      const bestPlate =
        Object.keys(frequency)
          .sort(
            (a, b) =>
              frequency[b] -
              frequency[a]
          )[0];
  
      const confidence =
        getConfidence(
          highestConfidence,
          bestPlate
        );
  
      setCleanPlate(bestPlate);
  
      console.log(
        "Best Plate:",
        bestPlate
      );
  
      console.log(
        "Confidence:",
        confidence
      );
  
      // =====================================
      // SEARCH DB
      // =====================================
  
      await searchVehicle(
        bestPlate,
        confidence
      );
  
    } catch (err) {
  
      console.error(err);
  
      alert(
        "Error while scanning number plate"
      );
  
    } finally {
  
      setPageLoading(false);
  
    }
  }

  // -----------------------------
  // SEARCH VEHICLE + PAYMENT
  // -----------------------------
  async function searchVehicle(plate: string, confidence: number = 100) {
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
      .ilike("vehicle_number", `%${plate}%`)
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
      confidence, // ✅ now defined
    });
  }

  // -----------------------------
  // MANUAL VERIFY
  // -----------------------------
  async function manualSearch() {
    if (!cleanPlate) return;
    await searchVehicle(cleanPlate);
  }

  async function cropPlateArea(base64Image: string) {
    return new Promise<string>((resolve) => {
      const img = new Image();
  
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
  
        const cropWidth = img.width * 0.6;
        const cropHeight = img.height * 0.22;
  
        const x = img.width * 0.2;
        const y = img.height * 0.39;
  
        canvas.width = cropWidth;
        canvas.height = cropHeight;
  
        ctx?.drawImage(
          img,
          x,
          y,
          cropWidth,
          cropHeight,
          0,
          0,
          cropWidth,
          cropHeight
        );
  
        resolve(canvas.toDataURL("image/jpeg"));
      };
  
      img.src = base64Image;
    });
  }

  async function cropMultipleRegions(
    base64Image: string
  ) {
    return new Promise<string[]>((resolve) => {
      const img = new Image();
  
      img.onload = () => {
        const regions: string[] = [];
  
        const positions = [
          { x: 0.2, y: 0.20 },
          { x: 0.2, y: 0.39 },
          { x: 0.2, y: 0.58 },
          { x: 0.05, y: 0.39 },
          { x: 0.35, y: 0.39 },
        ];
  
        positions.forEach((p) => {
          const canvas =
            document.createElement("canvas");
  
          const cropWidth =
            img.width * 0.6;
  
          const cropHeight =
            img.height * 0.22;
  
          canvas.width = cropWidth;
          canvas.height = cropHeight;
  
          const ctx =
            canvas.getContext("2d");
  
          ctx?.drawImage(
            img,
            img.width * p.x,
            img.height * p.y,
            cropWidth,
            cropHeight,
            0,
            0,
            cropWidth,
            cropHeight
          );
  
          regions.push(
            canvas.toDataURL("image/jpeg")
          );
        });
  
        resolve(regions);
      };
  
      img.src = base64Image;
    });
  }

  function makeGrayScale(base64: string) {
    return new Promise<string>((resolve) => {
      const img = new Image();
  
      img.onload = () => {
        const canvas =
          document.createElement("canvas");
  
        canvas.width = img.width;
        canvas.height = img.height;
  
        const ctx =
          canvas.getContext("2d");
  
        ctx?.drawImage(img, 0, 0);
  
        const imageData =
          ctx?.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
          );
  
        if (!imageData) return;
  
        const data = imageData.data;
  
        for (
          let i = 0;
          i < data.length;
          i += 4
        ) {
          const avg =
            (data[i] +
              data[i + 1] +
              data[i + 2]) /
            3;
  
          data[i] = avg;
          data[i + 1] = avg;
          data[i + 2] = avg;
        }
  
        ctx?.putImageData(
          imageData,
          0,
          0
        );
  
        resolve(
          canvas.toDataURL("image/jpeg")
        );
      };
  
      img.src = base64;
    });
  }

  function makeHighContrast(
    base64: string
  ) {
    return new Promise<string>((resolve) => {
      const img = new Image();
  
      img.onload = () => {
        const canvas =
          document.createElement("canvas");
  
        canvas.width = img.width;
        canvas.height = img.height;
  
        const ctx =
          canvas.getContext("2d");
  
        ctx?.drawImage(img, 0, 0);
  
        const imageData =
          ctx?.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
          );
  
        if (!imageData) return;
  
        const data = imageData.data;
  
        const contrast = 180;
  
        const factor =
          (259 *
            (contrast + 255)) /
          (255 * (259 - contrast));
  
        for (
          let i = 0;
          i < data.length;
          i += 4
        ) {
          data[i] =
            factor *
              (data[i] - 128) +
            128;
  
          data[i + 1] =
            factor *
              (data[i + 1] - 128) +
            128;
  
          data[i + 2] =
            factor *
              (data[i + 2] - 128) +
            128;
        }
  
        ctx?.putImageData(
          imageData,
          0,
          0
        );
  
        resolve(
          canvas.toDataURL("image/jpeg")
        );
      };
  
      img.src = base64;
    });
  }

  async function detectPlateRegion(image: string) {
    const res = await fetch("/api/detect-plate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image }),
    });
  
    return await res.json();
  }

  return (
    <main className="max-w-5xl mx-auto p-6">

      <h1 className="text-4xl font-bold text-black mb-6">
        🚗 Smart Scanner PRO
      </h1>

      {/* CAMERA */}
      <div className="border p-4 rounded">

        {!image ? (
          <div className="relative">

          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              facingMode,
              width: 1280,
              height: 720,
            }}
            className="w-full rounded"
          />
        
          <div
            className="absolute border-4 border-green-500 rounded"
            style={{
              width: "60%",
              height: "22%",
              left: "20%",
              top: "39%",
              pointerEvents: "none",
            }}
          />
        
        </div>
        ) : (
          <img src={image} className="w-full rounded" />
        )}

<button
  onClick={() =>
    setFacingMode(
      facingMode === "environment"
        ? "user"
        : "environment"
    )
  }
  className="bg-blue-500 text-white px-4 py-2 rounded"
>
  Switch Camera
</button>

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

          <input
  type="file"
  accept="image/*"
  capture="environment"
  className="mt-4"
  onChange={(e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      setImage(reader.result as string);
    };

    reader.readAsDataURL(file);
  }}
/>

        </div>
      </div>

      {/* OCR TEXT */}
      {ocrText && (
        <div className="border p-3 rounded text-black bg-white mt-3 text-sm">
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
              {status?.vehicleActive ? "Yes" : "No"}
            </p>

            <p>
              <b>Payment Active:</b>{" "}
              {status?.paymentActive ? "Yes" : "No"}
            </p>

            <p>
              <b>Valid Till:</b>{" "}
              {payment?.valid_till || "N/A"}
            </p>

            <p>
              <b>Days Left:</b>{" "}
              {status?.daysRemaining}
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