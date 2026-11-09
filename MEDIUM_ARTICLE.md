# From One Prompt to a 60fps Mobile Game: How to Build AI-Native Games with Google Antigravity, Subagents, Plugins, and Gemini Omni 1.2 Flash

*A complete developer's guide to orchestrating specialized AI subagents, zero-GC HTML5 game engines, Nano Banana asset pipelines, and parallel Gemini Omni 1.2 Flash cutscenes—deployed live to Google Cloud Run.*

- **Play the Live Game on Google Cloud Run**: [https://monster-rush-lost-island-880601596687.us-central1.run.app](https://monster-rush-lost-island-880601596687.us-central1.run.app)
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

In this article, we walk through how we built **Monster Rush: The Lost Island**—a 60fps 3-lane fantasy island runner—entirely inside **Google Antigravity (AGY)** using its modular ecosystem of **Plugins**, **Skills (`SKILL.md`)**, **Rules (`AGENTS.md`)**, **Subagents**, and **Gemini Omni 1.2 Flash (`models/gemini-omni-1.2-flash`)**.

---

## 1. Watch the Gemini Omni 1.2 Flash Videos & Stage-Completion Cutscenes

Every video below was generated using **Gemini Omni 1.2 Flash (`models/gemini-omni-1.2-flash`)**, conditioned on our canonical **Nano Banana** character and environment sheets:

- **Official 15s AI Launch Trailer**: [Watch MP4 on Cloud Run](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/assets/monster_rush_trailer.mp4)
- **Stage 1 Complete Celebratory Cutscene (*"Great job! You completed Stage 1!"*)**: [Watch MP4 on Cloud Run](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/videos/stage1-complete.mp4)
- **Stage 2 Complete Celebratory Cutscene (*"Great job! You passed Stage 2! Let's go to Stage 3!"*)**: [Watch MP4 on Cloud Run](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/videos/stage2-complete.mp4)
- **World Reveal Cinematic**: [Watch MP4 on Cloud Run](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/videos/stage1-world-reveal.mp4)
- **Meet the Hero Cinematic**: [Watch MP4 on Cloud Run](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/videos/stage2-meet-the-hero.mp4)

![End of Stage 1 Celebratory Video Overlay](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/screenshots/stage1_clear_video_screen.png)

![End of Stage 2 Celebratory Video Overlay](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/screenshots/stage2_clear_video_screen.png)

---

## 2. How Google Antigravity Orchestrates Game Creation

What makes **Google Antigravity** fundamentally different from a standard coding assistant is its **composable customization architecture**. Instead of stuffing thousands of lines of instructions into a single prompt, Antigravity separates domain expertise into four layers:

1. **Rules & Plugins Layer (`AGENTS.md`)**: Always-on architectural constraints such as the `game-dev` plugin rules (Zero-GC `ObjectPool`, High-DPI `devicePixelRatio` scaling, Web Audio gesture compliance, and separation of simulation state from rendering).
2. **Domain Skills Layer (`SKILL.md`)**: On-demand engineering blueprints loaded by the agent (`html5-game-engine`, `arcade-physics-and-grid-mechanics`, `game-audio-synthesizer`, `modern-web-guidance`, `mandatory-secure-web-skills`).
3. **Autonomous Subagents & Multimodal Models**: Delegating specialized visual asset tasks to the `image-generator` subagent (powered by **Nano Banana**) and parallel video generation to **Gemini Omni 1.2 Flash (`models/gemini-omni-1.2-flash`)**.
4. **Verification & Cloud Deployment Layer**: Automated `node --test` unit suites, headless Chrome DevTools Protocol (CDP) E2E testing, and one-command deployment to **Google Cloud Run**.

### The Antigravity Toolkit Used in This Project

| Antigravity Component | Type | Role in Building *Monster Rush: The Lost Island* |
| :--- | :--- | :--- |
| **`game-dev` (`AGENTS.md`)** | Plugin Rule | Enforces zero heap allocations inside `update()`/`render()`, High-DPI `devicePixelRatio` normalization, procedural Web Audio, and multi-sensory "juice". |
| **`html5-game-engine`** | Skill | Provides the blueprint for deterministic `requestAnimationFrame` delta-time clamping, `ObjectPool`, and `CameraShaker` trauma decay. |
| **`arcade-physics-and-grid-mechanics`** | Skill | Guides the 3-lane pseudo-3D perspective projection math (`projectTrackPoint`), parabolic jump physics (`z`, `vz`, `gravity`), and AABB/lane collision windows. |
| **`game-audio-synthesizer`** | Skill | Synthesizes 100% of the sound effects (coin chimes, combo-scaling gem arpeggios, spin-dash whooshes, chest fanfares) via native Web Audio API oscillators. |
| **`image-generator` (Nano Banana)** | Subagent | Generates the canonical turquoise monster hero (**Bramble**), 4-panel expression poses, floating island environment, and 3D sprite sheet. |
| **`models/gemini-omni-1.2-flash`** | Multimodal Model | Generates the 15s launch trailer and the in-game **Stage 1 Complete** and **Stage 2 Complete** voice-acted celebratory cutscenes in parallel. |
| **`modern-web-guidance` & `securecoder`** | Skills | Enforces modern CSS (`100dvh`, `aspect-ratio: 9 / 16`), native `<dialog closedby="any">`, strict CSP headers, and zero `innerHTML` sinks. |

---

## 3. Step-by-Step: How We Built *Monster Rush: The Lost Island*

### Step 1: Establishing Visual Identity with the `image-generator` Subagent (Nano Banana)

A common pitfall in AI-generated games is **visual drift**—where the main character looks different on the title screen, inside gameplay, and inside video cutscenes.

To solve this, the Lead Agent invoked Antigravity's **`image-generator`** subagent first to establish a **Canonical Character Sheet** for our hero, **Bramble** (an adorable turquoise-blue monster with large amber eyes, tiny golden horns, and glowing cyan spiral markings), alongside the **Floating Island Environment** and a **Master 3D Game Asset Sheet**.

![Canonical Character Sheet — Bramble](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/assets/character_canonical.png)

![Character Expressions & Action Poses Sheet](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/assets/character/character_expressions_poses.png)

![Floating Island Environment Concept](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/assets/environment_concept.png)

![Master 3D Game Collectibles, Obstacles & Portal Sheet](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/assets/game_asset_sheet.png)

Once the master sheets were generated, the agent ran a connected-component background removal script to extract clean, alpha-transparent PNG sprites (`hero_sprite.png`, `coin_sprite.png`, `gem_sprite.png`, `chest_sprite.png`, `stone_sprite.png`, `trap_sprite.png`, `portal_sprite.png`, `heart_sprite.png`, `powerups_sprite.png`) into `public/assets/`.

---

### Step 2: Parallel Video & Stage-Clear Cutscene Generation with Gemini Omni 1.2 Flash

Next, we wanted the game to feel like a true mobile franchise:
1. When the game launches, an **Official 15-Second AI Launch Trailer** welcomes the player.
2. When the player completes **Stage 1** by collecting 12 glowing energy gems and leaping into the awakened portal, **before** seeing the "Move to Stage 2" summary screen, an in-game celebratory video (`stage1-complete.mp4`) immediately plays where Bramble waves at the camera and says:
   > *"Great job! You completed Stage 1!"*
3. When the player completes **Stage 2**, a second celebratory cutscene (`stage2-complete.mp4`) immediately plays with fireworks and an opening golden treasure chest as Bramble cheers:
   > *"Great job! You passed Stage 2! Let's go to Stage 3!"*

Instead of generating videos sequentially and blocking development, our Antigravity agent dispatched the **Gemini Omni 1.2 Flash (`models/gemini-omni-1.2-flash`)** requests concurrently in Python using `ThreadPoolExecutor`, passing both the text storyboard and the base64-encoded Nano Banana reference images (`character_canonical.png`, `environment_concept.png`, and `portal_awakened_reference.png`):

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

Because every video job received the exact same canonical character and environment reference images, `models/gemini-omni-1.2-flash` preserved Bramble's exact turquoise fur, golden horns, glowing spiral markings, and floating island aesthetic across every single video.

---

### Step 3: Enforcing the `game-dev` Plugin Rules (`AGENTS.md`)

When you install the **`game-dev`** plugin in Antigravity, its `AGENTS.md` rule file automatically governs all game code generation:
1. **Zero Garbage-Collection in Game Loops**: Never allocate new objects (`{ x, y }`, `new Array()`) inside `update()` or `render()`. Pre-allocate scratch vectors and use `ObjectPool`.
2. **High-DPI & Responsive Canvas**: Scale canvas `width` and `height` by `window.devicePixelRatio` and normalize drawing coordinates with `ctx.setTransform(scaleX * dpr, 0, 0, scaleY * dpr, 0, 0)`.
3. **Web Audio Policy & Asset-Free Audio**: Resume `AudioContext` on the first `pointerdown`/`keydown` gesture and synthesize sound effects procedurally.
4. **Clean Separation of Concerns**: Decouple simulation state (`RunnerWorld` in `js/game/RunnerWorld.js`) from DOM orchestration (`MonsterRushApp` in `js/main.js`).

#### Zero-Allocation `ObjectPool` (`js/engine/ObjectPool.js`)

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

#### Pseudo-3D Perspective Runway Projection (`js/game/RunnerWorld.js`)

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

---

### Step 4: In-Game Screen Progression & Stage-Completion Video Flow

When Bramble leaps into the awakened portal at the end of Stage 1 or Stage 2, `handleVictoryScreen` immediately invokes `openStageClearVideo(completedStage)`, displaying `#screen-stage-video` with the celebratory Gemini Omni 1.2 Flash cutscene and a direct **Continue to Stage 2 / Stage 3** button before transitioning to the stage summary screen:

![Start Screen](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/screenshots/e2e_02_start_screen.png)

![Portal Awakened on the Island Runway](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/screenshots/e2e_07_portal_awakened.png)

![Move to Stage 2 Summary Screen](https://monster-rush-lost-island-880601596687.us-central1.run.app/public/screenshots/stage1_move_to_stage2_screen.png)

---

### Step 5: Automated Verification & One-Command Cloud Run Deployment

Before deploying, Antigravity ran two automated verification suites:
1. **Unit & Security Test Suite (`node --test tests/game.test.mjs`)**: Verified all `STAGE_CLEAR_VIDEOS`, `ASSET_MANIFEST` files, `ObjectPool` recycling, lane switching, jump physics, obstacle collisions, portal awakening, and scanned the codebase to confirm zero unsafe DOM sinks (`innerHTML`, `outerHTML`, `eval`) or hardcoded secrets.
2. **Headless Chrome DevTools Protocol (CDP) E2E Suite**: Automated a real Chromium browser to play through Stage 1 and Stage 2, trigger portal victories, verify that `stage1-complete.mp4` and `stage2-complete.mp4` load with `readyState === 4`, and assert **0 console/page errors**.
3. **Cloud Run Containerization (`Dockerfile` & `nginx.conf`)**: Packaged the static HTML5/JS/CSS engine, Nano Banana sprites, and Gemini Omni 1.2 Flash `.mp4` videos into an `nginx:1.27-alpine` container with HTTP byte-range streaming and deployed directly to **Google Cloud Run**.

---

## Conclusion: Key Takeaways for Developers Building Games with Antigravity

1. **Use Rules (`AGENTS.md`) as Architectural Guardrails**: Declaring zero-GC pooling and high-DPI coordinate normalization in a rule file ensures every line of generated engine code stays at 60fps.
2. **Anchor Multimodal Video Generation with Canonical Reference Images**: Generating a canonical character sheet first with the `image-generator` subagent (Nano Banana) and passing it as an image reference to `models/gemini-omni-1.2-flash` solves character consistency across gameplay sprites, launch trailers, and stage-clear cutscenes.
3. **Run Video Jobs in Parallel**: Dispatching all `models/gemini-omni-1.2-flash` video requests concurrently via `ThreadPoolExecutor` cuts media production latency by 3×.
4. **Close the Loop with Browser E2E Verification**: Coupling `node --test` unit tests with headless Chrome CDP verification guarantees that assets, videos, audio synthesis, and UI overlays work together with zero runtime errors.

*Play the game live at [monster-rush-lost-island-880601596687.us-central1.run.app](https://monster-rush-lost-island-880601596687.us-central1.run.app) and explore the full source code on GitHub at [github.com/moshem-a/Games-with-antigravity](https://github.com/moshem-a/Games-with-antigravity).*
