import fs from 'fs';
import path from 'path';
import TOML from 'toml';

let envConfig: any = null;
let langConfig: any = null;

function loadToml(filename: string): any {
  const filePath = path.join(process.cwd(), filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  // JSON round-trip to ensure plain objects (TOML parser may return non-plain prototypes)
  return JSON.parse(JSON.stringify(TOML.parse(content)));
}

export function getEnvConfig() {
  if (!envConfig) {
    envConfig = loadToml('env.toml');
  }
  return envConfig;
}

export function getLang() {
  if (!langConfig) {
    langConfig = loadToml('languages.toml');
  }
  return langConfig;
}

export function getAdminSecret(): string {
  return getEnvConfig().admin.secret;
}

export function getUploadDir(): string {
  return getEnvConfig().upload.dir;
}

export function getMaxTimeDiffMinutes(): number {
  return getEnvConfig().validation.max_time_diff_minutes;
}

export function getMinThoughtsLength(): number {
  return getEnvConfig().validation.min_thoughts_length;
}
