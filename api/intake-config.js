import { connectorConfig } from "./_lib/delivery.js";
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  const config = connectorConfig(process.env);
  return res
    .status(200)
    .json({
      enabled: !!config,
      destination: config?.name || "Not connected",
      mode: config ? "live" : "demo",
    });
}
