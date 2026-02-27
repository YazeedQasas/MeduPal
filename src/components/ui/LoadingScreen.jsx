export function LoadingScreen() {
  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center"
      style={{ backgroundColor: "#000000" }}
    >
      <style>{`
        @keyframes loading-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.6; }
          30% { transform: translateY(-8px); opacity: 1; }
        }
        .loading-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: hsl(var(--primary));
          animation: loading-bounce 0.9s ease-in-out infinite;
        }
      `}</style>
      <div className="flex items-center gap-2" aria-label="Loading">
        <span className="loading-dot" style={{ animationDelay: "0ms" }} />
        <span className="loading-dot" style={{ animationDelay: "150ms" }} />
        <span className="loading-dot" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}
