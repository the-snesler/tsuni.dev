import type { APIRoute } from 'astro';
import { GUESTBOOK_SECRET_KEY, GUESTBOOK_WEBHOOK } from 'astro:env/server';

const DRAWINGS_KEY = 'drawings.bin';
const delimiter = new Uint8Array([255]);

export const prerender = false;

const parseDrawings = (fileContent: Uint8Array): Uint8Array[] => {
  const drawingsData: Uint8Array[] = [];
  let startIndex = 0;
  // parse the file content into separate drawings
  for (let i = 0; i < fileContent.length; i++) {
    if (fileContent[i] === delimiter[0]) {
      if (i > startIndex) {
        drawingsData.push(fileContent.slice(startIndex, i));
      }
      startIndex = i + 1;
    }
  }
  // push the last drawing if it exists
  if (startIndex < fileContent.length) {
    drawingsData.push(fileContent.slice(startIndex));
  }
  return drawingsData;
};

const serializeDrawings = (drawingsData: Uint8Array[]): Uint8Array => {
  const totalLength = drawingsData.length * 64 + drawingsData.length - 1;
  const finalBuffer = new Uint8Array(totalLength);
  let offset = 0;
  drawingsData.forEach((drawing, i) => {
    finalBuffer.set(drawing, offset);
    offset += drawing.length;
    if (i < drawingsData.length - 1) {
      finalBuffer.set(delimiter, offset);
      offset += delimiter.length;
    }
  });
  return finalBuffer;
};

export const GET: APIRoute = async ({ locals }) => {
  try {
    const obj = await locals.runtime.env.DRAWINGS.get(DRAWINGS_KEY);
    const content = obj ? await obj.arrayBuffer() : new ArrayBuffer(0);
    return new Response(new Uint8Array(content), {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e) {
    console.error('Error retrieving drawings:', e);
    return new Response('Error retrieving drawings', { status: 500 });
  }
};

export const POST: APIRoute = async ({ locals, request }) => {
  try {
    const buffer = new Uint8Array(await request.arrayBuffer());
    const existing = await locals.runtime.env.DRAWINGS.get(DRAWINGS_KEY);
    const existingBuffer = existing ? new Uint8Array(await existing.arrayBuffer()) : new Uint8Array(0);
    const drawingsData = parseDrawings(existingBuffer);
    drawingsData.push(buffer);
    const newBuffer = serializeDrawings(drawingsData);
    await locals.runtime.env.DRAWINGS.put(DRAWINGS_KEY, newBuffer);
    // Send notification to Discord webhook
    await fetch(GUESTBOOK_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'A new drawing has been posted.' })
    });
    return new Response('Drawing received', { status: 200 });
  } catch (e) {
    console.error('Error saving drawing:', e);
    return new Response('Error saving drawing', { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ locals, request }) => {
  const clientKey = request.headers.get('secret-key');
  const indexHeader = request.headers.get('drawing-index');
  const drawingIndexToDelete = indexHeader ? parseInt(indexHeader, 10) : NaN;

  if (!clientKey || isNaN(drawingIndexToDelete) || drawingIndexToDelete < 0) {
    return new Response('Missing or invalid secret key or drawing index.', { status: 400 });
  }
  const serverKey = GUESTBOOK_SECRET_KEY;
  if (clientKey !== serverKey) {
    return new Response('Invalid secret key.', { status: 403 });
  }

  try {
    const obj = await locals.runtime.env.DRAWINGS.get(DRAWINGS_KEY);
    if (!obj) {
      return new Response('No drawings found to delete.', { status: 404 });
    }
    const fileContent = new Uint8Array(await obj.arrayBuffer());
    if (fileContent.length === 0) {
      return new Response('Drawings file is empty.', { status: 404 });
    }
    const drawingsData = parseDrawings(fileContent);
    if (drawingIndexToDelete >= drawingsData.length) {
      return new Response('Drawing index out of bounds.', { status: 400 });
    }
    drawingsData.splice(drawingIndexToDelete, 1);
    const newBuffer = serializeDrawings(drawingsData);
    await locals.runtime.env.DRAWINGS.put(DRAWINGS_KEY, newBuffer);
    return new Response('Drawing deleted successfully.', { status: 200 });
  } catch (e) {
    console.error('Error deleting drawing:', e);
    return new Response('Error deleting drawing.', { status: 500 });
  }
};
