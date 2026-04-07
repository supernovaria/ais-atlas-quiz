/**
 * Parses quiz markdown files into structured question data.
 *
 * Each chapter is a single file with frontmatter and # headings for sections:
 *
 * ---
 * chapter: 1
 * title: Capabilities
 * ---
 *
 * # Introduction
 *
 * ### Question 1
 * Question text here?
 *
 * - [ ] Wrong answer
 * - [x] Correct answer
 *
 * **Explanation**: Why the answer is correct...
 *
 * To prevent answer shuffling on a specific question, add <!-- no-shuffle -->
 * to the question text (e.g. for "All of the above" answers).
 *
 * # Current Capabilities
 * ...
 *
 * # Chapter Review        <-- "Chapter Review" heading = review quiz
 * ...
 */

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { meta: {}, body: text };

  const meta = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (/^\d+$/.test(value)) value = parseInt(value, 10);
    meta[key] = value;
  }

  const body = text.slice(match[0].length).trim();
  return { meta, body };
}

function parseMCQuestions(body) {
  const questionBlocks = body.split(/^### Question \d+\s*$/m).filter(b => b.trim());

  return questionBlocks.map((block, idx) => {
    const lines = block.trim().split('\n');
    const questionLines = [];
    const options = [];
    let explanation = '';
    let i = 0;

    while (i < lines.length && !lines[i].match(/^- \[[ x]\] /)) {
      questionLines.push(lines[i]);
      i++;
    }

    while (i < lines.length && lines[i].match(/^- \[[ x]\] /)) {
      const isCorrect = lines[i].startsWith('- [x] ');
      const text = lines[i].replace(/^- \[[ x]\] /, '');
      options.push({ text, isCorrect });
      i++;
    }

    const remaining = lines.slice(i).join('\n').trim();
    const explMatch = remaining.match(/\*\*Explanation\*\*:\s*([\s\S]*)/);
    if (explMatch) {
      explanation = explMatch[1].trim();
    }

    const questionText = questionLines.join('\n').trim();
    const noShuffle = /<!--\s*no-shuffle\s*-->/.test(questionText);

    return {
      id: idx + 1,
      type: 'mc',
      question: questionText.replace(/<!--\s*no-shuffle\s*-->\s*/g, '').trim(),
      options,
      explanation,
      shuffleAnswers: !noShuffle,
    };
  }).filter(q => q.options.length > 0);
}

function parseQuestions(body) {
  return parseMCQuestions(body);
}

/**
 * Parse a single-file chapter into an array of quiz objects (one per # section).
 */
export function parseChapterMarkdown(text) {
  const { meta, body } = parseFrontmatter(text);

  // Split body on # headings (but not ## or ###)
  const sectionSplits = body.split(/^# (.+)$/m);
  // sectionSplits: ['', 'Introduction', '...content...', 'Current Capabilities', '...content...', ...]

  const quizzes = [];
  let sectionNumber = 1;

  for (let i = 1; i < sectionSplits.length; i += 2) {
    const title = sectionSplits[i].trim();
    const content = sectionSplits[i + 1] || '';
    const questions = parseQuestions(content);

    if (questions.length === 0) continue;

    const isReview = /review/i.test(title);

    quizzes.push({
      chapter: meta.chapter,
      section: isReview ? 0 : sectionNumber,
      title,
      type: isReview ? 'review' : 'section',
      questions,
    });

    if (!isReview) sectionNumber++;
  }

  return quizzes;
}

export async function loadChapter(path) {
  const response = await fetch(path);
  const text = await response.text();
  return parseChapterMarkdown(text);
}

export async function loadAllQuizzes() {
  const res = await fetch('/questions/manifest.json');
  const files = await res.json();

  const chapterResults = await Promise.all(files.map(loadChapter));
  return chapterResults.flat();
}
