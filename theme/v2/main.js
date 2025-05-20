// main.js v2

// --- 全域常數 & DOM 元素快取 ---
const API_ENDPOINT = window.location.pathname; // Worker 的 API 路徑就是當前頁面路徑
const longUrlInput = document.getElementById("longURL");
const keyPhraseInput = document.getElementById("keyPhrase");
const passwordInput = document.getElementById("passwordText");
const workerSuppliedPasswordElem = document.getElementById("workerPassword"); // 從 HTML 中讀取 Worker 提供的密碼
const addBtn = document.getElementById("addBtn");
const resultModal = $("#resultModal"); // jQuery 物件給 Bootstrap Modal 使用
const resultModalLabel = document.getElementById("resultModalLabel");
const resultBody = document.getElementById("resultBody");
const copyResultBtn = document.getElementById("copyResultBtn");
const urlListContainer = document.getElementById("urlList");
const recordSection = document.getElementById("record");
const clearLocalBtn = document.getElementById("clearLocalBtn");
const shortUrlPrefixElem = document.getElementById("shortUrlPrefix");
const passwordSection = document.getElementById("passwordSection");

let currentShortenedKeyForCopy = ""; // 用來儲存當前 Modal 中顯示的短網址 key

// --- 初始化 ---
document.addEventListener("DOMContentLoaded", () => {
  // 設定短網址前綴
  shortUrlPrefixElem.textContent = `${window.location.protocol}//${window.location.host}/`;

  // 檢查 Worker 是否提供了密碼 (通常是 guest 密碼或 admin 登入的路徑)
  // 如果 workerSuppliedPasswordElem.value 不是空的，表示可能需要密碼
  // 這個邏輯可以根據你的 Worker 設定調整，例如：如果 workerSuppliedPasswordElem.value 是 "admin"，則可以解鎖管理員功能
  const workerPassword = workerSuppliedPasswordElem.value;
  if (workerPassword && workerPassword !== "null" && workerPassword !== "undefined") {
    // 這裡的邏輯是：如果 Worker HTML 模板中的 __PASSWORD__ 被替換成了一個非空值，
    // 表示 Worker 可能設定了訪客密碼，或者目前是在管理員路徑下。
    // 我們讓使用者可以輸入密碼。
    // 如果 Worker 的 config.passwordGuest 是空字串，那 passwordInput.value 會直接是空。
    // 如果 Worker 的 config.passwordGuest 有值，且使用者訪問的是 guest 密碼路徑，
    // 那 passwordInput.value 會被 Worker 替換成 guest 密碼，這樣使用者就不用再輸入。
    // 如果是管理員路徑，passwordInput.value 會被替換成管理員路徑，這同時也是密碼。
    passwordInput.value = workerPassword; 
    passwordSection.style.display = "block"; 
  } else {
     // 如果 __PASSWORD__ 是空 (例如 Worker 的 passwordGuest 是空且不在管理員路徑)
     // 則不需要密碼欄位，維持隱藏，後端也不會校驗 guest 密碼
    passwordInput.value = ""; // 確保是空的
  }


  loadUrlListFromLocalStorage();

  addBtn.addEventListener("click", handleShortenUrl);
  longUrlInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault(); // 防止表單提交 (如果有的話)
      handleShortenUrl();
    }
  });

  clearLocalBtn.addEventListener("click", clearAllLocalRecords);
  copyResultBtn.addEventListener("click", () => copyToClipboard(currentShortenedKeyForCopy, true));

  // Modal 顯示時自動聚焦到複製按鈕
  resultModal.on('shown.bs.modal', () => {
    copyResultBtn.focus();
  });

  // 初始化 Bootstrap Popover (如果還需要)
  // $('[data-toggle="popover"]').popover(); 
  // ^ 如果 copyResultBtn 的 data-toggle="popover" data-content="已複製" 效果還需要的話
});

// --- API 呼叫 ---
async function apiCall(cmd, data = {}) {
  const password = passwordInput.value || workerSuppliedPasswordElem.value || ""; // 從輸入框或 hidden input 取密碼

  try {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cmd, password, ...data }),
    });
    return response.json();
  } catch (error) {
    console.error("API Call Error:", error);
    return { status: 500, error: "有外星人干擾了網路！導致網路錯誤或主機系統無回應，請稍後再試。" };
  }
}

// --- 核心功能 ---
async function handleShortenUrl() {
  const longURL = longUrlInput.value.trim();
  const keyPhrase = keyPhraseInput.value.trim();

  if (!longURL) {
    showResultModal("母湯喔！", "網址不能空著啦～", true);
    return;
  }

  // 簡易前端 URL 驗證 (Worker 端會有更嚴謹的驗證)
  try {
    new URL(longURL.startsWith("http") ? longURL : `http://${longURL}`);
  } catch (e) {
    if (!/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+([\/?]\S*)?$/.test(longURL)) { // 允許 domain.com/path 這種
      showResultModal("格式錯誤", "這網址結構看起來怪怪的喔，檢查一下？", true);
      return;
    }
  }


  setButtonLoading(addBtn, "縮址中……");

  const result = await apiCall("add", { url: longURL, keyPhrase });

  setButtonLoaded(addBtn, "縮！");

  if (result.status === 200 && result.key) {
    const shortUrl = `${window.location.protocol}//${window.location.host}/${result.key}`;
    currentShortenedKeyForCopy = shortUrl; // 設定給 Modal 複製按鈕使用
    showResultModal("✨ 搞定！ ✨", `你的短網址：<br><a href="${shortUrl}" target="_blank">${shortUrl}</a>`, false);

    saveRecordToLocalStorage(result.key, longURL);
    addUrlToDOMList(result.key, longURL);
    updateRecordSectionVisibility();

    longUrlInput.value = ""; // 清空輸入框
    keyPhraseInput.value = ""; // 清空自訂短網址
  } else {
    showResultModal("😥 哎呀！出包了！", result.error || "發生未知錯誤，請再試一次。", true);
  }
}

async function deleteShortUrl(key) {
  const deleteButton = document.getElementById(`delBtn-${key}`);
  if (!deleteButton) return;

  setButtonLoading(deleteButton, '<span class="spinner-border spinner-border-sm" role="status"></span>', true);

  const result = await apiCall("del", { keyPhrase: key });

  if (result.status === 200) {
    removeRecordFromLocalStorage(key);
    document.getElementById(`item-${key}`)?.remove(); // 從 DOM 移除
    updateRecordSectionVisibility();
    // 可以在這裡加個小小的成功提示，例如用 Toast
  } else {
    setButtonLoaded(deleteButton, "✘", true); // 恢復按鈕
    showResultModal("刪除失敗", result.error || "無法刪除此紀錄，請再試一次。", true);
  }
}

// --- LocalStorage & DOM 操作 ---
function saveRecordToLocalStorage(key, longUrl) {
  localStorage.setItem(key, longUrl);
}

function removeRecordFromLocalStorage(key) {
  localStorage.removeItem(key);
}

function loadUrlListFromLocalStorage() {
  urlListContainer.innerHTML = ""; // 清空現有列表
  const keys = Object.keys(localStorage);
  
  // 簡單判斷一下，避免把非短網址的 localStorage item 也讀出來 (例如其他網站或插件留下的)
  // 這裡的判斷比較寬鬆，你也可以在儲存時加上特定前綴來區分
  const shortUrlKeys = keys.filter(key => localStorage.getItem(key).includes("http") || localStorage.getItem(key).includes("://") || /\S+\.\S+/.test(localStorage.getItem(key)));


  if (shortUrlKeys.length === 0) {
    recordSection.style.display = "none";
    return;
  }
  
  // 從最新的開始加載
  for (let i = shortUrlKeys.length - 1; i >= 0; i--) {
    const key = shortUrlKeys[i];
    const longUrl = localStorage.getItem(key);
    if (longUrl) { // 再次確認 longUrl 存在
      addUrlToDOMList(key, longUrl);
    }
  }
  updateRecordSectionVisibility();
}

function addUrlToDOMList(key, longUrl) {
  const shortUrl = `${window.location.protocol}//${window.location.host}/${key}`;
  const listItem = document.createElement("div");
  listItem.className = "list-group-item";
  listItem.id = `item-${key}`;

  // 讓長網址部分可以換行，且加上 link icon
  const formattedLongUrl = longUrl.replace(/(.{60})/g, "$1<wbr>"); // 每60個字元可換行
  const displayLongUrl = `<small class="text-muted d-block mt-1">🔗 ${formattedLongUrl}</small>`;
  
  listItem.innerHTML = `
    <div class="row align-items-center">
      <div class="col">
        <strong id="short-url-text-${key}"><a href="${shortUrl}" target="_blank">${shortUrl}</a></strong>
        ${displayLongUrl}
      </div>
      <div class="col-auto align-self-start">
        <button type="button" class="btn btn-outline-secondary btn-sm mr-1" id="copyBtn-${key}" title="複製短網址">📋</button>
        <button type="button" class="btn btn-outline-danger btn-sm" id="delBtn-${key}" title="刪除此紀錄">✘</button>
      </div>
    </div>
  `;
  
  urlListContainer.prepend(listItem); // 新的紀錄加到最上面

  document.getElementById(`copyBtn-${key}`).addEventListener("click", () => copyToClipboard(shortUrl));
  document.getElementById(`delBtn-${key}`).addEventListener("click", () => deleteShortUrl(key));
}

function clearAllLocalRecords() {
  if (confirm("確定要清除所有本機儲存的短網址紀錄嗎？這個動作無法復原喔！")) {
    const keys = Object.keys(localStorage);
    // 僅刪除看起來是短網址的記錄，避免誤刪其他 localStorage 項目
    keys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value && (value.includes("http") || value.includes("://") || /\S+\.\S+/.test(value))) {
            // 這裡可以加上一個更嚴謹的判斷，例如檢查 key 的格式
            // 或者在儲存時就給 key 加上特定前綴
            if (key.length < 20 && !key.startsWith("rand:")) { // 假設短網址 key 不會太長且沒有特定前綴
              localStorage.removeItem(key);
            }
        }
    });
    loadUrlListFromLocalStorage(); // 重新載入空的列表
    showResultModal("紀錄已清除", "所有本機短網址紀錄都掰掰囉～", false);
  }
}

function updateRecordSectionVisibility() {
  if (urlListContainer.children.length > 0) {
    recordSection.style.display = "block";
  } else {
    recordSection.style.display = "none";
  }
}

// --- UI 工具函式 ---
function setButtonLoading(button, text, isSmallSpinner = false) {
  button.disabled = true;
  const spinnerClass = isSmallSpinner ? "spinner-border-sm" : "spinner-border";
  button.innerHTML = `<span class="${spinnerClass}" role="status" aria-hidden="true"></span> ${text}`;
}

function setButtonLoaded(button, text, isIconButton = false) {
  button.disabled = false;
  button.innerHTML = text;
}

function showResultModal(title, message, isError = false) {
  resultModalLabel.textContent = title;
  resultBody.innerHTML = message; // 允許 HTML
  
  // 根據是否為錯誤調整複製按鈕的顯示
  copyResultBtn.style.display = isError ? "none" : "inline-block";
  if (!isError) {
    // currentShortenedKeyForCopy 應該已經在 handleShortenUrl 中設定好
  }

  resultModal.modal("show");
}

let copyTimeout = null; // 用於 Popover 的 timeout
function copyToClipboard(textToCopy, fromModal = false) {
  if (!navigator.clipboard) {
    // 舊方法 (如果瀏覽器不支援 Clipboard API)
    const textArea = document.createElement("textarea");
    textArea.value = textToCopy;
    textArea.style.position = "fixed"; // 防止滾動
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      if (fromModal) {
        const originalText = copyResultBtn.innerHTML;
        copyResultBtn.innerHTML = "👍 已複製！ 👍";
        clearTimeout(copyTimeout);
        copyTimeout = setTimeout(() => { copyResultBtn.innerHTML = originalText; }, 2000);
      } else {
        alert("👍 已複製！ 👍"); // 對於列表中的複製按鈕，可以用 alert 或其他提示方式
      }
    } catch (err) {
      console.error("Fallback: Oops, unable to copy", err);
      alert("複製失敗，請手動複製。");
    }
    document.body.removeChild(textArea);
    return;
  }

  navigator.clipboard.writeText(textToCopy).then(() => {
    if (fromModal) {
      const originalText = copyResultBtn.innerHTML;
      copyResultBtn.innerHTML = "👍 已複製！ 👍";
      clearTimeout(copyTimeout);
      copyTimeout = setTimeout(() => { copyResultBtn.innerHTML = originalText; }, 2000);
    } else {
      // 對於列表中的複製按鈕，可以考慮用一個小小的 popover 或 tooltip 來提示成功
      // 例如，暫時改變按鈕文字或圖示
      const activeElement = document.activeElement; // 獲取觸發複製的按鈕
      if (activeElement && activeElement.tagName === "BUTTON") {
          const originalContent = activeElement.innerHTML;
          activeElement.innerHTML = "✔️";
          setTimeout(() => { activeElement.innerHTML = originalContent; }, 1500);
      } else {
        alert("👍 已複製！ 👍"); // 備用提示
      }
    }
  }).catch(err => {
    console.error("Async: Could not copy text: ", err);
    alert("唉呀！複製失敗！請手動複製。");
  });
}
