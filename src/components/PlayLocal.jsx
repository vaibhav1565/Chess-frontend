import { useState } from "react";
import { Chessboard } from "react-chessboard";

import ChessHistoryButtons from "./ChessHistoryButtons";
import MoveHistory from "./MoveHistory";
import PlayerTile from "./PlayerTile";
import StatusBar from "./StatusBar";

import {
  createChessInstance,
  generateSquareStyles,
  getGameOverDetails,
  isPromotionMove,
  makeChessMove,
  onPromotionCheck,
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
  const [chess, setChess] = useState(createChessInstance);
  const history = chess.history();
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [moveFrom, setMoveFrom] = useState("");
  const [moveTo, setMoveTo] = useState(null);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);

  const [gamePhase, setGamePhase] = useState(GAME_PHASES.NOT_STARTED);

  const [status, setStatus] = useState("Click on play button to get started");

  function beginGame() {
    console.group("[BEGIN GAME]");
    resetState();
    setStatus("Game started! White's turn");

    setGamePhase(GAME_PHASES.ONGOING);
    playSound(sound_game_start);

    console.groupEnd();
  }

  function checkForPromotion(sourceSquare, targetSquare, piece) {
    return onPromotionCheck(
      sourceSquare,
      targetSquare,
      piece,
      showPromotionDialog
    );
  }

  function endGame(reason, loser) {
    console.group("[ENDGAME]");

    setStatus(`Game over by ${reason}\n${loser ? `Loser: ${loser}` : ""}`);
    setGamePhase(GAME_PHASES.ENDED);
    console.log(`Game ended: ${reason}, ${loser}`);
    playSound(sound_game_end);

    console.groupEnd();
  }

  function onPieceDrop(sourceSquare, targetSquare, piece) {
    console.group("[ON PIECE DROP]");

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
    if (!sourceSquare) {
      // this edge case is for promotion. onPieceDrop is called when promotion piece is selected with value of sourceSquare as null
      console.log("No source square");
      console.groupEnd();
      return false;
    }

    console.log(
      "Function called with payload",
      sourceSquare,
      targetSquare,
      piece
    );

    const moves = chess.moves({
      square: sourceSquare,
      verbose: true,
    });
    console.log("Available moves from source square:", moves);

    let foundMove = moves.find((m) => m.to === targetSquare);
    if (!foundMove) {
      console.log("No direct move found. Checking for castling moves.");
      if (
        (piece === "wK" &&
          sourceSquare === "e1" &&
          (targetSquare === "a1" || targetSquare === "h1")) ||
        (piece === "bK" &&
          sourceSquare === "e8" &&
          (targetSquare === "a8" || targetSquare === "h8"))
      ) {
        if (targetSquare[0] === "h") {
          foundMove = moves.find((m) => m.san === "O-O");
        } else {
          foundMove = moves.find((m) => m.san === "O-O-O");
        }
      }
      if (!foundMove) {
        console.log("No valid move found, including castling. Move rejected.");
        console.groupEnd();
        return false;
      }
    }

    console.log("Found move:", foundMove);

    if (isPromotionMove(foundMove)) {
      console.log("Promotion move detected. Showing promotion dialog.");
      setShowPromotionDialog(true);
      console.log("Setting moveFrom and moveTo.");
      setMoveFrom(foundMove.from);
      setMoveTo(foundMove.to);
      console.groupEnd();
      return false;
    }

    console.log("Executing the move.");
    const { latestMove, newChess } = makeChessMove({
      from: foundMove.from,
      to: foundMove.to,
    }, chess);

    console.log("Move executed successfully. Updating game state.");

    onMoveSuccess(latestMove, newChess);
    console.groupEnd();
    return true;
  }

  function onMoveSuccess(latestMove, newChess) {
    console.group("[ON MOVE SUCCESS]");

    setChess(newChess);
    setHistoryIndex(newChess.history().length - 1);

    setMoveFrom("");
    setMoveTo(null);
    setShowPromotionDialog(false);

    if (newChess.isGameOver()) {
      const { reason, loser = null } = getGameOverDetails(newChess);
      endGame(reason, loser);
    } else {
      setStatus(`${newChess.turn() === "w" ? "White" : "Black"}'s turn`);
      if (!playMoveSound(latestMove)) {
        playSound(sound_move_self);
      }
    }

    console.groupEnd();
  }

  function onPromotionPieceSelect(piece, promoteFromSquare, promoteToSquare) {
    console.group("[ON PROMOTION PIECE SELECT]");
    console.log("Function called with payload:", piece);

    // if no piece passed then user has cancelled dialog, don't make move and reset
    if (piece) {

      const { latestMove, newChess } = makeChessMove({
        from: moveFrom,
        to: moveTo,
        promotion: piece[1].toLowerCase(),
      }, chess);

      onMoveSuccess(latestMove, newChess);

      console.log("Promotion move executed successfully. Updating game state.");
    } else {
      console.log("No piece selected.");
    }

    console.log("Resetting moveFrom, moveTo, and hiding promotion dialog.");
    setMoveFrom("");
    setMoveTo(null);
    setShowPromotionDialog(false);

    console.groupEnd();
    return true;
  }

  function onSquareClick(square, piece) {
    console.group("[ON SQUARE CLICK]");

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

    if (square === moveFrom) {
      console.log("Clicked the same square as moveFrom. Resetting moveFrom.");
      setMoveFrom("");
      console.groupEnd();
      return;
    }

    console.log("Function called with payload: ", square);
    console.log("Current moveFrom:", moveFrom);
    console.log("Current moveTo:", moveTo);

    if (!moveFrom) {
      if (chess.get(square)) {
        console.log("Setting moveFrom to:", square);
        setMoveFrom(square);
      } else {
        console.log("Clicked an empty square. No action taken.");
      }
    }
    else if (!moveTo) {
      console.log("Attempting to move from:", moveFrom, "to:", square);

      // check if valid move before showing dialog
      const moves = chess.moves({
        square: moveFrom,
        verbose: true,
      });
      console.log("Available moves from moveFrom:", moves);

      const foundMove = moves.find((m) => m.to === square);
      if (!foundMove) {
        console.log("Invalid move. Checking if clicked on a new piece.");
        setMoveFrom(chess.get(square) ? square : "");
        console.groupEnd();
        return;
      }

      console.log("Valid move found:", foundMove);
      setMoveTo(square);

      // if promotion move
      if (isPromotionMove(foundMove)) {
        console.log("Promotion move detected. Showing promotion dialog.");
        setShowPromotionDialog(true);
        console.groupEnd();
        return;
      }

      // is normal move
      console.log("Executing normal move.");

      const { latestMove, newChess } = makeChessMove({
        from: moveFrom,
        to: square,
      }, chess);

        onMoveSuccess(latestMove, newChess);
        console.log("Move executed successfully. Updating game state.");
    }

    console.groupEnd();
  }

  function resetState() {
    console.group("[RESET STATE]");
    setChess(createChessInstance);
    setHistoryIndex(-1);
    setStatus("Click on new game button to get started");

    setMoveFrom("");
    setMoveTo(null);
    setShowPromotionDialog(false);

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

    setMoveFrom("");
    setMoveTo(null);
    setShowPromotionDialog(false);

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
              setMoveTo(null);
              setShowPromotionDialog(false);
            }}
            tabIndex={0}
          >
            <Chessboard
              animationDuration={
                historyIndex === chess.history().length - 1 ? 200 : 0
              }
              areArrowsAllowed={false}
              customNotationStyle={{
                fontSize: "15px",
              }}
              customSquareStyles={generateSquareStyles(moveFrom, chess)}
              onPieceDrop={onPieceDrop}
              onPromotionCheck={checkForPromotion}
              onPromotionPieceSelect={onPromotionPieceSelect}
              onSquareClick={onSquareClick}
              position={
                historyIndex === -1
                  ? "start"
                  : chess.history({ verbose: true })[historyIndex]["after"]
              }
              promotionDialogVariant="modal"
              promotionToSquare={moveTo}
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
              {gamePhase !== GAME_PHASES.NOT_STARTED && (<button
                onClick={undoMove}
                className="bg-blue-600 text-white font-bold text-base md:text-lg px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-500 transition duration-200"
              >
                Undo move
              </button>)}

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