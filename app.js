const SUPABASE_URL = "https://beiohysvrabslnrlhwqp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_81jK7ng9q3KI2TNsPTcUNQ_PkuNJpJ5";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);

let products = [];
let customers = [];
let suppliers = [];
let purchaseItems = [];
let saleItems = [];

const today = () => new Date().toISOString().slice(0, 10);

const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]
  );

function status(id, x) {
  $(id).textContent = x || "";
}

/* =========================
   LOGIN
========================= */

function loggedIn() {
  $("loginView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  $("logoutBtn").classList.remove("hidden");
}

function loggedOut() {
  $("loginView").classList.remove("hidden");
  $("appView").classList.add("hidden");
  $("logoutBtn").classList.add("hidden");
}

/* =========================
   API
========================= */

async function api(fn, body = {}) {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    throw Error("Session expirée. Veuillez vous reconnecter.");
  }

  // كل الطلبات تمر عبر الدالة الوسيطة web_gateway (المفتاح السري يبقى في الخادم)
  const r = await fetch(`${SUPABASE_URL}/functions/v1/web_gateway`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ fn, body })
  });

  const d = await r.json().catch(() => ({}));

  if (!r.ok) {
    const msg = [d.error || d.message, d.details].filter(Boolean).join(" — ");
    throw Error(msg || `HTTP ${r.status}`);
  }

  return d;
}

/* =========================
   LOAD PRODUCTS
========================= */

async function loadProducts() {
  let out = [];
  let from = 0;

  for (;;) {
    const q = await supabaseClient
      .from("products")
      .select("id,name,category,default_bag_weight_kg,unit,active")
      .eq("active", true)
      .order("name")
      .range(from, from + 999);

    if (q.error) {
      throw q.error;
    }

    out.push(...q.data);

    if (q.data.length < 1000) {
      break;
    }

    from += 1000;
  }

  products = out;
}

/* =========================
   LOAD CUSTOMERS
========================= */

async function loadCustomers() {
  try {
    const q = await supabaseClient
      .from("customers")
      .select("id,name,phone,address")
      .order("name");

    if (q.error) {
      throw q.error;
    }

    customers = q.data || [];
  } catch (e) {
    customers = [];
    console.error(e);
  }
}

async function loadSuppliers() {
  try {
    const q = await supabaseClient.from("suppliers").select("id,name").order("name");
    if (q.error) throw q.error;
    suppliers = q.data || [];
  } catch (e) {
    suppliers = [];
    console.error(e);
  }
}

/* =========================
   PRODUCT AUTOCOMPLETE
   (اكتب 3 أحرف فأكثر)
========================= */

function auto(inputId, boxId, weightId) {
  let input = $(inputId);

  // إذا كان الحقل قائمة منسدلة (select) نحوّله إلى حقل كتابة
  if (input.tagName !== "INPUT") {
    const fresh = document.createElement("input");
    fresh.type = "text";
    fresh.id = inputId;
    fresh.placeholder = "Tapez 3 lettres du nom du produit";
    input.replaceWith(fresh);
    input = fresh;
  }

  input.setAttribute("autocomplete", "off");

  let box = $(boxId);

  if (!box) {
    box = document.createElement("div");
    box.id = boxId;
    box.className = "suggestions hidden";
    input.after(box);
  }

  // لكي تظهر القائمة تحت الحقل مباشرة
  input.parentElement.style.position = "relative";
  box.style.top = "100%";
  box.style.left = "0";
  box.style.right = "0";

  const pick = (p) => {
    if (!p) return;
    input.value = p.name;
    input.dataset.id = p.id;
    $(weightId).value = p.default_bag_weight_kg ?? "";
    box.classList.add("hidden");
  };

  input.addEventListener("input", () => {
    input.dataset.id = "";

    const q = input.value.trim().toUpperCase();

    if (q.length < 3) {
      box.innerHTML = "";
      box.classList.add("hidden");
      return;
    }

    if (!products.length) {
      box.innerHTML = `<div class="suggestion">Chargement des produits...</div>`;
      box.classList.remove("hidden");

      loadProducts()
        .then(() => {
          if (!products.length) {
            box.innerHTML = `<div class="suggestion">Aucun produit : vérifiez les droits de la table products dans Supabase.</div>`;
            return;
          }
          input.dispatchEvent(new Event("input"));
        })
        .catch((err) => {
          box.innerHTML = `<div class="suggestion">Échec du chargement des produits : ${esc(err.message || err)}</div>`;
        });

      return;
    }

    const starts = products.filter((p) => p.name.toUpperCase().startsWith(q));
    const rest = products.filter(
      (p) => !p.name.toUpperCase().startsWith(q) && p.name.toUpperCase().includes(q)
    );
    const list = [...starts, ...rest].slice(0, 20);

    box.innerHTML = list
      .map(
        (p) =>
          `<div class="suggestion" data-id="${esc(p.id)}">${esc(p.name)} — ${esc(p.category || "")}</div>`
      )
      .join("");

    box.classList.toggle("hidden", !list.length);

    box.querySelectorAll(".suggestion").forEach((el) => {
      el.onclick = () => pick(products.find((z) => String(z.id) === el.dataset.id));
    });
  });

  input.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === "Tab") && !box.classList.contains("hidden")) {
      const first = box.querySelector(".suggestion");
      if (first) {
        e.preventDefault();
        pick(products.find((z) => String(z.id) === first.dataset.id));
      }
    }
  });

  document.addEventListener("click", (e) => {
    if (e.target !== input && !box.contains(e.target)) {
      box.classList.add("hidden");
    }
  });
}

const norm = (v) => String(v ?? "").trim().replace(/\s+/g, " ").toUpperCase();

function autoCustomer(inputId, boxId) {
  const input = $(inputId);
  input.setAttribute("autocomplete", "off");

  let box = $(boxId);

  if (!box) {
    box = document.createElement("div");
    box.id = boxId;
    box.className = "suggestions hidden";
    input.after(box);
  }

  input.parentElement.style.position = "relative";
  box.style.top = "100%";
  box.style.left = "0";
  box.style.right = "0";

  const pick = (c) => {
    if (!c) return;
    input.value = c.name;
    input.dataset.id = c.id;
    box.classList.add("hidden");
  };

  input.addEventListener("input", () => {
    input.dataset.id = "";

    const q = norm(input.value);

    if (q.length < 3) {
      box.innerHTML = "";
      box.classList.add("hidden");
      return;
    }

    if (!customers.length) {
      box.innerHTML = `<div class="suggestion">Aucun client : vérifiez les droits de la table customers dans Supabase.</div>`;
      box.classList.remove("hidden");
      return;
    }

    const starts = customers.filter((c) => norm(c.name).startsWith(q));
    const rest = customers.filter(
      (c) => !norm(c.name).startsWith(q) && norm(c.name).includes(q)
    );
    const list = [...starts, ...rest].slice(0, 20);

    box.innerHTML = list
      .map((c) => `<div class="suggestion" data-id="${esc(c.id)}">${esc(c.name)}</div>`)
      .join("");

    box.classList.toggle("hidden", !list.length);

    box.querySelectorAll(".suggestion").forEach((el) => {
      el.onclick = () => pick(customers.find((z) => String(z.id) === el.dataset.id));
    });
  });

  input.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === "Tab") && !box.classList.contains("hidden")) {
      const first = box.querySelector(".suggestion[data-id]");
      if (first) {
        e.preventDefault();
        pick(customers.find((z) => String(z.id) === first.dataset.id));
      }
    }
  });

  document.addEventListener("click", (e) => {
    if (e.target !== input && !box.contains(e.target)) {
      box.classList.add("hidden");
    }
  });
}

function findCustomer(inputId) {
  const input = $(inputId);

  if (input.dataset.id) {
    const c = customers.find((x) => String(x.id) === input.dataset.id);
    if (c) return c;
  }

  const name = norm(input.value);

  if (!name) return null;

  const exact = customers.find((x) => norm(x.name) === name);
  if (exact) return exact;

  const partial = customers.filter((x) => norm(x.name).includes(name));
  return partial.length === 1 ? partial[0] : null;
}

function findProduct(inputId) {
  const input = $(inputId);
  const name = input.value.trim().toUpperCase();

  return (
    products.find((x) => input.dataset.id && String(x.id) === input.dataset.id) ||
    products.find((x) => x.name.toUpperCase() === name)
  );
}

/* =========================
   WINDOWS
========================= */

function open(id) {
  document.querySelectorAll(".module").forEach((x) => x.classList.add("hidden"));

  $(id).classList.remove("hidden");

  if (id === "inventoryWindow") loadInventory();
  if (id === "purchasesWindow") loadPurchases();
  if (id === "salesWindow") loadSales();
  if (id === "peopleWindow") loadPeople();
}

document
  .querySelectorAll("[data-window]")
  .forEach((b) => (b.onclick = () => open(b.dataset.window)));

document
  .querySelectorAll(".close")
  .forEach((b) => (b.onclick = () => b.closest(".module").classList.add("hidden")));

/* =========================
   INVENTORY
========================= */

async function loadInventory() {
  try {
    status("inventoryStatus", "Chargement...");

    const d = await api("get_inventory");

    const rows = Array.isArray(d) ? d : d.inventory || d.data || d.result || [];

    const available = rows.filter(
      (x) => Number(x.bags || 0) > 0 || Number(x.weight_kg || 0) > 0
    );

    window.inventoryRows = available;

    $("inventoryTableBody").innerHTML = available
      .map(
        (x) =>
          `<tr>
            <td>${esc(x.name)}</td>
            <td>${esc(x.category)}</td>
            <td>${esc(x.bags)}</td>
            <td>${esc(x.weight_kg)}</td>
            <td>${esc(x.default_bag_weight_kg)}</td>
            <td>${esc(x.unit)}</td>
          </tr>`
      )
      .join("");

    status("inventoryStatus", `${available.length} produit(s) en stock.`);
  } catch (e) {
    status("inventoryStatus", e.message);
  }
}

/* =========================
   PURCHASES
========================= */

async function loadPurchases() {
  try {
    const d = await api("get_purchase_report", {
      from_date: "2000-01-01",
      to_date: today()
    });

    const rows = Array.isArray(d) ? d : d.purchases || d.data || d.result || [];

    window.purchaseRows = rows;

    $("purchasesTableBody").innerHTML = rows
      .map(
        (x) =>
          `<tr>
            <td>${esc(x.invoice_number)}</td>
            <td>${esc(x.purchase_date)}</td>
            <td>${esc(x.currency)}</td>
            <td>${esc(x.total_amount)}</td>
            <td>${esc(x.notes)}</td>
          </tr>`
      )
      .join("");

    status("purchasesStatus", `${rows.length} opération(s) chargée(s).`);
  } catch (e) {
    status("purchasesStatus", e.message);
  }
}

/* =========================
   SALES
========================= */

async function loadSales() {
  try {
    const d = await api("get_sales_report", {
      from_date: "2000-01-01",
      to_date: today()
    });

    const rows = Array.isArray(d) ? d : d.sales || d.data || d.result || [];

    window.saleRows = rows;

    $("salesTableBody").innerHTML = rows
      .map(
        (x) =>
          `<tr>
            <td>${esc(x.invoice_number)}</td>
            <td>${esc(x.sale_date)}</td>
            <td>${esc(x.currency)}</td>
            <td>${esc(x.total_amount)}</td>
            <td>${esc(x.notes)}</td>
          </tr>`
      )
      .join("");

    status("salesStatus", `${rows.length} opération(s) chargée(s).`);
  } catch (e) {
    status("salesStatus", e.message);
  }
}

/* =========================
   CUSTOMERS / SUPPLIERS
========================= */

async function loadPeople() {
  try {
    const c = await supabaseClient.from("customers").select("name,phone,address").order("name");
    const s = await supabaseClient.from("suppliers").select("name,phone,address").order("name");

    if (c.error) throw c.error;
    if (s.error) throw s.error;

    const row = (x) =>
      `<tr><td>${esc(x.name)}</td><td>${esc(x.phone)}</td><td>${esc(x.address)}</td></tr>`;

    $("customersTableBody").innerHTML = (c.data || []).map(row).join("");
    $("suppliersTableBody").innerHTML = (s.data || []).map(row).join("");

    status("peopleStatus", `Clients : ${c.data.length} — Fournisseurs : ${s.data.length}`);
  } catch (e) {
    status("peopleStatus", e.message);
  }
}

/* =========================
   TABLE ITEMS
========================= */

function render(type) {
  const items = type === "p" ? purchaseItems : saleItems;
  const body = $(type === "p" ? "purchaseItemsBody" : "saleItemsBody");

  body.innerHTML = items
    .map(
      (x, i) =>
        `<tr>
          <td>${esc(x.name)}</td>
          <td>${x.bags}</td>
          <td>${x.weight}</td>
          <td>${x.price}</td>
          <td>${(x.bags * x.weight * x.price).toFixed(2)}</td>
          <td><button class="secondary remove" data-t="${type}" data-i="${i}">Supprimer</button></td>
        </tr>`
    )
    .join("");

  document.querySelectorAll(".remove").forEach(
    (b) =>
      (b.onclick = () => {
        (b.dataset.t === "p" ? purchaseItems : saleItems).splice(Number(b.dataset.i), 1);
        render(b.dataset.t);
      })
  );
}

/* =========================
   NEW PURCHASE / SALE
========================= */

$("newPurchaseBtn").onclick = () => {
  $("purchaseFormContainer").classList.remove("hidden");
  $("purchaseDate").value = today();
};

$("cancelPurchaseBtn").onclick = () => {
  $("purchaseFormContainer").classList.add("hidden");
  purchaseItems = [];
  render("p");
  status("purchaseFormStatus", "");
};

$("newSaleBtn").onclick = () => {
  $("saleFormContainer").classList.remove("hidden");
  $("saleDate").value = today();
};

$("cancelSaleBtn").onclick = () => {
  $("saleFormContainer").classList.add("hidden");
  saleItems = [];
  render("s");
  status("saleFormStatus", "");
};

/* =========================
   ADD ITEMS
========================= */

$("addPurchaseItemBtn").onclick = () => {
  const product = findProduct("purchaseProduct");

  if (!product) {
    return status("purchaseFormStatus", "Tapez 3 lettres du nom du produit et choisissez-le dans la liste.");
  }

  const bags = Number($("purchaseBags").value);
  const weight = Number($("purchaseWeight").value) || Number(product.default_bag_weight_kg);
  const price = Number($("purchaseUnitPrice").value);

  if (!(bags > 0) || !(weight > 0) || !(price >= 0)) {
    return status("purchaseFormStatus", "Veuillez saisir les données.");
  }

  purchaseItems.push({ product_id: product.id, name: product.name, bags, weight, price });

  render("p");

  $("purchaseProduct").value = "";
  $("purchaseProduct").dataset.id = "";
  $("purchaseBags").value = "";
  $("purchaseWeight").value = "";
  $("purchaseUnitPrice").value = "";

  status("purchaseFormStatus", "");
};

$("addSaleItemBtn").onclick = () => {
  const product = findProduct("saleProduct");

  if (!product) {
    return status("saleFormStatus", "Tapez 3 lettres du nom du produit et choisissez-le dans la liste.");
  }

  const bags = Number($("saleBags").value);
  const weight = Number($("saleWeight").value) || Number(product.default_bag_weight_kg);
  const price = Number($("saleUnitPrice").value);

  if (!(bags > 0) || !(weight > 0) || !(price >= 0)) {
    return status("saleFormStatus", "Veuillez saisir les données.");
  }

  saleItems.push({ product_id: product.id, name: product.name, bags, weight, price });

  render("s");

  $("saleProduct").value = "";
  $("saleProduct").dataset.id = "";
  $("saleBags").value = "";
  $("saleWeight").value = "";
  $("saleUnitPrice").value = "";

  status("saleFormStatus", "");
};

/* =========================
   SAVE PURCHASE
========================= */

$("purchaseForm").onsubmit = async (e) => {
  e.preventDefault();

  if (!purchaseItems.length) {
    return status("purchaseFormStatus", "Ajoutez au moins un produit.");
  }

  try {
    status("purchaseFormStatus", "Enregistrement...");

    await api("creat_purchase", {
      invoice_number: $("purchaseInvoice").value,
      purchase_date: $("purchaseDate").value || today(),
      currency: "MRU",
      notes: $("purchaseNotes").value,
      items: purchaseItems.map((x) => ({
        product_id: x.product_id,
        bags: x.bags,
        weight_per_bag_kg: x.weight,
        unit_price: x.price
      }))
    });

    status("purchaseFormStatus", "Enregistré.");

    await loadPurchases();
    await loadInventory();
  } catch (e) {
    status("purchaseFormStatus", e.message);
  }
};

/* =========================
   SAVE SALE
========================= */

$("saleForm").onsubmit = async (e) => {
  e.preventDefault();

  if (!saleItems.length) {
    return status("saleFormStatus", "Ajoutez au moins un produit.");
  }

  try {
    // خانة العميل حرة: لا شرط عليها. إن طابقت عميلاً مسجلاً نربطه به، وإلا نحفظ الاسم في الملاحظات
    const customer = findCustomer("saleCustomer");
    const customerName = $("saleCustomer").value.trim();

    status("saleFormStatus", "Enregistrement...");

    await api("creat_seal", {
      invoice_number: $("saleInvoice").value,
      customer_id: customer ? customer.id : null,
      sale_date: $("saleDate").value || today(),
      currency: $("saleCurrency").value,
      notes: [
        customerName && !customer ? `Client : ${customerName}` : "",
        $("saleNotes").value
      ].filter(Boolean).join(" — "),
      items: saleItems.map((x) => ({
        product_id: x.product_id,
        bags: x.bags,
        weight_per_bag_kg: x.weight,
        unit_price: x.price
      }))
    });

    status("saleFormStatus", "Enregistré.");

    await loadSales();
    await loadInventory();
  } catch (e) {
    status("saleFormStatus", e.message);
  }
};

/* =========================
   REPORTS
========================= */

/* =========================
   REPORT RENDERING (جداول مفهومة بدون المعرّفات)
========================= */

const REPORT_LABELS = {
  invoice_number: "N° facture",
  purchase_date: "Date d'achat",
  sale_date: "Date de vente",
  movement_date: "Date",
  currency: "Devise",
  total_amount: "Montant total",
  total_price: "Prix total",
  unit_price: "Prix/kg",
  bags: "Cartons",
  weight_per_bag_kg: "Kg/carton",
  total_weight_kg: "Poids (kg)",
  weight_kg: "Poids (kg)",
  invoice_count: "Nombre de factures",
  totals_by_currency: "Totaux par devise",
  total_bags: "Total cartons",
  total_cartons: "Total cartons",
  total_sales_amount: "Total ventes",
  total_purchases_amount: "Total achats",
  balance: "Solde",
  gross_profit: "Marge brute",
  net_profit: "Bénéfice net",
  report: "Rapport",
  notes: "Remarques",
  supplier_name: "Fournisseur",
  customer_name: "Client",
  product_name: "Produit",
  name: "Nom",
  category: "Catégorie",
  unit: "Unité",
  from_date: "Du",
  to_date: "Au",
  total_purchases: "Total achats",
  total_sales: "Total ventes",
  profit: "Bénéfice",
  count: "Nombre",
  items: "Produits",
  purchases: "Achats",
  sales: "Ventes",
  summary: "Résumé",
  totals: "Totaux"
};

const isIdKey = (k) => /(^|_)id$/i.test(k) || /^uuid$/i.test(k);
const labelOf = (k) => REPORT_LABELS[k] || String(k).replace(/_/g, " ");
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isRowArray = (v) => Array.isArray(v) && v.length > 0 && v.every(isObj);

function fmtVal(v) {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number") return Number.isInteger(v) ? v : Number(v.toFixed(2));
  if (typeof v === "boolean") return v ? "Oui" : "Non";
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
    if (/^-?\d+\.\d{3,}$/.test(v)) return Number(v).toFixed(2);
    return v;
  }
  if (Array.isArray(v)) return v.map(fmtVal).join(", ");
  if (isObj(v)) {
    return Object.entries(v)
      .filter(([k]) => !isIdKey(k))
      .map(([k, x]) => `${labelOf(k)}: ${fmtVal(x)}`)
      .join(" | ");
  }
  return String(v);
}

// إذا غاب اسم المنتج/العميل/المورد وكان المعرّف موجوداً نجلب الاسم من القوائم المحمّلة
function enrichRow(r) {
  return { ...r };
}

const COL_PRIORITY = [
  "invoice_number", "purchase_date", "sale_date", "movement_date",
  "supplier_name", "customer_name", "product_name"
];

// إذا كان السجل يحتوي قائمة منتجات داخلية نحوّلها إلى صفوف مستقلة
function expandRows(rows) {
  const out = [];

  rows.forEach((r) => {
    const nestedKey = Object.keys(r).find((k) => isRowArray(r[k]));

    if (!nestedKey) {
      out.push(enrichRow(r));
      return;
    }

    const { [nestedKey]: items, ...parent } = r;
    items.forEach((it) => out.push(enrichRow({ ...parent, ...it })));
  });

  return out;
}

function collectTables(d, prefix, tables, summary) {
  if (Array.isArray(d) && d.length === 0) {
    tables.push({ title: prefix, rows: [] });
    return;
  }

  if (isRowArray(d)) {
    tables.push({ title: prefix, rows: expandRows(d) });
    return;
  }

  if (!isObj(d)) {
    if (d !== undefined && d !== null && d !== "") {
      summary.push([prefix, fmtVal(d)]);
    }
    return;
  }

  Object.entries(d).forEach(([k, v]) => {
    if (isIdKey(k) || k === "success") return;
    const wrapper = ["report", "data", "result", "results"].includes(k);
    const name = wrapper ? prefix : prefix ? `${prefix} — ${labelOf(k)}` : labelOf(k);
    collectTables(v, name, tables, summary);
  });
}

function renderReport(d) {
  const tables = [];
  const summary = [];

  collectTables(d, "", tables, summary);

  let html = "";
  const csvParts = [];

  if (summary.length) {
    html +=
      `<h3>Résumé</h3><div class="table"><table><thead><tr><th>Élément</th><th>Valeur</th></tr></thead><tbody>` +
      summary.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("") +
      `</tbody></table></div>`;

    csvParts.push(
      "Résumé\n" + csv(summary.map(([k, v]) => ({ "Élément": k, "Valeur": v })))
    );
  }

  tables.forEach((t) => {
    const title = t.title ? `<h3>${esc(t.title)}</h3>` : "";

    if (!t.rows.length) {
      html += title + `<p>Aucune donnée pour cette période.</p>`;
      return;
    }

    const keys = [...new Set(t.rows.flatMap((r) => Object.keys(r)))].filter((k) => !isIdKey(k))
      .sort((a, b) => {
        const ia = COL_PRIORITY.indexOf(a), ib = COL_PRIORITY.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      });

    html +=
      title +
      `<div class="table"><table><thead><tr>` +
      keys.map((k) => `<th>${esc(labelOf(k))}</th>`).join("") +
      `</tr></thead><tbody>` +
      t.rows
        .map((r) => `<tr>${keys.map((k) => `<td>${esc(fmtVal(r[k]))}</td>`).join("")}</tr>`)
        .join("") +
      `</tbody></table></div>`;

    csvParts.push(
      (t.title ? t.title + "\n" : "") +
        csv(
          t.rows.map((r) =>
            Object.fromEntries(keys.map((k) => [labelOf(k), fmtVal(r[k])]))
          )
        )
    );
  });

  if (!html) {
    html = `<p>Aucune donnée pour cette période.</p>`;
  }

  html +=
    `<details><summary>Afficher les données brutes</summary><pre style="white-space:pre-wrap">${esc(
      JSON.stringify(d, null, 2)
    )}</pre></details>`;

  if (!document.getElementById("reportLtrStyle")) {
    const st = document.createElement("style");
    st.id = "reportLtrStyle";
    st.textContent = "#reportResult th,#reportResult td{text-align:left}";
    document.head.appendChild(st);
  }

  const box = $("reportResult");
  box.dir = "ltr";
  box.style.textAlign = "left";
  box.style.whiteSpace = "normal";
  box.innerHTML = html;

  window.lastReportCsv = csvParts.join("\n\n");
}

async function report(type) {
  try {
    status("reportsStatus", "Génération du rapport...");

    let d;
    const range = { from_date: $("reportFrom").value, to_date: $("reportTo").value };

    if (type === "p") d = await api("get_purchase_report", range);
    if (type === "s") d = await api("get_sales_report", range);
    if (type === "f") d = await api("get_financial_summary", range);

    if (type === "m") {
      return status("reportsStatus", "Pour le mouvement d'un produit, utilisez Bonapeche AI.");
    }

    window.lastReport = d;

    renderReport(d);

    status("reportsStatus", "Rapport généré.");
  } catch (e) {
    status("reportsStatus", e.message);

    const box = $("reportResult");
    box.dir = "ltr";
    box.style.textAlign = "left";
    box.style.whiteSpace = "pre-wrap";
    box.textContent = "Erreur : " + e.message;
  }
}

$("purchaseReportBtn").onclick = () => report("p");
$("salesReportBtn").onclick = () => report("s");
$("financialReportBtn").onclick = () => report("f");
$("movementReportBtn").onclick = () => report("m");

/* =========================
   AI
========================= */

$("sendBtn").onclick = async () => {
  const message = $("message").value.trim();

  if (!message) {
    return;
  }

  try {
    status("chatStatus", "Envoi...");

    const d = await api("bonapeche_api", { message });

    $("response").textContent = d.reply || d.error || JSON.stringify(d, null, 2);

    status("chatStatus", "Terminé.");
  } catch (e) {
    status("chatStatus", e.message);
    $("response").textContent = e.message;
  }
};


/* =========================
   SCAN INVOICE (photo -> purchase form)
========================= */

function resizeImage(file, maxSide = 1600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85).split(",")[1]);
    };
    img.onerror = () => reject(new Error("Image illisible."));
    img.src = url;
  });
}

function matchProduct(name) {
  if (!name) return null;
  const n = name.trim().toUpperCase();
  return products.find((x) => x.name.toUpperCase() === n) || null;
}

$("scanInvoiceBtn").onclick = () => $("invoiceFile").click();

$("invoiceFile").onchange = async () => {
  const file = $("invoiceFile").files[0];
  $("invoiceFile").value = "";
  if (!file) return;

  try {
    status("scanStatus", "Lecture de la facture en cours...");

    if (!products.length) await loadProducts();

    const image_base64 = await resizeImage(file);
    const d = await api("read_invoice", {
      image_base64,
      mime_type: "image/jpeg",
      product_names: products.map((x) => x.name)
    });

    const inv = d.invoice || {};
    const lines = Array.isArray(inv.items) ? inv.items : [];

    // ouvrir le formulaire d'achat et le remplir
    open("purchasesWindow");
    $("purchaseFormContainer").classList.remove("hidden");

    $("purchaseInvoice").value = inv.invoice_number || "";
    $("purchaseDate").value = /^\d{4}-\d{2}-\d{2}$/.test(inv.invoice_date || "") ? inv.invoice_date : today();
    $("purchaseSupplier").value = inv.supplier || "";
    $("purchaseNotes").value = inv.notes || "";

    purchaseItems = [];
    const missing = [];

    lines.forEach((l) => {
      const product = matchProduct(l.product_name);
      if (!product) {
        missing.push(
          `${l.name_on_invoice || "?"} (${l.bags ?? "?"} cartons, ${l.weight_per_bag_kg ?? "?"} kg, ${l.unit_price_per_kg ?? "?"}/kg)`
        );
        return;
      }
      const weight = Number(l.weight_per_bag_kg) || Number(product.default_bag_weight_kg) || 0;
      const price = Number(l.unit_price_per_kg);
      const bags = Number(l.bags);
      purchaseItems.push({
        product_id: product.id,
        name: product.name + (l.uncertain || !(bags > 0) || !(weight > 0) || !(price >= 0) ? " ⚠" : ""),
        bags: bags > 0 ? bags : 0,
        weight,
        price: price >= 0 ? price : 0
      });
    });

    render("p");

    let msg = `Facture lue : ${purchaseItems.length} produit(s). Vérifiez toutes les valeurs avant d'enregistrer.`;
    if (purchaseItems.some((x) => x.name.endsWith("⚠"))) msg += " Les lignes marquées ⚠ sont à vérifier.";
    if (missing.length) msg += " Produits non reconnus, à ajouter à la main : " + missing.join(" ; ");
    status("purchaseFormStatus", msg);
    status("scanStatus", "");
  } catch (e) {
    status("scanStatus", "Erreur : " + e.message);
  }
};

document.querySelectorAll(".example").forEach(
  (x) =>
    (x.onclick = () => {
      $("message").value = x.textContent;
      $("sendBtn").click();
    })
);

/* =========================
   EXPORT
========================= */

function csv(rows) {
  if (!rows?.length) {
    return "";
  }

  const keys = [...new Set(rows.flatMap((x) => Object.keys(x)))];

  return [
    keys.join(","),
    ...rows.map((x) =>
      keys.map((y) => `"${String(x[y] ?? "").replaceAll('"', '""')}"`).join(",")
    )
  ].join("\n");
}

function dl(name, content) {
  const a = document.createElement("a");

  a.href = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));

  a.download = name;

  a.click();
}

$("exportInventoryBtn").onclick = () => dl("bonapeche-inventory.csv", csv(window.inventoryRows));
$("exportPurchasesBtn").onclick = () => dl("bonapeche-purchases.csv", csv(window.purchaseRows));
$("exportSalesBtn").onclick = () => dl("bonapeche-sales.csv", csv(window.saleRows));
$("exportReportExcelBtn").onclick = () =>
  dl("bonapeche-report.csv", "\ufeff" + (window.lastReportCsv || ""));
$("exportReportPdfBtn").onclick = () => print();

/* =========================
   REFRESH
========================= */

$("refreshInventoryBtn").onclick = loadInventory;
$("refreshPurchasesBtn").onclick = loadPurchases;
$("refreshSalesBtn").onclick = loadSales;
$("refreshPeopleBtn").onclick = loadPeople;

/* =========================
   LOGIN FORM
========================= */

$("loginForm").onsubmit = async (e) => {
  e.preventDefault();

  status("loginStatus", "Connexion...");

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: $("email").value.trim(),
    password: $("password").value
  });

  if (error) {
    return status("loginStatus", error.message);
  }

  loggedIn();

  try {
    await Promise.all([loadProducts(), loadCustomers(), loadSuppliers()]);
  } catch (e) {
    console.error(e);
  }
};

$("logoutBtn").onclick = async () => {
  await supabaseClient.auth.signOut();
  loggedOut();
};

/* =========================
   INITIAL SESSION
========================= */

(async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (session) {
    loggedIn();

    try {
      await Promise.all([loadProducts(), loadCustomers(), loadSuppliers()]);
    } catch (e) {
      console.error(e);
    }
  }
})();

/* =========================
   DEFAULT DATES + AUTOCOMPLETE
========================= */

$("reportFrom").value = `${new Date().getFullYear()}-01-01`;
$("reportTo").value = today();
$("purchaseDate").value = today();
$("saleDate").value = today();

auto("purchaseProduct", "purchaseProductSuggestions", "purchaseWeight");
auto("saleProduct", "saleProductSuggestions", "saleWeight");
autoCustomer("saleCustomer", "saleCustomerSuggestions");
