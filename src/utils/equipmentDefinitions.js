export function equipmentDefinitionsFromResponse(response) {
  if (!Array.isArray(response?.rows)) return {
    categories: Array.isArray(response?.categories) ? response.categories : [],
    titles: Array.isArray(response?.titles) ? response.titles : [],
    fields: Array.isArray(response?.fields) ? response.fields : [],
  };

  const categories = new Map((Array.isArray(response.categories) ? response.categories : []).map((item) => [String(item.id), item]));
  const titles = new Map();
  const fields = [];
  response.rows.forEach((row) => {
    if (row.id == null || row.categoryId == null || row.titleId == null) return;
    const categoryId = String(row.categoryId);
    const titleId = String(row.titleId);
    categories.set(categoryId, { id: row.categoryId, name: row.category });
    titles.set(titleId, { id: row.titleId, categoryId: row.categoryId, name: row.title });
    fields.push({ id: row.id, categoryId: row.categoryId, titleId: row.titleId, name: row.field });
  });
  const specifications = Array.isArray(response.specifications) ? response.specifications : [];
  specifications.slice().sort((a, b) => String(a.code).localeCompare(String(b.code), "fa", { numeric: true })).forEach((item) => {
    if (item.id == null || item.categoryId == null) return;
    const titleId = `spec:${item.categoryId}`;
    titles.set(titleId, { id: titleId, categoryId: item.categoryId, name: "مشخصات تجهیزات" });
    fields.push({ id: `spec:${item.id}`, categoryId: item.categoryId, titleId, name: `${item.code} - ${item.name}` });
  });
  return { categories: [...categories.values()], titles: [...titles.values()], fields };
}
