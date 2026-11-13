import { createHmac, randomUUID } from "node:crypto";
const secret = process.env.INTAKE_SESSION_SECRET,
  origin = process.env.INTAKE_PUBLIC_ORIGIN;
if (
  !secret ||
  secret.length < 32 ||
  !origin ||
  new URL(origin).protocol !== "https:"
)
  throw Error(
    "Set INTAKE_SESSION_SECRET and INTAKE_PUBLIC_ORIGIN in a trusted clinic environment.",
  );
const claim = Buffer.from(
  JSON.stringify({
    aud: "imw-intake",
    sessionId: randomUUID(),
    exp: Math.floor(Date.now() / 1000) + 3600,
  }),
).toString("base64url");
const token = `${claim}.${createHmac("sha256", secret).update(claim).digest("base64url")}`;
// This URL is an access credential. Share only with its intended patient using clinic-approved channels.
process.stdout.write(`${origin}/#intake_token=${token}\n`);
