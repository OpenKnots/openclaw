/**
 * Configuration for the docs-chat widget.
 * Automatically selects API URL based on Mintlify environment.
 */
(() => {
  const hostname = window.location.hostname;

  // Mintlify local dev (mintlify dev runs on localhost)
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    window.DOCS_CHAT_API_URL = "http://localhost:3001";
    return;
  }

  // Production (docs.openclaw.ai and *.mintlify.app previews)
  // TODO: Update this to the actual production URL
  window.DOCS_CHAT_API_URL = "https://claw-api.openknot.ai";
})();
