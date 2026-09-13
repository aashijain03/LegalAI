import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import Tesseract from "tesseract.js";

export async function extractTextFromFile(file) {
  if (file.mimetype === "application/pdf") {
    const parser = new PDFParse({ data: file.buffer });
    const data = await parser.getText();
    await parser.destroy();
    return data.text;
  }

  if (
    file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.originalname.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  }

  if (file.mimetype === "application/msword" || file.originalname.endsWith(".doc")) {
    // Basic support for older .doc might be limited with mammoth but let's try
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  }

  if (file.mimetype.startsWith("image/")) {
    const result = await Tesseract.recognize(file.buffer, "eng");
    return result.data.text;
  }

  return file.buffer.toString("utf8");
}
