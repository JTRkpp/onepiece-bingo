let characters = [];

let boardCharacters = [];

let marked = [];

let questionPool = [];

let questions = [];


const board = document.getElementById("bingoBoard");

const message = document.getElementById("bingoMessage");

const drawName = document.getElementById("drawName");

const customArea = document.getElementById("customArea");



// โหลดข้อมูล

Promise.all([

    fetch("data/characters.json").then(res => res.json()),

    fetch("data/questions.json").then(res => res.json())

])

.then(data => {


    characters = data[0];

    questions = data[1];


    createBoard();


})

.catch(error => {


    console.error(error);


    message.innerHTML =
    "❌ Cannot load data";


});





// สุ่ม

function shuffle(array){

    return array.sort(
        () => Math.random() - 0.5
    );

}





// สร้างบอร์ด

function createBoard(){


    boardCharacters =
    shuffle([...characters])
    .slice(0,25);


    marked =
    Array(25).fill(false);


    drawBoard();


}






// วาดบอร์ด

function drawBoard(){


    board.innerHTML = "";


    boardCharacters.forEach(
    (character,index)=>{


        const cell =
        document.createElement("div");


        cell.className =
        "bingo-cell";


        cell.textContent =
        character.name;



        let pressTimer;

        let longPressed = false;




        // กดค้างแก้ชื่อ

        cell.addEventListener(
        "touchstart",
        ()=>{


            longPressed=false;


            pressTimer =
            setTimeout(()=>{


                longPressed=true;


                let newName =
                prompt(
                    "แก้ชื่อตัวละคร",
                    character.name
                );


                if(newName && newName.trim()){


                    character.name =
                    newName.trim();


                    cell.textContent =
                    character.name;


                }


            },800);


        });




        cell.addEventListener(
        "touchend",
        ()=>{


            clearTimeout(pressTimer);


            if(!longPressed){

                toggleCell(
                    cell,
                    index
                );

            }


        });




        // PC click

        cell.addEventListener(
        "click",
        ()=>{


            toggleCell(
                cell,
                index
            );


        });



        board.appendChild(cell);


    });


}





function toggleCell(cell,index){


    marked[index] =
    !marked[index];


    cell.classList.toggle(
        "marked",
        marked[index]
    );


    checkBingo();


}






// ตรวจ Bingo

function checkBingo(){


const lines=[


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


    if(
        line.every(
            i=>marked[i]
        )
    ){


        message.innerHTML =
        "🎉 BINGO!";


        return;


    }


}



message.innerHTML="";


}







// สุ่มบอร์ด

document
.getElementById("randomBoard")
.onclick =
function(){

    createBoard();

};







// สุ่มคำถาม Caller

document
.getElementById("caller")
.onclick =
function(){


    if(questionPool.length===0){

        questionPool =
        shuffle([...questions]);

    }



    const picked =
    questionPool.pop();



    drawName.innerHTML =
    picked.question;



};








// สร้างบอร์ดเอง

document
.getElementById("createBoard")
.onclick =
function(){



customArea.innerHTML="";



for(let i=0;i<25;i++){


    let input =
    document.createElement("input");


    input.className =
    "custom-input";


    input.placeholder =
    "Character "+(i+1);


    customArea.appendChild(input);


}



let button =
document.createElement("button");


button.textContent =
"Create Board";



button.onclick =
function(){


let inputs =
document.querySelectorAll(
".custom-input"
);



boardCharacters=[];



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



customArea.innerHTML="";



};



customArea.appendChild(button);



};
