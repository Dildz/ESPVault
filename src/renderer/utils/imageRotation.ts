import type { CoverImageFileInput } from "../../shared/types/api";

const OUTPUT_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function rotateCoverImageDataUrl(
  dataUrl: string,
  filename: string | null | undefined,
  mimeType: string | null | undefined
): Promise<CoverImageFileInput> {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalHeight;
  canvas.height = image.naturalWidth;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("The photo could not be rotated.");
  }

  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(Math.PI / 2);
  context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

  const outputMimeType = getOutputMimeType(mimeType);
  const blob = await canvasToBlob(canvas, outputMimeType);
  const resolvedMimeType = blob.type || outputMimeType;

  return {
    data: await blob.arrayBuffer(),
    filename: getRotatedFilename(filename, resolvedMimeType),
    mimeType: resolvedMimeType
  };
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener(
      "error",
      () => reject(new Error("The photo could not be loaded for rotation.")),
      { once: true }
    );
    image.src = dataUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("The rotated photo could not be saved."));
      },
      mimeType,
      0.92
    );
  });
}

function getOutputMimeType(mimeType: string | null | undefined): string {
  return mimeType && OUTPUT_MIME_TYPES.has(mimeType) ? mimeType : "image/png";
}

function getRotatedFilename(
  filename: string | null | undefined,
  mimeType: string
): string {
  const extension = getExtensionForMimeType(mimeType);
  const baseName = (filename || "cover").replace(/\.[^.]+$/, "").trim() || "cover";
  return `${baseName}${extension}`;
}

function getExtensionForMimeType(mimeType: string): string {
  if (mimeType === "image/jpeg") {
    return ".jpg";
  }

  if (mimeType === "image/webp") {
    return ".webp";
  }

  return ".png";
}
