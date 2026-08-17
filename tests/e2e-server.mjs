import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
const directory=mkdtempSync(join(tmpdir(),'ryoiku-e2e-'));
const child=spawn(process.execPath,['--import','tsx','src/server/index.ts'],{stdio:'inherit',env:{...process.env,PORT:'4173',HOST:'127.0.0.1',DATABASE_PATH:join(directory,'app.sqlite'),COOKIE_SECURE:'false',STATIC_ROOT:'dist/client',TZ:'Europe/Berlin'}});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??0));
