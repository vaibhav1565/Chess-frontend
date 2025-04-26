
const ChessButtons = ({setHistoryIndex, offerDraw, resignGame}) => {
  return (
    <div className="flex justify-between border-t border-gray-200">
      {/* Game control buttons */}
      <div className="flex gap-2">
        <button
          onClick={offerDraw}
          className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
        >
          Draw
        </button>
        <button
          onClick={resignGame}
          className="px-4 py-2 text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors font-medium"
        >
          Resign
        </button>
      </div>

      {/* Move navigation buttons */}
      <div className="flex gap-1">
        <button
          onClick={() => setHistoryIndex(0)}
          className="px-3 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          ⏮
        </button>
        <button
          onClick={() =>
            setHistoryIndex((prev) => (prev > 0 ? prev - 1 : prev))
          }
          className="px-3 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          ◀
        </button>
        <button
          onClick={() =>
            setHistoryIndex((prev) =>
              prev < history.length - 1 ? prev + 1 : prev
            )
          }
          className="px-3 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          ▶
        </button>
        <button
          onClick={() => setHistoryIndex(history.length - 1)}
          className="px-3 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          ⏭
        </button>
      </div>
    </div>
  );
}

export default ChessButtons