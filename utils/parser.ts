
import { Question, QuestionType, QuestionOption } from '../types';

/**
 * Generate a simple hash for string comparison
 */
const generateHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString();
};

/**
 * Logic to extract options (A, B, C...) from a text block
 */
const extractOptions = (rawText: string): QuestionOption[] => {
  const options: QuestionOption[] = [];
  // 匹配格式如：A. 内容 B. 内容 或 A: 内容 B: 内容
  const optionRegex = /(?:^|\n|\s+)([A-G])[\.．\s\:\：\-\)]+\s*([\s\S]*?)(?=(?:\s+[A-G][\.．\s\:\：\-\)])|(?:\n\s*[A-G][\.．\s\:\：\-\)])|$)/gi;
  
  let match;
  while ((match = optionRegex.exec(rawText)) !== null) {
    const label = match[1].toUpperCase();
    const text = match[2].trim().replace(/\s+/g, ' ');
    if (text) {
      options.push({ label, text });
    }
  }

  // 如果正则没匹配到，尝试按行简单分割
  if (options.length === 0) {
    rawText.split('\n').forEach(line => {
      const m = line.trim().match(/^([A-G])[\.．\s\:\：\-\)]\s*(.*)/i);
      if (m) {
        options.push({ label: m[1].toUpperCase(), text: m[2].trim() });
      }
    });
  }

  return options;
};

/**
 * 【独立解析器 1】Markdown 专用解析逻辑
 * 严格适配用户提供的格式：### 题目 X / **题干** / **选项** / **正确答案**
 */
export const parseMarkdownQuestions = (md: string, fileId: string, certId: string): Question[] => {
  const questions: Question[] = [];
  const seenHashes = new Set<string>();

  // 1. 按 "### 题目 X" 分割
  const blocks = md.split(/(?:^|\n)###\s+题目\s*\d+/i).filter(b => b.trim().length > 20);

  blocks.forEach((block, index) => {
    try {
      // 提取图片 ![alt](data:...)
      const images: string[] = [];
      const imgRegex = /!\[.*?\]\((data:image\/[^"'\s\)]+)\)/gi;
      let imgMatch;
      while ((imgMatch = imgRegex.exec(block)) !== null) {
        images.push(imgMatch[1]);
      }

      // 匹配题干：寻找 **题干**： 之后到 **选项**： 之前的内容
      const contentMatch = block.match(/\*\*题干\*\*[:：]?\s*([\s\S]*?)(?=\n\s*\*\*选项\*\*|$)/i);
      // 匹配选项：寻找 **选项**： 之后到 **正确答案**： 之前的内容
      const optionsMatch = block.match(/\*\*选项\*\*[:：]?\s*([\s\S]*?)(?=\n\s*\*\*正确答案\*\*|$)/i);
      // 匹配答案：寻找 **正确答案**： 之后的 A-G 字符
      const answerMatch = block.match(/\*\*正确答案\*\*[:：]?\s*([A-G]+)/i);
      // 匹配知识点：寻找 **相关知识点**： 之后的内容
      const kpMatch = block.match(/\*\*相关知识点\*\*[:：]?\s*([\s\S]*?)(?:\n\s*###\s*题目|$)/i);

      if (!contentMatch || !optionsMatch || !answerMatch) return;

      const questionContent = contentMatch[1].trim();
      if (!questionContent) return;

      const hash = generateHash(questionContent);
      if (seenHashes.has(hash)) return;
      seenHashes.add(hash);

      const options = extractOptions(optionsMatch[1].trim());
      if (options.length === 0) return;

      const answerArr = answerMatch[1].trim().toUpperCase().split('');
      const type: QuestionType = answerArr.length > 1 ? 'multiple' : 'single';
      const knowledgePoint = kpMatch ? kpMatch[1].trim() : "未分类知识点";

      questions.push({
        id: `q-md-${Date.now()}-${index}`,
        certId,
        fileId,
        type,
        content: questionContent,
        images,
        options,
        answer: answerArr,
        knowledgePoint,
        hash
      });
    } catch (e) {
      console.error("Markdown 解析单个题目块出错:", e);
    }
  });

  return questions;
};

/**
 * 【独立解析器 2】DOCX HTML 专用解析逻辑
 * 专门处理 Mammoth 转换出的 HTML 内容，支持 <img> 标签预提取
 */
export const parseDocxHtmlQuestions = (html: string, fileId: string, certId: string): Question[] => {
  const questions: Question[] = [];
  const seenHashes = new Set<string>();
  
  // 第一步：预处理换行，保留 <img> 标签
  const preProcessed = html
    .replace(/<\/p>/g, '\n')
    .replace(/<br\s*\/?>/g, '\n');

  // 第二步：按“题目 数字”作为硬分割点
  const blocks = preProcessed.split(/题目\s*\d+/i);

  blocks.forEach((block, index) => {
    if (index === 0 && block.trim().length < 10) return;

    try {
      const blockContent = block.trim();
      
      // 提取 HTML 中的图片 Base64
      const images: string[] = [];
      const imgRegex = /<img[^>]+src=["'](data:[^"']+)["'][^>]*>/gi;
      let imgMatch;
      while ((imgMatch = imgRegex.exec(blockContent)) !== null) {
        images.push(imgMatch[1]);
      }

      // 清洗 HTML 得到纯文本用于正则匹配内容
      const cleanText = blockContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      
      // 匹配题干 (Word 版本通常不带 ** 标记)
      const contentMatch = cleanText.match(/^(?:[:：\s]*)?([\s\S]*?)(?=选项[:：]|选项\s|$)/i);
      const optionsMatch = cleanText.match(/(?:选项[:：]|选项)\s*([\s\S]*?)(?=正确答案[:：]|正确答案|$)/i);
      const answerMatch = cleanText.match(/(?:正确答案|答案)[:：]\s*([A-G]+)/i);
      const kpMatch = cleanText.match(/(?:相关知识点|知识点)[:：]\s*([\s\S]*?)$/i);

      if (!contentMatch || !optionsMatch || !answerMatch) return;

      const questionContent = contentMatch[1].trim();
      if (!questionContent) return;

      const hash = generateHash(questionContent);
      if (seenHashes.has(hash)) return;
      seenHashes.add(hash);

      const options = extractOptions(optionsMatch[1].trim());
      if (options.length === 0) return;

      const answerArr = answerMatch[1].trim().toUpperCase().split('');
      const type: QuestionType = answerArr.length > 1 ? 'multiple' : 'single';
      const knowledgePoint = kpMatch ? kpMatch[1].trim() : "未分类知识点";

      questions.push({
        id: `q-docx-${Date.now()}-${index}`,
        certId,
        fileId,
        type,
        content: questionContent,
        images,
        options,
        answer: answerArr,
        knowledgePoint,
        hash
      });
    } catch (e) {
      console.error("DOCX 解析单个题目块出错:", e);
    }
  });

  return questions;
};
