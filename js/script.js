// ประกาศตัวแปรส่วนกลางเพื่อเก็บข้อมูลจากไฟล์ JSON
let characters = [];
let questions = [];

// ระบบจะทำงานทันทีเมื่อหน้าเว็บโหลดเสร็จ
document.addEventListener("DOMContentLoaded", () => {
    // 1. โหลดข้อมูลจากไฟล์ JSON ทั้ง 2 ไฟล์พร้อมกัน
    Promise.all([
        fetch('data/characters.json').then(res => {
            if (!res.ok) throw new Error("ไม่สามารถโหลดไฟล์ characters.json ได้");
            return res.json();
        }),
        fetch('data/questions.json').then(res => {
            if (!res.ok) throw new Error("ไม่สามารถโหลดไฟล์ questions.json ได้");
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
        alert("เกิดข้อผิดพลาดในการเปิดระบบ กรุณาตรวจสอบว่ามีไฟล์ในโฟลเดอร์ data ครบถ้วนหรือไม่");
    });

    // 2. ผูกการทำงานเข้ากับปุ่มกดต่างๆ ใน HTML ของคุณ
    document.getElementById("randomBoard").addEventListener("click", generateRandomBoard);
    document.getElementById("drawMission").addEventListener("click", drawMission);
    document.getElementById("createBoard").addEventListener("click", createCustomBoard);
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
            <img src="${char.image}" alt="${char.name}" class="char-img" onerror="this.style.opacity='0';">
            <div class="name-plate">${char.name}</div>
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
    // ป้องกันกรณีที่ไฟล์ยังโหลดไม่เสร็จ หรือไม่มีข้อมูลภารกิจอยู่จริง
    if (questions.length === 0) {
        alert("ไม่พบข้อมูลภารกิจในไฟล์ questions.json");
        return;
    }

    const drawName = document.getElementById('drawName');
    const drawBtn = document.getElementById("drawMission");
    if (!drawName) return;

    let counter = 0;
    const maxSpin = 15; // จำนวนครั้งที่สล็อตจะหมุนสับเปลี่ยนข้อความ
    
    // ล็อคปุ่มกดชั่วคราวระหว่างที่สล็อตกำลังหมุน เพื่อป้องกันการกดรัวๆ
    if (drawBtn) drawBtn.disabled = true;

    // เริ่มการหมุนเอฟเฟกต์สล็อตแมชชีน (เปลี่ยนข้อความเร็วๆ ทุก 100 มิลลิวินาที)
    const spinInterval = setInterval(() => {
        const randomQ = questions[Math.floor(Math.random() * questions.length)];
        
        // รองรับรูปแบบไฟล์ JSON ทั้งแบบที่ใช้คีย์ .text หรือ .question
        drawName.innerText = randomQ.text || randomQ.question || "กำลังสุ่ม...";
        counter++;
        
        // เมื่อหมุนครบจำนวนครั้ง ให้หยุดการสุ่มหลอก และดึงผลลัพธ์จริงขึ้นแสดง
        if (counter >= maxSpin) {
            clearInterval(spinInterval);
            
            const finalQ = questions[Math.floor(Math.random() * questions.length)];
            drawName.innerText = finalQ.text || finalQ.question || "ไม่มีโจทย์";
            
            // ปลดล็อคปุ่มกดให้กลับมาใช้งานได้ตามปกติ
            if (drawBtn) drawBtn.disabled = false;
        }
    }, 100); 
}

// ฟังก์ชันเปิดโหมดสร้างบอร์ดเอง (คงไว้สำหรับปุ่มสร้างบอร์ดของคุณ)
function createCustomBoard() {
    alert("ระบบกำลังสร้างกระดานแบบกำหนดเอง หรือคุณสามารถใช้ปุ่ม Random Board เพื่อเริ่มเล่นได้ทันที!");
}
