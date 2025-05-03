import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Chessboard } from "react-chessboard";

import {
  getTokenFromCookies,
  createChessInstance,
  formatTime,
  playSound,
  playMoveSound,
} from "../utils/chessHelper";

import {
  GAME_PHASES,
  STATUS_MESSAGES,
  tickRate,
  COLORS,
  MESSAGE_TYPES,
  GAME_SETTINGS,
  WEBSOCKET_MESSAGE_TYPES,
} from "../utils/playConstants";

import GameChat from "./GameChat";
import GameStatus from "./GameStatus";
import MoveHistory from "./MoveHistory";
import ChessButtons from "./ChessButtons";
import DrawScreen from "./DrawScreen";
import JoinWithCode from "./JoinWithCode";
import InviteCode from "./InviteCode";
import TimeControls from "./TimeControls";
import GameNavbar from "./GameNavbar";
import ChessboardOptions from "./ChessboardOptions";
import { Chess } from "chess.js";
import ChessHistoryButtons from "./ChessHistoryButtons";

console.clear();

const sound_game_start = new Audio("sounds/game-start.mp3");
const sound_game_end = new Audio("sounds/game-end.mp3");

const sound_move_self = new Audio("sounds/move-self.mp3");
const sound_move_opponent = new Audio("sounds/move-opponent.mp3");
const sound_illegal = new Audio("sounds/illegal.mp3");

const Play = () => {
  const [gamePhase, setGamePhase] = useState(GAME_PHASES.NOT_STARTED);

  const socket = useRef(null);

  const user = useSelector((store) => store.user);

  const [gameState, setGameState] = useState({
    opponent: null,
    playerColor: null,
  });

  const [status, setStatus] = useState("");

  const [chess, setChess] = useState(createChessInstance);
  const history = chess.history();
  const [historyIndex, setHistoryIndex] = useState(29);

  const [minutes, setMinutes] = useState(3);

  const [playerTime, setPlayerTime] = useState(null);
  const [rivalTime, setRivalTime] = useState(null);
  const userWorker = useRef(null);
  const opponentWorker = useRef(null);

  const [popupToggle, setPopupToggle] = useState(null);

  const [inviteCode, setInviteCode] = useState(null);
  const [generatingInviteCode, setGeneratingInviteCode] = useState(false);

  const [joinCodeInput, setJoinCodeInput] = useState("");

  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);

  const [drawOffered, setDrawOffered] = useState(null);
  const [isTimeToggled, setIsTimeToggled] = useState(false);
  const [isCustomToggled, setIsCustomToggled] = useState(false);

  /* new_game | play | games | players */
  const [navbar, setNavbar] = useState("new_game");

  const [showAnim, setShowAnim] = useState(false);

  const [showPopup, setShowPopup] = useState(false);

  const handleMessageRef = useRef(() => {});

  handleMessageRef.current = (message) => {
    console.log("[handle]- function called", message);
    switch (message.type) {
      case MESSAGE_TYPES.GAME_BEGIN: {
        beginGame(message.payload);
        break;
      }

      case MESSAGE_TYPES.GAME_OVER: {
        endGame(message.payload.reason, message.payload.loser);
        break;
      }

      case MESSAGE_TYPES.WAIT: {
        console.log("[MESSAGE]- Wait");
        setStatus(STATUS_MESSAGES.WAITING_FOR_PLAYER);
        setGamePhase(GAME_PHASES.WAITING);
        break;
      }

      case MESSAGE_TYPES.MOVE: {
        console.log("[MOVE] Opponent move received:", message.payload);
        handleOpponentMove(message.payload);
        break;
      }

      case MESSAGE_TYPES.INVITE_CODE: {
        const { code } = message.payload;
        setInviteCode(code);
        setGeneratingInviteCode(false);
        break;
      }

      case MESSAGE_TYPES.CHAT_MESSAGE: {
        setChatHistory((prev) => prev.concat(message.payload));
        break;
      }

      case MESSAGE_TYPES.DRAW_ACCEPTED: {
        setChatHistory((prev) =>
          prev.concat(`${gameState.opponent?.username} accepted a draw`)
        );
        setDrawOffered(null);
        cleanupTimers();
        break;
      }

      case MESSAGE_TYPES.DRAW_OFFER: {
        setChatHistory((prev) =>
          prev.concat(`${gameState.opponent?.username} offered a draw`)
        );
        setDrawOffered(gameState.opponent._id);
        break;
      }

      case MESSAGE_TYPES.DRAW_REJECTED: {
        setChatHistory((prev) =>
          prev.concat(`${gameState.opponent?.username} rejected a draw`)
        );
        setDrawOffered(null);
        break;
      }

      case MESSAGE_TYPES.OPPONENT_DISCONNECT: {
        console.log("Opponent disconnected");
        break;
      }

      case MESSAGE_TYPES.ERROR: {
        console.log("[ERROR]- ", message.payload);
        break;
      }

      case WEBSOCKET_MESSAGE_TYPES.CONNECTION_SUCCESS: {
        console.log("Successfully connected to WebSocket server");
        break;
      }

      default:
        console.log("[MESSAGE] Unknown message type:", message);
    }
  };

  function beginGame(payload) {
    console.log("[GAME BEGIN]- function called");
    resetState();

    const timeLeft = payload.minutes * 60 * 1000;
    setPlayerTime(timeLeft);
    setRivalTime(timeLeft);
    startTimerFor(
      payload.color === COLORS.WHITE ? "user" : "opponent",
      timeLeft
    );

    setGamePhase(GAME_PHASES.ONGOING);
    setGameState({
      playerColor: payload.color,
      opponent: payload.opponent,
    });
    setStatus(
      STATUS_MESSAGES.GAME_STARTED(
        payload.color === COLORS.WHITE ? "White" : "Black"
      )
    );

    setChatHistory((prev) => prev.concat("NEW GAME"));
    setChatHistory((prev) =>
      prev.concat(
        `${user.data.username} vs ${payload.opponent.username} (${payload.minutes} min)`
      )
    );
    setNavbar("play");
    setShowAnim(true);

    playSound(sound_game_start);
  }

  function endGame(reason, loser) {
    console.log("[ENDGAME]- function called");
    setGamePhase(GAME_PHASES.ENDED);
    console.log("[GAME] Game over:", reason, loser);
    const displayMessage =
      `GAME OVER!\nReason-${reason}` + (loser ? ` Loser-${loser}` : "");
    setStatus(displayMessage);
    setPopupToggle(displayMessage);
    setChatHistory((prev) => prev.concat(displayMessage));
    cleanupTimers();

    setShowAnim(false);

    playSound(sound_game_end);
  }

  function handleOpponentMove(moveObject) {
    const {latestMove, newChess} = makeChessMove(moveObject);
    if (newChess === false) {
      console.log("Error processing opponent's move");
      return;
    }

    setChess(newChess);
    console.log("[MOVE] Opponent made move:", newChess.history().slice(-1)[0]);
    setHistoryIndex((prev) => prev + 1);

    startTimerFor("user", playerTime);
    checkGameOver();

    if (!playMoveSound(latestMove)) {
      playSound(sound_move_opponent);
    }
  }

  useEffect(() => {
    if (socket.current) return;

    const token = getTokenFromCookies();
    if (!token) {
      // setConnectionError("No authentication token found");
      console.error("[SOCKET] No authentication token found");
      setShowPopup(true);
      return;
    }

    setShowPopup(false);

    const messageHandler = (event) => {
      handleMessageRef.current(JSON.parse(event.data));
    };

    const errorHandler = (error) => {
      console.error("[SOCKET] Connection error:", error);
      // setConnectionError("WebSocket connection failed");
      socket.current = null;
    };

    console.log("[SOCKET] Connecting to WebSocket...");
    socket.current = new WebSocket(
      `ws://localhost:3000/ws?token=${encodeURIComponent(token)}`
    );

    socket.current.addEventListener("open", () => {
      console.log("[SOCKET] Connection established");
      // setConnectionError(null);
    });

    socket.current.addEventListener("message", messageHandler);
    socket.current.addEventListener("error", errorHandler);

    socket.current.addEventListener("close", () => {
      console.log("[SOCKET] Connection closed");
      socket.current = null;
    });

    return () => {
      console.log("[SOCKET] Cleaning up WebSocket connection...");
      socket.current?.removeEventListener("message", messageHandler);
      socket.current?.removeEventListener("error", errorHandler);
      socket.current?.close();
      socket.current = null;
      cleanupTimers();
    };
  }, []);

  const setupWorker = (isUser, timeLeft) => {
    const worker = new Worker(new URL("./timerWorker.js", import.meta.url));

    worker.onerror = (error) => {
      console.error("[TIMER] Worker error:", error);
      worker.terminate();
      setGamePhase(GAME_PHASES.ENDED);
    };

    worker.postMessage({
      type: "start",
      payload: { timeLeft, tickRate },
    });

    const messageHandler = (e) => {
      if (e.data.type === "tick") {
        if (isUser) {
          setPlayerTime(e.data.time);
        } else {
          setRivalTime(e.data.time);
        }
      }
    };

    worker.addEventListener("message", messageHandler);

    return {
      worker,
      cleanup: () => {
        worker.removeEventListener("message", messageHandler);
        worker.terminate();
      },
    };
  };

  function setTimer(isUser, timeLeft) {
    console.log("[TIMER] Switching timer. isUser:", isUser);

    if (timeLeft < 0) {
      return;
    }

    cleanupTimers();
    if (isUser) {
      userWorker.current = setupWorker(true, timeLeft);
    } else {
      opponentWorker.current = setupWorker(false, timeLeft);
    }
  }

  function checkGameOver() {
    if (!chess.isGameOver()) return;

    setGamePhase(GAME_PHASES.ENDED);

    console.log("[TIMER] Cleanup triggered");
    cleanupTimers();
  }

  function handleStartGame() {
    console.log("[START]- function called");
    if (gamePhase === GAME_PHASES.ONGOING) {
      console.log("[START]- Cannot start, there is ongoing game");
      return;
    }

    if (socket.current?.readyState !== WebSocket.OPEN) {
      console.log(socket.current);
      setStatus(STATUS_MESSAGES.WEBSOCKET_NOT_CONNECTED);
      return;
    }

    try {
      socket.current.send(
        JSON.stringify({
          type: WEBSOCKET_MESSAGE_TYPES.JOIN_GAME_VIA_QUEUE,
          payload: { minutes },
        })
      );
    } catch (error) {
      console.error("Error starting game:", error);
      setStatus(STATUS_MESSAGES.FAILED_TO_START_GAME);
    }
  }

  function handlePieceDrop(sourceSquare, targetSquare, piece) {
    console.log("[MOVE] Piece dropped:", { sourceSquare, targetSquare, piece });

    if (historyIndex !== history.length - 1) {
      console.log("[MOVE] Rejecting move due to history mismatch");

      setHistoryIndex(history.length - 1);
      return false;
    }

    if (gamePhase !== GAME_PHASES.ONGOING) {
      console.log("[MOVE] Rejecting due to game phase-", gamePhase);
      return false;
    }

    if (gameState.playerColor !== chess.turn()) {
      console.log("[MOVE] Rejecting due to turn mismatch");
      return false;
    }

    const moveObject = {
      from: sourceSquare,
      to: targetSquare,
      promotion: piece[1].toLowerCase(), // promotion in case of actual promotion, else, no error
    };

    const {latestMove, newChess} = makeChessMove(moveObject);
    if (newChess === false) {
      console.log("[MOVE] not successful");
      return false;
    }

    console.log("[MOVE] Move successful, sending to server:", moveObject);
    if (sendMessage(MESSAGE_TYPES.MOVE, moveObject)) {
      setChess(newChess);
      setHistoryIndex((prev) => prev + 1);
      // setConnectionError(null);
      startTimerFor("opponent", rivalTime);
      checkGameOver();
    } else {
      console.log("[MOVE]- Failed to send move to server");
      return false;
    }

    if (!playMoveSound(latestMove)) {
      playSound(sound_move_self);
    }
    return true;
  }

  function resignGame() {
    console.log("[RESIGN]- function called");
    if (gamePhase !== GAME_PHASES.ONGOING) {
      console.log("[RESIGN]- No ongoing game");
      return;
    }

    if (sendMessage(MESSAGE_TYPES.RESIGN)) {
      console.log("[RESIGN]- Message sent");
    } else {
      console.log("[RESIGN]- Failed to send message to server");
    }
  }

  function createInviteCode() {
    console.log("[CREATE INVITE CODE]- Function called");

    if (generatingInviteCode) {
      console.log("[INVITE]- already generating invite code");
    } else if (
      gamePhase === GAME_PHASES.ONGOING ||
      gamePhase === GAME_PHASES.WAITING
    ) {
      console.log("[INVITE]- Cannot generate invite code during ongoing game");
    } else {
      if (
        sendMessage(WEBSOCKET_MESSAGE_TYPES.CREATE_INVITE_CODE, { minutes })
      ) {
        console.log("[CREATE INVITE CODE]- Message sent");
      } else {
        console.log("[CREATE INVITE CODE]- Failed to send message");
      }
    }
  }

  function sendChatMessage() {
    if (gamePhase !== GAME_PHASES.ONGOING) {
      console.log("[CHAT]- Message not sent. There is no ongoing game");
      return;
    }

    const messageToSend = chatInput.trim();

    if (
      messageToSend.length == 0 ||
      messageToSend.length > GAME_SETTINGS.MAX_MESSAGE_LENGTH
    ) {
      console.log("[CHAT]- Message length must be 1-200 characters");
      return;
    }

    console.log("[CHAT] sending message", messageToSend);
    if (sendMessage(MESSAGE_TYPES.CHAT_MESSAGE, { text: messageToSend })) {
      console.log("[CHAT] message sent");
      setChatHistory((prev) =>
        prev.concat({ from: user.data.username, text: messageToSend })
      );
      setChatInput("");
    } else {
      console.log("[CHAT]- Failed to send chat message");
    }
  }

  function startTimerFor(role, timeLeft) {
    console.log("[TIMER]- Starting timer for", role);
    if (timeLeft <= 0) {
      cleanupTimers();
      setGamePhase(GAME_PHASES.ENDED);
      return;
    }
    // if (phase !== GAME_PHASES.ONGOING) {
    //   return;
    // }
    setTimer(role === "user", timeLeft);
  }

  const sendMessage = (type, payload = null) => {
    if (socket.current?.readyState !== WebSocket.OPEN) {
      console.log(`[Send] Skipped sending "${type}", socket not open`);
      return false;
    }

    try {
      const sendObject = { type };
      if (payload) sendObject["payload"] = payload;
      socket.current.send(JSON.stringify(sendObject));
      console.log(`[Send] ${type}`, sendObject);
      return true;
    } catch (error) {
      console.error(`[Send Error] ${type}`, error);
      // setConnectionError("Failed to send object", type, payload);
      return false;
    }
  };

  function offerDraw() {
    if (gamePhase !== GAME_PHASES.ONGOING) {
      console.log("[DRAW] Cannot offer draw - game not active");
      return;
    }
    if (drawOffered) {
      console.log("[DRAW]- A draw is already offered");
      return;
    }
    setDrawOffered(user.data._id);
    if (sendMessage(MESSAGE_TYPES.DRAW_OFFER)) {
      setChatHistory((prev) =>
        prev.concat(`${user?.data?.username} offered a draw`)
      );
    } else {
      console.log("[DRAW]- Failed to offer draw");
      setDrawOffered(null); // Reset on failure
    }
  }

  function acceptDraw() {
    console.log("[DRAW] Accepting draw offer");
    if (sendMessage(MESSAGE_TYPES.DRAW_ACCEPT)) {
      console.log("[DRAW] Draw accepted successfully");
      setDrawOffered(null);
      setChatHistory((prev) =>
        prev.concat(`${user?.data?.username} accepted a draw`)
      );
    } else {
      console.log("[DRAW]- Failed to accept draw");
    }
  }

  function rejectDraw() {
    console.log("[DRAW] Rejecting draw offer");
    if (sendMessage(MESSAGE_TYPES.DRAW_REJECT)) {
      console.log("[DRAW] Draw rejected successfully");
      setDrawOffered(null);
      setChatHistory((prev) =>
        prev.concat(`${user?.data?.username} declined a draw`)
      );
    } else {
      console.log("[DRAW] Failed to reject draw");
    }
  }

  function makeChessMove(moveObject) {
    console.group("[CHESS MOVE]");

    const newChess = new Chess();
    newChess.loadPgn(chess.pgn());

    try {
      const latestMove = newChess.move(moveObject);
      console.log("Move successful:", moveObject.san);
      console.groupEnd();
      return { latestMove, newChess };
    } catch (error) {
      console.error("Invalid move:", error);
      console.groupEnd();
      playSound(sound_illegal);
      return false;
    }
  }

  function cleanupTimers() {
    console.log("[TIMER CLEANUP]");

    if (userWorker.current) {
      console.log("Terminating user timer worker");
      userWorker.current.cleanup();
      userWorker.current = null;
    }
    if (opponentWorker.current) {
      console.log("Terminating opponent timer worker");
      opponentWorker.current.cleanup();
      opponentWorker.current = null;
    }
  }

  function resetState() {
    console.log("[RESET]- resetState function called");

    cleanupTimers();

    setIsCustomToggled(false);
    setIsTimeToggled(false);
    setDrawOffered(null);

    setChatInput("");
    // setChatHistory([]);

    setJoinCodeInput("");

    setInviteCode(null);
    setGeneratingInviteCode(false);

    setChess(createChessInstance);
    setHistoryIndex(29);

    userWorker.current = null;
    opponentWorker.current = null;

    setPopupToggle(null);

    setShowAnim(false);
  }

  function joinGameWithCode() {
    console.log("[JOIN] Attempting to join game with code:", joinCodeInput);
    console.log("[JOIN] Current game phase:", gamePhase);

    if (
      gamePhase === GAME_PHASES.ONGOING ||
      gamePhase === GAME_PHASES.WAITING
    ) {
      console.log("[JOIN] Cannot join - game in progress");
      console.log(gamePhase);
      return;
    }

    if (socket.current?.readyState !== WebSocket.OPEN) {
      console.log("[JOIN] Socket state:", socket.current?.readyState);
      setStatus(STATUS_MESSAGES.WEBSOCKET_NOT_CONNECTED);
      return;
    }

    try {
      const payload = {
        type: WEBSOCKET_MESSAGE_TYPES.JOIN_GAME_VIA_INVITE,
        payload: { inviteCode: joinCodeInput },
      };
      console.log("[JOIN] Sending join request:", payload);

      socket.current.send(JSON.stringify(payload));
    } catch (error) {
      console.error("[JOIN] Error joining game:", error);
      setStatus(STATUS_MESSAGES.FAIL_JOIN_GAME);
    }
  }

  return (
    <div className="flex flex-col relative">
      <GameStatus turn={chess.turn()} gameState={gameState} status={status} />

      <div className="flex relative">
        <div className="flex flex-col relative">
          <div className="flex justify-between">
            <p className="font-bold">
              {gameState.opponent ? gameState.opponent.username : "opponent"}
            </p>
            <p>{rivalTime ? formatTime(rivalTime) : "0:00"}</p>
          </div>
          <Chessboard
            animationDuration={
              historyIndex === chess.history().length - 1 ? 300 : 0
            }
            areArrowsAllowed={false}
            boardOrientation={
              gameState.playerColor === null ||
              gameState.playerColor === COLORS.WHITE
                ? "white"
                : "black"
            }
            boardWidth={600}
            onPieceDrop={handlePieceDrop}
            position={
              historyIndex > -1
                ? chess.history({ verbose: true })[historyIndex]["after"]
                : chess.fen()
            }
          />
          <div className="flex justify-between">
            <p className="font-bold">
              {user?.data ? user.data.username : "user"}
            </p>
            <p>{playerTime ? formatTime(playerTime) : "0:00"}</p>
          </div>

          <ChessboardOptions
            opponent={gameState.opponent?.username}
            user={user?.data?.username}
            showAnim={showAnim}
            popupToggle={popupToggle}
            setPopupToggle={setPopupToggle}
            startGame={handleStartGame}
            showPopup={showPopup}
            closePopup={() => setShowPopup(false)}
          />
        </div>

        {/* Right side */}
        <div className="w-92 h-[648px] flex flex-col border-2 border-white-700 ml-4 overflow-y-auto">
          <GameNavbar
            navbar={navbar}
            setNavbar={setNavbar}
            gamePhase={gamePhase}
          />

          <div className="h-[320px]">
            {navbar === "new_game" ? (
              <div className="flex flex-col justify-center items-center text-center mt-4 pb-4">
                <TimeControls
                  minutes={minutes}
                  setMinutes={setMinutes}
                  isTimeToggled={isTimeToggled}
                  setIsTimeToggled={setIsTimeToggled}
                />

                <button
                  onClick={handleStartGame}
                  className="mt-2 w-5/6 bg-green-600 text-white font-extrabold text-xl px-8 py-4 rounded-xl cursor-pointer hover:bg-green-400"
                >
                  Play
                </button>

                <button
                  onClick={() => setIsCustomToggled(!isCustomToggled)}
                  className="flex items-center justify-center mt-2"
                >
                  <span className="cursor-pointer">Custom</span>
                </button>

                {isCustomToggled && (
                  <>
                    <JoinWithCode
                      joinCodeInput={joinCodeInput}
                      setJoinCodeInput={setJoinCodeInput}
                      joinGameWithCode={joinGameWithCode}
                    />

                    <InviteCode
                      isGenerating={generatingInviteCode}
                      inviteCode={inviteCode}
                      createInviteCode={createInviteCode}
                    />
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="h-full">
                  {drawOffered === gameState.opponent._id ? (
                    <DrawScreen
                      acceptDraw={acceptDraw}
                      rejectDraw={rejectDraw}
                    />
                  ) : (
                    <MoveHistory
                      history={history}
                      historyIndex={historyIndex}
                      setHistoryIndex={setHistoryIndex}
                    />
                  )}
                </div>

                <div className="flex flex-col h-[248px] text-black bg-blue-400">
                  <div className="flex justify-between border-t border-gray-200">
                    <ChessButtons
                      offerDraw={offerDraw}
                      resignGame={resignGame}
                    />
                    <ChessHistoryButtons
                      setHistoryIndex={setHistoryIndex}
                      historyLength={history.length}
                    />
                  </div>

                  <GameChat
                    chatHistory={chatHistory}
                    chatInput={chatInput}
                    onInputChange={(e) => setChatInput(e.target.value)}
                    sendChatMessage={sendChatMessage}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Play;
