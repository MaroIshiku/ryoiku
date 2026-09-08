import { spawnSync } from 'node:child_process';
import process from 'node:process';

const playwrightCli = 'node_modules/playwright/cli.js';
const playwrightImage = 'mcr.microsoft.com/playwright:v1.63.0-noble@sha256:eff16c30e6f3f4af0a03fa4b706120d5e9b0891c344a27d64559aff5900a4a27';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    shell: false,
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(process.execPath, [playwrightCli, 'install', 'chromium', 'firefox']);
run('npm', ['run', 'build']);
run(process.execPath, [
  playwrightCli,
  'test',
  '--project=desktop-chromium',
  '--project=desktop-firefox',
]);

if (process.platform === 'linux') {
  const uid = process.getuid?.() ?? 65532;
  const gid = process.getgid?.() ?? 65532;
  run('docker', [
    'run',
    '--rm',
    '--init',
    '--ipc=host',
    '--user',
    `${uid}:${gid}`,
    '--env',
    'HOME=/tmp',
    '--volume',
    `${process.cwd()}:/work:ro`,
    '--workdir',
    '/work',
    playwrightImage,
    'npx',
    'playwright',
    'test',
    '--project=mobile-webkit',
    '--output=/tmp/ryoiku-webkit-results',
  ]);
} else {
  run(process.execPath, [playwrightCli, 'install', 'webkit']);
  run(process.execPath, [playwrightCli, 'test', '--project=mobile-webkit']);
}
