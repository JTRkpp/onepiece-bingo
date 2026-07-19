alert("JS WORKING");

let characters = [];
let boardCharacters = [];
let marked = [];

const board = document.getElementById("bingo-board");
const message = document.getElementById("bingo-message");
const callerResult = document.getElementById("caller-result");

const customPanel = document.getElementById("custom-panel");
const customInputs = document.getElementById("custom-inputs");



// โหลดข้อมูลตัวละคร

fetch("data/characters.json")

.then(response => {

    if (!response.ok) {

        throw new Error("Cannot load characters.json");

    }

    return response.json();

})

.then(data => {

    characters = data;

    createBoard();

})

.catch(error => {

    console.error(error);

    message.innerHTML =
    "❌ Cannot load characters";

});





// สุ่ม

function shuffle(array){

    return array.sort(
        () => Math.random() - 0.5
    );

}





// สร้างบอร์ดสุ่ม

function createBoard(){

    board.innerHTML = "";

    message.innerHTML = "";


    boardCharacters =
    shuffle([...characters])
    .slice(0,25);


    marked =
    Array(25).fill(false);


    drawBoard();

}






// แสดงบอร์ด

function drawBoard(){


    board.innerHTML = "";


    boardCharacters.forEach((character,index)=>{


        const cell =
        document.createElement("div");


        cell.className =
        "bingo-cell";


        cell.innerHTML =
        character.name;



        cell.onclick = function(){


            marked[index] =
            !marked[index];


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

function checkBingo(){


    const lines = [


        [0,1,2,3,4],
        [5,6,7,8,9],
        [10,11,12,13,14],
        [15,16,17,18,19],
        [20,21,22,23,24],


        [0,5,10,15,20],
        [1,6,11,16,21],
        [2,7,12,17,22],
        [3,8,13,18,23],
        [4,9,14,19,24],


        [0,6,12,18,24],
        [4,8,12,16,20]

    ];



    for(let line of lines){


        if(line.every(i => marked[i])){


            message.innerHTML =
            "🎉 BINGO!";


            return;

        }

    }


    message.innerHTML = "";

}







// Random Board

document
.getElementById("new-board")
.onclick = createBoard;







// =======================
// Custom Board
// =======================



document
.getElementById("custom-mode")
.onclick = function(){


    customPanel.style.display =
    "block";


    customInputs.innerHTML =
    "";



    for(let i = 0; i < 25; i++){


        const input =
        document.createElement("input");


        input.type =
        "text";


        input.placeholder =
        "Character " + (i+1);


        input.className =
        "custom-input";


        customInputs.appendChild(input);


    }


};








document
.getElementById("create-custom")
.onclick = function(){



    const inputs =
    document.querySelectorAll(
        ".custom-input"
    );



    let names = [];



    inputs.forEach(input => {


        names.push(

            input.value.trim()
            ||
            "Empty"

        );


    });





    boardCharacters =
    names.map(name => ({

        name:name

    }));




    marked =
    Array(25).fill(false);



    drawBoard();



    customPanel.style.display =
    "none";



};









// Caller Mode


let callerPool = [];



document
.getElementById("caller")
.onclick = function(){


    if(callerPool.length === 0){


        callerPool =
        shuffle([...characters]);


    }



    const picked =
    callerPool.pop();



    callerResult.innerHTML =
    picked.name;


};
