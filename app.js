const SUPABASE_URL="https://beiohysvrabslnrlhwqp.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_81jK7ng9q3KI2TNsPTcUNQ_PkuNJpJ5";
const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const $=id=>document.getElementById(id);
let products=[],purchaseItems=[],saleItems=[];
const today=()=>new Date().toISOString().slice(0,10);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function status(id,x){$(id).textContent=x||""}
function loggedIn(){
  $('loginView').classList.add('hidden');
  $('appView').classList.remove('hidden');
  $('logoutBtn').classList.remove('hidden')
}
function loggedOut(){
  $('loginView').classList.remove('hidden');
  $('appView').classList.add('hidden');
  $('logoutBtn').classList.add('hidden')
}
async function api(fn,body={}){
  const {data:{session}}=await supabaseClient.auth.getSession();
  if(!session)throw Error('انتهت جلسة الدخول.');
  const r=await fetch(`${SUPABASE_URL}/functions/v1/${fn}`,{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'Authorization':`Bearer ${session.access_token}`
    },
    body:JSON.stringify(body)
  });
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(d.error||d.message||`HTTP ${r.status}`);
  return d
}
async function loadProducts(){
  let out=[],from=0;
  for(;;){
    const q=await supabaseClient
      .from('products')
      .select('id,name,category,default_bag_weight_kg,unit,active')
      .eq('active',true)
      .order('name')
      .range(from,from+999);
    if(q.error)throw q.error;
    out.push(...q.data);
    if(q.data.length<1000)break;
    from+=1000
  }
  products=out
}
function open(id){
  document.querySelectorAll('.module').forEach(x=>x.classList.add('hidden'));
  $(id).classList.remove('hidden');
  if(id==='inventoryWindow')loadInventory();
  if(id==='purchasesWindow')loadPurchases();
  if(id==='salesWindow')loadSales();
  if(id==='peopleWindow')loadPeople()
}
document.querySelectorAll('[data-window]').forEach(b=>b.onclick=()=>open(b.dataset.window));
document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.closest('.module').classList.add('hidden'));

async function loadInventory(){
  try{
    status('inventoryStatus','جارٍ التحميل...');
    const d=await api('get_inventory');
    const rows=Array.isArray(d)?d:(d.inventory||d.data||d.result||[]);
    window.inventoryRows=rows;
    $('inventoryTableBody').innerHTML=rows.map(x=>
      `<tr>
        <td>${esc(x.name)}</td>
        <td>${esc(x.category)}</td>
        <td>${esc(x.bags)}</td>
        <td>${esc(x.weight_kg)}</td>
        <td>${esc(x.default_bag_weight_kg)}</td>
        <td>${esc(x.unit)}</td>
      </tr>`
    ).join('');
    status('inventoryStatus',`تم تحميل ${rows.length} منتج.`)
  }catch(e){
    status('inventoryStatus',e.message)
  }
}

async function loadPurchases(){
  try{
    const d=await api('get_purchase_report',{
      from_date:'2000-01-01',
      to_date:today()
    });
    const rows=Array.isArray(d)?d:(d.purchases||d.data||d.result||[]);
    window.purchaseRows=rows;
    $('purchasesTableBody').innerHTML=rows.map(x=>
      `<tr>
        <td>${esc(x.invoice_number)}</td>
        <td>${esc(x.purchase_date)}</td>
        <td>${esc(x.currency)}</td>
        <td>${esc(x.total_amount)}</td>
        <td>${esc(x.notes)}</td>
      </tr>`
    ).join('');
    status('purchasesStatus',`تم تحميل ${rows.length} عملية.`)
  }catch(e){
    status('purchasesStatus',e.message)
  }
}

async function loadSales(){
  try{
    const d=await api('get_sales_report',{
      from_date:'2000-01-01',
      to_date:today()
    });
    const rows=Array.isArray(d)?d:(d.sales||d.data||d.result||[]);
    window.saleRows=rows;
    $('salesTableBody').innerHTML=rows.map(x=>
      `<tr>
        <td>${esc(x.invoice_number)}</td>
        <td>${esc(x.sale_date)}</td>
        <td>${esc(x.currency)}</td>
        <td>${esc(x.total_amount)}</td>
        <td>${esc(x.notes)}</td>
      </tr>`
    ).join('');
    status('salesStatus',`تم تحميل ${rows.length} عملية.`)
  }catch(e){
    status('salesStatus',e.message)
  }
}

async function loadPeople(){
  try{
    const c=await supabaseClient
      .from('customers')
      .select('name,phone,address')
      .order('name');

    const s=await supabaseClient
      .from('suppliers')
      .select('name,phone,address')
      .order('name');

    if(c.error)throw c.error;
    if(s.error)throw s.error;

    $('customersTableBody').innerHTML=(c.data||[]).map(x=>
      `<tr>
        <td>${esc(x.name)}</td>
        <td>${esc(x.phone)}</td>
        <td>${esc(x.address)}</td>
      </tr>`
    ).join('');

    $('suppliersTableBody').innerHTML=(s.data||[]).map(x=>
      `<tr>
        <td>${esc(x.name)}</td>
        <td>${esc(x.phone)}</td>
        <td>${esc(x.address)}</td>
      </tr>`
    ).join('');

    status('peopleStatus',`العملاء: ${c.data.length} — الموردون: ${s.data.length}`)
  }catch(e){
    status('peopleStatus',e.message)
  }
}

/* =====================================================
   اقتراحات المنتجات
   تظهر فقط بعد كتابة 3 أحرف
   ===================================================== */
function auto(input,box,weight){
  const i=$(input),b=$(box);

  i.oninput=()=>{
    i.dataset.id='';

    const q=i.value.trim().toUpperCase();

    if(q.length<3){
      b.innerHTML='';
      b.classList.add('hidden');
      return
    }

    const a=products
      .filter(p=>p.name.toUpperCase().includes(q))
      .slice(0,20);

    b.innerHTML=a.map(p=>
      `<div class="suggestion" data-id="${p.id}">
        ${esc(p.name)} — ${esc(p.category)}
      </div>`
    ).join('');

    b.classList.toggle('hidden',!a.length);

    b.querySelectorAll('.suggestion').forEach(x=>
      x.onclick=()=>{
        const p=products.find(z=>z.id===x.dataset.id);
        if(!p)return;

        i.value=p.name;
        i.dataset.id=p.id;
        $(weight).value=p.default_bag_weight_kg;
        b.classList.add('hidden')
      }
    )
  }
}

function render(type){
  const a=type==='p'?purchaseItems:saleItems;

  $(type==='p'?'purchaseItemsBody':'saleItemsBody').innerHTML=a.map((x,i)=>
    `<tr>
      <td>${esc(x.name)}</td>
      <td>${x.bags}</td>
      <td>${x.weight}</td>
      <td>${x.price}</td>
      <td>${(x.bags*x.weight*x.price).toFixed(2)}</td>
      <td>
        <button class="secondary remove" data-t="${type}" data-i="${i}">
          حذف
        </button>
      </td>
    </tr>`
  ).join('');

  document.querySelectorAll('.remove').forEach(b=>
    b.onclick=()=>{
      (b.dataset.t==='p'?purchaseItems:saleItems)
        .splice(+b.dataset.i,1);
      render(b.dataset.t)
    }
  )
}

$('newPurchaseBtn').onclick=()=>{
  $('purchaseFormContainer').classList.remove('hidden');
  $('purchaseDate').value=today()
};

$('cancelPurchaseBtn').onclick=()=>{
  $('purchaseFormContainer').classList.add('hidden');
  purchaseItems=[];
  render('p')
};

$('newSaleBtn').onclick=()=>{
  $('saleFormContainer').classList.remove('hidden');
  $('saleDate').value=today()
};

$('cancelSaleBtn').onclick=()=>{
  $('saleFormContainer').classList.add('hidden');
  saleItems=[];
  render('s')
};

$('addPurchaseItemBtn').onclick=()=>{
  const p=products.find(
    x=>x.id===$('purchaseProduct').dataset.id ||
       x.name.toUpperCase()===$('purchaseProduct').value.toUpperCase()
  );

  if(!p)return status(
    'purchaseFormStatus',
    'اختر منتجًا صحيحًا.'
  );

  const bags=+$('purchaseBags').value;
  const w=+$('purchaseWeight').value||+p.default_bag_weight_kg;
  const price=+$('purchaseUnitPrice').value;

  if(!(bags>0&&w>0&&price>=0))
    return status('purchaseFormStatus','أدخل البيانات.');

  purchaseItems.push({
    product_id:p.id,
    name:p.name,
    bags,
    weight:w,
    price
  });

  render('p');

  $('purchaseProduct').value='';
  $('purchaseProduct').dataset.id='';
  $('purchaseBags').value='';
  $('purchaseUnitPrice').value=''
};

$('addSaleItemBtn').onclick=()=>{
  const p=products.find(
    x=>x.id===$('saleProduct').dataset.id ||
       x.name.toUpperCase()===$('saleProduct').value.toUpperCase()
  );

  if(!p)return status(
    'saleFormStatus',
    'اختر منتجًا صحيحًا.'
  );

  const bags=+$('saleBags').value;
  const w=+$('saleWeight').value||+p.default_bag
