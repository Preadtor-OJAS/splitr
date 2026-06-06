// convex/contacts.js
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";

/* ──────────────────────────────────────────────────────────────────────────
   1. getAllContacts – 1‑to‑1 expense contacts + groups
   ──────────────────────────────────────────────────────────────────────── */
export const getAllContacts = query({
  handler: async (ctx) => {
    // Use the centralized getCurrentUser instead of duplicating auth logic
    const currentUser = await ctx.runQuery(internal.users.getCurrentUser);

    /* ── fetch friends from friend system ───────────────────────────────── */
    const contactUsers = await ctx.runQuery(api.friends.getFriends);

    /* ── groups where current user is a member ─────────────────────────── */
    const userGroups = (await ctx.db.query("groups").collect())
      .filter((g) => g.members.some((m) => m.userId === currentUser._id))
      .map((g) => ({
        id: g._id,
        name: g.name,
        description: g.description,
        memberCount: g.members.length,
        type: "group",
      }));

    /* sort alphabetically */
    contactUsers.sort((a, b) => a?.name.localeCompare(b?.name));
    userGroups.sort((a, b) => a.name.localeCompare(b.name));

    return { users: contactUsers.filter(Boolean), groups: userGroups };
  },
});

/* ──────────────────────────────────────────────────────────────────────────
   2. createGroup – create a new group
   ──────────────────────────────────────────────────────────────────────── */
export const createGroup = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    members: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Use the centralized getCurrentUser instead of duplicating auth logic
    const currentUser = await ctx.runQuery(internal.users.getCurrentUser);

    if (!args.name.trim()) throw new Error("Group name cannot be empty");

    const uniqueMembers = new Set(args.members);
    uniqueMembers.add(currentUser._id); // ensure creator

    // Validate that all member users exist and are friends
    for (const id of uniqueMembers) {
      if (id === currentUser._id) continue;
      
      const user = await ctx.db.get(id);
      if (!user) throw new Error(`User with ID ${id} not found`);
        
      const isFriend = await ctx.runQuery(api.friends.checkIsFriend, {
        userId1: currentUser._id,
        userId2: id,
      });
      if (!isFriend) throw new Error(`You must be friends with ${user.name} to add them to a group`);
    }

    return await ctx.db.insert("groups", {
      name: args.name.trim(),
      description: args.description?.trim() ?? "",
      createdBy: currentUser._id,
      members: [...uniqueMembers].map((id) => ({
        userId: id,
        role: id === currentUser._id ? "admin" : "member",
        joinedAt: Date.now(),
      })),
    });
  },
});