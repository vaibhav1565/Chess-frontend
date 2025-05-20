import { Chess } from "chess.js";
// import { INITIAL_PGN } from "./chessConstants";

const sound_promote = new Audio("sounds/promote.mp3");
const sound_capture = new Audio("sounds/capture.mp3");
const sound_castle = new Audio("sounds/castle.mp3");
const sound_illegal = new Audio("sounds/illegal.mp3");

export const INITIAL_MESSAGES = [
    {
        from: "vaibhav",
        text: "hey",
    },
    {
        from: "parth",
        text: "hi",
    },
    {
        from: "vaibhav",
        text: "hey",
    },
    {
        from: "parth",
        text: "hi",
    },
    {
        from: "vaibhav",
        text: "hey",
    },
    {
        from: "parth",
        text: "hi",
    },
    {
        from: "vaibhav",
        text: "hey",
    },
    {
        from: "parth",
        text: "hi",
    },
    {
        from: "vaibhav",
        text: "hey",
    },
    {
        from: "parth",
        text: "hi",
    },
    {
        from: "vaibhav",
        text: "hey",
    },
    {
        from: "parth",
        text: "hi",
    },
];

export const GAME_PHASES = {
  NOT_STARTED: "not_started",
  WAITING: "waiting",
  ONGOING: "ongoing",
  ENDED: "ended",
};

export const NAVBAR_PHASES = {
  NEW_GAME: "new_game",
  PLAY: "play",
};

export function getTokenFromCookies() {
    const cookies = document.cookie.split("; ");
    const tokenCookie = cookies.find((row) => row.startsWith("token="));
    return tokenCookie ? tokenCookie.split("=")[1] : null;
}

export function formatTime(milliseconds) {
    if (!milliseconds || milliseconds <= 0) return "00:00";

    const minutes = Math.floor(milliseconds / 1000 / 60);
    const seconds = Math.floor((milliseconds / 1000) % 60);

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
        2,
        "0"
    )}`;
}

export function playMoveSound(moveObject) {
    if (moveObject.isKingsideCastle() || moveObject.isQueensideCastle()) {
        playSound(sound_castle);
        return true;
    }
    if (moveObject.isPromotion()) {
        playSound(sound_promote);
        return true;
    }
    if (moveObject.isCapture()) {
        playSound(sound_capture);
        return true;
    }
    return false;
}

export function playSound(sound) {
    sound.currentTime = 0;
    sound.play();
}

export function makeChessMove(moveObject, chessInstance) {
    console.group("[CHESS MOVE]");

    const newChess = new Chess();
    newChess.loadPgn(chessInstance.pgn());

    try {
        const latestMove = newChess.move(moveObject);
        console.log("Move successful:", latestMove.san);
        console.groupEnd();

        return { success: true, latestMove, newChess };
    } catch (error) {
        console.error("Invalid move:", error);
        console.error("FEN", newChess.fen());
        console.groupEnd();
        playSound(sound_illegal);
        return { success: false };
    }
}

export const createChessInstance = () => {
    const chessInstance = new Chess();
    // chessInstance.loadPgn(INITIAL_PGN, {strict: true});
    return chessInstance;
};

export function generateSquareStyles(moveFrom, chess) {
    const squareStyles = {};
    if (!moveFrom) return squareStyles;

    squareStyles[moveFrom] = { background: "rgba(255, 255, 0, 0.4)" };
    for (let chessMove of chess.moves({ square: moveFrom, verbose: true })) {
        squareStyles[chessMove["to"]] = {
            background:
                chess.get(chessMove["to"]) &&
                    chess.get(chessMove["to"]).color !== chess.get(moveFrom).color
                    ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)"
                    : "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
            borderRadius: "50%",
        };
    }
    return squareStyles;
}

export function safeGameMutate(modify, setChess) {
    let isSuccessful = false;
    setChess((game) => {
      try {
        const update = new Chess();
        update.loadPgn(game.pgn());
        modify(update);
        isSuccessful = true;
        return update;
      } catch {
        return game;
      }
    });

    return isSuccessful;
}