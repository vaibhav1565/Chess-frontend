import { Chess } from "chess.js";

const sound_promote = new Audio("sounds/promote.mp3");
const sound_capture = new Audio("sounds/capture.mp3");
const sound_castle = new Audio("sounds/castle.mp3");

const pgn = `[Event "It (cat.17)"]
[Site "Wijk aan Zee (Netherlands)"]
[Date "1999.??.??"]
[Round "?"]
[White "Garry Kasparov"]
[Black "Veselin Topalov"]
[Result "1-0"]
[TimeControl ""]
[Link "https://www.chess.com/games/view/969971"]

1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6
Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4
15. Rxd4 c5`;

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

export const createChessInstance = () => {
    const chessInstance = new Chess();
    chessInstance.loadPgn(pgn);
    return chessInstance;
};

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