/**
 * 靜默之島 v3.1 — 玩家端邏輯（全螢幕沉浸式 UI）
 */

let ws;
let playerId = null;
let playerName = '';
let roomCode = '';
let myRole = null;
let voted = false;
let silenceTimer = null;
let voteTimer = null;
let discussionTimer = null;
let currentChoices = [];
let noteRemaining = 3;
let selectedNoteTarget = null;
let isTakenAway = false;
let isObserver = false;
let lastNoteSenderId = null;
let currentFearLevel = 0;
let currentScreen = null;

// ── 畫面切換核心 ──

function switchScreen(screenId) {
    document.querySelectorAll('.game-screen').forEach(el => {
        el.classList.remove('active');
        setTimeout(() => {
            if (!el.classList.contains('active')) {
                el.classList.add('hidden');
            }
        }, 300);
    });

    const target = document.getElementById(screenId);
    if (target) {
        target.classList.remove('hidden');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                target.classList.add('active');
            });
        });
    }

    currentScreen = screenId;
}

// ── 角色卡底部抽屜 ──

function toggleRolePanel() {
    const sheet = document.getElementById('role-sheet');
    if (sheet.classList.contains('active')) {
        sheet.classList.remove('active');
        setTimeout(() => sheet.classList.add('hidden'), 300);
    } else {
        sheet.classList.remove('hidden');
        requestAnimationFrame(() => sheet.classList.add('active'));
    }
}

// ── 初始化 ──

function init() {
    const params = new URLSearchParams(window.location.search);
    roomCode = params.get('room') || '{{ROOM_CODE}}';
    playerName = params.get('name') || '';

    if (roomCode && roomCode !== '{{ROOM_CODE}}' && !playerName) {
        showNameInput();
        return;
    }

    if (!roomCode || roomCode === '{{ROOM_CODE}}' || !playerName) {
        setText('join-status', '缺少房間碼或名字，請返回首頁');
        return;
    }

    ws = new GameWebSocket(handleMessage, onConnected, onDisconnected);
    ws.connect();
}

function showNameInput() {
    setHTML('join-phase', `
        <div class="header">
            <h1>靜默之島</h1>
            <p class="subtitle">選擇與代價</p>
        </div>
        <div class="card">
            <p class="text-center mb-2">房間碼：<strong>${escapeHtml(roomCode)}</strong></p>
            <div class="input-group">
                <label>你的名字</label>
                <input type="text" id="name-input" placeholder="輸入名字" maxlength="10">
            </div>
            <button class="btn btn-primary" onclick="submitName()">加入遊戲</button>
        </div>
    `);

    document.getElementById('name-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitName();
    });
}

function submitName() {
    const name = document.getElementById('name-input').value.trim();
    if (!name) {
        showToast('請輸入名字');
        return;
    }
    playerName = name;

    const url = new URL(window.location);
    url.searchParams.set('name', playerName);
    window.history.replaceState({}, '', url);

    setText('join-status', '正在連線...');
    show('join-phase');

    ws = new GameWebSocket(handleMessage, onConnected, onDisconnected);
    ws.connect();
}

function onConnected() {
    ws.send({
        type: 'join_room',
        room_code: roomCode,
        player_name: playerName,
    });
}

function onDisconnected() {
    showToast('連線已斷開，嘗試重新連線...');
}

function handleMessage(data) {
    switch (data.type) {
        case 'joined':
            onJoined(data);
            break;
        case 'player_joined':
            onPlayerJoined(data);
            break;
        case 'game_started':
            onGameStarted(data);
            break;
        case 'identity_confirmed':
            onIdentityConfirmed();
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
        case 'vote_confirmed':
            onVoteConfirmed(data);
            break;
        case 'auto_voted':
            onAutoVoted(data);
            break;
        case 'public_vote':
            onPublicVote(data);
            break;
        case 'public_vote_announced':
            showToast(data.message);
            show('public-vote-badge');
            break;
        case 'round_result':
            onRoundResult(data);
            break;
        case 'foreshadow_settlement':
            onForeshadowSettlement(data);
            break;
        case 'ability_result':
            onAbilityResult(data);
            break;
        case 'ability_broadcast':
            onAbilityBroadcast(data);
            break;
        case 'observer_mode':
            onObserverMode(data);
            break;
        case 'event_observer':
            onEvent(data);
            break;
        case 'player_list':
            onPlayerList(data);
            break;
        case 'note_sent':
            onNoteSent(data);
            break;
        case 'note_received':
            onNoteReceived(data);
            break;
        case 'ending':
            onEnding(data);
            break;
        case 'host_disconnected':
            showToast('關主已斷線');
            break;
        case 'error':
            showToast(data.message);
            break;
    }
}

// ── Joined ──

function onJoined(data) {
    playerId = data.player_id;
    hide('join-phase');
    show('lobby-phase');
    setText('lobby-room-code', data.room_code);
    setText('lobby-player-name', data.player_name);
    if (data.player_count) {
        setText('lobby-player-count', data.player_count);
    }
}

function onPlayerJoined(data) {
    setText('lobby-player-count', data.player_count);
}

// ── Game Started ──

function onGameStarted(data) {
    myRole = data.role;
    hide('lobby-phase');
    show('game-phase');

    // 角色資訊填入底部抽屜
    setText('role-name', myRole.name);
    setText('role-passive', `被動：${myRole.passive}`);
    setText('role-ability', `能力：${myRole.ability}`);

    const abilityBtn = document.getElementById('ability-btn');
    abilityBtn.disabled = false;
    abilityBtn.textContent = '使用能力';

    updateNoteBadge();

    // 初始化音效
    silentAudio.init();

    // 開場敘事流程
    switchScreen('game-screen-intro');
    startIntroSequence();
}

// ── Intro / Role Reveal / Identity Confirm ──

let introTimer = null;

function startIntroSequence() {
    const lines = document.querySelectorAll('#intro-lines .intro-line');
    let idx = 0;

    function showNext() {
        if (idx < lines.length) {
            lines[idx].classList.add('visible');
            idx++;
            introTimer = setTimeout(showNext, idx === 1 ? 800 : 1500);
        } else {
            // All lines shown, wait 2s then go to role reveal
            introTimer = setTimeout(() => {
                showRoleReveal();
            }, 2000);
        }
    }

    // Reset all lines
    lines.forEach(l => l.classList.remove('visible'));
    showNext();
}

function showRoleReveal() {
    if (!myRole) return;

    // Fill in role info
    setText('reveal-role-name', myRole.name);
    setText('reveal-passive', myRole.passive);
    setText('reveal-ability', myRole.ability);

    // Hide details and button initially
    const details = document.getElementById('reveal-details');
    details.querySelectorAll('.role-detail').forEach(d => d.classList.remove('visible'));
    const btn = document.getElementById('btn-ready');
    btn.classList.remove('visible');

    switchScreen('game-screen-role-reveal');

    // Reset flip state
    const card = document.getElementById('card-flip');
    card.classList.remove('flipped');

    // Trigger flip after 1s
    setTimeout(() => {
        card.classList.add('flipped');

        // Show details after flip completes (0.8s)
        setTimeout(() => {
            const roleDetails = details.querySelectorAll('.role-detail');
            roleDetails[0].classList.add('visible');
            setTimeout(() => {
                if (roleDetails[1]) roleDetails[1].classList.add('visible');
                // Show button
                setTimeout(() => {
                    btn.classList.add('visible');
                }, 300);
            }, 300);
        }, 800);
    }, 1000);

    silentAudio.playEventReveal();
}

function onReadyClick() {
    if (!myRole) return;

    // Fill confirm screen
    setText('confirm-role-name', myRole.name);
    setText('confirm-passive', myRole.passive);
    setText('confirm-ability', myRole.ability);

    switchScreen('game-screen-identity-confirm');

    // Reset button state
    const btn = document.getElementById('btn-confirm-identity');
    btn.classList.remove('confirmed');
    btn.textContent = '我已確認身份';
    btn.disabled = false;
}

function confirmIdentity() {
    const btn = document.getElementById('btn-confirm-identity');
    if (btn.disabled) return;

    btn.disabled = true;
    btn.classList.add('confirmed');
    btn.textContent = '等待其他玩家確認...';

    ws.send({ type: 'confirm_identity' });
}

function onIdentityConfirmed() {
    silentAudio.startAmbient(0);
    switchScreen('game-screen-waiting');
    setText('waiting-msg', '等待關主開始第一個事件...');
}

// ── Event ──

function onEvent(data) {
    if (isTakenAway) return;

    voted = false;
    currentChoices = data.choices || [];

    hide('public-vote-badge');
    hide('public-votes-area');
    hide('post-silence-overlay');
    hide('player-atmosphere-area');

    setText('event-number', `事件 ${data.event_number}/6`);
    setText('event-title', data.title);
    setText('event-desc', data.description);

    switchScreen('game-screen-event');

    if (data.is_auto_settle) {
        setTimeout(() => {
            switchScreen('game-screen-waiting');
            setText('waiting-msg', '正在清算過去的選擇...');
        }, 3000);
    }
}

// ── Silence Countdown ──

function onSilenceCountdown(data) {
    let seconds = data.seconds;
    const overlay = document.getElementById('silence-overlay');
    overlay.classList.remove('hidden');
    overlay.classList.add('active');

    setText('countdown-number', seconds);

    // 心跳音效
    silentAudio.startHeartbeat(seconds);

    // 氛圍文字（5 秒後淡入）
    const atmEl = document.getElementById('silence-atmosphere');
    if (atmEl && data.atmosphere) {
        atmEl.textContent = data.atmosphere;
        atmEl.classList.remove('visible');
        setTimeout(() => atmEl.classList.add('visible'), 5000);
    }

    const numEl = document.getElementById('countdown-number');
    if (silenceTimer) clearInterval(silenceTimer);
    silenceTimer = setInterval(() => {
        seconds--;
        setText('countdown-number', seconds);

        // 倒數顏色變化
        if (numEl) {
            numEl.classList.remove('countdown-yellow', 'countdown-red');
            if (seconds <= 10) numEl.classList.add('countdown-red');
            else if (seconds <= 20) numEl.classList.add('countdown-yellow');
        }

        if (seconds <= 0) {
            clearInterval(silenceTimer);
            silenceTimer = null;
            silentAudio.stopHeartbeat();
            overlay.classList.remove('active');
            overlay.classList.add('hidden');
            if (atmEl) atmEl.classList.remove('visible');
            switchScreen('game-screen-waiting');
            setText('waiting-msg', '等待關主開始投票...');
        }
    }, 1000);
}

// ── Discussion ──

function onDiscussionStart(data) {
    hide('silence-overlay');
    silentAudio.stopHeartbeat();

    switchScreen('game-screen-discussion');

    let seconds = data.seconds || 120;
    const timerText = document.getElementById('discussion-timer-text');

    const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    if (timerText) timerText.textContent = formatTime(seconds);

    if (discussionTimer) clearInterval(discussionTimer);
    discussionTimer = setInterval(() => {
        seconds--;
        if (timerText) timerText.textContent = formatTime(seconds);
        if (seconds <= 0) {
            clearInterval(discussionTimer);
            discussionTimer = null;
            switchScreen('game-screen-waiting');
            setText('waiting-msg', '等待關主開始投票...');
        }
    }, 1000);
}

// ── Ability Broadcast ──

function onAbilityBroadcast(data) {
    showToast(data.message);
}

// ── Observer Mode ──

function onObserverMode(data) {
    isObserver = true;
    document.body.classList.add('observer-mode');
    const banner = document.getElementById('observer-banner');
    if (banner) banner.classList.add('active');
    // 隱藏 FAB
    const fabGroup = document.getElementById('fab-group');
    if (fabGroup) fabGroup.style.display = 'none';
    showToast(data.message);
}

// ── Voting ──

function onVotingOpen(data) {
    if (isTakenAway || isObserver) return;

    if (discussionTimer) {
        clearInterval(discussionTimer);
        discussionTimer = null;
    }

    switchScreen('game-screen-voting');
    hide('vote-lock-msg');

    if (data.public_voting) {
        show('public-vote-badge');
        show('public-votes-area');
        setHTML('public-votes-list', '');
    }

    renderVoteButtons();

    let voteSeconds = data.seconds || 30;
    const timerEl = document.getElementById('vote-timer');
    if (timerEl) {
        timerEl.textContent = `剩餘 ${voteSeconds} 秒`;
        timerEl.classList.remove('timer-urgent');
        show('vote-timer-area');
    }

    if (voteTimer) clearInterval(voteTimer);
    voteTimer = setInterval(() => {
        voteSeconds--;
        if (timerEl) timerEl.textContent = `剩餘 ${voteSeconds} 秒`;
        if (voteSeconds <= 5 && timerEl) {
            timerEl.classList.add('timer-urgent');
        }
        if (voteSeconds <= 0) {
            clearInterval(voteTimer);
            voteTimer = null;
            if (timerEl) timerEl.textContent = '投票時間結束';
        }
    }, 1000);
}

function renderVoteButtons() {
    const container = document.getElementById('vote-choices');
    container.innerHTML = '';

    currentChoices.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'vote-btn';
        btn.dataset.key = choice.key;
        btn.disabled = choice.disabled || false;

        const labelSpan = document.createElement('span');
        labelSpan.textContent = choice.label;
        btn.appendChild(labelSpan);

        if (choice.description) {
            const descSpan = document.createElement('span');
            descSpan.className = 'vote-description';
            descSpan.textContent = choice.description;
            btn.appendChild(descSpan);
        }

        if (choice.disabled) {
            btn.title = '你的角色無法選擇此選項';
        }

        btn.addEventListener('click', () => {
            if (!voted && !btn.disabled) {
                submitVote(choice.key, btn);
            }
        });

        container.appendChild(btn);
    });
}

function submitVote(choiceKey, btnElement) {
    ws.send({ type: 'vote', choice: choiceKey });
    silentAudio.playVoteClick();

    voted = true;
    if (voteTimer) {
        clearInterval(voteTimer);
        voteTimer = null;
    }

    const allBtns = document.querySelectorAll('.vote-btn');
    allBtns.forEach(b => {
        if (b === btnElement) {
            b.classList.add('voted');
        } else {
            b.classList.add('locked');
            b.disabled = true;
        }
    });
    show('vote-lock-msg');
}

function onVoteConfirmed(data) {
    showToast('投票已確認');
}

function onAutoVoted(data) {
    voted = true;
    if (voteTimer) {
        clearInterval(voteTimer);
        voteTimer = null;
    }
    showToast(data.message || '投票超時，自動選擇迴避');

    const allBtns = document.querySelectorAll('.vote-btn');
    allBtns.forEach(b => {
        if (b.dataset.key === data.choice) {
            b.classList.add('voted');
        } else {
            b.classList.add('locked');
            b.disabled = true;
        }
    });
    show('vote-lock-msg');
    setText('vote-lock-msg', '投票超時 — 自動選擇迴避');
}

function onPublicVote(data) {
    const list = document.getElementById('public-votes-list');
    const li = document.createElement('li');
    li.innerHTML = `<span class="player-name">${escapeHtml(data.player_name)}</span><span>${escapeHtml(data.choice)}</span>`;
    list.appendChild(li);
}

// ── Round Result ──

function onRoundResult(data) {
    if (voteTimer) {
        clearInterval(voteTimer);
        voteTimer = null;
    }

    // 更新精簡狀態列
    setText('player-fear', data.social_fear);
    setText('player-flow', data.thought_flow);
    setText('player-risk', data.your_risk);
    updateFearLevel(data.social_fear);

    if (data.your_risk >= 10) {
        document.getElementById('player-risk').classList.add('risk-critical');
    }

    let html = '';

    // 敘事結果文字
    if (data.narrative) {
        html += `<div class="narrative-text">${escapeHtml(data.narrative)}</div>`;
    }

    // 風險變化（精簡，不重複顯示完整狀態列）
    if (data.your_risk_delta > 0) {
        html += `<p class="text-red">風險 +${data.your_risk_delta}</p>`;
    } else if (data.your_risk_delta < 0) {
        html += `<p class="text-green">風險 ${data.your_risk_delta}</p>`;
    }

    if (data.majority_triggered) {
        html += `<p class="text-dim">多數壓力觸發：5人以上選擇服從…社會恐懼上升。</p>`;
    }

    if (data.messages && data.messages.length > 0) {
        html += '<div class="mt-1">';
        data.messages.forEach(msg => {
            html += `<p class="result-msg">${escapeHtml(msg)}</p>`;
        });
        html += '</div>';
    }

    // 社會情境敘事
    if (data.social_narrative) {
        html += `<div class="social-narrative">${escapeHtml(data.social_narrative)}</div>`;
    }

    // 風險警告
    if (data.risk_warning) {
        html += `<div class="risk-warning">${escapeHtml(data.risk_warning)}</div>`;
    }

    setHTML('result-content', html);

    // 投票統計
    if (data.vote_summary) {
        showPlayerVoteSummary(data.vote_summary);
    }

    switchScreen('game-screen-result');

    // 氛圍文字
    if (data.atmosphere_text) {
        showPlayerAtmosphere(data.atmosphere_text);
    }

    // 被帶走特效
    if (data.you_taken_away) {
        showYouTakenAway();
    } else if (data.taken_away && data.taken_away.length > 0) {
        showOthersTakenAway(data.taken_away);
    }
}

// ── Player Atmosphere ──

function showPlayerAtmosphere(text) {
    show('player-atmosphere-area');
    const el = document.getElementById('player-atmosphere-text');
    if (el) {
        el.textContent = '';
        el.classList.remove('atmosphere-fadein');
        requestAnimationFrame(() => {
            el.textContent = text;
            el.classList.add('atmosphere-fadein');
        });
    }
}

// ── Player Vote Summary (inline) ──

function showPlayerVoteSummary(summary) {
    const total = (summary.comply || 0) + (summary.evade || 0) + (summary.resist || 0);
    if (total === 0) return;

    const complyPct = ((summary.comply || 0) / total * 100).toFixed(0);
    const evadePct = ((summary.evade || 0) / total * 100).toFixed(0);
    const resistPct = ((summary.resist || 0) / total * 100).toFixed(0);

    let html = '<div class="player-vote-summary mt-2"><h4 class="text-dim">投票統計</h4>';
    html += `<div class="vote-bar-row"><span class="vote-bar-label-sm">服從</span><div class="vote-bar-track-sm"><div class="vote-bar vote-bar-comply" style="width:${complyPct}%"></div></div><span class="vote-bar-count-sm">${summary.comply}</span></div>`;
    html += `<div class="vote-bar-row"><span class="vote-bar-label-sm">迴避</span><div class="vote-bar-track-sm"><div class="vote-bar vote-bar-evade" style="width:${evadePct}%"></div></div><span class="vote-bar-count-sm">${summary.evade}</span></div>`;
    html += `<div class="vote-bar-row"><span class="vote-bar-label-sm">抵抗</span><div class="vote-bar-track-sm"><div class="vote-bar vote-bar-resist" style="width:${resistPct}%"></div></div><span class="vote-bar-count-sm">${summary.resist}</span></div>`;
    html += '</div>';

    const resultContent = document.getElementById('result-content');
    if (resultContent) {
        resultContent.insertAdjacentHTML('beforeend', html);
    }
}

// ── Taken Away Effects ──

function showYouTakenAway() {
    isTakenAway = true;
    silentAudio.playTakenAway();
    show('you-taken-overlay');
    // 隱藏 FAB
    const fabGroup = document.getElementById('fab-group');
    if (fabGroup) fabGroup.style.display = 'none';
}

function showOthersTakenAway(takenList) {
    const names = takenList.map(t => t.player_name).join('、');
    const overlay = document.getElementById('taken-away-overlay');
    const textEl = document.getElementById('taken-away-text');

    textEl.textContent = `${names} 被帶走了。沒有人敢問去了哪裡。`;
    overlay.classList.remove('hidden');
    overlay.classList.add('taken-shake');

    setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.classList.remove('taken-shake');
    }, 3000);
}

// ── Foreshadow Settlement ──

function onForeshadowSettlement(data) {
    // 更新精簡狀態列
    setText('player-fear', data.social_fear);
    setText('player-flow', data.thought_flow);
    setText('player-risk', data.risk);
    updateFearLevel(data.social_fear);

    // 伏筆音效
    silentAudio.playForeshadowChord();

    let html = '';

    if (data.has_foreshadow) {
        html += '<p class="text-red mb-1 foreshadow-alert">你的過去被翻出了。</p>';

        if (data.narratives && data.narratives.length > 0) {
            data.narratives.forEach(n => {
                html += `<div class="narrative-text">${escapeHtml(n)}</div>`;
            });
        }

        if (data.foreshadows && data.foreshadows.length > 0) {
            html += '<div class="mb-1">';
            data.foreshadows.forEach(fs => {
                const label = { silence: '沉默', vague: '模糊' }[fs.type] || fs.type;
                html += `<p class="result-msg">• 事件${fs.event}的「${label}」</p>`;
            });
            html += '</div>';
        }

        // 擲幣動畫 - 全屏3D版
        if (data.coin_flips && data.coin_flips.length > 0) {
            showCoinFlipAnimation(data.coin_flips);

            html += '<div class="coin-flip-area mt-1">';
            data.coin_flips.forEach(flip => {
                const isHeads = flip.result === 'heads';
                html += `
                    <div class="coin-flip-result ${isHeads ? 'coin-heads' : 'coin-tails'}">
                        <div class="coin-icon">🪙</div>
                        <div class="coin-text">
                            事件${flip.event} 擲幣：${isHeads ? '正面' : '反面'}
                            ${isHeads ? '<span class="text-red"> → 風險 +10！</span>' : '<span class="text-dim"> → 風險 +5</span>'}
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        if (data.risk_delta > 0) {
            html += `<p class="text-red mt-1">風險 +${data.risk_delta}</p>`;
        }
    } else {
        html += '<p class="text-dim">你沒有被翻出的伏筆。</p>';
    }

    if (data.messages && data.messages.length > 0) {
        html += '<div class="mt-1">';
        data.messages.forEach(msg => {
            html += `<p class="result-msg">${escapeHtml(msg)}</p>`;
        });
        html += '</div>';
    }

    setHTML('foreshadow-content', html);

    switchScreen('game-screen-foreshadow');

    // 觸發擲幣 inline 動畫
    setTimeout(() => {
        document.querySelectorAll('.coin-flip-result').forEach(el => {
            el.classList.add('coin-animate');
        });
    }, 500);

    // 氛圍文字
    if (data.atmosphere_text) {
        showPlayerAtmosphere(data.atmosphere_text);
    }

    // 被帶走特效
    if (data.you_taken_away) {
        setTimeout(() => showYouTakenAway(), 2500);
    } else if (data.taken_away && data.taken_away.length > 0) {
        setTimeout(() => showOthersTakenAway(data.taken_away), 2500);
    }
}

// ── Coin Flip 3D Animation ──

function showCoinFlipAnimation(coinFlips) {
    const flip = coinFlips[0];
    const isHeads = flip.result === 'heads';

    const overlay = document.getElementById('coin-flip-overlay');
    const coin = document.getElementById('coin-3d');
    const resultText = document.getElementById('coin-result-text');

    coin.className = 'coin-3d';
    resultText.textContent = '';
    resultText.className = 'coin-result-text';

    show('coin-flip-overlay');
    silentAudio.playCoinFlip();

    requestAnimationFrame(() => {
        coin.classList.add(isHeads ? 'coin-flip-heads' : 'coin-flip-tails');
    });

    setTimeout(() => {
        if (isHeads) {
            resultText.textContent = '正面！風險 +10';
            resultText.classList.add('coin-result-danger');
        } else {
            resultText.textContent = '反面。風險 +5';
            resultText.classList.add('coin-result-safe');
        }
        resultText.classList.add('coin-result-show');
    }, 2000);

    setTimeout(() => {
        hide('coin-flip-overlay');
    }, 3500);
}

// ── Ability ──

function useAbility() {
    if (!myRole) return;

    const needsTarget = ['D', 'G'].includes(myRole.role_id);

    if (needsTarget) {
        ws.send({ type: 'get_players' });
    } else {
        ws.send({ type: 'use_ability' });
    }
}

function onPlayerList(data) {
    const container = document.getElementById('target-list');
    container.innerHTML = '';

    data.players.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-small mb-1';
        btn.textContent = p.name;
        btn.addEventListener('click', () => {
            ws.send({ type: 'use_ability', target_player_id: p.id });
            closeTargetModal();
        });
        container.appendChild(btn);
    });

    show('target-modal');
}

function closeTargetModal() {
    hide('target-modal');
}

function onAbilityResult(data) {
    if (data.success) {
        showToast(data.message);
        const btn = document.getElementById('ability-btn');
        btn.disabled = true;
        btn.textContent = '能力已使用';
    } else {
        showToast(data.message);
    }
}

// ── Anonymous Note System ──

function openNoteModal() {
    if (noteRemaining <= 0) {
        showToast('紙條用完了');
        return;
    }
    if (isTakenAway) {
        showToast('你已被帶走');
        return;
    }

    selectedNoteTarget = null;
    setText('note-remaining', noteRemaining);
    document.getElementById('note-input').value = '';
    setText('note-char-count', '0');
    document.getElementById('note-send-btn').disabled = true;

    ws.send({ type: 'get_players' });
    window._noteModalPending = true;

    show('note-modal');
}

// Override onPlayerList to also handle note modal
const _origOnPlayerList = onPlayerList;
onPlayerList = function(data) {
    if (window._noteModalPending) {
        window._noteModalPending = false;
        populateNoteTargets(data.players);
        return;
    }
    _origOnPlayerList(data);
};

function populateNoteTargets(players) {
    const container = document.getElementById('note-target-list');
    container.innerHTML = '';

    players.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-small mb-1 note-target-btn';
        btn.textContent = p.name;
        btn.dataset.pid = p.id;
        btn.addEventListener('click', () => {
            container.querySelectorAll('.note-target-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedNoteTarget = p.id;
            updateNoteSendBtn();
        });
        container.appendChild(btn);
    });
}

function updateNoteSendBtn() {
    const input = document.getElementById('note-input');
    const btn = document.getElementById('note-send-btn');
    const text = (input.value || '').trim();
    btn.disabled = !selectedNoteTarget || text.length === 0 || text.length > 100;
}

function sendNote() {
    const input = document.getElementById('note-input');
    const text = (input.value || '').trim();

    if (!selectedNoteTarget || !text || text.length > 100) return;

    ws.send({
        type: 'send_note',
        target_player_id: selectedNoteTarget,
        text: text,
    });

    closeNoteModal();
}

function closeNoteModal() {
    hide('note-modal');
    selectedNoteTarget = null;
    window._noteModalPending = false;
}

function onNoteSent(data) {
    noteRemaining = data.remaining;
    updateNoteBadge();
    showToast('紙條已送出');
}

function onNoteReceived(data) {
    const textEl = document.getElementById('note-received-text');
    textEl.textContent = data.text;
    lastNoteSenderId = data.sender_id || null;

    const replyBtn = document.getElementById('note-reply-btn');
    const replyInput = document.getElementById('note-reply-input');
    if (replyBtn) {
        replyBtn.style.display = (lastNoteSenderId && noteRemaining > 0 && !isTakenAway && !isObserver) ? '' : 'none';
        replyBtn.textContent = '回覆';
        replyBtn.onclick = showReplyInput;
    }
    if (replyInput) replyInput.classList.add('hidden');

    silentAudio.playNoteReceived();
    show('note-received-overlay');
}

function showReplyInput() {
    const replyInput = document.getElementById('note-reply-input');
    const replyBtn = document.getElementById('note-reply-btn');
    if (replyInput.classList.contains('hidden')) {
        replyInput.classList.remove('hidden');
        replyInput.focus();
        replyBtn.textContent = '送出回覆';
        replyBtn.onclick = sendReply;
    }
}

function sendReply() {
    const replyInput = document.getElementById('note-reply-input');
    const text = (replyInput.value || '').trim();
    if (!text || !lastNoteSenderId) return;

    ws.send({
        type: 'reply_note',
        target_player_id: lastNoteSenderId,
        text: text,
    });

    hide('note-received-overlay');
    replyInput.value = '';
    lastNoteSenderId = null;
}

function updateNoteBadge() {
    // FAB badge
    const fabBadge = document.getElementById('note-badge-fab');
    if (fabBadge) fabBadge.textContent = noteRemaining;
    const fabNote = document.getElementById('fab-note');
    if (fabNote && noteRemaining <= 0) {
        fabNote.style.opacity = '0.3';
        fabNote.style.pointerEvents = 'none';
    }
}

// Setup note input character counter
document.addEventListener('DOMContentLoaded', () => {
    const noteInput = document.getElementById('note-input');
    if (noteInput) {
        noteInput.addEventListener('input', () => {
            const len = noteInput.value.length;
            setText('note-char-count', len);
            updateNoteSendBtn();
        });
    }
});

// ── Ending ──

function onEnding(data) {
    hide('you-taken-overlay');
    hide('taken-away-overlay');

    show('ending-overlay');
    hide('game-phase');

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

    if (data.personal_ending) {
        const pe = data.personal_ending;
        segments.push({
            text: `${pe.ending_icon} ${pe.ending_label}`,
            className: 'ending-personal-label',
            delay: 3000,
        });
        segments.push({
            text: pe.ending_text,
            className: 'ending-personal',
            delay: 1500,
        });
    }

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
        text: `社會恐懼：${data.final_stats.social_fear}　思想流通：${data.final_stats.thought_flow}　你的風險：${data.personal_ending ? data.personal_ending.risk : '?'}`,
        className: 'ending-stats',
        delay: 2000,
    });

    silentAudio.stopAmbient();
    silentAudio.playEndingAmbient();

    typewriterEffect(container, segments).then(() => {
        startReflectionCountdown(container);
    });
}

function startReflectionCountdown(container) {
    const el = document.createElement('div');
    el.className = 'reflection-timer';
    el.id = 'reflection-timer';
    container.appendChild(el);

    let seconds = 60;
    el.textContent = `靜默反思 ${seconds}s`;

    const interval = setInterval(() => {
        seconds--;
        el.textContent = `靜默反思 ${seconds}s`;
        if (seconds <= 0) {
            clearInterval(interval);
            el.textContent = '感謝參與。';
        }
    }, 1000);
}

// ── Post-round Silence ──

function startPostSilence(seconds) {
    show('post-silence-overlay');
    const numEl = document.getElementById('post-silence-number');
    if (numEl) numEl.textContent = seconds;

    const interval = setInterval(() => {
        seconds--;
        if (numEl) numEl.textContent = seconds;
        if (seconds <= 0) {
            clearInterval(interval);
            hide('post-silence-overlay');
        }
    }, 1000);
}

// ── Helpers ──

function showWaiting(msg) {
    switchScreen('game-screen-waiting');
    setText('waiting-msg', msg);
}

// ── Fear Level CSS Management ──

function updateFearLevel(fear) {
    currentFearLevel = fear;
    for (let i = 0; i <= 6; i++) {
        document.body.classList.remove(`fear-${i}`);
    }
    const level = Math.min(fear, 6);
    document.body.classList.add(`fear-${level}`);
    silentAudio.updateAmbientFear(fear);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ── Start ──
init();
