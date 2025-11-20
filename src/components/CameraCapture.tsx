import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { X, Camera } from "lucide-react";

interface Props {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

export const CameraCapture = ({ onCapture, onClose }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error("Camera error:", error);
      onClose();
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const handleCapture = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL("image/png");
      setCapturedImage(dataUrl);
      stopCamera(); // Turn off camera after capture
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera(); // Restart camera
  };

  const handleUsePhoto = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose(); // Close camera modal
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-50 p-4">
      {/* Close button */}
      <button className="absolute top-4 right-4" onClick={onClose}>
        <X className="w-8 h-8 text-white" />
      </button>

      {/* Live camera OR captured preview */}
      {!capturedImage ? (
        <video ref={videoRef} className="w-full max-w-md rounded-lg" autoPlay playsInline />
      ) : (
        <img src={capturedImage} className="w-full max-w-md rounded-lg" />
      )}

      {/* Buttons */}
      <div className="mt-6 w-full max-w-md flex justify-center gap-4">
        {!capturedImage ? (
          <Button onClick={handleCapture} className="w-full">
            <Camera className="w-4 h-4 mr-2" /> Capture
          </Button>
        ) : (
          <>
            <Button variant="outline" className="w-full" onClick={handleRetake}>
              Retake
            </Button>
            <Button className="w-full" onClick={handleUsePhoto}>
              Use Photo
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
