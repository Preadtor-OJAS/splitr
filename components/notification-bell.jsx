"use client";

import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useConvexMutation } from "@/hooks/use-convex-query";
import { useQuery } from "convex/react";
import { Bell, CheckCheck, ArrowLeftRight, Inbox, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";

const TYPE_CONFIG = {
  settlement_received: {
    icon: ArrowLeftRight,
    bg: "bg-green-100",
    color: "text-green-600",
  },
  settlement_sent: {
    icon: ArrowLeftRight,
    bg: "bg-blue-100",
    color: "text-blue-600",
  },
  reminder: {
    icon: Clock,
    bg: "bg-amber-100",
    color: "text-amber-600",
  },
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Live real-time queries — only UPI & reminder notifications
  const notifications = useQuery(api.notifications.getMyNotifications);
  const unreadCount = useQuery(api.notifications.getUnreadCount);

  const markAsRead = useConvexMutation(api.notifications.markAsRead);
  const markAllAsRead = useConvexMutation(api.notifications.markAllAsRead);

  const handleMarkAll = async () => {
    await markAllAsRead.mutate();
  };

  const handleClickNotification = async (n) => {
    if (!n.read) {
      await markAsRead.mutate({ notificationId: n._id });
    }
    // Navigate to person page for reminders
    if (n.type === "reminder" && n.relatedUserId) {
      setOpen(false);
      router.push(`/person/${n.relatedUserId}`);
    }
  };

  const count = unreadCount ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative w-10 h-10"
          id="notification-bell-btn"
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0 shadow-xl" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Notifications</span>
            {count > 0 && (
              <Badge className="h-5 px-1.5 text-[10px] bg-red-500 hover:bg-red-500">
                {count}
              </Badge>
            )}
          </div>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={handleMarkAll}
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        <div className="max-h-96 overflow-y-auto divide-y">
          {!notifications || notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <Inbox className="h-8 w-8 opacity-40" />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs opacity-60">Payments & reminders appear here</p>
            </div>
          ) : (
            notifications.map((n) => {
              const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.settlement_sent;
              const Icon = cfg.icon;
              return (
                <div
                  key={n._id}
                  className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                    !n.read ? "bg-primary/5" : ""
                  }`}
                  onClick={() => handleClickNotification(n)}
                >
                  <div className={`shrink-0 mt-0.5 p-1.5 rounded-full ${cfg.bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="shrink-0 mt-1.5">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
