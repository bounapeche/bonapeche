/* =========================
   EXPORTATION (module séparé : utilise les fonctions de app.js)
========================= */

// Libellés selon le mode de transport
const MODES = {
  maritime: {
    label: "Maritime",
    cargo: "Navire / conteneur",
    loading: "Port de chargement",
    dest: "Port de destination",
    unit: "N° conteneur",
    carrier: "Transporteur (compagnie maritime)"
  },
  routier: {
    label: "Routier",
    cargo: "Camions",
    loading: "Lieu de chargement",
    dest: "Lieu de destination / poste frontière",
    unit: "N° camion (immatriculation)",
    carrier: "Transporteur (société de transport)"
  }
};

let exportItems = [];

const num = (v) => Number(v) || 0;
const money = (v) => num(v).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const kgf = (v) => num(v).toLocaleString("fr-FR", { maximumFractionDigits: 2 });

function sumByCurrency(list) {
  const t = {};
  list.forEach((x) => {
    t[x.currency] = (t[x.currency] || 0) + num(x.amount);
  });
  return Object.entries(t)
    .map(([c, v]) => `${money(v)} ${c}`)
    .join(" + ");
}

function renderExport() {
  $("exportItemsBody").innerHTML = exportItems
    .map(
      (x, i) =>
        `<tr>
          <td>${esc(x.name)}</td>
          <td>${x.bags}</td>
          <td>${x.weight}</td>
          <td>${x.price}</td>
          <td>${money(x.bags * x.weight * x.price)}</td>
          <td><button type="button" class="secondary exp-del-item" data-i="${i}">Supprimer</button></td>
        </tr>`
    )
    .join("");

  document.querySelectorAll(".exp-del-item").forEach(
    (b) => (b.onclick = () => { exportItems.splice(Number(b.dataset.i), 1); renderExport(); })
  );

  const cur = $("exportCurrency").value;
  const total = exportItems.reduce((s, x) => s + x.bags * x.weight * x.price, 0);
  const cartons = exportItems.reduce((s, x) => s + x.bags, 0);
  const kg = exportItems.reduce((s, x) => s + x.bags * x.weight, 0);

  $("exportTotals").textContent =
    `Total facture : ${money(total)} ${cur} — ${kgf(cartons)} cartons — ${kgf(kg)} kg`;
}

$("exportCurrency").onchange = renderExport;

function applyMode() {
  const m = MODES[$("exportMode").value] || MODES.maritime;
  $("lblLoading").textContent = m.loading;
  $("lblDest").textContent = m.dest;
  $("lblUnit").textContent = m.unit;
  $("lblCarrier").textContent = m.carrier;
}

$("exportMode").onchange = applyMode;

$("newExportBtn").onclick = () => {
  $("exportFormContainer").classList.remove("hidden");
  $("exportDate").value = today();
};

$("cancelExportBtn").onclick = () => {
  $("exportFormContainer").classList.add("hidden");
  exportItems = [];
  renderExport();
  status("exportFormStatus", "");
};

$("addExportItemBtn").onclick = () => {
  const product = findProduct("exportProduct");

  if (!product) {
    return status("exportFormStatus", "Tapez 3 lettres du nom du produit et choisissez-le dans la liste.");
  }

  const bags = num($("exportBags").value);
  const weight = num($("exportWeight").value) || num(product.default_bag_weight_kg);
  const price = num($("exportUnitPrice").value);

  if (!(bags > 0) || !(weight > 0) || !(price >= 0)) {
    return status("exportFormStatus", "Veuillez saisir les données.");
  }

  exportItems.push({ product_id: product.id, name: product.name, bags, weight, price });
  renderExport();

  $("exportProduct").value = "";
  $("exportProduct").dataset.id = "";
  $("exportBags").value = "";
  $("exportWeight").value = "";
  $("exportUnitPrice").value = "";
  status("exportFormStatus", "");
};

$("exportForm").onsubmit = async (e) => {
  e.preventDefault();

  if (!exportItems.length) {
    return status("exportFormStatus", "Ajoutez au moins un produit.");
  }

  try {
    status("exportFormStatus", "Enregistrement...");

    await api("export_manager", {
      action: "create",
      invoice_number: $("exportInvoice").value.trim(),
      export_date: $("exportDate").value || today(),
      currency: $("exportCurrency").value,
      incoterm: $("exportIncoterm").value,
      customer_name: $("exportCustomer").value.trim(),
      customer_address: $("exportCustomerAddress").value.trim(),
      destination_country: $("exportCountry").value.trim(),
      port_of_loading: $("exportPortLoading").value.trim(),
      port_of_destination: $("exportPortDest").value.trim(),
      extra: {
        producer: $("exportProducer").value.trim(),
        prod_date: $("exportProdDate").value,
        freeze_type: $("exportFreeze").value.trim(),
        credoc: $("exportCredoc").value.trim(),
        domiciliation: $("exportDomic").value.trim(),
        etat: $("exportEtat").value.trim(),
        op: $("exportOP").value.trim(),
        payment: $("exportPayment").value.trim(),
        origin: $("exportOrigin").value.trim(),
        provenance: $("exportProvenance").value.trim(),
        incoterm_place: $("exportIncoPlace").value.trim(),
        gross_weight: $("exportGross").value.trim(),
        exchange_rate: $("exportRate").value.trim()
      },
      transport_mode: $("exportMode").value,
      container_number: $("exportContainer").value.trim(),
      seal_number: $("exportSeal").value.trim(),
      shipping_company: $("exportCarrier").value.trim(),
      shipment_date: $("exportShipDate").value || null,
      notes: $("exportNotes").value.trim(),
      items: exportItems.map((x) => ({
        product_id: x.product_id,
        bags: x.bags,
        weight_per_bag_kg: x.weight,
        unit_price: x.price
      }))
    });

    status("exportFormStatus", "Enregistré.");

    exportItems = [];
    $("exportForm").reset();
    $("exportDate").value = today();
    applyMode();
    renderExport();
    $("exportFormContainer").classList.add("hidden");

    await loadExports();
    if (typeof loadInventory === "function") loadInventory();
  } catch (err) {
    status("exportFormStatus", "Erreur : " + err.message);
  }
};

/* ---------- liste ---------- */

async function loadExports() {
  try {
    status("exportsStatus", "Chargement...");

    const d = await api("export_manager", { action: "list" });
    const rows = d.exports || [];
    window.exportRows = rows;

    $("exportsTableBody").innerHTML = rows
      .map(
        (x, i) =>
          `<tr>
            <td>${esc(x.invoice_number)}</td>
            <td>${esc(x.export_date)}</td>
            <td>${esc(x.customer_name)}</td>
            <td>${esc(x.destination_country)}</td>
            <td>${esc(x.container_number)}</td>
            <td>${esc(x.seal_number)}</td>
            <td>${esc(x.currency)}</td>
            <td>${money(x.total_amount)}</td>
            <td><button type="button" class="secondary exp-pdf" data-i="${i}">PDF</button></td>
          </tr>`
      )
      .join("");

    document.querySelectorAll(".exp-pdf").forEach(
      (b) => (b.onclick = () => printExport(window.exportRows[Number(b.dataset.i)]))
    );

    status("exportsStatus", `${rows.length} exportation(s).`);
  } catch (e) {
    status("exportsStatus", "Erreur : " + e.message);
  }
}

$("refreshExportsBtn").onclick = loadExports;

$("exportExportsBtn").onclick = () => {
  const flat = (window.exportRows || []).map((x) => ({
    "N° facture": x.invoice_number,
    "Date": x.export_date,
    "Client": x.customer_name,
    "Pays de destination": x.destination_country,
    "Mode de transport": (MODES[x.transport_mode] || MODES.maritime).label,
    "Lieu/Port de chargement": x.port_of_loading,
    "Lieu/Port de destination": x.port_of_destination,
    "N° conteneur / camion": x.container_number,
    "N° de plomb": x.seal_number,
    "Transporteur": x.shipping_company,
    "Date d'expédition": x.shipment_date,
    "Incoterm": x.incoterm,
    "Producteur": (x.extra || {}).producer,
    "N° OP": (x.extra || {}).op,
    "Mode de règlement": (x.extra || {}).payment,
    "Devise": x.currency,
    "Cartons": x.items.reduce((s, i) => s + i.bags, 0),
    "Poids (kg)": x.items.reduce((s, i) => s + i.total_weight_kg, 0),
    "Total": x.total_amount,
    "Remarques": x.notes
  }));
  dl("bonapeche-exportations.csv", csv(flat), `Exportations — liste au ${today()}`);
};

document
  .querySelector('[data-window="exportWindow"]')
  .addEventListener("click", loadExports);

/* ---------- facture / packing list (PDF via impression) ---------- */

// nombre en toutes lettres (français)
const FR_UNITS = ["zéro","un","deux","trois","quatre","cinq","six","sept","huit","neuf","dix","onze","douze","treize","quatorze","quinze","seize"];
const FR_TENS = { 2: "vingt", 3: "trente", 4: "quarante", 5: "cinquante", 6: "soixante" };

function frBelow20(n) {
  return n < 17 ? FR_UNITS[n] : "dix-" + FR_UNITS[n - 10];
}

function frBelow100(n, end) {
  if (n < 20) return frBelow20(n);

  const t = Math.floor(n / 10);
  const u = n % 10;

  if (t <= 6) return FR_TENS[t] + (u === 1 ? " et un" : u ? "-" + FR_UNITS[u] : "");
  if (t === 7) return "soixante" + (u === 1 ? " et onze" : "-" + frBelow20(10 + u));
  // 80-99
  return "quatre-vingt" + (u === 0 ? (end ? "s" : "") : "-" + frBelow20(u));
}

function frBelow1000(n, end) {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const head = h === 0 ? "" : h === 1 ? "cent" : FR_UNITS[h] + " cent";

  if (!h) return frBelow100(r, end);
  if (!r) return h > 1 && end ? head + "s" : head;
  return head + " " + frBelow100(r, end);
}

function frWords(n) {
  n = Math.floor(n);
  if (n === 0) return "zéro";

  const groups = [
    [1e9, "milliard", "milliards"],
    [1e6, "million", "millions"]
  ];

  const parts = [];

  groups.forEach(([size, one, many]) => {
    const q = Math.floor(n / size);
    if (q > 0) {
      parts.push(frBelow1000(q, false) + " " + (q > 1 ? many : one));
      n -= q * size;
    }
  });

  const th = Math.floor(n / 1000);
  if (th > 0) {
    parts.push(th === 1 ? "mille" : frBelow1000(th, false) + " mille");
    n -= th * 1000;
  }

  if (n > 0) parts.push(frBelow1000(n, true));

  return parts.join(" ");
}

const CUR_NAMES = { USD: "Dollars US", EUR: "Euros", MRU: "Ouguiyas (MRU)" };

function amountInWords(v, currency) {
  const total = Math.round(num(v) * 100);
  const whole = Math.floor(total / 100);
  const cents = total % 100;

  let t = frWords(whole) + " " + (CUR_NAMES[currency] || currency);
  if (cents) t += " et " + frWords(cents) + " centimes";

  return t.charAt(0).toUpperCase() + t.slice(1);
}

const fmt2 = (v) => num(v).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const fmtN = (v) => String(Number(num(v).toFixed(2))).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const frDate = (d) => (d && /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(8, 10) + "/" + d.slice(5, 7) + "/" + d.slice(0, 4) : d || "");

function printExport(x) {
  if (!x) return;

  const e = x.extra || {};
  const m = MODES[x.transport_mode] || MODES.maritime;

  const cartons = x.items.reduce((s, i) => s + i.bags, 0);
  const kg = x.items.reduce((s, i) => s + i.total_weight_kg, 0);

  const rate = num(e.exchange_rate);
  const gross = num(e.gross_weight);
  const mru = x.currency === "MRU" ? num(x.total_amount) : rate > 0 ? num(x.total_amount) * rate : 0;

  const kv = (label, v, cls) => (v ? `<tr><td class="k">${label}</td><td class="${cls || ""}">${esc(v)}</td></tr>` : "");

  const header = (title) => `
    <div class="co-row">
      <div class="logo">BP</div>
      <div>
        <div class="co">${esc(COMPANY.name)}</div>
        ${COMPANY.lines.map((l) => `<div class="cl">${esc(l)}</div>`).join("")}
      </div>
    </div>
    <div class="title-row">
      <div class="title">${title}</div>
      <div class="dt">Nouadhibou, le : <b>${esc(frDate(x.export_date))}</b></div>
    </div>`;

  const invoiceRows = x.items
    .map(
      (i) =>
        `<tr><td class="l">${esc(i.product_name)}</td><td>${fmtN(i.bags)}</td><td>${fmt2(i.weight_per_bag_kg)}</td><td>${fmt2(i.total_weight_kg)}</td><td>${esc(String(Number(i.unit_price.toFixed(4))))}</td><td>${fmt2(i.total_price)}</td></tr>`
    )
    .join("");

  const packingRows = x.items
    .map(
      (i) =>
        `<tr><td class="l">${esc(i.product_name)}</td><td>${fmtN(i.bags)}</td><td>${fmt2(i.weight_per_bag_kg)}</td><td>${fmt2(i.total_weight_kg)}</td></tr>`
    )
    .join("");

  const infoBlock = `
    <div class="two">
      <table class="kv left">
        <tr><td class="k">N° Facture :</td><td class="big">${esc(x.invoice_number)}</td></tr>
        ${kv("Credoc :", e.credoc)}
        ${kv("Réf. domiciliation :", e.domiciliation)}
        ${kv("N° État :", e.etat)}
        ${kv("Cargo :", m.cargo)}
        ${kv("N° CONT. :", x.container_number)}
        ${kv("N° PLOMB :", x.seal_number)}
      </table>
      <div class="client">
        <div class="k">CLIENT :</div>
        <div class="cname">${esc(x.customer_name || "")}</div>
        <div>${esc(x.customer_address || "")}</div>
      </div>
    </div>
    <div class="prod">
      <div>
        ${e.producer ? `Producteur : <b>${esc(e.producer)}</b>${e.prod_date ? ` &nbsp; du <b>${esc(frDate(e.prod_date))}</b>` : ""}` : ""}
        ${e.freeze_type ? `<div>Type de congélation : <b>${esc(e.freeze_type)}</b></div>` : ""}
      </div>
      <div class="cur">Monnaie : <b>${esc(CUR_NAMES[x.currency] || x.currency)}</b></div>
    </div>`;

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
  <title>Facture ${esc(x.invoice_number)}</title>
  <style>
    @page{size:A4;margin:10mm}
    *{box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;color:#000;margin:0;font-size:12px}
    .page{min-height:270mm;position:relative;padding-bottom:18mm}
    .pb{page-break-before:always}
    .co-row{display:flex;gap:12px;align-items:center;margin-bottom:10px}
    .logo{width:52px;height:52px;border-radius:12px;background:#18a66a;color:#fff;font-weight:900;font-size:20px;display:flex;align-items:center;justify-content:center}
    .co{font-size:22px;font-weight:700;letter-spacing:1px}
    .cl{font-size:12px}
    .title-row{display:flex;justify-content:space-between;align-items:flex-end;margin:10px 0 12px}
    .title{font-size:19px;font-weight:700}
    .dt{font-size:13px}
    .two{display:flex;border-top:1px solid #000;padding-top:8px}
    .kv{border-collapse:collapse;flex:1}
    .kv td{padding:3px 6px;vertical-align:top}
    .kv .k,.client .k{font-weight:700}
    .kv .k{width:140px}
    .big{font-size:17px;font-weight:700}
    .client{flex:1;border-left:1px solid #000;padding:0 10px}
    .cname{font-size:16px;font-weight:700;margin:4px 0}
    .prod{display:flex;justify-content:space-between;border-top:1px solid #000;border-bottom:1px solid #000;padding:6px 6px;margin-top:8px;margin-bottom:10px}
    table.list{width:100%;border-collapse:collapse}
    table.list th,table.list td{border:1.5px solid #000;padding:6px;text-align:center}
    table.list th{font-weight:700}
    table.list td.l{text-align:left;font-weight:700}
    table.list tfoot td{font-weight:700}
    .sum{display:flex;gap:20px;margin-top:10px}
    .sum table{border-collapse:collapse;flex:1}
    .sum td{padding:2px 6px}
    .sum td.k{width:150px}
    .sum td.v{text-align:right;white-space:nowrap}
    .words{margin-top:12px}
    .sign{display:flex;justify-content:space-around;margin-top:34px;font-weight:700;font-size:13px}
    .sign div{height:90px;text-align:center}
    .foot{position:absolute;left:0;right:0;bottom:0;border-top:1px solid #000;padding-top:4px;font-size:11px;text-align:center}
  </style></head><body>

  <div class="page">
    ${header("Facture Commerciale, Commercial Invoice")}
    ${infoBlock}

    <table class="list">
      <thead><tr><th>Espèces</th><th>Nbre CTS</th><th>P.Net.Kgs</th><th>Poids Total Kg</th><th>Prix Unitaire</th><th>Prix Total</th></tr></thead>
      <tbody>${invoiceRows}</tbody>
      <tfoot><tr><td class="l">Totaux</td><td>${fmtN(cartons)}</td><td></td><td>${fmt2(kg)}</td><td></td><td>${fmt2(x.total_amount)}</td></tr></tfoot>
    </table>

    <div class="sum">
      <table>
        <tr><td class="k">Nombre de cartons :</td><td class="v">${fmt2(cartons)}</td><td><b>Cts</b></td></tr>
        ${gross ? `<tr><td class="k">Poids brut en Kgs :</td><td class="v">${fmt2(gross)}</td><td><b>Kgs</b></td></tr>` : ""}
        <tr><td class="k">Poids net en Kgs :</td><td class="v">${fmt2(kg)}</td><td><b>Kgs</b></td></tr>
        <tr><td class="k">Valeur devise :</td><td class="v">${fmt2(x.total_amount)}</td><td><b>${esc(CUR_NAMES[x.currency] || x.currency)}</b></td></tr>
        ${mru ? `<tr><td class="k">Valeur MRU :</td><td class="v">${fmt2(mru)}</td><td><b>MRU</b></td></tr>` : ""}
        ${rate > 0 && x.currency !== "MRU" ? `<tr><td class="k">Cours de change :</td><td class="v">${esc(String(rate))}</td><td></td></tr>` : ""}
      </table>
      <table>
        ${kv("Mode de règlement :", e.payment)}
        ${kv("Incoterm :", [x.incoterm, e.incoterm_place].filter(Boolean).join(" "))}
        ${kv("Origine :", e.origin)}
        ${kv("Provenance :", [x.port_of_loading].filter(Boolean).join(""))}
        ${kv("Destination :", [x.destination_country, x.port_of_destination].filter(Boolean).join(" — "))}
        ${kv("N° OP :", e.op)}
        ${kv("Transporteur :", x.shipping_company)}
        ${kv("Date d'expédition :", frDate(x.shipment_date))}
      </table>
    </div>

    <div class="words"><i>Arrêtée la présente facture à la somme de :</i><br><b>${esc(amountInWords(x.total_amount, x.currency))}</b></div>
    ${x.notes ? `<div class="words"><b>Remarques :</b> ${esc(x.notes)}</div>` : ""}

    <div class="sign"><div>Client</div><div>La Direction</div></div>

    <div class="foot">${esc(COMPANY.name)} — ${COMPANY.lines.map(esc).join(" — ")}</div>
  </div>

  <div class="page pb">
    ${header("Packing List")}
    ${infoBlock}
    <table class="list">
      <thead><tr><th>Espèces</th><th>Nbre CTS</th><th>P.Net.Kgs</th><th>Poids net Kg</th></tr></thead>
      <tbody>${packingRows}</tbody>
      <tfoot><tr><td class="l">Totaux</td><td>${fmtN(cartons)}</td><td></td><td>${fmt2(kg)}</td></tr></tfoot>
    </table>
    <div class="foot">${esc(COMPANY.name)} — ${COMPANY.lines.map(esc).join(" — ")}</div>
  </div>

  <script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script>
  </body></html>`;

  const w = window.open("", "_blank");

  if (!w) {
    return status("exportsStatus", "Le navigateur a bloqué la fenêtre. Autorisez les fenêtres pop-up puis réessayez.");
  }

  w.document.open();
  w.document.write(html);
  w.document.close();
}

/* ---------- autocomplétion produit ---------- */

$("exportDate").value = today();
auto("exportProduct", "exportProductSuggestions", "exportWeight");
applyMode();
renderExport();
