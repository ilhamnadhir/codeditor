#!/usr/bin/env node
/**
 * Minimal Yjs WebSocket collaboration server.
 * Run with: node collab-server.cjs
 * Listens on ws://localhost:1234
 */
const WebSocket = require('ws')
const http = require('http')

const PORT = process.env.PORT || 1234

// Map of roomName -> Set<WebSocket>
const rooms = new Map()

function getRoom(name) {
  if (!rooms.has(name)) rooms.set(name, new Set())
  return rooms.get(name)
}

const server = http.createServer((_req, res) => {
  res.writeHead(200)
  res.end('Yjs WebSocket Server running\n')
})

const wss = new WebSocket.Server({ server })

wss.on('connection', (ws, req) => {
  // Room name comes from URL path, e.g. ws://localhost:1234/my-room
  const room = (req.url || '/default').slice(1) || 'default'
  const peers = getRoom(room)
  peers.add(ws)

  console.log(`[+] Client joined room "${room}" (${peers.size} peers)`)

  ws.on('message', (data, isBinary) => {
    // Relay the message to all OTHER peers in the same room
    peers.forEach(peer => {
      if (peer !== ws && peer.readyState === WebSocket.OPEN) {
        peer.send(data, { binary: isBinary })
      }
    })
  })

  ws.on('close', () => {
    peers.delete(ws)
    console.log(`[-] Client left room "${room}" (${peers.size} peers)`)
    if (peers.size === 0) rooms.delete(room)
  })

  ws.on('error', (err) => {
    console.error('WS error:', err.message)
    peers.delete(ws)
  })
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Yjs collab server listening on ws://0.0.0.0:${PORT}`)
  console.log(`   Local:   ws://localhost:${PORT}`)
  console.log(`   Network: ws://<your-local-ip>:${PORT}`)
  console.log('\n   Other devices on the same WiFi can connect via your local IP.\n')
})
