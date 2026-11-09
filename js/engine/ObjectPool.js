/**
 * Zero-Allocation Object Pool for 60fps GC-free gameplay loops.
 * Pre-allocates reusable entity, particle, and floating-text instances.
 */
export class ObjectPool {
  constructor(factoryFn, initialSize = 64) {
    this.factoryFn = factoryFn;
    this.freeList = [];
    this.activeList = [];

    for (let i = 0; i < initialSize; i++) {
      this.freeList.push(this.factoryFn());
    }
  }

  acquire() {
    const item = this.freeList.length > 0 ? this.freeList.pop() : this.factoryFn();
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
    this.freeList.push(item);
  }

  clear() {
    while (this.activeList.length > 0) {
      this.freeList.push(this.activeList.pop());
    }
  }
}

export class CameraShaker {
  constructor() {
    this.trauma = 0;
    this.maxOffset = 16;
    this.maxAngle = 0.035;
    this.decay = 1.6;
    this.offsetX = 0;
    this.offsetY = 0;
    this.angle = 0;
  }

  addTrauma(amount) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  update(dt) {
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - this.decay * dt);
      const shake = this.trauma * this.trauma;
      this.offsetX = (Math.random() * 2 - 1) * this.maxOffset * shake;
      this.offsetY = (Math.random() * 2 - 1) * this.maxOffset * shake;
      this.angle = (Math.random() * 2 - 1) * this.maxAngle * shake;
    } else {
      this.offsetX = 0;
      this.offsetY = 0;
      this.angle = 0;
    }
  }
}
