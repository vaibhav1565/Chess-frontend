import { Chess } from "chess.js";
import { useState } from "react";
import { Chessboard } from "react-chessboard";

import ChessHistoryButtons from "./ChessHistoryButtons";
import MoveHistory from "./MoveHistory";
import PlayerTile from "./PlayerTile";
import StatusBar from "./StatusBar";

import {
  generateSquareStyles,
  makeChessMove,
  playMoveSound,
  playSound,
} from "../utils/chessHelper";

const sound_game_start = new Audio("sounds/game-start.mp3");
const sound_game_end = new Audio("sounds/game-end.mp3");
const sound_move_self = new Audio("sounds/move-self.mp3");

const GAME_PHASES = {
  NOT_STARTED: "not_started",
  ONGOING: "ongoing",
  ENDED: "ended",
};

const PlayLocal = () => {
  const [chess, setChess] = useState(new Chess());
  const [moveFrom, setMoveFrom] = useState("");
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);

  const history = chess.history();
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [gamePhase, setGamePhase] = useState(GAME_PHASES.NOT_STARTED);

  const [status, setStatus] = useState("Click on play button to get started");

  function beginGame() {
    console.group("[START GAME]");
    resetState();
    setStatus("Game started! White's turn");

    setGamePhase(GAME_PHASES.ONGOING);
    playSound(sound_game_start);

    console.groupEnd();
  }

  function endGame(reason, loser) {
    console.group("[ENDGAME]");

    setStatus(`Game over by ${reason}\n${loser ? `Loser: ${loser}` : ""}`);
    setGamePhase(GAME_PHASES.ENDED);
    console.log(`Game ended: ${reason}, ${loser}`);
    playSound(sound_game_end);

    console.groupEnd();
  }

  function getGameOverDetails(chessInstance) {
    if (chessInstance.isCheckmate()) {
      const loser = chessInstance.turn() === "w" ? "white" : "black";
      return { reason: "checkmate", loser };
    }
    if (chessInstance.isStalemate()) {
      return { reason: "stalemate", loser: null };
    }
    if (chessInstance.isThreefoldRepetition()) {
      return { reason: "threefold repetition", loser: null };
    }
    if (chessInstance.isInsufficientMaterial()) {
      return { reason: "insufficient material", loser: null };
    }
    if (chessInstance.isDraw()) {
      return { reason: "draw", loser: null };
    }
  }

  function handlePieceClick(piece, square) {
    console.group("[HANDLE PIECE CLICK]");
    if (gamePhase !== GAME_PHASES.ONGOING) {
      console.groupEnd();
      return;
    }

    console.log("Function called with payload:", piece, square);

    if (!moveFrom) {
      setMoveFrom(square);
      console.groupEnd();
      return;
    }

    const moves = chess.moves({ square: moveFrom, verbose: true });
    const foundMove = moves.find((m) => m.from === moveFrom && m.to === square);
    if (!foundMove) {
      setMoveFrom(chess.get(square) ? square : "");
      console.groupEnd();
      return;
    }

    if (
      (foundMove.color === "w" &&
        foundMove.piece === "p" &&
        square[1] === "8") ||
      (foundMove.color === "b" && foundMove.piece === "p" && square[1] === "1")
    ) {
      setShowPromotionDialog(true);
      console.groupEnd();
      return;
    }
    const moveObject = {
      from: moveFrom,
      to: square,
    };
    const { success, newChess, latestMove } = makeChessMove(moveObject, chess);
    if (success) {
      onMoveSuccess(latestMove, newChess);
    }

    setMoveFrom("");
    console.groupEnd();
  }

  function handlePieceDrop(sourceSquare, targetSquare, piece) {
    console.group("[PIECE DROP]");

    if (gamePhase !== GAME_PHASES.ONGOING) {
      console.log("No ongoing game", gamePhase);
      console.groupEnd();
      return false;
    }

    if (historyIndex !== history.length - 1) {
      console.log("Rejecting move due to history mismatch");
      setHistoryIndex(history.length - 1);
      console.groupEnd();
      return false;
    }

    console.log(
      "Function called with payload",
      sourceSquare,
      targetSquare,
      piece
    );

    const moveObject = {
      from: sourceSquare,
      to: targetSquare,
    };

    const { success, latestMove, newChess } = makeChessMove(moveObject, chess);
    setMoveFrom("");
    if (!success) {
      console.groupEnd();
      return false;
    }

    onMoveSuccess(latestMove, newChess);

    console.groupEnd();
    return true;
  }

  function handleSquareClick(square, piece) {
    console.group("[HANDLE SQUARE CLICK]");

    if (gamePhase !== GAME_PHASES.ONGOING) {
      console.groupEnd();
      return;
    }

    if (square === moveFrom) {
      setMoveFrom("");
      console.groupEnd();
      return;
    }

    if (chess.get(square)) {
      console.groupEnd();
      return;
    }
    if (!moveFrom) {
      console.groupEnd();
      return;
    }

    console.log("Function called with payload", piece, square);
    const moveObject = {
      from: moveFrom,
      to: square,
    };
    const { success, newChess, latestMove } = makeChessMove(moveObject, chess);
    if (success) {
      onMoveSuccess(latestMove, newChess);
    }
    setMoveFrom("");
    console.groupEnd();
  }

  function onPromotionPieceSelect(piece, promoteFromSquare, promoteToSquare) {
    console.group("[ON PROMOTION PIECE SELECT");

    // if no piece passed then user has cancelled dialog, don't make move and reset
    if (piece) {
      console.log("Function called with payload", piece, promoteFromSquare, promoteToSquare);

      const moveObject = {
        from: promoteFromSquare,
        to: promoteToSquare,
        promotion: piece,
      };
      const { success, newChess, latestMove } = makeChessMove(moveObject, chess);

      setMoveFrom("");
      setShowPromotionDialog(false);
      console.groupEnd();

      if (success) {
        onMoveSuccess(latestMove, newChess);
      }
      else {
        return false;
      }
    }
    return true;
  }

  function onMoveSuccess(latestMove, newChess) {
    console.group("[ON MOVE SUCCESS]");

    setChess(newChess);
    setHistoryIndex(newChess.history().length - 1);

    if (newChess.isGameOver()) {
      const { reason, loser } = getGameOverDetails(newChess);
      endGame(reason, loser);
    } else {
      setStatus(`${newChess.turn() === "w" ? "White" : "Black"}'s turn`);
      if (!playMoveSound(latestMove)) {
        playSound(sound_move_self);
      }
    }

    console.groupEnd();
  }

  function resetState() {
    console.group("[RESET STATE]");
    setChess(new Chess());
    setHistoryIndex(-1);
    setStatus("Click on new game button to get started");
    setMoveFrom("");
    console.groupEnd();
  }

  function undoMove() {
    console.group("[UNDOMOVE]");
    setChess((prev) => {
      if (prev.history().length === 0) {
        return prev;
      }
      if (gamePhase === GAME_PHASES.ENDED && prev.isGameOver()) {
        setGamePhase(GAME_PHASES.ONGOING);
      }
      prev.undo();
      setHistoryIndex(prev.history().length - 1);
      setStatus(`${prev.turn() === "w" ? "White" : "Black"}'s turn`);

      return prev;
    });
    console.groupEnd();
  }

  return (
    <div className="flex flex-col items-center justify-center w-full px-4 sm:px-6 lg:px-8 text-center">
      <StatusBar status={status} />
      <div className="flex flex-col lg:flex-row items-center justify-center gap-6 py-4 w-full max-w-7xl mx-auto">
        {/* Chessboard and players info */}
        <div className="w-full max-w-[600px] lg:w-2/3 flex flex-col items-center">
          <PlayerTile playerName="Player 2" />

          <div
            className="w-full"
            onBlur={() => {
              setMoveFrom("");
            }}
            tabIndex={0}
          >
            <Chessboard
              animationDuration={
                historyIndex === chess.history().length - 1 ? 200 : 0
              }
              areArrowsAllowed={false}
              customSquareStyles={generateSquareStyles(moveFrom, chess)}
              onPieceClick={handlePieceClick}
              onPieceDrop={handlePieceDrop}
              onPromotionPieceSelect={onPromotionPieceSelect}
              onSquareClick={handleSquareClick}
              position={
                historyIndex === -1
                  ? "start"
                  : chess.history({ verbose: true })[historyIndex]["after"]
              }
              showPromotionDialog={showPromotionDialog}
            />
          </div>

          <PlayerTile playerName="Player 1" />
        </div>

        {/* Move history, Chess buttons */}
        <div className="w-full max-w-[600px] lg:w-1/3 lg:h-[680px] p-6 rounded-xl mt-8 lg:mt-0 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 shadow-lg border border-gray-600 transition-all duration-300">
          {/* Chess buttons */}
          <div className="mb-4">
            <div className="flex justify-evenly">
              <button
                onClick={undoMove}
                className="bg-blue-600 text-white font-bold text-base md:text-lg px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-500 transition duration-200"
              >
                Undo move
              </button>

              <button
                onClick={beginGame}
                className="bg-blue-600 text-white font-bold text-base md:text-lg px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-500 transition duration-200"
              >
                {gamePhase === GAME_PHASES.ENDED ||
                gamePhase === GAME_PHASES.ONGOING
                  ? "New game"
                  : "Play"}
              </button>
            </div>

            <ChessHistoryButtons
              setHistoryIndex={setHistoryIndex}
              historyLength={history.length}
            />
          </div>

          {/* Move history */}
          {history.length !== 0 && (
            <MoveHistory
              history={history}
              historyIndex={historyIndex}
              setHistoryIndex={setHistoryIndex}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayLocal;
