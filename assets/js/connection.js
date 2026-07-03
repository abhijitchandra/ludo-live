import { GameEngine } from './game.js';

export class NetworkInterface {
    static peerInstance = null;
    static activeDataChannel = null;
    static runtimeRole = 'spectator';

    static establishConnectionHook() {
        const urlParams = new URLSearchParams(window.location.search);
        const externalRoomToken = urlParams.get('room');

        if (externalRoomToken) {
            document.getElementById('host-actions').classList.add('hidden');
            this.initializeClientNode(externalRoomToken);
        } else {
            document.getElementById('btn-host-match').addEventListener('click', () => {
                this.initializeHostNode();
            });
        }
    }

    static initializeHostNode() {
        this.peerInstance = new Peer();
        this.runtimeRole = 'red';
        this.updateNodeTelemetryDisplay();

        this.peerInstance.on('open', (uniqueId) => {
            const platformURI = `${window.location.origin}${window.location.pathname}?room=${uniqueId}`;
            document.getElementById('input-invite-link').value = platformURI;
            document.getElementById('invite-share-module').classList.remove('hidden');
            this.pushLog('Host pipeline operational. Invite token synthesized.');
        });

        this.peerInstance.on('connection', (incomingChannel) => {
            if (this.activeDataChannel) {
                incomingChannel.close();
                return;
            }
            this.activeDataChannel = incomingChannel;
            this.bindChannelDataPipeline();
        });
    }

    static initializeClientNode(targetToken) {
        this.peerInstance = new Peer();
        this.runtimeRole = 'green';
        this.updateNodeTelemetryDisplay();
        this.pushLog('Client node online. Linking peer handshake structure...');

        this.peerInstance.on('open', () => {
            this.activeDataChannel = this.peerInstance.connect(targetToken);
            this.bindChannelDataPipeline();
        });
    }

    static bindChannelDataPipeline() {
        this.activeDataChannel.on('open', () => {
            this.pushLog('P2P state sync achieved. Direct data pipeline is now live.');
            if (this.runtimeRole === 'red') {
                this.broadcastPayload({ type: 'HELO_SYNC', state: GameEngine.fetchStateMatrix() });
            }
        });

        this.activeDataChannel.on('data', (packet) => {
            if (packet.type === 'HELO_SYNC' || packet.type === 'DELTA_UPDATE') {
                GameEngine.consumeRemoteStateMutation(packet.state, packet.transmissionRoll);
            }
        });

        this.activeDataChannel.on('close', () => {
            this.pushLog('Alert: P2P partner node disconnected unexpectedly.');
            document.getElementById('btn-trigger-roll').disabled = true;
        });
    }

    static broadcastPayload(payload) {
        if (this.activeDataChannel && this.activeDataChannel.open) {
            this.activeDataChannel.send(payload);
        }
    }

    static updateNodeTelemetryDisplay() {
        const displayLabel = document.getElementById('telemetry-role');
        displayLabel.innerText = this.runtimeRole === 'red' ? 'Host (Red Node)' : 'Guest (Green Node)';
    }

    static pushLog(message) {
        const terminal = document.getElementById('sys-log-stream');
        terminal.innerHTML += `<br>> [${new Date().toLocaleTimeString()}] ${message}`;
        terminal.scrollTop = terminal.scrollHeight;
    }
}