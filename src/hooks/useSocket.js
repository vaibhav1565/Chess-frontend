import { useEffect, useRef, useState } from "react";

const WS_URL = "ws://localhost:8080";

export const useSocket = (onMessage) => {
    const [socket, setSocket] = useState(null);
    const onMessageRef = useRef(onMessage);

    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    useEffect(() => {
        const ws = new WebSocket(WS_URL);

        ws.onmessage = (event) => {
            onMessageRef.current?.(event);
        };

        ws.onopen = () => {
            console.log("WebSocket connection opened.");
            setSocket(ws);
        };

        ws.onclose = (e) => {
            console.warn("WebSocket connection closed", e.code, e.reason);
            setSocket(null);
        };

        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        return () => {
            if (ws) {
                console.log("useEffect cleanup: Closing WebSocket");
                ws.close();
            }
        };
    }, []);

    return socket;
};