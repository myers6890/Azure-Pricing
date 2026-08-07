# SignOff — AVD Session Manager

Query **Azure Virtual Desktop (AVD)** user sessions and log users off (or disconnect them) without opening the Azure portal.

## What it does

- Lists Azure subscriptions available to your credentials
- Lists AVD host pools in a subscription
- Queries user sessions (filter by host pool, session state, or UPN)
- Selects one or more sessions and **logs them off** (force optional) or **disconnects** them

All actions call the Azure Desktop Virtualization management APIs (`Microsoft.DesktopVirtualization`) from this app.

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo mode (no Azure account)

`.env.local` defaults to:

```env
AVD_DEMO_MODE=true
```

You can browse sample host pools/sessions and practice logoff/disconnect against in-memory demo data.

### Real Azure environment

1. Set `AVD_DEMO_MODE=false` in `.env.local`.
2. Authenticate with one of:
   - **Azure CLI**: `az login` (and optionally `az account set --subscription <id>`)
   - **Service principal** env vars:
     ```env
     AZURE_TENANT_ID=...
     AZURE_CLIENT_ID=...
     AZURE_CLIENT_SECRET=...
     ```
3. Grant the identity permission to manage AVD sessions, for example:
   - Role: **Desktop Virtualization Contributor** (or custom role with `Microsoft.DesktopVirtualization/hostpools/*/read` and `.../userSessions/*`)
   - Scope: subscription or the resource group that contains your host pools

Then run `npm run dev` and use **Query** to load live sessions.

## Scripts

| Command        | Description                |
| -------------- | -------------------------- |
| `npm run dev`  | Start the Next.js dev server |
| `npm run build`| Production build           |
| `npm run start`| Run the production server  |
| `npm run lint` | Lint                       |

## API surface

| Method | Path                         | Purpose                          |
| ------ | ---------------------------- | -------------------------------- |
| `GET`  | `/api/status`                | Auth / demo mode status          |
| `GET`  | `/api/subscriptions`         | List subscriptions               |
| `GET`  | `/api/hostpools?subscriptionId=` | List host pools              |
| `GET`  | `/api/sessions?...`          | List user sessions               |
| `POST` | `/api/sessions/logoff`       | Log off selected sessions        |
| `POST` | `/api/sessions/disconnect`   | Disconnect selected sessions     |

### Logoff body

```json
{
  "force": true,
  "sessions": [
    {
      "subscriptionId": "...",
      "resourceGroup": "rg-avd-prod",
      "hostPoolName": "hp-win11-pooled",
      "sessionHostName": "avd-sh-01.contoso.local",
      "userSessionId": "1"
    }
  ]
}
```

## Notes

- Logoff uses the AVD `UserSessions - Delete` operation (`force` logs the user off even when required).
- Disconnect uses `UserSessions - Disconnect` (session remains, connection drops).
- Credentials never need the Azure portal UI; they only need Azure Resource Manager access.
