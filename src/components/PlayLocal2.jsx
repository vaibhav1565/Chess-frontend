import { Chess } from 'chess.js';
import { useState } from 'react'
import { Chessboard } from "react-chessboard"

const ClickToMove = () => {
  const [game, setGame] = useState(new Chess());
  const [moveFrom, setMoveFrom] = useState("");
  const [moveTo, setMoveTo] = useState(null);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [rightClickedSquares, setRightClickedSquares] = useState({});
  const [moveSquares, setMoveSquares] = useState({});
  const [optionSquares, setOptionSquares] = useState({});

  function safeGameMutate(modify) {
    setGame((g) => {
      const update = new Chess();
      update.loadPgn(g.pgn());
      modify(update);
      return update;
    });
  }

  function getMoveOptions(square) {
    const moves = game.moves({ square, verbose: true });
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares = {};
    moves.map((move) => {
      newSquares[move.to] = {
        background:
          game.get(move.to) &&
          game.get(move.to).color !== game.get(square).color
            ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
        borderRadius: "50%",
      };
      return move;
    });
    newSquares[square] = {
      background: "rgba(255, 255, 0, 0.4)",
    };
    setOptionSquares(newSquares);
    return true;
  }

  function makeRandomMove() {
    safeGameMutate((prevGame) => {
      if (prevGame.isGameOver()) return; // no change if game is over
      const possibleMoves = prevGame.moves();
      const randomIndex = Math.floor(Math.random() * possibleMoves.length);
      prevGame.move(possibleMoves[randomIndex]);
    });
  }

  function onSquareClick(square) {
    setRightClickedSquares({});

    // from square
    if (!moveFrom) {
      const hasMoveOptions = getMoveOptions(square);
      if (hasMoveOptions) setMoveFrom(square);
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
        const hasMoveOptions = getMoveOptions(square);
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
      gameCopy.loadPgn(game.pgn());
      const move = gameCopy.move({
        from: moveFrom,
        to: square,
        promotion: "q",
      });

      // if invalid, setMoveFrom and getMoveOptions
      if (move === null) {
        const hasMoveOptions = getMoveOptions(square);
        if (hasMoveOptions) setMoveFrom(square);
        return;
      }

      setGame(gameCopy);

      setTimeout(makeRandomMove, 300);
      setMoveFrom("");
      setMoveTo(null);
      setOptionSquares({});
      return;
    }
  }

  function onPromotionPieceSelect(piece) {
    // if no piece passed then user has cancelled dialog, don't make move and reset
    if (piece) {
      const gameCopy = new Chess();
      gameCopy.loadPgn(game.pgn());
      gameCopy.move({
        from: moveFrom,
        to: moveTo,
        promotion: piece[1].toLowerCase() ?? "q",
      });
      setGame(gameCopy);
      setTimeout(makeRandomMove, 300);
    }

    setMoveFrom("");
    setMoveTo(null);
    setShowPromotionDialog(false);
    setOptionSquares({});
    return true;
  }

  function onSquareRightClick(square) {
    const colour = "rgba(0, 0, 255, 0.4)";
    setRightClickedSquares({
      ...rightClickedSquares,
      [square]:
        rightClickedSquares[square] &&
        rightClickedSquares[square].backgroundColor === colour
          ? undefined
          : { backgroundColor: colour },
    });
  }

  return (
    <div>
      <Chessboard
        id="ClickToMove"
        animationDuration={200}
        // arePiecesDraggable={false}
        position={game.fen()}
        onSquareClick={onSquareClick}
        onSquareRightClick={onSquareRightClick}
        onPromotionPieceSelect={onPromotionPieceSelect}
        customBoardStyle={{
          borderRadius: "4px",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
        }}
        customSquareStyles={{
          ...moveSquares,
          ...optionSquares,
          ...rightClickedSquares,
        }}
        promotionToSquare={moveTo}
        showPromotionDialog={showPromotionDialog}
      />
      <button
        onClick={() => {
          safeGameMutate((game) => {
            game.reset();
          });
          setMoveSquares({});
          setOptionSquares({});
          setRightClickedSquares({});
        }}
      >
        reset
      </button>
      <button
        
        onClick={() => {
          if (game.turn() === "w") {
            safeGameMutate((game) => {
              game.undo();
            });
            safeGameMutate((game) => {
              game.undo();
            });
          } else {
            safeGameMutate((game) => {
              game.undo();
            });
          }
          setMoveSquares({});
          setOptionSquares({});
          setRightClickedSquares({});
        }}
      >
        undo
      </button>
    </div>
  );
};

export default ClickToMove
// const PlayLocal2 = () => {
//   const [chess, setChess] = useState(new Chess());
//   const [moveFrom, setMoveFrom] = useState("");
//   const [moveTo, setMoveTo] = useState("");

//   function handlePieceClick(piece, square) {
//     console.log(piece, square);
//     console.log(chess.moves({square}));
//     setMoveFrom(square);
//   }

//   function handleSquareClick(square, piece) {
//     // console.log(piece, square);
//   }

//   return (
//     <div>
//       <Chessboard boardWidth={600} onPieceClick={handlePieceClick} onSquareClick={handleSquareClick}/>
//     </div>
//   )
// }

// export default PlayLocal2