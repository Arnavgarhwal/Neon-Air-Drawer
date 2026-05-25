export const GESTURES = {
  IDLE: 'IDLE',
  DRAW: 'DRAW',
  ERASE: 'ERASE',
  CLEAR: 'CLEAR',
  MOVE: 'MOVE',
};

export class GestureController {
  constructor() {
    this.currentGesture = GESTURES.IDLE;
    this.lastGesture = GESTURES.IDLE;
    this.gestureStartTime = Date.now();
  }

  detectGesture(landmarks) {
    if (!landmarks) return GESTURES.IDLE;

    const isFingerUp = (fingerIndex) => {
      // Finger indices: 0:Thumb, 1:Index, 2:Middle, 3:Ring, 4:Pinky
      // Landmarks: Thumb(4), Index(8), Middle(12), Ring(16), Pinky(20)
      const tip = landmarks[fingerIndex * 4 + 4];
      const pip = landmarks[fingerIndex * 4 + 2];
      return tip.y < pip.y;
    };

    const thumbUp = isFingerUp(0);
    const indexUp = isFingerUp(1);
    const middleUp = isFingerUp(2);
    const ringUp = isFingerUp(3);
    const pinkyUp = isFingerUp(4);

    // 1. Pinch (Thumb + Index close) -> ERASE
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const distance = Math.sqrt(
      Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2)
    );
    if (distance < 0.05) {
      return GESTURES.ERASE;
    }

    // 2. Fist (No fingers up) -> CLEAR (Maybe needs a hold time)
    if (!indexUp && !middleUp && !ringUp && !pinkyUp && !thumbUp) {
      return GESTURES.CLEAR;
    }

    // 3. Two Fingers (Index + Middle) -> MOVE
    // Ignore thumb as thumb position can be ambiguous
    if (indexUp && middleUp && !ringUp && !pinkyUp) {
      return GESTURES.MOVE;
    }

    // 4. Index Finger ONLY (Pointing hand) -> DRAW
    // Ignore thumb as thumb position can be ambiguous while pointing
    if (indexUp && !middleUp && !ringUp && !pinkyUp) {
      return GESTURES.DRAW;
    }

    return GESTURES.IDLE;
  }

  update(landmarks) {
    const detected = this.detectGesture(landmarks);
    if (detected !== this.currentGesture) {
      this.lastGesture = this.currentGesture;
      this.currentGesture = detected;
      this.gestureStartTime = Date.now();
    }
    return this.currentGesture;
  }
}
