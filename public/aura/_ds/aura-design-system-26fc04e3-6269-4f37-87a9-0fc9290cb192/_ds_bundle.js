/* @ds-bundle: {"format":4,"namespace":"AuraDesignSystem_26fc04","components":[{"name":"Button","sourcePath":"components/actions/Button.jsx"},{"name":"BookingForm","sourcePath":"components/booking/BookingForm.jsx"},{"name":"ConfirmationEmail","sourcePath":"components/email/ConfirmationEmail.jsx"},{"name":"BookingBar","sourcePath":"components/hotel/BookingBar.jsx"},{"name":"RoomCard","sourcePath":"components/hotel/RoomCard.jsx"},{"name":"NiaAvatar","sourcePath":"components/nia/NiaAvatar.jsx"},{"name":"NiaBubble","sourcePath":"components/nia/NiaAvatar.jsx"},{"name":"NiaQuickReply","sourcePath":"components/nia/NiaAvatar.jsx"}],"sourceHashes":{"components/actions/Button.jsx":"c416a628aadd","components/booking/BookingForm.jsx":"fb41b5646849","components/email/ConfirmationEmail.jsx":"6fcb11cb03c9","components/hotel/BookingBar.jsx":"a8777d1cda97","components/hotel/RoomCard.jsx":"3bf2c1fdf3d9","components/nia/NiaAvatar.jsx":"39b4884ba8de","ui_kits/aura-site/Site.jsx":"860ce3bb6111"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.AuraDesignSystem_26fc04 = window.AuraDesignSystem_26fc04 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/actions/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Button({
  variant = "primary",
  size = "md",
  children,
  style,
  ...rest
}) {
  const base = {
    fontFamily: "var(--font-ui)",
    textTransform: "uppercase",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none"
  };
  const sm = size === "sm";
  const v = {
    primary: {
      background: "var(--aura-carbon)",
      color: "var(--aura-marfil)",
      border: "1px solid var(--aura-carbon)",
      padding: sm ? "10px 18px" : "14px 26px",
      fontSize: sm ? 12 : 13,
      letterSpacing: sm ? ".1em" : ".12em",
      fontWeight: 600
    },
    outline: {
      background: "transparent",
      color: "var(--aura-carbon)",
      border: "1px solid var(--aura-carbon)",
      padding: sm ? "9px 18px" : "13px 26px",
      fontSize: sm ? 12 : 13,
      letterSpacing: sm ? ".1em" : ".12em",
      fontWeight: 600
    },
    link: {
      background: "none",
      color: "var(--aura-carbon)",
      border: 0,
      borderBottom: "1px solid var(--aura-terracota)",
      padding: "0 0 3px",
      fontSize: 12,
      letterSpacing: ".12em",
      fontWeight: 700
    },
    accent: {
      background: "var(--aura-terracota)",
      color: "var(--aura-cal)",
      border: "1px solid var(--aura-terracota)",
      padding: sm ? "9px 16px" : "12px 22px",
      fontSize: 13,
      fontWeight: 600,
      borderRadius: "var(--radius-option)",
      textTransform: "none",
      letterSpacing: 0
    }
  }[variant];
  return /*#__PURE__*/React.createElement("button", _extends({
    style: {
      ...base,
      ...v,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/Button.jsx", error: String((e && e.message) || e) }); }

// components/booking/BookingForm.jsx
try { (() => {
const lbl = {
  fontSize: 10,
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: "var(--aura-muted)",
  fontWeight: 600
};
const inp = {
  width: "100%",
  marginTop: 6,
  padding: "12px 14px",
  border: "1px solid var(--aura-line)",
  background: "#fff",
  fontFamily: "var(--font-ui)",
  fontSize: 15,
  color: "var(--aura-carbon)",
  borderRadius: 0,
  boxSizing: "border-box"
};
function Field({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: lbl
  }, label), children);
}
function BookingForm({
  title = "Tu reserva",
  room = "Suite Vista al Mar",
  summary = "14–17 nov · 3 noches · 2 huéspedes",
  total = "$1,860",
  deposit = "$372",
  onSubmit
}) {
  return /*#__PURE__*/React.createElement("form", {
    onSubmit: function (e) {
      e.preventDefault();
      onSubmit && onSubmit();
    },
    style: {
      background: "var(--aura-cal)",
      border: "1px solid var(--aura-line)",
      padding: 32,
      fontFamily: "var(--font-ui)",
      color: "var(--aura-carbon)",
      display: "grid",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      letterSpacing: ".18em",
      fontWeight: 700,
      color: "var(--aura-terracota)",
      textTransform: "uppercase"
    }
  }, "Paso 2 de 3"), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-editorial)",
      fontWeight: 500,
      fontSize: 36,
      lineHeight: 1.05,
      margin: "8px 0 0"
    }
  }, title)), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid var(--aura-line)",
      borderBottom: "1px solid var(--aura-line)",
      padding: "14px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-editorial)",
      fontSize: 24,
      fontWeight: 600
    }
  }, room), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--aura-muted)"
    }
  }, summary)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Nombre"
  }, /*#__PURE__*/React.createElement("input", {
    style: inp,
    defaultValue: "Camila"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Apellido"
  }, /*#__PURE__*/React.createElement("input", {
    style: inp,
    defaultValue: "Reyes"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "Correo"
  }, /*#__PURE__*/React.createElement("input", {
    style: inp,
    type: "email",
    defaultValue: "camila@correo.com"
  })), /*#__PURE__*/React.createElement(Field, {
    label: "WhatsApp"
  }, /*#__PURE__*/React.createElement("input", {
    style: inp,
    defaultValue: "+00 000 000 000"
  }))), /*#__PURE__*/React.createElement(Field, {
    label: "Peticiones especiales"
  }, /*#__PURE__*/React.createElement("textarea", {
    style: {
      ...inp,
      minHeight: 72,
      resize: "vertical"
    },
    placeholder: "Celebraci\xF3n, alergias, llegada tard\xEDa\u2026"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: 8,
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--aura-ink-3)"
    }
  }, "Total con impuestos"), /*#__PURE__*/React.createElement("b", null, total)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      color: "var(--aura-bruma)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "Dep\xF3sito hoy \xB7 reembolsable"), /*#__PURE__*/React.createElement("span", null, deposit))), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    type: "submit"
  }, "Pagar dep\xF3sito"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--aura-muted)",
      textAlign: "center"
    }
  }, "Cancelaci\xF3n gratuita hasta 7 d\xEDas antes de la llegada."));
}
Object.assign(__ds_scope, { BookingForm });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/booking/BookingForm.jsx", error: String((e && e.message) || e) }); }

// components/email/ConfirmationEmail.jsx
try { (() => {
const L = {
  fontSize: 10,
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: "var(--aura-muted)"
};
const Row = ({
  a,
  b,
  bold
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    display: "flex",
    justifyContent: "space-between",
    fontWeight: bold ? 700 : 400,
    fontSize: bold ? 16 : 14
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    color: bold ? "inherit" : "var(--aura-ink-3)"
  }
}, a), /*#__PURE__*/React.createElement("span", null, b));
function ConfirmationEmail({
  guest = "Camila",
  code = "AUR-48213",
  room = "Suite Vista al Mar",
  arrival = "14 nov",
  departure = "17 nov",
  guests = "2 adultos · 3 noches",
  experience = "Navegación al atardecer",
  experienceMeta = "Sáb 15 nov · 16:30 · 2 personas",
  total = "$2,140",
  deposit = "$372",
  balance = "$1,768"
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--aura-cal)",
      fontFamily: "var(--font-ui)",
      color: "var(--aura-carbon)",
      maxWidth: 560
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--aura-carbon)",
      color: "var(--aura-marfil)",
      textAlign: "center",
      padding: "32px 24px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-editorial)",
      fontWeight: 500,
      fontSize: 44,
      letterSpacing: ".03em",
      lineHeight: 1
    }
  }, "Au", /*#__PURE__*/React.createElement("em", {
    style: {
      fontWeight: 400
    }
  }, "ra")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      letterSpacing: ".34em",
      textTransform: "uppercase",
      color: "var(--aura-melocoton)",
      marginTop: 10
    }
  }, "Hotel Boutique & Casa de Mar")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 160,
      background: "linear-gradient(120deg,#A9BDB2,#C9B58F 55%,#B8623F)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "36px 36px 8px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      letterSpacing: ".2em",
      textTransform: "uppercase",
      color: "var(--aura-terracota)",
      fontWeight: 700
    }
  }, "Reserva confirmada"), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-editorial)",
      fontWeight: 500,
      fontSize: 40,
      lineHeight: 1.08,
      margin: "12px 0 0"
    }
  }, "Te esperamos, ", /*#__PURE__*/React.createElement("em", null, guest, ".")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-block",
      marginTop: 18,
      border: "1px solid var(--aura-line)",
      padding: "8px 18px",
      fontSize: 12,
      letterSpacing: ".16em",
      textTransform: "uppercase",
      color: "var(--aura-ink-3)"
    }
  }, "Reserva ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--aura-carbon)"
    }
  }, code))), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: "24px 36px 0",
      borderTop: "1px solid var(--aura-line)",
      borderBottom: "1px solid var(--aura-line)",
      display: "grid",
      gridTemplateColumns: "1fr 1fr"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px 0",
      borderRight: "1px solid var(--aura-line)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: L
  }, "Llegada"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-editorial)",
      fontSize: 26,
      fontWeight: 500
    }
  }, arrival)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px 0 16px 24px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: L
  }, "Salida"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-editorial)",
      fontSize: 26,
      fontWeight: 500
    }
  }, departure)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 0",
      borderTop: "1px solid var(--aura-line)",
      borderRight: "1px solid var(--aura-line)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: L
  }, "Habitaci\xF3n"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 500
    }
  }, room)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 0 14px 24px",
      borderTop: "1px solid var(--aura-line)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: L
  }, "Hu\xE9spedes"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 500
    }
  }, guests))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "24px 36px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...L,
      fontWeight: 700
    }
  }, "Tu experiencia"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 14,
      marginTop: 10,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 56,
      height: 56,
      background: "linear-gradient(150deg,#D9A27F,#B8623F)",
      flex: "none"
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-editorial)",
      fontSize: 22,
      fontWeight: 600
    }
  }, experience), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--aura-muted)"
    }
  }, experienceMeta)))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "24px 36px 0",
      display: "grid",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...L,
      fontWeight: 700
    }
  }, "Resumen"), /*#__PURE__*/React.createElement(Row, {
    a: "Total con impuestos",
    b: total,
    bold: true
  }), /*#__PURE__*/React.createElement(Row, {
    a: "Dep\xF3sito pagado",
    b: "− " + deposit
  }), /*#__PURE__*/React.createElement(Row, {
    a: "Saldo a pagar al llegar",
    b: balance
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "28px 36px 0",
      display: "grid",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--aura-carbon)",
      color: "var(--aura-marfil)",
      textAlign: "center",
      padding: 16,
      fontSize: 12,
      letterSpacing: ".14em",
      textTransform: "uppercase",
      fontWeight: 600
    }
  }, "Ver o modificar mi reserva"), /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1px solid var(--aura-carbon)",
      textAlign: "center",
      padding: 15,
      fontSize: 12,
      letterSpacing: ".14em",
      textTransform: "uppercase",
      fontWeight: 600
    }
  }, "A\xF1adir al calendario")), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: "28px 36px 0",
      background: "var(--aura-marfil)",
      border: "1px solid var(--aura-line-nia)",
      padding: 20,
      display: "flex",
      gap: 14,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: 44,
      height: 44,
      flex: "none",
      borderRadius: "50%",
      background: "var(--nia-avatar-bg)",
      border: "1px solid var(--nia-avatar-ring)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--aura-marfil)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-nia)",
      fontSize: 26,
      lineHeight: 1
    }
  }, "N"), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      width: 7,
      height: 7,
      borderRadius: "50%",
      right: 8,
      top: 8,
      background: "var(--nia-dot)"
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14
    }
  }, "\xBFAlgo antes de tu llegada? Escr\xEDbeme y lo coordino."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      letterSpacing: ".1em",
      textTransform: "uppercase",
      fontWeight: 700,
      color: "var(--aura-terracota-dark)",
      marginTop: 8
    }
  }, "Escribir a N\xEDa por WhatsApp \u2192"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 32,
      background: "var(--aura-carbon-deep)",
      color: "var(--aura-on-dark-muted)",
      textAlign: "center",
      padding: "24px",
      fontSize: 12,
      lineHeight: 1.7
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-editorial)",
      fontSize: 24,
      color: "var(--aura-marfil)"
    }
  }, "Au", /*#__PURE__*/React.createElement("em", null, "ra")), "Calle del Faro 12, Costa Norte, Caribe"));
}
Object.assign(__ds_scope, { ConfirmationEmail });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/email/ConfirmationEmail.jsx", error: String((e && e.message) || e) }); }

// components/hotel/BookingBar.jsx
try { (() => {
function BookingBar({
  fields = [["Llegada", "14 nov"], ["Salida", "17 nov"], ["Huéspedes", "2 adultos"], ["Habitación", "Cualquiera"]],
  cta = "Ver disponibilidad"
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "stretch",
      background: "var(--aura-cal)",
      color: "var(--aura-carbon)",
      fontFamily: "var(--font-ui)"
    }
  }, fields.map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      padding: "16px 24px",
      borderRight: "1px solid var(--aura-line-soft)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      letterSpacing: ".16em",
      textTransform: "uppercase",
      color: "var(--aura-muted)"
    }
  }, f[0]), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 500,
      marginTop: 2
    }
  }, f[1]))), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    style: {
      padding: "0 36px"
    }
  }, cta));
}
Object.assign(__ds_scope, { BookingBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/hotel/BookingBar.jsx", error: String((e && e.message) || e) }); }

// components/hotel/RoomCard.jsx
try { (() => {
function RoomCard({
  name,
  size,
  description,
  amenities,
  occupancy,
  gradient = "linear-gradient(150deg,#E6D8C0,#B59B76)",
  imageLabel = "IMG"
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-ui)",
      color: "var(--aura-carbon)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      aspectRatio: "4/5",
      background: gradient,
      display: "flex",
      alignItems: "flex-end",
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      letterSpacing: ".14em",
      textTransform: "uppercase",
      color: "var(--aura-cal)",
      fontWeight: 600
    }
  }, imageLabel)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-editorial)",
      fontSize: 32,
      fontWeight: 500
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--aura-muted)"
    }
  }, size)), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--aura-ink-3)",
      fontSize: 15,
      margin: "6px 0 0"
    }
  }, description), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      letterSpacing: ".1em",
      textTransform: "uppercase",
      color: "var(--aura-bruma)",
      marginTop: 14,
      fontWeight: 600
    }
  }, amenities), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 18,
      paddingTop: 16,
      borderTop: "1px solid var(--aura-line)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--aura-muted)"
    }
  }, occupancy), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "link",
    size: "sm"
  }, "Ver disponibilidad")));
}
Object.assign(__ds_scope, { RoomCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/hotel/RoomCard.jsx", error: String((e && e.message) || e) }); }

// components/nia/NiaAvatar.jsx
try { (() => {
function NiaAvatar({
  size = 48,
  dot = true,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: size,
      height: size,
      flex: "none",
      borderRadius: "50%",
      background: "var(--nia-avatar-bg)",
      border: "1px solid var(--nia-avatar-ring)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--aura-marfil)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-nia)",
      fontWeight: 600,
      fontSize: size * .6,
      lineHeight: 1
    }
  }, "N"), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      width: size * .17,
      height: size * .17,
      borderRadius: "50%",
      right: size * .19,
      top: size * .19,
      background: "var(--nia-dot)",
      boxShadow: "0 0 8px rgba(217,162,127,.8)"
    }
  }));
}
function NiaBubble({
  from = "nia",
  children,
  style
}) {
  const u = from === "user";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "84%",
      justifySelf: u ? "end" : "start",
      background: u ? "var(--aura-carbon)" : "var(--aura-cal)",
      color: u ? "var(--aura-marfil)" : "var(--aura-carbon)",
      border: u ? 0 : "1px solid var(--aura-line-nia)",
      boxShadow: u ? "none" : "var(--shadow-bubble)",
      borderRadius: u ? "var(--radius-bubble-user)" : "var(--radius-bubble)",
      padding: "12px 16px",
      fontSize: 15,
      fontFamily: "var(--font-ui)",
      ...style
    }
  }, children);
}
function NiaQuickReply({
  children
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-block",
      border: "1px solid var(--aura-terracota)",
      color: "var(--aura-terracota-dark)",
      padding: "7px 14px",
      borderRadius: 999,
      fontSize: 13,
      fontWeight: 500,
      fontFamily: "var(--font-ui)"
    }
  }, children);
}
Object.assign(__ds_scope, { NiaAvatar, NiaBubble, NiaQuickReply });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/nia/NiaAvatar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/aura-site/Site.jsx
try { (() => {
const DS = window.AuraDesignSystem_26fc04;
const {
  Button,
  BookingBar,
  RoomCard,
  NiaAvatar,
  NiaBubble,
  NiaQuickReply
} = DS;
const g = (a, b) => `linear-gradient(160deg,${a},${b})`;
const serif = {
  fontFamily: "var(--font-editorial)"
};
const eyebrow = c => ({
  fontSize: 12,
  letterSpacing: ".2em",
  textTransform: "uppercase",
  color: c
});
const Img = ({
  bg,
  label,
  ratio = "3/4",
  style
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    aspectRatio: ratio,
    background: bg,
    display: "flex",
    alignItems: "flex-end",
    padding: 14,
    ...style
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 11,
    letterSpacing: ".14em",
    textTransform: "uppercase",
    color: "var(--aura-cal)",
    fontWeight: 600
  }
}, label));
const Logo = ({
  size = 32
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    ...serif,
    fontWeight: 500,
    fontSize: size,
    letterSpacing: ".03em",
    lineHeight: 1
  }
}, "Au", /*#__PURE__*/React.createElement("em", {
  style: {
    fontWeight: 400
  }
}, "ra"));
const ROOMS = [{
  name: "Habitación Deluxe",
  size: "38 m²",
  description: "Muros encalados, cama king y terraza privada con sombra.",
  amenities: "Terraza · Ducha lluvia · Espresso",
  occupancy: "Hasta 2 huéspedes",
  gradient: g("#E6D8C0", "#B59B76"),
  imageLabel: "IMG · Deluxe"
}, {
  name: "Habitación Vista al Mar",
  size: "46 m²",
  description: "Balcón orientado al oeste sobre la bahía, hecho para atardeceres.",
  amenities: "Vista al mar · Tina · Balcón",
  occupancy: "Hasta 3 huéspedes",
  gradient: g("#A9BDB2", "#4E6A62"),
  imageLabel: "IMG · Vista al mar"
}, {
  name: "Suite Vista al Mar",
  size: "78 m²",
  description: "Sala independiente, terraza envolvente y piscina privada.",
  amenities: "Piscina privada · Sala · Mayordomo",
  occupancy: "Hasta 4 huéspedes",
  gradient: g("#D9A27F", "#8A4A2E"),
  imageLabel: "IMG · Suite"
}];
const EXPS = [["Navegación al atardecer", "IMG · Velero", "Dos horas en el agua, con champaña.", g("#D9A27F", "#B8623F")], ["Cena privada", "IMG · Cena privada", "Un menú degustación en la arena, solo para ti.", g("#C98E6B", "#6B3F2B")], ["Spa y bienestar", "IMG · Spa", "Tratamientos al aire libre y yoga al amanecer.", g("#9DB0A6", "#3F5448")], ["Excursión a la isla", "IMG · Isla", "Calas escondidas y guías locales en bote.", g("#A9BDB2", "#5E7468")]];
const CAPS = ["Consultar disponibilidad en tiempo real", "Reservar una habitación o una mesa", "Sumar experiencias a tu estadía", "Hablar con una persona de recepción"];
function Nav({
  onNia
}) {
  const l = {
    fontSize: 12,
    letterSpacing: ".16em",
    textTransform: "uppercase",
    fontWeight: 500,
    cursor: "pointer"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 2,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "28px 56px",
      color: "var(--aura-cal)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 28
    }
  }, ["Habitaciones", "Experiencias", "Gastronomía", "Bienestar"].map(x => /*#__PURE__*/React.createElement("span", {
    key: x,
    style: l
  }, x))), /*#__PURE__*/React.createElement(Logo, null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 24,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: l
  }, "Mi reserva"), /*#__PURE__*/React.createElement("span", {
    onClick: onNia,
    style: {
      ...l,
      border: "1px solid var(--aura-cal)",
      padding: "11px 20px"
    }
  }, "Reservar")));
}
function Hero({
  onNia
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 700,
      background: "linear-gradient(180deg,rgba(22,32,43,.35) 0%,rgba(22,32,43,.05) 35%,rgba(22,32,43,.55) 100%),linear-gradient(115deg,#8FA39A 0%,#C9B58F 45%,#B8623F 100%)",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end",
      padding: "0 56px 56px",
      color: "var(--aura-cal)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 100,
      right: 56,
      fontSize: 11,
      letterSpacing: ".14em",
      textTransform: "uppercase",
      opacity: .8
    }
  }, "IMG \xB7 Hero \u2014 fachada al atardecer"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      letterSpacing: ".24em",
      textTransform: "uppercase"
    }
  }, "Caribe \xB7 24 habitaciones y suites"), /*#__PURE__*/React.createElement("h1", {
    style: {
      ...serif,
      fontWeight: 400,
      fontSize: 96,
      lineHeight: .98,
      margin: "16px 0 0",
      maxWidth: 820
    }
  }, "Una casa serena ", /*#__PURE__*/React.createElement("em", null, "frente al mar.")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 44,
      maxWidth: 960,
      cursor: "pointer"
    },
    onClick: onNia
  }, /*#__PURE__*/React.createElement(BookingBar, null)));
}
function Intro() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "112px 56px",
      display: "grid",
      gridTemplateColumns: "1fr 1.1fr",
      gap: 80,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: eyebrow("var(--aura-terracota)")
  }, "La casa"), /*#__PURE__*/React.createElement("p", {
    style: {
      ...serif,
      fontSize: 42,
      lineHeight: 1.15,
      margin: "20px 0 0"
    }
  }, "Veinticuatro habitaciones, una larga terraza y una cocina que sigue la pesca del d\xEDa."), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--aura-ink-3)",
      margin: "24px 0 0",
      maxWidth: 440
    }
  }, "Aura est\xE1 construida en piedra caliza local y madera clara, abierta a los vientos alisios. Lo bastante peque\xF1a para saber tu nombre.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.2fr 1fr",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Img, {
    bg: g("#D8C7A4", "#A88E68"),
    label: "IMG \xB7 Terraza"
  }), /*#__PURE__*/React.createElement(Img, {
    bg: g("#9DB0A6", "#5E7468"),
    label: "IMG \xB7 Patio",
    style: {
      marginTop: 56
    }
  })));
}
function Rooms({
  onNia
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 56px 112px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "end"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      ...serif,
      fontWeight: 500,
      fontSize: 56,
      margin: 0,
      lineHeight: 1
    }
  }, "Habitaciones"), /*#__PURE__*/React.createElement(Button, {
    variant: "link"
  }, "Ver todas")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,1fr)",
      gap: 24,
      marginTop: 36
    }
  }, ROOMS.map(r => /*#__PURE__*/React.createElement("div", {
    key: r.name,
    onClick: onNia,
    style: {
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(RoomCard, r)))));
}
function Experiences() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--aura-carbon)",
      color: "var(--aura-marfil)",
      padding: "104px 56px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: eyebrow("var(--aura-melocoton)")
  }, "Experiencias"), /*#__PURE__*/React.createElement("h2", {
    style: {
      ...serif,
      fontWeight: 400,
      fontSize: 56,
      lineHeight: 1.02,
      margin: "14px 0 0",
      maxWidth: 640
    }
  }, "D\xEDas pensados ", /*#__PURE__*/React.createElement("em", null, "para ti.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: 20,
      marginTop: 48
    }
  }, EXPS.map(e => /*#__PURE__*/React.createElement("div", {
    key: e[0]
  }, /*#__PURE__*/React.createElement(Img, {
    bg: e[3],
    label: e[1]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      ...serif,
      fontSize: 28,
      marginTop: 16
    }
  }, e[0]), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--aura-on-dark-muted)",
      fontSize: 14,
      marginTop: 4
    }
  }, e[2])))));
}
function Split() {
  const lk = (c, b) => ({
    display: "inline-block",
    marginTop: 24,
    fontSize: 12,
    letterSpacing: ".12em",
    textTransform: "uppercase",
    fontWeight: 700,
    borderBottom: "1px solid " + b,
    paddingBottom: 3,
    color: c
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "96px 56px",
      background: "#EADFC9"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: eyebrow("var(--aura-terracota)")
  }, "Gastronom\xEDa"), /*#__PURE__*/React.createElement("h3", {
    style: {
      ...serif,
      fontWeight: 500,
      fontSize: 46,
      lineHeight: 1.05,
      margin: "14px 0 0"
    }
  }, "Sal, humo y c\xEDtricos en Brasa."), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--aura-ink-3)",
      margin: "16px 0 28px",
      maxWidth: 400
    }
  }, "Cocina a fuego abierto en la terraza. Desayuno hasta el mediod\xEDa, cena junto al agua."), /*#__PURE__*/React.createElement(Img, {
    ratio: "16/10",
    bg: g("#C98E6B", "#8A4A2E"),
    label: "IMG \xB7 Mesa en terraza"
  }), /*#__PURE__*/React.createElement("span", {
    style: lk("var(--aura-carbon)", "var(--aura-carbon)")
  }, "Reservar mesa")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "96px 56px",
      background: "var(--aura-bruma)",
      color: "var(--aura-cal)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: eyebrow("#E8CDB4")
  }, "Bienestar"), /*#__PURE__*/React.createElement("h3", {
    style: {
      ...serif,
      fontWeight: 500,
      fontSize: 46,
      lineHeight: 1.05,
      margin: "14px 0 0"
    }
  }, "Rituales lentos, ", /*#__PURE__*/React.createElement("em", null, "aire de mar.")), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "#E4EAE5",
      margin: "16px 0 28px",
      maxWidth: 400
    }
  }, "Salas de tratamiento al aire libre, yoga al amanecer y piscina fr\xEDa frente a la bah\xEDa."), /*#__PURE__*/React.createElement(Img, {
    ratio: "16/10",
    bg: g("#A9BDB2", "#3F5448"),
    label: "IMG \xB7 Sala de spa"
  }), /*#__PURE__*/React.createElement("span", {
    style: lk("var(--aura-cal)", "var(--aura-cal)")
  }, "Reservar un ritual")));
}
function NiaBand({
  onNia
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      margin: "0 56px 96px",
      background: "var(--aura-carbon)",
      color: "var(--aura-marfil)",
      display: "grid",
      gridTemplateColumns: "1.1fr 1fr",
      gap: 56,
      padding: 56,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(NiaAvatar, {
    size: 48
  }), /*#__PURE__*/React.createElement("div", {
    style: eyebrow("#E0A27F")
  }, "Conoce a N\xEDa \xB7 Concierge digital")), /*#__PURE__*/React.createElement("h3", {
    style: {
      ...serif,
      fontWeight: 400,
      fontSize: 46,
      lineHeight: 1.08,
      margin: "20px 0 0"
    }
  }, "Planifica, reserva y pregunta, ", /*#__PURE__*/React.createElement("em", null, "en una sola conversaci\xF3n.")), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "#C9CFD3",
      margin: "16px 0 0",
      maxWidth: 440
    }
  }, "N\xEDa conoce la casa, consulta disponibilidad real y puede reservar o gestionar el pago. Contin\xFAa en la web, WhatsApp o Instagram: ella recuerda.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: 10
    }
  }, CAPS.map(c => /*#__PURE__*/React.createElement("div", {
    key: c,
    onClick: onNia,
    style: {
      border: "1px solid #2F3C4C",
      padding: "16px 20px",
      display: "flex",
      justifyContent: "space-between",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("span", null, c), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--aura-melocoton)"
    }
  }, "\u2192")))));
}
function Footer() {
  const h = {
    color: "var(--aura-marfil)",
    fontSize: 11,
    letterSpacing: ".16em",
    textTransform: "uppercase"
  };
  const col = (t, a) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: 8,
      alignContent: "start"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: h
  }, t), a.map(x => /*#__PURE__*/React.createElement("span", {
    key: x
  }, x)));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--aura-carbon-deep)",
      color: "var(--aura-on-dark-muted)",
      padding: 56,
      display: "grid",
      gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
      gap: 40,
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--aura-marfil)"
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    size: 34
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      maxWidth: 260
    }
  }, "Calle del Faro 12, Costa Norte, Caribe")), col("Estadía", ["Habitaciones", "Ofertas", "Tarjetas de regalo"]), col("Descubre", ["Experiencias", "Gastronomía", "Bienestar"]), col("Contacto", ["WhatsApp", "Instagram", "hello@aura.example"]), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: "1 / -1",
      borderTop: "1px solid #26323F",
      paddingTop: 20,
      display: "flex",
      justifyContent: "space-between",
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 Aura \u2014 hotel ficticio para fines de demostraci\xF3n"), /*#__PURE__*/React.createElement("span", null, "N\xEDa \xB7 Con tecnolog\xEDa de Flowy AI")));
}
function Launcher({
  open,
  onToggle
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: 32,
      top: 130,
      display: open ? "none" : "flex",
      alignItems: "center",
      gap: 12,
      zIndex: 5,
      cursor: "pointer"
    },
    onClick: onToggle
  }, /*#__PURE__*/React.createElement(NiaBubble, {
    style: {
      maxWidth: "none",
      fontSize: 14,
      padding: "12px 18px",
      borderRadius: "0 14px 14px 14px"
    }
  }, "Hola, soy N\xEDa. \xBFPlaneas una estad\xEDa?"), /*#__PURE__*/React.createElement(NiaAvatar, {
    size: 64,
    style: {
      boxShadow: "var(--shadow-launcher)"
    }
  }));
}
function Widget({
  onClose
}) {
  const [step, setStep] = React.useState(0);
  const [typing, setTyping] = React.useState(false);
  const [msgs, setMsgs] = React.useState([]);
  const box = React.useRef();
  React.useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [msgs, typing]);
  const say = (user, next) => {
    setMsgs(m => [...m, {
      u: 1,
      t: user
    }]);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMsgs(m => [...m, next]);
      setStep(s => s + 1);
    }, 900);
  };
  const flow = [{
    q: ["Reservar habitación", "Ver habitaciones", "Preguntar sobre el hotel", "Mi reserva"],
    f: q => say(q, {
      t: "Por supuesto. ¿Qué fechas te gustaría?"
    })
  }, {
    q: ["Del 14 al 17 de noviembre, somos dos."],
    f: q => say(q, {
      card: 1
    })
  }, {
    q: ["Reservar", "Comparar"],
    f: q => say(q, {
      t: "Listo. Te llevo a completar la reserva, Camila."
    })
  }];
  const cur = flow[step];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: 32,
      top: 100,
      width: 400,
      zIndex: 6,
      background: "var(--aura-cal)",
      borderRadius: "var(--radius-widget)",
      boxShadow: "var(--shadow-widget)",
      overflow: "hidden",
      border: "1px solid var(--aura-line)",
      color: "var(--aura-carbon)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--aura-carbon)",
      color: "var(--aura-marfil)",
      padding: "16px 20px",
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(NiaAvatar, {
    size: 40
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600
    }
  }, "N\xEDa"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--aura-on-dark-muted)"
    }
  }, "Aura \xB7 Concierge digital")), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: "var(--aura-online)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    onClick: onClose,
    style: {
      cursor: "pointer",
      fontSize: 20,
      marginLeft: 8
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    ref: box,
    style: {
      padding: 20,
      display: "grid",
      gap: 14,
      background: "var(--aura-marfil)",
      height: 420,
      overflowY: "auto",
      alignContent: "start"
    }
  }, /*#__PURE__*/React.createElement(NiaBubble, null, "Hola, soy N\xEDa. \xBFC\xF3mo puedo ayudarte a planificar tu estad\xEDa?"), msgs.map((m, i) => m.u ? /*#__PURE__*/React.createElement(NiaBubble, {
    key: i,
    from: "user"
  }, m.t) : m.card ? /*#__PURE__*/React.createElement(NiaBubble, {
    key: i,
    style: {
      maxWidth: "92%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 12
    }
  }, "Hay tres opciones disponibles. Te sugiero la Suite Vista al Mar."), /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1px solid var(--aura-line)",
      background: "#fff"
    }
  }, /*#__PURE__*/React.createElement(Img, {
    ratio: "auto",
    bg: "linear-gradient(120deg,#A9BDB2,#C9B58F,#B8623F)",
    label: "IMG \xB7 Suite",
    style: {
      height: 84,
      padding: "8px 10px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 14px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...serif,
      fontSize: 22,
      fontWeight: 600
    }
  }, "Suite Vista al Mar"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--aura-muted)"
    }
  }, "14\u201317 nov \xB7 3 noches \xB7 2 hu\xE9spedes"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--aura-muted)"
    }
  }, "Total con impuestos"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: 18
    }
  }, "$1,860"))))) : /*#__PURE__*/React.createElement(NiaBubble, {
    key: i
  }, m.t)), typing && /*#__PURE__*/React.createElement(NiaBubble, {
    style: {
      display: "flex",
      gap: 4,
      width: 56
    }
  }, [0, 1, 2].map(d => /*#__PURE__*/React.createElement("span", {
    key: d,
    style: {
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: "var(--aura-terracota)",
      animation: `nia-dot 1.2s ${d * .2}s infinite`
    }
  }))), cur && !typing && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8
    }
  }, cur.q.map(q => /*#__PURE__*/React.createElement("span", {
    key: q,
    onClick: () => cur.f(q),
    style: {
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement(NiaQuickReply, null, q))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 16px",
      borderTop: "1px solid var(--aura-line)",
      display: "flex",
      gap: 10,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      border: "1px solid var(--aura-line)",
      borderRadius: 999,
      padding: "10px 16px",
      color: "#8A887C",
      fontSize: 14,
      background: "#fff"
    }
  }, "Escribe a N\xEDa\u2026"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 38,
      height: 38,
      borderRadius: "50%",
      background: "var(--aura-terracota)",
      color: "var(--aura-cal)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, "\u2191")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      fontSize: 11,
      color: "#8A887C",
      padding: "0 0 10px",
      letterSpacing: ".04em"
    }
  }, "Con tecnolog\xEDa de Flowy AI"));
}
function App() {
  const [open, setOpen] = React.useState(false);
  const k = React.useRef(0);
  const o = () => setOpen(true);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1200,
      margin: "0 auto",
      background: "var(--aura-marfil)",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement(Nav, {
    onNia: o
  }), /*#__PURE__*/React.createElement(Hero, {
    onNia: o
  }), /*#__PURE__*/React.createElement(Intro, null), /*#__PURE__*/React.createElement(Rooms, {
    onNia: o
  }), /*#__PURE__*/React.createElement(Experiences, null), /*#__PURE__*/React.createElement(Split, null), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "104px 56px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: eyebrow("var(--aura-terracota)")
  }, "Destino"), /*#__PURE__*/React.createElement("p", {
    style: {
      ...serif,
      fontSize: 50,
      lineHeight: 1.1,
      maxWidth: 820,
      margin: "18px auto 0"
    }
  }, "A veinte minutos del aeropuerto. A un mundo de todo lo dem\xE1s.")), /*#__PURE__*/React.createElement(NiaBand, {
    onNia: o
  }), /*#__PURE__*/React.createElement(Footer, null), /*#__PURE__*/React.createElement(Launcher, {
    open: open,
    onToggle: o
  }), open && /*#__PURE__*/React.createElement(Widget, {
    key: k.current,
    onClose: () => setOpen(false)
  }));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/aura-site/Site.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.BookingForm = __ds_scope.BookingForm;

__ds_ns.ConfirmationEmail = __ds_scope.ConfirmationEmail;

__ds_ns.BookingBar = __ds_scope.BookingBar;

__ds_ns.RoomCard = __ds_scope.RoomCard;

__ds_ns.NiaAvatar = __ds_scope.NiaAvatar;

__ds_ns.NiaBubble = __ds_scope.NiaBubble;

__ds_ns.NiaQuickReply = __ds_scope.NiaQuickReply;

})();
