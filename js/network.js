// =========================================================
// network.js — لایه‌ی ارتباطی (WebRTC از طریق PeerJS).
// پروتکل پیام‌ها:
//   client->host : {type:'join', name, team}
//   client->host : {type:'input', input:{up,down,left,right,kick}}
//   client->host : {type:'chat', text}
//   host->client : {type:'welcome', id, settings}
//   host->client : {type:'roomFull'}
//   host->all    : {type:'playerList', list}
//   host->all    : {type:'state', players, ball, score, match}
//   host->all    : {type:'chat', name, team, text}
// =========================================================

export function createNetwork() {
  const state = {
    peer: null,
    myId: null,
    isHost: false,
    hostConn: null,   // فقط سمت کلاینت
    conns: {},        // فقط سمت هاست: id -> DataConnection
    handlers: {},      // event -> callback
  };

  function on(event, cb) { state.handlers[event] = cb; }
  function emit(event, ...args) { if (state.handlers[event]) state.handlers[event](...args); }

  function hostBroadcast(msg) {
    for (const id in state.conns) {
      try { state.conns[id].send(msg); } catch (e) { /* ignore */ }
    }
  }

  function startHost({ onOpen, onError }) {
    state.isHost = true;
    state.peer = new Peer();
    state.peer.on('open', id => {
      state.myId = id;
      onOpen(id);
    });
    state.peer.on('connection', conn => {
      conn.on('data', data => emit('hostData', conn, data));
      conn.on('close', () => emit('hostConnClose', conn));
      state.conns[conn.peer] = conn;
    });
    state.peer.on('error', err => onError(err));
  }

  function startClient(roomCode, joinPayload, { onOpen, onError, onClose }) {
    state.isHost = false;
    state.peer = new Peer();
    state.peer.on('open', id => {
      state.myId = id;
      state.hostConn = state.peer.connect(roomCode, { reliable: true });
      state.hostConn.on('open', () => {
        state.hostConn.send({ type: 'join', ...joinPayload });
        onOpen(id);
      });
      state.hostConn.on('data', data => emit('clientData', data));
      state.hostConn.on('close', () => onClose && onClose());
      state.hostConn.on('error', err => onError(err));
    });
    state.peer.on('error', err => onError(err));
  }

  function sendToHost(msg) {
    if (state.hostConn && state.hostConn.open) state.hostConn.send(msg);
  }

  return {
    state,
    on,
    startHost,
    startClient,
    sendToHost,
    hostBroadcast,
    sendTo(id, msg) { if (state.conns[id]) state.conns[id].send(msg); },
    removeConn(id) { delete state.conns[id]; },
  };
}
