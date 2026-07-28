function levenshtein(a: string, b: string): number {
  const aLen = a.length;
  const bLen = b.length;
  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  const matrix: number[][] = Array.from({ length: aLen + 1 }, () =>
    Array(bLen + 1).fill(0)
  );

  for (let i = 0; i <= aLen; i++) matrix[i][0] = i;
  for (let j = 0; j <= bLen; j++) matrix[0][j] = j;

  for (let i = 1; i <= aLen; i++) {
    for (let j = 1; j <= bLen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[aLen][bLen];
}

function fuzzyWordScore(termWord: string, nameWord: string): number {
  if (termWord === nameWord) return 100;
  if (nameWord.includes(termWord) || termWord.includes(nameWord)) return 80;
  if (nameWord.startsWith(termWord) || termWord.startsWith(nameWord)) return 70;

  const shorter = termWord.length < nameWord.length ? termWord : nameWord;
  const longer = termWord.length < nameWord.length ? nameWord : termWord;

  if (shorter.length < 3) return 0;

  const dist = levenshtein(shorter, longer.slice(0, shorter.length + 2));
  const maxDist = Math.floor(shorter.length * 0.50);

  if (dist <= maxDist) {
    return Math.round(60 * (1 - dist / (shorter.length + 1)));
  }

  return 0;
}

function scoreProductName(productName: string, term: string): number {
  const name = productName.toLowerCase();
  const termLower = term.toLowerCase();
  const termWords = termLower.split(/\s+/).filter(Boolean);
  const nameWords = name.split(/\s+/);

  let bestScore = 0;

  if (name === termLower) {
    bestScore = 100;
  } else if (name.startsWith(termLower)) {
    bestScore = 92;
  } else if (name.includes(termLower)) {
    bestScore = 70 + Math.round((termLower.length / name.length) * 25);
  } else {
    for (const tw of termWords) {
      for (const nw of nameWords) {
        const s = fuzzyWordScore(tw, nw);
        if (s >= 60) {
          bestScore = Math.max(bestScore, Math.round((s / 100) * 70));
        }
      }
    }

    if (bestScore === 0) {
      let matchedCount = 0;
      for (const tw of termWords) {
        for (const nw of nameWords) {
          if (fuzzyWordScore(tw, nw) > 0) {
            matchedCount++;
            break;
          }
        }
      }
      if (matchedCount > 0) {
        bestScore = Math.round((matchedCount / termWords.length) * 55);
      }
    }
  }

  return bestScore;
}

function scoreTags(tags: string[], term: string): number {
  const termLower = term.toLowerCase();
  const termWords = termLower.split(/\s+/).filter(Boolean);

  let tagScore = 0;
  for (const rawTag of tags) {
    const tag = rawTag.toLowerCase();
    if (tag === termLower) {
      tagScore = Math.max(tagScore, 80);
    } else if (tag.startsWith(termLower) || termLower.startsWith(tag)) {
      tagScore = Math.max(tagScore, 65);
    } else if (tag.includes(termLower) || termLower.includes(tag)) {
      tagScore = Math.max(tagScore, 50);
    } else {
      const tagWords = tag.split(/\s+/);
      for (const tw of termWords) {
        for (const tw2 of tagWords) {
          const s = fuzzyWordScore(tw, tw2);
          if (s > 0) {
            tagScore = Math.max(tagScore, Math.round((s / 100) * 45));
          }
        }
      }
    }
  }
  return tagScore;
}

function scoreBrand(brand: string, term: string): number {
  const b = brand.toLowerCase();
  const t = term.toLowerCase();
  if (b === t) return 35;
  if (b.includes(t) || t.includes(b)) return 20;
  return 0;
}

export function scoreProduct(product: any, term: string): number {
  const name = product.productName || product.name || "";
  let bestScore = scoreProductName(name, term);

  const tags: string[] = Array.isArray(product.tags) ? product.tags : [];
  const tagScore = scoreTags(tags, term);
  bestScore = Math.max(bestScore, tagScore);

  const brand = product.brand || "";
  const brandScore = scoreBrand(brand, term);
  bestScore = Math.max(bestScore, brandScore);

  return bestScore;
}

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

function getSubstrings(term: string, minLen = 2): string[] {
  const lower = term.toLowerCase();
  const substrings = new Set<string>();
  for (let len = minLen; len <= lower.length; len++) {
    for (let i = 0; i <= lower.length - len; i++) {
      substrings.add(lower.slice(i, i + len));
    }
  }
  return [...substrings];
}

export function buildFuzzyQuery(searchTerm: string): any {
  const term = searchTerm.toLowerCase().trim();
  const substrings = getSubstrings(term, 2);

  const regexConditions = substrings.map((sub) => ({
    productName: { $regex: escapeRegex(sub), $options: "i" },
  }));

  return {
    publish: true,
    $or: regexConditions,
  };
}

export function filterAndScoreFuzzy(
  candidates: any[],
  searchTerm: string,
  minScore = 10
): Array<{ product: any; score: number }> {
  const term = searchTerm.toLowerCase().trim();

  const scored = candidates.map((product) => ({
    product,
    score: scoreProduct(product, term),
  }));

  return scored
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score);
}
