import { useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { useSelector } from "react-redux";
import { COLORS, GAME_END_REASONS } from "../utils/chessConstants";
import MoveHistory from "./MoveHistory";
import ChessHistoryButtons from "./ChessHistoryButtons";
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
  safeGameMutate,
} from "../utils/chessHelper";
import { BOT_SVG } from "../utils/otherConstants.jsx";
import PlayerTile from "./PlayerTile";

const sound_game_start = new Audio("sounds/game-start.mp3");
const sound_game_end = new Audio("sounds/game-end.mp3");
const sound_move_self = new Audio("sounds/move-self.mp3");
const sound_move_opponent = new Audio("sounds/move-opponent.mp3");

const DEPTH = 16;

const GAME_PHASES = {
  NOT_STARTED: "not_started",
  ONGOING: "ongoing",
  ENDED: "ended",
};

console.clear();

const Stockfish = () => {
  const user = useSelector((store) => store.user);

  const [chess, setChess] = useState(createChessInstance);
  const history = chess.history();
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [moveFrom, setMoveFrom] = useState("");
  const [moveTo, setMoveTo] = useState(null);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);

  const [userColor, setUserColor] = useState(null);

  /* white | random | black */
  const [colorChoice, setColorChoice] = useState("white");

  const [gamePhase, setGamePhase] = useState(GAME_PHASES.NOT_STARTED);

  const [status, setStatus] = useState("Click on play button to get started");

  const stockfish = useRef(null);

  function beginGame() {
    console.group("[BEGIN GAME]");

    resetState();

    setGamePhase(GAME_PHASES.ONGOING);
    setStatus("Game started. White's turn");
    const colorToSet =
      colorChoice === "black"
        ? "b"
        : colorChoice === "white"
        ? "w"
        : Math.random() < 0.5
        ? "b"
        : "w";

    setUserColor(colorToSet);

    startEngine();
    if (colorToSet === "b") {
      callEngine(chess);
    }

    playSound(sound_game_start);
    console.groupEnd();
  }

  function callEngine(chessInstance) {
    console.group("[CALL ENGINE]");
    console.log("Current instance's board-\n", chessInstance.ascii());
    const moves = chessInstance.history().join(" ");
    console.log("Moves till now-", moves);
    // stockfish.current.postMessage("stop");
    stockfish.current.postMessage(`position fen ${chessInstance.fen()}`);
    stockfish.current.postMessage(`go depth ${DEPTH}`);
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

    setStatus(
      `Game over by ${reason}\n${
        loser ? `Loser: ${loser === "w" ? "White" : "Black"}` : ""
      }`
    );
    setGamePhase(GAME_PHASES.ENDED);
    console.log(`Game ended: ${reason}, ${loser}`);

    console.groupEnd();

    playSound(sound_game_end);
  }

  function handleGameOver(chessInstance) {
    const { reason, loser = null } = getGameOverDetails(chessInstance);
    endGame(reason, loser);
  }

  function makeEngineMove(move) {
    console.group("[MAKE ENGINE MOVE]");
    console.log("Move object", move);

    setChess((prevChess) => {
      const { latestMove, newChess } = makeChessMove(move, prevChess, true);
      if (!latestMove) {
        console.log("Invalid move");
        console.groupEnd();
        return prevChess;
      }

      setHistoryIndex(newChess.history().length - 1);
      setStatus(`${userColor === "w" ? "White" : "Black"}'s turn`);
      if (newChess.isGameOver()) {
        handleGameOver(newChess);
      } else if (!playMoveSound(latestMove)) {
        playSound(sound_move_opponent);
      }
      return newChess;
    });
    console.groupEnd();
  }

  function onMoveSuccess(latestMove, newChess) {
    console.group("[ON MOVE SUCCESS]");

    setChess(newChess);
    setHistoryIndex(newChess.history().length - 1);

    console.log("newChess history-", newChess.history());

    if (newChess.isGameOver()) {
      handleGameOver(newChess);
    } else {
      callEngine(newChess);
      setStatus(`${newChess.turn() === "w" ? "White" : "Black"}'s turn`);
      if (!playMoveSound(latestMove)) {
        playSound(sound_move_self);
      }
    }

    setMoveFrom("");
    setMoveTo(null);
    setShowPromotionDialog(false);

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
      return false;
    }
    if (chess.turn() != userColor) {
      console.log("Not your turn", chess.turn(), userColor);
      console.groupEnd();
      return;
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
    const { latestMove, newChess } = makeChessMove(
      {
        from: foundMove.from,
        to: foundMove.to,
      },
      chess
    );

    console.log("Move executed successfully. Updating game state.");
    onMoveSuccess(latestMove, newChess);

    console.groupEnd();
    return true;
  }

  function onPromotionPieceSelect(piece, promoteFromSquare, promoteToSquare) {
    console.group("[ON PROMOTION PIECE SELECT]");
    console.log("Function called with payload:", piece);

    // if no piece passed then user has cancelled dialog, don't make move and reset
    if (piece) {
      const { latestMove, newChess } = makeChessMove(
        {
          from: moveFrom,
          to: moveTo,
          promotion: piece[1].toLowerCase(),
        },
        chess
      );

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

    if (square === moveFrom) {
      console.log("Clicked the same square as moveFrom. Resetting moveFrom.");
      setMoveFrom("");
      console.groupEnd();
      return;
    }

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

    if (chess.turn() != userColor) {
      console.log("Not your turn", chess.turn(), userColor);
      console.groupEnd();
      return;
    }

    console.log("Function called with payload: ", square);
    console.log("Current moveFrom:", moveFrom);
    console.log("Current moveTo:", moveTo);

    // from square
    if (!moveFrom) {
      if (chess.get(square)) {
        console.log("Setting moveFrom to:", square);
        setMoveFrom(square);
      } else {
        console.log("Clicked an empty square. No action taken.");
      }
    }
    // to square
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

      const { latestMove, newChess } = makeChessMove(
        {
          from: moveFrom,
          to: square,
        },
        chess
      );

      onMoveSuccess(latestMove, newChess);
    }

    console.groupEnd();
  }

  function resetState() {
    setChess(createChessInstance);
    setHistoryIndex(-1);
    setStatus("Click on play button to get started");

    setMoveFrom("");
    setMoveTo(null);
    setShowPromotionDialog(false);
  }

  function resignGame() {
    console.group("[RESIGN GAME]");

    if (gamePhase !== GAME_PHASES.ONGOING) {
      console.log("No ongoing game!");
      console.groupEnd();
      return;
    }

    if (!window.confirm("Are you sure you want to resign?")) {
      console.log("Resign request cancelled");
      console.groupEnd();
      return;
    }

    stockfish.current?.postMessage("stop");
    endGame(GAME_END_REASONS.RESIGN, userColor);
    console.groupEnd();
  }

  function startEngine() {
    console.group("[START ENGINE]");

    if (stockfish.current) return;

    stockfish.current = new Worker("./stockfish.js");
    stockfish.current.postMessage("uci");

    stockfish.current.onmessage = (e) => {
      if (e.data.split(" ")[0] === "bestmove") {
        console.log(e.data);
        makeEngineMove(e.data.split(" ")[1]);
      }
    };

    console.groupEnd();
  }

  function undoMove() {

    if (historyIndex !== history.length - 1) {
      console.log("Setting history index to latest value");
      setHistoryIndex(history.length - 1);
      return;
    }

    stockfish.current?.postMessage("stop");

    safeGameMutate((prev) => {
      let movesLength = prev.history().length;
      if (movesLength === 0) {
        return;
      }
      if (gamePhase === GAME_PHASES.ENDED && prev.isGameOver()) {
        setGamePhase(GAME_PHASES.ONGOING);
      }

      if (userColor === COLORS.BLACK) {
        if (movesLength === 1) {
          return;
        }
        if (movesLength % 2 === 1) {
          console.log("prev.undo()", prev.undo());
        }
      } else if (movesLength % 2 === 0) {
        console.log("prev.undo()", prev.undo());
      }

      console.log("prev.undo()", prev.undo());
      setHistoryIndex(prev.history().length - 1);
    }, setChess);

  }

  return (
    <div className="flex flex-col items-center justify-center w-full px-4 sm:px-6 lg:px-8 text-center">
      <StatusBar status={status} />
      <div className="flex flex-col lg:flex-row items-center justify-center gap-6 py-4 w-full max-w-7xl mx-auto">
        {/* Chessboard and players info */}
        <div className="w-full max-w-[600px] lg:w-2/3 flex flex-col items-center">
          <PlayerTile playerName="Computer" />

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
              boardOrientation={
                gamePhase ===
                (GAME_PHASES.ONGOING || gamePhase === GAME_PHASES.ENDED)
                  ? userColor === "b"
                    ? "black"
                    : "white"
                  : colorChoice === "black"
                  ? "black"
                  : "white"
              }
              customDropSquareStyle={{ boxShadow: "inset 0 0 1px 6px yellow" }}
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

          <PlayerTile playerName={user ? user.data.username : "User"} />
        </div>

        {/* Move history, Chess buttons */}
        <div className="w-full max-w-[600px] lg:w-1/3 lg:h-[680px] p-6 rounded-xl mt-8 lg:mt-0 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 shadow-lg border border-gray-600 transition-all duration-300">
          <div className="flex items-center justify-center gap-4 bg-gradient-to-bl from-indigo-700 via-indigo-500 to-indigo-300 px-4 py-3 rounded-2xl mb-6 shadow-md border border-indigo-500 transition-all duration-300">
            <div className="w-7 h-7 filter drop-shadow-md">
              <BOT_SVG />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-wide">
              <span className="bg-clip-text text-white">Play Computer</span>
            </h2>
          </div>

          {gamePhase === GAME_PHASES.NOT_STARTED ? (
            <>
              <p className="text-lg md:text-xl mb-4">Pick a color</p>
              <div className="flex justify-around mb-6">
                {["white", "random", "black"].map((color) => (
                  <button
                    className={`rounded-xl p-2 cursor-pointer transition-all duration-200 ${
                      colorChoice === color
                        ? "border-8 border-green-600"
                        : "border-8 border-transparent"
                    } 
                  bg-white text-gray-800
                    `}
                    key={color}
                    onClick={() => setColorChoice(color)}
                    aria-label={`Pick ${color} color`}
                  >
                    <span className="font-bold text-lg">
                      {color.charAt(0).toUpperCase() + color.slice(1)}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex justify-center">
                <button
                  onClick={beginGame}
                  className="w-5/6 bg-green-600 text-white font-bold text-base md:text-xl px-6 py-3 rounded-xl cursor-pointer hover:bg-green-500 transition duration-200"
                >
                  Play
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Chess buttons */}
              <div className="mb-4">
                <div className="flex justify-evenly">
                  <button
                    onClick={undoMove}
                    className="bg-blue-600 text-white font-bold text-base md:text-lg px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-500 transition duration-200"
                  >
                    Undo move
                  </button>
                  {/* Rematch button */}
                  <button
                    onClick={() => {
                      resetState();
                      setGamePhase(GAME_PHASES.NOT_STARTED);
                    }}
                    className="bg-blue-600 text-white font-bold text-base md:text-lg px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-500 transition duration-200"
                  >
                    New game
                  </button>
                  <button
                    onClick={resignGame}
                    className="bg-blue-600 text-white font-bold text-base md:text-lg px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-500 transition duration-200"
                  >
                    Resign
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Stockfish;