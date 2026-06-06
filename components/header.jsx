"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import { LayoutDashboard, Sparkles, Smartphone } from "lucide-react";
import Link from "next/link";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { useStoreUser } from "@/hooks/use-store-user";
import { BarLoader } from "react-spinners";
import { Authenticated, Unauthenticated } from "convex/react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { UpiSettingsModal } from "@/components/upi-settings-modal";
import { NotificationBell } from "@/components/notification-bell";
import { ChatInboxButton } from "@/components/chat-inbox-button";

export default function Header() {
  const { isLoading } = useStoreUser();
  const path = usePathname();
  const [upiModalOpen, setUpiModalOpen] = useState(false);

  return (
    <>
    <header className="fixed top-0 w-full border-b bg-white/95 backdrop-blur z-50 supports-[backdrop-filter]:bg-white/60">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src={"/logos/logo.png"}
            alt="Vehiql Logo"
            width={200}
            height={60}
            className="h-11 w-auto object-contain"
          />
        </Link>

        {path === "/" && (
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="#features"
              className="text-sm font-medium hover:text-green-600 transition"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-medium hover:text-green-600 transition"
            >
              How It Works
            </Link>
          </div>
        )}

        <div className="flex items-center gap-4">
          <Authenticated>
            <Link href="/dashboard">
              <Button
                variant="outline"
                className="hidden md:inline-flex items-center gap-2 hover:text-green-600 hover:border-green-600 transition"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
              <Button variant="ghost" className="md:hidden w-10 h-10 p-0">
                <LayoutDashboard className="h-4 w-4" />
              </Button>
            </Link>

            <Link href="/ai-assistant">
              <Button
                variant="outline"
                className="hidden md:inline-flex items-center gap-2 hover:text-purple-600 hover:border-purple-500 transition border-purple-300 text-purple-600"
                id="ai-assistant-nav-btn"
              >
                <Sparkles className="h-4 w-4" />
                AI Assistant
              </Button>
              <Button variant="ghost" className="md:hidden w-10 h-10 p-0 text-purple-600">
                <Sparkles className="h-4 w-4" />
              </Button>
            </Link>

            <div className="flex items-center gap-1">
              <ChatInboxButton />
              <NotificationBell />
            </div>

            <Button
              variant="outline"
              size="sm"
              className="hidden md:inline-flex items-center gap-1.5 text-green-700 border-green-400 hover:bg-green-50 hover:text-green-800 transition"
              onClick={() => setUpiModalOpen(true)}
              id="upi-settings-btn"
            >
              <Smartphone className="h-4 w-4" />
              UPI
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden w-10 h-10 p-0 text-green-600"
              onClick={() => setUpiModalOpen(true)}
            >
              <Smartphone className="h-4 w-4" />
            </Button>

            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10",
                  userButtonPopoverCard: "shadow-xl",
                  userPreviewMainIdentifier: "font-semibold",
                },
              }}
              afterSignOutUrl="/"
            />
            <UpiSettingsModal open={upiModalOpen} onClose={() => setUpiModalOpen(false)} />
          </Authenticated>

          <Unauthenticated>
            <SignInButton>
              <Button variant="ghost">Sign In</Button>
            </SignInButton>

            <SignUpButton>
              <Button className="bg-green-600 hover:bg-green-700 border-none">
                Get Started
              </Button>
            </SignUpButton>
          </Unauthenticated>
        </div>
      </nav>
      {isLoading && <BarLoader width={"100%"} color="#36d7b7" />}
    </header>
    </>
  );
}
