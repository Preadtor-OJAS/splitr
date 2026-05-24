"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScanLine, Upload, Loader2, X, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export function ReceiptScanner({ onReceiptScanned }) {
  const [open, setOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState(null);
  const [scannedData, setScannedData] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG, WEBP)");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    // Convert to base64 for API
    const base64Reader = new FileReader();
    base64Reader.onload = async (e) => {
      const base64 = e.target.result.split(",")[1]; // strip data:...;base64,
      await scanReceipt(base64, file.type);
    };
    base64Reader.readAsDataURL(file);
  };

  const scanReceipt = async (imageBase64, mimeType) => {
    setScanning(true);
    setScannedData(null);
    try {
      const res = await fetch("/api/ai/scan-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to scan receipt");
      }

      setScannedData(data.data);
      toast.success("Receipt scanned successfully! ✨");
    } catch (err) {
      toast.error(err.message || "Failed to scan receipt");
    } finally {
      setScanning(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const applyToForm = () => {
    if (scannedData && onReceiptScanned) {
      onReceiptScanned(scannedData);
      setOpen(false);
      setPreview(null);
      setScannedData(null);
      toast.success("Expense details filled from receipt!");
    }
  };

  const reset = () => {
    setPreview(null);
    setScannedData(null);
    setScanning(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 border-dashed border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700 transition-all"
        id="receipt-scanner-btn"
      >
        <ScanLine className="h-4 w-4" />
        Scan Receipt with AI
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ScanLine className="h-5 w-5 text-green-500" />
              AI Receipt Scanner
            </DialogTitle>
            <DialogDescription>
              Upload a photo of your receipt. Groq &amp; Llama 4 AI will automatically
              extract the amount, description, and category for you.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Drop zone */}
            {!preview && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                  dragOver
                    ? "border-green-500 bg-green-50 scale-[1.01]"
                    : "border-gray-300 hover:border-green-400 hover:bg-gray-50"
                }`}
              >
                <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                <p className="font-medium text-gray-700">
                  Drag & drop a receipt image here
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to browse — JPG, PNG, WEBP supported
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files[0])}
                />
              </div>
            )}

            {/* Preview & scanning state */}
            {preview && (
              <div className="relative rounded-xl overflow-hidden border border-gray-200">
                <img
                  src={preview}
                  alt="Receipt preview"
                  className="w-full max-h-64 object-contain bg-gray-50"
                />
                {!scanning && (
                  <button
                    onClick={reset}
                    className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-red-50 transition"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                )}
                {scanning && (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                    <p className="text-white text-sm font-medium">
                      Analyzing receipt...
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Scanned result */}
            {scannedData && (
              <div className="rounded-xl border border-green-200 bg-green-50/60 p-4 space-y-3">
                <div className="flex items-center gap-2 text-green-700 font-semibold">
                  <CheckCircle className="h-4 w-4" />
                  Receipt Detected
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Description</span>
                    <p className="font-medium">{scannedData.description || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Amount</span>
                    <p className="font-medium text-green-700">
                      ${Number(scannedData.amount || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Category</span>
                    <p className="font-medium capitalize">
                      {scannedData.category?.replace(/([A-Z])/g, " ₹1").trim() || "Other"}
                    </p>
                  </div>
                  {scannedData.date && (
                    <div>
                      <span className="text-muted-foreground">Date</span>
                      <p className="font-medium">{scannedData.date}</p>
                    </div>
                  )}
                </div>
                {scannedData.items?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Items detected:</p>
                    <ul className="text-xs space-y-0.5">
                      {scannedData.items.slice(0, 5).map((item, i) => (
                        <li key={i} className="flex justify-between">
                          <span>{item.name}</span>
                          <span className="font-medium">${Number(item.price || 0).toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button
                  onClick={applyToForm}
                  className="w-full bg-green-600 hover:bg-green-700"
                  id="apply-receipt-btn"
                >
                  Use These Details
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
