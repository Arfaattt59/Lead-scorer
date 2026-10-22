import { useEffect, useState } from 'react';

// Small count-up for stat tiles. Jumps straight to the value when the user prefers reduced motion.
export default function useCountUp(target, ms = 700) {
  const end = Number(target) || 0;
  const [value, setValue] = useState(end);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || ms <= 0) { setValue(end); return undefined; }
    let raf;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / ms);
      setValue(end * (1 - (1 - p) ** 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, ms]);
  return value;
}
