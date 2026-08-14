// =========================================================
// network.js — لایه‌ی ارتباطی (WebRTC از طریق PeerJS).
// =========================================================
export function createNetwork() {
  const state = { peer: null, myId: null, isHost: false, hostConn: null, conns: {}, handlers: {} };

  function on(event, cb) { state.handlers[event] = cb; }
  function emit(event, ...args) { if (state.handlers[event]) state.handlers[event](...args); }
  function hostBroadcast(msg) {
    for (const id in state.conns) { try { state.conns[id].send(msg); } catch (e) { /* ignore */ } }
  }

  function autoReconnect() {
    if (state.peer && !state.peer.destroyed) {
      try { state.peer.reconnect(); } catch (e) { /* ignore */ }
    }
  }

  function startHost({ onOpen, onError }) {
    if (typeof Peer === 'undefined') { if (onError) onError({ type: 'peerjs-not-loaded' }); return; }
    state.isHost = true;
    state.peer = new Peer();
    state.peer.on('open', id => { state.myId = id; onOpen(id); });
    state.peer.on('connection', conn => {
      conn.on('data', data => emit('hostData', conn, data));
      conn.on('close', () => emit('hostConnClose', conn));
      state.conns[conn.peer] = conn;
    });
    state.peer.on('disconnected', autoReconnect);
    state.peer.on('error', err => { if (onError) onError(err); });
  }

  function startClient(roomCode, joinPayload, { onOpen, onError, onClose }) {
    if (typeof Peer === 'undefined') { if (onError) onError({ type: 'peerjs-not-loaded' }); return; }
    state.isHost = false;
    state.peer = new Peer();
    state.peer.on('open', id => {
      state.myId = id;
      state.hostConn = state.peer.connect(roomCode, { reliable: true });
      state.hostConn.on('open', () => { state.hostConn.send({ type: 'join', ...joinPayload }); onOpen(id); });
      state.hostConn.on('data', data => emit('clientData', data));
      state.hostConn.on('close', () => onClose && onClose());
      state.hostConn.on('error', err => onError && onError(err));
    });
    state.peer.on('disconnected', autoReconnect);
    state.peer.on('error', err => onError && onError(err));
  }

  function sendToHost(msg) { if (state.hostConn && state.hostConn.open) state.hostConn.send(msg); }

  return {
    state, on, startHost, startClient, sendToHost, hostBroadcast,
    sendTo(id, msg) { if (state.conns[id]) state.conns[id].send(msg); },
    removeConn(id) { delete state.conns[id]; },
  };
}