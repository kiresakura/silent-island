/**
 * 靜默之島 — WebSocket 共用邏輯
 */

class GameWebSocket {
    constructor(onMessage, onOpen, onClose) {
        this.ws = null;
        this.onMessage = onMessage;
        this.onOpen = onOpen || (() => {});
        this.onClose = onClose || (() => {});
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
    }

    connect() {
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const url = `${protocol}//${location.host}/ws`;

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
            this.onOpen();
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('← Received:', data);
                this.onMessage(data);
            } catch (e) {
                console.error('Failed to parse message:', e);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.onClose();
            this.tryReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const msg = JSON.stringify(data);
            console.log('→ Sending:', data);
            this.ws.send(msg);
        } else {
            console.warn('WebSocket not connected, cannot send:', data);
        }
    }

    tryReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnect attempts reached');
            return;
        }
        this.reconnectAttempts++;
        console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
        setTimeout(() => this.connect(), this.reconnectDelay);
    }

    close() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// ── Utility functions ──

function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

function show(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
}

function hide(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

/**
 * 打字機效果
 * @param {HTMLElement} container
 * @param {Array} segments - [{text, className, delay}]
 */
async function typewriterEffect(container, segments) {
    container.innerHTML = '';
    for (const seg of segments) {
        const el = document.createElement('div');
        el.className = seg.className || '';
        container.appendChild(el);

        await new Promise(r => setTimeout(r, seg.delay || 1000));

        // 逐句顯示
        const sentences = seg.text.split(/(?<=[。！？」])/);
        for (const sentence of sentences) {
            if (!sentence.trim()) continue;
            el.textContent += sentence;
            el.classList.add('typewriter');
            await new Promise(r => setTimeout(r, 800));
        }
    }
}
