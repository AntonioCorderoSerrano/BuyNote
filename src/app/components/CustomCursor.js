'use client'
import { useEffect, useState } from 'react';

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [clicked, setClicked] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [clickAnimation, setClickAnimation] = useState(false);

  useEffect(() => {
    // Pequeño retraso para evitar parpadeo inicial
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseDown = (e) => {
      setClicked(true);
      
      // Detectar si se hizo clic en un elemento interactivo
      const target = e.target;
      if (target.tagName === 'BUTTON' || 
          target.tagName === 'A' || 
          target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA' ||
          target.closest('button') || 
          target.closest('a')) {
        setClickAnimation(true);
        setTimeout(() => setClickAnimation(false), 300);
      }
    };
    
    const handleMouseUp = () => {
      setClicked(false);
    };
    
    const handleMouseOver = (e) => {
      // Solo activar hover en elementos interactivos
      if (e.target.tagName === 'BUTTON' || 
          e.target.tagName === 'A' || 
          e.target.tagName === 'INPUT' ||
          e.target.tagName === 'SELECT' ||
          e.target.tagName === 'TEXTAREA' ||
          e.target.closest('button') || 
          e.target.closest('a')) {
        setHovering(true);
      }
    };
    
    const handleMouseOut = () => {
      setHovering(false);
    };

    // Ocultar cursor cuando el mouse sale de la ventana
    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseover', handleMouseOver);
    window.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      clearTimeout(timer);
    };
  }, []);

  // No mostrar en dispositivos táctiles
  if (typeof window !== 'undefined' && 
      ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
    return null;
  }

  const cursorClass = `custom-cursor-lista ${clicked ? 'click' : ''} ${hovering ? 'hover' : ''} ${clickAnimation ? 'click-animation' : ''}`;

  return (
    <>
      {/* Efecto de click (ondas concéntricas) - SOLO cuando se hace clic en elementos interactivos */}
      {clickAnimation && (
        <div 
          className="custom-cursor-click-effect"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            display: isVisible ? 'block' : 'none'
          }}
        />
      )}
      
      {/* Cursor principal */}
      <div 
        className={cursorClass}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          display: isVisible ? 'block' : 'none'
        }}
      />
    </>
  );
}