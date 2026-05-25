import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { DrawingEngine } from '../modules/drawingEngine';
import { StrokeManager } from '../modules/strokeManager';
import { InteractionEngine } from '../modules/interactionEngine';
import { TransformEngine } from '../modules/transformEngine';

const DrawingCanvas = forwardRef(({ 
  settings, gesture, landmark,
  controlGesture, controlLandmark, controlPinchDelta, controlAngleDelta
}, ref) => {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const managerRef = useRef(null);
  const interactionRef = useRef(null);
  const transformRef = useRef(null);

  // Current in-progress path
  const currentPathRef = useRef(null);
  const lastPointRef = useRef(null);

  // Track control gesture for rendering
  const controlGestureRef = useRef('CTRL_IDLE');

  useImperativeHandle(ref, () => ({
    clear: () => managerRef.current?.clear(),
    undo: () => managerRef.current?.undo(),
    redo: () => managerRef.current?.redo(),
    save: () => engineRef.current?.saveAsImage(),
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    managerRef.current = new StrokeManager();
    interactionRef.current = new InteractionEngine(managerRef.current);
    transformRef.current = new TransformEngine(managerRef.current);
    engineRef.current = new DrawingEngine(canvas);

    let animationFrameId;
    const renderLoop = () => {
      if (engineRef.current && managerRef.current) {
        const selectedId = transformRef.current?.getSelectedStrokeId() 
          ?? interactionRef.current?.getSelectedStrokeId() 
          ?? null;
        engineRef.current.draw(
          managerRef.current.getAllStrokes(),
          currentPathRef.current,
          selectedId,
          controlGestureRef.current
        );
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const saveCurrentPath = () => {
    if (currentPathRef.current) {
      managerRef.current.addStroke(
        currentPathRef.current.points,
        currentPathRef.current.color,
        currentPathRef.current.lineWidth,
        currentPathRef.current.glowIntensity
      );
      currentPathRef.current = null;
      lastPointRef.current = null;
    }
  };

  // === PRIMARY HAND: Drawing gestures ===
  useEffect(() => {
    if (!landmark || !managerRef.current || !interactionRef.current) return;

    const x = (1 - landmark.x) * canvasRef.current.width;
    const y = landmark.y * canvasRef.current.height;

    switch (gesture) {
      case 'DRAW':
        if (!currentPathRef.current) {
          currentPathRef.current = {
            points: [{ x, y }],
            color: settings.color,
            lineWidth: settings.lineWidth,
            glowIntensity: settings.glowIntensity,
          };
          lastPointRef.current = { x, y };
        } else {
          const smoothFactor = 0.15;
          const smoothedX = lastPointRef.current.x * smoothFactor + x * (1 - smoothFactor);
          const smoothedY = lastPointRef.current.y * smoothFactor + y * (1 - smoothFactor);
          currentPathRef.current.points.push({ x: smoothedX, y: smoothedY });
          lastPointRef.current = { x: smoothedX, y: smoothedY };
        }
        break;

      case 'ERASE':
        saveCurrentPath();
        interactionRef.current.handleErase(x, y);
        break;

      case 'CLEAR':
        saveCurrentPath();
        managerRef.current.clear();
        break;

      default:
        saveCurrentPath();
        break;
    }
  }, [gesture, landmark, settings]);

  // === SECONDARY HAND: Control gestures (move/scale/rotate) ===
  useEffect(() => {
    if (!transformRef.current) return;
    controlGestureRef.current = controlGesture || 'CTRL_IDLE';

    if (!controlLandmark) {
      transformRef.current.releaseAll();
      return;
    }

    const x = (1 - controlLandmark.x) * canvasRef.current.width;
    const y = controlLandmark.y * canvasRef.current.height;

    switch (controlGesture) {
      case 'CTRL_MOVE':
        transformRef.current.handleMove(x, y);
        break;

      case 'CTRL_SCALE':
        // First, select nearest if not already selected
        transformRef.current.selectNearest(x, y);
        transformRef.current.handleScale(controlPinchDelta || 0);
        break;

      case 'CTRL_ROTATE':
        transformRef.current.selectNearest(x, y);
        transformRef.current.handleRotate(controlAngleDelta || 0);
        break;

      default:
        transformRef.current.releaseAll();
        break;
    }
  }, [controlGesture, controlLandmark, controlPinchDelta, controlAngleDelta]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 10,
        pointerEvents: 'none',
      }}
    />
  );
});

export default DrawingCanvas;
