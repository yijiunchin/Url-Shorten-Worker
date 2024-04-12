let res

let passwordText = document.querySelector("#passwordText").value

function shorturl() {
  if (document.querySelector("#longURL").value == "") {
    alert("URL cannot be empty!")
    return
  }

  document.getElementById("addBtn").disabled = true;
  document.getElementById("addBtn").innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Shortening...';
  fetch(window.location.pathname, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cmd: "add",
        url: document.querySelector("#longURL").value,
        keyPhrase: document.querySelector("#keyPhrase").value,
        password: passwordText
      })
    }).then(function(response) {
      return response.json();
    })
    .then(function(myJson) {
      res = myJson;
      document.getElementById("addBtn").disabled = false;
      document.getElementById("addBtn").innerHTML = 'Shorten it';

      // 成功生成短链
      if (res.status == "200") {
        let keyPhrase = res.key;
        let valueLongURL = document.querySelector("#longURL").value;
        // save to localStorage
        localStorage.setItem(keyPhrase, valueLongURL);
        // add to urlList on the page
        addUrlToList(keyPhrase, valueLongURL)

        document.getElementById("result").innerHTML = window.location.origin + "/" + res.key;
      } else {
        document.getElementById("result").innerHTML = res.error;
      }

      $('#resultModal').modal('show')

    }).catch(function(err) {
      alert("Unknow error. Please retry!");
      console.log(err);
      document.getElementById("addBtn").disabled = false;
      document.getElementById("addBtn").innerHTML = 'Shorten it';
    })
}

function copyurl(id, attr) {
  let target = null;

  if (attr) {
    target = document.createElement('div');
    target.id = 'tempTarget';
    target.style.opacity = '0';
    if (id) {
      let curNode = document.querySelector('#' + id);
      target.innerText = curNode[attr];
    } else {
      target.innerText = attr;
    }
    document.body.appendChild(target);
  } else {
    target = document.querySelector('#' + id);
  }

  try {
    let range = document.createRange();
    range.selectNode(target);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
    console.log('Copy success')
  } catch (e) {
    console.log('Copy error')
  }

  if (attr) {
    // remove temp target
    target.parentElement.removeChild(target);
  }
}

function loadUrlList() {
  // 清空列表
  let urlList = document.querySelector("#urlList")
  while (urlList.firstChild) {
    urlList.removeChild(urlList.firstChild)
  }

  // 文本框中的长链接
  let longUrl = document.querySelector("#longURL").value
  //console.log(longUrl)

  // 遍历localStorage
  let len = localStorage.length
  //console.log(+len)
  for (; len > 0; len--) {
    let keyShortURL = localStorage.key(len - 1)
    let valueLongURL = localStorage.getItem(keyShortURL)

    // 如果长链接为空，加载所有的localStorage
    // 如果长链接不为空，加载匹配的localStorage
    if (longUrl == "" || (longUrl == valueLongURL)) {
      addUrlToList(keyShortURL, valueLongURL)
    }
  }
}

// button event
function reloadUrlList() {
  // 清空列表
  let urlList = document.querySelector("#urlList")
  while (urlList.firstChild) {
    urlList.removeChild(urlList.firstChild)
  }

  // 文本框中的长链接
  let longUrl = document.querySelector("#longURL").value
  //console.log(longUrl)

  // 遍历localStorage
  let len = localStorage.length
  //console.log(+len)
  for (; len > 0; len--) {
    let keyShortURL = localStorage.key(len - 1)
    let valueLongURL = localStorage.getItem(keyShortURL)

    // 如果长链接为空，加载所有的localStorage
    // 如果长链接不为空，加载匹配的localStorage
    if (longUrl == "" || (longUrl == valueLongURL)) {
      addUrlToList(keyShortURL, valueLongURL)
    }
  }
  alert("Record loaded.");
}

function addUrlToList(shortUrl, longUrl) {
  let record = document.getElementById("record")
  record.style.display = 'block';

  let urlList = document.querySelector("#urlList")

  let col_a = document.createElement('div')
  col_a.classList.add("col")
  let text = document.createElement('span')
  text.innerText = window.location.origin + "/" + shortUrl + " 🔗 " + longUrl
  col_a.appendChild(text)

  let col_b = document.createElement('div')
  col_b.classList.add("col-auto", "align-self-start")
  let btn = document.createElement('button')
  btn.setAttribute('type', 'button')
  btn.classList.add("btn", "btn-outline-danger", "btn-sm")
  btn.setAttribute('onclick', 'deleteShortUrl(\"' + shortUrl + '\")')
  btn.setAttribute('id', 'delBtn-' + shortUrl)
  btn.innerText = "✘"
  col_b.appendChild(btn)

  let row = document.createElement('div')
  row.classList.add("row", "align-items-center")
  row.appendChild(col_a)
  row.appendChild(col_b)

  let child = document.createElement('div')
  child.classList.add("list-group-item")
  child.appendChild(row)

  urlList.append(child)
}

// button event
function clearLocalStorage() {
  localStorage.clear()
  alert("Record deleted.");
}

// button event
function deleteShortUrl(delKeyPhrase) {
  // 按钮
  document.getElementById("delBtn-" + delKeyPhrase).disabled = true;
  document.getElementById("delBtn-" + delKeyPhrase).innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span>';

  // 从KV中删除
  fetch(window.location.pathname, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cmd: "del",
        keyPhrase: delKeyPhrase,
        password: passwordText
      })
    }).then(function(response) {
      return response.json();
    })
    .then(function(myJson) {
      res = myJson;

      // 成功删除
      if (res.status == "200") {
        // 从localStorage中删除
        localStorage.removeItem(delKeyPhrase)

        // 加载localStorage
        loadUrlList()

        document.getElementById("result").innerHTML = "Delete Successful."
      } else {
        document.getElementById("delBtn-").disabled = false;
        document.getElementById("delBtn-").innerHTML = '✘';
        document.getElementById("result").innerHTML = res.error;
      }

      $('#resultModal').modal('show')

    }).catch(function(err) {
      document.getElementById("delBtn-").disabled = false;
      document.getElementById("delBtn-").innerHTML = '✘';
      alert("Unknow error. Please retry!");
      console.log(err);
    })
}

function loadKV() {
  document.getElementById("loadKV2localStgBtn").disabled = true;
  document.getElementById("loadKV2localStgBtn").innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Downloading...';
  // 从KV中查询, cmd为 "qryall", 查询全部
  fetch(window.location.pathname, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      cmd: "qryall",
      password: passwordText
    })
  }).then(function(response) {
    return response.json();
  }).then(function(myJson) {
    res = myJson;
    // 成功查询 Succeed
    if (res.status == "200") {
      // 清空本地存储
      localStorage.clear();
      // 遍历kvlist
      res.kvlist.forEach(item => {
        keyPhrase = item.key;
        valueLongURL = item.value;
        // save to localStorage
        localStorage.setItem(keyPhrase, valueLongURL);
      });
      alert("Record downloaded.");
      location.reload();
    } else {
      document.getElementById("result").innerHTML = res.error;
      // 弹出消息窗口 Popup the result
      var modal = new bootstrap.Modal(document.getElementById('resultModal'));
      modal.show();
    }
  }).catch(function(err) {
    alert("Unknow error. Please retry!");
    console.log(err);
  }).finally(function() {
    document.getElementById("loadKV2localStgBtn").disabled = false;
    document.getElementById("loadKV2localStgBtn").innerHTML = 'Download records';
  });
}

$(function() {
  $('[data-toggle="popover"]').popover()
})

document.getElementById("basic-addon2").innerHTML = "https://" + window.location.host + "/";

loadUrlList()
