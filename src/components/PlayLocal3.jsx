import { Chess } from 'chess.js';
import { useState } from 'react'
import { Chessboard } from 'react-chessboard';

const PlayLocal = () => {
  const [game, setGame] = useState(new Chess());
  const [moveFrom, setMoveFrom] = useState("");
  const [moveTo, setMoveTo] = useState();
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);

  function generateSquareStyles() {
    const optionSquares = {};
    if (!moveFrom) return optionSquares;

    const moves = game.moves({
      square: moveFrom,
      verbose: true,
    });

    optionSquares[moveFrom] = {
      background: "rgba(255, 255, 0, 0.4)",
    };

    moves.map((move) => {
      optionSquares[move.to] = {
        background:
          game.get(move.to) &&
          game.get(move.to).color !== game.get(moveFrom).color
            ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
        borderRadius: "50%",
      };
      return move;
    });
    return optionSquares;
  }

  function onSquareClick(square) {
    // from square
    if (!moveFrom) {
      if (game.get(square)) setMoveFrom(square);
      return;
    }

    // to square
    if (!moveTo) {
      // check if valid move before showing dialog
      const moves = game.moves({
        square: moveFrom,
        verbose: true,
      });
      const foundMove = moves.find(
        (m) => m.from === moveFrom && m.to === square
      );
      // not a valid move
      if (!foundMove) {
        // check if clicked on new piece
        const hasMoveOptions = game.get(square);
        // if new piece, setMoveFrom, otherwise clear moveFrom
        setMoveFrom(hasMoveOptions ? square : "");
        return;
      }

      // valid move
      setMoveTo(square);

      // if promotion move
      if (
        (foundMove.color === "w" &&
          foundMove.piece === "p" &&
          square[1] === "8") ||
        (foundMove.color === "b" &&
          foundMove.piece === "p" &&
          square[1] === "1")
      ) {
        setShowPromotionDialog(true);
        return;
      }

      // is normal move
      const gameCopy = new Chess();
      gameCopy.loadPgn(game.pgn(), {strict: true})
      const move = gameCopy.move({
        from: moveFrom,
        to: square,
      });
      console.log(move);

      // if invalid, setMoveFrom and getMoveOptions
      if (move === null) {
        if (game.get(square)) setMoveFrom(square);
        return;
      }
      setGame(gameCopy);
      setMoveFrom("");
      setMoveTo(null);
      return;
    }
  }

  function onPromotionPieceSelect(piece) {
    // if no piece passed then user has cancelled dialog, don't make move and reset
    if (piece) {
      const gameCopy = new Chess();
      gameCopy.loadPgn(game.pgn(), {strict: true});
      gameCopy.move({
        from: moveFrom,
        to: moveTo,
        promotion: piece[1].toLowerCase() ?? "q",
      });
      setGame(gameCopy);
    }
    setMoveFrom("");
    setMoveTo(null);
    setShowPromotionDialog(false);
    return true;
  }

  return (
    <div onBlur={() => setMoveFrom("")} tabIndex={0}>
      <Chessboard
        areArrowsAllowed={false}
        animationDuration={200}
        customBoardStyle={{
          borderRadius: "4px",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
        }}
        customSquareStyles={generateSquareStyles()}
        onPromotionPieceSelect={onPromotionPieceSelect} // boolean
        onSquareClick={onSquareClick}
        position={game.fen()}
        promotionToSquare={moveTo} // string or null
        showPromotionDialog={showPromotionDialog} // boolean
      />
    </div>
  );
};

export default PlayLocal