import { NextResponse } from "next/server";
import * as ort from "onnxruntime-node";
import sharp from "sharp";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const { image } = await req.json();

    // convert base64 → buffer
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const imgBuffer = Buffer.from(base64Data, "base64");

    // resize image (YOLO expects fixed size)
    const resized = await sharp(imgBuffer)
      .resize(640, 640)
      .removeAlpha()
      .raw()
      .toBuffer();

    // load model
    const modelPath = path.join(process.cwd(), "models", "plate.onnx");
    const session = await ort.InferenceSession.create(modelPath);

    const tensor = new ort.Tensor("float32", Float32Array.from(resized), [
      1, 3, 640, 640,
    ]);

    const results = await session.run({ images: tensor });

    // ⚠️ simplified output (depends on model)
    const output = results.output0.data;

    return NextResponse.json({
      success: true,
      detections: output,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}