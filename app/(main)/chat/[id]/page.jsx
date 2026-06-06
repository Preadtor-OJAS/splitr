"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { useConvexMutation, useConvexQuery } from "@/hooks/use-convex-query";
import { useQuery } from "convex/react";
import { BarLoader } from "react-spinners";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";

function formatMsgTime(ts) {
  const d = new Date(ts);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return `Yesterday ${format(d, "h:mm a")}`;
  return format(d, "MMM d, h:mm a");
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  const { data: currentUser } = useConvexQuery(api.users.getCurrentUser);
  const { data: otherUser, isLoading: userLoading } = useConvexQuery(
    api.users.getUserById,
    params.id ? { userId: params.id } : "skip"
  );

  // Use Convex useQuery directly for real-time chat updates
  const messages = useQuery(
    api.messages.getConversation,
    params.id ? { otherUserId: params.id } : "skip"
  );

  const sendMessage = useConvexMutation(api.messages.sendMessage);
  const markRead = useConvexMutation(api.messages.markConversationRead);

  // Mark messages as read when entering chat
  useEffect(() => {
    if (params.id) {
      markRead.mutate({ otherUserId: params.id });
    }
  }, [params.id]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !params.id) return;
    setText("");
    try {
      await sendMessage.mutate({ receiverId: params.id, content: trimmed });
    } catch (e) {
      setText(trimmed);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (userLoading) {
    return (
      <div className="container mx-auto py-12">
        <BarLoader width="100%" color="#36d7b7" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl flex flex-col h-[calc(100vh-10rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b mb-2">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-10 w-10">
          <AvatarImage src={otherUser?.imageUrl} />
          <AvatarFallback>{otherUser?.name?.charAt(0) ?? "?"}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold leading-tight">{otherUser?.name}</p>
          <p className="text-xs text-muted-foreground">{otherUser?.email}</p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
        {messages === undefined ? (
          <div className="flex justify-center py-8">
            <BarLoader width={200} color="#36d7b7" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <div className="bg-muted p-4 rounded-full">
              <MessageCircle className="h-8 w-8 opacity-40" />
            </div>
            <p className="font-medium">No messages yet</p>
            <p className="text-sm">
              Say hi to {otherUser?.name?.split(" ")[0]}! 👋
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const isMe = msg.senderId === currentUser?._id;
              const showTime =
                i === 0 ||
                msg.createdAt - messages[i - 1].createdAt > 5 * 60 * 1000;

              return (
                <div key={msg._id}>
                  {showTime && (
                    <div className="flex justify-center my-2">
                      <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {formatMsgTime(msg.createdAt)}
                      </span>
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex",
                      isMe ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm",
                        isMe
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2 pt-4 border-t">
        <Input
          placeholder={`Message ${otherUser?.name?.split(" ")[0] ?? ""}...`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 rounded-full px-4"
          autoFocus
        />
        <Button
          size="icon"
          className="shrink-0 rounded-full h-10 w-10"
          onClick={handleSend}
          disabled={!text.trim() || sendMessage.isLoading}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
