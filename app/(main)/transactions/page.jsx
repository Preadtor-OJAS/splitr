"use client";

import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useConvexQuery } from "@/hooks/use-convex-query";
import { BarLoader } from "react-spinners";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  ArrowDownLeft,
  History,
  Users,
  Filter,
} from "lucide-react";
import { format } from "date-fns";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Sent", value: "sent" },
  { label: "Received", value: "received" },
];

export default function TransactionsPage() {
  const [filter, setFilter] = useState("all");

  const { data: transactions, isLoading } = useConvexQuery(
    api.notifications.getTransactionHistory
  );

  const filtered = (transactions ?? []).filter((t) => {
    if (filter === "sent") return t.isSent;
    if (filter === "received") return !t.isSent;
    return true;
  });

  const totalSent = (transactions ?? [])
    .filter((t) => t.isSent)
    .reduce((s, t) => s + t.amount, 0);

  const totalReceived = (transactions ?? [])
    .filter((t) => !t.isSent)
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="container mx-auto py-6 max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2.5 rounded-xl">
          <History className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-4xl gradient-title">Transaction History</h1>
          <p className="text-muted-foreground text-sm">
            All your settlements in one place
          </p>
        </div>
      </div>

      {/* Summary cards */}
      {!isLoading && transactions?.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-1">
                <ArrowDownLeft className="h-4 w-4 text-green-600" />
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Total Received
                </span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                ₹{totalReceived.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-1">
                <ArrowUpRight className="h-4 w-4 text-red-500" />
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Total Sent
                </span>
              </div>
              <p className="text-2xl font-bold text-red-500">
                ₹{totalSent.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <BarLoader width="100%" color="#36d7b7" />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No transactions yet</p>
            <p className="text-sm mt-1">
              Settlements will appear here once recorded.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const other = t.isSent ? t.receiver : t.payer;
            return (
              <Card
                key={t._id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    {/* Direction indicator */}
                    <div
                      className={`shrink-0 p-2.5 rounded-full ${
                        t.isSent ? "bg-red-100" : "bg-green-100"
                      }`}
                    >
                      {t.isSent ? (
                        <ArrowUpRight className="h-5 w-5 text-red-500" />
                      ) : (
                        <ArrowDownLeft className="h-5 w-5 text-green-600" />
                      )}
                    </div>

                    {/* Avatar */}
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={other?.imageUrl} />
                      <AvatarFallback className="text-sm">
                        {other?.name?.charAt(0) ?? "?"}
                      </AvatarFallback>
                    </Avatar>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-tight">
                        {t.isSent
                          ? `You paid ${other?.name ?? "someone"}`
                          : `${other?.name ?? "Someone"} paid you`}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(t.date), "MMM d, yyyy · h:mm a")}
                        </span>
                        {t.note && (
                          <>
                            <span className="text-muted-foreground text-xs">·</span>
                            <span className="text-xs text-muted-foreground italic truncate">
                              {t.note}
                            </span>
                          </>
                        )}
                        {t.groupName && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-1">
                            <Users className="h-2.5 w-2.5" />
                            {t.groupName}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="shrink-0 text-right">
                      <p
                        className={`text-lg font-bold ${
                          t.isSent ? "text-red-500" : "text-green-600"
                        }`}
                      >
                        {t.isSent ? "-" : "+"}₹{t.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
