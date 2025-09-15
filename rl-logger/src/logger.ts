/**
 * JSONL (JSON Lines) logger for trajectory data
 */

import * as fs from 'fs';
import { TrajectoryEntry, RunMetadata } from './types';
import { validateTrajectoryEntry, validateRunMetadata } from './validators';

/**
 * JSONL log entry types
 */
type LogEntryType = 'metadata' | 'trajectory';

/**
 * Generic JSONL log entry
 */
interface LogEntry<T> {
  type: LogEntryType;
  data: T;
}

/**
 * JSONL logger for writing trajectory data
 */
export class JSONLLogger<TAction = unknown> {
  private fileStream: fs.WriteStream;
  private closed: boolean = false;

  constructor(filePath: string) {
    this.fileStream = fs.createWriteStream(filePath, {
      flags: 'a', // Append mode
      encoding: 'utf8',
    });
  }

  /**
   * Write run metadata
   */
  writeMetadata(metadata: RunMetadata): void {
    validateRunMetadata(metadata);

    const entry: LogEntry<RunMetadata> = {
      type: 'metadata',
      data: metadata,
    };

    this.writeLine(entry);
  }

  /**
   * Write a trajectory entry
   */
  writeEntry(entry: TrajectoryEntry<TAction>): void {
    if (this.closed) {
      throw new Error('Logger is closed');
    }

    validateTrajectoryEntry(entry);

    const logEntry: LogEntry<TrajectoryEntry<TAction>> = {
      type: 'trajectory',
      data: entry,
    };

    this.writeLine(logEntry);
  }

  /**
   * Write a line to the file
   */
  private writeLine(entry: LogEntry<any>): void {
    if (this.closed) {
      throw new Error('Logger is closed');
    }

    const line = JSON.stringify(entry) + '\n';
    this.fileStream.write(line);
  }

  /**
   * Close the logger and wait for all writes to complete
   */
  close(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.closed) {
        this.closed = true;
        this.fileStream.end(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
