
const InviteCodeButton = ({inviteCode, generating, onRequestCode}) => {
  return (
    <button
    disabled={generating}
    onClick={onRequestCode}
    className={`mt-2 w-5/6 bg-slate-500 text-white font-extrabold px-4 py-4 rounded-xl ${generating ? "cursor-not-allowed" : "cursor-pointer"}`}>
      {inviteCode ? `Invite code- ${inviteCode}` : "Create invite code"}
    </button>
  );
}

export default InviteCodeButton