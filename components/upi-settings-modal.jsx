"use client";

import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useConvexMutation, useConvexQuery } from "@/hooks/use-convex-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Smartphone, CheckCircle2, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";

export function UpiSettingsModal({ open, onClose }) {
  const { data: currentUser } = useConvexQuery(api.users.getCurrentUser);
  const updateUpiId = useConvexMutation(api.users.updateUpiId);
  const { theme, setTheme } = useTheme();

  const [upiId, setUpiId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const existingUpiId = currentUser?.upiId ?? "";

  const handleSave = async () => {
    const trimmed = upiId.trim() || existingUpiId;
    if (!trimmed) {
      toast.error("Please enter your UPI ID");
      return;
    }
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    if (!upiRegex.test(trimmed)) {
      toast.error("Invalid UPI ID format. Ensure there are no spaces and it matches the pattern handle@bank");
      return;
    }
    setIsSaving(true);
    try {
      await updateUpiId.mutate({ upiId: trimmed });
      toast.success("UPI ID saved!");
      onClose();
    } catch (e) {
      toast.error("Failed to save: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const isDark = theme === "dark";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="bg-green-100 dark:bg-green-900 p-1.5 rounded-full">
              <Smartphone className="h-4 w-4 text-green-600" />
            </div>
            Settings
          </DialogTitle>
          <DialogDescription>
            Manage your UPI ID and app preferences.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">

          {/* ── Theme toggle ── */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Appearance</Label>
            <div className="flex items-center justify-between border rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                {isDark ? (
                  <Moon className="h-4 w-4 text-indigo-400" />
                ) : (
                  <Sun className="h-4 w-4 text-yellow-500" />
                )}
                <span className="text-sm font-medium">
                  {isDark ? "Dark mode" : "Light mode"}
                </span>
              </div>
              {/* Toggle pill */}
              <button
                type="button"
                role="switch"
                aria-checked={isDark}
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isDark ? "bg-indigo-500" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transform transition-transform ${
                    isDark ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">UPI</span>
            </div>
          </div>

          {/* ── UPI ID ── */}
          {existingUpiId && (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <div>
                <p className="text-xs text-green-700 dark:text-green-400 font-medium">Current UPI ID</p>
                <p className="font-mono text-sm text-green-800 dark:text-green-300">{existingUpiId}</p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="upi-id">
              {existingUpiId ? "Update UPI ID" : "Enter UPI ID"}
            </Label>
            <Input
              id="upi-id"
              placeholder={existingUpiId || "yourname@upi"}
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Example: ojas@okicici · ojas@ybl · ojas@paytm
            </p>
          </div>

          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save UPI ID"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
