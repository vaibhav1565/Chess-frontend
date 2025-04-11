import { Chess } from "chess.js";
import { useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { useSelector } from "react-redux";

console.clear();

const createChessInstance = () => new Chess();

function formatTime(milliseconds) {
  if (!milliseconds || milliseconds <= 0) return "00:00";

  const minutes = Math.floor(milliseconds / 1000 / 60);
  const seconds = Math.floor((milliseconds / 1000) % 60);

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

function getTokenFromCookies() {
  const cookies = document.cookie.split("; ");
  const tokenCookie = cookies.find((row) => row.startsWith("token="));
  return tokenCookie ? tokenCookie.split("=")[1] : null;
}

const Play = () => {
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

  const handleMessageRef = useRef(() => {}); // Initialize with an empty function

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
    };
  }, []);

  handleMessageRef.current = (message) => {
    switch (message.type) {
      case "game_begin": {
        console.log("[GAME] Game started:", message.payload);
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
        handleOpponentMove(message.payload);
        startTimerFor("user", userTime);
        handleEndGame();
        break;
      }
      case "message": {
        console.log("[MESSAGE] General message:", message.payload);
        if (message.payload === "wait") {
          setStatus("Waiting for another player to join");
        }
        break;
      }
      case "game_over": {
        console.log("[GAME] Game over:", message.payload.reason);
        setStatus(`Game over!\nReason-${message.payload.reason}`);
        break;
      }
      case "resign": {
        console.log("[GAME] Opponent resigned");
        break;
      }
      default:
        console.warn("[MESSAGE] Unknown message type:", message);
    }
  };

  function safeGameMutate(modify) {
    let isSuccess = false;

    setChess((prevChess) => {
      const newChess = new Chess();
      newChess.loadPgn(prevChess.pgn()); // Clone the previous state to retain history

      try {
        modify(newChess);
        isSuccess = true;
        console.log("[CHESS] Move applied:", newChess.history().slice(-1));

        return newChess;
      } catch (error) {
        console.error("[CHESS] Invalid move:", error);

        return prevChess;
      }
    });

    return isSuccess;
  }

  const setupWorker = (isUser, timeLeft) => {
    console.log("[TIMER] Setting up worker:", { isUser, timeLeft });

    const worker = new Worker(new URL("./timerWorker.js", import.meta.url));

    worker.postMessage({
      type: "start",
      payload: { timeLeft, tickRate: 100 },
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

  function startTimerFor(role, timeLeft) {
    if (role === "user") {
      setTimer(true, timeLeft);
    }
    else {
      setTimer(false, timeLeft);
    }
  }

  function setTimer(isUser, timeLeft) {
    console.log("[TIMER] Switching timer. isUser:", isUser);

    if (isUser) {
      if (opponentWorker.current)
        opponentWorker.current.postMessage({ type: "stop" });
      if (userWorker.current) userWorker.current.postMessage({ type: "stop" });

      userWorker.current = setupWorker(true, timeLeft);
    } else {
      if (userWorker.current) userWorker.current?.postMessage({ type: "stop" });
      if (opponentWorker.current)
        opponentWorker.current?.postMessage({ type: "stop" });

      opponentWorker.current = setupWorker(false, timeLeft);
    }
  }

  function handleEndGame() {
    if (!chess.isGameOver()) return;

    if (userWorker.current) {
      userWorker.current.postMessage({ type: "stop" });
      // userWorker.current.terminate();
    }
    if (opponentWorker.current) {
      opponentWorker.current.postMessage({ type: "stop" });
      // opponentWorker.current.terminate();
    }

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

  function handleOpponentMove(move) {
    safeGameMutate((chessObject) => chessObject.move(move, { strict: true }));
  }

  function handleStartGame() {
    if (socket.current?.readyState !== WebSocket.OPEN) {
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

    const moveObject = {
      from: sourceSquare,
      to: targetSquare,
      // promotion: piece[1].toLowerCase(), // promotion in case of actual promotion, else, no error
    };
    let moveSuccessful = false;
    moveSuccessful = safeGameMutate((chessObject) => {
      chessObject.move(moveObject, { strict: true });
    });
    if (moveSuccessful) {
      console.log("[MOVE] Move successful, sending to server:", moveObject);
      setHistoryIndex((prev) => prev + 1);

      if (sendMessage("move", moveObject)) {
        startTimerFor("opponent", opponentTime);
        handleEndGame();
      }
    }

    return moveSuccessful;
  }

  const sendMessage = (type, payload) => {
    if (socket.current?.readyState !== WebSocket.OPEN) {
      console.warn(`[Send] Skipped sending "${type}", socket not open`);
      return;
    }
    try {
      socket.current.send(JSON.stringify({ type, payload }));
      console.log(`[Send] ${type}`, payload);
      return true;
    } catch (error) {
      console.error(`[Send Error] ${type}`, error);
    }
  };

  return (
    <div className="flex mt-4">
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
      </div>

      <div className="w-80 flex flex-col border-2 border-slate-700 ml-4">
        <div className="flex flex-col justify-center items-center text-center mt-4 pb-4 border-b-[1px]">
          <select
            className="w-5/6 mb-4  bg-green-500 px-8 py-4 rounded-xl cursor-pointer hover:bg-green-300"
            onChange={(e) => setMinutes(Number(e.target.value))}
            value={minutes}
          >
            <option value={1}>⏰ 1</option>
            <option value={3}>⏰ 3</option>
            <option value={10}>⏰ 10</option>
          </select>
          <button
            onClick={handleStartGame}
            className="w-5/6 bg-green-500 px-8 py-4 rounded-xl cursor-pointer hover:bg-green-300"
          >
            Play
          </button>
        </div>
        <div>
          <ul className="overflow-y-auto h-[600px]">
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

          {history.length > 0 && (
            <div className="flex justify-between">
              <button
                className="p-2 cursor-pointer text-2xl outline-2"
                onClick={() =>
                  setHistoryIndex((prev) => (prev > 0 ? prev - 1 : prev))
                }
              >
                &lt;
              </button>
              <button
                className="p-2 cursor-pointer text-2xl outline-2"
                onClick={() =>
                  setHistoryIndex((prev) =>
                    prev < history.length - 1 ? prev + 1 : prev
                  )
                }
              >
                &gt;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Play;

// const pgn =
// `[Event "It (cat.17)"]
// [Site "Wijk aan Zee (Netherlands)"]
// [Date "1999.??.??"]
// [Round "?"]
// [White "Garry Kasparov"]
// [Black "Veselin Topalov"]
// [Result "1-0"]
// [TimeControl ""]
// [Link "https://www.chess.com/games/view/969971"]

// 1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6
// Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4
// 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1
// d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+
// Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+
// Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8
// Rd3 40. Qa8 c3`;
// const chessInstance = new Chess();
// chessInstance.loadPgn(pgn);

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
