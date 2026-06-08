"use client";

import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useConvexMutation, useConvexQuery } from "@/hooks/use-convex-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, UserCheck, UserX, Search, Ban } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function FriendManager() {
  const [searchEmail, setSearchEmail] = useState("");
  const [activeTab, setActiveTab] = useState("add");

  const { data: searchResult, isLoading: isSearching } = useConvexQuery(
    api.friends.searchUsersForFriends,
    searchEmail.length >= 2 ? { query: searchEmail } : "skip"
  );

  const { data: pendingRequests } = useConvexQuery(api.friends.getPendingRequests);
  const { data: blockedUsers } = useConvexQuery(api.friends.getBlockedUsers);

  const sendRequest = useConvexMutation(api.friends.sendRequest);
  const acceptRequest = useConvexMutation(api.friends.acceptRequest);
  const declineRequest = useConvexMutation(api.friends.declineRequest);
  const blockUser = useConvexMutation(api.friends.blockUser);
  const unblockUser = useConvexMutation(api.friends.unblockUser);

  const handleSendRequest = async (userId) => {
    try {
      await sendRequest.mutate({ targetUserId: userId });
      toast.success("Friend request sent!");
      setSearchEmail("");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleAccept = async (friendshipId) => {
    try {
      await acceptRequest.mutate({ friendshipId });
      toast.success("Friend request accepted!");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleDecline = async (friendshipId) => {
    try {
      await declineRequest.mutate({ friendshipId });
      toast.success("Request declined");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleBlock = async (userId) => {
    try {
      await blockUser.mutate({ targetUserId: userId });
      toast.success("User blocked");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleUnblock = async (userId) => {
    try {
      await unblockUser.mutate({ targetUserId: userId });
      toast.success("User unblocked");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const incomingCount = pendingRequests?.incoming?.length || 0;
  const blockedCount = blockedUsers?.length || 0;

  return (
    <Card className="mb-8">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Manage Friends</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="add">Add Friend</TabsTrigger>
            <TabsTrigger value="requests">
              Requests {incomingCount > 0 && `(${incomingCount})`}
            </TabsTrigger>
            <TabsTrigger value="blocked">
              Blocked {blockedCount > 0 && `(${blockedCount})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                className="pl-8"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
              />
            </div>

            {searchEmail.length > 0 && searchEmail.length < 2 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Type at least 2 characters to search…
              </p>
            )}

            {searchEmail.length >= 2 && (
              <div className="space-y-2">
                {isSearching ? (
                  <p className="text-sm text-muted-foreground text-center py-3">Searching…</p>
                ) : searchResult?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    No users found for &ldquo;{searchEmail}&rdquo;
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {searchResult.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between bg-muted/40 hover:bg-muted/70 transition-colors p-3 rounded-lg"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage src={user.imageUrl} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>

                        <div className="shrink-0 ml-2">
                          {user.isBlocked ? (
                            <span className="text-xs text-red-500 font-medium">Blocked</span>
                          ) : user.status === "accepted" ? (
                            <Button variant="secondary" size="sm" disabled>
                              <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Friends
                            </Button>
                          ) : user.status === "pending" ? (
                            <Button variant="secondary" size="sm" disabled>
                              Pending
                            </Button>
                          ) : (
                            <Button size="sm" onClick={() => handleSendRequest(user.id)}>
                              <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>


          <TabsContent value="requests" className="space-y-4">
            {pendingRequests?.incoming?.length === 0 && pendingRequests?.outgoing?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No pending requests.</p>
            ) : (
              <div className="space-y-4">
                {pendingRequests?.incoming?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Incoming Requests</h3>
                    <div className="space-y-2">
                      {pendingRequests.incoming.map((req) => (
                        <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-muted/30 p-3 rounded-md gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={req.imageUrl} />
                              <AvatarFallback>{req.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{req.name}</p>
                              <p className="text-sm text-muted-foreground">{req.email}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleAccept(req.friendshipId)}>Accept</Button>
                            <Button variant="outline" size="sm" onClick={() => handleDecline(req.friendshipId)}>Decline</Button>
                            <Button variant="destructive" size="sm" onClick={() => handleBlock(req.id)}>Block</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {pendingRequests?.outgoing?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Outgoing Requests</h3>
                    <div className="space-y-2">
                      {pendingRequests.outgoing.map((req) => (
                        <div key={req.id} className="flex items-center justify-between bg-muted/30 p-3 rounded-md">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 opacity-70">
                              <AvatarImage src={req.imageUrl} />
                              <AvatarFallback>{req.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{req.name}</p>
                            </div>
                          </div>
                          <Badge variant="secondary">Pending</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="blocked" className="space-y-4">
            {blockedUsers?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No blocked users.</p>
            ) : (
              <div className="space-y-2">
                {blockedUsers?.map((user) => (
                  <div key={user.id} className="flex items-center justify-between bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-3 rounded-md">
                    <div className="flex items-center gap-3">
                      <div className="bg-red-100 dark:bg-red-900 p-2 rounded-full">
                        <Ban className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <p className="font-medium text-red-900 dark:text-red-200">{user.name}</p>
                        <p className="text-sm text-red-700/70 dark:text-red-300/70">{user.email}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleUnblock(user.id)}>
                      Unblock
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
