import assert from "node:assert/strict";
import { parseUserSessionId, toAvdSession } from "./arm";

const id =
  "/subscriptions/11111111-2222-3333-4444-555555555555/resourceGroups/rg-avd-prod/providers/Microsoft.DesktopVirtualization/hostPools/hp-win11-pooled/sessionHosts/avd-sh-01.contoso.local/userSessions/1";

const parsed = parseUserSessionId(id);
assert.ok(parsed);
assert.equal(parsed.sessionHostName, "avd-sh-01.contoso.local");
assert.equal(parsed.userSessionId, "1");
assert.equal(parsed.hostPoolName, "hp-win11-pooled");

const session = toAvdSession({
  id,
  name: "1",
  userPrincipalName: "alex@contoso.com",
  sessionState: "Active",
});
assert.ok(session);
assert.equal(session.userPrincipalName, "alex@contoso.com");
assert.equal(session.resourceGroup, "rg-avd-prod");

assert.equal(parseUserSessionId("/not/a/session"), null);

console.log("arm.test.ts: ok");
