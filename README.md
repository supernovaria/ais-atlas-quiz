# AI Safety Atlas - Quiz Companion

An unofficial quiz companion for the [AI Safety Atlas](https://ai-safety-atlas.com/chapters/v1/capabilities/introduction/). Test your understanding of key concepts from the textbook with section quizzes and chapter reviews.

Currently covers **Chapter 1: Capabilities**.

**Note:** Questions are AI-generated placeholders for demonstration purposes.

## Running Locally

**Prerequisites:** [Node.js](https://nodejs.org/) (v18 or later). This project lives in WSL, so run all commands from a WSL/Ubuntu terminal (not PowerShell).

```bash
# Navigate to the project
cd ~/ais-atlas-quiz

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Then open the URL shown in your terminal (usually http://localhost:5173).

Alternatively, from PowerShell:

```powershell
wsl -d Ubuntu -e bash -c "cd ~/ais-atlas-quiz && npm run dev"
```

### Other commands

```bash
npm run build     # Build for production (output in dist/)
npm run preview   # Preview the production build locally
npm run lint      # Run ESLint
```

## Adding Questions

Quiz content lives in markdown files under `public/questions/`. Each chapter is a single `.md` file with frontmatter and `#` headings for sections. See `public/questions/ch1-capabilities.md` for the format.

New `.md` files added to `public/questions/` are picked up automatically — a Vite plugin generates the manifest at dev/build time.

Answer choices are shuffled by default. To disable shuffling for a specific question (e.g. when answers include "All of the above"), add `<!-- no-shuffle -->` to the question text:

```markdown
### Question 3
<!-- no-shuffle -->
Which of the following are true?

- [ ] Only A
- [ ] Only B
- [x] Both A and B
- [ ] None of the above
```

## Future Ideas

- **Accessibility:** Add ARIA attributes for screen reader support — `role="radiogroup"`/`role="radio"` on answer options, `aria-live="polite"` on explanation feedback, `aria-label` on the progress bar. The quiz is already keyboard-navigable (1-9 to select, Enter to submit/advance), but screen readers currently lack semantic context for what each element represents.

## Tech Stack

- React 19
- Vite 5
- Vanilla CSS with CSS custom properties

## Expansion to more chapters

- For quiz: Add ch[number]-[name].md with questions into .\public\questions
- For audio: run pipeline.py --chapter <name>, then copy the *.srt, *.words.json, and manifest.json to .\public\audio folder. The pipeline now generates all three automatically.