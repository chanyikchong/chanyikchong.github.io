# Latency-Aware Scheduling with Forecasts

Service providers often size workloads using trailing averages. We instead combine adaptive arrival forecasts with a chance-constrained scheduler.

## Forecast to slots
Using the adaptive model $f_\theta$, we obtain predicted arrival rates $\hat{\lambda}_{t:t+H}$ and convert them to slot allocations. Each slot solves

$$
\min_{x} \sum_i c_i x_i \quad \text{s.t.} \quad \Pr\{ D_i(x_i) > d_i^{\max} \} \leq \epsilon.
$$

## Online refinement
- Detect drifts with HCPD.
- Re-fit the local surrogate when the buffer has $L_{\text{fine}}$ samples.
- Re-solve the upcoming slots with the new parameters.

<div align="center">
  <img src="./images/pipeline.png" alt="Latency-aware workflow" width="420" />
</div>

This pipeline slashes deadline misses by **27%** on our campus deployment.
