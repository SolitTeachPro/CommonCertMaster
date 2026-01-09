**CommonCertMaster** 是一个基于 AI 驱动的专业证书认证练习与管理平台。它旨在通过智能化的题目生成和深度数据分析，帮助用户高效通过各类专业认证考试（如 Alibaba Cloud ACP - LLM）。

<div align="center">
<img src="[https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)" width="100%" alt="Banner" />
</div>

## ✨ 功能特性

* **🏆 多维度证书管理**：支持创建和管理多种认证类别，清晰展示各认证的领域、级别及准备状态。
* **🤖 AI 智能出题**：集成 Gemini 大模型，基于知识点权重描述自动生成高质量模拟题。
* **📊 深度学习看板**：可视化展示刷题总数、正确率及全站排名；拥有独特的知识点覆盖度雷达图。
* **📝 全仿真模拟考场**：支持自定义试卷总分、及格线及题型比例，高度还原真实考试体验。
* **📚 灵活练习模式**：包含自由练习模式与错题本功能，支持“背题模式”实时查看答案解析（如 CoT 思维链分析）。

## 📸 界面预览

| 证书与题库管理 | 模拟考试配置 |
| --- | --- |
| <img src="image_2a8aa7.png" width="400" /> | <img src="image_2a8e24.png" width="400" /> |
| **学习数据分析** | **AI 智能出题** |
| <img src="image_2a91a7.png" width="400" /> | <img src="image_2a8dea.png" width="400" /> |
| **模拟练习界面** | **答案解析 (CoT)** |
| <img src="image_2a914e.png" width="400" /> | <img src="image_2a916e.png" width="400" /> |

## 🚀 快速开始

### 开发环境配置

**前提条件:** Node.js (建议 v18+)

1. **克隆仓库并安装依赖**:
```bash
npm install

```


2. **配置 API 密钥**:
在项目根目录找到 `.env.local` 文件，填入你的 Gemini API Key：
```env
GEMINI_API_KEY=your_api_key_here

```


3. **启动本地开发服务器**:
```bash
npm run dev

```


访问 `http://localhost:3000` 即可预览应用。

## 🛠️ 技术栈

* **Framework**: Next.js / React
* **AI Engine**: Google Gemini (AI Studio)
* **UI Components**: Tailwind CSS
* **Data Visualization**: ECharts / Recharts (用于雷达图与趋势图)
