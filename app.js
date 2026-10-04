const SUPABASE_URL = "https://beiohysvrabslnrlhwqp.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_81jK7ng9q3KI2TNsPTcUNQ_PkuNJ5";

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

const esc = value =>
  String(value ?? "").replace(
    /[&<>"']/g,
    c =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[c]
  );

function status(id, message) {
  const el = $(id);
  if (el) el.textContent = message || "";
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

  const response = await fetch(
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

  const data =
    await response.json().catch(() => ({}));

  if (!response.ok) {
    throw Error(
      data.error ||
      data.message ||
      `HTTP ${response.status}`
    );
  }

  return data;
}


/* =========================
   LOAD PRODUCTS
========================= */

async function loadProducts() {

  let output = [];
  let from = 0;

  for (;;) {

    const query =
      await supabaseClient
        .from("products")
        .select(
          "id,name,category,default_bag_weight_kg,unit,active"
        )
        .eq("active", true)
        .order("name")
        .range(from, from + 999);

    if (query.error) {
      throw query.error;
    }

    output.push(...(query.data || []));

    if (!query.data || query.data.length < 1000) {
      break;
    }

    from += 1000;
  }

  products = output;

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
   PRODUCT SELECTS
========================= */

function fillProductSelect(
  selectId,
  weightId
) {

  const select = $(selectId);

  if (!select) return;

  select.innerHTML =
    `<option value="">اختر الصنف...</option>`;

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

    if (!product) {

      if ($(weightId)) {
        $(weightId).value = "";
      }

      return;
    }

    if ($(weightId)) {
      $(weightId).value =
        product.default_bag_weight_kg ?? "";
    }
  };
}


/* =========================
   WINDOWS
========================= */

function openWindow(id) {

  document
    .querySelectorAll(".module")
    .forEach(x =>
      x.classList.add("hidden")
    );

  const windowElement = $(id);

  if (!windowElement) return;

  windowElement.classList.remove("hidden");

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
  .forEach(button => {

    button.onclick = () =>
      openWindow(button.dataset.window);

  });


document
  .querySelectorAll(".close")
  .forEach(button => {

    button.onclick = () => {

      const module =
        button.closest(".module");

      if (module) {
        module.classList.add("hidden");
      }

    };

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

    const data =
      await api("get_inventory");

    const rows =
      Array.isArray(data)
        ? data
        : (
            data.inventory ||
            data.data ||
            data.result ||
            []
          );


    /*
      عرض المنتجات التي لديها
      مخزون فعلي فقط
    */

    const available =
      rows.filter(row => {

        const bags =
          Number(row.bags || 0);

        const weight =
          Number(row.weight_kg || 0);

        return bags > 0 || weight > 0;

      });


    window.inventoryRows = available;


    $("inventoryTableBody").innerHTML =
      available
        .map(row => `
          <tr>
            <td>${esc(row.name)}</td>
            <td>${esc(row.category)}</td>
            <td>${esc(row.bags)}</td>
            <td>${esc(row.weight_kg)}</td>
            <td>${esc(row.default_bag_weight_kg)}</td>
            <td>${esc(row.unit)}</td>
          </tr>
        `)
        .join("");


    status(
      "inventoryStatus",
      `تم تحميل ${available.length} منتج لديه مخزون.`
    );

  } catch (error) {

    status(
      "inventoryStatus",
      error.message
    );

  }
}


/* =========================
   PURCHASE REPORT
========================= */

async function loadPurchases() {

  try {

    const data =
      await api(
        "get_purchase_report",
        {
          from_date: "2000-01-01",
          to_date: today()
        }
      );

    const rows =
      Array.isArray(data)
        ? data
        : (
            data.purchases ||
            data.data ||
            data.result ||
            []
          );

    window.purchaseRows = rows;

    $("purchasesTableBody").innerHTML =
      rows
        .map(row => `
          <tr>
            <td>${esc(row.invoice_number)}</td>
            <td>${esc(row.purchase_date)}</td>
            <td>${esc(row.currency)}</td>
            <td>${esc(row.total_amount)}</td>
            <td>${esc(row.notes)}</td>
          </tr>
        `)
        .join("");

    status(
      "purchasesStatus",
      `تم تحميل ${rows.length} عملية.`
    );

  } catch (error) {

    status(
      "purchasesStatus",
      error.message
    );

  }
}


/* =========================
   SALES REPORT
========================= */

async function loadSales() {

  try {

    const data =
      await api(
        "get_sales_report",
        {
          from_date: "2000-01-01",
          to_date: today()
        }
      );

    const rows =
      Array.isArray(data)
        ? data
        : (
            data.sales ||
            data.data ||
            data.result ||
            []
          );

    window.saleRows = rows;

    $("salesTableBody").innerHTML =
      rows
        .map(row => `
          <tr>
            <td>${esc(row.invoice_number)}</td>
            <td>${esc(row.sale_date)}</td>
            <td>${esc(row.currency)}</td>
            <td>${esc(row.total_amount)}</td>
            <td>${esc(row.notes)}</td>
          </tr>
        `)
        .join("");

    status(
      "salesStatus",
      `تم تحميل ${rows.length} عملية.`
    );

  } catch (error) {

    status(
      "salesStatus",
      error.message
    );

  }
}


/* =========================
   CUSTOMERS / SUPPLIERS
========================= */

async function loadPeople() {

  try {

    const customers =
      await supabaseClient
        .from("customers")
        .select("name,phone,address")
        .order("name");

    const suppliers =
      await supabaseClient
        .from("suppliers")
        .select("name,phone,address")
        .order("name");


    if (customers.error) {
      throw customers.error;
    }

    if (suppliers.error) {
      throw suppliers.error;
    }


    $("customersTableBody").innerHTML =
      (customers.data || [])
        .map(row => `
          <tr>
            <td>${esc(row.name)}</td>
            <td>${esc(row.phone)}</td>
            <td>${esc(row.address)}</td>
          </tr>
        `)
        .join("");


    $("suppliersTableBody").innerHTML =
      (suppliers.data || [])
        .map(row => `
          <tr>
            <td>${esc(row.name)}</td>
            <td>${esc(row.phone)}</td>
            <td>${esc(row.address)}</td>
          </tr>
        `)
        .join("");


    status(
      "peopleStatus",
      `العملاء: ${(customers.data || []).length} — الموردون: ${(suppliers.data || []).length}`
    );

  } catch (error) {

    status(
      "peopleStatus",
      error.message
    );

  }
}


/* =========================
   RENDER ITEMS
========================= */

function renderItems(type) {

  const items =
    type === "p"
      ? purchaseItems
      : saleItems;

  const body =
    $(type === "p"
      ? "purchaseItemsBody"
      : "saleItemsBody");


  body.innerHTML =
    items
      .map((item, index) => `
        <tr>

          <td>${esc(item.name)}</td>

          <td>${item.bags}</td>

          <td>${item.weight}</td>

          <td>${item.price}</td>

          <td>
            ${(item.bags * item.weight * item.price)
              .toFixed(2)}
          </td>

          <td>

            <button
              class="secondary remove"
              data-type="${type}"
              data-index="${index}">
              حذف
            </button>

          </td>

        </tr>
      `)
      .join("");


  body
    .querySelectorAll(".remove")
    .forEach(button => {

      button.onclick = () => {

        const array =
          button.dataset.type === "p"
            ? purchaseItems
            : saleItems;

        array.splice(
          Number(button.dataset.index),
          1
        );

        renderItems(
          button.dataset.type
        );

      };

    });
}


/* =========================
   NEW PURCHASE
========================= */

$("newPurchaseBtn").onclick = () => {

  $("purchaseFormContainer")
    .classList.remove("hidden");

  $("purchaseDate").value = today();

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

  renderItems("p");

};


/* =========================
   NEW SALE
========================= */

$("newSaleBtn").onclick = () => {

  $("saleFormContainer")
    .classList.remove("hidden");

  $("saleDate").value = today();

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

  renderItems("s");

};


/* =========================
   ADD PURCHASE ITEM
========================= */

$("addPurchaseItemBtn").onclick = () => {

  const productId =
    $("purchaseProduct").value;

  const product =
    products.find(
      p => p.id === productId
    );


  if (!product) {

    return status(
      "purchaseFormStatus",
      "اختر منتجًا من القائمة."
    );

  }


  const bags =
    Number($("purchaseBags").value);

  const weight =
    Number($("purchaseWeight").value) ||
    Number(product.default_bag_weight_kg);

  const price =
    Number($("purchaseUnitPrice").value);


  if (
    !(bags > 0) ||
    !(weight > 0) ||
    !(price >= 0)
  ) {

    return status(
      "purchaseFormStatus",
      "أدخل البيانات."
    );

  }


  purchaseItems.push({

    product_id: product.id,

    name: product.name,

    bags,

    weight,

    price

  });


  renderItems("p");


  $("purchaseProduct").value = "";

  $("purchaseBags").value = "";

  $("purchaseWeight").value = "";

  $("purchaseUnitPrice").value = "";

};


/* =========================
   ADD SALE ITEM
========================= */

$("addSaleItemBtn").onclick = () => {

  const productId =
    $("saleProduct").value;

  const product =
    products.find(
      p => p.id === productId
    );


  if (!product) {

    return status(
      "saleFormStatus",
      "اختر منتجًا من القائمة."
    );

  }


  const bags =
    Number($("saleBags").value);

  const weight =
    Number($("saleWeight").value) ||
    Number(product.default_bag_weight_kg);

  const price =
    Number($("saleUnitPrice").value);


  if (
    !(bags > 0) ||
    !(weight > 0) ||
    !(price >= 0)
  ) {

    return status(
      "saleFormStatus",
      "أدخل البيانات."
    );

  }


  saleItems.push({

    product_id: product.id,

    name: product.name,

    bags,

    weight,

    price

  });


  renderItems("s");


  $("saleProduct").value = "";

  $("saleBags").value = "";

  $("saleWeight").value = "";

  $("saleUnitPrice").value = "";

};


/* =========================
   SAVE PURCHASE
========================= */

$("purchaseForm").onsubmit =
  async event => {

    event.preventDefault();


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

          currency: "MRU",

          notes:
            $("purchaseNotes").value,

          items:
            purchaseItems.map(item => ({
              product_id:
                item.product_id,

              bags:
                item.bags,

              weight_per_bag_kg:
                item.weight,

              unit_price:
                item.price
            }))

        }
      );


      status(
        "purchaseFormStatus",
        "تم الحفظ."
      );


      purchaseItems = [];

      renderItems("p");

      await loadPurchases();

      await loadInventory();


    } catch (error) {

      status(
        "purchaseFormStatus",
        error.message
      );

    }

  };


/* =========================
   SAVE SALE
========================= */

$("saleForm").onsubmit =
  async event => {

    event.preventDefault();


    if (!saleItems.length) {

      return status(
        "saleFormStatus",
        "أضف منتجًا."
      );

    }


    try {

      const customerName =
        $("saleCustomer")
          .value
          .trim();


      const customer =
        await supabaseClient
          .from("customers")
          .select("id")
          .ilike(
            "name",
            customerName
          )
          .limit(1)
          .maybeSingle();


      if (!customer.data) {

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
            customer.data.id,

          sale_date:
            $("saleDate").value ||
            today(),

          currency:
            $("saleCurrency").value,

          notes:
            $("saleNotes").value,

          items:
            saleItems.map(item => ({
              product_id:
                item.product_id,

              bags:
                item.bags,

              weight_per_bag_kg:
                item.weight,

              unit_price:
                item.price
            }))

        }
      );


      status(
        "saleFormStatus",
        "تم الحفظ."
      );


      saleItems = [];

      renderItems("s");

      await loadSales();

      await loadInventory();


    } catch (error) {

      status(
        "saleFormStatus",
        error.message
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


    let data;


    if (type === "p") {

      data =
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

      data =
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

      data =
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


    window.lastReport = data;

    $("reportResult").textContent =
      JSON.stringify(
        data,
        null,
        2
      );


    status(
      "reportsStatus",
      "تم التقرير."
    );


  } catch (error) {

    status(
      "reportsStatus",
      error.message
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
      $("message").value.trim();


    if (!message) return;


    try {

      status(
        "chatStatus",
        "جارٍ الإرسال..."
      );


      const data =
        await api(
          "bonapeche_api",
          {
            message
          }
        );


      $("response").textContent =
        data.reply ||
        data.error ||
        JSON.stringify(
          data,
          null,
          2
        );


      status(
        "chatStatus",
        "تم."
      );


    } catch (error) {

      status(
        "chatStatus",
        error.message
      );

      $("response").textContent =
        error.message;

    }

  };


document
  .querySelectorAll(".example")
  .forEach(button => {

    button.onclick = () => {

      $("message").value =
        button.textContent;

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


  const keys =
    [
      ...new Set(
        rows.flatMap(
          row =>
            Object.keys(row)
        )
      )
    ];


  return [

    keys.join(","),

    ...rows.map(row =>
      keys
        .map(
          key =>
            `"${String(
              row[key] ?? ""
            ).replaceAll(
              '"',
              '""'
            )}"`
        )
        .join(",")
    )

  ].join("\n");

}


function download(
  filename,
  content
) {

  const link =
    document.createElement("a");

  link.href =
    URL.createObjectURL(
      new Blob(
        [content],
        {
          type:
            "text/csv"
        }
      )
    );

  link.download =
    filename;

  link.click();

}


$("exportInventoryBtn").onclick =
  () =>
    download(
      "bonapeche-inventory.csv",
      csv(
        window.inventoryRows
      )
    );


$("exportPurchasesBtn").onclick =
  () =>
    download(
      "bonapeche-purchases.csv",
      csv(
        window.purchaseRows
      )
    );


$("exportSalesBtn").onclick =
  () =>
    download(
      "bonapeche-sales.csv",
      csv(
        window.saleRows
      )
    );


$("exportReportExcelBtn").onclick =
  () =>
    download(
      "bonapeche-report.csv",
      JSON.stringify(
        window.lastReport || {},
        null,
        2
      )
    );


$("exportReportPdfBtn").onclick =
  () => print();


/* =========================
   REFRESH BUTTONS
========================= */

$("refreshInventoryBtn").onclick =
  loadInventory;

$("refreshPurchasesBtn").onclick =
  loadPurchases;

$("refreshSalesBtn").onclick =
  loadSales;

$("refreshPeopleBtn").onclick =
  loadPeople;


/* =========================
   LOGIN
========================= */

$("loginForm").onsubmit =
  async event => {

    event.preventDefault();


    status(
      "loginStatus",
      "جارٍ الدخول..."
    );


    const result =
      await supabaseClient.auth
        .signInWithPassword({

          email:
            $("email")
              .value
              .trim(),

          password:
            $("password").value

        });


    if (result.error) {

      return status(
        "loginStatus",
        result.error.message
      );

    }


    loggedIn();


    try {

      await loadProducts();

    } catch (error) {

      console.error(error);

      status(
        "loginStatus",
        error.message
      );

    }

  };


/* =========================
   LOGOUT
========================= */

$("logoutBtn").onclick =
  async () => {

    await supabaseClient.auth.signOut();

    loggedOut();

  };


/* =========================
   INITIALIZATION
========================= */

(async () => {

  const {
    data: { session }
  } =
    await supabaseClient.auth.getSession();


  if (session) {

    loggedIn();

    try {

      await loadProducts();

    } catch (error) {

      console.error(error);

    }

  }

})();


$("reportFrom").value =
  `${new Date().getFullYear()}-01-01`;

$("reportTo").value =
  today();

$("purchaseDate").value =
  today();

$("saleDate").value =
  today();
