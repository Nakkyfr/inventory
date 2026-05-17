export function exportRowsToCsv(filename, columns, rows) {
  const escapeCell = (value) => {
    const stringValue = String(value ?? "");
    return `"${stringValue.replaceAll(`"`, `""`)}"`;
  };

  const header = columns.map((column) => escapeCell(column.label)).join(",");
  const body = rows
    .map((row) =>
      columns.map((column) => escapeCell(row[column.key])).join(",")
    )
    .join("\n");

  const csv = [header, body].filter(Boolean).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
