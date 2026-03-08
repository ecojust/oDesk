# oDesk

一款功能强大的动态桌面壁纸管理工具，支持多种壁纸类型，包括静态壁纸、Shader 着色器壁纸和 HTML 网页壁纸。

![预览图](./preview/oDesk.png)

## 🎖︎ 功能特性

### 1. 静态壁纸管理

- 浏览本地壁纸列表，支持缩略图预览
- 支持从云端获取随机壁纸
- 支持壁纸轮播循环（本地/云端两种模式）
- 一键下载并设置系统壁纸
- 壁纸删除管理

### 2. Shader 着色器壁纸

- 内置着色器壁纸列表管理
- 支持创建新的着色器壁纸
- 实时预览着色器效果
- 内置 Monaco Editor 代码编辑器
- 基于 Babylon.js 的实时渲染预览
- 支持保存和删除着色器壁纸

### 3. HTML 网页壁纸

- 支持将任意网页设置为桌面壁纸
- 内置代码编辑器（Monaco Editor）
- 实时预览效果
- 支持截图生成封面
- 全屏预览模式
- 支持保存和删除 HTML 壁纸

### 4. 工作区管理（目前只开放给HTML）

- 创建和管理开发工作区
- 支持执行 opencode 服务
- 工作区文件编辑功能

## 📄 使用说明

1. **静态壁纸**：在"静态壁纸"标签页中，可以浏览本地壁纸、下载云端壁纸、设置壁纸轮播
2. **Shader 壁纸**：在"着色器壁纸"标签页中，可以创建、编辑和预览 GLSL 着色器
3. **HTML 壁纸**：在"网页壁纸"标签页中，可以将任意网页设为壁纸，支持实时编辑预览

## 🍟 HTML壁纸支持的api列表

1. 首先，请在你的自定义html壁纸加载必须的**sdk**文件代码：

```
 //这个是为了生成预览截图
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
          // 有回调，说明是壁纸请求客户端做的事情
          if (data.code === 200) {
            callback.resolve(data);
          } else {
            callback.reject(new Error(data.msg));
          }
          pendingCallbacks.delete(data.id);
        } else {
          // 没有回调，说明是客户端让壁纸做的事情
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

    //invoke函数用于发起请求让客户端执行事务
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

2. 然后你可以通过如下**接口**获取数据/执行事务

---

| 名称                       | 用途                                     | 示例                                                                                    | 返回值 |
| -------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------- | ------ |
| get_system_stats           | 获取系统状态                             | `await invoke("get_system_stats");`                                                     | Object |
| open_workspace             | 打开当前工作空间文件夹                   | `await invoke("open_workspace");`                                                       | NA     |
| opencode                   | 基于当前工作空间，执行opencode命令       | `await invoke("opencode");`                                                             | NA     |
| get                        | 发起get请求                              | `await invoke("get");`                                                                  | Object |
| postBody                   | 发起post请求                             | `await invoke("postBody", {url: "http://127.0.0.1:4096/session"});`                     | Object |
| workspace_file_insert_text | 往当前工作空间中某个文本文件新增一条数据 | `await invoke("workspace_file_insert_text", {file_name: "xxx.txt",new_line:"xxxxxx"});` | NA     |
| open_executable            | 基于绝对路径打开本地程序                 | `await invoke("open_executable", { path: "/Applications/Google Chrome.app" });`         | NA     |

---

## 实际案例请参照samples文件夹下的示例文件

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
