const SUPABASE_URL = "https://beiohysvrabslnrlhwqp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_81jK7ng9q3KI2TNsPTcUNQ_PkuNJpJ5";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);

let products = [];
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
    throw Error("انتهت جلسة الدخول.");
  }

  const r = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`
    },
    body: JSON.stringify(body)
  });

  const d = await r.json().catch(() => ({}));

  if (!r.ok) {
    throw Error(d.error || d.message || `HTTP ${r.status}`);
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
    fresh.placeholder = "اكتب 3 أحرف من اسم المنتج";
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
      box.innerHTML = `<div class="suggestion">جارٍ تحميل المنتجات...</div>`;
      box.classList.remove("hidden");

      loadProducts()
        .then(() => {
          if (!products.length) {
            box.innerHTML = `<div class="suggestion">لا توجد منتجات: تحقق من صلاحيات جدول products في Supabase.</div>`;
            return;
          }
          input.dispatchEvent(new Event("input"));
        })
        .catch((err) => {
          box.innerHTML = `<div class="suggestion">تعذّر تحميل المنتجات: ${esc(err.message || err)}</div>`;
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
    status("inventoryStatus", "جارٍ التحميل...");

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

    status("inventoryStatus", `تم تحميل ${available.length} منتجًا له مخزون فعلي.`);
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

    status("purchasesStatus", `تم تحميل ${rows.length} عملية.`);
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

    status("salesStatus", `تم تحميل ${rows.length} عملية.`);
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

    status("peopleStatus", `العملاء: ${c.data.length} — الموردون: ${s.data.length}`);
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
          <td><button class="secondary remove" data-t="${type}" data-i="${i}">حذف</button></td>
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
    return status("purchaseFormStatus", "اكتب 3 أحرف من اسم المنتج واختره من القائمة.");
  }

  const bags = Number($("purchaseBags").value);
  const weight = Number($("purchaseWeight").value) || Number(product.default_bag_weight_kg);
  const price = Number($("purchaseUnitPrice").value);

  if (!(bags > 0) || !(weight > 0) || !(price >= 0)) {
    return status("purchaseFormStatus", "أدخل البيانات.");
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
    return status("saleFormStatus", "اكتب 3 أحرف من اسم المنتج واختره من القائمة.");
  }

  const bags = Number($("saleBags").value);
  const weight = Number($("saleWeight").value) || Number(product.default_bag_weight_kg);
  const price = Number($("saleUnitPrice").value);

  if (!(bags > 0) || !(weight > 0) || !(price >= 0)) {
    return status("saleFormStatus", "أدخل البيانات.");
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
    return status("purchaseFormStatus", "أضف منتجًا.");
  }

  try {
    status("purchaseFormStatus", "جارٍ الحفظ...");

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

    status("purchaseFormStatus", "تم الحفظ.");

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
    return status("saleFormStatus", "أضف منتجًا.");
  }

  try {
    const name = $("saleCustomer").value.trim();

    const q = await supabaseClient
      .from("customers")
      .select("id")
      .ilike("name", name)
      .limit(1)
      .maybeSingle();

    if (!q.data) {
      throw Error("العميل غير موجود في قاعدة البيانات.");
    }

    status("saleFormStatus", "جارٍ الحفظ...");

    await api("creat_seal", {
      invoice_number: $("saleInvoice").value,
      customer_id: q.data.id,
      sale_date: $("saleDate").value || today(),
      currency: $("saleCurrency").value,
      notes: $("saleNotes").value,
      items: saleItems.map((x) => ({
        product_id: x.product_id,
        bags: x.bags,
        weight_per_bag_kg: x.weight,
        unit_price: x.price
      }))
    });

    status("saleFormStatus", "تم الحفظ.");

    await loadSales();
    await loadInventory();
  } catch (e) {
    status("saleFormStatus", e.message);
  }
};

/* =========================
   REPORTS
========================= */

async function report(type) {
  try {
    status("reportsStatus", "جارٍ إنشاء التقرير...");

    let d;
    const range = { from_date: $("reportFrom").value, to_date: $("reportTo").value };

    if (type === "p") d = await api("get_purchase_report", range);
    if (type === "s") d = await api("get_sales_report", range);
    if (type === "f") d = await api("get_financial_summary", range);

    if (type === "m") {
      return status("reportsStatus", "لطلب حركة منتج محدد استخدم Bonapeche AI.");
    }

    window.lastReport = d;

    $("reportResult").textContent = JSON.stringify(d, null, 2);

    status("reportsStatus", "تم التقرير.");
  } catch (e) {
    status("reportsStatus", e.message);
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
    status("chatStatus", "جارٍ الإرسال...");

    const d = await api("bonapeche_api", { message });

    $("response").textContent = d.reply || d.error || JSON.stringify(d, null, 2);

    status("chatStatus", "تم.");
  } catch (e) {
    status("chatStatus", e.message);
    $("response").textContent = e.message;
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
  dl("bonapeche-report.csv", JSON.stringify(window.lastReport || {}, null, 2));
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

  status("loginStatus", "جارٍ الدخول...");

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: $("email").value.trim(),
    password: $("password").value
  });

  if (error) {
    return status("loginStatus", error.message);
  }

  loggedIn();

  try {
    await loadProducts();
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
      await loadProducts();
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
