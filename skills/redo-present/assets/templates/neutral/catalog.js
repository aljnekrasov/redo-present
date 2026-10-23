const grid = document.querySelector("#grid");
const search = document.querySelector("#search");
function render() {
  const query = search.value.toLocaleLowerCase().trim();
  const synonyms = {фото:"photo|portrait|panoramic|feature|фото|шахмат|полос|асимметр|контактный",цитата:"quote|statement|цитата",метрики:"metric|insight|метрик",таблица:"table|матрица|спецификация|сравнение",обложка:"title|closing|раздел|шмуцтитул"};
  const pattern = synonyms[query] ? new RegExp(synonyms[query],"i") : null;
  const items = window.NEUTRAL_LAYOUTS.filter(f => pattern ? pattern.test(f.name) : f.name.toLocaleLowerCase().includes(query));
  grid.replaceChildren(...items.map(f => {
    const article = document.createElement("article");
    article.className = "tile";
    const a = document.createElement("a");
    a.href = f.path;
    const preview = document.createElement("div");
    preview.className = "preview";
    const img = document.createElement("img");
    img.src = "previews/" + f.id.replace(":", "-") + ".jpg";
    img.alt = f.name;
    img.loading = "lazy";
    preview.append(img);
    const meta = document.createElement("div");
    meta.className = "tile-meta";
    const title = document.createElement("strong");
    title.textContent = f.name;
    const id = document.createElement("span");
    id.textContent = f.id + " ↗";
    meta.append(title,id);
    a.append(preview,meta);article.append(a);
    return article;
  }));
  document.querySelector("#count").textContent = items.length + " / " + window.NEUTRAL_LAYOUTS.length;
  document.querySelector("#empty").hidden = items.length !== 0;
}
search.addEventListener("input",render);
render();
