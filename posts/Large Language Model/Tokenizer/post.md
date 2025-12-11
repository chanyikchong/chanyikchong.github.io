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

<div class="notebook-output">

```
['I', 'love', 'NLP', 'and', 'LLMs!']
```

</div>

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

<div class="notebook-output">

```
['I', 'love', 'NLP', "don't", 'you', "It's", '2025']
```

</div>

### Character-level tokenizer
Every character is a token. Simple and sometimes useful for experiments.

```python
def char_tokenize(text: str):
    return list(text)
s = "I love NLP, don't you? It's 2025."
print(char_tokenize(s))
```

<div class="notebook-output">

```
['I', ' ', 'l', 'o', 'v', 'e', ' ', 'N', 'L', 'P', ',', ' ', 'd', 'o', 'n', "'", 't', ' ', 'y', 'o', 'u', '?', ' ', 'I', 't', "'", 's', ' ', '2', '0', '2', '5', '.']
```

</div>

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

<div class="notebook-output">

```
[72, 101, 108, 108, 111, 32, 240, 159, 152, 138, 46, 32, 73, 32, 108, 111, 118, 101, 32, 78, 76, 80, 44, 32, 100, 111, 110, 39, 116, 32, 121, 111, 117, 63, 32, 73, 116, 39, 115, 32, 50, 48, 50, 53, 46]
```

</div>

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

<div class="notebook-output">

```
Initial vocabulary: {
    "l o w </w>": 4,
    "l o w e r </w>": 1,
    "n e w e s t </w>": 1,
    "w i d e s t </w>": 2,
    "n e w </w>": 2,
    "w i d e r </w>": 1,
    "l o w e s t </w>": 1,
    "t y p e </w>": 1,
    "h u m a n </w>": 1,
    "p l a y e r </w>": 1,
    "l i s t </w>": 1
}

Pair frequency: Counter({('l', 'o'): 6, ('o', 'w'): 6, ('w', '</w>'): 6, ('s', 't'): 5, ('t', '</w>'): 5, ('e', 's'): 4, ('w', 'e'): 3, ('e', 'r'): 3, ('r', '</w>'): 3, ('n', 'e'): 3, ('e', 'w'): 3, ('w', 'i'): 3, ('i', 'd'): 3, ('d', 'e'): 3, ('t', 'y'): 1, ('y', 'p'): 1, ('p', 'e'): 1, ('e', '</w>'): 1, ('h', 'u'): 1, ('u', 'm'): 1, ('m', 'a'): 1, ('a', 'n'): 1, ('n', '</w>'): 1, ('p', 'l'): 1, ('l', 'a'): 1, ('a', 'y'): 1, ('y', 'e'): 1, ('l', 'i'): 1, ('i', 's'): 1}) 

Max frequency: (('l', 'o'), 6)

Merged vocab: {'lo w </w>': 4, 'lo w e r </w>': 1, 'n e w e s t </w>': 1, 'w i d e s t </w>': 2, 'n e w </w>': 2, 'w i d e r </w>': 1, 'lo w e s t </w>': 1, 't y p e </w>': 1, 'h u m a n </w>': 1, 'p l a y e r </w>': 1, 'l i s t </w>': 1}
```

</div>

```python
merges, merge_ranks = train_bpe(corpus, target_vocab_size=1000, verbose=True)

print(f"Merges: {merges}\n")
print(f"Merge rank: {merge_ranks}\n")
```

<div class="notebook-output">

```
Merge 1: ('l', 'o') (count=6)
Merge 2: ('lo', 'w') (count=6)
Merge 3: ('s', 't') (count=5)
Merge 4: ('st', '</w>') (count=5)
Merge 5: ('low', '</w>') (count=4)
Merge 6: ('e', 'st</w>') (count=4)
Merge 7: ('e', 'r') (count=3)
Merge 8: ('er', '</w>') (count=3)
Merge 9: ('n', 'e') (count=3)
Merge 10: ('ne', 'w') (count=3)
Merge 11: ('w', 'i') (count=3)
Merge 12: ('wi', 'd') (count=3)
Merge 13: ('wid', 'est</w>') (count=2)
Merge 14: ('new', '</w>') (count=2)
Merge 15: ('low', 'er</w>') (count=1)
Merge 16: ('new', 'est</w>') (count=1)
Merge 17: ('wid', 'er</w>') (count=1)
Merge 18: ('low', 'est</w>') (count=1)
Merge 19: ('t', 'y') (count=1)
Merge 20: ('ty', 'p') (count=1)
Merge 21: ('typ', 'e') (count=1)
Merge 22: ('type', '</w>') (count=1)
Merge 23: ('h', 'u') (count=1)
Merge 24: ('hu', 'm') (count=1)
Merge 25: ('hum', 'a') (count=1)
Merge 26: ('huma', 'n') (count=1)
Merge 27: ('human', '</w>') (count=1)
Merge 28: ('p', 'l') (count=1)
Merge 29: ('pl', 'a') (count=1)
Merge 30: ('pla', 'y') (count=1)
Merge 31: ('play', 'er</w>') (count=1)
Merge 32: ('l', 'i') (count=1)
Merge 33: ('li', 'st</w>') (count=1)
Merges: [('l', 'o'), ('lo', 'w'), ('s', 't'), ('st', '</w>'), ('low', '</w>'), ('e', 'st</w>'), ('e', 'r'), ('er', '</w>'), ('n', 'e'), ('ne', 'w'), ('w', 'i'), ('wi', 'd'), ('wid', 'est</w>'), ('new', '</w>'), ('low', 'er</w>'), ('new', 'est</w>'), ('wid', 'er</w>'), ('low', 'est</w>'), ('t', 'y'), ('ty', 'p'), ('typ', 'e'), ('type', '</w>'), ('h', 'u'), ('hu', 'm'), ('hum', 'a'), ('huma', 'n'), ('human', '</w>'), ('p', 'l'), ('pl', 'a'), ('pla', 'y'), ('play', 'er</w>'), ('l', 'i'), ('li', 'st</w>')]

Merge rank: {('l', 'o'): 0, ('lo', 'w'): 1, ('s', 't'): 2, ('st', '</w>'): 3, ('low', '</w>'): 4, ('e', 'st</w>'): 5, ('e', 'r'): 6, ('er', '</w>'): 7, ('n', 'e'): 8, ('ne', 'w'): 9, ('w', 'i'): 10, ('wi', 'd'): 11, ('wid', 'est</w>'): 12, ('new', '</w>'): 13, ('low', 'er</w>'): 14, ('new', 'est</w>'): 15, ('wid', 'er</w>'): 16, ('low', 'est</w>'): 17, ('t', 'y'): 18, ('ty', 'p'): 19, ('typ', 'e'): 20, ('type', '</w>'): 21, ('h', 'u'): 22, ('hu', 'm'): 23, ('hum', 'a'): 24, ('huma', 'n'): 25, ('human', '</w>'): 26, ('p', 'l'): 27, ('pl', 'a'): 28, ('pla', 'y'): 29, ('play', 'er</w>'): 30, ('l', 'i'): 31, ('li', 'st</w>'): 32}

```

</div>

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

<div class="notebook-output">

```
('n', 'e', 'w', 'e', 'r', '</w>')
first: e, second: r
new word: ['n']
new word 2: ['n', 'e']
new word: ['n', 'e', 'w']
new word 2: ['n', 'e', 'w', 'er']
out new word
('n', 'e', 'w', 'er', '</w>')
first: er, second: </w>
new word: ['n', 'e', 'w']
new word 2: ['n', 'e', 'w', 'er</w>']
out new word
('n', 'e', 'w', 'er</w>')
first: n, second: e
new word: []
new word 2: ['ne']
out new word
('ne', 'w', 'er</w>')
first: ne, second: w
new word: []
new word 2: ['new']
out new word
('new', 'er</w>')
word token: ('new', 'er</w>')

```

</div>

```python
text = "lowest newer wider"
text_tokens = bpe_encode_text(text, merge_ranks)
print(f"text token: {text_token}\n")

decode_token = bpe_decode_tokens(text_tokens)
print(f"decode token: {decode_token}\n")
```

<div class="notebook-output">

```
word token: ('new', 'er</w>')

text token: ['lowest</w>', 'new', 'er</w>', 'wider</w>']

decode token: lowest newer wider

```

</div>

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

<div class="notebook-output">

```
Merge 1: ('l', 'o') (count=6)
Merge 2: ('lo', 'w') (count=6)
Merge 3: ('low', '</w>') (count=4)
Merge 4: ('e', 's') (count=4)
Merge 5: ('es', 't') (count=4)
Merge 6: ('est', '</w>') (count=4)
Merge 7: ('w', 'i') (count=3)
Merge 8: ('wi', 'd') (count=3)
Merge 9: ('e', 'r') (count=2)
Merge 10: ('er', '</w>') (count=2)
Merge 11: ('n', 'e') (count=2)
Merge 12: ('ne', 'w') (count=2)
Merge 13: ('wid', 'est</w>') (count=2)
Merge 14: ('low', 'er</w>') (count=1)
Merge 15: ('new', 'est</w>') (count=1)
Merge 16: ('new', '</w>') (count=1)
Merge 17: ('wid', 'er</w>') (count=1)
Merge 18: ('low', 'est</w>') (count=1)
TEXT:    lowest newer wider
TOKENS:  ['lowest</w>', 'new', 'er</w>', 'wider</w>']
DECODED: lowest newer wider
TOKENS (loaded):  ['lowest</w>', 'new', 'er</w>', 'wider</w>']
DECODED (loaded): lowest newer wider
```

</div>

