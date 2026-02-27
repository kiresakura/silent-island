"""
靜默之島：選擇與代價 v2.0 — 遊戲邏輯引擎
"""
from __future__ import annotations

import random
from typing import Any, Optional

from .models import (
    CLOSURE_TEXT,
    COMPLY_CHOICES,
    CORE_ROLES,
    ENDINGS,
    EVADE_CHOICES,
    EVENTS,
    EXTRA_ROLES_7,
    EXTRA_ROLES_8,
    FORESHADOW_NARRATIVES,
    HOST_GUIDANCE,
    MORAL_COLLAPSE_CHOICES,
    MORAL_COLLAPSE_TEXT,
    MORAL_COST_CHOICES,
    MORAL_COST_TEXT,
    NARRATIVE_RESULTS,
    ORDINARY_TEXT,
    REFLECTION_TEXT,
    RESIST_CHOICES,
    RISK_WARNING_NARRATIVES,
    SOCIAL_CONTEXT_NARRATIVES,
    SURVIVOR_TEXT,
    TAKEN_AWAY_TEXT,
    WAITING_ATMOSPHERE,
    Foreshadow,
    ForeshadowType,
    GamePhase,
    GameState,
    Player,
    RoleID,
)


class GameEngine:
    """核心遊戲邏輯。一個 Room 持有一個 GameEngine。"""

    def __init__(self):
        self.players: dict[str, Player] = {}  # player_id → Player
        self.state = GameState()

    # ── 氛圍文字 ──────────────────────────────────────

    def get_atmosphere_text(self) -> str:
        """根據當前 social_fear 和 thought_flow 生成情境描述"""
        fear = self.state.social_fear
        flow = self.state.thought_flow

        if fear == 0:
            text = "街上的人談笑風生，陽光照在騎樓下。"
        elif fear <= 2:
            text = "街上的人走路變快了，沒有人在路上停下來聊天。"
        elif fear <= 4:
            text = "鄰居不再打招呼了。晚上的狗叫聲讓每個人都拉上窗簾。"
        elif fear <= 6:
            text = "街上只剩下執行公務的人。其他人都躲在家裡。"
        else:
            text = "連呼吸都覺得是一種冒犯。這座島已經死了。"

        if flow >= 5:
            text += " 地下的聲音越來越多。他們壓不住所有人的嘴。"
        elif flow >= 3:
            text += " 但在某個角落，有人偷偷傳遞著一張紙條…"

        return text

    # ── 角色分配 ──────────────────────────────────────

    def assign_roles(self) -> dict[str, dict]:
        """隨機分配角色。回傳 {player_id: role_info}"""
        player_ids = list(self.players.keys())
        n = len(player_ids)
        if n < 6 or n > 8:
            raise ValueError(f"需要 6-8 位玩家，目前 {n} 位")

        roles = list(CORE_ROLES)  # A, B, C, D

        if n >= 7:
            roles.extend(EXTRA_ROLES_7)  # E, F
        if n >= 8:
            roles.extend(EXTRA_ROLES_8)  # G

        # 補充到跟玩家數量一樣
        while len(roles) < n:
            roles.append(RoleID.E)  # 額外的用一般市民填充

        random.shuffle(roles)
        random.shuffle(player_ids)

        result = {}
        for pid, role in zip(player_ids, roles):
            self.players[pid].role_id = role.value
            result[pid] = self.players[pid].role_info
            result[pid]["role_id"] = role.value

        self.state.phase = GamePhase.EVENT
        return result

    # ── 取得事件 ──────────────────────────────────────

    def get_next_event(self) -> Optional[dict]:
        """推進到下一事件，回傳事件資料。"""
        next_num = self.state.current_event + 1
        if next_num > 6:
            return None

        self.state.current_event = next_num
        self.state.votes_this_round.clear()
        self.state.abilities_this_round.clear()
        self.state.public_voting = False
        self.state.b_cancel_fear = False
        self.state.e_cancel_majority = False

        event = EVENTS[next_num - 1]

        if event.is_auto_settle:
            self.state.phase = GamePhase.AUTO_SETTLE
        else:
            self.state.phase = GamePhase.EVENT

        choices_data = []
        for c in event.choices:
            choices_data.append({
                "key": c.key,
                "label": c.label,
                "description": c.description,
            })

        guidance = HOST_GUIDANCE.get(next_num, {})

        return {
            "event_number": event.number,
            "title": event.title,
            "description": event.description,
            "choices": choices_data,
            "is_auto_settle": event.is_auto_settle,
            "host_guidance": guidance,
        }

    # ── 取得玩家可用選項（考慮 D 角色限制）──────────

    def get_choices_for_player(self, player_id: str) -> list[dict]:
        """回傳玩家可選的選項，D 角色在恐懼≥3 時 disable 抵抗類"""
        event = EVENTS[self.state.current_event - 1]
        player = self.players.get(player_id)
        if not player:
            return []

        choices = []
        for c in event.choices:
            disabled = False
            # D 旁觀者被動：恐懼≥3 不能選抵抗類
            if player.role_id == "D" and self.state.social_fear >= 3:
                if c.key in RESIST_CHOICES:
                    disabled = True
            choices.append({
                "key": c.key,
                "label": c.label,
                "description": c.description,
                "disabled": disabled,
            })
        return choices

    # ── 取得迴避選項 key（用於超時自動選迴避）──────

    def get_evade_choice_key(self) -> Optional[str]:
        """取得目前事件的迴避選項 key"""
        event = EVENTS[self.state.current_event - 1]
        for c in event.choices:
            if c.key in EVADE_CHOICES:
                return c.key
        return None

    # ── 投票超時：自動迴避 ──────────────────────────

    def auto_evade_timeout_players(self) -> list[str]:
        """為所有未投票的玩家自動選迴避。回傳被自動投票的玩家 ID 列表。"""
        evade_key = self.get_evade_choice_key()
        if not evade_key:
            return []

        auto_voted = []
        for pid, player in self.players.items():
            if player.connected and not player.taken_away and pid not in self.state.votes_this_round:
                self.state.votes_this_round[pid] = evade_key
                player.votes[self.state.current_event] = evade_key
                auto_voted.append(pid)
        return auto_voted

    # ── 能力使用 ──────────────────────────────────────

    def use_ability(self, player_id: str, target_player_id: Optional[str] = None) -> dict:
        """使用角色一次性能力。"""
        player = self.players.get(player_id)
        if not player:
            return {"success": False, "message": "玩家不存在"}
        if player.ability_used:
            return {"success": False, "message": "能力已經使用過了"}
        if not player.role_id:
            return {"success": False, "message": "尚未分配角色"}

        role = player.role_id
        result: dict[str, Any] = {"success": True, "message": ""}

        if role == "A":
            # 字斟句酌：迴避不產生伏筆
            player.ability_used = True
            self.state.abilities_this_round[player_id] = {"type": "A_no_foreshadow"}
            result["message"] = "能力已啟動：本次「迴避」不會產生伏筆。"

        elif role == "B":
            # 體制潤滑：取消恐懼+1
            player.ability_used = True
            self.state.b_cancel_fear = True
            self.state.abilities_this_round[player_id] = {"type": "B_cancel_fear"}
            result["message"] = "能力已啟動：本回合取消一次社會恐懼 +1。"

        elif role == "C":
            # 理想之火：將自己的+1風險改為恐懼+1
            player.ability_used = True
            self.state.abilities_this_round[player_id] = {"type": "C_risk_to_fear"}
            result["message"] = "能力已啟動：本回合你的 +1 風險將轉為社會恐懼 +1。"

        elif role == "D":
            # 挺身而出：替人承擔+1風險
            if not target_player_id or target_player_id not in self.players:
                return {"success": False, "message": "需要指定一位目標玩家"}
            player.ability_used = True
            self.state.abilities_this_round[player_id] = {
                "type": "D_take_risk",
                "target": target_player_id,
            }
            target_name = self.players[target_player_id].name
            result["message"] = f"能力已啟動：你將替 {target_name} 承擔一次 +1 風險。"

        elif role == "E":
            # 沉默多數：取消多數壓力恐懼
            player.ability_used = True
            self.state.e_cancel_majority = True
            self.state.abilities_this_round[player_id] = {"type": "E_cancel_majority"}
            result["message"] = "能力已啟動：本回合取消「多數壓力」的恐懼 +1。"

        elif role == "F":
            # 公開審查：公開投票
            player.ability_used = True
            self.state.public_voting = True
            self.state.abilities_this_round[player_id] = {"type": "F_public_vote"}
            result["message"] = "能力已啟動：本回合為公開投票，選抵抗者額外 +1 風險。"

        elif role == "G":
            # 庇護：將目標的+1風險轉為恐懼+1
            if not target_player_id or target_player_id not in self.players:
                return {"success": False, "message": "需要指定一位目標玩家"}
            player.ability_used = True
            self.state.abilities_this_round[player_id] = {
                "type": "G_risk_to_fear",
                "target": target_player_id,
            }
            target_name = self.players[target_player_id].name
            result["message"] = f"能力已啟動：{target_name} 的 +1 風險將轉為社會恐懼 +1。"

        else:
            return {"success": False, "message": "無可用能力"}

        return result

    # ── 投票 ──────────────────────────────────────────

    def submit_vote(self, player_id: str, choice: str) -> bool:
        """提交投票。回傳是否成功。"""
        if self.state.phase != GamePhase.VOTING:
            return False
        if player_id in self.state.votes_this_round:
            return False  # 已投票不可更改
        player = self.players.get(player_id)
        if not player:
            return False
        if player.taken_away:
            return False  # 被帶走的玩家不能投票

        # 驗證選項有效
        event = EVENTS[self.state.current_event - 1]
        valid_keys = [c.key for c in event.choices]
        if choice not in valid_keys:
            return False

        # D 角色限制：恐懼≥3 不能選抵抗類
        if player.role_id == "D" and self.state.social_fear >= 3 and choice in RESIST_CHOICES:
            return False

        self.state.votes_this_round[player_id] = choice
        player.votes[self.state.current_event] = choice
        return True

    def all_voted(self) -> bool:
        """是否所有連線中的玩家都已投票"""
        for pid, p in self.players.items():
            if p.connected and not p.taken_away and pid not in self.state.votes_this_round:
                return False
        return True

    # ── 結算 ──────────────────────────────────────────

    def settle_round(self) -> dict:
        """結算本回合。回傳結算結果。"""
        event_num = self.state.current_event
        event = EVENTS[event_num - 1]
        self.state.phase = GamePhase.SETTLING

        fear_delta = 0
        flow_delta = 0
        player_results: dict[str, dict] = {}

        for pid in self.players:
            player_results[pid] = {"risk_delta": 0, "messages": [], "narrative": ""}

        # ── 處理每個玩家的投票 ──
        for pid, choice in self.state.votes_this_round.items():
            player = self.players[pid]
            pr = player_results[pid]

            # 追蹤服從選項
            if choice in COMPLY_CHOICES:
                player.ever_complied = True

            # 追蹤道德代價
            if choice in MORAL_COST_CHOICES:
                player.moral_cost = True

            # 追蹤道德崩解
            if choice in MORAL_COLLAPSE_CHOICES:
                player.moral_collapse = True

            if event_num == 1:
                # 事件1：服從(恐懼+1)，迴避(伏筆:模糊)，抵抗(流通+1,風險+1)
                if choice == "comply":
                    fear_delta += 1
                elif choice == "evade":
                    # A 角色能力：迴避不產生伏筆
                    a_active = (player.role_id == "A" and
                                pid in self.state.abilities_this_round and
                                self.state.abilities_this_round[pid].get("type") == "A_no_foreshadow")
                    if not a_active:
                        player.foreshadows.append(
                            Foreshadow(pid, ForeshadowType.VAGUE, event_num)
                        )
                        pr["messages"].append("⚠️ 這筆帳記下了，第 5 回合清算")
                    else:
                        pr["messages"].append("能力效果：迴避未產生伏筆。")
                elif choice == "resist":
                    flow_delta += 1
                    pr["risk_delta"] += 1

            elif event_num == 2:
                # 事件2：安撫(恐懼-1)，沉默(伏筆:沉默)，提供資訊(風險-1,🩸道德代價)
                if choice == "comfort":
                    fear_delta -= 1
                elif choice == "silence":
                    player.foreshadows.append(
                        Foreshadow(pid, ForeshadowType.SILENCE, event_num)
                    )
                    pr["messages"].append("⚠️ 這筆帳記下了，第 5 回合清算")
                elif choice == "info":
                    pr["risk_delta"] -= 1
                    pr["messages"].append("🩸 你提供了資訊。道德代價。")

            elif event_num == 3:
                # 事件3：遠離(風險-1)，提醒(流通+1,風險+1)，舉報(流通-1,風險-1,🩸道德代價)
                if choice == "avoid":
                    pr["risk_delta"] -= 1
                elif choice == "warn":
                    flow_delta += 1
                    pr["risk_delta"] += 1
                elif choice == "report":
                    flow_delta -= 1
                    pr["risk_delta"] -= 1
                    pr["messages"].append("🩸 你舉報了他們。道德代價。")

            elif event_num == 4:
                # 事件4：配合(恐懼+1)，模糊(伏筆:模糊)，拒絕(風險+2)
                if choice == "cooperate":
                    fear_delta += 1
                elif choice == "vague":
                    a_active = (player.role_id == "A" and
                                pid in self.state.abilities_this_round and
                                self.state.abilities_this_round[pid].get("type") == "A_no_foreshadow")
                    if not a_active:
                        player.foreshadows.append(
                            Foreshadow(pid, ForeshadowType.VAGUE, event_num)
                        )
                        pr["messages"].append("⚠️ 這筆帳記下了，第 5 回合清算")
                    else:
                        pr["messages"].append("能力效果：迴避未產生伏筆。")
                elif choice == "refuse":
                    pr["risk_delta"] += 2

            elif event_num == 6:
                # 事件6：全面接受(恐懼+2,風險-2,💀道德崩解)，拖延(無效果)，公開拒絕(流通+1,風險+2)
                if choice == "accept":
                    fear_delta += 2
                    pr["risk_delta"] -= 2
                    pr["messages"].append("💀 你簽署了聲明。道德崩解。")
                elif choice == "delay":
                    # v2.0: 拖延敷衍 = 無效果
                    pr["messages"].append("你選擇了拖延敷衍。什麼也沒有發生。")
                elif choice == "refuse":
                    flow_delta += 1
                    pr["risk_delta"] += 2

        # ── 敘事結果文字 ──
        event_narratives = NARRATIVE_RESULTS.get(event_num, {})
        for pid, choice in self.state.votes_this_round.items():
            narrative = event_narratives.get(choice, "")
            if narrative:
                player_results[pid]["narrative"] = narrative

        # ── 角色被動效果 ──
        for pid, player in self.players.items():
            if not player.connected:
                continue
            pr = player_results[pid]
            choice = self.state.votes_this_round.get(pid)

            # A 教師被動：「眾目所視」第 2、4、6 回合結算後，社會恐懼 +1
            if player.role_id == "A" and event_num in (2, 4, 6):
                fear_delta += 1
                pr["messages"].append("教師被動「眾目所視」觸發：社會恐懼 +1。")

            # B 公務員被動：選抵抗風險+1
            if player.role_id == "B" and choice in RESIST_CHOICES:
                pr["risk_delta"] += 1
                pr["messages"].append("公務員被動「服從義務」觸發：風險額外 +1。")

            # C 大學生被動：選抵抗風險+1
            if player.role_id == "C" and choice in RESIST_CHOICES:
                pr["risk_delta"] += 1
                pr["messages"].append("大學生被動「激進標籤」觸發：風險額外 +1。")

        # ── F 公開審查效果：選抵抗者額外+1風險 ──
        if self.state.public_voting:
            for pid, choice in self.state.votes_this_round.items():
                if choice in RESIST_CHOICES:
                    player_results[pid]["risk_delta"] += 1
                    player_results[pid]["messages"].append("公開審查效果：抵抗者風險額外 +1。")

        # ── 高流通風險：思想流通≥3 時，選抵抗者風險+1 ──
        current_flow = self.state.thought_flow + flow_delta
        if current_flow >= 3:
            for pid, choice in self.state.votes_this_round.items():
                if choice in RESIST_CHOICES:
                    player_results[pid]["risk_delta"] += 1
                    player_results[pid]["messages"].append("高流通風險：思想流通≥3，抵抗者風險 +1。")

        # ── 多數壓力判定：5人或以上選服從 → 恐懼+1 ──
        comply_count = 0
        for pid, choice in self.state.votes_this_round.items():
            if choice in COMPLY_CHOICES:
                comply_count += 1

        majority_fear = False
        if comply_count >= 5:
            majority_fear = True
            if not self.state.e_cancel_majority:
                fear_delta += 1

        # ── B 角色取消恐懼 ──
        if self.state.b_cancel_fear and fear_delta > 0:
            fear_delta -= 1

        # ── C 角色能力：風險→恐懼 ──
        for pid, ability in self.state.abilities_this_round.items():
            if ability.get("type") == "C_risk_to_fear":
                pr = player_results[pid]
                if pr["risk_delta"] > 0:
                    pr["risk_delta"] -= 1
                    fear_delta += 1

        # ── D 角色能力：替人承擔風險 ──
        for pid, ability in self.state.abilities_this_round.items():
            if ability.get("type") == "D_take_risk":
                target = ability["target"]
                if target in player_results:
                    target_pr = player_results[target]
                    if target_pr["risk_delta"] > 0:
                        target_pr["risk_delta"] -= 1
                        player_results[pid]["risk_delta"] += 1
                        player_results[pid]["messages"].append(
                            f"你替 {self.players[target].name} 承擔了風險。"
                        )

        # ── G 角色能力：目標風險→恐懼 ──
        for pid, ability in self.state.abilities_this_round.items():
            if ability.get("type") == "G_risk_to_fear":
                target = ability["target"]
                if target in player_results:
                    target_pr = player_results[target]
                    if target_pr["risk_delta"] > 0:
                        target_pr["risk_delta"] -= 1
                        fear_delta += 1

        # ── 套用結果 ──
        self.state.social_fear += fear_delta
        self.state.social_fear = max(0, self.state.social_fear)
        self.state.thought_flow += flow_delta
        self.state.thought_flow = max(0, self.state.thought_flow)

        for pid, pr in player_results.items():
            player = self.players[pid]
            player.risk += pr["risk_delta"]
            player.risk = max(0, player.risk)

        # ── 投票統計 ──
        comply_total = 0
        evade_total = 0
        resist_total = 0
        for pid, choice in self.state.votes_this_round.items():
            if choice in COMPLY_CHOICES:
                comply_total += 1
            elif choice in EVADE_CHOICES:
                evade_total += 1
            elif choice in RESIST_CHOICES:
                resist_total += 1

        # ── 被帶走檢查 ──
        taken_away_players = []
        for pid, player in self.players.items():
            if player.risk >= 10 and not player.taken_away:
                player.taken_away = True
                taken_away_players.append({
                    "player_id": pid,
                    "player_name": player.name,
                })

        # ── 氛圍文字 ──
        atmosphere_text = self.get_atmosphere_text()

        # ── 社會情境敘事 ──
        social_narrative = self._get_social_narrative(comply_total, evade_total, resist_total)

        # ── 風險警告 ──
        risk_warnings: dict[str, str] = {}
        for pid, player in self.players.items():
            warning = self._get_risk_warning(player.risk)
            if warning:
                risk_warnings[pid] = warning

        return {
            "event_number": event_num,
            "social_fear": self.state.social_fear,
            "thought_flow": self.state.thought_flow,
            "fear_delta": fear_delta,
            "flow_delta": flow_delta,
            "majority_triggered": majority_fear,
            "public_voting": self.state.public_voting,
            "vote_summary": {
                "comply": comply_total,
                "evade": evade_total,
                "resist": resist_total,
            },
            "taken_away": taken_away_players,
            "atmosphere_text": atmosphere_text,
            "social_narrative": social_narrative,
            "risk_warnings": risk_warnings,
            "player_results": {
                pid: {
                    "risk": self.players[pid].risk,
                    "risk_delta": pr["risk_delta"],
                    "risk_zone": self._get_risk_zone(self.players[pid].risk),
                    "messages": pr["messages"],
                    "narrative": pr["narrative"],
                    "choice": self.state.votes_this_round.get(pid, ""),
                }
                for pid, pr in player_results.items()
            },
        }

    # ── 事件 5 伏筆清算 ──────────────────────────────

    def settle_foreshadows(self) -> dict:
        """
        事件5：自動結算所有伏筆。
        v2.0 規則：
        - 沉默標記：社會恐懼 +2（每個）
        - 模糊標記：個人風險 +5，擲幣 50% → 再 +10
        - 集體代價：每 2 位有伏筆的玩家 → 額外社會恐懼 +1
        """
        self.state.phase = GamePhase.SETTLING

        fear_delta = 0
        player_results: dict[str, dict] = {}
        players_with_foreshadow = set()

        for pid in self.players:
            player_results[pid] = {
                "risk_delta": 0,
                "messages": [],
                "narratives": [],
                "has_foreshadow": False,
                "coin_flips": [],  # [{result: "heads"/"tails", extra_risk: int}]
            }

        for pid, player in self.players.items():
            if not player.foreshadows:
                continue

            players_with_foreshadow.add(pid)
            player_results[pid]["has_foreshadow"] = True

            for fs in player.foreshadows:
                if fs.ftype == ForeshadowType.SILENCE:
                    # 沉默標記：社會恐懼 +2
                    fear_delta += 2
                    player_results[pid]["messages"].append(
                        FORESHADOW_NARRATIVES["silence_result"]
                    )
                    player_results[pid]["narratives"].append(
                        FORESHADOW_NARRATIVES["silence_intro"]
                    )
                elif fs.ftype == ForeshadowType.VAGUE:
                    # 模糊標記：風險 +5，擲幣 50% → +10
                    player_results[pid]["risk_delta"] += 5
                    coin = random.choice(["heads", "tails"])
                    extra = 10 if coin == "heads" else 0
                    player_results[pid]["risk_delta"] += extra
                    player_results[pid]["coin_flips"].append({
                        "event": fs.event_number,
                        "result": coin,
                        "extra_risk": extra,
                    })
                    player_results[pid]["narratives"].append(
                        FORESHADOW_NARRATIVES["vague_intro"]
                    )
                    if coin == "heads":
                        player_results[pid]["messages"].append(
                            FORESHADOW_NARRATIVES["vague_result_heads"]
                        )
                    else:
                        player_results[pid]["messages"].append(
                            FORESHADOW_NARRATIVES["vague_result_tails"]
                        )

        # 集體代價：每 2 位有伏筆的玩家 → 額外恐懼+1
        foreshadow_count = len(players_with_foreshadow)
        extra_fear = foreshadow_count // 2
        fear_delta += extra_fear

        # 套用
        self.state.social_fear += fear_delta
        self.state.social_fear = max(0, self.state.social_fear)

        for pid, pr in player_results.items():
            self.players[pid].risk += pr["risk_delta"]
            self.players[pid].risk = max(0, self.players[pid].risk)

        # ── 被帶走檢查 ──
        taken_away_players = []
        for pid, player in self.players.items():
            if player.risk >= 10 and not player.taken_away:
                player.taken_away = True
                taken_away_players.append({
                    "player_id": pid,
                    "player_name": player.name,
                })

        # ── 氛圍文字 ──
        atmosphere_text = self.get_atmosphere_text()

        return {
            "event_number": 5,
            "social_fear": self.state.social_fear,
            "thought_flow": self.state.thought_flow,
            "fear_delta": fear_delta,
            "foreshadow_count": foreshadow_count,
            "extra_fear_from_count": extra_fear,
            "taken_away": taken_away_players,
            "atmosphere_text": atmosphere_text,
            "player_results": {
                pid: {
                    "risk": self.players[pid].risk,
                    "risk_delta": pr["risk_delta"],
                    "risk_zone": self._get_risk_zone(self.players[pid].risk),
                    "has_foreshadow": pr["has_foreshadow"],
                    "messages": pr["messages"],
                    "narratives": pr["narratives"],
                    "coin_flips": pr["coin_flips"],
                    "foreshadows": [
                        {"type": fs.ftype.value, "event": fs.event_number}
                        for fs in self.players[pid].foreshadows
                    ],
                }
                for pid, pr in player_results.items()
            },
        }

    # ── 結局判定 ──────────────────────────────────────

    def determine_ending(self) -> dict:
        """判定社會結局與個人結局"""
        fear = self.state.social_fear
        flow = self.state.thought_flow

        # v2.0 社會結局判定（按優先順序）
        # C 全面噤聲：恐懼≥6
        # E 短暫的春天：恐懼=0, 流通≥4
        # A 表面穩定：恐懼≥4, 流通≤1
        # B 緊繃未崩：恐懼≥4, 流通 2-3
        # D 裂縫中的光：恐懼≤2, 流通≥2
        social_ending_key = None
        if fear >= 6:
            social_ending_key = "C"
        elif fear == 0 and flow >= 4:
            social_ending_key = "E"
        elif fear >= 4 and flow <= 1:
            social_ending_key = "A"
        elif fear >= 4 and 2 <= flow <= 3:
            social_ending_key = "B"
        elif fear <= 2 and flow >= 2:
            social_ending_key = "D"

        # 若都不符合，取最接近的
        if social_ending_key is None:
            social_ending_key = self._find_closest_ending(fear, flow)

        social_ending = ENDINGS[social_ending_key]

        # v2.0 個人結局
        personal_endings = []
        for pid, player in self.players.items():
            pe = self._determine_personal_ending(player)
            personal_endings.append({
                "player_id": pid,
                "player_name": player.name,
                "role_id": player.role_id,
                "role_name": player.role_info["name"],
                "risk": player.risk,
                **pe,
            })

        self.state.phase = GamePhase.ENDED

        return {
            "social_ending": {
                "key": social_ending_key,
                "title": social_ending["title"],
                "text": social_ending["text"],
            },
            "personal_endings": personal_endings,
            "closure_text": CLOSURE_TEXT,
            "reflection_text": REFLECTION_TEXT,
            "final_stats": {
                "social_fear": fear,
                "thought_flow": flow,
            },
        }

    def _determine_personal_ending(self, player: Player) -> dict:
        """判定單一玩家的個人結局"""
        # 🚨 被帶走：風險≥10
        if player.risk >= 10:
            return {
                "ending_type": "taken_away",
                "ending_icon": "🚨",
                "ending_label": "被帶走",
                "ending_text": TAKEN_AWAY_TEXT,
                "taken_away": True,
            }
        # 💀 道德崩解：曾選「全面接受」
        if player.moral_collapse:
            return {
                "ending_type": "moral_collapse",
                "ending_icon": "💀",
                "ending_label": "道德崩解",
                "ending_text": MORAL_COLLAPSE_TEXT,
                "taken_away": False,
            }
        # 🩸 道德印記：曾選「提供資訊」或「舉報」
        if player.moral_cost:
            return {
                "ending_type": "moral_cost",
                "ending_icon": "🩸",
                "ending_label": "道德印記",
                "ending_text": MORAL_COST_TEXT,
                "taken_away": False,
            }
        # 🕊️ 倖存的良心：風險≤2 且未選過任何服從選項
        if player.risk <= 2 and not player.ever_complied:
            return {
                "ending_type": "survivor",
                "ending_icon": "🕊️",
                "ending_label": "倖存的良心",
                "ending_text": SURVIVOR_TEXT,
                "taken_away": False,
            }
        # 📎 普通人：其他
        return {
            "ending_type": "ordinary",
            "ending_icon": "📎",
            "ending_label": "普通人",
            "ending_text": ORDINARY_TEXT,
            "taken_away": False,
        }

    def _find_closest_ending(self, fear: int, flow: int) -> str:
        """找最接近的結局"""
        targets = {
            "C": (6, None),
            "A": (5, 0.5),
            "B": (5, 2.5),
            "E": (0, 4),
            "D": (1, 3),
        }

        best_key = "A"
        best_dist = float("inf")

        for key, (tf, tfl) in targets.items():
            if tfl is None:
                dist = abs(fear - tf)
            else:
                dist = ((fear - tf) ** 2 + (flow - tfl) ** 2) ** 0.5
            if dist < best_dist:
                best_dist = dist
                best_key = key

        return best_key

    # ── 輔助 ──────────────────────────────────────────

    def get_host_view(self) -> dict:
        """關主視角：所有資訊"""
        players_data = []
        for pid, player in self.players.items():
            players_data.append({
                "id": pid,
                "name": player.name,
                "role_id": player.role_id,
                "role_name": player.role_info["name"] if player.role_id else "未分配",
                "risk": player.risk,
                "moral_cost": player.moral_cost,
                "moral_collapse": player.moral_collapse,
                "ability_used": player.ability_used,
                "connected": player.connected,
                "taken_away": player.taken_away,
                "foreshadows": [
                    {"type": fs.ftype.value, "event": fs.event_number}
                    for fs in player.foreshadows
                ],
                "votes": player.votes,
            })

        return {
            "social_fear": self.state.social_fear,
            "thought_flow": self.state.thought_flow,
            "current_event": self.state.current_event,
            "phase": self.state.phase.value,
            "players": players_data,
        }

    # ── v3.0 輔助方法 ────────────────────────────────────

    def _get_risk_zone(self, risk: int) -> str:
        """根據風險值回傳風險區間"""
        if risk >= 10:
            return "taken"
        elif risk >= 7:
            return "danger"
        elif risk >= 4:
            return "caution"
        return "safe"

    def _get_risk_warning(self, risk: int) -> str:
        """根據風險值回傳警告文字（7/8/9 時觸發）"""
        return RISK_WARNING_NARRATIVES.get(risk, "")

    def _get_social_narrative(self, comply: int, evade: int, resist: int) -> str:
        """根據投票分佈生成社會情境敘事"""
        total = comply + evade + resist
        if total == 0:
            return ""
        if comply == total:
            return SOCIAL_CONTEXT_NARRATIVES["all_comply"]
        if resist == total:
            return SOCIAL_CONTEXT_NARRATIVES["all_resist"]
        if comply > total / 2:
            return SOCIAL_CONTEXT_NARRATIVES["majority_comply"]
        if resist > total / 2:
            return SOCIAL_CONTEXT_NARRATIVES["majority_resist"]
        return SOCIAL_CONTEXT_NARRATIVES["split"]

    def get_ability_broadcast_text(self, role_id: str) -> str:
        """匿名能力廣播文字（不透露使用者身份）"""
        texts = {
            "A": "有人謹慎地選擇了措辭……",
            "B": "有人動用了體制內的關係……",
            "C": "一股年輕的力量在暗中流動……",
            "D": "有人默默站了出來……",
            "E": "沉默的大多數發出了聲音……",
            "F": "有人動用了權力……空氣變得緊張。",
            "G": "有人伸出了保護的手……",
        }
        return texts.get(role_id, "有人使用了能力……")

    def transition_to_observer(self, player_id: str) -> bool:
        """將被帶走的玩家轉為觀察者模式"""
        player = self.players.get(player_id)
        if player and player.taken_away and not player.observer_mode:
            player.observer_mode = True
            return True
        return False

    def get_waiting_atmosphere(self, context: str) -> str:
        """取得隨機等待氛圍文字"""
        texts = WAITING_ATMOSPHERE.get(context, [])
        if texts:
            return random.choice(texts)
        return ""

    def get_host_guidance(self, event_number: int, phase: str) -> str:
        """取得關主引導提示"""
        return HOST_GUIDANCE.get(event_number, {}).get(phase, "")
