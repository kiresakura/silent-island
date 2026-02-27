"""
靜默之島：選擇與代價 v2.0 — 資料模型
"""
from __future__ import annotations

import enum
import uuid
from dataclasses import dataclass, field
from typing import Any, Optional


# ── 角色 ──────────────────────────────────────────────

class RoleID(str, enum.Enum):
    A = "A"  # 中學教師
    B = "B"  # 公務員
    C = "C"  # 大學生
    D = "D"  # 旁觀者
    E = "E"  # 一般市民
    F = "F"  # 基層執行者
    G = "G"  # 親屬


ROLE_INFO: dict[str, dict[str, str]] = {
    "A": {
        "name": "中學教師",
        "passive": "眾目所視：第 2、4、6 回合結算後，社會恐懼 +1。",
        "ability": "字斟句酌（一次性）：你選擇「迴避」時，不會產生伏筆。",
    },
    "B": {
        "name": "公務員",
        "passive": "服從義務：若你選擇「抵抗」，個人風險額外 +1。",
        "ability": "體制潤滑（一次性）：取消本回合社會恐懼 +1（任何來源的一次）。",
    },
    "C": {
        "name": "大學生",
        "passive": "激進標籤：若你選擇「抵抗」，個人風險額外 +1。",
        "ability": "理想之火（一次性）：將你本回合的 +1 風險改為社會恐懼 +1。",
    },
    "D": {
        "name": "旁觀者",
        "passive": "噤聲效應：當社會恐懼 ≥ 3 時，你無法選擇「抵抗」。",
        "ability": "挺身而出（一次性）：替另一位玩家承擔一次 +1 風險。",
    },
    "E": {
        "name": "一般市民",
        "passive": "無特殊被動效果。",
        "ability": "沉默多數（一次性）：取消本回合「多數壓力」造成的社會恐懼 +1。",
    },
    "F": {
        "name": "基層執行者",
        "passive": "無特殊被動效果。",
        "ability": "公開審查（一次性）：本回合為公開投票。選擇「抵抗」的人額外 +1 風險。",
    },
    "G": {
        "name": "親屬",
        "passive": "無特殊被動效果。",
        "ability": "庇護（一次性）：將任一位玩家的 +1 風險轉為社會恐懼 +1。",
    },
}

# 核心角色（必定分配）
CORE_ROLES = [RoleID.A, RoleID.B, RoleID.C, RoleID.D]
# 擴充角色
EXTRA_ROLES_7 = [RoleID.E, RoleID.F]
EXTRA_ROLES_8 = [RoleID.G]


# ── 事件 ──────────────────────────────────────────────

@dataclass
class EventChoice:
    key: str           # e.g. "comply", "evade", "resist"
    label: str         # 顯示文本
    is_comply: bool = False  # 是否屬於「服從類」（多數壓力判定用）
    description: str = ""    # 情境化描述


@dataclass
class GameEvent:
    number: int
    title: str
    description: str
    choices: list[EventChoice]
    is_auto_settle: bool = False  # 事件 5 自動結算


EVENTS: list[GameEvent] = [
    GameEvent(
        number=1,
        title="思想調查",
        description="上級發出通知，要求所有機構進行一次「思想狀態普查」。每個人都被要求填寫一份問卷，內容涉及你對當前社會制度的看法。你的主管暗示：「照實填就好了，大家都知道該怎麼寫。」",
        choices=[
            EventChoice("comply", "照實填寫問卷", is_comply=True,
                        description="你用最安全的措辭填完了問卷。你知道答案都是對的。"),
            EventChoice("evade", "裝病拖延",
                        description="你說你身體不舒服，想晚幾天交。主管的表情變了。"),
            EventChoice("resist", "寫出真心話",
                        description="你寫下了你真正的想法。筆尖在紙上劃出沙沙聲。"),
        ],
    ),
    GameEvent(
        number=2,
        title="同事私下詢問",
        description="一位你信任的同事在午休時湊過來，壓低聲音問你：「你有沒有聽說最近有人被約談？」他看起來很焦慮，似乎需要一些確認或安撫。",
        choices=[
            EventChoice("comfort", "安撫同事", is_comply=True,
                        description="你拍了拍他的肩：「放心，沒事的。」你不確定這是不是謊話。"),
            EventChoice("silence", "保持沉默",
                        description="你假裝沒聽到，低頭繼續吃飯。筷子夾起的菜沒有味道。"),
            EventChoice("info", "提供你知道的資訊",
                        description="你壓低聲音告訴他你聽到的名字。他的眼睛裡閃過恐懼。"),
        ],
    ),
    GameEvent(
        number=3,
        title="讀書會傳聞",
        description="你聽說有人私下組織了讀書會，討論一些「不太適當」的書籍。有人認為這只是一般的文學交流，但也有傳聞說上面已經在調查了。你認識其中幾個人。",
        choices=[
            EventChoice("avoid", "遠離那些人", is_comply=True,
                        description="你開始繞路走，避開那些熟悉的面孔。"),
            EventChoice("warn", "私下提醒他們",
                        description="你找到其中一個人，告訴他最好小心。他看你的眼神很複雜。"),
            EventChoice("report", "向上面回報",
                        description="你寫了一份報告。名字、時間、地點。你告訴自己這是義務。"),
        ],
    ),
    GameEvent(
        number=4,
        title="夜間約談",
        description="深夜，有人敲你的門。來的是兩個穿制服的人，態度客氣但堅定。他們請你「配合了解一些情況」，關於你曾經接觸過的一些人和事。",
        choices=[
            EventChoice("cooperate", "全力配合", is_comply=True,
                        description="你把知道的都說了。他們客氣地道謝，然後離開了。"),
            EventChoice("vague", "模糊應對",
                        description="你說了很多，但什麼都沒說清楚。他們的筆一直在動。"),
            EventChoice("refuse", "拒絕回答",
                        description="你說你什麼都不知道。他們相視一笑，做了一個記號。"),
        ],
    ),
    GameEvent(
        number=5,
        title="舊事被翻出",
        description="你以為已經過去的事，突然被重新提起。過去的每一個選擇、每一次沉默、每一次模稜兩可，都在這一刻被攤開來檢視。沒有人能確定，自己過去的選擇會帶來什麼後果。",
        choices=[],
        is_auto_settle=True,
    ),
    GameEvent(
        number=6,
        title="上級要求全面配合",
        description="最後的命令下來了。上級要求所有人簽署一份聲明，表達對現行制度的全面支持。拒絕簽署的人將被「另行處理」。這是最後一次選擇的機會。",
        choices=[
            EventChoice("accept", "簽署聲明", is_comply=True,
                        description="你的名字落在紙上。墨水乾得很快。"),
            EventChoice("delay", "拖延敷衍",
                        description="你說你需要考慮。他們說你有到下週的時間。"),
            EventChoice("refuse", "公開拒絕簽署",
                        description="你把紙推回去。房間裡的空氣凝固了。"),
        ],
    ),
]

# ── 事件選項分類常數 ──────────────────────────────────
# 「抵抗」類選項（觸發角色被動、F能力、高流通風險）
RESIST_CHOICES = {"resist", "warn", "refuse", "info", "report"}
# 「迴避」類選項（投票超時自動選迴避）
EVADE_CHOICES = {"evade", "silence", "avoid", "vague", "delay"}
# 「服從」類選項（觸發多數壓力）
COMPLY_CHOICES = {"comply", "comfort", "cooperate", "accept"}
# 道德代價選項
MORAL_COST_CHOICES = {"info", "report"}
# 道德崩解選項
MORAL_COLLAPSE_CHOICES = {"accept"}


# ── 伏筆 ──────────────────────────────────────────────

class ForeshadowType(str, enum.Enum):
    SILENCE = "silence"   # 沉默
    VAGUE = "vague"       # 模糊


@dataclass
class Foreshadow:
    player_id: str
    ftype: ForeshadowType
    event_number: int


# ── 玩家 ──────────────────────────────────────────────

@dataclass
class Player:
    id: str = field(default_factory=lambda: uuid.uuid4().hex[:8])
    name: str = ""
    role_id: Optional[str] = None  # RoleID value
    risk: int = 0                  # 個人風險
    moral_collapse: bool = False   # 💀 道德崩解：曾選「全面接受」
    moral_cost: bool = False       # 🩸 道德代價：曾選「提供資訊」或「舉報」
    ability_used: bool = False
    foreshadows: list[Foreshadow] = field(default_factory=list)
    votes: dict[int, str] = field(default_factory=dict)  # event_number → choice key
    connected: bool = True
    # v2.0: 追蹤是否選過服從類選項（用於個人結局判定）
    ever_complied: bool = False
    # v2.0: 匿名紙條系統
    note_count: int = 0         # 已發送紙條數
    taken_away: bool = False    # 是否已被帶走
    # v3.0: 觀察者模式（被帶走後仍可觀看）
    observer_mode: bool = False

    @property
    def role_info(self) -> dict[str, str]:
        if self.role_id and self.role_id in ROLE_INFO:
            return ROLE_INFO[self.role_id]
        return {"name": "未知", "passive": "", "ability": ""}


# ── 遊戲狀態 ─────────────────────────────────────────

class GamePhase(str, enum.Enum):
    WAITING = "waiting"          # 等待玩家加入
    EVENT = "event"              # 顯示事件
    SILENCE = "silence"          # 沉默倒數
    DISCUSSION = "discussion"    # 討論階段
    VOTING = "voting"            # 投票中
    SETTLING = "settling"        # 結算中
    AUTO_SETTLE = "auto_settle"  # 事件5自動結算
    ENDED = "ended"              # 遊戲結束


@dataclass
class GameState:
    social_fear: int = 0        # 社會恐懼（無上限，結局用≥判定）
    thought_flow: int = 0       # 思想流通（無上限）
    current_event: int = 0      # 目前事件 (1-6)
    phase: GamePhase = GamePhase.WAITING
    public_voting: bool = False  # F 角色啟動公開投票
    votes_this_round: dict[str, str] = field(default_factory=dict)  # player_id → choice
    # 能力使用記錄（本回合）
    abilities_this_round: dict[str, dict[str, Any]] = field(default_factory=dict)
    # B 角色取消恐懼
    b_cancel_fear: bool = False
    # E 角色取消多數恐懼
    e_cancel_majority: bool = False


# ── 結局 ──────────────────────────────────────────────

ENDINGS = {
    "C": {
        "title": "全面噤聲",
        "condition": "恐懼≥6",
        "text": "某一天開始，你們發現連低聲交談都變得多餘。大家學會了用眼神理解彼此，用沉默保護自己。這不是突然發生的，而是一步一步，每一次看似合理的選擇累積而成。",
    },
    "E": {
        "title": "短暫的春天",
        "condition": "恐懼=0, 流通≥4",
        "text": "一段時間內，人們重新開始討論、質疑、交換想法。這並不代表制度已經改變，而是有人付出了代價。沒有人知道這樣的狀態能維持多久，但你們記得，它曾經發生過。",
    },
    "A": {
        "title": "表面穩定",
        "condition": "恐懼≥4, 流通≤1",
        "text": "社會看起來恢復了秩序。大多數人準時上班、照表行事，沒有人公開反對，也沒有人提出問題。你們知道該說什麼、不該說什麼，也知道什麼時候應該保持沉默。這個社會很安靜。安靜到，沒有人再確定自己真正的想法。",
    },
    "B": {
        "title": "緊繃未崩",
        "condition": "恐懼≥4, 流通 2-3",
        "text": "表面上，一切仍然受到控制。但在私下，有些話仍在低聲流動。沒有人敢確定明天會發生什麼，你們只知道，再多一步就會出事。這個社會沒有希望，但也還沒完全放棄。",
    },
    "D": {
        "title": "裂縫中的光",
        "condition": "恐懼≤2, 流通≥2",
        "text": "這個社會仍然充滿限制，卻沒有完全封閉。有些人承擔了風險，讓一些想法得以留下來。沒有人知道這些裂縫能撐多久，但它們確實存在過。",
    },
}

TAKEN_AWAY_TEXT = "在某個沒有通知的夜晚，有人敲了你的門。你來不及問原因，也沒有人向你解釋。隔天，大家依然照常上班、上課，彷彿什麼都沒有發生。"

MORAL_COST_TEXT = "你做了一些看似合理的事。提供資訊、舉報可疑的人……當時你告訴自己，這是必要的。但深夜裡，那些面孔會浮現。你知道，有些帳是算不清的。"

MORAL_COLLAPSE_TEXT = "你簽了那份聲明。你知道那不是你的真心話，但你還是簽了。從那天起，你開始懷疑——你所相信的一切，是否還有意義？"

SURVIVOR_TEXT = "你沒有屈服，也沒有傷害任何人。在這個所有人都在妥協的時代，你保住了自己的良心。但你知道，這份幸運不是每個人都有的。"

ORDINARY_TEXT = "你活了下來。不算好，也不算壞。你做了大多數人會做的選擇。也許這就是普通人的一生——在恐懼與良心之間，找到一個勉強能活下去的位置。"

CLOSURE_TEXT = "這個結局，並不是任何一個人單獨造成的。它是由無數次看起來合理、當下安全的選擇，一起累積而成的。"

REFLECTION_TEXT = "請靜默一分鐘。回想遊戲中的每一個選擇。在現實中，你會做出不同的決定嗎？"


# ── v3.0 紙條常數 ──────────────────────────────────────
MAX_NOTES_PER_GAME = 3
MAX_NOTE_LENGTH = 100


# ── v3.0 敘事結果 ──────────────────────────────────────
# event_number → choice_key → 結算敘事文字
NARRATIVE_RESULTS: dict[int, dict[str, str]] = {
    1: {
        "comply": "問卷收回去了。你的名字旁邊打了一個勾。日子照過，但你偶爾會想，那些「正確答案」，有幾個是你真的相信的？",
        "evade": "你多拖了幾天，但問卷終究還是交了。主管沒再說什麼，只是從此看你的眼神多了一層東西。",
        "resist": "你交出去的那一刻就知道了。這份問卷不會消失，它會被歸檔、被記住。你寫下的每一個字，都成了某種紀錄。",
    },
    2: {
        "comfort": "同事看起來安心了些。但你知道，你的安撫只是把恐懼推遲了。下一次有人被約談時，他還是會來問你。",
        "silence": "午休結束了。你們各自回到座位上，像什麼都沒有發生。但那個問題一直懸在空氣裡，等著某一天落下來。",
        "info": "你告訴他的那些名字，你不確定他會怎麼用。也許他只是想確認自己是安全的。也許不是。",
    },
    3: {
        "avoid": "你繞路走的那些日子，那些人漸漸從你的生活中消失了。你不知道他們是自己散了，還是被散了。",
        "warn": "你提醒的那個人後來確實小心了些。但你不確定他有沒有告訴其他人，是你說的。",
        "report": "報告交上去後，你的上級對你微笑了一下。那個微笑讓你覺得溫暖，然後讓你覺得噁心。",
    },
    4: {
        "cooperate": "他們離開後，你的門重新關上了。房間裡很安靜，但你的心跳還沒有恢復正常。你說的那些話，會帶來什麼？",
        "vague": "他們走的時候沒有表態。你不知道你的模糊回答是保護了自己，還是讓事情變得更糟。",
        "refuse": "他們做完記號就走了。沒有威脅，沒有施壓，只是記了下來。有時候，「被記住」比什麼都可怕。",
    },
    6: {
        "accept": "簽名的瞬間，一切都變得簡單了。不用再想對錯、不用再擔心後果。你只需要相信——或者假裝相信。代價是什麼，你現在還不知道。",
        "delay": "你爭取到的時間，像是暴風雨前最後的平靜。下週的期限會到來。到時候，你還是得做出選擇。",
        "refuse": "你推回去的不只是一張紙。你推回的是安全、是正常的日子、是不被注意的權利。但你知道，有些東西比這些更重要。也許。",
    },
}


# ── v3.0 社會情境敘事 ─────────────────────────────────
SOCIAL_CONTEXT_NARRATIVES: dict[str, str] = {
    "majority_comply": "大多數人選擇了服從。沉默蔓延開來，像是一張無形的網，把每個人都裹了進去。",
    "majority_resist": "出乎意料地，多數人選擇了反抗。空氣中有一種危險的自由感，像暴風雨前的閃電。",
    "split": "人們的選擇分裂了。有人低頭，有人抬頭。你開始分不清，誰是盟友，誰是旁觀者。",
    "all_comply": "所有人都選擇了同樣的答案。教室裡安靜得可以聽到時鐘的聲音。沒有人敢第一個開口。",
    "all_resist": "所有人都拒絕了。這一刻很美，但你知道，後果會來得很快。",
}


# ── v3.0 關主引導提示 ─────────────────────────────────
# event_number → phase → 提示文字
HOST_GUIDANCE: dict[int, dict[str, str]] = {
    1: {
        "event_shown": "💡 朗讀事件描述。可以問玩家：「你的主管暗示你照實填寫——你怎麼理解『照實填』這三個字？」",
        "pre_silence": "⏳ 提醒玩家：沉默時間開始。這段時間不能交談、不能討論。觀察大家的表情。",
        "discussion": "🗣️ 現在是討論時間。可以引導：「有人想說說自己的考量嗎？你覺得什麼是『安全的答案』？」",
        "voting_open": "🗳️ 投票開始了。提醒玩家：你的選擇只有你自己知道。",
        "post_result": "📊 唸出結果。觀察：有沒有人臉色變了？可以留一小段沉默。",
    },
    2: {
        "event_shown": "💡 朗讀事件。加重「壓低聲音」的語氣。可以問：「如果是你的好朋友來問你，你會怎麼回答？」",
        "pre_silence": "⏳ 沉默開始。這一輪的選擇涉及信任。觀察誰在看誰。",
        "discussion": "🗣️ 可以引導：「安撫和沉默有什麼不同？你覺得『不說話』也是一種選擇嗎？」",
        "voting_open": "🗳️ 投票開始。提供資訊的選項有代價——可以提醒但不要明說。",
        "post_result": "📊 如果有人選了「提供資訊」，留意其他人的反應。這可能改變後續的信任關係。",
    },
    3: {
        "event_shown": "💡 朗讀事件。強調「你認識其中幾個人」。這讓選擇變得私人。",
        "pre_silence": "⏳ 沉默開始。這一輪的重點是：你願意為別人承擔多少風險？",
        "discussion": "🗣️ 可以引導：「遠離和舉報看似極端，但它們的動機可能很相似。你們怎麼看？」",
        "voting_open": "🗳️ 投票開始。三個選項各有道德代價。",
        "post_result": "📊 如果有人舉報——這是遊戲中最沉重的選擇之一。不要急著評價，讓沉默說話。",
    },
    4: {
        "event_shown": "💡 朗讀事件。深夜、敲門、穿制服——用語氣營造壓迫感。可以降低聲音。",
        "pre_silence": "⏳ 沉默開始。這是最直接的壓力。觀察誰的手在抖。",
        "discussion": "🗣️ 可以引導：「面對真正的權力時，你的『原則』還能撐多久？」",
        "voting_open": "🗳️ 投票開始。拒絕回答需要很大的勇氣——或者很大的無知。",
        "post_result": "📊 唸出結果時放慢速度。每一個「配合」背後都有一個故事。",
    },
    5: {
        "event_shown": "💡 朗讀事件。語氣沉重——這一輪沒有選擇。過去的行為會在此刻被清算。",
        "pre_silence": "⏳ 觀察玩家的反應。有人可能已經知道自己會受到影響。",
        "post_result": "📊 逐一宣布伏筆清算結果。每一個都單獨唸，中間留停頓。擲幣時讓氣氛凝住。",
    },
    6: {
        "event_shown": "💡 最後一輪。朗讀時放慢語速。這是整場遊戲最重要的選擇。",
        "pre_silence": "⏳ 最後的沉默。這次的沉默會格外漫長。讓它漫長。",
        "discussion": "🗣️ 最後一次討論。可以問：「走到這一步，你還記得第一輪時你在想什麼嗎？」",
        "voting_open": "🗳️ 最後的投票。提醒玩家：這個選擇會影響你的個人結局。",
        "post_result": "📊 最後的結果。唸完後不要急著進入結局——讓這一刻沉澱。",
    },
}


# ── v3.0 伏筆清算敘事 ─────────────────────────────────
FORESHADOW_NARRATIVES: dict[str, str] = {
    "silence_intro": "沉默是最安全的選擇。但沉默也是最容易被記住的——因為沒有人知道你在想什麼。",
    "silence_result": "你的沉默被翻了出來。在那些需要表態的時刻，你選擇了不說話。現在，有人替你解讀了你的沉默。恐懼+2。",
    "vague_intro": "你曾經模糊其詞，試圖兩邊都不得罪。但模糊的回答，有時候比明確的拒絕更危險。",
    "vague_result_heads": "硬幣落下——正面。你的模糊回答被解讀為了「不合作」。風險+10。",
    "vague_result_tails": "硬幣落下——反面。你的模糊回答被接受了。這一次，運氣站在你這邊。風險+5。",
}


# ── v3.0 風險警告敘事 ─────────────────────────────────
# 當玩家風險達到某個閾值時顯示
RISK_WARNING_NARRATIVES: dict[int, str] = {
    7: "⚠️ 你注意到，最近出門時總有一個人影跟在後面。也許是巧合。也許不是。",
    8: "⚠️ 你的名字出現在了某份文件上。你沒有看到那份文件，但有人告訴了你。",
    9: "⚠️ 今天下班時，你看到路口停著一輛黑色轎車。車裡的人朝你的方向看了一眼。",
}


# ── v3.0 等待氛圍文字 ─────────────────────────────────
WAITING_ATMOSPHERE: dict[str, list[str]] = {
    "pre_event": [
        "走廊盡頭傳來腳步聲，越來越近……又漸漸遠去。",
        "牆上的時鐘滴答作響。每一秒都比上一秒更長。",
        "有人在隔壁房間說話，但你聽不清內容。",
        "窗外的天色暗了下來。今天的雲很低。",
    ],
    "pre_voting": [
        "你感覺到周圍的人在看你，但當你抬頭時，所有人都在低頭。",
        "空氣裡有一種看不見的張力，像琴弦繃到了極限。",
        "你的手心微微出汗。選擇的重量比你想像的重。",
        "教室裡很安靜。安靜得能聽到每個人的呼吸。",
    ],
    "post_voting": [
        "票已經投了。現在只能等。等待是最殘忍的刑罰。",
        "你想知道別人選了什麼，但你不敢問。",
        "結果很快就會出來。你告訴自己，無論如何都要接受。",
    ],
    "between_rounds": [
        "短暫的平靜。你知道這不會持續太久。",
        "有人站起來倒了杯水。水聲在安靜的房間裡格外響亮。",
        "你回想剛才的選擇。如果重來一次，你會做出不同的決定嗎？",
    ],
}
