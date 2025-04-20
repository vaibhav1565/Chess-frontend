import { useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { useSelector } from "react-redux";

import InviteCodeButton from "./InviteCodeButton"; // adjust path as needed

import {
  getTokenFromCookies,
  formatTime,
  createChessInstance,
} from "../utils/helper";

console.clear();
const tickRate = 1000;

const Play = () => {
  // Game state: 'not_started' | 'waiting' |  'ongoing' | 'ended'
  const [gamePhase, setGamePhase] = useState("not_started");

  const socket = useRef(null);

  const user = useSelector((store) => store.user);

  const [gameState, setGameState] = useState({
    opponent: null,
    playerColor: null,
  });

  const [status, setStatus] = useState("Click on Play button to get started");

  const [connectionError, setConnectionError] = useState(null);

  const [chess, setChess] = useState(createChessInstance);
  const history = chess.history();
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [minutes, setMinutes] = useState(3);

  const [userTime, setUserTime] = useState(null);
  const [opponentTime, setOpponentTime] = useState(null);
  const userWorker = useRef(null);
  const opponentWorker = useRef(null);

  const [popup, setPopup] = useState(null);

  const [inviteCode, setInviteCode] = useState(null);
  const [generating, setGenerating] = useState(false);

  const [joinWithCode, setJoinWithCode] = useState("");

  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);

  const [drawOffered, setDrawOffered] = useState(true);

  const [timeToggle, setTimeToggle] = useState(false);
  const [toggleCustom, setToggleCustom] = useState(false);

  const handleMessageRef = useRef(() => {}); // Initialize with an empty function
  handleMessageRef.current = (message) => {
    switch (message.type) {
      case "game_begin": {
        resetState();
        console.log("[GAME] Game started:", message.payload);
        setGamePhase("ongoing");
        setGameState({
          playerColor: message.payload.color,
          opponent: message.payload.opponent,
        });
        setStatus(
          `Game started. You are playing as ${
            message.payload.color === "w" ? "White" : "Black"
          }`
        );

        const timeLeft = message.payload.minutes * 60 * 1000;
        setUserTime(timeLeft);
        setOpponentTime(timeLeft);
        startTimerFor(
          message.payload.color === "w" ? "user" : "opponent",
          timeLeft
        );
        break;
      }

      case "move": {
        console.log("[MOVE] Opponent move received:", message.payload);
        if (handleOpponentMove(message.payload) !== false) {
          startTimerFor("user", userTime);
          handleEndGame();
        } else {
          console.log("Error processing opponent's move");
        }
        break;
      }

      case "message": {
        console.log("[MESSAGE] General message:", message.payload);
        if (message.payload === "wait") {
          setStatus("Waiting for another player to join");
          setGamePhase("waiting");
        }
        break;
      }

      case "game_over": {
        setGamePhase("ended");
        console.log("[GAME] Game over:", message.payload.reason);
        const { reason, loser } = message.payload;
        const displayMessage =
          `Game over!\nReason-${reason}` + (loser ? `\nLoser-${loser}` : "");
        setStatus(displayMessage);
        setPopup(displayMessage);
        cleanup();
        break;
      }

      case "invite_code": {
        const { code } = message.payload;
        setInviteCode(code);
        setGenerating(false);
        break;
      }

      case "chat_message": {
        setChatHistory(chatHistory.concat(message.payload));
        break;
      }

      case "draw_offer": {
        setChatHistory(
          chatHistory.concat(`${gameState.opponent?.username} offered a draw`)
        );
        setDrawOffered(true);
        break;
      }

      default:
        console.log("[MESSAGE] Unknown message type:", message);
    }
  };

  useEffect(() => {
    if (socket.current) return;

    const token = getTokenFromCookies();
    if (!token) {
      setConnectionError("No authentication token found");
      console.error("[SOCKET] No authentication token found");
      return;
    }

    console.log("[SOCKET] Connecting to WebSocket...");
    socket.current = new WebSocket(
      `ws://localhost:3000/ws?token=${encodeURIComponent(token)}`
    );

    socket.current.addEventListener("open", () => {
      console.log("[SOCKET] Connection established");
      setConnectionError(null);
    });

    socket.current.addEventListener("message", (event) => {
      console.log("[SOCKET] Message received:", event.data);
      handleMessageRef.current(JSON.parse(event.data));
    });

    socket.current.addEventListener("error", (error) => {
      console.error("[SOCKET] Connection error:", error);
      setConnectionError("WebSocket connection failed");
      socket.current = null;
    });

    socket.current.addEventListener("close", (event) => {
      console.warn("[SOCKET] Connection closed:", event);
      socket.current = null;
    });

    return () => {
      console.log("[SOCKET] Cleaning up WebSocket connection...");
      socket.current?.close();
      socket.current = null;

      if (userWorker.current) {
        console.log("[TIMER] Terminating user timer worker");
        userWorker.current.terminate();
        userWorker.current = null;
      }

      if (opponentWorker.current) {
        console.log("[TIMER] Terminating opponent timer worker");
        opponentWorker.current.terminate();
        opponentWorker.current = null;
      }
      console.log("[TIMER] Cleanup triggered");
    };
  }, []);

  const setupWorker = (isUser, timeLeft) => {
    console.log("[TIMER] Setting up worker:", { isUser, timeLeft });

    const worker = new Worker(new URL("./timerWorker.js", import.meta.url));

    worker.postMessage({
      type: "start",
      payload: { timeLeft, tickRate },
    });

    worker.onmessage = (e) => {
      if (e.data.type === "tick") {
        if (isUser) {
          setUserTime(e.data.time);
        } else {
          setOpponentTime(e.data.time);
        }
      }
    };

    return worker;
  };

  function setTimer(isUser, timeLeft) {
    console.log("[TIMER] Switching timer. isUser:", isUser);

    if (!timeLeft || timeLeft < 0) {
      return;
    }

    cleanup();
    if (isUser) {
      userWorker.current = setupWorker(true, timeLeft);
    } else {
      opponentWorker.current = setupWorker(false, timeLeft);
    }
  }

  function handleEndGame() {
    if (!chess.isGameOver()) return;

    setGamePhase("ended");
    const cleanupTimers = () => {
      [userWorker.current, opponentWorker.current].forEach((worker) => {
        if (worker) {
          // worker.postMessage({ type: "stop" });
          worker.terminate();
        }
      });
      userWorker.current = null;
      opponentWorker.current = null;
    };

    console.log("[TIMER] Cleanup triggered");
    cleanupTimers();

    setDrawOffered(false);

    let message = "Game over!\n";

    if (chess.isDraw()) {
      /*       message += chess.isDrawByFiftyMoves()
        ? "\nDraw by 50 moves rule"
        : chess.isInsufficientMaterial()
        ? "\nDraw by Insufficient Material"
        : chess.isStalemate()
        ? "\nDraw by stalemate"
        : chess.isThreefoldRepetition()
        ? "\nDraw by Threefold Repetition"
        : "";
*/
      message += "Draw";
    } else {
      message +=
        // gameState.playerColor !== null && gameState.playerColor === chess.turn()
        gameState.playerColor === chess.turn() ? "You lost!" : "You won!";
    }
    setStatus(message);
  }

  function handleOpponentMove(moveObject) {
    const newChessObject = chessMove(moveObject);
    if (newChessObject === false) return false;

    setChess(newChessObject);
    console.log(
      "[MOVE] Opponent made move:",
      newChessObject.history().slice(-1)[0]
    );
    setHistoryIndex((prev) => prev + 1);

    return true;
  }

  function handleStartGame() {
    if (gamePhase === "ongoing") return;

    if (socket.current?.readyState !== WebSocket.OPEN) {
      console.log(socket.current);
      setStatus("Cannot start game. WebSocket not connected.");
      return;
    }

    try {
      socket.current.send(
        JSON.stringify({
          type: "init_game",
          payload: { minutes },
        })
      );
    } catch (error) {
      console.error("Error starting game:", error);
      setStatus("Failed to start game");
    }
  }

  function handlePieceDrop(sourceSquare, targetSquare, piece) {
    console.log("[MOVE] Piece dropped:", { sourceSquare, targetSquare, piece });

    if (historyIndex !== history.length - 1) {
      console.log("[MOVE] Rejecting move due to history mismatch");

      setHistoryIndex(history.length - 1);
      return false;
    }

    if (gameState.playerColor !== chess.turn()) {
      console.log(
        "[MOVE] Rejecting due to turn mismatch / Rejecting due to game phase"
      );
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
    if (sendMessage("move", moveObject)) {
      setChess(newChess);
      setHistoryIndex((prev) => prev + 1);
      setConnectionError(null);
      startTimerFor("opponent", opponentTime);
      handleEndGame();
    } else {
      return false;
    }

    return true;
  }

  function handleResign() {
    if (gamePhase !== "ongoing") return;

    sendMessage("resign", null);
  }

  function handleInviteCode() {
    if (generating) return;
    sendMessage("create_invite_code", { minutes });
  }

  function handleChatMessage() {
    if (gamePhase !== "ongoing") {
      console.log("[CHAT]- Message not sent. There is no ongoing game");
    }
    if (!chatMessage.length) {
      console.log("[CHAT]- Cannot send message with empty body");
    }

    console.log("[CHAT] sending message", chatMessage);
    if (
      sendMessage("chat_message", {
        text: chatMessage,
      })
    ) {
      console.log("[CHAT] message sent");
      setChatMessage("");
    }
  }

  function startTimerFor(role, timeLeft) {
    if (!timeLeft || timeLeft <= 0) {
      cleanup();

      handleEndGame();
      return;
    }
    setTimer(role === "user", timeLeft);
  }

  const sendMessage = (type, payload = null) => {
    if (socket.current?.readyState !== WebSocket.OPEN) {
      console.log(`[Send] Skipped sending "${type}", socket not open`);
      return;
    }

    try {
      const sendObject = { type };
      if (payload) sendObject["payload"] = payload;
      socket.current.send(JSON.stringify(sendObject));
      console.log(`[Send] ${type}`, sendObject);
      return true;
    } catch (error) {
      console.error(`[Send Error] ${type}`, error);
      setConnectionError("Failed to send move");
    }
  };

  function drawOffer() {
    if (sendMessage("draw_offer")) {
      setChatHistory(
        chatHistory.concat(`${user?.data.username} offered a draw`)
      );
    }
  }

  function acceptDraw() {
    console.log("[DRAW] Accepting draw offer");
    if (sendMessage("draw_accept")) {
      console.log("[DRAW] Draw accepted successfully");
      setDrawOffered(false);
      setChatHistory(
        chatHistory.concat(`${user?.data.username} accepted a draw`)
      );
    } else {
      console.log("[DRAW] Failed to accept draw");
    }
  }

  function rejectDraw() {
    console.log("[DRAW] Rejecting draw offer");
    if (sendMessage("draw_reject")) {
      console.log("[DRAW] Draw rejected successfully");
      setDrawOffered(false);
      setChatHistory(chatHistory.map(`${user?.data.username} declined a draw`));
    } else {
      console.log("[DRAW] Failed to reject draw");
    }
  }

  function chessMove(moveObject) {
    const newChess = createChessInstance();
    newChess.loadPgn(chess.pgn());

    try {
      newChess.move(moveObject);
      console.log("[MOVE]:", newChess.history().slice(-1)[0]);
      return newChess;
    } catch (error) {
      console.error("[CHESS] Invalid move:", error);
      return false;
    }
  }

  const cleanup = () => {
    userWorker.current?.terminate();
    opponentWorker.current?.terminate();
  };

  function resetState() {
    setGameState({
      opponent: null,
      playerColor: null,
    });

    setChess(createChessInstance);
    setHistoryIndex(-1);

    setUserTime(null);
    setOpponentTime(null);
    userWorker.current = null;
    opponentWorker.current = null;

    setPopup(null);

    setDrawOffered(false);
  }

  function handleJoinWithCode() {
    console.log("[JOIN] Attempting to join game with code:", joinWithCode);
    console.log("[JOIN] Current game phase:", gamePhase);

    if (gamePhase === "ongoing" || gamePhase === "waiting") {
      console.log("[JOIN] Cannot join - game in progress");
      // setStatus("Cannot join game - game already in progress");
      console.log(gamePhase);
      return;
    }

    if (socket.current?.readyState !== WebSocket.OPEN) {
      console.log("[JOIN] Socket state:", socket.current?.readyState);
      setStatus("Cannot start game. WebSocket not connected.");
      return;
    }

    try {
      const payload = {
        type: "init_game",
        payload: { inviteCode: joinWithCode },
      };
      console.log("[JOIN] Sending join request:", payload);

      socket.current.send(JSON.stringify(payload));
    } catch (error) {
      console.error("[JOIN] Error joining game:", error);
      setStatus("Failed to join game");
    }
  }

  return (
    <div className="flex flex-col mt-4">
      <div className="w-[650px]">
        {connectionError && (
          <div className="text-red-500 p-2">{connectionError}</div>
        )}

        <p>{status}</p>

        <p>
          {gameState.playerColor
            ? `${chess.turn() === "w" ? "White" : "Black"}'s turn`
            : "\u00A0"}
        </p>
      </div>

      <div className="flex">
        {/* Chessboard and player info*/}
        <div className="flex flex-col">
          <div className="flex justify-between">
            <p>
              {gameState.opponent ? gameState.opponent?.username : "opponent"}{" "}
              {gameState.playerColor === "b" ? "♙" : "♟"}
            </p>
            <p>{opponentTime ? formatTime(opponentTime) : "0:00"}</p>
          </div>
          <Chessboard
            animationDuration={historyIndex === history.length - 1 ? 300 : 0}
            areArrowsAllowed={false}
            boardOrientation={
              gameState.playerColor === null || gameState.playerColor === "w"
                ? "white"
                : "black"
            }
            boardWidth={560}
            customDarkSquareStyle={{ backgroundColor: "rgb(125 148 87)" }}
            customLightSquareStyle={{ backgroundColor: "rgb(235 235 208)" }}
            onPieceDrop={handlePieceDrop}
            position={
              historyIndex > -1
                ? chess.history({ verbose: true })[historyIndex]["after"]
                : chess.fen()
            }
          />
          <div className="flex justify-between">
            <p>
              {user ? user?.data.username : "user"}{" "}
              {gameState.playerColor === "b" ? "♟" : "♙"}
            </p>
            <p>{userTime ? formatTime(userTime) : "0:00"}</p>
          </div>

          {popup !== null && (
            <div className="bg-black mt-[24px] ml-[140px] absolute h-[560px] w-[300px] rounded-2xl">
              <button
                className="w-full text-right text-3xl cursor-pointer"
                onClick={() => setPopup(null)}
              >
                ❌
              </button>
              <p
                style={{ whiteSpace: "pre-line" }}
                className="text-white text-center"
              >
                {popup}
              </p>

              <button
                onClick={handleStartGame}
                className="w-1/2 bg-green-500 text-white font-extrabold text-lg px-4 py-4 rounded-xl cursor-pointer hover:bg-green-400"
              >
                New game
              </button>
            </div>
          )}
        </div>

        {/* Right side  */}
        <div className="w-80 h-[608px] flex flex-col border-2 border-slate-700 ml-4 overflow-y-scroll">
          {/* 1. Play and time buttons */}
          {!(gamePhase === "not_started" || gamePhase === "waiting") ? (
            <div className="flex flex-col justify-center items-center text-center mt-4 pb-4">
              {/* Time control buttons */}
              <div className="flex flex-col gap-2 w-5/6 mb-4">
                <button
                  onClick={() => setTimeToggle(!timeToggle)}
                  className={`flex items-center justify-center gap-2 p-4 rounded-xl transition-colors bg-gray-200 hover:bg-gray-200`}
                >
                  {minutes} min
                  {timeToggle ? (
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
                {timeToggle && (
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <p className="font-semibold text-gray-700 mb-2">Bullet</p>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => {
                            setMinutes(1);
                            setTimeToggle(false);
                          }}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
                        >
                          1 min
                        </button>
                        <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium">
                          1 | 1
                        </button>
                        <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium">
                          2 | 1
                        </button>
                      </div>
                    </div>

                    <div className="p-4 border-b border-gray-200">
                      <p className="font-semibold text-gray-700 mb-2">Blitz</p>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => {
                            setMinutes(3);
                            setTimeToggle(false);
                          }}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
                        >
                          3 min
                        </button>
                        <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium">
                          3 | 2
                        </button>
                        <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium">
                          5 min
                        </button>
                      </div>
                    </div>

                    <div className="p-4">
                      <p className="font-semibold text-gray-700 mb-2">Rapid</p>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => {
                            setMinutes(10);
                            setTimeToggle(false);
                          }}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
                        >
                          10 min
                        </button>
                        <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium">
                          15 | 10
                        </button>
                        <button
                          onClick={() => {
                            setMinutes(30);
                            setTimeToggle(false);
                          }}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
                        >
                          30 min
                        </button>
                      </div>
                    </div>
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
                onClick={() => setToggleCustom(!toggleCustom)}
                className="flex items-center justify-center gap-2 mt-2" // Added flex and alignment classes
              >
                <span>Custom</span>
                {toggleCustom ? (
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

              {toggleCustom && (
                <div>
                  <input
                    onChange={(e) => setJoinWithCode(e.target.value)}
                    value={joinWithCode}
                    placeholder="Enter invite code"
                    className="mt-2 w-5/6 px-4 py-3 rounded-xl border-2 border-slate-300 focus:outline-none focus:border-green-500 transition-colors"
                  />
                  <button
                    onClick={handleJoinWithCode}
                    className="mt-2 w-5/6 bg-blue-600 text-white font-bold text-lg px-4 py-3 rounded-xl hover:bg-blue-500 transition-colors"
                  >
                    Join with code
                  </button>

                  <InviteCodeButton
                    inviteCode={inviteCode}
                    onRequestCode={handleInviteCode}
                    generating={generating}
                  />
                </div>
              )}
            </div>
          )
          :
                    (
            <>
              {/* Move history / Draw screen */}
              <div className="h-2/3 bg-red-200">
                {/* 1. Draw screen*/}

                {drawOffered ? (
                  <>
                    <h3>Accept Draw?</h3>
                    <button onClick={rejectDraw}>❌</button>
                    <button onClick={acceptDraw}>✅</button>
                  </>
                ) :
                (
                  <div>
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
                            className="grid grid-cols-3 p-2 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-xl shadow-md hover:from-blue-100 hover:to-blue-200 hover:shadow-lg transition-all duration-300"
                          >
                            <span className="p-2">{index + 1} .</span>
                            <span
                              className={`p-2 cursor-pointer text-center ${
                                index * 2 === historyIndex ? "bg-gray-400" : ""
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
                  </div>
                )
                }
              </div>

              {/* 2. Chess move buttons, Chat history,  Chat input field */}
              <div className="bg-red-500 flex flex-col h-full">
                {/* Chess move buttons */}
                <div className="flex">
                  <div className="flex">
                    <button onClick={drawOffer}>Draw</button>
                    <button onClick={handleResign}>Resign</button>
                  </div>

                  <div className="flex">
                    <button onClick={() => setHistoryIndex(0)}>
                      &#124;&lt;
                    </button>

                    <button
                      onClick={() =>
                        setHistoryIndex((prev) => (prev > 0 ? prev - 1 : prev))
                      }
                    >
                      &lt;
                    </button>

                    <button
                      onClick={() =>
                        setHistoryIndex((prev) =>
                          prev < history.length - 1 ? prev + 1 : prev
                        )
                      }
                    >
                      &gt;
                    </button>

                    <button onClick={() => setHistoryIndex(history.length - 1)}>
                      &gt;&#124;
                    </button>
                  </div>
                </div>

                <div className="flex flex-col relative">
                  {/* Chat history*/}
                  <ul className="overflow-y-scroll">
                    {chatHistory.map((message, index) => {
                      return (
                        <li key={index}>
                          {typeof message === "object"
                            ? `${message.from} - ${message.text}`
                            : message}
                        </li>
                      );
                    })}
                  </ul>

                  {/* Chat input field */}
                  <div className="absolute bottom-0 bg-white border-t border-gray-200 flex gap-2">
                    <input
                      placeholder="Send a message..."
                      className="flex-1 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                    />
                    <button
                      onClick={handleChatMessage}
                      className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </>
          )
        }

        </div>
      </div>
    </div>
  );
};

export default Play;

/*
Clean code-

custom socket
*/

/*todo

use icon package

Chessboard beautify
  increase height of board, color make same

share feature
*/
