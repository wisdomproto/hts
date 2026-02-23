"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  PieChart,
  TrendingUp,
  Newspaper,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/cn";

const navItems = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/portfolio", label: "포트폴리오", icon: PieChart },
  { href: "/backtest", label: "백테스트", icon: FlaskConical },
  { href: "/portfolio-settings", label: "포트폴리오 설정", icon: Settings },
  { href: "/economy", label: "경제 데이터", icon: TrendingUp },
  { href: "/news", label: "뉴스 & 분석", icon: Newspaper },
  { href: "/study", label: "공부하기", icon: BookOpen },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="hidden md:flex flex-col border-r border-border-subtle bg-bg-surface h-full"
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b border-border-subtle">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">H</span>
          </div>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-semibold text-text-primary whitespace-nowrap"
            >
              HTS Portfolio
            </motion.span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150",
                "hover:bg-bg-overlay",
                isActive
                  ? "bg-accent/10 text-accent border-l-3 border-accent"
                  : "text-text-secondary"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="py-3 px-2 border-t border-border-subtle space-y-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-text-muted hover:bg-bg-overlay hover:text-text-secondary transition-colors duration-150"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">접기</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
