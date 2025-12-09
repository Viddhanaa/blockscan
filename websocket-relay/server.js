/**
 * WebSocket Relay Proxy for Blockscout
 * 
 * This server acts as a WebSocket relay, accepting connections from browsers
 * and proxying them to the Blockscout backend. It runs on port 80 which is
 * accessible through Cloudflare Tunnel, bypassing the HTTP/2 WebSocket issue.
 */

const http = require('http');
const WebSocket = require('ws');
const url = require('url');

// Configuration
const PORT = process.env.PORT || 3000;
const BACKEND_WS_URL = process.env.BACKEND_WS_URL || 'ws://viddhana-blockscout-backend:4000';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*').split(',');

// Connection limits
const MAX_CONNECTIONS = parseInt(process.env.MAX_CONNECTIONS) || 1000;
const MAX_CONNECTIONS_PER_IP = parseInt(process.env.MAX_CONNECTIONS_PER_IP) || 10;
const ipConnectionCount = new Map();

// Create HTTP server
const server = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      service: 'websocket-relay',
      uptime: process.uptime(),
      connections: wss.clients.size
    }));
    return;
  }
  
  // For any other HTTP request, return info
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Viddhana WebSocket Relay Server\nConnect via WebSocket to /socket/v2/websocket');
});

// Create WebSocket server
const wss = new WebSocket.Server({ 
  server,
  verifyClient: (info, cb) => {
    const origin = info.origin || info.req.headers.origin;
    const clientIp = info.req.headers['x-forwarded-for']?.split(',')[0]?.trim() || info.req.socket.remoteAddress;
    
    // Check total connection limit
    if (wss.clients.size >= MAX_CONNECTIONS) {
      console.log(`Connection rejected: max connections reached (${MAX_CONNECTIONS})`);
      cb(false, 503, 'Server at maximum capacity');
      return;
    }
    
    // Check per-IP connection limit
    const currentIpConnections = ipConnectionCount.get(clientIp) || 0;
    if (currentIpConnections >= MAX_CONNECTIONS_PER_IP) {
      console.log(`Connection rejected from ${clientIp}: per-IP limit reached (${MAX_CONNECTIONS_PER_IP})`);
      cb(false, 429, 'Too many connections from this IP');
      return;
    }
    
    // Check origin if not wildcard
    if (ALLOWED_ORIGINS[0] !== '*') {
      if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
        cb(false, 403, 'Origin not allowed');
        return;
      }
    }
    
    // Allow both /socket and /ws-relay/socket paths
    const pathname = url.parse(info.req.url).pathname;
    if (!pathname.startsWith('/socket') && !pathname.startsWith('/ws-relay/socket')) {
      cb(false, 404, 'Path not found');
      return;
    }
    
    cb(true);
  }
});

// Track connections for logging
let connectionId = 0;

wss.on('connection', (clientWs, req) => {
  const connId = ++connectionId;
  let clientUrl = req.url;
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
  
  // Track IP connection count
  ipConnectionCount.set(clientIp, (ipConnectionCount.get(clientIp) || 0) + 1);
  
  // Decrement IP connection count on close
  const decrementIpCount = () => {
    const count = ipConnectionCount.get(clientIp) || 1;
    if (count <= 1) {
      ipConnectionCount.delete(clientIp);
    } else {
      ipConnectionCount.set(clientIp, count - 1);
    }
  };
  
  // Strip /ws-relay prefix if present
  if (clientUrl.startsWith('/ws-relay')) {
    clientUrl = clientUrl.replace('/ws-relay', '');
  }
  
  console.log(`[${connId}] New connection from ${clientIp} for ${clientUrl}`);
  console.log(`[${connId}] Headers:`, JSON.stringify({
    origin: req.headers.origin,
    'user-agent': req.headers['user-agent'],
    host: req.headers.host
  }));
  
  // Build backend URL
  const backendUrl = `${BACKEND_WS_URL}${clientUrl}`;
  console.log(`[${connId}] Connecting to backend: ${backendUrl}`);
  
  // Connect to backend with proper headers
  const backendWs = new WebSocket(backendUrl, {
    headers: {
      'Origin': req.headers.origin || 'https://scan.viddhana.com',
      'User-Agent': req.headers['user-agent'] || 'WebSocket-Relay/1.0',
      'Host': 'scan.viddhana.com',
      'X-Forwarded-For': clientIp,
      'X-Forwarded-Proto': 'https',
    },
    handshakeTimeout: 10000,
  });
  
  let isBackendConnected = false;
  let messageQueue = [];
  let clientClosed = false;
  let backendClosed = false;
  
  // Backend upgrade/handshake
  backendWs.on('upgrade', (res) => {
    console.log(`[${connId}] Backend upgrade response:`, res.statusCode, JSON.stringify(res.headers));
  });
  
  // Backend connection opened
  backendWs.on('open', () => {
    console.log(`[${connId}] Backend connection established, readyState: ${backendWs.readyState}`);
    isBackendConnected = true;
    
    // Send any queued messages
    while (messageQueue.length > 0) {
      const msg = messageQueue.shift();
      try {
        backendWs.send(msg);
        console.log(`[${connId}] Sent queued message to backend`);
      } catch (e) {
        console.error(`[${connId}] Error sending queued message:`, e.message);
      }
    }
  });
  
  // Message from client -> backend
  clientWs.on('message', (data, isBinary) => {
    const msgStr = data.toString().substring(0, 100);
    console.log(`[${connId}] Client -> Backend: ${msgStr}... (binary: ${isBinary}, type: ${typeof data}, length: ${data.length})`);
    
    // Always send as text for Phoenix protocol
    const textData = data.toString();
    
    if (isBackendConnected && backendWs.readyState === WebSocket.OPEN) {
      try {
        backendWs.send(textData);
        console.log(`[${connId}] Sent to backend successfully`);
      } catch (e) {
        console.error(`[${connId}] Error sending to backend:`, e.message);
      }
    } else {
      // Queue messages until backend is connected
      messageQueue.push(textData);
      console.log(`[${connId}] Queued message (backend not ready)`);
    }
  });
  
  // Message from backend -> client
  backendWs.on('message', (data) => {
    const msgStr = data.toString().substring(0, 100);
    console.log(`[${connId}] Backend -> Client: ${msgStr}...`);
    
    if (clientWs.readyState === WebSocket.OPEN) {
      try {
        clientWs.send(data);
      } catch (e) {
        console.error(`[${connId}] Error sending to client:`, e.message);
      }
    }
  });
  
  // Helper to get a valid close code (some codes are reserved and cannot be sent)
  const getValidCloseCode = (code) => {
    // Reserved codes that cannot be sent: 1004, 1005, 1006, 1015
    const reserved = [1004, 1005, 1006, 1015];
    if (reserved.includes(code) || code < 1000 || code > 4999) {
      return 1000; // Normal closure
    }
    return code;
  };
  
  // Client closed
  clientWs.on('close', (code, reason) => {
    if (clientClosed) return;
    clientClosed = true;
    
    const reasonStr = reason ? reason.toString() : '';
    console.log(`[${connId}] Client disconnected: ${code} ${reasonStr}`);
    
    if (!backendClosed && backendWs.readyState === WebSocket.OPEN) {
      try {
        backendWs.close(getValidCloseCode(code), reasonStr || 'Client closed');
      } catch (e) {
        console.error(`[${connId}] Error closing backend:`, e.message);
        try { backendWs.terminate(); } catch (e2) {}
      }
    }
  });
  
  // Backend closed
  backendWs.on('close', (code, reason) => {
    if (backendClosed) return;
    backendClosed = true;
    
    const reasonStr = reason ? reason.toString() : '';
    console.log(`[${connId}] Backend disconnected: ${code} ${reasonStr}`);
    
    if (!clientClosed && clientWs.readyState === WebSocket.OPEN) {
      try {
        clientWs.close(getValidCloseCode(code), reasonStr || 'Backend closed');
      } catch (e) {
        console.error(`[${connId}] Error closing client:`, e.message);
        try { clientWs.terminate(); } catch (e2) {}
      }
    }
  });
  
  // Client error
  clientWs.on('error', (err) => {
    console.error(`[${connId}] Client error:`, err.message);
  });
  
  // Backend error
  backendWs.on('error', (err) => {
    console.error(`[${connId}] Backend error:`, err.message, err.code, err.stack);
  });
  
  // Backend unexpected response
  backendWs.on('unexpected-response', (req, res) => {
    console.error(`[${connId}] Backend unexpected response: ${res.statusCode} ${res.statusMessage}`);
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => console.error(`[${connId}] Response body: ${body}`));
  });
  
  // Ping/pong to keep connection alive
  const pingInterval = setInterval(() => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.ping();
    }
    if (backendWs.readyState === WebSocket.OPEN) {
      backendWs.ping();
    }
  }, 30000);
  
  const cleanup = () => {
    clearInterval(pingInterval);
    decrementIpCount();
  };
  
  clientWs.on('close', cleanup);
  backendWs.on('close', cleanup);
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`WebSocket Relay Server started on port ${PORT}`);
  console.log(`Backend URL: ${BACKEND_WS_URL}`);
  console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`Max connections: ${MAX_CONNECTIONS}`);
  console.log(`Max connections per IP: ${MAX_CONNECTIONS_PER_IP}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  wss.clients.forEach(client => {
    try {
      client.close(1001, 'Server shutting down');
    } catch (e) {}
  });
  server.close(() => process.exit(0));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection:', reason);
});
