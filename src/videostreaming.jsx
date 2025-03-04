import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

// const socket = io("http://localhost:3001");

const VideoShare = () => {
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const fileInputRef = useRef(null);
    const [peerConnection, setPeerConnection] = useState(null);
    const [roomId, setRoomId] = useState("");
    const [joined, setJoined] = useState(false);

    const config = {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    };

    useEffect(() => {
        socket.on("offer", async (offer) => {
            console.log("Received offer:", offer);
            
            let pc = peerConnection;  
            if (!pc) {
                pc = await initializeWebRTC();
            }
            await pc.setRemoteDescription(new RTCSessionDescription(offer)); 
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            console.log(pc);
            socket.emit("answer", { answer, roomId });
        });

        socket.on("answer", async (answer) => {
            console.log("Received answer:", answer);
            await peerConnection.setRemoteDescription(answer);
        });

        socket.on("ice-candidate", async (candidate) => {
            console.log("Received ICE candidate:", candidate);
            await peerConnection.addIceCandidate(candidate);
        });

        return () => {
            socket.off("offer");
            socket.off("answer");
            socket.off("ice-candidate");
        };
    }, [peerConnection, roomId]);

    const initializeWebRTC = async () => {
        const pc = new RTCPeerConnection(config);
    
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("ice-candidate", event.candidate);
            }
        };
    
        pc.ontrack = (event) => {
            console.log("🔹 Received remote stream:", event.streams[0]);
            
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
                console.log("🎥 Remote video should start playing...");
            } else {
                console.error("🚨 Remote video element is not found!");
            }
        };
    
        setPeerConnection(pc);
        return pc;
    };    

    const createRoom = () => {
        const newRoomId = Math.random().toString(36).substring(7);
        setRoomId(newRoomId);
        socket.emit("create-room", newRoomId);
        setJoined(true);
        console.log(`Created room: ${newRoomId}`);
    };

    const joinRoom = () => {
        if (!roomId) {
            alert("Enter a valid room ID");
            return;
        }
        socket.emit("join-room", roomId);
        setJoined(true);
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        localVideoRef.current.src = url;

        const stream = await localVideoRef.current.captureStream();
        const pc = await initializeWebRTC();

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", { offer, roomId });
    };

    return (
        <div>
            {!joined ? (
                <div>
                    <button onClick={createRoom}>Create Room</button>
                    <input
                        type="text"
                        placeholder="Enter Room ID"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                    />
                    <button onClick={joinRoom}>Join Room</button>
                </div>
            ) : (
                <>
                    <input type="file" ref={fileInputRef} accept="video/*" onChange={handleFileChange} />
                    <div>
                        <video style={{width: "90vw"}} ref={localVideoRef} controls autoPlay></video>
                        <video ref={remoteVideoRef} autoPlay></video>
                    </div>
                </>
            )}
        </div>
    );
};

export default VideoShare;
