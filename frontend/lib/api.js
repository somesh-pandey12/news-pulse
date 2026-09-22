const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request to ${path} failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  getClusters: () => request('/clusters'),
  getCluster: (id) => request(`/clusters/${id}`),
  getTimeline: () => request('/timeline'),
  triggerIngest: () => request('/ingest/trigger', { method: 'POST' }),
  getIngestStatus: (jobId) => request(`/ingest/status/${jobId}`),
};