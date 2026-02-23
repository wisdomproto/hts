"use client";

import { motion } from "framer-motion";
import type { Regime } from "@/types/regime";

type GradientOrbProps = {
  regime: Regime;
  size?: number;
};

export function GradientOrb({ regime, size = 120 }: GradientOrbProps) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full opacity-40 blur-2xl"
        style={{
          background: `radial-gradient(circle, ${regime.gradientFrom}, ${regime.gradientTo})`,
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Core orb */}
      <motion.div
        className="absolute inset-4 rounded-full"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${regime.gradientTo}, ${regime.gradientFrom})`,
        }}
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Inner highlight */}
      <div
        className="absolute rounded-full opacity-30"
        style={{
          top: "20%",
          left: "25%",
          width: "35%",
          height: "30%",
          background: `radial-gradient(ellipse, white, transparent)`,
        }}
      />
    </div>
  );
}
