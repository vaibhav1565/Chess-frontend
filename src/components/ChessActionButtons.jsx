const ChessActionButtons = ({ offerDraw, resignGame }) => {
  return (
    <div className="flex gap-2">
      <button
        onClick={offerDraw}
        className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
      >
        Draw
      </button>
      <button
        onClick={resignGame}
        className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
      >
        Resign
      </button>
    </div>
  );
};

export default ChessActionButtons