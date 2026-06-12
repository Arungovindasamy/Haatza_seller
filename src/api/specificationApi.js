export const fetchCategoryFields = async (categoryId) => {
  let res;
  try {
    res = await fetch(
      `https://haatza.com/_functions/CategoryFields?categoryId=${categoryId}`
    );
  } catch (networkErr) {
    throw new Error(`Network error — check your connection: ${networkErr.message}`);
  }

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  const raw = Array.isArray(json)
    ? json
    : (json.message?.data || json.data || json.fields || json.items || []);

  return [...raw].sort((a, b) => (a.sequence ?? 999) - (b.sequence ?? 999));
};