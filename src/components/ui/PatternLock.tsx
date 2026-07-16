'use client';

import React, { useState, useRef, useEffect } from 'react';

interface PatternLockProps {
  onComplete: (pattern: number[]) => void;
  error?: boolean;
  width?: number;
  height?: number;
}

export function PatternLock({ onComplete, error = false, width = 280, height = 280 }: PatternLockProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [pattern, setPattern] = useState<number[]>([]);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 3x3 Grid center points
  const dots = [
    { id: 0, x: 45, y: 45 },
    { id: 1, x: 140, y: 45 },
    { id: 2, x: 235, y: 45 },
    { id: 3, x: 45, y: 140 },
    { id: 4, x: 140, y: 140 },
    { id: 5, x: 235, y: 140 },
    { id: 6, x: 45, y: 235 },
    { id: 7, x: 140, y: 235 },
    { id: 8, x: 235, y: 235 },
  ];

  const handleStart = (id: number) => {
    setIsDrawing(true);
    setPattern([id]);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !containerRef.current) return;

    // Get coordinates relative to the container
    const rect = containerRef.current.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    setMousePos({ x, y });

    // Check if close to any dot
    dots.forEach((dot) => {
      const distance = Math.sqrt(Math.pow(x - dot.x, 2) + Math.pow(y - dot.y, 2));
      if (distance < 25) {
        if (!pattern.includes(dot.id)) {
          setPattern((prev) => [...prev, dot.id]);
        }
      }
    });
  };

  const handleEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setMousePos(null);
    if (pattern.length >= 3) {
      onComplete(pattern);
    } else {
      setPattern([]);
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      handleEnd();
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDrawing, pattern]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setPattern([]);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div
      ref={containerRef}
      className="relative select-none touch-none mx-auto"
      style={{ width: `${width}px`, height: `${height}px` }}
      onMouseMove={handleMove}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
    >
      {/* SVG lines */}
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
        {pattern.map((dotId, index) => {
          const currentDot = dots[dotId];
          const nextDotId = pattern[index + 1];
          const nextDot = nextDotId !== undefined ? dots[nextDotId] : null;

          if (nextDot) {
            return (
              <line
                key={`line-${index}`}
                x1={currentDot.x}
                y1={currentDot.y}
                x2={nextDot.x}
                y2={nextDot.y}
                stroke={error ? '#ef4444' : '#3b82f6'}
                strokeWidth="6"
                strokeLinecap="round"
                className="transition-colors duration-150 shadow-lg shadow-blue-500/50"
              />
            );
          }

          // Line to mouse/touch cursor
          if (index === pattern.length - 1 && mousePos) {
            return (
              <line
                key="line-cursor"
                x1={currentDot.x}
                y1={currentDot.y}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke={error ? '#ef4444' : '#93c5fd'}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="4 4"
              />
            );
          }

          return null;
        })}
      </svg>

      {/* Grid of dots */}
      <div className="absolute top-0 left-0 w-full h-full grid grid-cols-3 grid-rows-3 p-4 gap-4">
        {dots.map((dot) => {
          const isActive = pattern.includes(dot.id);
          return (
            <div
              key={dot.id}
              className="flex items-center justify-center cursor-pointer"
              onMouseDown={() => handleStart(dot.id)}
              onTouchStart={() => handleStart(dot.id)}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 ${
                  isActive
                    ? error
                      ? 'bg-red-500/20 border-2 border-red-500 shadow-lg shadow-red-500/30 scale-110'
                      : 'bg-blue-500/20 border-2 border-blue-500 shadow-lg shadow-blue-500/30 scale-110'
                    : 'bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 hover:scale-105'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full transition-transform ${
                    isActive
                      ? error
                        ? 'bg-red-500 scale-125'
                        : 'bg-blue-500 scale-125'
                      : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
