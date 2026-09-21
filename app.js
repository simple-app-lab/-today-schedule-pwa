const KEY = "todaySchedulePWA_v1";

const defaultItems = [
  {title:"起きる", subtitle:"", icon:"☀️"},
  {title:"トイレに行く", subtitle:"", icon:"🚽"},
  {title:"お着替えをする", subtitle:"", icon:"👕"},
  {title:"朝ごはんでお出かけしてパンを食べる", subtitle:"", icon:"🍞"},
  {title:"お家に帰ってお散歩する", subtitle:"", icon:"🚶"},
  {title:"パパとママはひと休みする", subtitle:"{name}ちゃんは遊んでていいよ", icon:"🧸"},
  {title:"お昼ごはんをたべる", subtitle:"", icon:"🍚"},
  {title:"ママをショッピングモールに送る", subtitle:"", icon:"🚗"},
  {title:"{name}ちゃんは習い事にいく", subtitle:"", icon:"🎹"},
  {title:"{name}ちゃんもショッピングモールに行って遊具で遊ぶ", subtitle:"", icon:"🛝"},
  {title:"うどんを食べる", subtitle:"", icon:"🍜"},
  {title:"ママのお迎え", subtitle:"", icon:"🚗"},
  {title:"お家に帰る", subtitle:"", icon:"🏠"},
  {title:"お風呂入る", subtitle:"", icon:"🛁"},
  {title:"歯磨きする", subtitle:"", icon:"🪥"},
  {title:"おやすみ", subtitle:"", icon:"🌙"}
];

const defaultFavorites = [
  {title:"パンを食べる",subtitle:"",icon:"🍞"},
  {title:"お散歩",subtitle:"",icon:"🚶"},
  {title:"ショッピングモールで遊ぶ",subtitle:"",icon:"🛝"},
  {title:"習い事",subtitle:"",icon:"🎹"},
  {title:"うどんを食べる",subtitle:"",icon:"🍜"},
  {title:"ママのお迎え",subtitle:"",icon:"🚗"},
  {title:"お出かけ",subtitle:"",icon:"🛍️"},
  {title:"お絵描き",subtitle:"",icon:"🎨"},
  {title:"おもちゃで遊ぶ",subtitle:"",icon:"🧸"}
];

let state = loadState();
let editingIndex = null;
let dragIndex = null;

function freshState() {
  return {
    childName: "〇〇",
    today: {
      date: todayKey(),
      items: defaultItems.map(x => ({...x, done:false})),
      currentIndex: 0
    },
    template: defaultItems.map(x => ({...x})),
    favorites: defaultFavorites.map(x => ({...x})),
    yesterday: null
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshState();
    const s = JSON.parse(raw);
    if (!s.today || s.today.date !== todayKey()) {
      const oldToday = s.today;
      s.yesterday = oldToday || s.yesterday;
      s.today = {
        date: todayKey(),
        items: (s.template?.length ? s.template : defaultItems).map(x => ({...x, done:false})),
        currentIndex: 0
      };
    }
    return s;
  } catch {
    return freshState();
  }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function todayKey(d=new Date()) {
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function render() {
  const name = state.childName || "〇〇";
  document.getElementById("childGreeting").textContent = `${name}ちゃんのよてい`;

  const items = state.today.items;
  const empty = items.length === 0;
  document.getElementById("emptyState").classList.toggle("hidden", !empty);
  document.getElementById("scheduleSection").classList.toggle("hidden", empty);
  if (empty) return;

  state.today.currentIndex = Math.min(
    Math.max(0, state.today.currentIndex),
    Math.max(0, items.length-1)
  );

  const next = items.findIndex(x => !x.done);
  if (next >= 0) state.today.currentIndex = next;

  const doneCount = items.filter(x=>x.done).length;
  document.getElementById("progressText").textContent = `${doneCount} / ${items.length} できたよ`;

  const list = document.getElementById("scheduleList");
  list.innerHTML = "";

  items.forEach((item, i) => {
    const card = document.createElement("div");
    card.className = "schedule-card" + (item.done ? " done" : "") + (i===state.today.currentIndex && !item.done ? " current" : "");
    const title = replaceName(item.title);
    const subtitle = replaceName(item.subtitle || "");
    card.innerHTML = `
      <div class="state">${item.done ? "✓" : (i===state.today.currentIndex ? "★" : "○")}</div>
      <div class="item-icon">${escapeHtml(item.icon || "⭐")}</div>
      <div class="item-body">
        <div class="item-title">${escapeHtml(title)}</div>
        ${subtitle ? `<div class="item-subtitle">${escapeHtml(subtitle)}</div>` : ""}
        ${i===state.today.currentIndex && !item.done ? `<span class="current-label">★ いまだよ ★</span>` : ""}
      </div>
    `;
    list.appendChild(card);
  });

  const allDone = items.every(x=>x.done);
  document.getElementById("finishBtn").disabled = allDone;
  document.getElementById("dayDone").classList.toggle("hidden", !allDone);
  document.getElementById("undoBtn").classList.toggle("hidden", doneCount===0);
}

function replaceName(s) {
  return String(s).replaceAll("{name}", state.childName || "〇〇");
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function openModal(id){ document.getElementById(id).classList.remove("hidden"); }
function closeModal(id){ document.getElementById(id).classList.add("hidden"); }

function renderEditor() {
  const list = document.getElementById("editorList");
  list.innerHTML = "";
  state.today.items.forEach((item, i) => {
    const row = document.createElement("div");
    row.className = "editor-row";
    row.draggable = true;
    row.dataset.index = i;
    row.innerHTML = `
      <span class="drag">☰</span>
      <span class="mini-icon">${escapeHtml(item.icon || "⭐")}</span>
      <span class="editor-title">${escapeHtml(replaceName(item.title))}</span>
      <button data-action="edit" data-index="${i}" aria-label="編集">✏️</button>
      <button data-action="delete" data-index="${i}" aria-label="削除">×</button>
    `;
    row.addEventListener("dragstart", e => { dragIndex=i; e.dataTransfer.effectAllowed="move"; });
    row.addEventListener("dragover", e => e.preventDefault());
    row.addEventListener("drop", e => {
      e.preventDefault();
      const target = Number(row.dataset.index);
      if (dragIndex === null || dragIndex === target) return;
      const [moved] = state.today.items.splice(dragIndex,1);
      state.today.items.splice(target,0,moved);
      state.today.currentIndex = state.today.items.findIndex(x=>!x.done);
      if (state.today.currentIndex < 0) state.today.currentIndex=0;
      dragIndex=null;
      renderEditor(); render();
    });
    list.appendChild(row);
  });

  const fav = document.getElementById("favoriteButtons");
  fav.innerHTML = "";
  state.favorites.forEach((item,i)=>{
    const b=document.createElement("button");
    b.className="chip";
    b.textContent=`${item.icon} ${item.title}`;
    b.onclick=()=>{
      state.today.items.push({...item, done:false});
      renderEditor();
      render();
    };
    fav.appendChild(b);
  });
}

function openItemEditor(index=null) {
  editingIndex=index;
  document.getElementById("itemModalTitle").textContent = index===null ? "予定を作る" : "予定を編集";
  const item=index===null ? {title:"",subtitle:"",icon:"⭐"} : state.today.items[index];
  document.getElementById("itemTitle").value=replaceName(item.title || "");
  document.getElementById("itemSubtitle").value=replaceName(item.subtitle || "");
  document.getElementById("itemIcon").value=item.icon || "⭐";
  document.getElementById("saveAsFavorite").checked=false;
  openModal("itemModal");
}

function saveItem() {
  const title=document.getElementById("itemTitle").value.trim();
  if(!title){ alert("タイトルを入れてください。"); return; }
  const item={
    title:title.replaceAll(state.childName+"ちゃん","{name}ちゃん"),
    subtitle:document.getElementById("itemSubtitle").value.trim().replaceAll(state.childName+"ちゃん","{name}ちゃん"),
    icon:document.getElementById("itemIcon").value,
    done: editingIndex===null ? false : !!state.today.items[editingIndex].done
  };
  if(editingIndex===null) state.today.items.push(item);
  else state.today.items[editingIndex]=item;
  if(document.getElementById("saveAsFavorite").checked){
    state.favorites.push({title:item.title,subtitle:item.subtitle,icon:item.icon});
  }
  save(); closeModal("itemModal"); renderEditor(); render();
}

function confirmFinish() {
  const i=state.today.items.findIndex(x=>!x.done);
  if(i<0) return;
  document.getElementById("confirmText").textContent=replaceName(state.today.items[i].title);
  openModal("confirmModal");
}

function completeCurrent() {
  const i=state.today.items.findIndex(x=>!x.done);
  if(i<0) return;
  state.today.items[i].done=true;
  const next=state.today.items.findIndex(x=>!x.done);
  state.today.currentIndex=next<0 ? state.today.items.length-1 : next;
  save(); closeModal("confirmModal"); render();
}

function undo() {
  const i=[...state.today.items].map(x=>x.done).lastIndexOf(true);
  if(i<0)return;
  state.today.items[i].done=false;
  state.today.currentIndex=i;
  save(); render();
}

function saveTemplate() {
  state.template=state.today.items.map(({title,subtitle,icon})=>({title,subtitle,icon}));
  save();
  alert("今の予定を「いつもの予定」に保存しました。");
}

function loadTemplate() {
  if(!state.template?.length){alert("いつもの予定がありません。");return;}
  state.today.items=state.template.map(x=>({...x,done:false}));
  state.today.currentIndex=0;
  save(); render(); closeModal("settingsModal");
}

function copyYesterday() {
  if(!state.yesterday?.items?.length){alert("昨日の予定がありません。");return;}
  state.today.items=state.yesterday.items.map(({title,subtitle,icon})=>({title,subtitle,icon,done:false}));
  state.today.currentIndex=0;
  save(); render(); closeModal("settingsModal");
}

document.getElementById("finishBtn").onclick=confirmFinish;
document.getElementById("confirmFinishBtn").onclick=completeCurrent;
document.getElementById("cancelFinishBtn").onclick=()=>closeModal("confirmModal");
document.getElementById("undoBtn").onclick=undo;

document.getElementById("editTodayBtn").onclick=()=>{renderEditor();openModal("editorModal");};
document.getElementById("createFromEmptyBtn").onclick=()=>{renderEditor();openModal("editorModal");};
document.getElementById("settingsBtn").onclick=()=>{
  document.getElementById("childNameInput").value=state.childName;
  openModal("settingsModal");
};
document.getElementById("newItemBtn").onclick=()=>openItemEditor(null);
document.getElementById("saveItemBtn").onclick=saveItem;
document.getElementById("saveScheduleBtn").onclick=()=>{save();closeModal("editorModal");render();};
document.getElementById("saveNameBtn").onclick=()=>{
  state.childName=document.getElementById("childNameInput").value.trim() || "〇〇";
  save();closeModal("settingsModal");render();
};
document.getElementById("saveTemplateBtn").onclick=saveTemplate;
document.getElementById("loadTemplateBtn").onclick=loadTemplate;
document.getElementById("yesterdayBtn").onclick=copyYesterday;
document.getElementById("resetTodayBtn").onclick=()=>{
  if(confirm("今日の完了状態をすべてリセットしますか？")){
    state.today.items.forEach(x=>x.done=false); state.today.currentIndex=0; save(); render();
  }
};

document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
document.querySelectorAll(".modal").forEach(m=>{
  m.addEventListener("click", e=>{ if(e.target===m) closeModal(m.id); });
});

render();
