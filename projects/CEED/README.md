# CEED: Collaborative Early Exit Neural Network Inference at the Edge

## Introduction
Deep neural networks (DNNs) are becoming increasingly deeper to achieve more accurate predictions. However, this increase in complexity can result in significant inference times, especially on edge devices constrained by limited hardware resources. Moreover, when edge devices exhaust their memory, they may be unable to accommodate new data, potentially resulting in data loss, which reduces reliability.

The early exit neural network (EENN) architecture has been introduced to address this limitation by integrating internal classifiers (ICs) in the processing pipeline that allow the output at intermediate stages, depending on confidence scores computed by the ICs.

Collaborative inference over a distributed edge system with EENNs is a new trend, which can further enhance the computational and memory advantages of these models for inference serving. However, splitting EENN layers among a set of edge devices exacerbates the difficulty in choosing the right early exit point, as this becomes also affected by the heterogeneous device processing speeds, the available network bandwidth, and the computational cost of transferring data.

we present CEED, an AI-based optimization framework leveraging two performance predictors, the EENN predictor and the Loss ratio predictor, addressing two complementary goals. The EENN predictor tackles the challenge of configuring confidence thresholds of ICs by predicting, using a transformer, the confidence score and exit probability for incoming jobs. The Loss ratio predictor, instead, uses a graph neural network (GNN) to evaluate the system loss ratio, avoiding the cost of simulation. 
