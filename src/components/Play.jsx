import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Chessboard } from "react-chessboard";

import {
  getTokenFromCookies,
  formatTime,
  playSound,
  playMoveSound,
  makeChessMove,
  INITIAL_MESSAGES,
  createChessInstance,
  GAME_PHASES,
  NAVBAR_PHASES,
  generateSquareStyles,
  onPromotionCheck,
  isPromotionMove,
} from "../utils/chessHelper";

import {
  COLORS,
  MESSAGE_TYPES,
  GAME_SETTINGS,
  WEBSOCKET_MESSAGE_TYPES,
  INVITE,
  GAME_END_REASONS,
} from "../utils/chessConstants";

import GameChat from "./GameChat";
import MoveHistory from "./MoveHistory";
import ChessButtons from "./ChessActionButtons";
import DrawScreen from "./DrawScreen";
import JoinWithCode from "./JoinWithCode";
import InviteCode from "./InviteCode";
import TimeControls from "./TimeControls";
import ChessHistoryButtons from "./ChessHistoryButtons";
import PlayerTile from "./PlayerTile";
import StatusBar from "./StatusBar";

const sound_game_start = new Audio("sounds/game-start.mp3");
const sound_game_end = new Audio("sounds/game-end.mp3");
const sound_move_self = new Audio("sounds/move-self.mp3");
const sound_move_opponent = new Audio("sounds/move-opponent.mp3");

console.clear();

const Play = () => {
  const [gamePhase, setGamePhase] = useState(GAME_PHASES.NOT_STARTED);

  const socket = useRef(null);

  const user = useSelector((store) => store.user);

  const [gameState, setGameState] = useState({
    rival: null,
    playerColor: null,
  });

  const [status, setStatus] = useState("Click on play button to get started");

  const [chess, setChess] = useState(createChessInstance);
  const history = chess.history();
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [moveFrom, setMoveFrom] = useState("");
  const [moveTo, setMoveTo] = useState(null);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);

  const [timeConfig, setTimeConfig] = useState({
    minutes: 3,
    increment: 0,
  });

  const [playerTime, setPlayerTime] = useState(null);
  const [rivalTime, setRivalTime] = useState(null);
  const userWorker = useRef(null);
  const rivalWorker = useRef(null);

  const [inviteCode, setInviteCode] = useState("");
  const [generatingInviteCode, setGeneratingInviteCode] = useState(false);

  const [joinCodeInput, setJoinCodeInput] = useState("");

  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState(INITIAL_MESSAGES);

  const [isDraw, setIsDraw] = useState(null);
  const [isTimeConfig, setIsTimeConfig] = useState(false);
  const [isCustom, setIsCustom] = useState(false);

  const [navbar, setNavbar] = useState(NAVBAR_PHASES.NEW_GAME);

  const handleMessageRef = useRef(() => {});

  handleMessageRef.current = (message) => {
    console.group("[handleMessage]");
    console.log("Payload:", message);
    switch (message.type) {
      case MESSAGE_TYPES.GAME_BEGIN: {
        beginGame(message.payload);
        break;
      }

      case MESSAGE_TYPES.GAME_OVER: {
        endGame(message.payload.reason, message.payload.loser);
        break;
      }

      case MESSAGE_TYPES.WAIT: {
        console.log("Message- Wait");
        setStatus("Waiting for another player to join");
        setGamePhase(GAME_PHASES.WAITING);
        break;
      }

      case MESSAGE_TYPES.MOVE: {
        console.log("Message- Opponent move received:", message.payload);
        handleOpponentMove(message.payload);
        break;
      }

      case MESSAGE_TYPES.INVITE_CODE: {
        console.log("Message- Invite code received:", message.payload);
        setInviteCode(message.payload.code);
        setGeneratingInviteCode(false);
        break;
      }

      case MESSAGE_TYPES.CHAT_MESSAGE: {
        console.log("Message- Chat message received", message.payload);
        setChatHistory((prev) => prev.concat(message.payload));
        break;
      }

      case MESSAGE_TYPES.DRAW_ACCEPTED: {
        console.log("Message- Draw accepted");
        setChatHistory((prev) =>
          prev.concat(`${gameState.rival?.username} accepted a draw`)
        );
        setIsDraw(null);
        userWorker.current?.postMessage({ type: "stop" });
        rivalWorker.current?.postMessage({ type: "stop" });
        break;
      }

      case MESSAGE_TYPES.DRAW_OFFER: {
        console.log("Message- Draw offer received");
        setChatHistory((prev) =>
          prev.concat(`${gameState.rival?.username} offered a draw`)
        );
        setIsDraw(gameState.rival._id);
        break;
      }

      case MESSAGE_TYPES.DRAW_REJECTED: {
        console.log("Message- Draw rejected");
        setChatHistory((prev) =>
          prev.concat(`${gameState.rival?.username} rejected a draw`)
        );
        setIsDraw(null);
        break;
      }

      case MESSAGE_TYPES.OPPONENT_DISCONNECT: {
        console.log("Opponent disconnected");
        break;
      }

      case WEBSOCKET_MESSAGE_TYPES.ERROR: {
        console.log("Message- Error:", message.payload);
        break;
      }

      case WEBSOCKET_MESSAGE_TYPES.CONNECTION_SUCCESS: {
        console.log("Message- Connection success");
        break;
      }

      default:
        console.log("Message- Unknown message type:", message);
    }
    console.groupEnd();
  };

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    const signal = controller.signal;

    if (ignore || socket.current) return;

    console.log("useEffect called");

    const token = getTokenFromCookies();
    if (!token) {
      console.log("[SOCKET] No authentication token found");
      setStatus("Login/Sign up to get started");
      return;
    }

    const openHandler = () => {
      if (signal.aborted) return;
      console.log("[SOCKET] Connection opened");
    };

    const closeHandler = () => {
      if (signal.aborted) return;
      console.log("[SOCKET] Connection closed");
      socket.current = null;
    };

    const messageHandler = (event) => {
      if (signal.aborted) return;
      handleMessageRef.current(JSON.parse(event.data));
    };

    const errorHandler = (error) => {
      if (signal.aborted) return;
      console.log("[SOCKET] Connection error:", error);
      socket.current = null;
    };

    console.log("[SOCKET] Connecting to server...");
    socket.current = new WebSocket(
      `ws://localhost:3000/ws?token=${encodeURIComponent(token)}`
    );

    socket.current.addEventListener("open", openHandler);
    socket.current.addEventListener("message", messageHandler);
    socket.current.addEventListener("error", errorHandler);
    socket.current.addEventListener("close", closeHandler);

    return () => {
      console.log("useEffect cleanup");
      ignore = true;
      controller.abort(); // Abort any ongoing operations
      if (socket.current) {
        socket.current.removeEventListener("message", messageHandler);
        socket.current.removeEventListener("error", errorHandler);
        socket.current.removeEventListener("open", openHandler);
        socket.current.removeEventListener("close", closeHandler);
        socket.current.close();
        socket.current = null;
      }
      if (userWorker.current) {
        userWorker.current.terminate();
        userWorker.current = null;
      }
      if (rivalWorker.current) {
        rivalWorker.current.terminate();
        rivalWorker.current = null;
      }
    };
  }, []);

  function acceptDraw() {
    console.group("[ACCEPT DRAW]");

    if (sendMessage(MESSAGE_TYPES.DRAW_ACCEPT)) {
      console.log("Draw accepted successfully");
      setIsDraw(null);
      setChatHistory((prev) =>
        prev.concat(`${user?.data?.username} accepted a draw`)
      );
    } else {
      console.log("Failed to accept draw");
    }
    console.groupEnd();
  }

  function beginGame(payload) {
    console.group("[BEGIN GAME]");
    console.log("Payload:", payload);
    resetState();

    setGamePhase(GAME_PHASES.ONGOING);
    setGameState({
      playerColor: payload.color,
      rival: payload.opponent,
    });

    setStatus(
      `Game started. You are playing as ${
        payload.color === COLORS.WHITE ? "White" : "Black"
      }`
    );

    setChatHistory((prev) => prev.concat("NEW GAME"));
    setChatHistory((prev) =>
      prev.concat(
        `${user.data.username} vs ${payload.opponent.username} (${payload.minutes}|${payload.increment} min)`
      )
    );
    setNavbar(NAVBAR_PHASES.PLAY);

    const timeLeft = payload.minutes * 60 * 1000;
    const increment = payload.increment * 1000;
    setPlayerTime(timeLeft);
    setRivalTime(timeLeft);
    userWorker.current = setupWorker(
      true,
      timeLeft,
      increment,
      payload.color === COLORS.WHITE
    );
    rivalWorker.current = setupWorker(
      false,
      timeLeft,
      increment,
      payload.color === COLORS.BLACK
    );

    playSound(sound_game_start);
    console.groupEnd();
  }

  function checkForPromotion(sourceSquare, targetSquare, piece) {
    return onPromotionCheck(
      sourceSquare,
      targetSquare,
      piece,
      showPromotionDialog
    );
  }

  function createInviteCode() {
    console.group("[CREATE INVITE CODE]");

    if (
      gamePhase === GAME_PHASES.ONGOING ||
      gamePhase === GAME_PHASES.WAITING
    ) {
      console.log("Cannot generate invite code during ongoing game");
      console.groupEnd();
      return;
    }

    if (generatingInviteCode) {
      console.log("Already generating invite code");
      console.groupEnd();
      return;
    }

    if (
      sendMessage(WEBSOCKET_MESSAGE_TYPES.CREATE_INVITE_CODE, { timeConfig })
    ) {
      console.log("Create invite code message sent");
    } else {
      console.log("Failed to send create invite code message");
    }

    console.groupEnd();
  }

  function endGame(reason, loser) {
    console.group("[ENDGAME]");
    console.log("Payload: reason-", reason, "loser-", loser);
    setGamePhase(GAME_PHASES.ENDED);

    userWorker.current?.postMessage({ type: "stop" });
    rivalWorker.current?.postMessage({ type: "stop" });

    setIsDraw(null);

    let displayMessage;
    const isUserLoser = loser === user.data._id;

    switch (reason) {
      case GAME_END_REASONS.CHECKMATE:
        displayMessage = `Game Over!\n${
          isUserLoser ? "Checkmate - You lost!" : "Checkmate - You won!"
        }`;
        break;

      case GAME_END_REASONS.DRAW:
        displayMessage = "Game Over!\nDraw by stalemate!";
        break;

      case GAME_END_REASONS.DRAW_BY_AGREEMENT:
        displayMessage = "Game Over!\nDraw by mutual agreement";
        break;

      case GAME_END_REASONS.RESIGN:
        displayMessage = `Game Over!\n${
          isUserLoser ? "You resigned" : "Opponent resigned - You won!"
        }`;
        break;

      case GAME_END_REASONS.TIMEOUT:
        displayMessage = `Game Over!\n${
          isUserLoser
            ? "Time's up - You lost!"
            : "Opponent ran out of time - You won!"
        }`;
        break;

      case GAME_END_REASONS.ABORT:
        displayMessage = "Game Aborted";
        break;
    }

    setStatus(displayMessage);
    setChatHistory((prev) => prev.concat(displayMessage));

    playSound(sound_game_end);
    console.groupEnd();
  }

  function handleGameOver(chessInstance) {
    if (!chessInstance.isGameOver()) {
      console.groupEnd();
      return false;
    }

    console.group("[CHECK GAME OVER] successful");

    setGamePhase(GAME_PHASES.ENDED);
    userWorker.current?.postMessage({ type: "stop" });
    rivalWorker.current?.postMessage({ type: "stop" });
    console.groupEnd();
    return true;
  }

  function handleOpponentMove(moveObject) {
    console.group("[OPPONENT MOVE]");
    console.log("Payload:", moveObject);

    const { success, latestMove, newChess } = makeChessMove(moveObject, chess);
    if (success === false) {
      console.log("Error processing opponent's move");
      console.groupEnd();
      return;
    }

    setChess(newChess);
    setHistoryIndex((prev) => prev + 1);
    console.log("Opponent made move:", latestMove.san);

    if (!handleGameOver(newChess)) {
      startTimer(true);
    }

    if (!playMoveSound(latestMove)) {
      playSound(sound_move_opponent);
    }
    console.groupEnd();
  }

  function handleStartGame() {
    console.group("[HANDLE START GAME]");

    if (
      gamePhase === GAME_PHASES.ONGOING ||
      gamePhase === GAME_PHASES.WAITING
    ) {
      console.log("Cannot start. Game phase:", gamePhase);
      console.groupEnd();
      return;
    }

    if (socket.current?.readyState !== WebSocket.OPEN) {
      console.log("Socket state:", socket.current);
      setStatus("Cannot start game. WebSocket not connected.");
      console.groupEnd();
      return;
    }

    sendMessage(WEBSOCKET_MESSAGE_TYPES.JOIN_GAME_VIA_QUEUE, { timeConfig });
    console.groupEnd();
  }

  function joinGameWithCode() {
    console.group("[JOIN GAME WITH CODE]");
    console.log("Join code input:", joinCodeInput);

    if (
      gamePhase === GAME_PHASES.ONGOING ||
      gamePhase === GAME_PHASES.WAITING
    ) {
      console.log("Cannot join. Game in progress");
      console.log(gamePhase);
      console.groupEnd();
      return;
    }

    if (socket.current?.readyState !== WebSocket.OPEN) {
      console.log("Socket state:", socket.current?.readyState);
      setStatus("Cannot start game. WebSocket not connected.");
      console.groupEnd();
      return;
    }

    if (joinCodeInput.length != INVITE.CODE_LENGTH) {
      console.log("Cannot join, invite code must be 12 characters");
      console.groupEnd();
      return;
    }

    try {
      sendMessage(WEBSOCKET_MESSAGE_TYPES.JOIN_GAME_VIA_INVITE, {
        inviteCode: joinCodeInput,
      });
      console.log("Join request sent");
    } catch (error) {
      console.log("Error joining game with code:", error);
      setStatus("Failed to join game");
    }
    console.groupEnd();
  }

  function offerDraw() {
    console.group("[OFFER DRAW]");

    if (isDraw) {
      console.log("A draw is already offered");
      console.groupEnd();
      return;
    }

    if (sendMessage(MESSAGE_TYPES.DRAW_OFFER)) {
      console.log("Draw offer sent");
      setChatHistory((prev) =>
        prev.concat(`${user?.data?.username} offered a draw`)
      );
      setIsDraw(user.data._id);
    } else {
      console.log("Failed to offer draw");
    }
    console.groupEnd();
  }

  function onPieceDrop(sourceSquare, targetSquare, piece) {
    console.group("[ON PIECE DROP]");

    if (gamePhase !== GAME_PHASES.ONGOING) {
      console.log("Rejecting due to game phase:", gamePhase);
      console.groupEnd();
      return false;
    }

    if (historyIndex !== history.length - 1) {
      console.log("Rejecting move due to history mismatch");
      setHistoryIndex(history.length - 1);
      console.groupEnd();
      return false;
    }

    if (gameState.playerColor !== chess.turn()) {
      console.log("Rejecting due to turn mismatch");
      console.groupEnd();
      return false;
    }

    if (!sourceSquare) {
      console.log("No source square");
      console.groupEnd();
      return false;
    }

    console.log("Payload:", {
      sourceSquare,
      targetSquare,
      piece,
    });

    const moves = chess.moves({
      square: sourceSquare,
      verbose: true,
    });
    console.log("Available moves from source square:", moves);

    let foundMove = moves.find((m) => m.to === targetSquare);
    if (!foundMove) {
      console.log("No direct move found. Checking for castling moves.");
      if (
        (piece === "wK" &&
          sourceSquare === "e1" &&
          (targetSquare === "a1" || targetSquare === "h1")) ||
        (piece === "bK" &&
          sourceSquare === "e8" &&
          (targetSquare === "a8" || targetSquare === "h8"))
      ) {
        if (targetSquare[0] === "h") {
          foundMove = moves.find((m) => m.san === "O-O");
        } else {
          foundMove = moves.find((m) => m.san === "O-O-O");
        }
      }
      if (!foundMove) {
        console.log("No valid move found, including castling. Move rejected.");
        console.groupEnd();
        return false;
      }
    }
    console.log("Found move:", foundMove);

    if (isPromotionMove(foundMove)) {
      console.log("Promotion move detected. Showing promotion dialog.");
      setShowPromotionDialog(true);
      console.log("Setting moveFrom and moveTo.");
      setMoveFrom(foundMove.from);
      setMoveTo(foundMove.to);
      console.groupEnd();
      return false;
    }

    console.log("Executing the move.");
    const moveObject = {
      from: foundMove.from,
      to: foundMove.to,
    };
    const { latestMove, newChess } = makeChessMove(moveObject, chess);

    console.log("Sending move to server-", moveObject);
    const outcome = onMoveSuccess(latestMove, newChess, moveObject);

    console.groupEnd();
    return outcome;
  }

  function onMoveSuccess(latestMove, newChess, moveObject) {
    if (sendMessage(MESSAGE_TYPES.MOVE, moveObject)) {
      setChess(newChess);
      setHistoryIndex((prev) => prev + 1);
      if (!handleGameOver(newChess)) {
        startTimer(false);
        if (!playMoveSound(latestMove)) {
          playSound(sound_move_self);
        }
      }
    } else {
      console.log("Failed to send move to server");
      console.groupEnd();
      return false;
    }

    setMoveFrom("");
    setMoveTo(null);
    setShowPromotionDialog(false);

    return true;
  }

  function onPromotionPieceSelect(piece, promoteFromSquare, promoteToSquare) {
    console.group("[ON PROMOTION PIECE SELECT]");
    console.log("Function called with payload:", piece);

    if (piece) {
      const moveObject = {
        from: moveFrom,
        to: moveTo,
        promotion: piece[1].toLowerCase(),
      };
      const { latestMove, newChess } = makeChessMove(
        moveObject,
        chess
      );

      const outcome = onMoveSuccess(latestMove, newChess, moveObject);
      if (outcome)
      console.log("Promotion move executed successfully. Updating game state.");
    } else {
      console.log("No piece selected.");
    }

    console.log("Resetting moveFrom, moveTo, and hiding promotion dialog.");
    setMoveFrom("");
    setMoveTo(null);
    setShowPromotionDialog(false);

    console.groupEnd();
    return true;
  }

  function onSquareClick(square, piece) {
    console.group("[ON SQUARE CLICK]");

    if (square === moveFrom) {
      console.log("Clicked the same square as moveFrom. Resetting moveFrom.");
      setMoveFrom("");
      console.groupEnd();
      return;
    }

    if (gamePhase !== GAME_PHASES.ONGOING) {
      console.log("No ongoing game", gamePhase);
      console.groupEnd();
      return false;
    }

    if (historyIndex !== history.length - 1) {
      console.log("Rejecting move due to history mismatch");
      setHistoryIndex(history.length - 1);
      console.groupEnd();
      return false;
    }

    if (chess.turn() != gameState.playerColor) {
      console.log("Not your turn", chess.turn(), gameState.playerColor);
      console.groupEnd();
      return;
    }

    console.log("Function called with payload: ", square);
    console.log("Current moveFrom:", moveFrom);
    console.log("Current moveTo:", moveTo);

    // from square
    if (!moveFrom) {
      if (chess.get(square)) {
        console.log("Setting moveFrom to:", square);
        setMoveFrom(square);
      } else {
        console.log("Clicked an empty square. No action taken.");
      }
    }
    // to square
    else if (!moveTo) {
      console.log("Attempting to move from:", moveFrom, "to:", square);

      // check if valid move before showing dialog
      const moves = chess.moves({
        square: moveFrom,
        verbose: true,
      });
      console.log("Available moves from moveFrom:", moves);

      const foundMove = moves.find((m) => m.to === square);
      if (!foundMove) {
        console.log("Invalid move. Checking if clicked on a new piece.");
        setMoveFrom(chess.get(square) ? square : "");
        console.groupEnd();
        return;
      }

      console.log("Valid move found:", foundMove);
      setMoveTo(square);

      // if promotion move
      if (isPromotionMove(foundMove)) {
        console.log("Promotion move detected. Showing promotion dialog.");
        setShowPromotionDialog(true);
        console.groupEnd();
        return;
      }

      console.log("Executing normal move.");
      const moveObject = {
        from: moveFrom,
        to: square,
      }
      const { latestMove, newChess } = makeChessMove(
        moveObject,
        chess
      );

      onMoveSuccess(latestMove, newChess, moveObject);
    }

    console.groupEnd();
  }

  function rejectDraw() {
    console.group("[REJECT DRAW]");

    if (sendMessage(MESSAGE_TYPES.DRAW_REJECT)) {
      console.log("Draw rejected successfully");
      setIsDraw(null);
      setChatHistory((prev) =>
        prev.concat(`${user?.data?.username} declined a draw`)
      );
    } else {
      console.log("Failed to reject draw");
    }
    console.groupEnd();
  }

  function resetState() {
    console.group("[RESET STATE]");

    setStatus("Click on play button to get started");
    setNavbar(NAVBAR_PHASES.NEW_GAME);

    setGameState({
      rival: null,
      playerColor: null,
    });

    setPlayerTime(null);
    setRivalTime(null);

    setIsCustom(false);
    setIsTimeConfig(false);
    setIsDraw(null);

    setChatHistory([]);
    setChatInput("");
    setJoinCodeInput("");

    setInviteCode("");
    setGeneratingInviteCode(false);

    setChess(createChessInstance);
    setHistoryIndex(-1);

    setMoveFrom("");
    setMoveTo(null);

    console.groupEnd();
  }

  function resignGame() {
    console.group("[RESIGN GAME]");

    if (gamePhase !== GAME_PHASES.ONGOING) {
      console.log("No ongoing game");
      console.groupEnd();
      return;
    }

    if (sendMessage(MESSAGE_TYPES.RESIGN)) {
      console.log("Resign message sent");
    } else {
      console.log("Failed to send resign message to server");
    }
    console.groupEnd();
  }

  function sendChatMessage() {
    console.group("[SEND CHAT MESSAGE]");

    if (gamePhase !== GAME_PHASES.ONGOING) {
      console.log("Message not sent. There is no ongoing game");
      console.groupEnd();
      return;
    }

    const messageToSend = chatInput.trim();

    if (
      messageToSend.length == 0 ||
      messageToSend.length > GAME_SETTINGS.MAX_MESSAGE_LENGTH
    ) {
      console.log("Message length must be 1-200 characters");
      console.groupEnd();
      return;
    }

    console.log("Sending message:", messageToSend);
    if (sendMessage(MESSAGE_TYPES.CHAT_MESSAGE, { text: messageToSend })) {
      console.log("Message sent");
      setChatHistory((prev) =>
        prev.concat({ from: user.data.username, text: messageToSend })
      );
      setChatInput("");
    } else {
      console.log("Failed to send chat message");
    }
    console.groupEnd();
  }

  function sendMessage(type, payload = undefined) {
    console.group("[SEND MESSAGE]");
    console.log("Function payload:", type, payload);

    if (socket.current?.readyState !== WebSocket.OPEN) {
      console.log(`Skipped sending message, socket not open`);
      console.groupEnd();
      return false;
    }

    try {
      const sendObject = { type };
      if (payload) sendObject["payload"] = payload;
      socket.current.send(JSON.stringify(sendObject));
      console.log("Sent object", sendObject);
      console.groupEnd();
      return true;
    } catch (error) {
      console.log(`Error sending:`, error);
      console.groupEnd();
      return false;
    }
  }

  function setupWorker(isUser, totalTime, increment, isStart) {
    console.group("[SETUP WORKER]");
    console.log(
      "Setting up worker for:",
      isUser ? "user" : "opponent",
      "with time:",
      totalTime,
      "and increment count",
      increment
    );

    const worker = new Worker(
      new URL("../utils/timerWorker.js", import.meta.url)
    );

    worker.addEventListener("message", (e) => {
      if (e.data.type === "tick") {
        if (isUser) {
          setPlayerTime(e.data.remainingTime);
        } else {
          setRivalTime(e.data.remainingTime);
        }
      }
    });

    worker.addEventListener("error", (error) => {
      console.log("Worker error:", error);
      worker.terminate();
      setGamePhase(GAME_PHASES.ENDED);
    });

    worker.postMessage({
      type: isStart ? "initAndStart" : "init",
      payload: {
        totalTime,
        increment,
        tickRate: GAME_SETTINGS.INTERVAL,
      },
    });

    console.groupEnd();
    return worker;
  }

  function startTimer(isUser) {
    console.group("[START TIMER]");
    console.log("Starting timer for", isUser ? "user" : "rival");

    userWorker.current.postMessage({
      type: isUser ? "start" : "stop",
    });
    rivalWorker.current.postMessage({
      type: isUser ? "stop" : "start",
    });

    console.groupEnd();
  }

  return (
    <div className="flex flex-col items-center justify-center w-full px-4 sm:px-6 lg:px-8 text-center">
      <div className="w-full mb-4">
        <StatusBar status={status} />
        {gamePhase === GAME_PHASES.ONGOING && (
          <p className="text-sm sm:text-base">
            {gameState.playerColor
              ? `${chess.turn() === COLORS.WHITE ? "White" : "Black"}'s turn`
              : "\u00A0"}
          </p>
        )}
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-center gap-6 py-4 w-full max-w-7xl mx-auto">
        {/* Chessboard and players info */}
        <div className="w-full max-w-[600px] lg:w-2/3 flex flex-col items-center">
          <div className="w-full flex justify-between items-start">
            <PlayerTile
              playerName={
                gameState.rival ? gameState.rival.username : "opponent"
              }
            />
            <p className="text-lg font-bold text-gray-800 bg-gray-200 px-4 shadow-md h-min py-2">
              {rivalTime ? formatTime(rivalTime) : "0:00"}
            </p>
          </div>
          <div
            className="w-full"
            onBlur={() => {
              setMoveFrom("");
              setMoveTo(null);
              setShowPromotionDialog(false);
            }}
            tabIndex={0}
          >
            <Chessboard
              animationDuration={
                historyIndex === chess.history().length - 1 ? 300 : 0
              }
              areArrowsAllowed={false}
              boardOrientation={
                gameState.playerColor === null ||
                gameState.playerColor === COLORS.WHITE
                  ? "white"
                  : "black"
              }
              customDropSquareStyle={ {boxShadow: 'inset 0 0 1px 6px yellow' }}
              customNotationStyle={{
                fontSize: "15px",
              }}
              customSquareStyles={generateSquareStyles(moveFrom, chess)}
              onPieceDrop={onPieceDrop}
              onPromotionCheck={checkForPromotion}
              onPromotionPieceSelect={onPromotionPieceSelect}
              onSquareClick={onSquareClick}
              position={
                historyIndex === -1
                  ? "start"
                  : chess.history({ verbose: true })[historyIndex]["after"]
              }
              promotionDialogVariant="modal"
              promotionToSquare={moveTo}
              showPromotionDialog={showPromotionDialog}
            />
          </div>
          <div className="w-full flex justify-between">
            <PlayerTile playerName={user?.data ? user.data.username : "user"} />
            <p className="text-lg font-bold text-gray-800 bg-gray-200 px-4 shadow-md h-min py-2">
              {playerTime ? formatTime(playerTime) : "0:00"}
            </p>
          </div>
        </div>

        {/* Move history, Chess buttons */}
        <div className="w-full max-w-[600px] lg:w-1/3 lg:h-[680px] p-6 rounded-xl mt-8 lg:mt-0 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 shadow-lg border border-gray-600 transition-all duration-300">
          {navbar === NAVBAR_PHASES.NEW_GAME ? (
            <div className="overflow-y-auto flex flex-col justify-center items-center mt-4 pb-4 px-2">
              <TimeControls
                timeConfig={timeConfig}
                setTimeConfig={setTimeConfig}
                isTimeConfig={isTimeConfig}
                setIsTimeConfig={setIsTimeConfig}
              />

              <button
                onClick={handleStartGame}
                className="mt-2 w-5/6 bg-green-600 text-white font-extrabold text-xl px-8 py-4 rounded-xl cursor-pointer hover:bg-green-400"
              >
                Play
              </button>

              <button
                onClick={() => setIsCustom(!isCustom)}
                className="mt-2 bg-purple-600 text-white font-bold px-4 py-2 rounded-lg shadow-md hover:bg-purple-500 transition-colors duration-200"
              >
                Custom {isCustom ? "⬆️" : "⬇️"}
              </button>

              {isCustom && (
                <div className="w-full px-2 sm:px-0">
                  <JoinWithCode
                    joinCodeInput={joinCodeInput}
                    setJoinCodeInput={setJoinCodeInput}
                    joinGameWithCode={joinGameWithCode}
                  />

                  <InviteCode
                    isGenerating={generatingInviteCode}
                    inviteCode={inviteCode}
                    createInviteCode={createInviteCode}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex flex-col overflow-hidden">
              {gamePhase === GAME_PHASES.ENDED && (
                <button
                  onClick={resetState}
                  className="font-bold bg-blue-600 py-2 px-4 rounded-lg shadow-md hover:bg-blue-500 transition duration-200 w-fit mx-auto"
                >
                  New Game
                </button>
              )}
              <div className="flex flex-col flex-grow overflow-y-auto">
                {isDraw === gameState.rival._id ? (
                  <DrawScreen acceptDraw={acceptDraw} rejectDraw={rejectDraw} />
                ) : (
                  <>
                    {history.length !== 0 && (
                      <MoveHistory
                        history={history}
                        historyIndex={historyIndex}
                        setHistoryIndex={setHistoryIndex}
                      />
                    )}
                  </>
                )}
              </div>

              <div className="w-full flex flex-col text-black bg-blue-400">
                <div className="flex flex-col items-center justify-between gap-2 p-4 bg-white border-t border-gray-300 shadow-sm">
                  <ChessButtons offerDraw={offerDraw} resignGame={resignGame} />
                  <ChessHistoryButtons
                    setHistoryIndex={setHistoryIndex}
                    historyLength={history.length}
                  />
                </div>

                <div className="flex-grow overflow-y-auto">
                  <GameChat
                    chatHistory={chatHistory}
                    chatInput={chatInput}
                    onInputChange={(e) => setChatInput(e.target.value)}
                    sendChatMessage={sendChatMessage}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Play;
