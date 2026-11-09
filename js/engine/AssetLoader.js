/**
 * Loads and verifies all generated visual assets from public/assets/
 * and exposes the celebratory stage-completion video paths in public/videos/.
 */
export const ASSET_MANIFEST = {
  characterCanonical: 'public/assets/character_canonical.png',
  environmentConcept: 'public/assets/environment_concept.png',
  gameAssetSheet: 'public/assets/game_asset_sheet.png',
  hero: 'public/assets/hero_sprite.png',
  coin: 'public/assets/coin_sprite.png',
  gem: 'public/assets/gem_sprite.png',
  chest: 'public/assets/chest_sprite.png',
  stone: 'public/assets/stone_sprite.png',
  trap: 'public/assets/trap_sprite.png',
  portal: 'public/assets/portal_sprite.png',
  heart: 'public/assets/heart_sprite.png',
  powerups: 'public/assets/powerups_sprite.png',
};

export const STAGE_CLEAR_VIDEOS = {
  1: 'public/videos/stage1-complete.mp4',
  2: 'public/videos/stage2-complete.mp4',
  3: 'public/videos/stage3-launch-trailer.mp4',
};

export const TRAILER_VIDEO_PATH = 'public/assets/monster_rush_trailer.mp4';

export class AssetLoader {
  constructor() {
    this.images = {};
    this.status = {};
  }

  async loadAll(onProgress) {
    const entries = Object.entries(ASSET_MANIFEST);
    let completed = 0;

    const promises = entries.map(([key, src]) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
          this.images[key] = img;
          this.status[key] = { loaded: true, width: img.naturalWidth, height: img.naturalHeight, src };
          completed++;
          if (onProgress) onProgress(completed / entries.length, key);
          resolve(true);
        };
        img.onerror = () => {
          this.status[key] = { loaded: false, width: 0, height: 0, src };
          completed++;
          if (onProgress) onProgress(completed / entries.length, key);
          resolve(false);
        };
        img.src = src;
      });
    });

    await Promise.all(promises);
    return {
      allLoaded: Object.values(this.status).every((s) => s.loaded),
      status: this.status,
      images: this.images,
    };
  }
}
