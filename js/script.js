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
        
        // ใส่โครงสร้างรูปภาพ ป้ายชื่อ และตราประทับ X
        cell.innerHTML = `
            <img src="${char.image || ''}" alt="${char.name || ''}" class="char-img" onerror="this.style.opacity='0';">
            <div class="name-plate">${char.name || ''}</div>
            <div class="stamp">❌</div>
        `;

        // เมื่อคลิกที่ช่อง ให้สลับสถานะการประทับตรา (Marked)
        cell.addEventListener("click", () => {
            cell.classList.toggle("marked");
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

    let counter = 0;
    const maxSpin = 15; 
    
    if (drawBtn) drawBtn.disabled = true;

    const spinInterval = setInterval(() => {
        const randomQ = questions[Math.floor(Math.random() * questions.length)];
        drawName.innerText = randomQ.text || randomQ.question || "กำลังสุ่ม...";
        counter++;
        
        if (counter >= maxSpin) {
            clearInterval(spinInterval);
            
            const finalQ = questions[Math.floor(Math.random() * questions.length)];
            const finalQuestionText = finalQ.text || finalQ.question || "ไม่มีโจทย์";
            drawName.innerText = finalQuestionText;
            
            if (drawBtn) drawBtn.disabled = false;

            // ตั้งค่าคำถามปัจจุบันและแสดงส่วนการโหวตด้านข้างอย่างสวยงาม
            currentQuestionText = finalQuestionText;
            
            const sideMissionText = document.getElementById("sideMissionText");
            if (sideMissionText) {
                sideMissionText.innerText = finalQuestionText;
            }
            
            if (voteInstruction) {
                voteInstruction.style.display = "none";
            }
            if (activeVoteContent) {
                activeVoteContent.style.display = "block";
            }
            
            if (voteContainer) {
                setTimeout(() => {
                    voteContainer.classList.add("visible");
                }, 50);
            }
            updateVoteUI();
        }
    }, 100); 
}

function createCustomBoard() {
    alert("ระบบกำลังสร้างกระดานแบบกำหนดเอง หรือคุณสามารถใช้ปุ่ม Random Board เพื่อเริ่มเล่นได้ทันที!");
}

// ==========================================
// ระบบโหวตเห็นด้วยหรือไม่เห็นด้วย (ไม่ต้องล็อกอิน)
// ==========================================

let currentQuestionText = "";

// ฟังก์ชันสร้าง Hash สำหรับสุ่มตัวเลขแบบคงที่ (Deterministic Hash) ตามข้อความคำถาม
function getQuestionHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

// ฟังก์ชันหาค่าคะแนนโหวตตั้งต้นแบบคงที่ (เพื่อให้ดูเหมือนมีคนเคยโหวตแล้วจริงๆ)
function getBaselineVotes(questionText) {
    const hash = getQuestionHash(questionText);
    const yesBaseline = (hash % 120) + 20; // 20 - 139 โหวต
    const noBaseline = ((hash >> 2) % 40) + 5; // 5 - 44 โหวต
    return { yes: yesBaseline, no: noBaseline };
}

// จัดการการโหวต Yes/No
function handleVote(voteType) {
    if (!currentQuestionText) return;
    
    let userVotes = {};
    try {
        userVotes = JSON.parse(localStorage.getItem('onepiece_bingo_user_votes')) || {};
    } catch(e) {
        userVotes = {};
    }
    
    const existingVote = userVotes[currentQuestionText] || null;
    
    if (existingVote === voteType) {
        // หากกดซ้ำตัวเดิม ให้ยกเลิกการโหวต (Toggle Off)
        delete userVotes[currentQuestionText];
    } else {
        // บันทึก/เปลี่ยนประเภทการโหวต
        userVotes[currentQuestionText] = voteType;
    }
    
    localStorage.setItem('onepiece_bingo_user_votes', JSON.stringify(userVotes));
    
    // อัปเดต UI เพื่อแสดงจำนวนผลลัพธ์ใหม่ทันที
    updateVoteUI();
}

// อัปเดตการแสดงผลหน้าเว็บ
function updateVoteUI() {
    if (!currentQuestionText) return;
    
    const voteYesBtn = document.getElementById("voteYes");
    const voteNoBtn = document.getElementById("voteNo");
    const yesCountSpan = document.getElementById("yesCount");
    const noCountSpan = document.getElementById("noCount");
    
    if (!voteYesBtn || !voteNoBtn || !yesCountSpan || !noCountSpan) return;
    
    // ดึงค่าคะแนนตั้งต้นของคำถามนี้
    const baseline = getBaselineVotes(currentQuestionText);
    
    // ดึงสถานะการโหวตของผู้ใช้งานจาก localStorage
    let userVotes = {};
    try {
        userVotes = JSON.parse(localStorage.getItem('onepiece_bingo_user_votes')) || {};
    } catch(e) {
        userVotes = {};
    }
    const userVote = userVotes[currentQuestionText] || null;
    
    let yesCount = baseline.yes;
    let noCount = baseline.no;
    
    // รีเซ็ตการตกแต่งสไตล์ของปุ่มโหวต
    voteYesBtn.classList.remove("voted-yes");
    voteNoBtn.classList.remove("voted-no");
    
    // เพิ่มคะแนนโหวตของผู้ใช้ปัจจุบันเข้าไป และไฮไลท์สีปุ่ม
    if (userVote === "yes") {
        yesCount += 1;
        voteYesBtn.classList.add("voted-yes");
    } else if (userVote === "no") {
        noCount += 1;
        voteNoBtn.classList.add("voted-no");
    }
    
    // อัปเดตตัวเลขแสดงผล
    yesCountSpan.innerText = yesCount;
    noCountSpan.innerText = noCount;
}

// ==========================================
// ระบบยืนยันชื่อกัปตันผู้เล่น (Modal)
// ==========================================

function initCaptainName() {
    const modal = document.getElementById("nameModal");
    const form = document.getElementById("nameForm");
    const nameInput = document.getElementById("playerNameInput");
    const captainNameSpan = document.getElementById("captainName");
    const editBtn = document.getElementById("editCaptainName");
    
    // ดึงชื่อกัปตันจาก localStorage
    const savedName = localStorage.getItem("onepiece_bingo_player_name");
    
    if (savedName) {
        if (captainNameSpan) captainNameSpan.innerText = savedName;
        if (modal) modal.classList.add("hidden");
    } else {
        if (modal) modal.classList.remove("hidden");
    }
    
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const enteredName = nameInput.value.trim();
            if (enteredName) {
                localStorage.setItem("onepiece_bingo_player_name", enteredName);
                if (captainNameSpan) captainNameSpan.innerText = enteredName;
                if (modal) modal.classList.add("hidden");
                nameInput.value = ""; // เคลียร์ช่องอินพุต
            }
        });
    }
    
    if (editBtn) {
        editBtn.addEventListener("click", () => {
            const currentName = localStorage.getItem("onepiece_bingo_player_name") || "";
            if (nameInput) nameInput.value = currentName;
            if (modal) modal.classList.remove("hidden");
        });
    }
}
