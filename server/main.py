"""
靜默之島：選擇與代價 v2.0 — FastAPI 主程式
"""
from __future__ import annotations

import asyncio
import io
import json
import logging
from pathlib import Path
from typing import Optional

import qrcode
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import HTMLResponse, StreamingResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from .models import GamePhase, MAX_NOTES_PER_GAME, MAX_NOTE_LENGTH
from .room import Room, room_manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("silent-island")

app = FastAPI(title="靜默之島：選擇與代價 v2.0")

# ── 靜態檔案 ──────────────────────────────────────────
CLIENT_DIR = Path(__file__).parent.parent / "client"
REACT_DIR = Path(__file__).parent.parent / "client-react" / "out"

app.mount("/static", StaticFiles(directory=str(CLIENT_DIR)), name="static")

# React 靜態資源（_next/）
_next_dir = REACT_DIR / "_next"
if _next_dir.exists():
    app.mount("/_next", StaticFiles(directory=str(_next_dir)), name="react-next")
else:
    logger.warning(f"React build not found at {REACT_DIR}, /play will return 404")


# ── HTTP Routes ───────────────────────────────────────

@app.get("/")
async def index():
    return HTMLResponse((CLIENT_DIR / "index.html").read_text(encoding="utf-8"))


@app.get("/host")
async def host_page():
    return HTMLResponse((CLIENT_DIR / "host.html").read_text(encoding="utf-8"))


@app.get("/player")
async def player_page():
    """舊版玩家頁面（vanilla JS）"""
    return HTMLResponse((CLIENT_DIR / "player.html").read_text(encoding="utf-8"))


@app.get("/play")
async def react_player_page():
    """React 玩家頁面"""
    html_path = REACT_DIR / "index.html"
    if html_path.exists():
        return HTMLResponse(html_path.read_text(encoding="utf-8"))
    return HTMLResponse("<p>React build not found. Run: cd client-react && npm run build</p>", status_code=404)


@app.get("/join")
async def join_page(room: Optional[str] = None):
    """掃 QR Code 後跳轉到玩家頁面（React 版）"""
    if room:
        html_path = REACT_DIR / "index.html"
        if html_path.exists():
            return RedirectResponse(f"/play?room={room}")
        # fallback 到舊版
        html = (CLIENT_DIR / "player.html").read_text(encoding="utf-8")
        html = html.replace("{{ROOM_CODE}}", room)
        return HTMLResponse(html)
    return RedirectResponse("/")


@app.get("/api/qr/{room_code}")
async def get_qr(room_code: str, request: Request):
    """產生 QR Code 圖片"""
    base_url = str(request.base_url).rstrip("/")
    join_url = f"{base_url}/join?room={room_code}"

    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(join_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="white", back_color="black")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    return StreamingResponse(buf, media_type="image/png")


# ── WebSocket ─────────────────────────────────────────

async def send_json(ws: WebSocket, data: dict):
    """安全發送 JSON"""
    try:
        await ws.send_text(json.dumps(data, ensure_ascii=False))
    except Exception:
        pass


async def broadcast_to_players(room: Room, data: dict, exclude: Optional[str] = None):
    """向所有玩家廣播"""
    for pid, ws in list(room.player_ws.items()):
        if pid == exclude:
            continue
        await send_json(ws, data)


async def broadcast_all(room: Room, data: dict):
    """向關主和所有玩家廣播"""
    if room.host_ws:
        await send_json(room.host_ws, data)
    await broadcast_to_players(room, data)


async def _transition_to_observer(room: Room, player_id: str):
    """5 秒後將被帶走的玩家轉為觀察者模式"""
    await asyncio.sleep(5)
    if room.engine.transition_to_observer(player_id):
        if player_id in room.player_ws:
            await send_json(room.player_ws[player_id], {
                "type": "observer_mode",
                "message": "你已進入觀察者模式。你可以繼續觀看事件和結果，但無法投票、使用能力或傳紙條。",
            })


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    role = None        # "host" or "player"
    room: Optional[Room] = None
    player_id: Optional[str] = None

    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await send_json(ws, {"type": "error", "message": "無效的訊息格式"})
                continue

            msg_type = msg.get("type")

            # ── 建立房間 ──
            if msg_type == "create_room":
                room = room_manager.create_room()
                room.host_ws = ws
                role = "host"
                logger.info(f"Room created: {room.code}")
                await send_json(ws, {
                    "type": "room_created",
                    "room_code": room.code,
                    "qr_url": f"/api/qr/{room.code}",
                })

            # ── 加入房間 ──
            elif msg_type == "join_room":
                code = msg.get("room_code", "").strip()
                name = msg.get("player_name", "").strip()

                if not code or not name:
                    await send_json(ws, {"type": "error", "message": "請輸入房間碼和名字"})
                    continue

                r = room_manager.get_room(code)
                if not r:
                    await send_json(ws, {"type": "error", "message": "房間不存在"})
                    continue

                if r.started:
                    await send_json(ws, {"type": "error", "message": "遊戲已開始，無法加入"})
                    continue

                player = r.add_player(name)
                if not player:
                    await send_json(ws, {"type": "error", "message": "房間已滿（最多 8 人）"})
                    continue

                room = r
                player_id = player.id
                role = "player"
                room.player_ws[player_id] = ws

                logger.info(f"Player {name} ({player_id}) joined room {code}")

                await send_json(ws, {
                    "type": "joined",
                    "player_id": player_id,
                    "player_name": name,
                    "room_code": code,
                    "player_count": room.player_count,
                })

                if room.host_ws:
                    await send_json(room.host_ws, {
                        "type": "player_joined",
                        "player_id": player_id,
                        "player_name": name,
                        "player_count": room.player_count,
                        "players": room.get_player_list(),
                    })

                await broadcast_to_players(room, {
                    "type": "player_joined",
                    "player_name": name,
                    "player_count": room.player_count,
                }, exclude=player_id)

            # ── 開始遊戲 ──
            elif msg_type == "start_game":
                if role != "host" or not room:
                    await send_json(ws, {"type": "error", "message": "只有關主可以開始遊戲"})
                    continue

                if room.player_count < 6:
                    await send_json(ws, {"type": "error", "message": f"至少需要 6 位玩家（目前 {room.player_count} 位）"})
                    continue

                try:
                    roles = room.engine.assign_roles()
                except ValueError as e:
                    await send_json(ws, {"type": "error", "message": str(e)})
                    continue

                room.started = True

                for pid, role_info in roles.items():
                    if pid in room.player_ws:
                        await send_json(room.player_ws[pid], {
                            "type": "game_started",
                            "role": {
                                "role_id": role_info["role_id"],
                                "name": role_info["name"],
                                "passive": role_info["passive"],
                                "ability": role_info["ability"],
                            },
                        })

                await send_json(ws, {
                    "type": "game_started_host",
                    "host_view": room.engine.get_host_view(),
                })

            # ── 下一事件 ──
            elif msg_type == "next_event":
                if role != "host" or not room:
                    continue

                event_data = room.engine.get_next_event()
                if not event_data:
                    await send_json(ws, {"type": "error", "message": "沒有更多事件了"})
                    continue

                # 事件5：自動結算（無投票）
                if event_data["is_auto_settle"]:
                    await broadcast_all(room, {
                        "type": "event",
                        **event_data,
                    })

                    await asyncio.sleep(2)

                    result = room.engine.settle_foreshadows()

                    await send_json(ws, {
                        "type": "foreshadow_settlement",
                        "result": result,
                        "host_view": room.engine.get_host_view(),
                    })

                    for pid, pws in room.player_ws.items():
                        pr = result["player_results"].get(pid, {})
                        is_taken = any(t["player_id"] == pid for t in result.get("taken_away", []))
                        await send_json(pws, {
                            "type": "foreshadow_settlement",
                            "has_foreshadow": pr.get("has_foreshadow", False),
                            "messages": pr.get("messages", []),
                            "narratives": pr.get("narratives", []),
                            "foreshadows": pr.get("foreshadows", []),
                            "coin_flips": pr.get("coin_flips", []),
                            "risk": pr.get("risk", 0),
                            "risk_delta": pr.get("risk_delta", 0),
                            "risk_zone": pr.get("risk_zone", "safe"),
                            "social_fear": result["social_fear"],
                            "thought_flow": result["thought_flow"],
                            "atmosphere_text": result.get("atmosphere_text", ""),
                            "taken_away": result.get("taken_away", []),
                            "you_taken_away": is_taken,
                        })

                    # 觀察者模式：被帶走 5 秒後轉為觀察者
                    for taken in result.get("taken_away", []):
                        taken_pid = taken["player_id"]
                        asyncio.create_task(
                            _transition_to_observer(room, taken_pid)
                        )
                else:
                    for pid, pws in room.player_ws.items():
                        choices = room.engine.get_choices_for_player(pid)
                        await send_json(pws, {
                            "type": "event",
                            "event_number": event_data["event_number"],
                            "title": event_data["title"],
                            "description": event_data["description"],
                            "choices": choices,
                            "is_auto_settle": False,
                        })

                    await send_json(ws, {
                        "type": "event",
                        **event_data,
                        "host_view": room.engine.get_host_view(),
                    })

            # ── 開始沉默倒數 ──
            elif msg_type == "start_silence":
                if role != "host" or not room:
                    continue
                room.engine.state.phase = GamePhase.SILENCE
                atmosphere = room.engine.get_waiting_atmosphere("pre_voting")
                guidance = room.engine.get_host_guidance(
                    room.engine.state.current_event, "pre_silence"
                )
                await broadcast_all(room, {
                    "type": "silence_countdown",
                    "seconds": 30,
                    "atmosphere": atmosphere,
                    "host_guidance": guidance,
                })

            # ── 開始討論 ──
            elif msg_type == "start_discussion":
                if role != "host" or not room:
                    continue
                room.engine.state.phase = GamePhase.DISCUSSION
                guidance = room.engine.get_host_guidance(
                    room.engine.state.current_event, "discussion"
                )
                await broadcast_all(room, {
                    "type": "discussion_start",
                    "seconds": 120,
                    "host_guidance": guidance,
                })

            # ── 開始投票 ──
            elif msg_type == "start_voting":
                if role != "host" or not room:
                    continue
                room.engine.state.phase = GamePhase.VOTING
                atmosphere = room.engine.get_waiting_atmosphere("pre_voting")
                guidance = room.engine.get_host_guidance(
                    room.engine.state.current_event, "voting_open"
                )
                await broadcast_all(room, {
                    "type": "voting_open",
                    "seconds": 30,
                    "public_voting": room.engine.state.public_voting,
                    "atmosphere": atmosphere,
                    "host_guidance": guidance,
                })

            # ── 投票 ──
            elif msg_type == "vote":
                if role != "player" or not room or not player_id:
                    continue

                choice = msg.get("choice", "")
                success = room.engine.submit_vote(player_id, choice)

                if success:
                    await send_json(ws, {
                        "type": "vote_confirmed",
                        "choice": choice,
                    })

                    if room.host_ws:
                        player = room.engine.players[player_id]
                        await send_json(room.host_ws, {
                            "type": "vote_received",
                            "player_id": player_id,
                            "player_name": player.name,
                            "choice": choice,
                            "all_voted": room.engine.all_voted(),
                        })

                    if room.engine.state.public_voting:
                        player = room.engine.players[player_id]
                        await broadcast_to_players(room, {
                            "type": "public_vote",
                            "player_name": player.name,
                            "choice": choice,
                        })
                else:
                    await send_json(ws, {"type": "error", "message": "投票失敗（可能已投票或選項無效）"})

            # ── 投票超時（關主觸發）──
            elif msg_type == "vote_timeout":
                if role != "host" or not room:
                    continue

                # 自動為未投票玩家選迴避
                auto_voted = room.engine.auto_evade_timeout_players()

                # 通知被自動投票的玩家
                for pid in auto_voted:
                    if pid in room.player_ws:
                        evade_key = room.engine.get_evade_choice_key()
                        await send_json(room.player_ws[pid], {
                            "type": "auto_voted",
                            "choice": evade_key,
                            "message": "投票超時，自動選擇迴避。",
                        })

                # 通知關主
                if auto_voted and room.host_ws:
                    names = [room.engine.players[pid].name for pid in auto_voted if pid in room.engine.players]
                    await send_json(room.host_ws, {
                        "type": "auto_voted_notification",
                        "players": names,
                        "message": f"{', '.join(names)} 投票超時，自動選擇迴避。",
                    })

            # ── 結束投票 / 結算 ──
            elif msg_type == "end_voting":
                if role != "host" or not room:
                    continue

                # 先自動為未投票玩家選迴避
                auto_voted = room.engine.auto_evade_timeout_players()
                for pid in auto_voted:
                    if pid in room.player_ws:
                        evade_key = room.engine.get_evade_choice_key()
                        await send_json(room.player_ws[pid], {
                            "type": "auto_voted",
                            "choice": evade_key,
                            "message": "投票超時，自動選擇迴避。",
                        })

                result = room.engine.settle_round()

                await send_json(ws, {
                    "type": "round_result",
                    "result": result,
                    "host_view": room.engine.get_host_view(),
                })

                for pid, pws in room.player_ws.items():
                    pr = result["player_results"].get(pid, {})
                    is_taken = any(t["player_id"] == pid for t in result.get("taken_away", []))
                    await send_json(pws, {
                        "type": "round_result",
                        "social_fear": result["social_fear"],
                        "thought_flow": result["thought_flow"],
                        "your_risk": pr.get("risk", 0),
                        "your_risk_delta": pr.get("risk_delta", 0),
                        "risk_zone": pr.get("risk_zone", "safe"),
                        "messages": pr.get("messages", []),
                        "narrative": pr.get("narrative", ""),
                        "majority_triggered": result.get("majority_triggered", False),
                        "atmosphere_text": result.get("atmosphere_text", ""),
                        "social_narrative": result.get("social_narrative", ""),
                        "risk_warning": result.get("risk_warnings", {}).get(pid, ""),
                        "taken_away": result.get("taken_away", []),
                        "you_taken_away": is_taken,
                        "vote_summary": result.get("vote_summary", {}),
                    })

                # 觀察者模式：被帶走 5 秒後轉為觀察者
                for taken in result.get("taken_away", []):
                    taken_pid = taken["player_id"]
                    asyncio.create_task(
                        _transition_to_observer(room, taken_pid)
                    )

            # ── 使用能力 ──
            elif msg_type == "use_ability":
                if role != "player" or not room or not player_id:
                    continue

                target = msg.get("target_player_id")
                result = room.engine.use_ability(player_id, target)

                await send_json(ws, {
                    "type": "ability_result",
                    **result,
                })

                if room.host_ws and result.get("success"):
                    player = room.engine.players[player_id]
                    await send_json(room.host_ws, {
                        "type": "ability_used",
                        "player_id": player_id,
                        "player_name": player.name,
                        "role_id": player.role_id,
                        "message": result["message"],
                        "host_view": room.engine.get_host_view(),
                    })

                if result.get("success"):
                    player = room.engine.players[player_id]
                    ability_data = room.engine.state.abilities_this_round.get(player_id, {})

                    # 匿名能力廣播
                    broadcast_text = room.engine.get_ability_broadcast_text(player.role_id)
                    await broadcast_to_players(room, {
                        "type": "ability_broadcast",
                        "message": broadcast_text,
                    }, exclude=player_id)

                    if ability_data.get("type") == "F_public_vote":
                        await broadcast_to_players(room, {
                            "type": "public_vote_announced",
                            "message": "⚠ 本回合為公開投票！所有人的選擇將即時可見。選抵抗者風險 +1。",
                        })

            # ── 顯示結局 ──
            elif msg_type == "show_ending":
                if role != "host" or not room:
                    continue

                ending = room.engine.determine_ending()

                await send_json(ws, {
                    "type": "ending",
                    **ending,
                })

                for pid, pws in room.player_ws.items():
                    personal = next(
                        (pe for pe in ending["personal_endings"] if pe["player_id"] == pid),
                        None,
                    )
                    await send_json(pws, {
                        "type": "ending",
                        "social_ending": ending["social_ending"],
                        "personal_ending": personal,
                        "closure_text": ending["closure_text"],
                        "reflection_text": ending["reflection_text"],
                        "final_stats": ending["final_stats"],
                    })

            # ── 取得玩家列表 ──
            elif msg_type == "get_players":
                if role != "player" or not room:
                    continue
                players = [
                    {"id": p.id, "name": p.name}
                    for p in room.engine.players.values()
                    if p.id != player_id and not p.taken_away
                ]
                await send_json(ws, {
                    "type": "player_list",
                    "players": players,
                })

            # ── 匿名紙條 ──
            elif msg_type == "send_note":
                if role != "player" or not room or not player_id:
                    continue

                target_id = msg.get("target_player_id", "")
                note_text = msg.get("text", "").strip()

                sender = room.engine.players.get(player_id)
                target = room.engine.players.get(target_id)

                if not sender or not target:
                    await send_json(ws, {"type": "error", "message": "目標玩家不存在"})
                    continue

                if sender.taken_away:
                    await send_json(ws, {"type": "error", "message": "你已被帶走，無法傳紙條"})
                    continue

                if sender.note_count >= MAX_NOTES_PER_GAME:
                    await send_json(ws, {"type": "error", "message": f"紙條用完了（每場限 {MAX_NOTES_PER_GAME} 次）"})
                    continue

                if not note_text or len(note_text) > MAX_NOTE_LENGTH:
                    await send_json(ws, {"type": "error", "message": f"紙條內容必須在 1-{MAX_NOTE_LENGTH} 字之間"})
                    continue

                if target_id == player_id:
                    await send_json(ws, {"type": "error", "message": "不能傳紙條給自己"})
                    continue

                sender.note_count += 1

                await send_json(ws, {
                    "type": "note_sent",
                    "remaining": MAX_NOTES_PER_GAME - sender.note_count,
                })

                if target_id in room.player_ws:
                    await send_json(room.player_ws[target_id], {
                        "type": "note_received",
                        "text": note_text,
                        "sender_id": player_id,
                    })

            # ── 回覆紙條 ──
            elif msg_type == "reply_note":
                if role != "player" or not room or not player_id:
                    continue

                target_id = msg.get("target_player_id", "")
                note_text = msg.get("text", "").strip()

                sender = room.engine.players.get(player_id)
                target = room.engine.players.get(target_id)

                if not sender or not target:
                    await send_json(ws, {"type": "error", "message": "目標玩家不存在"})
                    continue

                if sender.taken_away:
                    await send_json(ws, {"type": "error", "message": "你已被帶走，無法回覆"})
                    continue

                if sender.note_count >= MAX_NOTES_PER_GAME:
                    await send_json(ws, {"type": "error", "message": f"紙條用完了（每場限 {MAX_NOTES_PER_GAME} 次）"})
                    continue

                if not note_text or len(note_text) > MAX_NOTE_LENGTH:
                    await send_json(ws, {"type": "error", "message": f"回覆內容必須在 1-{MAX_NOTE_LENGTH} 字之間"})
                    continue

                sender.note_count += 1

                await send_json(ws, {
                    "type": "note_sent",
                    "remaining": MAX_NOTES_PER_GAME - sender.note_count,
                })

                if target_id in room.player_ws:
                    await send_json(room.player_ws[target_id], {
                        "type": "note_received",
                        "text": note_text,
                        "sender_id": player_id,
                        "is_reply": True,
                    })

            else:
                await send_json(ws, {"type": "error", "message": f"未知訊息類型: {msg_type}"})

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: role={role}, player_id={player_id}")
        if room and player_id:
            room.remove_player(player_id)
            if room.host_ws:
                await send_json(room.host_ws, {
                    "type": "player_disconnected",
                    "player_id": player_id,
                    "players": room.get_player_list(),
                })
        elif room and role == "host":
            await broadcast_to_players(room, {
                "type": "host_disconnected",
                "message": "關主已斷線",
            })
            room.host_ws = None
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

