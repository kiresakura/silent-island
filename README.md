# 靜默之島：選擇與代價

白色恐怖情境模擬遊戲。6-8 人，6 回合。高壓社會中的道德兩難與集體決策。

## 快速開始

### 安裝

```bash
cd ~/Developer/silent-island
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 啟動

```bash
uvicorn server.main:app --reload --host 0.0.0.0 --port 8000
```

瀏覽器開啟 `http://localhost:8000`

### 遊戲流程

1. **關主**點擊「建立房間」→ 取得房間碼和 QR Code
2. **玩家**掃 QR Code 或輸入房間碼 + 名字加入（6-8 人）
3. **關主**按「開始遊戲」→ 自動分配角色
4. 每回合：
   - 關主按「下一事件」→ 所有人看到事件描述
   - 關主按「沉默倒數」→ 30 秒全螢幕黑屏
   - 關主按「開始投票」→ 玩家選擇
   - 關主按「結束投票」→ 自動結算
5. 第 5 回合自動結算伏筆
6. 第 6 回合結束後 → 關主按「顯示結局」

## 技術棧

- **後端**: Python FastAPI + WebSocket
- **前端**: 純 HTML/CSS/JS（無框架）
- **狀態**: 記憶體（不需資料庫）
- **QR Code**: `qrcode` + `Pillow`

## 專案結構

```
silent-island/
├── server/
│   ├── main.py          # FastAPI entry, WebSocket endpoint
│   ├── game_engine.py   # 遊戲邏輯引擎
│   ├── room.py          # 房間管理
│   └── models.py        # 資料模型
├── client/
│   ├── index.html       # 首頁
│   ├── host.html        # 關主控制面板
│   ├── player.html      # 玩家畫面
│   ├── css/style.css    # 樣式
│   └── js/
│       ├── ws.js        # WebSocket 共用邏輯
│       ├── host.js      # 關主端邏輯
│       └── player.js    # 玩家端邏輯
├── requirements.txt
└── README.md
```

## 角色一覽

| 代號 | 角色 | 被動 | 能力（一次性） |
|------|------|------|----------------|
| A | 中學教師 | 每回合恐懼累計+0.5 | 模糊不+風險 |
| B | 公務員 | 拒絕+1風險 | 取消恐懼+1 |
| C | 大學生 | 拒絕/提醒+1風險 | +1風險改為恐懼+1 |
| D | 家屬/旁觀者 | 恐懼≥3不能拒絕 | 替人承擔+1風險 |
| E | 一般市民 | 無 | 取消多數服從恐懼+1 |
| F | 基層執行者 | 無 | 公開投票，拒絕者+1風險 |
| G | 親屬/家長 | 無 | 將目標+1風險轉恐懼+1 |

## 結局

- **結局 A**（表面穩定）：恐懼≥3 且 流通≤1
- **結局 B**（緊繃但未崩解）：恐懼≥3 且 流通=2
- **結局 C**（全面噤聲）：恐懼=4（優先判定）
- **結局 D**（裂縫中的交流）：恐懼≤1 且 流通≥2
- **結局 E**（短暫開放）：恐懼=0 且 流通=3
- **被帶走**：個人風險≥3
