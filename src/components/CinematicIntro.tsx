import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

const INTRO_BACKDROP_URL =
  '/assets/images/intro_beauty_silk_backdrop_1794669813327.jpg';

const INTRO_DURATION_MS = 7000;
const FADE_OUT_START_MS = 6200;

interface CosmeticParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  twinklePhase: number;
}

interface CinematicIntroProps {
  storeName?: string;
  slogan?: string;
  onComplete: () => void;
}

export function CinematicIntro({
  storeName = 'Bella Menina Makeup',
  slogan = 'Tudo para realçar sua beleza!',
  onComplete,
}: CinematicIntroProps) {
  const prefersReducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [exiting, setExiting] = useState(false);

  // Split "Bella Menina Makeup" gracefully into primary calligraphic script + editorial wordmark
  const trimmedName = storeName.trim();
  const hasMakeupSuffix = trimmedName.toLowerCase().endsWith('makeup');
  const mainScriptTitle = hasMakeupSuffix
    ? trimmedName.slice(0, trimmedName.length - 6).trim()
    : trimmedName;
  const secondaryEditorialTitle = hasMakeupSuffix ? 'Makeup' : '';

  const letters = Array.from(mainScriptTitle);

  // Exact 7-second lifecycle
  useEffect(() => {
    const duration = prefersReducedMotion ? 1800 : INTRO_DURATION_MS;
    const fadeStart = prefersReducedMotion ? 1300 : FADE_OUT_START_MS;

    const fadeTimer = window.setTimeout(() => {
      setExiting(true);
    }, fadeStart);

    const endTimer = window.setTimeout(() => {
      onComplete();
    }, duration);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(endTimer);
    };
  }, [onComplete, prefersReducedMotion]);

  // Realistic Floating Rose-Gold Shimmer, Highlighter Mist & Writing-Trail Particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReducedMotion) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const palette = [
      '255, 214, 229', // pearl blush
      '255, 45, 111',  // bella pink
      '245, 208, 138', // champagne gold
      '255, 255, 255', // gloss specular white
    ];

    const particles: CosmeticParticle[] = Array.from({ length: 68 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -0.15 - Math.random() * 0.45,
      radius: 0.7 + Math.random() * 2.2,
      alpha: 0.2 + Math.random() * 0.65,
      life: Math.random() * 4,
      maxLife: 4 + Math.random() * 4,
      color: palette[Math.floor(Math.random() * palette.length)],
      twinklePhase: Math.random() * Math.PI * 2,
    }));

    const startTime = performance.now();
    let lastTime = startTime;

    const spawnWritingSpark = (x: number, y: number, count: number) => {
      for (let i = 0; i < count; i++) {
        particles.push({
          x: x + (Math.random() - 0.5) * 28,
          y: y + (Math.random() - 0.5) * 24,
          vx: (Math.random() - 0.35) * 1.4,
          vy: (Math.random() - 0.65) * 1.1,
          radius: 0.8 + Math.random() * 2.4,
          alpha: 0.85,
          life: 0,
          maxLife: 1.4 + Math.random() * 1.4,
          color: Math.random() > 0.35 ? '245, 208, 138' : '255, 140, 182',
          twinklePhase: Math.random() * Math.PI * 2,
        });
      }
      if (particles.length > 180) {
        particles.splice(0, particles.length - 180);
      }
    };

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const elapsedSec = (now - startTime) / 1000;

      ctx.clearRect(0, 0, width, height);

      // Between 1.0s and 3.8s, emit subtle cosmetic gold-pink shimmer along the handwriting sweep
      if (elapsedSec >= 1.0 && elapsedSec <= 3.8) {
        const progress = (elapsedSec - 1.0) / 2.8;
        const sweepX = width * (0.2 + progress * 0.6);
        const sweepY = height * 0.47 + Math.sin(progress * Math.PI * 3) * 12;
        if (Math.random() < 0.65) {
          spawnWritingSpark(sweepX, sweepY, 2);
        }
      }

      // Soft warm specular glow following the writing pen nib
      if (elapsedSec >= 0.9 && elapsedSec <= 4.1) {
        const p = Math.min(Math.max((elapsedSec - 1.0) / 2.8, 0), 1);
        const gx = width * (0.18 + p * 0.64);
        const gy = height * 0.47;
        const glowAlpha =
          elapsedSec < 1.2
            ? (elapsedSec - 0.9) * 0.6
            : elapsedSec > 3.6
            ? Math.max(0, (4.1 - elapsedSec) * 0.4)
            : 0.22;

        const radGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, 150);
        radGrad.addColorStop(0, `rgba(255, 224, 236, ${glowAlpha})`);
        radGrad.addColorStop(0.45, `rgba(245, 208, 138, ${glowAlpha * 0.45})`);
        radGrad.addColorStop(1, 'rgba(255, 45, 111, 0)');
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(gx, gy, 150, 0, Math.PI * 2);
        ctx.fill();
      }

      // Update & draw floating pearl / highlighter shimmer dust
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx * (dt * 60);
        pt.y += pt.vy * (dt * 60);
        pt.life += dt;

        if (pt.life >= pt.maxLife || pt.y < -20) {
          if (i < 68) {
            pt.x = Math.random() * width;
            pt.y = height + 10;
            pt.life = 0;
          } else {
            particles.splice(i, 1);
            continue;
          }
        }

        const twinkle = 0.55 + 0.45 * Math.sin(elapsedSec * 3.5 + pt.twinklePhase);
        const fadeOut = 1 - Math.pow(pt.life / pt.maxLife, 2);
        const opacity = pt.alpha * twinkle * fadeOut;

        ctx.fillStyle = `rgba(${pt.color}, ${opacity.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [prefersReducedMotion]);

  const handleSkip = () => {
    setExiting(true);
    window.setTimeout(onComplete, 350);
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Introdução cinematográfica ${storeName}`}
      initial={{ opacity: 1 }}
      animate={exiting ? { opacity: 0 } : { opacity: 1 }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 overflow-hidden bg-[#160C11] select-none flex items-center justify-center"
    >
      {/* Layer 1: Real Macro Silk & Rose-Gold Shimmer Film Backdrop with Slow Cinema Dolly Zoom */}
      <motion.img
        src={INTRO_BACKDROP_URL}
        alt=""
        aria-hidden="true"
        referrerPolicy="no-referrer"
        initial={prefersReducedMotion ? { scale: 1 } : { scale: 1.0, opacity: 0.35 }}
        animate={
          prefersReducedMotion
            ? { scale: 1, opacity: 0.85 }
            : { scale: 1.12, opacity: [0.4, 0.92, 0.92] }
        }
        transition={{
          scale: { duration: 7.0, ease: 'easeOut' },
          opacity: { duration: 1.6, ease: 'easeOut' },
        }}
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
      />

      {/* Layer 2: Cinematic Atmospheric Contrast Vignette (NO boxes, NO frames) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 48%, rgba(26, 12, 19, 0.32) 0%, rgba(20, 9, 14, 0.72) 65%, rgba(14, 6, 10, 0.92) 100%)',
        }}
      />

      {/* Layer 3: Real-time High-DPI Shimmer Dust & Cosmetic Light Sweep Canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Layer 4: Free, Large, Unboxed Cinematic Typography Writing Out the Store Name */}
      <div className="relative z-10 w-full px-6 sm:px-12 text-center flex flex-col items-center justify-center">
        {/* Subtle Kicker Emerging Softly */}
        <motion.p
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 0.88, y: 0 }}
          transition={{ duration: 0.9, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="text-xs sm:text-sm tracking-[0.34em] uppercase text-[#F7C9DA] font-medium mb-4 sm:mb-6"
        >
          Goiânia · Beleza & Glamour
        </motion.p>

        {/* Primary Store Name Written Letter-by-Letter Across the Open Screen */}
        <h1
          className="font-editorial italic font-semibold text-white leading-[1.02] tracking-tight flex flex-wrap items-center justify-center max-w-[96vw]"
          style={{
            fontSize: 'clamp(3.15rem, 9.5vw, 8.25rem)',
            textShadow:
              '0 10px 38px rgba(15, 5, 10, 0.7), 0 2px 12px rgba(255, 45, 111, 0.25)',
          }}
        >
          {letters.map((char, idx) => {
            const delay = prefersReducedMotion ? 0 : 0.95 + idx * 0.16;
            return (
              <motion.span
                key={`${char}-${idx}`}
                initial={
                  prefersReducedMotion
                    ? { opacity: 1 }
                    : {
                        opacity: 0,
                        y: 18,
                        scale: 0.88,
                        filter: 'blur(8px)',
                      }
                }
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  filter: 'blur(0px)',
                }}
                transition={{
                  duration: 0.55,
                  delay,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={char === ' ' ? 'inline-block w-[0.28em]' : 'inline-block'}
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            );
          })}
        </h1>

        {/* Flowing Liquid Rose-Gold Lip-Gloss Brush Stroke SVG Drawn Beneath the Name */}
        <svg
          viewBox="0 0 640 36"
          aria-hidden="true"
          className="w-[min(82vw,600px)] h-7 sm:h-9 mt-2 overflow-visible"
        >
          <defs>
            <linearGradient id="bmBrushGoldPink" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FF2D6F" stopOpacity="0.15" />
              <stop offset="35%" stopColor="#FF8FB5" stopOpacity="0.95" />
              <stop offset="68%" stopColor="#F5D08A" stopOpacity="1" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <motion.path
            d="M 18 22 Q 190 6, 330 18 T 622 14"
            fill="none"
            stroke="url(#bmBrushGoldPink)"
            strokeWidth="3.2"
            strokeLinecap="round"
            initial={
              prefersReducedMotion
                ? { pathLength: 1, opacity: 1 }
                : { pathLength: 0, opacity: 0.35 }
            }
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              pathLength: { duration: 1.9, delay: 2.3, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: 0.6, delay: 2.3 },
            }}
          />
        </svg>

        {/* Secondary Editorial Wordmark ("MAKEUP") */}
        {secondaryEditorialTitle && (
          <motion.div
            initial={
              prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 0, y: 8, scale: 0.94, filter: 'blur(6px)' }
            }
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            transition={{
              duration: 1.15,
              delay: prefersReducedMotion ? 0 : 3.35,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="text-lg sm:text-2xl md:text-3xl font-medium uppercase tracking-[0.46em] text-[#FAD4E2] mt-2 pl-[0.46em]"
            style={{
              textShadow: '0 4px 20px rgba(0, 0, 0, 0.55)',
            }}
          >
            {secondaryEditorialTitle}
          </motion.div>
        )}

        {/* Slogan Reveal */}
        <motion.p
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 0.92, y: 0 }}
          transition={{
            duration: 0.9,
            delay: prefersReducedMotion ? 0 : 4.55,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="font-editorial italic text-lg sm:text-2xl text-white/90 mt-6 sm:mt-8 max-w-2xl"
          style={{ textShadow: '0 3px 16px rgba(0,0,0,0.5)' }}
        >
          “{slogan}”
        </motion.p>
      </div>

      {/* Subtle Progress Hairline & Skip Affordance */}
      <div className="fixed bottom-6 inset-x-6 sm:inset-x-10 z-20 flex items-center justify-between gap-4">
        <div className="h-[2px] flex-1 max-w-[180px] bg-white/15 overflow-hidden rounded-full">
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{
              duration: prefersReducedMotion ? 1.5 : 6.8,
              ease: 'linear',
            }}
            style={{ transformOrigin: 'left' }}
            className="h-full w-full bg-gradient-to-r from-[#FF2D6F] via-[#FF8FB5] to-[#F5D08A]"
          />
        </div>

        <button
          type="button"
          onClick={handleSkip}
          className="px-4 py-2 text-xs font-semibold text-white/85 hover:text-white transition-colors tracking-wide cursor-pointer"
        >
          Pular intro →
        </button>
      </div>
    </motion.div>
  );
}
