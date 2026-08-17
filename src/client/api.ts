export type ApiError = { code: string; message: string; details?: unknown; requestId?: string };
let csrf = '';
export function setCsrf(value: string) { csrf = value; }
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type','application/json');
  if (!['GET','HEAD'].includes((options.method ?? 'GET').toUpperCase()) && csrf) headers.set('x-csrf-token',csrf);
  const response = await fetch(path,{...options,headers,credentials:'same-origin'});
  if (!response.ok) {
    const fallback: ApiError = { code:`HTTP_${response.status}`,message:'The request failed.' };
    throw await response.json().catch(()=>fallback) as ApiError;
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
export async function download(path: string, filename: string) {
  const response = await fetch(path,{credentials:'same-origin'});
  if(!response.ok) throw await response.json() as ApiError;
  const url=URL.createObjectURL(await response.blob()),anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.click();URL.revokeObjectURL(url);
}
