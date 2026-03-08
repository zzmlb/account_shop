/**
 * Reusable CSV export utility for admin data tables.
 */

interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => string | number;
}

export function exportToCsv<T>(
  filename: string,
  columns: CsvColumn<T>[],
  data: T[]
) {
  // BOM for Excel UTF-8 compatibility
  const BOM = "\uFEFF";

  const headerRow = columns.map((c) => escapeCsvField(c.header)).join(",");
  const dataRows = data.map((row) =>
    columns.map((c) => escapeCsvField(String(c.accessor(row)))).join(",")
  );

  const csv = BOM + [headerRow, ...dataRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

export function escapeCsvField(value: string): string {
  // Prevent CSV injection: prefix formula-triggering characters with a single-quote
  // Excel/Sheets interpret cells starting with =, +, -, @, \t, \r as formulas
  if (/^[=+\-@\t\r]/.test(value)) {
    value = `'${value}`;
  }

  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("'")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
