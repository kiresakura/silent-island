#!/usr/bin/env python3
"""
靜默之島 v3.0 — 全自動完整流程測試
自動建立房間 + 6 bot 加入 + 關主自動推進 6 回合 + 結局
"""
import asyncio
import json
import sys
import random
import websockets

SERVER_URL = "ws://localhost:8001/ws"
BOT_NAMES = ["小明", "小華", "阿芬", "志偉", "淑芬", "建宏"]


async def send(ws, data):
    await ws.send(json.dumps(data, ensure_ascii=False))


async def recv(ws, timeout=10):
    raw = await asyncio.wait_for(ws.recv(), timeout=timeout)
    return json.loads(raw)


async def recv_type(ws, msg_type, timeout=10):
    """等待特定類型的訊息"""
    deadline = asyncio.get_event_loop().time() + timeout
    while True:
        remaining = deadline - asyncio.get_event_loop().time()
        if remaining <= 0:
            raise TimeoutError(f"等待 {msg_type} 超時")
        raw = await asyncio.wait_for(ws.recv(), timeout=remaining)
        msg = json.loads(raw)
        if msg.get("type") == msg_type:
            return msg
        # 印出其他訊息
        # print(f"  [skip] {msg.get('type')}")


async def drain(ws, timeout=0.5):
    """排空 buffer"""
    while True:
        try:
            raw = await asyncio.wait_for(ws.recv(), timeout=timeout)
            msg = json.loads(raw)
            # print(f"  [drain] {msg.get('type')}")
        except (asyncio.TimeoutError, Exception):
            break


class BotPlayer:
    def __init__(self, name):
        self.name = name
        self.ws = None
        self.player_id = None
        self.choices = []
        self.role = None

    async def connect_and_join(self, room_code):
        self.ws = await websockets.connect(SERVER_URL)
        await send(self.ws, {
            "type": "join_room",
            "room_code": room_code,
            "player_name": self.name,
        })
        msg = await recv_type(self.ws, "joined")
        self.player_id = msg["player_id"]
        print(f"  ✅ {self.name} 加入 (ID: {self.player_id})")

    async def wait_game_start(self):
        msg = await recv_type(self.ws, "game_started", timeout=30)
        self.role = msg.get("role", {})
        print(f"  🎭 {self.name} → {self.role.get('name', '?')} ({self.role.get('role_id', '?')})")

    async def handle_round(self):
        """處理一個回合：等待事件→等待投票→投票→等待結果"""
        # 等待事件
        while True:
            raw = await asyncio.wait_for(self.ws.recv(), timeout=30)
            msg = json.loads(raw)
            t = msg.get("type")

            if t == "event":
                self.choices = msg.get("choices", [])
                if msg.get("is_auto_settle"):
                    return "auto_settle"
                break
            elif t in ("round_result", "foreshadow_settlement", "ending"):
                return t

        # 等待投票階段（可能先收到 silence, discussion 等）
        while True:
            raw = await asyncio.wait_for(self.ws.recv(), timeout=60)
            msg = json.loads(raw)
            t = msg.get("type")

            if t == "voting_open":
                break
            elif t in ("round_result", "foreshadow_settlement", "ending"):
                return t

        # 投票
        await asyncio.sleep(random.uniform(0.3, 1))
        if self.choices:
            valid = [c["key"] for c in self.choices if not c.get("disabled")]
            if valid:
                choice = random.choice(valid)
                await send(self.ws, {"type": "vote", "choice": choice})

        # 等待結果
        while True:
            raw = await asyncio.wait_for(self.ws.recv(), timeout=30)
            msg = json.loads(raw)
            t = msg.get("type")

            if t == "round_result":
                return msg
            elif t == "foreshadow_settlement":
                return msg
            elif t == "ending":
                return msg

    async def wait_for_result(self):
        """等待 round_result 或 foreshadow_settlement"""
        while True:
            raw = await asyncio.wait_for(self.ws.recv(), timeout=30)
            msg = json.loads(raw)
            t = msg.get("type")
            if t in ("round_result", "foreshadow_settlement", "ending"):
                return msg

    async def drain_until(self, target_type, timeout=30):
        """排空直到收到目標訊息"""
        deadline = asyncio.get_event_loop().time() + timeout
        while True:
            remaining = deadline - asyncio.get_event_loop().time()
            if remaining <= 0:
                return None
            try:
                raw = await asyncio.wait_for(self.ws.recv(), timeout=remaining)
                msg = json.loads(raw)
                if msg.get("type") == target_type:
                    return msg
            except asyncio.TimeoutError:
                return None


async def main():
    print("🏝️  靜默之島 v3.0 — 全自動測試\n")

    # 1. 關主建立房間
    print("📌 步驟 1：建立房間")
    host_ws = await websockets.connect(SERVER_URL)
    await send(host_ws, {"type": "create_room"})
    msg = await recv_type(host_ws, "room_created")
    room_code = msg["room_code"]
    print(f"  房間碼: {room_code}\n")

    # 2. Bot 加入
    print("📌 步驟 2：Bot 加入")
    bots = [BotPlayer(name) for name in BOT_NAMES]
    for bot in bots:
        await bot.connect_and_join(room_code)
        await drain(host_ws, 0.3)  # 排空關主收到的 player_joined
    print()

    # 3. 開始遊戲
    print("📌 步驟 3：開始遊戲")
    await send(host_ws, {"type": "start_game"})
    msg = await recv_type(host_ws, "game_started_host")
    print(f"  遊戲已開始！玩家數: {len(msg['host_view']['players'])}")

    # 等待每個 bot 收到 game_started
    for bot in bots:
        await bot.wait_game_start()
    print()

    # 4. 執行 6 個回合
    for round_num in range(1, 7):
        print(f"📌 回合 {round_num}/6")

        # 關主推進事件
        await send(host_ws, {"type": "next_event"})
        event_msg = await recv_type(host_ws, "event", timeout=10)
        is_auto = event_msg.get("is_auto_settle", False)
        title = event_msg.get("title", "?")
        print(f"  📜 事件: {title}" + (" (自動清算)" if is_auto else ""))

        # 顯示關主引導
        guidance = event_msg.get("host_guidance", {})
        if guidance and guidance.get("event_shown"):
            print(f"  💡 關主提示: {guidance['event_shown'][:50]}...")

        # 選項描述
        choices = event_msg.get("choices", [])
        for c in choices:
            desc = f" — {c['description']}" if c.get("description") else ""
            print(f"    {c['key']}: {c['label']}{desc}")

        if is_auto:
            # 事件 5：自動清算
            # 排空 bot 的事件訊息
            for bot in bots:
                await drain(bot.ws, 1)

            # 等待關主收到 foreshadow_settlement
            result = await recv_type(host_ws, "foreshadow_settlement", timeout=15)
            r = result.get("result", {})
            print(f"  🎲 伏筆清算: {r.get('foreshadow_count', 0)} 人有伏筆")
            print(f"  恐懼: {r.get('social_fear', '?')}, 流通: {r.get('thought_flow', '?')}")

            taken = r.get("taken_away", [])
            if taken:
                names = ", ".join(t["player_name"] for t in taken)
                print(f"  🚨 被帶走: {names}")

            # 排空 bot 的伏筆訊息
            for bot in bots:
                await drain(bot.ws, 1)

        else:
            # 排空 bot 的事件訊息
            for bot in bots:
                await drain(bot.ws, 0.5)

            # 沉默倒數（縮短為 2 秒測試用）
            await send(host_ws, {"type": "start_silence"})
            await drain(host_ws, 0.5)
            for bot in bots:
                await drain(bot.ws, 0.5)
            print(f"  🤫 沉默...")
            await asyncio.sleep(2)

            # 討論（縮短）
            await send(host_ws, {"type": "start_discussion"})
            await drain(host_ws, 0.5)
            for bot in bots:
                await drain(bot.ws, 0.5)
            print(f"  🗣️ 討論...")
            await asyncio.sleep(1)

            # 開始投票
            await send(host_ws, {"type": "start_voting"})
            await drain(host_ws, 0.5)

            # Bot 投票
            for bot in bots:
                await drain(bot.ws, 0.5)
                if bot.choices:
                    valid = [c["key"] for c in bot.choices if not c.get("disabled")]
                    if valid:
                        choice = random.choice(valid)
                        await send(bot.ws, {"type": "vote", "choice": choice})
                        await asyncio.sleep(0.2)

            await asyncio.sleep(1)
            await drain(host_ws, 0.5)

            # 結束投票
            await send(host_ws, {"type": "end_voting"})

            # 等待結果
            result = await recv_type(host_ws, "round_result", timeout=10)
            r = result.get("result", {})
            print(f"  📊 結算: 恐懼={r.get('social_fear', '?')} 流通={r.get('thought_flow', '?')}")

            # 投票統計
            vs = r.get("vote_summary", {})
            print(f"    服從:{vs.get('comply',0)} 迴避:{vs.get('evade',0)} 抵抗:{vs.get('resist',0)}")

            # 社會情境敘事
            sn = r.get("social_narrative", "")
            if sn:
                print(f"  🌐 {sn[:60]}")

            # 被帶走
            taken = r.get("taken_away", [])
            if taken:
                names = ", ".join(t["player_name"] for t in taken)
                print(f"  🚨 被帶走: {names}")

            # 風險警告
            rw = r.get("risk_warnings", {})
            for pid, warning in rw.items():
                pname = next((p["name"] for p in r.get("player_results", {}).values() if True), pid)
                print(f"  {warning}")

            # 玩家敘事結果
            for pid, pr in r.get("player_results", {}).items():
                narrative = pr.get("narrative", "")
                if narrative:
                    # 找玩家名
                    bot_name = next((b.name for b in bots if b.player_id == pid), pid)
                    print(f"    📖 {bot_name}: {narrative[:50]}...")
                    break  # 只印一個示例

            # 排空 bot 結果
            for bot in bots:
                await drain(bot.ws, 1)

        print()

    # 5. 顯示結局
    print("📌 步驟 5：顯示結局")
    await send(host_ws, {"type": "show_ending"})
    ending = await recv_type(host_ws, "ending", timeout=10)

    se = ending.get("social_ending", {})
    print(f"  🏛️ 社會結局: {se.get('title', '?')}")
    print(f"    {se.get('text', '')[:80]}...")

    pe_list = ending.get("personal_endings", [])
    print(f"\n  個人結局:")
    for pe in pe_list:
        print(f"    {pe.get('ending_icon','')} {pe.get('player_name','?')}（{pe.get('role_name','')}）— {pe.get('ending_label','?')}")

    fs = ending.get("final_stats", {})
    print(f"\n  最終: 恐懼={fs.get('social_fear','?')} 流通={fs.get('thought_flow','?')}")

    print(f"\n  {ending.get('closure_text', '')}")
    print(f"  {ending.get('reflection_text', '')}")

    # 清理
    for bot in bots:
        await bot.ws.close()
    await host_ws.close()

    print("\n✅ 全自動測試完成！")


if __name__ == "__main__":
    asyncio.run(main())
