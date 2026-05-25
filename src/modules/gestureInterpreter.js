import { GestureController, GESTURES } from './gestureController';

/**
 * Control gestures for the secondary (non-dominant) hand.
 */
export const CONTROL_GESTURES = {
  IDLE: 'CTRL_IDLE',
  MOVE: 'CTRL_MOVE',
  SCALE: 'CTRL_SCALE',
  ROTATE: 'CTRL_ROTATE',
};

/**
 * Interprets gestures from two hands simultaneously.
 * Primary hand (right by default) → drawing gestures
 * Secondary hand (left by default) → control/transform gestures
 */
export class GestureInterpreter {
  constructor() {
    this.primaryController = new GestureController();

    // Secondary hand state
    this.controlGesture = CONTROL_GESTURES.IDLE;

    // Scale tracking: distance between thumb and index on secondary hand
    this.lastPinchDistance = null;

    // Rotate tracking: angle of the hand
    this.lastHandAngle = null;

    // Gesture smoothing: require N consecutive frames of a new gesture before switching
    this._lastControlGesture = CONTROL_GESTURES.IDLE;
    this._idleFrameCount = 0;
    this._idleFramesRequired = 4; // Need 4 consecutive IDLE frames before releasing
  }

  /**
   * Process results from MediaPipe Hands.
   * @param {Object} results - MediaPipe results with multiHandLandmarks and multiHandedness
   * @returns {{ primary, secondary }} - Gesture data for both hands
   */
  interpret(results) {
    const output = {
      primary: {
        gesture: GESTURES.IDLE,
        landmark: null,      // Index fingertip (landmark 8)
        fingertips: [],
      },
      secondary: {
        gesture: CONTROL_GESTURES.IDLE,
        landmark: null,
        fingertips: [],
        pinchDelta: 0,       // Change in pinch distance (for scaling)
        angleDelta: 0,       // Change in wrist angle (for rotation)
      },
    };

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      this.lastPinchDistance = null;
      this.lastHandAngle = null;
      return output;
    }

    // --- Assign roles based on handedness ---
    let primaryLandmarks = null;
    let secondaryLandmarks = null;

    if (results.multiHandLandmarks.length === 1) {
      // Only one hand: treat it as primary (drawing hand)
      primaryLandmarks = results.multiHandLandmarks[0];
      this.lastPinchDistance = null;
      this.lastHandAngle = null;
    } else if (results.multiHandLandmarks.length >= 2) {
      // Two hands detected: use handedness to assign roles
      const handedness = results.multiHandedness || [];

      let primaryIdx = 0;
      let secondaryIdx = 1;

      // MediaPipe reports handedness from the camera's perspective (mirrored).
      // "Right" label = user's left hand, "Left" label = user's right hand.
      // We want user's right hand = primary = "Left" label in MediaPipe.
      if (handedness.length >= 2) {
        const label0 = handedness[0]?.label || '';
        if (label0 === 'Right') {
          // Index 0 is user's left hand → secondary
          primaryIdx = 1;
          secondaryIdx = 0;
        }
      }

      primaryLandmarks = results.multiHandLandmarks[primaryIdx];
      secondaryLandmarks = results.multiHandLandmarks[secondaryIdx];
    }

    // --- Process Primary Hand ---
    if (primaryLandmarks) {
      output.primary.gesture = this.primaryController.update(primaryLandmarks);
      output.primary.landmark = primaryLandmarks[8]; // Index fingertip
      output.primary.fingertips = [4, 8, 12, 16, 20].map(i => primaryLandmarks[i]);
    }

    // --- Process Secondary Hand ---
    if (secondaryLandmarks) {
      const result = this._detectControlGesture(secondaryLandmarks);
      const rawGesture = result.gesture;

      // Gesture smoothing: prevent flickering
      if (rawGesture === CONTROL_GESTURES.IDLE) {
        this._idleFrameCount++;
        if (this._idleFrameCount < this._idleFramesRequired && this._lastControlGesture !== CONTROL_GESTURES.IDLE) {
          // Not enough idle frames yet — keep previous gesture alive
          result.gesture = this._lastControlGesture;
        } else {
          this._lastControlGesture = CONTROL_GESTURES.IDLE;
        }
      } else {
        this._idleFrameCount = 0;
        this._lastControlGesture = rawGesture;
      }

      output.secondary.gesture = result.gesture;
      output.secondary.landmark = secondaryLandmarks[8];
      output.secondary.fingertips = [4, 8, 12, 16, 20].map(i => secondaryLandmarks[i]);
      output.secondary.pinchDelta = result.pinchDelta;
      output.secondary.angleDelta = result.angleDelta;
    } else {
      this.lastPinchDistance = null;
      this.lastHandAngle = null;
      this._lastControlGesture = CONTROL_GESTURES.IDLE;
      this._idleFrameCount = 0;
    }

    return output;
  }

  /**
   * Detect control gesture from secondary hand landmarks.
   */
  _detectControlGesture(landmarks) {
    const result = { gesture: CONTROL_GESTURES.IDLE, pinchDelta: 0, angleDelta: 0 };

    const isFingerUp = (fingerIndex) => {
      const tip = landmarks[fingerIndex * 4 + 4];
      const pip = landmarks[fingerIndex * 4 + 2];
      return tip.y < pip.y;
    };

    const indexUp = isFingerUp(1);
    const middleUp = isFingerUp(2);
    const ringUp = isFingerUp(3);
    const pinkyUp = isFingerUp(4);

    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const wrist = landmarks[0];
    const middleBase = landmarks[9];

    // Pinch distance
    const pinchDist = Math.sqrt(
      Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2)
    );

    // Hand angle (wrist → middle finger base)
    const handAngle = Math.atan2(middleBase.y - wrist.y, middleBase.x - wrist.x);

    // === SCALE: Pinch gesture (thumb + index very close) ===
    if (pinchDist < 0.06) {
      result.gesture = CONTROL_GESTURES.SCALE;
      if (this.lastPinchDistance !== null) {
        result.pinchDelta = pinchDist - this.lastPinchDistance;
      }
      this.lastPinchDistance = pinchDist;
      this.lastHandAngle = null;
      return result;
    }
    this.lastPinchDistance = null;

    // === ROTATE: All fingers up (open palm) + wrist twist ===
    if (indexUp && middleUp && ringUp && pinkyUp) {
      result.gesture = CONTROL_GESTURES.ROTATE;
      if (this.lastHandAngle !== null) {
        result.angleDelta = handAngle - this.lastHandAngle;
        // Clamp to avoid huge jumps
        if (Math.abs(result.angleDelta) > Math.PI) result.angleDelta = 0;
      }
      this.lastHandAngle = handAngle;
      return result;
    }
    this.lastHandAngle = null;

    // === MOVE: Two fingers up (index + middle) ===
    if (indexUp && middleUp && !ringUp && !pinkyUp) {
      result.gesture = CONTROL_GESTURES.MOVE;
      return result;
    }

    return result;
  }
}
