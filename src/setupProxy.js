const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: "https://www.haatza.com",
      changeOrigin: true,
      pathRewrite: {
        "^/api": "",
      },
      onProxyReq: (proxyReq) => {
        // Ensure standard headers are passed correctly
        proxyReq.setHeader("Origin", "https://www.haatza.com");
      },
    })
  );
};
