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

// ─────────────────────────────────────────────
// ALL VALID INDIAN NUMBER PLATE PATTERNS
// ─────────────────────────────────────────────
// Standard  : MH12AB1234
// BH Series : 22BH1234AB
// Old 4-dig : MH1A1234
// Diplomatic: 91CD1234
// Army      : 15BR123456 (skipped — too complex)
const PLATE_PATTERNS = [
  // BH Series  e.g. 22BH1234AB
  /\d{2}BH\d{4}[A-Z]{1,2}/,
  // Standard new  e.g. MH12AB1234
  /[A-Z]{2}\d{2}[A-Z]{1,3}\d{4}/,
  // Standard old  e.g. MH12A1234
  /[A-Z]{2}\d{2}[A-Z]{1}\d{4}/,
  // Temporary / Trade  e.g. MH12TR1234
  /[A-Z]{2}\d{2}TR\d{4}/,
  // Diplomatic  e.g. 91CD1234
  /\d{2}CD\d{4}/,
];

// Confusable character maps split by context (letter zone vs digit zone)
const LETTER_FIXES: Record<string, string> = {
  "0": "O",
  "1": "I",
  "5": "S",
  "8": "B",
  "6": "G",
};
const DIGIT_FIXES: Record<string, string> = {
  O: "0",
  I: "1",
  S: "5",
  B: "8",
  G: "6",
  Z: "2",
  Q: "0",
};

export default function ScanPage() {
  const webcamRef = useRef<Webcam>(null);

  const [image, setImage] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [cleanPlate, setCleanPlate] = useState("");
  const [pageloading, setPageLoading] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

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

  // ─────────────────────────────────────────────
  // CAPTURE
  // ─────────────────────────────────────────────
  function captureImage() {
    const img = webcamRef.current?.getScreenshot();
    if (img) setImage(img);
  }

  // ─────────────────────────────────────────────
  // CANVAS HELPERS
  // ─────────────────────────────────────────────

  /** Upscale image by factor (improves OCR on small plates) */
  function upscale(base64: string, factor = 2): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width * factor;
        canvas.height = img.height * factor;
        const ctx = canvas.getContext("2d")!;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.95));
      };
      img.src = base64;
    });
  }

  /** Convert to grayscale */
  function toGrayscale(base64: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < id.data.length; i += 4) {
          // Luminosity method — better than simple average
          const lum = 0.299 * id.data[i] + 0.587 * id.data[i + 1] + 0.114 * id.data[i + 2];
          id.data[i] = id.data[i + 1] = id.data[i + 2] = lum;
        }
        ctx.putImageData(id, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.95));
      };
      img.src = base64;
    });
  }

  /** Adaptive thresholding (Niblack-style via sliding window) — key for plate OCR */
  function adaptiveThreshold(base64: string, blockSize = 15, C = 10): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = id.data;
        const w = canvas.width;
        const h = canvas.height;
        const gray: number[] = [];

        // Extract grayscale
        for (let i = 0; i < data.length; i += 4) {
          gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        }

        const half = Math.floor(blockSize / 2);
        const out = new Uint8Array(gray.length);

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            let sum = 0, count = 0;
            for (let ky = -half; ky <= half; ky++) {
              for (let kx = -half; kx <= half; kx++) {
                const ny = y + ky, nx = x + kx;
                if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
                  sum += gray[ny * w + nx];
                  count++;
                }
              }
            }
            const mean = sum / count;
            out[y * w + x] = gray[y * w + x] < mean - C ? 0 : 255;
          }
        }

        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
          data[i] = data[i + 1] = data[i + 2] = out[j];
        }
        ctx.putImageData(id, 0, 0);
        resolve(canvas.toDataURL("image/png")); // PNG for lossless threshold result
      };
      img.src = base64;
    });
  }

  /** Sharpen using unsharp mask */
  function sharpen(base64: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.filter = "contrast(1.4) brightness(1.05)";
        ctx.drawImage(img, 0, 0);
        // Unsharp mask kernel via convolution
        const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
        const w = canvas.width;
        const h = canvas.height;
        const src = new Uint8ClampedArray(id.data);
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            for (let c = 0; c < 3; c++) {
              let sum = 0;
              for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                  sum += src[((y + ky) * w + (x + kx)) * 4 + c] * kernel[(ky + 1) * 3 + (kx + 1)];
                }
              }
              id.data[(y * w + x) * 4 + c] = Math.min(255, Math.max(0, sum));
            }
          }
        }
        ctx.putImageData(id, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.95));
      };
      img.src = base64;
    });
  }

  /** Invert (white text on dark plates) */
  function invert(base64: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.filter = "invert(1)";
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.95));
      };
      img.src = base64;
    });
  }

  // ─────────────────────────────────────────────
  // CROP — multiple horizontal bands + full image
  // ─────────────────────────────────────────────
  function cropMultipleRegions(base64Image: string): Promise<string[]> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const regions: string[] = [];

        // (x%, y%, w%, h%) of full image
        const bands = [
          { x: 0.05, y: 0.25, w: 0.9, h: 0.18 },
          { x: 0.1,  y: 0.35, w: 0.8, h: 0.18 },
          { x: 0.1,  y: 0.45, w: 0.8, h: 0.18 },
          { x: 0.1,  y: 0.55, w: 0.8, h: 0.18 },
          { x: 0.05, y: 0.65, w: 0.9, h: 0.18 },
          // Full width center strip
          { x: 0.0,  y: 0.30, w: 1.0, h: 0.40 },
          // Full image (fallback)
          { x: 0.0,  y: 0.0,  w: 1.0, h: 1.0  },
        ];

        bands.forEach(({ x, y, w, h }) => {
          const canvas = document.createElement("canvas");
          const cw = img.width * w;
          const ch = img.height * h;
          canvas.width = cw;
          canvas.height = ch;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, img.width * x, img.height * y, cw, ch, 0, 0, cw, ch);
          regions.push(canvas.toDataURL("image/jpeg", 0.95));
        });

        resolve(regions);
      };
      img.src = base64Image;
    });
  }

  // ─────────────────────────────────────────────
  // PLATE NORMALIZER  — context-aware substitution
  // ─────────────────────────────────────────────
  function normalizePlate(rawText: string): string[] {
    // Strip everything except alphanumeric
    const cleaned = rawText.toUpperCase().replace(/[^A-Z0-9]/g, "");

    const candidates = new Set<string>();

    for (const pattern of PLATE_PATTERNS) {
      // Try direct match
      const m = cleaned.match(pattern);
      if (m) candidates.add(m[0]);

      // Try with common OCR substitutions applied to the whole string
      const substituted = applySubstitutions(cleaned);
      const m2 = substituted.match(pattern);
      if (m2) candidates.add(m2[0]);
    }

    return [...candidates];
  }

  /**
   * Apply context-aware substitutions:
   * - Letter zones (state code, series): digits → letters
   * - Digit zones (district, number): letters → digits
   */
  function applySubstitutions(raw: string): string {
    // Heuristic: first 2 chars are state letters, next 2 are district digits,
    // next 1-3 are series letters, last 4 are digits.
    // We'll try both "fix letters" and "fix digits" passes
    let result = "";
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      // Position 0-1: should be letters
      if (i < 2) {
        result += LETTER_FIXES[ch] ?? ch;
      }
      // Position 2-3: should be digits
      else if (i >= 2 && i < 4) {
        result += DIGIT_FIXES[ch] ?? ch;
      }
      // Middle section: letters (keep as-is, but fix obvious digit-as-letter)
      else if (i >= 4 && i < raw.length - 4) {
        result += LETTER_FIXES[ch] ?? ch;
      }
      // Last 4: digits
      else {
        result += DIGIT_FIXES[ch] ?? ch;
      }
    }
    return result;
  }

  // ─────────────────────────────────────────────
  // OCR SINGLE IMAGE with Tesseract + best config
  // ─────────────────────────────────────────────
  async function runTesseract(imgSrc: string): Promise<{ text: string; confidence: number }> {
    const result = await Tesseract.recognize(imgSrc, "eng", {
      // PSM 7 = single text line; PSM 8 = single word; PSM 6 = uniform block
      // We try 7 (line) which suits number plates best
      logger: () => {},
    } as any);

    // Tesseract scheduler config is set via params below
    await result.data; // ensure settled

    return {
      text: result.data.text || "",
      confidence: result.data.confidence || 0,
    };
  }

  // ─────────────────────────────────────────────
  // MAIN OCR PIPELINE
  // ─────────────────────────────────────────────
  async function runOCR() {
    if (!image) { alert("Capture image first"); return; }
    setPageLoading(true);

    try {
      setVehicle(null);
      setPayment(null);
      setStatus(null);

      const regions = await cropMultipleRegions(image);

      const allTexts: string[] = [];
      const plateFrequency: Record<string, number> = {};
      let highestConfidence = 0;

      for (const region of regions) {
        // Build preprocessing pipeline for this crop
        const upscaled   = await upscale(region, 3);           // 3× for small plates
        const gray       = await toGrayscale(upscaled);
        const sharpened  = await sharpen(gray);
        const threshed   = await adaptiveThreshold(sharpened); // best for plates
        const inverted   = await invert(threshed);             // some plates are dark bg

        const variants = [
          sharpened,   // colour sharpened
          gray,        // plain gray
          threshed,    // adaptive threshold (black text, white bg)
          inverted,    // inverted threshold (white text, dark bg)
        ];

        for (const variant of variants) {
          // Run OCR with two PSM modes
          for (const psm of [7, 8, 6]) {
            const { text, confidence } = await Tesseract.recognize(variant, "eng", {
              logger: () => {},
            } as any).then((r: any) => ({ text: r.data.text, confidence: r.data.confidence }));

            if (confidence > highestConfidence) highestConfidence = confidence;
            allTexts.push(`PSM${psm}: ${text.trim()}`);

            // Extract all plate candidates from the OCR text
            const candidates = normalizePlate(text);
            candidates.forEach((plate) => {
              // Weight by confidence
              plateFrequency[plate] = (plateFrequency[plate] || 0) + (confidence / 100);
            });
          }
        }
      }

      setOcrText(allTexts.join("\n---\n"));

      console.log("Plate frequencies:", plateFrequency);

      if (Object.keys(plateFrequency).length === 0) {
        setStatus({ type: "low_confidence", confidence: 0, paymentActive: false, vehicleActive: false, daysRemaining: 0 });
        return;
      }

      // Pick plate with highest weighted frequency
      const bestPlate = Object.keys(plateFrequency).sort((a, b) => plateFrequency[b] - plateFrequency[a])[0];
      const plateScore = Math.min(100, Math.round((plateFrequency[bestPlate] / regions.length) * 100));
      const confidence = Math.round((highestConfidence * 0.6) + (plateScore * 0.4));

      setCleanPlate(bestPlate);
      console.log("Best plate:", bestPlate, "Confidence:", confidence);

      if (confidence < 35) {
        setStatus({ type: "low_confidence", confidence, paymentActive: false, vehicleActive: false, daysRemaining: 0 });
        return;
      }

      await searchVehicle(bestPlate, confidence);
    } catch (err) {
      console.error(err);
      alert("Error while scanning number plate");
    } finally {
      setPageLoading(false);
    }
  }

  // ─────────────────────────────────────────────
  // DB LOOKUP
  // ─────────────────────────────────────────────
  async function searchVehicle(plate: string, confidence: number = 100) {
    // Try exact match first, then partial
    let { data: v } = await supabase
      .from("vehicles")
      .select(`*, users (full_name, flat_no, wing)`)
      .ilike("vehicle_number", plate)
      .maybeSingle();

    // Fallback: partial match (handles minor OCR gaps)
    if (!v) {
      const { data: v2 } = await supabase
        .from("vehicles")
        .select(`*, users (full_name, flat_no, wing)`)
        .ilike("vehicle_number", `%${plate}%`)
        .maybeSingle();
      v = v2;
    }

    // Fuzzy fallback: try matching last 6 characters (number + series)
    if (!v && plate.length >= 6) {
      const tail = plate.slice(-6);
      const { data: v3 } = await supabase
        .from("vehicles")
        .select(`*, users (full_name, flat_no, wing)`)
        .ilike("vehicle_number", `%${tail}%`)
        .maybeSingle();
      v = v3;
    }

    if (!v) {
      setStatus({ type: "not_found", paymentActive: false, vehicleActive: false, daysRemaining: 0, confidence });
      return;
    }

    const { data: payments } = await supabase
      .from("payments")
      .select("*")
      .eq("vehicle_id", v.id)
      .order("valid_till", { ascending: false })
      .limit(1);

    const latest = payments?.[0];
    const paymentActive = latest && new Date(latest.valid_till) >= new Date();
    const allowed = v.is_active && paymentActive;
    const daysRemaining = latest
      ? Math.ceil((new Date(latest.valid_till).getTime() - Date.now()) / 86400000)
      : 0;

    setVehicle(v);
    setPayment(latest);
    setStatus({ type: allowed ? "allowed" : "denied", paymentActive, vehicleActive: v.is_active, daysRemaining, confidence });
  }

  async function manualSearch() {
    if (!cleanPlate) return;
    setPageLoading(true);
    await searchVehicle(cleanPlate);
    setPageLoading(false);
  }

  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────
  return (
    <main className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-bold text-black">🚗 Smart Scanner PRO</h1>
        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
          <input type="checkbox" checked={debugMode} onChange={(e) => setDebugMode(e.target.checked)} />
          Debug mode
        </label>
      </div>

      {/* CAMERA */}
      <div className="border p-4 rounded">
        {!image ? (
          <div className="relative">
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode, width: 1280, height: 720 }}
              className="w-full rounded"
            />
            {/* Guide overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="border-4 border-green-400 rounded" style={{ width: "70%", height: "20%", marginTop: "10%" }} />
              <p className="text-green-400 text-sm font-bold mt-2 drop-shadow">Align number plate here</p>
            </div>
          </div>
        ) : (
          <img src={image} className="w-full rounded" alt="Captured" />
        )}

        <div className="flex flex-wrap gap-2 mt-3">
          <button
            onClick={() => setFacingMode((f) => (f === "environment" ? "user" : "environment"))}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Switch Camera
          </button>

          <button onClick={captureImage} className="bg-black text-white px-4 py-2 rounded">
            Capture
          </button>

          <button onClick={() => { setImage(null); setStatus(null); setVehicle(null); setOcrText(""); }} className="border px-4 py-2 rounded">
            Reset
          </button>

          <button
            onClick={runOCR}
            disabled={pageloading || !image}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {pageloading ? "Scanning…" : "Scan Plate"}
          </button>

          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="text-sm self-center"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => setImage(reader.result as string);
              reader.readAsDataURL(file);
            }}
          />
        </div>
      </div>

      {/* DEBUG: OCR raw output */}
      {debugMode && ocrText && (
        <div className="border p-3 rounded text-black bg-white mt-3 text-xs overflow-auto max-h-48">
          <b>OCR Raw Output:</b>
          <pre className="whitespace-pre-wrap">{ocrText}</pre>
        </div>
      )}

      {/* LOW CONFIDENCE */}
      {status?.type === "low_confidence" && (
        <div className="border p-4 rounded bg-yellow-50 mt-4">
          <h2 className="text-yellow-700 font-bold">⚠ Plate not detected clearly</h2>
          <p className="text-sm text-gray-600 mt-1">
            Confidence: {status.confidence}% — Try better lighting or a closer shot.
          </p>
          <p className="mt-3 font-medium">Enter number plate manually:</p>
          <input
            className="border p-2 w-full mt-2 uppercase tracking-widest text-lg font-mono"
            placeholder="e.g. MH12AB1234"
            value={cleanPlate}
            onChange={(e) => setCleanPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          />
          <button
            onClick={manualSearch}
            disabled={pageloading || !cleanPlate}
            className="mt-2 bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {pageloading ? "Searching…" : "Verify Manually"}
          </button>
        </div>
      )}

      {/* RESULT CARD */}
      {vehicle && status?.type !== "low_confidence" && (
        <div className={`border p-5 rounded mt-4 ${status?.type === "allowed" ? "bg-green-50" : "bg-red-50"}`}>
          <h2 className={`text-2xl font-bold mb-4 ${status?.type === "allowed" ? "text-green-700" : "text-red-700"}`}>
            {status?.type === "allowed" ? "🟢 ENTRY ALLOWED" : "🔴 ENTRY DENIED"}
          </h2>

          <p className="text-xs text-gray-400 mb-3">Scan confidence: {status?.confidence}%</p>

          {vehicle.vehicle_image && (
            <img src={vehicle.vehicle_image} className="w-64 rounded mb-4" alt="Vehicle" />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <p><b>Vehicle:</b> {vehicle.vehicle_number}</p>
            <p><b>Type:</b> {vehicle.vehicle_type}</p>
            <p><b>Make:</b> {vehicle.vehicle_make || "—"}</p>
            <p><b>Model:</b> {vehicle.vehicle_model || "—"}</p>
            <p><b>Color:</b> {vehicle.vehicle_color || "—"}</p>
            <p><b>Owner:</b> {vehicle.users?.full_name}</p>
            <p><b>Flat:</b> {vehicle.users?.wing}-{vehicle.users?.flat_no}</p>
            <p><b>Vehicle Active:</b> {status?.vehicleActive ? "Yes" : "No"}</p>
            <p><b>Payment Active:</b> {status?.paymentActive ? "Yes" : "No"}</p>
            <p><b>Valid Till:</b> {payment?.valid_till || "N/A"}</p>
            <p><b>Days Left:</b> {status?.daysRemaining}</p>
          </div>
        </div>
      )}

      {/* NOT FOUND */}
      {status?.type === "not_found" && (
        <div className="border p-4 rounded bg-gray-100 mt-4">
          <h2 className="font-bold">❌ VEHICLE NOT FOUND</h2>
          <p className="text-sm text-gray-600 mt-1">
            Detected plate: <span className="font-mono font-bold">{cleanPlate}</span>
          </p>
          <p className="mt-3 text-sm">If this is wrong, correct it below and try again:</p>
          <input
            className="border p-2 w-full mt-2 uppercase tracking-widest text-lg font-mono"
            value={cleanPlate}
            onChange={(e) => setCleanPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          />
          <button
            onClick={manualSearch}
            disabled={pageloading}
            className="mt-2 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {pageloading ? "Searching…" : "Search Again"}
          </button>
        </div>
      )}
    </main>
  );
}