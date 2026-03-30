import React, { useMemo } from "react";
import { useGameEngine } from "../hooks/useGameEngine";
import { useGameUI } from "../../store/useGameUI";

/**
 * Main tactical map display.
 * Memoized to prevent unnecessary re-renders.
 * Scales 1 world km = 1 pixel (adjustable via zoom).
 */
export const TacticalMap: React.FC = React.memo(() => {
  const gameEngine = useGameEngine();
  const { selectedAircraftId, selectAircraft } = useGameUI();

  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const scale = useMemo(() => 2, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#333";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }

    gameEngine.aircraft.forEach((aircraft) => {
      const x = centerX + aircraft.position.x * scale;
      const y = centerY + aircraft.position.y * scale;

      const isSelected = aircraft.id === selectedAircraftId;
      const isHostile = false;

      ctx.fillStyle = isHostile ? "#ff4444" : "#44ff44";
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = "#ffff00";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = "#fff";
      ctx.font = "12px monospace";
      ctx.fillText(aircraft.spec.model.substring(0, 6), x + 8, y);
    });

    gameEngine.missiles.forEach((missile) => {
      const x = centerX + missile.position.x * scale;
      const y = centerY + missile.position.y * scale;

      ctx.fillStyle = "#ffaa00";
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [gameEngine.aircraft, gameEngine.missiles, selectedAircraftId, scale]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    gameEngine.aircraft.forEach((aircraft) => {
      const x = centerX + aircraft.position.x * scale;
      const y = centerY + aircraft.position.y * scale;

      const distance = Math.hypot(clickX - x, clickY - y);
      if (distance < 15) {
        selectAircraft(aircraft.id);
      }
    });
  };

  return (
    <div style={{ padding: "10px", backgroundColor: "#000", color: "#fff" }}>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        onClick={handleCanvasClick}
        style={{
          border: "1px solid #444",
          cursor: "crosshair",
          backgroundColor: "#0a0a0a",
        }}
      />
      <div style={{ marginTop: "10px", fontSize: "12px" }}>
        <div>Aircraft: {gameEngine.aircraft.size}</div>
        <div>Missiles: {gameEngine.missiles.size}</div>
        <div>Tick: {gameEngine.tick}</div>
      </div>
    </div>
  );
});

TacticalMap.displayName = "TacticalMap";
