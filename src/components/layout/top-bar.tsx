"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, RefreshCw } from "lucide-react";
import { RegimePill } from "@/components/regime/regime-pill";
import { useEffect, useState } from "react";

export function TopBar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="flex items-center justify-between h-14 px-6 border-b border-border-subtle bg-bg-surface/80 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {/* Mobile menu button placeholder */}
        <h2 className="text-sm font-medium text-text-secondary md:hidden">
          HTS
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <RegimePill />

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-lg hover:bg-bg-overlay text-text-secondary transition-colors"
          aria-label="Toggle theme"
        >
          {!mounted ? (
            <span className="w-4 h-4 inline-block" />
          ) : theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        <button
          className="p-2 rounded-lg hover:bg-bg-overlay text-text-secondary transition-colors"
          aria-label="Refresh data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
