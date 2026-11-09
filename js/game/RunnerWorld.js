import { ObjectPool, CameraShaker } from '../engine/ObjectPool.js';

export const GAME_STATE = {
  INTRO: 'INTRO',
  START: 'START',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAMEOVER: 'GAMEOVER',
  VICTORY: 'VICTORY',
};

export const ENTITY_TYPE = {
  COIN: 'coin',
  GEM: 'gem',
  CHEST: 'chest',
  HEART: 'heart',
  POWERUP: 'powerup',
  STONE: 'stone',
  TRAP: 'trap',
  PORTAL: 'portal',
};

export class RunnerWorld {
  constructor(audio = null, callbacks = {}) {
    this.audio = audio;
    this.callbacks = callbacks;
    this.state = GAME_STATE.INTRO;

    // Stage & difficulty parameters
    this.stage = 1;
    this.baseSpeed = 350;
    this.maxSpeed = 690;
    this.speed = this.baseSpeed;
    this.distance = 0;
    this.elapsedTime = 0;

    // Score & collectibles
    this.score = 0;
    this.highScore = 0;
    this.coins = 0;
    this.gems = 0;
    this.chestsOpened = 0;
    this.portalGems = 0;
    this.portalGemTarget = 12;
    this.portalSpawned = false;
    this.combo = 1;
    this.comboTimer = 0;

    // Player state (lane: -1 left, 0 center, 1 right)
    this.player = {
      lane: 0,
      visualLane: 0,
      z: 0, // vertical jump height above island surface
      vz: 0,
      gravity: 1950,
      jumpVelocity: 740,
      isJumping: false,
      dashTimer: 0,
      dashCooldown: 0,
      invulnTimer: 0,
      hitFlashTimer: 0,
      lives: 3,
      maxLives: 4,
      magnetTimer: 0,
      shieldTimer: 0,
      speedBoostTimer: 0,
      runPhase: 0,
      squashX: 1,
      squashY: 1,
      tiltAngle: 0,
    };

    // Track & visual scrolling
    this.trackScroll = 0;
    this.spawnTimer = 0.65;
    this.patternIndex = 0;
    this.portalBurstTimer = 0;
    this.shaker = new CameraShaker();
    this._scratchProj = { x: 0, y: 0, groundY: 0, scale: 1 };

    // Zero-GC Object Pools
    this.entityPool = new ObjectPool(() => ({
      type: ENTITY_TYPE.COIN,
      lane: 0,
      visualLane: 0,
      dist: 0, // distance ahead of camera (player is at dist = 120)
      z: 0,
      radius: 36,
      collected: false,
      spinPhase: 0,
      subType: 0, // for powerups: 0=magnet, 1=shield, 2=speed
    }), 80);

    this.particlePool = new ObjectPool(() => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 6,
      alpha: 1,
      decay: 1.8,
      color: '#38bdf8',
      ring: false,
    }), 180);

    this.floatingTextPool = new ObjectPool(() => ({
      x: 0,
      y: 0,
      vy: -70,
      text: '',
      color: '#fde047',
      alpha: 1,
      scale: 1,
    }), 32);
  }

  resetRun(stage = 1) {
    this.stage = stage;
    this.baseSpeed = 350 + (stage - 1) * 45;
    this.speed = this.baseSpeed;
    this.distance = 0;
    this.elapsedTime = 0;

    if (stage === 1) {
      this.score = 0;
      this.coins = 0;
      this.gems = 0;
      this.chestsOpened = 0;
      this.player.lives = 3;
    } else {
      // Keep score/coins on next island stage and restore 1 heart
      this.player.lives = Math.min(this.player.maxLives, this.player.lives + 1);
    }

    this.portalGems = 0;
    this.portalGemTarget = 12 + (stage - 1) * 4;
    this.portalSpawned = false;
    this.combo = 1;
    this.comboTimer = 0;
    this.portalBurstTimer = 0;

    this.player.lane = 0;
    this.player.visualLane = 0;
    this.player.z = 0;
    this.player.vz = 0;
    this.player.isJumping = false;
    this.player.dashTimer = 0;
    this.player.dashCooldown = 0;
    this.player.invulnTimer = 0;
    this.player.hitFlashTimer = 0;
    this.player.magnetTimer = 0;
    this.player.shieldTimer = 0;
    this.player.speedBoostTimer = 0;
    this.player.squashX = 1;
    this.player.squashY = 1;
    this.player.tiltAngle = 0;

    this.entityPool.clear();
    this.particlePool.clear();
    this.floatingTextPool.clear();
    this.spawnTimer = 0.4;
    this.patternIndex = 0;

    // Seed initial welcoming wave of coins and gems on the runway
    this.spawnEntity(ENTITY_TYPE.COIN, 0, 380, 0);
    this.spawnEntity(ENTITY_TYPE.COIN, 0, 490, 0);
    this.spawnEntity(ENTITY_TYPE.GEM, 0, 610, 0);
    this.spawnEntity(ENTITY_TYPE.COIN, -1, 760, 0);
    this.spawnEntity(ENTITY_TYPE.GEM, -1, 880, 0);

    this.state = GAME_STATE.PLAYING;
    if (this.callbacks.onHudUpdate) this.callbacks.onHudUpdate();
  }

  moveLeft() {
    if (this.state !== GAME_STATE.PLAYING) return false;
    if (this.player.lane > -1) {
      this.player.lane -= 1;
      this.player.squashX = 1.18;
      this.player.squashY = 0.86;
      this.player.tiltAngle = -0.22;
      if (this.audio) this.audio.playLaneSwitch();
      return true;
    }
    return false;
  }

  moveRight() {
    if (this.state !== GAME_STATE.PLAYING) return false;
    if (this.player.lane < 1) {
      this.player.lane += 1;
      this.player.squashX = 1.18;
      this.player.squashY = 0.86;
      this.player.tiltAngle = 0.22;
      if (this.audio) this.audio.playLaneSwitch();
      return true;
    }
    return false;
  }

  jump() {
    if (this.state !== GAME_STATE.PLAYING) return false;
    if (!this.player.isJumping && this.player.z <= 2) {
      this.player.z = 1;
      this.player.vz = this.player.jumpVelocity;
      this.player.isJumping = true;
      this.player.squashX = 0.78;
      this.player.squashY = 1.28;
      if (this.audio) this.audio.playJump();
      this.emitBurst(this.getPlayerScreenX(540), 760, '#a7f3d0', 10, false);
      return true;
    }
    return false;
  }

  dash() {
    if (this.state !== GAME_STATE.PLAYING) return false;
    if (this.player.dashCooldown <= 0) {
      this.player.dashTimer = 0.55;
      this.player.dashCooldown = 1.5;
      this.player.squashX = 1.3;
      this.player.squashY = 0.76;
      if (this.audio) this.audio.playDash();
      this.emitBurst(this.getPlayerScreenX(540), 740, '#38bdf8', 16, true);
      return true;
    }
    return false;
  }

  spawnEntity(type, lane, dist, z = 0, subType = 0) {
    const ent = this.entityPool.acquire();
    ent.type = type;
    ent.lane = lane;
    ent.visualLane = lane;
    ent.dist = dist;
    ent.z = z;
    ent.collected = false;
    ent.spinPhase = Math.random() * Math.PI * 2;
    ent.subType = subType;
    ent.radius = type === ENTITY_TYPE.PORTAL ? 95 : type === ENTITY_TYPE.CHEST ? 48 : 38;
    return ent;
  }

  spawnWave() {
    // Once enough energy gems are collected, spawn the Magical Portal!
    if (this.portalGems >= this.portalGemTarget && !this.portalSpawned) {
      this.portalSpawned = true;
      this.spawnEntity(ENTITY_TYPE.PORTAL, 0, 1080, 0);
      this.spawnEntity(ENTITY_TYPE.GEM, -1, 860, 0);
      this.spawnEntity(ENTITY_TYPE.GEM, 0, 860, 0);
      this.spawnEntity(ENTITY_TYPE.GEM, 1, 860, 0);
      if (this.audio) this.audio.playPortalSpawn();
      this.spawnFloatingText(270, 320, 'PORTAL AWAKENED!', '#38bdf8', 1.35);
      return;
    }

    // If portal is already on track, spawn celebratory coin/gem trails leading into it
    if (this.portalSpawned) {
      this.spawnEntity(ENTITY_TYPE.COIN, 0, 1050, 0);
      return;
    }

    this.patternIndex++;
    const lanes = [-1, 0, 1];
    const safeLane = lanes[Math.floor(Math.random() * 3)];
    const startDist = 1080;

    // Every 5th wave: spawn a Treasure Chest or Power-up or Heart
    if (this.patternIndex % 5 === 0) {
      const rewardLane = lanes[(lanes.indexOf(safeLane) + 1) % 3];
      if (this.player.lives < this.player.maxLives && Math.random() < 0.35) {
        this.spawnEntity(ENTITY_TYPE.HEART, rewardLane, startDist + 80, 20);
      } else if (Math.random() < 0.55) {
        this.spawnEntity(ENTITY_TYPE.CHEST, rewardLane, startDist + 60, 0);
      } else {
        const pType = Math.floor(Math.random() * 3);
        this.spawnEntity(ENTITY_TYPE.POWERUP, rewardLane, startDist + 60, 15, pType);
      }
    }

    // Spawn line of coins + glowing energy gem in the safe lane
    for (let i = 0; i < 3; i++) {
      const isGem = i === 2 || (i === 1 && Math.random() < 0.5);
      const itemZ = i === 1 && this.patternIndex % 3 === 0 ? 65 : 0;
      this.spawnEntity(
        isGem ? ENTITY_TYPE.GEM : ENTITY_TYPE.COIN,
        safeLane,
        startDist + i * 115,
        itemZ
      );
    }

    // Spawn obstacle(s) in the other lanes based on difficulty
    const difficultyFactor = Math.min(1, this.elapsedTime / 45 + (this.stage - 1) * 0.25);
    const numObstacles = difficultyFactor > 0.45 && Math.random() < 0.65 ? 2 : 1;

    let placed = 0;
    for (let l = 0; l < lanes.length; l++) {
      const lane = lanes[l];
      if (lane === safeLane) continue;
      if (placed >= numObstacles) {
        // Put bonus gem in the remaining open lane
        if (Math.random() < 0.7) {
          this.spawnEntity(ENTITY_TYPE.GEM, lane, startDist + 115, 0);
        }
        continue;
      }
      const isTrap = Math.random() < 0.48;
      this.spawnEntity(
        isTrap ? ENTITY_TYPE.TRAP : ENTITY_TYPE.STONE,
        lane,
        startDist + placed * 95,
        0
      );
      // Place a high mid-air gem above spinning wooden traps to reward jumping!
      if (isTrap) {
        this.spawnEntity(ENTITY_TYPE.GEM, lane, startDist + placed * 95, 78);
      }
      placed++;
    }
  }

  emitBurst(x, y, color, count = 14, includeRing = false) {
    if (includeRing) {
      const ring = this.particlePool.acquire();
      ring.x = x;
      ring.y = y;
      ring.vx = 0;
      ring.vy = 0;
      ring.size = 12;
      ring.alpha = 0.95;
      ring.decay = 2.4;
      ring.color = color;
      ring.ring = true;
    }

    for (let i = 0; i < count; i++) {
      const p = this.particlePool.acquire();
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35;
      const spd = 90 + Math.random() * 240;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd - 40;
      p.size = 4 + Math.random() * 6;
      p.alpha = 1;
      p.decay = 1.6 + Math.random() * 0.9;
      p.color = color;
      p.ring = false;
    }
  }

  spawnFloatingText(x, y, text, color = '#fde047', scale = 1.0) {
    const ft = this.floatingTextPool.acquire();
    ft.x = x;
    ft.y = y;
    ft.vy = -85;
    ft.text = text;
    ft.color = color;
    ft.alpha = 1.0;
    ft.scale = scale;
  }

  getPlayerScreenX(logicalW = 540) {
    const centerX = logicalW * 0.5;
    const laneOffset = logicalW * 0.255;
    return centerX + this.player.visualLane * laneOffset;
  }

  update(dt) {
    if (this.state !== GAME_STATE.PLAYING) {
      this.shaker.update(dt);
      return;
    }

    this.elapsedTime += dt;

    // Smoothly ramp difficulty speed over time
    const targetBase = Math.min(
      this.maxSpeed,
      this.baseSpeed + this.elapsedTime * 4.2
    );
    const dashMult = this.player.dashTimer > 0 ? 1.45 : this.player.speedBoostTimer > 0 ? 1.28 : 1.0;
    this.speed = targetBase * dashMult;
    this.distance += this.speed * dt * 0.1;
    this.trackScroll = (this.trackScroll + this.speed * dt) % 120;

    // Timers
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 1;
      }
    }
    if (this.player.dashTimer > 0) this.player.dashTimer = Math.max(0, this.player.dashTimer - dt);
    if (this.player.dashCooldown > 0) this.player.dashCooldown = Math.max(0, this.player.dashCooldown - dt);
    if (this.player.invulnTimer > 0) this.player.invulnTimer = Math.max(0, this.player.invulnTimer - dt);
    if (this.player.hitFlashTimer > 0) this.player.hitFlashTimer = Math.max(0, this.player.hitFlashTimer - dt);
    if (this.player.magnetTimer > 0) this.player.magnetTimer = Math.max(0, this.player.magnetTimer - dt);
    if (this.player.shieldTimer > 0) this.player.shieldTimer = Math.max(0, this.player.shieldTimer - dt);
    if (this.player.speedBoostTimer > 0) this.player.speedBoostTimer = Math.max(0, this.player.speedBoostTimer - dt);

    // Smooth lane interpolation & squash/stretch spring recovery
    const laneDiff = this.player.lane - this.player.visualLane;
    this.player.visualLane += laneDiff * Math.min(1, dt * 15);
    this.player.squashX += (1 - this.player.squashX) * Math.min(1, dt * 12);
    this.player.squashY += (1 - this.player.squashY) * Math.min(1, dt * 12);
    this.player.tiltAngle += (0 - this.player.tiltAngle) * Math.min(1, dt * 10);
    this.player.runPhase += dt * (this.speed * 0.032);

    // Vertical Jump Physics
    if (this.player.isJumping || this.player.z > 0) {
      this.player.z += this.player.vz * dt;
      this.player.vz -= this.player.gravity * dt;
      if (this.player.z <= 0) {
        this.player.z = 0;
        this.player.vz = 0;
        this.player.isJumping = false;
        this.player.squashX = 1.24;
        this.player.squashY = 0.78;
      }
    }

    // Spawn waves
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnWave();
      const interval = Math.max(0.68, 1.32 - (this.speed - 350) / 720);
      this.spawnTimer = interval;
    }

    // Update entities & evaluate collisions
    const playerDist = 120;
    const hitWindow = 52;
    const playerScreenX = this.getPlayerScreenX(540);
    const playerScreenY = 740 - this.player.z * 0.9;

    const activeEntities = this.entityPool.activeList;
    for (let i = activeEntities.length - 1; i >= 0; i--) {
      const ent = activeEntities[i];
      ent.dist -= this.speed * dt;
      ent.spinPhase += dt * 4.5;

      // Magnet attraction for coins & gems
      const isCollectible = ent.type === ENTITY_TYPE.COIN || ent.type === ENTITY_TYPE.GEM;
      if (isCollectible && (this.player.magnetTimer > 0 || this.player.dashTimer > 0) && ent.dist < 440 && ent.dist > 40) {
        ent.visualLane += (this.player.visualLane - ent.visualLane) * Math.min(1, dt * 9);
      } else {
        ent.visualLane = ent.lane;
      }

      // Check collision window around player (dist ~ 120)
      if (!ent.collected && Math.abs(ent.dist - playerDist) <= hitWindow) {
        const laneDelta = Math.abs(ent.visualLane - this.player.visualLane);

        if (ent.type === ENTITY_TYPE.PORTAL) {
          // Portal covers the whole island width when awakened!
          ent.collected = true;
          this.handleVictory(playerScreenX, playerScreenY);
          this.entityPool.releaseAt(i);
          return;
        }

        if (laneDelta < 0.48) {
          if (ent.type === ENTITY_TYPE.COIN) {
            if (Math.abs(this.player.z - ent.z) < 75) {
              ent.collected = true;
              this.collectCoin(playerScreenX, playerScreenY);
              this.entityPool.releaseAt(i);
              continue;
            }
          } else if (ent.type === ENTITY_TYPE.GEM) {
            if (Math.abs(this.player.z - ent.z) < 82) {
              ent.collected = true;
              this.collectGem(playerScreenX, playerScreenY);
              this.entityPool.releaseAt(i);
              continue;
            }
          } else if (ent.type === ENTITY_TYPE.CHEST) {
            ent.collected = true;
            this.collectChest(playerScreenX, playerScreenY);
            this.entityPool.releaseAt(i);
            continue;
          } else if (ent.type === ENTITY_TYPE.HEART) {
            ent.collected = true;
            this.collectHeart(playerScreenX, playerScreenY);
            this.entityPool.releaseAt(i);
            continue;
          } else if (ent.type === ENTITY_TYPE.POWERUP) {
            ent.collected = true;
            this.collectPowerup(ent.subType, playerScreenX, playerScreenY);
            this.entityPool.releaseAt(i);
            continue;
          } else if (ent.type === ENTITY_TYPE.TRAP) {
            // Player can jump cleanly over Spinning Wooden Traps!
            if (this.player.z > 42) {
              // Cleared trap by jumping!
            } else {
              ent.collected = true;
              this.handleObstacleHit(ent, playerScreenX, playerScreenY);
              this.entityPool.releaseAt(i);
              if (this.state === GAME_STATE.GAMEOVER) return;
              continue;
            }
          } else if (ent.type === ENTITY_TYPE.STONE) {
            // Tall stone block: must dodge or break with Dash / Shield
            if (this.player.z > 98) {
              // Super-high jump clearance
            } else {
              ent.collected = true;
              this.handleObstacleHit(ent, playerScreenX, playerScreenY);
              this.entityPool.releaseAt(i);
              if (this.state === GAME_STATE.GAMEOVER) return;
              continue;
            }
          }
        }
      }

      if (ent.dist < -80) {
        this.entityPool.releaseAt(i);
      }
    }

    // Update particles
    const activeParticles = this.particlePool.activeList;
    for (let i = activeParticles.length - 1; i >= 0; i--) {
      const p = activeParticles[i];
      if (p.ring) {
        p.size += 260 * dt;
        p.alpha -= p.decay * dt;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 320 * dt;
        p.alpha -= p.decay * dt;
      }
      if (p.alpha <= 0) {
        this.particlePool.releaseAt(i);
      }
    }

    // Update floating texts
    const activeTexts = this.floatingTextPool.activeList;
    for (let i = activeTexts.length - 1; i >= 0; i--) {
      const ft = activeTexts[i];
      ft.y += ft.vy * dt;
      ft.alpha -= 1.25 * dt;
      if (ft.alpha <= 0) {
        this.floatingTextPool.releaseAt(i);
      }
    }

    this.shaker.update(dt);
    if (this.callbacks.onHudUpdate) this.callbacks.onHudUpdate();
  }

  collectCoin(x, y) {
    this.coins += 1;
    const pts = 25 * this.combo;
    this.score += pts;
    this.highScore = Math.max(this.highScore, this.score);
    if (this.audio) this.audio.playCoin();
    this.emitBurst(x, y - 20, '#facc15', 10, false);
    this.spawnFloatingText(x, y - 45, `+${pts}`, '#fde047', 1.0);
  }

  collectGem(x, y) {
    this.gems += 1;
    this.portalGems = Math.min(this.portalGemTarget, this.portalGems + 1);
    this.combo = Math.min(5, this.combo + 1);
    this.comboTimer = 2.6;
    const pts = 100 * this.combo;
    this.score += pts;
    this.highScore = Math.max(this.highScore, this.score);
    if (this.audio) this.audio.playGem(this.combo);
    this.emitBurst(x, y - 25, '#38bdf8', 18, true);
    this.spawnFloatingText(x, y - 55, `+${pts} GEM x${this.combo}!`, '#38bdf8', 1.18);

    // Immediately trigger portal wave if target reached
    if (this.portalGems >= this.portalGemTarget && !this.portalSpawned) {
      this.spawnTimer = 0.05;
    }
  }

  collectChest(x, y) {
    this.chestsOpened += 1;
    this.coins += 5;
    this.gems += 2;
    this.portalGems = Math.min(this.portalGemTarget, this.portalGems + 2);
    const pts = 500 * this.combo;
    this.score += pts;
    this.highScore = Math.max(this.highScore, this.score);
    if (this.audio) this.audio.playChestOpen();
    this.shaker.addTrauma(0.35);
    this.emitBurst(x, y - 30, '#fbbf24', 28, true);
    this.spawnFloatingText(x, y - 65, `TREASURE +${pts}!`, '#fbbf24', 1.3);
  }

  collectHeart(x, y) {
    if (this.player.lives < this.player.maxLives) {
      this.player.lives += 1;
      this.spawnFloatingText(x, y - 55, '+1 LIFE!', '#fb7185', 1.25);
    } else {
      this.score += 300;
      this.spawnFloatingText(x, y - 55, '+300 FULL HEART!', '#fb7185', 1.2);
    }
    this.highScore = Math.max(this.highScore, this.score);
    if (this.audio) this.audio.playChestOpen();
    this.emitBurst(x, y - 25, '#fb7185', 18, true);
  }

  collectPowerup(subType, x, y) {
    this.score += 200;
    this.highScore = Math.max(this.highScore, this.score);
    if (subType === 0) {
      this.player.magnetTimer = 8.0;
      this.spawnFloatingText(x, y - 55, 'GEM MAGNET!', '#38bdf8', 1.25);
    } else if (subType === 1) {
      this.player.shieldTimer = 8.0;
      this.spawnFloatingText(x, y - 55, 'STAR SHIELD!', '#facc15', 1.25);
    } else {
      this.player.speedBoostTimer = 6.0;
      this.spawnFloatingText(x, y - 55, 'SPEED RUSH!', '#4ade80', 1.25);
    }
    if (this.audio) this.audio.playChestOpen();
    this.emitBurst(x, y - 25, '#a855f7', 20, true);
  }

  handleObstacleHit(ent, x, y) {
    // If dashing or shielded, smash the obstacle for bonus score!
    if (this.player.dashTimer > 0 || this.player.shieldTimer > 0) {
      if (this.player.shieldTimer > 0 && this.player.dashTimer <= 0) {
        this.player.shieldTimer = 0; // Shield absorbed the impact
      }
      const pts = 150;
      this.score += pts;
      this.highScore = Math.max(this.highScore, this.score);
      this.shaker.addTrauma(0.45);
      if (this.audio) this.audio.playDash();
      this.emitBurst(x, y - 25, '#38bdf8', 22, true);
      this.spawnFloatingText(x, y - 55, `SMASH +${pts}!`, '#38bdf8', 1.2);
      return;
    }

    if (this.player.invulnTimer > 0) return;

    this.player.lives -= 1;
    this.combo = 1;
    this.comboTimer = 0;
    this.player.invulnTimer = 1.4;
    this.player.hitFlashTimer = 0.45;
    this.player.squashX = 1.35;
    this.player.squashY = 0.65;
    this.shaker.addTrauma(0.75);
    if (this.audio) this.audio.playHit();
    this.emitBurst(x, y - 20, '#ef4444', 24, true);
    this.spawnFloatingText(x, y - 55, 'OUCH! -1 HEART', '#f87171', 1.25);

    if (this.player.lives <= 0) {
      this.player.lives = 0;
      this.state = GAME_STATE.GAMEOVER;
      if (this.audio) this.audio.playGameOver();
      if (this.callbacks.onGameOver) this.callbacks.onGameOver();
    }
  }

  handleVictory(x, y) {
    const heartBonus = this.player.lives * 300;
    const stageBonus = this.stage * 1000;
    this.score += heartBonus + stageBonus;
    this.highScore = Math.max(this.highScore, this.score);
    this.portalBurstTimer = 1.0;
    this.shaker.addTrauma(0.55);
    this.emitBurst(x, y - 60, '#38bdf8', 40, true);
    this.emitBurst(x, y - 60, '#fde047', 35, true);
    this.state = GAME_STATE.VICTORY;
    if (this.audio) this.audio.playVictory();
    if (this.callbacks.onVictory) this.callbacks.onVictory({ heartBonus, stageBonus });
  }

  /**
   * Projects 3D track coordinates (lane in [-1..1], dist in [0..1100], z height)
   * onto 2D logical canvas coordinates (540 x 960).
   */
  projectTrackPoint(lane, dist, z, width, height) {
    const horizonY = height * 0.30;
    const playerGroundY = height * 0.79;
    const normalizedDist = Math.max(-0.15, Math.min(1.2, (dist - 120) / 960));
    // Perspective depth curve so closer objects move faster and scale up smoothly
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

  render(ctx, width, height, images) {
    ctx.save();

    // Apply camera shake
    if (this.shaker.trauma > 0) {
      ctx.translate(this.shaker.offsetX, this.shaker.offsetY);
      ctx.rotate(this.shaker.angle);
    }

    // 1. Sky & Floating Island Concept Art Backdrop
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#0ea5e9');
    skyGrad.addColorStop(0.32, '#38bdf8');
    skyGrad.addColorStop(0.65, '#bae6fd');
    skyGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    if (images.environmentConcept) {
      // Draw floating island environment concept across top horizon with subtle parallax sway
      const swayX = Math.sin(this.elapsedTime * 0.5) * 14 - this.player.visualLane * 18;
      const envH = height * 0.48;
      const envW = (images.environmentConcept.naturalWidth / images.environmentConcept.naturalHeight) * envH;
      const envX = (width - envW) * 0.5 + swayX;
      ctx.drawImage(images.environmentConcept, envX, -12, envW, envH);

      // Soft atmospheric blend into the 3D island track
      const horizonFade = ctx.createLinearGradient(0, height * 0.25, 0, height * 0.44);
      horizonFade.addColorStop(0, 'rgba(16, 185, 129, 0)');
      horizonFade.addColorStop(0.65, 'rgba(16, 185, 129, 0.45)');
      horizonFade.addColorStop(1, '#065f46');
      ctx.fillStyle = horizonFade;
      ctx.fillRect(0, height * 0.25, width, height * 0.22);
    }

    // 2. 3-Lane Floating Island Perspective Runway
    const horizonY = height * 0.30;
    const bottomY = height;
    const topHalfW = width * 0.13;
    const bottomHalfW = width * 0.49;

    // Outer turquoise waterfall cliffs on left & right of island road
    const cliffGrad = ctx.createLinearGradient(0, horizonY, 0, bottomY);
    cliffGrad.addColorStop(0, '#0d9488');
    cliffGrad.addColorStop(0.5, '#047857');
    cliffGrad.addColorStop(1, '#064e3b');
    ctx.fillStyle = cliffGrad;
    ctx.fillRect(0, horizonY, width, bottomY - horizonY);

    // Animated turquoise waterfalls along outer edges
    ctx.fillStyle = 'rgba(56, 189, 248, 0.32)';
    const wfOffset = (this.trackScroll * 1.4) % 80;
    for (let i = 0; i < 6; i++) {
      const wy = horizonY + ((i * 115 + wfOffset) % (bottomY - horizonY));
      ctx.fillRect(10, wy, 26, 55);
      ctx.fillRect(width - 36, wy + 20, 26, 55);
    }

    // Main Lush Emerald & Ancient Stone Island Roadway
    ctx.beginPath();
    ctx.moveTo(width * 0.5 - topHalfW, horizonY);
    ctx.lineTo(width * 0.5 + topHalfW, horizonY);
    ctx.lineTo(width * 0.5 + bottomHalfW, bottomY);
    ctx.lineTo(width * 0.5 - bottomHalfW, bottomY);
    ctx.closePath();

    const roadGrad = ctx.createLinearGradient(0, horizonY, 0, bottomY);
    roadGrad.addColorStop(0, '#10b981');
    roadGrad.addColorStop(0.25, '#059669');
    roadGrad.addColorStop(0.7, '#047857');
    roadGrad.addColorStop(1, '#064e3b');
    ctx.fillStyle = roadGrad;
    ctx.fill();

    // Glowing gold/cyan stone curb borders
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#38bdf8';
    ctx.stroke();

    // Perspective stone slabs & glowing rune lane dividers
    ctx.strokeStyle = 'rgba(167, 243, 208, 0.35)';
    ctx.lineWidth = 2.5;
    for (const laneDiv of [-0.33, 0.33]) {
      ctx.beginPath();
      ctx.moveTo(width * 0.5 + topHalfW * laneDiv, horizonY);
      ctx.lineTo(width * 0.5 + bottomHalfW * laneDiv, bottomY);
      ctx.stroke();
    }

    // Scrolling runic stepping-stone bands
    const numBands = 10;
    for (let i = 0; i < numBands; i++) {
      const bandDist = ((i * 100 - this.trackScroll + 1000) % 1000);
      const proj = this.projectTrackPoint(0, bandDist + 80, 0, width, height);
      const halfW = (topHalfW + (bottomHalfW - topHalfW) * ((proj.groundY - horizonY) / (bottomY - horizonY))) * 0.94;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = Math.max(1.5, 4 * proj.scale);
      ctx.beginPath();
      ctx.moveTo(width * 0.5 - halfW, proj.groundY);
      ctx.lineTo(width * 0.5 + halfW, proj.groundY);
      ctx.stroke();
    }

    // 3. Sort active entities back-to-front (far dist first) and draw
    const activeEntities = this.entityPool.activeList;
    // Simple insertion sort on activeEntities in-place (zero allocation!)
    for (let i = 1; i < activeEntities.length; i++) {
      const key = activeEntities[i];
      let j = i - 1;
      while (j >= 0 && activeEntities[j].dist < key.dist) {
        activeEntities[j + 1] = activeEntities[j];
        j--;
      }
      activeEntities[j + 1] = key;
    }

    for (let i = 0; i < activeEntities.length; i++) {
      const ent = activeEntities[i];
      if (ent.dist > 1120 || ent.dist < -40) continue;
      this.drawEntity(ctx, ent, width, height, images);
    }

    // 4. Draw Our Canonical Turquoise Monster Hero (Bramble)
    this.drawPlayer(ctx, width, height, images);

    // 5. Draw Particles
    const activeParticles = this.particlePool.activeList;
    for (let i = 0; i < activeParticles.length; i++) {
      const p = activeParticles[i];
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      if (p.ring) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 6. Draw Floating Score & Callout Popups
    const activeTexts = this.floatingTextPool.activeList;
    ctx.textAlign = 'center';
    for (let i = 0; i < activeTexts.length; i++) {
      const ft = activeTexts[i];
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, ft.alpha));
      ctx.font = `800 ${Math.round(22 * ft.scale)}px 'Fredoka', 'Nunito', sans-serif`;
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.lineWidth = 5;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    // 7. Damage Vignette Flash on Hit
    if (this.player.hitFlashTimer > 0) {
      ctx.fillStyle = `rgba(239, 68, 68, ${this.player.hitFlashTimer * 0.55})`;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  }

  drawEntity(ctx, ent, width, height, images) {
    const bobZ = (ent.type === ENTITY_TYPE.COIN || ent.type === ENTITY_TYPE.GEM || ent.type === ENTITY_TYPE.HEART || ent.type === ENTITY_TYPE.POWERUP)
      ? Math.sin(ent.spinPhase) * 10
      : 0;
    const proj = this.projectTrackPoint(ent.visualLane, ent.dist, ent.z + bobZ, width, height);

    ctx.save();
    // Draw ground shadow
    ctx.fillStyle = 'rgba(6, 28, 22, 0.42)';
    const shadowW = (ent.type === ENTITY_TYPE.PORTAL ? 140 : 42) * proj.scale;
    const shadowH = (ent.type === ENTITY_TYPE.PORTAL ? 30 : 14) * proj.scale;
    ctx.beginPath();
    ctx.ellipse(proj.x, proj.groundY + 6 * proj.scale, shadowW, shadowH, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(proj.x, proj.y);

    if (ent.type === ENTITY_TYPE.PORTAL) {
      const size = 250 * proj.scale;
      // Magical radial glow behind the portal
      const glow = ctx.createRadialGradient(0, -size * 0.35, size * 0.08, 0, -size * 0.35, size * 0.8);
      glow.addColorStop(0, 'rgba(253, 224, 71, 0.95)');
      glow.addColorStop(0.45, 'rgba(56, 189, 248, 0.65)');
      glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, -size * 0.35, size * 0.8, 0, Math.PI * 2);
      ctx.fill();

      if (images.portal) {
        ctx.drawImage(images.portal, -size * 0.5, -size * 0.88, size, size);
      }
    } else if (ent.type === ENTITY_TYPE.GEM) {
      const size = 86 * proj.scale;
      const glow = ctx.createRadialGradient(0, -size * 0.3, 4, 0, -size * 0.3, size * 0.7);
      glow.addColorStop(0, 'rgba(56, 189, 248, 0.85)');
      glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, -size * 0.3, size * 0.7, 0, Math.PI * 2);
      ctx.fill();

      if (images.gem) {
        ctx.drawImage(images.gem, -size * 0.45, -size * 0.85, size * 0.9, size);
      }
    } else if (ent.type === ENTITY_TYPE.COIN) {
      const size = 76 * proj.scale;
      const pulseX = 0.85 + Math.sin(ent.spinPhase * 1.4) * 0.15;
      ctx.scale(pulseX, 1);
      if (images.coin) {
        ctx.drawImage(images.coin, -size * 0.5, -size * 0.85, size, size);
      }
    } else if (ent.type === ENTITY_TYPE.CHEST) {
      const size = 112 * proj.scale;
      if (images.chest) {
        ctx.drawImage(images.chest, -size * 0.55, -size * 0.82, size * 1.1, size * 0.9);
      }
    } else if (ent.type === ENTITY_TYPE.STONE) {
      const size = 118 * proj.scale;
      if (images.stone) {
        ctx.drawImage(images.stone, -size * 0.5, -size * 0.86, size, size * 1.05);
      }
    } else if (ent.type === ENTITY_TYPE.TRAP) {
      const size = 122 * proj.scale;
      ctx.translate(0, -size * 0.34);
      ctx.rotate(Math.sin(ent.spinPhase * 2) * 0.08);
      if (images.trap) {
        ctx.drawImage(images.trap, -size * 0.62, -size * 0.42, size * 1.24, size * 0.84);
      }
    } else if (ent.type === ENTITY_TYPE.HEART) {
      const size = 82 * proj.scale;
      if (images.heart) {
        ctx.drawImage(images.heart, -size * 0.5, -size * 0.85, size, size * 0.92);
      }
    } else if (ent.type === ENTITY_TYPE.POWERUP) {
      const size = 95 * proj.scale;
      if (images.powerups) {
        ctx.drawImage(images.powerups, -size * 0.68, -size * 0.82, size * 1.36, size * 0.85);
      }
    }

    ctx.restore();
  }

  drawPlayer(ctx, width, height, images) {
    const x = this.getPlayerScreenX(width);
    const groundY = height * 0.79;
    const bounceY = this.player.isJumping ? 0 : Math.abs(Math.sin(this.player.runPhase)) * 14;
    const y = groundY - this.player.z * 0.9 - bounceY;

    ctx.save();

    // Ground shadow shrinks as Bramble jumps higher
    const shadowScale = Math.max(0.35, 1 - this.player.z / 260);
    ctx.fillStyle = 'rgba(4, 24, 19, 0.5)';
    ctx.beginPath();
    ctx.ellipse(x, groundY + 12, 48 * shadowScale, 16 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Blink during post-hit invulnerability
    if (this.player.invulnTimer > 0 && Math.floor(this.player.invulnTimer * 16) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    ctx.translate(x, y);
    ctx.rotate(this.player.tiltAngle + (this.player.isJumping ? 0 : Math.sin(this.player.runPhase) * 0.05));
    ctx.scale(this.player.squashX, this.player.squashY);

    // Draw Magnet / Shield / Dash Aura
    if (this.player.dashTimer > 0 || this.player.shieldTimer > 0 || this.player.magnetTimer > 0) {
      const auraColor = this.player.dashTimer > 0
        ? 'rgba(56, 189, 248, 0.55)'
        : this.player.shieldTimer > 0
          ? 'rgba(250, 204, 21, 0.48)'
          : 'rgba(168, 85, 247, 0.42)';
      ctx.fillStyle = auraColor;
      ctx.beginPath();
      ctx.arc(0, -68, 82 + Math.sin(this.elapsedTime * 10) * 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }

    const heroImg = images.hero || images.characterCanonical;
    if (heroImg) {
      const w = 142;
      const h = 156;
      ctx.drawImage(heroImg, -w * 0.5, -h + 14, w, h);
    }

    ctx.restore();
  }
}
