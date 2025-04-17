import { Chess } from "chess.js";
import { useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { useSelector } from "react-redux";

import { getTokenFromCookies, formatTime } from "../utils/helper";

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
  const [historyIndex, setHistoryIndex] = useState(-1);
  const history = chess.history();

  const [minutes, setMinutes] = useState(3);

  const [userTime, setUserTime] = useState(null);
  const [opponentTime, setOpponentTime] = useState(null);
  const userWorker = useRef(null);
  const opponentWorker = useRef(null);

  const [popup, setPopup] = useState(null);

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

      default:
        console.warn("[MESSAGE] Unknown message type:", message);
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

  function startTimerFor(role, timeLeft) {
    if (!timeLeft || timeLeft <= 0) {
      cleanup();

      handleEndGame();
      return;
    }
    setTimer(role === "user", timeLeft);
  }

  const sendMessage = (type, payload) => {
    if (socket.current?.readyState !== WebSocket.OPEN) {
      console.log(`[Send] Skipped sending "${type}", socket not open`);
      return;
    }

    try {
      socket.current.send(JSON.stringify({ type, payload }));
      console.log(`[Send] ${type}`, payload);
      return true;
    } catch (error) {
      console.error(`[Send Error] ${type}`, error);
      setConnectionError("Failed to send move");
    }
  };

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
        {/* Chessboard */}
        <div className="flex flex-col">
          <div className="flex justify-between">
            <p>
              {gameState.opponent ? gameState.opponent.username : "opponent"}{" "}
              {gameState.playerColor === "b" ? "♙" : "♟"}
            </p>
            <p>{opponentTime ? formatTime(opponentTime) : "0:00"}</p>
          </div>
          <Chessboard
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
              {user ? user.data.username : "user"}{" "}
              {gameState.playerColor === "b" ? "♟" : "♙"}
            </p>
            <p>{userTime ? formatTime(userTime) : "0:00"}</p>
          </div>
        </div>

        {popup != null && (
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

        {/* Right side */}
        <div className="w-80 h-[608px] flex flex-col border-2 border-slate-700 ml-4">
          {/* Play and time buttons */}
          {
            <div className="flex flex-col justify-center items-center text-center mt-4 pb-4 border-b-[1px]">
              <select
                className="w-5/6 mb-4  bg-green-600 text-white font-extrabold text-xl px-8 py-4 rounded-xl cursor-pointer hover:bg-green-300"
                onChange={(e) => setMinutes(Number(e.target.value))}
                value={minutes}
              >
                <option value={1}>1 min</option>
                <option value={3}>3 min</option>
                <option value={10}>10 min</option>
              </select>

              <button
                onClick={handleStartGame}
                className="w-5/6 bg-green-600 text-white font-extrabold text-xl px-8 py-4 rounded-xl cursor-pointer hover:bg-green-300"
              >
                Play
              </button>
            </div>
          }

          {/* Move history and buttons*/}
          <div>
            {/* Move history */}
            <div className="h-[370px]">
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
                            index * 2 + 1 === historyIndex ? "bg-gray-400" : ""
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

            {/* Buttons */}
            {(gamePhase === "ongoing" || gamePhase === "ended") && (
              <div
                className="flex items-center justify-between p-2.5 mx-1 rounded-lg 
          bg-gray-100 hover:bg-gray-200 active:bg-gray-300
          text-gray-700 hover:text-gray-900
          text-xl font-medium transition-colors duration-200
          border border-gray-300 hover:border-gray-400
          cursor-pointer shadow-sm"
              >
                <button>Draw</button>

                <button onClick={handleResign}>Resign</button>

                <button onClick={() => setHistoryIndex(0)}>&#124;&lt;</button>

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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Play;

console.clear();

const pgn = `[Event "It (cat.17)"]
[Site "Wijk aan Zee (Netherlands)"]
[Date "1999.??.??"]
[Round "?"]
[White "Garry Kasparov"]
[Black "Veselin Topalov"]
[Result "1-0"]
[TimeControl ""]
[Link "https://www.chess.com/games/view/969971"]

1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6
Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4
15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1
d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+
Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+
Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8
Rd3 40. Qa8 c3`;

const createChessInstance = () => {
  const chessInstance = new Chess();
  // chessInstance.loadPgn(pgn);
  return chessInstance;
};

/*
Connection handling
Learn hooks (2)

...
Share button feature and other features
Chessboard beautify
  animation, among other properties
Sounds

...
Stockfish
*/

/*
10 april- add timing feature, navbar, resign
*/

/*
Clean code-

custom socket
*/
