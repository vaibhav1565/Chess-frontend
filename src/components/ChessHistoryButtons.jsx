const ChessHistoryButtons = ({ setHistoryIndex, historyLength }) => {
  return (
    <div className="flex justify-around gap-2 lg:gap-4 mt-4 max-w-screen">
      <button
        onClick={() => setHistoryIndex((prev) => prev > -1 ? 0 : -1)}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 lg:py-2 px-2 lg:px-4 rounded-lg shadow-lg transition-transform transform hover:scale-105"
      >
        ⏮
      </button>
      <button
        onClick={() => setHistoryIndex((prev) => (prev > -1 ? prev - 1 : prev))}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 lg:py-2 px-2 lg:px-4 rounded-lg shadow-lg transition-transform transform hover:scale-105"
      >
        ◀
      </button>
      <button
        onClick={() =>
          setHistoryIndex((prev) =>
            prev < historyLength - 1 ? prev + 1 : prev
          )
        }
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 lg:py-2 px-2 lg:px-4 rounded-lg shadow-lg transition-transform transform hover:scale-105"
      >
        ▶
      </button>
      <button
        onClick={() => setHistoryIndex(historyLength - 1)}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 lg:py-2 px-2 lg:px-4 rounded-lg shadow-lg transition-transform transform hover:scale-105"
      >
        ⏭
      </button>
    </div>
  );
};

export default ChessHistoryButtons;
