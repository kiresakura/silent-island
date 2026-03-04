#!/usr/bin/env python3
"""
快速填充 bot 到指定房間（房間必須已存在）
或自動建立房間再填充。

用法：
  python3 fill_bots.py           # 自動建房 + 5 bot
  python3 fill_bots.py 9053      # 加入已存在的房間 9053
"""
import asyncio
import json
import random
import sys
import websockets

SERVER_URL = "wss://fabulous-expression-production-7165.up.railway.app/ws"
BOT_NAMES = ["小明", "小華", "阿芬", "志偉", "淑芬"]


async def create_room_and_get_code():
    """用 host WebSocket 建立房間，回傳房間碼"""
    async with websockets.connect(SERVER_URL) as ws:
        await ws.send(json.dumps({"type": "create_room"}))
        raw = await ws.recv()
        msg = json.loads(raw)
        if msg.get("type") == "room_created":
            code = msg["room_code"]
            print(f"✅ 房間已建立: {code}")
            # 保持 host 連線
            return code, ws
    return None, None


async def bot_join(name, room_code, ready_event):
    """單個 bot 加入房間並保持連線"""
    async with websockets.connect(SERVER_URL) as ws:
        await ws.send(json.dumps({
            "type": "join_room",
            "room_code": room_code,
            "player_name": name,
        }))
        raw = await ws.recv()
        msg = json.loads(raw)
        if msg.get("type") == "joined":
            print(f"  ✅ {name} 加入成功 (共 {msg.get('player_count', '?')} 人)")
        elif msg.get("type") == "error":
            print(f"  ❌ {name}: {msg.get('message')}")
            ready_event.set()
            return

        ready_event.set()

        # 保持連線，自動投票
        try:
            current_choices = []
            async for raw in ws:
                msg = json.loads(raw)
                t = msg.get("type", "")

                if t == "game_started":
                    role = msg.get("role", {})
                    print(f"  🎭 {name}: {role.get('name', '?')}")

                elif t == "event":
                    current_choices = [
                        c.get("key", c.get("id", "?"))
                        for c in msg.get("choices", [])
                    ]

                elif t == "voting_open":
                    await asyncio.sleep(random.uniform(0.5, 2))
                    if current_choices:
                        choice = random.choice(current_choices)
                        await ws.send(json.dumps({"type": "vote", "choice": choice}))
                        print(f"  🗳️ {name} 投了 {choice}")

                elif t == "round_result":
                    zone = msg.get("risk_zone", "safe")
                    risk = msg.get("your_risk", "?")
                    print(f"  📊 {name}: 風險 {risk} ({zone})")

                elif t == "ending":
                    personal = msg.get("personal_ending", {})
                    print(f"  🏁 {name}: {personal.get('ending_label', '結束')}")
                    break

                elif t == "observer_mode":
                    print(f"  👁️ {name} 被帶走，觀察者模式")

        except websockets.exceptions.ConnectionClosed:
            pass


async def main():
    room_code = sys.argv[1].upper() if len(sys.argv) > 1 else None
    host_ws = None

    if not room_code:
        # 自動建房間
        host_ws_conn = await websockets.connect(SERVER_URL)
        await host_ws_conn.send(json.dumps({"type": "create_room"}))
        raw = await host_ws_conn.recv()
        msg = json.loads(raw)
        if msg.get("type") == "room_created":
            room_code = msg["room_code"]
            print(f"✅ 房間已建立: {room_code}")
            host_ws = host_ws_conn
        else:
            print(f"❌ 建房失敗: {msg}")
            return

    print(f"🏝️ 送 {len(BOT_NAMES)} 個 bot 進房間 {room_code}...")

    events = []
    tasks = []
    for name in BOT_NAMES:
        evt = asyncio.Event()
        events.append(evt)
        tasks.append(asyncio.create_task(bot_join(name, room_code, evt)))
        await asyncio.sleep(0.3)  # 間隔加入

    # 等所有 bot 加入完成
    for evt in events:
        await asyncio.wait_for(evt.wait(), timeout=10)

    print(f"\n🎉 {len(BOT_NAMES)} 個 bot 已就緒！房間碼: {room_code}")
    print("   Bot 會自動投票，你可以在 host 端操作遊戲")
    print("   按 Ctrl+C 結束\n")

    # 保持連線等待遊戲進行
    try:
        await asyncio.gather(*tasks)
    except KeyboardInterrupt:
        print("\n🛑 結束")
    finally:
        if host_ws:
            await host_ws.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 結束")
