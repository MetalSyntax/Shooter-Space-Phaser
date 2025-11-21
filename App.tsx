import React, { useEffect, useRef } from 'react';
import { Game } from 'phaser';
import gameConfig from './game/config';

const App: React.FC = () => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);

  useEffect(() => {
    if (gameContainerRef.current && !gameRef.current) {
      // Initialize Phaser Game
      gameRef.current = new Game({
        ...gameConfig,
        parent: gameContainerRef.current,
      });
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden">
      <div 
        ref={gameContainerRef} 
        className="w-full h-full flex justify-center items-center"
        id="game-container"
      />
      <div className="absolute bottom-4 left-4 text-slate-500 text-xs pointer-events-none select-none">
        <p>Controls: Arrow Keys / WASD to Move • Space / Click to Shoot</p>
      </div>
    </div>
  );
};

export default App;