
const ChessHistoryButtons = ({setHistoryIndex, historyLength}) => {
  return (
    <div className="flex justify-around gap-4">
      <button
        onClick={() => setHistoryIndex(0)}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-transform transform hover:scale-105"
      >
        ⏮
      </button>
      <button
        onClick={() => setHistoryIndex((prev) => (prev > -1 ? prev - 1 : prev))}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-transform transform hover:scale-105"
      >
        ◀
      </button>
      <button
        onClick={() =>
          setHistoryIndex((prev) =>
            prev < historyLength - 1 ? prev + 1 : prev
          )
        }
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-transform transform hover:scale-105"
      >
        ▶
      </button>
      <button
        onClick={() => setHistoryIndex(historyLength - 1)}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-transform transform hover:scale-105"
      >
        ⏭
      </button>
    </div>
  );
}

export default ChessHistoryButtons