"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { CameraOff, Loader2 } from "lucide-react";

export type CameraState = "idle" | "starting" | "running" | "denied" | "unsupported" | "error";

/**
 * Camera viewfinder that decodes QR codes from frames on an offscreen canvas.
 * Decoding is throttled to ~8fps; scanning every animation frame burns battery on a
 * phone for no extra hit rate.
 */
export function QrScanner({
  active,
  onDetected,
}: {
  active: boolean;
  onDetected: (text: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScanRef = useRef(0);
  const detectedRef = useRef(false);
  const [state, setState] = useState<CameraState>("idle");

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const video = videoRef.current;
    const stream = video?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    if (video) video.srcObject = null;
  }, []);

  useEffect(() => {
    if (!active) {
      stop();
      setState("idle");
      return;
    }

    detectedRef.current = false;
    let cancelled = false;

    async function start() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setState("unsupported");
        return;
      }

      setState("starting");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setState("running");
        rafRef.current = requestAnimationFrame(tick);
      } catch (error) {
        if (cancelled) return;
        const name = (error as DOMException)?.name;
        setState(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error");
      }
    }

    function tick(timestamp: number) {
      rafRef.current = requestAnimationFrame(tick);
      if (detectedRef.current) return;
      if (timestamp - lastScanRef.current < 125) return;
      lastScanRef.current = timestamp;

      const video = videoRef.current;
      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) return;

      const canvas = (canvasRef.current ??= document.createElement("canvas"));
      // Downscale before decoding; full sensor resolution is wasted work.
      const scale = Math.min(1, 480 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      if (canvas.width === 0 || canvas.height === 0) return;

      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(image.data, image.width, image.height, {
        inversionAttempts: "dontInvert",
      });

      if (result?.data) {
        detectedRef.current = true;
        onDetected(result.data);
      }
    }

    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [active, onDetected, stop]);

  return (
    <div className="absolute inset-0">
      <video
        ref={videoRef}
        playsInline
        muted
        aria-label="Camera viewfinder"
        className="size-full object-cover"
      />
      {state !== "running" ? <CameraPlaceholder state={state} /> : null}
    </div>
  );
}

function CameraPlaceholder({ state }: { state: CameraState }) {
  const copy: Record<Exclude<CameraState, "running">, { title: string; body: string }> = {
    idle: { title: "Camera paused", body: "Tap the viewfinder to start scanning." },
    starting: { title: "Starting camera…", body: "Allow camera access to scan a code." },
    denied: {
      title: "Camera permission denied",
      body: "Paste the payload below, or pick a demo code to continue.",
    },
    unsupported: {
      title: "Camera unavailable",
      body: "This browser or connection cannot open a camera. Use a demo code below.",
    },
    error: {
      title: "Camera could not start",
      body: "Another app may be using it. Use a demo code below.",
    },
  };

  const { title, body } = copy[state as Exclude<CameraState, "running">];

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface px-8 text-center">
      {state === "starting" ? (
        <Loader2 size={22} className="animate-spin text-ink-muted" aria-hidden="true" />
      ) : (
        <CameraOff size={22} className="text-ink-subtle" aria-hidden="true" />
      )}
      <p className="text-[13px] font-semibold text-ink">{title}</p>
      <p className="max-w-[16rem] text-[12px] leading-snug text-ink-muted">{body}</p>
    </div>
  );
}
