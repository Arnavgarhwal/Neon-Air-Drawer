/**
 * TransformEngine: Applies non-destructive move/scale/rotate transforms to strokes.
 * Strokes retain their original point data; transforms are applied at render time.
 */
export class TransformEngine {
  constructor(strokeManager) {
    this.strokeManager = strokeManager;

    // Selection state
    this.selectedStrokeId = null;
    this.lastX = null;
    this.lastY = null;
    this.moveThreshold = 60; // px distance to grab

    // Inertia
    this.velocityX = 0;
    this.velocityY = 0;
    this.inertiaDecay = 0.92;
    this.inertiaActive = false;
    this._inertiaFrame = null;
  }

  // ========================
  // SELECTION
  // ========================

  selectNearest(x, y) {
    if (this.selectedStrokeId !== null) return; // already holding

    // Hit-test against transformed (visually rendered) positions
    let closestId = null;
    let closestDist = this.moveThreshold;

    for (const stroke of this.strokeManager.getAllStrokes()) {
      const tPoints = TransformEngine.getTransformedPoints(stroke);
      for (let i = 0; i < tPoints.length - 1; i++) {
        const dist = this._distToSegment(x, y, tPoints[i].x, tPoints[i].y, tPoints[i+1].x, tPoints[i+1].y);
        if (dist < closestDist) {
          closestDist = dist;
          closestId = stroke.id;
        }
      }
      if (tPoints.length === 1) {
        const dx = x - tPoints[0].x, dy = y - tPoints[0].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < closestDist) { closestDist = dist; closestId = stroke.id; }
      }
    }

    if (closestId !== null) {
      this.selectedStrokeId = closestId;
      this.lastX = x;
      this.lastY = y;
      this._stopInertia();
    }
  }

  _distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    if (dx === 0 && dy === 0) return Math.sqrt((px-x1)**2 + (py-y1)**2);
    const t = Math.max(0, Math.min(1, ((px-x1)*dx + (py-y1)*dy) / (dx*dx + dy*dy)));
    const nx = x1 + t*dx, ny = y1 + t*dy;
    return Math.sqrt((px-nx)**2 + (py-ny)**2);
  }

  getSelectedStrokeId() {
    return this.selectedStrokeId;
  }

  // ========================
  // MOVE
  // ========================

  handleMove(x, y) {
    if (this.selectedStrokeId === null) {
      this.selectNearest(x, y);
      return;
    }

    const stroke = this.strokeManager.getStroke(this.selectedStrokeId);
    if (!stroke) return;

    if (this.lastX !== null && this.lastY !== null) {
      const dx = x - this.lastX;
      const dy = y - this.lastY;
      stroke.transform.tx += dx;
      stroke.transform.ty += dy;

      // Track velocity for inertia
      this.velocityX = dx;
      this.velocityY = dy;
    }
    this.lastX = x;
    this.lastY = y;
  }

  // ========================
  // SCALE
  // ========================

  handleScale(pinchDelta) {
    if (this.selectedStrokeId === null) return;

    const stroke = this.strokeManager.getStroke(this.selectedStrokeId);
    if (!stroke) return;

    // pinchDelta is the change in normalized pinch distance
    // Multiply by a sensitivity factor to make it feel responsive
    const scaleFactor = 1 + (pinchDelta * 8);
    stroke.transform.scale *= scaleFactor;

    // Clamp scale
    stroke.transform.scale = Math.max(0.1, Math.min(5, stroke.transform.scale));
  }

  // ========================
  // ROTATE
  // ========================

  handleRotate(angleDelta) {
    if (this.selectedStrokeId === null) return;

    const stroke = this.strokeManager.getStroke(this.selectedStrokeId);
    if (!stroke) return;

    stroke.transform.rotation += angleDelta;
  }

  /**
   * Snap the selected stroke's rotation to nearest 45° increment.
   */
  snapRotation() {
    if (this.selectedStrokeId === null) return;
    const stroke = this.strokeManager.getStroke(this.selectedStrokeId);
    if (!stroke) return;

    const snap = Math.PI / 4; // 45 degrees
    stroke.transform.rotation = Math.round(stroke.transform.rotation / snap) * snap;
  }

  // ========================
  // RELEASE + INERTIA
  // ========================

  releaseAll() {
    if (this.selectedStrokeId !== null) {
      // Snap rotation on release
      this.snapRotation();

      // Start inertia if there's velocity
      if (Math.abs(this.velocityX) > 0.5 || Math.abs(this.velocityY) > 0.5) {
        this._startInertia();
      }
    }

    this.selectedStrokeId = null;
    this.lastX = null;
    this.lastY = null;
  }

  _startInertia() {
    const strokeId = this.selectedStrokeId;
    this.inertiaActive = true;

    const tick = () => {
      const stroke = this.strokeManager.getStroke(strokeId);
      if (!stroke || !this.inertiaActive) {
        this.inertiaActive = false;
        return;
      }

      this.velocityX *= this.inertiaDecay;
      this.velocityY *= this.inertiaDecay;

      stroke.transform.tx += this.velocityX;
      stroke.transform.ty += this.velocityY;

      if (Math.abs(this.velocityX) < 0.1 && Math.abs(this.velocityY) < 0.1) {
        this.inertiaActive = false;
        return;
      }

      this._inertiaFrame = requestAnimationFrame(tick);
    };

    this._inertiaFrame = requestAnimationFrame(tick);
  }

  _stopInertia() {
    this.inertiaActive = false;
    if (this._inertiaFrame) {
      cancelAnimationFrame(this._inertiaFrame);
      this._inertiaFrame = null;
    }
    this.velocityX = 0;
    this.velocityY = 0;
  }

  // ========================
  // STATIC UTILITY: Apply transform to points for rendering
  // ========================

  static getTransformedPoints(stroke) {
    const { tx, ty, scale, rotation } = stroke.transform;
    
    // Calculate center of original points
    let cx = 0, cy = 0;
    for (const p of stroke.points) {
      cx += p.x;
      cy += p.y;
    }
    cx /= stroke.points.length;
    cy /= stroke.points.length;

    return stroke.points.map(p => {
      // Translate to origin
      let x = p.x - cx;
      let y = p.y - cy;

      // Scale
      x *= scale;
      y *= scale;

      // Rotate
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const rx = x * cos - y * sin;
      const ry = x * sin + y * cos;

      // Translate back + apply position offset
      return {
        x: rx + cx + tx,
        y: ry + cy + ty,
      };
    });
  }
}
