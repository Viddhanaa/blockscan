/**
 * Cloudflare Worker: WebSocket Proxy for Blockscout
 * 
 * This worker accepts WebSocket connections from browsers and proxies
 * them to the origin server through Cloudflare's edge.
 * 
 * IMPORTANT: Cloudflare Workers can handle WebSocket connections properly
 * even when HTTP/2 is enabled, because Workers use their own WebSocket API.
 */

// Configuration - MUST use the tunnel hostname, not localhost
const ORIGIN_WS_URL = 'wss://scan.viddhana.com';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Only handle /socket paths
    if (!url.pathname.startsWith('/socket')) {
      return fetch(request);
    }

    // Check for WebSocket upgrade
    const upgradeHeader = request.headers.get('Upgrade');
    
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      // Not a WebSocket request, pass through
      return fetch(request);
    }

    // Handle WebSocket
    return handleWebSocket(request, url, env);
  }
};

async function handleWebSocket(request, url, env) {
  // Create a WebSocket pair - client side goes to browser, server side we control
  const webSocketPair = new WebSocketPair();
  const [clientWs, serverWs] = Object.values(webSocketPair);

  // Accept the server side
  serverWs.accept();

  // Build origin URL - connect to origin via the tunnel
  // The trick: use a special internal path that bypasses this worker
  const originUrl = new URL(url.pathname + url.search, ORIGIN_WS_URL);
  
  try {
    // Cloudflare Workers CAN make outbound WebSocket connections
    // But we need to use fetch with the proper headers
    const originRequest = new Request(originUrl.toString(), {
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
        'Sec-WebSocket-Key': request.headers.get('Sec-WebSocket-Key') || generateKey(),
        'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Protocol': request.headers.get('Sec-WebSocket-Protocol') || '',
        'Origin': request.headers.get('Origin') || originUrl.origin,
        'Host': originUrl.host,
        // Add a header to prevent infinite loop
        'X-Cloudflare-Worker': 'websocket-proxy',
      },
    });

    const originResponse = await fetch(originRequest);

    // Check if origin accepted the WebSocket
    if (originResponse.status !== 101) {
      const body = await originResponse.text();
      serverWs.close(1011, `Origin rejected: ${originResponse.status}`);
      return new Response(`Origin returned ${originResponse.status}: ${body}`, { 
        status: 502,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const originWs = originResponse.webSocket;
    if (!originWs) {
      serverWs.close(1011, 'No WebSocket from origin');
      return new Response('Origin did not return a WebSocket', { status: 502 });
    }

    // Accept origin WebSocket
    originWs.accept();

    // Bidirectional message proxying
    serverWs.addEventListener('message', event => {
      if (originWs.readyState === WebSocket.OPEN) {
        originWs.send(event.data);
      }
    });

    serverWs.addEventListener('close', event => {
      if (originWs.readyState === WebSocket.OPEN) {
        originWs.close(event.code || 1000, event.reason || 'Client closed');
      }
    });

    serverWs.addEventListener('error', event => {
      console.error('Client WebSocket error:', event);
      if (originWs.readyState === WebSocket.OPEN) {
        originWs.close(1011, 'Client error');
      }
    });

    originWs.addEventListener('message', event => {
      if (serverWs.readyState === WebSocket.OPEN) {
        serverWs.send(event.data);
      }
    });

    originWs.addEventListener('close', event => {
      if (serverWs.readyState === WebSocket.OPEN) {
        serverWs.close(event.code || 1000, event.reason || 'Origin closed');
      }
    });

    originWs.addEventListener('error', event => {
      console.error('Origin WebSocket error:', event);
      if (serverWs.readyState === WebSocket.OPEN) {
        serverWs.close(1011, 'Origin error');
      }
    });

    // Return the client WebSocket to the browser
    return new Response(null, {
      status: 101,
      webSocket: clientWs,
    });

  } catch (error) {
    console.error('WebSocket proxy error:', error);
    serverWs.close(1011, error.message);
    return new Response(`WebSocket proxy error: ${error.message}`, { status: 500 });
  }
}

function generateKey() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode.apply(null, bytes));
}
