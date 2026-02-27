"use client";

import { cn } from "../../lib/utils";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

const SidebarContext = createContext(undefined);

const TRANSITION = { duration: 0.3, ease: "easeInOut" };

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

export function SidebarProvider({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function Sidebar({ children, open, setOpen, animate }) {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
}

export function SidebarBody(props) {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...props} />
    </>
  );
}

export function DesktopSidebar({ className, children, ...props }) {
  const { open, setOpen, animate } = useSidebar();
  return (
    <motion.div
      className={cn(
        // px-3 restored — this is the source of truth for horizontal padding
        "h-full px-3 py-4 hidden md:flex md:flex-col bg-card border-r border-border flex-shrink-0 overflow-hidden",
        className
      )}
      animate={{
        width: animate ? (open ? "300px" : "60px") : "300px",
      }}
      transition={TRANSITION}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function MobileSidebar({ className, children, ...props }) {
  const { open, setOpen } = useSidebar();
  return (
    <>
      <div
        className={cn(
          "h-12 px-4 flex flex-row md:hidden items-center justify-between bg-card border-b border-border w-full"
        )}
        {...props}
      >
        <div className="flex justify-end z-20 w-full">
          <Menu
            className="text-foreground cursor-pointer hover:text-muted-foreground transition-colors"
            onClick={() => setOpen(!open)}
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={TRANSITION}
              className={cn(
                "fixed h-full w-full inset-0 bg-background p-10 z-[100] flex flex-col justify-between border-r border-border",
                className
              )}
            >
              <div
                className="absolute right-10 top-10 z-50 text-foreground cursor-pointer hover:text-muted-foreground transition-colors"
                onClick={() => setOpen(!open)}
              >
                <X />
              </div>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

/**
 * Nav item that supports tab switching (onClick + isActive) or link (href).
 * link: { label, icon, id? }
 */
export function SidebarLink({
  link,
  className,
  isActive,
  onClick,
  href,
  ...props
}) {
  const { open, animate } = useSidebar();

  // Sidebar container has px-3 (12px each side).
  // Collapsed total width = 60px → inner width = 60 - 24 = 36px.
  // Icon is w-5 = 20px. To center: (36 - 20) / 2 = 8px paddingLeft.
  // Open: standard px-3 = 12px paddingLeft.
  const pl = animate ? (open ? 12 : 8) : 12;

  const sharedMotionProps = {
    animate: { paddingLeft: pl },
    transition: TRANSITION,
    className: cn(
      "flex items-center gap-2 group/sidebar py-2.5 rounded-md w-full text-left",
      isActive
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      className
    ),
  };

  const content = (
    <>
      <span className="flex-shrink-0 flex items-center justify-center w-5 h-5">
        {link.icon}
      </span>
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        transition={TRANSITION}
        className={cn(
          "text-sm group-hover/sidebar:translate-x-1 transition-transform duration-150 whitespace-pre !p-0 !m-0",
          isActive
            ? "text-primary font-medium"
            : "text-muted-foreground group-hover/sidebar:text-foreground"
        )}
      >
        {link.label}
      </motion.span>
    </>
  );

  if (onClick != null) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        {...sharedMotionProps}
        {...props}
      >
        {content}
      </motion.button>
    );
  }

  return (
    <motion.a href={href ?? "#"} {...sharedMotionProps} {...props}>
      {content}
    </motion.a>
  );
}
