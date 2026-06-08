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
import {
  ArrowLeft,
  Send,
  MessageCircle,
  MoreVertical,
  Ban,
  ShieldOff,
  AlertTriangle,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const bottomRef = useRef(null);
  const menuRef = useRef(null);

  const { data: currentUser } = useConvexQuery(api.users.getCurrentUser);
  const { data: otherUser, isLoading: userLoading } = useConvexQuery(
    api.users.getUserById,
    params.id ? { userId: params.id } : "skip"
  );

  // Block status between me and the other user
  const { data: blockStatus } = useConvexQuery(
    api.friends.getBlockStatus,
    params.id ? { otherUserId: params.id } : "skip"
  );

  // Use Convex useQuery directly for real-time chat updates
  const messages = useQuery(
    api.messages.getConversation,
    params.id ? { otherUserId: params.id } : "skip"
  );

  const sendMessage = useConvexMutation(api.messages.sendMessage);
  const markRead = useConvexMutation(api.messages.markConversationRead);
  const blockUser = useConvexMutation(api.friends.blockUser);
  const unblockUser = useConvexMutation(api.friends.unblockUser);

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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setConfirming(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !params.id) return;
    setText("");
    try {
      await sendMessage.mutate({ receiverId: params.id, content: trimmed });
    } catch (e) {
      setText(trimmed);
      toast.error(e.message);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBlock = async () => {
    try {
      await blockUser.mutate({ targetUserId: params.id });
      toast.success(`${otherUser?.name} has been blocked.`);
      setMenuOpen(false);
      setConfirming(false);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleUnblock = async () => {
    try {
      await unblockUser.mutate({ targetUserId: params.id });
      toast.success(`${otherUser?.name} has been unblocked.`);
      setMenuOpen(false);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const iBlocked = blockStatus?.iBlockedThem;
  const theyBlocked = blockStatus?.theyBlockedMe;
  const canChat = !iBlocked && !theyBlocked;

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
        <div className="flex-1 min-w-0">
          <p className="font-semibold leading-tight truncate">{otherUser?.name}</p>
          <p className="text-xs text-muted-foreground truncate">{otherUser?.email}</p>
        </div>

        {/* Direct Block / Unblock Action Buttons */}
        <div className="flex items-center gap-2">
          {iBlocked ? (
            <Button
              variant="outline"
              size="sm"
              className="text-green-600 border-green-200 hover:bg-green-50"
              onClick={handleUnblock}
            >
              <ShieldOff className="h-4 w-4 mr-2" />
              Unblock
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
              onClick={() => {
                if (window.confirm(`Are you sure you want to block ${otherUser?.name}?`)) {
                  handleBlock();
                }
              }}
              title="Block User"
            >
              <Ban className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* ⋮ Menu */}
        <div className="relative shrink-0 hidden" ref={menuRef}>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => {
              setMenuOpen((v) => !v);
              setConfirming(false);
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>

          {menuOpen && (
            <div className="absolute right-0 top-10 z-50 w-52 bg-popover border rounded-xl shadow-lg py-1 text-sm">
              {iBlocked ? (
                /* Already blocked — show Unblock */
                <button
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-muted transition-colors text-green-600"
                  onClick={handleUnblock}
                >
                  <ShieldOff className="h-4 w-4" />
                  Unblock {otherUser?.name?.split(" ")[0]}
                </button>
              ) : confirming ? (
                /* Confirm block */
                <div className="px-4 py-3 space-y-2">
                  <p className="font-medium text-destructive text-xs">
                    Block {otherUser?.name}?
                  </p>
                  <p className="text-xs text-muted-foreground">
                    They won&apos;t be able to message you and you won&apos;t see their messages.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1 h-7 text-xs"
                      onClick={handleBlock}
                    >
                      Block
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs"
                      onClick={() => setConfirming(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                /* Default — show Block option */
                <button
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-muted transition-colors text-destructive"
                  onClick={() => setConfirming(true)}
                >
                  <Ban className="h-4 w-4" />
                  Block {otherUser?.name?.split(" ")[0]}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Block banners */}
      {iBlocked && (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2.5 mb-3 text-sm">
          <Ban className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-amber-800 dark:text-amber-300 flex-1">
            You&apos;ve blocked <strong>{otherUser?.name}</strong>. Unblock to send messages.
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs shrink-0 border-amber-400 text-amber-700 hover:bg-amber-100"
            onClick={handleUnblock}
          >
            Unblock
          </Button>
        </div>
      )}

      {theyBlocked && !iBlocked && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5 mb-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <span className="text-red-700 dark:text-red-300">
            You can&apos;t message this person right now.
          </span>
        </div>
      )}

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

      {/* Input bar — disabled when blocked */}
      <div className="flex items-center gap-2 pt-4 border-t">
        <Input
          placeholder={
            !canChat
              ? "Messaging unavailable"
              : `Message ${otherUser?.name?.split(" ")[0] ?? ""}...`
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 rounded-full px-4 disabled:opacity-60"
          autoFocus={canChat}
          disabled={!canChat}
        />
        <Button
          size="icon"
          className="shrink-0 rounded-full h-10 w-10"
          onClick={handleSend}
          disabled={!text.trim() || sendMessage.isLoading || !canChat}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
