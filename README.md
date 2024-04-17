# URL Shortener

English | [简体中文](doc/README_zh-hans.md)

![Demo](doc/Demo.png)

This is a link shortener deployed on Cloudflare Worker, allowing easy deployment without the need for a server and enabling custom domain  binding.

Features in this branch include:

- Support for configuring parameters using Cloudflare Worker environment variables.
- Support for hierarchical permissions with the ability to set admin and guest user passwords (access paths) and restrict permissions for guest user.
- Support for different homepages for unauthorized users, guest users, and admin users.
- Support for configuring regular expression rules.
- Ability to cache and manage generated records on the web page. @crazypeace
- Ability to download all generated records and cache them locally. @crazypeace
- PWA feature support.
- Also includes improvements in other aspects.

*Some features are merged from the branch of [@crazypeace](https://github.com/crazypeace/Url-Shorten-Worker).

## Usage

### Web Usage

Demo: [url-shortner-demo.iou.icu](https://url-shortner-demo.iou.icu/)

Note: The demo is for trial purposes only, and it has additional restriction rules and will periodically delete records. Please deploy it on your own for actual usage.

### API

[API Documentation](doc/API.md)

## Deployment

Deploy through Cloudflare. If your domain is hosted on Cloudflare, you can bind it to your domain.

### Create KV

Create a KV Namespace.

<img src="https://cdn.jsdelivr.net/npm/imst@0.0.4/20201205232805.png">

### Deploy Worker

Create a Worker.

Go to Worker => Worker Name => Variables => KV Namespace Bindings.

<img src="https://cdn.jsdelivr.net/npm/imst@0.0.4/20201205232536.png">

In the Variable name field, enter `LINKS`, and in the KV namespace field, enter the namespace you just created.

<img src="https://cdn.jsdelivr.net/npm/imst@0.0.4/20201205232704.png">

Click on `Edit Code` and copy the code from the `index.js` file in this project to Cloudflare Worker.

Click Deploy.

### Domain binding

Go to Worker => Worker Name => Triggers => Routes to bind your own domain for access.

### Environment Variables

Go to Worker => Worker Name => Variables => Environment Variables to configure the environment variables.

| Variable Name  | Value (Default)             | Description                                                  |
| -------------- | --------------------------- | ------------------------------------------------------------ |
| REPO_VERSION   | @gh-pages                   | Homepage repository version. If using the Jsdelivr CDN address, it may need to be changed to the Release tag for the latest version. |
| PASSWORD_ADMIN | admin                       | Admin user password (access path). An empty value means no admin user. |
| PASSWORD       |                             | Guest user password (access path). An empty value means that user will go to the homepage. |
| INDEX_REDIRECT |                             | URL to redirect to when the guest user password has a value. |
| URL_EXCLUDE    | //url-shortner-demo.iou.icu | Exclude the host domain. Please modify it to your domain.    |
| THEME_ADMIN    |                             | Admin user homepage path, e.g., `theme/admin`.               |
| THEME          |                             | Guest user homepage.                                         |
| LEN            | 6                           | Length of randomly generated short link path.                |
| NO_REF         | false                       | Control HTTP referrer header.                                |
| CORS           | false                       | Allow API requests to provide cross-origin resource sharing. |
| UNIQUE_LINK    | false                       | Generate the same short link for the same URL.               |
| CUSTOM_LINK    | true                        | Allow guest users to customize the short link.               |
| LEN_LIMIT      | 3                           | Minimum length for guest user's custom short link.           |
| REGEX_REDIRECT | false                       | Enable regular expression redirect functionality.         |

### Regular Expression Redirect

To enable regular expression redirect, set the environment variable `EGEX_REDIRECT` to `true`.

Regular expressions are stored in the KV `#regexRedirect` key in `json` format, like this:

```
Key = #regexRedirect
Value = {"^(example.*)": "https://www.iou.icu/$1","^gg\\.(.*)":"https://www.google.com/search?q=$1"}
```

At running, it will be converted into a dictionary, where the keys are the regular expression matching rules, and the values are the replacement rules.

This value contain two regex rules.

>**Rule A**
>
>Find: `^(example.*)`
>
>Replace: `https://iou.icu/$1`

>**Rule B**
>
>Find: `^gg\.(.*)`
>
>Replace: `https://www.google.com/search?q=$1`

The passed short link will be matched sequentially and the first matched rule will be applied.

For example, if the passed short link is `https://example.com/example-apple`, the redirection result will be `https://iou.icu/example-apple`. 

If the `https://example.com/gg.apple` , will be ``https://www.google.com/search?q=apple``. And you will get a quick search.

Regex rules have higher priority than short links, so make sure the `json` format is correct and properly escaped.
