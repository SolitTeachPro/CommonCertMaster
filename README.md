# CommonCertMaster

**CommonCertMaster** 是一个通用的、由 AI 驱动的专业证书认证备考与刷题系统。它突破了传统刷题软件的限制，通过集成大语言模型（LLM），实现了从**知识点上传**到**智能题目生成**，再到**深度学习反馈**的全流程闭环。

<div align="center">
<img src="[https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)" width="100%" alt="Banner" />
</div>

## 🌟 核心理念：通用与智能

本项目不仅是一个刷题工具，更是一个**证书学习框架**。你可以导入任何领域的认证资料（如 AWS, Azure, PMP, 甚至行业准入考试），系统将自动基于这些资料构建专属题库。

## ✨ 通用功能特性

* **📂 灵活题库管理**：支持自定义创建任何认证类别。你可以上传 `.md` 或 `.json` 格式的考点大纲，系统会动态解析并组织题库内容。
* **🧠 AI 自动化生成 (Prompt-Based)**：利用 Google Gemini 的推理能力，根据你上传的特定知识点（Knowledge Points）自动生成单选题、多选题及详细解析。
* **📈 全维度数据看板**：
* **知识点覆盖图**：通过雷达图识别你的知识盲区。
* **能力值评估**：按分项能力（如架构、安全、开发）量化你的备考进度。


* **⚡ 两种练习模式**：
* **模拟考场**：严格的倒计时和分值计算，还原真实考场压力。
* **自由练习**：包含“背题模式”与“错题本”，通过思维链（CoT）技术展示深度答案解析。


* **🔄 跨平台兼容**：基于 Next.js 构建，支持响应式布局，无论在 PC 端还是移动端都能获得流畅的刷题体验。

## 📸 界面展示 (以 ACP-LLM 认证为例)

| 证书类别管理 (支持无限扩展) | AI 智能从文档生成题目 |
| --- | --- |
| <img src="image_2a8aa7.png" width="400" /> | <img src="image_2a8d70.png" width="400" /> |
| **个性化练习配置** | **备考进度可视化** |
| <img src="image_2a8e24.png" width="400" /> | <img src="image_2a91a7.png" width="400" /> |

## 🛠️ 技术栈

* **前端框架**: Next.js (App Router)
* **AI 内核**: Google AI Studio (Gemini 1.5 Pro / Flash)
* **样式方案**: Tailwind CSS + Headless UI
* **数据可视化**: ECharts / Recharts

## 🚀 部署与运行

1. **克隆项目**:
```bash
git clone https://github.com/your-username/CommonCertMaster.git

```


2. **安装依赖**:
```bash
npm install

```


3. **配置密钥**:
在 `.env.local` 中添加：`GEMINI_API_KEY=你的密钥`
4. **启动**:
```bash
npm run dev

```

### 💡 建议增加的下一步：

既然这是一个**通用系统**，您是否需要我为您编写一个 **`data_template.json`** 的示例？这样其他用户下载您的代码后，就知道该按什么格式准备自己的证书资料来导入系统了。
