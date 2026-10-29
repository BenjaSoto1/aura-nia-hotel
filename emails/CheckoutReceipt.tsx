import * as React from "react";
import { CodeChip, Intro, Shell, StayGrid, Summary, t, type EmailData } from "./shared";

export function receiptSubject(d: EmailData) {
  return d.lang === "en" ? `Your receipt · ${d.hotel.name} · ${d.code}` : `Tu comprobante · ${d.hotel.name} · ${d.code}`;
}

export default function CheckoutReceipt({ d }: { d: EmailData }) {
  return (
    <Shell d={d} preview={t(d, `Gracias por tu estadía. Aquí está tu comprobante ${d.code}.`, `Thanks for staying. Here is your receipt ${d.code}.`)}>
      <Intro
        eyebrow={t(d, "Comprobante", "Receipt")}
        title={t(d, "Gracias por quedarte,", "Thank you for staying,")}
        italic={`${d.firstName}.`}
        body={t(d, `Fue un gusto recibirte en ${d.hotel.name}. Este es el resumen de tu cuenta.`, `It was a pleasure to host you at ${d.hotel.name}. Here is your account summary.`)}
        chip={<CodeChip d={d} />}
      />
      <StayGrid d={d} />
      <Summary d={d} title={t(d, "Consumos, impuestos y pagos", "Charges, taxes and payments")} showPayments />
    </Shell>
  );
}
