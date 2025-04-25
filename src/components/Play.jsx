import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";

import InviteCodeButton from "./InviteCodeButton";

import { getTokenFromCookies, createChessInstance } from "../utils/chessHelper";

import {
  GAME_PHASES,
  STATUS_MESSAGES,
  tickRate,
  TIME_CONTROLS,
  COLORS,
  MESSAGE_TYPES,
  GAME_SETTINGS,
  WEBSOCKET_MESSAGE_TYPES,
} from "../utils/playConstants";

import GameChat from "./GameChat";
import ChessboardWrapper from "./ChessboardWrapper";
import GameStatus from "./GameStatus";

console.clear();

const Play = () => {
  const [gamePhase, setGamePhase] = useState(GAME_PHASES.NOT_STARTED);

  const socket = useRef(null);

  const user = useSelector((store) => store.user);

  const [gameState, setGameState] = useState({
    opponent: null,
    playerColor: null,
  });

  const [status, setStatus] = useState("");

  // const [connectionError, setConnectionError] = useState(null);

  const [chess, setChess] = useState(createChessInstance);
  const history = chess.history();
  const [historyIndex, setHistoryIndex] = useState(29);

  const [minutes, setMinutes] = useState(3);

  const [userTime, setUserTime] = useState(null);
  const [opponentTime, setOpponentTime] = useState(null);
  const userWorker = useRef(null);
  const opponentWorker = useRef(null);

  const [isPopup, setIsPopup] = useState(null);

  const [inviteCode, setInviteCode] = useState(null);
  const [generatingInviteCode, setGeneratingInviteCode] = useState(false);

  const [joinWithCode, setJoinWithCode] = useState("");

  const [chatMessage, setChatMessage] = useState("");
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
        gameBegin(message.payload);
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
        timersCleanup();
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

  function gameBegin(payload) {
    resetState();

    const timeLeft = payload.minutes * 60 * 1000;
    setUserTime(timeLeft);
    setOpponentTime(timeLeft);
    startTimerFor(
      payload.color === COLORS.WHITE ? "user" : "opponent",
      timeLeft
    );

    console.log("[GAME] Game started:", payload);

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
  }

  function endGame(reason, loser) {
    console.log("[ENDGAME]- function called");
    setGamePhase(GAME_PHASES.ENDED);
    console.log("[GAME] Game over:", reason, loser);
    const displayMessage =
      `Game over!\nReason-${reason}` + (loser ? `\nLoser-${loser}` : "");
    setStatus(displayMessage);
    setIsPopup(displayMessage);
    setChatHistory((prev) => prev.concat("GAME OVER"));
    setChatHistory((prev) => prev.concat(displayMessage));
    timersCleanup();

    setShowAnim(false);
  }

  function handleOpponentMove(moveObject) {
    const newChessObject = chessMove(moveObject);
    if (newChessObject === false) {
      console.log("Error processing opponent's move");
      return;
    }

    setChess(newChessObject);
    console.log(
      "[MOVE] Opponent made move:",
      newChessObject.history().slice(-1)[0]
    );
    setHistoryIndex((prev) => prev + 1);

    startTimerFor("user", userTime);
    checkGameOver();
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

    socket.current.addEventListener("close", (event) => {
      console.warn("[SOCKET] Connection closed:", event);
      socket.current = null;
    });

    return () => {
      console.log("[SOCKET] Cleaning up WebSocket connection...");
      socket.current?.removeEventListener("message", messageHandler);
      socket.current?.removeEventListener("error", errorHandler);
      socket.current?.close();
      socket.current = null;
      timersCleanup();
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
          setUserTime(e.data.time);
        } else {
          setOpponentTime(e.data.time);
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

    timersCleanup();
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
    timersCleanup();
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

    const newChess = chessMove(moveObject);
    if (newChess === false) {
      console.log("[MOVE] not successful");
      return false;
    }

    console.log("[MOVE] Move successful, sending to server:", moveObject);
    if (sendMessage(MESSAGE_TYPES.MOVE, moveObject)) {
      setChess(newChess);
      setHistoryIndex((prev) => prev + 1);
      // setConnectionError(null);
      startTimerFor("opponent", opponentTime);
      checkGameOver();
    } else {
      return false;
    }

    return true;
  }

  function handleResign() {
    if (gamePhase !== GAME_PHASES.ONGOING) return;

    sendMessage(MESSAGE_TYPES.RESIGN, null);
  }

  function handleInviteCode() {
    if (generatingInviteCode) return;
    if (
      gamePhase !== GAME_PHASES.NOT_STARTED &&
      gamePhase !== GAME_PHASES.ENDED
    )
      return;
    sendMessage(MESSAGE_TYPES.CREATE_INVITE_CODE, { minutes });
  }

  function handleChatMessage() {
    if (gamePhase !== GAME_PHASES.ONGOING) {
      console.log("[CHAT]- Message not sent. There is no ongoing game");
      return;
    }

    const messageToSend = chatMessage.trim();

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
      setChatMessage("");
    } else {
      console.log("Failed to send chat message");
    }
  }

  function startTimerFor(role, timeLeft) {
    console.log("[TIMER]- Starting timer for", role);
    if (timeLeft <= 0) {
      timersCleanup();
      setGamePhase(GAME_PHASES.ENDED);
      return;
    }
    // if (gamePhase !== GAME_PHASES.ONGOING) {
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

  function drawOffer() {
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
      console.log("Failed to offer draw");
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
      console.log("[DRAW] Failed to accept draw");
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

  function chessMove(moveObject) {
    console.group("[CHESS MOVE]");

    const newChess = createChessInstance();
    newChess.loadPgn(chess.pgn());

    try {
      const move = newChess.move(moveObject);
      console.log("Move successful:", move.san);
      console.groupEnd();
      return newChess;
    } catch (error) {
      console.error("Invalid move:", error);
      console.groupEnd();
      return false;
    }
  }

  function timersCleanup() {
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

    timersCleanup();

    setIsCustomToggled(false);
    setIsTimeToggled(false);
    setDrawOffered(null);

    setChatMessage("");
    // setChatHistory([]);

    setJoinWithCode("");

    setInviteCode(null);
    setGeneratingInviteCode(false);

    setChess(createChessInstance);
    setHistoryIndex(29);

    userWorker.current = null;
    opponentWorker.current = null;

    setIsPopup(null);

    setShowAnim(false);
  }

  function handleJoinWithCode() {
    console.log("[JOIN] Attempting to join game with code:", joinWithCode);
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
        payload: { inviteCode: joinWithCode },
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
        {/* Left side- Chessboard and player info*/}
        <ChessboardWrapper
          onPieceDrop={handlePieceDrop}
          gameState={gameState}
          chess={chess}
          historyIndex={historyIndex}
          user={user?.data?.username}
          userTime={userTime}
          opponentTime={opponentTime}
          handleStartGame={handleStartGame}
          showAnim={showAnim}
          isPopup={isPopup}
          showPopup={showPopup}
          setIsPopup={setIsPopup}
          closePopup={() => setShowPopup(false)}
        />

        <div className="w-92 h-[648px] flex flex-col border-2 border-slate-700 ml-4 overflow-y-scroll">
          {/* Navbar buttons */}
          <div className="h-[80px] bg-gray-800 text-white flex justify-evenly items-center shadow-md">
            {gamePhase !== GAME_PHASES.NOT_STARTED &&
              gamePhase !== GAME_PHASES.WAITING && (
                <button
                  onClick={() => setNavbar("play")}
                  className={`cursor-pointer px-4 py-2 text-sm font-medium uppercase tracking-wide transition-colors ${
                    navbar === "play"
                      ? "border-b-2 border-green-400 text-green-400"
                      : "border-b-2 border-transparent hover:text-green-300 hover:border-green-300"
                  }`}
                >
                  Play
                </button>
              )}
            <button
              onClick={() => setNavbar("new_game")}
              className={`cursor-pointer px-4 py-2 text-sm font-medium uppercase tracking-wide transition-colors ${
                navbar === "new_game"
                  ? "border-b-2 border-green-400 text-green-400"
                  : "border-b-2 border-transparent hover:text-green-300 hover:border-green-300"
              }`}
            >
              New Game
            </button>
            <button className="px-4 py-2 text-sm font-medium uppercase text-gray-500 cursor-not-allowed">
              Games
            </button>
            <button className="px-4 py-2 text-sm font-medium uppercase text-gray-500 cursor-not-allowed">
              Players
            </button>
          </div>

          <div className="h-[320px]">
            {navbar === "new_game" ? (
              /* New game options */
              <div className="flex flex-col justify-center items-center text-center mt-4 pb-4">
                {/* Time control buttons */}
                <div className="flex flex-col gap-2 w-5/6 mb-4">
                  <button
                    onClick={() => setIsTimeToggled(!isTimeToggled)}
                    className={`cursor-pointer flex items-center justify-center gap-2 p-4 rounded-xl transition-colors bg-gray-200 hover:bg-gray-200`}
                  >
                    {minutes} min
                    {isTimeToggled ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 512 512"
                        className="w-4 h-4" // Added width and height classes
                      >
                        <path d="M233.4 105.4c12.5-12.5 32.8-12.5 45.3 0l192 192c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L256 173.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l192-192z" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 512 512"
                        className="w-4 h-4" // Added width and height classes
                      >
                        <path d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z" />
                      </svg>
                    )}
                  </button>
                  {isTimeToggled && (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                      {Object.keys(TIME_CONTROLS).map((category) => {
                        return (
                          <div className="p-4" key={category}>
                            <p className="font-semibold text-gray-700 mb-2">
                              {category[0].toUpperCase() +
                                category.slice(1).toLowerCase()}
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                              {TIME_CONTROLS[category].map((timeControl) => {
                                return (
                                  <button
                                    key={`${timeControl.minutes} | ${timeControl.increment}`}
                                    onClick={() => {
                                      if (timeControl.increment) return;
                                      setMinutes(timeControl.minutes);
                                      setIsTimeToggled(false);
                                    }}
                                    className={`${
                                      timeControl.increment
                                        ? "cursor-not-allowed"
                                        : "cursor-pointer"
                                    } px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium`}
                                  >
                                    {timeControl.increment
                                      ? `${timeControl.minutes} | ${timeControl.increment}`
                                      : `${timeControl.minutes} min`}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleStartGame}
                  className="mt-2 w-5/6 bg-green-600 text-white font-extrabold text-xl px-8 py-4 rounded-xl cursor-pointer hover:bg-green-300"
                >
                  Play
                </button>

                <button
                  onClick={() => setIsCustomToggled(!isCustomToggled)}
                  className="flex items-center justify-center gap-2 mt-2" // Added flex and alignment classes
                >
                  <span className="cursor-pointer">Custom</span>
                  {isCustomToggled ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 512 512"
                      className="w-4 h-4"
                    >
                      <path d="M233.4 105.4c12.5-12.5 32.8-12.5 45.3 0l192 192c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L256 173.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l192-192z" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 512 512"
                      className="w-4 h-4"
                    >
                      <path d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z" />
                    </svg>
                  )}
                </button>

                {isCustomToggled && (
                  <div>
                    <input
                      onChange={(e) => setJoinWithCode(e.target.value)}
                      value={joinWithCode}
                      placeholder="Enter invite code"
                      className="mt-2 w-5/6 px-4 py-3 rounded-xl border-2 border-slate-300 focus:outline-none focus:border-green-500 transition-colors"
                    />
                    <button
                      onClick={handleJoinWithCode}
                      className="cursor-pointer mt-2 w-5/6 bg-blue-600 text-white font-bold text-lg px-4 py-3 rounded-xl hover:bg-blue-500 transition-colors"
                    >
                      Join with code
                    </button>

                    <InviteCodeButton
                      inviteCode={inviteCode}
                      onRequestCode={handleInviteCode}
                      generating={generatingInviteCode}
                    />
                  </div>
                )}
              </div>
            ) : (
              /* Play options */
              <>
                {/* Move history */}
                <div className="h-[320px] bg-red-200">
                  <div className="h-full">
                    {drawOffered === gameState.opponent._id ? (
                      <div className="h-full flex flex-col items-center justify-center bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-xl font-semibold text-gray-800 mb-4">
                          Accept Draw Offer?
                        </h3>
                        <div className="flex gap-4">
                          <button
                            onClick={rejectDraw}
                            className="px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <span className="text-xl">❌</span>
                            Decline
                          </button>
                          <button
                            onClick={acceptDraw}
                            className="px-6 py-3 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <span className="text-xl">✅</span>
                            Accept
                          </button>
                        </div>
                      </div>
                    ) : (
                      <ul className="h-full overflow-y-scroll">
                        {(function () {
                          let moveHistory = [];
                          for (let move = 0; move < history.length; move += 2) {
                            moveHistory.push(history.slice(move, move + 2));
                          }
                          return moveHistory;
                        })().map((item, index) => {
                          return (
                            <li
                              key={index}
                              className="grid grid-cols-3 px-2 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-xl shadow-md hover:from-blue-100 hover:to-blue-200 hover:shadow-lg transition-all duration-300"
                            >
                              <span className="p-2">{index + 1} .</span>
                              <span
                                className={`p-2 cursor-pointer text-center ${
                                  index * 2 === historyIndex
                                    ? "bg-gray-400"
                                    : ""
                                }`}
                                onClick={() => setHistoryIndex(index * 2)}
                              >
                                {" "}
                                {item[0]}
                              </span>
                              {item[1] && (
                                <span
                                  className={`p-2 cursor-pointer text-center ${
                                    index * 2 + 1 === historyIndex
                                      ? "bg-gray-400"
                                      : ""
                                  }`}
                                  onClick={() => setHistoryIndex(index * 2 + 1)}
                                >
                                  {" "}
                                  {item[1]}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="bg-green-400 flex flex-col h-[240px]">
                  {/* Chess move buttons */}
                  <div className="flex justify-between border-t border-gray-200">
                    {/* Game control buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={drawOffer}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                      >
                        Draw
                      </button>
                      <button
                        onClick={handleResign}
                        className="px-4 py-2 text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors font-medium"
                      >
                        Resign
                      </button>
                    </div>

                    {/* Move navigation buttons */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => setHistoryIndex(0)}
                        className="px-3 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        ⏮
                      </button>
                      <button
                        onClick={() =>
                          setHistoryIndex((prev) =>
                            prev > 0 ? prev - 1 : prev
                          )
                        }
                        className="px-3 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        ◀
                      </button>
                      <button
                        onClick={() =>
                          setHistoryIndex((prev) =>
                            prev < history.length - 1 ? prev + 1 : prev
                          )
                        }
                        className="px-3 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        ▶
                      </button>
                      <button
                        onClick={() => setHistoryIndex(history.length - 1)}
                        className="px-3 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        ⏭
                      </button>
                    </div>
                  </div>

                  <GameChat
                    chatHistory={chatHistory}
                    chatMessage={chatMessage}
                    onMessageChange={(e) => setChatMessage(e.target.value)}
                    onSendMessage={handleChatMessage}
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
