# 🌌 Neon Air Draw — AI Spatial Interface
                                                     
A high-performance, real-time AI air drawing web application that utilizes advanced hand tracking for a "Minority Report" style spatial interface. 

Draw in the air with your dominant hand and manipulate your creations in real-time with your non-dominant hand using intuitive gestures (Move, Scale, Rotate).

## ✨ Key Features

*   **✋ Dual-Hand Interaction**: 
    *   **Right Hand (Dominant)**: Handles high-precision drawing, selective erasing, and canvas clearing.
    *   **Left Hand (Secondary)**: Dedicated to spatial transformations (Move, Scale, Rotate) of existing strokes.
*   **📐 Non-Destructive Transforms**: Strokes retain their original coordinate data. All manipulations (TX, TY, Scale, Rotation) are applied at render time via matrix-based math.
*   **🕶️ Minimalist Glassmorphism UI**: A premium, aesthetic interface with real-time HUD and visual feedback guides.
*   **⚡ High Performance**: Native WebGL-based rendering engine optimized for 60FPS fluid interactions.
*   **🌀 Physics-Based Interaction**: Smooth inertia on stroke movement and snap-to-angle (45°) for rotation.
*   **📖 Gesture Guide**: Built-in interactive manual explaining every movement.

## 🛠️ Tech Stack

*   **Frontend**: React + Vite
*   **Hand Tracking**: @mediapipe/hands
*   **Animations**: Framer Motion
*   **Icons**: Lucide React (with custom inline SVG fallbacks for brand icons)
*   **Styling**: Vanilla CSS (Modern Glassmorphism & Neon Aesthetics)

## 🎮 Gesture Manual

### ✍️ Drawing Hand (Right Hand)
| Gesture | Action |
|---|---|
| ☝️ **Index Up** | Start drawing a stroke |
| 🤏 **Pinch** | Selective eraser (intersects with fingertip path) |
| ✊ **Fist** | Clear the entire canvas |

### 🖐️ Control Hand (Left Hand)
| Gesture | Action | Visual Feedback |
|---|---|---|
| ✌️ **Two Fingers** | **Move** nearest stroke | Blue crosshair + glow |
| 🤏 **Pinch & Spread** | **Scale** stroke size | Concentric rings + % label |
| 🤚 **Open Palm** | **Rotate** stroke | Orange arc + snap points |

## 🚀 Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Run Development Server**:
    ```bash
    npm run dev
    ```
3.  **Use**: Grant camera permissions and raise your hands in view!

## 👨‍💻 Developer
**Arnav Garhwal**  
🐙 GitHub: [Arnavgarhwal](https://github.com/Arnavgarhwal)

---
*Built with passion for AI and Spatial Computing.*
