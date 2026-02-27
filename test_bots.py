#!/usr/bin/env python3
"""
靜默之島 v3.0 — 自動化測試 Bot
6 個 bot 玩家自動加入房間 + 自動投票 + 自動能力使用

使用方法：
  1. 確認 server 在 localhost:8001 跑
  2. 瀏覽器開 localhost:8001 → 建立房間 → 複製房間碼
  3. 執行: python3 test_bots.py <房間碼>
  4. 6 個 bot 會自動加入，你在 host 端操作遊戲
"""
import asyncio
import json
import random
import sys
import websockets

BOT_NAMES = ["小明", "小華", "阿芬", "志偉", "淑芬"]  # 5 bot
SERVER_URL = "ws://localhost:8001/ws"

# 投票策略: random / comply / resist / evade
STRATEGY = "random"


class Bot:
    def __init__(self, name: str, room_code: str):
        self.name = name
        self.room_code = room_code
        self.player_id = None
        self.ws = None
        self.role = None
        self.role_id = None
        self.alive = True
        self.ability_used = False
        self.observer = False
        self.current_choices = []  # 當前可選選項 id

    async def run(self):
        try:
            async with websockets.connect(SERVER_URL) as ws:
                self.ws = ws
                # 加入房間
                await ws.send(json.dumps({
                    "type": "join_room",
                    "room_code": self.room_code,
                    "player_name": self.name,
                }))
                print(f"[{self.name}] 嘗試加入房間 {self.room_code}")

                async for raw in ws:
                    try:
                        msg = json.loads(raw)
                    except json.JSONDecodeError:
                        continue

                    await self.handle(msg)
        except websockets.exceptions.ConnectionClosed:
            print(f"[{self.name}] 斷線")
        except Exception as e:
            print(f"[{self.name}] 錯誤: {e}")

    async def handle(self, msg):
        t = msg.get("type", "")

        if t == "joined":
            self.player_id = msg.get("player_id")
            print(f"[{self.name}] ✅ 加入成功 (ID: {self.player_id})")

        elif t == "error":
            print(f"[{self.name}] ❌ {msg.get('message')}")

        elif t == "game_started":
            role = msg.get("role", {})
            self.role = role.get("name", "?")
            self.role_id = role.get("role_id", "?")
            print(f"[{self.name}] 🎭 角色: {self.role} ({self.role_id})")
            print(f"  被動: {role.get('passive', '無')}")
            print(f"  技能: {role.get('ability', '無')}")

        elif t == "event":
            choices = msg.get("choices", [])
            event_num = msg.get("event_number", "?")
            title = msg.get("title", "?")
            is_auto = msg.get("is_auto_settle", False)
            print(f"[{self.name}] 📜 事件 {event_num}: {title}" + (" (自動清算)" if is_auto else ""))
            self.current_choices = []
            if choices:
                for c in choices:
                    key = c.get("key", c.get("id", "?"))
                    self.current_choices.append(key)
                    disabled = " [禁用]" if c.get("disabled") else ""
                    desc = f" — {c['description']}" if c.get("description") else ""
                    print(f"  - {key}: {c.get('label', '?')}{disabled}{desc}")

        elif t == "voting_open":
            # 30% 機率在投票前使用能力
            if not self.ability_used and not self.observer and random.random() < 0.3:
                await self.auto_use_ability()

            # 自動投票
            await asyncio.sleep(random.uniform(1, 3))  # 模擬思考
            await self.auto_vote()

        elif t == "vote_confirmed":
            choice = msg.get("choice", "?")
            print(f"[{self.name}] 🗳️ 投票確認: {choice}")

        elif t == "auto_voted":
            print(f"[{self.name}] ⏱️ 投票超時，自動迴避")

        elif t == "round_result":
            fear = msg.get("social_fear", "?")
            flow = msg.get("thought_flow", "?")
            risk = msg.get("your_risk", "?")
            zone = msg.get("risk_zone", "?")
            narrative = msg.get("narrative", "")
            social = msg.get("social_narrative", "")
            warning = msg.get("risk_warning", "")
            print(f"[{self.name}] 📊 回合結果 — 恐懼:{fear} 流通:{flow} 風險:{risk} ({zone})")
            if narrative:
                print(f"  📖 {narrative[:60]}...")
            if social:
                print(f"  🌐 {social[:60]}...")
            if warning:
                print(f"  {warning}")
            for m in msg.get("messages", []):
                print(f"  {m}")
            for taken in msg.get("taken_away", []):
                name = taken.get("player_name", "?")
                if msg.get("you_taken_away"):
                    print(f"  🚨 你被帶走了！")
                    self.alive = False
                else:
                    print(f"  🚨 {name} 被帶走了")

        elif t == "foreshadow_settlement":
            if msg.get("has_foreshadow"):
                print(f"[{self.name}] 🎲 伏筆清算!")
                for n in msg.get("narratives", []):
                    print(f"  📖 {n[:60]}...")
                for m in msg.get("messages", []):
                    print(f"  {m}")
                for flip in msg.get("coin_flips", []):
                    print(f"  🪙 擲幣: {'正面 (+10!)' if flip.get('result') == 'heads' else '反面'}")
            risk = msg.get("risk", "?")
            delta = msg.get("risk_delta", 0)
            zone = msg.get("risk_zone", "safe")
            print(f"  風險: {risk} (Δ{delta:+d}) [{zone}]")
            if msg.get("you_taken_away"):
                print(f"  🚨 你被帶走了！")
                self.alive = False

        elif t == "ending":
            social = msg.get("social_ending", {})
            personal = msg.get("personal_ending", {})
            print(f"[{self.name}] 🏁 結局")
            print(f"  社會: {social.get('title', '?')} — {social.get('text', '')[:50]}")
            if personal:
                print(f"  個人: {personal.get('ending_icon', '')} {personal.get('ending_label', '?')} — {personal.get('ending_text', '')[:50]}")

        elif t == "silence_countdown":
            secs = msg.get("seconds", 30)
            atm = msg.get("atmosphere", "")
            print(f"[{self.name}] 🤫 強制沉默 {secs}秒")
            if atm:
                print(f"  🌫️ {atm}")

        elif t == "discussion_start":
            secs = msg.get("seconds", 120)
            print(f"[{self.name}] 🗣️ 討論時間 {secs}秒")

        elif t == "ability_broadcast":
            print(f"[{self.name}] ✨ {msg.get('message', '')}")

        elif t == "ability_result":
            if msg.get("success"):
                print(f"[{self.name}] 🔮 能力: {msg.get('message', '')}")
                self.ability_used = True
            else:
                print(f"[{self.name}] 🔮 能力失敗: {msg.get('message', '')}")

        elif t == "observer_mode":
            self.observer = True
            print(f"[{self.name}] 👁️ 進入觀察者模式")

        elif t == "event_observer":
            print(f"[{self.name}] 👁️ [觀察] 事件 {msg.get('event_number', '?')}: {msg.get('title', '?')}")

        elif t == "note_received":
            text = msg.get("text", "")
            is_reply = msg.get("is_reply", False)
            tag = "回覆" if is_reply else "紙條"
            print(f"[{self.name}] 📝 收到{tag}: {text}")

        elif t == "public_vote_announced":
            print(f"[{self.name}] {msg.get('message', '')}")

        elif t == "public_vote":
            print(f"[{self.name}] 📢 {msg.get('player_name', '?')} 公開投了: {msg.get('choice', '?')}")

        elif t == "player_joined":
            print(f"[{self.name}] 👋 {msg.get('player_name', '?')} 加入 (共 {msg.get('player_count', '?')} 人)")

        elif t == "host_disconnected":
            print(f"[{self.name}] ⚠️ 關主斷線")

        elif t in ("note_sent", "vote_confirmed", "player_list"):
            pass  # 靜默處理

    async def auto_vote(self):
        """根據策略自動投票"""
        if not self.ws or not self.current_choices or self.observer:
            return

        choices = [c for c in self.current_choices]
        if not choices:
            return

        if STRATEGY == "comply":
            choice = choices[0]
        elif STRATEGY == "resist":
            choice = choices[-1]
        elif STRATEGY == "evade":
            choice = choices[1] if len(choices) > 1 else choices[0]
        else:
            choice = random.choice(choices)

        print(f"[{self.name}] 🗳️ 投票: {choice}")
        await self.ws.send(json.dumps({
            "type": "vote",
            "choice": choice,
        }))

    async def auto_use_ability(self):
        """自動使用能力（30% 機率在投票前觸發）"""
        if not self.ws or self.ability_used or self.observer:
            return

        # D 和 G 需要指定目標，隨機選一個
        if self.role_id in ("D", "G"):
            # 先請求玩家列表
            await self.ws.send(json.dumps({"type": "get_players"}))
            await asyncio.sleep(0.5)
            # 簡單發送不帶 target（讓 server 回錯也無妨，測試用）
            print(f"[{self.name}] 🔮 嘗試使用能力 (需目標，跳過)")
            return

        print(f"[{self.name}] 🔮 嘗試使用能力")
        await self.ws.send(json.dumps({
            "type": "use_ability",
        }))


async def main(room_code: str):
    print(f"🏝️ 靜默之島 v3.0 Bot 測試")
    print(f"房間碼: {room_code}")
    print(f"Bot 數量: {len(BOT_NAMES)}")
    print(f"投票策略: {STRATEGY}")
    print("---")

    bots = [Bot(name, room_code) for name in BOT_NAMES]
    tasks = [asyncio.create_task(bot.run()) for bot in bots]

    try:
        await asyncio.gather(*tasks)
    except KeyboardInterrupt:
        print("\n🛑 測試結束")
        for task in tasks:
            task.cancel()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python3 test_bots.py <房間碼> [策略]")
        print("策略: random / comply / resist / evade")
        sys.exit(1)

    room_code = sys.argv[1].upper()
    if len(sys.argv) > 2:
        STRATEGY = sys.argv[2]

    asyncio.run(main(room_code))
