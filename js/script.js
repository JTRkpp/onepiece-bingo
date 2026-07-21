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
            drawName.innerText = finalQ.text || finalQ.question || "ไม่มีโจทย์";
            
            if (drawBtn) drawBtn.disabled = false;
        }
    }, 100); 
}

function createCustomBoard() {
    alert("ระบบกำลังสร้างกระดานแบบกำหนดเอง หรือคุณสามารถใช้ปุ่ม Random Board เพื่อเริ่มเล่นได้ทันที!");
}
