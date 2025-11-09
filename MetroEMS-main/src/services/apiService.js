// API Service for MetroEMS Backend Integration
// Handles all communication with the FastAPI backend

// Allow overriding the backend URL via environment variable
// Default to port 8002 where the Real Backend runs in this workspace
// You can set REACT_APP_API_BASE to override (e.g., http://localhost:8002)
const API_BASE_URL = process.env.REACT_APP_API_BASE || 'http://localhost:8002';

class ApiService {
    constructor() {
        this.token = localStorage.getItem('metroems_token');
        this.baseHeaders = {
            'Content-Type': 'application/json',
        };
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        localStorage.setItem('metroems_token', token);
    }

    // Get authorization headers
    getAuthHeaders() {
        return {
            ...this.baseHeaders,
            ...(this.token && { 'Authorization': `Bearer ${this.token}` })
        };
    }

    // Generic API request handler with timeout (defaults to 5s)
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const { timeoutMs = 5000, ...rest } = options;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);

        const config = {
            headers: this.getAuthHeaders(),
            signal: controller.signal,
            ...rest
        };

        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired or invalid
                    this.clearToken();
                    throw new Error('Authentication required');
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            return await response.text();
        } catch (error) {
            console.error(`API request failed for ${endpoint}:`, error);
            throw error;
        } finally {
            clearTimeout(timer);
        }
    }

    // Clear authentication token
    clearToken() {
        this.token = null;
        localStorage.removeItem('metroems_token');
    }

    // Authentication methods
    async login(username, password) {
        // Try fingerprint login first
        const fpPayload = this._collectFingerprint();
        try {
            const response = await this.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify(fpPayload)
            });
            if (response.token) this.setToken(response.token);
            return response;
        } catch (e) {
            // Fallback to legacy username/password login
            const legacy = await this.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
            if (legacy.token) this.setToken(legacy.token);
            return legacy;
        }
    }

    // Preferred login using browser fingerprint
    async loginWithFingerprint() {
        const fpPayload = this._collectFingerprint();
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(fpPayload)
        });
        if (response.token) {
            this.setToken(response.token);
        }
        return response;
    }

    // Register fingerprint (best-effort; backend will persist if new)
    async registerFingerprint() {
        const fpPayload = this._collectFingerprint();
        return await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(fpPayload)
        });
    }

    // Collect minimal fingerprint payload for backend auth
    _collectFingerprint() {
        try {
            const nav = typeof navigator !== 'undefined' ? navigator : {};
            const scr = (typeof window !== 'undefined' && window.screen) ? window.screen : null;
            const tz = (typeof Intl !== 'undefined' && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : null;
            return {
                userAgent: nav.userAgent || null,
                platform: nav.platform || null,
                timezone: tz || null,
                screen: scr ? `${scr.width || ''}x${scr.height || ''}` : null,
                language: nav.language || null,
                webgl: null,
                installTime: localStorage.getItem('metroems_install_time') || (() => {
                    const t = new Date().toISOString();
                    try { localStorage.setItem('metroems_install_time', t); } catch {}
                    return t;
                })(),
                deviceId: localStorage.getItem('metroems_device_id') || (() => {
                    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
                    try { localStorage.setItem('metroems_device_id', id); } catch {}
                    return id;
                })(),
            };
        } catch (e) {
            return {};
        }
    }

    async getLicenseStatus() {
        return await this.request('/license/status');
    }

    // Device discovery methods
    async getDeviceTypes() {
        return await this.request('/wizard/device-types');
    }

    async discoverDevices(deviceType = 'station_radio', opts = {}) {
        // opts: { ip, ips, community, version, port }
        const payload = { device_type: deviceType };
        if (opts.ip) payload.ip = opts.ip;
        if (opts.ips) payload.ips = opts.ips;
        if (opts.community) payload.community = opts.community;
        if (opts.version) payload.version = opts.version;
        if (opts.port) payload.port = opts.port;
        return await this.request('/wizard/discover', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    // New discovery endpoint: POST /discover with optional targetIp
    async discoverNewDevices(targetIp) {
        const body = targetIp ? { targetIp } : {};
        let primary = [];
        try {
            const res = await this.request('/discover', {
                method: 'POST',
                body: JSON.stringify(body)
            });
            primary = Array.isArray(res) ? res : (res?.results || []);
        } catch (_) {
            primary = [];
        }

        if (primary && primary.length > 0) return primary;

        // If empty or failed, fallback to legacy wizard discovery
        try {
            const payload = { device_type: 'station_radio' };
            if (targetIp) payload.ip = targetIp;
            const legacy = await this.request('/wizard/discover', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            const candidates = Array.isArray(legacy?.candidates) ? legacy.candidates : [];
            if (candidates.length > 0) return candidates;
            // If still empty and no target, try a common alternate community ('private')
            if (!targetIp) {
                try {
                    const alt = await this.request('/wizard/discover', {
                        method: 'POST',
                        body: JSON.stringify({ device_type: 'station_radio', community: 'private' })
                    });
                    const altCandidates = Array.isArray(alt?.candidates) ? alt.candidates : [];
                    if (altCandidates.length > 0) return altCandidates;
                } catch (_) {}
            }
            return primary;
        } catch (_) {
            return primary; // empty
        }
    }

    async identifyDevice(ip) {
        return await this.request('/wizard/identify', {
            method: 'POST',
            body: JSON.stringify({ ip })
        });
    }

    // Session management
    async startSession(ip, deviceType, user, opts = {}) {
        const payload = { ip, device_type: deviceType, user };
        if (opts.community) payload.community = opts.community;
        if (opts.version) payload.version = opts.version;
        if (opts.port) payload.port = opts.port;
        if (opts.oid) payload.oid = opts.oid;
        if (opts.ifIndex) payload.ifIndex = opts.ifIndex;
        if (opts.signal_oid) payload.signal_oid = opts.signal_oid;
        if (opts.snr_oid) payload.snr_oid = opts.snr_oid;
        if (opts.log_base_oid) payload.log_base_oid = opts.log_base_oid;
        return await this.request('/session/start', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    async getSessionSummary(sessionId) {
        return await this.request(`/session/${sessionId}/summary`);
    }

    // Device operations
    async getDeviceConfig(sessionId) {
        return await this.request(`/ops/${sessionId}/config`);
    }

    async setDeviceConfig(sessionId, config) {
        return await this.request(`/ops/${sessionId}/config`, {
            method: 'POST',
            body: JSON.stringify({ config })
        });
    }

    async getDeviceLogs(sessionId) {
        return await this.request(`/ops/${sessionId}/logs`);
    }

    async getDevicePorts(sessionId) {
        return await this.request(`/ops/${sessionId}/ports`);
    }

    async uploadFirmware(sessionId, file) {
        const formData = new FormData();
        formData.append('file', file);

        return await this.request(`/ops/${sessionId}/firmware`, {
            method: 'POST',
            headers: {
                ...(this.token && { 'Authorization': `Bearer ${this.token}` })
                // Don't set Content-Type for FormData, let browser set it
            },
            body: formData
        });
    }

    // Health check
    async healthCheck() {
        try {
            // Quick 2s health probe to avoid UI hangs
            return await this.request('/health', { timeoutMs: 2000 });
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }

    // Utility method to check if backend is available
    async isBackendAvailable() {
        try {
            const health = await this.healthCheck();
            return health.status === 'healthy';
        } catch (error) {
            return false;
        }
    }

    // Backend connection check (alias for consistency)
    async checkBackendConnection() {
        return await this.isBackendAvailable();
    }

    // Device Session Management (for DeviceManagement component)
    async getDeviceSession(sessionId) {
        const response = await this.request(`/device-sessions/${sessionId}`);
        return response;
    }

    // Device Configuration Methods
    async getDeviceConfiguration(sessionId) {
        try {
            const response = await this.request(`/device-sessions/${sessionId}/configuration`);
            return response;
        } catch (error) {
            console.warn('Failed to get device configuration:', error);
            return null;
        }
    }

    async updateDeviceConfiguration(sessionId, config) {
        const response = await this.request(`/device-sessions/${sessionId}/configuration`, {
            method: 'PUT',
            body: JSON.stringify(config)
        });
        return response;
    }

    // Device Monitoring Methods
    async getDeviceMonitoring(sessionId) {
        try {
            const response = await this.request(`/device-sessions/${sessionId}/monitoring`);
            return response;
        } catch (error) {
            console.warn('Failed to get device monitoring data:', error);
            return null;
        }
    }

    // Refresh summary (re-poll OIDs)
    async refreshSession(sessionId) {
        return await this.request(`/session/${sessionId}/refresh`, { method: 'POST' });
    }

    // Device Logs Methods (enhanced)
    async getDeviceLogsEnhanced(sessionId) {
        try {
            const response = await this.request(`/device-sessions/${sessionId}/logs`);
            return response;
        } catch (error) {
            console.warn('Failed to get device logs:', error);
            return [];
        }
    }

    // Live logs stream via SSE
    createLogsEventSource({ deviceIp, since }) {
        const params = new URLSearchParams();
        if (deviceIp) params.set('deviceIp', deviceIp);
        if (since) params.set('since', since);
        const url = `${API_BASE_URL}/logs/stream?${params.toString()}`;
        return new EventSource(url, { withCredentials: false });
    }

    // Recent logs (polling fallback)
    async getRecentLogs({ deviceIp, limit = 200, since } = {}) {
        const params = new URLSearchParams();
        if (deviceIp) params.set('deviceIp', deviceIp);
        if (limit) params.set('limit', String(limit));
        if (since) params.set('since', since);
        return await this.request(`/logs/recent?${params.toString()}`);
    }

    // Time-series metrics fetch
    async getMetricsTimeseries({ deviceIp, limit = 300, since } = {}) {
        const params = new URLSearchParams();
        if (deviceIp) params.set('deviceIp', deviceIp);
        if (limit) params.set('limit', String(limit));
        if (since) params.set('since', since);
        return await this.request(`/metrics/timeseries?${params.toString()}`);
    }

    // Single-metric series over last N minutes
    async getMetricSeries({ deviceIp, metric, mins = 15 } = {}) {
        const params = new URLSearchParams();
        if (deviceIp) params.set('deviceIp', deviceIp);
        if (metric) params.set('metric', metric);
        if (mins) params.set('mins', String(mins));
        return await this.request(`/metrics/timeseries?${params.toString()}`);
    }
}

// Create and export a singleton instance
const apiService = new ApiService();

export { apiService };
export default apiService;