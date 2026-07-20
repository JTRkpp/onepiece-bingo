// ดึงข้อมูลคำถามไว้ใช้งานในสล็อต
let questions = [];

// จำลองการโหลดหรือผูกข้อมูลคำถามเดิมของคุณ (โค้ดดึงไฟล์ JSON เดิมควรอยู่ตรงนี้)
// ตัวอย่างเช่น: fetch('data/questions.json').then(...) หรือตัวแปรที่มีอยู่แล้ว

document.addEventListener("DOMContentLoaded", () => {
    // ผูกระบบ Click เข้ากับปุ่มไอดี drawMission ใน HTML ของคุณ
    const drawBtn = document.getElementById("drawMission");
    if (drawBtn) {
        drawBtn.addEventListener("click", drawMission);
    }
    
    // โหลดข้อมูลเริ่มต้นของคุณ (เช่น สุ่มบอร์ดเริ่มต้น)
    // initBingo(); 
});

// ฟังก์ชันหมุนสล็อตภารกิจ
function drawMission() {
    // ป้องกันกรณีที่ระบบยังโหลดไฟล์ questions.json ไม่เสร็จ
    if (typeof questions === 'undefined' || questions.length === 0) {
        // บันทึกตัวอย่างเพื่อไม่ให้โค้ดพังหากทดสอบสด
        questions = [
            { text: "ดึงการ์ดลูฟี่ให้ได้!" },
            { text: "สุ่มได้ตัวละครฝั่งทหารเรือ" },
            { text: "ได้ตัวละครกลุ่มหมวกฟาง 2 ช่อง" }
        ];
    }

    const drawName = document.getElementById('drawName');
    if (!drawName) return;

    let counter = 0;
    const maxSpin = 15; // จำนวนครั้งที่จะหมุนเร็วๆ
    
    // เอฟเฟกต์หมุนสลับโจทย์แบบสล็อตแมชชีน ทุกๆ 100 มิลลิวินาที
    const spinInterval = setInterval(() => {
        const randomQ = questions[Math.floor(Math.random() * questions.length)];
        
        // สลับแสดงผลรองรับโครงสร้างข้อมูลทั้ง .text หรือ .question
        drawName.innerText = randomQ.text || randomQ.question || "กำลังสุ่มภารกิจ...";
        counter++;
        
        // เมื่อหมุนครบรอบ ให้หยุดสล็อตแล้วดึงผลลัพธ์จริงครั้งสุดท้ายมาค้างไว้
        if (counter >= maxSpin) {
            clearInterval(spinInterval);
            const finalQ = questions[Math.floor(Math.random() * questions.length)];
            drawName.innerText = finalQ.text || finalQ.question || "ไม่มีโจทย์";
        }
    }, 100); 
}
