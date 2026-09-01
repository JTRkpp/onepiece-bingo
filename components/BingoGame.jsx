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
        </div>
        <p id="drawHint" className="draw-hint">
          กด Draw Mission เพื่อสุ่มภารกิจ
        </p>

        <div id="drawResult">
          <h2>Mission</h2>
          <div id="wantedBox">
            <div className="wanted-inner">
              <p id="drawName" className="mission-line">
                <span id="missionText">Press &quot;Draw Mission&quot;</span>
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
              <div className="board-head">
                <h3>🗳️ VOTING BOARD</h3>
                <p className="room-live" id="roomLive">
                  <span className="live-dot connecting" id="liveDot" aria-hidden="true" />
                  <span id="liveStatusText">กำลังเชื่อมต่อ</span>
                  · <span id="roomNameLabel">crew</span>
                </p>
              </div>

              <div id="voteContainer" className="side-vote-container visible">
                <div id="voteInstruction" className="vote-instruction-text">
                  รอภารกิจจากการสุ่ม
                </div>

                <div id="activeVoteContent" style={{ display: "none" }}>
                  <div className="vote-title">เห็นด้วยกับภารกิจนี้?</div>
                  <div className="vote-buttons">
                    <button id="voteYes" className="vote-btn" type="button">
                      ให้ <span id="yesCount" className="vote-count">0</span>
                    </button>
                    <button id="voteNo" className="vote-btn" type="button">
                      ไม่ให้ <span id="noCount" className="vote-count">0</span>
                    </button>
                    <button
                      id="clearVotes"
                      className="vote-clear-btn"
                      type="button"
                      title="ล้างผลโหวต / Clear votes"
                      aria-label="ล้างผลโหวต"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>

              <div className="board-actions">
                <button
                  id="clearAllData"
                  className="danger"
                  type="button"
                  title="ล้างภารกิจ โหวต และตราบิงโกบนเครื่องนี้"
                >
                  Clear All Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

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
