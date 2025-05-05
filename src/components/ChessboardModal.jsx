const ChessboardModal = ({
  popupToggle,
  setPopupToggle,
  startGame,
}) => {

  return (
    <>
      {popupToggle !== null && (
        <div className="bg-gray-500 mt-[24px] ml-[150px] absolute h-[600px] w-[300px] rounded-4xl max-w-screen">
          <button
            className="w-full text-right text-3xl cursor-pointer"
            onClick={() => setPopupToggle(null)}
          >
            ❌
          </button>
          <p
            style={{ whiteSpace: "pre-line" }}
            className="text-white text-center"
          >
            {popupToggle}
          </p>

          <div className="flex justify-center max-w-screen">
            <button
              onClick={startGame}
              className="w-1/2 bg-green-500 text-white font-extrabold text-lg px-4 py-4 rounded-xl cursor-pointer hover:bg-green-400"
            >
              New game
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChessboardModal;
