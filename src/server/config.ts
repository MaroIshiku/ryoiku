import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

const schema = z.object({
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  DATABASE_PATH: z.string().default('/data/app.sqlite'),
  STATIC_ROOT: z.string().default('dist/client'),
  ISHIKU_BOOTSTRAP_PASSWORD_FILE: z.string().optional(),
  ISHIKU_SETUP_SECRET: z.string().min(32).max(1024).optional(),
  COOKIE_SECURE: z.enum(['true', 'false']).default('true')
});

export function loadConfig(environment = process.env) {
  const value = schema.parse(environment);
  return {
    ...value,
    COOKIE_SECURE: value.COOKIE_SECURE === 'true',
    STATIC_ROOT: resolve(value.STATIC_ROOT),
    setupSecret: value.ISHIKU_SETUP_SECRET,
    bootstrapPassword: value.ISHIKU_BOOTSTRAP_PASSWORD_FILE && existsSync(value.ISHIKU_BOOTSTRAP_PASSWORD_FILE) ? readFileSync(value.ISHIKU_BOOTSTRAP_PASSWORD_FILE, 'utf8').trim() : undefined
  };
}
