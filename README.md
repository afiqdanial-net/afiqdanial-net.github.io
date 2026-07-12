# Personal Portfolio — Muhammad Afiq Danial Bin Ahmad

Static portfolio website (plain HTML/CSS/JS, no build process) deployed on GitHub Pages.

## Structure

| File | Purpose |
|------|---------|
| `index.html` | Page layout and section skeleton |
| `styles.css` | All styling (dark/light themes, responsive) |
| `script.js` | Renders content from `content.json`, theme toggle, nav |
| `content.json` | **All text content lives here — edit this to update the site** |
| `resume.pdf` | Resume embedded in the Resume section |

## Editing the site

1. Open `content.json` and change any text (roles, bullets, skills, contact info).
2. To swap the resume, replace `resume.pdf` with a new file of the same name.
3. To add a real photo, put e.g. `photo.jpg` in the folder and set `"photo": "photo.jpg"` in `content.json` under `profile`.
4. Commit and push — GitHub Pages redeploys automatically:

```bash
git add .
git commit -m "Update content"
git push
```

## Preview locally

Browsers block `fetch()` of local files, so serve over HTTP:

```bash
python -m http.server 8000
# then open http://localhost:8000
```
