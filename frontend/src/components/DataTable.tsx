"use client";

import { useMemo } from "react";

interface DataTableProps {
  data: Record<string, string>[];
  maxHeight?: string;
}

export default function DataTable({ data, maxHeight = "500px" }: DataTableProps) {
  const columns = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        <p>No data to display</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-card-border overflow-hidden"
      style={{ maxHeight }}
    >
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-table-header">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left font-semibold text-foreground/80 whitespace-nowrap border-b border-table-border"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={i}
                className="border-b border-table-border last:border-0 hover:bg-table-hover transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-4 py-3 text-foreground/70 whitespace-nowrap max-w-[250px] truncate"
                    title={row[col] || ""}
                  >
                    {row[col] || (
                      <span className="text-muted-light italic">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
