"""
靜默之島：選擇與代價 — 房間管理
"""
from __future__ import annotations

import random
import string
from typing import Optional

from fastapi import WebSocket

from .game_engine import GameEngine
from .models import Player


class Room:
    """一個遊戲房間"""

    def __init__(self, code: str):
        self.code = code
        self.engine = GameEngine()
        self.host_ws: Optional[WebSocket] = None
        self.player_ws: dict[str, WebSocket] = {}  # player_id → WebSocket
        self.started = False

    @property
    def player_count(self) -> int:
        return len(self.engine.players)

    def add_player(self, name: str) -> Optional[Player]:
        """加入玩家。超過 8 人回傳 None。"""
        if self.player_count >= 8:
            return None
        if self.started:
            return None

        player = Player(name=name)
        self.engine.players[player.id] = player
        return player

    def remove_player(self, player_id: str):
        """移除玩家"""
        if player_id in self.engine.players:
            self.engine.players[player_id].connected = False
        if player_id in self.player_ws:
            del self.player_ws[player_id]

    def get_player_list(self) -> list[dict]:
        """取得玩家列表"""
        return [
            {
                "id": p.id,
                "name": p.name,
                "connected": p.connected,
            }
            for p in self.engine.players.values()
        ]


class RoomManager:
    """管理所有房間"""

    def __init__(self):
        self.rooms: dict[str, Room] = {}

    def create_room(self) -> Room:
        """建立新房間，產生唯一 4 位數房間碼"""
        while True:
            code = "".join(random.choices(string.digits, k=4))
            if code not in self.rooms:
                break

        room = Room(code)
        self.rooms[code] = room
        return room

    def get_room(self, code: str) -> Optional[Room]:
        return self.rooms.get(code)

    def remove_room(self, code: str):
        if code in self.rooms:
            del self.rooms[code]


# 全域單例
room_manager = RoomManager()
