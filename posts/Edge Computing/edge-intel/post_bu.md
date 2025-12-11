# Building Edge Intelligence

Edge deployments increasingly rely on *early-exit* neural networks to keep latency budgets tight. In this post we discuss how to coordinate exits across tiers.

## Why exits matter
By training classifiers with auxiliary heads, we can stop inference once the confidence exceeds a threshold $\tau$. This yields a runtime of roughly

$$
T_{\text{edge}} \approx \min_k \{ T_k \mid p_k > \tau \},
$$

where $k$ denotes the exit index.

![Pipeline](./images/edge-arch.png)

## Coordinating the fleet
1. Profile each tier for runtime/accuracy pairs.
2. Solve a small MILP to assign thresholds per tier.
3. Push the policy to the orchestrator.

With this recipe we cut the 99p latency by **32%** on a Jetson + fog cluster while keeping accuracy within 0.4% of the baseline.
