
# CertMaster AI - 阿里云大模型 ACP 认证提分利器 🚀

[![Built with Gemini](https://img.shields.io/badge/AI-Gemini%20Flash-blue?style=flat-square&logo=google-gemini)](https://ai.google.dev/)
[![React](https://img.shields.io/badge/Frontend-React%2019-61dafb?style=flat-square&logo=react)](https://reactjs.org/)
[![Tailwind](https://img.shields.io/badge/CSS-Tailwind-38b2ac?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

CertMaster AI 是一款专为 **Alibaba Cloud Certified Professional (ACP) - LLM** 认证设计的全链路智能刷题系统。它集成了 **Gemini 大模型自研命题**、**多维学习画像分析** 以及 **沉浸式模拟考场**，旨在通过 AI 技术显著提升备考效率。

---

## 📸 功能实测预览

### 1. 证书与多维度题库管理
系统支持多认证并行管理。您可以为不同的技术领域创建独立的练习空间。支持卡片与列表双模切换，直观展示每个认证的题目总量与进度。

| 证书概览 (Grid View) | 证书列表 (List View) |
| :--- | :--- |
| ![证书卡片](screenshots/a.png) | ![证书列表](screenshots/b.png) |

### 2. 智能化题库管理中心
支持 **Markdown/DOCX** 一键解析导入，自动识别题干、选项、答案及配图。
- **状态管理**：一键激活/禁用特定题库文件，灵活调整当前的练习范围。
- **数据导出**：支持将当前激活的题库导出为标准 Word 文档，方便打印复习。

![题库管理](screenshots/c.png)

### 3. 大模型智能出题 (AI Powered)
基于 Gemini 3 Pro 模型，系统可根据您设置的**知识点权重**或**现有题库风格**进行仿真命题。
- **实时生成**：流式输出生成的题目，支持一键保存至本地题库。
- **高仿真度**：严格遵循 2:1 的单多选配比，内容深度对标官方真实认证。

![AI智能出题](screenshots/d.png)

### 4. 严谨的模拟考场
- **规则自定义**：灵活配置考试总分、及格线、各题型分值与考试时长。
- **沉浸式体验**：全屏答题界面、实时倒计时提醒、防误触提交机制。

| 考场规则设置 | 真实答题界面 |
| :--- | :--- |
| ![考试配置](screenshots/e.png) | ![考场界面](screenshots/f.png) |

### 5. 多样化练习模式
- **自由练习**：支持答题模式与背题模式一键切换。
- **背题模式**：自动高亮正确选项并弹出 **AI 知识点解析**，适合快速扫盲。
- **错题本**：系统自动捕获薄弱环节，循环练习直到完全掌握。

| 模式选择 | 题目练习详情 | 背题模式解析 |
| :--- | :--- | :--- |
| ![练习选择](screenshots/g.png) | ![题目详情](screenshots/h.png) | ![背题解析](screenshots/i.png) |

### 6. 全方位学习数据仪表盘
利用 Recharts 实现多维数据可视化。通过 **能力雷达图**、**提分趋势图** 和 **分项正确率柱状图**，量化您的学习进度，精准锁定知识盲区。

![数据看板](screenshots/j.png)

---

## 🛠️ 技术底座

- **AI 核心**: Google Gemini API (@google/genai)
- **前端框架**: React 19 + TypeScript
- **交互动效**: Tailwind CSS + Lucide Icons
- **文档解析**: Mammoth.js (DOCX 转换)
- **数据存储**: 本地浏览器 LocalStorage (隐私安全，无需服务器)

---

## 🚀 快速上手

1. **环境配置**: 
   在系统环境变量中配置您的 `process.env.API_KEY` (Gemini API Key)。

2. **本地启动**:
   ```bash
   npm install
   npm run dev
   ```

3. **图片路径说明**:
   所有演示图片均存储在根目录的 `screenshots/` 文件夹下。

---

## 🛡️ 开发者寄语
本系统致力于通过 AI 技术解决“题库不足、解析难懂、进度难量化”的备考痛点。

*Powered by Gemini AI - 为每一位开发者的认证之路保驾护航。*
