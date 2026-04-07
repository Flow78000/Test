import { ReactNode } from "react";
import clsx from "clsx";

export function Card({
  children,
  className,
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={clsx(
        "bg-[#111114] border border-[#1E1E22] rounded-xl",
        hover && "hover:border-[#FF6B00] hover:bg-[#16161A] transition-all cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  sublabel,
  color = "#FF6B00",
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  color?: string;
}) {
  return (
    <Card className="p-4 text-center">
      <div className="text-[10px] text-[#6B6B75] uppercase tracking-widest mb-1">
        {label}
      </div>
      <div
        className="text-2xl font-extrabold font-mono"
        style={{ color }}
      >
        {value}
      </div>
      {sublabel && (
        <div className="text-[10px] text-[#6B6B75] mt-1">{sublabel}</div>
      )}
    </Card>
  );
}

export function Badge({
  children,
  color = "#FF6B00",
  className,
}: {
  children: ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wide",
        className
      )}
      style={{
        background: `${color}22`,
        color: color,
        border: `1px solid ${color}44`,
      }}
    >
      {children}
    </span>
  );
}

export function LiveBadge() {
  return (
    <span className="flex items-center gap-1.5 text-[10px] text-[#FF6B00] font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00] animate-pulse" />
      LIVE
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 mb-6 flex-wrap">
      <div>
        <h1 className="text-xl font-extrabold">{title}</h1>
        {subtitle && (
          <p className="text-xs text-[#6B6B75] mt-1">{subtitle}</p>
        )}
      </div>
      <div className="ml-auto flex items-center gap-3">{children}</div>
    </div>
  );
}
