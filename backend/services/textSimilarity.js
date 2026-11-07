/**
 * Text Similarity Service for Deterministic Prompt Drift Detection
 * Computes Cosine Similarity between term frequency vectors of baseline prompt/output and candidate text.
 */

const tokenize = (text) => {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(token => token.length > 1);
};

const getTermFrequencies = (tokens) => {
  const tf = {};
  for (const token of tokens) {
    tf[token] = (tf[token] || 0) + 1;
  }
  return tf;
};

/**
 * Calculates Cosine Similarity between two text passages
 * @param {string} textA Baseline text
 * @param {string} textB Candidate response text
 * @returns {number} Score between 0.0 (no similarity) and 1.0 (identical)
 */
const calculateCosineSimilarity = (textA, textB) => {
  if (!textA || !textB) return 0;
  if (textA.trim() === textB.trim()) return 1.0;

  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const tfA = getTermFrequencies(tokensA);
  const tfB = getTermFrequencies(tokensB);

  // Union of terms
  const allTerms = new Set([...Object.keys(tfA), ...Object.keys(tfB)]);

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const term of allTerms) {
    const countA = tfA[term] || 0;
    const countB = tfB[term] || 0;

    dotProduct += countA * countB;
    normA += countA * countA;
    normB += countB * countB;
  }

  if (normA === 0 || normB === 0) return 0;

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Number(similarity.toFixed(4));
};

module.exports = {
  calculateCosineSimilarity,
  tokenize
};
