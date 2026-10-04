const SUPABASE_URL =
  "https://beiohysvrabslnrlhwqp.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_81jK7ng9q3KI2TNsPTcUNQ_PkuNJpJ5";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

// =====================================================
// STATE
// =====================================================

const $ = (id) =>
  document.getElementById(id);

let products = [];
let purchaseItems = [];
let saleItems = [];

window.inventoryRows = [];
window.purchaseRows = [];
window.saleRows = [];
window.lastReport = null;

// =====================================================
// HELPERS
// =====================================================

function today() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    })[char]
  );
}

function status(id, message) {
  const element = $(id);

  if (element) {
    element.textContent =
      message || "";
  }
}

// =====================================================
// LOGIN
// =====================================================

function loggedIn() {
  $("loginView").classList.add(
    "hidden"
  );

  $("appView").classList.remove(
    "hidden"
  );

  $("logoutBtn").classList.remove(
    "hidden"
  );
}

function loggedOut() {
  $("loginView").classList.remove(
    "hidden"
  );

  $("appView").classList.add(
    "hidden"
  );

  $("logoutBtn").classList.add(
    "hidden"
  );
}

// =====================================================
// API
// =====================================================

async function api(
  functionName,
  body = {}
) {
  const {
    data: { session },
  } =
    await supabaseClient.auth.getSession();

  if (!session) {
    throw new Error(
      "انتهت جلسة الدخول. يرجى تسجيل الدخول من جديد."
    );
  }

  const response =
    await fetch(
      `${SUPABASE_URL}/functions/v1/${functionName}`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${session.access_token}`,
        },

        body: JSON.stringify(body),
      }
    );

  const data =
    await response
      .json()
      .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
        data.message ||
        `HTTP ${response.status}`
    );
  }

  return data;
}

// =====================================================
// LOAD PRODUCTS
// =====================================================

async function loadProducts() {
  let allProducts = [];
  let from = 0;

  while (true) {
    const query =
      await supabaseClient
        .from("products")
        .select(
          "id,name,category,default_bag_weight_kg,unit,active"
        )
        .eq("active", true)
        .order("name")
        .range(
          from,
          from + 999
        );

    if (query.error) {
      throw query.error;
    }

    allProducts.push(
      ...(query.data || [])
    );

    if (
      (query.data || [])
        .length < 1000
    ) {
      break;
    }

    from += 1000;
  }

  products = allProducts;

  // تحديث قوائم المنتجات
  refreshProductSelect(
    "purchaseProduct"
  );

  refreshProductSelect(
    "saleProduct"
  );
}

// =====================================================
// PRODUCT SELECTS
// =====================================================

function convertProductInputToSelect(
  inputId
) {
  const input = $(inputId);

  if (!input) {
    return null;
  }

  if (
    input.tagName ===
    "SELECT"
  ) {
    return input;
  }

  const select =
    document.createElement(
      "select"
    );

  select.id = input.id;
  select.name =
    input.name || input.id;
  select.className =
    input.className;
  select.required =
    input.required;

  input.parentNode.replaceChild(
    select,
    input
  );

  return select;
}

function refreshProductSelect(
  inputId
) {
  const select =
    convertProductInputToSelect(
      inputId
    );

  if (!select) {
    return;
  }

  const currentValue =
    select.value;

  select.innerHTML =
    "";

  const placeholder =
    document.createElement(
      "option"
    );

  placeholder.value = "";
  placeholder.textContent =
    "اختر الصنف...";

  select.appendChild(
    placeholder
  );

  products.forEach(
    (product) => {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        product.id;

      option.textContent =
        `${product.name} — ${product.category}`;

      option.dataset.weight =
        product.default_bag_weight_kg;

      select.appendChild(
        option
      );
    }
  );

  if (
    currentValue &&
    products.some(
      (product) =>
        product.id ===
        currentValue
    )
  ) {
    select.value =
      currentValue;
  }
}

function setupProductSelect(
  inputId,
  weightId
) {
  const select =
    convertProductInputToSelect(
      inputId
    );

  if (!select) {
    return;
  }

  select.addEventListener(
    "change",
    () => {
      const product =
        products.find(
          (item) =>
            item.id ===
            select.value
        );

      if (!product) {
        if ($(weightId)) {
          $(weightId).value =
            "";
        }

        return;
      }

      if ($(weightId)) {
        $(weightId).value =
          product.default_bag_weight_kg;
      }
    }
  );

  refreshProductSelect(
    inputId
  );
}

// =====================================================
// SALE CURRENCIES
// =====================================================

function setupSaleCurrencies() {
  const select =
    $("saleCurrency");

  if (!select) {
    return;
  }

  select.innerHTML = "";

  const currencies = [
    {
      value: "MRU",
      label:
        "MRU — الأوقية الموريتانية الجديدة",
    },
    {
      value: "USD",
      label:
        "USD — الدولار الأمريكي",
    },
    {
      value: "EUR",
      label:
        "EUR — اليورو",
    },
  ];

  currencies.forEach(
    (currency) => {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        currency.value;

      option.textContent =
        currency.label;

      select.appendChild(
        option
      );
    }
  );

  select.value = "MRU";
}

// =====================================================
// WINDOWS
// =====================================================

function openWindow(id) {
  document
    .querySelectorAll(".module")
    .forEach(
      (element) =>
        element.classList.add(
          "hidden"
        )
    );

  const target = $(id);

  if (!target) {
    return;
  }

  target.classList.remove(
    "hidden"
  );

  if (
    id ===
    "inventoryWindow"
  ) {
    loadInventory();
  }

  if (
    id ===
    "purchasesWindow"
  ) {
    loadPurchases();
  }

  if (
    id ===
    "salesWindow"
  ) {
    loadSales();
  }

  if (
    id ===
    "peopleWindow"
  ) {
    loadPeople();
  }
}

document
  .querySelectorAll(
    "[data-window]"
  )
  .forEach((button) => {
    button.onclick =
      () => {
        openWindow(
          button.dataset.window
        );
      };
  });

document
  .querySelectorAll(".close")
  .forEach((button) => {
    button.onclick =
      () => {
        const module =
          button.closest(
            ".module"
          );

        if (module) {
          module.classList.add(
            "hidden"
          );
        }
      };
  });

// =====================================================
// INVENTORY
// =====================================================

async function loadInventory() {
  try {
    status(
      "inventoryStatus",
      "جارٍ تحميل المخزون..."
    );

    const data =
      await api(
        "get_inventory"
      );

    const allRows =
      Array.isArray(data)
        ? data
        : data.inventory ||
          data.data ||
          data.result ||
          [];

    // إظهار الموجود فقط
    const rows =
      allRows.filter(
        (item) =>
          Number(
            item.bags ?? 0
          ) > 0 &&
          Number(
            item.weight_kg ?? 0
          ) > 0
      );

    window.inventoryRows =
      rows;

    $("inventoryTableBody")
      .innerHTML =
      rows
        .map(
          (item) => `
          <tr>
            <td>${esc(
              item.name
            )}</td>

            <td>${esc(
              item.category
            )}</td>

            <td>${esc(
              item.bags
            )}</td>

            <td>${esc(
              item.weight_kg
            )}</td>

            <td>${esc(
              item.default_bag_weight_kg
            )}</td>

            <td>${esc(
              item.unit
            )}</td>
          </tr>
        `
        )
        .join("");

    status(
      "inventoryStatus",
      `المتوفر حاليًا: ${rows.length} صنف.`
    );
  } catch (error) {
    status(
      "inventoryStatus",
      `خطأ: ${error.message}`
    );
  }
}

// =====================================================
// PURCHASES
// =====================================================

async function loadPurchases() {
  try {
    status(
      "purchasesStatus",
      "جارٍ تحميل المشتريات..."
    );

    const data =
      await api(
        "get_purchase_report",
        {
          from_date:
            "2000-01-01",

          to_date:
            today(),
        }
      );

    const rows =
      Array.isArray(data)
        ? data
        : data.purchases ||
          data.data ||
          data.result ||
          [];

    window.purchaseRows =
      rows;

    $("purchasesTableBody")
      .innerHTML =
      rows
        .map(
          (item) => `
          <tr>
            <td>${esc(
              item.invoice_number
            )}</td>

            <td>${esc(
              item.purchase_date
            )}</td>

            <td>${esc(
              item.currency
            )}</td>

            <td>${esc(
              item.total_amount
            )}</td>

            <td>${esc(
              item.notes
            )}</td>
          </tr>
        `
        )
        .join("");

    status(
      "purchasesStatus",
      `تم تحميل ${rows.length} عملية.`
    );
  } catch (error) {
    status(
      "purchasesStatus",
      `خطأ: ${error.message}`
    );
  }
}

// =====================================================
// SALES
// =====================================================

async function loadSales() {
  try {
    status(
      "salesStatus",
      "جارٍ تحميل المبيعات..."
    );

    const data =
      await api(
        "get_sales_report",
        {
          from_date:
            "2000-01-01",

          to_date:
            today(),
        }
      );

    const rows =
      Array.isArray(data)
        ? data
        : data.sales ||
          data.data ||
          data.result ||
          [];

    window.saleRows =
      rows;

    $("salesTableBody")
      .innerHTML =
      rows
        .map(
          (item) => `
          <tr>
            <td>${esc(
              item.invoice_number
            )}</td>

            <td>${esc(
              item.sale_date
            )}</td>

            <td>${esc(
              item.currency
            )}</td>

            <td>${esc(
              item.total_amount
            )}</td>

            <td>${esc(
              item.notes
            )}</td>
          </tr>
        `
        )
        .join("");

    status(
      "salesStatus",
      `تم تحميل ${rows.length} عملية.`
    );
  } catch (error) {
    status(
      "salesStatus",
      `خطأ: ${error.message}`
    );
  }
}

// =====================================================
// CUSTOMERS / SUPPLIERS
// =====================================================

async function loadPeople() {
  try {
    status(
      "peopleStatus",
      "جارٍ تحميل البيانات..."
    );

    const customersQuery =
      await supabaseClient
        .from("customers")
        .select(
          "name,phone,address"
        )
        .order("name");

    const suppliersQuery =
      await supabaseClient
        .from("suppliers")
        .select(
          "name,phone,address"
        )
        .order("name");

    if (
      customersQuery.error
    ) {
      throw customersQuery.error;
    }

    if (
      suppliersQuery.error
    ) {
      throw suppliersQuery.error;
    }

    $("customersTableBody")
      .innerHTML =
      (customersQuery.data ||
        [])
        .map(
          (item) => `
          <tr>
            <td>${esc(
              item.name
            )}</td>

            <td>${esc(
              item.phone
            )}</td>

            <td>${esc(
              item.address
            )}</td>
          </tr>
        `
        )
        .join("");

    $("suppliersTableBody")
      .innerHTML =
      (suppliersQuery.data ||
        [])
        .map(
          (item) => `
          <tr>
            <td>${esc(
              item.name
            )}</td>

            <td>${esc(
              item.phone
            )}</td>

            <td>${esc(
              item.address
            )}</td>
          </tr>
        `
        )
        .join("");

    status(
      "peopleStatus",
      `العملاء: ${
        customersQuery.data
          ?.length || 0
      } — الموردون: ${
        suppliersQuery.data
          ?.length || 0
      }`
    );
  } catch (error) {
    status(
      "peopleStatus",
      `خطأ: ${error.message}`
    );
  }
}

// =====================================================
// RENDER ITEMS
// =====================================================

function renderPurchaseItems() {
  $("purchaseItemsBody")
    .innerHTML =
    purchaseItems
      .map(
        (item, index) => `
        <tr>
          <td>${esc(
            item.name
          )}</td>

          <td>${item.bags}</td>

          <td>${item.weight}</td>

          <td>${item.price}</td>

          <td>
            ${(
              item.bags *
              item.weight *
              item.price
            ).toFixed(2)}
          </td>

          <td>
            <button
              class="secondary removePurchase"
              data-index="${index}"
              type="button"
            >
              حذف
            </button>
          </td>
        </tr>
      `
      )
      .join("");

  document
    .querySelectorAll(
      ".removePurchase"
    )
    .forEach((button) => {
      button.onclick =
        () => {
          purchaseItems.splice(
            Number(
              button.dataset
                .index
            ),
            1
          );

          renderPurchaseItems();
        };
    });
}

function renderSaleItems() {
  $("saleItemsBody")
    .innerHTML =
    saleItems
      .map(
        (item, index) => `
        <tr>
          <td>${esc(
            item.name
          )}</td>

          <td>${item.bags}</td>

          <td>${item.weight}</td>

          <td>${item.price}</td>

          <td>
            ${(
              item.bags *
              item.weight *
              item.price
            ).toFixed(2)}
          </td>

          <td>
            <button
              class="secondary removeSale"
              data-index="${index}"
              type="button"
            >
              حذف
            </button>
          </td>
        </tr>
      `
      )
      .join("");

  document
    .querySelectorAll(
      ".removeSale"
    )
    .forEach((button) => {
      button.onclick =
        () => {
          saleItems.splice(
            Number(
              button.dataset
                .index
            ),
            1
          );

          renderSaleItems();
        };
    });
}

// =====================================================
// NEW PURCHASE
// =====================================================

$("newPurchaseBtn")
  .onclick = () => {
    $("purchaseFormContainer")
      .classList.remove(
        "hidden"
      );

    $("purchaseDate").value =
      today();
  };

$("cancelPurchaseBtn")
  .onclick = () => {
    $("purchaseFormContainer")
      .classList.add(
        "hidden"
      );

    purchaseItems = [];

    renderPurchaseItems();

    status(
      "purchaseFormStatus",
      ""
    );
  };

// =====================================================
// ADD PURCHASE ITEM
// =====================================================

$("addPurchaseItemBtn")
  .onclick = () => {
    const productId =
      $("purchaseProduct")
        .value;

    const product =
      products.find(
        (item) =>
          item.id ===
          productId
      );

    if (!product) {
      status(
        "purchaseFormStatus",
        "اختر صنفًا من القائمة."
      );

      return;
    }

    const bags =
      Number(
        $("purchaseBags")
          .value
      );

    const weight =
      Number(
        $("purchaseWeight")
          .value
      ) ||
      Number(
        product.default_bag_weight_kg
      );

    const price =
      Number(
        $("purchaseUnitPrice")
          .value
      );

    if (
      !(bags > 0) ||
      !(weight > 0) ||
      !(price >= 0)
    ) {
      status(
        "purchaseFormStatus",
        "أدخل عدد الأكياس والوزن والسعر."
      );

      return;
    }

    purchaseItems.push({
      product_id:
        product.id,

      name:
        product.name,

      bags,

      weight,

      price,
    });

    renderPurchaseItems();

    $("purchaseProduct")
      .value = "";

    $("purchaseBags")
      .value = "";

    $("purchaseWeight")
      .value = "";

    $("purchaseUnitPrice")
      .value = "";

    status(
      "purchaseFormStatus",
      ""
    );
  };

// =====================================================
// SAVE PURCHASE
// =====================================================

$("purchaseForm")
  .onsubmit =
  async (event) => {
    event.preventDefault();

    if (
      !purchaseItems.length
    ) {
      status(
        "purchaseFormStatus",
        "أضف منتجًا واحدًا على الأقل."
      );

      return;
    }

    try {
      status(
        "purchaseFormStatus",
        "جارٍ حفظ الشراء..."
      );

      await api(
        "creat_purchase",
        {
          invoice_number:
            $("purchaseInvoice")
              .value
              .trim(),

          purchase_date:
            $("purchaseDate")
              .value ||
            today(),

          currency:
            "MRU",

          notes:
            $("purchaseNotes")
              .value
              .trim(),

          items:
            purchaseItems.map(
              (item) => ({
                product_id:
                  item.product_id,

                bags:
                  item.bags,

                weight_per_bag_kg:
                  item.weight,

                unit_price:
                  item.price,
              })
            ),
        }
      );

      status(
        "purchaseFormStatus",
        "تم حفظ عملية الشراء بنجاح."
      );

      purchaseItems = [];

      renderPurchaseItems();

      await loadPurchases();

      await loadInventory();
    } catch (error) {
      status(
        "purchaseFormStatus",
        `خطأ: ${error.message}`
      );
    }
  };

// =====================================================
// NEW SALE
// =====================================================

$("newSaleBtn")
  .onclick = () => {
    $("saleFormContainer")
      .classList.remove(
        "hidden"
      );

    $("saleDate").value =
      today();
  };

$("cancelSaleBtn")
  .onclick = () => {
    $("saleFormContainer")
      .classList.add(
        "hidden"
      );

    saleItems = [];

    renderSaleItems();

    status(
      "saleFormStatus",
      ""
    );
  };

// =====================================================
// ADD SALE ITEM
// =====================================================

$("addSaleItemBtn")
  .onclick = () => {
    const productId =
      $("saleProduct")
        .value;

    const product =
      products.find(
        (item) =>
          item.id ===
          productId
      );

    if (!product) {
      status(
        "saleFormStatus",
        "اختر صنفًا من القائمة."
      );

      return;
    }

    const bags =
      Number(
        $("saleBags").value
      );

    const weight =
      Number(
        $("saleWeight").value
      ) ||
      Number(
        product.default_bag_weight_kg
      );

    const price =
      Number(
        $("saleUnitPrice")
          .value
      );

    if (
      !(bags > 0) ||
      !(weight > 0) ||
      !(price >= 0)
    ) {
      status(
        "saleFormStatus",
        "أدخل عدد الأكياس والوزن والسعر."
      );

      return;
    }

    saleItems.push({
      product_id:
        product.id,

      name:
        product.name,

      bags,

      weight,

      price,
    });

    renderSaleItems();

    $("saleProduct")
      .value = "";

    $("saleBags")
      .value = "";

    $("saleWeight")
      .value = "";

    $("saleUnitPrice")
      .value = "";

    status(
      "saleFormStatus",
      ""
    );
  };

// =====================================================
// SAVE SALE
// =====================================================

$("saleForm")
  .onsubmit =
  async (event) => {
    event.preventDefault();

    if (!saleItems.length) {
      status(
        "saleFormStatus",
        "أضف منتجًا واحدًا على الأقل."
      );

      return;
    }

    try {
      const customerName =
        $("saleCustomer")
          .value
          .trim();

      if (!customerName) {
        throw new Error(
          "أدخل اسم العميل."
        );
      }

      const customerQuery =
        await supabaseClient
          .from("customers")
          .select("id")
          .ilike(
            "name",
            customerName
          )
          .limit(1)
          .maybeSingle();

      if (
        customerQuery.error
      ) {
        throw customerQuery.error;
      }

      if (
        !customerQuery.data
      ) {
        throw new Error(
          "العميل غير موجود في قاعدة البيانات."
        );
      }

      const currency =
        $("saleCurrency")
          .value;

      if (
        ![
          "MRU",
          "USD",
          "EUR",
        ].includes(currency)
      ) {
        throw new Error(
          "عملة البيع غير صحيحة."
        );
      }

      status(
        "saleFormStatus",
        "جارٍ حفظ البيع..."
      );

      await api(
        "creat_seal",
        {
          invoice_number:
            $("saleInvoice")
              .value
              .trim(),

          customer_id:
            customerQuery.data
              .id,

          sale_date:
            $("saleDate")
              .value ||
            today(),

          currency,

          notes:
            $("saleNotes")
              .value
              .trim(),

          items:
            saleItems.map(
              (item) => ({
                product_id:
                  item.product_id,

                bags:
                  item.bags,

                weight_per_bag_kg:
                  item.weight,

                unit_price:
                  item.price,
              })
            ),
        }
      );

      status(
        "saleFormStatus",
        "تم حفظ عملية البيع بنجاح."
      );

      saleItems = [];

      renderSaleItems();

      await loadSales();

      await loadInventory();
    } catch (error) {
      status(
        "saleFormStatus",
        `خطأ: ${error.message}`
      );
    }
  };

// =====================================================
// REPORTS
// =====================================================

async function generateReport(
  type
) {
  try {
    status(
      "reportsStatus",
      "جارٍ إنشاء التقرير..."
    );

    const fromDate =
      $("reportFrom").value;

    const toDate =
      $("reportTo").value;

    let data;

    if (
      type === "purchases"
    ) {
      data =
        await api(
          "get_purchase_report",
          {
            from_date:
              fromDate,

            to_date:
              toDate,
          }
        );
    }

    if (type === "sales") {
      data =
        await api(
          "get_sales_report",
          {
            from_date:
              fromDate,

            to_date:
              toDate,
          }
        );
    }

    if (
      type === "financial"
    ) {
      data =
        await api(
          "get_financial_summary",
          {
            from_date:
              fromDate,

            to_date:
              toDate,
          }
        );
    }

    if (
      type === "movement"
    ) {
      status(
        "reportsStatus",
        "لحركة منتج محدد استخدم Bonapeche AI."
      );

      return;
    }

    window.lastReport =
      data;

    $("reportResult")
      .textContent =
      JSON.stringify(
        data,
        null,
        2
      );

    status(
      "reportsStatus",
      "تم إنشاء التقرير."
    );
  } catch (error) {
    status(
      "reportsStatus",
      `خطأ: ${error.message}`
    );
  }
}

$("purchaseReportBtn")
  .onclick = () =>
    generateReport(
      "purchases"
    );

$("salesReportBtn")
  .onclick = () =>
    generateReport(
      "sales"
    );

$("financialReportBtn")
  .onclick = () =>
    generateReport(
      "financial"
    );

$("movementReportBtn")
  .onclick = () =>
    generateReport(
      "movement"
    );

// =====================================================
// AI
// =====================================================

$("sendBtn")
  .onclick =
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
        "جارٍ إرسال الطلب..."
      );

      $("response")
        .textContent = "";

      const data =
        await api(
          "bonapeche_api",
          {
            message,
          }
        );

      $("response")
        .textContent =
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
      $("response")
        .textContent =
        error.message;

      status(
        "chatStatus",
        `خطأ: ${error.message}`
      );
    }
  };

document
  .querySelectorAll(
    ".example"
  )
  .forEach((button) => {
    button.onclick =
      () => {
        $("message")
          .value =
          button.textContent;

        $("sendBtn").click();
      };
  });

// =====================================================
// CSV EXPORT
// =====================================================

function csv(rows) {
  if (
    !Array.isArray(rows) ||
    !rows.length
  ) {
    return "";
  }

  const keys = [
    ...new Set(
      rows.flatMap(
        (row) =>
          Object.keys(row)
      )
    ),
  ];

  const header =
    keys.join(",");

  const body =
    rows
      .map(
        (row) =>
          keys
            .map(
              (key) =>
                `"${String(
                  row[key] ?? ""
                ).replaceAll(
                  '"',
                  '""'
                )}"`
            )
            .join(",")
      )
      .join("\n");

  return `${header}\n${body}`;
}

function downloadFile(
  filename,
  content,
  type =
    "text/csv;charset=utf-8"
) {
  const blob =
    new Blob(
      [content],
      { type }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href = url;

  link.download =
    filename;

  document.body.appendChild(
    link
  );

  link.click();

  link.remove();

  URL.revokeObjectURL(
    url
  );
}

$("exportInventoryBtn")
  .onclick = () =>
    downloadFile(
      "bonapeche-inventory.csv",
      csv(
        window.inventoryRows
      )
    );

$("exportPurchasesBtn")
  .onclick = () =>
    downloadFile(
      "bonapeche-purchases.csv",
      csv(
        window.purchaseRows
      )
    );

$("exportSalesBtn")
  .onclick = () =>
    downloadFile(
      "bonapeche-sales.csv",
      csv(
        window.saleRows
      )
    );

$("exportReportExcelBtn")
  .onclick = () =>
    downloadFile(
      "bonapeche-report.json",
      JSON.stringify(
        window.lastReport ||
          {},
        null,
        2
      ),
      "application/json;charset=utf-8"
    );

$("exportReportPdfBtn")
  .onclick = () => {
    window.print();
  };

// =====================================================
// REFRESH
// =====================================================

$("refreshInventoryBtn")
  .onclick =
  loadInventory;

$("refreshPurchasesBtn")
  .onclick =
  loadPurchases;

$("refreshSalesBtn")
  .onclick =
  loadSales;

$("refreshPeopleBtn")
  .onclick =
  loadPeople;

// =====================================================
// LOGIN
// =====================================================

$("loginForm")
  .addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const email =
        $("email")
          .value
          .trim();

      const password =
        $("password")
          .value;

      if (!email) {
        status(
          "loginStatus",
          "أدخل البريد الإلكتروني."
        );

        return;
      }

      if (!password) {
        status(
          "loginStatus",
          "أدخل كلمة المرور."
        );

        return;
      }

      const loginButton =
        $("loginBtn");

      try {
        loginButton.disabled =
          true;

        status(
          "loginStatus",
          "جارٍ تسجيل الدخول..."
        );

        const {
          data,
          error,
        } =
          await supabaseClient
            .auth
            .signInWithPassword(
              {
                email,
                password,
              }
            );

        if (error) {
          status(
            "loginStatus",
            `فشل تسجيل الدخول: ${error.message}`
          );

          return;
        }

        if (
          !data ||
          !data.session
        ) {
          status(
            "loginStatus",
            "تمت المصادقة لكن لم يتم إنشاء جلسة."
          );

          return;
        }

        loggedIn();

        status(
          "loginStatus",
          ""
        );

        try {
          await loadProducts();
        } catch (error) {
          console.error(
            "PRODUCT LOAD ERROR:",
            error
          );

          status(
            "loginStatus",
            `تم الدخول، لكن تعذر تحميل المنتجات: ${error.message}`
          );
        }
      } catch (error) {
        console.error(
          "LOGIN ERROR:",
          error
        );

        status(
          "loginStatus",
          `خطأ في تسجيل الدخول: ${error.message}`
        );
      } finally {
        loginButton.disabled =
          false;
      }
    }
  );

// =====================================================
// LOGOUT
// =====================================================

$("logoutBtn")
  .onclick =
  async () => {
    try {
      await supabaseClient
        .auth
        .signOut();
    } finally {
      loggedOut();
    }
  };

// =====================================================
// DEFAULT DATES
// =====================================================

$("reportFrom").value =
  `${new Date().getFullYear()}-01-01`;

$("reportTo").value =
  today();

$("purchaseDate").value =
  today();

$("saleDate").value =
  today();

// =====================================================
// INITIAL SETUP
// =====================================================

// تحويل خانة المنتج إلى قائمة كاملة
setupProductSelect(
  "purchaseProduct",
  "purchaseWeight"
);

setupProductSelect(
  "saleProduct",
  "saleWeight"
);

// إضافة MRU + USD + EUR
setupSaleCurrencies();

// =====================================================
// SESSION CHECK
// =====================================================

(async () => {
  try {
    const {
      data: { session },
    } =
      await supabaseClient
        .auth
        .getSession();

    if (session) {
      loggedIn();

      try {
        await loadProducts();
      } catch (error) {
        console.error(
          "PRODUCT LOAD ERROR:",
          error
        );

        status(
          "loginStatus",
          `تم استرجاع الجلسة، لكن تعذر تحميل المنتجات: ${error.message}`
        );
      }
    } else {
      loggedOut();
    }
  } catch (error) {
    console.error(
      "SESSION ERROR:",
      error
    );

    loggedOut();

    status(
      "loginStatus",
      `خطأ في الجلسة: ${error.message}`
    );
  }
})();
