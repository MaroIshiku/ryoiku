import { spawnSync } from 'node:child_process';

const args = ['node_modules/playwright/cli.js', 'install'];
if (process.platform === 'linux') args.push('--with-deps');
args.push('chromium', 'firefox', 'webkit');
const result = spawnSync(process.execPath, args, { stdio: 'inherit', shell: false });
process.exit(result.status ?? 1);
