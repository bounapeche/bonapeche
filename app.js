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
// ELEMENTS
// =====================================================

const loginView =
  document.getElementById("loginView");

const chatView =
  document.getElementById("chatView");

const logoutBtn =
  document.getElementById("logoutBtn");

const loginBtn =
  document.getElementById("loginBtn");

const sendBtn =
  document.getElementById("sendBtn");

const email =
  document.getElementById("email");

const password =
  document.getElementById("password");

const message =
  document.getElementById("message");

const responseBox =
  document.getElementById("response");

const loginStatus =
  document.getElementById("loginStatus");

const chatStatus =
  document.getElementById("chatStatus");


// =====================================================
// LOGIN
// =====================================================

function showLoggedIn() {
  loginView.classList.add("hidden");
  chatView.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
}

function showLoggedOut() {
  loginView.classList.remove("hidden");
  chatView.classList.add("hidden");
  logoutBtn.classList.add("hidden");
}


// =====================================================
// LOGIN BUTTON
// =====================================================

loginBtn.addEventListener(
  "click",
  async () => {

    loginStatus.textContent =
      "جارٍ تسجيل الدخول...";

    const { error } =
      await supabaseClient.auth.signInWithPassword({
        email: email.value.trim(),
        password: password.value
      });

    if (error) {
      loginStatus.textContent =
        error.message;
      return;
    }

    loginStatus.textContent = "";

    showLoggedIn();

    await initializeBusinessWindows();
  }
);


// =====================================================
// LOGOUT
// =====================================================

logoutBtn.addEventListener(
  "click",
  async () => {

    await supabaseClient.auth.signOut();

    showLoggedOut();
  }
);


// =====================================================
// AI REQUEST
// =====================================================

async function sendAgentMessage(text) {

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!session) {

    showLoggedOut();

    throw new Error(
      "انتهت جلسة تسجيل الدخول."
    );
  }

  const res =
    await fetch(
      `${SUPABASE_URL}/functions/v1/bonapeche_api`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          "Authorization":
            `Bearer ${session.access_token}`
        },

        body: JSON.stringify({
          message: text
        })
      }
    );

  const data =
    await res.json().catch(() => ({}));

  if (!res.ok) {

    throw new Error(
      data.error ||
      `HTTP ${res.status}`
    );
  }

  return data;
}


// =====================================================
// DISPLAY RESULT
// =====================================================

function displayResult(
  elementId,
  data
) {

  const element =
    document.getElementById(elementId);

  if (!element) return;

  element.textContent =
    data.reply ||
    data.error ||
    JSON.stringify(
      data,
      null,
      2
    );
}


// =====================================================
// INVENTORY - FICHE STOCK
// =====================================================

let currentInventoryData = [];


// -----------------------------------------------------
// Extract JSON from AI response
// -----------------------------------------------------

function extractJsonArray(text) {

  if (!text) return null;

  let raw =
    String(text)
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

  try {

    const parsed =
      JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (
      parsed &&
      Array.isArray(parsed.products)
    ) {
      return parsed.products;
    }

    if (
      parsed &&
      Array.isArray(parsed.inventory)
    ) {
      return parsed.inventory;
    }

  } catch (_) {
    // Continue with bracket extraction
  }


  const start =
    raw.indexOf("[");

  const end =
    raw.lastIndexOf("]");

  if (
    start !== -1 &&
    end !== -1 &&
    end > start
  ) {

    try {

      const parsed =
        JSON.parse(
          raw.substring(
            start,
            end + 1
          )
        );

      if (Array.isArray(parsed)) {
        return parsed;
      }

    } catch (_) {
      return null;
    }
  }

  return null;
}


// -----------------------------------------------------
// Render stock table
// -----------------------------------------------------

function renderInventoryTable(products) {

  const result =
    document.getElementById(
      "inventoryResult"
    );

  if (!result) return;


  const rows =
    Array.isArray(products)
      ? products
      : [];


  currentInventoryData =
    rows.map(product => ({
      name:
        product.name || "",
      bags:
        Number(
          product.bags ??
          product.number_of_bags ??
          0
        ),
      weight_kg:
        Number(
          product.weight_kg ??
          product.total_weight_kg ??
          product.weight ??
          0
        )
    }));


  const totalBags =
    currentInventoryData.reduce(
      (sum, product) =>
        sum + Number(product.bags || 0),
      0
    );


  const totalWeight =
    currentInventoryData.reduce(
      (sum, product) =>
        sum + Number(product.weight_kg || 0),
      0
    );


  let html = `

    <div class="stock-sheet">

      <div class="stock-sheet-header">

        <div>
          <h3>📦 FICHE STOCK</h3>
          <div class="stock-date">
            Bonapeche
          </div>
        </div>

        <div class="stock-actions">

          <button
            type="button"
            id="refreshInventoryBtn"
            class="stock-action-btn"
          >
            🔄 تحديث
          </button>

          <button
            type="button"
            id="exportStockExcelBtn"
            class="stock-action-btn"
          >
            📥 Excel
          </button>

        </div>

      </div>

      <div class="stock-table-wrap">

        <table
          class="stock-table"
          id="bonapecheStockTable"
        >

          <thead>

            <tr>

              <th>
                Produit
              </th>

              <th>
                Nombre de sacs
              </th>

              <th>
                Poids total (kg)
              </th>

            </tr>

          </thead>

          <tbody>
  `;


  if (!currentInventoryData.length) {

    html += `

      <tr>

        <td
          colspan="3"
          class="stock-empty"
        >
          لا توجد بيانات مخزون.
        </td>

      </tr>

    `;

  } else {

    currentInventoryData.forEach(
      product => {

        html += `

          <tr>

            <td>
              ${escapeHtml(
                product.name
              )}
            </td>

            <td>
              ${formatNumber(
                product.bags
              )}
            </td>

            <td>
              ${formatNumber(
                product.weight_kg
              )}
            </td>

          </tr>

        `;
      }
    );
  }


  html += `

          </tbody>

          <tfoot>

            <tr>

              <th>
                TOTAL
              </th>

              <th>
                ${formatNumber(totalBags)}
              </th>

              <th>
                ${formatNumber(totalWeight)}
              </th>

            </tr>

          </tfoot>

        </table>

      </div>

    </div>

  `;


  result.innerHTML =
    html;


  const refreshBtn =
    document.getElementById(
      "refreshInventoryBtn"
    );

  if (refreshBtn) {

    refreshBtn.addEventListener(
      "click",
      async event => {

        event.stopPropagation();

        await loadInventory();
      }
    );
  }


  const excelBtn =
    document.getElementById(
      "exportStockExcelBtn"
    );

  if (excelBtn) {

    excelBtn.addEventListener(
      "click",
      async event => {

        event.stopPropagation();

        await exportStockExcel();
      }
    );
  }
}


// -----------------------------------------------------
// Inventory loader
// -----------------------------------------------------

async function loadInventory() {

  const result =
    document.getElementById(
      "inventoryResult"
    );

  if (!result) return;


  result.innerHTML = `

    <div class="stock-loading">
      جارٍ تحميل Fiche Stock...
    </div>

  `;


  try {

    /*
      نطلب من AI البيانات بصيغة JSON فقط.
      لا نعرض الرد النصي مباشرة.
    */

    const data =
      await sendAgentMessage(
        `استخدم get_inventory للحصول على المخزون الحالي بالكامل من قاعدة البيانات.

أعد جميع المنتجات الموجودة فعلياً في قاعدة البيانات.

أعد JSON فقط بدون Markdown وبدون شرح.

الشكل المطلوب بالضبط:

[
  {
    "name": "ABAE",
    "bags": 0,
    "weight_kg": 0
  }
]

لكل منتج:
name = اسم المنتج الحقيقي
bags = عدد الأكياس الحالي
weight_kg = الوزن الإجمالي الحالي بالكيلوغرام

لا تخترع أي منتج.
لا تحذف أي منتج من نتيجة المخزون.
`
      );


    const products =
      extractJsonArray(
        data.reply
      );


    if (!products) {

      throw new Error(
        "تعذر قراءة بيانات المخزون بصيغة منظمة."
      );
    }


    renderInventoryTable(
      products
    );

  } catch (err) {

    result.innerHTML = `

      <div class="business-error">

        حدث خطأ أثناء تحميل المخزون:

        <br><br>

        ${escapeHtml(
          err.message
        )}

      </div>

    `;
  }
}


// =====================================================
// PURCHASE REPORT
// =====================================================

async function loadPurchases() {

  const result =
    document.getElementById(
      "purchasesResult"
    );

  if (!result) return;

  result.textContent =
    "جارٍ تحميل المشتريات...";

  try {

    const data =
      await sendAgentMessage(
        "أعطني تقرير المشتريات من قاعدة البيانات. استخدم get_purchase_report. اعرض الفواتير والتاريخ ورقم الفاتورة والعملة والمبلغ والمنتجات وعدد الأكياس والوزن. لا تخترع أي بيانات."
      );

    displayResult(
      "purchasesResult",
      data
    );

  } catch (err) {

    result.textContent =
      "حدث خطأ أثناء تحميل المشتريات: " +
      err.message;
  }
}


// =====================================================
// SALES REPORT
// =====================================================

async function loadSales() {

  const result =
    document.getElementById(
      "salesResult"
    );

  if (!result) return;

  result.textContent =
    "جارٍ تحميل المبيعات...";

  try {

    const data =
      await sendAgentMessage(
        "أعطني تقرير المبيعات من قاعدة البيانات. استخدم get_sales_report. اعرض الفواتير والتاريخ ورقم الفاتورة والعملة والمبلغ والمنتجات وعدد الأكياس والوزن. لا تخترع أي بيانات."
      );

    displayResult(
      "salesResult",
      data
    );

  } catch (err) {

    result.textContent =
      "حدث خطأ أثناء تحميل المبيعات: " +
      err.message;
  }
}


// =====================================================
// PEOPLE
// =====================================================

async function loadPeople() {

  const result =
    document.getElementById(
      "peopleResult"
    );

  if (!result) return;

  result.textContent =
    "جارٍ تحميل البيانات...";

  try {

    const data =
      await sendAgentMessage(
        "أعطني بيانات العملاء والموردين الموجودة فعلياً في قاعدة البيانات. استخدم الأدوات المتاحة فقط. لا تخترع أي بيانات."
      );

    displayResult(
      "peopleResult",
      data
    );

  } catch (err) {

    result.textContent =
      "حدث خطأ: " +
      err.message;
  }
}


// =====================================================
// REPORTS
// =====================================================

async function loadReports() {

  const result =
    document.getElementById(
      "reportsResult"
    );

  if (!result) return;

  result.textContent =
    "جارٍ تحميل التقارير...";

  try {

    const data =
      await sendAgentMessage(
        "أعطني ملخص التقارير المالية وحركة المنتجات من قاعدة البيانات. استخدم get_financial_summary وget_product_movement حسب الحاجة. لا تخترع أي بيانات."
      );

    displayResult(
      "reportsResult",
      data
    );

  } catch (err) {

    result.textContent =
      "حدث خطأ أثناء تحميل التقارير: " +
      err.message;
  }
}


// =====================================================
// PRODUCT LIST
// =====================================================

let bonapecheProducts = [];


// -----------------------------------------------------
// Load ALL products
// -----------------------------------------------------

async function loadProducts() {

  if (
    Array.isArray(
      bonapecheProducts
    ) &&
    bonapecheProducts.length > 0
  ) {

    return bonapecheProducts;
  }


  // ---------------------------------------------------
  // DIRECT DATABASE
  //
  // مهم:
  // لا نطلب 100 صف فقط.
  // نستخدم صفحات حتى نحصل على جميع المنتجات.
  // ---------------------------------------------------

  try {

    const {
      data: { session }
    } =
      await supabaseClient.auth.getSession();


    if (session) {

      let allProducts = [];

      const pageSize = 100;

      let from = 0;


      while (true) {

        const to =
          from + pageSize - 1;


        const {
          data,
          error
        } =
          await supabaseClient
            .from("products")
            .select(
              "id,name,category,default_bag_weight_kg,unit"
            )
            .eq("active", true)
            .order("name")
            .range(
              from,
              to
            );


        if (error) {

          throw error;
        }


        if (
          !Array.isArray(data) ||
          data.length === 0
        ) {

          break;
        }


        allProducts =
          allProducts.concat(
            data
          );


        if (
          data.length <
          pageSize
        ) {

          break;
        }


        from +=
          pageSize;


        /*
          حماية إضافية:
          لا نستمر بلا نهاية.
        */

        if (from >= 2000) {
          break;
        }
      }


      if (
        allProducts.length > 0
      ) {

        /*
          إزالة أي تكرار حسب UUID.
        */

        const unique =
          new Map();


        allProducts.forEach(
          product => {

            if (
              product &&
              product.id
            ) {

              unique.set(
                product.id,
                product
              );
            }
          }
        );


        bonapecheProducts =
          Array.from(
            unique.values()
          );


        console.log(
          "Bonapeche products loaded:",
          bonapecheProducts.length
        );


        return bonapecheProducts;
      }
    }

  } catch (error) {

    console.log(
      "Direct products read unavailable:",
      error
    );
  }


  // ---------------------------------------------------
  // AI FALLBACK
  // ---------------------------------------------------

  const data =
    await sendAgentMessage(
      `استخدم get_inventory للحصول على قائمة جميع المنتجات الموجودة فعلياً في قاعدة البيانات.

أعد النتيجة فقط بصيغة JSON صحيحة تماماً، بدون Markdown وبدون شرح.

الشكل المطلوب:

[
  {
    "id": "UUID",
    "name": "PRODUCT NAME",
    "category": "CATEGORY",
    "default_bag_weight_kg": 20,
    "unit": "bag"
  }
]

يجب أن تتضمن القائمة جميع المنتجات الموجودة فعلياً في قاعدة البيانات.
القائمة الحالية تحتوي على 144 منتجاً.
لا تخترع أي منتج.
`
    );


  const parsed =
    extractJsonArray(
      data.reply
    );


  if (
    Array.isArray(parsed) &&
    parsed.length > 0
  ) {

    bonapecheProducts =
      parsed;

    console.log(
      "Bonapeche products loaded through AI:",
      bonapecheProducts.length
    );


    return bonapecheProducts;
  }


  throw new Error(
    "تعذر تحميل قائمة المنتجات من قاعدة البيانات."
  );
}


// =====================================================
// PRODUCT AUTOCOMPLETE
// =====================================================

function createProductAutocomplete(
  input,
  list,
  onSelect
) {

  let selectedProduct =
    null;


  input.addEventListener(
    "input",
    async () => {

      selectedProduct = null;

      list.innerHTML = "";


      const query =
        input.value
          .trim()
          .toUpperCase();


      if (!query) {

        list.classList.add(
          "hidden"
        );

        return;
      }


      try {

        const products =
          await loadProducts();


        const matches =
          products
            .filter(
              product =>
                String(
                  product.name || ""
                )
                  .toUpperCase()
                  .startsWith(
                    query
                  )
            )
            .slice(
              0,
              20
            );


        if (
          !matches.length
        ) {

          list.innerHTML =
            "<div class=\"no-product\">لا يوجد منتج مطابق</div>";

          list.classList.remove(
            "hidden"
          );

          return;
        }


        matches.forEach(
          product => {

            const item =
              document.createElement(
                "button"
              );


            item.type =
              "button";


            item.textContent =
              product.name;


            item.className =
              "product-option";


            item.addEventListener(
              "click",
              () => {

                selectedProduct =
                  product;


                input.value =
                  product.name;


                list.innerHTML =
                  "";


                list.classList.add(
                  "hidden"
                );


                onSelect(
                  product
                );
              }
            );


            list.appendChild(
              item
            );
          }
        );


        list.classList.remove(
          "hidden"
        );


      } catch (error) {

        list.innerHTML =
          `<div class="no-product">${escapeHtml(
            error.message
          )}</div>`;


        list.classList.remove(
          "hidden"
        );
      }
    }
  );


  return () =>
    selectedProduct;
}


// =====================================================
// BUSINESS FORM STYLE
// =====================================================

function addBusinessStyles() {

  if (
    document.getElementById(
      "bonapecheBusinessStyles"
    )
  ) {

    return;
  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "bonapecheBusinessStyles";


  style.textContent = `

    .bonapeche-form {
      margin-top: 18px;
      padding: 16px;
      border: 1px solid #344760;
      border-radius: 12px;
      background: #0d1624;
    }

    .bonapeche-form h3 {
      margin-top: 0;
      margin-bottom: 12px;
    }

    .bonapeche-form input,
    .bonapeche-form select {
      width: 100%;
      margin: 6px 0;
      padding: 12px;
      border-radius: 9px;
      border: 1px solid #344760;
      background: #121c2b;
      color: white;
      font-size: 16px;
      box-sizing: border-box;
    }

    .product-search-wrap {
      position: relative;
    }

    .product-options {
      position: absolute;
      z-index: 50;
      top: 100%;
      right: 0;
      left: 0;
      background: #121c2b;
      border: 1px solid #344760;
      border-radius: 8px;
      overflow: hidden;
      max-height: 300px;
      overflow-y: auto;
    }

    .product-option {
      width: 100%;
      margin: 0;
      padding: 11px;
      border: 0;
      border-bottom: 1px solid #26364c;
      border-radius: 0;
      background: #121c2b;
      color: white;
      text-align: right;
      cursor: pointer;
      font-size: 15px;
    }

    .product-option:hover {
      background: #26364c;
    }

    .no-product {
      padding: 12px;
      color: #bbb;
      text-align: right;
    }

    .selected-product {
      margin: 8px 0;
      padding: 10px;
      border-radius: 8px;
      background: #121c2b;
      border: 1px solid #344760;
    }

    .business-message {
      margin-top: 10px;
      white-space: pre-wrap;
    }

    /* ================================================
       STOCK SHEET
       ================================================ */

    .stock-sheet {
      margin-top: 12px;
      width: 100%;
      box-sizing: border-box;
      background: white;
      color: #111;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #c9c9c9;
    }

    .stock-sheet-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 15px;
      background: #f1f3f5;
      border-bottom: 1px solid #c9c9c9;
    }

    .stock-sheet-header h3 {
      margin: 0;
      color: #111;
      font-size: 20px;
    }

    .stock-date {
      margin-top: 4px;
      color: #666;
      font-size: 13px;
    }

    .stock-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .stock-action-btn {
      border: 1px solid #aaa;
      background: white;
      color: #111;
      border-radius: 7px;
      padding: 9px 12px;
      cursor: pointer;
      font-size: 14px;
    }

    .stock-action-btn:hover {
      background: #e8e8e8;
    }

    .stock-table-wrap {
      width: 100%;
      overflow-x: auto;
    }

    .stock-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 420px;
      direction: ltr;
    }

    .stock-table th,
    .stock-table td {
      border: 1px solid #cfcfcf;
      padding: 9px 10px;
      text-align: left;
      white-space: nowrap;
    }

    .stock-table thead th {
      background: #dfe3e8;
      font-weight: 700;
    }

    .stock-table tbody tr:nth-child(even) {
      background: #f7f7f7;
    }

    .stock-table tbody tr:hover {
      background: #eef3f8;
    }

    .stock-table tfoot th {
      background: #e2e2e2;
      font-weight: 700;
    }

    .stock-empty {
      text-align: center !important;
      padding: 25px !important;
    }

    .stock-loading {
      padding: 25px;
      text-align: center;
    }

    .business-error {
      padding: 15px;
      border-radius: 8px;
      background: #3a1820;
      color: white;
    }

  `;


  document.head.appendChild(
    style
  );
}


// =====================================================
// PURCHASE FORM
// =====================================================

function createPurchaseForm() {

  const windowElement =
    document.getElementById(
      "purchasesWindow"
    );

  if (!windowElement) return;


  if (
    document.getElementById(
      "bonapechePurchaseForm"
    )
  ) {

    return;
  }


  const form =
    document.createElement(
      "div"
    );


  form.id =
    "bonapechePurchaseForm";


  form.className =
    "bonapeche-form";


  form.innerHTML = `

    <h3>🛒 تسجيل شراء جديد</h3>

    <input
      id="purchaseInvoice"
      type="text"
      placeholder="رقم الفاتورة"
    >

    <input
      id="purchaseSupplier"
      type="text"
      placeholder="اسم المورد أو UUID المورد"
    >

    <div class="product-search-wrap">

      <input
        id="purchaseProduct"
        type="text"
        autocomplete="off"
        placeholder="اكتب أول أحرف اسم المنتج"
      >

      <div
        id="purchaseProductOptions"
        class="product-options hidden"
      ></div>

    </div>

    <div
      id="purchaseSelectedProduct"
      class="selected-product"
    >
      لم يتم اختيار منتج
    </div>

    <input
      id="purchaseBags"
      type="number"
      min="1"
      step="1"
      placeholder="عدد الأكياس"
    >

    <input
      id="purchaseWeight"
      type="number"
      min="0"
      step="0.01"
      placeholder="وزن الكيس بالكيلوغرام"
      readonly
    >

    <input
      id="purchasePrice"
      type="number"
      min="0"
      step="0.01"
      placeholder="سعر الكيلوغرام"
    >

    <select id="purchaseCurrency">

      <option value="MRU">
        MRU
      </option>

    </select>

    <button
      id="savePurchaseBtn"
      type="button"
    >
      حفظ عملية الشراء
    </button>

    <div
      id="purchaseMessage"
      class="business-message"
    ></div>

  `;


  const result =
    document.getElementById(
      "purchasesResult"
    );


  if (result) {

    result.parentNode.insertBefore(
      form,
      result
    );

  } else {

    windowElement.appendChild(
      form
    );
  }


  const productInput =
    document.getElementById(
      "purchaseProduct"
    );


  const options =
    document.getElementById(
      "purchaseProductOptions"
    );


  const selected =
    document.getElementById(
      "purchaseSelectedProduct"
    );


  let selectedProduct =
    null;


  createProductAutocomplete(
    productInput,
    options,
    product => {

      selectedProduct =
        product;


      selected.textContent =
        `${product.name} — ${product.default_bag_weight_kg} كغ/كيس`;


      document.getElement
