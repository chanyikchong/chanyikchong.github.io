```python
import sys

sys.path.append("../../")
from src.llmcore.tokenizers import BPETokenizer, BaseTokenizer, RegexTokenizer
```

```python
from collections import Counter, defaultdict
from typing import List, Tuple, Dict, Iterable
import math
import re
```

# Classic NLP

## Perplexity
Perplexity is a standard metric for evaluating language models. It measures how “surprised” a model is by a sequence of text. <br>
* Lower perplexity = better language model (it assigns higher probability to the correct next tokens).
* A perplexity of 10 roughly means the model is as uncertain as if it were choosing among ~10 equally likely next tokens on average.

### Definition
Given a token sequence $w_1, w_2, \dots, w_T$, a language model assigns probabilities:

$$P(w_1, w_2, \dots, w_T)=\Pi_{t=1}^{T}P(w_t|w_{1:t-1})$$

Perplexity is:

$$PPL=exp(-\frac{1}{T}\sum_{t=1}^{T}\text{log} P(w_t|w_{1:t-1}))$$

### Usage
* It gives a single number to compare models on the same dataset.
* It’s especially useful for base LMs (next-token prediction).

### Note
Only compare perplexity
* On the same dataset
* with the same tokenization
* under the same evaluation setup

## N-gram
Given a token sequence $w_1, w_2, \dots, w_T$, an N-gram model approximates:

$$P(w_t|w_1, w_2, \dots, w_{t-1})=P(w_t|w_{t-n+1}, \dots, w_{t-1})$$

Approximate the $P(w_t|w_1, \dots, w_{t-1})$ with the last n tokens $P(w_t|w_{t-n+1}, \dots, w_{t-1})$. <br>
For bi-gram (n=2), only consider the token ahead.

$$P(w_t|w_{t-1}) = \frac{\text{count}(w_{t-1}, w_t)}{\text{count}(w_{t-1})}$$

With add-one smoothing (Laplace)

$$P(w_t|w_{t-1}) = \frac{\text{count}(w_{t-1}, w_t)+1}{\text{count}(w_{t-1})+|V|}$$

$|V|$ is the vocabulary size.

```python
class NgramLM:
    def __init__(self, n_gram: int = 2, alpha: float = 2.0):
        if n_gram < 1:
            raise ValueError("ngram must be greater than 0")
        if alpha < 0:
            raise ValueError("alpha must be greater than 0")

        self.n_gram = n_gram
        self.alpha = alpha
        self.tokenizer = tokenizer

        self.ngram_count = Counter()
        self.context_count = Counter()
        self.vocab = set()

        self.bos = "<s>"  # context start token
        self.eos = "</s>"  # context end token

    def _pad_tokens(self, tokens: List[str]) -> List[str]:
        """
        Add BOS tokens for context and EOS token.
        For n=1, we still add EOS to model sentence end probability.
        """
        if self.n_gram == 1:
            return tokens + [self.eos]
        return [self.bos] + tokens + [self.eos]

    def _extract_ngrams(self, tokens: List[str]) -> Iterable[Tuple[str, ...]]:
        for i in range(len(tokens) - self.n_gram + 1):
            yield tuple(tokens[i:i + self.n_gram])

    def _context(self, ngram: Tuple[str, ...]) -> Tuple[str, ...]:
        return ngram[:-1]

    def fit(self, corpus: List[str], tokenizer: Tokenizer) -> None:
        self.ngram_count.clear()
        self.context_count.clear()
        self.vocab.clear()

        if self.n_gram > 1:
            self.vocab.add(self.bos)
        self.vocab.add(self.eos)

        for text in corpus:
            tokens = tokenizer.tokenize(text)
            padded = self._pad_tokens(tokens)
            # update vocab
            self.vocab.update(padded)
            # count n-grams

            for ng in self._extract_ngrams(padded):
                self.ngram_count[ng] += 1  # count(w_{t-1}, w_t)
                ctx = self._context(ng)
                self.context_count[ctx] += 1  # condition context i.e., w_{t-1}            

    @property
    def V(self) -> int:
        return len(self.vocab)

    def prob_next(self, context_tokens: List[str], next_token: str) -> float:
        """
        Compute P(next_token | context) with add-alpha smoothing.

        context_tokens should be the last (n-1) tokens of history.
        For n=1, context is ignored.
        """
        if self.n_gram == 1:
            ng = (next_token,)
            count_ng = self.ngram_counts[ng]
            count_ctx = sum(self.ngram_counts[(t,)] for t in self.vocab if isinstance(t, str))
            # If not trained yet, avoid division by zero
            denom = count_ctx + self.alpha * self.V
            return (count_ng + self.alpha) / denom if denom > 0 else 0.0

        # forming the context by taking n-1 token from context tokens and add with the next token
        ctx = tuple(context_tokens[-(self.n_gram - 1):]) if context_tokens else tuple([self.bos] * (self.n - 1))
        ng = ctx + (next_token,)

        count_ng = self.ngram_count[ng]
        count_ctx = self.context_count[ctx]
        return (count_ng + self.alpha) / (count_ctx + self.alpha + self.V)

    def sentence_logprob(self, text: str, tokenizer: Tokenizer) -> float:
        tokens = tokenizer.tokenize(text)
        padded = self._pad_tokens(tokens)

        logp = 0.0
        for ng in self._extract_ngrams(padded):
            ctx = list(ng[:-1])  # forming the context
            nxt = ng[-1]  # forming the next token
            p = self.prob_next(ctx, nxt)
            logp += math.log(p + 1e-12)  # numerical stability
        return logp

    def perplexity(self, text: str, tokenizer: Tokenizer) -> float:
        """
        Perplexity over the n-gram transitions in the sentence.
        """
        tokens = tokenizer.tokenize(text)
        padded = self._pad_tokens(tokens)

        num_transitions = max(1, len(padded) - self.n_gram + 1)
        logp = self.sentence_logprob(text, tokenizer=tokenizer)

        return math.exp(-logp / num_transitions)
```

```python
corpus = [
    "I love natural language processing.",
    "I love machine learning.",
    "Language models love data.",
]
tokenizer = RegexTokenizer()
n = 2
lm = NgramLM(n_gram=2, alpha=2)
lm.fit(corpus, tokenizer)
s = "I love language models."
print("LogP:", lm.sentence_logprob(s, tokenizer))
print("Perplexity:", lm.perplexity(s, tokenizer))
# Example next-token probability
context = ["i", "love"]  # works even if n != 3; class will use last n-1
print("P('machine' | context):", lm.prob_next(context, "machine"))
```

## Skip-gram (word2vec)
Skip-gram for word2vec: given a center word $w_c$, predict its context words $w_o$in a window around it.
For a sentence: `"the quick brown fox jumps"`, with window size 2, training pairs:
* center `"brown"` -> contexts `["the", "quick", "fox", "jumps"]`.
* The pairs are `("brown", "the"), ("brown", "quick"), ("brown", "fox"), ("brown", "jumps")`.
  
The objective is to maximise
$$\sum_{\text{pair}(w_c, w_o)}\text{log}P(w_o|w_c)$$
$P(w_o|w_c)$ is given by the LM.

```python
import torch
from torch import nn
from torch.utils.data import Dataset, DataLoader
```

```python
def generate_skipgram_pairs(tokens: List[str], window_size: int = 2) -> List[Tuple[str, str]]:
    """
    For each center token, return (center, context) pairs for all tokens
    within +/- window_size positions.
    """
    pairs: List[Tuple[str, str]] = []
    for i, center in enumerate(tokens):
        start = max(0, i - window_size)
        end = min(len(tokens), i + window_size + 1)
        for j in range(start, end):
            if j == i:
                continue
            context = tokens[j]
            pairs.append((center, context))
    return pairs


class SkipGramDataset(Dataset):
    def __init__(self, corpus: List[str], window_size: int = 2, tokenizer: BaseTokenizer = None):
        # build vocab
        tokenized = [tokenizer.tokenize(text) for text in corpus]
        vocab = sorted(set(tok for tokens in tokenized for tok in tokens))
        self.token2idx = {w: i for i, w in enumerate(vocab)}
        self.idx2token = {i: w for w, i in self.token2idx.items()}

        pairs = []
        for sent in tokenized:
            pairs.extend(generate_skipgram_pairs(sent, window_size))

        self.data = [(self.token2idx[c], self.token2idx[o]) for c, o in pairs]

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        center_idx, context_idx = self.data[idx]
        return torch.tensor(center_idx, dtype=torch.long), torch.tensor(context_idx, dtype=torch.long)


class SkipGramLM(nn.Module):
    def __init__(self, vocab_size: int, embed_dim: int):
        super().__init__()
        self.in_embed = nn.Embedding(vocab_size, embed_dim)
        self.out_embed = nn.Embedding(vocab_size, embed_dim)

    def forward(self, center_ids: torch.Tensor):
        v = self.in_embed(center_ids)
        w = self.out_embed.weight
        logits = torch.matmul(v, w.t())
        return logits

    def embedding(self, center_ids: torch.Tensor):
        return self.in_embed(center_ids)


def train_skipgram(model, dataloader, optimizer, epochs):
    criterion = nn.CrossEntropyLoss()
    for epoch in range(10):
        model.train()
        total_loss = 0.0
        for center_ids, context_ids in dataloader:
            logits = model(center_ids)  # (batch, vocab)
            loss = criterion(logits, context_ids)  # predict true context
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        print(f"Epoch {epoch + 1}, loss={total_loss:.4f}")
    model.eval()
```

```python
corpus = [
    "I love natural language processing",
    "I love machine learning",
    "Language models love data",
]
tokenizer = RegexTokenizer()
dataset = SkipGramDataset(corpus, window_size=2, tokenizer=tokenizer)
vocab_size = len(dataset.token2idx)
print("Vocab size:", vocab_size)
print("Number of training pairs:", len(dataset))
dataloader = DataLoader(dataset, batch_size=32, shuffle=True)

model = SkipGramLM(vocab_size=vocab_size, embed_dim=16)
optimizer = torch.optim.Adam(model.parameters(), lr=0.01)
epochs = 10
train_skipgram(model, dataloader, optimizer, epochs)

word = "love"
wid = dataset.token2idx[word]
wid = torch.tensor(wid, dtype=torch.long)
embedding = model.embedding(wid).detach().numpy()
print(f"Embedding for '{word}':", embedding)
```

## TF-IDF
TF-IDF is a way to convert text into numbers that reflect how important a word is in a document relative to a collection of documents.

### TF: Term Frequency
How often a word appears in a specific document.
$$\text{tf}(t,d)=\frac{\text{count}(t \text{ in } d)}{\text{total words in } d}$$
Words repeated many times in one document get a higher TF.
### IDF: Inverse Document Frequency
How rare the word is across all documents.
$$\text{idf}=\text{log}\frac{N}{1+\text{df}(t)}  $$
* $N=$total number of documents
* $\text{df}(t)=$number of documents containing term $t$
Common words that appear everywhere (“the”, “and”) get low IDF. Rare, more informative words get high IDF.
$$\text{tf-idf}=\text{tf}(t,d) \times \text{idf}(f)$$

### Limitation
* TF-IDF does not understand meaning or word order.
* “good” and “excellent” are treated as unrelated tokens.

```python
def build_vocab_from_docs(tokenized_docs: List[List[str]]) -> Dict[str, int]:
    vocab = set()
    for doc in tokenized_docs:
        tok_set = set(doc)
        vocab.update(tok_set)
    
    vocab = {tok: i for i, tok in enumerate(sorted(vocab))}
    return vocab


def compute_idf(tokenized_docs: List[List[str]], vocab: Dict[str, int]) -> List[float]:
    """
    Compute IDF
    """
    N = len(tokenized_docs)
    df = [0] * len(vocab)
    for doc in tokenized_docs:
        seen_token = set(doc)
        for tok in seen_token:
            idx = vocab[tok]
            df[idx] += 1
    idf = [math.log((N + 1) / (1 + df_i)) for df_i in df]
    print("DF", df, "IDF:", idf)
    return idf


def compute_tf(tokens: List[str], vocab: Dict[str, int]) -> List[float]:
    """
    Compute TF
    """
    counts = Counter(tokens)
    total_token = len(tokens)
    tf = [0.0] * len(vocab)
    for tok, count in counts.items():
        if tok in vocab:
            idx = vocab[tok]
            tf[idx] = count / total_token
    print(tf)
    return tf


def compute_tfidf_matrix(tokenized_docs: List[List[str]], vocab: Dict[str, int]) -> List[List[float]]:
    idf = compute_idf(tokenized_docs, vocab)
    tfidf_matrix = list()
    for doc in tokenized_docs:
        tf = compute_tf(doc, vocab)
        tfidf = [tf[i] * idf[i] for i in range(len(vocab))]
        tfidf_matrix.append(tfidf)
    return tfidf_matrix


def cosine_similarity(a: List[float], b: List[float]) -> float:
    dot_product = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x ** 2 for x in a))
    nb = math.sqrt(sum(y ** 2 for y in b))
    if na == 0 or nb == 0:
        return 0
    else:
        return dot_product / (na * nb)
        
```

```python
docs = [
        "I love machine learning",
        "I love deep learning",
        "Natural language processing is fun",
    ]
tokenizer = RegexTokenizer()
tokenized_docs = [tokenizer.tokenize(d.lower()) for d in docs]
vocab = build_vocab_from_docs(tokenized_docs)
tfidf = compute_tfidf_matrix(tokenized_docs, vocab)

print("Vocab index:", vocab)
for i, vec in enumerate(tfidf):
    print(f"doc{i} tf-idf:", vec)

sim_0_1 = cosine_similarity(tfidf[0], tfidf[1])
sim_0_2 = cosine_similarity(tfidf[0], tfidf[2])
print("cosine(doc0, doc1) =", sim_0_1)
print("cosine(doc0, doc2) =", sim_0_2)
```

<div class="notebook-output"><pre><code>DF [1, 1, 2, 1, 1, 2, 2, 1, 1, 1] IDF: [0.6931471805599453, 0.6931471805599453, 0.28768207245178085, 0.6931471805599453, 0.6931471805599453, 0.28768207245178085, 0.28768207245178085, 0.6931471805599453, 0.6931471805599453, 0.6931471805599453]
[0.0, 0.0, 0.25, 0.0, 0.0, 0.25, 0.25, 0.25, 0.0, 0.0]
[0.25, 0.0, 0.25, 0.0, 0.0, 0.25, 0.25, 0.0, 0.0, 0.0]
[0.0, 0.2, 0.0, 0.2, 0.2, 0.0, 0.0, 0.0, 0.2, 0.2]
Vocab index: {&#039;deep&#039;: 0, &#039;fun&#039;: 1, &#039;i&#039;: 2, &#039;is&#039;: 3, &#039;language&#039;: 4, &#039;learning&#039;: 5, &#039;love&#039;: 6, &#039;machine&#039;: 7, &#039;natural&#039;: 8, &#039;processing&#039;: 9}
doc0 tf-idf: [0.0, 0.0, 0.07192051811294521, 0.0, 0.0, 0.07192051811294521, 0.07192051811294521, 0.17328679513998632, 0.0, 0.0]
doc1 tf-idf: [0.17328679513998632, 0.0, 0.07192051811294521, 0.0, 0.0, 0.07192051811294521, 0.07192051811294521, 0.0, 0.0, 0.0]
doc2 tf-idf: [0.0, 0.13862943611198905, 0.0, 0.13862943611198905, 0.13862943611198905, 0.0, 0.0, 0.0, 0.13862943611198905, 0.13862943611198905]
cosine(doc0, doc1) = 0.34070355442202244
cosine(doc0, doc2) = 0.0
</code></pre></div>

```python
from sklearn.feature_extraction.text import TfidfVectorizer

docs = [
    "I love machine learning",
    "I love deep learning",
    "Natural language processing is fun"
]

vectorizer = TfidfVectorizer(lowercase=True)
X = vectorizer.fit_transform(docs)

print("Features:", vectorizer.get_feature_names_out())
print("TF-IDF matrix:\n", X.toarray())
```

<div class="notebook-output"><pre><code>Features: [&#039;deep&#039; &#039;fun&#039; &#039;is&#039; &#039;language&#039; &#039;learning&#039; &#039;love&#039; &#039;machine&#039; &#039;natural&#039;
 &#039;processing&#039;]
TF-IDF matrix:
 [[0.         0.         0.         0.         0.51785612 0.51785612
  0.68091856 0.         0.        ]
 [0.68091856 0.         0.         0.         0.51785612 0.51785612
  0.         0.         0.        ]
 [0.         0.4472136  0.4472136  0.4472136  0.         0.
  0.         0.4472136  0.4472136 ]]
</code></pre></div>

