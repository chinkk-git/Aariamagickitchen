export async function loadJson(url) {
  const response=await fetch(url);
  if(!response.ok) throw new Error(`Could not load content (${response.status}).`);
  return response.json();
}
