# Positional Encoding
**Positional encoding (PE)** injects information about token order/position into a sequence model. The model receives a sequence of token embeddings, but those embeddings alone do not carry position information.

In practice, PE produces a position-dependent signal that is combined with token representations (typically at the input and sometimes at multiple layers), so the model can learn functions that depend on sequence order.

### why we need it
A standard Transformer encoder/decoder block uses self-attention, which (without additional signals) is permutation-invariant mainly with respect to the sequence:
- Self-attention computes similarities between tokens via dot products between queries and keys.
- If you permute the token order and permute the attention outputs the same way, the layer can produce the same results.
- Therefore, without position information, the model cannot reliably distinguish two sentences with the same words but different orders.

So positional information is required to let the model represent and learn order-sensitive functions.


## Absolution Positional Encoding
Each position $p$ has an associated vector $PE(p)\in \mathbb{R}^d$. The model combines this with the token embedding $x_p$

The most common combination is addition:
$$
\tilde{x}_p = x_p+PE(p)
$$

Sometimes concatenation is used (less common in modern large Transformers):
$$
\tilde{x}_p = [x_p;PE(p)] \in \mathbb{R}^{2d}
$$

### Sinusoidal Positional Encoding
This classic PE for Transformer is the sinusoidal positional encoding
$$
\begin{aligned}
PE(p, 2k) &= \sin (\frac{p}{1000^{2k/d}}) \\
PE(p, 2k+1) &= \cos (\frac{p}{1000^{2k/d}})
\end{aligned}
$$
**Pros**
  * No extra learned parameters.
  * Can extrapolate to longer sequences (to a degree), since it is defined for any $p$.
    
**Cons**
  * Extrapolation can still be imperfect; the model was trained on a finite context distribution.
  * In practice, fixed PE is less common than learned embeddings in many modern LLMs.

```python
class SinusoidalPositionalEncoding(nn.Module):
    """
    Sinusoidal Positional encoding layer.
    PE(pos, 2i)   = sin(pos / (10000^(2i/d_model)))
    PE(pos, 2i+1) = cos(pos / (10000^(2i/d_model)))
    0 <= pos < max_seq_len, 0 <= i < d_model/2
    """

    def __init__(self, d_model: int, max_seq_len: int = 5000, dropout: float = 0.0, batch_first: bool = True):
        super().__init__()
        self.dropout = nn.Dropout(p=dropout)
        self.batch_first = batch_first

        pe = torch.zeros(max_seq_len, d_model, dtype=torch.float32)  # Shape: (max_seq_len, d_model)
        
        position = torch.arange(0, max_seq_len, dtype=torch.float32).unsqueeze(1)  # Shape: (max_seq_len, 1)
        
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-torch.log(torch.tensor(10000.0)) / d_model))
        # exp(log(-(10000^(2i/d_model)))
        pe[:, 0::2] = torch.sin(position * div_term)  # Shape: (max_seq_len, d_model/2)
        pe[:, 1::2] = torch.cos(position * div_term)  # Shape: (max_seq_len, d_model/2)
        pe = pe.unsqueeze(0)  # Shape: (1, max_seq_len, d_model)
        self.register_buffer('pe', pe)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Add positional encoding to input."""
        if self.batch_first:
            x = x + self.pe[:, :x.size(1), :].to(x.device)
        else:
            x = x + self.pe[:, :x.size(0), :].to(x.device)
        return self.dropout(x)
```

### Learned absolute position embeddings
Maintain a trainable lookup table:
$$
PE(p) = W_{\text{pos}}[p]
$$
where $W_{\text{pos}} \in \mathbb{R}^{L\times d}$ where $L$ is the maximum trained sequence length.
**Pros**
  * Very simple and works well empirically.
  * Lets the model learn position representations optimized for the task/data.

**Cons**
  * Typically limited to the trained maximum length $L$.
  * Generalizing beyond the trained context can degrade.

```python
class LearnedPositionalEmbedding(nn.Module):
    """
    Learned Absolute Positional Embedding.
    
    Creates a learnable embedding table where each position has its own
    learned vector that gets added to the token embeddings.
    
    Used by: BERT, GPT-2, RoBERTa, ViT, and many other models.
    """
    
    def __init__(
        self,
        max_seq_len: int,
        d_model: int,
        dropout: float = 0.0,
        initializer_range: float = 0.02,
    ):
        """
        Initialize learned positional embeddings.
        
        Args:
            max_seq_len: Maximum sequence length (positions 0 to max_seq_len-1)
            d_model: Dimension of the embeddings
            dropout: Dropout probability applied after adding position embeddings
            initializer_range: Std for normal initialization (0.02 is common)
        """
        super().__init__()
        
        self.max_seq_len = max_seq_len
        self.d_model = d_model
        self.embedding = nn.Embedding(max_seq_len, d_model)        
        nn.init.normal_(self.embedding.weight, mean=0.0, std=initializer_range)
        self.dropout = nn.Dropout(p=dropout)
    
    def forward(
        self,
        x: torch.Tensor,
        position_ids: torch.Tensor | None = None
    ) -> torch.Tensor:
        """
        Add positional embeddings to input tensor.
        
        Args:
            x: Input tensor of shape (batch_size, seq_len, d_model)
               Typically token embeddings from nn.Embedding
            position_ids: Optional position indices of shape (batch_size, seq_len)
                         If None, uses [0, 1, 2, ..., seq_len-1] for all batches
        
        Returns:
            Tensor of shape (batch_size, seq_len, d_model) with positions added
        """
        batch_size, seq_len, _ = x.shape

        if position_ids is None:
            # Default: sequential positions [0, 1, 2, ..., seq_len-1]
            position_ids = torch.arange(seq_len, device=x.device)
            position_ids = position_ids.unsqueeze(0).expand(batch_size, -1)
            # Shape: (batch_size, seq_len)
        
        # Check bounds
        if position_ids.max() >= self.max_seq_len:
            raise ValueError(
                f"Position {position_ids.max().item()} exceeds max_seq_len {self.max_seq_len}"
            )
        position_embeddings = self.embedding(position_ids)
        # Shape: (batch_size, seq_len, d_model)
        x = x + position_embeddings
        x = self.dropout(x)
        return x
    
    def get_position_embedding(self, position: int) -> torch.Tensor:
        """Get the learned embedding vector for a specific position."""
        return self.embedding.weight[position]
```

#### When absolute PE is good
* Fixed maximum context (e.g., classification on fixed-length sequences).
* Simpler baselines.

## Relative Positional Encoding
Relative PE encodes position information as a function of the relative displacement between tokens, not the absolute index:
$$
r_{i,j}=g(i-j)
$$
The key design choice is where to inject this into attention. Relative schemes typically integrate directly into the attention logits or the key/query interactions.

Many sequence phenomena depend more on distance than absolute location

Relative methods can also be more robust when you change sequence length at inference.

### Additive bias to attention scores
A widely used approach is to add a learned bias that depends on distance. The attention function becomes
$$
A_{i,j}=\frac{q_i^Tk_j}{\sqrt{d}} + b(i-j)
$$

Where $b(\cdot)$ is:
* either a learned scalar per relative distance (often clipped to a range),
* or a bucketed distance function (to cover long contexts efficiently),
* and often per-head: $b_h(i-j)$

**Pros**
* Very simple; only modifies logits.
* Efficient; does not change vector dimensions.
* Strong empirical performance (common in T5-style relative bias).

**Cons**
* Bias-only methods give the model distance information but do not rotate/transform content vectors; expressiveness depends on the form of $b$.

#### Bucketing
For long sequences, you often cannot store a parameter for every possible $(i-j)$. So you map distances to buckets:
* Small distances get fine-grained buckets
* Large distances get coarser buckets (often logarithmic)

Then $b(i-j)=\beta_{\text{bucket}(i-j)}$. This is a major reason relative bias scales to long contexts.

### Learned relative position embeddings in the attention computation
Another classic approach (associated with Transformer-XL/Shaw et al.–style) uses learned embeddings $r_{i-j}\in \mathbb{R}^d$ and incorporates them in the score:
$$
A_{i,j}=\frac{q_i^Tk_j}{\sqrt{d}} + \frac{q_i^Tr_{i-j}}{\sqrt{d}}
$$

* $q_i^Tk_j$ is content-to-content similarity.
* $q_i^Tr_{i-j}$ is content-to-position interaction: “given what I’m looking for (query), how much should I attend at this relative offset?”

**Pros**
  * More expressive than bias-only: position interacts with content via dot products.
  * Naturally focuses on relative offsets.

**Cons**
  * More compute/memory than simple bias
  * Must handle clipping/bucketing or max relative distance.

### ALiBi-style linear biases
Linear attention bias:
$$
A_{i,j}=\frac{q_i^Tk_j}{\sqrt{d}}-m_h \cdot (i-j)
$$
for causal attention (where $i\geq j$), with slope $m_h$ per head.

**Pros**
  * Very low parameter overhead.
  * Often extrapolates to longer contexts better than learned absolute embeddings.

**Cons**
  * Less flexible than learned bucketed biases; it imposes a specific monotonic distance prior.

## RoPE
### Goal
RoPE encodes position by ROTATING query/key vectors. The key insight is that 2D rotation encodes position, and the dot product of two rotated vectors depends only on their relative position.

**RoPE** injects position information by applying a position-dependent rotation to the query and key vectors:
$$
\tilde{q}_m=R_mq_m, \quad \tilde{k}_m=R_mk_m
$$
and then attention use $\tilde{q}_m^T\tilde{k}_{m'}$

### Rotation block
For a 2D vector $[x_1, x_2]$, rotation by angle $\theta$ is:

$$
\begin{pmatrix}
\cos(\theta) & -\sin(\theta) \\
\sin(\theta) & \cos(\theta)
\end{pmatrix}
\begin{pmatrix}
x_1 \\ x_2
\end{pmatrix}
=
\begin{pmatrix}
x_1\cos(\theta) - x_2\sin(\theta) \\
x_1\sin(\theta) + x_2\cos(\theta)
\end{pmatrix}
$$

For a d-dimensional vector, we split it into d/2 pairs and rotate each pair by a different angle. The angle for the i-th pair at position m is:
$$
\theta_i(m) = m \times \theta_{\text{base}}^{\frac{-2(i-1)}{d}}
$$
where $\theta_{\text{base}}$ (typically 10000) controls the wavelength of rotations.

The rotation matrix for position $m$ is:
$$
R_{\Theta,m}^{d}=
\begin{pmatrix}
\cos(m\theta_{1}) & -\sin(m\theta_{1}) & 0 & 0 & \cdots & 0 & 0 \\
\sin(m\theta_{1}) & \ \cos(m\theta_{1}) & 0 & 0 & \cdots & 0 & 0\\
0 & 0 & \cos(m\theta_{2}) & -\sin(m\theta_{2}) & \cdots & 0 & 0\\
0 & 0 & \sin(m\theta_{2}) & \ \cos(m\theta_{2}) & \cdots & 0 & 0\\
\vdots & \vdots & \vdots & \vdots & \ddots & \vdots & \vdots\\
0 & 0 & 0 & 0 & \cdots & \cos(m\theta_{d/2}) & -\sin(m\theta_{d/2}) \\
0 & 0 & 0 & 0 & \cdots & \sin(m\theta_{d/2}) & \ \cos(m\theta_{d/2})
\end{pmatrix}
$$

For a d-dimensional vector $x=[x_0,x_1,\dots,x_{2i}, x_{2i+1}, \dots, x_{d-2}, x_{d-1}]$, we group them into pairs:
- Pair 1: $\text{freq}=1.0$
- Pair 2: $\text{freq}=\theta^{-\frac{2}{d}}$
- Pair i: $\text{freq}=\theta^{-\frac{2(i-1)}{d}}$
- Pair $\frac{d}{2}$: $\text{freq}=\theta^{\frac{2}{d}-1}$

Each pair corresponds to a frequency.

### Attention depends on relative position
By applying RoPE on the query $q$ and key $k$
$$
\tilde{q}^T_m\tilde{k}_{n} = (R_mq_m)^T(R_{n}k_{n})=q_m^T R_m^T R_{n} k_{n}
$$

Now use two facts about rotations (and thus about each 2D block, and hence the whole block-diagonal:
1. Orthogonality: $\text{Rot}(\phi)^T=\text{Rot}(-\phi)$, so $R^T_m=R_{-m}$.
2. Composition: $\text{Rot}(\phi)\text{Rot}(\psi)=\text{Rot}(\phi+\psi)$, so $R_{\phi}R_{\psi}=R_{\phi+\psi}$.

Therefore:
$$
R^T_{m}R_{n}=R_{-m}R_{n}=R_{n-m}
$$

So the dot product becomes:
$$
\tilde{q}^T_m\tilde{k}_{n} =q_m^T R_{n-m} k_{n}
$$

This shows the positional effect enters as a function of the relative offset $(n - m)$, not on absolute values!

#### Math Details
1. Orthogonality

$$
\begin{aligned}
R(\theta)^T &= 
\begin{pmatrix}
\cos (\theta) & -\sin (\theta) \\
\sin (\theta) & \cos (\theta)
\end{pmatrix}^T \\
&=
\begin{pmatrix}
\cos (\theta) & \sin (\theta) \\
-\sin (\theta) & \cos (\theta)
\end{pmatrix} \\
&=
\begin{pmatrix}
\cos (-\theta) & -\sin (-\theta) \\
\sin (-\theta) & \cos (-\theta)
\end{pmatrix} \\
&=R(-\theta)
\end{aligned}
$$

2. Composition

$$
\begin{aligned}
R(\theta)R(\psi) &= 
\begin{pmatrix}
\cos (\theta) & -\sin (\theta) \\
\sin (\theta) & \cos (\theta)
\end{pmatrix} \cdot
\begin{pmatrix}
\cos (\psi) & -\sin (\psi) \\
\sin (\psi) & \cos (\psi)
\end{pmatrix}
\\
&= 
\begin{pmatrix}
\cos (\theta)\cos (\psi) - \sin (\theta)\sin (\psi)  & - (\cos (\theta)\sin (\psi) + \sin (\theta)\cos (\psi)) \\
\sin (\theta)\cos (\psi) + \cos (\theta)\sin (\psi) & \cos (\theta)\cos (\psi) - \sin (\theta)\sin (\psi)
\end{pmatrix} \\
&=
\begin{pmatrix}
\cos (\theta + \psi) & - \sin (\theta + \psi) \\
\sin (\theta + \psi) & \cos (\theta + \psi)
\end{pmatrix} \\
& = R(\theta + \psi)
\end{aligned}
$$

```python
class RotaryPositionalEmbedding(nn.Module):
    def __init__(self, theta: float, d_k: int, max_seq_len: int, device=None):
        """
        Construct the RoPE module and create buffers.
        
        Args:
            theta: Θ base value (typically 10000). Higher = longer wavelengths
            d_k: Dimension of query and key vectors (must be even)
            max_seq_len: Maximum sequence length that will be inputted
            device: Device to store the buffer on
        """
        super().__init__()
        
        if d_k % 2 != 0:
            raise ValueError(f"d_k must be even, got {d_k}")
        
        self.theta = theta
        self.d_k = d_k
        self.max_seq_len = max_seq_len
        inv_freq = 1.0 / (theta ** (torch.arange(0, d_k, 2, device=device).float() / d_k))  # shape: (d_k/2, )
        """
        torch.arange(0, d_k, 2, device=device) -> [0, 2, 4, 6, ..., d_k-2]
        arange/d_k -> [0/d_k, 2/d_k, ..., (d_k-2)/d_k]
        theta**() -> [theta^(0/d_k), theta^(2/d_k), ..., theta^((d_k-2)/d_k)]
        1/theta -> [theta^(-0/d_k), theta^(-2/d_k), ..., theta^(-(d_k-2)/d_k)]
        """
        self.register_buffer("inv_freq", inv_freq)
        # register_buffer: stores tensor as part of module state (saved/loaded with model)
        # but NOT as a learnable parameter (no gradients)
        self._build_cache(max_seq_len, device)
```

### Generate cache value for each position for each frequency
For a vector $x$ of dimension $d_k = 8$: $[x_0, x_1, x_2, x_3, x_4, x_5, x_6, x_7]$

We need to group into $d_k/2 = 4$ pairs, each rotated by a different angle.

#### Approach 1: Half-split pairing (LLaMA)

Split the vector in half and pair across:
- First Half: $[x_0, x_1, x_2, x_3]$
- Second Half: $[x_4, x_5, x_6, x_7]$
- Pairs:
    - $\theta_0$: $(x_0, x_4)$,
    - $\theta_1$: $(x_1, x_5)$,
    - $\theta_2$: $(x_2, x_6)$,
    - $\theta_3$: $(x_3, x_7)$,
    - $\theta_i$: $(x_i, x_{i+\frac{d}{2}})$

Rotation for pair $i$:
$$
\begin{aligned}
x'_i &= x_i \cos (\theta_i) - x_{i+\frac{d}{2}}\sin (\theta_i) \\
x'_{i+\frac{d}{2}} &= x_i \sin (\theta_i) + x_{i+\frac{d}{2}}\cos (\theta_i)
\end{aligned}
$$

```python
    def _build_cache(self, seq_len: int, device=None):
        positions = torch.arange(seq_len, device=device or self.inv_freq.device).float()
        freqs = torch.einsum("i,j->ij", positions, self.inv_freq)  # outer product
        """
        the freqs is
              ┌ pos_0 × freq_0      pos_0 × freq_1    ...  pos_0 × freq_{d/2-1}     ┐
              │ pos_1 × freq_0      pos_1 × freq_1    ...  pos_1 × freq_{d/2-1}     │
              │ ...                 ...               ...  ...                      │
              └ pos_{n-1} × freq_0  ...               ...  pos_{n-1} × freq_{d/2-1} ┘
        shape: (seq_len, d_k/2)
        freqs[m, i] = position m's rotation angle for dimension pair i
        """

        """
        ══════════════════════════════════════════════════════════════════
        Duplicate frequencies for the rotation formula
        ═══════════════════════════════════════════════════════════════════
        The rotation formula we use is:
        
          x_rotated = x * cos(θ) + rotate_half(x) * sin(θ)
        
        where rotate_half([x_0, x_1, ..., x_{d/2-1}, x_{d/2}, ..., x_{d-1}])
                        = [-x_{d/2}, ..., -x_{d-1}, x_0, ..., x_{d/2-1}]
        
        For this to work element-wise, we need cos and sin to have shape (d,)
        where the first d/2 elements and last d/2 elements are the same angles.
        
        This is because dimension pairs (0, d/2), (1, d/2+1), etc. share the same angle.
        """
        emb = torch.cat([freqs, freqs], dim=-1)
        # Shape: (seq_len, d_k)
        # freqs[m] = [θ_0(m), θ_1(m), ..., θ_{d/2-1}(m), θ_0(m), θ_1(m), ..., θ_{d/2-1}(m)]
        self.register_buffer("cos_cache", freqs.cos(), persistent=False)  # shape: (seq_len, d_k) 
        self.register_buffer("sin_cache", freqs.sin(), persistent=False)  # shape: (seq_len, d_k) 
        
    def _rotate_half(self, x: torch.Tensor) -> torch.Tensor:
        x1 = x[..., : self.d_k // 2]  # First half:  [x_0, x_1, ..., x_{d/2-1}]
        x2 = x[..., self.d_k // 2 :]  # Second half: [x_{d/2}, ..., x_{d-1}]
        return torch.cat([-x2, x1], dim=-1)
        # Returns: [-x_{d/2}, ..., -x_{d-1}, x₀, ..., x_{d/2-1}]
    
```

#### Approach 2: Interleaved Pairing (original RoFormer)
Pairs:
- $\theta_0$: $(x_0, x_1)$
- $\theta_1$: $(x_2, x_3)$
- $\theta_2$: $(x_4, x_5)$
- $\theta_3$: $(x_6, x_7)$
- $\theta_i$: $(x_{2i},x_{2i+1})$

```python
    def _build_cache(self, seq_len: int, device=None):
        positions = torch.arange(seq_len, device=device or self.inv_freq.device).float()
        freqs = torch.einsum("i,j->ij", positions, self.inv_freq)  # outer product
        
        # Method: repeat_interleave duplicates each element
        freqs = freqs.repeat_interleave(2, dim=-1)  # (seq_len, d_k)
        # [θ₀, θ₁, θ₂, θ₃] → [θ₀, θ₀, θ₁, θ₁, θ₂, θ₂, θ₃, θ₃]

        self.register_buffer("cos_cache", freqs.cos(), persistent=False)  # shape: (seq_len, d_k) 
        self.register_buffer("sin_cache", freqs.sin(), persistent=False)  # shape: (seq_len, d_k)

    def _rotate_half(self, x: torch.Tensor) -> torch.Tensor:
        """
        For interleaved pairing, rotate_half swaps adjacent pairs:
        
        Input:  [x₀, x₁, x₂, x₃, x₄, x₅, x₆, x₇]
        
        Output: [-x₁, x₀, -x₃, x₂, -x₅, x₄, -x₇, x₆]
        Each adjacent pair (x₂ᵢ, x₂ᵢ₊₁) becomes (-x₂ᵢ₊₁, x₂ᵢ)
        
        Why? For pair (x₀, x₁) with angle θ₀:
            x'₀ = x₀·cos(θ₀) + (-x₁)·sin(θ₀) = x₀·cos - x₁·sin  ✓
            x'₁ = x₁·cos(θ₀) + (x₀)·sin(θ₀)  = x₁·cos + x₀·sin  ✓
        """
        # Reshape to expose pairs: (..., d_k) → (..., d_k/2, 2)
        x_pairs = x.view(*x.shape[:-1], -1, 2)
        
        # Swap and negate: [a, b] → [-b, a]
        x_rotated = torch.stack([-x_pairs[..., 1], x_pairs[..., 0]], dim=-1)
        
        # Flatten back: (..., d_k/2, 2) → (..., d_k)
        return x_rotated.view(*x.shape)
```

### Forward

```python
    def forward(self, x: torch.Tensor, token_positions: torch.Tensor) -> torch.Tensor:
        flat_pos = token_positions.flatten().long()
        cos = self.cos_cache[flat_pos].view(*token_positions.shape, self.d_k)
        sin = self.sin_cache[flat_pos].view(*token_positions.shape, self.d_k)
        
        return (x * cos) + (self._rotate_half(x) * sin)
        """
        Approach 1:
        [x₀, x₁, x₂, x₃, x₄, x₅, x₆, x₇] * cos(θ) + [-x₄, -x₅, -x₆, -x₇, x₀, x₁, x₂, x₃] * sin(θ)

        Approach 2:
        [x₀, x₁, x₂, x₃, x₄, x₅, x₆, x₇] * cos(θ) + [-x₁, x₀, -x₃, x₂, -x₅, x₄, -x₇, x₆] * sin(θ)
        """
```

### Partial RoPE
Let the per-head dimension be $d$ (even). Partial RoPE rotates only the first $d_{\text{rot}}$ dimensions (also even), and leaves the remaining $d-d_{\text{rot}}$ unchanged.

Write a head vector as a concatenation
$$
x=
\begin{bmatrix}
x^{(\mathrm{rot})}\\
x^{(\mathrm{pass})}
\end{bmatrix},
\quad
x^{(\mathrm{rot})}\in\mathbb{R}^{d_{\mathrm{rot}}},
\quad
x^{(\mathrm{pass})}\in\mathbb{R}^{d-d_{\mathrm{rot}}}.
$$

Then at position $m$
$$
\text{partial-RoPE}(x,m)=
\begin{bmatrix}
R_m^{(d_{\text{rot}})}x^{(\text{rot})} \\
x^{\text{pass}}
\end{bmatrix}
$$
where $R_m^{(d_{\text{rot}})}$ is the usual RoPE block-diagonal rotation matrix but sized $d_{\text{rot}} \times d_{\text{rot}}$

#### Why we need partial RoPE?
1) Capacity trade-off: not all channels should be “position-heavy”
RoPE enforces that Q/K dot products incorporate a relative-position rotation factor. If you rotate every dimension, then all dot-product capacity is coupled to the positional phase. In some settings, this can be overly constraining.

Partial RoPE gives the model a split representation:
* **Rotary subspace** ($d_{\text{rot}}$): channels specialized for relative position / ordering.
* **Pass-through subspace** ($d-d_{\text{rot}}$): channels free to represent mostly content similarity without mandatory phase coupling..

2) Compatibility with head dimensions / multi-query / grouped-query layouts
Some implementations have head dimensions that include extra structure (e.g., splitting into rotary and non-rotary parts; or using specialized projections). Partial RoPE makes it easy to apply RoPE only where the head layout expects it, without forcing all dims into paired rotation.

3) Long-context stability and extrapolation behavior
For very long sequences, the high-frequency components of RoPE (small wavelength) can induce rapid phase changes. Rotating fewer dimensions can reduce sensitivity to high-frequency positional phase across the entire dot product, while still preserving relative position information in the rotated subset.
* Larger $d_{\text{rot}}$: stronger positional encoding, potentially sharper locality/ordering biases.
* Smaller $d_{\text{rot}}$: more content-driven similarity, sometimes smoother behavior at long context.

The attention computation on partial RoPE is
$$
\tilde{q}^T_m\tilde{k}_{n} = \underbrace{(R_mq_m^{\text{dot}})^T(R_nk_n^{\text{dot}})}_{\text{relative-position dependent}} + \underbrace{(q_m^{\text{pass}})^T(k_n^{\text{pass}})}_{\text{position independent}}
$$

```python
    def forward(self, x: torch.Tensor, token_positions: torch.Tensor) -> torch.Tensor:
        flat_pos = token_positions.flatten().long()
        cos = self.cos_cached[flat_pos].view(*token_positions.shape, self.rotary_dim)
        sin = self.sin_cached[flat_pos].view(*token_positions.shape, self.rotary_dim)
        x_rot = x[..., :self.rotary_dim]
        x_pass = x[..., self.rotary_dim:]
        x_rot = (x_rot * cos) + (self._rotate_half(x_rot) * sin)
        return torch.cat([x_rot, x_pass], dim=-1)
```

