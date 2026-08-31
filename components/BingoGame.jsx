"use client";

import { useEffect } from "react";
import { initGame } from "../lib/game";

export default function BingoGame() {
  useEffect(() => initGame(), []);

  return (
    <>
      <header>
        <h1>🏴‍☠️ ONE PIECE CHARACTER BINGO</h1>
      </header>

      <main>
        <div className="buttons">
          <button id="randomBoard" type="button">🎲 Random Board</button>
          <button id="drawMission" type="button">🎰 Draw Mission</button>
          <button id="nextCaptain" type="button">➡️ Next Captain</button>
        </div>
        <p id="drawHint" className="draw-hint">
          เจ้าของภารกิจกด Draw Mission · Next Captain ส่งตาให้กัปตันคนถัดไป
        </p>

        <div id="drawResult">
          <h2>Mission</h2>
          <div id="wantedBox">
            <div className="wanted-inner">
              <p id="drawName">Press &quot;Draw Mission&quot;</p>
              <p id="missionOwnerLabel" className="mission-owner-label">
                ตัวอย่าง: ภารกิจของเจ้าของห้องจะแสดงตรงนี้
              </p>
            </div>
          </div>
        </div>

        <div id="customArea" />

        <div className="game-layout">
          <div className="left-pane">
            <div id="bingoBoard" />
            <div id="bingoMessage" />
          </div>

          <div className="right-pane">
            <div id="sideVotingBoard" className="side-board">
              <h3>🗳️ VOTING BOARD</h3>

              <div className="player-info">
                <span className="player-label">🏴‍☠️ CAPTAIN:</span>
                <span id="captainName" className="player-value">Guest</span>
                <button id="editCaptainName" className="edit-btn" title="เปลี่ยนชื่อ / Change Name" type="button">✏️</button>
              </div>
              <p className="room-owner-line">
                <span className="player-label">👑 OWNER:</span>
                <span id="roomOwnerName" className="player-value">รอเข้าห้อง</span>
              </p>
              <p className="next-captain-line">
                <span className="player-label">NEXT:</span>
                <span id="nextCaptainName" className="player-value">—</span>
              </p>
              <p className="room-live" id="roomLive">
                <span className="live-dot connecting" id="liveDot" aria-hidden="true" />
                <span id="liveStatusText">กำลังเชื่อมต่อ</span>
                · ห้อง <span id="roomNameLabel">crew</span>
              </p>
              <div className="crew-panel">
                <div className="crew-heading">ลูกเรือ · CREW</div>
                <ol id="crewRoster" className="crew-roster">
                  <li className="is-empty">ยังไม่มีลูกเรือ</li>
                </ol>
              </div>

              <div id="voteContainer" className="side-vote-container">
                <div id="voteInstruction" className="vote-instruction-text">
                  🎲 รอภารกิจจากเจ้าของภารกิจ หรือกด Draw Mission ถ้าเป็นตาคุณ
                </div>

                <div id="activeVoteContent" style={{ display: "none" }}>
                  <div className="vote-title">โหวตเห็นด้วยกับภารกิจนี้หรือไม่? (Do you agree?)</div>
                  <div className="vote-buttons">
                    <button id="voteYes" className="vote-btn" type="button">
                      👍 ใช่ <span id="yesCount" className="vote-count">0</span>
                    </button>
                    <button id="voteNo" className="vote-btn" type="button">
                      👎 ไม่ใช่ <span id="noCount" className="vote-count">0</span>
                    </button>
                  </div>
                  <div className="vote-roster" aria-live="polite">
                    <div className="vote-roster-col">
                      <div className="vote-roster-heading">ใช่ =</div>
                      <ul id="yesVoters" className="vote-roster-list"><li className="is-empty">—</li></ul>
                    </div>
                    <div className="vote-roster-col">
                      <div className="vote-roster-heading">ไม่ใช่ =</div>
                      <ul id="noVoters" className="vote-roster-list"><li className="is-empty">—</li></ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div id="nameModal" className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="nameModalTitle">
        <div className="modal-content">
          <h2 id="nameModalTitle">🏴‍☠️ One Piece Bingo & Vote</h2>
          <p className="th-desc">ยินดีต้อนรับ! กรุณากรอกชื่อกัปตันของคุณเพื่อเข้าเล่นและโหวต</p>
          <p className="en-desc">Please enter your Captain name to set sail!</p>
          <form id="nameForm">
            <label className="sr-only" htmlFor="playerNameInput">Captain Name</label>
            <input
              type="text"
              id="playerNameInput"
              name="captainName"
              placeholder="Captain Name"
              required
              maxLength={15}
              autoComplete="off"
            />
            <button type="submit" id="submitNameBtn">⚓️ เริ่มเดินทาง (Set Sail)</button>
          </form>
        </div>
      </div>

      <div id="zoomModal" className="zoom-overlay" role="dialog" aria-modal="true" aria-labelledby="zoomNameBtn" hidden>
        <button type="button" id="zoomClose" className="zoom-close" aria-label="Close">×</button>
        <div className="zoom-stage" id="zoomStage">
          <img id="zoomImage" alt="" />
        </div>
        <div className="zoom-toolbar">
          <button type="button" id="zoomOutBtn" className="zoom-ctrl" aria-label="Zoom out">−</button>
          <button type="button" id="zoomNameBtn" className="zoom-name" title="Copy name" />
          <button type="button" id="zoomInBtn" className="zoom-ctrl" aria-label="Zoom in">+</button>
        </div>
        <p className="zoom-hint">คลิกชื่อเพื่อคัดลอก · Click name to copy</p>
      </div>

      <div id="copyToast" className="copy-toast" role="status" aria-live="polite" />
    </>
  );
}
