import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

const ScrollExpandMedia = ({
  mediaType = 'image',
  mediaSrc,
  bgImageSrc,
  title,
  subtitle,
  scrollToExpand = 'Scroll to explore',
  children,
}) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const sectionRef = useRef(null);
  const stickyRef = useRef(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleScroll = useCallback(() => {
    if (!sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const sectionHeight = sectionRef.current.offsetHeight;
    const viewportHeight = window.innerHeight;
    const scrollable = sectionHeight - viewportHeight;
    if (scrollable <= 0) return;

    const progress = Math.min(Math.max(-rect.top / scrollable, 0), 1);
    setScrollProgress(progress);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const borderRadius = 20 - scrollProgress * 20;
  const textTranslateX = scrollProgress * (isMobile ? 120 : 100);

  const firstWord = title ? title.split(' ')[0] : '';
  const rest = title ? title.split(' ').slice(1).join(' ') : '';

  return (
    <div
      ref={sectionRef}
      style={{ height: '300vh', position: 'relative' }}
    >
      <div
        ref={stickyRef}
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* background image */}
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
          }}
          animate={{ opacity: 1 - scrollProgress }}
          transition={{ duration: 0.05 }}
        >
          {bgImageSrc && (
            <img
              src={bgImageSrc}
              alt="Background"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
              }}
            />
          )}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
          }} />
        </motion.div>

        {/* centered expanding media */}
        <div style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
        }}>
          {/* expanding media frame */}
          <div
            style={{
              width: `${isMobile ? 70 + scrollProgress * 30 : 30 + scrollProgress * 70}vw`,
              height: `${isMobile ? 30 + scrollProgress * 70 : 35 + scrollProgress * 65}vh`,
              borderRadius: `${Math.max(borderRadius, 0)}px`,
              overflow: 'hidden',
              boxShadow: scrollProgress < 0.95 ? '0 20px 60px rgba(0,0,0,0.5)' : 'none',
              position: 'relative',
            }}
          >
            {mediaType === 'video' ? (
              <video
                src={mediaSrc}
                autoPlay
                muted
                loop
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            ) : (
              <img
                src={mediaSrc}
                alt={title || 'Media'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            )}
            {/* darken overlay that fades as you scroll */}
            <motion.div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.4)',
                borderRadius: 'inherit',
              }}
              animate={{ opacity: 0.5 - scrollProgress * 0.4 }}
              transition={{ duration: 0.05 }}
            />
          </div>

          {/* text that splits apart on scroll */}
          <div style={{
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            zIndex: 20,
            pointerEvents: 'none',
            mixBlendMode: 'difference',
          }}>
            <motion.h2
              style={{
                fontSize: isMobile ? '2rem' : '3.5rem',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.9)',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                transform: `translateX(-${textTranslateX}vw)`,
                whiteSpace: 'nowrap',
              }}
            >
              {firstWord}
            </motion.h2>
            <motion.h2
              style={{
                fontSize: isMobile ? '2rem' : '3.5rem',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.9)',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                transform: `translateX(${textTranslateX}vw)`,
                whiteSpace: 'nowrap',
              }}
            >
              {rest}
            </motion.h2>
          </div>

          {/* scroll hint */}
          <motion.div
            style={{
              position: 'absolute',
              bottom: 40,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
            animate={{ opacity: scrollProgress < 0.1 ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          >
            {subtitle && (
              <span style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.05em',
              }}>{subtitle}</span>
            )}
            <span style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.3)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>{scrollToExpand}</span>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                width: 20,
                height: 20,
                borderLeft: '1.5px solid rgba(255,255,255,0.25)',
                borderBottom: '1.5px solid rgba(255,255,255,0.25)',
                transform: 'rotate(-45deg)',
              }}
            />
          </motion.div>
        </div>

        {/* content that fades in after full expansion */}
        <motion.div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 30,
            padding: '0 32px 60px',
          }}
          animate={{ opacity: scrollProgress > 0.8 ? 1 : 0, y: scrollProgress > 0.8 ? 0 : 30 }}
          transition={{ duration: 0.5 }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
};

export default ScrollExpandMedia;
