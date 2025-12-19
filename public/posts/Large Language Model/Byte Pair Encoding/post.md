# Note on the implementatin of Byte Pair Encoding (BPE)

## BPETrainerState
The `BPETrainerState` class is responsible for maintaining the state of the BPE training process. It keeps track of the current vocabulary, the frequency of byte pairs, and other relevant information needed to perform BPE merges.
```python
@dataclass
class BPETrainerState:
    vocab: Dict[int, bytes]              # Token ID -> byte sequence
    word_splits: Dict[int, List[int]]    # Word ID -> current token sequence
    word_id_to_freq: Dict[int, int]      # Word ID -> frequency count
    pair_to_positions: Dict[Tuple[int, int], set]  # Pair(token_id, token_id) -> {(word_id, position)}
    pair_freqs: Dict[Tuple[int, int], int]         # Pair(token_id, token_id) -> total frequency
    next_id: int = 256                   # Next available token ID
```
**Note:**
Before training the total number of vocabulary is 256 (single byte tokens). The token_id is the byte value (0-255).

## Pre Tokenization
Before the learning process, the input text is preprocessed:
1. Split by special token (such as `<|endoftext|>` to split the text) to prevent their character from merging into regular text.
```python
special_tokens = ["<|endoftext|>"]
sorted_specials = sorted(special_tokens, key=len, reverse=True)
```
Use escape to add backslashes to special tokens for regex processing.
```python
escaped_specials = [re.escape(token) for token in sorted_specials]
# <|endoftext|> -> <\\|endoftext\\|>
```
Split the text with the special tokens into text chunk.
```python
split_pattern = f"({'|'.join(escaped_specials)})"
text_chunks = re.split(split_pattern, input_text)
```
Example: `'This is some text. <|endoftext|> Here is more text.'` -> `['This is some text. ', ' Here is more text.']`

2. Apply GPT-2regex to each chunk to split into tokens. And initialize the word frequency dictionary.
```python
GPT2_REGEX = r"""'(?:[sdmt]|ll|ve|re)| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+"""

word_freqs = default(int)
for match in re.finditer(GPT2_PAT, text_chunk):
    word = match.group(0)
    # token0 -> “This"
    # token1 -> " is" ...
    # convert to bytes
    word_bytes = word.encode("utf-8")
    word_freqs += 1
```

## Initializing BPETrainerState
After preprocessing, we initialize the `BPETrainerState` with the word frequency.
1. Initialize the vocabulary with single byte tokens (0-255).
```python
vocab = {i: bytes([i]) for i in range(256)}
```
2. Initialize word splits and word ID to frequency mapping.
```python
word_splits: Dict[int, List[int]] = {}
word_id_to_freq: Dict[int, int] = {}

for word_id, (word_bytes, freq) in enumerate(word_freqs.items()):
    word_id_to_freq[word_id] = freq
    word_splits[word_id] = list(word_bytes)  # Split into individual bytes
    # list(word_bytes) -> [84, 104, 105, 115] for "This"
    # word_id_to_freq: {word_id("This"): freq, ...}
    # word_splits: {word_id("This"): [84, 104, 105, 115], ...}
```
3. Initialize pair positions.
```python
pair_to_positions: Dict[Tuple[int, int], set] = defaultdict(set)
for word_id, tokens in word_splits.items():
    # {word_id("This"): [84, 104, 105, 115], ...}
    for i in range(len(tokens) - 1):
        # pair: (84, 104), (104, 105), (105, 115) for "This"
        pair = (tokens[i], tokens[i + 1])
        # pair_to_positions: {(84, 104): {(word_id("This"), 0)}, (104, 105): {(word_id("This"), 1)}, ...}
        pair_to_positions[pair].add((word_id, i))
```
4. Initialize pair frequencies.
```python
pair_freqs: Dict[Tuple[int, int], int] = defaultdict(int)
for pair, positions in pair_to_positions.items():
    # positions: {(word_id, position), ...}
    for word_id, _ in positions:
        # freq = word_id_to_freq[word_id] {word_id("This"): freq, ...}
        # pair_freqs: {(84, 104): freq, (104, 105): freq, ...}
        pair_freqs[pair] += word_id_to_freq[word_id]
```

## Find best pair
Rules:
* Choose the pair with the highest frequency.
* Lexicographically greater first token bytes (tie-breaker, based on byte value)
* Lexicographically greater second token bytes (tie-breaker, based on byte value)
```python
def find_best_pair(state: BPETrainerState) -> Optional[Tuple[int, int]]:
    best_pair = None
    best_freq = 0

    for pair in state.pair_freqs.keys():
        freq = state.pair_freqs[pair]
        if freq == 0:
            continue

        if best_pair is None:
            best_pair = pair
            best_freq = freq
        else:
            # Compare by (frequency, first token bytes, second token bytes)
            # Compare the byte not the token id
            current_key = (freq, state.vocab[pair[0]], state.vocab[pair[1]])
            best_key = (best_freq, state.vocab[best_pair[0]], state.vocab[best_pair[1]])
            if current_key > best_key:
                best_pair = pair
                best_freq = freq
    return best_pair
```

## Merge pair
Once the best pair is found, we merge it into a new token and update the state accordingly
1. Merge a pair in a single word.
```python
def merge_pair_in_word(
    state: BPETrainerState,
    word_id: int,
    pair: Tuple[int, int],
    new_token_id: int,
) -> None:
    # find the spliting of the word. The value is a list of token ids
    tokens = state.word_splits[word_id]
    # get its frequency
    freq = state.word_id_to_freq[word_id]
    new_tokens = []  # storing to form the new token list
    i = 0
    while i < len(tokens):
        ...
```
Do a pointer iteration on the word to find the pair to merge and replace by the new token.
```python
if i < len(tokens) - 1 and (tokens[i], tokens[i + 1]) == pair:
    # Remove old adjacent pairs from tracking
    if i > 0:
        # remove the left-hand-side of the pair from pair position and pair frequency
        old_left_pair = (tokens[i - 1], tokens[i])
        state.pair_to_positions[old_left_pair].discard((word_id, i - 1))
        state.pair_freqs[old_left_pair] -= freq

    if i < len(tokens) - 2:
        # remove the right-hand-side of the pair from pair position and pair frequency
        old_right_pair = (tokens[i + 1], tokens[i + 2])
        state.pair_to_positions[old_right_pair].discard((word_id, i + 1))
        state.pair_freqs[old_right_pair] -= freq
    # Remove the pair we're merging
    state.pair_to_positions[pair].discard((word_id, i))
    
    # Add merged token
    new_tokens.append(new_token_id)
    i += 2
else:
    # pair not found, just copy the token
    new_tokens.append(tokens[i])
    i += 1
```
Forming the new token list, and the new pair after merging.
```python
# Update the word splits with the new token list
state.word_splits[word_id] = new_tokens

# Add new pairs involving the merged token
for i in range(len(new_tokens) - 1):
    # the new token is involved in the pair
    if new_tokens[i] == new_token_id or new_tokens[i + 1] == new_token_id:
        # forming the new pair
        new_pair = (new_tokens[i], new_tokens[i + 1])
        if (word_id, i) not in state.pair_to_positions[new_pair]:
            # add the position in the current word_id to the pair position
            state.pair_to_positions[new_pair].add((word_id, i))
            # add the frequency of the word to the pair frequency of the new pair
            state.pair_freqs[new_pair] += freq
```
2. Apply this merge to all words containing the pair.
```python
def apply_merge(state: BPETrainerState, pair: Tuple[int, int]) -> bytes
    token1_bytes = state.vocab[pair[0]]
    token2_bytes = state.vocab[pair[1]]
    new_token_bytes = token1_bytes + token2_bytes
    new_token_id = state.next_id
    state.vocab[new_token_id] = new_token_bytes

    # Get positions where this pair occurs (copy since we'll modify)
    positions_to_merge = list(state.pair_to_positions.get(pair, set()))
    # Process each word that contains this pair
    for word_id, _ in positions_to_merge:
        merge_pair_in_word(state, word_id, pair, new_token_id)
    
    # Clean up the merged pair
    del state.pair_freqs[pair]
    del state.pair_to_positions[pair]
    state.next_id += 1
    return new_token_bytes
```

## TrainBPE
The main training loop that repeatedly finds and merges the best pair until the desired vocabulary size is reached
```python
def train_bpe(
    input_path: str | os.PathLike,
    vocab_size: int,
    special_tokens: List[str] | None = None,
) -> Tuple[Dict[int, bytes], List[Tuple[bytes, bytes]]]:
    # Step 1: Read and pre-tokenize the input text and generate word_freqs
    word_freqs = preprocess_input(input_path, special_tokens)
    
    # Step 2: Calculate number of merges needed
    num_special = len(special_tokens)
    num_merges = vocab_size - 256 - num_special
    
    # Step 3: Initialize trainer state
    state = init_trainer_state(word_freqs)
    
    # Step 4: Learn merges iteratively
    merges: List[Tuple[bytes, bytes]] = []
    for _ in range(num_merges):
        best_pair = find_best_pair(state)
        if best_pair is None:
            break  # No more pairs to merge
        # Record the merge (as byte sequences)
        token1_bytes = state.vocab[best_pair[0]]
        token2_bytes = state.vocab[best_pair[1]]
        merges.append((token1_bytes, token2_bytes))

        # Apply the merge
        apply_merge(state, best_pair)
    return state.vocab, merges
```