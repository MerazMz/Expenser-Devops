"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Calendar",
    href: "/calendar",
    icon: Calendar,
  },
  {
    label: "Insights",
    href: "/insights",
    icon: BarChart3,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  // Don't show nav on onboarding or login
  if (pathname === "/onboarding" || pathname === "/login" || pathname === "/") return null;

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-6">
      <nav className="flex h-16 w-full max-w-md items-center justify-around rounded-[2rem] border border-border bg-background/80 backdrop-blur-xl px-4 shadow-2xl shadow-black/10">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center space-y-1 transition-all duration-200",
              isActive ? "text-primary" : "text-muted-foreground opacity-60"
            )}
          >
            <item.icon className={cn("h-5 w-5", isActive && "fill-primary/10")} />
            <span className="text-[9px] font-medium uppercase tracking-wider">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
    </div>
  );
}
