import { LoggerService } from '@nestjs/common';
import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Simple file-persistent logger.
 * Logs to both console and logs/app.log.
 */
export class FileLogger implements LoggerService {
  private readonly logDir: string;
  private readonly logFile: string;

  constructor() {
    this.logDir = join(process.cwd(), 'logs');
    this.logFile = join(this.logDir, 'app.log');

    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  private write(level: string, message: string, ...optionalParams: any[]) {
    const ts = new Date().toISOString();
    const extra = optionalParams.length > 0 ? ' ' + optionalParams.map((p) => (typeof p === 'object' ? JSON.stringify(p) : String(p))).join(' ') : '';
    const line = `[${ts}] [${level}] ${message}${extra}`;

    // Console
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }

    // File (best-effort, don't crash if fs fails)
    try {
      appendFileSync(this.logFile, line + '\n', 'utf-8');
    } catch { /* ignore */ }
  }

  log(message: string, ...optionalParams: any[]) {
    this.write('LOG', message, ...optionalParams);
  }

  error(message: string, ...optionalParams: any[]) {
    this.write('ERROR', message, ...optionalParams);
  }

  warn(message: string, ...optionalParams: any[]) {
    this.write('WARN', message, ...optionalParams);
  }

  debug(message: string, ...optionalParams: any[]) {
    this.write('DEBUG', message, ...optionalParams);
  }

  verbose(message: string, ...optionalParams: any[]) {
    this.write('VERBOSE', message, ...optionalParams);
  }
}
