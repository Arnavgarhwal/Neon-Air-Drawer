export class InteractionEngine {
  constructor(strokeManager) {
    this.strokeManager = strokeManager;
    
    // Erase settings
    this.eraseRadius = 30; // Radius around fingertip
    
    // Move settings
    this.selectedStrokeId = null;
    this.lastX = null;
    this.lastY = null;
    this.moveThreshold = 40; // Max distance to grab a stroke
  }

  // --- Erase Mode ---
  handleErase(x, y) {
    const hits = this.strokeManager.findIntersectingStrokes(x, y, this.eraseRadius);
    for (const id of hits) {
      this.strokeManager.removeStroke(id);
    }
  }

  // --- Move Mode ---
  handleMoveStart(x, y) {
    // If we're not currently holding a stroke, try to find one
    if (this.selectedStrokeId === null) {
      const nearestId = this.strokeManager.findNearestStroke(x, y, this.moveThreshold);
      if (nearestId !== null) {
        this.selectedStrokeId = nearestId;
        this.lastX = x;
        this.lastY = y;
      }
    }
  }

  handleMove(x, y) {
    if (this.selectedStrokeId !== null) {
      // Calculate delta
      if (this.lastX !== null && this.lastY !== null) {
        const dx = x - this.lastX;
        const dy = y - this.lastY;
        this.strokeManager.moveStroke(this.selectedStrokeId, dx, dy);
      }
      this.lastX = x;
      this.lastY = y;
    } else {
      // Keep trying to catch one if they just brought fingers up but missed
      this.handleMoveStart(x, y);
    }
  }

  releaseAll() {
    this.selectedStrokeId = null;
    this.lastX = null;
    this.lastY = null;
  }

  getSelectedStrokeId() {
    return this.selectedStrokeId;
  }
}
