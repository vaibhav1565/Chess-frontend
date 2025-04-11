import { Chess } from "chess.js";
import { useEffect, useRef, useState } from "react";
import { experimental_useEffectEvent as useEffectEvent } from "react";
import { Chessboard } from "react-chessboard";
import { useSelector } from "react-redux";

console.clear();

function getTokenFromCookies() {
  const cookies = document.cookie.split("; ");
  const tokenCookie = cookies.find((row) => row.startsWith("token="));
  return tokenCookie ? tokenCookie.split("=")[1] : null;
}

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

const Game = () => {
  const user = useSelector((store) => store.user);
  const [opponent, setOpponent] = useState(null);

  const [connectionError, setConnectionError] = useState(null);

  const socket = useRef(null);

  console.time("chess object");
  const [chess, setChess] = useState(new Chess());
  console.timeEnd("chess object");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const history = chess.history();

  const [playerColor, setPlayerColor] = useState(null);

  const [status, setStatus] = useState("Click on Play button to get started");

  function handleEndGame() {
    if (!chess.isGameOver()) return;
    let message = "Game over!";

    if (chess.isDraw()) {
      message += chess.isDrawByFiftyMoves()
        ? "\nDraw by 50 moves rule"
        : chess.isInsufficientMaterial()
        ? "\nDraw by Insufficient Material"
        : chess.isStalemate()
        ? "\nDraw by stalemate"
        : chess.isThreefoldRepetition()
        ? "\nDraw by Threefold Repetition"
        : "";
    } else if (chess.isCheckmate()) {
      message +=
        playerColor !== null && playerColor === chess.turn()
          ? "\nYou lost!"
          : "\nYou won!";
    }
    setStatus(message);
  }

  const handleEffectEvent = useEffectEvent((message)=> {
    console.log("Received message:", message);

    switch (message.type) {
      case "game_begin":
        setPlayerColor(message.payload.color);
        setOpponent(message.payload.opponent);
        setStatus(
          `Game started. You are playing as ${
            message.payload.color === "w" ? "White" : "Black"
          }`
        );
        break;

      case "move":
        handleOpponentMove(message.payload);
        handleEndGame();
        break;

      case "message":
        if (message.message === "wait") {
          setStatus("Waiting for another player to join");
        }
        break;

      case "game_over":
        setStatus(`Game over!\nReason-${message.payload.reason}`)
        break;
      case "resign":
        /*  */
        break;
    }
  })

  useEffect(() => {
    if (socket.current) return;

  //   // function handleMessage(message) {
  //   //   console.log("Received message:", message);

  //   //   switch (message.type) {
  //   //     case "game_begin":
  //   //       setPlayerColor(message.payload.color);
  //   //       setOpponent(message.payload.opponent);
  //   //       setStatus(
  //   //         `Game started. You are playing as ${
  //   //           message.payload.color === "w" ? "White" : "Black"
  //   //         }`
  //   //       );
  //   //       break;

  //   //     case "move":
  //   //       handleOpponentMove(message.payload.move);
  //   //       handleEndGame();
  //   //       break;

  //   //     case "message":
  //   //       if (message.message === "wait") {
  //   //         setStatus("Waiting for another player to join");
  //   //       }
  //   //       break;

  //   //     case "game_over":
  //   //       /*  */
  //   //       break;
  //   //     case "resign":
  //   //       /*  */
  //   //       break;
  //   //   }
  //   // }

    const token = getTokenFromCookies();
    if (!token) {
      setConnectionError("No authentication token found");
      return;
    }
    socket.current = new WebSocket(
      `ws://localhost:3000/ws?token=${encodeURIComponent(token)}`
    );

    socket.current.addEventListener("open", () => {
      console.log("Socket connection established");
      setConnectionError(null);
    });

    socket.current.addEventListener("message", (event) => {
      // setConnectionError(null);
      // handleMessage(JSON.parse(event.data));
      handleEffectEvent(JSON.parse(event.data));
      // console.log(JSON.parse(event.data));
    });

    socket.current.addEventListener("error", (error) => {
      console.error("WebSocket error:", error);
      setConnectionError("WebSocket connection failed");
      socket.current = null;
    });

    socket.current.addEventListener("close", (event) => {
      console.log("WebSocket connection closed", event);
      socket.current = null;
    });

    return () => {
        // setConnectionError(null);
        socket.current?.close();
        socket.current = null;
    };
  }, []);

  function handleOpponentMove(move) {
    console.log(move);
    setChess((prevChess) => {
      const newChess = new Chess();
      newChess.loadPgn(prevChess.pgn());

      newChess.move(move, { strict: true });
      setHistoryIndex(newChess.history().length - 1);
      return newChess;
    });
  }

  function handleStartGame() {
    if (socket.current?.readyState !== WebSocket.OPEN) {
      setStatus("Cannot start game. WebSocket not connected.");
      // console.log(socket.current.readyState);
      return;
    }

    try {
      socket.current.send(
        JSON.stringify({
          type: "init_game",
          payload: { minutes: 1 },
        })
      );
    } catch (error) {
      console.error("Error starting game:", error);
      setStatus("Failed to start game");
    }
  }

  // eslint-disable-next-line no-unused-vars
  function handlePieceDrop(sourceSquare, targetSquare, piece) {
    // console.log(sourceSquare, targetSquare, piece);
    if (historyIndex !== history.length - 1 || chess.turn() !== playerColor) {
      setHistoryIndex(history.length - 1);
      return false;
    }

    const moveObject = {
      from: sourceSquare,
      to: targetSquare,
      // promotion: piece[1].toLowerCase(), // promotion in case of actual promotion, else, no error
    };
    let moveSuccessful = false;

    setChess((prevChess) => {
      const newChess = new Chess();
      newChess.loadPgn(prevChess.pgn()); // Clone the previous state to retain history

      try {
        newChess.move(moveObject, { strict: true });
        moveSuccessful = true;
        setHistoryIndex(newChess.history().length - 1);

        if (socket.current?.readyState === WebSocket.OPEN) {
          // try {
          socket.current.send(
            JSON.stringify({
              type: "move",
              payload: moveObject,
            })
          );
          console.log("Move sent");
          // handleEndGame();
          // } catch (error) {
          //   console.error("Error sending move:", error);
          // }
        } else {
          return prevChess;
        }
        return newChess;
      } catch (error) {
        console.error("Invalid move", error);
        return prevChess; // Return previous state to prevent invalid updates
      }
    });

    // if (moveSuccessful && socket.current?.readyState === WebSocket.OPEN) {
    //   try {
    //     socket.current.send(
    //       JSON.stringify({
    //         type: "move",
    //         payload: moveObject,
    //       })
    //     );
    //     handleEndGame();
    //   } catch (error) {
    //     console.error("Error sending move:", error);
    //   }
    // }
    return moveSuccessful;
  }

  return (
    <div className="flex">
      <div>
        {connectionError && (
          <div className="text-red-500 p-2">{connectionError}</div>
        )}
        <p>{status}</p>
        <p>
          {playerColor
            ? `${chess.turn() === "w" ? "White" : "Black"}'s turn`
            : "\u00A0"}
        </p>
        <div className="flex flex-col">
          <p>
            {opponent ? opponent.username : "opponent"}{" "}
            {playerColor === "b" ? "♙" : "♟"}
          </p>
          <Chessboard
            // animationDuration={historyIndex === history.length - 1 ? 200 : 0}
            areArrowsAllowed={false}
            boardOrientation={
              playerColor === null || playerColor === "w" ? "white" : "black"
            }
            boardWidth={600}
            // customDarkSquareStyle={{
            //   backgroundColor: "#779952",
            // }}
            // customDropSquareStyle={{
            //   boxShadow: "inset 0 0 1px 6px rgba(68,125,247,0.75)",
            // }}
            // customLightSquareStyle={{
            //   backgroundColor: "#edeed1",
            // }}
            onPieceDrop={handlePieceDrop}
            position={
              historyIndex > -1
                ? chess.history({ verbose: true })[historyIndex]["after"]
                : chess.fen()
            }
          />
          <p>
            {user ? user.data.username : "user"}{" "}
            {playerColor === "b" ? "♟" : "♙"}
          </p>
        </div>
      </div>

      <div className="flex flex-col border-2 border-slate-700 w-[400px] ml-4">

        <div className="flex justify-center mt-4 pb-4 border-b-2">
          <button
            onClick={handleStartGame}
            className="bg-green-500 px-8 py-4 rounded-xl cursor-pointer hover:bg-green-300"
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

export default Game;

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