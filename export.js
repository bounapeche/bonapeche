/* =========================
   EXPORTATION (module séparé : utilise les fonctions de app.js)
========================= */

// Libellés selon le mode de transport
const MODES = {
  maritime: {
    label: "Maritime",
    loading: "Port de chargement",
    dest: "Port de destination",
    unit: "N° conteneur",
    carrier: "Transporteur (compagnie maritime)"
  },
  routier: {
    label: "Routier",
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

function printExport(x) {
  if (!x) return;

  const cartons = x.items.reduce((s, i) => s + i.bags, 0);
  const kg = x.items.reduce((s, i) => s + i.total_weight_kg, 0);

  const m = MODES[x.transport_mode] || MODES.maritime;

  const info = (label, v) =>
    v ? `<tr><td class="k">${label}</td><td>${esc(v)}</td></tr>` : "";

  const head = (title) => `
    <div class="top">
      <div><div class="co">${esc(COMPANY.name)}</div>${COMPANY.lines.map((l) => `<div>${esc(l)}</div>`).join("")}</div>
      <div class="ttl">${title}<div class="sm">N° ${esc(x.invoice_number)}<br>Date : ${esc(x.export_date)}</div></div>
    </div>
    <table class="info">
      ${info("Client", x.customer_name)}
      ${info("Adresse", x.customer_address)}
      ${info("Pays de destination", x.destination_country)}
      ${info("Mode de transport", m.label)}
      ${info(m.loading, x.port_of_loading)}
      ${info(m.dest, x.port_of_destination)}
      ${info("Conditions (Incoterm)", x.incoterm)}
      ${info(m.unit, x.container_number)}
      ${info("N° de plomb", x.seal_number)}
      ${info(m.carrier.replace(/ \(.*\)/, ""), x.shipping_company)}
      ${info("Date d'expédition", x.shipment_date)}
    </table>`;

  const invoiceRows = x.items
    .map(
      (i, n) =>
        `<tr><td>${n + 1}</td><td>${esc(i.product_name)}</td><td class="r">${kgf(i.bags)}</td><td class="r">${kgf(i.weight_per_bag_kg)}</td><td class="r">${kgf(i.total_weight_kg)}</td><td class="r">${money(i.unit_price)}</td><td class="r">${money(i.total_price)}</td></tr>`
    )
    .join("");

  const packingRows = x.items
    .map(
      (i, n) =>
        `<tr><td>${n + 1}</td><td>${esc(i.product_name)}</td><td class="r">${kgf(i.bags)}</td><td class="r">${kgf(i.weight_per_bag_kg)}</td><td class="r">${kgf(i.total_weight_kg)}</td></tr>`
    )
    .join("");

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
  <title>Facture ${esc(x.invoice_number)}</title>
  <style>
    body{font-family:Arial,sans-serif;color:#111;margin:24px;font-size:13px}
    .top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}
    .co{font-size:22px;font-weight:700}
    .ttl{font-size:20px;font-weight:700;text-align:right}
    .sm{font-size:13px;font-weight:400;margin-top:4px}
    table{width:100%;border-collapse:collapse}
    .info{margin-bottom:16px}.info td{padding:3px 6px}.info .k{width:200px;color:#555}
    .list th,.list td{border:1px solid #888;padding:6px}.list th{background:#eee;text-align:left}
    .r{text-align:right}
    .tot{margin-top:10px;text-align:right;font-size:15px;font-weight:700}
    .note{margin-top:14px}
    .pb{page-break-before:always}
    @media print{body{margin:10mm}}
  </style></head><body>
  ${head("FACTURE D'EXPORTATION")}
  <table class="list"><thead><tr><th>#</th><th>Désignation</th><th>Cartons</th><th>Kg/carton</th><th>Poids (kg)</th><th>Prix/kg (${esc(x.currency)})</th><th>Montant (${esc(x.currency)})</th></tr></thead>
  <tbody>${invoiceRows}</tbody>
  <tfoot><tr><th colspan="2">Total</th><th class="r">${kgf(cartons)}</th><th></th><th class="r">${kgf(kg)}</th><th></th><th class="r">${money(x.total_amount)}</th></tr></tfoot></table>
  <div class="tot">Total à payer : ${money(x.total_amount)} ${esc(x.currency)}</div>
  ${x.notes ? `<div class="note"><b>Remarques :</b> ${esc(x.notes)}</div>` : ""}

  <div class="pb">
  ${head("PACKING LIST")}
  <table class="list"><thead><tr><th>#</th><th>Désignation</th><th>Cartons</th><th>Kg/carton</th><th>Poids net (kg)</th></tr></thead>
  <tbody>${packingRows}</tbody>
  <tfoot><tr><th colspan="2">Total</th><th class="r">${kgf(cartons)}</th><th></th><th class="r">${kgf(kg)}</th></tr></tfoot></table>
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
