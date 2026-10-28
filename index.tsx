/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Paragraph } from "@components/Paragraph";
import { Switch } from "@components/Switch";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { FluxStore } from "@vencord/discord-types";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { RestAPI, showToast, ThemeStore, useStateFromStores } from "@webpack/common";

interface ConnectedAccount {
    id: string;
    type: string;
    name?: string;
    revoked?: boolean;
}

interface ConnectedAccountsStore extends FluxStore {
    getAccounts(): ConnectedAccount[];
}

const ConnectedAccountsStore = findStoreLazy("ConnectedAccountsStore") as ConnectedAccountsStore;
interface Platform { name?: string; icon?: { lightSVG: string; darkSVG: string; }; }
const platforms: { get(type: string): Platform | undefined; } = findByPropsLazy("isSupported", "getByUrl");
const logger = new Logger("ConnectionsRefresh");

const keyOf = (a: ConnectedAccount) => `${a.type}:${a.id}`;

let timer: ReturnType<typeof setInterval> | undefined;
let running = false;

async function refreshOne(a: ConnectedAccount) {
    const url = `/users/@me/connections/${encodeURIComponent(a.type)}/${encodeURIComponent(a.id)}/refresh`;
    try {
        await RestAPI.put({ url });
    } catch (e: any) {
        // shortcut: endpoint method not verified against Discord at runtime; fall back to POST on 404/405
        if (e?.status === 404 || e?.status === 405) await RestAPI.post({ url });
        else throw e;
    }
}

async function refreshAll(notify = false) {
    if (running) return;
    running = true;
    let ok = 0, failed = 0;
    try {
        const excluded = new Set(settings.store.excluded);
        const accounts = ConnectedAccountsStore.getAccounts().filter(a => !a.revoked && !excluded.has(keyOf(a)));
        for (const a of accounts) {
            try {
                await refreshOne(a);
                ok++;
            } catch (e) {
                failed++;
                logger.warn(`Failed to refresh ${a.type} (${a.name ?? a.id})`, e);
            }
            await new Promise(r => setTimeout(r, 1000)); // spread requests to avoid rate limits
        }
    } finally {
        running = false;
    }
    if (notify) showToast({ text: `Connections refresh: ${ok} ok, ${failed} failed`, variant: failed ? "critical" : "success" });
}

function schedule() {
    clearInterval(timer);
    const minutes = Math.max(1, Number(settings.store.intervalMinutes) || 30);
    timer = setInterval(() => void refreshAll(), minutes * 60_000);
}

function SettingsList() {
    const { excluded } = settings.use(["excluded"]);
    const accounts = useStateFromStores([ConnectedAccountsStore], () => ConnectedAccountsStore.getAccounts())
        .filter(a => !a.revoked);
    const theme = useStateFromStores([ThemeStore], () => ThemeStore.theme);

    const toggle = (a: ConnectedAccount, on: boolean) => {
        const k = keyOf(a);
        settings.store.excluded = on ? excluded.filter(x => x !== k) : [...excluded, k];
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Paragraph>Choose which connections to refresh:</Paragraph>
            {accounts.length === 0 && <Paragraph>No connected accounts found.</Paragraph>}
            {accounts.map(a => {
                const p = platforms.get(a.type);
                const icon = theme === "light" ? p?.icon?.lightSVG : p?.icon?.darkSVG;
                return (
                    <div key={keyOf(a)} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {icon ? <img src={icon} width={28} height={28} alt="" /> : <div style={{ width: 28, height: 28 }} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <Paragraph style={{ fontWeight: 600 }}>{p?.name ?? a.type}</Paragraph>
                            <Paragraph style={{ opacity: 0.7 }}>{a.name ?? a.id}</Paragraph>
                        </div>
                        <Switch checked={!excluded.includes(keyOf(a))} onChange={on => toggle(a, on)} />
                    </div>
                );
            })}
            <div><Button onClick={() => void refreshAll(true)}>Refresh now</Button></div>
        </div>
    );
}

const settings = definePluginSettings({
    intervalMinutes: {
        type: OptionType.SLIDER,
        description: "How often to refresh connections (minutes)",
        markers: [5, 10, 15, 30, 60, 120, 240],
        default: 30,
        stickToMarkers: false,
        onChange: schedule
    },
    excluded: {
        type: OptionType.CUSTOM,
        default: [] as string[]
    },
    list: {
        type: OptionType.COMPONENT,
        component: SettingsList
    }
});

export default definePlugin({
    name: "ConnectionsRefresh",
    description: "Automatically refreshes your connected accounts (Steam, X, TikTok, etc.) so their stats stay up to date",
    authors: [{ name: "deanxbox", id: 285021062578700289n }],
    settings,
    start() {
        schedule();
        setTimeout(() => void refreshAll(), 10_000); // let the account store populate first
    },
    stop() {
        clearInterval(timer);
    }
});




