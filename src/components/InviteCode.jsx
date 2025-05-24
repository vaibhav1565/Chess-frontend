
const InviteCode = ({isGenerating, createInviteCode, inviteCode}) => {
  return (
    <button
      disabled={isGenerating}
      onClick={createInviteCode}
      className={`relative mt-2 w-5/6 bg-slate-500 text-white font-extrabold px-4 py-4 rounded-xl ${
        isGenerating ? "cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      {inviteCode ? (
        <>
          <p>Invite code -</p>
          <p>{inviteCode}</p>
        </>
      ) : (
        <p>Click to generate invite code</p>
      )}
      <button
        className="absolute top-2 right-2 bg-slate-600 hover:bg-slate-700 text-white px-2 py-1 text-lg rounded-md transition-colors duration-200 shadow-sm md:text-sm"
        onClick={(e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(inviteCode);
        }}
      >
        Copy
      </button>
    </button>
  );
}

export default InviteCode