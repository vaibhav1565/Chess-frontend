import { Chess } from "chess.js";
import { useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { useSelector } from "react-redux";
import { GAME_PHASES } from "../utils/playConstants";
import MoveHistory from "./MoveHistory";
import ChessHistoryButtons from "./ChessHistoryButtons";
import { playMoveSound, playSound } from "../utils/chessHelper";

const sound_game_start = new Audio("sounds/game-start.mp3");
const sound_game_end = new Audio("sounds/game-end.mp3");

const sound_move_self = new Audio("sounds/move-self.mp3");
const sound_move_opponent = new Audio("sounds/move-opponent.mp3");
const sound_illegal = new Audio("sounds/illegal.mp3");

const DEPTH = 8; // number of halfmoves the engine looks ahead

const Stockfish = () => {
  const user = useSelector((store) => store.user);

  const [chess, setChess] = useState(new Chess());

  const history = chess.history();
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [userColor, setUserColor] = useState(null);

  /* white | random | black */
  const [colorChoice, setColorChoice] = useState("white");

  const [gamePhase, setGamePhase] = useState(GAME_PHASES.NOT_STARTED);

  const [gameOverText, setGameOverText] = useState(null);

  const stockfish = useRef(null);

  function callEngine(fen) {
    console.group("[ENGINE CALL]");
    console.log("FEN-", fen);
    stockfish.current.postMessage(`position fen ${fen}`);
    stockfish.current.postMessage(`go depth ${DEPTH}`);
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

  function handleGameOver(chessInstance) {
    console.group("[GAME OVER]");
    const gameOverDetails = getGameOverDetails(chessInstance);

    const { reason, loser } = gameOverDetails;
    setGameOverText(
      `Game over by ${reason}\n${loser ? `Loser: ${loser}` : ""}`
    );
    setGamePhase(GAME_PHASES.ENDED);
    console.log(`Game ended: ${reason}`);
    console.groupEnd();

    playSound(sound_game_end);
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
    // if (chess.turn() != userColor) {
    //   console.log("Not your turn", chess.turn(), userColor);
    //   console.groupEnd();
    //   return;
    // }
    
    const moveObject = {
      from: sourceSquare,
      to: targetSquare,
      promotion: piece[1].toLowerCase(), // promotion in case of actual promotion, else, no error,
    };

    const {latestMove, newChess} = makeChessMove(moveObject);
    if (newChess === false) {
      console.groupEnd();
      return false;
    }
    setChess(newChess);
    setHistoryIndex((prev) => prev + 1);

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

  function makeChessMove(moveObject) {
    console.group("[CHESS MOVE]");

    const newChess = new Chess();
    newChess.loadPgn(chess.pgn());

    try {
      const latestMove = newChess.move(moveObject);
      console.log("Move successful:", latestMove.san);
      console.groupEnd();

      return {latestMove, newChess};
    } catch (error) {
      console.error("Invalid move:", error);
      console.error("FEN", newChess.fen());
      console.groupEnd();
      playSound(sound_illegal);
      return false;
    }
  }

  function makeEngineMove(move) {
    console.group("[ENGINE MOVE]");

    const moveObject = {
      from: move.slice(0, 2),
      to: move.slice(2),
    };
    console.log("Move object", moveObject);

    setChess((prevChess) => {
      const newChess = new Chess();
      newChess.loadPgn(prevChess.pgn());

      const latestMove = newChess.move(moveObject);
      setHistoryIndex((prev) => prev + 1);
      console.log("Move successful:", latestMove.san);
      if (! playMoveSound(latestMove)) {
        playSound(sound_move_opponent);
      }
      if (newChess.isGameOver()) {
        handleGameOver(newChess);
      }
      console.groupEnd();
      return newChess;
    });
  }

  function resetState() {
    setChess(new Chess());
    setHistoryIndex(-1);
    setGameOverText(null);
  }

  function startEngine() {
    console.group("[START ENGINE]");

    stockfish.current = new Worker("./stockfish.js");
    stockfish.current.postMessage("uci");
    // stockfish.current.postMessage("setoption name UCI_LimitStrength value true");
    // stockfish.current.postMessage("setoption name UCI_Elo value 1320");

    stockfish.current.onmessage = (e) => {
      console.log(e.data);
      if (e.data.split(" ")[0] === "bestmove") {
        makeEngineMove(e.data.split(" ")[1]);
      }
    };

    console.groupEnd();
  }

  function beginGame() {
    console.group("[START GAME]");
    resetState();

    setGamePhase(GAME_PHASES.ONGOING);
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

  return (
    <div className="flex">
      {/* Chessboard and players info */}
      <div>
        <div>
          <p>Bot</p>
        </div>
        <div className="relative">
          <Chessboard
            areArrowsAllowed={false}
            boardOrientation={
              gamePhase === GAME_PHASES.ONGOING
                ? userColor === "b"
                  ? "black"
                  : "white"
                : colorChoice === "black"
                ? "black"
                : "white"
            }
            boardWidth={600}
            onPieceDrop={handlePieceDrop}
            position={
              historyIndex === -1
                ? chess.fen()
                : chess.history({ verbose: true })[historyIndex]["after"]
            }
          />
          {gameOverText && (
            <div className="absolute top-1/2 left-1/2 -translate-1/2 h-72 w-80 rounded-lg bg-[rgb(42,42,38)] text-white">
              {/* Cross button */}
              <button
                className="absolute top-0 right-0 text-white text-4xl font-bold cursor-pointer hover:text-gray-400"
                onClick={() => setGameOverText(null)}
              >
                &times;
              </button>
              <p className="text-center mb-2 whitespace-pre-line">
                {gameOverText}
              </p>
              <div className="flex justify-center items-center mb-2">
                <div>
                  <img
                    src="https://images.chesscomfiles.com/uploads/v1/bot_personality/9ed5fe4e-8a5e-11ea-a40e-67edad6464bf.40fc8cbc.384x384o.cb8d4e3ae1b5@2x.png"
                    className="w-14"
                  />
                  {/* <span>Maximum</span> */}
                </div>
                <p className="mx-4">vs</p>
                <div>
                  <img
                    src="https://www.chess.com/bundles/web/images/user-image.svg"
                    className="w-14"
                  />
                  {/* <span>Guest</span> */}
                </div>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={beginGame}
                  className="mt-2 w-full mx-4 bg-green-600 text-white font-extrabold text-xl px-8 py-4 rounded-xl cursor-pointer hover:bg-green-400"
                >
                  Rematch
                </button>
              </div>
              <div className="flex justify-around mt-2 gap-4">
                <button className="cursor-not-allowed bg-blue-600 flex-1 text-white font-bold px-6 py-2 rounded-lg hover:bg-blue-400 transition duration-200">
                  New Bot
                </button>
                <button className="cursor-not-allowed bg-blue-600 flex-1 text-white font-bold px-6 py-2 rounded-lg hover:bg-blue-400 transition duration-200">
                  Game Review
                </button>
              </div>
            </div>
          )}
        </div>
        <div>
          <p>{user ? user.data.username : "Guest"}</p>
        </div>
      </div>

      {/* Move history, Chess buttons */}
      <div className="h-[648px] w-92 border-2 border-white">
        {gamePhase !== GAME_PHASES.ONGOING ? (
          <div>
            <p className="text-center text-xl">Pick a color</p>
            <div className="flex justify-around">
              {new Array("white", "random", "black").map((color) => {
                return (
                  <button
                    className={`rounded-xl cursor-pointer ${
                      colorChoice === color ? "border-4 border-green-600" : ""
                    }`}
                    key={color}
                    onClick={() => setColorChoice(color)}
                  >
                    <img
                      src={`https://www.chess.com/bundles/web/images/play-side/${color}.svg`}
                      alt={`Pick ${color} color`}
                    />
                  </button>
                );
              })}
            </div>
            <div className="flex justify-center">
              <button
                onClick={beginGame}
                className="mt-2 w-5/6 bg-green-600 text-white font-extrabold text-xl px-8 py-4 rounded-xl cursor-pointer hover:bg-green-400"
              >
                Play
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-center">Play Bots</p>

            {/* Chess buttons */}
            <ChessHistoryButtons
              setHistoryIndex={setHistoryIndex}
              historyLength={history.length}
            />

            {/* Move history */}
            <MoveHistory
              history={chess.history()}
              historyIndex={historyIndex}
              setHistoryIndex={setHistoryIndex}
            />
          </>
        )}
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
