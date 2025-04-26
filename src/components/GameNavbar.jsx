import { GAME_PHASES } from "../utils/playConstants";

const GameNavbar = ({ gamePhase, navbar, setNavbar }) => {
  return (
    <div className="h-[80px] bg-gray-800 text-white flex justify-evenly items-center shadow-md">
      {gamePhase !== GAME_PHASES.NOT_STARTED &&
        gamePhase !== GAME_PHASES.WAITING && (
          <button
            onClick={() => setNavbar("play")}
            className={`cursor-pointer px-4 py-2 text-sm font-medium uppercase tracking-wide transition-colors ${
              navbar === "play"
                ? "border-b-2 border-green-400 text-green-400"
                : "border-b-2 border-transparent hover:text-green-300 hover:border-green-300"
            }`}
          >
            Play
          </button>
        )}
      <button
        onClick={() => setNavbar("new_game")}
        className={`cursor-pointer px-4 py-2 text-sm font-medium uppercase tracking-wide transition-colors ${
          navbar === "new_game"
            ? "border-b-2 border-green-400 text-green-400"
            : "border-b-2 border-transparent hover:text-green-300 hover:border-green-300"
        }`}
      >
        New Game
      </button>
      <button className="px-4 py-2 text-sm font-medium uppercase text-gray-500 cursor-not-allowed">
        Games
      </button>
      <button className="px-4 py-2 text-sm font-medium uppercase text-gray-500 cursor-not-allowed">
        Players
      </button>
    </div>
  );
};

export default GameNavbar;
