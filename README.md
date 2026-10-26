# 乐乐的弹唱歌单

为乐乐的直播观众准备的移动端歌单网页。支持按歌名、歌手、拼音、拼音首字母和关键词搜索，并提供语言筛选、收藏、随机选歌和一键复制点歌口令。

歌曲列表会分批显示，每次加载 60 首，因此放入 1000+ 首歌时也不会一次生成上千个页面元素。

## 本地预览

这是一个无构建依赖的静态网站，直接双击 `index.html` 就能查看。为获得完整的浏览器行为，也可以在仓库目录启动任意静态文件服务器，例如：

```powershell
python -m http.server 8080
```

然后访问 `http://localhost:8080`。

## 维护歌单

所有歌曲都在 `songs.js` 的 `window.LELE_SONGS` 数组中。每首歌的数据格式是：

```js
{
  title: "歌名",
  artist: "歌手",
  language: "华语",
  mood: "温柔",
  pinyin: "ge ming gm",
  aliases: "常用别称 其他搜索词"
}
```

- `language` 会自动成为顶部的筛选项。
- `pinyin` 建议同时填写全拼和首字母，方便观众用英文键盘搜索。
- `aliases` 可填写歌手英文名、昵称或歌曲简称。
- 当前曲目都是界面演示数据，正式上线前请替换为乐乐的真实歌单。

## 发布到 GitHub Pages

在 GitHub 仓库的 **Settings → Pages** 中，将来源设置为 **Deploy from a branch**，选择 `main` 分支和根目录 `/`。保存后等待 GitHub 生成公开网址即可。
