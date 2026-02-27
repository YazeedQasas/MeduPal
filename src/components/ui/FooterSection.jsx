import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Facebook, Instagram, Youtube, Linkedin, Frame } from 'lucide-react';

const footerLinks = [
  {
    label: 'Product',
    links: [
      { title: 'Features', href: '#features' },
      { title: 'Pricing', href: '#pricing' },
      { title: 'Testimonials', href: '#testimonials' },
      { title: 'Integration', href: '#' },
    ],
  },
  {
    label: 'Company',
    links: [
      { title: 'FAQs', href: '#faq' },
      { title: 'About Us', href: '#about' },
      { title: 'Privacy Policy', href: '/privacy' },
      { title: 'Terms of Services', href: '/terms' },
    ],
  },
  {
    label: 'Resources',
    links: [
      { title: 'Blog', href: '/blog' },
      { title: 'Changelog', href: '/changelog' },
      { title: 'Brand', href: '/brand' },
      { title: 'Help', href: '/help' },
    ],
  },
  {
    label: 'Social Links',
    links: [
      { title: 'Facebook', href: '#', icon: Facebook },
      { title: 'Instagram', href: '#', icon: Instagram },
      { title: 'Youtube', href: '#', icon: Youtube },
      { title: 'LinkedIn', href: '#', icon: Linkedin },
    ],
  },
];

function AnimatedContainer({ className, delay = 0.1, children }) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ filter: 'blur(4px)', y: -8, opacity: 0 }}
      whileInView={{ filter: 'blur(0px)', y: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.8 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Footer() {
  return (
    <footer
      className="relative w-full max-w-6xl mx-auto flex flex-col items-center justify-center rounded-t-3xl border-t px-6 py-12 lg:py-16"
      style={{
        background: 'radial-gradient(35% 128px at 50% 0%, rgba(255,255,255,0.06), transparent), #000',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <div
        className="absolute top-0 right-1/2 left-1/2 h-px w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'rgba(255,255,255,0.08)', filter: 'blur(1px)' }}
      />

      <div className="grid w-full gap-8 xl:grid-cols-3 xl:gap-8">
        <AnimatedContainer className="space-y-4">
          <Frame className="size-8 text-white/70" />
          <p className="mt-8 text-sm md:mt-0" style={{ color: 'rgba(255,255,255,0.4)' }}>
            © {new Date().getFullYear()} MeduPal. All rights reserved.
          </p>
        </AnimatedContainer>

        <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4 xl:col-span-2 xl:mt-0">
          {footerLinks.map((section, index) => (
            <AnimatedContainer key={section.label} delay={0.1 + index * 0.1}>
              <div className="mb-10 md:mb-0">
                <h3 className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {section.label}
                </h3>
                <ul className="mt-4 space-y-2 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {section.links.map((link) => {
                    const Icon = link.icon;
                    return (
                      <li key={link.title}>
                        <a
                          href={link.href}
                          className="inline-flex items-center transition-all duration-300 hover:opacity-90"
                          style={{ color: 'inherit' }}
                        >
                          {Icon && <Icon className="me-1 size-4" />}
                          {link.title}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </AnimatedContainer>
          ))}
        </div>
      </div>
    </footer>
  );
}
