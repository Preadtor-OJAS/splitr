"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useConvexQuery } from "@/hooks/use-convex-query";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

const SUGGESTED_PROMPTS = [
  "How much have I spent this month?",
  "Give me tips to split restaurant bills fairly",
  "How do I settle debts efficiently in a group?",
  "What's the best way to track shared expenses?",
  "Help me create a budget plan for group trips",
];

function MessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3 items-start", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-green-600" : "bg-gradient-to-br from-blue-500 to-purple-600"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-white" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
          isUser
            ? "bg-green-600 text-white rounded-tr-sm"
            : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm"
        )}
      >
        {message.content.split("\n").map((line, i) => (
          <p key={i} className={line === "" ? "h-2" : ""}>
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function AiAssistantPage() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hey! I'm Splitr AI 👋\n\nI'm your personal finance assistant. I can help you:\n• Understand your spending patterns\n• Give budgeting tips and savings advice\n• Help you split expenses fairly\n• Suggest efficient ways to settle debts\n\nWhat would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const { data: balances } = useConvexQuery(api.dashboard.getUserBalances);
  const { data: totalSpent } = useConvexQuery(api.dashboard.getTotalSpent);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const content = text || input.trim();
    if (!content || loading) return;

    const newMessages = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const userContext = {
        totalBalance: balances?.totalBalance,
        youAreOwed: balances?.youAreOwed,
        youOwe: balances?.youOwe,
        totalSpentAllTime: totalSpent,
      };

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          userContext: balances ? userContext : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to get response");

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, I ran into an error: ${err.message}\n\nMake sure your GROQ_API_KEY is set in .env.local`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const reset = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "Hey! I'm Splitr AI 👋\n\nI'm your personal finance assistant. What would you like to know?",
      },
    ]);
  };

  return (
    <div className="container max-w-3xl mx-auto py-6 flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-5xl gradient-title flex items-center gap-3">
            <Sparkles className="h-9 w-9 text-purple-500" />
            AI Assistant
          </h1>
          <p className="text-muted-foreground mt-1">
            Powered by Groq &amp; Llama 3.3 — your personal finance advisor
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={reset}
          className="gap-2"
          id="reset-chat-btn"
        >
          <RotateCcw className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Balance context pill */}
      {balances && (
        <div className="flex gap-3 mb-4 flex-shrink-0 flex-wrap">
          <div className="text-xs bg-green-50 border border-green-200 text-green-700 rounded-full px-3 py-1 flex items-center gap-1.5">
            <span className="font-medium">Balance:</span>
            <span>₹{Math.abs(balances.totalBalance || 0).toFixed(2)}</span>
          </div>
          <div className="text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-3 py-1 flex items-center gap-1.5">
            <span className="font-medium">Owed to you:</span>
            <span>₹{(balances.youAreOwed || 0).toFixed(2)}</span>
          </div>
          <div className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-3 py-1 flex items-center gap-1.5">
            <span className="font-medium">You owe:</span>
            <span>₹{(balances.youOwe || 0).toFixed(2)}</span>
          </div>
          <div className="text-xs text-muted-foreground rounded-full px-3 py-1 bg-gray-100 border border-gray-200 flex items-center gap-1">
            <Bot className="h-3 w-3" />
            AI has your balance context
          </div>
        </div>
      )}

      {/* Message area */}
      <Card className="flex-1 overflow-y-auto p-6 space-y-5 bg-gray-50/50 min-h-0 border-gray-200">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {loading && (
          <div className="flex gap-3 items-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </Card>

      {/* Suggested prompts */}
      {messages.length <= 1 && (
        <div className="flex gap-2 mt-3 flex-wrap flex-shrink-0">
          {SUGGESTED_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => sendMessage(prompt)}
              className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1.5 hover:border-green-400 hover:text-green-700 hover:bg-green-50 transition-all text-gray-600"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex gap-2 mt-3 flex-shrink-0">
        <Input
          id="ai-chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your expenses or finances..."
          disabled={loading}
          className="flex-1 rounded-xl h-12 border-gray-300 focus:border-green-500 focus:ring-green-500"
        />
        <Button
          id="ai-chat-send-btn"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="h-12 px-5 rounded-xl bg-green-600 hover:bg-green-700"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
