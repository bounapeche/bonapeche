const SUPABASE_URL = "https://beiohysvrabslnrlhwqp.supabase.co";

const SUPABASE_ANON_KEY = "sb_publishable_81jK7ng9q3KI2TNsPTcUNQ_PkuNJpJ5";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

const $ = id => document.getElementById(id);

let products = [];
let purchaseItems = [];
let saleItems = [];

const today = () =>
  new Date().toISOString().slice(0, 10);

const esc = v =>
  String(v ?? "").replace(
    /[&<>"']/g,
    c =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[c])
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

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!session) {
    throw Error("انتهت جلسة الدخول.");
  }

  const r = await fetch(
    `${SUPABASE_URL}/functions/v1/${fn}`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization":
          `Bearer ${session.access_token}`
      },

      body: JSON.stringify(body)
    }
  );

  const d =
    await r.json().catch(() => ({}));

  if (!r.ok) {
    throw Error(
      d.error ||
      d.message ||
      `HTTP ${r.status}`
    );
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

    const q =
      await supabaseClient
        .from("products")
        .select(
          "id,name,category,default_bag_weight_kg,unit,active"
        )
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

  fillProductSelect(
    "purchaseProduct",
    "purchaseWeight"
  );

  fillProductSelect(
    "saleProduct",
    "saleWeight"
  );
}


/* =========================
   PRODUCT DROPDOWNS
========================= */

function fillProductSelect(
  selectId,
  weightId
) {

  const select = $(selectId);

  if (!select) {
    return;
  }

  select.innerHTML =
    '<option value="">اختر الصنف...</option>';

  products.forEach(product => {

    const option =
      document.createElement("option");

    option.value = product.id;

    option.textContent =
      `${product.name} — ${product.category || ""}`;

    select.appendChild(option);
  });

  select.onchange = () => {

    const product =
      products.find(
        p => p.id === select.value
      );

    $(weightId).value =
      product?.default_bag_weight_kg ?? "";
  };
}


/* =========================
   WINDOWS
========================= */

function open(id) {

  document
    .querySelectorAll(".module")
    .forEach(x =>
      x.classList.add("hidden")
    );

  $(id).classList.remove("hidden");

  if (id === "inventoryWindow") {
    loadInventory();
  }

  if (id === "purchasesWindow") {
    loadPurchases();
  }

  if (id === "salesWindow") {
    loadSales();
  }

  if (id === "peopleWindow") {
    loadPeople();
  }
}


document
  .querySelectorAll("[data-window]")
  .forEach(b => {

    b.onclick = () =>
      open(b.dataset.window);

  });


document
  .querySelectorAll(".close")
  .forEach(b => {

    b.onclick = () =>
      b.closest(".module")
        .classList.add("hidden");

  });


/* =========================
   INVENTORY
========================= */

async function loadInventory() {

  try {

    status(
      "inventoryStatus",
      "جارٍ التحميل..."
    );

    const d =
      await api("get_inventory");

    const rows =
      Array.isArray(d)
        ? d
        : (
            d.inventory ||
            d.data ||
            d.result ||
            []
          );

    /*
      عرض المخزون الفعلي فقط.
      أي منتج لديه 0 أكياس و0 كغ لن يظهر.
    */

    const availableRows =
      rows.filter(x => {

        const bags =
          Number(x.bags || 0);

        const weight =
          Number(x.weight_kg || 0);

        return bags > 0 || weight > 0;
      });

    window.inventoryRows =
      availableRows;

    $("inventoryTableBody").innerHTML =
      availableRows
        .map(x => `
          <tr>
            <td>${esc(x.name)}</td>
            <td>${esc(x.category)}</td>
            <td>${esc(x.bags)}</td>
            <td>${esc(x.weight_kg)}</td>
            <td>${esc(x.default_bag_weight_kg)}</td>
            <td>${esc(x.unit)}</td>
          </tr>
        `)
        .join("");

    status(
      "inventoryStatus",
      `تم تحميل ${availableRows.length} منتج متوفر.`
    );

  } catch (e) {

    status(
      "inventoryStatus",
      e.message
    );
  }
}


/* =========================
   PURCHASES
========================= */

async function loadPurchases() {

  try {

    const d =
      await api(
        "get_purchase_report",
        {
          from_date: "2000-01-01",
          to_date: today()
        }
      );

    const rows =
      Array.isArray(d)
        ? d
        : (
            d.purchases ||
            d.data ||
            d.result ||
            []
          );

    window.purchaseRows =
      rows;

    $("purchasesTableBody").innerHTML =
      rows
        .map(x => `
          <tr>
            <td>${esc(x.invoice_number)}</td>
            <td>${esc(x.purchase_date)}</td>
            <td>${esc(x.currency)}</td>
            <td>${esc(x.total_amount)}</td>
            <td>${esc(x.notes)}</td>
          </tr>
        `)
        .join("");

    status(
      "purchasesStatus",
      `تم تحميل ${rows.length} عملية.`
    );

  } catch (e) {

    status(
      "purchasesStatus",
      e.message
    );
  }
}


/* =========================
   SALES
========================= */

async function loadSales() {

  try {

    const d =
      await api(
        "get_sales_report",
        {
          from_date: "2000-01-01",
          to_date: today()
        }
      );

    const rows =
      Array.isArray(d)
        ? d
        : (
            d.sales ||
            d.data ||
            d.result ||
            []
          );

    window.saleRows =
      rows;

    $("salesTableBody").innerHTML =
      rows
        .map(x => `
          <tr>
            <td>${esc(x.invoice_number)}</td>
            <td>${esc(x.sale_date)}</td>
            <td>${esc(x.currency)}</td>
            <td>${esc(x.total_amount)}</td>
            <td>${esc(x.notes)}</td>
          </tr>
        `)
        .join("");

    status(
      "salesStatus",
      `تم تحميل ${rows.length} عملية.`
    );

  } catch (e) {

    status(
      "salesStatus",
      e.message
    );
  }
}


/* =========================
   CUSTOMERS / SUPPLIERS
========================= */

async function loadPeople() {

  try {

    const c =
      await supabaseClient
        .from("customers")
        .select("name,phone,address")
        .order("name");

    const s =
      await supabaseClient
        .from("suppliers")
        .select("name,phone,address")
        .order("name");

    if (c.error) {
      throw c.error;
    }

    if (s.error) {
      throw s.error;
    }

    $("customersTableBody").innerHTML =
      (c.data || [])
        .map(x => `
          <tr>
            <td>${esc(x.name)}</td>
            <td>${esc(x.phone)}</td>
            <td>${esc(x.address)}</td>
          </tr>
        `)
        .join("");

    $("suppliersTableBody").innerHTML =
      (s.data || [])
        .map(x => `
          <tr>
            <td>${esc(x.name)}</td>
            <td>${esc(x.phone)}</td>
            <td>${esc(x.address)}</td>
          </tr>
        `)
        .join("");

    status(
      "peopleStatus",
      `العملاء: ${c.data.length} — الموردون: ${s.data.length}`
    );

  } catch (e) {

    status(
      "peopleStatus",
      e.message
    );
  }
}


/* =========================
   RENDER ITEMS
========================= */

function render(type) {

  const a =
    type === "p"
      ? purchaseItems
      : saleItems;

  $(
    type === "p"
      ? "purchaseItemsBody"
      : "saleItemsBody"
  ).innerHTML =
    a
      .map(
        (x, i) => `
          <tr>
            <td>${esc(x.name)}</td>
            <td>${x.bags}</td>
            <td>${x.weight}</td>
            <td>${x.price}</td>
            <td>
              ${(x.bags * x.weight * x.price).toFixed(2)}
            </td>
            <td>
              <button
                class="secondary remove"
                data-t="${type}"
                data-i="${i}"
              >
                حذف
              </button>
            </td>
          </tr>
        `
      )
      .join("");

  document
    .querySelectorAll(".remove")
    .forEach(b => {

      b.onclick = () => {

        (
          b.dataset.t === "p"
            ? purchaseItems
            : saleItems
        ).splice(
          +b.dataset.i,
          1
        );

        render(b.dataset.t);
      };

    });
}


/* =========================
   NEW PURCHASE
========================= */

$("newPurchaseBtn").onclick = () => {

  $("purchaseFormContainer")
    .classList.remove("hidden");

  $("purchaseDate").value =
    today();

  fillProductSelect(
    "purchaseProduct",
    "purchaseWeight"
  );
};


/* =========================
   CANCEL PURCHASE
========================= */

$("cancelPurchaseBtn").onclick = () => {

  $("purchaseFormContainer")
    .classList.add("hidden");

  purchaseItems = [];

  render("p");

  $("purchaseProduct").value = "";
  $("purchaseWeight").value = "";
};


/* =========================
   NEW SALE
========================= */

$("newSaleBtn").onclick = () => {

  $("saleFormContainer")
    .classList.remove("hidden");

  $("saleDate").value =
    today();

  fillProductSelect(
    "saleProduct",
    "saleWeight"
  );
};


/* =========================
   CANCEL SALE
========================= */

$("cancelSaleBtn").onclick = () => {

  $("saleFormContainer")
    .classList.add("hidden");

  saleItems = [];

  render("s");

  $("saleProduct").value = "";
  $("saleWeight").value = "";
};


/* =========================
   ADD PURCHASE ITEM
========================= */

$("addPurchaseItemBtn").onclick = () => {

  const productId =
    $("purchaseProduct").value;

  const p =
    products.find(
      x => x.id === productId
    );

  if (!p) {

    return status(
      "purchaseFormStatus",
      "اختر منتجًا صحيحًا."
    );
  }

  const bags =
    +$("purchaseBags").value;

  const w =
    +$("purchaseWeight").value ||
    +p.default_bag_weight_kg;

  const price =
    +$("purchaseUnitPrice").value;

  if (
    !(bags > 0 && w > 0 && price >= 0)
  ) {

    return status(
      "purchaseFormStatus",
      "أدخل البيانات."
    );
  }

  purchaseItems.push({
    product_id: p.id,
    name: p.name,
    bags,
    weight: w,
    price
  });

  render("p");

  $("purchaseProduct").value = "";
  $("purchaseBags").value = "";
  $("purchaseWeight").value = "";
  $("purchaseUnitPrice").value = "";

  status(
    "purchaseFormStatus",
    ""
  );
};


/* =========================
   ADD SALE ITEM
========================= */

$("addSaleItemBtn").onclick = () => {

  const productId =
    $("saleProduct").value;

  const p =
    products.find(
      x => x.id === productId
    );

  if (!p) {

    return status(
      "saleFormStatus",
      "اختر منتجًا صحيحًا."
    );
  }

  const bags =
    +$("saleBags").value;

  const w =
    +$("saleWeight").value ||
    +p.default_bag_weight_kg;

  const price =
    +$("saleUnitPrice").value;

  if (
    !(bags > 0 && w > 0 && price >= 0)
  ) {

    return status(
      "saleFormStatus",
      "أدخل البيانات."
    );
  }

  saleItems.push({
    product_id: p.id,
    name: p.name,
    bags,
    weight: w,
    price
  });

  render("s");

  $("saleProduct").value = "";
  $("saleBags").value = "";
  $("saleWeight").value = "";
  $("saleUnitPrice").value = "";

  status(
    "saleFormStatus",
    ""
  );
};


/* =========================
   SAVE PURCHASE
========================= */

$("purchaseForm").onsubmit =
  async e => {

    e.preventDefault();

    if (!purchaseItems.length) {

      return status(
        "purchaseFormStatus",
        "أضف منتجًا."
      );
    }

    try {

      status(
        "purchaseFormStatus",
        "جارٍ الحفظ..."
      );

      await api(
        "creat_purchase",
        {
          invoice_number:
            $("purchaseInvoice").value,

          purchase_date:
            $("purchaseDate").value ||
            today(),

          currency:
            "MRU",

          notes:
            $("purchaseNotes").value,

          items:
            purchaseItems.map(x => ({
              product_id:
                x.product_id,

              bags:
                x.bags,

              weight_per_bag_kg:
                x.weight,

              unit_price:
                x.price
            }))
        }
      );

      status(
        "purchaseFormStatus",
        "تم الحفظ."
      );

      await loadPurchases();
      await loadInventory();

    } catch (e) {

      status(
        "purchaseFormStatus",
        e.message
      );
    }
  };


/* =========================
   SAVE SALE
========================= */

$("saleForm").onsubmit =
  async e => {

    e.preventDefault();

    if (!saleItems.length) {

      return status(
        "saleFormStatus",
        "أضف منتجًا."
      );
    }

    try {

      const name =
        $("saleCustomer")
          .value
          .trim();

      const q =
        await supabaseClient
          .from("customers")
          .select("id")
          .ilike("name", name)
          .limit(1)
          .maybeSingle();

      if (!q.data) {

        throw Error(
          "العميل غير موجود في قاعدة البيانات."
        );
      }

      status(
        "saleFormStatus",
        "جارٍ الحفظ..."
      );

      await api(
        "creat_seal",
        {
          invoice_number:
            $("saleInvoice").value,

          customer_id:
            q.data.id,

          sale_date:
            $("saleDate").value ||
            today(),

          currency:
            $("saleCurrency").value,

          notes:
            $("saleNotes").value,

          items:
            saleItems.map(x => ({
              product_id:
                x.product_id,

              bags:
                x.bags,

              weight_per_bag_kg:
                x.weight,

              unit_price:
                x.price
            }))
        }
      );

      status(
        "saleFormStatus",
        "تم الحفظ."
      );

      await loadSales();
      await loadInventory();

    } catch (e) {

      status(
        "saleFormStatus",
        e.message
      );
    }
  };


/* =========================
   REPORTS
========================= */

async function report(type) {

  try {

    status(
      "reportsStatus",
      "جارٍ إنشاء التقرير..."
    );

    let d;

    if (type === "p") {

      d =
        await api(
          "get_purchase_report",
          {
            from_date:
              $("reportFrom").value,

            to_date:
              $("reportTo").value
          }
        );
    }

    if (type === "s") {

      d =
        await api(
          "get_sales_report",
          {
            from_date:
              $("reportFrom").value,

            to_date:
              $("reportTo").value
          }
        );
    }

    if (type === "f") {

      d =
        await api(
          "get_financial_summary",
          {
            from_date:
              $("reportFrom").value,

            to_date:
              $("reportTo").value
          }
        );
    }

    if (type === "m") {

      return status(
        "reportsStatus",
        "لطلب حركة منتج محدد استخدم Bonapeche AI."
      );
    }

    window.lastReport =
      d;

    $("reportResult")
      .textContent =
      JSON.stringify(
        d,
        null,
        2
      );

    status(
      "reportsStatus",
      "تم التقرير."
    );

  } catch (e) {

    status(
      "reportsStatus",
      e.message
    );
  }
}


$("purchaseReportBtn").onclick =
  () => report("p");

$("salesReportBtn").onclick =
  () => report("s");

$("financialReportBtn").onclick =
  () => report("f");

$("movementReportBtn").onclick =
  () => report("m");


/* =========================
   AI
========================= */

$("sendBtn").onclick =
  async () => {

    const message =
      $("message")
        .value
        .trim();

    if (!message) {
      return;
    }

    try {

      status(
        "chatStatus",
        "جارٍ الإرسال..."
      );

      const d =
        await api(
          "bonapeche_api",
          {
            message
          }
        );

      $("response")
        .textContent =
        d.reply ||
        d.error ||
        JSON.stringify(
          d,
          null,
          2
        );

      status(
        "chatStatus",
        "تم."
      );

    } catch (e) {

      status(
        "chatStatus",
        e.message
      );

      $("response")
        .textContent =
        e.message;
    }
  };


document
  .querySelectorAll(".example")
  .forEach(x => {

    x.onclick = () => {

      $("message")
        .value =
        x.textContent;

      $("sendBtn").click();
    };

  });


/* =========================
   EXPORT
========================= */

function csv(rows) {

  if (!rows?.length) {
    return "";
  }

  const k =
    [
      ...new Set(
        rows.flatMap(
          x => Object.keys(x)
        )
      )
    ];

  return [
    k.join(","),
    ...rows.map(
      x =>
        k
          .map(
            y =>
              `"${String(
                x[y] ?? ""
              ).replaceAll(
                '"',
                '""'
              )}"`
          )
          .join(",")
    )
  ].join("\n");
}


function dl(n, c) {

  const a =
    document.createElement("a");

  a.href =
    URL.createObjectURL(
      new Blob(
        [c],
        { type: "text/csv" }
      )
    );

  a.download = n;

  a.click();
}


$("exportInventoryBtn").onclick =
  () =>
    dl(
      "bonapeche-inventory.csv",
      csv(window.inventoryRows)
    );


$("exportPurchasesBtn").onclick =
  () =>
    dl(
      "bonapeche-purchases.csv",
      csv(window.purchaseRows)
    );


$("exportSalesBtn").onclick =
  () =>
    dl(
      "bonapeche-sales.csv",
      csv(window.saleRows)
    );


$("exportReportExcelBtn").onclick =
  () =>
    dl(
      "bonapeche-report.csv",
      JSON.stringify(
        window.lastReport || {},
        null,
        2
      )
    );


$("exportReportPdfBtn").onclick =
  () => print();


$("refreshInventoryBtn").onclick =
  loadInventory;

$("refreshPurchasesBtn").onclick =
  loadPurchases;

$("refreshSalesBtn").onclick =
  loadSales;

$("refreshPeopleBtn").onclick =
  loadPeople;


/* =========================
   LOGIN FORM
========================= */

$("loginForm").onsubmit =
  async e => {

    e.preventDefault();

    status(
      "loginStatus",
      "جارٍ الدخول..."
    );

    const { error } =
      await supabaseClient.auth
        .signInWithPassword({
          email:
            $("email")
              .value
              .trim(),

          password:
            $("password").value
        });

    if (error) {

      return status(
        "loginStatus",
        error.message
      );
    }

    loggedIn();

    try {

      await loadProducts();

    } catch (e) {

      console.error(e);

    }
  };


/* =========================
   LOGOUT
========================= */

$("logoutBtn").onclick =
  async () => {

    await supabaseClient.auth
      .signOut();

    loggedOut();
  };


/* =========================
   SESSION
========================= */

(async () => {

  const {
    data: { session }
  } =
    await supabaseClient.auth
      .getSession();

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
   DEFAULT DATES
========================= */

$("reportFrom").value =
  `${new Date().getFullYear()}-01-01`;

$("reportTo").value =
  today();

$("purchaseDate").value =
  today();

$("saleDate").value =
  today();
