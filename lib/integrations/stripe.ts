import Stripe from "stripe";
import { stripeEnabled } from "../config";

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!stripeEnabled()) throw new Error("Stripe no está configurado (falta STRIPE_SECRET_KEY de prueba)");
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return client;
}
