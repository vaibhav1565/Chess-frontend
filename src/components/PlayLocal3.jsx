import { Chess } from "chess.js";
import { useState } from "react";
import { Chessboard } from "react-chessboard";

const PlayLocal3 = () => {
  // const [game, setGame] = useState(new Chess());
  const [game, setGame] = useState(
    new Chess("rnbqkbn1/ppppp2P/5p2/8/8/8/PPPPPP1P/RNBQKBNR w KQq - 0 5")
  );
  const [moveFrom, setMoveFrom] = useState("");
  const [moveTo, setMoveTo] = useState(null);
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
            ? "radial-gradient(circle, rgba(0,0,0,.3) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(0,0,0,.3) 25%, transparent 25%)",
        borderRadius: "50%",
      };
      return move;
    });
    return optionSquares;
  }

  function isPromotionMove(foundMove) {
    return (
      foundMove.piece === "p" &&
      ((foundMove.color === "w" && foundMove.to[1] === "8") ||
        (foundMove.color === "b" && foundMove.to[1] === "1"))
    );
  }

  function onPieceDrop(sourceSquare, targetSquare, piece) {
    console.group("[ON PIECE DROP]");
    console.log("Source square:", sourceSquare);
    console.log("Target square:", targetSquare);
    console.log("Piece being moved:", piece);

    if (!sourceSquare) {
      console.log("No source square");
      return false;
    }

    const moves = game.moves({
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
        foundMove = moves.find(
          (m) =>
            (m.san === "O-O" && m.to[0] === "g") ||
            (m.san === "O-O-O" && m.to[0] === "c")
        );
      }
      if (!foundMove) {
        console.log("No valid move found, including castling. Move rejected.");
        console.groupEnd();
        return false;
      }
    }

    console.log("Found move:", foundMove);

    console.log("Setting moveFrom and moveTo.");
    setMoveFrom(foundMove.from);
    setMoveTo(foundMove.to);

    if (isPromotionMove(foundMove)) {
      console.log("Promotion move detected. Showing promotion dialog.");
      setShowPromotionDialog(true);
      console.groupEnd();
      return false;
    }

    console.log("Executing the move.");
    const gameCopy = new Chess();
    gameCopy.loadPgn(game.pgn(), { strict: true });
    const move = gameCopy.move(
      {
        from: foundMove.from,
        to: foundMove.to,
      },
      { strict: true }
    );

    if (move === null) {
      console.log("Move execution failed. Move is invalid.");
      console.groupEnd();
      return false;
    }

    console.log("Move executed successfully. Updating game state.");
    setGame(gameCopy);
    setMoveFrom("");
    setMoveTo(null);
    setShowPromotionDialog(false);

    console.groupEnd();
    return true;
  }

  function onPromotionCheck(sourceSquare, targetSquare, piece) {
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

  function onSquareClick(square, piece) {
    console.group("[ON SQUARE CLICK]");
    console.log("Clicked square:", square);
    console.log("Clicked piece:", piece);
    console.log("Current moveFrom:", moveFrom);
    console.log("Current moveTo:", moveTo);

    if (square === moveFrom) {
      console.log("Clicked the same square as moveFrom. Resetting moveFrom.");
      setMoveFrom("");
      console.groupEnd();
      return;
    }

    // from square
    if (!moveFrom) {
      if (game.get(square)) {
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
      const moves = game.moves({
        square: moveFrom,
        verbose: true,
      });
      console.log("Available moves from moveFrom:", moves);

      const foundMove = moves.find((m) => m.to === square);
      if (!foundMove) {
        console.log("Invalid move. Checking if clicked on a new piece.");
        setMoveFrom(game.get(square) ? square : "");
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
      const gameCopy = new Chess();
      gameCopy.loadPgn(game.pgn(), { strict: true });
      const move = gameCopy.move(
        {
          from: moveFrom,
          to: square,
        },
        { strict: true }
      );

      if (move === null) {
        console.log("Move is invalid. Resetting moveFrom.");
        if (game.get(square)) setMoveFrom(square);
        console.groupEnd();
        return;
      }

      console.log("Move executed successfully. Updating game state.");
      setGame(gameCopy);
      setMoveFrom("");
      setMoveTo(null);
    }

    console.groupEnd();
  }

  function onPromotionPieceSelect(piece, promoteFromSquare, promoteToSquare) {
    console.group("[ON PROMOTION PIECE SELECT]");
    console.log("Selected promotion piece:", piece);

    // if no piece passed then user has cancelled dialog, don't make move and reset
    if (piece) {
      console.log("Promotion piece selected. Executing promotion move.");
      const gameCopy = new Chess();
      gameCopy.loadPgn(game.pgn(), { strict: true });
      const move = gameCopy.move(
        {
          from: moveFrom,
          to: moveTo,
          promotion: piece[1].toLowerCase(),
        },
        { strict: true }
      );

      if (move === null) {
        console.log("Promotion move execution failed. Move is invalid.");
        console.groupEnd();
        return false;
      }

      console.log("Promotion move executed successfully. Updating game state.");
      setGame(gameCopy);
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

  return (
    <div
      className="w-[600px]"
      onBlur={() => {
        setMoveFrom("");
        setMoveTo(null);
        setShowPromotionDialog(false);
      }}
      tabIndex={0}
    >
      <Chessboard
        areArrowsAllowed={false}
        animationDuration={200}
        customNotationStyle={{
          fontSize: "15px",
        }}
        customSquareStyles={generateSquareStyles()}
        onPieceDrop={onPieceDrop}
        onPromotionCheck={onPromotionCheck}
        onPromotionPieceSelect={onPromotionPieceSelect}
        onSquareClick={onSquareClick}
        position={game.fen()}
        promotionDialogVariant={"vertical"}
        promotionToSquare={moveTo}
        showPromotionDialog={showPromotionDialog}
      />
    </div>
  );
};

export default PlayLocal3;
