function flattenRecord(
  value: unknown,
  prefix = '',
): Record<string, string | number | boolean | null> {
  if (value === null || value === undefined) {
    return prefix ? { [prefix]: '' } : {};
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return prefix ? { [prefix]: value } : {};
  }

  if (Array.isArray(value)) {
    const joined = value
      .map((item) => {
        if (
          typeof item === 'string' ||
          typeof item === 'number' ||
          typeof item === 'boolean'
        ) {
          return String(item);
        }

        return JSON.stringify(item);
      })
      .join('; ');

    return prefix ? { [prefix]: joined } : {};
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce<
      Record<string, string | number | boolean | null>
    >((acc, [key, nestedValue]) => {
      const nestedPrefix = prefix ? `${prefix}.${key}` : key;
      return {
        ...acc,
        ...flattenRecord(nestedValue, nestedPrefix),
      };
    }, {});
  }

  return prefix ? { [prefix]: JSON.stringify(value) } : {};
}

function escapeCsvValue(value: string | number | boolean | null | undefined) {
  const stringValue =
    value === null || value === undefined ? '' : String(value);
  const escaped = stringValue.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

export function recordsToCsv(records: Record<string, unknown>[]) {
  if (records.length === 0) {
    return 'No data available\n';
  }

  const flattened = records.map((record) => flattenRecord(record));
  const headers = Array.from(
    new Set(flattened.flatMap((record) => Object.keys(record))),
  );

  const headerRow = headers.join(',');
  const dataRows = flattened.map((record) =>
    headers.map((header) => escapeCsvValue(record[header])).join(','),
  );

  return [headerRow, ...dataRows].join('\n');
}
