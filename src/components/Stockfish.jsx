import { Chess, DEFAULT_POSITION } from "chess.js";
import { useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { useSelector } from "react-redux";
import { COLORS, GAME_END_REASONS } from "../utils/chessConstants";
import MoveHistory from "./MoveHistory";
import ChessHistoryButtons from "./ChessHistoryButtons";
import StatusBar from "./StatusBar";
import { makeChessMove, playMoveSound, playSound } from "../utils/chessHelper";
import { BOT_IMAGE } from "../utils/otherConstants";
import PlayerTile from "./PlayerTile";

const sound_game_start = new Audio("sounds/game-start.mp3");
const sound_game_end = new Audio("sounds/game-end.mp3");
const sound_move_self = new Audio("sounds/move-self.mp3");
const sound_move_opponent = new Audio("sounds/move-opponent.mp3");

const DEPTH = 16; // number of halfmoves the engine looks ahead

const GAME_PHASES = {
  NOT_STARTED: "not_started",
  ONGOING: "ongoing",
  ENDED: "ended",
};

const Stockfish = () => {
  const user = useSelector((store) => store.user);

  const [chess, setChess] = useState(new Chess());

  const history = chess.history();
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [userColor, setUserColor] = useState(null);

  /* white | random | black */
  const [colorChoice, setColorChoice] = useState("white");

  const [gamePhase, setGamePhase] = useState(GAME_PHASES.NOT_STARTED);

  const [status, setStatus] = useState("Click on play button to get started");

  const stockfish = useRef(null);

  function beginGame() {
    console.group("[START GAME]");

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

    if (colorToSet === "b") {
      startEngine();
      callEngine(chess.fen());
    }

    playSound(sound_game_start);
    console.groupEnd();
  }

  function callEngine(fen) {
    console.group("[ENGINE CALL]");
    console.log("FEN-", fen);
    stockfish.current.postMessage(`position fen ${fen}`);
    stockfish.current.postMessage(`go depth ${DEPTH}`);
    console.groupEnd();
  }

  function endGame(reason, loser) {
    console.group("[ENDGAME]");

    setStatus(`Game over by ${reason}\n${loser ? `Loser: ${loser}` : ""}`);
    setGamePhase(GAME_PHASES.ENDED);
    console.log(`Game ended: ${reason}, ${loser}`);

    console.groupEnd();

    playSound(sound_game_end);
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

  function handleGameOver(chessInstance) {
    console.group("[GAME OVER]");
    const gameOverDetails = getGameOverDetails(chessInstance);

    const { reason, loser } = gameOverDetails;
    endGame(reason, loser);

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
      return false;
    }
    if (chess.turn() != userColor) {
      console.log("Not your turn", chess.turn(), userColor);
      console.groupEnd();
      return;
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
    setHistoryIndex((prev) => prev + 1);
    setStatus(`${userColor === "w" ? "Black" : "White"}'s turn`);

    if (newChess.isGameOver()) {
      handleGameOver(newChess);
      console.groupEnd();
      return true;
    }

    if (!stockfish.current) {
      startEngine();
    }
    callEngine(newChess.fen());

    if (!playMoveSound(latestMove)) {
      playSound(sound_move_self);
    }

    console.groupEnd();
    return true;
  }

  function makeEngineMove(move) {
    console.group("[ENGINE MOVE]");
    console.log("Move object", move);

    setHistoryIndex(history.length - 1);
    setChess((prevChess) => {
      try {
        const newChess = new Chess();
        newChess.loadPgn(prevChess.pgn());
        const latestMove = newChess.move(move);
        setHistoryIndex(newChess.history().length - 1);
        console.log("Move successful:", latestMove.san);
        setStatus(`${userColor === "w" ? "White" : "Black"}'s turn`);
        if (!playMoveSound(latestMove)) {
          playSound(sound_move_opponent);
        }
        if (newChess.isGameOver()) {
          handleGameOver(newChess);
        }
        return newChess;
      } catch {
        console.log("Invalid move");
        return prevChess;
      } finally {
        console.groupEnd();
      }
    });
  }

  function newGame() {
    resetState();
    setGamePhase(GAME_PHASES.NOT_STARTED);
  }

  function resetState() {
    stopEngineCalculation();
    setChess(new Chess());
    setHistoryIndex(-1);
    setStatus("Click on play button to get started");
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

    stopEngineCalculation();
    endGame(GAME_END_REASONS.RESIGN, userColor);
    console.groupEnd();
  }

  function startEngine() {
    console.group("[START ENGINE]");

    stockfish.current = new Worker("./stockfish.js");
    stockfish.current.postMessage("uci");

    try {
      stockfish.current = new Worker("./stockfish.js");
      stockfish.current.postMessage("uci");

      stockfish.current.onmessage = (e) => {
        if (e.data.split(" ")[0] === "bestmove") {
          console.log(e.data);
          makeEngineMove(e.data.split(" ")[1]);
        }
      };
    } catch (error) {
      console.error("Failed to start Stockfish engine:", error);
      setStatus("Error: Unable to start engine");
    }

    console.groupEnd();
  }

  function stopEngineCalculation() {
    if (stockfish.current) {
      stockfish.current.postMessage("stop");
    }
  }

  function undoMove() {
    console.group("[UNDOMOVE]");
    // if (gamePhase !== GAME_PHASES.ONGOING) {
    //   console.log("No ongoing game!");
    //   console.groupEnd();
    //   return;
    // }
    if (!history.length) {
      console.log("No moves played yet!");
      console.groupEnd();
      return;
    }

    stopEngineCalculation();

    setChess((prev) => {
      let movesLength = prev.history().length;
      if (movesLength === 0) {
        return prev;
      }

      if (gamePhase === GAME_PHASES.ENDED && prev.isGameOver()) {
        setGamePhase(GAME_PHASES.ONGOING);
      }

      if (userColor === COLORS.BLACK) {
        if (movesLength === 1) {
          return prev;
        }
        if (movesLength % 2 === 1) {
          prev.undo();
          setHistoryIndex((prev) => prev - 1);
        }
      } else {
        if (movesLength % 2 === 0) {
          prev.undo();
          setHistoryIndex((prev) => prev - 1);
        }
      }
      prev.undo();
      setHistoryIndex(prev.history().length - 1);
      setStatus(`${prev.turn() === "w" ? "White" : "Black"}'s turn`);

      console.log("New fen:", prev.fen());
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
          <PlayerTile playerName="Computer" isBot={true} />

          <div className="w-full">
            <Chessboard
              animationDuration={
                historyIndex === chess.history().length - 1 ? 300 : 0
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
              onPieceDrop={handlePieceDrop}
              position={
                historyIndex === -1
                  ? DEFAULT_POSITION
                  : chess.history({ verbose: true })[historyIndex]["after"]
              }
            />
          </div>

          <PlayerTile playerName={user ? user.data.username : "User"} />
        </div>

        {/* Move history, Chess buttons */}
        <div className="w-full max-w-[600px] lg:w-1/3 lg:h-[680px] p-6 rounded-xl mt-8 lg:mt-0 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 shadow-lg border border-gray-600 transition-all duration-300">
          <div className="flex items-center justify-center gap-4 bg-gradient-to-bl from-indigo-700 via-indigo-500 to-indigo-300 px-4 py-3 rounded-2xl mb-6 shadow-md border border-indigo-500 transition-all duration-300">
            <img
              className="w-7 h-7 filter drop-shadow-md"
              src={BOT_IMAGE}
              alt="Bot icon"
            />
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
                    className={`rounded-xl p-1 cursor-pointer transition-all duration-200 ${
                      colorChoice === color
                        ? "border-4 border-green-600"
                        : "border-4 border-transparent"
                    }`}
                    key={color}
                    onClick={() => setColorChoice(color)}
                    aria-label={`Pick ${color} color`}
                  >
                    <img
                      src={`https://www.chess.com/bundles/web/images/play-side/${color}.svg`}
                      alt={`${color} piece`}
                      className="w-10 md:w-14"
                    />
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
                    onClick={newGame}
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

/*
Study about-
uci
stockfish.js commands

Workers (in detail)
*/



/* status, turn (perhaps, in playlocal as well) */