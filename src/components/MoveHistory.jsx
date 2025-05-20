/* eslint-disable react/prop-types */
const MoveHistory = ({ history, historyIndex, setHistoryIndex }) => {
  return (
    <ul className="overflow-y-auto w-full bg-gray-700 rounded-lg p-2 max-h-64">
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
            className="grid grid-cols-3 px-2 py-1 items-center bg-white text-black hover:bg-gray-100 shadow-sm transition-all duration-200 text-sm"
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
