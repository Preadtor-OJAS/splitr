"use client";

import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useConvexQuery } from "@/hooks/use-convex-query";
import { useQuery } from "convex/react";
import { MessageCircle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function ChatInboxButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Live real-time query for all conversations
  const conversations = useQuery(api.messages.getConversationsList);
  const unreadCount = useQuery(api.messages.getUnreadMessageCount);

  const count = unreadCount ?? 0;

  const handleOpenChat = (userId) => {
    setOpen(false);
    router.push(`/chat/${userId}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative w-10 h-10"
        >
          <MessageCircle className="h-5 w-5" />
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
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Chats</span>
            {count > 0 && (
              <Badge className="h-5 px-1.5 text-[10px] bg-red-500 hover:bg-red-500">
                {count} new
              </Badge>
            )}
          </div>
        </div>

        {/* List */}
        <div className="max-h-96 overflow-y-auto divide-y">
          {!conversations || conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <Inbox className="h-8 w-8 opacity-40" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs opacity-60">Go to a person's page to chat</p>
            </div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.otherUser.id}
                className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                  c.unreadCount > 0 ? "bg-primary/5" : ""
                }`}
                onClick={() => handleOpenChat(c.otherUser.id)}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={c.otherUser.imageUrl} />
                  <AvatarFallback>{c.otherUser.name.charAt(0)}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-medium truncate pr-2">
                      {c.otherUser.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(c.lastMessageTime), { addSuffix: true })}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs truncate ${c.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {c.isMine ? "You: " : ""}{c.lastMessage}
                    </p>
                    {c.unreadCount > 0 && (
                      <div className="shrink-0 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {c.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
