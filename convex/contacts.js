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

/* ──────────────────────────────────────────────────────────────────────────
   3. leaveGroup – remove current user from group
   ──────────────────────────────────────────────────────────────────────── */
export const leaveGroup = mutation({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const currentUser = await ctx.runQuery(internal.users.getCurrentUser);
    const group = await ctx.db.get(args.groupId);
    
    if (!group) throw new Error("Group not found");

    const newMembers = group.members.filter((m) => m.userId !== currentUser._id);

    if (newMembers.length === 0) {
      // If empty, delete the group entirely
      await ctx.db.delete(args.groupId);
      return { status: "deleted" };
    }

    // If admin left, make the first remaining member an admin
    const wasAdmin = group.members.find(m => m.userId === currentUser._id)?.role === "admin";
    if (wasAdmin && newMembers.length > 0) {
      if (!newMembers.some(m => m.role === "admin")) {
        newMembers[0].role = "admin";
      }
    }

    await ctx.db.patch(args.groupId, { members: newMembers });
    return { status: "left" };
  },
});

/* ──────────────────────────────────────────────────────────────────────────
   4. deleteGroup – completely delete group (admin only)
   ──────────────────────────────────────────────────────────────────────── */
export const deleteGroup = mutation({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const currentUser = await ctx.runQuery(internal.users.getCurrentUser);
    const group = await ctx.db.get(args.groupId);
    
    if (!group) throw new Error("Group not found");

    const memberInfo = group.members.find((m) => m.userId === currentUser._id);
    if (!memberInfo || memberInfo.role !== "admin") {
      throw new Error("Only the group admin can delete the group.");
    }

    // Delete related expenses
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();
    for (const exp of expenses) {
      await ctx.db.delete(exp._id);
    }

    // Delete related settlements
    const settlements = await ctx.db
      .query("settlements")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();
    for (const st of settlements) {
      await ctx.db.delete(st._id);
    }

    // Finally, delete the group
    await ctx.db.delete(args.groupId);
    return { status: "deleted" };
  },
});