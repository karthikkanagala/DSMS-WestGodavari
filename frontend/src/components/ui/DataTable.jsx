import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

export default function DataTable({
  columns,
  data,
  total,
  page = 1,
  pages = 1,
  onPageChange,
  loading = false,
  searchPlaceholder = 'Search...',
  onSearch,
  filters,
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  return (
    <div className="card space-y-4">
      {/* Header controls: Search & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder={searchPlaceholder}
            className="form-input pl-9"
          />
        </div>
        {filters && <div className="flex items-center gap-2 flex-wrap">{filters}</div>}
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="w-full">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="table-header">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-sm text-gray-400">
                  <div className="inline-block w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mr-2" />
                  Loading data...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-sm text-gray-400">
                  No records found.
                </td>
              </tr>
            ) : (
              data.map((row, rIdx) => (
                <tr key={row._id || rIdx} className="table-row">
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className="table-cell">
                      {col.cell ? col.cell(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs text-gray-500">
          <div>
            Showing page <span className="font-semibold text-gray-800 dark:text-gray-200">{page}</span> of{' '}
            <span className="font-semibold text-gray-800 dark:text-gray-200">{pages}</span>
            {total && ` (${total} total entries)`}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-700"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= pages}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-700"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
