/**
 * mockStorage.js — Static Prototype Browser Storage & Image Utilities
 * 
 * Manages demonstration records for collections, overflow reports,
 * image compression, file validation, and GPS metadata.
 * Everything runs 100% client-side without external dependencies.
 */

const STORAGE_KEYS = {
  COLLECTIONS: 'dsms_local_collections',
  OVERFLOWS: 'dsms_local_overflows',
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/jpg',
];

/**
 * Validates selected image file for type and size.
 * Returns { valid: boolean, error?: string }
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  // Type validation
  const fileType = file.type?.toLowerCase();
  const fileName = file.name?.toLowerCase() || '';
  const isSupportedType =
    SUPPORTED_MIME_TYPES.includes(fileType) ||
    /\.(jpe?g|png|webp|gif|heic)$/i.test(fileName);

  if (!isSupportedType) {
    return {
      valid: false,
      error: 'Unsupported file format. Please upload a JPEG, PNG, WebP, or GIF image.',
    };
  }

  // Size validation (Max 5 MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds the 5 MB limit. Please select a smaller photo.`,
    };
  }

  return { valid: true };
}

/**
 * Compresses an image client-side using Canvas to keep browser storage compact.
 * Downscales to max dimension (e.g. 1024px) and converts to JPEG at 0.72 quality.
 * Returns Promise<string> (base64 Data URL)
 */
export function compressImageToDataUrl(file, maxDimension = 1024, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image for compression.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to original data URL if canvas context unavailable
          resolve(reader.result);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Safe local storage read with JSON parse and corrupt data recovery.
 */
function readStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn(`[mockStorage] Failed to read ${key}, resetting.`, err);
    return [];
  }
}

/**
 * Safe local storage write.
 */
function writeStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (err) {
    console.warn(`[mockStorage] Storage quota exceeded for ${key}.`, err);
    return false;
  }
}

/**
 * Retrieves demonstration collection records saved in browser.
 */
export function getLocalCollections() {
  return readStorage(STORAGE_KEYS.COLLECTIONS);
}

/**
 * Saves a new demonstration collection record.
 */
export function saveLocalCollection(record) {
  const existing = getLocalCollections();
  const enriched = {
    ...record,
    _id: record._id || `local_col_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: record.timestamp || new Date().toISOString(),
    isLocalDemo: true,
  };
  const updated = [enriched, ...existing];
  writeStorage(STORAGE_KEYS.COLLECTIONS, updated);
  return enriched;
}

/**
 * Retrieves demonstration overflow reports saved in browser.
 */
export function getLocalOverflows() {
  return readStorage(STORAGE_KEYS.OVERFLOWS);
}

/**
 * Saves a new demonstration overflow report.
 */
export function saveLocalOverflow(report) {
  const existing = getLocalOverflows();
  const enriched = {
    ...report,
    _id: report._id || `local_of_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    detected_at: report.detected_at || new Date().toISOString(),
    status: 'open',
    isLocalDemo: true,
  };
  const updated = [enriched, ...existing];
  writeStorage(STORAGE_KEYS.OVERFLOWS, updated);
  return enriched;
}

/**
 * Resolves a local overflow report.
 */
export function resolveLocalOverflow(id) {
  const existing = getLocalOverflows();
  const updated = existing.map((o) =>
    o._id === id ? { ...o, status: 'resolved', resolved_at: new Date().toISOString() } : o
  );
  writeStorage(STORAGE_KEYS.OVERFLOWS, updated);
}
