let characters = [];
let boardCharacters = [];
let marked = [];

const board = document.getElementById("bingo-board");
const message = document.getElementById("bingo-message");
const callerResult = document.getElementById("caller-result");


// โหลดรายชื่อตัวละคร
fetch("data/characters.json")
    .then(response => response.json())
    .then(data => {

        characters = data;
        createBoard();

    });


// สุ่มข้อมูล
function shuffle(array) {

    return array.sort(() => Math.random() - 0.5);

}


// สร้างกระดาน Bingo
function createBoard() {

    board.innerHTML = "";
    message.innerHTML = "";

    boardCharacters = shuffle([...characters]).slice(0, 25);

    marked = Array(25).fill(false);


    boardCharacters.forEach((character, index) => {


        let cell = document.createElement("div");

        cell.className = "bingo-cell";


        cell.innerHTML = `

            <span>${character.name}</span>

        `;


        cell.onclick = () => {

            marked[index] = !marked[index];

            cell.classList.toggle(
                "marked",
                marked[index]
            );


            checkBingo();

        };


        board.appendChild(cell);


    });

}



// ตรวจ Bingo
function checkBingo() {


    let lines = [

        // แนวนอน
        [0,1,2,3,4],
        [5,6,7,8,9],
        [10,11,12,13,14],
        [15,16,17,18,19],
        [20,21,22,23,24],

        // แนวตั้ง
        [0,5,10,15,20],
        [1,6,11,16,21],
        [2,7,12,17,22],
        [3,8,13,18,23],
        [4,9,14,19,24],

        // ทแยง
        [0,6,12,18,24],
        [4,8,12,16,20]

    ];


    for (let line of lines) {


        if (line.every(index => marked[index])) {

            message.innerHTML = "🎉 BINGO!";

            return;

        }

    }


    message.innerHTML = "";

}



// ปุ่มสร้างกระดานใหม่
document
    .getElementById("new-board")
    .onclick = createBoard;



// Caller Mode

let callerPool = [];


document
    .getElementById("caller")
    .onclick = function () {


        if (callerPool.length === 0) {

            callerPool = shuffle([...characters]);

        }


        let picked = callerPool.pop();


        callerResult.innerHTML = picked.name;


    };
