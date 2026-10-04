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
// INVENTORY
// =====================================================

async function loadInventory() {

  const result =
    document.getElementById(
      "inventoryResult"
    );

  if (!result) return;

  result.textContent =
    "جارٍ تحميل المخزون...";

  try {

    const data =
      await sendAgentMessage(
        "أعطني المخزون الحالي بالكامل من قاعدة البيانات. استخدم get_inventory وأعرض اسم كل منتج وعدد الأكياس والوزن بالكيلوغرام. لا تخترع أي بيانات."
      );

    displayResult(
      "inventoryResult",
      data
    );

  } catch (err) {

    result.textContent =
      "حدث خطأ أثناء تحميل المخزون: " +
      err.message;
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


// نحاول أولاً القراءة مباشرة من جدول products.
// إذا كانت RLS تمنع القراءة، نستخدم Bonapeche AI
// للحصول على القائمة الحقيقية من get_inventory.

async function loadProducts() {

  if (bonapecheProducts.length > 0) {
    return bonapecheProducts;
  }


  // ---------------------------------------------------
  // DIRECT DATABASE
  // ---------------------------------------------------

  try {

    const {
      data: { session }
    } = await supabaseClient.auth.getSession();

    if (session) {

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
          .order("name");

      if (
        !error &&
        Array.isArray(data) &&
        data.length > 0
      ) {

        bonapecheProducts =
          data;

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
      `استخدم get_inventory للحصول على قائمة جميع المنتجات الموجودة في قاعدة البيانات.

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

يجب أن تتضمن القائمة جميع المنتجات الموجودة فعلياً في قاعدة البيانات، ولا تخترع أي منتج.`
    );


  let raw =
    data.reply ||
    data.error ||
    "";


  raw =
    raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();


  try {

    const parsed =
      JSON.parse(raw);

    if (Array.isArray(parsed)) {

      bonapecheProducts =
        parsed;

      return bonapecheProducts;
    }

  } catch (error) {

    console.error(
      "Could not parse product list:",
      error,
      raw
    );
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
        list.classList.add("hidden");
        return;
      }


      try {

        const products =
          await loadProducts();

        const matches =
          products
            .filter(
              product =>
                String(product.name || "")
                  .toUpperCase()
                  .startsWith(query)
            )
            .slice(0, 12);


        if (!matches.length) {

          list.innerHTML =
            "<div>لا يوجد منتج مطابق</div>";

          list.classList.remove("hidden");

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

                list.innerHTML = "";

                list.classList.add(
                  "hidden"
                );

                onSelect(product);
              }
            );


            list.appendChild(item);
          }
        );


        list.classList.remove(
          "hidden"
        );

      } catch (error) {

        list.innerHTML =
          `<div>${error.message}</div>`;

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
    }

    .product-option:hover {
      background: #26364c;
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
      <option value="MRU">MRU</option>
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

      document.getElementById(
        "purchaseWeight"
      ).value =
        product.default_bag_weight_kg;
    }
  );


  document
    .getElementById(
      "savePurchaseBtn"
    )
    .addEventListener(
      "click",
      async () => {

        const messageBox =
          document.getElementById(
            "purchaseMessage"
          );

        try {

          if (!selectedProduct) {

            throw new Error(
              "اختر المنتج من قائمة الاقتراحات أولاً."
            );
          }


          const invoice =
            document.getElementById(
              "purchaseInvoice"
            ).value.trim();

          const bags =
            Number(
              document.getElementById(
                "purchaseBags"
              ).value
            );

          const price =
            Number(
              document.getElementById(
                "purchasePrice"
              ).value
            );

          const supplier =
            document.getElementById(
              "purchaseSupplier"
            ).value.trim();


          if (!invoice) {
            throw new Error(
              "أدخل رقم الفاتورة."
            );
          }

          if (!bags || bags <= 0) {
            throw new Error(
              "أدخل عدد الأكياس."
            );
          }

          if (!price || price < 0) {
            throw new Error(
              "أدخل سعر الكيلوغرام."
            );
          }


          messageBox.textContent =
            "جارٍ حفظ الشراء...";


          const request =
            `سجل عملية شراء حقيقية في قاعدة البيانات.

رقم الفاتورة: ${invoice}
العملة: MRU
المورد: ${supplier || "غير محدد"}

المنتج المختار من قاعدة البيانات:
الاسم: ${selectedProduct.name}
المعرف: ${selectedProduct.id}
الفئة: ${selectedProduct.category || ""}
وزن الكيس: ${selectedProduct.default_bag_weight_kg} كغ

عدد الأكياس: ${bags}
سعر الكيلوغرام: ${price}

استخدم creat_purchase.
استخدم product_id التالي حرفياً:
${selectedProduct.id}

لا تغيّر اسم المنتج ولا تخترع منتجاً آخر.
بعد نجاح العملية أعطني نتيجة العملية بوضوح.`;


          const data =
            await sendAgentMessage(
              request
            );


          messageBox.textContent =
            data.reply ||
            data.error ||
            JSON.stringify(
              data,
              null,
              2
            );

        } catch (error) {

          messageBox.textContent =
            "خطأ: " +
            error.message;
        }
      }
    );
}


// =====================================================
// SALE FORM
// =====================================================

function createSaleForm() {

  const windowElement =
    document.getElementById(
      "salesWindow"
    );

  if (!windowElement) return;

  if (
    document.getElementById(
      "bonapecheSaleForm"
    )
  ) {
    return;
  }


  const form =
    document.createElement(
      "div"
    );

  form.id =
    "bonapecheSaleForm";

  form.className =
    "bonapeche-form";


  form.innerHTML = `

    <h3>💰 تسجيل بيع جديد</h3>

    <input
      id="saleInvoice"
      type="text"
      placeholder="رقم الفاتورة"
    >

    <input
      id="saleCustomer"
      type="text"
      placeholder="اسم العميل أو UUID العميل"
    >

    <div class="product-search-wrap">

      <input
        id="saleProduct"
        type="text"
        autocomplete="off"
        placeholder="اكتب أول أحرف اسم المنتج"
      >

      <div
        id="saleProductOptions"
        class="product-options hidden"
      ></div>

    </div>

    <div
      id="saleSelectedProduct"
      class="selected-product"
    >
      لم يتم اختيار منتج
    </div>

    <input
      id="saleBags"
      type="number"
      min="1"
      step="1"
      placeholder="عدد الأكياس"
    >

    <input
      id="saleWeight"
      type="number"
      min="0"
      step="0.01"
      placeholder="وزن الكيس بالكيلوغرام"
      readonly
    >

    <input
      id="salePrice"
      type="number"
      min="0"
      step="0.01"
      placeholder="سعر البيع لكل كيلوغرام"
    >

    <select id="saleCurrency">

      <option value="USD">
        USD
      </option>

      <option value="EUR">
        EUR
      </option>

    </select>

    <button
      id="saveSaleBtn"
      type="button"
    >
      حفظ عملية البيع
    </button>

    <div
      id="saleMessage"
      class="business-message"
    ></div>

  `;


  const result =
    document.getElementById(
      "salesResult"
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
      "saleProduct"
    );

  const options =
    document.getElementById(
      "saleProductOptions"
    );

  const selected =
    document.getElementById(
      "saleSelectedProduct"
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

      document.getElementById(
        "saleWeight"
      ).value =
        product.default_bag_weight_kg;
    }
  );


  document
    .getElementById(
      "saveSaleBtn"
    )
    .addEventListener(
      "click",
      async () => {

        const messageBox =
          document.getElementById(
            "saleMessage"
          );

        try {

          if (!selectedProduct) {

            throw new Error(
              "اختر المنتج من قائمة الاقتراحات أولاً."
            );
          }


          const invoice =
            document.getElementById(
              "saleInvoice"
            ).value.trim();

          const customer =
            document.getElementById(
              "saleCustomer"
            ).value.trim();

          const bags =
            Number(
              document.getElementById(
                "saleBags"
              ).value
            );

          const price =
            Number(
              document.getElementById(
                "salePrice"
              ).value
            );

          const currency =
            document.getElementById(
              "saleCurrency"
            ).value;


          if (!invoice) {
            throw new Error(
              "أدخل رقم الفاتورة."
            );
          }

          if (!customer) {
            throw new Error(
              "أدخل العميل أو UUID العميل."
            );
          }

          if (!bags || bags <= 0) {
            throw new Error(
              "أدخل عدد الأكياس."
            );
          }

          if (!price || price < 0) {
            throw new Error(
              "أدخل سعر البيع."
            );
          }


          messageBox.textContent =
            "جارٍ حفظ البيع...";


          const request =
            `سجل عملية بيع حقيقية في قاعدة البيانات.

رقم الفاتورة: ${invoice}
العملة: ${currency}
العميل: ${customer}

المنتج المختار من قاعدة البيانات:
الاسم: ${selectedProduct.name}
المعرف: ${selectedProduct.id}
الفئة: ${selectedProduct.category || ""}
وزن الكيس: ${selectedProduct.default_bag_weight_kg} كغ

عدد الأكياس: ${bags}
سعر البيع لكل كيلوغرام: ${price}

استخدم creat_seal.
استخدم product_id التالي حرفياً:
${selectedProduct.id}

لا تغيّر اسم المنتج ولا تخترع منتجاً آخر.
تحقق من المخزون قبل البيع.
إذا كان المخزون غير كافٍ فلا تنفذ البيع.
بعد نجاح العملية أعطني نتيجة العملية بوضوح.`;


          const data =
            await sendAgentMessage(
              request
            );


          messageBox.textContent =
            data.reply ||
            data.error ||
            JSON.stringify(
              data,
              null,
              2
            );

        } catch (error) {

          messageBox.textContent =
            "خطأ: " +
            error.message;
        }
      }
    );
}


// =====================================================
// EXCEL
// =====================================================

function exportExcel() {

  const status =
    document.getElementById(
      "excelStatus"
    );

  const sections = [
    ["المخزون", "inventoryResult"],
    ["المشتريات", "purchasesResult"],
    ["المبيعات", "salesResult"],
    ["الأشخاص", "peopleResult"],
    ["التقارير", "reportsResult"]
  ];

  let csv =
    "القسم,البيانات\n";


  sections.forEach(
    ([title, id]) => {

      const element =
        document.getElementById(
          id
        );

      if (!element) return;

      const text =
        element.innerText
          .replace(/\r?\n/g, " ")
          .replace(/"/g, '""');

      if (!text.trim()) return;

      csv +=
        `"${title}","${text}"\n`;
    }
  );


  const blob =
    new Blob(
      ["\uFEFF" + csv],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const link =
    document.createElement(
      "a"
    );

  link.href =
    url;

  link.download =
    "bonapeche-report.csv";

  document.body.appendChild(
    link
  );

  link.click();

  link.remove();

  URL.revokeObjectURL(
    url
  );


  if (status) {

    status.textContent =
      "تم تصدير التقرير.";
  }
}


// =====================================================
// PDF
// =====================================================

function exportPDF() {

  const status =
    document.getElementById(
      "pdfStatus"
    );

  const sections = [
    ["المخزون", "inventoryResult"],
    ["المشتريات", "purchasesResult"],
    ["المبيعات", "salesResult"],
    ["الأشخاص", "peopleResult"],
    ["التقارير", "reportsResult"]
  ];


  let content = "";


  sections.forEach(
    ([title, id]) => {

      const element =
        document.getElementById(
          id
        );

      if (!element) return;

      const text =
        element.innerText.trim();

      if (!text) return;

      content +=
        `<h2>${title}</h2>`;

      content +=
        `<pre>${text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
        }</pre>`;
    }
  );


  if (!content) {

    if (status) {

      status.textContent =
        "لا توجد بيانات للتصدير.";
    }

    return;
  }


  const printWindow =
    window.open(
      "",
      "_blank"
    );


  if (!printWindow) {

    if (status) {

      status.textContent =
        "تعذر فتح نافذة الطباعة.";
    }

    return;
  }


  printWindow.document.write(`

    <!DOCTYPE html>

    <html
      lang="ar"
      dir="rtl"
    >

    <head>

      <meta charset="UTF-8">

      <title>
        Bonapeche Report
      </title>

      <style>

        body {
          font-family: Arial, sans-serif;
          padding: 30px;
          direction: rtl;
        }

        h1 {
          text-align: center;
        }

        h2 {
          margin-top: 30px;
          border-bottom: 1px solid #ccc;
          padding-bottom: 8px;
        }

        pre {
          white-space: pre-wrap;
          font-family: Arial, sans-serif;
          line-height: 1.8;
        }

      </style>

    </head>

    <body>

      <h1>
        Bonapeche
      </h1>

      ${content}

    </body>

    </html>
  `);


  printWindow.document.close();

  printWindow.focus();


  setTimeout(
    () => {
      printWindow.print();
    },
    500
  );


  if (status) {

    status.textContent =
      "تم تجهيز التقرير للطباعة أو الحفظ PDF.";
  }
}


// =====================================================
// AI CHAT
// =====================================================

sendBtn.addEventListener(
  "click",
  async () => {

    const text =
      message.value.trim();

    if (!text) return;

    chatStatus.textContent =
      "جارٍ إرسال الطلب...";

    responseBox.textContent = "";

    try {

      const data =
        await sendAgentMessage(
          text
        );

      responseBox.textContent =
        data.reply ||
        data.error ||
        JSON.stringify(
          data,
          null,
          2
        );

      chatStatus.textContent =
        "تم";

    } catch (err) {

      chatStatus.textContent =
        "حدث خطأ";

      responseBox.textContent =
        err.message;
    }
  }
);


// =====================================================
// DASHBOARD NAVIGATION
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    addBusinessStyles();


    // INVENTORY
    const inventoryCard =
      document.querySelector(
        '[data-window="inventoryWindow"]'
      );

    if (inventoryCard) {

      inventoryCard.addEventListener(
        "click",
        loadInventory
      );
    }


    // PURCHASES
    const purchasesCard =
      document.querySelector(
        '[data-window="purchasesWindow"]'
      );

    if (purchasesCard) {

      purchasesCard.addEventListener(
        "click",
        async () => {

          await loadPurchases();

          createPurchaseForm();
        }
      );
    }


    // SALES
    const salesCard =
      document.querySelector(
        '[data-window="salesWindow"]'
      );

    if (salesCard) {

      salesCard.addEventListener(
        "click",
        async () => {

          await loadSales();

          createSaleForm();
        }
      );
    }


    // PEOPLE
    const peopleCard =
      document.querySelector(
        '[data-window="peopleWindow"]'
      );

    if (peopleCard) {

      peopleCard.addEventListener(
        "click",
        loadPeople
      );
    }


    // REPORTS
    const reportsCard =
      document.querySelector(
        '[data-window="reportsWindow"]'
      );

    if (reportsCard) {

      reportsCard.addEventListener(
        "click",
        loadReports
      );
    }


    // EXCEL
    const exportExcelBtn =
      document.getElementById(
        "exportExcelBtn"
      );

    if (exportExcelBtn) {

      exportExcelBtn.addEventListener(
        "click",
        exportExcel
      );
    }


    // PDF
    const exportPdfBtn =
      document.getElementById(
        "exportPdfBtn"
      );

    if (exportPdfBtn) {

      exportPdfBtn.addEventListener(
        "click",
        exportPDF
      );
    }


    // Prepare forms if windows already exist
    createPurchaseForm();
    createSaleForm();
  }
);


// =====================================================
// INITIAL SESSION
// =====================================================

(async () => {

  const {
    data: { session }
  } =
    await supabaseClient.auth.getSession();


  if (session) {

    showLoggedIn();

    addBusinessStyles();

    createPurchaseForm();

    createSaleForm();

  } else {

    showLoggedOut();

  }

})();
