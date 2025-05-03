import { GAME_PHASES } from "../utils/playConstants";

const GameNavbar = ({ gamePhase, navbar, setNavbar }) => {
  return (
    <div className="h-[80px] bg-gray-800 text-white flex justify-evenly items-center shadow-md">
      { (
          <button
            onClick={() => setNavbar("play")}
            disabled={(gamePhase === GAME_PHASES.NOT_STARTED ||
        gamePhase === GAME_PHASES.WAITING)}
            className={`px-4 py-2 text-sm font-medium uppercase tracking-wide transition-colors ${
              navbar === "play"
                ? "border-2 border-green-400 text-green-400"
                : "border-2 border-transparent hover:text-green-300 hover:border-green-300"
            }
            ${(gamePhase === GAME_PHASES.NOT_STARTED ||
        gamePhase === GAME_PHASES.WAITING) ? "cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            Play
          </button>
        )}
      <button
        onClick={() => setNavbar("new_game")}
        className={`cursor-pointer px-4 py-2 text-sm font-medium uppercase tracking-wide transition-colors ${
          navbar === "new_game"
            ? "border-2 border-green-400 text-green-400"
            : "border-2 border-transparent hover:text-green-300 hover:border-green-300"
        }`}
      >
        New Game
      </button>
    </div>
  );
};

export default GameNavbar;
