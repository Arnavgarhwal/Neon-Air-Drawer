import React, { useState, useRef, useCallback, useMemo } from 'react';
import CameraView from './components/CameraView';
import DrawingCanvas from './components/DrawingCanvas';
import HelpPanel from './components/HelpPanel';
import ControlPanel from './components/ControlPanel';
import { GestureInterpreter, CONTROL_GESTURES } from './modules/gestureInterpreter';
import { GESTURES } from './modules/gestureController';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

function App() {
  const [settings, setSettings] = useState({
    color: '#00ffff',
    lineWidth: 8,
    glowIntensity: 20,
  });

  // Primary hand (drawing)
  const [gesture, setGesture] = useState(GESTURES.IDLE);
  const [landmark, setLandmark] = useState(null);
  const [fingertips, setFingertips] = useState([]);

  // Secondary hand (control)
  const [controlGesture, setControlGesture] = useState(CONTROL_GESTURES.IDLE);
  const [controlLandmark, setControlLandmark] = useState(null);
  const [controlFingertips, setControlFingertips] = useState([]);
  const [controlPinchDelta, setControlPinchDelta] = useState(0);
  const [controlAngleDelta, setControlAngleDelta] = useState(0);

  const [cameraVisible, setCameraVisible] = useState(true);
  const [gesturesEnabled, setGesturesEnabled] = useState(true);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const canvasRef = useRef(null);
  const interpreter = useMemo(() => new GestureInterpreter(), []);

  const onResults = useCallback((results) => {
    if (!gesturesEnabled) {
      setGesture(GESTURES.IDLE);
      setLandmark(null);
      setFingertips([]);
      setControlGesture(CONTROL_GESTURES.IDLE);
      setControlLandmark(null);
      setControlFingertips([]);
      return;
    }

    const { primary, secondary } = interpreter.interpret(results);

    // Primary hand
    setGesture(primary.gesture);
    setLandmark(primary.landmark);
    setFingertips(primary.fingertips);

    // Secondary hand
    setControlGesture(secondary.gesture);
    setControlLandmark(secondary.landmark);
    setControlFingertips(secondary.fingertips);
    setControlPinchDelta(secondary.pinchDelta);
    setControlAngleDelta(secondary.angleDelta);
  }, [interpreter, gesturesEnabled]);

  const handleSave = () => {
    const dataUrl = canvasRef.current?.save();
    if (dataUrl) {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `air-drawing-${Date.now()}.png`;
      link.click();
    }
  };

  // Determine active mode label for the HUD
  const activeMode = controlGesture !== CONTROL_GESTURES.IDLE
    ? controlGesture.replace('CTRL_', '')
    : gesture;

  return (
    <div className="app-container">
      {cameraVisible && (
        <CameraView
          onResults={onResults}
        />
      )}

      <DrawingCanvas
        ref={canvasRef}
        settings={settings}
        gesture={gesture}
        landmark={landmark}
        controlGesture={controlGesture}
        controlLandmark={controlLandmark}
        controlPinchDelta={controlPinchDelta}
        controlAngleDelta={controlAngleDelta}
      />

      <ControlPanel
        settings={settings}
        onSettingsChange={(newSettings) => setSettings(prev => ({ ...prev, ...newSettings }))}
        onClear={() => canvasRef.current?.clear()}
        onUndo={() => canvasRef.current?.undo()}
        onRedo={() => canvasRef.current?.redo()}
        onSave={handleSave}
        onToggleCamera={() => setCameraVisible(!cameraVisible)}
        cameraVisible={cameraVisible}
        gestureVisible={gesturesEnabled}
        onToggleGestures={() => setGesturesEnabled(!gesturesEnabled)}
        onHelp={() => setIsHelpOpen(true)}
      />

      <HelpPanel isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* Floating Gesture Status */}
      <AnimatePresence>
        {activeMode !== 'IDLE' && activeMode !== CONTROL_GESTURES.IDLE && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="gesture-status glass-meta"
          >
            {activeMode} MODE
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Hand Fingertip Indicators */}
      {fingertips.map((tip, i) => {
        if (!tip) return null;
        const x = (1 - tip.x) * window.innerWidth;
        const y = tip.y * window.innerHeight;

        let size = '10px';
        let opacity = 0.6;
        let color = settings.color;
        let shadow = `0 0 10px 2px ${color}`;

        if (i === 1) { // Index finger
          if (gesture === 'ERASE') {
            size = '60px';
            color = 'transparent';
            shadow = '0 0 15px 4px rgba(255, 0, 0, 0.8), inset 0 0 10px 2px rgba(255, 0, 0, 0.5)';
            opacity = 1;
          } else {
            size = '16px';
            opacity = 1;
            shadow = `0 0 15px 4px ${color}`;
          }
        }

        return (
          <div
            key={`p-${i}`}
            style={{
              position: 'fixed',
              left: x, top: y,
              width: size, height: size,
              backgroundColor: color,
              border: gesture === 'ERASE' ? '2px solid rgba(255, 50, 50, 0.8)' : 'none',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              boxShadow: shadow,
              opacity,
              zIndex: 40,
              pointerEvents: 'none',
              transition: 'width 0.1s, height 0.1s',
            }}
          />
        );
      })}

      {/* Secondary Hand Fingertip Indicators (distinct style) */}
      {controlFingertips.map((tip, i) => {
        if (!tip) return null;
        const x = (1 - tip.x) * window.innerWidth;
        const y = tip.y * window.innerHeight;

        let size = '10px';
        let opacity = 0.5;
        let color = 'transparent';
        let shadow = '0 0 8px 2px rgba(255, 165, 0, 0.5)';
        let border = '1.5px solid rgba(255, 165, 0, 0.6)';

        // Index finger of control hand
        if (i === 1) {
          size = '18px';
          opacity = 1;
          if (controlGesture === CONTROL_GESTURES.MOVE) {
            shadow = '0 0 20px 4px rgba(100, 180, 255, 0.8)';
            border = '2px solid rgba(100, 180, 255, 0.8)';
          } else if (controlGesture === CONTROL_GESTURES.SCALE) {
            shadow = '0 0 20px 4px rgba(0, 255, 200, 0.8)';
            border = '2px solid rgba(0, 255, 200, 0.8)';
          } else if (controlGesture === CONTROL_GESTURES.ROTATE) {
            shadow = '0 0 20px 4px rgba(255, 165, 0, 0.8)';
            border = '2px solid rgba(255, 165, 0, 0.8)';
          }
        }

        return (
          <div
            key={`s-${i}`}
            style={{
              position: 'fixed',
              left: x, top: y,
              width: size, height: size,
              backgroundColor: color,
              border,
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              boxShadow: shadow,
              opacity,
              zIndex: 40,
              pointerEvents: 'none',
              transition: 'width 0.1s, height 0.1s',
            }}
          />
        );
      })}

      {!landmark && !controlLandmark && (
        <div className="overlay-message">
          👋 Raise your hand to start drawing
        </div>
      )}
    </div>
  );
}

export default App;
