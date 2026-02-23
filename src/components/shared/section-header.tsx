import Link from "next/link";

type SectionHeaderProps = {
  title: string;
  description?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
};

export function SectionHeader({
  title,
  description,
  viewAllHref,
  viewAllLabel = "전체 보기",
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        {description && (
          <p className="text-sm text-text-muted mt-0.5">{description}</p>
        )}
      </div>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="text-sm text-accent hover:text-accent-hover transition-colors"
        >
          {viewAllLabel} &rarr;
        </Link>
      )}
    </div>
  );
}
