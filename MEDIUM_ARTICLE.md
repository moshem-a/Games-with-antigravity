# From One Prompt to a 60fps Mobile Game: How to Build AI-Native Games with Google Antigravity, Subagents, Plugins, and Gemini Omni 1.2 Flash

*A complete step-by-step developer's blueprint—including the exact prompts, plugin setup (`game-dev` & `game-architect`), Nano Banana asset workflows, and parallel Gemini Omni 1.2 Flash video generation—deployed live to Google Cloud Run.*

- **Play the Live Game on Google Cloud Run**: [https://monster-rush-lost-island-880601596687.us-central1.run.app](https://monster-rush-lost-island-880601596687.us-central1.run.app)
- **Interactive HTML Guide on Cloud Run (`/docs`)**: [https://monster-rush-lost-island-880601596687.us-central1.run.app/docs](https://monster-rush-lost-island-880601596687.us-central1.run.app/docs)
- **Full Source Code on GitHub**: [https://github.com/moshem-a/Games-with-antigravity](https://github.com/moshem-a/Games-with-antigravity)

![Monster Rush: The Lost Island — Active 3-Lane Gameplay](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/screenshots/e2e_04_gameplay_running.png)

---

## Introduction: Why Game Development Is the Ultimate Test for Agentic AI

Building even a single polished mobile arcade game traditionally requires an entire studio pipeline:
1. **Creative Direction & Game Design**: Core loop, lane math, difficulty curves, and reward pacing.
2. **2D/3D Concept & Sprite Art**: A consistent hero character, seamless environment backdrops, collectibles, obstacles, and alpha-transparent sprite sheets.
3. **Cinematic Video & Cutscene Production**: An official launch trailer plus celebratory stage-completion cutscenes that reward players at the end of every level.
4. **60fps Game Engine Engineering**: Zero-garbage-collection memory pooling, high-DPI canvas scaling, perspective projection math, and responsive touch/keyboard input.
5. **Procedural Audio Synthesis**: Multi-harmonic sound effects that respect browser Web Audio gesture policies without bloating bundle size.
6. **Automated QA & Cloud Deployment**: Unit tests, headless browser end-to-end verification, and containerized deployment to production.

In this guide, we walk through **exact step-by-step instructions and prompts** showing how we built **Monster Rush: The Lost Island**—a 60fps 3-lane fantasy island runner—inside **Google Antigravity (AGY)** by installing the **`game-dev` plugin**, enabling the **`game-architect`** and **`image-generator` (Nano Banana)** subagents, and generating in-game cinematics with **Gemini Omni 1.2 Flash (`models/gemini-omni-1.2-flash`)**.

---

## 1. Watch the Gemini Omni 1.2 Flash Videos & Stage-Completion Cutscenes (on YouTube)

Every video below was generated using **Gemini Omni 1.2 Flash (`models/gemini-omni-1.2-flash`)**, conditioned on our canonical **Nano Banana** character and environment sheets:

1. **Official 15s AI Launch Trailer**: [Watch on YouTube](https://www.youtube.com/watch?v=Fxcztban6uY) | [Direct MP4](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/assets/monster_rush_trailer.mp4)

https://www.youtube.com/watch?v=Fxcztban6uY

2. **Stage 1 Complete Celebratory Cutscene (*"Great job! You completed Stage 1!"*)**: [Watch on YouTube](https://www.youtube.com/watch?v=7MsWvDHVNJ8) | [Direct MP4](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/videos/stage1-complete.mp4)

https://www.youtube.com/watch?v=7MsWvDHVNJ8

3. **Stage 2 Complete Celebratory Cutscene (*"Great job! You passed Stage 2! Let's go to Stage 3!"*)**: [Watch on YouTube](https://www.youtube.com/watch?v=jwcN5bDZ25c) | [Direct MP4](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/videos/stage2-complete.mp4)

https://www.youtube.com/watch?v=jwcN5bDZ25c

4. **World Reveal Cinematic**: [Watch on YouTube](https://www.youtube.com/watch?v=-k505d3_3uw) | [Direct MP4](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/videos/stage1-world-reveal.mp4)

https://www.youtube.com/watch?v=-k505d3_3uw

5. **Meet the Hero Bramble Cinematic**: [Watch on YouTube](https://www.youtube.com/watch?v=ddCzs-cTFWs) | [Direct MP4](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/videos/stage2-meet-the-hero.mp4)

https://www.youtube.com/watch?v=ddCzs-cTFWs

![End of Stage 1 Celebratory Video Overlay](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/screenshots/stage1_clear_video_screen.png)

![End of Stage 2 Celebratory Video Overlay](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/screenshots/stage2_clear_video_screen.png)

---

## 2. Setting Up Google Antigravity: Plugins, Agents, and Multimodal Models

Before writing a single game prompt, we configured our **Google Antigravity** environment with the specialized plugins and subagents needed for a 60fps game studio pipeline:

### Step 0.1 — Installing & Enabling the `game-dev` Plugin (`/plugin`)
We asked Antigravity to install and enable the **`game-dev` plugin** (`~/.gemini/config/plugins/game-dev`). You can do this directly in Antigravity chat using the `/plugin` command or with a simple prompt:

> **Setup Prompt to Antigravity:**
> *"Install and enable the `game-dev` plugin, including the `game-architect` agent, the `AGENTS.md` zero-GC / 60fps game development rules, and the HTML5 game engine, arcade physics, and procedural Web Audio synthesizer skills."*

Enabling the **`game-dev` plugin** automatically activates three critical capabilities in your workspace:
1. **The `game-architect` Subagent**: An expert Game Architect agent specializing in game mechanics, mathematical balancing, difficulty curves, 60fps canvas performance, and multi-sensory "juice".
2. **Always-On Game Engineering Rules (`game-dev/rules/AGENTS.md`)**:
   - **Zero Garbage-Collection in Game Loops**: Forbids allocating objects (`new Vector()`, `{ x, y }`, `new Array()`) inside `update()` or `render()` and mandates `ObjectPool` reuse.
   - **High-DPI & Responsive Canvas**: Enforces `window.devicePixelRatio` scaling and coordinate normalization (`ctx.setTransform`).
   - **Web Audio Policy & Procedural Audio**: Ensures `AudioContext.resume()` on the first user gesture and synthesizes retro/modern sound effects natively via Web Audio oscillators.
   - **Clean Separation of Concerns**: Decouples simulation logic (`RunnerWorld`) from rendering and DOM overlays.
3. **Three Specialized Game Skills (`SKILL.md`)**:
   - `html5-game-engine` — Deterministic game loops, delta-time clamping, object pools, particle systems, and trauma-based camera shake.
   - `arcade-physics-and-grid-mechanics` — 2D/pseudo-3D projection math, parabolic jump kinematics, and lane/AABB collision windows.
   - `game-audio-synthesizer` — Procedural Web Audio synthesis for coin chimes, combo-scaling gem arpeggios, spin-dash whooshes, and victory fanfares.

### Step 0.2 — Enabling the `image-generator` Subagent (Nano Banana) & Gemini Omni 1.2 Flash
Alongside the `game-dev` plugin, our workflow uses two multimodal engines:
- **`image-generator` Subagent (powered by Nano Banana)**: Generates the canonical 3D character sheet (**Bramble**), 4-panel expression poses, floating island environment backdrop, and 3D sprite sheet.
- **Gemini Omni 1.2 Flash (`models/gemini-omni-1.2-flash`)**: Generates the 15-second 16:9 launch trailer and the voice-acted Stage 1 & Stage 2 completion cutscenes in parallel, anchored to the Nano Banana reference images.

| Antigravity Component | Type | Role in Building *Monster Rush: The Lost Island* |
| :--- | :--- | :--- |
| **`game-dev` (`AGENTS.md`)** | Plugin Rule | Enforces zero heap allocations inside `update()`/`render()`, High-DPI `devicePixelRatio` normalization, procedural Web Audio, and multi-sensory "juice". |
| **`game-architect`** | Subagent | Designs the core 3-lane loop, speed progression curve, scoring multipliers, and portal awakening mechanics. |
| **`html5-game-engine`** | Skill | Provides the blueprint for deterministic `requestAnimationFrame` delta-time clamping, `ObjectPool`, and `CameraShaker` trauma decay. |
| **`arcade-physics-and-grid-mechanics`** | Skill | Guides the 3-lane pseudo-3D perspective projection math (`projectTrackPoint`), parabolic jump physics (`z`, `vz`, `gravity`), and AABB/lane collision windows. |
| **`game-audio-synthesizer`** | Skill | Synthesizes 100% of the sound effects (coin chimes, combo-scaling gem arpeggios, spin-dash whooshes, chest fanfares) via native Web Audio API oscillators. |
| **`image-generator` (Nano Banana)** | Subagent | Generates the canonical turquoise monster hero (**Bramble**), 4-panel expression poses, floating island environment, and 3D sprite sheet. |
| **`models/gemini-omni-1.2-flash`** | Multimodal Model | Generates the 15s launch trailer and the in-game **Stage 1 Complete** and **Stage 2 Complete** voice-acted celebratory cutscenes in parallel. |
| **`modern-web-guidance` & `securecoder`** | Skills | Enforces modern CSS (`100dvh`, `aspect-ratio: 9 / 16`), native `<dialog closedby="any">`, strict CSP headers, and zero `innerHTML` sinks. |

---

## 3. The Complete Prompt Playbook: Step-by-Step Prompts Given to Antigravity

Below is the exact sequence of prompts we gave to **Google Antigravity** to take *Monster Rush: The Lost Island* from a blank folder to a live cloud-hosted game. You can adapt these exact prompts to build your own AI-native games.

---

### Prompt 1 — Architecture & Game Design Blueprint (Planning Before Coding)

Instead of asking the AI to write code immediately, our first prompt instructed Antigravity (working with the **`game-architect`** rules and skills) to design the complete game concept, core loop, visual asset manifest, and technical architecture first—and wait for approval.

```text
You are a senior game development team working on a premium-quality
casual mobile game prototype.

We are creating an original game called:
MONSTER RUSH: THE LOST ISLAND.

GAME CONCEPT:
A cute, brave little monster explores a magical floating island.
The player collects energy gems, avoids obstacles, discovers treasure,
and restores the island's magical portal.

TARGET EXPERIENCE:
A polished, highly visual casual arcade game suitable for a mobile
gaming audience.

YOUR TASK:
1. Design the complete game concept.
2. Define the core gameplay loop.
3. Design the main character and game world.
4. Define the screens, UI, scoring and progression.
5. Create a technical architecture for a playable browser-based prototype.
6. Define all visual assets we need to generate.
7. Create a step-by-step implementation plan.

IMPORTANT:
Do not start coding yet.
Do not use copyrighted characters or existing game IP.
The visual identity must be completely original.
Present the plan and wait for approval.
```

**What Antigravity Did:**
Antigravity produced a comprehensive architecture document defining our hero (**Bramble**), the 3-lane pseudo-3D runway mechanics, the 12-gem portal awakening loop, the Zero-GC `ObjectPool` architecture, and the exact sprite sheets required before writing a single line of JavaScript.

---

### Prompt 2 — Generating the Canonical Character, Environment & Sprite Sheets with Nano Banana (`image-generator`)

Once the architecture was approved, we gave Antigravity a structured 3-part visual generation prompt so the **`image-generator` subagent (Nano Banana)** would establish a **canonical visual identity** first, and then match that exact style across the environment and game item sheets:

```text
Use Nano Banana (the image-generator subagent) to create our visual assets:

1. CANONICAL CHARACTER:
Create an original premium mobile game character for MONSTER RUSH: THE LOST ISLAND.
Character: A small adorable turquoise-blue fantasy monster. Large expressive amber eyes,
tiny golden horns, soft rounded body, short legs, small glowing markings, and a confident
friendly smile.
Style: High-end stylized 3D animated game art, soft cinematic lighting.
Composition: Full body, centered, three-quarter view, clean simple background.
This is the canonical character design. Preserve the exact same appearance in future assets.

2. ENVIRONMENT CONCEPT ART:
Create a premium game environment concept art for MONSTER RUSH: THE LOST ISLAND.
A magical floating island in the sky with bright turquoise waterfalls, lush green platforms,
ancient stone ruins, glowing magical crystals, floating bridges, and golden sunlight.
Clear foreground, middle ground, and background. No characters, no text, no logos.

3. CONSISTENT GAME ASSET SHEET:
Create a consistent game asset sheet matching the exact visual style and lighting:
- Golden collectible coins
- Glowing blue energy gems
- Magical treasure chest
- Stone obstacle
- Spinning wooden trap
- Magical portal
- Heart / life icon
- Game power-up icons
Arrange each asset separately with clear spacing and no overlapping assets.
```

![Canonical Character Sheet — Bramble](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/assets/character_canonical.png)

![Character Expressions & Action Poses Sheet](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/assets/character/character_expressions_poses.png)

![Floating Island Environment Concept](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/assets/environment_concept.png)

![Master 3D Game Collectibles, Obstacles & Portal Sheet](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/assets/game_asset_sheet.png)

**What Antigravity Did:**
The `image-generator` subagent generated the canonical character (`character_canonical.png`), the 4-pose expression sheet (`character_expressions_poses.png`), the island environment (`environment_concept.png`), and the master item sheet (`game_asset_sheet.png`). Antigravity then executed an automated alpha background-extraction script to slice the sheet into individual transparent sprites (`hero_sprite.png`, `coin_sprite.png`, `gem_sprite.png`, `chest_sprite.png`, `stone_sprite.png`, `trap_sprite.png`, `portal_sprite.png`) inside `public/assets/`.

---

### Prompt 3 — Creating & Iteratively Refining the 15-Second Launch Trailer with Gemini Omni 1.2 Flash

With the canonical character and environment images saved in `public/assets/`, we prompted Antigravity to invoke **Gemini Omni 1.2 Flash (`models/gemini-omni-1.2-flash`)**, passing the Nano Banana images as visual references so the trailer starred the exact same monster hero:

```text
Use Gemini Omni 1.2 Flash (models/gemini-omni-1.2-flash) to create a spectacular
15-second cinematic trailer for MONSTER RUSH: THE LOST ISLAND.

Use the supplied character and environment images as visual references.
Preserve the character's exact appearance, colors, proportions, and distinctive features.

STORYBOARD:
- Seconds 0-4: A breathtaking aerial cinematic flight over a magical floating island,
  waterfalls, and ruins. The camera moves toward a glowing ancient portal.
- Seconds 4-8: Reveal our cute turquoise monster hero. The monster looks toward the
  camera, smiles, and prepares to run.
- Seconds 8-12: The monster jumps across floating platforms, collects glowing energy
  gems, and passes through magical golden particles.
- Seconds 12-15: A dramatic camera pullback reveals the entire island as the magical
  portal lights up. End on a memorable heroic pose.

VISUAL DIRECTION & AUDIO:
Premium stylized 3D animated game trailer, vibrant colors, smooth camera movement,
energetic orchestral fantasy game music, and magical sound effects.
Format: 16:9 landscape, 15 seconds. Save to public/assets/monster_rush_trailer.mp4.
```

Once the first version was generated, we gave Antigravity a **follow-up refinement prompt** to intensify the finale while preserving the rest of the video:

```text
Keep the same character, environment, and visual style.
Make the final 3 seconds more spectacular: increase the magical glow of the portal,
add a beautiful energy burst, and finish with a stronger cinematic camera pullback.
Preserve the rest of the video and save it in public/assets/.
```

---

### Prompt 4 — Implementing the Complete 60fps Playable Game Engine

With all visual assets and the launch trailer inside `public/assets/`, we instructed Antigravity to build the playable HTML5 Canvas game engine governed by the **`game-dev` plugin rules**:

```text
Now implement MONSTER RUSH: THE LOST ISLAND from scratch, using the approved
game design and the generated visual assets located in public/assets/.

BUILD A COMPLETE PLAYABLE GAME:
- Create a fun arcade-style 3-lane runner experience.
- The player can move left/right between lanes, jump, and trigger a spin-dash.
- Collect coins, glowing energy gems, and treasure chests.
- Avoid stone obstacles and spinning wooden traps.
- Add increasing speed and difficulty across stages.
- Include score, lives, combo multipliers, and collectible counters.

SCREENS:
1. Intro screen with the integrated Gemini Omni 1.2 Flash cinematic trailer.
2. Animated start screen with hero showcase.
3. Main 60fps gameplay screen.
4. Pause screen, Game-over screen, and Victory / Stage progression screens.

VISUAL & TECHNICAL QUALITY:
- Use the generated Nano Banana character, environment, and item sprites.
- Add particle bursts, floating score callouts, and camera shake feedback.
- Synthesize all game audio procedurally using the Web Audio API skill.
- Support both desktop keyboard (Arrows / WASD / Space) and mobile touch swipes.
```

---

### Prompt 5 — Parallel Generation of Stage-Completion Cutscenes with Gemini Omni 1.2 Flash

To reward players at the end of every stage, we asked Antigravity to use **Gemini Omni 1.2 Flash (`models/gemini-omni-1.2-flash`)** in parallel to generate celebratory stage-clear cutscenes that play **immediately** when Bramble leaps through the awakened portal at the end of Stage 1 and Stage 2—right before transitioning to the next stage:

```text
Use Gemini Omni 1.2 Flash (models/gemini-omni-1.2-flash) in parallel using our
canonical Nano Banana character and environment reference images to generate
celebratory stage-completion videos that play automatically at the end of
Stage 1 and Stage 2 before moving to the next stage:

1. public/videos/stage1-complete.mp4:
   When finishing Stage 1, before moving to Stage 2, play a celebratory video
   where our turquoise monster hero leaps out of the awakened portal, waves
   happily at the player, and says enthusiastically:
   "Great job! You completed Stage 1!"

2. public/videos/stage2-complete.mp4:
   When finishing Stage 2, before moving to Stage 3, play a celebratory video
   with magical fireworks and an opening golden treasure chest where our hero
   cheers:
   "Great job! You passed Stage 2! Let's go to Stage 3!"
```

Our Antigravity agent dispatched the **Gemini Omni 1.2 Flash (`models/gemini-omni-1.2-flash`)** requests concurrently in Python using `ThreadPoolExecutor`, passing both the text storyboard and the base64-encoded Nano Banana reference images (`character_canonical.png`, `environment_concept.png`, and `portal_awakened_reference.png`):

```python
# Parallel Gemini Omni 1.2 Flash Video Generation with Reference Images
payload = {
    "model": "models/gemini-omni-1.2-flash",
    "generation_config": {"thinking_level": "high"},
    "response_format": {
        "type": "video",
        "aspect_ratio": "16:9",
        "duration": "10s",
    },
    "input": [
        {"type": "text", "text": prompt_text},
        {"type": "image", "mime_type": "image/png", "data": encode_img(CHAR_PATH)},
        {"type": "image", "mime_type": "image/png", "data": encode_img(ENV_PATH)},
    ],
}
```

---

### Prompt 6 — End-to-End Integration, Automated Browser QA & Cloud Run Deployment

Finally, we gave Antigravity our polish, verification, and deployment prompt:

```text
Complete, verify, and deploy the Monster Rush experience:
1. Integrate the launch trailer and the Stage 1 / Stage 2 completion videos
   into the game's screen flow.
2. Verify all generated assets and videos load properly.
3. Test keyboard and touch controls, gem collection, collisions, pause,
   game-over, and stage transitions using unit tests and headless browser E2E tests.
4. Deploy the game live to Google Cloud Run, serve this developer guide under /docs,
   and push the complete repository to GitHub.
Do not claim that something works unless it has actually been tested.
```

---

## 4. Deep Dive: How the `game-dev` Plugin Shaped the Engine Code

When you install the **`game-dev`** plugin in Antigravity, its `AGENTS.md` rule file automatically governs all game code generation:
1. **Zero Garbage-Collection in Game Loops**: Never allocate new objects (`{ x, y }`, `new Array()`) inside `update()` or `render()`. Pre-allocate scratch vectors and use `ObjectPool`.
2. **High-DPI & Responsive Canvas**: Scale canvas `width` and `height` by `window.devicePixelRatio` and normalize drawing coordinates with `ctx.setTransform(scaleX * dpr, 0, 0, scaleY * dpr, 0, 0)`.
3. **Web Audio Policy & Asset-Free Audio**: Resume `AudioContext` on the first `pointerdown`/`keydown` gesture and synthesize sound effects procedurally.
4. **Clean Separation of Concerns**: Decouple simulation state (`RunnerWorld` in `js/game/RunnerWorld.js`) from DOM orchestration (`MonsterRushApp` in `js/main.js`).

### Zero-Allocation `ObjectPool` (`js/engine/ObjectPool.js`)

To guarantee zero frame drops from garbage-collection pauses during intense particle bursts, `ObjectPool` pre-allocates fixed pools of entities (`80`), particles (`180`), and floating score callouts (`32`), recycling expired items in O(1) time via swap-and-pop:

```javascript
export class ObjectPool {
  constructor(factoryFn, initialSize = 64) {
    this._factory = factoryFn;
    this._free = [];
    this.activeList = [];

    for (let i = 0; i < initialSize; i++) {
      this._free.push(this._factory());
    }
  }

  acquire() {
    const item = this._free.length > 0 ? this._free.pop() : this._factory();
    this.activeList.push(item);
    return item;
  }

  releaseAt(activeIndex) {
    const lastIdx = this.activeList.length - 1;
    const item = this.activeList[activeIndex];
    if (activeIndex !== lastIdx) {
      this.activeList[activeIndex] = this.activeList[lastIdx];
    }
    this.activeList.pop();
    this._free.push(item);
  }
}
```

### Pseudo-3D Perspective Runway Projection (`js/game/RunnerWorld.js`)

Using the **`arcade-physics-and-grid-mechanics`** skill, `projectTrackPoint` maps 3D track coordinates (`lane` in `[-1, 0, 1]`, `dist` ahead of camera, and vertical jump height `z`) onto the `540×960` logical canvas using a non-linear depth curve and writes the result into a pre-allocated `_scratchProj` struct:

```javascript
projectTrackPoint(lane, dist, z, width, height) {
  const horizonY = height * 0.30;
  const playerGroundY = height * 0.79;
  const normalizedDist = Math.max(-0.15, Math.min(1.2, (dist - 120) / 960));
  const depthProgress = 1 - Math.pow(Math.max(0, Math.min(1, normalizedDist)), 0.78);
  const scale = 0.24 + 0.76 * depthProgress;
  const groundY = horizonY + (playerGroundY - horizonY) * depthProgress;
  const trackHalfWidth = width * 0.42 * scale;

  this._scratchProj.x = width * 0.5 + lane * (trackHalfWidth * 0.64);
  this._scratchProj.y = groundY - z * scale * 0.95;
  this._scratchProj.groundY = groundY;
  this._scratchProj.scale = scale;
  return this._scratchProj;
}
```

![Start Screen](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/screenshots/e2e_02_start_screen.png)

![Portal Awakened on the Island Runway](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/screenshots/e2e_07_portal_awakened.png)

![Move to Stage 2 Summary Screen](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/screenshots/stage1_move_to_stage2_screen.png)

---

## Conclusion: Key Takeaways for Developers Building Games with Antigravity

1. **Install Domain Plugins First (`game-dev` & `game-architect`)**: Enabling the `game-dev` plugin gives Antigravity architectural guardrails (`AGENTS.md`) and specialized skills (`html5-game-engine`, `arcade-physics-and-grid-mechanics`, `game-audio-synthesizer`) before a single line of code is written.
2. **Design Before Coding (Prompt 1)**: Asking Antigravity to produce and validate the game design, state machine, and asset manifest first prevents architectural rework later.
3. **Anchor Multimodal Video Generation with Canonical Reference Images (Prompts 2 & 3)**: Generating a canonical character sheet first with the `image-generator` subagent (Nano Banana) and passing it as an image reference to `models/gemini-omni-1.2-flash` solves character consistency across gameplay sprites, launch trailers, and stage-clear cutscenes.
4. **Run Video Jobs in Parallel (Prompt 5)**: Dispatching all `models/gemini-omni-1.2-flash` video requests concurrently via `ThreadPoolExecutor` cuts media production latency by 3×.
5. **Close the Loop with Browser E2E Verification (Prompt 6)**: Coupling `node --test` unit tests with headless Chrome CDP verification guarantees that assets, videos, audio synthesis, and UI overlays work together with zero runtime errors.

*Play the game live at [monster-rush-lost-island-880601596687.us-central1.run.app](https://monster-rush-lost-island-880601596687.us-central1.run.app), read the interactive HTML version at [/docs](https://monster-rush-lost-island-880601596687.us-central1.run.app/docs), and explore the full source code on GitHub at [github.com/moshem-a/Games-with-antigravity](https://github.com/moshem-a/Games-with-antigravity).*
