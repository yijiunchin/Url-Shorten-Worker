const repo_version = typeof(REPO_VERSION)!="undefined" ? REPO_VERSION
    : "@latest"
const password_value = typeof(PASSWORD)!="undefined" ? PASSWORD
    : "add"
//The domain name of the deployed website
const url_exclude = typeof(URL_EXCLUDE)!="undefined" ? URL_EXCLUDE
    : "//iou.icu"
const len = typeof(LEN)!="undefined" ? parseInt(LEN)
    : 6
const len_limit = typeof(LEN_LIMIT)!="undefined" ? parseInt(LEN_LIMIT)
    : 3
//Control the HTTP referrer header, if you want to create an anonymous link that will hide the HTTP Referer header, please set to "on" .
const no_ref = typeof(NO_REF)!="undefined" ? NO_REF
    : "off"
//Homepage theme, use the empty value for default theme. To use urlcool theme, please fill with "theme/urlcool" .
const theme = typeof(THEME)!="undefined" ? THEME
    : ""
const error = typeof(ERROR)!="undefined" ? ERROR
    : ""
//Allow Cross-origin resource sharing for API requests.
const cors = typeof(CORS)!="undefined" ? CORS
    : ""
//If it is true, the same long url will be shorten into the same short url
const unique_link = typeof(UNIQUE_LINK)!="undefined" ? UNIQUE_LINK
    : false
//Allow users to customize the short url.
const custom_link = typeof(CUSTOM_LINK)!="undefined" ? CUSTOM_LINK
    : true

const config = {
no_ref: "off", //Control the HTTP referrer header, if you want to create an anonymous link that will hide the HTTP Referer header, please set to "on" .
theme:"",
error:"",
cors: "on",//Allow Cross-origin resource sharing for API requests.
unique_link:false,//If it is true, the same long url will be shorten into the same short url
custom_link:true,//Allow users to customize the short url.
}

const html404 = `<!DOCTYPE html>
<html>
<body>
  <h1>404 Not Found.</h1>
  <p>The url you visit is not found.</p>
</body>
</html>`

let response_header={
  "content-type": "text/html;charset=UTF-8",
} 

if (cors=="on"){
  response_header={
  "content-type": "text/html;charset=UTF-8",
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Methods": "POST",
  }
}

async function randomString(len) {
  len = len || 6;
  let $chars = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678";    /****默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1****/
  let maxPos = $chars.length;
  let result = "";
  for (i = 0; i < len; i++) {
    result += $chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return result;
}

async function sha512(url){
    url = new TextEncoder().encode(url)

    const url_digest = await crypto.subtle.digest(
      {
        name: "SHA-512",
      },
      url, // The data you want to hash as an ArrayBuffer
    )
    const hashArray = Array.from(new Uint8Array(url_digest)); // convert buffer to byte array
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    //console.log(hashHex)
    return hashHex
}
async function checkURL(URL){
    let str=URL;
    let Expression=/http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/;
    let objExp=new RegExp(Expression);
    if(objExp.test(str)==true){
      if (str[0] == "h")
        return true;
      else
        return false;
    }else{
        return false;
    }
} 
async function save_url(URL){
    let random_key=await randomString()
    let is_exist=await LINKS.get(random_key)
    console.log(is_exist)
    if (is_exist == null)
        return await LINKS.put(random_key, URL),random_key
    else
        save_url(URL)
}
async function is_url_exist(url_sha512){
  let is_exist = await LINKS.get(url_sha512)
  console.log(is_exist)
  if (is_exist == null) {
    return false
  }else{
    return is_exist
  }
}
async function handleRequest(request) {
  console.log(request)

  if (request.method === "POST") {
    let req=await request.json()
    let req_cmd=req["cmd"]
    if (req_cmd == "add") {
      let req_url=req["url"]
      let req_keyPhrase=req["keyPhrase"]
      let req_password=req["password"]
      let req_keyPhLen=req_keyPhrase.length

      // console.log(req_url)
      // console.log(req_keyPhrase)
      // console.log(req_password)
      if(!await checkURL(req_url)){
        return new Response(`{"status":500,"key": "", "error":"Error: URL illegal."}`, {
          headers: response_header,
        })
      }

      if(req_url.indexOf(url_exclude) != -1){
        return new Response(`{"status":500,"key": "", "error":"Error: URL illegal."}`, {
          headers: response_header,
        })
      }

      if(req_keyPhLen < len_limit && req_keyPhLen > 0){
        return new Response(`{"status":500,"key": "", "error":"Error: Custom shortURL is too short."}`, {
          headers: response_header,
        })
      }

      if (req_password != password_value) {
        return new Response(`{"status":500,"key": "", "error":"Error: Invalid password."}`, {
          headers: response_header,
        })
      }

      let stat,random_key
      if (custom_link && (req_keyPhrase != "")){
        let is_exist=await LINKS.get(req_keyPhrase)
        if (is_exist != null) {
          return new Response(`{"status":500,"key": "", "error":"Error: Custom shortURL existed."}`, {
            headers: response_header,
          })
        }else{
          random_key = req_keyPhrase
          stat, await LINKS.put(req_keyPhrase, req_url)
        }
      } else if (unique_link){
        let url_sha512 = await sha512(req_url)
        let url_key = await is_url_exist(url_sha512)
        if(url_key){
          random_key = url_key
        }else{
          stat,random_key=await save_url(req_url)
          if (typeof(stat) == "undefined"){
            console.log(await LINKS.put(url_sha512,random_key))
          }
        }
      }else{
        stat,random_key=await save_url(req_url)
      }
      console.log(stat)
      if (typeof(stat) == "undefined"){
        return new Response(`{"status":200, "key":"`+random_key+`", "error": ""}`, {
          headers: response_header,
        })
      }else{
        return new Response(`{"status":500, "key": "", "error":"Error: Reach the KV write limitation."}`, {
          headers: response_header,
        })
      }
    } else if (req_cmd == "del") {
      let req_keyPhrase=req["keyPhrase"]
      let req_password=req["password"]

      if (req_password != password_value) {
        return new Response(`{"status":500,"key": "", "error":"Error: Invalid password."}`, {
          headers: response_header,
        })
      }

      await LINKS.delete(req_keyPhrase)
      return new Response(`{"status":200}`, {
        headers: response_header,
      })
    }

  }else if(request.method === "OPTIONS"){  
      return new Response(``, {
      headers: response_header,
    })
  }

  const requestURL = new URL(request.url)
  const path = requestURL.pathname.split("/")[1]
  const params = requestURL.search;

  console.log(path)
  if(!path){
    let index_e= await fetch("https://cdn.jsdelivr.net/gh/smilonely/Url-Shorten-Worker"+repo_version+"/"+error+"/index.html")
    index_e=await index_e.text()
    index_e=index_e.replaceAll(/__REPO_VERSION__/gm, repo_version)
    return new Response(index_e, {
      headers: {
        "content-type": "text/html;charset=UTF-8",
      },
    })
  }
  
  // 如果path符合password 显示应用界面
  if (path==password_value){  
    let index= await fetch("https://cdn.jsdelivr.net/gh/smilonely/Url-Shorten-Worker"+repo_version+"/"+theme+"/index.html")
    index=await index.text()
    index=index.replaceAll(/__REPO_VERSION__/gm, repo_version)
    index=index.replaceAll(/__PASSWORD__/gm, password_value)
    return new Response(index, {
      headers: {
        "content-type": "text/html;charset=UTF-8",
      },
    })
  }

  const value = await LINKS.get(path);
  let location ;

  if(params) {
    location = value + params
  } else {
      location = value
  }
  console.log(value)
  
  if (location) {
    if (no_ref=="on"){
      let no_ref= await fetch("https://smilonely.github.io/Url-Shorten-Worker/no-ref.html")
      no_ref=await no_ref.text()
      no_ref=no_ref.replace(/{Replace}/gm, location)
      return new Response(no_ref, {
        headers: {
          "content-type": "text/html;charset=UTF-8",
        },
      })
    }else{
      return Response.redirect(location, 302)
    }    
  }
  // If request not in kv, return 404
  return new Response(html404, {
    headers: {
      "content-type": "text/html;charset=UTF-8",
    },
    status: 404
  })
}

addEventListener("fetch", async event => {
  event.respondWith(handleRequest(event.request))
})
