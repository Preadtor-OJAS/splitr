import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Helper to determine the alphabetical order of two IDs for the unique constraint
export function getOrderedIds(id1, id2) {
  return id1 < id2 ? [id1, id2] : [id2, id1];
}

// -----------------------------------------------------------------------------
// Queries
// -----------------------------------------------------------------------------

// Get all accepted friends
export const getFriends = query({
  handler: async (ctx) => {
    const user = await ctx.runQuery(internal.users.getCurrentUser);
    
    // Find friendships where user is user1 or user2
    const friendships1 = await ctx.db
      .query("friendships")
      .withIndex("by_user1", (q) => q.eq("user1", user._id))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();
      
    const friendships2 = await ctx.db
      .query("friendships")
      .withIndex("by_user2", (q) => q.eq("user2", user._id))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    const friendships = [...friendships1, ...friendships2];
    
    // Fetch user details for each friend
    const friends = await Promise.all(
      friendships.map(async (f) => {
        const friendId = f.user1 === user._id ? f.user2 : f.user1;
        const friendUser = await ctx.db.get(friendId);
        return {
          id: friendId,
          name: friendUser.name,
          email: friendUser.email,
          imageUrl: friendUser.imageUrl,
          friendshipId: f._id,
        };
      })
    );
    
    return friends;
  },
});

// Get pending friend requests (incoming and outgoing)
export const getPendingRequests = query({
  handler: async (ctx) => {
    const user = await ctx.runQuery(internal.users.getCurrentUser);
    
    const friendships1 = await ctx.db
      .query("friendships")
      .withIndex("by_user1", (q) => q.eq("user1", user._id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
      
    const friendships2 = await ctx.db
      .query("friendships")
      .withIndex("by_user2", (q) => q.eq("user2", user._id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    const pending = [...friendships1, ...friendships2];
    
    const incoming = [];
    const outgoing = [];
    
    for (const f of pending) {
      const otherId = f.user1 === user._id ? f.user2 : f.user1;
      const otherUser = await ctx.db.get(otherId);
      
      const requestDetails = {
        id: otherId,
        name: otherUser.name,
        email: otherUser.email,
        imageUrl: otherUser.imageUrl,
        friendshipId: f._id,
      };
      
      if (f.requesterId === user._id) {
        outgoing.push(requestDetails);
      } else {
        incoming.push(requestDetails);
      }
    }
    
    return { incoming, outgoing };
  },
});

// Get users I have blocked
export const getBlockedUsers = query({
  handler: async (ctx) => {
    const user = await ctx.runQuery(internal.users.getCurrentUser);
    
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_blocker", (q) => q.eq("blockerId", user._id))
      .collect();
      
    const blockedUsers = await Promise.all(
      blocks.map(async (b) => {
        const blockedUser = await ctx.db.get(b.blockedId);
        return {
          id: blockedUser._id,
          name: blockedUser.name,
          email: blockedUser.email,
          imageUrl: blockedUser.imageUrl,
          blockId: b._id,
        };
      })
    );
    
    return blockedUsers;
  },
});

// Helper for other backend functions to check if two users are friends
export const checkIsFriend = query({
  args: { userId1: v.id("users"), userId2: v.id("users") },
  handler: async (ctx, args) => {
    const [u1, u2] = getOrderedIds(args.userId1, args.userId2);
    const friendship = await ctx.db
      .query("friendships")
      .withIndex("by_users", (q) => q.eq("user1", u1).eq("user2", u2))
      .first();
      
    return friendship?.status === "accepted";
  },
});

/**
 * Full-text search by name OR email — returns a list of results enriched
 * with friendship/block status so the UI can show Add / Pending / Friends.
 */
export const searchUsersForFriends = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    if (args.query.length < 2) return [];

    const me = await ctx.runQuery(internal.users.getCurrentUser);

    // Search by name and by email (full-text)
    const byName = await ctx.db
      .query("users")
      .withSearchIndex("search_name", (q) => q.search("name", args.query))
      .collect();

    const byEmail = await ctx.db
      .query("users")
      .withSearchIndex("search_email", (q) => q.search("email", args.query))
      .collect();

    // Merge & deduplicate, exclude self
    const seen = new Set();
    const candidates = [];
    for (const u of [...byName, ...byEmail]) {
      if (u._id === me._id || seen.has(u._id)) continue;
      seen.add(u._id);
      candidates.push(u);
    }

    // Fetch blocks by me and against me
    const myBlocks = await ctx.db
      .query("blocks")
      .withIndex("by_blocker", (q) => q.eq("blockerId", me._id))
      .collect();
    const blockedByMe = new Set(myBlocks.map((b) => b.blockedId));

    const blocksAgainstMe = await ctx.db
      .query("blocks")
      .withIndex("by_blocked", (q) => q.eq("blockedId", me._id))
      .collect();
    const blockedMe = new Set(blocksAgainstMe.map((b) => b.blockerId));

    // Fetch my friendships
    const fs1 = await ctx.db
      .query("friendships")
      .withIndex("by_user1", (q) => q.eq("user1", me._id))
      .collect();
    const fs2 = await ctx.db
      .query("friendships")
      .withIndex("by_user2", (q) => q.eq("user2", me._id))
      .collect();

    const friendshipMap = new Map();
    for (const f of [...fs1, ...fs2]) {
      const otherId = f.user1 === me._id ? f.user2 : f.user1;
      friendshipMap.set(otherId, f);
    }

    return candidates
      .filter((u) => !blockedMe.has(u._id)) // hide users who blocked me
      .map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        imageUrl: u.imageUrl,
        isBlocked: blockedByMe.has(u._id),
        status: friendshipMap.has(u._id)
          ? friendshipMap.get(u._id).status
          : "none",
        requesterId: friendshipMap.get(u._id)?.requesterId,
      }));
  },
});

// Helper to search a user by email, but respecting blocks and friends
export const searchUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const me = await ctx.runQuery(internal.users.getCurrentUser);
    
    // Exact email match
    const target = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
      
    if (!target) return null;
    if (target._id === me._id) return { isSelf: true };

    // Check if there is a block either way
    const myBlock = await ctx.db
      .query("blocks")
      .withIndex("by_both", (q) => q.eq("blockerId", me._id).eq("blockedId", target._id))
      .first();
      
    if (myBlock) return { isBlocked: true };

    const theirBlock = await ctx.db
      .query("blocks")
      .withIndex("by_both", (q) => q.eq("blockerId", target._id).eq("blockedId", me._id))
      .first();
      
    if (theirBlock) return null; // Silently pretend they don't exist

    // Check friendship status
    const [u1, u2] = getOrderedIds(me._id, target._id);
    const friendship = await ctx.db
      .query("friendships")
      .withIndex("by_users", (q) => q.eq("user1", u1).eq("user2", u2))
      .first();

    return {
      id: target._id,
      name: target.name,
      email: target.email,
      imageUrl: target.imageUrl,
      status: friendship ? friendship.status : "none", // "none", "pending", "accepted"
      requesterId: friendship?.requesterId,
    };
  },
});


// -----------------------------------------------------------------------------
// Mutations
// -----------------------------------------------------------------------------

export const sendRequest = mutation({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    const me = await ctx.runQuery(internal.users.getCurrentUser);
    if (me._id === args.targetUserId) throw new Error("Cannot add yourself");

    // Check blocks
    const theirBlock = await ctx.db
      .query("blocks")
      .withIndex("by_both", (q) => q.eq("blockerId", args.targetUserId).eq("blockedId", me._id))
      .first();
    if (theirBlock) throw new Error("User not found or unavailable");

    const myBlock = await ctx.db
      .query("blocks")
      .withIndex("by_both", (q) => q.eq("blockerId", me._id).eq("blockedId", args.targetUserId))
      .first();
    if (myBlock) throw new Error("You have blocked this user. Unblock them first.");

    const [u1, u2] = getOrderedIds(me._id, args.targetUserId);
    
    const existing = await ctx.db
      .query("friendships")
      .withIndex("by_users", (q) => q.eq("user1", u1).eq("user2", u2))
      .first();

    if (existing) {
      if (existing.status === "accepted") throw new Error("Already friends");
      if (existing.status === "pending") {
        if (existing.requesterId === me._id) {
          throw new Error("Request already sent");
        } else {
          // They already sent me one, so auto-accept
          await ctx.db.patch(existing._id, { status: "accepted", updatedAt: Date.now() });
          return { status: "accepted" };
        }
      }
    }

    // Insert new request
    await ctx.db.insert("friendships", {
      user1: u1,
      user2: u2,
      status: "pending",
      requesterId: me._id,
      updatedAt: Date.now(),
    });

    // Notify target
    await ctx.db.insert("notifications", {
      userId: args.targetUserId,
      type: "friend_request",
      title: "New Friend Request",
      message: `${me.name} sent you a friend request.`,
      read: false,
      relatedUserId: me._id,
      createdAt: Date.now(),
    });

    return { status: "pending" };
  },
});

export const acceptRequest = mutation({
  args: { friendshipId: v.id("friendships") },
  handler: async (ctx, args) => {
    const me = await ctx.runQuery(internal.users.getCurrentUser);
    const friendship = await ctx.db.get(args.friendshipId);
    
    if (!friendship || friendship.status !== "pending") {
      throw new Error("Invalid or expired request");
    }
    
    // Verify I am the recipient
    if (friendship.requesterId === me._id) {
      throw new Error("You cannot accept your own request");
    }
    if (friendship.user1 !== me._id && friendship.user2 !== me._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.friendshipId, {
      status: "accepted",
      updatedAt: Date.now(),
    });

    // Notify the requester
    await ctx.db.insert("notifications", {
      userId: friendship.requesterId,
      type: "friend_accepted",
      title: "Request Accepted",
      message: `${me.name} accepted your friend request!`,
      read: false,
      relatedUserId: me._id,
      createdAt: Date.now(),
    });
  },
});

export const declineRequest = mutation({
  args: { friendshipId: v.id("friendships") },
  handler: async (ctx, args) => {
    const me = await ctx.runQuery(internal.users.getCurrentUser);
    const friendship = await ctx.db.get(args.friendshipId);
    
    if (!friendship) throw new Error("Not found");
    if (friendship.user1 !== me._id && friendship.user2 !== me._id) {
      throw new Error("Not authorized");
    }

    // Simply delete the friendship row entirely so they can try again later
    await ctx.db.delete(args.friendshipId);
  },
});

export const blockUser = mutation({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    const me = await ctx.runQuery(internal.users.getCurrentUser);
    if (me._id === args.targetUserId) throw new Error("Cannot block yourself");

    // Check if already blocked
    const existingBlock = await ctx.db
      .query("blocks")
      .withIndex("by_both", (q) => q.eq("blockerId", me._id).eq("blockedId", args.targetUserId))
      .first();
      
    if (existingBlock) return; // Already blocked

    // Insert block
    await ctx.db.insert("blocks", {
      blockerId: me._id,
      blockedId: args.targetUserId,
      createdAt: Date.now(),
    });

    // Destroy any existing friendship or pending request
    const [u1, u2] = getOrderedIds(me._id, args.targetUserId);
    const friendship = await ctx.db
      .query("friendships")
      .withIndex("by_users", (q) => q.eq("user1", u1).eq("user2", u2))
      .first();
      
    if (friendship) {
      await ctx.db.delete(friendship._id);
    }
  },
});

export const unblockUser = mutation({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    const me = await ctx.runQuery(internal.users.getCurrentUser);
    
    const block = await ctx.db
      .query("blocks")
      .withIndex("by_both", (q) => q.eq("blockerId", me._id).eq("blockedId", args.targetUserId))
      .first();
      
    if (block) {
      await ctx.db.delete(block._id);
    }
  },
});

export const unfriend = mutation({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    const me = await ctx.runQuery(internal.users.getCurrentUser);
    const [u1, u2] = getOrderedIds(me._id, args.targetUserId);
    
    const friendship = await ctx.db
      .query("friendships")
      .withIndex("by_users", (q) => q.eq("user1", u1).eq("user2", u2))
      .first();
      
    if (friendship && friendship.status === "accepted") {
      await ctx.db.delete(friendship._id);
    }
  },
});

// -----------------------------------------------------------------------------
// Migration
// -----------------------------------------------------------------------------

export const runFriendMigration = mutation({
  handler: async (ctx) => {
    const expenses = await ctx.db.query("expenses").collect();
    const settlements = await ctx.db.query("settlements").collect();
    const groups = await ctx.db.query("groups").collect();
    
    const pairs = new Set();
    
    // Add pairs from expenses
    for (const e of expenses) {
      for (const s of e.splits) {
        if (s.userId !== e.paidByUserId) {
          const [u1, u2] = getOrderedIds(s.userId, e.paidByUserId);
          pairs.add(`${u1}_${u2}`);
        }
      }
    }
    
    // Add pairs from settlements
    for (const s of settlements) {
      if (s.paidByUserId !== s.receivedByUserId) {
        const [u1, u2] = getOrderedIds(s.paidByUserId, s.receivedByUserId);
        pairs.add(`${u1}_${u2}`);
      }
    }
    
    // Add pairs from groups
    for (const g of groups) {
      for (let i = 0; i < g.members.length; i++) {
        for (let j = i + 1; j < g.members.length; j++) {
          const m1 = g.members[i].userId;
          const m2 = g.members[j].userId;
          if (m1 !== m2) {
            const [u1, u2] = getOrderedIds(m1, m2);
            pairs.add(`${u1}_${u2}`);
          }
        }
      }
    }
    
    let created = 0;
    
    for (const pair of pairs) {
      const [u1, u2] = pair.split("_");
      
      const existing = await ctx.db
        .query("friendships")
        .withIndex("by_users", (q) => q.eq("user1", u1).eq("user2", u2))
        .first();
        
      if (!existing) {
        await ctx.db.insert("friendships", {
          user1: u1,
          user2: u2,
          status: "accepted",
          requesterId: u1, // arbitrary
          updatedAt: Date.now(),
        });
        created++;
      }
    }
    
    return `Migration complete. Created ${created} friendships.`;
  },
});
