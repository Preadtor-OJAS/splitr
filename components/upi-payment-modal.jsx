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
import { Input } from "@/components/ui/input";
import {
  Smartphone,
  QrCode,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { useConvexMutation, useConvexQuery } from "@/hooks/use-convex-query";

/**
 * Builds a UPI deep link for a given scheme prefix.
 * e.g. scheme = "tez://upi/pay" → "tez://upi/pay?pa=...&pn=...&am=...&cu=INR"
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

/** Detects iOS (iPhone / iPad / iPod) */
function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Branded icon for each UPI app — a rounded square with the app's
 * actual brand color and a clean SVG logotype / letter mark.
 */
function AppIcon({ app }) {
  const icons = {
    GPay: (
      // Google Pay — colourful G on white
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
        <rect width="40" height="40" rx="10" fill="white" stroke="#e5e7eb" strokeWidth="1"/>
        <text x="20" y="27" textAnchor="middle" fontSize="18" fontWeight="800" fontFamily="sans-serif">
          <tspan fill="#4285F4">G</tspan>
        </text>
        <circle cx="26" cy="14" r="3" fill="#EA4335"/>
        <circle cx="26" cy="14" r="1.5" fill="white"/>
      </svg>
    ),
    PhonePe: (
      // PhonePe — purple with "Pe"
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
        <rect width="40" height="40" rx="10" fill="#5F259F"/>
        <text x="20" y="27" textAnchor="middle" fontSize="15" fontWeight="800" fill="white" fontFamily="sans-serif">Pe</text>
      </svg>
    ),
    Paytm: (
      // Paytm — navy blue with P
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
        <rect width="40" height="40" rx="10" fill="#002970"/>
        <text x="20" y="28" textAnchor="middle" fontSize="20" fontWeight="900" fill="#00BAF2" fontFamily="sans-serif">P</text>
      </svg>
    ),
    BHIM: (
      // BHIM — Indian green with B
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
        <rect width="40" height="40" rx="10" fill="#138808"/>
        <text x="20" y="28" textAnchor="middle" fontSize="20" fontWeight="900" fill="white" fontFamily="sans-serif">B</text>
      </svg>
    ),
    "Amazon Pay": (
      // Amazon Pay — black with orange arrow
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
        <rect width="40" height="40" rx="10" fill="#1A1A1A"/>
        <text x="20" y="22" textAnchor="middle" fontSize="11" fontWeight="700" fill="white" fontFamily="sans-serif">amazon</text>
        <path d="M10 28 Q20 33 30 28" stroke="#FF9900" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <path d="M27 26 L30 28 L28 31" stroke="#FF9900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    ),
    Cred: (
      // Cred — black/dark with gold C
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
        <rect width="40" height="40" rx="10" fill="#1C1C1E"/>
        <text x="20" y="28" textAnchor="middle" fontSize="20" fontWeight="900" fill="#C9A84C" fontFamily="sans-serif">C</text>
      </svg>
    ),
    Slice: (
      // Slice — vibrant purple gradient with S
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
        <defs>
          <linearGradient id="sliceGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7C3AED"/>
            <stop offset="100%" stopColor="#DB2777"/>
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="10" fill="url(#sliceGrad)"/>
        <text x="20" y="28" textAnchor="middle" fontSize="20" fontWeight="900" fill="white" fontFamily="sans-serif">S</text>
      </svg>
    ),
    Navi: (
      // Navi — teal/cyan with N
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
        <defs>
          <linearGradient id="naviGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0EA5E9"/>
            <stop offset="100%" stopColor="#06B6D4"/>
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="10" fill="url(#naviGrad)"/>
        <text x="20" y="28" textAnchor="middle" fontSize="20" fontWeight="900" fill="white" fontFamily="sans-serif">N</text>
      </svg>
    ),
  };
  return icons[app.name] ?? (
    <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-xs font-bold">
      {app.name[0]}
    </div>
  );
}

/**
 * Known iOS UPI app deep-link schemes.
 * Each app on iOS registers its own URL scheme — the generic upi:// only works on Android.
 */
const IOS_UPI_APPS = [
  { name: "GPay",        scheme: "tez://upi/pay"      },
  { name: "PhonePe",     scheme: "phonepe://pay"       },
  { name: "Paytm",       scheme: "paytmmp://pay"       },
  { name: "BHIM",        scheme: "bhim://pay"          },
  { name: "Amazon Pay",  scheme: "amazonpay://pay"     },
  { name: "Cred",        scheme: "credpay://pay"       },
  { name: "Slice",       scheme: "slice://upi/pay"     },
  { name: "Navi",        scheme: "navi://upi/pay"      },
];

export function UpiPaymentModal({
  open,
  onClose,
  receiver,         // { id, name, upiId, imageUrl }
  amount,
  note,
  paidByUserId,
  receivedByUserId,
  groupId,
  onSettled,
}) {
  const [copied, setCopied] = useState(false);
  const [settling, setSettling] = useState(false);
  const [settled, setSettled] = useState(false);
  const [showOther, setShowOther] = useState(false);
  const [customScheme, setCustomScheme] = useState("");
  const [schemeCopied, setSchemeCopied] = useState(false);

  const createSettlement = useConvexMutation(api.settlements.createSettlement);

  if (!receiver?.upiId) return null;

  // Generic Android UPI link — triggers OS-level app chooser
  const androidUpiLink = buildUpiLink({
    scheme: "upi://pay",
    upiId: receiver.upiId,
    name: receiver.name,
    amount,
    note,
  });

  const handleCopyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(receiver.upiId);
      setCopied(true);
      toast.success("UPI ID copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  /** Opens a deep link — works for both iOS app-specific and Android generic links */
  const handleOpenApp = (link) => {
    window.location.href = link;
  };

  /** Try a custom URL scheme entered by the user */
  const handleOpenCustom = () => {
    const scheme = customScheme.trim();
    if (!scheme) {
      toast.error("Please enter a URL scheme first");
      return;
    }
    // Normalise — strip trailing ? or /
    const cleanScheme = scheme.replace(/[/?]+$/, "");
    const link = buildUpiLink({
      scheme: cleanScheme,
      upiId: receiver.upiId,
      name: receiver.name,
      amount,
      note,
    });
    window.location.href = link;
  };

  const handleCopyUpiLink = async () => {
    try {
      await navigator.clipboard.writeText(androidUpiLink);
      setSchemeCopied(true);
      toast.success("UPI payment link copied!");
      setTimeout(() => setSchemeCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
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
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
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
            using your UPI app, then mark as settled.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* UPI ID row */}
          <div className="flex items-center justify-between bg-muted px-4 py-3 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">UPI ID</p>
              <p className="font-mono font-medium text-sm">{receiver.upiId}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleCopyUpiId}
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

          {/* ── iOS: per-app buttons ── */}
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
                      className="gap-2 h-11 justify-start px-3"
                      onClick={() => handleOpenApp(link)}
                    >
                      <AppIcon app={app} />
                      <span className="text-sm font-medium">{app.name}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── Android: generic app-chooser button ── */
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
              onClick={() => handleOpenApp(androidUpiLink)}
            >
              <ExternalLink className="h-4 w-4" />
              Open UPI App
            </Button>
          )}

          {/* ── Other / Unlisted App ── */}
          <div className="border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowOther((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              <span>🔍 Other / unlisted app</span>
              {showOther ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {showOther && (
              <div className="px-4 pb-4 space-y-4 border-t">
                {/* Option A — custom URL scheme */}
                <div className="space-y-2 pt-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Option A — Enter your app&apos;s URL scheme
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Find it in the app or online, e.g.{" "}
                    <code className="bg-muted px-1 py-0.5 rounded text-[11px]">
                      iMobile://upi/pay
                    </code>{" "}
                    or{" "}
                    <code className="bg-muted px-1 py-0.5 rounded text-[11px]">
                      axisbank://upi/pay
                    </code>
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. myapp://upi/pay"
                      value={customScheme}
                      onChange={(e) => setCustomScheme(e.target.value)}
                      className="text-sm font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 gap-1"
                      onClick={handleOpenCustom}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open
                    </Button>
                  </div>
                </div>

                {/* Option B — copy UPI ID manually */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Option B — Copy &amp; paste manually
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Open any UPI app, go to &quot;Send money&quot;, and paste
                    the UPI ID below.
                  </p>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-muted text-sm font-mono px-3 py-2 rounded-md truncate">
                      {receiver.upiId}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 gap-1"
                      onClick={handleCopyUpiId}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      Copy
                    </Button>
                  </div>
                </div>

                {/* Option C — copy full UPI link (for Android) */}
                {!onIOS && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Option C — Copy full UPI payment link
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Share this link directly inside your UPI app or browser.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={handleCopyUpiLink}
                    >
                      {schemeCopied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      {schemeCopied ? "Copied!" : "Copy UPI Payment Link"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

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

          {/* Mark as settled */}
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
