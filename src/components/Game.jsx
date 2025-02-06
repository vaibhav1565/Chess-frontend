import { useCallback, useState } from "react";
import { useSocket } from "../hooks/useSocket";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { MOVE, ASSIGN_COLOR, DISCONNECT } from "../utils/messages";


const Game = () => {
  const [chess] = useState(new Chess());
  const [board, setBoard] = useState(chess.board());
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
        // console.log(playerColor);
        // console.log(socket);
        // if (!playerColor) {
        //   console.warn("Ignoring move: playerColor is not set yet.");
        //   return;
        // }
        const move = message.payload;
        try {
          chess.move(move);
          setBoard(chess.board());
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
    // console.log("handlePieceDrop");
    // console.log(playerColor);
    // console.log(socket);
    if (chess.turn() !== playerColor) return;
    try {
      chess.move({
        from: sourceSquare,
        to: targetSquare
      });
      setBoard(chess.board());

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

  function transformChessboard(board) {
    const result = {};

    board.forEach((row) => {
      row.forEach((piece) => {
        if (piece) {
          result[piece.square] = piece.color + piece.type.toUpperCase();
        }
      });
    });

    return result;
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
        <div>
          <Chessboard
            id="BasicBoard"
            boardWidth={500}
            position={transformChessboard(board)}
            boardOrientation={
              playerColor === null || playerColor === "w" ? "white" : "black"
            }
            onPieceDrop={(sourceSquare, targetSquare) =>
              handlePieceDrop(sourceSquare, targetSquare)
            }
            animationDuration={0}
            customArrowColor="rgb(255,170,0)"
          />
        </div>
        <p>Total moves: {chess.history().length}</p>
      </div>
      <div>{gameOutcome || " "}</div>
    </div>
  );
};
export default Game;