import { deliverIntake } from "./_lib/delivery.js";
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  const result = await deliverIntake(req, process.env);
  return res.status(result.code).json(result.body);
}
