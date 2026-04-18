import { TFile } from "obsidian";

export interface HistoryEntry {
  description: string;
  snapshots: { file: TFile; before: string; after: string }[];
  timestamp: number;
}

export class UndoRedoManager {
  private stack: HistoryEntry[] = [];
  private pointer = -1;
  private readonly maxSize: number;

  constructor(maxSize = 10) {
    this.maxSize = maxSize;
  }

  push(entry: HistoryEntry): void {
    // Truncate redo branch
    this.stack = this.stack.slice(0, this.pointer + 1);
    this.stack.push(entry);
    // Enforce maxSize
    if (this.stack.length > this.maxSize) {
      this.stack.shift();
    }
    this.pointer = this.stack.length - 1;
  }

  /**
   * Moves the pointer back one step and returns the entry that was just undone.
   * The caller should write `snapshot.before` to restore each file to its pre-change state.
   * Returns `null` when there is nothing left to undo.
   */
  undo(): HistoryEntry | null {
    if (!this.canUndo()) return null;
    return this.stack[this.pointer--];
  }

  /**
   * Moves the pointer forward one step and returns the entry to re-apply.
   * The caller should write `snapshot.after` to each file to replay the change.
   * Returns `null` when there is nothing left to redo.
   */
  redo(): HistoryEntry | null {
    if (!this.canRedo()) return null;
    return this.stack[++this.pointer];
  }

  canUndo(): boolean {
    return this.pointer >= 0;
  }

  canRedo(): boolean {
    return this.pointer < this.stack.length - 1;
  }

  clear(): void {
    this.stack = [];
    this.pointer = -1;
  }
}
