let characters = [];
let questions = [];

Promise.all([
    fetch('data/characters.json').then(res => res.json()),
    fetch('data/questions.json').then(res => res.json())
])
.then(([charData, questData]) => {
    characters = charData;
    questions = questData;
    initGame();
})
.catch(err => {
    console.error(err);
    document.getElementById('drawName').innerText = "❌ Error: Cannot load data";
});

function initGame() {
    createBoard();
    document.getElementById('randomBoard').onclick = createBoard;
    document.getElementById('drawMission').onclick = drawMission;
}

function createBoard() {
    const board = document.getElementById('bingoBoard');
    board.innerHTML = '';
    const shuffled = [...characters].sort(() => 0.5 - Math.random()).slice(0, 25);
    shuffled.forEach(char => {
        const cell = document.createElement('div');
        cell.className = 'bingo-cell';
        // ใส่โครงสร้างที่รองรับเลเยอร์
        cell.innerHTML = `
            <img src="${char.image}" class="char-img" onerror="this.src='images/default.jpg'">
            <div class="name-plate">${char.name}</div>
            <div class="stamp">❌</div>
        `;
        cell.onclick = () => cell.classList.toggle('marked');
        board.appendChild(cell);
    });
}

function drawMission() {
    if (questions.length === 0) return;
    const randomQ = questions[Math.floor(Math.random() * questions.length)];
    const textToShow = randomQ.text || randomQ.question || "ไม่มีโจทย์";
    document.getElementById('drawName').innerText = textToShow;
}
