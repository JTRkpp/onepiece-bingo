let characters = [];
let questions = [];
let drawnQuestions = [];
let boardCharacters = [];

// ดึงข้อมูลจากไฟล์ JSON ทั้งสองพร้อมกันแบบถูกวิธี
Promise.all([
    fetch('data/characters.json').then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
    }),
    fetch('data/questions.json').then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
    })
])
.then(([characterData, questionData]) => {
    characters = characterData;
    questions = questionData;
    initGame();
})
.catch(error => {
    console.error('Error loading data:', error);
    document.getElementById('bingoBoard').innerHTML = '<p style="color:#760000; font-size:24px; font-weight:bold; grid-column:span 5; text-align:center;">❌ Cannot load data</p>';
});

function initGame() {
    createBoard();
    
    // ผูกเหตุการณ์กับปุ่มระบบใหม่
    document.getElementById('randomBoard').addEventListener('click', createBoard);
    document.getElementById('drawMission').addEventListener('click', drawMission);
    document.getElementById('createBoard').addEventListener('click', () => {
        alert('Custom Board Feature Coming Soon!');
    });
}

function createBoard() {
    const board = document.getElementById('bingoBoard');
    if (!board) return;
    
    board.innerHTML = '';
    document.getElementById('bingoMessage').innerText = '';
    
    // สุ่มตัวละคร 25 ตัวไม่ซ้ำกัน
    const shuffled = [...characters].sort(() => 0.5 - Math.random());
    boardCharacters = shuffled.slice(0, 25);
    
    boardCharacters.forEach((char, index) => {
        const cell = document.createElement('div');
        cell.className = 'bingo-cell';
        
        // รองรับทั้งแบบมีรูปภาพประกอบและแบบข้อความล้วน
        if (char.image) {
            const img = document.createElement('img');
            img.src = char.image;
            img.alt = char.name;
            img.style.width = '100%';
            img.style.height = '70%';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '4px';
            cell.appendChild(img);
            
            const nameSpan = document.createElement('span');
            nameSpan.innerText = char.name;
            nameSpan.style.marginTop = '4px';
            cell.appendChild(nameSpan);
        } else {
            cell.innerText = char.name;
        }
        
        // แก้ไขปัญหา Race Condition บนมือถือด้วยการใช้ pointerdown
        cell.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            cell.classList.toggle('marked');
            checkBingo();
        });
        
        board.appendChild(cell);
    });
}

function drawMission() {
    if (questions.length === 0) return;
    
    // ถ้าสุ่มจนครบหมดแล้วให้รีเซ็ตใหม่
    if (drawnQuestions.length === questions.length) {
        drawnQuestions = [];
        alert('All missions have been drawn! Resetting pool.');
    }
    
    let availableQuestions = questions.filter(q => !drawnQuestions.includes(q.id));
    let randomQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
    
    drawnQuestions.push(randomQuestion.id);
    document.getElementById('drawName').innerText = randomQuestion.text;
}

function checkBingo() {
    const cells = document.querySelectorAll('.bingo-cell');
    let markedPattern = Array(25).fill(false);
    
    cells.forEach((cell, i) => {
        if (cell.classList.contains('marked')) {
            markedPattern[i] = true;
        }
    });
    
    const bingoLines = [
        // แนวนอน
        [0,1,2,3,4], [5,6,7,8,9], [10,11,12,13,14], [15,16,17,18,19], [20,21,22,23,24],
        // แนวตั้ง
        [0,5,10,15,20], [1,6,11,16,21], [2,7,12,17,22], [3,8,13,18,23], [4,9,14,19,24],
        // แนวทแยง
        [0,6,12,18,24], [4,8,12,16,20]
    ];
    
    let isBingo = bingoLines.some(line => line.every(index => markedPattern[index]));
    
    if (isBingo) {
        document.getElementById('bingoMessage').innerText = '🎉 BINGO! 🏴‍☠️';
    } else {
        document.getElementById('bingoMessage').innerText = '';
    }
}
