import { useEffect, useRef } from 'react';
import Phaser from 'phaser';

export interface UsePhaserOptions {
  config: Phaser.Types.Core.GameConfig;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function usePhaser({ config, containerRef }: UsePhaserOptions): Phaser.Game | null {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    // Create Phaser game instance
    const gameConfig: Phaser.Types.Core.GameConfig = {
      ...config,
      parent: containerRef.current,
    };

    gameRef.current = new Phaser.Game(gameConfig);

    // Cleanup
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [config, containerRef]);

  return gameRef.current;
}
