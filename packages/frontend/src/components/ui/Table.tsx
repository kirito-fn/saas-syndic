import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  className?: string;
}

interface SmartTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
}

export function SmartTable<T>({ columns, data, keyExtractor }: SmartTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
        </svg>
        <p className="mt-3 text-sm text-gray-400 font-medium">Aucune donnée</p>
      </div>
    );
  }

  const labeledColumns = columns.filter((c) => c.header !== "");
  const actionColumns = columns.filter((c) => c.header === "");

  return (
    <>
      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${col.className || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr
                key={keyExtractor(item)}
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors duration-100"
                style={{ animation: `fade-in 0.2s ease-out ${idx * 0.03}s both` }}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-6 py-4 text-sm ${col.className || ""}`}>
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="lg:hidden divide-y divide-gray-100">
        {data.map((item, idx) => (
          <div
            key={keyExtractor(item)}
            className="p-4 space-y-3"
            style={{ animation: `fade-in 0.2s ease-out ${idx * 0.03}s both` }}
          >
            {labeledColumns.map((col) => (
              <div key={col.key} className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider shrink-0 min-w-[80px]">
                  {col.header}
                </span>
                <span className="text-sm text-right">
                  {col.render(item)}
                </span>
              </div>
            ))}
            {actionColumns.length > 0 && (
              <div className="flex justify-end gap-1.5 pt-2 border-t border-gray-100">
                {actionColumns.map((col) => (
                  <span key={col.key}>
                    {col.render(item)}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-100">
      <p className="text-sm text-gray-400">
        Page {page} sur {totalPages}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100 transition-colors"
        >
          ← Précédent
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
          if (p > totalPages) return null;
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-[40px] h-10 sm:w-8 sm:h-8 text-sm font-medium rounded-lg transition-colors ${
                p === page
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              }`}
            >
              {p}
            </button>
          );
        })}
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100 transition-colors"
        >
          Suivant →
        </button>
      </div>
    </div>
  );
}

interface FilterBarProps {
  children: ReactNode;
}

export function FilterBar({ children }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-6 py-3.5 border-b border-gray-100 bg-gray-50/30">
      {children}
    </div>
  );
}
