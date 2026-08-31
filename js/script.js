// ประกาศตัวแปรส่วนกลางเพื่อเก็บข้อมูลจากไฟล์ JSON
let characters = [];
let questions = [];

// ระบบจะทำงานทันทีเมื่อหน้าเว็บโหลดเสร็จ
document.addEventListener("DOMContentLoaded", () => {
    // 1. โหลดข้อมูลจากไฟล์ JSON ทั้ง 2 ไฟล์พร้อมกัน
    Promise.all([
        fetch('data/characters.json').then(res => {
            if (!res.ok) throw new Error("ไม่สามารถอ่านไฟล์ characters.json ได้ (ไฟล์อาจไม่มีอยู่จริง)");
            return res.json();
        }),
        fetch('data/questions.json').then(res => {
            if (!res.ok) throw new Error("ไม่สามารถอ่านไฟล์ questions.json ได้ (ไฟล์อาจไม่มีอยู่จริง)");
            return res.json();
        })
    ])
    .then(([charData, questData]) => {
        characters = charData;
        questions = questData;
        
        // เมื่อโหลดข้อมูลเสร็จ ให้สร้างตารางบิงโกเริ่มต้นทันที
        generateRandomBoard();
    })
    .catch(err => {
        console.error("เกิดข้อผิดพลาดในการโหลดข้อมูล:", err);
        alert("เกิดข้อผิดพลาดในการเปิดระบบ: กรุณาตรวจสอบรูปแบบไฟล์ในโฟลเดอร์ data (ต้องไม่มี Syntax Error ใน JSON)");
    });

    // 2. ผูกการทำงานเข้ากับปุ่มกดต่างๆ ใน HTML (เช็กว่ามีปุ่มก่อนผูก Event)
    const randomBtn = document.getElementById("randomBoard");
    if (randomBtn) randomBtn.addEventListener("click", generateRandomBoard);

    const drawBtn = document.getElementById("drawMission");
    if (drawBtn) drawBtn.addEventListener("click", drawMission);

    const createBtn = document.getElementById("createBoard");
    if (createBtn) createBtn.addEventListener("click", createCustomBoard);

    // 3. ผูกระบบโหวต Yes/No (ไม่ต้องเข้าสู่ระบบ)
    const voteYesBtn = document.getElementById("voteYes");
    const voteNoBtn = document.getElementById("voteNo");
    if (voteYesBtn) voteYesBtn.addEventListener("click", () => handleVote("yes"));
    if (voteNoBtn) voteNoBtn.addEventListener("click", () => handleVote("no"));

    // 4. ระบบยืนยันชื่อกัปตันผู้เล่น (Modal)
    initCaptainName();

    // 5. ขยายรูปตัวละคร + คัดลอกชื่อ
    initImageZoom();

    // 6. ซิงก์ภารกิจและโหวตให้กัปตันทุกคนเห็นชุดเดียวกัน
    initSharedGame();
});

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
        img.src = charImage;
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
            openCharacterZoom(charImage, charName);
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

    const finishDraw = () => {
        if (finished) return;
        finished = true;
        clearInterval(spinInterval);

        const finalQ = questions[Math.floor(Math.random() * questions.length)];
        const finalQuestionText = finalQ.text || finalQ.question || "ไม่มีโจทย์";
        drawName.innerText = finalQuestionText;
        if (drawBtn) drawBtn.disabled = false;

        currentQuestionText = finalQuestionText;

        const sideMissionText = document.getElementById("sideMissionText");
        if (sideMissionText) sideMissionText.innerText = finalQuestionText;

        if (voteInstruction) voteInstruction.style.display = "none";
        if (activeVoteContent) activeVoteContent.style.display = "block";
        if (voteContainer) voteContainer.classList.add("visible");

        isDrawingMission = false;
        publishSharedState({
            mission: finalQuestionText,
            drawnAt: Date.now(),
            votes: {}
        });
        updateVoteUI();
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
let roomChannel = null;
const SHARED_STATE_URL = "https://crudcrud.com/api/9c5b4d6815ff47418ff345eeaae422b4/bingo/6a959c18b8c09503e80d4b95";
const SHARED_POLL_MS = 2000;

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
    return { mission: "", drawnAt: 0, votes: {} };
}

function stateSignature(state) {
    const votes = state && state.votes ? state.votes : {};
    return JSON.stringify({
        mission: (state && state.mission) || "",
        drawnAt: (state && state.drawnAt) || 0,
        votes
    });
}

function stripDocId(data) {
    if (!data || typeof data !== "object") return { rooms: {} };
    const copy = Object.assign({}, data);
    delete copy._id;
    if (!copy.rooms || typeof copy.rooms !== "object") copy.rooms = {};
    return copy;
}

async function fetchSharedDocument() {
    const res = await fetch(SHARED_STATE_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("shared state " + res.status);
    return stripDocId(await res.json());
}

async function saveSharedDocument(doc) {
    const payload = stripDocId(doc);
    const res = await fetch(SHARED_STATE_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("shared save " + res.status);
    return payload;
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

    const sideMissionText = document.getElementById("sideMissionText");
    if (sideMissionText) sideMissionText.innerText = mission;

    const voteInstruction = document.getElementById("voteInstruction");
    const activeVoteContent = document.getElementById("activeVoteContent");
    const voteContainer = document.getElementById("voteContainer");

    if (voteInstruction) voteInstruction.style.display = "none";
    if (activeVoteContent) activeVoteContent.style.display = "block";
    if (voteContainer) voteContainer.classList.add("visible");
}

function applySharedState(state, fromBroadcast) {
    if (!state) return;
    const incomingDrawn = Number(state.drawnAt) || 0;
    if (incomingDrawn < sharedDrawnAt) return;
    if (!state.mission && currentQuestionText && incomingDrawn === 0) return;
    const signature = stateSignature(state);
    if (signature === appliedStateSignature) return;
    appliedStateSignature = signature;
    sharedDrawnAt = incomingDrawn;

    sharedVotes = Object.assign({}, state.votes || {});
    sharedReady = true;
    cacheRoomState(state);

    if (!isDrawingMission && state.mission) {
        showSharedMission(state.mission);
    }

    updateVoteUI();

    if (!fromBroadcast && roomChannel) {
        try { roomChannel.postMessage(state); } catch (e) { /* ignore */ }
    }
}

async function publishSharedState(nextRoomState) {
    const roomId = getRoomId();
    applySharedState(nextRoomState, true);
    if (roomChannel) {
        try { roomChannel.postMessage(nextRoomState); } catch (e) { /* ignore */ }
    }
    try {
        const doc = await fetchSharedDocument();
        doc.rooms[roomId] = nextRoomState;
        await saveSharedDocument(doc);
    } catch (err) {
        console.warn("ไม่สามารถซิงก์ภารกิจให้ผู้เล่นคนอื่นได้:", err);
    }
}

async function mutateSharedVotes(mutator) {
    const roomId = getRoomId();
    const writeRoom = async () => {
        const doc = await fetchSharedDocument();
        const roomState = doc.rooms[roomId] || emptyRoomState();
        roomState.votes = Object.assign({}, roomState.votes || {});
        mutator(roomState);
        if (!roomState.mission) roomState.mission = currentQuestionText;
        doc.rooms[roomId] = roomState;
        await saveSharedDocument(doc);
        return roomState;
    };

    try {
        let roomState = await writeRoom();
        // อ่านอีกรอบแล้วใส่โหวตของเราทับ เพื่อไม่ให้คนอื่นโหวตพร้อมกันแล้วชื่อหาย
        roomState = await writeRoom();
        applySharedState(roomState, false);
    } catch (err) {
        console.warn("ไม่สามารถอัปเดตโหวตแบบเรียลไทม์ได้:", err);
        const localState = {
            mission: currentQuestionText,
            drawnAt: Date.now(),
            votes: Object.assign({}, sharedVotes)
        };
        mutator(localState);
        applySharedState(localState, false);
    }
}

async function pullSharedState() {
    if (isDrawingMission) return;
    try {
        const doc = await fetchSharedDocument();
        const roomState = doc.rooms[getRoomId()] || emptyRoomState();
        applySharedState(roomState, false);
    } catch (err) {
        const cached = readCachedRoomState();
        if (cached) applySharedState(cached, true);
    }
}

function initSharedGame() {
    const roomId = getRoomId();
    const roomLabel = document.getElementById("roomNameLabel");
    if (roomLabel) roomLabel.textContent = roomId;

    if ("BroadcastChannel" in window) {
        roomChannel = new BroadcastChannel("onepiece-bingo-" + roomId);
        roomChannel.onmessage = (event) => applySharedState(event.data, true);
    }

    const cached = readCachedRoomState();
    if (cached && cached.mission) applySharedState(cached, true);

    pullSharedState();
    setInterval(pullSharedState, SHARED_POLL_MS);
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
        if (desiredVote) roomState.votes[captainName] = desiredVote;
        else delete roomState.votes[captainName];
    });
}

function updateVoteUI() {
    if (!currentQuestionText) return;

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
    names.forEach((name) => {
        const item = document.createElement("li");
        item.textContent = name;
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
    if (oldName && oldName !== enteredName && currentQuestionText) {
        mutateSharedVotes((roomState) => {
            const previousVote = roomState.votes[oldName];
            delete roomState.votes[oldName];
            if (previousVote) roomState.votes[enteredName] = previousVote;
        });
    } else {
        updateVoteUI();
    }
    return true;
}

function initCaptainName() {
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
        nameInput.addEventListener("input", () => nameInput.setCustomValidity(""));
    }

    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            saveCaptainAndSetSail(nameInput, captainNameSpan, modal);
        });
    }

    // Some mobile browsers skip form submit on the button; handle the click too.
    if (submitBtn) {
        submitBtn.addEventListener("click", (e) => {
            e.preventDefault();
            saveCaptainAndSetSail(nameInput, captainNameSpan, modal);
        });
    }

    if (editBtn) {
        editBtn.addEventListener("click", () => {
            const currentName = getStoredCaptainName();
            if (nameInput) nameInput.value = currentName;
            openCaptainModal(modal, nameInput);
        });
    }

    // Escape closes only after a captain name exists.
    document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        if (isZoomOpen()) return;
        if (!isCaptainModalOpen(modal)) return;
        if (getStoredCaptainName()) closeCaptainModal(modal);
    });
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

function initImageZoom() {
    const modal = document.getElementById("zoomModal");
    const stage = document.getElementById("zoomStage");
    const closeBtn = document.getElementById("zoomClose");
    const nameBtn = document.getElementById("zoomNameBtn");
    const zoomInBtn = document.getElementById("zoomInBtn");
    const zoomOutBtn = document.getElementById("zoomOutBtn");
    if (!modal) return;

    if (closeBtn) closeBtn.addEventListener("click", closeCharacterZoom);

    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeCharacterZoom();
    });

    if (nameBtn) {
        nameBtn.addEventListener("click", () => {
            copyCharacterName(nameBtn.textContent);
        });
    }

    if (zoomInBtn) zoomInBtn.addEventListener("click", () => setZoomScale(zoomScale + 0.5));
    if (zoomOutBtn) zoomOutBtn.addEventListener("click", () => setZoomScale(zoomScale - 0.5));

    if (stage) {
        stage.addEventListener("wheel", (e) => {
            if (!isZoomOpen()) return;
            e.preventDefault();
            setZoomScale(zoomScale + (e.deltaY < 0 ? 0.25 : -0.25));
        }, { passive: false });

        stage.addEventListener("pointerdown", (e) => {
            if (e.target.closest("button")) return;
            zoomDragging = true;
            zoomLastX = e.clientX;
            zoomLastY = e.clientY;
            stage.setPointerCapture(e.pointerId);
        });

        stage.addEventListener("pointermove", (e) => {
            if (!zoomDragging || zoomScale <= 1) return;
            zoomPanX += e.clientX - zoomLastX;
            zoomPanY += e.clientY - zoomLastY;
            zoomLastX = e.clientX;
            zoomLastY = e.clientY;
            applyZoomTransform();
        });

        const stopDrag = () => { zoomDragging = false; };
        stage.addEventListener("pointerup", stopDrag);
        stage.addEventListener("pointercancel", stopDrag);

        stage.addEventListener("dblclick", () => {
            setZoomScale(zoomScale > 1 ? 1 : 2);
        });

        stage.addEventListener("touchstart", (e) => {
            if (e.touches.length === 2) {
                const [a, b] = e.touches;
                const dx = a.clientX - b.clientX;
                const dy = a.clientY - b.clientY;
                zoomPinchStart = Math.hypot(dx, dy);
                zoomPinchScale = zoomScale;
            }
        }, { passive: true });

        stage.addEventListener("touchmove", (e) => {
            if (e.touches.length !== 2) return;
            e.preventDefault();
            const [a, b] = e.touches;
            const dx = a.clientX - b.clientX;
            const dy = a.clientY - b.clientY;
            const dist = Math.hypot(dx, dy);
            if (zoomPinchStart) setZoomScale(zoomPinchScale * (dist / zoomPinchStart));
        }, { passive: false });
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && isZoomOpen()) {
            e.preventDefault();
            closeCharacterZoom();
        }
    });
}
