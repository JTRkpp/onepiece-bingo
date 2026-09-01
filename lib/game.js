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
    receivedMqtt = false;
    mqttTopic = "";
    sharedResetAt = 0;
    abortMissionDraw();
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

    const clearAllBtn = document.getElementById("clearAllData");
    if (clearAllBtn) clearAllBtn.addEventListener("click", handleClearAllData, { signal });

    const createBtn = document.getElementById("createBoard");
    if (createBtn) createBtn.addEventListener("click", createCustomBoard, { signal });

    const voteYesBtn = document.getElementById("voteYes");
    const voteNoBtn = document.getElementById("voteNo");
    const clearVotesBtn = document.getElementById("clearVotes");
    if (voteYesBtn) voteYesBtn.addEventListener("click", () => handleVote("yes"), { signal });
    if (voteNoBtn) voteNoBtn.addEventListener("click", () => handleVote("no"), { signal });
    if (clearVotesBtn) clearVotesBtn.addEventListener("click", handleClearVotes, { signal });

    initImageZoom(signal);
    initSharedGame();

    return () => {
        ac.abort();
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

        cell.append(img, namePlate, stamp);

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
    if (questions.length === 0) {
        alert("ไม่พบข้อมูลภารกิจในไฟล์ questions.json");
        return;
    }

    const drawName = document.getElementById("drawName");
    const drawBtn = document.getElementById("drawMission");
    if (!drawName) return;

    // ซ่อนและล้างสถานะโหวตเดิมเมื่อกดปุ่มสุ่มใหม่
    const voteContainer = document.getElementById("voteContainer");
    const voteInstruction = document.getElementById("voteInstruction");
    const activeVoteContent = document.getElementById("activeVoteContent");

    if (activeVoteContent) {
        activeVoteContent.style.display = "none";
    }
    if (voteInstruction) {
        voteInstruction.style.display = "block";
    }
    if (voteContainer) {
        voteContainer.classList.add("visible");
    }
    abortMissionDraw();
    currentQuestionText = "";
    isDrawingMission = true;

    let finished = false;
    const startedAt = Date.now();
    if (drawBtn) drawBtn.disabled = true;
    const clearAllBtn = document.getElementById("clearAllData");
    if (clearAllBtn) clearAllBtn.disabled = true;

    const finishDraw = () => {
        if (finished || !isDrawingMission) return;
        finished = true;
        abortMissionDraw();

        const finalQ = questions[Math.floor(Math.random() * questions.length)];
        const finalQuestionText = finalQ.text || finalQ.question || "ไม่มีโจทย์";
        renderMissionLine(finalQuestionText);
        if (drawBtn) drawBtn.disabled = false;

        currentQuestionText = finalQuestionText;

        if (voteInstruction) voteInstruction.style.display = "none";
        if (activeVoteContent) activeVoteContent.style.display = "block";
        if (voteContainer) voteContainer.classList.add("visible");

        isDrawingMission = false;
        const roomState = currentRoomState();
        roomState.mission = finalQuestionText;
        roomState.drawnAt = Date.now();
        roomState.votes = {};
        publishSharedState(roomState);
        updateVoteUI();
        updateMissionUI();
    };

    missionSpinInterval = setInterval(() => {
        const randomQ = questions[Math.floor(Math.random() * questions.length)];
        renderMissionLine(randomQ.text || randomQ.question || "กำลังสุ่ม...");
        if (Date.now() - startedAt >= 1500) finishDraw();
    }, 100);
}

function createCustomBoard() {
    alert("ระบบกำลังสร้างกระดานแบบกำหนดเอง หรือคุณสามารถใช้ปุ่ม Random Board เพื่อเริ่มเล่นได้ทันที!");
}

// ==========================================
// ระบบโหวตเห็นด้วยหรือไม่เห็นด้วย (นับจำนวนอย่างเดียว ไม่ต้องล็อกอิน)
// ==========================================

let currentQuestionText = "";
let isDrawingMission = false;
let sharedVotes = {};
let sharedReady = false;
let appliedStateSignature = "";
let sharedDrawnAt = 0;
let sharedResetAt = 0;
let missionSpinInterval = null;
let roomChannel = null;
let mqttClient = null;
let mqttTopic = "";
let receivedMqtt = false;
let fallbackVoterId = "";
const MQTT_BROKERS = [
    "wss://broker.emqx.io:8084/mqtt",
    "wss://broker.hivemq.com:8884/mqtt"
];

function getRoomId() {
    const raw = new URLSearchParams(window.location.search).get("room") || "crew";
    const cleaned = raw.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24);
    return cleaned || "crew";
}

// รหัสเครื่องแบบสุ่ม ใช้แทนชื่อผู้เล่น เพื่อให้ 1 เครื่องโหวตได้ 1 เสียง
function getVoterId() {
    try {
        let id = localStorage.getItem("onepiece_bingo_voter_id");
        if (!id) {
            id = "v-" + Math.random().toString(36).slice(2, 10);
            localStorage.setItem("onepiece_bingo_voter_id", id);
        }
        return id;
    } catch (e) {
        if (!fallbackVoterId) fallbackVoterId = "v-" + Math.random().toString(36).slice(2, 10);
        return fallbackVoterId;
    }
}

function stateSignature(state) {
    return JSON.stringify({
        mission: (state && state.mission) || "",
        drawnAt: (state && state.drawnAt) || 0,
        votes: (state && state.votes) || {},
        resetAt: (state && state.resetAt) || 0
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
        votes: Object.assign({}, sharedVotes),
        resetAt: sharedResetAt || 0
    };
}

function abortMissionDraw() {
    if (missionSpinInterval) {
        clearInterval(missionSpinInterval);
        missionSpinInterval = null;
    }
    isDrawingMission = false;
}

function unmarkBingoBoard() {
    document.querySelectorAll("#bingoBoard .bingo-cell.marked").forEach((cell) => {
        cell.classList.remove("marked");
    });
}

function clearLocalBingoStorage() {
    try {
        const toRemove = [];
        for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i);
            if (key && key.startsWith("onepiece_bingo_room_")) toRemove.push(key);
        }
        toRemove.forEach((key) => localStorage.removeItem(key));
    } catch (e) { /* ignore quota / private mode */ }
}

function handleClearAllData() {
    if (isDrawingMission) return;
    const confirmed = window.confirm(
        "ล้างข้อมูลทั้งหมดในห้องนี้?\nClear all room data: mission, votes, and board marks?"
    );
    if (!confirmed) return;

    clearLocalBingoStorage();

    const now = Date.now();
    publishSharedState({
        mission: "",
        drawnAt: now,
        votes: {},
        resetAt: now
    });

    showCopyToast("Cleared all data");
}

// ล้างเฉพาะผลโหวต โดยยังคงภารกิจเดิมไว้
function handleClearVotes() {
    if (isDrawingMission) return;
    const now = Date.now();
    const roomState = currentRoomState();
    roomState.votes = {};
    roomState.drawnAt = now;
    publishSharedState(roomState);
    showCopyToast("Cleared votes");
}

function clearVoteBoard() {
    sharedVotes = {};
    currentQuestionText = "";

    renderMissionLine("");

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
}

function idleMissionText() {
    return 'Press "Draw Mission"';
}

function renderMissionLine(missionText) {
    const textEl = document.getElementById("missionText");
    const drawName = document.getElementById("drawName");
    const source = missionText == null ? currentQuestionText : missionText;
    const text = String(source || "").trim() || idleMissionText();

    if (textEl) textEl.textContent = text;
    else if (drawName) drawName.textContent = text;
}

function updateMissionUI() {
    if (!isDrawingMission) renderMissionLine(currentQuestionText);

    const drawBtn = document.getElementById("drawMission");
    if (drawBtn && !isDrawingMission) drawBtn.disabled = false;

    const clearAllBtn = document.getElementById("clearAllData");
    if (clearAllBtn) clearAllBtn.disabled = isDrawingMission;

    const clearVotesBtn = document.getElementById("clearVotes");
    if (clearVotesBtn) clearVotesBtn.disabled = isDrawingMission;

    const drawHint = document.getElementById("drawHint");
    if (drawHint) drawHint.textContent = "กด Draw Mission เพื่อสุ่มภารกิจ";
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
    renderMissionLine(mission);

    const voteInstruction = document.getElementById("voteInstruction");
    const activeVoteContent = document.getElementById("activeVoteContent");
    const voteContainer = document.getElementById("voteContainer");

    if (voteInstruction) voteInstruction.style.display = "none";
    if (activeVoteContent) activeVoteContent.style.display = "block";
    if (voteContainer) voteContainer.classList.add("visible");
    updateMissionUI();
}

// รูปแบบผลโหวต: { voterId: { choice: "yes" | "no" | null, at: timestamp } }
// เก็บ choice = null ไว้เป็นร่องรอยการยกเลิกโหวต เพื่อให้เครื่องอื่นลบตามได้
function normalizeVotes(raw) {
    const votes = {};
    Object.keys(raw || {}).forEach((voter) => {
        const entry = raw[voter];
        if (entry === "yes" || entry === "no") {
            votes[voter] = { choice: entry, at: 0 };
            return;
        }
        if (!entry || typeof entry !== "object") return;
        const choice = entry.choice === "yes" || entry.choice === "no" ? entry.choice : null;
        votes[voter] = { choice, at: Number(entry.at) || 0 };
    });
    return votes;
}

function mergeVoteMaps(base, incoming) {
    const merged = Object.assign({}, base);
    const next = normalizeVotes(incoming);
    Object.keys(next).forEach((voter) => {
        const current = merged[voter];
        // เทียบเวลาเฉพาะของผู้โหวตคนนั้น ข้อความเก่าที่มาช้าจึงทับของใหม่ไม่ได้
        if (!current || next[voter].at >= (current.at || 0)) merged[voter] = next[voter];
    });
    return merged;
}

function countVotes(votes, choice) {
    return Object.keys(votes || {}).filter((voter) => votes[voter] && votes[voter].choice === choice).length;
}

function applySharedState(state, fromBroadcast) {
    if (!state) return;
    const incomingResetAt = Number(state.resetAt) || 0;
    if (incomingResetAt < sharedResetAt) return;

    if (incomingResetAt > sharedResetAt) {
        sharedResetAt = incomingResetAt;
        sharedDrawnAt = 0;
        sharedVotes = {};
        currentQuestionText = "";
        appliedStateSignature = "";
        abortMissionDraw();
        unmarkBingoBoard();
    }

    const incomingDrawn = Number(state.drawnAt) || 0;
    if (!state.mission && currentQuestionText && incomingDrawn === 0 && incomingDrawn < sharedDrawnAt) return;

    let nextMission = currentQuestionText || "";
    let nextDrawnAt = sharedDrawnAt;
    let nextVotes = sharedVotes;

    if (incomingDrawn > sharedDrawnAt && (state.mission || incomingDrawn > 0)) {
        // รอบโหวตใหม่: เริ่มนับใหม่จากผลโหวตที่ส่งมา
        nextMission = state.mission || "";
        nextDrawnAt = incomingDrawn;
        nextVotes = mergeVoteMaps({}, state.votes);
    } else if (incomingDrawn === sharedDrawnAt) {
        if (state.mission) nextMission = state.mission;
        nextVotes = mergeVoteMaps(sharedVotes, state.votes);
    } else if (!sharedDrawnAt && state.mission) {
        nextMission = state.mission;
        nextDrawnAt = incomingDrawn;
        nextVotes = mergeVoteMaps({}, state.votes);
    }

    const nextState = {
        mission: nextMission,
        drawnAt: nextDrawnAt,
        votes: nextVotes,
        resetAt: sharedResetAt
    };
    const signature = stateSignature(nextState);
    if (signature === appliedStateSignature) return;
    appliedStateSignature = signature;
    sharedDrawnAt = nextDrawnAt;
    sharedVotes = nextVotes;
    sharedReady = true;
    cacheRoomState(nextState);

    if (!isDrawingMission && nextState.mission) {
        showSharedMission(nextState.mission);
    } else {
        if (!isDrawingMission && !nextState.mission) clearVoteBoard();
        else currentQuestionText = nextState.mission || "";
        updateMissionUI();
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
                    if (cached.mission || cached.resetAt || Object.keys(cached.votes || {}).length) {
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
    if (cached && cached.mission) applySharedState(cached, true);

    connectMqtt(0);
    updateMissionUI();
}

// จัดการการโหวต Yes/No (1 เครื่อง = 1 เสียง กดซ้ำเพื่อยกเลิก)
function handleVote(voteType) {
    if (!currentQuestionText) return;

    const voterId = getVoterId();
    const existing = sharedVotes[voterId];
    const existingChoice = (existing && existing.choice) || null;
    const desiredVote = existingChoice === voteType ? null : voteType;

    sharedVotes = Object.assign({}, sharedVotes, {
        [voterId]: { choice: desiredVote, at: Date.now() }
    });
    updateVoteUI();

    const roomState = currentRoomState();
    if (!roomState.mission) roomState.mission = currentQuestionText;
    if (!roomState.drawnAt) roomState.drawnAt = Date.now();
    publishSharedState(roomState);
}

function updateVoteUI() {
    const yesCountSpan = document.getElementById("yesCount");
    const noCountSpan = document.getElementById("noCount");
    const voteYesBtn = document.getElementById("voteYes");
    const voteNoBtn = document.getElementById("voteNo");

    if (!currentQuestionText) {
        if (yesCountSpan) yesCountSpan.innerText = "0";
        if (noCountSpan) noCountSpan.innerText = "0";
        if (voteYesBtn) voteYesBtn.classList.remove("voted-yes");
        if (voteNoBtn) voteNoBtn.classList.remove("voted-no");
        return;
    }

    if (!voteYesBtn || !voteNoBtn || !yesCountSpan || !noCountSpan) return;

    const voteMap = sharedReady ? sharedVotes : {};
    const myVote = voteMap[getVoterId()];
    const userVote = (myVote && myVote.choice) || null;

    const yesCount = countVotes(voteMap, "yes");
    const noCount = countVotes(voteMap, "no");

    voteYesBtn.classList.remove("voted-yes");
    voteNoBtn.classList.remove("voted-no");
    if (userVote === "yes") voteYesBtn.classList.add("voted-yes");
    if (userVote === "no") voteNoBtn.classList.add("voted-no");

    yesCountSpan.innerText = yesCount;
    noCountSpan.innerText = noCount;
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
    document.body.classList.remove("modal-open");
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
