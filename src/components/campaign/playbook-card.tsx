import { Check, Eye, X } from "lucide-react";
import type { StagePlaybook } from "@/types/campaign";

export function PlaybookCard({ playbook }: { playbook: StagePlaybook }) {
  const sections = [
    { title: "지금 할 것", items: playbook.do, icon: Check, color: "var(--color-positive)" },
    { title: "지켜볼 것", items: playbook.watch, icon: Eye, color: "var(--color-warning)" },
    { title: "피할 것", items: playbook.avoid, icon: X, color: "var(--color-negative)" },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {sections.map((sec) => (
        <div key={sec.title}>
          <div className="flex items-center gap-1.5 mb-2">
            <sec.icon className="w-3.5 h-3.5" style={{ color: sec.color }} />
            <span className="text-xs font-semibold text-text-secondary">{sec.title}</span>
          </div>
          <ul className="space-y-1.5">
            {sec.items.map((it, i) => (
              <li key={i} className="text-xs text-text-secondary leading-relaxed flex gap-1.5">
                <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: sec.color }} />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
