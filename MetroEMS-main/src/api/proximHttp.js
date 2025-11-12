// Proxim HTTP API client (JS runtime companion)
const API_BASE_URL = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

async function login(ip, creds) {
  const body = JSON.stringify({ username: (creds && creds.username) || 'admin', password: (creds && creds.password) || 'public' });
  const res = await fetch(`${API_BASE_URL}/devices/${encodeURIComponent(ip)}/http/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body
  });
  if (!res.ok) throw new Error(`HTTP login failed (${res.status})`);
  return await res.json();
}

async function downloadLogs(ip, opts = { raw: true }) {
  const raw = opts && opts.raw !== false; // default true
  const url = `${API_BASE_URL}/devices/${encodeURIComponent(ip)}/http/logs/download?raw=${raw ? 'true' : 'false'}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`HTTP log download failed (${res.status})`);
  if (raw) {
    return await res.blob();
  }
  return await res.json();
}

async function getLicense(ip) {
  const res = await fetch(`${API_BASE_URL}/devices/${encodeURIComponent(ip)}/http/license`);
  if (!res.ok) throw new Error(`HTTP license fetch failed (${res.status})`);
  return await res.json();
}

async function getEthernet(ip) {
  const res = await fetch(`${API_BASE_URL}/devices/${encodeURIComponent(ip)}/http/ethernet`);
  if (!res.ok) throw new Error(`HTTP ethernet fetch failed (${res.status})`);
  return await res.json();
}

async function getSnrTable(ip) {
  const res = await fetch(`${API_BASE_URL}/devices/${encodeURIComponent(ip)}/http/snr-table`);
  if (!res.ok) throw new Error(`HTTP SNR table fetch failed (${res.status})`);
  return await res.json();
}

const proximHttp = { login, downloadLogs, getLicense, getEthernet, getSnrTable };
export { proximHttp };
export default proximHttp;
