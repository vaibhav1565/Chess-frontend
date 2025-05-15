import { Chess, DEFAULT_POSITION } from "chess.js";
import { useState } from "react";
import { Chessboard } from "react-chessboard";
import MoveHistory from "./MoveHistory";
import ChessHistoryButtons from "./ChessHistoryButtons";
import StatusBar from "./StatusBar";
import { makeChessMove, playMoveSound, playSound } from "../utils/chessHelper";
import PlayerTile from "./PlayerTile";

const sound_game_start = new Audio("sounds/game-start.mp3");
const sound_game_end = new Audio("sounds/game-end.mp3");
const sound_move_self = new Audio("sounds/move-self.mp3");
const sound_illegal = new Audio("sounds/illegal.mp3");

const GAME_PHASES = {
  NOT_STARTED: "not_started",
  ONGOING: "ongoing",
  ENDED: "ended",
};

const PlayLocal = () => {
  const [chess, setChess] = useState(new Chess());

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
      return false;
    }

    const moveObject = {
      from: sourceSquare,
      to: targetSquare,
      promotion: piece[1].toLowerCase(), // promotion in case of actual promotion, else, no error,
    };

    const { success, latestMove, newChess } = makeChessMove(moveObject, chess);
    if (!success) {
      console.groupEnd();
      return false;
    }

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
    return true;
  }

  function resetState() {
    setChess(new Chess());
    setHistoryIndex(-1);
    setStatus("Click on new game button to get started");
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

          <div className="w-full">
            <Chessboard
              animationDuration={
                historyIndex === chess.history().length - 1 ? 300 : 0
              }
              areArrowsAllowed={false}
              onPieceDrop={handlePieceDrop}
              position={
                historyIndex === -1
                  ? DEFAULT_POSITION
                  : chess.history({ verbose: true })[historyIndex]["after"]
              }
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
          <MoveHistory
            history={chess.history()}
            historyIndex={historyIndex}
            setHistoryIndex={setHistoryIndex}
          />
        </div>
      </div>
    </div>
  );
};

export default PlayLocal;
