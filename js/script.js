let characters = [];
let boardCharacters = [];
let marked = [];
let questionPool = [];
let questions = [];

const board = document.getElementById("bingoBoard");
const message = document.getElementById("bingoMessage");
const drawName = document.getElementById("drawName");
const customArea = document.getElementById("customArea");

// โหลดข้อมูลด้วย Promise.all และระบุ Path แบบ Relative ป้องกัน GitHub Pages พัง
Promise.all([
    fetch("data/characters.json").then(res => {
        if (!res.ok) throw new Error("Characters JSON not found");
        return res.json();
    }),
    fetch("data/questions.json").then(res => {
        if (!res.ok) throw new Error("Questions JSON not found");
        return res.json();
    })
])
.then(data => {
    characters = data[0];
    questions = data[1];
    createBoard(); // สร้างบอร์ดเริ่มต้นทันทีเมื่อโหลดผ่าน
})
.catch(error => {
    console.error("Error loading JSON data:", error);
    if (message) {
        message.innerHTML = "❌ Cannot load data";
    }
});

// ฟังก์ชันสุ่มอาเรย์แบบ Fisher-Yates (เสถียรกว่าการใช้ Math.random() - 0.5)
function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

// สร้างบอร์ดสุ่มเริ่มต้น
function createBoard() {
    if (message) message.innerHTML = ""; // เคลียร์ข้อความบิงโกเก่าออก
    boardCharacters = shuffle([...characters]).slice(0, 25);
    marked = Array(25).fill(false);
    drawBoard();
}

// วาดบอร์ดลงบน HTML
function drawBoard() {
    if (!board) return;
    board.innerHTML = "";

    boardCharacters.forEach((character, index) => {
        const cell = document.createElement("div");
        cell.className = "bingo-cell";
        cell.textContent = character.name;

        let pressTimer;
        let isLongPress = false;

        // --- ระบบควบคุมสำหรับอุปกรณ์ Mobile Touch ---
        cell.addEventListener("touchstart", (e) => {
            isLongPress = false;
            pressTimer = setTimeout(() => {
                isLongPress = true;
                let newName = prompt("แก้ชื่อตัวละคร", character.name);
                if (newName && newName.trim()) {
                    character.name = newName.trim();
                    cell.textContent = character.name;
                }
            }, 800); // กดค้าง 0.8 วินาทีเพื่อเปลี่ยนชื่อ
        }, { passive: true });

        cell.addEventListener("touchend", (e) => {
            clearTimeout(pressTimer);
            if (!isLongPress) {
                toggleCell(cell, index);
            }
            // ป้องกันไม่ให้เกิด Event 'click' ซ้อนซ้ำบนอุปกรณ์พกพา
            e.preventDefault(); 
        });

        // --- ระบบควบคุมสำหรับ PC Click ---
        cell.addEventListener("click", (e) => {
            // ถ้าเป็น Browser บนมือถือ บล็อกทิ้งไปเพราะทำงานใน touchend แล้ว
            if (e.defaultPrevented) return; 
            toggleCell(cell, index);
        });

        board.appendChild(cell);
    });
}

// เลือก/ยกเลิกการเลือกช่อง
function toggleCell(cell, index) {
    marked[index] = !marked[index];
    cell.classList.toggle("marked", marked[index]);
    checkBingo();
}

// ตรวจสอบเงื่อนไขการ Bingo
function checkBingo() {
    if (!message) return;

    const lines = [
        // แนวนอน
        [0, 1, 2, 3, 4],
        [5, 6, 7, 8, 9],
        [10, 11, 12, 13, 14],
        [15, 16, 17, 18, 19],
        [20, 21, 22, 23, 24],
        // แนวตั้ง
        [0, 5, 10, 15, 20],
        [1, 6, 11, 16, 21],
        [2, 7, 12, 17, 22],
        [3, 8, 13, 18, 23],
        [4, 9, 14, 19, 24],
        // แนวทแยง
        [0, 6, 12, 18, 24],
        [4, 8, 12, 16, 20]
    ];

    for (let line of lines) {
        if (line.every(i => marked[i])) {
            message.innerHTML = "🎉 BINGO!";
            return;
        }
    }
    message.innerHTML = ""; // ถ้ายังไม่บิงโก หรือยกเลิกจนไม่ครบแถว ให้ลบข้อความออก
}

// ปุ่มสุ่มบอร์ดใหม่
const randomBoardBtn = document.getElementById("randomBoard");
if (randomBoardBtn) {
    randomBoardBtn.onclick = function() {
        createBoard();
    };
}

// ระบบสุ่มคำถาม (Caller)
const callerBtn = document.getElementById("caller");
if (callerBtn) {
    callerBtn.onclick = function() {
        if (questions.length === 0) {
            if (drawName) drawName.innerHTML = "ไม่มีคำถามในไฟล์ข้อมูล";
            return;
        }
        
        if (questionPool.length === 0) {
            questionPool = shuffle([...questions]);
        }

        const picked = questionPool.pop();
        if (drawName && picked) {
            drawName.innerHTML = picked.question;
        }
    };
}

// ระบบสร้างบอร์ดเอง (Custom Board)
const createBoardBtn = document.getElementById("createBoard");
if (createBoardBtn) {
    createBoardBtn.onclick = function() {
        if (!customArea) return;
        customArea.innerHTML = "";

        // สร้างช่อง Input 25 ช่อง
        for (let i = 0; i < 25; i++) {
            let input = document.createElement("input");
            input.className = "custom-input";
            input.placeholder = "Character " + (i + 1);
            customArea.appendChild(input);
        }

        let button = document.createElement("button");
        button.textContent = "Create Board";

        button.onclick = function() {
            let inputs = document.querySelectorAll(".custom-input");
            boardCharacters = [];

            inputs.forEach(input => {
                boardCharacters.push({
                    name: input.value.trim() || "Empty"
                });
            });

            if (message) message.innerHTML = ""; // เคลียร์ข้อความบิงโกเก่า
            marked = Array(25).fill(false);
            drawBoard();
            customArea.innerHTML = ""; // ปิดพื้นที่กรอกข้อมูลเมื่อสร้างเสร็จ
        };

        customArea.appendChild(button);
    };
}
