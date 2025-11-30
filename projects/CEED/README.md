# CEED: Collaborative Early Exit Neural Network Inference at the Edge

## Introduction
Deep neural networks (DNNs) are becoming increasingly deeper to achieve more accurate predictions. However, this increase in complexity can result in significant inference times, especially on edge devices constrained by limited hardware resources. Moreover, when edge devices exhaust their memory, they may be unable to accommodate new data, potentially resulting in data loss, which reduces reliability.

The early exit neural network (EENN) architecture has been introduced to address this limitation by integrating internal classifiers (ICs) in the processing pipeline that allow the output at intermediate stages, depending on confidence scores computed by the ICs.

Collaborative inference over a distributed edge system with EENNs is a new trend, which can further enhance the computational and memory advantages of these models for inference serving. However, splitting EENN layers among a set of edge devices exacerbates the difficulty in choosing the right early exit point, as this becomes also affected by the heterogeneous device processing speeds, the available network bandwidth, and the computational cost of transferring data.

we present CEED, an AI-based optimization framework leveraging two performance predictors, the EENN predictor and the Loss ratio predictor, addressing two complementary goals. The EENN predictor tackles the challenge of configuring confidence thresholds of ICs by predicting, using a transformer, the confidence score and exit probability for incoming jobs. The Loss ratio predictor, instead, uses a graph neural network (GNN) to evaluate the system loss ratio, avoiding the cost of simulation.


## Distributed Inference System
<div align="center">
  <img src="./images/distributed_system.png" alt="Fig 1. Distributed Inference System" width="480" />
</div>

We considers collaborative inference at the network edge based on convolution neural networks (CNNs) implemented as EENNs. The EENN consists of a sequence of $L$ layers and $L-1$ intermediate classifiers (ICs) to control early exits. We regard these layers as logical abstractions, i.e., any sequence of consecutive physical layers that do not allow early exit is seen here as a single logical layer. This occurs frequently for EENNs with residual connections, where the connected layers typically do not feature ICs in-between. The device running the EENN is assumed to have a finite memory space to store incoming images (i.e., jobs) that arrive stochastically to the device, sitting in a first-come first-served (FCFS) waiting buffer until they begin service

In the collaborative edge inference system consists of several edge devices organized in $K+1$ layers that collaborate with each other to support EENN inference tasks. Each device can host a subset of the $L$ layers, and any given layer can be replicated multiple times and placed across multiple devices.

Due to layer replication and the various exit points for a job, the edge system effectively offers various possible processing paths, each referred to as a $chain$, to serve an arriving job. That is, a chain is a sequence of layer-device pairs that the job is scheduled to traverse for its processing. Because a chain always includes the gateway $i$, this implies that different gateways will tag incoming jobs using a different subset of chains, although these may partially overlap on some of their subpaths.

## Problem 
We consider the problem of jointly optimizing the IC confidence thresholds and chain assignment for incoming jobs to the multilayer edge system. The optimal solution deploy to the inference is named as control policy. The control policy knows: i) offline profiling of the processing times at each of the EENN layers; ii) the maximum network bandwidth profiled offline at each device; iii) the arrival rate of jobs estimated at each gateway (reciprocal of the estimated mean inter-arrival time).

Formally, to select an optimal trade-off among these metrics, CEED seeks to determine an optimal control policy $\Pi=\{(\boldsymbol{\tau}_{i}, \boldsymbol{a}_{i})|i=1,\dots,I\}$, where $I$ is the number of gateways. We seek to determine $\Pi$ so that it maximizes the overall accuracy of the EENN while simultaneously minimizing the system loss ratio. The $\Pi$ control policy involves setting the confidence threshold $\boldsymbol{\tau}_i$ and determining the chain assignment policy $\boldsymbol{a}_i$ for each gateway $i$. In CEED, the chain assignment policy is specified by action-score set $\boldsymbol{a}_i=\{(\langle i, j \rangle, s_{i,j})|j=1,\ldots,A_i\}$ where $\langle i, j \rangle$ represents the action for gateway $i$ that maps a job to the $j$th chain, $A_i$ is the number of chains available to the controller to select from, and $s_{i,j}$ is a score assigned to this chain mapping, which is the primary driver of the control policy. The optical control policy is then deployed to the local controllers at the gateways and executed during runtime.

## CEED
<div align="center">
  <img src="./images/CEED.png" alt="Fig 1. CEED overview" width="480" />
</div>
We introduce our optimization algorithm CEED. To characterize the complex dependencies between QoS metrics in distributed EENNs, CEED relies on two deep learning models, namely the $\textit{EENN predictor}$, based on a decoder-only transformer, and the $\textit{Loss ratio predictor}$, based instead on a GNN model. The EENN predictor estimates the mean confidence scores $\widehat{\Delta}_i$ that the EENN will deliver under the selected threshold configuration $\boldsymbol{\tau}_i$ for each gateway $i=1,\ldots,I$. Such values are later used to estimate the overall EENN classification accuracy under the policy $\Pi$. Concurrently, the Loss ratio predictor estimates the system loss ratio $D$ resulting from the chain assignment policies $\boldsymbol{a}_i$. The CEED optimizer uses the mean confidence scores $\widehat{\Delta}_i$ and system loss ratio $\widehat{D}$ estimated by the predictors as inputs to an optimization problem, which seeks to find the optimal policy $\Pi$ for a given deployment of the EENN over the multilayer edge architecture.

## Result
<div align="center">
  <img src="./images/result1.png" alt="Fig 2. Different arrival rate at the gateway" width="480" />
</div>
<div align="center">
  <img src="./images/result2.png" alt="Fig 3. Different AI inference application" width="480" />
</div>
We evaluate CEED on a 3-layer physical testbed integrated with a Raspberry Pi. We conduct two types of experiments. Fig. 2 evaluates CEED under various arrival rates at the gateway, and Fig. 3 evaluates CEED with different AI inference applications.


