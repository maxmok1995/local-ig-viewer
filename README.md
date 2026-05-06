# 本地相册（Local IG）

一个纯本地运行的相册工具，用接近 Instagram 的浏览方式查看和整理本机照片目录。

它适合这些场景：
- 浏览已下载的 Instagram / 小红书内容
- 把散图目录整理成相册方式查看
- 本地编辑标题、说明、地点、标签、照片备注
- 完全离线保存，不依赖远程数据库

## 核心特点
- 纯本地运行，页面文件为 `local-ig.html`
- 支持本地文件夹选择器读取照片目录
- 支持导入：Instagram / 小红书 / 哼哼猫 / 散图目录
- 支持标签、收藏、备注、封面、移动照片等操作
- 启动脚本会自动尝试可用端口，并给出更明确的错误提示

## 推荐启动方式
### Windows 用户
直接双击：
- `启动本地相册.bat`

### 命令行用户
在项目根目录运行：

```bash
python scripts/serve_local_album.py
```

## 打包成单文件 EXE（用于 GitHub 发布）
在项目根目录执行：

```bash
powershell -ExecutionPolicy Bypass -File scripts/build_release.ps1
```

或直接双击：
- `构建发布包.bat`

构建完成后可在 `release/` 下得到：
- `LocalAlbum.exe`
- `README_快速开始.txt`
- `SHA256.txt`
- `LocalAlbum-<VERSION>-win64.zip`

## 为什么不要直接双击 HTML？
因为浏览器在 `file://` 模式下会限制文件夹访问 API。

如果你直接双击 `local-ig.html`：
- 页面通常能打开
- 但“选择文件夹”等功能可能失效

正确方式是通过本地 HTTP 服务打开，例如：
- `启动本地相册.bat`
- 或 `python scripts/serve_local_album.py`

## 目录说明
- `local-ig.html`：主界面
- `启动本地相册.bat`：Windows 一键启动脚本
- `scripts/serve_local_album.py`：Python 启动脚本
- `docs/QUICKSTART.md`：快速开始
- `PROJECT_MANUAL.md`：较完整维护说明
- `tests/`：回归测试

## 常见入口地址
启动成功后通常会打开：
- `http://127.0.0.1:8765/local-ig.html`

如果默认端口被占用，启动器会自动换到下一个可用端口。

## 适合长期维护的使用建议
- 日常使用优先双击 `启动本地相册.bat`
- 修改脚本后运行 `python3 -m unittest discover -s tests -v`
- 避免直接在生产文件上做大范围试错，先保留 Git 历史

## 相关文档
- `docs/QUICKSTART.md`
- `PROJECT_MANUAL.md`
