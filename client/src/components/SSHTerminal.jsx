import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

const SSHTerminal = ({ host, username = 'root', onClose }) => {
  const terminalRef = useRef(null);
  const terminalInstance = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize terminal
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      theme: {
        background: '#1a1a1a',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selection: '#4a90e2',
        black: '#000000',
        red: '#e06c75',
        green: '#98c379',
        yellow: '#d19a66',
        blue: '#61afef',
        magenta: '#c678dd',
        cyan: '#56b6c2',
        white: '#abb2bf',
        brightBlack: '#5c6370',
        brightRed: '#e06c75',
        brightGreen: '#98c379',
        brightYellow: '#d19a66',
        brightBlue: '#61afef',
        brightMagenta: '#c678dd',
        brightCyan: '#56b6c2',
        brightWhite: '#ffffff'
      }
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    terminalInstance.current = term;

    // Connect to SSH WebSocket proxy (we'll need to implement this on the server)
    const wsUrl = `ws://localhost:3001/ssh?host=${encodeURIComponent(host)}&username=${encodeURIComponent(username)}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        term.writeln(`\r\n\x1b[32mConnected to ${username}@${host}\x1b[0m`);
        term.writeln('Type your commands below...\r\n');
      };

      ws.onmessage = (event) => {
        term.write(event.data);
      };

      ws.onclose = () => {
        term.writeln('\r\n\x1b[31mConnection closed\x1b[0m');
      };

      ws.onerror = (error) => {
        term.writeln(`\r\n\x1b[31mConnection error: ${error}\x1b[0m`);
        term.writeln('\r\nNote: Web-based SSH requires additional server-side setup.');
        term.writeln('For now, use the SSH command shown above in your local terminal.');
      };

      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

    } catch (error) {
      term.writeln(`\r\n\x1b[31mFailed to connect: ${error.message}\x1b[0m`);
    }

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (terminalInstance.current) {
        terminalInstance.current.dispose();
      }
    };
  }, [host, username]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-6xl h-4/5 flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-white text-lg font-semibold">
            SSH Terminal: {username}@{host}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>
        <div className="flex-1 p-4">
          <div
            ref={terminalRef}
            className="w-full h-full bg-black rounded border border-gray-700"
          />
        </div>
        <div className="p-4 border-t border-gray-700 text-sm text-gray-400">
          <strong>Alternative:</strong> Open your local terminal and run: <code className="bg-gray-800 px-2 py-1 rounded">ssh {username}@{host}</code>
        </div>
      </div>
    </div>
  );
};

export default SSHTerminal;