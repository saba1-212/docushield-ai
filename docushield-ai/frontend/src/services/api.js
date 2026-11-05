// Thin client for the Flask REST API. Every screen reads real data through these functions.
const BASE = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      ...options,
    });
  } catch {
    throw new ApiError('Cannot reach the DocuShield backend. Make sure it is running on port 5000.', 0, 'network');
  }
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data?.code);
  return data;
}

const qs = (params = {}) => {
  const u = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') u.set(k, v); });
  const s = u.toString();
  return s ? `?${s}` : '';
};

export const api = {
  health: () => request('/api/health'),
  stats: () => request('/api/dashboard/stats'),
  charts: () => request('/api/dashboard/charts'),
  listDocuments: (params) => request('/api/documents' + qs(params)),
  getDocument: (id) => request(`/api/documents/${id}`),
  deleteDocument: (id) => request(`/api/documents/${id}`, { method: 'DELETE' }),
  analyze: (documentId) => request('/api/documents/analyze', { method: 'POST', body: JSON.stringify({ document_id: documentId }) }),
  reviews: (status) => request('/api/reviews' + qs({ status })),
  submitReview: (id, body) => request(`/api/reviews/${id}`, { method: 'POST', body: JSON.stringify(body) }),
  settings: () => request('/api/settings'),
  updateSettings: (confidence_threshold) => request('/api/settings', { method: 'PUT', body: JSON.stringify({ confidence_threshold }) }),
  modelInfo: () => request('/api/model/info'),

  // XMLHttpRequest is used for uploads so that real upload progress can be reported.
  uploadDocument(file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', BASE + '/api/documents/upload');
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => {
        let data = null;
        try { data = JSON.parse(xhr.responseText); } catch { /* ignore */ }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new ApiError(data?.error || `Upload failed (${xhr.status})`, xhr.status, data?.code));
      };
      xhr.onerror = () => reject(new ApiError('Cannot reach the DocuShield backend. Make sure it is running on port 5000.', 0, 'network'));
      const form = new FormData();
      form.append('file', file);
      xhr.send(form);
    });
  },
};
