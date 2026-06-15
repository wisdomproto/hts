"use client";

import { motion } from "framer-motion";

type StageOrbProps = {
  gradientFrom: string;
  gradientTo: string;
  size?: number;
};

export function StageOrb({ gradientFrom, gradientTo, size = 120 }: StageOrbProps) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <motion.div
        className="absolute inset-0 rounded-full opacity-40 blur-2xl"
        style={{ background: `radial-gradient(circle, ${gradientFrom}, ${gradientTo})` }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.55, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-4 rounded-full"
        style={{ background: `radial-gradient(circle at 35% 35%, ${gradientTo}, ${gradientFrom})` }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="absolute rounded-full opacity-30"
        style={{
          top: "20%",
          left: "25%",
          width: "35%",
          height: "30%",
          background: "radial-gradient(ellipse, white, transparent)",
        }}
      />
    </div>
  );
}
