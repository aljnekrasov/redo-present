# Presentation Studio: формат набора

Один набор хранится в `projects/<project>/output/`. Для работы достаточно Python 3.9+ и браузера. Просмотрщик общий для всех клиентов; при `prepare` в набор копируются одни и те же файлы интерфейса.

## Файлы автора

- `content.json`: project (латиница, цифры, дефисы), version (непустая строка), title, client и slides.
- Каждый элемент slides: постоянные id, title для навигации, blocks — словарь `идентификатор: текст`. При необходимости добавляйте свои поля, например роль, плотность, источник, данные таблицы. В blocks должны попасть все содержательные тексты, включая каждую подпись и оговорку.
- `variants.json`: словарь по slide id. Для каждого — пять объектов с number от 1 до 5, label и path вида `variants/<slide-id>/<number>.html`.
- `assets/`: все шрифты, изображения, стили и прочие зависимости. Используйте только локальные относительные ссылки внутри набора. Варианты должны открываться без скриптов: просмотрщик показывает их в sandbox. Геометрия холста 1920 × 1080.

В каждом HTML-варианте каждый блок из content.json встречается ровно один раз, в элементе `data-content-id="<block-id>"`. Текст элемента должен совпадать с исходным блоком (пробелы и переносы нормализуются). Блоки не вкладываются друг в друга. Общая служебная подпись бренда может находиться вне блоков. Содержательные тексты вне блоков недопустимы; визуальная проверка по-прежнему нужна для контроля читаемости и смысла изображений.

Пример структуры слайда:

```json
{"id":"opportunity","title":"Возможность","blocks":{"title":"Investment opportunity","metric":"15%","note":"Discount to the initial pre-sale price"}}
```

Пример элемента варианта:

```json
{"number":1,"label":"Крупная метрика","path":"variants/opportunity/1.html"}
```

Блок: `<h1 data-content-id="title">Investment opportunity</h1>`.

## Команды

Замените `<skill-dir>` на абсолютный путь к установленной папке `redo-present`. Пути к рабочим наборам относятся к проекту пользователя.

```sh
python3 <skill-dir>/scripts/studio.py validate projects/example/output
python3 <skill-dir>/scripts/studio.py prepare projects/example/output
python3 -m http.server 8765 --bind 127.0.0.1
```

Открыть `/projects/example/output/selector.html`. Можно открыть selector.html как локальный файл, но сохранение браузером надёжнее на localhost. Просмотрщик не отправляет сообщения в чат и не меняет Figma автоматически.

При prepare создаётся manifest.json с отпечатком содержимого, вариантов и ассетов. После показа пользователю набор заморожен. При изменении любого из этих файлов увеличьте version и повторите prepare. Старый выбор не подставляется в новую версию.

Сборка по скачанному файлу выбора:

```sh
python3 <skill-dir>/scripts/studio.py assemble projects/example/output --selection /path/to/selection.json --output projects/example/final-v1
```

Сборка по списку из чата (идентификатор набора должен быть однозначен в контексте):

```sh
python3 <skill-dir>/scripts/studio.py assemble projects/example/output --choices '2,5,1' --fingerprint <значение-из-manifest.json-показанного-набора> --output projects/example/final-v1
```

Числа соответствуют порядку slides. Сборщик проверяет длину, диапазон и отпечаток. Существующая папка результата не перезаписывается. В новую папку копируются только выбранные HTML-варианты, общие ассеты, содержание и selection.json; index.html показывает готовую последовательность. Байты выбранных вариантов не меняются.

HTML — основной рабочий формат сборки. Для Figma переносите только выбранные варианты отдельным этапом через доступные Figma tools и проверяйте итог. Автоматического экспортёра в Figma/PPTX в этом инструменте нет.

## Проверка

`python3 -m unittest discover -s tests -p 'test_*.py'` проверяет сборку, ошибки выбора, версии и содержание. Браузерная проверка должна охватывать переключение вариантов, перезагрузку, экспорт и мобильную вёрстку. Новые варианты требуют собственной визуальной проверки; текстовая проверка не доказывает отсутствие обрезки.

## Per-slide background colors

Define `backgroundOptions` in `content.json` using the client's palette, e.g.:

```json
"backgroundOptions": [
  {"id":"light","label":"Светлый","color":"#FFFFFF","textColor":"#000000"},
  {"id":"dark","label":"Тёмный","color":"#000000","textColor":"#FFFFFF"},
  {"id":"blue","label":"Синий","color":"#1557FF","textColor":"#FFFFFF"}
]
```

IDs are unique lowercase letters/digits/hyphens; colors are six-digit hex. Add `data-background-surface` to the actual slide background element (not only the outer body), and `data-background-ink` to text that must follow its foreground color. Do not mark text on independently colored/photo panels unless it should change too. Keep image fills, decorative patterns and charts separate. Explicitly check readability for every permitted background and all five compositions. The UI displays only the supplied palette plus “Исходный” to restore the variant's original design.

The selected background is independent of the layout number and applies across its five variants. `selection.json` includes `backgrounds`, an array aligned with `slideIds`; each entry is a palette ID or `null` for the original design. Older selection files without the field retain original backgrounds. The assembler validates IDs and injects the same narrowly targeted background/foreground CSS used by the viewer. No HTML changes are made for a `null` background.

When any background has changed, the viewer's copy action copies the complete selection JSON instead of a bare number list, so colors and project identity are preserved. Ask for that JSON/file if the user wants changed backgrounds but only supplies layout numbers; do not silently discard their colors. Plain number lists still mean original backgrounds. Palette or background-hook changes alter the bundle fingerprint, so bump the version and prepare again before review.


Each background option may include `"pattern": true` (default false). Offer pairs such as `blue` / `blue-pattern`, both with the same color and textColor. Pattern selection is a background treatment, never a separate composition. Every variant should carry the brand pattern in a dedicated `data-background-pattern` decorative element, with its asset URL, opacity, position and stacking defined in the variant's CSS. The viewer and assembler only toggle that element; a plain color always hides it. Use `data-pattern-allowed="false"` on that element for layouts where the styling guide prohibits patterns. Do not synthesize a pattern for a brand without one. Do not put pattern art in an unmarked pseudo-element that the picker cannot turn off. Verify that the decoration stays behind content and photos.

Before delivering five variants, compare them under one plain background. Replace compositions that differ only by color/pattern with genuinely different arrangements. Name variants by their composition (e.g. “Two columns”), not their color (“Dark”).


## Source of the five layouts

For new sets, variants 1–3 adapt distinct layouts from the user's selected style library. Add `"origin":"library"` and `"templateRef":"<actual source path, URL or layout ID>"` to each entry in variants.json. Variants 4–5 are new compositions made by the skill in the selected style; add `"origin":"generated"`. Keep all canonical content identical. Never relabel a previously invented layout as library-derived. Older sets without origin metadata remain readable. With insufficient suitable library layouts, ask how to supplement them instead of fabricating references.

The background control uses circular buttons with accessible names and pressed states; striped swatches denote patterned backgrounds. The selected color resets the marked surface's full background shorthand, including opaque gradients; mark only replaceable canvas surfaces, not photo containers. Pattern elements sit at z-index 0 inside an isolated surface, and content above them. Inspect renderings for hidden opaque wrappers and ensure the actual visible background is tagged. Visually compare plain/pattern screenshots for each palette color and layout; computed styles alone cannot prove a pattern is visible.
