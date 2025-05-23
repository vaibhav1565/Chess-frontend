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

export const createChessInstance = () => {
    const chessInstance = new Chess();
    // chessInstance.loadPgn(INITIAL_PGN, {strict: true});
    return chessInstance;
};

export function formatTime(milliseconds) {
    if (!milliseconds || milliseconds <= 0) return "00:00";

    const minutes = Math.floor(milliseconds / 1000 / 60);
    const seconds = Math.floor((milliseconds / 1000) % 60);

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
        2,
        "0"
    )}`;
}

export function generateSquareStyles(moveFrom, game) {
    const optionSquares = {};
    if (!moveFrom) return optionSquares;

    game.board().flat(1).forEach((s) => {
        if (s) {
            optionSquares[s.square] = { cursor: "pointer" }
        }
    })

    const moves = game.moves({
        square: moveFrom,
        verbose: true,
    });

    optionSquares[moveFrom]["background"] = "rgba(255, 255, 0, 0.4)"

    moves.map((move) => {
        optionSquares[move.to] = {
            background:
                game.get(move.to) &&
                    game.get(move.to).color !== game.get(moveFrom).color
                    ? "radial-gradient(circle, rgba(0,0,0,.3) 85%, transparent 85%)"
                    : "radial-gradient(circle, rgba(0,0,0,.3) 25%, transparent 25%)",
            borderRadius: "50%",
        };
        return move;
    });
    return optionSquares;
}

export function getTokenFromCookies() {
    const cookies = document.cookie.split("; ");
    const tokenCookie = cookies.find((row) => row.startsWith("token="));
    return tokenCookie ? tokenCookie.split("=")[1] : null;
}

export function isPromotionMove(foundMove) {
    return (
        foundMove.piece === "p" &&
        ((foundMove.color === "w" && foundMove.to[1] === "8") ||
            (foundMove.color === "b" && foundMove.to[1] === "1"))
    );
}

export function makeChessMove(moveObject, chessInstance) {
    console.group("[CHESS MOVE]");

    const newChess = new Chess();
    newChess.loadPgn(chessInstance.pgn());

    const latestMove = newChess.move(moveObject, {strict: true});
    if (!latestMove) {
        console.error("Invalid move");
        console.error("FEN", newChess.fen());
        playSound(sound_illegal);
    }
    else {
        console.log("Move successful:", latestMove.san);
    }
    console.groupEnd();
    return {latestMove, newChess};
}

export function onPromotionCheck(sourceSquare, targetSquare, piece, showPromotionDialog) {
    if (
        !(
            ((piece === "wP" &&
                sourceSquare[1] === "7" &&
                targetSquare[1] === "8") ||
                (piece === "bP" &&
                    sourceSquare[1] === "2" &&
                    targetSquare[1] === "1")) &&
            Math.abs(sourceSquare.charCodeAt(0) - targetSquare.charCodeAt(0)) <= 1
        )
    ) {
        return false;
    }
    if (showPromotionDialog) {
        return true;
    }
    return false;
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

// export function safeGameMutate(modify, setChess) {
//     let isSuccessful = false;
//     setChess((game) => {
//       try {
//         const update = new Chess();
//         update.loadPgn(game.pgn());
//         modify(update);
//         isSuccessful = true;
//         return update;
//       } catch {
//         return game;
//       }
//     });

//     return isSuccessful;
// }