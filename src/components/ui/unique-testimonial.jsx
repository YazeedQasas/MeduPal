import { useState } from "react";
import { cn } from "../../lib/utils";

const testimonials = [
  {
    id: 1,
    quote: "XPatient turned my anxiety into confidence. I went from failing mock OSCEs to scoring in the top 15% of my cohort.",
    author: "Lena Hoffmann",
    role: "4th Year Medical Student, AQU",
    avatar: "https://images.unsplash.com/photo-1701615004837-40d8573b6652?w=200&q=80",
  },
  {
    id: 2,
    quote: "The AI feedback is frighteningly accurate. It catches communication gaps my students didn't even know they had.",
    author: "Dr. James Okafor",
    role: "Clinical Skills Instructor",
    avatar: "https://plus.unsplash.com/premium_photo-1671656349218-5218444643d8?w=200&q=80",
  },
  {
    id: 3,
    quote: "I ran the chest pain station twelve times. Each time the AI patient responded differently. Nothing else comes close.",
    author: "Rania Al-Masri",
    role: "Final Year Student, AAUP",
    avatar: "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=200&q=80",
  },
];

export function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayedQuote, setDisplayedQuote] = useState(testimonials[0].quote);
  const [displayedRole, setDisplayedRole] = useState(testimonials[0].role);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const handleSelect = (index) => {
    if (index === activeIndex || isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      setDisplayedQuote(testimonials[index].quote);
      setDisplayedRole(testimonials[index].role);
      setActiveIndex(index);
      setTimeout(() => setIsAnimating(false), 400);
    }, 200);
  };

  return (
    <div className="flex flex-col items-center gap-10 pt-6 pb-20 px-6">
      {/* Quote */}
      <div className="relative px-8">
        <span className="absolute -left-2 -top-6 text-7xl font-serif select-none pointer-events-none" style={{ color: 'rgba(100,170,145,0.12)' }}>
          "
        </span>
        <p
          className={cn(
            "text-2xl md:text-3xl font-light text-center max-w-2xl leading-relaxed transition-all duration-400 ease-out",
            isAnimating ? "opacity-0 blur-sm scale-[0.98]" : "opacity-100 blur-0 scale-100",
          )}
          style={{ color: 'rgba(255,255,255,0.82)' }}
        >
          {displayedQuote}
        </p>
        <span className="absolute -right-2 -bottom-8 text-7xl font-serif select-none pointer-events-none" style={{ color: 'rgba(100,170,145,0.12)' }}>
          "
        </span>
      </div>

      <div className="flex flex-col items-center gap-6 mt-2">
        {/* Role */}
        <p
          className={cn(
            "text-xs tracking-[0.2em] uppercase transition-all duration-500 ease-out",
            isAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0",
          )}
          style={{ color: 'rgba(100,170,145,0.6)' }}
        >
          {displayedRole}
        </p>

        {/* Avatar pills */}
        <div className="flex items-center justify-center gap-2">
          {testimonials.map((testimonial, index) => {
            const isActive = activeIndex === index;
            const isHovered = hoveredIndex === index && !isActive;
            const showName = isActive || isHovered;

            return (
              <button
                key={testimonial.id}
                onClick={() => handleSelect(index)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={cn(
                  "relative flex items-center gap-0 rounded-full cursor-pointer",
                  "transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
                  showName ? "pr-4 pl-2 py-2" : "p-0.5",
                )}
                style={isActive
                  ? { background: 'rgba(255,255,255,0.92)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }
                  : { background: 'transparent' }
                }
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.author}
                    className={cn(
                      "w-8 h-8 rounded-full object-cover",
                      "transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
                      isActive ? "ring-2" : "ring-0",
                      !isActive && "hover:scale-105",
                    )}
                    style={isActive ? { '--tw-ring-color': 'rgba(100,170,145,0.4)' } : {}}
                  />
                </div>

                <div
                  className={cn(
                    "grid transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
                    showName ? "grid-cols-[1fr] opacity-100 ml-2" : "grid-cols-[0fr] opacity-0 ml-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <span
                      className="text-sm font-medium whitespace-nowrap block transition-colors duration-300"
                      style={{ color: isActive ? '#0a0a0a' : 'rgba(255,255,255,0.85)' }}
                    >
                      {testimonial.author}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
