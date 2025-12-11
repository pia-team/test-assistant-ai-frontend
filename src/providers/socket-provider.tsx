"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

type SocketContextType = {
    socket: Socket | null;
    isConnected: boolean;
    connectionStatus: "connected" | "connecting" | "disconnected";
};

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
    connectionStatus: "disconnected",
});

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "disconnected">("disconnected");

    useEffect(() => {
        const url = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:9092";
        const socketInstance = io(url, {
            transports: ["polling", "websocket"],
            // @ts-ignore
            allowEIO3: true, // Crucial for netty-socketio compatibility
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socketInstance.on("connect", () => {
            console.log("Connected to Socket.IO server");
            setIsConnected(true);
            setConnectionStatus("connected");
        });

        socketInstance.on("disconnect", () => {
            console.log("Disconnected from Socket.IO server");
            setIsConnected(false);
            setConnectionStatus("disconnected");
        });

        socketInstance.on("connect_error", (err) => {
            console.log("Socket connect_error", err?.message || err);
            setConnectionStatus("disconnected");
        });

        socketInstance.on("reconnect_attempt", () => {
            console.log("Socket reconnect_attempt");
            setConnectionStatus("connecting");
        });

        socketInstance.on("reconnect", () => {
            console.log("Socket reconnect success");
            setConnectionStatus("connected");
            setIsConnected(true);
        });

        socketInstance.on("reconnect_failed", () => {
            console.log("Socket reconnect_failed");
            setConnectionStatus("disconnected");
        });

        if (process.env.NEXT_PUBLIC_SOCKET_DEBUG === "true") {
            socketInstance.onAny((event, ...args) => {
                console.log("Socket event:", event, args?.length);
            });
        }

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, isConnected, connectionStatus }}>
            {children}
        </SocketContext.Provider>
    );
};
