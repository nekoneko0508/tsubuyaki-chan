import { spawn } from 'node:child_process';

const processes = [
  spawn('node', ['server.js'], { stdio: 'inherit' }),
  spawn('./node_modules/.bin/vite', ['--host', '0.0.0.0', '--port', '5500', '--strictPort'], { stdio: 'inherit' }),
];

function stopAll() {
  for (const child of processes) {
    child.kill('SIGTERM');
  }
}

process.on('SIGINT', () => {
  stopAll();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopAll();
  process.exit(0);
});
