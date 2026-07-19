let characters = [];

let boardCharacters = [];

let marked = [];



// Elements

const board = document.getElementById("bingoBoard");

const message = document.getElementById("bingoMessage");

const customArea = document.getElementById("customArea");



// โหลดตัวละคร

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

    boardCharacters =
    shuffle([...characters])
    .slice(0,25);


    marked =
    Array(25).fill(false);


    drawBoard();

}





// แสดงตาราง

function drawBoard(){


    board.innerHTML = "";


    boardCharacters.forEach((character,index)=>{


        const cell =
        document.createElement("div");


        cell.className =
        "bingo-cell";


        cell.innerHTML =
        character.name;



let pressTimer;


cell.onclick = function(){

    marked[index] =
    !marked[index];


    cell.classList.toggle(
        "marked",
        marked[index]
    );


    checkBingo();

};



// กดค้างเพื่อแก้ชื่อ

cell.addEventListener(
    "pointerdown",
    function(){


        pressTimer = setTimeout(function(){


            let newName = prompt(
                "แก้ชื่อตัวละคร",
                character.name
            );


            if(newName && newName.trim() !== ""){


                character.name =
                newName.trim();


                cell.innerHTML =
                character.name;


            }


        },700);


    }
);



cell.addEventListener(
    "pointerup",
    function(){

        clearTimeout(pressTimer);

    }
);



cell.addEventListener(
    "pointerleave",
    function(){

        clearTimeout(pressTimer);

    }
);



// แตะค้างเพื่อแก้ชื่อ

cell.addEventListener(
    "touchstart",
    function(){

        pressTimer = setTimeout(function(){


            let newName = prompt(
                "แก้ชื่อตัวละคร",
                character.name
            );


            if(newName && newName.trim() !== ""){


                character.name =
                newName.trim();


                cell.innerHTML =
                character.name;


            }


        },800);


    }
);



cell.addEventListener(
    "touchend",
    function(){

        clearTimeout(pressTimer);

    }
);


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





// ปุ่มสุ่มบอร์ด

document
.getElementById("randomBoard")
.onclick = createBoard;








// สร้างบอร์ดเอง

document
.getElementById("createBoard")
.onclick = function(){


    customArea.innerHTML = "";



    for(let i = 0; i < 25; i++){


        const input =
        document.createElement("input");


        input.type = "text";


        input.placeholder =
        "Character " + (i+1);


        input.className =
        "custom-input";


        customArea.appendChild(input);


    }



    const button =
    document.createElement("button");


    button.innerHTML =
    "✅ Create Bingo";


    button.onclick =
    createCustomBoard;


    customArea.appendChild(button);



};







function createCustomBoard(){


    const inputs =
    document.querySelectorAll(
        ".custom-input"
    );


    boardCharacters = [];


    inputs.forEach(input=>{


        boardCharacters.push({

            name:
            input.value.trim()
            ||
            "Empty"

        });


    });



    marked =
    Array(25).fill(false);


    drawBoard();


    customArea.innerHTML = "";

}





// Caller Mode

let callerPool = [];



document
.getElementById("drawCharacter")
.onclick = function(){



    if(callerPool.length === 0){


        callerPool =
        shuffle([...characters]);


    }



    const result =
    callerPool.pop();



    document
    .getElementById("drawName")
    .innerHTML =
    result.name;



};
