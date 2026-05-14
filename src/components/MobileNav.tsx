import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, MessageCircle, Camera, FileText, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileNav() {
  const location = useLocation();
  const pathname = location.pathname;

  const navItems = [
    {
      label: "Home",
      icon: Home,
      path: "/",
      active: pathname === "/",
    },
    {
      label: "Chats",
      icon: MessageCircle,
      path: "/chats",
      active: pathname === "/chats" || pathname.startsWith("/chat/"),
    },
    {
      label: "Sell",
      icon: Camera,
      path: "/create",
      isSpecial: true,
    },
    {
      label: "My Ads",
      icon: FileText,
      path: "/profile?tab=ads",
      active:
        pathname === "/profile" &&
        new URLSearchParams(location.search).get("tab") === "ads",
    },
    {
      label: "Account",
      icon: User,
      path: "/profile",
      active:
        pathname === "/profile" &&
        !new URLSearchParams(location.search).get("tab"),
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 z-[70] pb-safe transition-colors duration-300">
      <div className="flex items-center justify-around h-16 relative">
        {navItems.map((item) => {
          if (item.isSpecial) {
            return (
              <Link
                key={item.label}
                to={item.path}
                className="relative -top-6 flex flex-col items-center group"
              >
                <div className="relative w-16 h-16 rounded-full p-1 bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-300 group-active:scale-95">
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 p-1 animate-gradient-xy">
                    <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
                      <item.icon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-black text-slate-900 dark:text-white mt-1 uppercase tracking-tighter">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.label}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 flex-1 transition-all duration-200",
                item.active
                  ? "text-blue-600 dark:text-blue-400 scale-110"
                  : "text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400",
              )}
            >
              <item.icon
                className={cn("w-6 h-6", item.active && "fill-current")}
              />
              <span
                className={cn(
                  "text-[10px] font-bold tracking-tight",
                  item.active ? "opacity-100" : "opacity-70",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
