const { createProxyMiddleware } = require('http-proxy-middleware');

const DEFAULT_LOCAL = 'http://127.0.0.1:5001';
const DEFAULT_SERVER = 'http://127.0.0.1:8000';
const API_TARGET =
  process.env.REACT_APP_PROXY_TARGET ||
  (process.env.REACT_APP_SERVER_DEPLOY === '1' ? DEFAULT_SERVER : DEFAULT_LOCAL);

const proxyOpts = {
  target: API_TARGET,
  changeOrigin: true,
  secure: false,
  onError(err, _req, res) {
    console.error('[proxy]', API_TARGET, err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        message: `Backend unreachable at ${API_TARGET}. Run: cd defoex-backend && python app.py`,
      }));
    }
  },
};

module.exports = function (app) {
  app.use('/api', createProxyMiddleware(proxyOpts));
  app.use('/health', createProxyMiddleware(proxyOpts));
};
