import { cn } from "@/lib/cn";

type GlassCardProps = {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
};

export function GlassCard({ children, className, hover = false }: GlassCardProps) {
  return (
    <div
      className={cn(
        "glass rounded-xl p-5",
        hover && "transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-lg",
        className
      )}
    >
      {children}
    </div>
  );
}
