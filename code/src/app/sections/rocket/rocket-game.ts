import {
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
  AfterViewInit,
  OnDestroy,
  DestroyRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { Analytics } from '../../analytics.service';

/**
 * Web port of the Flutter "Rocket" game (lives one level up in the `rocket`
 * repo as a Flutter app). Faithfully reproduces the mechanics, tunables, and
 * visual feel of `lib/game/game_controller.dart` and its widgets, rendered to
 * a single 2D <canvas> with a requestAnimationFrame loop. The HUD, ammo bar,
 * and control pad are DOM so they stay crisp and accessible; the play area
 * (starfield, asteroids, lasers, capsules, explosions, rocket, overlays) is
 * canvas.
 *
 * Reached at /rocket (no desk hotspot yet). Desktop plays with arrow keys +
 * space; touch uses the on-screen control pad (tap to fire, hold to steer),
 * matching the Flutter control-pad gestures.
 *
 * High scores persist to localStorage (the Flutter app used SharedPreferences).
 */

type GameState = 'ready' | 'playing' | 'gameover';
type Mode = 'menu' | 'game';
type ObstacleSize = 'small' | 'medium' | 'large';
type CapsuleTier = 'tier25' | 'tier10' | 'tier3';
type LifeLossCause = 'ammoDepleted' | 'asteroidCrash';

interface Obstacle {
  size: ObstacleSize;
  value: number;
  top: number;
  left: number;
  /** 12 radial multipliers perturbing a unit circle into a rock silhouette. */
  shape: number[];
}

interface Laser {
  left: number;
  top: number;
}

interface Explosion {
  left: number;
  top: number;
  size: number;
  age: number; // seconds since spawn
}

interface AmmoCapsule {
  left: number;
  top: number;
  value: number;
  tier: CapsuleTier;
}

interface Star {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  speed: number;
  color: string;
}

interface HighScore {
  score: number;
  date: string; // ISO string
}

@Component({
  selector: 'app-rocket-game',
  imports: [],
  templateUrl: './rocket-game.html',
  styleUrl: './rocket-game.scss',
})
export class RocketGame implements AfterViewInit, OnDestroy {
  private readonly canvasRef =
    viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly analytics = inject(Analytics);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  // -- tunables (ported 1:1 from game_controller.dart) --------------------
  static readonly ammoMax = 50;
  static readonly largeObstacleMax = 1;
  static readonly mediumObstacleMax = 2;
  static readonly smallObstacleMax = 3;
  static readonly initOffset = 250;

  // Asteroid fall speeds — 25% faster than the original Flutter tunables
  // (35 / 70 / 120). Large is slowest, small is fastest.
  static readonly largeAsteroidSpeed = 43.75;
  static readonly mediumAsteroidSpeed = 87.5;
  static readonly smallAsteroidSpeed = 150;

  static readonly laserSpeedPxPerSec = 500;
  static readonly laserMax = 3;
  static readonly laserWidth = 3;
  static readonly laserHeight = 24;

  static readonly rocketSize = 50;
  static readonly explosionLifespanSec = 0.35;

  static readonly capsuleSpeed = 170;
  static readonly capsuleBonus = 20;
  static readonly capsuleWidth = 14;
  static readonly capsuleHeight = 34;

  /** On-screen + keyboard steering speed (Flutter stepped 2px every 10ms). */
  static readonly moveSpeedPxPerSec = 240;

  private readonly readyDurationSec = 2;
  private readonly lifeLostDurationSec = 1.8;
  private readonly topMessageDurationSec = 1.8;
  private readonly readyMessage = 'Get Ready!';
  private readonly lifeLostMessage = 'Lost a Life!';
  private readonly gameOverMessage = 'Game Over!\nTap to play again';
  private readonly leveledUpMessage = 'Leveled Up!';
  private readonly lifeBonusInterval = 10000;

  private static readonly sizePixels: Record<ObstacleSize, number> = {
    small: 25,
    medium: 50,
    large: 100,
  };
  private static readonly sizePoints: Record<ObstacleSize, number> = {
    small: 100,
    medium: 50,
    large: 10,
  };

  private static readonly STORAGE_KEY = 'rm-rocket-high-scores';

  // -- DOM-bound reactive state -------------------------------------------
  readonly mode = signal<Mode>('menu');
  readonly livesSig = signal(2);
  readonly scoreSig = signal(0);
  readonly ammoSig = signal(RocketGame.ammoMax);
  readonly scores = signal<HighScore[]>([]);
  /** Fire-flash flags for the two control-pad buttons. */
  readonly leftFiring = signal(false);
  readonly rightFiring = signal(false);
  readonly ammoMax = RocketGame.ammoMax;

  // -- live game state ----------------------------------------------------
  private largeObstacles: Obstacle[] = [];
  private mediumObstacles: Obstacle[] = [];
  private smallObstacles: Obstacle[] = [];
  private lasers: Laser[] = [];
  private explosions: Explosion[] = [];
  private ammoCapsules: AmmoCapsule[] = [];
  private stars: Star[] = [];

  private state: GameState = 'ready';
  private overlayMessage: string | null = this.readyMessage;
  private topMessage: string | null = null;

  private lives = 2;
  private score = 0;
  private ammo = RocketGame.ammoMax;
  private rocketPosition = 0;
  private rocketAlive = true;

  private gridWidth = 0;
  private gridHeight = 0;
  private get gridRight() {
    return this.gridWidth - RocketGame.rocketSize;
  }

  // overlay state machine
  private overlayTimer: number | null = this.readyDurationSec;
  private onOverlayDone: (() => void) | null = null;
  private topMessageTimer: number | null = null;
  private nextLifeBonusAt = this.lifeBonusInterval;

  // capsule cascade tier flags (reset per life)
  private tier25Enabled = true;
  private tier10Enabled = false;
  private tier3Enabled = false;

  // -- loop / input internals ---------------------------------------------
  private ctx!: CanvasRenderingContext2D;
  private rafId = 0;
  private lastTime = 0;
  private resyncOnNextTick = false;
  private dpr = 1;
  private resizeObserver?: ResizeObserver;

  private leftHeld = false;
  private rightHeld = false;
  private spaceDown = false;

  // -- lifecycle ----------------------------------------------------------
  ngAfterViewInit(): void {
    const canvas = this.canvasRef().nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.scores.set(this.loadScores());

    this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
    this.resizeObserver.observe(canvas);
    this.resizeCanvas();

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.onFrame);

    this.destroyRef.onDestroy(() => this.teardown());
  }

  ngOnDestroy(): void {
    this.teardown();
  }

  private teardown(): void {
    cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  // -- sizing -------------------------------------------------------------
  private resizeCanvas(): void {
    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    this.dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * this.dpr);
    canvas.height = Math.round(rect.height * this.dpr);
    this.setGridSize(rect.width, rect.height);
    this.populateStars();
  }

  private setGridSize(width: number, height: number): void {
    this.gridWidth = width;
    this.gridHeight = height;
    if (this.rocketPosition === 0) {
      this.rocketPosition = this.gridWidth / 2 - RocketGame.rocketSize / 2;
    } else {
      this.rocketPosition = Math.min(this.rocketPosition, this.gridRight);
    }
  }

  // -- menu / flow --------------------------------------------------------
  launch(): void {
    this.resetGame();
    this.mode.set('game');
    this.analytics.track('rocket_play');
  }

  /** Close button — back to the desk (landing page). */
  exit(): void {
    this.router.navigateByUrl('/');
  }

  private resetGame(): void {
    this.largeObstacles = [];
    this.mediumObstacles = [];
    this.smallObstacles = [];
    this.lasers = [];
    this.explosions = [];
    this.ammoCapsules = [];
    this.lives = 2;
    this.score = 0;
    this.ammo = RocketGame.ammoMax;
    this.rocketAlive = true;
    this.nextLifeBonusAt = this.lifeBonusInterval;
    this.tier25Enabled = true;
    this.tier10Enabled = false;
    this.tier3Enabled = false;
    this.topMessage = null;
    this.topMessageTimer = null;
    if (this.gridWidth > 0) {
      this.rocketPosition = this.gridWidth / 2 - RocketGame.rocketSize / 2;
    }
    this.showOverlay(this.readyMessage, this.readyDurationSec);
  }

  // -- main loop ----------------------------------------------------------
  private onFrame = (now: number): void => {
    this.rafId = requestAnimationFrame(this.onFrame);
    let deltaSec = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (this.resyncOnNextTick) {
      this.resyncOnNextTick = false;
      deltaSec = 0;
    }
    // Defensive cap so a stalled/backgrounded frame can't fast-forward play.
    if (deltaSec > 0.1) deltaSec = 0.1;

    // The starfield drifts in every mode so the menu has motion too.
    this.advanceStars(deltaSec);

    if (this.mode() === 'game') {
      this.tick(deltaSec);
    }
    this.draw();
  };

  private tick(dt: number): void {
    if (this.overlayTimer !== null) {
      this.overlayTimer -= dt;
      if (this.overlayTimer <= 0) {
        this.overlayTimer = null;
        this.onOverlayExpired();
      }
    }
    if (this.topMessageTimer !== null) {
      this.topMessageTimer -= dt;
      if (this.topMessageTimer <= 0) {
        this.topMessageTimer = null;
        this.topMessage = null;
      }
    }

    // Steering applies whenever playing (keyboard + held control-pad buttons).
    if (this.state === 'playing') {
      const dir = (this.rightHeld ? 1 : 0) - (this.leftHeld ? 1 : 0);
      if (dir !== 0) {
        this.rocketPosition = this.clamp(
          this.rocketPosition + dir * RocketGame.moveSpeedPxPerSec * dt,
          0,
          this.gridRight,
        );
      }
    }

    if (this.state !== 'playing') {
      this.ageExplosions(dt);
      this.syncHud();
      return;
    }
    if (this.gridHeight === 0) return;

    if (this.lasers.length) {
      const dy = RocketGame.laserSpeedPxPerSec * dt;
      for (const l of this.lasers) l.top -= dy;
      this.lasers = this.lasers.filter(
        (l) => l.top + RocketGame.laserHeight >= 0,
      );
    }

    this.advanceObstacles(this.largeObstacles, RocketGame.largeAsteroidSpeed, dt);
    this.advanceObstacles(this.mediumObstacles, RocketGame.mediumAsteroidSpeed, dt);
    this.advanceObstacles(this.smallObstacles, RocketGame.smallAsteroidSpeed, dt);

    this.advanceCapsules(dt);
    this.checkLaserHits();
    this.checkRocketHit();
    this.ageExplosions(dt);
    this.spawnObstacles();
    this.syncHud();
  }

  private ageExplosions(dt: number): void {
    if (!this.explosions.length) return;
    for (const e of this.explosions) e.age += dt;
    this.explosions = this.explosions.filter(
      (e) => e.age < RocketGame.explosionLifespanSec,
    );
  }

  private advanceObstacles(list: Obstacle[], speed: number, dt: number): void {
    if (!list.length) return;
    for (const o of list) o.top += speed * dt;
    // mutate in place to keep the right array reference
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].top > this.gridHeight) list.splice(i, 1);
    }
  }

  // -- collisions ---------------------------------------------------------
  private checkRocketHit(): void {
    if (!this.rocketAlive || this.state !== 'playing' || this.gridHeight === 0)
      return;
    const rocketHitRadius = RocketGame.rocketSize * 0.4;
    const rocketCx = this.rocketPosition + RocketGame.rocketSize / 2;
    const rocketCy = this.gridHeight - RocketGame.rocketSize / 2;
    for (const o of this.allObstacles()) {
      const astSize = RocketGame.sizePixels[o.size];
      const astCx = o.left + astSize / 2;
      const astCy = o.top + astSize / 2;
      const astRadius = astSize / 2;
      const dx = rocketCx - astCx;
      const dy = rocketCy - astCy;
      const minDist = rocketHitRadius + astRadius;
      if (dx * dx + dy * dy <= minDist * minDist) {
        this.loseLife('asteroidCrash');
        return;
      }
    }
  }

  private checkLaserHits(): void {
    if (!this.lasers.length) return;
    const hitLasers = new Set<Laser>();
    const hitObstacles: Obstacle[] = [];
    for (const laser of this.lasers) {
      if (hitLasers.has(laser)) continue;
      for (const obstacle of this.allObstacles()) {
        if (hitObstacles.includes(obstacle)) continue;
        if (this.laserHitsObstacle(laser, obstacle)) {
          hitLasers.add(laser);
          hitObstacles.push(obstacle);
          break;
        }
      }
    }
    if (!hitObstacles.length) return;
    for (const obstacle of hitObstacles) this.onAsteroidDestroyed(obstacle);
    this.lasers = this.lasers.filter((l) => !hitLasers.has(l));
    this.largeObstacles = this.largeObstacles.filter((o) => !hitObstacles.includes(o));
    this.mediumObstacles = this.mediumObstacles.filter((o) => !hitObstacles.includes(o));
    this.smallObstacles = this.smallObstacles.filter((o) => !hitObstacles.includes(o));
  }

  private laserHitsObstacle(laser: Laser, obstacle: Obstacle): boolean {
    const laserX = laser.left + RocketGame.laserWidth / 2;
    const laserTop = laser.top;
    const laserBottom = laser.top + RocketGame.laserHeight;
    const astSize = RocketGame.sizePixels[obstacle.size];
    const astCenterX = obstacle.left + astSize / 2;
    const astCenterY = obstacle.top + astSize / 2;
    const astRadius = astSize / 2;
    const closestY = this.clamp(astCenterY, laserTop, laserBottom);
    const dx = laserX - astCenterX;
    const dy = closestY - astCenterY;
    return dx * dx + dy * dy <= astRadius * astRadius;
  }

  private onAsteroidDestroyed(obstacle: Obstacle): void {
    this.score += obstacle.value;
    this.checkLifeBonus();
    const px = RocketGame.sizePixels[obstacle.size];
    this.explosions.push({
      left: obstacle.left + px / 2,
      top: obstacle.top + px / 2,
      size: px,
      age: 0,
    });
    if (obstacle.size === 'small') return;
    if (obstacle.size === 'medium') this.spawnMediumHitFragments(obstacle);
    else this.spawnLargeHitFragments(obstacle);
  }

  private checkLifeBonus(): void {
    while (this.score >= this.nextLifeBonusAt) {
      this.lives++;
      this.nextLifeBonusAt += this.lifeBonusInterval;
      this.showTopMessage(this.leveledUpMessage);
    }
  }

  private showTopMessage(message: string): void {
    this.topMessage = message;
    this.topMessageTimer = this.topMessageDurationSec;
  }

  // -- fragmentation ------------------------------------------------------
  private spawnMediumHitFragments(destroyed: Obstacle): void {
    const ds = RocketGame.sizePixels[destroyed.size];
    const cx = destroyed.left + ds / 2;
    const cy = destroyed.top + ds / 2;
    const buffer = 15;
    this.placeFragmentOnSide(cx, cy, ds, buffer, 'small', true);
    this.placeFragmentOnSide(cx, cy, ds, buffer, 'small', false);
  }

  private spawnLargeHitFragments(destroyed: Obstacle): void {
    const ds = RocketGame.sizePixels[destroyed.size];
    const cx = destroyed.left + ds / 2;
    const cy = destroyed.top + ds / 2;
    const buffer = 30;
    const left = this.placeFragmentOnSide(cx, cy, ds, buffer, 'medium', true);
    const right = this.placeFragmentOnSide(cx, cy, ds, buffer, 'medium', false);
    const clearance =
      (RocketGame.sizePixels.small + RocketGame.sizePixels.medium) / 2;
    const clearanceSq = clearance * clearance;
    let smallCx = cx;
    let smallCy = cy - ds / 2;
    for (let attempt = 0; attempt < 20; attempt++) {
      const candX = cx - ds + Math.random() * 2 * ds;
      const candY = cy - Math.random() * ds;
      const dxL = candX - left.cx;
      const dyL = candY - left.cy;
      const dxR = candX - right.cx;
      const dyR = candY - right.cy;
      if (
        dxL * dxL + dyL * dyL >= clearanceSq &&
        dxR * dxR + dyR * dyR >= clearanceSq
      ) {
        smallCx = candX;
        smallCy = candY;
        break;
      }
    }
    this.placeFragment('small', smallCx, smallCy);
  }

  private placeFragmentOnSide(
    originX: number,
    originY: number,
    ds: number,
    buffer: number,
    size: ObstacleSize,
    leftSide: boolean,
  ): { cx: number; cy: number } {
    const dx = leftSide
      ? -ds + Math.random() * (ds - buffer)
      : buffer + Math.random() * (ds - buffer);
    const dy = -Math.random() * ds;
    return this.placeFragment(size, originX + dx, originY + dy);
  }

  private placeFragment(
    size: ObstacleSize,
    centerX: number,
    centerY: number,
  ): { cx: number; cy: number } {
    const px = RocketGame.sizePixels[size];
    const radius = px / 2;
    const clampedLeft = this.clamp(
      centerX - radius,
      10,
      Math.max(10, this.gridWidth - px - 15),
    );
    this.listFor(size).push({
      size,
      value: RocketGame.sizePoints[size],
      left: clampedLeft,
      top: centerY - radius,
      shape: this.randomShape(),
    });
    return { cx: clampedLeft + radius, cy: centerY };
  }

  private listFor(size: ObstacleSize): Obstacle[] {
    if (size === 'small') return this.smallObstacles;
    if (size === 'medium') return this.mediumObstacles;
    return this.largeObstacles;
  }

  // -- spawning -----------------------------------------------------------
  private spawnObstacles(): void {
    while (this.largeObstacles.length < RocketGame.largeObstacleMax)
      this.largeObstacles.push(this.makeAsteroid('large'));
    while (this.mediumObstacles.length < RocketGame.mediumObstacleMax)
      this.mediumObstacles.push(this.makeAsteroid('medium'));
    while (this.smallObstacles.length < RocketGame.smallObstacleMax)
      this.smallObstacles.push(this.makeAsteroid('small'));
  }

  private makeAsteroid(size: ObstacleSize): Obstacle {
    const px = RocketGame.sizePixels[size];
    return {
      size,
      value: RocketGame.sizePoints[size],
      top: -px - Math.random() * RocketGame.initOffset,
      left: this.spawnLeft(px),
      shape: this.randomShape(),
    };
  }

  private spawnLeft(sizePx: number): number {
    const minLeft = 10;
    const maxLeft = Math.max(minLeft + 1, this.gridWidth - sizePx - 15);
    return minLeft + Math.random() * (maxLeft - minLeft);
  }

  private randomShape(): number[] {
    return Array.from({ length: 12 }, () => 0.72 + Math.random() * 0.28);
  }

  // -- ammo capsules ------------------------------------------------------
  private advanceCapsules(dt: number): void {
    if (!this.ammoCapsules.length) return;
    const captured: AmmoCapsule[] = [];
    const missed: AmmoCapsule[] = [];
    for (const c of this.ammoCapsules) {
      c.top += RocketGame.capsuleSpeed * dt;
      if (this.rocketTouches(c)) {
        captured.push(c);
        this.ammo = Math.min(this.ammo + c.value, RocketGame.ammoMax);
      } else if (c.top > this.gridHeight) {
        missed.push(c);
      }
    }
    for (const c of missed) {
      if (c.tier === 'tier25') {
        this.tier25Enabled = false;
        this.tier10Enabled = true;
      } else if (c.tier === 'tier10') {
        this.tier10Enabled = false;
        this.tier3Enabled = true;
      } else {
        this.tier3Enabled = false;
      }
    }
    if (captured.length || missed.length) {
      this.ammoCapsules = this.ammoCapsules.filter(
        (c) => !captured.includes(c) && !missed.includes(c),
      );
    }
    if (missed.length) this.maybeSpawnCapsule();
    this.checkAmmoDepleted();
  }

  private rocketTouches(c: AmmoCapsule): boolean {
    const rocketLeft = this.rocketPosition;
    const rocketRight = this.rocketPosition + RocketGame.rocketSize;
    const rocketTop = this.gridHeight - RocketGame.rocketSize;
    const rocketBottom = this.gridHeight;
    const capRight = c.left + RocketGame.capsuleWidth;
    const capBottom = c.top + RocketGame.capsuleHeight;
    return (
      rocketLeft < capRight &&
      rocketRight > c.left &&
      rocketTop < capBottom &&
      rocketBottom > c.top
    );
  }

  private maybeSpawnCapsule(): void {
    if (this.ammoCapsules.length) return;
    if (this.tier25Enabled && this.ammo === 25) {
      this.spawnCapsule('tier25');
    } else if (this.tier10Enabled && this.ammo <= 10) {
      this.spawnCapsule('tier10');
    } else if (this.tier3Enabled && this.ammo <= 3) {
      this.spawnCapsule('tier3');
    }
  }

  private spawnCapsule(tier: CapsuleTier): void {
    const maxLeft = Math.max(
      10,
      this.gridWidth - RocketGame.capsuleWidth - 15,
    );
    this.ammoCapsules.push({
      left: 10 + Math.random() * (maxLeft - 10),
      top: -RocketGame.capsuleHeight,
      value: RocketGame.capsuleBonus,
      tier,
    });
  }

  private checkAmmoDepleted(): void {
    if (this.state !== 'playing') return;
    if (this.ammo > 0) return;
    if (this.ammoCapsules.length) return;
    this.loseLife('ammoDepleted');
  }

  // -- overlay state machine ----------------------------------------------
  private showOverlay(message: string, durationSec: number, then?: () => void): void {
    this.overlayMessage = message;
    this.overlayTimer = durationSec;
    this.onOverlayDone = then ?? null;
    this.state = 'ready';
  }

  private showGameOver(): void {
    this.overlayMessage = this.gameOverMessage;
    this.overlayTimer = null;
    this.onOverlayDone = null;
    this.state = 'gameover';
    this.persistScore(this.score);
    this.analytics.track('rocket_game_over', { score: this.score });
  }

  private onOverlayExpired(): void {
    const next = this.onOverlayDone;
    this.onOverlayDone = null;
    if (next) {
      next();
      return;
    }
    this.overlayMessage = null;
    this.state = 'playing';
  }

  // -- life / death -------------------------------------------------------
  private loseLife(cause: LifeLossCause): void {
    if (this.state !== 'playing') return;
    this.destroyRocket();
    this.largeObstacles = [];
    this.mediumObstacles = [];
    this.smallObstacles = [];
    this.lasers = [];
    this.ammoCapsules = [];
    if (this.lives > 0) {
      this.lives--;
      this.showOverlay(this.lifeLostMessage, this.lifeLostDurationSec, () => {
        this.resetForNewLife(cause);
        this.showOverlay(this.readyMessage, this.readyDurationSec);
      });
    } else {
      this.showGameOver();
    }
  }

  private destroyRocket(): void {
    if (this.gridHeight === 0) return;
    const cx = this.rocketPosition + RocketGame.rocketSize / 2;
    const cy = this.gridHeight - RocketGame.rocketSize / 2;
    this.explosions.push({ left: cx, top: cy, size: 90, age: 0 });
    this.explosions.push({ left: cx - 22, top: cy - 22, size: 28, age: 0 });
    this.explosions.push({ left: cx + 22, top: cy - 22, size: 28, age: 0 });
    this.rocketAlive = false;
  }

  private resetForNewLife(cause: LifeLossCause): void {
    if (cause === 'ammoDepleted') {
      this.ammo = 25;
      this.tier25Enabled = false;
      this.tier10Enabled = true;
      this.tier3Enabled = false;
    }
    this.largeObstacles = [];
    this.mediumObstacles = [];
    this.smallObstacles = [];
    this.lasers = [];
    this.explosions = [];
    this.ammoCapsules = [];
    if (this.gridWidth > 0) {
      this.rocketPosition = this.gridWidth / 2 - RocketGame.rocketSize / 2;
    }
    this.rocketAlive = true;
  }

  // -- input --------------------------------------------------------------
  fire(): void {
    if (this.state !== 'playing') return;
    if (this.lasers.length >= RocketGame.laserMax) return;
    if (this.ammo <= 0) return;
    if (this.gridHeight === 0) return;
    this.lasers.push({
      left:
        this.rocketPosition +
        RocketGame.rocketSize / 2 -
        RocketGame.laserWidth / 2,
      top: this.gridHeight - RocketGame.rocketSize - RocketGame.laserHeight,
    });
    this.ammo--;
    this.maybeSpawnCapsule();
    this.checkAmmoDepleted();
    this.syncHud();
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.mode() !== 'game') return;
    switch (e.key) {
      case 'ArrowLeft':
        this.leftHeld = true;
        e.preventDefault();
        break;
      case 'ArrowRight':
        this.rightHeld = true;
        e.preventDefault();
        break;
      case ' ':
      case 'Spacebar':
        e.preventDefault();
        if (!this.spaceDown) {
          this.spaceDown = true;
          if (this.state === 'gameover') this.returnToMenu();
          else this.fire();
        }
        break;
      case 'Enter':
        if (this.state === 'gameover') this.returnToMenu();
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    switch (e.key) {
      case 'ArrowLeft':
        this.leftHeld = false;
        break;
      case 'ArrowRight':
        this.rightHeld = false;
        break;
      case ' ':
      case 'Spacebar':
        this.spaceDown = false;
        break;
    }
  };

  private onVisibilityChange = (): void => {
    // On tab re-show the RAF delta would jump forward; skip the next delta.
    if (!document.hidden) this.resyncOnNextTick = true;
  };

  /** Tap/click on the play area — used to dismiss the Game Over overlay. */
  onCanvasPointerDown(): void {
    if (this.mode() === 'game' && this.state === 'gameover') {
      this.returnToMenu();
    }
  }

  private returnToMenu(): void {
    this.scores.set(this.loadScores());
    this.mode.set('menu');
  }

  // ---- control-pad gesture handling (ports control_pad.dart) ------------
  private leftBtn = this.makeButtonState('left');
  private rightBtn = this.makeButtonState('right');

  private makeButtonState(which: 'left' | 'right') {
    return {
      which,
      pointerDown: false,
      holding: false,
      firedOnDown: false,
      lastTapTime: 0,
      holdTimer: 0 as ReturnType<typeof setTimeout> | 0,
      flashTimer: 0 as ReturnType<typeof setTimeout> | 0,
    };
  }

  onPadPointerDown(which: 'left' | 'right', e: PointerEvent): void {
    e.preventDefault();
    const btn = which === 'left' ? this.leftBtn : this.rightBtn;
    btn.pointerDown = true;
    btn.holding = false;
    btn.firedOnDown = false;
    const now = performance.now();
    if (now - btn.lastTapTime <= 300) {
      this.fire();
      this.flash(which);
      btn.firedOnDown = true;
    }
    btn.lastTapTime = now;
    btn.holdTimer = setTimeout(() => {
      if (!btn.pointerDown) return;
      btn.holding = true;
      if (which === 'left') this.leftHeld = true;
      else this.rightHeld = true;
    }, 120);
  }

  onPadPointerUp(which: 'left' | 'right'): void {
    const btn = which === 'left' ? this.leftBtn : this.rightBtn;
    if (!btn.pointerDown) return;
    const wasHolding = btn.holding;
    const firedOnDown = btn.firedOnDown;
    btn.pointerDown = false;
    btn.holding = false;
    btn.firedOnDown = false;
    clearTimeout(btn.holdTimer);
    if (which === 'left') this.leftHeld = false;
    else this.rightHeld = false;
    if (wasHolding) return;
    if (!firedOnDown) {
      this.fire();
      this.flash(which);
    }
  }

  private flash(which: 'left' | 'right'): void {
    const btn = which === 'left' ? this.leftBtn : this.rightBtn;
    const sig = which === 'left' ? this.leftFiring : this.rightFiring;
    clearTimeout(btn.flashTimer);
    sig.set(true);
    btn.flashTimer = setTimeout(() => sig.set(false), 150);
  }

  // -- helpers ------------------------------------------------------------
  private *allObstacles(): Generator<Obstacle> {
    yield* this.largeObstacles;
    yield* this.mediumObstacles;
    yield* this.smallObstacles;
  }

  private clamp(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, v));
  }

  private syncHud(): void {
    if (this.livesSig() !== this.lives) this.livesSig.set(this.lives);
    if (this.scoreSig() !== this.score) this.scoreSig.set(this.score);
    if (this.ammoSig() !== this.ammo) this.ammoSig.set(this.ammo);
  }

  // -- starfield ----------------------------------------------------------
  private populateStars(): void {
    if (this.gridWidth === 0 || this.gridHeight === 0) return;
    const count = 120;
    this.stars = Array.from({ length: count }, () =>
      this.makeStar(Math.random() * this.gridHeight),
    );
  }

  private makeStar(initialY: number): Star {
    const depth = Math.random();
    return {
      x: Math.random() * this.gridWidth,
      y: initialY,
      radius: 0.4 + depth * 1.8,
      opacity: 0.25 + depth * 0.75,
      speed: 40 + depth * 90,
      color: this.pickStarColor(),
    };
  }

  private pickStarColor(): string {
    const roll = Math.random();
    if (roll < 0.07) return '176,224,255'; // pale blue
    if (roll < 0.14) return '255,228,181'; // warm yellow
    return '255,255,255';
  }

  private advanceStars(dt: number): void {
    if (!this.stars.length) return;
    for (const s of this.stars) {
      s.y += s.speed * dt;
      if (s.y - s.radius > this.gridHeight) {
        s.y = -s.radius;
        s.x = Math.random() * this.gridWidth;
      }
    }
  }

  // -- persistence --------------------------------------------------------
  private loadScores(): HighScore[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(RocketGame.STORAGE_KEY);
      if (!raw) return [];
      const list = JSON.parse(raw) as HighScore[];
      if (!Array.isArray(list)) return [];
      return list
        .filter((s) => typeof s?.score === 'number')
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    } catch {
      return [];
    }
  }

  private persistScore(score: number): void {
    if (score <= 0 || typeof localStorage === 'undefined') return;
    const list = this.loadScores();
    list.push({ score, date: new Date().toISOString() });
    list.sort((a, b) => b.score - a.score);
    const trimmed = list.slice(0, 10);
    try {
      localStorage.setItem(RocketGame.STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      /* storage full / blocked — non-fatal */
    }
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const mn = String(d.getMinutes()).padStart(2, '0');
    return `${mm}/${dd}/${d.getFullYear()} ${d.getHours()}:${mn}`;
  }

  // -- rendering ----------------------------------------------------------
  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.clearRect(0, 0, this.gridWidth, this.gridHeight);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.gridWidth, this.gridHeight);

    this.drawStars(ctx);

    if (this.mode() === 'game') {
      for (const o of this.allObstacles()) this.drawAsteroid(ctx, o);
      for (const c of this.ammoCapsules) this.drawCapsule(ctx, c);
      for (const e of this.explosions) this.drawExplosion(ctx, e);
      ctx.fillStyle = 'rgb(208,255,0)';
      for (const l of this.lasers) {
        ctx.fillRect(l.left, l.top, RocketGame.laserWidth, RocketGame.laserHeight);
      }
      if (this.rocketAlive) {
        this.drawRocket(
          ctx,
          this.rocketPosition,
          this.gridHeight - RocketGame.rocketSize,
          RocketGame.rocketSize,
        );
      }
      if (this.topMessage) this.drawTopBanner(ctx, this.topMessage);
      if (this.overlayMessage) this.drawOverlay(ctx, this.overlayMessage);
    }
    ctx.restore();
  }

  private drawStars(ctx: CanvasRenderingContext2D): void {
    for (const s of this.stars) {
      ctx.fillStyle = `rgba(${s.color},${s.opacity})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawAsteroid(ctx: CanvasRenderingContext2D, o: Obstacle): void {
    const px = RocketGame.sizePixels[o.size];
    const cx = o.left + px / 2;
    const cy = o.top + px / 2;
    const radius = px / 2;
    ctx.fillStyle =
      o.size === 'large' ? '#191919' : o.size === 'medium' ? '#454545' : '#c8c8c8';
    ctx.beginPath();
    for (let i = 0; i < o.shape.length; i++) {
      const theta = (i / o.shape.length) * Math.PI * 2;
      const r = radius * o.shape[i];
      const x = cx + Math.cos(theta) * r;
      const y = cy + Math.sin(theta) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  private drawCapsule(ctx: CanvasRenderingContext2D, c: AmmoCapsule): void {
    const w = RocketGame.capsuleWidth;
    const h = RocketGame.capsuleHeight;
    const r = w / 2;
    ctx.fillStyle = 'rgb(208,255,0)';
    this.roundRect(ctx, c.left, c.top, w, h, r);
    ctx.fill();
    // black plus
    ctx.fillStyle = '#000';
    const midX = c.left + w / 2;
    const midY = c.top + h / 2;
    ctx.fillRect(midX - 4, midY - 1, 8, 2);
    ctx.fillRect(midX - 1, midY - 4, 2, 8);
  }

  private drawExplosion(ctx: CanvasRenderingContext2D, e: Explosion): void {
    const progress = this.clamp(e.age / RocketGame.explosionLifespanSec, 0, 1);
    const maxRadius = e.size; // Flutter extent = size*2, half = size
    const eased = 1 - Math.pow(1 - progress, 2);
    const radius = maxRadius * eased;
    const alpha = 1 - progress;
    // hot (#FFF1A8) → cool (#FF6A00)
    const cr = Math.round(0xff + (0xff - 0xff) * progress);
    const cg = Math.round(0xf1 + (0x6a - 0xf1) * progress);
    const cb = Math.round(0xa8 + (0x00 - 0xa8) * progress);
    const color = `rgba(${cr},${cg},${cb},${alpha})`;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, 4 * (1 - progress * 0.6));
    ctx.lineCap = 'round';
    const innerR = radius * 0.25;
    for (let i = 0; i < 8; i++) {
      const theta = (i / 8) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      ctx.beginPath();
      ctx.moveTo(e.left + cos * innerR, e.top + sin * innerR);
      ctx.lineTo(e.left + cos * radius, e.top + sin * radius);
      ctx.stroke();
    }
    const coreRadius = maxRadius * 0.4 * (1 - progress);
    if (coreRadius > 0) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(e.left, e.top, coreRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Vector rocket pointing up, drawn in the teal accent. */
  private drawRocket(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    s: number,
  ): void {
    const u = s / 50; // scale unit (art authored on a 50px box)
    ctx.save();
    ctx.translate(x, y);

    // exhaust flame (flickers) while playing
    if (this.state === 'playing') {
      const flick = 0.7 + 0.3 * Math.abs(Math.sin(this.lastTime / 60));
      ctx.fillStyle = 'rgba(255,170,0,0.9)';
      ctx.beginPath();
      ctx.moveTo(21 * u, 40 * u);
      ctx.lineTo(25 * u, (46 + flick * 6) * u);
      ctx.lineTo(29 * u, 40 * u);
      ctx.closePath();
      ctx.fill();
    }

    // fins
    ctx.fillStyle = 'rgb(0,128,96)';
    ctx.beginPath();
    ctx.moveTo(17 * u, 30 * u);
    ctx.lineTo(8 * u, 44 * u);
    ctx.lineTo(17 * u, 41 * u);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(33 * u, 30 * u);
    ctx.lineTo(42 * u, 44 * u);
    ctx.lineTo(33 * u, 41 * u);
    ctx.closePath();
    ctx.fill();

    // body + nose
    ctx.fillStyle = 'rgb(0,160,120)';
    ctx.beginPath();
    ctx.moveTo(25 * u, 2 * u);
    ctx.quadraticCurveTo(34 * u, 12 * u, 33 * u, 30 * u);
    ctx.lineTo(33 * u, 40 * u);
    ctx.lineTo(17 * u, 40 * u);
    ctx.lineTo(17 * u, 30 * u);
    ctx.quadraticCurveTo(16 * u, 12 * u, 25 * u, 2 * u);
    ctx.closePath();
    ctx.fill();

    // window
    ctx.fillStyle = '#10201b';
    ctx.beginPath();
    ctx.arc(25 * u, 20 * u, 5 * u, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawTopBanner(ctx: CanvasRenderingContext2D, text: string): void {
    ctx.save();
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const padX = 20;
    const w = ctx.measureText(text).width + padX * 2;
    const h = 34;
    const x = this.gridWidth / 2 - w / 2;
    const y = 16;
    ctx.fillStyle = 'rgba(208,255,0,0.95)';
    this.roundRect(ctx, x, y, w, h, 12);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.fillText(text, this.gridWidth / 2, y + h / 2 + 1);
    ctx.restore();
  }

  private drawOverlay(ctx: CanvasRenderingContext2D, message: string): void {
    ctx.save();
    ctx.font = '600 28px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = message.split('\n');
    const lineH = 36;
    let maxW = 0;
    for (const ln of lines) maxW = Math.max(maxW, ctx.measureText(ln).width);
    const boxW = maxW + 64;
    const boxH = lines.length * lineH + 40;
    const cx = this.gridWidth / 2;
    const cy = this.gridHeight / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.71)';
    this.roundRect(ctx, cx - boxW / 2, cy - boxH / 2, boxW, boxH, 16);
    ctx.fill();
    ctx.fillStyle = '#fff';
    const startY = cy - ((lines.length - 1) * lineH) / 2;
    lines.forEach((ln, i) => ctx.fillText(ln, cx, startY + i * lineH));
    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }
}
