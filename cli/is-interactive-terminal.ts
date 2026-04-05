/**
 * Resolves whether the current process is attached to an interactive terminal.
 *
 * @returns `true` when both stdin and stdout are TTY streams.
 */
export function isInteractiveTerminal(): boolean {
  return process.stdin.isTTY && process.stdout.isTTY
}
