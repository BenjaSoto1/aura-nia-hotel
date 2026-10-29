"use client";
import { useEffect, useState } from "react";


const TXT = {
  es: {
    idTitle: "Verificación de identidad",
    idBody: "Para tu check-in digital verificaremos tu documento con prueba de vida (Jumio, simulado en este demo). Solo guardamos el resultado; la imagen se descarta.",
    accept: "Acepto",
    desk: "Prefiero hacerlo en recepción",
    photoTitle: "Foto de tu documento",
    photoBody: "Pasaporte o documento de identidad, bien iluminado.",
    photoCta: "📷 Tomar o subir foto",
    verifying: "🔎 Verificando documento y prueba de vida…",
    verified: "✅ Identidad verificada (simulado)",
    termsTitle: "Condiciones de estadía",
    termCheckin: (t: string) => `Check-in desde las ${t}.`,
    noSmoking: "Prohibido fumar en las habitaciones.",
    charges: "Los consumos se cargan a la habitación y se pagan al salir.",
    sign: "✍️ Firmar condiciones",
    gTitle: "Garantía",
    gBody: (usd: number) => `Tu tarifa se paga en el hotel. Autoriza una garantía de USD ${usd}: se retiene en tu tarjeta y se libera al hacer checkout. No se cobra.`,
    gDone: "Garantía autorizada · terminar check-in",
    gCta: "Autorizar garantía",
    doneTitle: "¡Check-in listo!",
    doneBody: (t: string) => `Tu habitación está lista desde las ${t}. Te enviamos los detalles por WhatsApp.`,
    deskTitle: "Te esperamos en recepción",
    deskBody: (t: string) => `Lleva tu documento. Check-in desde las ${t}.`,
  },
  en: {
    idTitle: "Identity verification",
    idBody: "For your digital check-in we'll verify your ID with a liveness check (Jumio, simulated in this demo). We only keep the result; the image is discarded.",
    accept: "I agree",
    desk: "I'd rather do it at the front desk",
    photoTitle: "Photo of your ID",
    photoBody: "Passport or ID card, well lit.",
    photoCta: "📷 Take or upload a photo",
    verifying: "🔎 Verifying document and liveness…",
    verified: "✅ Identity verified (simulated)",
    termsTitle: "Stay terms",
    termCheckin: (t: string) => `Check-in from ${t}.`,
    noSmoking: "No smoking in the rooms.",
    charges: "Charges are added to your room and paid at check-out.",
    sign: "✍️ Sign terms",
    gTitle: "Guarantee",
    gBody: (usd: number) => `Your rate is paid at the hotel. Authorize a USD ${usd} guarantee: it's held on your card and released at check-out. It is not charged.`,
    gDone: "Guarantee authorized · finish check-in",
    gCta: "Authorize guarantee",
    doneTitle: "Check-in complete!",
    doneBody: (t: string) => `Your room is ready from ${t}. We sent the details to your WhatsApp.`,
    deskTitle: "See you at the front desk",
    deskBody: (t: string) => `Bring your ID. Check-in from ${t}.`,
  },
};

type Step = "consent" | "photo" | "verifying" | "sign" | "guarantee" | "done" | "desk";

export function CheckinFlow(props: {
  token: string;
  initialStatus: string;
  initialRoom: string | null;
  needsGuarantee: boolean;
  guaranteeUsd: number;
  checkInTime: string;
  petPolicy: string;
  initialGuarantee: boolean;
  lang: "es" | "en";
}) {
  const t = TXT[props.lang];
  const [step, setStep] = useState<Step>(props.initialStatus === "precheckin_done" ? "done" : "consent");
  const [room, setRoom] = useState(props.initialRoom);
  const [preview, setPreview] = useState<string | null>(null);
  const [guarantee, setGuarantee] = useState(props.initialGuarantee);
  const [err, setErr] = useState<string | null>(null);

  const api = (action: string) =>
    fetch(`/api/checkin/${props.token}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) }).then((r) => r.json());

  // Mientras se espera la garantía, consultamos si ya se autorizó (webhook o pago simulado en otra pestaña)
  useEffect(() => {
    if (step !== "guarantee") return;
    const id = setInterval(async () => {
      const d = await fetch(`/api/checkin/${props.token}`).then((r) => r.json());
      if (d.guaranteeAuthorized) setGuarantee(true);
      if (d.status === "precheckin_done") {
        setRoom(d.roomNumber);
        setStep("done");
      }
    }, 1500);
    return () => clearInterval(id);
  }, [step, props.token]);

  const finish = async () => {
    const d = await api("complete");
    if (!d.ok) return setErr(d.error);
    setRoom(d.roomNumber);
    setStep("done");
  };

  const card = "mt-4 rounded-2xl border border-arena-200 bg-white p-5";
  const primary = "mt-4 w-full bg-oscuro py-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-fondo hover:bg-noche disabled:opacity-50";
  const steps: Step[] = ["consent", "photo", "sign", ...(props.needsGuarantee ? (["guarantee"] as Step[]) : []), "done"];
  const idx = Math.max(0, steps.indexOf(step === "verifying" ? "photo" : step));

  return (
    <div>
      {step !== "desk" && (
        <div className="mt-5 flex gap-1.5">
          {steps.map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= idx ? "bg-laguna" : "bg-arena-200"}`} />
          ))}
        </div>
      )}

      {step === "consent" && (
        <div className={card}>
          <h2 className="font-serif text-xl">{t.idTitle}</h2>
<p className="mt-2 text-sm text-tinta">{t.idBody}</p>
          <button
            className={primary}
            onClick={async () => {
              await api("consent");
              setStep("photo");
            }}
          >
            {t.accept}
          </button>
          <button onClick={() => setStep("desk")} className="mt-2 w-full py-2 text-sm text-gris hover:text-oscuro">
            {t.desk}
          </button>
        </div>
      )}

      {(step === "photo" || step === "verifying") && (
        <div className={card}>
          <h2 className="font-serif text-xl">{t.photoTitle}</h2>
          <p className="mt-2 text-sm text-tinta">{t.photoBody}</p>
          <label className="mt-4 grid h-44 cursor-pointer place-items-center overflow-hidden rounded-xl border-2 border-dashed border-arena-200 bg-fondo text-sm text-gris">
            {preview ? <img src={preview} alt="Documento" className="h-full w-full object-cover blur-sm" /> : t.photoCta}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              disabled={step === "verifying"}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setPreview(URL.createObjectURL(f)); // la imagen no sale del navegador
                setStep("verifying");
                await api("verify");
                setStep("sign");
              }}
            />
          </label>
          {step === "verifying" && <div className="mt-3 text-center text-sm font-semibold text-laguna">{t.verifying}</div>}
        </div>
      )}

      {step === "sign" && (
        <div className={card}>
          <div className="rounded-lg bg-laguna-50 px-3 py-2 text-sm font-semibold text-laguna">{t.verified}</div>
          <h2 className="mt-4 font-serif text-xl">{t.termsTitle}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-tinta">
            <li>{t.termCheckin(props.checkInTime)}</li>
            <li>{props.petPolicy}</li>
            <li>{t.noSmoking}</li>
            <li>{t.charges}</li>
          </ul>
          <button
            className={primary}
            onClick={async () => {
              await api("sign");
              if (props.needsGuarantee && !guarantee) setStep("guarantee");
              else await finish();
            }}
          >
            {t.sign}
          </button>
        </div>
      )}

      {step === "guarantee" && (
        <div className={card}>
          <h2 className="font-serif text-xl">{t.gTitle}</h2>
<p className="mt-2 text-sm text-tinta">{t.gBody(props.guaranteeUsd)}</p>
          {guarantee ? (
            <button className={primary} onClick={finish}>
              {t.gDone}
            </button>
          ) : (
            <button
              className={primary}
              onClick={async () => {
                const d = await api("guarantee");
                if (d.url) window.open(d.url, "_blank");
                else if (d.status === "already_authorized") setGuarantee(true);
                else setErr(d.error);
              }}
            >
              {t.gCta}
            </button>
          )}
          {err && <div className="mt-2 text-sm text-coral">{err}</div>}
        </div>
      )}

      {step === "done" && (
        <div className={`${card} text-center`}>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-laguna text-2xl text-white">✓</div>
          <h2 className="mt-3 font-serif text-2xl">{t.doneTitle}</h2>
          <div className="mt-3 font-serif text-5xl text-laguna">{room}</div>
          <p className="mt-2 text-sm text-tinta">{t.doneBody(props.checkInTime)}</p>
        </div>
      )}

      {step === "desk" && (
        <div className={`${card} text-center`}>
          <h2 className="font-serif text-xl">{t.deskTitle}</h2>
          <p className="mt-2 text-sm text-tinta">{t.deskBody(props.checkInTime)}</p>
        </div>
      )}
    </div>
  );
}
