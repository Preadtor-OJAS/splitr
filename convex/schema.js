import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    tokenIdentifier: v.string(),
    imageUrl: v.optional(v.string()),
    upiId: v.optional(v.string()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"])
    .searchIndex("search_name", { searchField: "name" })
    .searchIndex("search_email", { searchField: "email" }),

  // Expenses
  expenses: defineTable({
    description: v.string(),
    amount: v.number(),
    category: v.optional(v.string()),
    date: v.number(), // timestamp
    paidByUserId: v.id("users"), // Reference to users table
    splitType: v.string(), // "equal", "percentage", "exact"
    splits: v.array(
      v.object({
        userId: v.id("users"), // Reference to users table
        amount: v.number(), // amount owed by this user
        paid: v.boolean(),
      })
    ),
    groupId: v.optional(v.id("groups")), // null for one-on-one expenses
    createdBy: v.id("users"), // Reference to users table
  })
    .index("by_group", ["groupId"])
    .index("by_user_and_group", ["paidByUserId", "groupId"])
    .index("by_date", ["date"]),

  // Settlements
  settlements: defineTable({
    amount: v.number(),
    note: v.optional(v.string()),
    date: v.number(), // timestamp
    paidByUserId: v.id("users"), // Reference to users table
    receivedByUserId: v.id("users"), // Reference to users table
    groupId: v.optional(v.id("groups")), // null for one-on-one settlements
    relatedExpenseIds: v.optional(v.array(v.id("expenses"))), // Which expenses this settlement covers
    createdBy: v.id("users"), // Reference to users table
  })
    .index("by_group", ["groupId"])
    .index("by_user_and_group", ["paidByUserId", "groupId"])
    .index("by_receiver_and_group", ["receivedByUserId", "groupId"])
    .index("by_date", ["date"]),

  // Groups
  groups: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"), // Reference to users table
    members: v.array(
      v.object({
        userId: v.id("users"), // Reference to users table
        role: v.string(), // "admin" or "member"
        joinedAt: v.number(),
      })
    ),
  }),

  // In-app Notifications
  notifications: defineTable({
    userId: v.id("users"),        // who receives this notification
    type: v.string(),             // "settlement_received" | "settlement_sent" | "reminder"
    title: v.string(),
    message: v.string(),
    read: v.boolean(),
    relatedSettlementId: v.optional(v.id("settlements")),
    relatedUserId: v.optional(v.id("users")),  // the other party
    amount: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_read", ["userId", "read"]),

  // Chat messages between two users
  messages: defineTable({
    senderId: v.id("users"),
    receiverId: v.id("users"),
    content: v.string(),
    read: v.boolean(),
    createdAt: v.number(),
    // Canonical "conversation key": smaller id + larger id joined by "_"
    conversationKey: v.string(),
  })
    .index("by_conversation", ["conversationKey", "createdAt"])
    .index("by_receiver_unread", ["receiverId", "read"])
    .index("by_sender", ["senderId"]),

  // Friendships
  friendships: defineTable({
    user1: v.id("users"), // Alphabetically smaller ID
    user2: v.id("users"), // Alphabetically larger ID
    status: v.string(), // "pending", "accepted"
    requesterId: v.id("users"), // The user who initiated the request
    updatedAt: v.number(),
  })
    .index("by_users", ["user1", "user2"])
    .index("by_user1", ["user1"])
    .index("by_user2", ["user2"])
    .index("by_requester", ["requesterId"]),

  // Blocks
  blocks: defineTable({
    blockerId: v.id("users"), // The user who blocked
    blockedId: v.id("users"), // The user who got blocked
    createdAt: v.number(),
  })
    .index("by_blocker", ["blockerId"])
    .index("by_blocked", ["blockedId"])
    .index("by_both", ["blockerId", "blockedId"]),
});
