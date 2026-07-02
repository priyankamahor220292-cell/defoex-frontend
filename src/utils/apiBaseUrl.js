/**
 * Resolve the API base URL for axios.
 *
 * - REACT_APP_API_URL set → use it
 * - localhost dev → '' (CRA setupProxy.js → localhost:5001)
 * - live host on port 80/443 → '' (nginx proxies /api on same origin)
 * - live host on port 3000 → http://host:8000 (gunicorn; static serve / npm start without proxy)
 */
export function resolveApiBaseUrl() {
  const fromEnv = (process.env.REACT_APP_API_URL || '').trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  if (typeof window === 'undefined') return '';

  const { hostname, protocol, port } = window.location;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

  if (!isLocal) {
    if (!port || port === '80' || port === '443') return '';
    if (port === '3000') return `${protocol}//${hostname}:8000`;
  }

  return '';
}
