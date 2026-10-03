const SUPABASE_URL =
  "https://beiohysvrabslnrlhwqp.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_81jK7ng9q3KI2TNsPTcUNQ_PkuNJpJ5";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

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
// LOAD INVENTORY
// =====================================================

async function loadInventory() {

  const inventoryResult =
    document.getElementById(
      "inventoryResult"
    );

  if (!inventoryResult) return;

  inventoryResult.textContent =
    "جارٍ تحميل المخزون...";

  try {

    const data =
      await sendAgentMessage(
        "أعطني المخزون الحالي بالكامل من قاعدة البيانات. استخدم get_inventory وأعرض اسم كل منتج وعدد الأكياس والوزن بالكيلوغرام. لا تخترع أي بيانات."
      );

    inventoryResult.textContent =
      data.reply ||
      data.error ||
      JSON.stringify(
        data,
        null,
        2
      );
  }

  catch (err) {

    inventoryResult.textContent =
      "حدث خطأ أثناء تحميل المخزون: " +
      err.message;
  }
}


// =====================================================
// DASHBOARD NAVIGATION
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

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

  }

})();
