"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Smartphone,
  QrCode,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { useConvexMutation, useConvexQuery } from "@/hooks/use-convex-query";

/**
 * Builds a UPI deep link for a given app scheme.
 * Android: upi://pay?...
 * iOS apps each have their own scheme (tez://, phonepe://, etc.)
 */
function buildUpiLink({ scheme, upiId, name, amount, note }) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: name,
    am: amount.toFixed(2),
    cu: "INR",
    ...(note ? { tn: note } : {}),
  });
  return `${scheme}?${params.toString()}`;
}

/** Detects iOS (iPhone/iPad/iPod) */
function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/** Per-app deep link schemes for iOS */
const IOS_UPI_APPS = [
  {
    name: "GPay",
    scheme: "tez://upi/pay",
    bg: "#4285F4",
    emoji: "🟦",
  },
  {
    name: "PhonePe",
    scheme: "phonepe://pay",
    bg: "#5F259F",
    emoji: "🟣",
  },
  {
    name: "Paytm",
    scheme: "paytmmp://pay",
    bg: "#00BAF2",
    emoji: "🔵",
  },
  {
    name: "BHIM",
    scheme: "bhim://pay",
    bg: "#FF6B2C",
    emoji: "🟠",
  },
];

export function UpiPaymentModal({
  open,
  onClose,
  receiver,       // { id, name, upiId, imageUrl }
  amount,
  note,
  // For auto-settling after payment
  paidByUserId,
  receivedByUserId,
  groupId,
  onSettled,      // callback after successful settlement
}) {
  const [copied, setCopied] = useState(false);
  const [settling, setSettling] = useState(false);
  const [settled, setSettled] = useState(false);

  const { data: currentUser } = useConvexQuery(api.users.getCurrentUser);
  const createSettlement = useConvexMutation(api.settlements.createSettlement);

  if (!receiver?.upiId) return null;

  // Generic Android deep link (triggers OS app chooser)
  const androidUpiLink = buildUpiLink({
    scheme: "upi://pay",
    upiId: receiver.upiId,
    name: receiver.name,
    amount,
    note,
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(receiver.upiId);
      setCopied(true);
      toast.success("UPI ID copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  /**
   * Opens a UPI deep link.
   * - iOS: use the app-specific scheme passed in
   * - Android: use the generic upi:// scheme (triggers OS app chooser)
   */
  const handleOpenApp = (link) => {
    // window.location.href works best for deep links on both platforms.
    // On iOS we always pass a specific app scheme, so this works correctly.
    // On Android the generic upi:// triggers the native app chooser.
    window.location.href = link;
  };

  const handleMarkSettled = async () => {
    if (!paidByUserId || !receivedByUserId) return;
    setSettling(true);
    try {
      await createSettlement.mutate({
        amount,
        note: note || "Paid via UPI",
        paidByUserId,
        receivedByUserId,
        ...(groupId ? { groupId } : {}),
      });
      setSettled(true);
      toast.success("✅ Settlement recorded! Balance updated.");
      setTimeout(() => {
        onClose();
        if (onSettled) onSettled();
      }, 1500);
    } catch (e) {
      toast.error("Failed to record: " + e.message);
    } finally {
      setSettling(false);
    }
  };

  const onIOS = isIOS();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="bg-green-100 p-1.5 rounded-full">
              <Smartphone className="h-4 w-4 text-green-600" />
            </div>
            Pay via UPI
          </DialogTitle>
          <DialogDescription>
            Send{" "}
            <span className="font-semibold text-foreground">
              ₹{amount.toFixed(2)}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-foreground">
              {receiver.name}
            </span>{" "}
            using your UPI app, then tap the button below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* UPI ID display */}
          <div className="flex items-center justify-between bg-muted px-4 py-3 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">UPI ID</p>
              <p className="font-mono font-medium text-sm">{receiver.upiId}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <QrCode className="h-4 w-4" />
              <span>Scan with any UPI app</span>
            </div>
            <div className="p-4 bg-white border-2 border-border rounded-2xl shadow-sm">
              <QRCodeSVG
                value={androidUpiLink}
                size={180}
                bgColor="#ffffff"
                fgColor="#111827"
                level="M"
                includeMargin={false}
              />
            </div>
          </div>

          {/* --- iOS: individual app buttons --- */}
          {onIOS ? (
            <div className="space-y-2">
              <p className="text-xs text-center text-muted-foreground font-medium uppercase tracking-wide">
                Open with
              </p>
              <div className="grid grid-cols-2 gap-2">
                {IOS_UPI_APPS.map((app) => {
                  const link = buildUpiLink({
                    scheme: app.scheme,
                    upiId: receiver.upiId,
                    name: receiver.name,
                    amount,
                    note,
                  });
                  return (
                    <Button
                      key={app.name}
                      type="button"
                      variant="outline"
                      className="gap-2 h-11"
                      onClick={() => handleOpenApp(link)}
                    >
                      <span>{app.emoji}</span>
                      {app.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* --- Android: single button, OS shows app chooser --- */
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
              onClick={() => handleOpenApp(androidUpiLink)}
            >
              <ExternalLink className="h-4 w-4" />
              Open UPI App
            </Button>
          )}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                After paying
              </span>
            </div>
          </div>

          {/* Mark as settled — auto records settlement + triggers notifications */}
          {settled ? (
            <div className="flex items-center justify-center gap-2 py-3 text-green-600 font-medium">
              <CheckCircle2 className="h-5 w-5" />
              Settlement recorded!
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full gap-2 border-green-500 text-green-700 hover:bg-green-50 font-semibold"
              onClick={handleMarkSettled}
              disabled={settling}
            >
              {settling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {settling ? "Recording..." : "✅ Done! Mark as Settled"}
            </Button>
          )}

          <p className="text-xs text-center text-muted-foreground">
            &ldquo;Mark as Settled&rdquo; records the payment and notifies{" "}
            {receiver.name} instantly.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
