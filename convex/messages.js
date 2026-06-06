import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/* helper: build a stable conversation key from two user IDs */
function convKey(a, b) {
  return [a, b].sort().join("_");
}

/* ── send a message (NO bell notification — chat has its own inbox) ──────── */
export const sendMessage = mutation({
  args: {
    receiverId: v.id("users"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const me = await ctx.runQuery(internal.users.getCurrentUser);
    if (me._id === args.receiverId) throw new Error("Cannot message yourself");
    if (!args.content.trim()) throw new Error("Message cannot be empty");

    const receiver = await ctx.db.get(args.receiverId);
    if (!receiver) throw new Error("Receiver not found");

    return await ctx.db.insert("messages", {
      senderId: me._id,
      receiverId: args.receiverId,
      content: args.content.trim(),
      read: false,
      createdAt: Date.now(),
      conversationKey: convKey(me._id, args.receiverId),
    });
  },
});

/* ── get all messages in a conversation ─────────────────────────────────── */
export const getConversation = query({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, args) => {
    const me = await ctx.runQuery(internal.users.getCurrentUser);
    const key = convKey(me._id, args.otherUserId);

    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationKey", key))
      .order("asc")
      .collect();
  },
});

/* ── get all conversations (inbox list) ─────────────────────────────────── */
export const getConversationsList = query({
  handler: async (ctx) => {
    const me = await ctx.runQuery(internal.users.getCurrentUser);

    // Get all messages where I'm receiver or sender
    const received = await ctx.db
      .query("messages")
      .withIndex("by_receiver_unread", (q) => q.eq("receiverId", me._id))
      .order("desc")
      .collect();

    // For sent, filter from all messages (no sender index — small dataset)
    const allMsgs = await ctx.db.query("messages").order("desc").collect();
    const sent = allMsgs.filter((m) => m.senderId === me._id);

    // Merge and dedupe by conversationKey, keeping latest per conversation
    const latestByKey = new Map();
    for (const msg of [...received, ...sent]) {
      const existing = latestByKey.get(msg.conversationKey);
      if (!existing || msg.createdAt > existing.createdAt) {
        latestByKey.set(msg.conversationKey, msg);
      }
    }

    // Sort conversations by latest message time
    const convos = [...latestByKey.values()].sort(
      (a, b) => b.createdAt - a.createdAt
    );

    // Enrich with other user's info + unread count
    const enriched = await Promise.all(
      convos.map(async (msg) => {
        const otherUserId =
          msg.senderId === me._id ? msg.receiverId : msg.senderId;
        const other = await ctx.db.get(otherUserId);

        // Count unread messages from this person
        const key = convKey(me._id, otherUserId);
        const unreadInConvo = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationKey", key))
          .filter((q) =>
            q.and(
              q.eq(q.field("receiverId"), me._id),
              q.eq(q.field("read"), false)
            )
          )
          .collect();

        return {
          otherUser: other
            ? {
                id: other._id,
                name: other.name,
                imageUrl: other.imageUrl,
              }
            : null,
          lastMessage: msg.content,
          lastMessageTime: msg.createdAt,
          isMine: msg.senderId === me._id,
          unreadCount: unreadInConvo.length,
        };
      })
    );

    return enriched.filter((c) => c.otherUser !== null);
  },
});

/* ── mark all messages from a sender as read ────────────────────────────── */
export const markConversationRead = mutation({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, args) => {
    const me = await ctx.runQuery(internal.users.getCurrentUser);
    const key = convKey(me._id, args.otherUserId);

    const unread = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationKey", key))
      .filter((q) =>
        q.and(
          q.eq(q.field("receiverId"), me._id),
          q.eq(q.field("read"), false)
        )
      )
      .collect();

    await Promise.all(unread.map((m) => ctx.db.patch(m._id, { read: true })));
  },
});

/* ── total unread message count ─────────────────────────────────────────── */
export const getUnreadMessageCount = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .first();
    if (!me) return 0;

    const unread = await ctx.db
      .query("messages")
      .withIndex("by_receiver_unread", (q) =>
        q.eq("receiverId", me._id).eq("read", false)
      )
      .collect();

    return unread.length;
  },
});

/* ── send a payment reminder (bell notification only) ────────────────────── */
export const sendReminder = mutation({
  args: {
    toUserId: v.id("users"),
    amount: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await ctx.runQuery(internal.users.getCurrentUser);
    if (me._id === args.toUserId) throw new Error("Cannot remind yourself");

    const amountStr = `₹${args.amount.toFixed(2)}`;

    await ctx.db.insert("notifications", {
      userId: args.toUserId,
      type: "reminder",
      title: `⏰ Payment Reminder from ${me.name}`,
      message: `${me.name} is reminding you to pay ${amountStr}${args.note ? ` · ${args.note}` : ""}`,
      read: false,
      relatedUserId: me._id,
      amount: args.amount,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});
