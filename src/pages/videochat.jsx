import { useRef, useState } from 'react'
import { Peer } from "peerjs"
import Loading from './Loading';

const VideoChat = () => {
  const [RoomId, setRoomId] = useState("");
  const [loading, setLoading] = useState(false);
  const [screenShare, setScreenShare] = useState(false);
  const [join, setJoin] = useState(false);
  const [peer, setPeer] = useState(null);
  const [screenStream, setStreamSharing] = useState(null);

  const currentPeer = useRef(null);
  const localVideoref = useRef(null);
  const remoteVideoref = useRef(null);

  const handleCreateRoom = (e) => {
    if (RoomId == " " || RoomId == "") {
      alert("Please enter room number")
      return;
    }
    console.log("Creating Room")
    const room_id = `PRE${RoomId}SUF`;
    const Newpeer = new Peer(room_id);

    Newpeer.on('open', async (id) => {
        console.log("Peer Connected with ID: ", id)
        setJoin(true);
        
        try {
          const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});

          if (localVideoref.current){
            localVideoref.current.srcObject = stream;
          }

          Newpeer.on('call', (call) => {
            console.log("incoming call....");
            
            call.answer(stream);
            call.on("stream", (remoteStream) => {
              if (remoteVideoref.current){
                remoteVideoref.current.srcObject = remoteStream;
              }
            })
            currentPeer.current = call;
          })
        } catch (error) {
          console.error("Error accessing media devices:", error);
        }
        setPeer(Newpeer);
    })
  }

  const handleJoinRoom = async (e) => {
    if (RoomId == " " || RoomId == "") {
      alert("Please enter room number")
      return;
    }
    console.log("Joining Room");
    const roomId = `PRE${RoomId}SUF`;

    const Newpeer = new Peer();

    Newpeer.on("open", async (id) => {
      console.log(`Peer connected with id: ${id}`);
      setJoin(true);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});

          if (localVideoref.current){
            localVideoref.current.srcObject = stream;
          }

          const call = Newpeer.call(roomId,stream);
          call.on("stream", (remoteStream) => {
            if (remoteVideoref.current){
              remoteVideoref.current.srcObject = remoteStream;
            }
          })
          currentPeer.current = call;
        } catch (error) {
          console.error("Error accessing media devices:", error);
        }
        setPeer(Newpeer)
    })
  }

  const shareScreen = async () => {
    if (RoomId=="" || RoomId==" "){
      alert("Please Enter the room Id");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setStreamSharing(stream);
      const videoTrack = stream.getVideoTracks()[0];

      videoTrack.onended = () => stopScreenSharing();

      if (currentPeer.current) {
        const sender = currentPeer.current.peerConnection.getSenders().find((s) => s.track.kind === videoTrack.kind);
        if (sender) {
          sender.replaceTrack(videoTrack);
          setScreenShare(true);
        } else {
          console.log("Sender not found, renegotiating call...");
          currentPeer.current.peerConnection.addTrack(videoTrack, stream);
        }
      }
    } catch (error) {
      console.error('Error starting screen sharing:', error);
    }
    console.log("start sharing.")
    setScreenShare(true);
  }

  const stopScreenSharing = async () => {
    if (screenStream){
      screenStream.getTracks().forEach((track) => track.stop());
      setStreamSharing(null);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});

      if (localVideoref.current){
        localVideoref.current.srcObject = stream;
      }
      if (currentPeer.current) {
        const videoTrack = stream.getVideoTracks()[0];
        const sender = currentPeer.current.peerConnection.getSenders().find((s) => s.track.kind === videoTrack.kind);
        if (sender) {

          sender.replaceTrack(videoTrack);
        } else {
          console.log("Sender not found, renegotiating call...");
        }
      }
    } catch (error) {
      console.error("Error restarting webcam after screen sharing:", error);
    }

    setScreenShare(false);
  }

  const endCall = () => {
    if (peer){
      peer.destroy();
      setPeer(null);
    }

    if (localVideoref.current && localVideoref.current.srcObject){
      localVideoref.current.srcObject.getTracks().forEach((track) => track.stop());
      localVideoref.current.srcObject = null;
    }

    if (remoteVideoref.current && remoteVideoref.current.srcObject){
      remoteVideoref.current.srcObject.getTracks().forEach((track) => track.stop());
      remoteVideoref.current.srcObject = null;
    }

    setJoin(false);
    setRoomId("");
  }
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="container mx-auto p-6">
          {!join ? (
            <div className="flex flex-col items-center space-y-4 bg-gray-800 p-6 rounded-lg shadow-lg">
              <input type="text" value={RoomId} onChange={(e) => setRoomId(e.target.value)} className="p-2 text-black rounded-md w-64" placeholder="Enter Room ID"/>
              <div className="flex space-x-4">
                <button onClick={handleCreateRoom} className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg">Create Room</button>
                <button onClick={handleJoinRoom} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg">Join Room</button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="video-container p-4 bg-gray-700 rounded-lg shadow-md">
                  <p className="text-center text-sm opacity-75">You</p>
                  <video autoPlay ref={localVideoref} className="rounded-md w-full h-auto"></video>
                </div>
                <div className="video-container p-4 bg-gray-700 rounded-lg shadow-md">
                  <p className="text-center text-sm opacity-75">Remote</p>
                  <video autoPlay ref={remoteVideoref} className="rounded-md w-full h-auto"></video>
                </div>
              </div>

              <div className="flex justify-center mt-4 space-x-4">
                <button onClick={endCall} className="px-6 py-2 bg-red-500 hover:bg-red-600 rounded-lg">End Call</button>
                <button onClick={screenShare ? stopScreenSharing : shareScreen} className={`px-6 py-2 rounded-lg ${screenShare ? "bg-yellow-500 hover:bg-yellow-600" : "bg-gray-500 hover:bg-gray-600"}`}> {screenShare ? "Stop Sharing" : "Share Screen"}</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default VideoChat