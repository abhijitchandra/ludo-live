import { NetworkInterface } from './connection.js';
import { GameEngine } from './game.js';

class ApplicationBootstrap {
    static init() {
        this.setupThemeEngine();
        
        // Initialize Core System Sub-Engines
        GameEngine.initializeBoardLayout();
        NetworkInterface.establishConnectionHook();
        
        // Event Telemetry Binding Loop
        document.getElementById('btn-trigger-roll').addEventListener('click', () => {
            GameEngine.executeLocalDiceSequence();
        });
    }

    static setupThemeEngine() {
        const toggleBtn = document.getElementById('btn-theme-toggle');
        toggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const targetTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', targetTheme);
            
            // Re-render elements across the board coordinate tree to prevent pixel shifts
            GameEngine.synchronizeVisualTokens();
        });
    }
}

document.addEventListener('DOMContentLoaded', () => ApplicationBootstrap.init());