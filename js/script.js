let characters = [];
let boardCharacters = [];
let marked = [];
let questionPool = [];
let questions = [];

const board = document.getElementById("bingoBoard");
const message = document.getElementById("bingoMessage");
const customArea = document.getElementById("customArea");

// รองรับทั้ง ID เดิมและ ID ใหม่ เผื่อคุณเปลี่ยนชื่อใน HTML เป็น drawQuestion หรือ randomQuestion
const questionDisplay = document.getElementById("drawQuestion") || document.getElementById("drawName");
const randomQuestionBtn = document.getElementById("randomQuestionBtn") || document.getElementById("caller");

// โหลดข้อมูลด้วย Promise.all
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
    createBoard(); 
})
.catch(error => {
    console.error("Error loading JSON data:", error);
    if (message) {
        message.innerHTML = "❌ Cannot load data";
    }
});

// ฟังก์ชันสุ่มอาเรย์แบบ Fisher-Yates
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
    if (message) message.innerHTML = ""; 
    boardCharacters = shuffle([...characters]).slice(0, 25);
    marked = Array(25).fill(false);
    drawBoard();
}

// วาดบอร์ดลงบน HTML (อัปเดตให้รองรับรูปภาพ)
function drawBoard() {
    if (!board) return;
    board.innerHTML = "";

    boardCharacters.forEach((character, index) => {
        const cell = document.createElement("div");
        cell.className = "bingo-cell";

        // 1. ถ้าระบุ Path รูปภาพมาใน JSON ให้สร้างแท็ก <img>
        if (character.image) {
            const img = document.createElement("img");
            img.src = character.image;
            img.alt = character.name;
            img.className = "cell-image"; // ใส่ Class ไว้จัด CSS
            cell.appendChild(img);
        }

        // 2. สร้างแท็กสำหรับใส่ชื่อ (แยกออกจากรูปภาพ)
        const nameText = document.createElement("span");
        nameText.className = "cell-name";
        nameText.textContent = character.name;
        cell.appendChild(nameText);

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
                    nameText.textContent = character.name; // เปลี่ยนแค่ข้อความ ไม่กระทบรูปภาพ
                }
            }, 800);
        }, { passive: true });

        cell.addEventListener("touchend", (e) => {
            clearTimeout(pressTimer);
            if (!isLongPress) {
                toggleCell(cell, index);
            }
            e.preventDefault(); 
        });

        // --- ระบบควบคุมสำหรับ PC Click ---
        cell.addEventListener("click", (e) => {
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
        [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24], // แนวนอน
        [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24], // แนวตั้ง
        [0, 6, 12, 18, 24], [4, 8, 12, 16, 20] // แนวทแยง
    ];

    for (let line of lines) {
        if (line.every(i => marked[i])) {
            message.innerHTML = "🎉 BINGO!";
            return;
        }
    }
    message.innerHTML = ""; 
}

// ปุ่มสุ่มบอร์ดใหม่
const randomBoardBtn = document.getElementById("randomBoard");
if (randomBoardBtn) {
    randomBoardBtn.onclick = function() {
        createBoard();
    };
}

// ระบบสุ่มโจทย์คำถาม (Random Question)
if (randomQuestionBtn) {
    randomQuestionBtn.onclick = function() {
        if (questions.length === 0) {
            if (questionDisplay) questionDisplay.innerHTML = "ไม่มีโจทย์ในไฟล์ข้อมูล";
            return;
        }
        
        // ถ้าโจทย์หมด ให้สุ่มโจทย์ชุดใหม่กลับมา
        if (questionPool.length === 0) {
            questionPool = shuffle([...questions]);
        }

        const picked = questionPool.pop();
        if (questionDisplay && picked) {
            questionDisplay.innerHTML = picked.question;
        }
    };
}

// ระบบสร้างบอร์ดเอง (Custom Board)
const createBoardBtn = document.getElementById("createBoard");
if (createBoardBtn) {
    createBoardBtn.onclick = function() {
        if (!customArea) return;
        customArea.innerHTML = "";

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
                    name: input.value.trim() || "Empty",
                    image: "" // บอร์ดสร้างเองจะไม่มีรูปภาพ
                });
            });

            if (message) message.innerHTML = ""; 
            marked = Array(25).fill(false);
            drawBoard();
            customArea.innerHTML = ""; 
        };

        customArea.appendChild(button);
    };
}
