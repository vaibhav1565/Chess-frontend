import { Chess } from "chess.js";
import { INITIAL_PGN } from "./chessConstants";

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