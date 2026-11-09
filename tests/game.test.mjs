import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ObjectPool } from '../js/engine/ObjectPool.js';
import { ASSET_MANIFEST, STAGE_CLEAR_VIDEOS, TRAILER_VIDEO_PATH } from '../js/engine/AssetLoader.js';
import { RunnerWorld, GAME_STATE, ENTITY_TYPE } from '../js/game/RunnerWorld.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

test('1. Stage-completion celebratory videos (Stage 1 & Stage 2) and launch trailer exist and are verified', () => {
  for (const [stageNum, relPath] of Object.entries(STAGE_CLEAR_VIDEOS)) {
    const fullPath = path.join(ROOT_DIR, relPath);
    assert.ok(fs.existsSync(fullPath), `Missing generated stage-clear video [Stage ${stageNum}] at ${relPath}`);
    const stat = fs.statSync(fullPath);
    assert.ok(
      stat.size > 4_000_000,
      `Stage-clear video [Stage ${stageNum}] at ${relPath} must be a valid MP4 (${stat.size} bytes)`
    );
  }

  const trailerFullPath = path.join(ROOT_DIR, TRAILER_VIDEO_PATH);
  assert.ok(fs.existsSync(trailerFullPath), `Missing trailer video at ${TRAILER_VIDEO_PATH}`);
});

test('2. Organized asset directories (character/, environment/, items/, ui/) contain all required assets', () => {
  for (const [key, relPath] of Object.entries(ASSET_MANIFEST)) {
    const fullPath = path.join(ROOT_DIR, relPath);
    assert.ok(fs.existsSync(fullPath), `Missing generated image asset [${key}] at ${relPath}`);
    const stat = fs.statSync(fullPath);
    assert.ok(stat.size > 2000, `Asset [${key}] at ${relPath} is unexpectedly small (${stat.size} bytes)`);
  }

  for (const subDir of ['character', 'environment', 'items', 'ui']) {
    const dirPath = path.join(ROOT_DIR, 'public', 'assets', subDir);
    assert.ok(fs.existsSync(dirPath), `Missing organized asset directory public/assets/${subDir}`);
    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.png'));
    assert.ok(files.length >= 1, `Directory public/assets/${subDir} must contain generated PNG assets`);
  }
});

test('3. ObjectPool reuses pre-allocated objects without losing track of active items', () => {
  const pool = new ObjectPool(() => ({ v: 0 }), 4);
  assert.equal(pool.activeList.length, 0);

  const a = pool.acquire();
  const b = pool.acquire();
  a.v = 10;
  b.v = 20;
  assert.equal(pool.activeList.length, 2);

  pool.releaseAt(0);
  assert.equal(pool.activeList.length, 1);
  assert.equal(pool.activeList[0].v, 20);

  const c = pool.acquire();
  assert.equal(c, a, 'Released object should be recycled from the free pool');
  pool.clear();
  assert.equal(pool.activeList.length, 0);
});

test('4. Player lane switching, parabolic jump physics, and spin-dash controls', () => {
  const world = new RunnerWorld();
  world.resetRun(1);
  assert.equal(world.state, GAME_STATE.PLAYING);
  assert.equal(world.player.lane, 0);

  assert.equal(world.moveLeft(), true);
  assert.equal(world.player.lane, -1);
  assert.equal(world.moveLeft(), false, 'Should not move past left lane (-1)');

  assert.equal(world.moveRight(), true);
  assert.equal(world.player.lane, 0);
  assert.equal(world.moveRight(), true);
  assert.equal(world.player.lane, 1);
  assert.equal(world.moveRight(), false, 'Should not move past right lane (+1)');

  assert.equal(world.jump(), true);
  assert.equal(world.player.isJumping, true);
  assert.equal(world.jump(), false, 'Cannot double-jump while already airborne');

  world.update(0.15);
  assert.ok(world.player.z > 50, `Player should rise into the air during jump (z=${world.player.z})`);

  for (let i = 0; i < 20; i++) {
    world.update(0.05);
  }
  assert.equal(world.player.z, 0);
  assert.equal(world.player.isJumping, false);

  assert.equal(world.dash(), true);
  assert.ok(world.player.dashTimer > 0);
  assert.ok(world.player.dashCooldown > 0);
  assert.equal(world.dash(), false, 'Dash should respect cooldown');
});

test('5. Collecting coins, glowing energy gems, treasure chests, hearts, and powerups', () => {
  const world = new RunnerWorld();
  world.resetRun(1);
  world.entityPool.clear();
  world.spawnTimer = 999;

  world.spawnEntity(ENTITY_TYPE.COIN, 0, 125, 0);
  world.update(0.01);
  assert.equal(world.coins, 1);
  assert.equal(world.score, 25);

  world.spawnEntity(ENTITY_TYPE.GEM, 0, 125, 0);
  world.update(0.01);
  assert.equal(world.gems, 1);
  assert.equal(world.portalGems, 1);
  assert.equal(world.combo, 2);
  assert.equal(world.score, 225);

  world.spawnEntity(ENTITY_TYPE.CHEST, 0, 125, 0);
  world.update(0.01);
  assert.equal(world.chestsOpened, 1);
  assert.equal(world.coins, 6);
  assert.equal(world.gems, 3);

  world.spawnEntity(ENTITY_TYPE.POWERUP, 0, 125, 0, 1);
  world.update(0.01);
  assert.ok(world.player.shieldTimer > 5, 'Star Shield power-up should activate shieldTimer');
});

test('6. Jumping over traps, obstacle damage, shield protection, and game-over state', () => {
  let gameOverTriggered = false;
  const world = new RunnerWorld(null, {
    onGameOver: () => {
      gameOverTriggered = true;
    },
  });
  world.resetRun(1);
  world.entityPool.clear();
  world.spawnTimer = 999;

  world.player.z = 65;
  world.player.isJumping = true;
  world.spawnEntity(ENTITY_TYPE.TRAP, 0, 122, 0);
  world.update(0.01);
  assert.equal(world.player.lives, 3, 'Jumping over a trap should avoid losing a life');

  world.entityPool.clear();
  world.player.z = 0;
  world.player.isJumping = false;
  world.spawnEntity(ENTITY_TYPE.STONE, 0, 122, 0);
  world.update(0.01);
  assert.equal(world.player.lives, 2);

  world.player.invulnTimer = 0;
  world.player.shieldTimer = 5.0;
  const scoreBeforeSmash = world.score;
  world.spawnEntity(ENTITY_TYPE.STONE, 0, 122, 0);
  world.update(0.01);
  assert.equal(world.player.lives, 2, 'Shield should protect player from losing a heart');
  assert.equal(world.player.shieldTimer, 0);
  assert.equal(world.score, scoreBeforeSmash + 150);

  world.player.invulnTimer = 0;
  world.spawnEntity(ENTITY_TYPE.STONE, 0, 122, 0);
  world.update(0.01);
  assert.equal(world.player.lives, 1);

  world.player.invulnTimer = 0;
  world.spawnEntity(ENTITY_TYPE.TRAP, 0, 122, 0);
  world.update(0.01);
  assert.equal(world.player.lives, 0);
  assert.equal(world.state, GAME_STATE.GAMEOVER);
  assert.equal(gameOverTriggered, true);
});

test('7. Portal awakening after collecting target gems, Victory transition, and Stage 2 progression', () => {
  let victoryPayload = null;
  const world = new RunnerWorld(null, {
    onVictory: (bonuses) => {
      victoryPayload = bonuses;
    },
  });
  world.resetRun(1);
  world.entityPool.clear();
  world.spawnTimer = 999;

  for (let i = 0; i < 12; i++) {
    world.spawnEntity(ENTITY_TYPE.GEM, 0, 122, 0);
    world.update(0.005);
  }
  assert.equal(world.portalGems, 12);

  world.spawnWave();
  assert.equal(world.portalSpawned, true);
  const portalEntity = world.entityPool.activeList.find((e) => e.type === ENTITY_TYPE.PORTAL);
  assert.ok(portalEntity, 'Magical Portal entity must be spawned on the runway');

  portalEntity.dist = 122;
  world.update(0.01);
  assert.equal(world.state, GAME_STATE.VICTORY);
  assert.ok(victoryPayload);
  assert.equal(victoryPayload.stageBonus, 1000);

  const stage1Score = world.score;
  world.resetRun(2);
  assert.equal(world.state, GAME_STATE.PLAYING);
  assert.equal(world.stage, 2);
  assert.equal(world.score, stage1Score);
  assert.ok(world.baseSpeed > 350);
  assert.equal(world.portalGemTarget, 16);
});

test('8. Static security verification: zero unsafe DOM sinks or hardcoded secrets', () => {
  const filesToScan = [
    'index.html',
    'js/main.js',
    'js/game/RunnerWorld.js',
    'js/engine/AssetLoader.js',
    'js/engine/AudioSynthesizer.js',
    'js/engine/ObjectPool.js',
  ];

  const forbiddenPatterns = [
    { regex: /\binnerHTML\b/, label: 'innerHTML' },
    { regex: /\bouterHTML\b/, label: 'outerHTML' },
    { regex: /\binsertAdjacentHTML\b/, label: 'insertAdjacentHTML' },
    { regex: /\bdocument\.write\b/, label: 'document.write' },
    { regex: /\beval\s*\(/, label: 'eval()' },
    { regex: /AIza[0-9A-Za-z_-]{20,}/, label: 'Hardcoded Google API Key' },
    { regex: /AQ\.[0-9A-Za-z_-]{20,}/, label: 'Hardcoded AQ Token' },
  ];

  for (const relFile of filesToScan) {
    const content = fs.readFileSync(path.join(ROOT_DIR, relFile), 'utf8');
    for (const { regex, label } of forbiddenPatterns) {
      assert.equal(
        regex.test(content),
        false,
        `Security violation: found forbidden pattern [${label}] in ${relFile}`
      );
    }
  }
});
