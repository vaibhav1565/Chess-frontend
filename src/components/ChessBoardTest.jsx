import { Chess } from "chess.js";
import { useState } from "react";
import { Chessboard } from "react-chessboard";
import { generateSquareStyles, isPromotionMove, onPromotionCheck } from "../utils/chessHelper";

const PlayLocalTest = () => {
  // const [game, setGame] = useState(new Chess());
  const [game, setGame] = useState(
    new Chess("rnbqkbn1/ppppp2P/5p2/8/8/8/PPPPPP1P/RNBQKBNR w KQq - 0 5")
  );
  const [moveFrom, setMoveFrom] = useState("");
  const [moveTo, setMoveTo] = useState(null);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);

  function checkForPromotion(sourceSquare, targetSquare, piece) {
    return onPromotionCheck(
      sourceSquare,
      targetSquare,
      piece,
      showPromotionDialog
    );
  }

  function onPieceDrop(sourceSquare, targetSquare, piece) {
    console.group("[ON PIECE DROP]");
    console.log("Function payload: ", sourceSquare, targetSquare, piece);

    if (!sourceSquare) { // this edge case is for promotion. onPieceDrop is called when promotion piece is selected with value of sourceSquare as null
      console.log("No source square");
      console.groupEnd();
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
        if (targetSquare[0] === "h") {
          foundMove = moves.find(
            (m) => m.san === "O-O"
          );
        }
        else {
          foundMove = moves.find(
            (m) => m.san === "O-O-O"
          );
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
    const gameCopy = new Chess();
    gameCopy.loadPgn(game.pgn(), { strict: true });
    const move = gameCopy.move(
      {
        from: foundMove.from,
        to: foundMove.to,
      },
      { strict: true }
    );

    // if (move === null) {
    //   console.log("Move execution failed. Move is invalid.");
    //   console.groupEnd();
    //   return false;
    // }

    console.log("Move executed successfully. Updating game state.");
    setGame(gameCopy);
    setMoveFrom("");
    setMoveTo(null);
    setShowPromotionDialog(false);

    console.groupEnd();
    return true;
  }

  function onPromotionPieceSelect(piece, promoteFromSquare, promoteToSquare) {
    console.group("[ON PROMOTION PIECE SELECT]");
    console.log("Function called with payload:", piece);

    // if no piece passed then user has cancelled dialog, don't make move and reset
    if (piece) {
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

      // if (move === null) {
      //   console.log("Promotion move execution failed. Move is invalid.");
      //   console.groupEnd();
      //   return false;
      // }

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

  function onSquareClick(square, piece) {
    console.group("[ON SQUARE CLICK]");
    console.log("Function called with payload: ", square);
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
        customSquareStyles={generateSquareStyles(moveFrom, game)}
        onPieceDrop={onPieceDrop}
        onPromotionCheck={checkForPromotion}
        onPromotionPieceSelect={onPromotionPieceSelect}
        onSquareClick={onSquareClick}
        position={game.fen()}
        promotionDialogVariant={"modal"}
        promotionToSquare={moveTo}
        showPromotionDialog={showPromotionDialog}
      />
    </div>
  );
};

export default PlayLocalTest;
