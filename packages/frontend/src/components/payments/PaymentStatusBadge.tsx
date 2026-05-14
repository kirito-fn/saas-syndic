import { STATUS_LABELS, STATUS_COLORS, type PaymentStatus } from "@syndic/shared";

const colorMap: Record<string, string> = {
  red: "bg-red-100 text-red-700",
  orange: "bg-orange-100 text-orange-700",
  green: "bg-green-100 text-green-700",
};

export default function PaymentStatusBadge({ status }: { status: string }) {
  const s = status as PaymentStatus;
  const color = STATUS_COLORS[s] || "gray";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colorMap[color] || "bg-gray-100 text-gray-700"}`}>
      {STATUS_LABELS[s] || status}
    </span>
  );
}
