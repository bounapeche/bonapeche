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
// DISPLAY HELPER
// =====================================================

function displayResult(elementId, data) {

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
// 📦 INVENTORY
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

  }

  catch (err) {

    result.textContent =
      "حدث خطأ أثناء تحميل المخزون: " +
      err.message;
  }
}


// =====================================================
// 🛒 PURCHASES
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

  }

  catch (err) {

    result.textContent =
      "حدث خطأ أثناء تحميل المشتريات: " +
      err.message;
  }
}


// =====================================================
// 💰 SALES
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

  }

  catch (err) {

    result.textContent =
      "حدث خطأ أثناء تحميل المبيعات: " +
      err.message;
  }
}


// =====================================================
// 👥 CUSTOMERS / SUPPLIERS
// =====================================================

async function loadPeople() {

  const result =
    document.getElementById(
      "peopleResult"
    );

  if (!result) return;

  result.textContent =
    "جارٍ تحميل بيانات العملاء والموردين...";

  try {

    const data =
      await sendAgentMessage(
        "أعطني بيانات الأشخاص الموجودة في قاعدة البيانات. استخدم get_customer عندما تكون بيانات العميل مطلوبة. اعرض العملاء والموردين الموجودين فعلياً في قاعدة البيانات فقط. لا تخترع أي بيانات، وإذا كانت هناك بيانات لا يمكن قراءتها بأداة متاحة فاذكر ذلك بوضوح."
      );

    displayResult(
      "peopleResult",
      data
    );

  }

  catch (err) {

    result.textContent =
      "حدث خطأ أثناء تحميل البيانات: " +
      err.message;
  }
}


// =====================================================
// 📊 REPORTS
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
        "أعطني ملخص التقارير المالية وحركة المنتجات من قاعدة البيانات. استخدم get_financial_summary وget_product_movement حسب الحاجة. اعرض المشتريات والمبيعات والعملات والأكياس والأوزان والحركة الداخلة والخارجة. لا تخترع أي بيانات."
      );

    displayResult(
      "reportsResult",
      data
    );

  }

  catch (err) {

    result.textContent =
      "حدث خطأ أثناء تحميل التقارير: " +
      err.message;
  }
}


// =====================================================
// 📗 EXCEL EXPORT
// =====================================================

function exportExcel() {

  const status =
    document.getElementById(
      "excelStatus"
    );

  if (!status) return;

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
    ([title, elementId]) => {

      const element =
        document.getElementById(
          elementId
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

  if (csv === "القسم,البيانات\n") {

    status.textContent =
      "لا توجد بيانات لتصديرها.";

    return;
  }

  const blob =
    new Blob(
      ["\uFEFF" + csv],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;

  link.download =
    "bonapeche-report.csv";

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);

  status.textContent =
    "تم تصدير البيانات.";
}


// =====================================================
// 📄 PDF / PRINT
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
    ([title, elementId]) => {

      const element =
        document.getElementById(
          elementId
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
        "لا توجد بيانات لتصديرها.";
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
    <html lang="ar" dir="rtl">
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

  setTimeout(() => {

    printWindow.print();

  }, 500);

  if (status) {

    status.textContent =
      "تم تجهيز التقرير للطباعة أو الحفظ PDF.";
  }
}


// =====================================================
// 🤖 AI CHAT
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
        await sendAgentMessage(text);

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

    }

    catch (err) {

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
  () => {

    // 📦 INVENTORY
    const inventoryCard =
      document.querySelector(
        '[data-window="inventoryWindow"]'
      );

    if (inventoryCard) {

      inventoryCard.addEventListener(
        "click",
        () => {
          loadInventory();
        }
      );
    }


    // 🛒 PURCHASES
    const purchasesCard =
      document.querySelector(
        '[data-window="purchasesWindow"]'
      );

    if (purchasesCard) {

      purchasesCard.addEventListener(
        "click",
        () => {
          loadPurchases();
        }
      );
    }


    // 💰 SALES
    const salesCard =
      document.querySelector(
        '[data-window="salesWindow"]'
      );

    if (salesCard) {

      salesCard.addEventListener(
        "click",
        () => {
          loadSales();
        }
      );
    }


    // 👥 PEOPLE
    const peopleCard =
      document.querySelector(
        '[data-window="peopleWindow"]'
      );

    if (peopleCard) {

      peopleCard.addEventListener(
        "click",
        () => {
          loadPeople();
        }
      );
    }


    // 📊 REPORTS
    const reportsCard =
      document.querySelector(
        '[data-window="reportsWindow"]'
      );

    if (reportsCard) {

      reportsCard.addEventListener(
        "click",
        () => {
          loadReports();
        }
      );
    }


    // 📗 EXCEL
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


    // 📄 PDF
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

  }
);


// =====================================================
// CHECK EXISTING SESSION
// =====================================================

(async () => {

  const {
    data: { session }
  } =
    await supabaseClient.auth.getSession();

  if (session) {

    showLoggedIn();

  } else {

    showLoggedOut();

  }

})();
