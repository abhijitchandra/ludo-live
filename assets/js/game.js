import { NetworkInterface } from './connection.js';

export class GameEngine {
    // Coordinate mapping representing pathing indexes through 15x15 Matrix spaces
    static trackCoordinates = [
        {r:6, c:1}, {r:6, c:2}, {r:6, c:3}, {r:6, c:4}, {r:6, c:5},
        {r:5, c:6}, {r:4, c:6}, {r:3, c:6}, {r:2, c:6}, {r:1, c:6},
        {r:0, c:7},
        {r:1, c:8}, {r:2, c:8}, {r:3, c:8}, {r:4, c:8}, {r:5, c:8}
    ];

    static runtimeState = {
        positions: { red: 0, green: 4 }, // Unique starting offsets
        activeSequenceTurn: 'red',
        terminationFlag: false
    };

    static initializeBoardLayout() {
        const targetBoardContainer = document.getElementById('ludo-board-dom');
        targetBoardContainer.innerHTML = '';

        // Generate full functional coordinate array
        for (let row = 0; row < 15; row++) {
            for (let col = 0; col < 15; col++) {
                const cellNode = document.createElement('div');
                cellNode.className = 'cell';
                cellNode.dataset.row = row;
                cellNode.dataset.col = col;

                // Color-code specialized visual components
                if(row < 6 && col < 6) cellNode.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                if(row < 6 && col > 8) cellNode.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
                
                targetBoardContainer.appendChild(cellNode);
            }
        }

        this.injectTokenElementsToDOM();
    }

    static injectTokenElementsToDOM() {
        const redPawn = document.createElement('div');
        redPawn.className = 'ludo-token red-player';
        redPawn.id = 'pawn-matrix-red';

        const greenPawn = document.createElement('div');
        greenPawn.className = 'ludo-token green-player';
        greenPawn.id = 'pawn-matrix-green';

        document.body.appendChild(redPawn);
        document.body.appendChild(greenPawn);
    }

    static executeLocalDiceSequence() {
        if (this.runtimeState.activeSequenceTurn !== NetworkInterface.runtimeRole || this.runtimeState.terminationFlag) return;

        const interactionButton = document.getElementById('btn-trigger-roll');
        const viewPortElement = document.getElementById('dice-matrix-view');
        
        interactionButton.disabled = true;
        viewPortElement.classList.add('dice-animated');

        setTimeout(() => {
            const calculatedRollValue = Math.floor(Math.random() * 6) + 1;
            viewPortElement.classList.remove('dice-animated');
            viewPortElement.innerText = calculatedRollValue;

            NetworkInterface.pushLog(`Local calculation generated execution value: ${calculatedRollValue}`);

            let subjectRole = NetworkInterface.runtimeRole;
            let projectMoveTarget = this.runtimeState.positions[subjectRole] + calculatedRollValue;

            if (projectMoveTarget < this.trackCoordinates.length) {
                this.runtimeState.positions[subjectRole] = projectMoveTarget;
            }

            if (this.runtimeState.positions[subjectRole] === this.trackCoordinates.length - 1) {
                this.runtimeState.terminationFlag = true;
                NetworkInterface.pushLog(`System State: Victory sequence completed for ${subjectRole.toUpperCase()}`);
            } else {
                this.runtimeState.activeSequenceTurn = subjectRole === 'red' ? 'green' : 'red';
            }

            NetworkInterface.broadcastPayload({
                type: 'DELTA_UPDATE',
                state: this.runtimeState,
                transmissionRoll: calculatedRollValue
            });

            this.synchronizeStateInterface();
        }, 500);
    }

    static consumeRemoteStateMutation(importedState, sharedRoll) {
        this.runtimeState = importedState;
        document.getElementById('dice-matrix-view').innerText = sharedRoll;
        NetworkInterface.pushLog(`Data packet updated state tree. Action roll: ${sharedRoll}`);
        this.synchronizeStateInterface();
    }

    static fetchStateMatrix() { return this.runtimeState; }

    static synchronizeStateInterface() {
        this.synchronizeVisualTokens();
        const infoDisplay = document.getElementById('telemetry-turn');
        
        if (this.runtimeState.terminationFlag) {
            infoDisplay.innerText = 'Session Terminated/Completed';
            return;
        }

        infoDisplay.innerText = `${this.runtimeState.activeSequenceTurn.toUpperCase()}'s Vector Turn`;
        document.getElementById('btn-trigger-roll').disabled = (this.runtimeState.activeSequenceTurn !== NetworkInterface.runtimeRole);
    }

    static synchronizeVisualTokens() {
        this.repositionTokenOnMatrixGrid('pawn-matrix-red', this.trackCoordinates[this.runtimeState.positions.red]);
        this.repositionTokenOnMatrixGrid('pawn-matrix-green', this.trackCoordinates[this.runtimeState.positions.green]);
    }

    static repositionTokenOnMatrixGrid(elementId, spatialCoordinates) {
        const targetToken = document.getElementById(elementId);
        const destinationCell = document.querySelector(`[data-row="${spatialCoordinates.r}"][data-col="${spatialCoordinates.c}"]`);
        
        if (targetToken && destinationCell) {
            const cellBoundary = destinationCell.getBoundingClientRect();
            targetToken.style.width = `${cellBoundary.width * 0.65}px`;
            targetToken.style.height = `${cellBoundary.height * 0.65}px`;
            targetToken.style.left = `${cellBoundary.left + window.scrollX + (cellBoundary.width * 0.175)}px`;
            targetToken.style.top = `${cellBoundary.top + window.scrollY + (cellBoundary.height * 0.175)}px`;
        }
    }
}