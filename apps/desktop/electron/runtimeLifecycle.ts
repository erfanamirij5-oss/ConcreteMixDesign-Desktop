export type RuntimeStartupStep = {
  name: string;
  run: () => void | Promise<void>;
};

export type ClosableDatabase = {
  pragma: (statement: string) => unknown;
  close: () => void;
};

export async function runStartupSequence(steps: RuntimeStartupStep[]): Promise<void> {
  for (const step of steps) {
    try {
      await step.run();
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Runtime startup failed at ${step.name}: ${detail}`, { cause: error });
    }
  }
}

export function closeDatabaseSafely(database: ClosableDatabase | null): { closed: boolean; error?: string } {
  if (!database) return { closed: false };
  let checkpointError: string | undefined;
  try {
    database.pragma('wal_checkpoint(TRUNCATE)');
  } catch (error) {
    checkpointError = error instanceof Error ? error.message : String(error);
  }

  try {
    database.close();
  } catch (error) {
    const closeError = error instanceof Error ? error.message : String(error);
    return { closed: false, error: checkpointError ? `${checkpointError}; ${closeError}` : closeError };
  }

  return checkpointError ? { closed: true, error: checkpointError } : { closed: true };
}
