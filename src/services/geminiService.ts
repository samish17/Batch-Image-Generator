import { GoogleGenAI, Type } from '@google/genai';
import JSZip from 'jszip';
import { useStore, GeneratedImage, ReferenceImage } from '../store/useStore';
import { fileToBase64 } from '../lib/utils';

function getAiClient() {
  const { geminiApiKey } = useStore.getState();
  const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Google Gemini API key is required. Please provide it in the settings or environment.');
  }
  return new GoogleGenAI({ apiKey });
}

export async function generatePromptVariations(basePrompt: string, count: number): Promise<string[]> {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate ${count} distinct, highly creative, and detailed image generation prompts based on this base idea: "${basePrompt}". Make them descriptive and varied in style.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error('No text returned from Gemini');
    const prompts = JSON.parse(text) as string[];
    return prompts.slice(0, count);
  } catch (error) {
    console.error('Error generating prompts:', error);
    // Fallback if prompt generation fails
    return Array.from({ length: count }).map((_, i) => `${basePrompt} - variation ${i + 1}`);
  }
}

export async function generateSingleImage(
  prompt: string,
  referenceImage?: ReferenceImage
): Promise<string> {
  const { openRouterApiKey } = useStore.getState();

  if (openRouterApiKey) {
    return generateImageWithOpenRouter(prompt, openRouterApiKey, referenceImage);
  }

  const parts: any[] = [];

  if (referenceImage) {
    const base64Data = await fileToBase64(referenceImage.file);
    const mimeType = referenceImage.file.type;
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    });
  }

  parts.push({ text: prompt });

  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: parts,
    },
  });

  const responseParts = response.candidates?.[0]?.content?.parts;
  if (!responseParts) throw new Error('No parts returned from Gemini');

  for (const part of responseParts) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    }
  }

  throw new Error('No image data found in response');
}

async function generateImageWithOpenRouter(prompt: string, apiKey: string, referenceImage?: ReferenceImage): Promise<string> {
  const content: any[] = [{ type: 'text', text: prompt }];

  if (referenceImage) {
    const base64Data = await fileToBase64(referenceImage.file);
    content.push({
      type: 'image_url',
      image_url: {
        url: `data:${referenceImage.file.type};base64,${base64Data}`
      }
    });
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.href,
      'X-Title': 'AI Studio App',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-image',
      messages: [
        {
          role: 'user',
          content: content
        }
      ],
      modalities: ['image', 'text']
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to generate image with OpenRouter');
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message;
  
  if (message?.images && message.images.length > 0) {
    return message.images[0].image_url.url;
  }

  throw new Error('OpenRouter did not return a valid image');
}

export async function generateImages(
  initialImages: GeneratedImage[],
  referenceImages: ReferenceImage[]
) {
  const { updateGeneratedImage } = useStore.getState();

  // Group by reference image to generate variations based on their specific prompts.
  const promptsByRefId: Record<string, string[]> = {};
  
  for (const refImg of referenceImages) {
    // Only generate variations for images that don't have a custom prompt
    const count = initialImages.filter(img => img.refImageId === refImg.id && !img.prompt.trim()).length;
    if (count > 0) {
      const basePrompt = refImg.prompt || 'A creative variation of this image';
      promptsByRefId[refImg.id] = await generatePromptVariations(basePrompt, count);
    }
  }

  const noRefImagesCount = initialImages.filter(img => !img.refImageId && !img.prompt.trim()).length;
  if (noRefImagesCount > 0) {
    promptsByRefId['no-ref'] = await generatePromptVariations('A beautiful, creative, and highly detailed image', noRefImagesCount);
  }

  // Assign prompts to initial images
  const imagesWithPrompts = initialImages.map(img => {
    if (img.prompt.trim()) {
      return img; // Keep custom prompt
    }
    const prompts = img.refImageId ? promptsByRefId[img.refImageId] : promptsByRefId['no-ref'];
    const prompt = prompts?.shift() || 'A beautiful creative image';
    return { ...img, prompt };
  });

  // Update store with new prompts
  imagesWithPrompts.forEach(img => {
    updateGeneratedImage(img.id, { prompt: img.prompt });
  });

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  for (let i = 0; i < imagesWithPrompts.length; i++) {
    const img = imagesWithPrompts[i];
    const refImg = referenceImages.find(r => r.id === img.refImageId);

    try {
      const url = await generateSingleImage(img.prompt, refImg);
      updateGeneratedImage(img.id, { url, status: 'success' });
    } catch (err: unknown) {
      console.error(`Failed to generate image ${img.id}:`, err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      updateGeneratedImage(img.id, { status: 'error', errorMessage });
    }

    // Add a 3-second delay before the next generation (except for the last one)
    if (i < imagesWithPrompts.length - 1) {
      await delay(3000);
    }
  }
}

export async function regenerateSingleImage(
  image: GeneratedImage,
  referenceImages: ReferenceImage[]
) {
  const { updateGeneratedImage } = useStore.getState();
  const refImg = referenceImages.find(r => r.id === image.refImageId);

  updateGeneratedImage(image.id, { status: 'loading', errorMessage: undefined });

  try {
    const basePrompt = refImg?.prompt || 'A creative variation of this image';
    const [newPrompt] = await generatePromptVariations(basePrompt, 1);
    
    updateGeneratedImage(image.id, { prompt: newPrompt });
    
    const url = await generateSingleImage(newPrompt, refImg);
    updateGeneratedImage(image.id, { url, status: 'success' });
  } catch (error: unknown) {
    console.error(`Failed to regenerate image ${image.id}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    updateGeneratedImage(image.id, { status: 'error', errorMessage });
  }
}

export async function regenerateAllImages(
  currentImages: GeneratedImage[],
  referenceImages: ReferenceImage[]
) {
  const { setGeneratedImages, setIsGenerating } = useStore.getState();
  
  setIsGenerating(true);
  
  const resetImages = currentImages.map(img => ({
    ...img,
    status: 'loading' as const,
    errorMessage: undefined,
    url: ''
  }));
  
  setGeneratedImages(resetImages);
  
  try {
    await generateImages(resetImages, referenceImages);
  } finally {
    setIsGenerating(false);
  }
}

export async function extractPromptsFromFile(file: File): Promise<string[]> {
  let textContent = '';
  let pdfData: { mimeType: string; data: string } | null = null;

  if (file.type === 'text/plain') {
    textContent = await file.text();
  } else if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(file);
    const documentXml = loadedZip.file('word/document.xml');
    if (!documentXml) throw new Error('Invalid DOCX file');
    const xml = await documentXml.async('string');
    textContent = xml.replace(/<w:p[^>]*>/g, '\n').replace(/<[^>]+>/g, '');
  } else if (file.type === 'application/pdf') {
    const base64 = await fileToBase64(file);
    pdfData = { mimeType: 'application/pdf', data: base64 };
  } else {
    throw new Error('Unsupported file type. Please upload .txt, .pdf, or .docx');
  }

  const prompt = `Extract up to 20 image generation prompts from the provided document. Return them as a JSON array of strings. If the document contains a list of ideas, descriptions, or prompts, extract them. If there are fewer than 20, return as many as you can find.`;

  const contents: any[] = [];
  if (pdfData) {
    contents.push({
      parts: [
        { inlineData: pdfData },
        { text: prompt }
      ]
    });
  } else {
    contents.push({
      parts: [
        { text: `Document content:\n${textContent}\n\n${prompt}` }
      ]
    });
  }

  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: contents[0],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error('No text returned from Gemini');
  return JSON.parse(text) as string[];
}
