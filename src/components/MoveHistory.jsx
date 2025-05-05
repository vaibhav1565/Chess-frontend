const MoveHistory = ({ history, historyIndex, setHistoryIndex }) => {
  return (
    <ul className="h-[300px] overflow-y-auto bg-gray-700 rounded-lg p-2 max-w-screen">
      {(function () {
        let moveHistory = [];
        for (let move = 0; move < history.length; move += 2) {
          moveHistory.push(history.slice(move, move + 2));
        }
        return moveHistory;
      })().map((item, index) => {
        return (
          <li
            key={index}
            className="grid grid-cols-3 px-2 lg:px-4 py-1 lg:py-2 items-center bg-white text-black hover:bg-gray-100 shadow-sm transition-all duration-200"
          >
            <span className="p-1 lg:p-2">{index + 1} .</span>
            <span
              className={`p-1 lg:p-2 cursor-pointer text-center rounded-md transition-colors duration-200 ${
                index * 2 === historyIndex
                  ? "bg-gray-400 text-white"
                  : "hover:bg-gray-200"
              }`}
              onClick={() => setHistoryIndex(index * 2)}
            >
              {item[0]}
            </span>
            {item[1] && (
              <span
                className={`p-1 lg:p-2 cursor-pointer text-center rounded-md transition-colors duration-200 ${
                  index * 2 + 1 === historyIndex
                    ? "bg-gray-400 text-white"
                    : "hover:bg-gray-200"
                }`}
                onClick={() => setHistoryIndex(index * 2 + 1)}
              >
                {item[1]}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default MoveHistory;
