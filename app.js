const SUPABASE_URL="https://beiohysvrabslnrlhwqp.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_81jK7ng9q3KI2TNsPTcUNQ_PkuNJpJ5";
const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);

const loginView=document.getElementById("loginView");
const chatView=document.getElementById("chatView");
const logoutBtn=document.getElementById("logoutBtn");
const loginBtn=document.getElementById("loginBtn");
const sendBtn=document.getElementById("sendBtn");
const email=document.getElementById("email");
const password=document.getElementById("password");
const message=document.getElementById("message");
const responseBox=document.getElementById("response");
const loginStatus=document.getElementById("loginStatus");
const chatStatus=document.getElementById("chatStatus");

function showLoggedIn(){loginView.classList.add("hidden");chatView.classList.remove("hidden");logoutBtn.classList.remove("hidden")}
function showLoggedOut(){loginView.classList.remove("hidden");chatView.classList.add("hidden");logoutBtn.classList.add("hidden")}

loginBtn.addEventListener("click",async()=>{
 loginStatus.textContent="جارٍ تسجيل الدخول...";
 const {error}=await supabaseClient.auth.signInWithPassword({email:email.value.trim(),password:password.value});
 if(error){loginStatus.textContent=error.message;return}
 loginStatus.textContent="";showLoggedIn();
});

logoutBtn.addEventListener("click",async()=>{await supabaseClient.auth.signOut();showLoggedOut()});

sendBtn.addEventListener("click",async()=>{
 const text=message.value.trim(); if(!text)return;
 const {data:{session}}=await supabaseClient.auth.getSession();
 if(!session){showLoggedOut();return}
 chatStatus.textContent="جارٍ إرسال الطلب...";responseBox.textContent="";
 try{
  const res=await fetch(`${SUPABASE_URL}/functions/v1/bonapeche_api`,{
   method:"POST",
   headers:{"Content-Type":"application/json","Authorization":`Bearer ${session.access_token}`},
   body:JSON.stringify({message:text})
  });
  const data=await res.json().catch(()=>({}));
  responseBox.textContent=data.reply||data.error||JSON.stringify(data,null,2);
  chatStatus.textContent=`HTTP ${res.status}`;
 }catch(err){chatStatus.textContent="حدث خطأ في الاتصال.";responseBox.textContent=err.message}
});

(async()=>{const {data:{session}}=await supabaseClient.auth.getSession();if(session)showLoggedIn()})();
