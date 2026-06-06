import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/* ── get all notifications for current user ─────────────────────────────── */
export const getMyNotifications = query({
  handler: async (ctx) => {
    const me = await ctx.runQuery(internal.users.getCurrentUser);

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .filter((q) => q.neq(q.field("type"), "message"))
      .order("desc")
      .take(30);

    // Enrich with related user details
    return await Promise.all(
      notifications.map(async (n) => {
        let relatedUser = null;
        if (n.relatedUserId) {
          const u = await ctx.db.get(n.relatedUserId);
          relatedUser = u ? { name: u.name, imageUrl: u.imageUrl } : null;
        }
        return { ...n, relatedUser };
      })
    );
  },
});

/* ── unread count ────────────────────────────────────────────────────────── */
export const getUnreadCount = query({
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
      .query("notifications")
      .withIndex("by_user_and_read", (q) =>
        q.eq("userId", me._id).eq("read", false)
      )
      .filter((q) => q.neq(q.field("type"), "message"))
      .collect();

    return unread.length;
  },
});

/* ── mark one as read ────────────────────────────────────────────────────── */
export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const me = await ctx.runQuery(internal.users.getCurrentUser);
    const n = await ctx.db.get(args.notificationId);
    if (!n || n.userId !== me._id) throw new Error("Not found");
    await ctx.db.patch(args.notificationId, { read: true });
  },
});

/* ── mark all as read ────────────────────────────────────────────────────── */
export const markAllAsRead = mutation({
  handler: async (ctx) => {
    const me = await ctx.runQuery(internal.users.getCurrentUser);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read", (q) =>
        q.eq("userId", me._id).eq("read", false)
      )
      .collect();

    await Promise.all(
      unread.map((n) => ctx.db.patch(n._id, { read: true }))
    );
  },
});

/* ── internal: create a notification (called from settlements) ───────────── */
export const createNotification = mutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    relatedSettlementId: v.optional(v.id("settlements")),
    relatedUserId: v.optional(v.id("users")),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      read: false,
      relatedSettlementId: args.relatedSettlementId,
      relatedUserId: args.relatedUserId,
      amount: args.amount,
      createdAt: Date.now(),
    });
  },
});

/* ── get all settlements for transaction history ─────────────────────────── */
export const getTransactionHistory = query({
  handler: async (ctx) => {
    const me = await ctx.runQuery(internal.users.getCurrentUser);

    // Settlements where I paid
    const sent = await ctx.db
      .query("settlements")
      .withIndex("by_user_and_group", (q) =>
        q.eq("paidByUserId", me._id).eq("groupId", undefined)
      )
      .order("desc")
      .collect();

    // Settlements where I received
    const received = await ctx.db
      .query("settlements")
      .withIndex("by_receiver_and_group", (q) =>
        q.eq("receivedByUserId", me._id).eq("groupId", undefined)
      )
      .order("desc")
      .collect();

    // Group settlements (as payer)
    const groupSent = await ctx.db
      .query("settlements")
      .filter((q) =>
        q.and(
          q.eq(q.field("paidByUserId"), me._id),
          q.neq(q.field("groupId"), undefined)
        )
      )
      .order("desc")
      .collect();

    // Group settlements (as receiver)
    const groupReceived = await ctx.db
      .query("settlements")
      .filter((q) =>
        q.and(
          q.eq(q.field("receivedByUserId"), me._id),
          q.neq(q.field("groupId"), undefined)
        )
      )
      .order("desc")
      .collect();

    const all = [...sent, ...received, ...groupSent, ...groupReceived];

    // Deduplicate
    const unique = Array.from(new Map(all.map((s) => [s._id, s])).values());

    // Sort by date desc
    unique.sort((a, b) => b.date - a.date);

    // Enrich with user names
    const enriched = await Promise.all(
      unique.map(async (s) => {
        const payer = await ctx.db.get(s.paidByUserId);
        const receiver = await ctx.db.get(s.receivedByUserId);
        let group = null;
        if (s.groupId) group = await ctx.db.get(s.groupId);
        return {
          ...s,
          payer: payer ? { name: payer.name, imageUrl: payer.imageUrl } : null,
          receiver: receiver
            ? { name: receiver.name, imageUrl: receiver.imageUrl }
            : null,
          groupName: group?.name ?? null,
          isSent: s.paidByUserId === me._id,
        };
      })
    );

    return enriched;
  },
});
