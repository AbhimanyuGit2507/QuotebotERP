import React, { useMemo, useState } from 'react';
import { apiRequest } from '../services/api';
import { importFromCSV } from '../utils/exportUtils';
import { useApp } from '../context/AppContext';

const ENTITY_OPTIONS = [
  { id: 'clients', label: 'Clients' },
  { id: 'products', label: 'Products' },
] as const;

type ImportEntity = (typeof ENTITY_OPTIONS)[number]['id'];

type ImportError = {
  rowIndex: number;
  messages: string[];
};

type PreviewResponse = {
  entity: ImportEntity;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ImportError[];
  normalizedRows: Array<Record<string, unknown>>;
};

type CommitResponse = {
  entity: ImportEntity;
  totalRows: number;
  created: number;
  updated: number;
  errors: ImportError[];
};

export const DataImport: React.FC = () => {
  const { showToast, refreshData } = useApp();
  const [selectedEntity, setSelectedEntity] = useState<ImportEntity>('clients');
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState('');

  const errorPreview = useMemo(() => {
    if (!preview?.errors?.length) {
      return [];
    }
    return preview.errors.slice(0, 5);
  }, [preview]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setFileName(file.name);
    setPreview(null);

    if (!file.name.toLowerCase().endsWith('.csv')) {
      showToast('Please upload a CSV file. Export Excel as CSV first.', 'warning');
      return;
    }

    try {
      setIsPreviewing(true);
      const rows = await importFromCSV(file);
      const response = await apiRequest<PreviewResponse>('/imports/preview', {
        method: 'POST',
        body: JSON.stringify({ entity: selectedEntity, rows }),
      });
      setPreview(response);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to parse CSV', 'error');
    } finally {
      setIsPreviewing(false);
      event.target.value = '';
    }
  };

  const handleImport = async () => {
    if (!preview) {
      return;
    }

    const validRows = preview.normalizedRows.filter((_, index) =>
      preview.errors.every((error) => error.rowIndex !== index + 1),
    );

    if (validRows.length === 0) {
      showToast('No valid rows to import', 'warning');
      return;
    }

    try {
      setIsImporting(true);
      const response = await apiRequest<CommitResponse>('/imports/commit', {
        method: 'POST',
        body: JSON.stringify({ entity: preview.entity, rows: validRows }),
      });

      showToast(
        `Imported ${response.created + response.updated} ${preview.entity} rows`,
        'success',
      );
      refreshData();
      setPreview(null);
      setFileName('');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Import failed', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4 border border-[var(--erp-border)] rounded-xl p-4 bg-white">
      <div>
        <h3 className="text-sm font-semibold text-[var(--erp-text)]">Data Import</h3>
        <p className="text-xs text-[var(--erp-text-muted)]">
          Import clients or products from CSV. Export Excel as CSV before uploading.
        </p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <select
          className="w-full md:w-48 text-sm border border-[var(--erp-border)] rounded py-2 px-3 bg-white"
          value={selectedEntity}
          onChange={(event) => setSelectedEntity(event.target.value as ImportEntity)}
        >
          {ENTITY_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>

        <label className="inline-flex items-center gap-2 text-sm text-[var(--erp-text)]">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <span className="btn btn-secondary btn-sm">Upload CSV</span>
          <span className="text-xs text-[var(--erp-text-muted)]">
            {fileName ? fileName : 'No file chosen'}
          </span>
        </label>
      </div>

      {isPreviewing && (
        <div className="text-xs text-[var(--erp-text-muted)]">Parsing and validating...</div>
      )}

      {preview && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="px-2 py-1 rounded bg-slate-100 text-slate-700">
              Total: {preview.totalRows}
            </span>
            <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700">
              Valid: {preview.validRows}
            </span>
            <span className="px-2 py-1 rounded bg-rose-50 text-rose-700">
              Invalid: {preview.invalidRows}
            </span>
          </div>

          {errorPreview.length > 0 && (
            <div className="rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <p className="font-semibold">Validation issues</p>
              <ul className="mt-2 list-disc pl-4 space-y-1">
                {errorPreview.map((error) => (
                  <li key={error.rowIndex}>
                    Row {error.rowIndex}: {error.messages.join(', ')}
                  </li>
                ))}
              </ul>
              {preview.errors.length > errorPreview.length && (
                <p className="mt-2 text-[11px]">
                  {preview.errors.length - errorPreview.length} more row errors not shown.
                </p>
              )}
            </div>
          )}

          <button
            onClick={handleImport}
            className="btn btn-primary btn-sm"
            disabled={isImporting}
          >
            {isImporting ? 'Importing...' : 'Import Valid Rows'}
          </button>
        </div>
      )}
    </div>
  );
};
