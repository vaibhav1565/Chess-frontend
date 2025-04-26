
const InviteCode = ({isGenerating, createInviteCode, inviteCode}) => {
  return (
    <button
      disabled={isGenerating}
      onClick={createInviteCode}
      className={`mt-2 w-5/6 bg-slate-500 text-white font-extrabold px-4 py-4 rounded-xl ${
        isGenerating ? "cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      {inviteCode ? `Invite code- ${inviteCode}` : "Create invite code"}
    </button>
  );
}

export default InviteCode