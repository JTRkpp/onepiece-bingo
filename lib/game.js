import charactersData from "../data/characters.json";
import questionsData from "../data/questions.json";

let characters = [];
let questions = [];

function assetUrl(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const clean = String(path).replace(/^\//, "");
    return `${base}/${clean}`;
}

function resetRuntime() {
    characters = Array.isArray(charactersData) ? charactersData : [];
    questions = Array.isArray(questionsData) ? questionsData : [];
    currentQuestionText = "";
    isDrawingMission = false;
    sharedVotes = {};
    sharedReady = false;
    appliedStateSignature = "";
    sharedDrawnAt = 0;
    sharedDrawnBy = "";
    sharedOwner = "";
    sharedOwnerAt = 0;
    sharedPlayers = {};
    sharedTurnOrder = [];
    receivedMqtt = false;
    mqttTopic = "";
}

export function initGame() {
    const ac = new AbortController();
    const { signal } = ac;

    resetRuntime();
    generateRandomBoard();

    const randomBtn = document.getElementById("randomBoard");
    if (randomBtn) randomBtn.addEventListener("click", generateRandomBoard, { signal });

    const drawBtn = document.getElementById("drawMission");
    if (drawBtn) drawBtn.addEventListener("click", drawMission, { signal });

    const nextCaptainBtn = document.getElementById("nextCaptain");
    if (nextCaptainBtn) nextCaptainBtn.addEventListener("click", passToNextCaptain, { signal });

    const createBtn = document.getElementById("createBoard");
    if (createBtn) createBtn.addEventListener("click", createCustomBoard, { signal });

    const voteYesBtn = document.getElementById("voteYes");
    const voteNoBtn = document.getElementById("voteNo");
    if (voteYesBtn) voteYesBtn.addEventListener("click", () => handleVote("yes"), { signal });
    if (voteNoBtn) voteNoBtn.addEventListener("click", () => handleVote("no"), { signal });

    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) publishPresence(true);
    }, { signal });

    initCaptainName(signal);
    initImageZoom(signal);
    initSharedGame();

    return () => {
        ac.abort();
        if (presenceTimer) {
            clearInterval(presenceTimer);
            presenceTimer = null;
        }
        if (mqttClient) {
            try { mqttClient.end(true); } catch (e) { /* ignore */ }
            mqttClient = null;
        }
        if (roomChannel) {
            try { roomChannel.close(); } catch (e) { /* ignore */ }
            roomChannel = null;
        }
    };
}

// ฟังก์ชันสร้างตารางบิงโกสุ่มตัวละคร 5x5
function generateRandomBoard() {
    const board = document.getElementById("bingoBoard");
    if (!board || characters.length === 0) return;
    
    // ล้างข้อมูลตารางเก่าออกก่อน
    board.innerHTML = ""; 

    // สุ่มสลับตำแหน่งตัวละครและเลือกมา 25 ตัว
    const shuffled = [...characters].sort(() => 0.5 - Math.random());
    const selectedCharacters = shuffled.slice(0, 25);

    // สร้างช่องบิงโกทีละช่อง
    selectedCharacters.forEach(char => {
        const cell = document.createElement("div");
        cell.className = "bingo-cell";
        const charName = char.name || "";
        const charImage = char.image || "";
        cell.dataset.name = charName;
        cell.dataset.image = charImage;

        const img = document.createElement("img");
        img.src = assetUrl(charImage);
        img.alt = charName;
        img.className = "char-img";
        img.addEventListener("error", () => {
            img.style.opacity = "0";
        });

        const namePlate = document.createElement("div");
        namePlate.className = "name-plate";
        namePlate.textContent = charName;

        const stamp = document.createElement("div");
        stamp.className = "stamp";
        stamp.textContent = "❌";

        const zoomBtn = document.createElement("button");
        zoomBtn.type = "button";
        zoomBtn.className = "zoom-btn";
        zoomBtn.title = "Zoom image";
        zoomBtn.setAttribute("aria-label", `Zoom ${charName}`);
        zoomBtn.textContent = "🔍";
        zoomBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openCharacterZoom(assetUrl(charImage), charName);
        });

        cell.append(img, namePlate, stamp, zoomBtn);

        // คลิกช่อง: ประทับตรา + คัดลอกชื่อตัวละคร
        cell.addEventListener("click", () => {
            cell.classList.toggle("marked");
            copyCharacterName(charName);
        });

        board.appendChild(cell);
    });
}

// ฟังก์ชันหมุนสล็อตภารกิจ โดยดึงจากไฟล์ questions.json เท่านั้น
function drawMission() {
    if (!canDrawMission()) {
        updateOwnerMissionUI();
        return;
    }
    if (questions.length === 0) {
        alert("ไม่พบข้อมูลภารกิจในไฟล์ questions.json");
        return;
    }

    const drawName = document.getElementById('drawName');
    const drawBtn = document.getElementById("drawMission");
    if (!drawName) return;

    // ซ่อนและล้างสถานะโหวตเดิมเมื่อกดปุ่มสุ่มใหม่
    const voteContainer = document.getElementById("voteContainer");
    const voteInstruction = document.getElementById("voteInstruction");
    const activeVoteContent = document.getElementById("activeVoteContent");
    
    if (voteContainer) {
        voteContainer.classList.remove("visible");
    }
    if (activeVoteContent) {
        activeVoteContent.style.display = "none";
    }
    if (voteInstruction) {
        voteInstruction.style.display = "block";
    }
    currentQuestionText = "";
    isDrawingMission = true;

    let finished = false;
    const startedAt = Date.now();
    if (drawBtn) drawBtn.disabled = true;
    const nextCaptainBtn = document.getElementById("nextCaptain");
    if (nextCaptainBtn) nextCaptainBtn.disabled = true;

    const finishDraw = () => {
        if (finished) return;
        finished = true;
        clearInterval(spinInterval);

        const finalQ = questions[Math.floor(Math.random() * questions.length)];
        const finalQuestionText = finalQ.text || finalQ.question || "ไม่มีโจทย์";
        drawName.innerText = finalQuestionText;
        if (drawBtn) drawBtn.disabled = false;

        currentQuestionText = finalQuestionText;

        if (voteInstruction) voteInstruction.style.display = "none";
        if (activeVoteContent) activeVoteContent.style.display = "block";
        if (voteContainer) voteContainer.classList.add("visible");

        isDrawingMission = false;
        const ownerName = currentCaptainName();
        const roomState = currentRoomState();
        roomState.mission = finalQuestionText;
        roomState.drawnAt = Date.now();
        roomState.drawnBy = ownerName;
        roomState.owner = sharedOwner || ownerName;
        if (!sharedOwner) roomState.ownerAt = Date.now();
        roomState.votes = {};
        roomState.players = mergePlayers(roomState.players, isNamedCaptain(ownerName) ? { [ownerName]: Date.now() } : {});
        roomState.turnOrder = mergeTurnOrder(roomState.turnOrder, sharedTurnOrder, roomState.players);
        publishSharedState(roomState);
        updateVoteUI();
        updateOwnerMissionUI();
    };

    const spinInterval = setInterval(() => {
        const randomQ = questions[Math.floor(Math.random() * questions.length)];
        drawName.innerText = randomQ.text || randomQ.question || "กำลังสุ่ม...";
        if (Date.now() - startedAt >= 1500) finishDraw();
    }, 100);
}

function createCustomBoard() {
    alert("ระบบกำลังสร้างกระดานแบบกำหนดเอง หรือคุณสามารถใช้ปุ่ม Random Board เพื่อเริ่มเล่นได้ทันที!");
}

// ==========================================
// ระบบโหวตเห็นด้วยหรือไม่เห็นด้วย (ไม่ต้องล็อกอิน)
// ==========================================

let currentQuestionText = "";
let isDrawingMission = false;
let sharedVotes = {};
let sharedReady = false;
let appliedStateSignature = "";
let sharedDrawnAt = 0;
let sharedDrawnBy = "";
let sharedOwner = "";
let sharedOwnerAt = 0;
let sharedPlayers = {};
let sharedTurnOrder = [];
let presenceTimer = null;
let roomChannel = null;
let mqttClient = null;
let mqttTopic = "";
let receivedMqtt = false;
const MQTT_BROKERS = [
    "wss://broker.emqx.io:8084/mqtt",
    "wss://broker.hivemq.com:8884/mqtt"
];
const PLAYER_STALE_MS = 45000;
const PLAYER_DROP_MS = 90000;
const HEARTBEAT_MS = 10000;

function getRoomId() {
    const raw = new URLSearchParams(window.location.search).get("room") || "crew";
    const cleaned = raw.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24);
    return cleaned || "crew";
}

function currentCaptainName() {
    return getStoredCaptainName()
        || (document.getElementById("captainName")?.innerText || "").trim()
        || "Guest";
}

function emptyRoomState() {
    return { mission: "", drawnAt: 0, drawnBy: "", owner: "", ownerAt: 0, votes: {}, players: {}, turnOrder: [] };
}

function stateSignature(state) {
    const votes = state && state.votes ? state.votes : {};
    return JSON.stringify({
        mission: (state && state.mission) || "",
        drawnAt: (state && state.drawnAt) || 0,
        drawnBy: (state && state.drawnBy) || "",
        owner: (state && state.owner) || "",
        ownerAt: (state && state.ownerAt) || 0,
        votes,
        players: (state && state.players) || {},
        turnOrder: (state && state.turnOrder) || []
    });
}

function setSyncStatus(status) {
    const dot = document.getElementById("liveDot");
    const text = document.getElementById("liveStatusText");
    if (dot) {
        dot.classList.remove("live", "connecting");
        if (status === "live") dot.classList.add("live");
        if (status === "connecting") dot.classList.add("connecting");
    }
    if (text) {
        text.textContent = status === "live"
            ? "LIVE"
            : status === "connecting"
                ? "กำลังเชื่อมต่อ"
                : "OFFLINE";
    }
}

function currentRoomState() {
    return {
        mission: currentQuestionText || "",
        drawnAt: sharedDrawnAt || 0,
        drawnBy: sharedDrawnBy || "",
        owner: sharedOwner || "",
        ownerAt: sharedOwnerAt || 0,
        votes: Object.assign({}, sharedVotes),
        players: Object.assign({}, sharedPlayers),
        turnOrder: sharedTurnOrder.slice()
    };
}

function isNamedCaptain(name) {
    const captain = (name || "").trim();
    return !!(captain && captain !== "Guest");
}

function isPlayerStale(players, name) {
    if (!name) return true;
    const seen = Number(players && players[name]) || 0;
    if (!seen) return true;
    return Date.now() - seen > PLAYER_STALE_MS;
}

function mergePlayers(base, incoming) {
    const merged = Object.assign({}, base);
    Object.keys(incoming || {}).forEach((name) => {
        const stamp = Number(incoming[name]) || 0;
        if (!name || !stamp) return;
        if (stamp >= (Number(merged[name]) || 0)) merged[name] = stamp;
    });
    const now = Date.now();
    Object.keys(merged).forEach((name) => {
        if (now - merged[name] > PLAYER_DROP_MS) delete merged[name];
    });
    return merged;
}

function mergeTurnOrder(base, incoming, players) {
    const merged = [];
    const seen = new Set();
    (incoming || []).concat(base || []).forEach((name) => {
        if (!name || seen.has(name)) return;
        if (players && players[name] == null) return;
        seen.add(name);
        merged.push(name);
    });
    Object.keys(players || {}).forEach((name) => {
        if (seen.has(name)) return;
        seen.add(name);
        merged.push(name);
    });
    return merged;
}

function crewTurnOrder(players) {
    return mergeTurnOrder(sharedTurnOrder, [], players || sharedPlayers);
}

function nextCaptainName() {
    const names = crewTurnOrder();
    if (names.length < 2) return "";
    const idx = names.indexOf(sharedOwner);
    const start = idx >= 0 ? idx : -1;
    return names[(start + 1) % names.length] || "";
}

function orderedNames(names) {
    const order = crewTurnOrder();
    const rank = new Map(order.map((name, index) => [name, index]));
    return [...names].sort((a, b) => {
        const ia = rank.has(a) ? rank.get(a) : 999;
        const ib = rank.has(b) ? rank.get(b) : 999;
        if (ia !== ib) return ia - ib;
        return a.localeCompare(b, "th", { sensitivity: "base" });
    });
}

function claimOwnerIfNeeded(roomState) {
    const me = currentCaptainName();
    if (!isNamedCaptain(me)) return;
    const owner = roomState.owner || "";
    if (!owner || isPlayerStale(roomState.players, owner)) {
        roomState.owner = me;
        roomState.ownerAt = Date.now();
    }
}

function canDrawMission() {
    const me = currentCaptainName();
    if (!isNamedCaptain(me)) return false;
    if (!sharedOwner) return true;
    if (sharedOwner === me) return true;
    return isPlayerStale(sharedPlayers, sharedOwner);
}

function canPassCaptain() {
    if (isDrawingMission) return false;
    const next = nextCaptainName();
    if (!next || next === sharedOwner) return false;
    return canDrawMission();
}

function clearVoteBoard() {
    sharedVotes = {};
    currentQuestionText = "";
    sharedDrawnBy = "";

    const drawName = document.getElementById("drawName");
    if (drawName) drawName.innerText = 'Press "Draw Mission"';

    const voteContainer = document.getElementById("voteContainer");
    const voteInstruction = document.getElementById("voteInstruction");
    const activeVoteContent = document.getElementById("activeVoteContent");
    if (activeVoteContent) activeVoteContent.style.display = "none";
    if (voteInstruction) voteInstruction.style.display = "block";
    if (voteContainer) voteContainer.classList.add("visible");

    const voteYesBtn = document.getElementById("voteYes");
    const voteNoBtn = document.getElementById("voteNo");
    if (voteYesBtn) voteYesBtn.classList.remove("voted-yes");
    if (voteNoBtn) voteNoBtn.classList.remove("voted-no");

    const yesCountSpan = document.getElementById("yesCount");
    const noCountSpan = document.getElementById("noCount");
    if (yesCountSpan) yesCountSpan.innerText = "0";
    if (noCountSpan) noCountSpan.innerText = "0";
    setVoteNameList("yesVoters", []);
    setVoteNameList("noVoters", []);
}

function passToNextCaptain() {
    if (!canPassCaptain()) {
        updateOwnerMissionUI();
        return;
    }
    const next = nextCaptainName();
    if (!next) return;
    const me = currentCaptainName();
    const roomState = currentRoomState();
    roomState.players = mergePlayers(roomState.players, isNamedCaptain(me) ? { [me]: Date.now() } : {});
    roomState.turnOrder = mergeTurnOrder(roomState.turnOrder, sharedTurnOrder, roomState.players);
    roomState.owner = next;
    roomState.ownerAt = Date.now();
    roomState.mission = "";
    roomState.drawnBy = "";
    roomState.drawnAt = Date.now();
    roomState.votes = {};
    publishSharedState(roomState);
    clearVoteBoard();
    updateOwnerMissionUI();
    showCopyToast("Next captain: " + next);
}

function ownerDisplayName() {
    return sharedOwner || "เจ้าของห้อง";
}

function missionOwnerCaption(hasMission) {
    const owner = sharedOwner;
    const drawnBy = sharedDrawnBy || owner;
    if (hasMission && drawnBy) {
        return "ภารกิจจากเจ้าของห้อง · " + drawnBy;
    }
    if (owner) {
        return "รอภารกิจจากเจ้าของห้อง · " + owner;
    }
    return "ตัวอย่าง: ภารกิจของเจ้าของห้องจะแสดงตรงนี้";
}

function updateOwnerMissionUI() {
    const hasMission = !!(currentQuestionText && currentQuestionText.trim());
    const caption = missionOwnerCaption(hasMission);
    const nextName = nextCaptainName();

    const missionOwnerLabel = document.getElementById("missionOwnerLabel");
    if (missionOwnerLabel) missionOwnerLabel.textContent = caption;

    const roomOwnerName = document.getElementById("roomOwnerName");
    if (roomOwnerName) roomOwnerName.textContent = sharedOwner || "รอเข้าห้อง";

    const nextCaptainLabel = document.getElementById("nextCaptainName");
    if (nextCaptainLabel) nextCaptainLabel.textContent = nextName || "—";

    const drawBtn = document.getElementById("drawMission");
    const allowed = canDrawMission();
    if (drawBtn && !isDrawingMission) drawBtn.disabled = !allowed;

    const nextCaptainBtn = document.getElementById("nextCaptain");
    if (nextCaptainBtn) {
        nextCaptainBtn.disabled = !canPassCaptain();
        nextCaptainBtn.title = nextName
            ? "Pass mission owner to " + nextName
            : "Need at least 2 captains to pass";
    }

    const drawHint = document.getElementById("drawHint");
    if (drawHint) {
        if (!isNamedCaptain(currentCaptainName())) {
            drawHint.textContent = "กรอกชื่อกัปตันก่อน แล้วเจ้าของภารกิจจะสุ่มให้ทุกคน";
        } else if (allowed && nextName) {
            drawHint.textContent = "ตาคุณสุ่มภารกิจ · Next Captain ส่งให้ " + nextName;
        } else if (allowed) {
            drawHint.textContent = "คุณเป็นเจ้าของภารกิจ · กด Draw Mission เพื่อสุ่มให้ลูกเรือ";
        } else {
            drawHint.textContent = "รอภารกิจจาก " + ownerDisplayName() + (nextName ? " · Next: " + nextName : "");
        }
    }

    renderCrewList();
}

function renderCrewList() {
    const list = document.getElementById("crewRoster");
    if (!list) return;

    const me = currentCaptainName();
    const players = Object.assign({}, sharedPlayers);
    if (isNamedCaptain(me)) players[me] = players[me] || Date.now();
    if (sharedOwner && players[sharedOwner] == null) players[sharedOwner] = 0;

    const names = orderedNames(Object.keys(players));
    list.replaceChildren();

    if (!names.length) {
        const empty = document.createElement("li");
        empty.className = "is-empty";
        empty.textContent = "ยังไม่มีลูกเรือ";
        list.appendChild(empty);
        return;
    }

    const nextName = nextCaptainName();
    names.forEach((name, index) => {
        const item = document.createElement("li");
        if (name === sharedOwner) item.classList.add("is-owner");
        if (name === nextName) item.classList.add("is-next");
        if (name === me) item.classList.add("is-you");

        const label = document.createElement("span");
        label.className = "crew-name";
        label.textContent = (index + 1) + ". " + name;
        if (name === sharedOwner) label.textContent += " 👑";

        const tag = document.createElement("span");
        tag.className = "crew-tag";
        const tags = [];
        if (name === me) tags.push("YOU");
        if (name === nextName) tags.push("NEXT");
        if (isPlayerStale(players, name) && name !== me) tags.push("OFFLINE");
        tag.textContent = tags.join(" · ");

        item.append(label, tag);
        list.appendChild(item);
    });
}

function publishPresence(force) {
    const me = currentCaptainName();
    if (!isNamedCaptain(me)) {
        updateOwnerMissionUI();
        return;
    }

    const roomState = currentRoomState();
    roomState.players = mergePlayers(roomState.players, { [me]: Date.now() });
    roomState.turnOrder = mergeTurnOrder(roomState.turnOrder, sharedTurnOrder, roomState.players);
    if (force) claimOwnerIfNeeded(roomState);
    else if (!roomState.owner && receivedMqtt) {
        roomState.owner = me;
        roomState.ownerAt = roomState.ownerAt || Date.now();
    }
    publishSharedState(roomState);
}

function startPresenceHeartbeat() {
    if (presenceTimer) clearInterval(presenceTimer);
    presenceTimer = setInterval(() => publishPresence(false), HEARTBEAT_MS);
    const started = Date.now();
    const tryClaim = () => {
        if (receivedMqtt || Date.now() - started >= 2000) {
            publishPresence(true);
            return;
        }
        publishPresence(false);
        setTimeout(tryClaim, 300);
    };
    setTimeout(tryClaim, 400);
}

function cacheRoomState(state) {
    try {
        localStorage.setItem("onepiece_bingo_room_" + getRoomId(), JSON.stringify(state));
    } catch (e) { /* ignore quota / private mode */ }
}

function readCachedRoomState() {
    try {
        return JSON.parse(localStorage.getItem("onepiece_bingo_room_" + getRoomId()) || "null");
    } catch (e) {
        return null;
    }
}

function showSharedMission(text) {
    const mission = (text || "").trim();
    if (!mission) return;

    currentQuestionText = mission;

    const drawName = document.getElementById("drawName");
    if (drawName) drawName.innerText = mission;

    const voteInstruction = document.getElementById("voteInstruction");
    const activeVoteContent = document.getElementById("activeVoteContent");
    const voteContainer = document.getElementById("voteContainer");

    if (voteInstruction) voteInstruction.style.display = "none";
    if (activeVoteContent) activeVoteContent.style.display = "block";
    if (voteContainer) voteContainer.classList.add("visible");
    updateOwnerMissionUI();
}

function mergeVoteMaps(base, incoming) {
    const merged = Object.assign({}, base);
    Object.keys(incoming || {}).forEach((name) => {
        const choice = incoming[name];
        if (choice === "yes" || choice === "no") merged[name] = choice;
        else delete merged[name];
    });
    return merged;
}

function applySharedState(state, fromBroadcast) {
    if (!state) return;
    const incomingDrawn = Number(state.drawnAt) || 0;
    if (!state.mission && currentQuestionText && incomingDrawn === 0 && incomingDrawn < sharedDrawnAt) return;

    const nextPlayers = mergePlayers(sharedPlayers, state.players);
    const nextTurnOrder = mergeTurnOrder(sharedTurnOrder, state.turnOrder, nextPlayers);
    const incomingOwnerAt = Number(state.ownerAt) || 0;
    let nextOwner = sharedOwner || "";
    let nextOwnerAt = sharedOwnerAt || 0;
    if (incomingOwnerAt > sharedOwnerAt && state.owner) {
        nextOwner = state.owner;
        nextOwnerAt = incomingOwnerAt;
    } else if (!nextOwner && state.owner) {
        nextOwner = state.owner;
        nextOwnerAt = incomingOwnerAt;
    } else if (nextOwner && isPlayerStale(nextPlayers, nextOwner) && state.owner && !isPlayerStale(nextPlayers, state.owner)) {
        nextOwner = state.owner;
        nextOwnerAt = incomingOwnerAt || Date.now();
    }

    let nextMission = currentQuestionText || "";
    let nextDrawnAt = sharedDrawnAt;
    let nextDrawnBy = sharedDrawnBy;
    let nextVotes = sharedVotes;

    if (incomingDrawn > sharedDrawnAt && (state.mission || incomingDrawn > 0)) {
        nextMission = state.mission || "";
        nextDrawnAt = incomingDrawn;
        nextDrawnBy = state.drawnBy || "";
        nextVotes = mergeVoteMaps({}, state.votes);
    } else if (incomingDrawn === sharedDrawnAt) {
        if (state.mission) nextMission = state.mission;
        nextDrawnBy = sharedDrawnBy || state.drawnBy || "";
        nextVotes = mergeVoteMaps(sharedVotes, state.votes);
    } else if (!sharedDrawnAt && state.mission) {
        nextMission = state.mission;
        nextDrawnAt = incomingDrawn;
        nextDrawnBy = state.drawnBy || "";
        nextVotes = mergeVoteMaps({}, state.votes);
    }

    const nextState = {
        mission: nextMission,
        drawnAt: nextDrawnAt,
        drawnBy: nextDrawnBy,
        owner: nextOwner,
        ownerAt: nextOwnerAt,
        votes: nextVotes,
        players: nextPlayers,
        turnOrder: nextTurnOrder
    };
    const signature = stateSignature(nextState);
    if (signature === appliedStateSignature) return;
    appliedStateSignature = signature;
    sharedDrawnAt = nextDrawnAt;
    sharedDrawnBy = nextDrawnBy;
    sharedOwner = nextOwner;
    sharedOwnerAt = nextOwnerAt;
    sharedPlayers = nextPlayers;
    sharedTurnOrder = nextTurnOrder;
    sharedVotes = nextVotes;
    sharedReady = true;
    cacheRoomState(nextState);

    if (!isDrawingMission && nextState.mission) {
        showSharedMission(nextState.mission);
    } else {
        if (!isDrawingMission && !nextState.mission) clearVoteBoard();
        else currentQuestionText = nextState.mission || "";
        updateOwnerMissionUI();
    }

    updateVoteUI();

    if (!fromBroadcast && roomChannel) {
        try { roomChannel.postMessage(nextState); } catch (e) { /* ignore */ }
    }
}

function publishSharedState(nextRoomState) {
    applySharedState(nextRoomState, true);
    if (roomChannel) {
        try { roomChannel.postMessage(nextRoomState); } catch (e) { /* ignore */ }
    }
    publishMqtt(nextRoomState);
}

function mutateSharedVotes(mutator) {
    const roomState = currentRoomState();
    if (!roomState.mission) roomState.mission = currentQuestionText;
    if (!roomState.drawnAt) roomState.drawnAt = Date.now();
    roomState.votes = Object.assign({}, roomState.votes);
    mutator(roomState);
    publishSharedState(roomState);
}

function publishMqtt(state) {
    if (!mqttClient || !mqttClient.connected || !mqttTopic) return;
    try {
        mqttClient.publish(mqttTopic, JSON.stringify(state), { qos: 1, retain: true });
    } catch (err) {
        console.warn("MQTT publish failed:", err);
        setSyncStatus("offline");
    }
}

function connectMqtt(brokerIndex) {
    const index = brokerIndex || 0;
    const url = MQTT_BROKERS[index];
    if (!url) {
        setSyncStatus("offline");
        return;
    }

    setSyncStatus("connecting");
    import("mqtt/dist/mqtt").then((mod) => {
        const lib = mod.default || mod;
        const mqttConnect = (lib && lib.connect) || lib;
        if (typeof mqttConnect !== "function") {
            connectMqtt(index + 1);
            return;
        }
        try {
            if (mqttClient) {
                try { mqttClient.end(true); } catch (e) { /* ignore */ }
            }
            mqttClient = mqttConnect(url, {
                clientId: "bingo-" + Math.random().toString(16).slice(2),
                clean: true,
                reconnectPeriod: 3000,
                connectTimeout: 8000,
                keepalive: 30
            });
        } catch (err) {
            console.warn("MQTT connect failed:", err);
            connectMqtt(index + 1);
            return;
        }

        mqttClient.on("connect", () => {
            setSyncStatus("live");
            mqttClient.subscribe(mqttTopic, { qos: 1 });
            setTimeout(() => {
                if (!receivedMqtt) {
                    const cached = currentRoomState();
                    if (cached.mission || cached.owner || Object.keys(cached.players || {}).length) {
                        publishMqtt(cached);
                    }
                }
            }, 900);
        });

        mqttClient.on("message", (_topic, payload) => {
            receivedMqtt = true;
            try {
                const state = JSON.parse(payload.toString());
                applySharedState(state, true);
            } catch (err) {
                console.warn("MQTT message parse failed:", err);
            }
        });

        mqttClient.on("offline", () => setSyncStatus("offline"));
        mqttClient.on("close", () => setSyncStatus("offline"));
        mqttClient.on("error", (err) => {
            console.warn("MQTT error:", err);
            if (index + 1 < MQTT_BROKERS.length && (!mqttClient || !mqttClient.connected)) {
                try { mqttClient.end(true); } catch (e) { /* ignore */ }
                connectMqtt(index + 1);
            } else {
                setSyncStatus("offline");
            }
        });
    }).catch((err) => {
        console.warn("MQTT load failed:", err);
        connectMqtt(index + 1);
    });
}

function initSharedGame() {
    const roomId = getRoomId();
    mqttTopic = "onepiecebingo/jtrkpp/" + roomId;
    receivedMqtt = false;

    const roomLabel = document.getElementById("roomNameLabel");
    if (roomLabel) roomLabel.textContent = roomId;
    setSyncStatus("connecting");

    if ("BroadcastChannel" in window) {
        roomChannel = new BroadcastChannel("onepiece-bingo-" + roomId);
        roomChannel.onmessage = (event) => applySharedState(event.data, true);
    }

    const cached = readCachedRoomState();
    if (cached && (cached.mission || cached.owner || cached.players)) applySharedState(cached, true);

    connectMqtt(0);
    startPresenceHeartbeat();
    updateOwnerMissionUI();
}

// จัดการการโหวต Yes/No
function handleVote(voteType) {
    if (!currentQuestionText) return;

    const captainName = currentCaptainName();
    const existingVote = sharedVotes[captainName] || null;
    const desiredVote = existingVote === voteType ? null : voteType;
    const nextVotes = Object.assign({}, sharedVotes);

    if (desiredVote) nextVotes[captainName] = desiredVote;
    else delete nextVotes[captainName];

    sharedVotes = nextVotes;
    updateVoteUI();
    mutateSharedVotes((roomState) => {
        roomState.votes[captainName] = desiredVote || null;
    });
}

function updateVoteUI() {
    if (!currentQuestionText) {
        const yesCountSpan = document.getElementById("yesCount");
        const noCountSpan = document.getElementById("noCount");
        if (yesCountSpan) yesCountSpan.innerText = "0";
        if (noCountSpan) noCountSpan.innerText = "0";
        setVoteNameList("yesVoters", []);
        setVoteNameList("noVoters", []);
        return;
    }

    const voteYesBtn = document.getElementById("voteYes");
    const voteNoBtn = document.getElementById("voteNo");
    const yesCountSpan = document.getElementById("yesCount");
    const noCountSpan = document.getElementById("noCount");

    if (!voteYesBtn || !voteNoBtn || !yesCountSpan || !noCountSpan) return;

    const captainName = currentCaptainName();
    const voteMap = sharedReady ? sharedVotes : {};
    const userVote = voteMap[captainName] || null;

    const yesNames = Object.keys(voteMap).filter((name) => voteMap[name] === "yes");
    const noNames = Object.keys(voteMap).filter((name) => voteMap[name] === "no");

    voteYesBtn.classList.remove("voted-yes");
    voteNoBtn.classList.remove("voted-no");
    if (userVote === "yes") voteYesBtn.classList.add("voted-yes");
    if (userVote === "no") voteNoBtn.classList.add("voted-no");

    yesCountSpan.innerText = yesNames.length;
    noCountSpan.innerText = noNames.length;
    setVoteNameList("yesVoters", yesNames);
    setVoteNameList("noVoters", noNames);
}

function setVoteNameList(listId, names) {
    const list = document.getElementById(listId);
    if (!list) return;
    list.replaceChildren();
    if (!names.length) {
        const empty = document.createElement("li");
        empty.className = "is-empty";
        empty.textContent = "—";
        list.appendChild(empty);
        return;
    }
    orderedNames(names).forEach((name) => {
        const item = document.createElement("li");
        item.textContent = name === sharedOwner ? name + " 👑" : name;
        list.appendChild(item);
    });
}

// ==========================================
// ระบบยืนยันชื่อกัปตันผู้เล่น (Modal)
// ==========================================

function getStoredCaptainName() {
    try {
        return sessionStorage.getItem("onepiece_bingo_player_name")
            || localStorage.getItem("onepiece_bingo_player_name")
            || "";
    } catch (e) {
        return "";
    }
}

function storeCaptainName(name) {
    try {
        sessionStorage.setItem("onepiece_bingo_player_name", name);
        localStorage.setItem("onepiece_bingo_player_name", name);
    } catch (e) {
        // Safari private mode can throw; keep playing with the in-memory name.
    }
}

function isCaptainModalOpen(modal) {
    return !!(modal && modal.classList.contains("is-open"));
}

function openCaptainModal(modal, nameInput) {
    if (!modal) return;

    modal.classList.add("is-open");
    document.body.classList.add("modal-open");

    if (nameInput) {
        setTimeout(() => {
            nameInput.focus();
            if (nameInput.value) nameInput.select();
        }, 0);
    }
}

function closeCaptainModal(modal) {
    if (!modal) return;

    modal.classList.remove("is-open");
    document.body.classList.remove("modal-open");
}

function saveCaptainAndSetSail(nameInput, captainNameSpan, modal) {
    if (!nameInput) return false;

    nameInput.setCustomValidity("");
    const enteredName = nameInput.value.trim();
    if (!enteredName) {
        nameInput.setCustomValidity("Please enter your Captain name");
        if (typeof nameInput.reportValidity === "function") {
            nameInput.reportValidity();
        }
        return false;
    }

    const oldName = getStoredCaptainName();
    storeCaptainName(enteredName);
    if (captainNameSpan) captainNameSpan.innerText = enteredName;
    closeCaptainModal(modal);
    if (oldName && oldName !== enteredName) {
        const roomState = currentRoomState();
        if (roomState.players[oldName]) delete roomState.players[oldName];
        roomState.players[enteredName] = Date.now();
        roomState.turnOrder = (roomState.turnOrder || []).map((name) => name === oldName ? enteredName : name);
        if (!roomState.turnOrder.includes(enteredName)) roomState.turnOrder.push(enteredName);
        if (roomState.owner === oldName) {
            roomState.owner = enteredName;
            roomState.ownerAt = Date.now();
        }
        if (roomState.drawnBy === oldName) roomState.drawnBy = enteredName;
        const previousVote = roomState.votes[oldName];
        roomState.votes[oldName] = null;
        if (previousVote) roomState.votes[enteredName] = previousVote;
        publishSharedState(roomState);
    } else {
        publishPresence(true);
        updateVoteUI();
    }
    return true;
}

function initCaptainName(signal) {
    const modal = document.getElementById("nameModal");
    const form = document.getElementById("nameForm");
    const nameInput = document.getElementById("playerNameInput");
    const captainNameSpan = document.getElementById("captainName");
    const editBtn = document.getElementById("editCaptainName");
    const submitBtn = document.getElementById("submitNameBtn");

    try {
        if (!sessionStorage.getItem("onepiece_bingo_player_name")) {
            const reused = localStorage.getItem("onepiece_bingo_player_name");
            if (reused) sessionStorage.setItem("onepiece_bingo_player_name", reused);
        }
    } catch (e) { /* ignore */ }

    const savedName = getStoredCaptainName();

    if (savedName) {
        if (captainNameSpan) captainNameSpan.innerText = savedName;
        closeCaptainModal(modal);
    } else {
        openCaptainModal(modal, nameInput);
    }

    if (nameInput) {
        nameInput.addEventListener("input", () => nameInput.setCustomValidity(""), { signal });
    }

    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            saveCaptainAndSetSail(nameInput, captainNameSpan, modal);
        }, { signal });
    }

    // Some mobile browsers skip form submit on the button; handle the click too.
    if (submitBtn) {
        submitBtn.addEventListener("click", (e) => {
            e.preventDefault();
            saveCaptainAndSetSail(nameInput, captainNameSpan, modal);
        }, { signal });
    }

    if (editBtn) {
        editBtn.addEventListener("click", () => {
            const currentName = getStoredCaptainName();
            if (nameInput) nameInput.value = currentName;
            openCaptainModal(modal, nameInput);
        }, { signal });
    }

    // Escape closes only after a captain name exists.
    document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        if (isZoomOpen()) return;
        if (!isCaptainModalOpen(modal)) return;
        if (getStoredCaptainName()) closeCaptainModal(modal);
    }, { signal });
}

// ==========================================
// คัดลอกชื่อตัวละคร + ขยายรูป
// ==========================================

let toastTimer = null;
let zoomScale = 1;
let zoomPanX = 0;
let zoomPanY = 0;
let zoomDragging = false;
let zoomLastX = 0;
let zoomLastY = 0;
let zoomPinchStart = 0;
let zoomPinchScale = 1;

function showCopyToast(message) {
    const toast = document.getElementById("copyToast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove("is-visible");
    }, 1800);
}

function copyCharacterName(name) {
    const text = (name || "").trim();
    if (!text) return Promise.resolve(false);

    const copied = () => {
        showCopyToast("Copied: " + text);
        return true;
    };

    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text).then(copied).catch(() => copyNameFallback(text));
    }
    return Promise.resolve(copyNameFallback(text));
}

function copyNameFallback(text) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
        ok = document.execCommand("copy");
    } catch (e) {
        ok = false;
    }
    area.remove();
    if (ok) showCopyToast("Copied: " + text);
    else showCopyToast("Could not copy name");
    return ok;
}

function isZoomOpen() {
    const modal = document.getElementById("zoomModal");
    return !!(modal && modal.classList.contains("is-open"));
}

function applyZoomTransform() {
    const img = document.getElementById("zoomImage");
    if (!img) return;
    img.style.transform = `translate(${zoomPanX}px, ${zoomPanY}px) scale(${zoomScale})`;
}

function setZoomScale(next) {
    zoomScale = Math.min(4, Math.max(1, next));
    if (zoomScale === 1) {
        zoomPanX = 0;
        zoomPanY = 0;
    }
    applyZoomTransform();
}

function resetZoomView() {
    zoomScale = 1;
    zoomPanX = 0;
    zoomPanY = 0;
    zoomDragging = false;
    applyZoomTransform();
}

function openCharacterZoom(imageSrc, name) {
    const modal = document.getElementById("zoomModal");
    const img = document.getElementById("zoomImage");
    const nameBtn = document.getElementById("zoomNameBtn");
    if (!modal || !img) return;

    img.src = imageSrc || "";
    img.alt = name || "";
    if (nameBtn) nameBtn.textContent = name || "";
    resetZoomView();
    const toast = document.getElementById("copyToast");
    if (toast) toast.classList.remove("is-visible");
    modal.hidden = false;
    modal.classList.add("is-open");
    document.body.classList.add("modal-open");
}

function closeCharacterZoom() {
    const modal = document.getElementById("zoomModal");
    const img = document.getElementById("zoomImage");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.hidden = true;
    if (img) img.removeAttribute("src");
    resetZoomView();
    if (!isCaptainModalOpen(document.getElementById("nameModal"))) {
        document.body.classList.remove("modal-open");
    }
}

function initImageZoom(signal) {
    const modal = document.getElementById("zoomModal");
    const stage = document.getElementById("zoomStage");
    const closeBtn = document.getElementById("zoomClose");
    const nameBtn = document.getElementById("zoomNameBtn");
    const zoomInBtn = document.getElementById("zoomInBtn");
    const zoomOutBtn = document.getElementById("zoomOutBtn");
    if (!modal) return;

    if (closeBtn) closeBtn.addEventListener("click", closeCharacterZoom, { signal });

    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeCharacterZoom();
    }, { signal });

    if (nameBtn) {
        nameBtn.addEventListener("click", () => {
            copyCharacterName(nameBtn.textContent);
        }, { signal });
    }

    if (zoomInBtn) zoomInBtn.addEventListener("click", () => setZoomScale(zoomScale + 0.5), { signal });
    if (zoomOutBtn) zoomOutBtn.addEventListener("click", () => setZoomScale(zoomScale - 0.5), { signal });

    if (stage) {
        stage.addEventListener("wheel", (e) => {
            if (!isZoomOpen()) return;
            e.preventDefault();
            setZoomScale(zoomScale + (e.deltaY < 0 ? 0.25 : -0.25));
        }, { passive: false, signal });

        stage.addEventListener("pointerdown", (e) => {
            if (e.target.closest("button")) return;
            zoomDragging = true;
            zoomLastX = e.clientX;
            zoomLastY = e.clientY;
            stage.setPointerCapture(e.pointerId);
        }, { signal });

        stage.addEventListener("pointermove", (e) => {
            if (!zoomDragging || zoomScale <= 1) return;
            zoomPanX += e.clientX - zoomLastX;
            zoomPanY += e.clientY - zoomLastY;
            zoomLastX = e.clientX;
            zoomLastY = e.clientY;
            applyZoomTransform();
        }, { signal });

        const stopDrag = () => { zoomDragging = false; };
        stage.addEventListener("pointerup", stopDrag, { signal });
        stage.addEventListener("pointercancel", stopDrag, { signal });

        stage.addEventListener("dblclick", () => {
            setZoomScale(zoomScale > 1 ? 1 : 2);
        }, { signal });

        stage.addEventListener("touchstart", (e) => {
            if (e.touches.length === 2) {
                const [a, b] = e.touches;
                const dx = a.clientX - b.clientX;
                const dy = a.clientY - b.clientY;
                zoomPinchStart = Math.hypot(dx, dy);
                zoomPinchScale = zoomScale;
            }
        }, { passive: true, signal });

        stage.addEventListener("touchmove", (e) => {
            if (e.touches.length !== 2) return;
            e.preventDefault();
            const [a, b] = e.touches;
            const dx = a.clientX - b.clientX;
            const dy = a.clientY - b.clientY;
            const dist = Math.hypot(dx, dy);
            if (zoomPinchStart) setZoomScale(zoomPinchScale * (dist / zoomPinchStart));
        }, { passive: false, signal });
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && isZoomOpen()) {
            e.preventDefault();
            closeCharacterZoom();
        }
    }, { signal });
}
