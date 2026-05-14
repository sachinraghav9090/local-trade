import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";

interface AdMobBannerProps {
  className?: string;
  variant?: "horizontal" | "square" | "inline";
  label?: string;
  placement?: "home" | "grid" | "details" | "chat" | "profile";
}

export default function AdMobBanner({
  className,
  variant = "horizontal",
  label,
  placement,
}: AdMobBannerProps) {
  const [adSettings, setAdSettings] = useState<any>(null);
  const [visible, setVisible] = useState(true);
  const [displayLabel, setDisplayLabel] = useState(label || "Google AdMob Ad");

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "ads"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setAdSettings(data);

        if (placement) {
          const isEnabled = data[`${placement}AdEnabled`] ?? true;
          const customLabel = data[`${placement}AdLabel`];

          setVisible(isEnabled);
          if (customLabel) setDisplayLabel(customLabel);
        }
      }
    });

    return () => unsub();
  }, [placement]);

  if (!visible) return null;

  const styles = {
    horizontal: "w-full h-16 md:h-24",
    square: "w-full aspect-square max-w-[300px] mx-auto",
    inline: "h-full min-h-[200px]",
  };

  return (
    <div
      className={cn(
        "bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 font-black tracking-widest text-[10px] uppercase my-4 transition-all hover:bg-slate-100 dark:hover:bg-slate-900",
        styles[variant],
        className,
      )}
    >
      <div className="flex flex-col items-center gap-2 opacity-60">
        <div className="p-2 rounded-full bg-slate-200 dark:bg-slate-800">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <span>{displayLabel}</span>
      </div>
    </div>
  );
}
