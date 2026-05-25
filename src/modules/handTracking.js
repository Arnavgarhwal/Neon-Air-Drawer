// Using global MediaPipe from CDN (added in index.html) to avoid Vite bundling issues
const getHandsConstructor = () => {
  if (typeof window !== 'undefined' && window.Hands) return window.Hands;
  return null;
};

export class HandTracker {
  constructor(onResults) {
    const HandsConstructor = getHandsConstructor();
    if (!HandsConstructor) {
      console.error('MediaPipe Hands not found. Ensure @mediapipe/hands is installed or CDN is loaded.');
      throw new Error('MediaPipe Hands not found');
    }

    this.hands = new HandsConstructor({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    this.hands.onResults(onResults);
  }

  async send(image) {
    await this.hands.send({ image });
  }

  static getLandmark(results, index) {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      return results.multiHandLandmarks[0][index];
    }
    return null;
  }

  static isFingerUp(landmarks, fingerIndex) {
    // MediaPipe Hand Landmarks: 
    // Thumb: 4, Index: 8, Middle: 12, Ring: 16, Pinky: 20
    // Tip is further up (y is smaller) than the PIP joint (tip-2)
    const tip = landmarks[fingerIndex * 4 + 4];
    const pip = landmarks[fingerIndex * 4 + 2];
    return tip.y < pip.y;
  }
}
