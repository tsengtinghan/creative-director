# mmstudio (demo v1)

**A direct-manipulation interface for interacting with multimodal generative models**

---

## Core principle

**Everything the model needs to understand user intent is represented _inside the image itself_.**

- Brushstrokes → spatial & compositional intent
- Text inside the image → semantic & stylistic intent
- Mask regions → scope and locality of change

---

## Why an infinite canvas with nodes?

**Because exploration and comparison are first-class creative actions.**

- Generative work is not linear; users branch, compare, discard, and return.
- A node-based infinite canvas:
  - externalizes iteration history
  - makes alternatives spatially comparable
  - encourages deliberate exploration instead of blind retries

Each node is a _result_, not a message in a chat log.

---

## System overview

mmstudio has **two surfaces** that coexist on one page:

1. **Canvas** — global workspace for exploration and comparison
2. **Editor** — local, direct manipulation of a single image

You never "navigate away." You zoom in and act.

---

## 1) Canvas

**Purpose:** explore, compare, branch.

### What lives on the canvas

- Image nodes (thumbnails)
- Edges showing derivation (parent → child)
- Spatial grouping by the user (manual layout)

### Interactions

- Pan / zoom infinite canvas
- Click to select nodes
- Multi-select for comparison
- **Double-click a node → enter Editor mode**
- Generate from any node → creates a child node

### Why this matters

- Makes the _search process_ visible
- Encourages side-by-side reasoning
- Reinforces user agency: "I chose this path"

(Implementation: **xyflow** as the backbone)

---

## 2) Editor (overlay mode)

**Purpose:** direct the model by marking up the image itself.

Editor is a mode, not a page:

- Canvas dims
- Selected image expands into a central stage
- Tool dock appears
- Escape → return to canvas

(Implementation: **react-konva**)

---

## Editor toolset

**Everything is selectable, transformable, and visible.**

### Tools in the dock

- **Brush / Pen**
  - Variable thickness
- **Eraser**
- **Lasso / Select**
- **Text**
- **Mask region**

---

### Universal interaction rules

- Any stroke, text, or mask:
  - can be selected
  - can be dragged
  - can be scaled
  - can be rotated
- Selection is the primary operation
- Manipulation feels like a design tool, not a form

This is critical for **embodied agency**.

---

## Text inside the image (unified)

Text is just text:

- "kodak film camera"
- "make this thinner"
- "baseball cap watercolor style"
- "do not change background"

There is **no semantic distinction** enforced by the system.

The model interprets text because it sees it — the same way a human would.

This avoids over-formalizing intent and keeps creative flexibility.

---

## Mask region (explicit scope of intent)

**Mask is how users define _where_ text applies.**

- User brushes a translucent region on top of the image
- Mask is visibly present
- Mask is editable like strokes

### Binding

- user construct binding
  Binding is **user-constructed**, not inferred by model:
  - Place text near a sketch
  - Brush a mask over the intended area
  - The pairing is intentional and visible
    This:
  - avoids ambiguity (model might wrongly relate a text to a different sketch if no mask)
  - gives users agency
  - reinforces direct manipulation
    When exported, the mask remains visible in the instruction image

---

## Generation loop

1. User edits image with strokes, text, and masks
2. System composites:
   - base image
   - all overlays (strokes, text, masks)
3. This composite image is sent to **Nano Banana**
4. Model returns generated image(s)
5. Each result becomes a **new node** on the canvas

### UI affordance

A small preview panel inside Editor:

- Button: **Generate**
- Sends:
  - composited instruction image (base + overlay)
  - optional global text prompt (keep in UI but not required)
  - seed (optional)
- Receives:
  - output image(s)

This improves trust and understanding.

---

## Versioning & comparison

- Every node stores:
  - output image
  - instruction image
  - editable overlay state
- Users can:
  - reopen any node and continue editing
  - branch from any point
  - compare siblings (side-by-side or flicker)

This turns generation into _deliberate iteration_, not gambling.

---

---

## What mmstudio (demo v1) explicitly has

**Canvas**

- Infinite workspace
- Node-based version history
- Branching from any image
- Visual comparison

**Editor**

- Brush, eraser, select, text, mask
- Everything selectable and transformable
- No hidden prompts
- Visible instruction image

---

## Tech stack

pnpm, nextjs, tailwindcss, shadcn, framer, xyflow, react konva, gemini ai
