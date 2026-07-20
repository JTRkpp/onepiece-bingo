let characters = [];
let boardCharacters = [];
let marked = [];
let questionPool = [];
let questions = [];

const board = document.getElementById("bingoBoard");
const message = document.getElementById("bingoMessage");
const customArea = document.getElementById("customArea");

// อ้างอิง ID ให้ตรงกับปุ่ม Draw Mission ที่แก้ไขใหม่ใน HTML
const drawMissionBtn = document.getElementById("drawMission");
const drawNameDisplay = document.getElementById("drawName");

// โหลดข้อมูลจากไฟล์ JSON
Promise.all([
    fetch("data/characters.json").then(res => res.json()),
    fetch("data/questions.json").then(res => res.json())
])
.then(data => {
    characters = data[0];
    questions = data[1]; // โหลดข้อมูลโจทย์เก็บไว้ในตัวแปร questions
    createBoard();
})
.catch(error => {
    console.error(error);
    if (message) message.innerHTML = "❌ Cannot load data";
});

// ฟังก์ชันสุ่ม
function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}

// สร้างบอร์ด
function createBoard() {
    if (message) message.innerHTML = "";
    boardCharacters = shuffle([...characters]).slice(0, 25);
    marked = Array(25).fill(false);
    drawBoard();
}

// วาดบอร์ดพร้อมรองรับการแสดงรูปภาพ
function drawBoard() {
    if (!board) return;
    board.innerHTML = "";

    boardCharacters.forEach((character, index) => {
        const cell = document.createElement("div");
        cell.className = "bingo-cell";

        // ตรวจสอบและแทรกรูปภาพ (ถ้ามีใน JSON)
        if (character.image) {
            const img = document.createElement("img");
            img.src = character.image;
            img.alt = character.name;
            
            // กำหนดขนาดรูปลงในโค้ดตรงนี้เลยเพื่อความชัวร์
            img.style.width = "70%";
            img.style.objectFit = "cover";
            img.style.pointerEvents = "none"; // ป้องกันการกดติดที่รูป
            
            cell.appendChild(img);
        }

        // แทรกชื่อตัวละคร
        const nameText = document.createElement("span");
        nameText.textContent = character.name;
        nameText.style.pointerEvents = "none";
        cell.appendChild(nameText);

        let pressTimer;
        let longPressed = false;

        // กดค้างแก้ชื่อ (Mobile)
        cell.addEventListener("touchstart", (e) => {
            longPressed = false;
            pressTimer = setTimeout(() => {
                longPressed = true;
                let newName = prompt("แก้ชื่อตัวละคร", character.name);
                if (newName && newName.trim()) {
                    character.name = newName.trim();
                    nameText.textContent = character.name; // เปลี่ยนแค่ข้อความ รูปยังอยู่
                }
            }, 800);
        }, { passive: true });

        cell.addEventListener("touchend", (e) => {
            clearTimeout(pressTimer);
            if (!longPressed) {
                toggleCell(cell, index);
            }
            e.preventDefault(); // กันการคลิกซ้ำซ้อน
        });

        // PC click
        cell.addEventListener("click", (e) => {
            if (e.defaultPrevented) return;
            toggleCell(cell, index);
        });

        board.appendChild(cell);
    });
}

// สลับสถานะช่อง
function toggleCell(cell, index) {
    marked[index] = !marked[index];
    cell.classList.toggle("marked", marked[index]);
    checkBingo();
}

// ตรวจ Bingo
function checkBingo() {
    if (!message) return;
    const lines = [
        [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
        [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24],
        [0, 6, 12, 18, 24], [4, 8, 12, 16, 20]
    ];

    for (let line of lines) {
        if (line.every(i => marked[i])) {
            message.innerHTML = "🎉 BINGO!";
            return;
        }
    }
    message.innerHTML = "";
}

// สุ่มบอร์ดใหม่
const randomBoardBtn = document.getElementById("randomBoard");
if (randomBoardBtn) {
    randomBoardBtn.onclick = function() {
        createBoard();
    };
}

// สุ่มโจทย์ (Draw Mission) ดึงจากไฟล์ questions.json
if (drawMissionBtn) {
    drawMissionBtn.onclick = function() {
        if (questions.length === 0) {
            drawNameDisplay.innerHTML = "ไม่มีโจทย์ในไฟล์ข้อมูล";
            return;
        }
        
        // ถ้าคำถามใน Pool หมด ให้โคลนกลับมาใหม่
        if (questionPool.length === 0) {
            questionPool = shuffle([...questions]);
        }

        const picked = questionPool.pop();
        // โชว์ข้อความจากคีย์ "question"
        if (drawNameDisplay && picked) {
            drawNameDisplay.innerHTML = picked.question; 
        }
    };
}

// สร้างบอร์ดเอง
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
                    image: "" // ระบบสร้างเองไม่ใส่รูป
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
