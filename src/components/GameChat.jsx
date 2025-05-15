
const GameChat = ({
  chatHistory,
  chatInput,
  onInputChange,
  sendChatMessage,
}) => {
  return (
    <div className="h-60 max-h-80 flex flex-col text-left">
      {/* Chat history*/}
      <ul className="overflow-y-auto w-full flex-1">
        {chatHistory.map((message, index) => {
          return (
            <li className="whitespace-pre-line break-words" key={index}>
              {typeof message === "object"
                ? `${message.from} - ${message.text}`
                : message}
            </li>
          );
        })}
      </ul>
      {/* Chat input field */}
      <div className="w-full flex gap-2 items-center">
        <input
          placeholder="Send a message..."
          value={chatInput}
          onChange={onInputChange}
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none min-w-0"
        />
        <button
          onClick={sendChatMessage}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex-shrink-0"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default GameChat