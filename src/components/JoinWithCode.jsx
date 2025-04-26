
const JoinWithCode = ({inviteCodeInput, setInviteCodeInput, joinGameWithCode }) => {
  return (
    <>
      <input
        onChange={(e) => setInviteCodeInput(e.target.value)}
        value={inviteCodeInput}
        placeholder="Enter invite code"
        className="mt-2 w-5/6 px-4 py-3 rounded-xl border-2 border-slate-300 focus:outline-none focus:border-green-500 transition-colors"
      />
      <button
        onClick={joinGameWithCode}
        className="cursor-pointer mt-2 w-5/6 bg-blue-600 text-white font-bold text-lg px-4 py-3 rounded-xl hover:bg-blue-500 transition-colors"
      >
        Join with code
      </button>
    </>
  );
}

export default JoinWithCode