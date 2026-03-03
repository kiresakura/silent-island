/**
 * 靜默之島 v3.0 — 關主端邏輯
 */

let ws;
let roomCode = '';
let hostView = null;
let silenceTimer = null;
let voteTimer = null;
let discussionTimer = null;
let voteSeconds = 30;
let currentEvent = null;
let currentFearLevel = 0;

// ── 初始化 ──

function init() {
    ws = new GameWebSocket(handleMessage, onConnected);
    ws.connect();
}

function onConnected() {
    ws.send({ type: 'create_room' });
}

function handleMessage(data) {
    switch (data.type) {
        case 'room_created':
            onRoomCreated(data);
            break;
        case 'player_joined':
            onPlayerJoined(data);
            break;
        case 'player_disconnected':
            onPlayerDisconnected(data);
            break;
        case 'game_started_host':
            onGameStarted(data);
            break;
        case 'event':
            onEvent(data);
            break;
        case 'silence_countdown':
            onSilenceCountdown(data);
            break;
        case 'discussion_start':
            onDiscussionStart(data);
            break;
        case 'voting_open':
            onVotingOpen(data);
            break;
        case 'vote_received':
            onVoteReceived(data);
            break;
        case 'auto_voted_notification':
            addLog(data.message);
            break;
        case 'round_result':
            onRoundResult(data);
            break;
        case 'foreshadow_settlement':
            onForeshadowSettlement(data);
            break;
        case 'ability_used':
            onAbilityUsed(data);
            break;
        case 'ending':
            onEnding(data);
            break;
        case 'error':
            showToast(data.message);
            break;
    }
}

// ── Room Created ──

function onRoomCreated(data) {
    roomCode = data.room_code;
    setText('room-code-display', roomCode);
    document.getElementById('qr-img').src = data.qr_url;
    hide('creating-phase');
    show('waiting-phase');
    addLog(`房間已建立：${roomCode}`);

    // 大廳背景音樂（首次互動後解鎖）
    silentAudio.playBgm();
}

// ── Player Management ──

function onPlayerJoined(data) {
    setText('player-count', data.player_count);
    updateWaitingPlayerList(data.players);

    const btn = document.getElementById('start-game-btn');
    btn.disabled = data.player_count < 6;
    if (data.player_count >= 6) {
        btn.textContent = `開始遊戲（${data.player_count} 人）`;
    }

    addLog(`${data.player_name} 加入了房間`);
}

function onPlayerDisconnected(data) {
    updateWaitingPlayerList(data.players);
    addLog(`玩家斷線`);
}

function updateWaitingPlayerList(players) {
    const list = document.getElementById('waiting-player-list');
    list.innerHTML = '';
    players.forEach(p => {
        const li = document.createElement('li');
        li.className = p.connected ? '' : 'disconnected';
        li.innerHTML = `
            <span>
                <span class="connection-dot ${p.connected ? '' : 'offline'}"></span>
                <span class="player-name">${escapeHtml(p.name)}</span>
            </span>
        `;
        list.appendChild(li);
    });
}

// ── Game Start ──

function startGame() {
    ws.send({ type: 'start_game' });
}

function onGameStarted(data) {
    hostView = data.host_view;
    hide('waiting-phase');
    show('game-phase');
    updateHostView();
    addLog('遊戲開始！角色已分配。');

    // 淡出大廳 BGM
    silentAudio.fadeOutBgm();
}

// ── Event ──

function nextEvent() {
    ws.send({ type: 'next_event' });
}

function onEvent(data) {
    currentEvent = data;
    if (data.host_view) hostView = data.host_view;

    // 事件揭露音樂
    silentAudio.playEventReveal();

    show('host-event-area');
    hide('vote-chart-area');
    hide('atmosphere-area');
    setText('host-event-number', `事件 ${data.event_number}/6`);
    setText('host-event-title', data.title);
    setText('host-event-desc', data.description);

    updateHostView();

    // 顯示關主引導
    if (data.host_guidance) {
        updateHostGuidance(data.host_guidance.event_shown || '');
    }

    document.getElementById('btn-next-event').disabled = true;

    if (data.is_auto_settle) {
        document.getElementById('btn-start-silence').disabled = true;
        document.getElementById('btn-start-discussion').disabled = true;
        document.getElementById('btn-start-voting').disabled = true;
        document.getElementById('btn-end-voting').disabled = true;
        addLog(`事件 ${data.event_number}：${data.title}（自動清算，無投票）`);
    } else {
        // 流程：事件 → 沉默 → 討論 → 投票
        document.getElementById('btn-start-silence').disabled = false;
        document.getElementById('btn-start-discussion').disabled = true;
        document.getElementById('btn-start-voting').disabled = true;
        document.getElementById('btn-end-voting').disabled = true;
        addLog(`事件 ${data.event_number}：${data.title}`);
    }

    setHTML('vote-status-area', '<p class="text-dim">等待投票</p>');
    setText('host-vote-timer', '');
}

// ── Silence Countdown ──

function startSilence() {
    ws.send({ type: 'start_silence' });
}

function onSilenceCountdown(data) {
    document.getElementById('btn-start-silence').disabled = true;

    // 顯示引導
    if (data.host_guidance) {
        updateHostGuidance(data.host_guidance);
    }

    let seconds = data.seconds;
    addLog(`沉默倒數開始：${seconds} 秒`);

    const timerEl = document.getElementById('host-vote-timer');
    if (timerEl) timerEl.textContent = `沉默中 ${seconds}s`;

    if (silenceTimer) clearInterval(silenceTimer);
    silenceTimer = setInterval(() => {
        seconds--;
        if (timerEl) timerEl.textContent = `沉默中 ${seconds}s`;
        if (seconds <= 0) {
            clearInterval(silenceTimer);
            silenceTimer = null;
            if (timerEl) timerEl.textContent = '';
            // 沉默後啟用討論按鈕
            document.getElementById('btn-start-discussion').disabled = false;
            addLog('沉默結束，可以開始討論或直接投票');
        }
    }, 1000);
}

// ── Discussion ──

function startDiscussion() {
    ws.send({ type: 'start_discussion' });
}

function onDiscussionStart(data) {
    document.getElementById('btn-start-discussion').disabled = true;

    if (data.host_guidance) {
        updateHostGuidance(data.host_guidance);
    }

    let seconds = data.seconds || 120;
    addLog(`討論時間開始：${seconds} 秒`);

    const timerEl = document.getElementById('host-vote-timer');
    const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    if (timerEl) timerEl.textContent = `討論 ${formatTime(seconds)}`;

    if (discussionTimer) clearInterval(discussionTimer);
    discussionTimer = setInterval(() => {
        seconds--;
        if (timerEl) timerEl.textContent = `討論 ${formatTime(seconds)}`;
        if (seconds <= 0) {
            clearInterval(discussionTimer);
            discussionTimer = null;
            if (timerEl) timerEl.textContent = '';
            document.getElementById('btn-start-voting').disabled = false;
            addLog('討論結束，可以開始投票');
        }
    }, 1000);

    // 也允許提前結束討論開始投票
    document.getElementById('btn-start-voting').disabled = false;
}

// ── Voting ──

function startVoting() {
    if (discussionTimer) {
        clearInterval(discussionTimer);
        discussionTimer = null;
    }
    ws.send({ type: 'start_voting' });
}

function onVotingOpen(data) {
    document.getElementById('btn-start-voting').disabled = true;
    document.getElementById('btn-start-discussion').disabled = true;
    document.getElementById('btn-end-voting').disabled = false;
    setHTML('vote-status-area', '<p class="text-dim">投票進行中...</p>');
    addLog('投票開始' + (data.public_voting ? '（公開投票）' : '') + ' — 30秒倒數');

    if (data.host_guidance) {
        updateHostGuidance(data.host_guidance);
    }

    voteSeconds = data.seconds || 30;
    const timerEl = document.getElementById('host-vote-timer');
    if (timerEl) timerEl.textContent = `投票倒數 ${voteSeconds}s`;

    if (voteTimer) clearInterval(voteTimer);
    voteTimer = setInterval(() => {
        voteSeconds--;
        if (timerEl) timerEl.textContent = `投票倒數 ${voteSeconds}s`;
        if (voteSeconds <= 0) {
            clearInterval(voteTimer);
            voteTimer = null;
            if (timerEl) timerEl.textContent = '投票時間結束';
            ws.send({ type: 'vote_timeout' });
            addLog('投票超時，未投票玩家自動選擇迴避');
            setTimeout(() => {
                endVoting();
            }, 1000);
        }
    }, 1000);
}

function onVoteReceived(data) {
    const area = document.getElementById('vote-status-area');
    let existing = area.querySelector('.vote-table');
    if (!existing) {
        area.innerHTML = '<table class="vote-table"><thead><tr><th>玩家</th><th>選擇</th></tr></thead><tbody></tbody></table>';
        existing = area.querySelector('.vote-table');
    }
    const tbody = existing.querySelector('tbody');
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(data.player_name)}</td><td>${escapeHtml(data.choice)}</td>`;
    tbody.appendChild(tr);

    if (data.all_voted) {
        addLog('所有玩家已投票');
        if (voteTimer) {
            clearInterval(voteTimer);
            voteTimer = null;
        }
        const timerEl = document.getElementById('host-vote-timer');
        if (timerEl) timerEl.textContent = '全員已投票';
    }
}

function endVoting() {
    if (voteTimer) {
        clearInterval(voteTimer);
        voteTimer = null;
    }
    ws.send({ type: 'end_voting' });
}

// ── Round Result ──

function onRoundResult(data) {
    const result = data.result;
    if (data.host_view) hostView = data.host_view;

    document.getElementById('btn-end-voting').disabled = true;
    setText('host-vote-timer', '');

    updateHostView();

    // 更新恐懼視覺
    updateFearClass(result.social_fear);

    // 投票統計視覺化
    if (result.vote_summary) {
        showVoteChart(result.vote_summary);
    }

    // 氛圍文字
    if (result.atmosphere_text) {
        showAtmosphere(result.atmosphere_text);
    }

    // 被帶走特效
    if (result.taken_away && result.taken_away.length > 0) {
        showTakenAwayHost(result.taken_away);
    }

    // 關主引導
    if (currentEvent && currentEvent.host_guidance) {
        updateHostGuidance(currentEvent.host_guidance.post_result || '');
    }

    if (result.event_number === 6) {
        document.getElementById('btn-show-ending').disabled = false;
        document.getElementById('btn-next-event').disabled = true;
    } else {
        document.getElementById('btn-next-event').disabled = false;
    }

    addLog(`回合 ${result.event_number} 結算：恐懼=${result.social_fear}, 流通=${result.thought_flow}`);
    if (result.majority_triggered) {
        addLog('多數壓力觸發：5人以上選服從');
    }
    if (result.social_narrative) {
        addLog(`社會情境：${result.social_narrative}`);
    }
}

// ── Vote Chart ──

function showVoteChart(summary) {
    show('vote-chart-area');
    const total = (summary.comply || 0) + (summary.evade || 0) + (summary.resist || 0);
    if (total === 0) return;

    const complyPct = ((summary.comply || 0) / total * 100).toFixed(0);
    const evadePct = ((summary.evade || 0) / total * 100).toFixed(0);
    const resistPct = ((summary.resist || 0) / total * 100).toFixed(0);

    animateBar('bar-comply', complyPct);
    animateBar('bar-evade', evadePct);
    animateBar('bar-resist', resistPct);

    setText('count-comply', `${summary.comply} 人 (${complyPct}%)`);
    setText('count-evade', `${summary.evade} 人 (${evadePct}%)`);
    setText('count-resist', `${summary.resist} 人 (${resistPct}%)`);

    // 壓力指標：≥4 人相同選擇時高亮
    document.querySelectorAll('.vote-bar-row').forEach(row => row.classList.remove('pressure-highlight'));
    if ((summary.comply || 0) >= 4) {
        document.getElementById('bar-comply')?.closest('.vote-bar-row')?.classList.add('pressure-highlight');
    }
    if ((summary.resist || 0) >= 4) {
        document.getElementById('bar-resist')?.closest('.vote-bar-row')?.classList.add('pressure-highlight');
    }
}

function animateBar(id, pct) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.width = '0%';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            el.style.width = pct + '%';
        });
    });
}

// ── Atmosphere Text ──

function showAtmosphere(text) {
    show('atmosphere-area');
    const el = document.getElementById('atmosphere-text');
    if (el) {
        el.textContent = '';
        el.classList.remove('atmosphere-fadein');
        requestAnimationFrame(() => {
            el.textContent = text;
            el.classList.add('atmosphere-fadein');
        });
    }
}

// ── Taken Away (Host) ──

function showTakenAwayHost(takenList) {
    const names = takenList.map(t => t.player_name).join('、');
    const overlay = document.getElementById('taken-away-overlay');
    const textEl = document.getElementById('taken-away-text');

    textEl.textContent = `${names} 消失了`;
    overlay.classList.remove('hidden');
    overlay.classList.add('taken-shake');

    setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.classList.remove('taken-shake');
    }, 3000);

    addLog(`🚨 ${names} 被帶走了（風險≥10）`);
}

// ── Foreshadow Settlement ──

function onForeshadowSettlement(data) {
    const result = data.result;
    if (data.host_view) hostView = data.host_view;

    updateHostView();

    // 氛圍文字
    if (result.atmosphere_text) {
        showAtmosphere(result.atmosphere_text);
    }

    // 被帶走特效
    if (result.taken_away && result.taken_away.length > 0) {
        showTakenAwayHost(result.taken_away);
    }

    document.getElementById('btn-next-event').disabled = false;

    addLog(`伏筆清算：${result.foreshadow_count} 人有伏筆，額外恐懼+${result.extra_fear_from_count}`);
    addLog(`清算後：恐懼=${result.social_fear}, 流通=${result.thought_flow}`);

    // 記錄擲幣結果（帶動畫列表）
    const coinResults = [];
    for (const [pid, pr] of Object.entries(result.player_results)) {
        if (pr.coin_flips && pr.coin_flips.length > 0) {
            const pname = hostView.players.find(p => p.id === pid)?.name || pid;
            for (const flip of pr.coin_flips) {
                coinResults.push({ name: pname, flip });
                addLog(`🪙 ${pname} 擲幣（事件${flip.event}）：${flip.result === 'heads' ? '正面 → 風險+10' : '反面 → 無額外'}`);
            }
        }
    }

    // 在事件區域顯示擲幣結果列表
    if (coinResults.length > 0) {
        let html = '<div class="host-coin-list">';
        coinResults.forEach((cr, i) => {
            const isHeads = cr.flip.result === 'heads';
            html += `<div class="host-coin-item ${isHeads ? 'coin-heads' : 'coin-tails'}" style="animation-delay:${i * 0.3}s">
                <span class="host-coin-icon">🪙</span>
                <span>${escapeHtml(cr.name)}：${isHeads ? '正面 → 風險+10' : '反面 → 無額外'}</span>
            </div>`;
        });
        html += '</div>';
        const eventArea = document.getElementById('host-event-area');
        if (eventArea) {
            const coinDiv = document.createElement('div');
            coinDiv.innerHTML = html;
            eventArea.appendChild(coinDiv);
        }
    }
}

// ── Ability Used ──

function onAbilityUsed(data) {
    if (data.host_view) hostView = data.host_view;
    updateHostView();
    addLog(`${data.player_name}（${data.role_id}）使用了能力：${data.message}`);
}

// ── Ending ──

function showEnding() {
    ws.send({ type: 'show_ending' });
}

function onEnding(data) {
    show('ending-overlay');
    hide('game-phase');

    // 停止其他音樂，播放結尾曲
    silentAudio.stopAllMusic();
    silentAudio.playEndingMusic();

    silentAudio.init();
    silentAudio.playEndingAmbient();

    const container = document.getElementById('ending-display');

    const segments = [
        {
            text: data.social_ending.title,
            className: 'ending-title typewriter',
            delay: 500,
        },
        {
            text: data.social_ending.text,
            className: 'ending-body',
            delay: 2000,
        },
    ];

    const takenAway = data.personal_endings.filter(p => p.taken_away);
    if (takenAway.length > 0) {
        const names = takenAway.map(p => p.player_name).join('、');
        segments.push({
            text: `🚨 ${names} 被帶走了。`,
            className: 'ending-personal',
            delay: 3000,
        });
    }

    const personalSummary = data.personal_endings.map(p =>
        `${p.ending_icon} ${p.player_name}（${p.role_name}）— ${p.ending_label}`
    ).join('\n');
    segments.push({
        text: personalSummary,
        className: 'ending-personal-summary',
        delay: 2000,
    });

    segments.push({
        text: data.closure_text,
        className: 'ending-closure',
        delay: 3000,
    });

    if (data.reflection_text) {
        segments.push({
            text: data.reflection_text,
            className: 'ending-reflection',
            delay: 2000,
        });
    }

    segments.push({
        text: `社會恐懼：${data.final_stats.social_fear}　思想流通：${data.final_stats.thought_flow}`,
        className: 'ending-closure',
        delay: 2000,
    });

    typewriterEffect(container, segments);
}

// ── Host View Update ──

function updateHostView() {
    if (!hostView) return;

    // 數字跳動動畫
    animateValue('host-fear', hostView.social_fear);
    animateValue('host-flow', hostView.thought_flow);
    setText('host-round', hostView.current_event || '-');
    setText('host-phase', getPhaseLabel(hostView.phase));

    // 進度條
    const fearPct = Math.min(100, (hostView.social_fear / 10) * 100);
    const flowPct = Math.min(100, (hostView.thought_flow / 10) * 100);
    const fearBar = document.getElementById('fear-bar');
    const flowBar = document.getElementById('flow-bar');
    if (fearBar) fearBar.style.width = fearPct + '%';
    if (flowBar) flowBar.style.width = flowPct + '%';

    // 存活玩家
    const totalPlayers = hostView.players.length;
    const alivePlayers = hostView.players.filter(p => !p.taken_away).length;
    setText('host-alive', `${alivePlayers}/${totalPlayers}`);

    // 被帶走列表
    const takenList = document.getElementById('dashboard-taken-list');
    if (takenList) {
        const taken = hostView.players.filter(p => p.taken_away);
        if (taken.length > 0) {
            takenList.innerHTML = taken.map(p =>
                `<span class="taken-name">${escapeHtml(p.name)}</span>`
            ).join('');
        } else {
            takenList.innerHTML = '';
        }
    }

    // 玩家列表
    const list = document.getElementById('game-player-list');
    list.innerHTML = '';
    hostView.players.forEach(p => {
        const li = document.createElement('li');
        li.className = p.connected ? '' : 'disconnected';
        if (p.taken_away) li.className += ' player-taken-away';

        // 風險區間
        let riskZone = 'safe';
        if (p.taken_away || p.risk >= 10) riskZone = 'taken';
        else if (p.risk >= 7) riskZone = 'danger';
        else if (p.risk >= 4) riskZone = 'caution';

        let badges = '';
        if (p.moral_cost) badges += ' <span class="badge badge-moral">🩸</span>';
        if (p.moral_collapse) badges += ' <span class="badge badge-collapse">💀</span>';
        if (p.taken_away) badges += ' <span class="badge badge-taken">🚨 已帶走</span>';
        else if (p.risk >= 10) badges += ' <span class="badge badge-taken">🚨</span>';

        li.innerHTML = `
            <span>
                <span class="connection-dot ${p.connected ? '' : 'offline'}"></span>
                <span class="player-name ${p.taken_away ? 'name-taken' : ''}">${escapeHtml(p.name)}</span>
                <span class="player-role">${p.role_name}</span>
                <span class="risk-zone-dot ${riskZone}"></span>
                ${badges}
            </span>
            <span>
                <span class="player-risk">風險:${p.risk}</span>
                ${p.ability_used ? ' <span class="text-dim">[能力已用]</span>' : ''}
            </span>
        `;
        list.appendChild(li);
    });

    // 伏筆
    const fsList = document.getElementById('foreshadow-list');
    let fsHtml = '';
    hostView.players.forEach(p => {
        if (p.foreshadows && p.foreshadows.length > 0) {
            p.foreshadows.forEach(fs => {
                fsHtml += `<li>${escapeHtml(p.name)} — <span class="foreshadow-type">${getForeshadowLabel(fs.type)}</span>（事件${fs.event}）</li>`;
            });
        }
    });
    fsList.innerHTML = fsHtml || '<li class="text-dim">尚無伏筆</li>';
}

// ── Animate Value ──

function animateValue(elementId, newValue) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const oldValue = parseInt(el.textContent) || 0;
    if (oldValue === newValue) {
        el.textContent = newValue;
        return;
    }
    el.classList.add('value-bounce');
    el.textContent = newValue;
    setTimeout(() => el.classList.remove('value-bounce'), 500);
}

// ── Logging ──

function addLog(msg) {
    const log = document.getElementById('host-log');
    if (!log) return;
    const div = document.createElement('div');
    div.className = 'msg';
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    div.textContent = `[${time}] ${msg}`;
    log.insertBefore(div, log.firstChild);
}

// ── Helpers ──

function getPhaseLabel(phase) {
    const labels = {
        'waiting': '等待',
        'event': '事件',
        'silence': '沉默',
        'discussion': '討論',
        'voting': '投票',
        'settling': '結算',
        'auto_settle': '伏筆清算',
        'ended': '結束',
    };
    return labels[phase] || phase;
}

function getForeshadowLabel(type) {
    const labels = {
        'silence': '沉默',
        'vague': '模糊',
    };
    return labels[type] || type;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ── Fear CSS Management ──

function updateFearClass(fear) {
    currentFearLevel = fear;
    for (let i = 0; i <= 6; i++) {
        document.body.classList.remove(`fear-${i}`);
    }
    const level = Math.min(fear, 6);
    document.body.classList.add(`fear-${level}`);
}

// ── Host Guidance ──

function updateHostGuidance(text) {
    const area = document.getElementById('host-guidance-area');
    const textEl = document.getElementById('host-guidance-text');
    if (!area || !textEl) return;

    if (text) {
        textEl.textContent = text;
        area.classList.add('active');
    } else {
        area.classList.remove('active');
    }
}

// ── 音頻解鎖（首次使用者互動後） ──
function unlockHostAudio() {
    silentAudio.init();
    silentAudio.unlockAudio();
    // 若已在等待階段，直接播放 BGM
    if (!document.getElementById('waiting-phase').classList.contains('hidden')) {
        silentAudio.playBgm();
    }
    document.removeEventListener('click', unlockHostAudio);
    document.removeEventListener('touchstart', unlockHostAudio);
}
document.addEventListener('click', unlockHostAudio, { once: true });
document.addEventListener('touchstart', unlockHostAudio, { once: true });

// ── Start ──
init();
