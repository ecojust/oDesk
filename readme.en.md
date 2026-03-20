<p align="center">
    <img width="200" alt="" src="./preview/pxArt.png" />
</p>

<p align="center">
    A powerful dynamic desktop wallpaper management tool that supports multiple wallpaper types, including static wallpapers, Shader wallpapers, and HTML web wallpapers.
</p>

<p align="center">
  <a href="README_EN.md">English</a> |
  <a href="README.md">简体中文</a>

</p>

<p align="center">
  <a href="https://opensource.org/licenses/MIT"><img alt="Discord" src="https://img.shields.io/badge/License-MIT-yellow.svg" /></a>
  <img alt="npm" src="https://img.shields.io/badge/platform-macOS-blue" />
  <a href="./examples/">
   <img alt="npm" src="https://img.shields.io/badge/examples-8A2BE2" />
   </a>
</p>

![Preview](./preview/oDesk.png)

## 📋 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Usage](#-usage)
- [HTML Wallpaper API](#-html-wallpaper-api)
- [Contributing](#-contributing)
- [License](#-license)

## 🎖︎ Features

### 1. Skill Apps

- **App Management Interface**: Visual skill app management platform with card display and quick launch
- **Built-in Apps**:
  - **Schedule Manager**: Smart scheduling tool with customizable employee count, shift settings, and Excel export
  - **Wechat Publisher**: WeChat public account article publishing tool with AI-generated content, multiple formatting themes, and one-click publishing
  - **Music Download**: Music search and download tool with queue management and local playback
- **Workspace Management**: Create and manage development workspaces, support opencode service execution
- **Skill Extension**: Extend app functionality through skill packages, import/export skill configurations
- **Real-time Connection**: Real-time workspace status monitoring, session management, and file operations

### 2. Static Wallpapers

- Browse local wallpaper list with thumbnail preview
- Get random wallpapers from cloud
- Support wallpaper slideshow (local/cloud modes)
- One-click download and set as system wallpaper
- Wallpaper deletion management

### 3. Shader Wallpapers

- Built-in shader wallpaper list management
- Create new shader wallpapers
- Real-time shader effect preview
- Built-in Monaco Editor code editor
- Real-time rendering preview based on Babylon.js
- Save and delete shader wallpapers

### 4. HTML Web Wallpapers

- Set any webpage as desktop wallpaper
- Built-in code editor (Monaco Editor)
- Real-time preview
- Screenshot for cover generation
- Fullscreen preview mode
- Save and delete HTML wallpapers

## 📄 Usage

1. **Skill Apps**: In the "SKILL-APPS" tab, access various skill apps
   - **Schedule Manager**: Input employee count, month, and shift requirements, AI generates optimal schedule with Excel export
   - **Wechat Publisher**: Configure WeChat public account AppID and AppSecret, search articles by keyword, AI generates content and publishes with one click
   - **Music Download**: Search music, manage download queue, support local playback
2. **Static Wallpapers**: In the "Static Wallpaper" tab, browse local wallpapers, download cloud wallpapers, set wallpaper slideshow
3. **Shader Wallpapers**: In the "Shader Wallpaper" tab, create, edit, and preview GLSL shaders
4. **HTML Wallpapers**: In the "Web Wallpaper" tab, set any webpage as wallpaper with real-time editing preview

## 🍟 HTML Wallpaper API

### 1. Import SDK

First, load the required **SDK** code in your custom HTML wallpaper:

```javascript
// This is for generating preview screenshots
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
<script>
    const pendingCallbacks = new Map();

    const generateId = () =>
      "msg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

    window.addEventListener("message", async (event) => {
      const data = event.data;

      if (data && data.id) {
        const callback = pendingCallbacks.get(data.id);
        if (callback) {
          // Has callback, means wallpaper requested client to do something
          if (data.code === 200) {
            callback.resolve(data);
          } else {
            callback.reject(new Error(data.msg));
          }
          pendingCallbacks.delete(data.id);
        } else {
          // No callback, means client told wallpaper to do something
          switch (data.method) {
            case "screenshot":
              const canvas = await html2canvas(document.body, {
                backgroundColor: "#1a1a2e",
                scale: 0.5,
              });
              window.parent.postMessage(
                {
                  id: data.id,
                  method: data.method,
                  code: 200,
                  data: canvas.toDataURL("image/png"),
                },
                "*",
              );
              break;

            default:
              window.parent.postMessage(
                {
                  id: data.id,
                  method: data.method,
                  code: 404,
                  data: null,
                  msg: "unknown method",
                },
                "*",
              );
              break;
          }
        }
        return;
      }
    });

    // invoke function is used to request client to execute transactions
    async function invoke(data_type, payload) {
      return new Promise((resolve, reject) => {
        const id = generateId();
        pendingCallbacks.set(id, { resolve, reject });
        parent.postMessage({ id, method: data_type, payload }, "*");
        setTimeout(() => {
          if (pendingCallbacks.has(id)) {
            pendingCallbacks.delete(id);
            reject(new Error("Request timeout"));
          }
        }, 30000);
      });
    }
</script>
```

### 2. Call APIs

Then you can get data/execute transactions through the following **APIs**:

| API Name                    | Usage                                         | Example                                                                                 | Return  |
| :-------------------------- | :-------------------------------------------- | :-------------------------------------------------------------------------------------- | :------ |
| `get_system_stats`          | Get system status                             | `await invoke("get_system_stats");`                                                    | `Object`|
| `open_workspace`            | Open current workspace folder                | `await invoke("open_workspace");`                                                      | -       |
| `opencode`                  | Execute opencode command in current workspace| `await invoke("opencode");`                                                            | -       |
| `get`                       | Make GET request                             | `await invoke("get",{url: "http://127.0.0.1:4096/session"});`                          | `Object`|
| `postBody`                  | Make POST request                            | `await invoke("postBody", {url: "http://127.0.0.1:4096/session",data:{}});`            | `Object`|
| `workspace_file_insert_text`| Insert data into current workspace text file | `await invoke("workspace_file_insert_text", {fileName: "xxx.txt", newLine:"xxxxxx"});`| -       |
| `open_executable`           | Open local program by absolute path          | `await invoke("open_executable", { path: "/Applications/Google Chrome.app" });`        | -       |

> 💡 For practical examples, refer to the sample files in the `samples` folder

## 📥 Installation

```bash
# Clone the project
git clone https://github.com/yourusername/oDesk.git

# Enter directory
cd oDesk

# Install dependencies
npm install

# Run the app
npm run 4dev
```

## 🤝 Contributing

Welcome to submit Issues and Pull Requests!

### Submitting Issues

1. Search existing Issues to confirm if the same problem already exists
2. Use clear problem description with reproduction steps
3. Attach relevant screenshots and logs

### Submitting Pull Request

1. Fork this project
2. Create feature branch (`git checkout -b feature/xxx`)
3. Commit changes (`git commit -m 'Add xxx'`)
4. Push branch (`git push origin feature/xxx`)
5. Create Pull Request

## 📄 License

MIT License - See [LICENSE](LICENSE) for details

---

Made with ❤️ by oDesk Team