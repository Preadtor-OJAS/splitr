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
import { Smartphone, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function UpiSettingsModal({ open, onClose }) {
  const { data: currentUser } = useConvexQuery(api.users.getCurrentUser);
  const updateUpiId = useConvexMutation(api.users.updateUpiId);

  const [upiId, setUpiId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const existingUpiId = currentUser?.upiId ?? "";

  const handleSave = async () => {
    const trimmed = upiId.trim() || existingUpiId;
    if (!trimmed) {
      toast.error("Please enter your UPI ID");
      return;
    }
    // Strict UPI ID format validation
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="bg-green-100 p-1.5 rounded-full">
              <Smartphone className="h-4 w-4 text-green-600" />
            </div>
            Your UPI ID
          </DialogTitle>
          <DialogDescription>
            Save your UPI ID so others can pay you directly via any UPI app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {existingUpiId && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <div>
                <p className="text-xs text-green-700 font-medium">Current UPI ID</p>
                <p className="font-mono text-sm text-green-800">{existingUpiId}</p>
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
