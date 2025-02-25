// import { useCallback, useEffect, useState } from "react";
// import { useSocket } from "../hooks/useSocket";
// import { Chess } from "chess.js";
// import { DEFAULT_POSITION } from "chess.js";
// import { Chessboard } from "react-chessboard";
// import { MOVE, ASSIGN_COLOR, DISCONNECT } from "../utils/messages";
// import { useSelector } from "react-redux";

// const pgn = [
//   '[Event "Casual Game"]',
//   '[Site "Berlin GER"]',
//   '[Date "1852.??.??"]',
//   '[EventDate "?"]',
//   '[Round "?"]',
//   '[Result "1-0"]',
//   '[White "Adolf Anderssen"]',
//   '[Black "Jean Dufresne"]',
//   '[ECO "C52"]',
//   '[WhiteElo "?"]',
//   '[BlackElo "?"]',
//   '[PlyCount "47"]',
//   "",
//   "1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4 Bxb4 5.c3 Ba5 6.d4 exd4 7.O-O",
//   "d3 8.Qb3 Qf6 9.e5 Qg6 10.Re1 Nge7 11.Ba3 b5 12.Qxb5 Rb8 13.Qa4",
//   "Bb6 14.Nbd2 Bb7 15.Ne4 Qf5 16.Bxd3 Qh5 17.Nf6+ gxf6 18.exf6",
//   "Rg8 19.Rad1 Qxf3 20.Rxe7+ Nxe7",
// ];

// //21.Qxd7+ Kxd7 22.Bf5+ Ke8", "23.Bd7+ Kf8 24.Bxe7#

// const Game = () => {
//   const [chess] = useState(() => {
//     const instance = new Chess();
//     instance.loadPgn(pgn.join("\n"));
//     return instance;
//   });
//   const [history, setHistory] = useState(chess.history({ verbose: true }));
//   const [chessState, setChessState] = useState(chess.history().length - 1);

//   const [playerColor, setPlayerColor] = useState(null);
//   const [status, setStatus] = useState("Waiting for another player to join...");
//   const [gameOutcome, setGameOutcome] = useState(null);

//   const handleMessage = useCallback(
//     (event) => {
//       const message = JSON.parse(event.data);
//       console.log(message);

//       switch (message.type) {
//         case ASSIGN_COLOR: {
//           setPlayerColor(message.payload.color);
//           setStatus(
//             `You are playing as ${
//               message.payload.color === "w" ? "White" : "Black"
//             }`
//           );
//           break;
//         }

//         case MOVE: {
//           const move = message.payload;
//           try {
//             chess.move(move);
//             setHistory(chess.history({ verbose: true }));
//             setChessState((chessState) => chessState + 1);
//             handleGameOver();
//           } catch (e) {
//             console.log("Invalid move");
//             console.log(e);
//           }
//           break;
//         }

//         case DISCONNECT: {
//           setPlayerColor(null);
//           setStatus("The other player disconnected. Reloading....");
//           //if (socket) socket.close();

//           setTimeout(() => {
//             window.location.reload();
//           }, 2000);
//           break;
//         }
//       }
//     },
//     [playerColor]
//   );

//   const socket = useSocket(handleMessage);

//   function handlePieceDrop(sourceSquare, targetSquare, piece) {
//     if (chessState != history.length - 1) {
//       setChessState(history.length - 1);
//       return false;
//     }
//     if (chess.turn() !== playerColor) {
//       setChessState(history.length - 1);
//       return false;
//     }
//     //console.log(piece);
//     try {
//       let moveObject = {
//         from: sourceSquare,
//         to: targetSquare,
//         promotion: piece[1].toLowerCase(),
//       };
//       chess.move(moveObject);
//       setHistory(chess.history({ verbose: true }));
//       setChessState((chessState) => chessState + 1);
//       try {
//         if (socket.readyState === WebSocket.OPEN) {
//           socket.send(
//             JSON.stringify({
//               type: MOVE,
//               payload: moveObject,
//             })
//           );
//         }
//         handleGameOver();
//         return true;
//       } catch (e) {
//         console.log(e);
//         return false;
//       }
//     } catch (e) {
//       console.log("Invalid move");
//       console.log(e);
//     }
//   }

//   function handleGameOver() {
//     if (!chess.isGameOver()) return;

//     let message = "Game over!";

//     if (chess.isDraw()) {
//       if (chess.isDrawByFiftyMoves()) message += "\nDraw by 50 moves rule";
//       else if (chess.isInsufficientMaterial())
//         message += "\nDraw by Insufficient Material";
//       else if (chess.isStalemate()) message += "\nDraw by stalemate";
//       else if (chess.isThreefoldRepetition())
//         message += "\nDraw by Threefold Repetition";
//     } else if (chess.isCheckmate()) {
//       message +=
//         playerColor !== null && playerColor === chess.turn()
//           ? "\nYou lost!"
//           : "\nYou won!";
//     }
//     console.log(playerColor);
//     setGameOutcome(message);
//   }

//   const user = useSelector((state) => state.user);
//   return (
//     <div className="h-screen flex gap-10 items-center justify-center">
//       <div>
//         <div>
//           <p className="">{status || " "}</p>
//           <p className="">
//             {playerColor
//               ? `${chess.turn() === "w" ? "White" : "Black"}'s turn`
//               : "\u00A0"}
//           </p>
//         </div>
//         <div className="relative">
//           {gameOutcome && (
//             <div className="absolute z-1 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black text-white h-[520px] w-1/2 flex items-center justify-between">
//               <p className="w-full text-center">{gameOutcome}</p>
//             </div>
//           )}
//           {user && (
//             <div className="flex items-start">
//               <img src={user.photoURL} />
//               <span>{user.displayName}</span>
//               <span>&#9823;</span>
//             </div>
//           )}
//           <Chessboard
//             id="BasicBoard"
//             boardWidth={520}
//             position={
//               history.length > 0 ? history[chessState].after : DEFAULT_POSITION
//             }
//             boardOrientation={
//               playerColor === null || playerColor === "w" ? "white" : "black"
//             }
//             onPieceDrop={handlePieceDrop}
//             animationDuration={chessState === history.length - 1 ? 200 : 0}
//             customDropSquareStyle={{
//               boxShadow: "inset 0 0 1px 6px rgba(68,125,247,0.75)",
//             }}
//             areArrowsAllowed={false}
//             customDarkSquareStyle={{
//               backgroundColor: "#779952",
//             }}
//             customLightSquareStyle={{
//               backgroundColor: "#edeed1",
//             }}
//           />
//           {user && (
//             <div className="flex items-start">
//               <img src={user.photoURL} />
//               <span>{user.displayName}</span>
//               <span>{playerColor === 'w' ? "♙" : "♟"}</span>
//             </div>
//           )}
//         </div>
//         <p>Total moves: {history.length}</p>
//       </div>

//       <div className="flex flex-col h-[600px] w-80 border-2 border-black">
//         <div className="h-1/2 flex items-center justify-center">
//           <button
//             className="cursor-pointer bg-black text-white"
//             onClick={() => {
//               setPlayerColor(null);
//               setStatus("Reloading....");
//               setTimeout(() => {
//                 window.location.reload();
//               }, 2000);
//             }}
//           >
//             New Game
//           </button>
//         </div>
//         <div className="h-1/2 border-2 border-gray-300">
//           <ul className="h-3/4 overflow-y-scroll border-2 border-gray-600">
//             {(function () {
//               let result = [];
//               for (let x = 0; x < chess.history().length; x += 2) {
//                 result.push(chess.history().slice(x, x + 2));
//               }
//               return result;
//             })().map((h, i) => (
//               <li
//                 key={i}
//                 className="grid grid-cols-3 p-2 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-xl shadow-md hover:from-blue-100 hover:to-blue-200 hover:shadow-lg transition-all duration-300"
//               >
//                 <span>{i + 1 + ". "}</span>
//                 <span
//                   className={`cursor-pointer text-center ${
//                     2 * i === chessState ? "bg-gray-400" : ""
//                   }`}
//                   onClick={() => setChessState(2 * i)}
//                 >
//                   {h[0]}
//                 </span>
//                 {h[1] && (
//                   <span
//                     className={`cursor-pointer text-center ${
//                       2 * i + 1 === chessState ? "bg-gray-400" : ""
//                     }`}
//                     onClick={() => setChessState(2 * i + 1)}
//                   >
//                     {h[1]}
//                   </span>
//                 )}
//               </li>
//             ))}
//           </ul>
//           <div className="h-1/4 flex justify-evenly items-center border-2 border-gray-600">
//             <button
//               className="cursor-pointer px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
//               onClick={() => {
//                 setChessState((chessState) =>
//                   chessState > 0 ? chessState - 1 : chessState
//                 );
//                 setGameOutcome(null);
//               }}
//             >
//               &lt;
//             </button>
//             <button
//               className="cursor-pointer px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
//               onClick={() => {
//                 setChessState((chessState) =>
//                   chessState < history.length - 1 ? chessState + 1 : chessState
//                 );
//                 setGameOutcome(null);
//               }}
//             >
//               &gt;
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };
// export default Game;

import React from 'react'

const Game = () => {
  return (
    <div>Game</div>
  )
}

export default Game