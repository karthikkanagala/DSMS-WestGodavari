import React, { useState } from 'react';
import { UploadCloud, FileText, AlertCircle, CheckCircle, Download } from 'lucide-react';
import API from '../../api/axios';

export default function ExcelImport({ endpoint, extraData = {}, onSuccess, sampleTemplateUrl }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setErrors([]);
      setSuccessMsg('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setErrors([]);
    setSuccessMsg('');

    const formData = new FormData();
    formData.append('file', file);
    Object.keys(extraData).forEach((k) => formData.append(k, extraData[k]));

    try {
      const res = await API.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccessMsg(res.data.message || 'Import completed successfully!');
      setFile(null);
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setErrors([err.response?.data?.error || 'Failed to import file']);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drag and Drop Zone */}
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 text-center hover:border-primary-500 transition-colors bg-gray-50/50 dark:bg-gray-800/50">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
          id="excel-upload-input"
        />
        <label htmlFor="excel-upload-input" className="cursor-pointer flex flex-col items-center gap-2">
          <UploadCloud size={36} className="text-primary-600 dark:text-primary-400 animate-bounce" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {file ? file.name : 'Click or Drag & Drop Excel File (.xlsx)'}
          </p>
          <p className="text-xs text-gray-400">Supported formats: Microsoft Excel (.xlsx)</p>
        </label>
      </div>

      {/* Selected File Details */}
      {file && (
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg text-xs">
          <div className="flex items-center gap-2">
            <FileText size={16} />
            <span className="font-semibold">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
          </div>
          <button
            onClick={handleUpload}
            disabled={loading}
            className="btn-primary text-xs py-1 px-3"
          >
            {loading ? 'Validating & Importing...' : 'Import Data'}
          </button>
        </div>
      )}

      {/* Errors list */}
      {errors.length > 0 && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-semibold text-xs">
            <AlertCircle size={16} />
            <span>Validation Errors Found ({errors.length}):</span>
          </div>
          <ul className="list-disc list-inside text-xs text-red-600 dark:text-red-300 max-h-40 overflow-y-auto space-y-1">
            {errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Success Message */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-xl text-xs font-medium">
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}
    </div>
  );
}
