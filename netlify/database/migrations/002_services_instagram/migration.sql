-- Correos de servicio: id del ServiceBooking (para reenviar el mismo correo desde el panel).
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "refId" TEXT;

-- Webhooks de Instagram ya procesados (Meta reintenta: así no se responde dos veces).
CREATE TABLE IF NOT EXISTS "WebhookEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);
