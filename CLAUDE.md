# my-travel — 个人旅行攻略库

用 HTML 攻略文档记录每次出行规划，AI 辅助规划行程、查实时交通、生成排版美观的攻略页面。

## 目录结构

```
my-travel/
├── trips/
│   └── {目的地}-{年份}/
│       └── {目的地}-trip-guide-v1.html   # 攻略，带版本号
├── templates/
│   └── trip-guide-template.html          # 通用 HTML 模板
├── docs/                                  # 按需加载的参考文档
│   ├── guide-spec.md                      # 攻略规范、版本规则、HTML 结构
│   ├── tools.md                           # 工具使用（携程问道等）
│   └── planning-principles.md            # 行程规划原则
└── CLAUDE.md
```

## Skill 安装规则

在此目录下安装 skill 一律安装到**当前项目目录**（`.claude/skills/`），不安装到全局：
- skillhub.cn：`skillhub install <name> --dir .claude/skills`
- 美团 mtskills：`mtskills i <name>`（省略 `-g`）

## 版本规则（核心）

- 攻略文件名格式：`{目的地}-trip-guide-v{N}.html`
- **不确定是否升版本时，主动问主人**，不自作主张
- 详细规则见 `docs/guide-spec.md`

## 发布攻略

攻略完成后 push 到 GitHub，自动发布到 GitHub Pages：

```bash
git add . && git commit -m "更新攻略" && git push
```

1-2 分钟后即可访问：`https://lnfdxwl.github.io/my-travel/trips/{目的地}-{年份}/{文件}.html`

## 按需加载文档

| 文档 | 加载时机 |
|------|---------|
| `docs/guide-spec.md` | 新建行程、修改攻略结构时 |
| `docs/tools.md` | 需要查实时航班/火车/酒店时 |
| `docs/planning-principles.md` | 开始规划新行程时 |
