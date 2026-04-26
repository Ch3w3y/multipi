/**
 * tmux integration for subagent visibility
 * Opens a dedicated tmux window per subagent so you can watch it work live.
 */
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export interface TmuxMonitor {
	windowId: string;
	logFile: string;
	logStream: fs.WriteStream;
}

export function isInsideTmux(): boolean {
	return !!process.env.TMUX;
}

export function openTmuxWindow(agentName: string, task: string, step?: number): TmuxMonitor | null {
	if (!isInsideTmux()) return null;

	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-subagent-"));
	const logFile = path.join(tmpDir, "tmux.log");
	const stream = fs.createWriteStream(logFile, { flags: "a" });

	const header =
		`\n\n┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n` +
		`┃  π subagent: ${agentName}${step ? ` (step ${step})` : ""}\n` +
		`┃  task: ${task.slice(0, 72)}${task.length > 72 ? "…" : ""}\n` +
		`┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n`;
	stream.write(header);

	const idResult = spawnSync("tmux", [
		"new-window",
		"-P",
		"-F",
		"#{window_id}",
		"-n",
		`π-${agentName}${step ? `-${step}` : ""}`,
		"tail",
		"-n",
		"40",
		"-f",
		logFile,
	]);

	if (idResult.status !== 0 || idResult.error) {
		stream.end();
		try { fs.unlinkSync(logFile); } catch {}
		try { fs.rmdirSync(tmpDir); } catch {}
		return null;
	}

	const windowId = idResult.stdout.toString().trim();
	return { windowId, logFile, logStream: stream };
}

export function closeTmuxWindow(monitor: TmuxMonitor | null): void {
	if (!monitor) return;
	try {
		monitor.logStream.write("\n\n━━━ completed ━━━\n");
		monitor.logStream.end();
	} catch { /* ignore */ }
	try {
		spawnSync("tmux", ["kill-window", "-t", monitor.windowId]);
	} catch { /* ignore */ }
	try {
		fs.unlinkSync(monitor.logFile);
	} catch { /* ignore */ }
	try {
		fs.rmdirSync(path.dirname(monitor.logFile));
	} catch { /* ignore */ }
}

export function writeTmuxLog(monitor: TmuxMonitor | null, data: Buffer | string): void {
	if (!monitor) return;
	try {
		monitor.logStream.write(data);
	} catch { /* ignore */ }
}
