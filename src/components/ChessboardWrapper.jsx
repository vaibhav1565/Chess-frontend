import { Chessboard } from "react-chessboard";
import { COLORS } from "../utils/playConstants";
import "./chessboard.css";
import { useNavigate } from "react-router-dom";
import { formatTime } from "../utils/chessHelper";

const ChessboardWrapper = ({
  gameState,
  chess,
  historyIndex,
  onPieceDrop,
  showAnim,
  user,
  userTime,
  opponentTime,
  isPopup,
  setIsPopup,
  handleStartGame,
  showPopup,
  closePopup,
}) => {
  const navigate = useNavigate();

  function handleRegister() {
    navigate("/register");
  }
  function handleLogin() {
    navigate("/login");
  }

  return (
    <div className="flex flex-col relative">
      <div className="flex justify-between">
        <p className="font-bold">
          {gameState.opponent ? gameState.opponent.username : "opponent"}
        </p>
        <p>{opponentTime ? formatTime(opponentTime) : "0:00"}</p>
      </div>
      <Chessboard
        animationDuration={
          historyIndex === chess.history().length - 1 ? 300 : 0
        }
        areArrowsAllowed={false}
        boardOrientation={
          gameState.playerColor === null ||
          gameState.playerColor === COLORS.WHITE
            ? "white"
            : "black"
        }
        boardWidth={600}
        onPieceDrop={onPieceDrop}
        position={
          historyIndex > -1
            ? chess.history({ verbose: true })[historyIndex]["after"]
            : chess.fen()
        }
      />
      <div className="flex justify-between">
        <p className="font-bold">
          {user?.data ? user.data.username : "user"}
        </p>
        <p>{userTime ? formatTime(userTime) : "0:00"}</p>
      </div>
      {showPopup && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-gray-700 text-white p-6 rounded-lg shadow-lg w-[300px]">
          <button
            className="absolute top-2 right-2 cursor-pointer text-white bg-red-500 rounded-full w-6 h-6 flex items-center justify-center"
            onClick={closePopup}
            aria-label="Close"
          >
            &times;
          </button>
          <h1 className="text-lg font-bold mb-4 text-center">
            Play Online Chess
          </h1>
          <div className="flex flex-col gap-2">
            <button
              className="block bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
              onClick={handleRegister}
            >
              Sign Up
            </button>
            <button
              className="block bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
              onClick={handleLogin}
            >
              Log In
            </button>
            <button className="block bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600">
              Play as a guest
            </button>
          </div>
        </div>
      )}
      {showAnim && (
        <>
          <div className="player-1 absolute z-10 left-1/2 text-white bg-[rgb(84,84,84)] w-[200px] h-[75px] p-8 rounded-2xl font-bold text-3xl flex items-center justify-center">
            <span>{gameState.opponent.username}</span>
          </div>
          <div className="versus absolute top-1/2 left-1/2 -translate-1/2 text-white bg-[rgb(84,84,84)] w-[100px] h-[50px] p-8 rounded-2xl font-bold text-3xl flex items-center justify-center">
            <span>VS</span>
          </div>
          <div className="player-2 absolute z-10 left-1/2 text-white bg-[rgb(84,84,84)] w-[200px] h-[75px] p-8 rounded-2xl font-bold text-3xl flex items-center justify-center">
            <span>{user}</span>
          </div>
        </>
      )}
      {isPopup !== null && (
        <div className="bg-gray-500 mt-[24px] ml-[150px] absolute h-[600px] w-[300px] rounded-4xl animate-slide-down">
          <button
            className="w-full text-right text-3xl cursor-pointer"
            onClick={() => setIsPopup(null)}
          >
            ❌
          </button>
          <p
            style={{ whiteSpace: "pre-line" }}
            className="text-white text-center"
          >
            {isPopup}
          </p>

          <div className="flex justify-center">
            <button
              onClick={handleStartGame}
              className="w-1/2 bg-green-500 text-white font-extrabold text-lg px-4 py-4 rounded-xl cursor-pointer hover:bg-green-400"
            >
              New game
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChessboardWrapper;
