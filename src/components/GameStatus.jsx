import { COLORS } from "../utils/playConstants";

const GameStatus = ({ gameState, turn, status }) => {
  return (
    <div className="w-[560px]">
      {/* {connectionError && (
          <div className="text-red-500 p-2">{connectionError}</div>
        )} */}
      <p>{status}</p>
      <p>
        {gameState.playerColor
          ? `${turn === COLORS.WHITE ? "White" : "Black"}'s turn`
          : "\u00A0"}
      </p>
    </div>
  );
};

export default GameStatus;
