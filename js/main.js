import { AssetLoader, STAGE_CLEAR_VIDEOS } from './engine/AssetLoader.js';
import { AudioSynthesizer } from './engine/AudioSynthesizer.js';
import { RunnerWorld, GAME_STATE } from './game/RunnerWorld.js';

const LOGICAL_WIDTH = 540;
const LOGICAL_HEIGHT = 960;
const HIGH_SCORE_STORAGE_KEY = 'monster_rush_lost_island_highscore_v1';

class MonsterRushApp {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.loader = new AssetLoader();
    this.audio = new AudioSynthesizer();

    this.world = new RunnerWorld(this.audio, {
      onHudUpdate: () => this.syncHud(false),
      onGameOver: () => this.handleGameOverScreen(),
      onVictory: (bonuses) => this.handleVictoryScreen(bonuses),
    });

    // Load persisted high score safely
    try {
      const saved = window.localStorage.getItem(HIGH_SCORE_STORAGE_KEY);
      const parsed = saved ? Number.parseInt(saved, 10) : 0;
      if (Number.isFinite(parsed) && parsed > 0) {
        this.world.highScore = parsed;
      }
    } catch {
      // Ignore storage access errors in restricted contexts
    }

    // Screen DOM references
    this.screens = {
      intro: document.getElementById('screen-intro'),
      start: document.getElementById('screen-start'),
      hud: document.getElementById('game-hud'),
      pause: document.getElementById('screen-pause'),
      gameover: document.getElementById('screen-gameover'),
      stageVideo: document.getElementById('screen-stage-video'),
      victory: document.getElementById('screen-victory'),
    };

    // Intro trailer elements
    this.trailerVideo = document.getElementById('trailer-video');
    this.btnIntroMute = document.getElementById('btn-intro-mute');
    this.btnIntroPlay = document.getElementById('btn-intro-play');
    this.trailerProgressBar = document.getElementById('trailer-progress-fill');

    // Stage-Clear Celebration Video elements (end of Stage 1, end of Stage 2, etc.)
    this.stageClearVideo = document.getElementById('stage-clear-video');
    this.stageVideoProgressBar = document.getElementById('stage-video-progress-fill');
    this.stageVideoBadge = document.getElementById('stage-video-badge');
    this.stageVideoTitle = document.getElementById('stage-video-title');
    this.stageVideoSubtitle = document.getElementById('stage-video-subtitle');
    this.stageVideoCaption = document.getElementById('stage-video-caption');
    this.btnStageVideoContinue = document.getElementById('btn-stage-video-continue');
    this.btnStageVideoReplay = document.getElementById('btn-stage-video-replay');
    this.btnStageVideoMute = document.getElementById('btn-stage-video-mute');
    this.btnStageVideoSummary = document.getElementById('btn-stage-video-summary');

    // HUD cached nodes (updated only on state change to avoid layout thrashing)
    this.hudNodes = {
      score: document.getElementById('hud-score'),
      coins: document.getElementById('hud-coins'),
      gems: document.getElementById('hud-gems'),
      stage: document.getElementById('hud-stage'),
      comboBadge: document.getElementById('hud-combo-badge'),
      portalFill: document.getElementById('hud-portal-fill'),
      portalLabel: document.getElementById('hud-portal-label'),
      hearts: [
        document.getElementById('heart-0'),
        document.getElementById('heart-1'),
        document.getElementById('heart-2'),
        document.getElementById('heart-3'),
      ],
      dashBtn: document.getElementById('touch-dash'),
      muteBtn: document.getElementById('btn-hud-mute'),
      powerupBanner: document.getElementById('hud-powerup-banner'),
    };

    this.prevHud = {
      score: -1,
      coins: -1,
      gems: -1,
      stage: -1,
      combo: -1,
      portalGems: -1,
      portalTarget: -1,
      lives: -1,
      dashReady: null,
      powerupCode: -1,
    };

    this.guideDialog = document.getElementById('guide-dialog');
    this.dpr = 1;
    this.scaleX = 1;
    this.scaleY = 1;
    this.lastFrameTime = performance.now();

    // Touch gesture tracking
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
  }

  async init() {
    this.bindUIEvents();
    this.bindInputControls();
    this.setupDialogLightDismiss();

    const loadingText = document.getElementById('asset-load-status');
    const result = await this.loader.loadAll((progress) => {
      if (loadingText) {
        loadingText.textContent = `Loading Island Assets... ${Math.round(progress * 100)}%`;
      }
    });

    if (loadingText) {
      loadingText.textContent = result.allLoaded
        ? 'All Island Assets Ready'
        : 'Assets Loaded';
    }

    this.updateStartScreenStats();
    this.setupResponsiveCanvas();
    window.addEventListener('resize', () => this.setupResponsiveCanvas());

    // Start with the official 15s trailer playing in the intro screen
    this.openTrailer(true);

    // Start 60fps loop
    this.lastFrameTime = performance.now();
    requestAnimationFrame((now) => this.loop(now));
  }

  setupResponsiveCanvas() {
    const container = document.getElementById('game-stage');
    const rect = container.getBoundingClientRect();
    const cssWidth = Math.max(320, Math.floor(rect.width));
    const cssHeight = Math.max(480, Math.floor(rect.height));

    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.canvas.width = Math.round(cssWidth * this.dpr);
    this.canvas.height = Math.round(cssHeight * this.dpr);
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;

    this.scaleX = cssWidth / LOGICAL_WIDTH;
    this.scaleY = cssHeight / LOGICAL_HEIGHT;
  }

  pauseAllVideos() {
    if (this.trailerVideo && !this.trailerVideo.paused) {
      this.trailerVideo.pause();
    }
    if (this.stageClearVideo && !this.stageClearVideo.paused) {
      this.stageClearVideo.pause();
    }
  }

  showScreen(activeKey) {
    for (const [key, el] of Object.entries(this.screens)) {
      if (!el) continue;
      if (key === activeKey) {
        el.classList.remove('hidden');
      } else if (key !== 'hud') {
        el.classList.add('hidden');
      }
    }

    if (activeKey === 'playing' || activeKey === 'pause') {
      this.screens.hud.classList.remove('hidden');
    } else {
      this.screens.hud.classList.add('hidden');
    }
  }

  openTrailer(autoMute = true) {
    this.pauseAllVideos();
    this.world.state = GAME_STATE.INTRO;
    this.showScreen('intro');

    if (!this.trailerVideo) return;
    this.trailerVideo.currentTime = 0;
    this.trailerVideo.muted = Boolean(autoMute);
    this.updateIntroMuteLabel();

    const playPromise = this.trailerVideo.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        this.trailerVideo.muted = true;
        this.updateIntroMuteLabel();
        this.trailerVideo.play().catch(() => {});
      });
    }
  }

  updateIntroMuteLabel() {
    if (!this.btnIntroMute || !this.trailerVideo) return;
    this.btnIntroMute.textContent = this.trailerVideo.muted
      ? 'Unmute Trailer Audio'
      : 'Mute Trailer Audio';
  }

  updateStageVideoMuteLabel() {
    if (!this.btnStageVideoMute || !this.stageClearVideo) return;
    this.btnStageVideoMute.textContent = this.stageClearVideo.muted
      ? 'Unmute Audio'
      : 'Mute Audio';
  }

  skipTrailerToStartScreen() {
    this.pauseAllVideos();
    this.audio.ensureContext();
    this.world.state = GAME_STATE.START;
    this.updateStartScreenStats();
    this.showScreen('start');
  }

  startGame(stage = 1) {
    this.pauseAllVideos();
    this.audio.ensureContext();
    this.world.resetRun(stage);
    this.showScreen('playing');
    this.syncHud(true);
  }

  pauseGame() {
    if (this.world.state !== GAME_STATE.PLAYING) return;
    this.world.state = GAME_STATE.PAUSED;
    this.showScreen('pause');
  }

  resumeGame() {
    if (this.world.state !== GAME_STATE.PAUSED) return;
    this.audio.ensureContext();
    this.world.state = GAME_STATE.PLAYING;
    this.showScreen('playing');
    this.lastFrameTime = performance.now();
  }

  saveHighScore() {
    try {
      window.localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(this.world.highScore));
    } catch {
      // Ignore storage restrictions
    }
  }

  updateStartScreenStats() {
    const highEl = document.getElementById('start-highscore');
    if (highEl) {
      highEl.textContent = String(this.world.highScore);
    }
  }

  handleGameOverScreen() {
    this.saveHighScore();
    document.getElementById('go-score').textContent = String(this.world.score);
    document.getElementById('go-best').textContent = String(this.world.highScore);
    document.getElementById('go-coins').textContent = String(this.world.coins);
    document.getElementById('go-gems').textContent = `${this.world.portalGems} / ${this.world.portalGemTarget}`;
    this.showScreen('gameover');
  }

  /**
   * Called immediately when the player finishes a stage (e.g., Stage 1 or Stage 2).
   * First updates the Move-to-Next-Stage summary card (#screen-victory),
   * and immediately displays the celebratory Stage Complete Video (#screen-stage-video)
   * BEFORE showing the Move-to-Next-Stage screen!
   */
  handleVictoryScreen(bonuses = { heartBonus: 0, stageBonus: 1000 }) {
    this.saveHighScore();
    const completedStage = this.world.stage;
    const nextStage = completedStage + 1;

    // Populate the Move-to-Next-Stage summary screen (#screen-victory)
    document.getElementById('vic-score').textContent = String(this.world.score);
    document.getElementById('vic-best').textContent = String(this.world.highScore);
    document.getElementById('vic-coins').textContent = String(this.world.coins);
    document.getElementById('vic-gems').textContent = String(this.world.gems);
    document.getElementById('vic-bonus').textContent = `+${bonuses.heartBonus + bonuses.stageBonus}`;

    const vicBadge = document.getElementById('vic-stage-badge');
    if (vicBadge) {
      vicBadge.textContent = `Stage ${completedStage} Complete • Portal Awakened`;
    }
    const vicTitle = document.getElementById('vic-title');
    if (vicTitle) {
      vicTitle.textContent = `STAGE ${completedStage} COMPLETE!`;
    }
    const vicSubtitle = document.getElementById('vic-subtitle');
    if (vicSubtitle) {
      vicSubtitle.textContent = `Great job! You passed Stage ${completedStage} and unlocked Island Stage ${nextStage}!`;
    }

    const nextBtn = document.getElementById('btn-victory-next');
    if (nextBtn) {
      nextBtn.textContent = `Enter Island Stage ${nextStage}`;
    }
    const replayStageBtn = document.getElementById('btn-victory-replay-game');
    if (replayStageBtn) {
      replayStageBtn.textContent = `Replay Stage ${completedStage}`;
    }

    // Immediately play the celebratory Stage Complete video before the Move-to-Next-Stage screen
    this.openStageClearVideo(completedStage);
  }

  openStageClearVideo(completedStage) {
    this.pauseAllVideos();
    const nextStage = completedStage + 1;
    const videoSrc = STAGE_CLEAR_VIDEOS[completedStage] || STAGE_CLEAR_VIDEOS[2];

    if (this.stageVideoBadge) {
      this.stageVideoBadge.textContent = `STAGE ${completedStage} COMPLETE!`;
    }
    if (this.stageVideoTitle) {
      this.stageVideoTitle.textContent = 'GREAT JOB!';
    }
    if (this.stageVideoSubtitle) {
      this.stageVideoSubtitle.textContent = `You Passed Stage ${completedStage}!`;
    }
    if (this.stageVideoCaption) {
      this.stageVideoCaption.textContent = `Great job completing Stage ${completedStage}! Watch Bramble celebrate or continue to Stage ${nextStage}.`;
    }
    if (this.btnStageVideoContinue) {
      this.btnStageVideoContinue.textContent = `Continue to Stage ${nextStage} \u2192`;
    }
    if (this.stageVideoProgressBar) {
      this.stageVideoProgressBar.style.width = '0%';
    }

    this.showScreen('stageVideo');

    if (!this.stageClearVideo) return;
    if (this.stageClearVideo.getAttribute('src') !== videoSrc) {
      this.stageClearVideo.setAttribute('src', videoSrc);
      this.stageClearVideo.load();
    }
    this.stageClearVideo.currentTime = 0;
    this.stageClearVideo.muted = false;
    this.updateStageVideoMuteLabel();

    const playPromise = this.stageClearVideo.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        this.stageClearVideo.muted = true;
        this.updateStageVideoMuteLabel();
        this.stageClearVideo.play().catch(() => {});
      });
    }
  }

  showVictorySummaryScreen() {
    this.pauseAllVideos();
    this.showScreen('victory');
  }

  syncHud(force = false) {
    const w = this.world;
    const p = this.prevHud;

    if (force || p.score !== w.score) {
      p.score = w.score;
      this.hudNodes.score.textContent = String(w.score);
    }
    if (force || p.coins !== w.coins) {
      p.coins = w.coins;
      this.hudNodes.coins.textContent = String(w.coins);
    }
    if (force || p.gems !== w.gems) {
      p.gems = w.gems;
      this.hudNodes.gems.textContent = String(w.gems);
    }
    if (force || p.stage !== w.stage) {
      p.stage = w.stage;
      this.hudNodes.stage.textContent = `STAGE ${w.stage}`;
    }
    if (force || p.combo !== w.combo) {
      p.combo = w.combo;
      this.hudNodes.comboBadge.textContent = `x${w.combo}`;
      this.hudNodes.comboBadge.classList.toggle('combo-active', w.combo > 1);
    }
    if (force || p.portalGems !== w.portalGems || p.portalTarget !== w.portalGemTarget) {
      p.portalGems = w.portalGems;
      p.portalTarget = w.portalGemTarget;
      const pct = Math.min(100, Math.round((w.portalGems / w.portalGemTarget) * 100));
      this.hudNodes.portalFill.style.width = `${pct}%`;
      this.hudNodes.portalLabel.textContent = w.portalSpawned
        ? 'PORTAL AHEAD - ENTER IT!'
        : `PORTAL CHARGE: ${w.portalGems} / ${w.portalGemTarget} GEMS`;
    }
    if (force || p.lives !== w.player.lives) {
      p.lives = w.player.lives;
      for (let i = 0; i < this.hudNodes.hearts.length; i++) {
        const heartEl = this.hudNodes.hearts[i];
        if (!heartEl) continue;
        heartEl.classList.toggle('heart-lost', i >= w.player.lives);
      }
    }

    const dashReady = w.player.dashCooldown <= 0;
    if (force || p.dashReady !== dashReady) {
      p.dashReady = dashReady;
      if (this.hudNodes.dashBtn) {
        this.hudNodes.dashBtn.classList.toggle('cooldown', !dashReady);
      }
    }

    const powerupCode = w.player.shieldTimer > 0
      ? 2
      : w.player.magnetTimer > 0
        ? 1
        : w.player.speedBoostTimer > 0
          ? 3
          : 0;
    if (force || p.powerupCode !== powerupCode) {
      p.powerupCode = powerupCode;
      const banner = this.hudNodes.powerupBanner;
      if (banner) {
        if (powerupCode === 0) {
          banner.classList.add('hidden');
        } else {
          banner.classList.remove('hidden');
          banner.textContent = powerupCode === 2
            ? 'STAR SHIELD ACTIVE'
            : powerupCode === 1
              ? 'GEM MAGNET ACTIVE'
              : 'SPEED RUSH ACTIVE';
        }
      }
    }
  }

  bindUIEvents() {
    // Intro trailer controls
    this.btnIntroPlay.addEventListener('click', () => this.skipTrailerToStartScreen());
    const btnIntroStartImmediate = document.getElementById('btn-intro-start-now');
    if (btnIntroStartImmediate) {
      btnIntroStartImmediate.addEventListener('click', () => this.startGame(1));
    }
    this.btnIntroMute.addEventListener('click', () => {
      if (!this.trailerVideo) return;
      this.trailerVideo.muted = !this.trailerVideo.muted;
      this.updateIntroMuteLabel();
    });

    if (this.trailerVideo) {
      this.trailerVideo.addEventListener('timeupdate', () => {
        if (this.trailerProgressBar && this.trailerVideo.duration > 0) {
          const pct = Math.min(100, (this.trailerVideo.currentTime / this.trailerVideo.duration) * 100);
          this.trailerProgressBar.style.width = `${pct}%`;
        }
      });
      this.trailerVideo.addEventListener('ended', () => {
        this.skipTrailerToStartScreen();
      });
    }

    // Stage Complete Celebration Video controls (end of Stage 1 & Stage 2)
    if (this.stageClearVideo) {
      this.stageClearVideo.addEventListener('timeupdate', () => {
        if (this.stageVideoProgressBar && this.stageClearVideo.duration > 0) {
          const pct = Math.min(100, (this.stageClearVideo.currentTime / this.stageClearVideo.duration) * 100);
          this.stageVideoProgressBar.style.width = `${pct}%`;
        }
      });
      // When the Stage Complete video finishes playing, transition automatically to the Move-to-Next-Stage screen (#screen-victory)
      this.stageClearVideo.addEventListener('ended', () => {
        this.showVictorySummaryScreen();
      });
    }

    if (this.btnStageVideoContinue) {
      this.btnStageVideoContinue.addEventListener('click', () => {
        this.startGame(this.world.stage + 1);
      });
    }
    if (this.btnStageVideoSummary) {
      this.btnStageVideoSummary.addEventListener('click', () => {
        this.showVictorySummaryScreen();
      });
    }
    if (this.btnStageVideoReplay) {
      this.btnStageVideoReplay.addEventListener('click', () => {
        this.openStageClearVideo(this.world.stage);
      });
    }
    if (this.btnStageVideoMute) {
      this.btnStageVideoMute.addEventListener('click', () => {
        if (!this.stageClearVideo) return;
        this.stageClearVideo.muted = !this.stageClearVideo.muted;
        this.updateStageVideoMuteLabel();
      });
    }

    // Start screen buttons
    document.getElementById('btn-start-play').addEventListener('click', () => this.startGame(1));
    document.getElementById('btn-replay-trailer').addEventListener('click', () => this.openTrailer(false));
    document.getElementById('btn-open-guide').addEventListener('click', () => {
      if (this.guideDialog && typeof this.guideDialog.showModal === 'function') {
        this.guideDialog.showModal();
      }
    });
    document.getElementById('btn-close-guide').addEventListener('click', () => {
      if (this.guideDialog) this.guideDialog.close();
    });

    // HUD buttons
    document.getElementById('btn-hud-pause').addEventListener('click', () => {
      if (this.world.state === GAME_STATE.PLAYING) {
        this.pauseGame();
      } else if (this.world.state === GAME_STATE.PAUSED) {
        this.resumeGame();
      }
    });

    this.hudNodes.muteBtn.addEventListener('click', () => {
      const muted = this.audio.toggleMute();
      this.hudNodes.muteBtn.textContent = muted ? 'Muted' : 'Audio';
    });

    // Pause screen buttons
    document.getElementById('btn-pause-resume').addEventListener('click', () => this.resumeGame());
    document.getElementById('btn-pause-restart').addEventListener('click', () => this.startGame(this.world.stage));
    document.getElementById('btn-pause-trailer').addEventListener('click', () => this.openTrailer(false));
    document.getElementById('btn-pause-menu').addEventListener('click', () => this.skipTrailerToStartScreen());

    // Game-Over screen buttons
    document.getElementById('btn-gameover-restart').addEventListener('click', () => this.startGame(this.world.stage));
    document.getElementById('btn-gameover-menu').addEventListener('click', () => this.skipTrailerToStartScreen());

    // Victory / Move to Next Stage screen buttons
    document.getElementById('btn-victory-next').addEventListener('click', () => {
      this.startGame(this.world.stage + 1);
    });
    const btnWatchClearVideo = document.getElementById('btn-victory-watch-clear-video');
    if (btnWatchClearVideo) {
      btnWatchClearVideo.addEventListener('click', () => {
        this.openStageClearVideo(this.world.stage);
      });
    }
    document.getElementById('btn-victory-replay-game').addEventListener('click', () => {
      this.startGame(this.world.stage);
    });
  }

  setupDialogLightDismiss() {
    if (!this.guideDialog) return;
    // Mandatory fallback for browsers without native HTMLDialogElement.prototype.closedBy support
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      this.guideDialog.addEventListener('click', (event) => {
        const rect = this.guideDialog.getBoundingClientRect();
        const isInDialog =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (!isInDialog) {
          this.guideDialog.close();
        }
      });
    }
  }

  bindInputControls() {
    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (this.guideDialog && this.guideDialog.open) return;

      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.world.state === GAME_STATE.PLAYING) {
          e.preventDefault();
          this.pauseGame();
        } else if (this.world.state === GAME_STATE.PAUSED) {
          e.preventDefault();
          this.resumeGame();
        }
        return;
      }

      if (this.world.state !== GAME_STATE.PLAYING) return;

      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          e.preventDefault();
          this.world.moveLeft();
          break;
        case 'ArrowRight':
        case 'KeyD':
          e.preventDefault();
          this.world.moveRight();
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'Space':
          e.preventDefault();
          this.world.jump();
          break;
        case 'ArrowDown':
        case 'KeyS':
        case 'ShiftLeft':
        case 'ShiftRight':
          e.preventDefault();
          this.world.dash();
          break;
        default:
          break;
      }
    });

    // Dedicated on-screen touch / pointer action buttons
    const bindActionBtn = (id, handler) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.audio.ensureContext();
        handler();
      });
    };

    bindActionBtn('touch-left', () => this.world.moveLeft());
    bindActionBtn('touch-right', () => this.world.moveRight());
    bindActionBtn('touch-jump', () => this.world.jump());
    bindActionBtn('touch-dash', () => this.world.dash());

    // Swipe gestures on the canvas
    this.canvas.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length === 0) return;
        this.audio.ensureContext();
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        this.touchStartTime = performance.now();
      },
      { passive: true }
    );

    this.canvas.addEventListener(
      'touchend',
      (e) => {
        if (this.world.state !== GAME_STATE.PLAYING || e.changedTouches.length === 0) return;
        const dx = e.changedTouches[0].clientX - this.touchStartX;
        const dy = e.changedTouches[0].clientY - this.touchStartY;
        const elapsed = performance.now() - this.touchStartTime;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (Math.max(absX, absY) < 22 && elapsed < 260) {
          this.world.jump();
          return;
        }
        if (absX > absY && absX > 26) {
          if (dx < 0) {
            this.world.moveLeft();
          } else {
            this.world.moveRight();
          }
        } else if (absY >= absX && absY > 26) {
          if (dy < 0) {
            this.world.jump();
          } else {
            this.world.dash();
          }
        }
      },
      { passive: true }
    );
  }

  loop(now) {
    const dt = Math.min(0.1, Math.max(0.001, (now - this.lastFrameTime) / 1000));
    this.lastFrameTime = now;

    this.world.update(dt);

    // Render using High-DPI logical coordinate normalization
    this.ctx.setTransform(
      this.scaleX * this.dpr,
      0,
      0,
      this.scaleY * this.dpr,
      0,
      0
    );
    this.world.render(this.ctx, LOGICAL_WIDTH, LOGICAL_HEIGHT, this.loader.images);

    requestAnimationFrame((nextNow) => this.loop(nextNow));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new MonsterRushApp();
  window.__MONSTER_RUSH__ = app;
  app.init();
});
