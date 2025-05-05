import { GAME_PHASES } from "../utils/playConstants";

const GameNavbar = ({ gamePhase, setNavbar }) => {
  return (
    <div className="w-full flex justify-center items-center gap-4 p-4 bg-gray-100 shadow-md">
      <button
        onClick={() => setNavbar("play")}
        disabled={
          gamePhase === GAME_PHASES.NOT_STARTED ||
          gamePhase === GAME_PHASES.WAITING
        }
        className="px-4 py-2 text-lg font-bold text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        Play
      </button>
      <button
        onClick={() => setNavbar("new_game")}
        className="px-4 py-2 text-lg font-bold text-white bg-green-500 rounded hover:bg-green-600"
        disabled={
          gamePhase === GAME_PHASES.ONGOING || gamePhase === GAME_PHASES.WAITING
        }
      >
        New Game
      </button>
    </div>
  );
};

export default GameNavbar;
