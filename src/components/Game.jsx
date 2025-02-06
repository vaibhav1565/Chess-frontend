import { useCallback, useState } from "react";
import { useSocket } from "../hooks/useSocket";
import { Chess } from "chess.js";
import { DEFAULT_POSITION } from "chess.js";
import { Chessboard } from "react-chessboard";
import { MOVE, ASSIGN_COLOR, DISCONNECT } from "../utils/messages";


const Game = () => {
  const [chess] = useState(new Chess());
  const [history, setHistory] = useState(chess.history({verbose: true}));
  const [chessState, setChessState] = useState(-1);

  const [playerColor, setPlayerColor] = useState(null);
  const [status, setStatus] = useState("Waiting for another player to join...");
  const [gameOutcome, setGameOutcome] = useState(null);

  const handleMessage = useCallback((event)=> {
    const message = JSON.parse(event.data);
    console.log(message);

    switch (message.type) {
      case ASSIGN_COLOR: {
        setPlayerColor(message.payload.color);
        setStatus(
          `You are playing as ${
            message.payload.color === "w" ? "White" : "Black"
          }`
        );
        break;
      }

      case MOVE: {
        const move = message.payload;
        try {
          chess.move(move);
          setHistory(chess.history({verbose: true}));
          setChessState(chessState => chessState + 1);
          handleGameOver();
        } catch (e) {
          console.log("Invalid move");
          console.log(e);
        }
        break;
      }

      case DISCONNECT: {
        setPlayerColor(null);
        setStatus("The other player disconnected. Reloading....");
        //if (socket) socket.close();

        setTimeout(()=>{
          window.location.reload();
        },3000)
        break;
      }
    }
  },[playerColor])

  const socket = useSocket(handleMessage);

  function handlePieceDrop(sourceSquare, targetSquare) {
    if (chessState != history.length - 1) {
      setChessState(history.length - 1);
      return false;
    }
    if (chess.turn() !== playerColor) {
      setChessState(history.length - 1);
      return false;
    }
    try {
      chess.move({
        from: sourceSquare,
        to: targetSquare
      });
      setHistory(chess.history({ verbose: true}));
      setChessState((chessState) => chessState + 1);
      try {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              type: MOVE,
              payload: { from: sourceSquare, to: targetSquare },
            })
          );
        }
        handleGameOver();
        return true;
      } catch (e) {
        console.log(e);
        return false;
      }
    } catch (e) {
      console.log("Invalid move");
      console.log(e);
    }
  }

  function handlePromotionPieceSelect(piece, promoteFromSquare, promoteToSquare) {
    try {
      chess.move({
        from: promoteFromSquare,
        to: promoteToSquare,
        promotion: piece[1].toLowerCase(),
      });
      setHistory(chess.history({ verbose: true}));
      setChessState((chessState) => chessState + 1);
      try {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              type: MOVE,
              payload: {
                from: promoteFromSquare,
                to: promoteToSquare,
                promotion: piece[1].toLowerCase(),
              },
            })
          );
        }
        handleGameOver();
        return true;
      } catch (e) {
        console.log(e);
        return false;
      }
    } catch (e) {
      console.log("Invalid move");
      console.log(e);
      return false;
    }
  }

  function handleGameOver() {
    if (!chess.isGameOver()) return;

    let message = "Game over!";

    if (chess.isDraw()) {
      if (chess.isDrawByFiftyMoves()) message += "\nDraw by 50 moves rule";
      else if (chess.isInsufficientMaterial())
        message += "\nDraw by Insufficient Material";
      else if (chess.isStalemate()) message += "\nDraw by stalemate";
      else if (chess.isThreefoldRepetition())
        message += "\nDraw by Threefold Repetition";
    } else if (chess.isCheckmate()) {
      message += ((playerColor !== null && playerColor === chess.turn()) ? "\nYou lost!" : "\nYou won!");
    }
    console.log(playerColor);
    setGameOutcome(message);
  }
  return (
    <div className="h-screen flex flex-col items-center justify-center">
      <div>
        <p>{status}</p>
        <p>
          {playerColor && `${chess.turn() === "w" ? "White" : "Black"}'s turn`}
        </p>
      </div>
      <div>
        <div className="flex">
          <Chessboard
            id="BasicBoard"
            boardWidth={500}
            position={
              history.length > 0 ? history[chessState].after : DEFAULT_POSITION
            }
            boardOrientation={
              playerColor === null || playerColor === "w" ? "white" : "black"
            }
            onPieceDrop={handlePieceDrop}
            onPromotionPieceSelect={handlePromotionPieceSelect}
            animationDuration={0}
          />
          <div>
            <ul className="overflow-y-scroll h-[450px] w-48 border-2 border-black">
              {(function () {
                let result = [];
                for (let x = 0; x < chess.history().length; x += 2) {
                  result.push(chess.history().slice(x, x + 2));
                }
                return result;
              })().map((h, i) => (
                <li
                  key={i}
                  className="grid grid-cols-3 p-2 bg-gray-100 border-b border-gray-300 rounded-lg shadow-sm hover:bg-gray-200 transition-colors duration-200"
                >
                  <span>{i + ". "}</span>
                  <span
                    className={`w-min cursor-pointer ${
                      2 * i === chessState ? "bg-gray-400" : ""
                    }`}
                    onClick={() => setChessState(2 * i)}
                  >
                    {h[0]}
                  </span>
                  {h[1] && (
                    <span
                      className={`w-min cursor-pointer ${
                        2 * i + 1 === chessState ? "bg-gray-400" : ""
                      }`}
                      onClick={() => setChessState(2 * i + 1)}
                    >
                      {h[1]}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <div className="w-48 flex justify-evenly">
              <button
                className="cursor-pointer px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={() => setChessState((chessState) => chessState > -1 ? chessState - 1 : chessState)}
              >
                &lt;
              </button>
              <button
                className="cursor-pointer px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={() => setChessState((chessState) => chessState < history.length - 1 ? chessState + 1 : chessState)}
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
        <p>Total moves: {history.length}</p>
      </div>
      <div>{gameOutcome || " "}</div>
    </div>
  );
};
export default Game;