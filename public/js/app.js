(() => {
  const STATE = { ws: null, connected: false, reconnectAttempts: 0, sessionId: null, status: 'new' };
  const QUEUE_KEY = 'cs_offline_queue';
  const SID_KEY = 'cs_session_id';
  const FORCE_NEW_KEY = 'cs_force_new';
  const MAX_RETRY = 24;

  function now() { return new Date().toISOString(); }
  function uuid() { try { return crypto.randomUUID(); } catch (_) { return `${Date.now()}-${Math.random().toString(16).slice(2)}`; } }
  function loadSid() { try { return localStorage.getItem(SID_KEY) || null; } catch (_) { return null; } }
  function saveSid(id) { try { localStorage.setItem(SID_KEY, id); } catch (_) { } }
  function clearSid() { try { localStorage.removeItem(SID_KEY); } catch (_) { } }
  function shouldForceNew() { try { return localStorage.getItem(FORCE_NEW_KEY) === '1'; } catch (_) { return false; } }
  function consumeForceNew() { try { localStorage.removeItem(FORCE_NEW_KEY); } catch (_) { } }
  function markForceNew() { try { localStorage.setItem(FORCE_NEW_KEY, '1'); } catch (_) { } }
  function loadQueue() { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch (_) { return []; } }
  function saveQueue(q) { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch (_) { } }
  function enqueue(item) { const q = loadQueue(); q.push(item); saveQueue(q); }
  function drainQueue(send) { const q = loadQueue(); const rest = []; for (const m of q) { try { send(m); } catch (e) { rest.push(m); } } saveQueue(rest); }

  function wsUrl() { const proto = location.protocol === 'https:' ? 'wss' : 'ws'; return `${proto}://${location.host}/ws`; }

  function setStatus(s) { STATE.status = s; try { console.log('[CS] status:', s); } catch (_) {} }
  function initSessionState() {
    if (shouldForceNew()) {
      clearSid(); STATE.sessionId = null; setStatus('new'); consumeForceNew();
    } else {
      const sid = loadSid(); if (sid) { STATE.sessionId = sid; setStatus('active'); } else { setStatus('new'); }
    }
  }

  async function getUserInfo() {
    try {
      const res = await fetch('/auth/me');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) { }
    return null;
  }

  async function connect() {
    if (STATE.connected || STATE.ws) return;
    initSessionState();
    STATE.sessionId = STATE.sessionId || loadSid() || uuid();
    saveSid(STATE.sessionId);

    const user = await getUserInfo();
    const userInfo = user ? {
      username: user.username,
      email: user.email,
      userId: user.user_id,
      avatar: user.avatar_url
    } : { username: 'Guest', email: null };

    const ws = new WebSocket(wsUrl());
    STATE.ws = ws;
    ws.onopen = () => {
      STATE.connected = true;
      STATE.reconnectAttempts = 0;
      setStatus('active');
      safeLog('INFO', `WS 已连接，会话: ${STATE.sessionId}`);
      send({
        type: 'init',
        sessionId: STATE.sessionId,
        timestamp: now(),
        userAgent: navigator.userAgent,
        user: userInfo
      });
      drainQueue(send);
      const evt = new CustomEvent('cs:status', { detail: { connected: true } }); document.dispatchEvent(evt);
    };
    ws.onmessage = (ev) => {
      let msg; try { msg = JSON.parse(ev.data); } catch (_) { msg = { type: 'raw', data: ev.data }; }
      const evt = new CustomEvent('cs:message', { detail: msg });
      document.dispatchEvent(evt);
      if (msg.type === 'session_ended' && msg.sessionId && msg.sessionId === STATE.sessionId) {
        clearSid();
        STATE.sessionId = null;
        setStatus('ended');
        try { window.CustomerService.resetToNewSession(); } catch (_) {}
      }
    };
    ws.onclose = (ev) => {
      STATE.connected = false;
      STATE.ws = null;
      safeLog('ERROR', `WS 连接关闭 code:${ev && ev.code} reason:${ev && ev.reason}`);
      const evt = new CustomEvent('cs:status', { detail: { connected: false } }); document.dispatchEvent(evt);
      retryReconnect();
    };
    ws.onerror = () => { };
  }

  function retryReconnect() {
    if (STATE.reconnectAttempts >= MAX_RETRY) return;
    const delay = Math.min(30000, (2 ** STATE.reconnectAttempts) * 1000);
    STATE.reconnectAttempts++;
    setTimeout(connect, delay);
  }

  function send(payload) {
    const p = Object.assign({ sessionId: STATE.sessionId, timestamp: now() }, payload);
    if (STATE.connected && STATE.ws && STATE.ws.readyState === WebSocket.OPEN) {
      STATE.ws.send(JSON.stringify(p));
      return true;
    }
    enqueue(p);
    return false;
  }

  async function sendViaRest(message) {
    const body = { sessionId: STATE.sessionId, message, timestamp: now(), userAgent: navigator.userAgent };
    try {
      const resp = await fetch('/api/customer-service/inquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await resp.json().catch(() => ({}));
      const evt = new CustomEvent('cs:message', { detail: { type: 'ack', sessionId: STATE.sessionId, timestamp: now() } });
      document.dispatchEvent(evt);
      return true;
    } catch (e) { safeLog('ERROR', `REST 发送失败: ${e.message}`); return false; }
  }

  function safeLog(level, text) { try { console.log(`[${level}] ${text}`); } catch (_) { } }

  window.CustomerService = {
    connect,
    resetToNewSession: () => {
      try { if (STATE.ws && STATE.ws.readyState === WebSocket.OPEN) { STATE.ws.close(); } } catch (_) {}
      clearSid(); STATE.sessionId = null; setStatus('new');
      STATE.connected = false; STATE.ws = null; STATE.reconnectAttempts = 0;
      connect();
    },
    forceNewOnEntry: () => { markForceNew(); },
    sendQuestion: async (text) => {
      const ok = send({ type: 'question', message: text, userAgent: navigator.userAgent });
      if (!ok) { await sendViaRest(text); }
    },
    sessionId: () => { if (!STATE.sessionId) { STATE.sessionId = loadSid() || uuid(); saveSid(STATE.sessionId); } return STATE.sessionId; }
  };

  document.addEventListener('DOMContentLoaded', () => connect());
})();
