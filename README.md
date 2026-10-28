# ConnectionsRefresh

A [Vencord](https://vencord.dev) userplugin that automatically refreshes your connected accounts (Steam, X/Twitter, TikTok, GitHub, Spotify, Roblox, Epic Games, etc.) so the stats shown on your Discord profile stay up to date.

## Features

- Refreshes your connections on a timer, one at a time, to avoid rate limits
- Choose exactly which connections are refreshed. The list is built from the accounts linked to your Discord account, with each platform's icon and name
- Configurable refresh interval (5 minutes to 4 hours, default 30 minutes)
- "Refresh now" button with a result toast

## Installation

Userplugins require building Vencord from source. See the [Vencord userplugin guide](https://docs.vencord.dev/installing/custom-plugins/).

```sh
cd src/userplugins
git clone https://github.com/deanxbox/Connections-Refresh ConnectionsRefresh
cd ../..
pnpm build
pnpm inject
```

Then enable **ConnectionsRefresh** in Settings > Vencord > Plugins.

## Settings

| Setting | Description |
| --- | --- |
| Interval Minutes | How often to refresh connections (5 to 240) |
| Connections to refresh | Per-account switches; accounts you switch off are skipped |

## Notes

- Refreshes use Discord's `/users/@me/connections/{type}/{id}/refresh` endpoint, falling back from `PUT` to `POST`. This endpoint is not documented, so some connection types may not support refreshing. Failures are logged to the console under `ConnectionsRefresh`.
- The first refresh runs 10 seconds after the plugin starts.

## License

GPL-3.0-or-later, matching Vencord.

