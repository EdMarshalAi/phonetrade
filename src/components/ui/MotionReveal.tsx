"use client";

import * as React from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: keyof React.JSX.IntrinsicElements;
};

const baseVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export function MotionReveal({
  children,
  className,
  delay = 0,
  y = 16,
  as = "div",
}: RevealProps) {
  const reduce = useReducedMotion();
  const Component = motion[as as "div"];

  return (
    <Component
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.32, 0.72, 0, 1],
      }}
      variants={baseVariants}
    >
      {children}
    </Component>
  );
}

type StaggerProps = {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
};

export function MotionStagger({
  children,
  className,
  stagger = 0.08,
}: StaggerProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? false : "hidden"}
      whileInView={reduce ? undefined : "visible"}
      viewport={{ once: true, amount: 0.15 }}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: stagger },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function MotionItem({
  children,
  className,
  y = 14,
}: {
  children: React.ReactNode;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: [0.32, 0.72, 0, 1] },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
