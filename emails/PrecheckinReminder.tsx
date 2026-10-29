import * as React from "react";
import { Actions, Btn, CodeChip, Hero, Intro, Shell, StayGrid, t, type EmailData } from "./shared";

export function precheckinSubject(d: EmailData) {
  return d.lang === "en" ? `Your digital check-in is ready · ${d.hotel.name} · ${d.code}` : `Tu check-in digital está listo · ${d.hotel.name} · ${d.code}`;
}

export default function PrecheckinReminder({ d }: { d: EmailData }) {
  return (
    <Shell d={d} preview={t(d, "Haz tu check-in en menos de dos minutos y llega directo a tu habitación.", "Check in in under two minutes and go straight to your room.")}>
      <Hero d={d} />
      <Intro
        eyebrow={t(d, "Mañana llegas", "You arrive tomorrow")}
        title={t(d, "Todo listo,", "All set,")}
        italic={`${d.firstName}.`}
        body={t(
          d,
          "Adelanta tu check-in ahora: sube una foto de tu documento, firma las condiciones y recibe tu número de habitación. Al llegar, vas directo a descansar.",
          "Get ahead with your check-in now: upload an ID photo, sign the terms and get your room number. On arrival, go straight to rest.",
        )}
        chip={<CodeChip d={d} />}
      />
      <StayGrid d={d} />
      {d.precheckinUrl ? (
        <Actions note={t(d, "La foto de tu documento no se almacena.", "Your ID photo is never stored.")}>
          <Btn href={d.precheckinUrl}>{t(d, "Hacer mi pre-check-in", "Start my pre-check-in")}</Btn>
        </Actions>
      ) : null}
    </Shell>
  );
}
