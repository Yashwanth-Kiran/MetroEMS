/* Proxim HTTP API client (TypeScript) */

// Access env via window for CRA environments to avoid Node typings requirement
declare global {
  interface Window { __ENV__?: Record<string, string>; }
}
// Prefer injected window.__ENV__ then fallback to process.env if available else empty
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// Avoid referencing window.process to keep typings clean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const runtimeEnv: any = (typeof window !== 'undefined' && (window.__ENV__ || {})) || {};
const API_BASE_URL = runtimeEnv.REACT_APP_API_BASE || 'http://localhost:8000';

export interface ProximCreds { username?: string; password?: string }
export interface ProximEventLogLine { ts?: string | null; text: string }
export interface ProximLicenseInfo { product_description?: string|null; mac?: string|null; max_output_mbps?: number|null; max_input_mbps?: number|null; max_aggregate_mbps?: number|null; product_family?: string|null; product_class?: string|null }
export interface ProximEthernetInfo { mac?: string|null; operational_speed_mbit?: number|null; duplex?: string|null; admin_status?: string|null }
export interface ProximSnrRow { index: number; mcs_index: string; modulation: string; streams: number; data_rate_mbps: number; min_required_snr_db: number; max_optimum_snr_db: number }

async function login(ip: string, creds?: ProximCreds) {
  const body = JSON.stringify({ username: creds?.username || 'admin', password: creds?.password || 'public' });
  const res = await fetch(`${API_BASE_URL}/devices/${encodeURIComponent(ip)}/http/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body
  });
  if (!res.ok) throw new Error(`HTTP login failed (${res.status})`);
  return await res.json();
}

async function downloadLogs(ip: string, opts: { raw?: boolean } = { raw: true }): Promise<Blob | ProximEventLogLine[]> {
  const raw = opts.raw !== false; // default true
  const url = `${API_BASE_URL}/devices/${encodeURIComponent(ip)}/http/logs/download?raw=${raw ? 'true' : 'false'}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`HTTP log download failed (${res.status})`);
  if (raw) {
    return await res.blob();
  }
  return await res.json();
}

async function getLicense(ip: string): Promise<ProximLicenseInfo> {
  const res = await fetch(`${API_BASE_URL}/devices/${encodeURIComponent(ip)}/http/license`);
  if (!res.ok) throw new Error(`HTTP license fetch failed (${res.status})`);
  return await res.json();
}

async function getEthernet(ip: string): Promise<ProximEthernetInfo> {
  const res = await fetch(`${API_BASE_URL}/devices/${encodeURIComponent(ip)}/http/ethernet`);
  if (!res.ok) throw new Error(`HTTP ethernet fetch failed (${res.status})`);
  return await res.json();
}

async function getSnrTable(ip: string): Promise<ProximSnrRow[]> {
  const res = await fetch(`${API_BASE_URL}/devices/${encodeURIComponent(ip)}/http/snr-table`);
  if (!res.ok) throw new Error(`HTTP SNR table fetch failed (${res.status})`);
  return await res.json();
}

export const proximHttp = { login, downloadLogs, getLicense, getEthernet, getSnrTable };
export default proximHttp;
