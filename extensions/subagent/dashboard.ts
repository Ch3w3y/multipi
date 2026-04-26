/**
 * TUI dashboard for active subagents — oh-my-posh/powerline style status bar
 */
import { truncateToWidth } from "@mariozechner/pi-tui";
import type { Theme } from "@mariozechner/pi-coding-agent";

export interface AgentActivity {
	name: string;
	status: "pending" | "running" | "done" | "error";
	model?: string;
	step?: number;
}

export class SubagentDashboard {
	public activities: AgentActivity[] = [];
	private cachedWidth?: number;
	private cachedLines?: string[];

	setActivities(activities: AgentActivity[]) {
		this.activities = activities;
		this.invalidate();
	}

	updateActivity(name: string, patch: Partial<AgentActivity>) {
		const idx = this.activities.findIndex((a) => a.name === name);
		if (idx >= 0) {
			this.activities[idx] = { ...this.activities[idx], ...patch };
		} else {
			this.activities.push({ name, status: "pending", ...patch });
		}
		this.invalidate();
	}

	removeActivity(name: string) {
		this.activities = this.activities.filter((a) => a.name !== name);
		this.invalidate();
	}

	invalidate() {
		this.cachedWidth = undefined;
		this.cachedLines = undefined;
	}

	render(width: number, theme: Theme): string[] {
		if (this.cachedLines && this.cachedWidth === width) {
			return this.cachedLines;
		}

		const running = this.activities.filter((a) => a.status === "running");
		if (running.length === 0) {
			this.cachedWidth = width;
			this.cachedLines = [];
			return [];
		}

		// powerline segments
		const segments: { text: string; bg: string }[] = [];
		segments.push({ text: " π-agents ", bg: "toolSuccessBg" });
		for (const a of running) {
			const icon = a.step ? `⚡${a.step}` : "◉";
			const modelTag = a.model ? ` [${a.model.split("/").pop()?.replace("ollama/", "")}]` : "";
			segments.push({ text: ` ${icon} ${a.name}${modelTag} `, bg: "toolPendingBg" });
		}

		let line = "";
		for (let i = 0; i < segments.length; i++) {
			const s = segments[i];
			line += theme.bg(s.bg, theme.fg("text", s.text));
			if (i < segments.length - 1) {
				line += theme.bg("selectedBg", theme.fg("muted", " │ "));
			}
		}

		this.cachedWidth = width;
		this.cachedLines = [truncateToWidth(line, width)];
		return this.cachedLines;
	}
}
