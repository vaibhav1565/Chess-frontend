import { USER_SVG } from "../utils/otherConstants.jsx";

const PlayerTile = ({ playerName }) => {
  return (
    <div className="w-full flex self-start gap-3">
      <div className="w-10">
        <USER_SVG />
      </div>
      <p className="text-lg">{playerName}</p>
    </div>
  );
};

export default PlayerTile;
