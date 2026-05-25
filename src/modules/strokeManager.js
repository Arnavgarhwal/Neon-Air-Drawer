export class StrokeManager {
  constructor() {
    this.strokes = [];
    this.redoStack = [];
    this._nextId = 1;
  }

  addStroke(points, color, lineWidth, glowIntensity) {
    const newStroke = {
      id: this._nextId++,
      points: [...points],
      color,
      lineWidth,
      glowIntensity,
      transform: { tx: 0, ty: 0, scale: 1, rotation: 0 },
    };
    this.strokes.push(newStroke);
    this.redoStack = []; // Clear redo stack on new action
    return newStroke;
  }

  removeStroke(id) {
    this.strokes = this.strokes.filter(s => s.id !== id);
    // Note: To make erasing undo-able, we could save states. For now, simple removal.
  }

  undo() {
    if (this.strokes.length > 0) {
      this.redoStack.push(this.strokes.pop());
    }
  }

  redo() {
    if (this.redoStack.length > 0) {
      this.strokes.push(this.redoStack.pop());
    }
  }

  clear() {
    this.strokes = [];
    this.redoStack = [];
  }

  // Returns array of strokes that intersect with the given circle (x, y, radius)
  findIntersectingStrokes(x, y, radius) {
    const hits = [];
    for (const stroke of this.strokes) {
      if (this._doesStrokeIntersectCircle(stroke, x, y, radius)) {
        hits.push(stroke.id);
      }
    }
    return hits;
  }

  // Returns the nearest stroke ID if it's within the threshold distance, else null
  findNearestStroke(x, y, threshold) {
    let nearestId = null;
    let minDistance = threshold;

    for (const stroke of this.strokes) {
      for (let i = 0; i < stroke.points.length - 1; i++) {
        const dist = this._distanceToSegment(
          x, y,
          stroke.points[i].x, stroke.points[i].y,
          stroke.points[i + 1].x, stroke.points[i + 1].y
        );

        if (dist < minDistance) {
          minDistance = dist;
          nearestId = stroke.id;
        }
      }

      // Handle single point strokes
      if (stroke.points.length === 1) {
        const dx = x - stroke.points[0].x;
        const dy = y - stroke.points[0].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDistance) {
          minDistance = dist;
          nearestId = stroke.id;
        }
      }
    }

    return nearestId;
  }

  getStroke(id) {
    return this.strokes.find(s => s.id === id);
  }

  moveStroke(id, dx, dy) {
    const stroke = this.getStroke(id);
    if (!stroke) return;
    
    for (const pt of stroke.points) {
      pt.x += dx;
      pt.y += dy;
    }
  }

  getAllStrokes() {
    return this.strokes;
  }

  // --- Internal Math Helpers ---

  _doesStrokeIntersectCircle(stroke, cx, cy, radius) {
    for (let i = 0; i < stroke.points.length - 1; i++) {
      const dist = this._distanceToSegment(
        cx, cy,
        stroke.points[i].x, stroke.points[i].y,
        stroke.points[i + 1].x, stroke.points[i + 1].y
      );

      // Account for line width in intersection check.
      // E.g., if a line is 10px wide, and radius is 15px, they intersect if dist <= 20
      if (dist <= radius + (stroke.lineWidth / 2)) {
        return true;
      }
    }

    if (stroke.points.length === 1) {
      const dx = cx - stroke.points[0].x;
      const dy = cy - stroke.points[0].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius + (stroke.lineWidth / 2)) return true;
    }

    return false;
  }

  _distanceToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 0 && dy === 0) {
      const ddx = px - x1;
      const ddy = py - y1;
      return Math.sqrt(ddx * ddx + ddy * ddy);
    } // the stroke is a single point loosely speaking

    const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    if (t < 0) {
      const ddx = px - x1;
      const ddy = py - y1;
      return Math.sqrt(ddx * ddx + ddy * ddy);
    } else if (t > 1) {
      const ddx = px - x2;
      const ddy = py - y2;
      return Math.sqrt(ddx * ddx + ddy * ddy);
    }

    const nearestX = x1 + t * dx;
    const nearestY = y1 + t * dy;
    const ddx = px - nearestX;
    const ddy = py - nearestY;

    return Math.sqrt(ddx * ddx + ddy * ddy);
  }
}
