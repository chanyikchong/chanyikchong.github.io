```python
import re
from collections import Counter
from typing import Dict, List, Tuple, Set
import json
from pathlib import Path
```

# Basic NLP

## Text preprocessing
For modern Transformer LLMs: We keep the text as close to raw as possible. The model’s own tokenizer is the authority on how to break text. You avoid anything that destroys signal:
* No stemming / lemmatization
* No stopword removal
* No blind lowercasing
* No removing punctuation
Focus on:
* Cleaning obviously bad or useless text.
* Light normalization so weird Unicode and whitespace do not explode the vocabulary.
* Formatting data correctly for the training objective (causal LM, SFT, chat, etc.).


## Tokenizer
Tokenization is splitting text into smaller units (tokens) that a model can work with. There are many types of tokenization.

Common approachs:
1. Whitespace / basic tokenization
   * Split on spaces, then optionally strip punctuation.
   * "I love NLP, it's great!" → \["I", "love", "NLP,", "it's", "great!"\]
2. Word-level tokenization
   * Similar to the above but handles punctuation and contractions more intelligently:
   * "don't" → \["do", "n't"\]
3. Character-level tokenization
   * Every character is a token: "cat" → \["c", "a", "t"\].
4. Subword tokenization (BPE, WordPiece, SentencePiece)
   * Important for modern LLMs
   * Break rare words into smaller units: "unbelievable" → \["un", "believ", "able"\]
   * Helps handle unknown words and keeps vocabulary size manageable.


### Whitespace Tokenizer

```python
def basic_whitespace_tokenize(text: str):
    # Strip leading/trailing whitespace, collapse multiple spaces
    text = text.strip()
    text = re.sub(r"\s+", " ", text)
    return text.split(" ")

s = "I   love   NLP   and  LLMs!"
print(basic_whitespace_tokenize(s))
```

<div class="notebook-output"><pre><code>[&#039;I&#039;, &#039;love&#039;, &#039;NLP&#039;, &#039;and&#039;, &#039;LLMs!&#039;]
</code></pre></div>

### Regex word tokenizer (word-level with punctuation handling)
Keep words and numbers, drop most punctuation.

```python
WORD_PATTERN = re.compile(r"[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?")

def regex_word_tokenize(text: str):
    """
    - Finds sequences of letters/numbers
    - Keeps contractions like don't, I'm
    - Drops punctuation like !, ?, ., , unless inside a word
    """
    return WORD_PATTERN.findall(text)

s = "I love NLP, don't you? It's 2025."
print(regex_word_tokenize(s))
```

<div class="notebook-output"><pre><code>[&#039;I&#039;, &#039;love&#039;, &#039;NLP&#039;, &quot;don&#039;t&quot;, &#039;you&#039;, &quot;It&#039;s&quot;, &#039;2025&#039;]
</code></pre></div>

### Character-level tokenizer
Every character is a token. Simple and sometimes useful for experiments.

```python
def char_tokenize(text: str):
    return list(text)
s = "I love NLP, don't you? It's 2025."
print(char_tokenize(s))
```

<div class="notebook-output"><pre><code>[&#039;I&#039;, &#039; &#039;, &#039;l&#039;, &#039;o&#039;, &#039;v&#039;, &#039;e&#039;, &#039; &#039;, &#039;N&#039;, &#039;L&#039;, &#039;P&#039;, &#039;,&#039;, &#039; &#039;, &#039;d&#039;, &#039;o&#039;, &#039;n&#039;, &quot;&#039;&quot;, &#039;t&#039;, &#039; &#039;, &#039;y&#039;, &#039;o&#039;, &#039;u&#039;, &#039;?&#039;, &#039; &#039;, &#039;I&#039;, &#039;t&#039;, &quot;&#039;&quot;, &#039;s&#039;, &#039; &#039;, &#039;2&#039;, &#039;0&#039;, &#039;2&#039;, &#039;5&#039;, &#039;.&#039;]
</code></pre></div>

### Byte-level tokenizer
Some LLMs (like GPT-2) operate over bytes or byte-BPE. At the simplest level:

```python
def byte_tokenize(text: str):
    """
    Encode to UTF-8 bytes. Each byte (0-255) is an integer token.
    """
    b = text.encode("utf-8")
    return list(b)
s = "Hello 😊. I love NLP, don't you? It's 2025."
tokens = byte_tokenize(s)
print(tokens)
```

<div class="notebook-output"><pre><code>[72, 101, 108, 108, 111, 32, 240, 159, 152, 138, 46, 32, 73, 32, 108, 111, 118, 101, 32, 78, 76, 80, 44, 32, 100, 111, 110, 39, 116, 32, 121, 111, 117, 63, 32, 73, 116, 39, 115, 32, 50, 48, 50, 53, 46]
</code></pre></div>

### Subword BPE tokenizer

#### Motivation
Problems with the byte-level and world-level tokenizer
If you use word-level tokens:
* Vocabulary is huge (hundreds of thousands to millions of words).
* New / rare words are out-of-vocabulary (OOV) → mapped to \<UNK\>
* You waste parameters on words that appear rarely.
* Morphologically rich languages explode the vocabulary (e.g. Turkish, Finnish).
  
If you use character-level tokens:
* Vocabulary is tiny
* No OOV problem
* But sequences get very long, and learning long-range dependencies is harder.
* Model has to “learn spelling” from scratch.

Subword BPE sits in the middle:
* Tokens are subword units: frequently seen whole words + useful word pieces.
* Rare words get broken into pieces but are still representable.
* Frequent words remain single tokens for efficiency.

#### Core idea
We want to learn a set of subword units such that:
* Common words are represented by as few tokens as possible.
* Rare words are decomposed into smaller units
* The vocabulary size is bounded (e.g. 32k, 50k, or 100k tokens).

To do so, Subword BPE does the following:
* Starting from a character-level vocabulary.
* Iteratively merging the most frequent adjacent symbol pairs into new symbols.
* After enough merges, you get a vocabulary of characters + multi-character subwords.

The following is a tiny toy BPE from scratch (training + encoding)
##### Training
1. Initial representation
   Start with a corpus represented as sequences of characters, with a special end-of-word marker \</w\>.
   Example: "low", "lower", "newest", "widest" <br>
   Represent each word as charactors + \</w\>: <br>
   * low -> "l o w  \</w\>"
   * lower -> "l o w e r \</w\>"
   * newest -> "n e w e s t \</w\>"
   * widest -> "w i d e s t \</w\>"
2. Compute a vocabulary with frequencies: <br>
   Example sentence: "low lower lower newest widest widest"
```json
{
   "l o w  \</w\>": 1,
   "l o w e r \</w\>": 2,
   "n e w e s t \</w\>": 1,
   "w i d e s t \</w\>": 2
}
```
3. Compute pair statistics
   For each word sequence, look at all adjacent symbol pairs and count how often each pair appears, weighted by the word frequency.
   For "l o w \</w\>":
   * (l, o)
   * (o, w)
   * (w, \</w\>)
   
   For "l o w e r \</w\>":
   * (l, o)
   * (o, w)
   * (w, e)
   * (e, r)
   * (r, \</w\>)
   
   Aggregate over the whole vocab. You might find:
   * (l, o) 3 times
   * (o, w) 3 times
   * (w, e) 3 times
   * (e, r) 2 times
   * (r, \</w\>) 2 times

Pick the most frequent pair, say (l, o)
4. Merge the most frequent pair
   Create a new symbol by joining the pair and replace all occurrences of the pair with the new symbol.
   * "l o w  \</w\>" -> "lo w  \</w\>"
   * "l o w e r \</w\>" -> "lo w e r \</w\>"

This list of merge operations, in order, is your merge table.<br>
Stop when you’ve done ```num_merges``` steps or reached the target vocabulary size.

##### Encoding
* We have a base symbol set (characters + \</w\>
* A merge list: ordered list of pairs to merge, from most to least important.

Start encoding:
1. Take a word and break it into characters + \</w\>
2. Repeatedly apply merges in the order learned during training
   * Scan for any pair that appears in your merge table.
   * Merge them when found.
   * Keep doing this until no further merges are possible.

For unseen words, BPE merges the pair as much as possible and keeps the unmerged character as a single token.

Modern GPT-style models use byte-level BPE, which do the same BPE training on the byte-level.

#### Training

```python
from collections import Counter
from typing import Dict, List, Tuple, Set
import json
from pathlib import Path

###############################################################################
# 1. Utilities for BPE training
###############################################################################

def build_initial_vocab(corpus: List[str]) -> Dict[str, int]:
    """
    Build the initial word vocabulary:
    - Each unique word is split into characters + </w> (end-of-word marker)
    - We count how many times each word form appears in the corpus.
    
    Example:
      "low"    -> "l o w </w>"
      "lower"  -> "l o w e r </w>"
    """
    vocab = Counter()
    for line in corpus:
        for word in line.strip().split():
            if not word:
                continue
            w = word.lower()  # simple normalization
            symbols = list(w) + ["</w>"]
            vocab[" ".join(symbols)] += 1
    return dict(vocab)


def get_pair_stats(vocab: Dict[str, int]) -> Counter:
    """
    Count frequency of all adjacent symbol pairs in the current vocabulary.
    Each word in vocab is a string like "l o w </w>" with an associated count.
    """
    pairs = Counter()
    for word, freq in vocab.items():
        symbols = word.split()
        for i in range(len(symbols) - 1):
            pairs[(symbols[i], symbols[i + 1])] += freq
    return pairs


def merge_vocab(pair: Tuple[str, str], vocab_in: Dict[str, int]) -> Dict[str, int]:
    """
    Merge all occurrences of the given pair into a single symbol.
    
    Example:
      pair = ("l", "o")
      "l o w </w>" -> "lo w </w>"
    """
    bigram = " ".join(pair)
    replacement = "".join(pair)
    vocab_out = {}
    for word, freq in vocab_in.items():
        new_word = word.replace(bigram, replacement)
        vocab_out[new_word] = freq
    return vocab_out


def train_bpe(
    corpus: List[str],
    target_vocab_size: int,
    verbose: bool = False,
) -> Tuple[List[Tuple[str, str]], Dict[Tuple[str, str], int]]:
    """
    Train BPE merges on a corpus of text lines.
    
    Returns:
      - merges: ordered list of merged symbol pairs
      - merge_ranks: dict mapping pair -> rank (0 is first merge, etc.)
    """
    # 1. Build initial char-level vocab with word frequencies
    vocab = build_initial_vocab(corpus)

    # initial set of symbols (characters + </w>)
    symbols = set()
    for word in vocab:
        symbols.update(word.split())
    initial_symbol_count = len(symbols)

    # how many merges we can do to reach target vocab size
    max_merges = max(0, target_vocab_size - initial_symbol_count)

    merges: List[Tuple[str, str]] = []

    for i in range(max_merges):
        pairs = get_pair_stats(vocab)
        if not pairs:
            break

        # pick the most frequent pair
        best_pair, best_count = pairs.most_common(1)[0]
        if verbose:
            print(f"Merge {i+1}: {best_pair} (count={best_count})")

        # merge it
        vocab = merge_vocab(best_pair, vocab)
        merges.append(best_pair)

    merge_ranks = {pair: rank for rank, pair in enumerate(merges)}
    return merges, merge_ranks
```

```python
corpus = [
    "low lower newest widest",
    "low low low new",
    "wider widest lowest",
    "new type human player list"
]

# build vocab by counting charactor + </w>
vocab = build_initial_vocab(corpus)
print(f"Initial vocabulary: {json.dumps(vocab, indent=4)}\n")

# count frequency of pairs
pairs = get_pair_stats(vocab)
print(f"Pair frequency: {pairs} \n")
print(f"Max frequency: {pairs.most_common(1)[0]}\n")

# merge pairs
best_pair, best_count = pairs.most_common(1)[0]
vocab_out = merge_vocab(best_pair, vocab)
print("Merged vocab:", vocab_out)
```

<div class="notebook-output"><pre><code>Initial vocabulary: {
    &quot;l o w &lt;/w&gt;&quot;: 4,
    &quot;l o w e r &lt;/w&gt;&quot;: 1,
    &quot;n e w e s t &lt;/w&gt;&quot;: 1,
    &quot;w i d e s t &lt;/w&gt;&quot;: 2,
    &quot;n e w &lt;/w&gt;&quot;: 2,
    &quot;w i d e r &lt;/w&gt;&quot;: 1,
    &quot;l o w e s t &lt;/w&gt;&quot;: 1,
    &quot;t y p e &lt;/w&gt;&quot;: 1,
    &quot;h u m a n &lt;/w&gt;&quot;: 1,
    &quot;p l a y e r &lt;/w&gt;&quot;: 1,
    &quot;l i s t &lt;/w&gt;&quot;: 1
}

Pair frequency: Counter({(&#039;l&#039;, &#039;o&#039;): 6, (&#039;o&#039;, &#039;w&#039;): 6, (&#039;w&#039;, &#039;&lt;/w&gt;&#039;): 6, (&#039;s&#039;, &#039;t&#039;): 5, (&#039;t&#039;, &#039;&lt;/w&gt;&#039;): 5, (&#039;e&#039;, &#039;s&#039;): 4, (&#039;w&#039;, &#039;e&#039;): 3, (&#039;e&#039;, &#039;r&#039;): 3, (&#039;r&#039;, &#039;&lt;/w&gt;&#039;): 3, (&#039;n&#039;, &#039;e&#039;): 3, (&#039;e&#039;, &#039;w&#039;): 3, (&#039;w&#039;, &#039;i&#039;): 3, (&#039;i&#039;, &#039;d&#039;): 3, (&#039;d&#039;, &#039;e&#039;): 3, (&#039;t&#039;, &#039;y&#039;): 1, (&#039;y&#039;, &#039;p&#039;): 1, (&#039;p&#039;, &#039;e&#039;): 1, (&#039;e&#039;, &#039;&lt;/w&gt;&#039;): 1, (&#039;h&#039;, &#039;u&#039;): 1, (&#039;u&#039;, &#039;m&#039;): 1, (&#039;m&#039;, &#039;a&#039;): 1, (&#039;a&#039;, &#039;n&#039;): 1, (&#039;n&#039;, &#039;&lt;/w&gt;&#039;): 1, (&#039;p&#039;, &#039;l&#039;): 1, (&#039;l&#039;, &#039;a&#039;): 1, (&#039;a&#039;, &#039;y&#039;): 1, (&#039;y&#039;, &#039;e&#039;): 1, (&#039;l&#039;, &#039;i&#039;): 1, (&#039;i&#039;, &#039;s&#039;): 1}) 

Max frequency: ((&#039;l&#039;, &#039;o&#039;), 6)

Merged vocab: {&#039;lo w &lt;/w&gt;&#039;: 4, &#039;lo w e r &lt;/w&gt;&#039;: 1, &#039;n e w e s t &lt;/w&gt;&#039;: 1, &#039;w i d e s t &lt;/w&gt;&#039;: 2, &#039;n e w &lt;/w&gt;&#039;: 2, &#039;w i d e r &lt;/w&gt;&#039;: 1, &#039;lo w e s t &lt;/w&gt;&#039;: 1, &#039;t y p e &lt;/w&gt;&#039;: 1, &#039;h u m a n &lt;/w&gt;&#039;: 1, &#039;p l a y e r &lt;/w&gt;&#039;: 1, &#039;l i s t &lt;/w&gt;&#039;: 1}
</code></pre></div>

```python
merges, merge_ranks = train_bpe(corpus, target_vocab_size=1000, verbose=True)

print(f"Merges: {merges}\n")
print(f"Merge rank: {merge_ranks}\n")
```

<div class="notebook-output"><pre><code>Merge 1: (&#039;l&#039;, &#039;o&#039;) (count=6)
Merge 2: (&#039;lo&#039;, &#039;w&#039;) (count=6)
Merge 3: (&#039;s&#039;, &#039;t&#039;) (count=5)
Merge 4: (&#039;st&#039;, &#039;&lt;/w&gt;&#039;) (count=5)
Merge 5: (&#039;low&#039;, &#039;&lt;/w&gt;&#039;) (count=4)
Merge 6: (&#039;e&#039;, &#039;st&lt;/w&gt;&#039;) (count=4)
Merge 7: (&#039;e&#039;, &#039;r&#039;) (count=3)
Merge 8: (&#039;er&#039;, &#039;&lt;/w&gt;&#039;) (count=3)
Merge 9: (&#039;n&#039;, &#039;e&#039;) (count=3)
Merge 10: (&#039;ne&#039;, &#039;w&#039;) (count=3)
Merge 11: (&#039;w&#039;, &#039;i&#039;) (count=3)
Merge 12: (&#039;wi&#039;, &#039;d&#039;) (count=3)
Merge 13: (&#039;wid&#039;, &#039;est&lt;/w&gt;&#039;) (count=2)
Merge 14: (&#039;new&#039;, &#039;&lt;/w&gt;&#039;) (count=2)
Merge 15: (&#039;low&#039;, &#039;er&lt;/w&gt;&#039;) (count=1)
Merge 16: (&#039;new&#039;, &#039;est&lt;/w&gt;&#039;) (count=1)
Merge 17: (&#039;wid&#039;, &#039;er&lt;/w&gt;&#039;) (count=1)
Merge 18: (&#039;low&#039;, &#039;est&lt;/w&gt;&#039;) (count=1)
Merge 19: (&#039;t&#039;, &#039;y&#039;) (count=1)
Merge 20: (&#039;ty&#039;, &#039;p&#039;) (count=1)
Merge 21: (&#039;typ&#039;, &#039;e&#039;) (count=1)
Merge 22: (&#039;type&#039;, &#039;&lt;/w&gt;&#039;) (count=1)
Merge 23: (&#039;h&#039;, &#039;u&#039;) (count=1)
Merge 24: (&#039;hu&#039;, &#039;m&#039;) (count=1)
Merge 25: (&#039;hum&#039;, &#039;a&#039;) (count=1)
Merge 26: (&#039;huma&#039;, &#039;n&#039;) (count=1)
Merge 27: (&#039;human&#039;, &#039;&lt;/w&gt;&#039;) (count=1)
Merge 28: (&#039;p&#039;, &#039;l&#039;) (count=1)
Merge 29: (&#039;pl&#039;, &#039;a&#039;) (count=1)
Merge 30: (&#039;pla&#039;, &#039;y&#039;) (count=1)
Merge 31: (&#039;play&#039;, &#039;er&lt;/w&gt;&#039;) (count=1)
Merge 32: (&#039;l&#039;, &#039;i&#039;) (count=1)
Merge 33: (&#039;li&#039;, &#039;st&lt;/w&gt;&#039;) (count=1)
Merges: [(&#039;l&#039;, &#039;o&#039;), (&#039;lo&#039;, &#039;w&#039;), (&#039;s&#039;, &#039;t&#039;), (&#039;st&#039;, &#039;&lt;/w&gt;&#039;), (&#039;low&#039;, &#039;&lt;/w&gt;&#039;), (&#039;e&#039;, &#039;st&lt;/w&gt;&#039;), (&#039;e&#039;, &#039;r&#039;), (&#039;er&#039;, &#039;&lt;/w&gt;&#039;), (&#039;n&#039;, &#039;e&#039;), (&#039;ne&#039;, &#039;w&#039;), (&#039;w&#039;, &#039;i&#039;), (&#039;wi&#039;, &#039;d&#039;), (&#039;wid&#039;, &#039;est&lt;/w&gt;&#039;), (&#039;new&#039;, &#039;&lt;/w&gt;&#039;), (&#039;low&#039;, &#039;er&lt;/w&gt;&#039;), (&#039;new&#039;, &#039;est&lt;/w&gt;&#039;), (&#039;wid&#039;, &#039;er&lt;/w&gt;&#039;), (&#039;low&#039;, &#039;est&lt;/w&gt;&#039;), (&#039;t&#039;, &#039;y&#039;), (&#039;ty&#039;, &#039;p&#039;), (&#039;typ&#039;, &#039;e&#039;), (&#039;type&#039;, &#039;&lt;/w&gt;&#039;), (&#039;h&#039;, &#039;u&#039;), (&#039;hu&#039;, &#039;m&#039;), (&#039;hum&#039;, &#039;a&#039;), (&#039;huma&#039;, &#039;n&#039;), (&#039;human&#039;, &#039;&lt;/w&gt;&#039;), (&#039;p&#039;, &#039;l&#039;), (&#039;pl&#039;, &#039;a&#039;), (&#039;pla&#039;, &#039;y&#039;), (&#039;play&#039;, &#039;er&lt;/w&gt;&#039;), (&#039;l&#039;, &#039;i&#039;), (&#039;li&#039;, &#039;st&lt;/w&gt;&#039;)]

Merge rank: {(&#039;l&#039;, &#039;o&#039;): 0, (&#039;lo&#039;, &#039;w&#039;): 1, (&#039;s&#039;, &#039;t&#039;): 2, (&#039;st&#039;, &#039;&lt;/w&gt;&#039;): 3, (&#039;low&#039;, &#039;&lt;/w&gt;&#039;): 4, (&#039;e&#039;, &#039;st&lt;/w&gt;&#039;): 5, (&#039;e&#039;, &#039;r&#039;): 6, (&#039;er&#039;, &#039;&lt;/w&gt;&#039;): 7, (&#039;n&#039;, &#039;e&#039;): 8, (&#039;ne&#039;, &#039;w&#039;): 9, (&#039;w&#039;, &#039;i&#039;): 10, (&#039;wi&#039;, &#039;d&#039;): 11, (&#039;wid&#039;, &#039;est&lt;/w&gt;&#039;): 12, (&#039;new&#039;, &#039;&lt;/w&gt;&#039;): 13, (&#039;low&#039;, &#039;er&lt;/w&gt;&#039;): 14, (&#039;new&#039;, &#039;est&lt;/w&gt;&#039;): 15, (&#039;wid&#039;, &#039;er&lt;/w&gt;&#039;): 16, (&#039;low&#039;, &#039;est&lt;/w&gt;&#039;): 17, (&#039;t&#039;, &#039;y&#039;): 18, (&#039;ty&#039;, &#039;p&#039;): 19, (&#039;typ&#039;, &#039;e&#039;): 20, (&#039;type&#039;, &#039;&lt;/w&gt;&#039;): 21, (&#039;h&#039;, &#039;u&#039;): 22, (&#039;hu&#039;, &#039;m&#039;): 23, (&#039;hum&#039;, &#039;a&#039;): 24, (&#039;huma&#039;, &#039;n&#039;): 25, (&#039;human&#039;, &#039;&lt;/w&gt;&#039;): 26, (&#039;p&#039;, &#039;l&#039;): 27, (&#039;pl&#039;, &#039;a&#039;): 28, (&#039;pla&#039;, &#039;y&#039;): 29, (&#039;play&#039;, &#039;er&lt;/w&gt;&#039;): 30, (&#039;l&#039;, &#039;i&#039;): 31, (&#039;li&#039;, &#039;st&lt;/w&gt;&#039;): 32}

</code></pre></div>

#### Decoding

```python
###############################################################################
# 2. BPE encoding / decoding
###############################################################################

def _get_pairs(word: Tuple[str, ...]) -> Set[Tuple[str, str]]:
    """
    Given a word represented as a tuple of symbols, return set of all adjacent pairs.
    Example:
      ("l", "o", "w", "</w>") -> {("l","o"), ("o","w"), ("w","</w>")}
    """
    pairs = set()
    prev = word[0]
    for ch in word[1:]:
        pairs.add((prev, ch))
        prev = ch
    return pairs


def bpe_encode_word(
    word: str,
    merge_ranks: Dict[Tuple[str, str], int],
    verbose: bool = False
) -> Tuple[str, ...]:
    """
    Encode a single word into BPE subword tokens using greedy merges.
    
    - Start from characters + </w>
    - Repeatedly merge the pair with the smallest rank (highest priority)
      as long as that pair is in merge_ranks.
    """
    if not word:
        return tuple()

    # Start from characters + end-of-word marker
    w = tuple(list(word.lower()) + ["</w>"])
    if len(w) == 1:
        return w

    pairs = _get_pairs(w)
    if not pairs:
        return w

    while True:
        if verbose:
            print(w)
        # find the best pair to merge (lowest rank value)
        min_rank = None
        merge_pair = None
        for pair in pairs:
            # loop all pair to find the best rank pair
            rank = merge_ranks.get(pair)
            if rank is not None and (min_rank is None or rank < min_rank):
                min_rank = rank
                merge_pair = pair

        if merge_pair is None:
            # no more merges possible for this word
            break

        first, second = merge_pair  # selected pair
        if verbose:
            print(f"first: {first}, second: {second}") 
        new_word = []
        i = 0
        # w is the vocab list
        while i < len(w):
            try:
                j = w.index(first, i)
            except ValueError:
                # 'first' not found - append remaining symbols
                new_word.extend(w[i:])
                break
            # add intermediate symbol back to keep tracking
            new_word.extend(w[i:j])
            if verbose:
                print(f"new word: {new_word}")
            # if we found first and the next symbol is second, merge them
            if j < len(w) - 1 and w[j + 1] == second:
                # match the pair and merge these two symbol
                new_word.append(first + second)  # merged symbol
                i = j + 2
            else:
                # dont match pair dont merge
                new_word.append(w[j])
                i = j + 1
            if verbose:
                print(f"new word 2: {new_word}")

        if verbose:
            print("out new word")
        w = tuple(new_word)
        if len(w) == 1:
            break
        else:
            pairs = _get_pairs(w)

    return w


def bpe_encode_text(
    text: str,
    merge_ranks: Dict[Tuple[str, str], int],
) -> List[str]:
    """
    Encode a full text:
    - Split on whitespace into words
    - Apply BPE per word
    - Flatten into a single token list
    """
    tokens: List[str] = []
    for word in text.strip().split():
        word_tokens = bpe_encode_word(word, merge_ranks)
        tokens.extend(word_tokens)
    return tokens


def bpe_decode_tokens(tokens: List[str]) -> str:
    """
    Decode a sequence of BPE tokens back into a whitespace-separated string.
    We assume:
      - Each word is ended by a token that ends with </w>
      - Subwords belonging to the same word are concatenated
    """
    words: List[str] = []
    current = ""
    for tok in tokens:
        if tok.endswith("</w>"):
            # this token ends the current word
            piece = tok[:-4]  # strip "</w>"
            current += piece
            words.append(current)
            current = ""
        else:
            # middle of a word
            current += tok
    if current:
        words.append(current)
    return " ".join(words)
```

```python
word = "newer"
word_token = bpe_encode_word(word, merge_ranks, verbose=True)
print(f"word token: {word_token}\n")
```

<div class="notebook-output"><pre><code>(&#039;n&#039;, &#039;e&#039;, &#039;w&#039;, &#039;e&#039;, &#039;r&#039;, &#039;&lt;/w&gt;&#039;)
first: e, second: r
new word: [&#039;n&#039;]
new word 2: [&#039;n&#039;, &#039;e&#039;]
new word: [&#039;n&#039;, &#039;e&#039;, &#039;w&#039;]
new word 2: [&#039;n&#039;, &#039;e&#039;, &#039;w&#039;, &#039;er&#039;]
out new word
(&#039;n&#039;, &#039;e&#039;, &#039;w&#039;, &#039;er&#039;, &#039;&lt;/w&gt;&#039;)
first: er, second: &lt;/w&gt;
new word: [&#039;n&#039;, &#039;e&#039;, &#039;w&#039;]
new word 2: [&#039;n&#039;, &#039;e&#039;, &#039;w&#039;, &#039;er&lt;/w&gt;&#039;]
out new word
(&#039;n&#039;, &#039;e&#039;, &#039;w&#039;, &#039;er&lt;/w&gt;&#039;)
first: n, second: e
new word: []
new word 2: [&#039;ne&#039;]
out new word
(&#039;ne&#039;, &#039;w&#039;, &#039;er&lt;/w&gt;&#039;)
first: ne, second: w
new word: []
new word 2: [&#039;new&#039;]
out new word
(&#039;new&#039;, &#039;er&lt;/w&gt;&#039;)
word token: (&#039;new&#039;, &#039;er&lt;/w&gt;&#039;)

</code></pre></div>

```python
text = "lowest newer wider"
text_tokens = bpe_encode_text(text, merge_ranks)
print(f"text token: {text_token}\n")

decode_token = bpe_decode_tokens(text_tokens)
print(f"decode token: {decode_token}\n")
```

<div class="notebook-output"><pre><code>word token: (&#039;new&#039;, &#039;er&lt;/w&gt;&#039;)

text token: [&#039;lowest&lt;/w&gt;&#039;, &#039;new&#039;, &#039;er&lt;/w&gt;&#039;, &#039;wider&lt;/w&gt;&#039;]

decode token: lowest newer wider

</code></pre></div>

#### Tokenizer

```python
###############################################################################
# 3. BPETokenizer class
###############################################################################

class BPETokenizer:
    """
    Simple Subword BPE tokenizer:
      - train(corpus)
      - encode(text)  -> list of BPE tokens (strings)
      - decode(tokens) -> string
      - save(path), load(path)
    """

    def __init__(self, vocab_size: int = 1000):
        self.vocab_size = vocab_size
        self.merges: List[Tuple[str, str]] = []
        self.merge_ranks: Dict[Tuple[str, str], int] = {}

    def train(self, corpus: List[str], verbose: bool = False) -> None:
        merges, merge_ranks = train_bpe(
            corpus, target_vocab_size=self.vocab_size, verbose=verbose
        )
        self.merges = merges
        self.merge_ranks = merge_ranks

    def encode_word(self, word: str) -> List[str]:
        return list(bpe_encode_word(word, self.merge_ranks))

    def encode(self, text: str) -> List[str]:
        return bpe_encode_text(text, self.merge_ranks)

    def decode(self, tokens: List[str]) -> str:
        return bpe_decode_tokens(tokens)

    def save(self, path: str) -> None:
        path = Path(path)
        data = {
            "vocab_size": self.vocab_size,
            "merges": self.merges,  # list of [sym1, sym2]
        }
        path.write_text(json.dumps(data))

    @classmethod
    def load(cls, path: str) -> "BPETokenizer":
        path = Path(path)
        data = json.loads(path.read_text())
        tok = cls(vocab_size=data.get("vocab_size", 0))
        tok.merges = [tuple(pair) for pair in data["merges"]]
        tok.merge_ranks = {tuple(p): i for i, p in enumerate(tok.merges)}
        return tok
```

#### Usage

```python
# Tiny toy corpus for demonstration
corpus = [
    "low lower newest widest",
    "low low low new",
    "wider widest lowest",
]

# 1. Train a tokenizer
tokenizer = BPETokenizer(vocab_size=50)
tokenizer.train(corpus, verbose=True)

# 2. Encode some text
text = "lowest newer wider"
tokens = tokenizer.encode(text)
print("TEXT:   ", text)
print("TOKENS: ", tokens)

# 3. Decode back
decoded = tokenizer.decode(tokens)
print("DECODED:", decoded)

# 4. Save & load
tokenizer.save("source/bpe_merges.json")
loaded_tok = BPETokenizer.load("source/bpe_merges.json")

# Sanity check: loaded tokenizer behaves the same
tokens2 = loaded_tok.encode(text)
decoded2 = loaded_tok.decode(tokens2)
print("TOKENS (loaded): ", tokens2)
print("DECODED (loaded):", decoded2)
```

<div class="notebook-output"><pre><code>Merge 1: (&#039;l&#039;, &#039;o&#039;) (count=6)
Merge 2: (&#039;lo&#039;, &#039;w&#039;) (count=6)
Merge 3: (&#039;low&#039;, &#039;&lt;/w&gt;&#039;) (count=4)
Merge 4: (&#039;e&#039;, &#039;s&#039;) (count=4)
Merge 5: (&#039;es&#039;, &#039;t&#039;) (count=4)
Merge 6: (&#039;est&#039;, &#039;&lt;/w&gt;&#039;) (count=4)
Merge 7: (&#039;w&#039;, &#039;i&#039;) (count=3)
Merge 8: (&#039;wi&#039;, &#039;d&#039;) (count=3)
Merge 9: (&#039;e&#039;, &#039;r&#039;) (count=2)
Merge 10: (&#039;er&#039;, &#039;&lt;/w&gt;&#039;) (count=2)
Merge 11: (&#039;n&#039;, &#039;e&#039;) (count=2)
Merge 12: (&#039;ne&#039;, &#039;w&#039;) (count=2)
Merge 13: (&#039;wid&#039;, &#039;est&lt;/w&gt;&#039;) (count=2)
Merge 14: (&#039;low&#039;, &#039;er&lt;/w&gt;&#039;) (count=1)
Merge 15: (&#039;new&#039;, &#039;est&lt;/w&gt;&#039;) (count=1)
Merge 16: (&#039;new&#039;, &#039;&lt;/w&gt;&#039;) (count=1)
Merge 17: (&#039;wid&#039;, &#039;er&lt;/w&gt;&#039;) (count=1)
Merge 18: (&#039;low&#039;, &#039;est&lt;/w&gt;&#039;) (count=1)
TEXT:    lowest newer wider
TOKENS:  [&#039;lowest&lt;/w&gt;&#039;, &#039;new&#039;, &#039;er&lt;/w&gt;&#039;, &#039;wider&lt;/w&gt;&#039;]
DECODED: lowest newer wider
TOKENS (loaded):  [&#039;lowest&lt;/w&gt;&#039;, &#039;new&#039;, &#039;er&lt;/w&gt;&#039;, &#039;wider&lt;/w&gt;&#039;]
DECODED (loaded): lowest newer wider
</code></pre></div>

