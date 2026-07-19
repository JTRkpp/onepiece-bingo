let characters = [];

let boardCharacters = [];

let marked = [];

let callerPool = [];



const board =
document.getElementById("bingoBoard");


const message =
document.getElementById("bingoMessage");


const drawName =
document.getElementById("drawName");


const customArea =
document.getElementById("customArea");





// โหลดตัวละคร

fetch("data/characters.json")

.then(response => response.json())

.then(data => {

    characters = data;

    createBoard();

})

.catch(error => {

    console.log(error);

    message.innerHTML =
    "❌ Cannot load characters";

});







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








// วาดตาราง

function drawBoard(){


    board.innerHTML = "";



    boardCharacters.forEach(
    (character,index)=>{


        const cell =
        document.createElement("div");



        cell.className =
        "bingo-cell";



        cell.innerHTML =
        character.name;



        let pressTimer = null;

        let longPress = false;





        // แตะ = กากบาท

        cell.addEventListener(
        "pointerdown",
        function(){


            longPress = false;


            pressTimer =
            setTimeout(function(){


                longPress = true;


                let newName =
                prompt(
                    "แก้ชื่อตัวละคร",
                    character.name
                );



                if(
                newName &&
                newName.trim() !== ""
                ){


                    character.name =
                    newName.trim();


                    cell.innerHTML =
                    character.name;


                }


            },1000);



        });







        cell.addEventListener(
        "pointerup",
        function(){



            clearTimeout(
                pressTimer
            );



            if(!longPress){


                marked[index] =
                !marked[index];



                cell.classList.toggle(
                    "marked",
                    marked[index]
                );



                checkBingo();


            }



        });






        cell.addEventListener(
        "pointercancel",
        function(){

            clearTimeout(
                pressTimer
            );

        });





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


if(line.every(i=>marked[i])){


message.innerHTML =
"🎉 BINGO!";


return;


}


}



message.innerHTML="";


}








// ปุ่มสุ่ม

document
.getElementById("randomBoard")
.onclick =
createBoard;








// Draw Character

document
.getElementById("drawCharacter")
.onclick =
function(){



if(callerPool.length===0){


callerPool =
shuffle([...characters]);


}



let result =
callerPool.pop();



drawName.innerHTML =
result.name;



};








// Create My Board

document
.getElementById("createBoard")
.onclick =
function(){


customArea.innerHTML="";


for(let i=0;i<25;i++){


let input =
document.createElement("input");


input.placeholder =
"Character "+(i+1);


input.className =
"custom-input";


customArea.appendChild(input);


}



let button =
document.createElement("button");


button.innerHTML =
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
input.value ||
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
