"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ArrowUpCircle, ArrowDownCircle, Bell, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useConvexQuery } from "@/hooks/use-convex-query";
import { api } from "@/convex/_generated/api";

function ReminderButton({ item, currentUser }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState(false);
  const [manualEmail, setManualEmail] = useState("");

  // Use stored email or fall back to manual input
  const emailToUse = item.email || manualEmail;

  const sendReminder = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (sent) {
      toast.info("Reminder already sent to " + item.name);
      return;
    }

    if (!emailToUse) {
      toast.error("Please enter an email address.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: emailToUse,
          toName: item.name,
          fromName: currentUser?.name || "your friend",
          amount: item.amount,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");

      setSent(true);
      setOpen(false);
      toast.success(`Reminder sent to ${item.name}! 🔔`);
    } catch (err) {
      toast.error("Could not send reminder: " + err.message);
    } finally {
      setSending(false);
    }
  };

  // If email exists in DB — simple one-click button
  if (item.email) {
    return (
      <Button
        size="sm"
        variant={sent ? "secondary" : "outline"}
        className={`h-7 px-2 text-xs gap-1 flex-shrink-0 transition-all ${
          sent
            ? "text-green-600 border-green-300 bg-green-50"
            : "hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50"
        }`}
        onClick={sendReminder}
        disabled={sending || sent}
        id={`remind-btn-${item.userId}`}
        title={sent ? "Reminder sent!" : `Send payment reminder to ${item.name}`}
      >
        {sending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Bell className="h-3 w-3" />
        )}
        {sent ? "Sent!" : "Remind"}
      </Button>
    );
  }

  // If no email in DB — show popover to enter email manually
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs gap-1 flex-shrink-0 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
          disabled={sent}
          id={`remind-btn-${item.userId}`}
        >
          <Bell className="h-3 w-3" />
          {sent ? "Sent!" : "Remind"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-medium mb-1">Send Reminder to {item.name}</p>
        <p className="text-xs text-muted-foreground mb-3">
          Email not on file. Enter their email to send a reminder.
        </p>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="their@email.com"
            value={manualEmail}
            onChange={(e) => setManualEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendReminder()}
            className="h-8 text-sm"
            autoFocus
          />
          <Button
            size="sm"
            className="h-8 px-3 bg-green-600 hover:bg-green-700"
            onClick={sendReminder}
            disabled={sending || !manualEmail}
          >
            {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function BalanceSummary({ balances }) {
  const { data: currentUser } = useConvexQuery(api.users.getCurrentUser);

  if (!balances) return null;

  const { oweDetails } = balances;
  const hasOwed = oweDetails.youAreOwedBy.length > 0;
  const hasOwing = oweDetails.youOwe.length > 0;

  return (
    <div className="space-y-4">
      {!hasOwed && !hasOwing && (
        <div className="text-center py-6">
          <p className="text-muted-foreground">You're all settled up!</p>
        </div>
      )}

      {hasOwed && (
        <div>
          <h3 className="text-sm font-medium flex items-center mb-3">
            <ArrowUpCircle className="h-4 w-4 text-green-500 mr-2" />
            Owed to you
          </h3>
          <div className="space-y-2">
            {oweDetails.youAreOwedBy.map((item) => (
              <div
                key={item.userId}
                className="flex items-center justify-between hover:bg-muted p-2 rounded-md transition-colors"
              >
                <Link
                  href={`/person/${item.userId}`}
                  className="flex items-center gap-2 flex-1 min-w-0"
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={item.imageUrl} />
                    <AvatarFallback>{item.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate">{item.name}</span>
                </Link>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className="font-medium text-green-600 text-sm">
                    ₹{item.amount.toFixed(2)}
                  </span>
                  <ReminderButton item={item} currentUser={currentUser} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasOwing && (
        <div>
          <h3 className="text-sm font-medium flex items-center mb-3">
            <ArrowDownCircle className="h-4 w-4 text-red-500 mr-2" />
            You owe
          </h3>
          <div className="space-y-2">
            {oweDetails.youOwe.map((item) => (
              <Link
                href={`/person/${item.userId}`}
                key={item.userId}
                className="flex items-center justify-between hover:bg-muted p-2 rounded-md transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={item.imageUrl} />
                    <AvatarFallback>{item.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{item.name}</span>
                </div>
                <span className="font-medium text-red-600 text-sm">
                  ₹{item.amount.toFixed(2)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
