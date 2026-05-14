interface BadgeProps {
  variant: "red" | "orange" | "green" | "blue" | "gray";
  children: string;
}

const VARIANTS: Record<string, string> = {
  red: "bg-red-50 text-red-700 border-red-200",
  orange: "bg-amber-50 text-amber-700 border-amber-200",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  gray: "bg-gray-50 text-gray-600 border-gray-200",
};

const DOTS: Record<string, string> = {
  red: "bg-red-500",
  orange: "bg-amber-500",
  green: "bg-emerald-500",
  blue: "bg-blue-500",
  gray: "bg-gray-400",
};

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${VARIANTS[variant]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${DOTS[variant]}`} />
      {children}
    </span>
  );
}
