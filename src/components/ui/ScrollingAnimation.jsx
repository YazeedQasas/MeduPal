import { useEffect, useRef, useState, useCallback } from 'react';

const defaultImages = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1610652492500-ded49ceeb378?w=400&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1619365734050-cb5e64a42d43?w=400&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=60',
];

const angles = Array.from({ length: 8 }, (_, i) => (i * Math.PI * 2) / 8);

export default function ScrollingAnimation({
  images = defaultImages,
  title = 'Empowering',
  titleLine2 = 'Every Student',
  subtitle = 'From first-years to final exams, MeduPal gives you the tools to master clinical skills.',
}) {
  const [progress, setProgress] = useState(0);
  const sectionRef = useRef(null);
  const progressRef = useRef(0);

  const handleWheel = useCallback((e) => {
    if (!sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const inSection = rect.top <= 0 && rect.bottom > window.innerHeight * 0.5;

    if (!inSection) return;

    const current = progressRef.current;

    if (e.deltaY > 0) {
      if (current < 1) {
        e.preventDefault();
        const next = Math.min(1, current + e.deltaY * 0.0015);
        progressRef.current = next;
        setProgress(next);
      }
    } else {
      if (current > 0) {
        e.preventDefault();
        const next = Math.max(0, current + e.deltaY * 0.0015);
        progressRef.current = next;
        setProgress(next);
      }
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!sectionRef.current || sectionRef.current._touchStartY == null) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const inSection = rect.top <= 0 && rect.bottom > window.innerHeight * 0.5;
    if (!inSection) return;

    const deltaY = sectionRef.current._touchStartY - e.touches[0].clientY;
    sectionRef.current._touchStartY = e.touches[0].clientY;

    const current = progressRef.current;
    if (deltaY > 0 && current < 1) {
      e.preventDefault();
      const next = Math.min(1, current + deltaY * 0.004);
      setProgress(next);
      progressRef.current = next;
    } else if (deltaY < 0 && current > 0) {
      e.preventDefault();
      const next = Math.max(0, current + deltaY * 0.004);
      setProgress(next);
      progressRef.current = next;
    }
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (sectionRef.current) sectionRef.current._touchStartY = e.touches[0].clientY;
  }, []);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    const onScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setProgress(0);
        progressRef.current = 0;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [handleWheel, handleTouchStart, handleTouchMove]);

  const expandRadius = progress * 280;
  const textVisible = progress > 0.35;
  const outerRing = progress > 0.5;
  const innerRing = progress > 0.15;

  return (
    <div ref={sectionRef} style={{ minHeight: '100vh', position: 'relative', background: '#000' }}>
      <div className="h-screen flex items-center justify-center p-8 sticky top-0">
        <div className="relative">
          <div
            className="w-[600px] h-[600px] rounded-full flex items-center justify-center transition-all duration-500"
            style={{
              border: outerRing ? '1.5px solid rgba(255,255,255,0.09)' : '1.5px solid transparent',
            }}
          >
            <div
              className="w-[500px] h-[500px] rounded-full flex items-center justify-center relative transition-all duration-500"
              style={{
                border: innerRing ? '1.5px solid rgba(120,180,160,0.2)' : '1.5px solid transparent',
              }}
            >
              <div
                className="w-[400px] h-[400px] rounded-full p-0.5 flex items-center justify-center relative"
                style={{
                  background: 'linear-gradient(135deg, rgba(120,180,160,0.4), rgba(80,140,130,0.25), rgba(100,165,140,0.15))',
                }}
              >
                <div className="w-full h-full rounded-full flex items-center justify-center relative" style={{ background: '#060909' }}>
                  {images.slice(0, 8).map((src, i) => (
                    <div
                      key={i}
                      className="absolute w-20 h-20 rounded-2xl overflow-hidden shadow-lg transition-transform duration-300 ease-out z-0"
                      style={{
                        border: '2px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                        transform: `translate(${expandRadius * Math.cos(angles[i])}px, ${expandRadius * Math.sin(angles[i])}px)`,
                      }}
                    >
                      <img
                        src={src}
                        alt={`Profile ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}

                  <div
                    className="flex flex-col items-center justify-center relative z-20 transition-opacity duration-500"
                    style={{ opacity: textVisible ? 1 : 0 }}
                  >
                    <h2 className="text-4xl font-bold text-center mb-1" style={{ letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.9)' }}>
                      {title}
                    </h2>
                    <h2 className="text-4xl font-bold text-center mb-4" style={{ letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.9)' }}>
                      {titleLine2}
                    </h2>
                    <p className="text-center max-w-xs text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
                      {subtitle}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
